(function () {
  const { build, scenes, WORDS } = window.LESSONS;
  const S = window.SCENES;
  const COURSE = window.COURSE;
  const V = window.VOICE;
  const body = document.body;
  const view = document.getElementById("view");
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------- theme ---------- */
  try { const t = localStorage.getItem("math-theme"); if (t) body.dataset.theme = t; } catch (_) {}
  if (!body.dataset.theme) body.dataset.theme = "dark";
  document.documentElement.style.colorScheme = body.dataset.theme;
  document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.style.colorScheme = body.dataset.theme;
    try { localStorage.setItem("math-theme", body.dataset.theme); } catch (_) {}
  });

  /* ---------- progress ---------- */
  let done = {};
  try { done = JSON.parse(localStorage.getItem("math-done") || "{}"); } catch (_) {}
  const markDone = (id) => { done[id] = 1; try { localStorage.setItem("math-done", JSON.stringify(done)); } catch (_) {} };

  /* ---------- course index ---------- */
  const flat = [];
  COURSE.forEach((y) => y.topics.forEach((t, i) => flat.push(Object.assign(t, { year: y.year, yearTitle: y.title, n: i + 1, of: y.topics.length }))));
  const byId = Object.fromEntries(flat.map((t, i) => [t.id, Object.assign(t, { index: i })]));
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- scenes ---------- */
  const LEGACY = { count: "count", balance: "balance", line: "numberLine", tower: "tower", abacus: "abacus", grid: "grid", deal: "deal", practice: "practice" };
  const LEGACY_KEY = { count: "count", balance: "balance", line: "line", tower: "tower", abacus: "abacus", grid: "grid", deal: "deal", practice: "practice" };
  function makeScene(name, root, opts) {
    if (LEGACY[name]) { build[LEGACY[name]](root, opts); const s = scenes[LEGACY_KEY[name]]; return Object.assign({ params: {}, act: {} }, s); }
    if (!S[name]) { root.innerHTML = `<p class="three-fallback">Фигура «${esc(name)}» не найдена.</p>`; return null; }
    return S[name](root, opts || {});
  }
  let live = [];
  const killAll = () => { live.forEach((s) => s && s.destroy && s.destroy()); live = []; V.stop(); };

  /* ---------- views ---------- */
  function plate(fig, title, hint, scene) {
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">${esc(fig)}</span><span class="iso-plate-corner" data-corner="title">${esc(title)}</span>
      <span class="iso-plate-corner" data-corner="hint">${esc(hint)}</span><span class="iso-plate-corner" data-corner="readout" data-readout></span></div>
      <div class="iso-stage" data-scene="${scene}" tabindex="0"></div></div>`;
  }

  function home() {
    const total = flat.length, got = flat.filter((t) => done[t.id]).length;
    view.innerHTML = `
<section class="hero">
  <div class="hero-text">
    <p class="kicker">Курс · 12 лет · ${total} тем · от счёта до матриц</p>
    <h1>Математика<br>с самого начала</h1>
    <p class="lead">Двенадцать лет математики в живых машинах: счётный лоток и весы, счёты и шестерни, логарифмическая линейка, чертёжная доска с графиками и 3D-сцены с матрицами. Всё можно крутить, нажимать и слушать.</p>
    <div class="hero-cta"><a class="btn btn-main" href="#/t/${flat[0].id}">Начать с первого урока</a><a class="btn" href="#/t/matrix3">Сразу к матрицам</a></div>
    <ul class="hero-facts"><li><b>Тяни</b> фигуру — она поворачивается в 3D</li><li><b>Слушай</b> — каждый урок читает голос</li><li><b>Проверяй</b> — пройдено ${got} из ${total}</li></ul>
  </div>
  <figure class="iso-figure hero-fig"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">
    <span class="iso-plate-corner" data-corner="fig">Fig 0</span><span class="iso-plate-corner" data-corner="title">Лестница чисел</span>
    <span class="iso-plate-corner" data-corner="hint">Тяни — поворот 3D</span><span class="iso-plate-corner" data-corner="readout">1 + 2 + … + 9 = 45</span></div>
    <div class="iso-stage" data-scene="hero" tabindex="0"></div></div></figure>
</section>
<section class="years" aria-label="12 лет курса">
  <h2 class="map-title">Маршрут на 12 лет</h2>
  <div class="year-grid">${COURSE.map((y) => `
    <article class="year" id="y${y.year}">
      <header><span class="year-n">${pad(y.year)}</span><div><b>${esc(y.title)}</b><i>${esc(y.sub)}</i></div></header>
      <ol>${y.topics.map((t) => `<li><a href="#/t/${t.id}"${done[t.id] ? ' data-done=""' : ""}><span>${y.year}.${t.n}</span>${esc(t.title)}</a></li>`).join("")}</ol>
    </article>`).join("")}
  </div>
</section>`;
    live.push(build.hero(view.querySelector("[data-scene=hero]")));
    document.title = "Математика с нуля — 12 лет";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function controls(t, api) {
    const out = [];
    for (const c of t.ctl || []) {
      if (c === "|") out.push('<span class="ctl-sep"></span>');
      else if (c === "matrix") {
        const keys = api.matrix || [];
        out.push(`<span class="ctl-matrix" aria-label="Матрица 3×3">${keys.map((k) => `<input type="number" step="0.25" min="-2" max="2" data-key="${k}" value="${api.vals[k]}" aria-label="${k}">`).join("")}</span>`);
      } else if (typeof c === "string") {
        const p = api.params[c];
        if (!p) continue;
        const val = api.vals[c] ?? p.v;
        out.push(`<label class="ctl-range"><span>${esc(p.label || c)}</span><input type="range" min="${p.min}" max="${p.max}" step="${p.step || 0.01}" value="${val}" data-key="${c}"><output data-out="${c}">${window.ISO.fmt(+val)}</output></label>`);
      } else if (c.length === 1) out.push(`<span class="ctl-l">${esc(c[0])}</span>`);
      else out.push(`<button type="button" data-do="${c[1]}"${c[2] === "go" ? ' class="go"' : c[2] === true ? ' class="ctl-op"' : ""}>${c[2] === true ? '<span data-op>+</span>' : esc(c[0])}</button>`);
    }
    return out.join("");
  }
  function syncInputs(box, api) {
    box.querySelectorAll("input[data-key]").forEach((i) => { const v = api.vals[i.dataset.key]; if (v !== undefined && document.activeElement !== i) i.value = v; });
    box.querySelectorAll("output[data-out]").forEach((o) => { const v = api.vals[o.dataset.out]; if (v !== undefined) o.textContent = window.ISO.fmt(+v); });
  }

  function lesson(id) {
    const t = byId[id];
    if (!t) return home();
    const prev = flat[t.index - 1], next = flat[t.index + 1];
    view.innerHTML = `
<section class="lesson in" data-topic="${t.id}">
  <nav class="crumbs"><a href="#/">Курс</a><span>/</span><a href="#/y/${t.year}">Год ${t.year} · ${esc(t.yearTitle)}</a><span>/</span><b>Тема ${t.n} из ${t.of}</b></nav>
  <header class="lesson-head"><span class="lesson-n">${t.year}.${t.n}</span><div><p class="kicker">Год ${t.year} · ${esc(t.yearTitle)}</p><h2>${esc(t.title)}</h2></div></header>
  <div class="narr" data-narr>
    <button type="button" class="narr-play" data-listen><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg><span>Слушать урок</span></button>
    <button type="button" class="narr-stop" data-stop hidden aria-label="Остановить"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg></button>
    <span class="narr-eng" data-eng></span>
    <label class="narr-rate">скорость <select data-rate><option value="0.85">0,85×</option><option value="1">1×</option><option value="1.15">1,15×</option><option value="1.3">1,3×</option></select></label>
    <button type="button" class="narr-gear" data-voice-open aria-label="Настройки голоса"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>Голос</button>
  </div>
  <div class="lesson-body">
    <div class="lesson-text">${t.body}${t.trainer ? trainerHtml() : ""}</div>
    <div class="lesson-fig">
      ${plate(`Fig ${t.year}.${t.n}`, t.fig[0], t.fig[1], t.scene)}
      <div class="ctl" data-ctl></div>
      <figcaption class="iso-legend"><span class="iso-caption">${esc(t.caption || "")}</span></figcaption>
      </figure>
      ${t.quiz ? `<div class="quiz-mini" data-quiz></div>` : ""}
    </div>
  </div>
  <nav class="pager">${prev ? `<a href="#/t/${prev.id}"><span>← Назад · ${prev.year}.${prev.n}</span><b>${esc(prev.title)}</b></a>` : "<span></span>"}${next ? `<a class="next" href="#/t/${next.id}"><span>Дальше · ${next.year}.${next.n} →</span><b>${esc(next.title)}</b></a>` : `<a class="next" href="#/"><span>Курс пройден →</span><b>К маршруту</b></a>`}</nav>
</section>`;
    const root = view.querySelector("[data-scene]");
    const api = makeScene(t.scene, root, t.opts);
    if (api) live.push(api.stage);
    const box = view.querySelector("[data-ctl]");
    if (api) {
      box.innerHTML = controls(t, api);
      box.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-do]");
        if (!b) return;
        const fn = api.act[b.dataset.do];
        if (fn) { api.stage.touched = true; fn(); syncInputs(box, api); }
      });
      box.addEventListener("input", (e) => {
        const i = e.target.closest("input[data-key]");
        if (!i || !api.set) return;
        const v = parseFloat(i.value);
        if (!Number.isFinite(v)) return;
        api.set(i.dataset.key, v);
        syncInputs(box, api);
      });
    }
    if (t.quiz) quiz(view.querySelector("[data-quiz]"), t);
    if (t.trainer) trainer(view);
    narration(view.querySelector("[data-narr]"), t);
    document.title = `${t.title} — Математика с нуля`;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (t.id === "count") { const w = view.querySelector(".lesson-text"); w.insertAdjacentHTML("beforeend", `<div class="words">${WORDS.map((x, i) => `<span><b>${i}</b>${x}</span>`).join("")}</div>`); }
  }

  function yearView(n) {
    home();
    const el = document.getElementById("y" + n);
    if (el) { el.classList.add("flash"); setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: "instant" }), 0); }
  }

  /* ---------- quiz ---------- */
  function quiz(box, t) {
    const q = t.quiz;
    box.innerHTML = `<span class="quiz-k">Проверь себя</span><p>${esc(q.q)}</p><div class="quiz-opts">${q.o.map((o) => `<button type="button">${esc(o)}</button>`).join("")}</div><span class="quiz-f" aria-live="polite"></span>`;
    const f = box.querySelector(".quiz-f");
    box.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      const ok = q.o[i] === q.a;
      b.dataset.state = ok ? "ok" : "no";
      f.textContent = ok ? (done[t.id] ? "Верно!" : "Верно! Тема отмечена как пройденная.") : "Подумай ещё — попробуй на фигуре.";
      f.dataset.state = ok ? "ok" : "no";
      if (ok) { box.querySelectorAll("button").forEach((x) => (x.disabled = true)); markDone(t.id); }
      if (V.cfg.readouts) V.say(f.textContent);
    }));
  }

  /* ---------- trainer ---------- */
  function trainerHtml() {
    return `<div class="levels" role="group" aria-label="Что тренировать">
      <button data-level="all" aria-pressed="true">Всё</button><button data-level="cmp" aria-pressed="false">&lt; = &gt;</button><button data-level="add" aria-pressed="false">+ −</button><button data-level="pv" aria-pressed="false">Разряды</button><button data-level="mul" aria-pressed="false">× :</button></div>
      <div class="trainer" aria-live="polite"><p class="trainer-q" data-tq>…</p><div class="trainer-opts" data-topts></div><p class="trainer-f" data-tf>&nbsp;</p></div>`;
  }
  function trainer(root) {
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const numOpts = (ans, spread = 3) => { const s = new Set([ans]); let g = 0; while (s.size < 4 && g++ < 50) { const v = ans + rnd(-spread, spread); if (v >= 0 && v !== ans) s.add(v); } while (s.size < 4) s.add(ans + s.size + 1); return shuffle([...s]).map(String); };
    const GEN = {
      cmp() { const a = rnd(0, 20), b = Math.random() < 0.2 ? a : rnd(0, 20); return { q: `Какой знак? ${a} … ${b}`, a: a > b ? ">" : a < b ? "<" : "=", o: ["<", "=", ">"] }; },
      count() { const n = rnd(0, 10); return { q: `Как цифрами: «${WORDS[n]}»?`, a: String(n), o: numOpts(n, 2) }; },
      add() { if (Math.random() < 0.5) { const a = rnd(1, 15), b = rnd(1, 15); return { q: `${a} + ${b} = ?`, a: String(a + b), o: numOpts(a + b) }; } const a = rnd(5, 20), b = rnd(1, a); return { q: `${a} − ${b} = ?`, a: String(a - b), o: numOpts(a - b) }; },
      pv() { const n = rnd(100, 999), k = rnd(0, 2), ds = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10], d = ds[k]; return { q: `Сколько ${["сотен", "десятков", "единиц"][k]} в числе ${n}?`, a: String(d), o: shuffle([...new Set([d, ...ds, (d + 1) % 10, (d + 5) % 10])].slice(0, 4).map(String)) }; },
      mul() { const a = rnd(2, 9), b = rnd(2, 9); if (Math.random() < 0.55) return { q: `${a} × ${b} = ?`, a: String(a * b), o: numOpts(a * b, 6) }; return { q: `${a * b} : ${a} = ?`, a: String(b), o: numOpts(b, 3) }; },
    };
    let level = "all";
    const tq = root.querySelector("[data-tq]"), to = root.querySelector("[data-topts]"), tf = root.querySelector("[data-tf]");
    const next = () => {
      if (!document.body.contains(tq)) return;
      const keys = level === "all" ? ["cmp", "count", "add", "pv", "mul"] : [level];
      const g = GEN[keys[rnd(0, keys.length - 1)]]();
      if (!g.o.includes(g.a)) g.o[0] = g.a;
      tq.textContent = g.q;
      to.innerHTML = g.o.map((o) => `<button type="button">${esc(o)}</button>`).join("");
      if (V.cfg.readouts) V.say(g.q.replace("?", ""));
      let fin = false;
      to.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
        if (fin) return; fin = true;
        const ok = g.o[i] === g.a;
        b.dataset.state = ok ? "ok" : "no";
        if (!ok) to.querySelectorAll("button")[g.o.indexOf(g.a)].dataset.state = "ok";
        tf.textContent = ok ? "Верно! Кубик в лотке." : `Ответ: ${g.a}. Дальше получится!`;
        tf.dataset.state = ok ? "ok" : "no";
        scenes.practice.answer(ok);
        if (ok) markDone("trainer");
        setTimeout(next, ok ? 900 : 1700);
      }));
    };
    root.querySelectorAll("[data-level]").forEach((b) => b.addEventListener("click", () => {
      level = b.dataset.level;
      root.querySelectorAll("[data-level]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      tf.innerHTML = "&nbsp;"; next();
    }));
    next();
  }

  /* ---------- narration ---------- */
  const ENG = { files: "записанный голос", studio: "VoiceStudio", browser: "голос браузера" };
  function narration(bar, t) {
    const play = bar.querySelector("[data-listen]"), stopB = bar.querySelector("[data-stop]"), eng = bar.querySelector("[data-eng]"), rate = bar.querySelector("[data-rate]");
    rate.value = String(V.cfg.rate);
    rate.addEventListener("change", () => { V.cfg.rate = +rate.value; V.save(); });
    const sub = (state, extra) => {
      if (!document.body.contains(bar)) return V.off(sub);
      play.hidden = state === "playing"; stopB.hidden = state !== "playing";
      if (state === "playing") eng.textContent = ENG[extra] || "";
      if (state === "error") { eng.textContent = extra; eng.dataset.state = "no"; } else delete eng.dataset.state;
    };
    V.on(sub);
    play.addEventListener("click", () => {
      const parts = [{ text: t.title }];
      view.querySelectorAll(".lesson-text > p, .lesson-text > .note").forEach((el) => parts.push({ text: el.textContent.replace(/^(Запомни|Попробуй|Проверка|Важно)/, "$1. "), el }));
      const cap = view.querySelector(".iso-caption");
      if (cap && cap.textContent) parts.push({ text: "На фигуре. " + cap.textContent, el: cap });
      if (t.quiz) parts.push({ text: "Проверь себя. " + t.quiz.q, el: view.querySelector("[data-quiz] p") });
      V.read(parts, t.id);
    });
    stopB.addEventListener("click", () => V.stop());
    bar.querySelector("[data-voice-open]").addEventListener("click", openVoice);
  }

  /* voice settings dialog */
  const dlg = document.getElementById("voice-dlg");
  function fillVoices() {
    const sel = dlg.querySelector("[data-bvoice]");
    const list = V.voices();
    const best = V.bestVoice();
    sel.innerHTML = list.length ? list.map((v) => `<option value="${esc(v.voiceURI)}"${best && v.voiceURI === best.voiceURI ? " selected" : ""}>${esc(v.name)}${v.localService ? "" : " · онлайн"}</option>`).join("") : `<option value="">Русских голосов в браузере нет</option>`;
  }
  function openVoice() {
    dlg.querySelector("[data-engine]").value = V.cfg.engine;
    dlg.querySelector("[data-url]").value = V.cfg.studioUrl;
    dlg.querySelector("[data-readouts]").checked = !!V.cfg.readouts;
    fillVoices();
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  }
  V.on((s) => { if (s === "voices" && dlg.open) fillVoices(); });
  dlg.querySelector("[data-engine]").addEventListener("change", (e) => { V.cfg.engine = e.target.value; V.save(); });
  dlg.querySelector("[data-bvoice]").addEventListener("change", (e) => { V.cfg.voiceURI = e.target.value; V.save(); });
  dlg.querySelector("[data-readouts]").addEventListener("change", (e) => { V.cfg.readouts = e.target.checked; V.save(); });
  dlg.querySelector("[data-url]").addEventListener("change", (e) => { V.cfg.studioUrl = e.target.value.trim(); V.resetStudio(); V.save(); });
  dlg.querySelector("[data-test]").addEventListener("click", () => {
    V.read([{ text: "Привет! Это голос курса «Математика с нуля». Три плюс четыре равно семи." }], null);
  });
  dlg.querySelector("[data-check]").addEventListener("click", async () => {
    const st = dlg.querySelector("[data-sstate]"), sel = dlg.querySelector("[data-svoice]");
    st.textContent = "проверяю…"; delete st.dataset.state;
    V.cfg.studioUrl = dlg.querySelector("[data-url]").value.trim(); V.resetStudio(); V.save();
    const ok = await V.studioHealth();
    if (!ok) { st.textContent = "не отвечает — запустите VoiceStudio и разрешите запросы с этой страницы (CORS)"; st.dataset.state = "no"; return; }
    try {
      const list = await V.studioVoices();
      sel.innerHTML = list.map((v) => `<option value="${esc(v.id)}"${v.id === V.cfg.studioVoice ? " selected" : ""}>${esc(v.name)}</option>`).join("") || `<option value="">голосов нет</option>`;
      if (!V.cfg.studioVoice && list[0]) { V.cfg.studioVoice = list[0].id; V.save(); }
      st.textContent = `подключено · голосов: ${list.length}`; st.dataset.state = "ok";
    } catch (e) { st.textContent = "подключено, но список голосов не получен: " + e.message; st.dataset.state = "no"; }
  });
  dlg.querySelector("[data-svoice]").addEventListener("change", (e) => { V.cfg.studioVoice = e.target.value; V.save(); });
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close ? dlg.close() : dlg.removeAttribute("open"));

  document.addEventListener("readout", (e) => { if (V.cfg.readouts) V.say(e.detail); });

  /* ---------- router ---------- */
  function route() {
    killAll();
    const h = location.hash.replace(/^#\/?/, "");
    const [kind, arg] = h.split("/");
    if (kind === "t") lesson(arg);
    else if (kind === "y") yearView(+arg);
    else home();
    const yr = kind === "t" && byId[arg] ? byId[arg].year : kind === "y" ? +arg : 0;
    document.querySelectorAll(".steps a").forEach((a) => a.toggleAttribute("aria-current", +a.dataset.year === yr));
    document.querySelector(".progress span").style.transform = `scaleX(${kind === "t" && byId[arg] ? (byId[arg].index + 1) / flat.length : 0})`;
  }
  document.querySelector(".steps").innerHTML = COURSE.map((y) => `<a href="#/y/${y.year}" data-year="${y.year}" title="Год ${y.year}: ${esc(y.title)}">${pad(y.year)}</a>`).join("");
  addEventListener("hashchange", route);
  route();
})();
