(function () {
  const { build, scenes, WORDS } = window.LESSONS;
  const body = document.body;

  /* theme */
  try { const t = localStorage.getItem("math-theme"); if (t) body.dataset.theme = t; } catch (_) {}
  if (!body.dataset.theme) body.dataset.theme = "dark";
  document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.style.colorScheme = body.dataset.theme;
    try { localStorage.setItem("math-theme", body.dataset.theme); } catch (_) {}
  });
  document.documentElement.style.colorScheme = body.dataset.theme;

  /* figures */
  const MAP = { hero: build.hero, count: build.count, balance: build.balance, line: build.numberLine, tower: build.tower, abacus: build.abacus, grid: build.grid, deal: build.deal, practice: build.practice };
  document.querySelectorAll("[data-scene]").forEach((el) => {
    const make = MAP[el.dataset.scene];
    if (make) make(el);
  });
  document.querySelectorAll(".ctl[data-for]").forEach((ctl) => {
    const scene = scenes[ctl.dataset.for];
    ctl.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-do]");
      if (!b || !scene) return;
      const fn = scene.act[b.dataset.do];
      if (fn) { scene.stage.touched = true; fn(); }
    });
  });

  /* number words strip in lesson 1 */
  const words = document.querySelector("[data-words]");
  if (words) words.innerHTML = WORDS.map((w, i) => `<span><b>${i}</b>${w}</span>`).join("");

  /* one-question checks under each figure */
  document.querySelectorAll(".quiz-mini").forEach((box) => {
    const opts = box.dataset.opts.split(",");
    box.innerHTML = `<span class="quiz-k">Проверь себя</span><p>${box.dataset.q}</p><div class="quiz-opts">${opts.map((o) => `<button type="button">${o.replace("<", "&lt;").replace(">", "&gt;")}</button>`).join("")}</div><span class="quiz-f" aria-live="polite"></span>`;
    const f = box.querySelector(".quiz-f");
    box.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      const ok = opts[i] === box.dataset.a;
      b.dataset.state = ok ? "ok" : "no";
      f.textContent = ok ? "Верно!" : "Подумай ещё — попробуй на фигуре.";
      f.dataset.state = ok ? "ok" : "no";
      if (ok) box.querySelectorAll("button").forEach((x) => (x.disabled = true));
    }));
  });

  /* trainer */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const numOpts = (ans, spread = 3) => {
    const s = new Set([ans]);
    let guard = 0;
    while (s.size < 4 && guard++ < 50) { const v = ans + rnd(-spread, spread); if (v >= 0 && v !== ans) s.add(v); }
    while (s.size < 4) s.add(ans + s.size + 1);
    return shuffle([...s]).map(String);
  };
  const GEN = {
    cmp() { const a = rnd(0, 20), b = Math.random() < 0.2 ? a : rnd(0, 20); return { q: `Какой знак? ${a} … ${b}`, a: a > b ? ">" : a < b ? "<" : "=", o: ["<", "=", ">"] }; },
    count() { const n = rnd(0, 10); return { q: `Как цифрами: «${WORDS[n]}»?`, a: String(n), o: numOpts(n, 2) }; },
    add() {
      if (Math.random() < 0.5) { const a = rnd(1, 15), b = rnd(1, 15); return { q: `${a} + ${b} = ?`, a: String(a + b), o: numOpts(a + b) }; }
      const a = rnd(5, 20), b = rnd(1, a); return { q: `${a} − ${b} = ?`, a: String(a - b), o: numOpts(a - b) };
    },
    pv() {
      const n = rnd(100, 999), k = rnd(0, 2), d = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10][k];
      return { q: `Сколько ${["сотен", "десятков", "единиц"][k]} в числе ${n}?`, a: String(d), o: shuffle([...new Set([d, ...[Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10], (d + 1) % 10, (d + 5) % 10])].slice(0, 4).map(String)) };
    },
    mul() {
      const a = rnd(2, 9), b = rnd(2, 9);
      if (Math.random() < 0.55) return { q: `${a} × ${b} = ?`, a: String(a * b), o: numOpts(a * b, 6) };
      if (Math.random() < 0.6) return { q: `${a * b} : ${a} = ?`, a: String(b), o: numOpts(b, 3) };
      const n = rnd(10, 30), k = rnd(2, 6);
      return { q: `${n} : ${k} — какой остаток?`, a: String(n % k), o: shuffle([...new Set([n % k, 0, 1, k - 1, (n % k) + 1])].filter((v) => v < k + 1).slice(0, 4)).map(String) };
    },
  };
  let level = "all";
  const tq = document.querySelector("[data-tq]"), to = document.querySelector("[data-topts]"), tf = document.querySelector("[data-tf]");
  const next = () => {
    const keys = level === "all" ? ["cmp", "count", "add", "pv", "mul"] : level === "add" ? ["add"] : [level];
    const g = GEN[keys[rnd(0, keys.length - 1)]]();
    if (!g.o.includes(g.a)) g.o[0] = g.a;
    tq.textContent = g.q;
    to.innerHTML = g.o.map((o) => `<button type="button">${o.replace("<", "&lt;").replace(">", "&gt;")}</button>`).join("");
    let done = false;
    to.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      if (done) return;
      done = true;
      const ok = g.o[i] === g.a;
      b.dataset.state = ok ? "ok" : "no";
      if (!ok) to.querySelectorAll("button")[g.o.indexOf(g.a)].dataset.state = "ok";
      tf.textContent = ok ? "Верно! Кубик в лотке." : `Ответ: ${g.a}. Дальше получится!`;
      tf.dataset.state = ok ? "ok" : "no";
      scenes.practice.answer(ok);
      setTimeout(next, ok ? 900 : 1700);
    }));
  };
  document.querySelectorAll("[data-level]").forEach((b) => b.addEventListener("click", () => {
    level = b.dataset.level;
    document.querySelectorAll("[data-level]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    tf.innerHTML = "&nbsp;";
    next();
  }));
  next();

  /* reading progress and active step */
  const bar = document.querySelector(".progress span");
  const links = [...document.querySelectorAll(".steps a")];
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) links.forEach((a) => { if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".lesson").forEach((s) => io.observe(s));

  /* reveal on scroll */
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".lesson, .map").forEach((s) => rv.observe(s));
})();
