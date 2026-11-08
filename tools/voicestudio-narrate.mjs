#!/usr/bin/env node
/* Pre-render lesson narration with a running VoiceStudio backend
   (https://github.com/debpalash/VoiceStudio), following its agent skill:
   check /health, discover voices at /v1/audio/voices, generate with
   POST /v1/audio/speech, and verify every file really is audio.

   Usage:
     node tools/voicestudio-narrate.mjs --list-voices
     node tools/voicestudio-narrate.mjs --voice <profile-id> [--url http://localhost:3900] [--only count,linear] [--format mp3]

   Writes audio/<topic>-<n>.<format> and audio/manifest.json, which the
   site plays before falling back to a live VoiceStudio or the browser voice. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
const URL_BASE = (arg("url", process.env.VOICESTUDIO_URL || "http://localhost:3900")).replace(/\/$/, "");
const FORMAT = arg("format", "mp3");
const ONLY = arg("only", "");
const headers = { "Content-Type": "application/json" };
if (process.env.VOICESTUDIO_TOKEN) headers.Authorization = `Bearer ${process.env.VOICESTUDIO_TOKEN}`;

/* load the course and the same text normaliser the site uses */
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, fetch: () => Promise.reject(new Error("offline")), console };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, "js/course.js"), "utf8"), ctx);
vm.runInContext(readFileSync(join(ROOT, "js/voice.js"), "utf8"), ctx);
const COURSE = ctx.window.COURSE, speakable = ctx.window.VOICE.speakable;
const strip = (html) => html.replace(/<span class="note-k">([^<]*)<\/span>/g, "$1. ").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

/* the same parts the site reads, in the same order */
function partsOf(t) {
  const blocks = [...t.body.matchAll(/<(p|div)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => strip(m[0]));
  const out = [t.title, ...blocks];
  if (t.caption) out.push("На фигуре. " + t.caption);
  if (t.quiz) out.push("Проверь себя. " + t.quiz.q);
  return out.map(speakable);
}

async function check() {
  let r;
  try { r = await fetch(URL_BASE + "/health", { headers }); } catch (e) { throw new Error(`VoiceStudio не отвечает на ${URL_BASE}/health — запустите приложение (или backend) и повторите.`); }
  if (r.status === 401 || r.status === 403) throw new Error("VoiceStudio требует авторизации: задайте VOICESTUDIO_TOKEN.");
  if (!r.ok) throw new Error(`/health вернул ${r.status}`);
}
async function voices() {
  const r = await fetch(URL_BASE + "/v1/audio/voices", { headers });
  if (!r.ok) throw new Error(`/v1/audio/voices вернул ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (Array.isArray(j) ? j : j.voices || j.data || []).map((v) => (typeof v === "string" ? { id: v } : v));
}
const isAudio = (buf) => {
  const h = buf.subarray(0, 12).toString("latin1");
  return h.startsWith("RIFF") || h.startsWith("ID3") || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) || h.startsWith("OggS") || h.slice(4, 8) === "ftyp" || h.startsWith("fLaC");
};

async function main() {
  await check();
  const list = await voices();
  if (process.argv.includes("--list-voices")) {
    for (const v of list) console.log(`${v.id || v.voice_id}\t${v.name || ""}\t${v.language || v.lang || ""}`);
    return;
  }
  const voice = arg("voice", "");
  if (!voice) { console.error("Укажите --voice <id>. Список: --list-voices"); process.exit(2); }
  if (!list.some((v) => (v.id || v.voice_id || v.name) === voice)) console.warn(`Внимание: голос «${voice}» не найден в /v1/audio/voices — пробую всё равно.`);
  mkdirSync(join(ROOT, "audio"), { recursive: true });
  const mf = join(ROOT, "audio/manifest.json");
  const manifest = existsSync(mf) ? JSON.parse(readFileSync(mf, "utf8")) : {};
  const topics = COURSE.flatMap((y) => y.topics).filter((t) => !ONLY || ONLY.split(",").includes(t.id));
  let seconds = 0;
  for (const t of topics) {
    const files = [];
    const parts = partsOf(t);
    for (let i = 0; i < parts.length; i++) {
      const r = await fetch(URL_BASE + "/v1/audio/speech", { method: "POST", headers, body: JSON.stringify({ model: "tts-1", voice, input: parts[i], response_format: FORMAT }) });
      const buf = Buffer.from(await r.arrayBuffer());
      if (!r.ok) throw new Error(`${t.id} #${i}: HTTP ${r.status} ${buf.toString("utf8").slice(0, 200)}`);
      if (!isAudio(buf)) throw new Error(`${t.id} #${i}: ответ не похож на аудио (${buf.length} байт, начало «${buf.subarray(0, 16).toString("latin1")}»)`);
      const name = `${t.id}-${i}.${FORMAT}`;
      writeFileSync(join(ROOT, "audio", name), buf);
      files.push(name);
      if (FORMAT === "wav" && buf.toString("latin1", 0, 4) === "RIFF") seconds += (buf.length - 44) / buf.readUInt32LE(28);
      process.stdout.write(`\r${t.id}: ${i + 1}/${parts.length}   `);
    }
    manifest[t.id] = files;
    writeFileSync(mf, JSON.stringify(manifest, null, 1));
    process.stdout.write(`\r${t.id}: ${files.length} фрагментов ✓\n`);
  }
  console.log(`Готово: ${topics.length} тем${seconds ? `, ${Math.round(seconds)} с звука` : ""}. Манифест: audio/manifest.json`);
}
main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
