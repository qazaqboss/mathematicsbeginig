/* Narration. Three engines, tried in this order when set to "auto":
   1. pre-rendered files in audio/ (made by tools/voicestudio-narrate.mjs),
   2. a running VoiceStudio backend (OpenAI-compatible /v1/audio/speech),
   3. the browser's own speech synthesis, picking its best Russian voice. */
(function () {
  const KEY = "math-voice";
  const defaults = { engine: "auto", studioUrl: "http://localhost:3900", studioVoice: "", voiceURI: "", rate: 1, readouts: false };
  let cfg = Object.assign({}, defaults);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (_) {} };

  /* ---------- text → speakable Russian ---------- */
  const SUP = { "²": " в квадрате", "³": " в кубе", "ⁿ": " в степени эн", "⁻¹": " в минус первой" };
  function speakable(t) {
    return String(t)
      .replace(/(\d)\/(\d+)/g, (m, a, b) => `${a} ${fracWord(+b, +a)}`)
      .replace(/√/g, "корень из ")
      .replace(/π/g, "пи")
      .replace(/([\d²³)]) ?· ?(?=[\d(])/g, "$1 умножить на ")
      .replace(/(\d)·(?=[a-zа-я(])/gi, "$1 ")
      .replace(/[²³]|ⁿ⁻¹|ⁿ/g, (m) => SUP[m] || "")
      .replace(/×/g, " умножить на ")
      .replace(/ · /g, ". ")
      .replace(/(\d) : (\d)/g, "$1 разделить на $2")
      .replace(/ − /g, " минус ")
      .replace(/−(\d)/g, "минус $1")
      .replace(/ \+ /g, " плюс ")
      .replace(/ = /g, " равно ")
      .replace(/ ≈ /g, " примерно ")
      .replace(/ < /g, " меньше ")
      .replace(/ > /g, " больше ")
      .replace(/∠/g, "угол ")
      .replace(/°/g, " градусов")
      .replace(/…/g, "")
      .replace(/→/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function fracWord(den, num) {
    const w = { 2: ["вторая", "вторых"], 3: ["третья", "третьих"], 4: ["четвёртая", "четвёртых"], 5: ["пятая", "пятых"], 6: ["шестая", "шестых"], 7: ["седьмая", "седьмых"], 8: ["восьмая", "восьмых"], 9: ["девятая", "девятых"], 10: ["десятая", "десятых"], 12: ["двенадцатая", "двенадцатых"], 100: ["сотая", "сотых"] }[den];
    if (!w) return `дробь ${den}`;
    return num % 10 === 1 && num % 100 !== 11 ? w[0] : w[1];
  }

  /* ---------- browser voices ---------- */
  const synth = window.speechSynthesis;
  function voices() {
    if (!synth) return [];
    const ru = synth.getVoices().filter((v) => /^ru/i.test(v.lang));
    const score = (v) => (/natural|neural|online/i.test(v.name) ? 6 : 0) + (/google/i.test(v.name) ? 4 : 0) + (/svetlana|dariya|dmitry|milena|yuri|katya|irina|pavel|alyona/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
    return ru.sort((a, b) => score(b) - score(a));
  }
  function bestVoice() { const list = voices(); return list.find((v) => v.voiceURI === cfg.voiceURI) || list[0] || null; }

  /* ---------- engines ---------- */
  let manifest = null;
  if (location.protocol !== "file:") fetch("audio/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => (manifest = m)).catch(() => {});
  let studioOk = null;
  async function studioHealth() {
    try {
      const r = await fetch(cfg.studioUrl.replace(/\/$/, "") + "/health", { method: "GET" });
      studioOk = r.ok;
    } catch (_) { studioOk = false; }
    return studioOk;
  }
  async function studioVoices() {
    const r = await fetch(cfg.studioUrl.replace(/\/$/, "") + "/v1/audio/voices");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const list = Array.isArray(j) ? j : j.voices || j.data || [];
    return list.map((v) => (typeof v === "string" ? { id: v, name: v } : { id: v.id || v.voice_id || v.name, name: v.name || v.id || v.voice_id }));
  }
  async function studioAudio(text) {
    const r = await fetch(cfg.studioUrl.replace(/\/$/, "") + "/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: cfg.studioVoice || "alloy", input: text, response_format: "mp3", speed: cfg.rate }),
    });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/audio|octet/.test(type)) throw new Error("VoiceStudio: " + r.status + " " + (await r.text()).slice(0, 120));
    return URL.createObjectURL(await r.blob());
  }

  /* ---------- playback ---------- */
  let token = 0, audio = null;
  const listeners = new Set();
  const emit = (state, extra) => listeners.forEach((fn) => fn(state, extra));
  function stop() {
    token++;
    if (synth) synth.cancel();
    if (audio) { audio.pause(); audio = null; }
    emit("idle");
  }
  function playUrl(url, my) {
    return new Promise((res) => {
      if (my !== token) return res();
      audio = new Audio(url);
      audio.playbackRate = cfg.engine === "files" || /audio\//.test(url) ? cfg.rate : 1;
      audio.onended = audio.onerror = () => res();
      audio.play().catch(() => res());
    });
  }
  function speakBrowser(text, my) {
    return new Promise((res) => {
      if (!synth || my !== token) return res();
      const u = new SpeechSynthesisUtterance(text);
      const v = bestVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : "ru-RU";
      u.rate = cfg.rate; u.pitch = 1;
      u.onend = u.onerror = () => res();
      synth.speak(u);
      // Chrome stops long utterances after ~15 s unless nudged
      const keep = setInterval(() => { if (my !== token || !synth.speaking) return clearInterval(keep); synth.pause(); synth.resume(); }, 12000);
    });
  }
  async function engineFor(topicId) {
    if (cfg.engine === "files" || (cfg.engine === "auto" && manifest && topicId && manifest[topicId])) return manifest && manifest[topicId] ? "files" : "browser";
    if (cfg.engine === "studio" || cfg.engine === "auto") {
      if (studioOk === null) await studioHealth();
      if (studioOk) return "studio";
      if (cfg.engine === "studio") emit("error", "VoiceStudio не отвечает по адресу " + cfg.studioUrl + " — читаю голосом браузера.");
    }
    return "browser";
  }

  /* parts: [{ text, el }] — reads them one after another and marks the current element */
  async function read(parts, topicId) {
    stop();
    const my = ++token;
    const eng = await engineFor(topicId);
    emit("playing", eng);
    let next = null;
    for (let i = 0; i < parts.length && my === token; i++) {
      const p = parts[i];
      p.el && p.el.classList.add("reading");
      try {
        if (eng === "files") await playUrl("audio/" + manifest[topicId][i], my);
        else if (eng === "studio") {
          const url = await (next || studioAudio(speakable(p.text)));
          next = i + 1 < parts.length ? studioAudio(speakable(parts[i + 1].text)).catch(() => null) : null;
          if (url) await playUrl(url, my);
        } else await speakBrowser(speakable(p.text), my);
      } catch (e) {
        emit("error", String(e.message || e) + " — переключаюсь на голос браузера.");
        studioOk = false;
        await speakBrowser(speakable(p.text), my);
      }
      p.el && p.el.classList.remove("reading");
    }
    if (my === token) emit("idle");
  }
  let sayTimer = 0;
  function say(text) {
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(speakable(text));
      const v = bestVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : "ru-RU";
      u.rate = Math.min(1.3, cfg.rate * 1.08);
      synth.speak(u);
    }, 550);
  }

  if (synth) synth.onvoiceschanged = () => emit("voices");
  window.VOICE = { cfg, save, read, stop, say, voices, bestVoice, studioHealth, studioVoices, speakable, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn), get studioOk() { return studioOk; }, resetStudio: () => (studioOk = null), supported: !!synth };
})();
