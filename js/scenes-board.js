/* Figures drawn on the plotting board: functions, vectors, matrices. */
(function () {
  const { board, clamp, lerp, ease, still } = window.ISO;
  const fmt = (v, d = 2) => window.ISO.fmt(v, d);
  const S = (window.SCENES = window.SCENES || {});
  const sgn = (v, d = 2) => (v < 0 ? ` − ${fmt(-v, d)}` : ` + ${fmt(v, d)}`);
  const P = (min, max, step, v, label, extra = {}) => Object.assign({ min, max, step, v, label }, extra);
  const kx = (k) => (k === 1 ? "x" : k === -1 ? "−x" : k === 0 ? "0" : `${fmt(k)}x`);

  /* coordinate plane */
  S.coords = (root) => board(root, {
    x: [-6, 6], y: [-5, 5], plate: "КООРДИНАТНАЯ ПЛОСКОСТЬ",
    params: { px: P(-6, 6, 1, 3, "x"), py: P(-5, 5, 1, 2, "y") },
    readout: (v) => { const q = v.px > 0 && v.py > 0 ? "I четверть" : v.px < 0 && v.py > 0 ? "II четверть" : v.px < 0 && v.py < 0 ? "III четверть" : v.px > 0 && v.py < 0 ? "IV четверть" : "на оси"; return `A(${fmt(v.px)}; ${fmt(v.py)}) · ${q}`; },
    onTap: (fx, fy, st, vals, set) => { set("px", Math.round(lerp(-6, 6, clamp((fx - 0.16) / 0.68, 0, 1)))); set("py", Math.round(lerp(5, -5, clamp((fy - 0.12) / 0.62, 0, 1)))); },
    paint(B, v) {
      for (const [x, y, t] of [[3.4, 4.2, "I"], [-3.4, 4.2, "II"], [-3.4, -4.4, "III"], [3.4, -4.4, "IV"]]) B.text(x, y, t, { tone: "lo", size: 7 });
      B.seg([v.px, 0], [v.px, v.py], { tone: "mid", dashed: true });
      B.seg([0, v.py], [v.px, v.py], { tone: "mid", dashed: true });
      B.dot(v.px, 0, { tone: "mid", r: 2.2 }); B.dot(0, v.py, { tone: "mid", r: 2.2 });
      B.bar(v.px - 0.18, 0.36, v.py, { base: 0, d: 8, op: 0.9 });
      B.dot(v.px, v.py, { label: `A(${fmt(Math.round(v.px))}; ${fmt(Math.round(v.py))})`, front: true });
      B.cursor(v.px, v.py);
    },
  });

  /* linear function */
  S.linear = (root) => board(root, {
    x: [-6, 6], y: [-6, 6], plate: "y = kx + b",
    params: { k: P(-3, 3, 0.25, 1, "k — наклон"), b: P(-5, 5, 0.5, 1, "b — сдвиг") },
    readout: (v) => `y = ${kx(v.k)}${sgn(v.b)}${v.k !== 0 ? ` · корень x = ${fmt(-v.b / v.k)}` : ""}`,
    paint(B, v) {
      B.fn((x) => v.k * x + v.b, { tone: "lit", w: 1.6 });
      B.seg([1, v.k + v.b], [2, v.k + v.b], { tone: "mid", dashed: true });
      B.seg([2, v.k + v.b], [2, 2 * v.k + v.b], { tone: "mid", dashed: true });
      B.text(1.5, v.k + v.b - 0.5, "1", { tone: "mid", size: 5 });
      B.text(2.5, 1.5 * v.k + v.b, `k = ${fmt(v.k)}`, { tone: "mid", size: 5, anchor: "start" });
      B.dot(0, v.b, { label: `b = ${fmt(v.b)}`, dx: 0.3, dy: -0.6 });
      if (Math.abs(v.k) > 0.05 && Math.abs(v.b / v.k) <= 6) B.dot(-v.b / v.k, 0, { tone: "hi", r: 2.6 });
    },
  });

  /* systems of two linear equations */
  S.system = (root) => board(root, {
    x: [-6, 6], y: [-6, 6], plate: "СИСТЕМА",
    params: { k1: P(-3, 3, 0.25, 1, "k₁"), b1: P(-5, 5, 0.5, 1, "b₁"), k2: P(-3, 3, 0.25, -0.5, "k₂"), b2: P(-5, 5, 0.5, 4, "b₂") },
    readout: (v) => {
      if (Math.abs(v.k1 - v.k2) < 1e-9) return Math.abs(v.b1 - v.b2) < 1e-9 ? "прямые совпадают — решений бесконечно много" : "прямые параллельны — решений нет";
      const x = (v.b2 - v.b1) / (v.k1 - v.k2); return `решение: x = ${fmt(x)}, y = ${fmt(v.k1 * x + v.b1)}`;
    },
    paint(B, v) {
      B.fn((x) => v.k1 * x + v.b1, { tone: "lit", w: 1.5 });
      B.fn((x) => v.k2 * x + v.b2, { tone: "hi", dashed: true, w: 1.3 });
      if (Math.abs(v.k1 - v.k2) > 0.02) {
        const x = (v.b2 - v.b1) / (v.k1 - v.k2), y = v.k1 * x + v.b1;
        if (Math.abs(x) < 6 && Math.abs(y) < 6) { B.dot(x, y, { label: `(${fmt(x, 1)}; ${fmt(y, 1)})`, front: true }); B.cursor(x, y); }
      }
      B.text(-5.5, 5.2, `y = ${kx(v.k1)}${sgn(v.b1)}`, { anchor: "start", size: 5.2 });
      B.text(-5.5, 4.4, `y = ${kx(v.k2)}${sgn(v.b2)}`, { anchor: "start", size: 5.2, tone: "mid" });
    },
  });

  /* quadratic */
  S.parabola = (root) => board(root, {
    x: [-6, 6], y: [-6, 8], plate: "y = ax² + bx + c",
    params: { a: P(-2, 2, 0.1, 1, "a"), b: P(-5, 5, 0.5, -1, "b"), c: P(-5, 5, 0.5, -3, "c") },
    readout: (v) => {
      const a = v.a || 1e-9, D = v.b * v.b - 4 * a * v.c;
      if (Math.abs(v.a) < 1e-9) return "a = 0 — это уже прямая, а не парабола";
      if (D < 0) return `D = ${fmt(D)} < 0 · корней нет`;
      const r1 = (-v.b - Math.sqrt(D)) / (2 * a), r2 = (-v.b + Math.sqrt(D)) / (2 * a);
      return D === 0 ? `D = 0 · один корень x = ${fmt(r1)}` : `D = ${fmt(D)} · x₁ = ${fmt(Math.min(r1, r2))}, x₂ = ${fmt(Math.max(r1, r2))}`;
    },
    paint(B, v) {
      const a = Math.abs(v.a) < 1e-3 ? 1e-3 : v.a;
      const f = (x) => a * x * x + v.b * x + v.c;
      const xv = -v.b / (2 * a), yv = f(xv);
      B.seg([xv, -6], [xv, 8], { tone: "mid", dashed: true });
      B.fn(f, { tone: "lit", w: 1.6, n: 300 });
      if (Math.abs(xv) < 6 && yv > -6 && yv < 8) B.dot(xv, yv, { label: "вершина", tone: "hi", dy: a > 0 ? -0.9 : 0.6 });
      const D = v.b * v.b - 4 * a * v.c;
      if (D >= 0) for (const r of [(-v.b - Math.sqrt(D)) / (2 * a), (-v.b + Math.sqrt(D)) / (2 * a)]) if (Math.abs(r) < 6) { B.dot(r, 0, { front: true }); B.bar(r - 0.12, 0.24, -0.6, { base: 0, d: 6 }); }
      B.dot(0, v.c, { tone: "mid", r: 2.4 });
    },
  });

  /* inverse proportion */
  S.hyperbola = (root) => board(root, {
    x: [-6, 6], y: [-6, 6], plate: "y = k / x",
    params: { k: P(-8, 8, 1, 4, "k"), t: P(0.5, 6, 0.25, 2, "x точки") },
    readout: (v) => `y = ${fmt(v.k)}/x · x·y = ${fmt(v.t)}·${fmt(v.k / v.t)} = ${fmt(v.k)}`,
    paint(B, v) {
      const k = Math.abs(v.k) < 0.05 ? 0.05 : v.k;
      B.fn((x) => k / x, { tone: "lit", from: -6, to: -0.02, w: 1.5, n: 400 });
      B.fn((x) => k / x, { tone: "lit", from: 0.02, to: 6, w: 1.5, n: 400 });
      const y = k / v.t;
      if (Math.abs(y) <= 6) {
        B.fill([[0, 0], [v.t, 0], [v.t, y], [0, y]], { tone: "lit", op: 0.16 });
        B.line([[0, y], [v.t, y], [v.t, 0]], { tone: "mid", dashed: true });
        B.text(v.t / 2, y / 2, `S = ${fmt(k)}`, { size: 5.5, tone: "hi" });
        B.dot(v.t, y, { label: `(${fmt(v.t)}; ${fmt(y)})` });
      }
    },
  });

  /* sequences */
  S.seq = (root) => board(root, {
    x: [0, 11], y: [-4, 30], plate: "ПРОГРЕССИИ", lab: 0, grid: 0, s: 26, sy: 6.6, fit: 12, az: 72, el: 16,
    params: { a1: P(1, 5, 1, 2, "a₁"), d: P(-2, 3, 0.5, 2, "d / шаг"), q: P(0.5, 1.5, 0.05, 1.3, "q / множитель") },
    state: { geo: false },
    readout: (v, st) => {
      let a = v.a1, sum = 0; const out = [];
      for (let n = 1; n <= 10; n++) { out.push(a); sum += a; a = st.geo ? a * v.q : a + v.d; }
      return st.geo ? `bₙ = ${fmt(v.a1)}·${fmt(v.q)}ⁿ⁻¹ · b₁₀ = ${fmt(out[9], 1)} · S₁₀ = ${fmt(sum, 1)}` : `aₙ = ${fmt(v.a1)} + (n−1)·${fmt(v.d)} · a₁₀ = ${fmt(out[9])} · S₁₀ = ${fmt(sum)}`;
    },
    acts: { mode: (st) => { st.geo = !st.geo; } },
    paint(B, v, st) {
      const minor = [];
      for (let y = 0; y <= 30; y += 5) { B.seg([0, y], [11, y], { tone: y ? "faint" : "mid" }); if (y) B.text(-0.2, y, String(y), { size: 4.5, tone: "lo", anchor: "end" }); }
      let a = v.a1;
      for (let n = 1; n <= 10; n++) {
        const h = clamp(a, -4, 30);
        B.bar(n - 0.35, 0.7, h, { base: 0, d: 12, label: fmt(a, 1), lit: true });
        B.text(n, -1.4, String(n), { size: 4.8, tone: "mid" });
        a = st.geo ? a * v.q : a + v.d;
      }
      B.text(10.8, 28, st.geo ? "геометрическая: ×q" : "арифметическая: +d", { anchor: "end", size: 5.5 });
    },
  });

  /* unit circle and the sine wave */
  S.trig = (root) => board(root, {
    x: [-2.6, 7], y: [-1.6, 1.6], plate: "ЕДИНИЧНАЯ ОКРУЖНОСТЬ", s: 32, grid: 0.5, lab: 0, az: 76, el: 14,
    params: { t: P(0, 720, 5, 30, "Угол, °", { k: 60, c: 14 }) },
    state: { spin: false },
    acts: { spin: (st) => { st.spin = !st.spin; } },
    update(dt, st, vals) { if (st.spin) { vals.t = (vals.t + dt * 60) % 720; return true; } return false; },
    readout: (v) => { const r = v.t * Math.PI / 180; return `${Math.round(v.t)}° · sin = ${fmt(Math.sin(r), 3)} · cos = ${fmt(Math.cos(r), 3)}`; },
    paint(B, v, st) {
      const deg = st.spin ? B.vals.t : v.t, r = deg * Math.PI / 180, cx = -1.4;
      B.line(B.circle(cx, 0, 1), { tone: "mid" });
      B.seg([cx - 1.15, 0], [cx + 1.15, 0], { tone: "lo" }); B.seg([cx, -1.15], [cx, 1.15], { tone: "lo" });
      const px = cx + Math.cos(r), py = Math.sin(r);
      B.line(B.circle(cx, 0, 0.25, 0, r % (2 * Math.PI), 40), { tone: "lit" });
      B.seg([cx, 0], [px, py], { tone: "lit", w: 1.4 });
      B.seg([px, 0], [px, py], { tone: "hi", w: 1.4 });
      B.seg([cx, 0], [px, 0], { tone: "mid", w: 1.4 });
      const wx = (r % (4 * Math.PI)) / (4 * Math.PI) * 6.8;
      B.fn((x) => Math.sin(x / 6.8 * 4 * Math.PI), { from: 0, to: 6.8, tone: "mid" });
      B.fn((x) => Math.sin(x / 6.8 * 4 * Math.PI), { from: 0, to: wx, tone: "lit", w: 1.6 });
      B.seg([px, py], [wx, py], { tone: "mid", dotted: true });
      for (const [x, t] of [[1.7, "180°"], [3.4, "360°"], [5.1, "540°"], [6.8, "720°"]]) { B.seg([x, -0.08], [x, 0.08], { tone: "mid" }); B.text(x, -0.3, t, { size: 4.2, tone: "lo" }); }
      B.text(cx, 1.35, "sin — высота точки", { size: 4.2, tone: "mid" });
      B.dot(px, py, { tone: "lit" });
      B.dot(wx, py, { tone: "lit", front: true });
      B.bar(wx - 0.06, 0.12, py, { base: 0, d: 7 });
    },
  });

  /* derivative: the tangent rides along the curve */
  S.derivative = (root) => {
    const f = (x) => x * x * x / 6 - x, df = (x) => x * x / 2 - 1;
    return board(root, {
      x: [-4, 4], y: [-4, 4], plate: "КАСАТЕЛЬНАЯ",
      params: { x0: P(-3.5, 3.5, 0.05, -1.8, "x₀", { k: 80, c: 16 }), h: P(0.05, 2, 0.05, 1.2, "h — шаг секущей") },
      readout: (v) => `f(x) = x³/6 − x · f′(${fmt(v.x0)}) = ${fmt(df(v.x0), 3)} · (f(x₀+h)−f(x₀))/h = ${fmt((f(v.x0 + v.h) - f(v.x0)) / v.h, 3)}`,
      paint(B, v) {
        B.fn(df, { tone: "lo", dashed: true });
        B.fn(f, { tone: "hi", w: 1.4 });
        const x0 = v.x0, y0 = f(x0), k = df(x0);
        B.fn((x) => y0 + k * (x - x0), { tone: "lit", w: 1.6, from: x0 - 2.2, to: x0 + 2.2 });
        const x1 = x0 + v.h, y1 = f(x1);
        B.fn((x) => y0 + (y1 - y0) / v.h * (x - x0), { tone: "mid", dashed: true, from: x0 - 1, to: x1 + 1 });
        B.dot(x1, y1, { tone: "mid", r: 2.4 });
        B.dot(x0, y0, { label: `k = ${fmt(k, 2)}`, front: true });
        B.dot(x0, k, { tone: "mid", r: 2.2 });
        B.cursor(x0, y0);
        B.text(3.6, 3.5, "f′(x)", { tone: "lo", size: 5, anchor: "end" });
      },
    });
  };

  /* integral: Riemann blocks fill the area */
  S.integral = (root) => {
    const f = (x) => x * x / 4 + 0.5, F = (x) => x * x * x / 12 + x / 2;
    return board(root, {
      x: [-0.5, 5], y: [-0.5, 6.5], plate: "ПЛОЩАДЬ ПОД КРИВОЙ", az: 70, el: 18,
      params: { n: P(1, 40, 1, 6, "Число столбиков", { snap: true }), b: P(0.5, 4.5, 0.25, 4, "Верхний предел b") },
      readout: (v) => { let s = 0; const w = v.b / v.n; for (let i = 0; i < v.n; i++) s += f(w * (i + 0.5)) * w; return `Σ = ${fmt(s, 3)} · ∫₀^${fmt(v.b)} = ${fmt(F(v.b), 3)} · ошибка ${fmt(Math.abs(F(v.b) - s), 4)}`; },
      paint(B, v) {
        const n = Math.round(B.vals.n), b = v.b, w = b / n;
        const pts = [[0, 0]];
        for (let i = 0; i <= 60; i++) pts.push([b * i / 60, f(b * i / 60)]);
        pts.push([b, 0]);
        B.fill(pts, { tone: "lit", op: 0.12 });
        for (let i = 0; i < n; i++) B.bar(w * i + w * 0.04, w * 0.92, f(w * (i + 0.5)), { base: 0, d: 10, lit: true });
        B.fn(f, { tone: "lit", w: 1.6, front: true });
        B.seg([b, 0], [b, f(b)], { tone: "hi", dashed: true });
        B.text(b, -0.35, "b", { size: 5 });
      },
    });
  };

  /* vectors on the plane */
  S.vectors = (root) => board(root, {
    x: [-6, 6], y: [-5, 5], plate: "ВЕКТОРЫ",
    params: { ax: P(-5, 5, 0.5, 3, "aₓ"), ay: P(-5, 5, 0.5, 1, "a_y"), bx: P(-5, 5, 0.5, 1, "bₓ"), by: P(-5, 5, 0.5, 3, "b_y") },
    readout: (v) => { const sx = v.ax + v.bx, sy = v.ay + v.by; return `a + b = (${fmt(sx)}; ${fmt(sy)}) · |a + b| = ${fmt(Math.hypot(sx, sy), 2)} · a·b = ${fmt(v.ax * v.bx + v.ay * v.by)}`; },
    paint(B, v) {
      const a = [v.ax, v.ay], b = [v.bx, v.by], s = [a[0] + b[0], a[1] + b[1]];
      B.fill([[0, 0], a, s, b], { tone: "lit", op: 0.08 });
      B.seg(a, s, { tone: "mid", dashed: true }); B.seg(b, s, { tone: "mid", dashed: true });
      B.arrow([0, 0], a, { tone: "hi", w: 1.6 }); B.arrow([0, 0], b, { tone: "hi", w: 1.6 });
      B.arrow([0, 0], s, { tone: "lit", w: 2 });
      B.text(a[0] / 2 + 0.3, a[1] / 2 - 0.4, "a", { size: 6.5 }); B.text(b[0] / 2 - 0.4, b[1] / 2 + 0.3, "b", { size: 6.5 });
      B.text(s[0] / 2 + 0.4, s[1] / 2 + 0.4, "a+b", { size: 6 });
    },
  });

  /* complex numbers: multiplication rotates and stretches */
  S.complex = (root) => board(root, {
    x: [-5, 5], y: [-4, 4], plate: "КОМПЛЕКСНАЯ ПЛОСКОСТЬ", xl: "Re", yl: "Im",
    params: { r: P(0.25, 4, 0.05, 2, "|z|", { k: 70, c: 16 }), phi: P(-360, 720, 5, 30, "arg z, °", { k: 70, c: 16 }) },
    readout: (v) => { const p = v.phi * Math.PI / 180; return `z = ${fmt(v.r * Math.cos(p))}${sgn(v.r * Math.sin(p)).replace(" + ", " + ").replace(" − ", " − ")}i · |z| = ${fmt(v.r)} · arg z = ${fmt(((v.phi % 360) + 360) % 360, 0)}°`; },
    acts: {
      mulI: (st, vals, set) => set("phi", vals.phi + 90),
      mul2: (st, vals, set) => set("r", vals.r * 2 > 4 ? vals.r / 4 : vals.r * 2),
      mul1i: (st, vals, set) => { set("r", vals.r * Math.SQRT2 > 4 ? vals.r / 2 : vals.r * Math.SQRT2); set("phi", vals.phi + 45); },
      conj: (st, vals, set) => set("phi", -vals.phi),
    },
    paint(B, v) {
      const p = v.phi * Math.PI / 180, z = [v.r * Math.cos(p), v.r * Math.sin(p)];
      B.line(B.circle(0, 0, 1), { tone: "mid", dashed: true });
      B.line(B.circle(0, 0, v.r), { tone: "faint" });
      const ap = ((p % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      B.line(B.circle(0, 0, 0.6, 0, ap, 48), { tone: "lit" });
      B.seg([z[0], 0], z, { tone: "mid", dashed: true }); B.seg([0, z[1]], z, { tone: "mid", dashed: true });
      B.arrow([0, 0], z, { tone: "lit", w: 1.8 });
      B.dot(z[0], z[1], { label: "z", front: true });
      B.text(1, -0.35, "1", { size: 5, tone: "mid" }); B.text(-0.35, 1.05, "i", { size: 5, tone: "mid" });
    },
  });

  /* 2×2 matrix as a transformation of the plane (and its determinant) */
  S.matrix2 = (root, opts = {}) => board(root, {
    x: [-5, 5], y: [-4, 4], plate: opts.det ? "ОПРЕДЕЛИТЕЛЬ" : "МАТРИЦА 2×2", grid: 1, lab: 1,
    params: { a: P(-2, 2, 0.25, 1, "a"), b: P(-2, 2, 0.25, 0.5, "b"), c: P(-2, 2, 0.25, 0, "c"), d: P(-2, 2, 0.25, 1, "d") },
    readout: (v) => { const det = v.a * v.d - v.b * v.c; return `[${fmt(v.a)} ${fmt(v.b)}; ${fmt(v.c)} ${fmt(v.d)}] · det = ad − bc = ${fmt(det, 3)}${opts.det ? ` · площадь ×${fmt(Math.abs(det), 3)}${det < 0 ? ", зеркально" : det === 0 ? ", плоскость сплющена" : ""}` : ""}`; },
    acts: {
      id: (st, vals, set) => { set("a", 1); set("b", 0); set("c", 0); set("d", 1); },
      rot: (st, vals, set) => { set("a", 0); set("b", -1); set("c", 1); set("d", 0); },
      shear: (st, vals, set) => { set("a", 1); set("b", 1); set("c", 0); set("d", 1); },
      scale: (st, vals, set) => { set("a", 2); set("b", 0); set("c", 0); set("d", 0.5); },
      flip: (st, vals, set) => { set("a", -1); set("b", 0); set("c", 0); set("d", 1); },
      flat: (st, vals, set) => { set("a", 1); set("b", 2); set("c", 0.5); set("d", 1); },
    },
    paint(B, v) {
      const T = ([x, y]) => [v.a * x + v.b * y, v.c * x + v.d * y];
      const lines = [];
      for (let k = -6; k <= 6; k++) { lines.push([T([k, -6]), T([k, 6])], [T([-6, k]), T([6, k])]); }
      const clip = (p) => p;
      for (const [p, q] of lines) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24, x = lerp(p[0], q[0], t), y = lerp(p[1], q[1], t); if (Math.abs(x) <= 5 && Math.abs(y) <= 4) pts.push([x, y]); else if (pts.length > 1) { B.line(pts, { tone: "lo" }); pts.length = 0; } else pts.length = 0; }
        if (pts.length > 1) B.line(pts, { tone: "lo" });
      }
      const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(T);
      B.fill(sq, { tone: "lit", op: opts.det ? 0.28 : 0.14 });
      B.line(sq.concat([sq[0]]), { tone: "hi" });
      if (!opts.det) {
        const F = [[0, 0], [0, 2], [1.2, 2], [1.2, 1.7], [0.3, 1.7], [0.3, 1.15], [0.9, 1.15], [0.9, 0.85], [0.3, 0.85], [0.3, 0], [0, 0]].map(([x, y]) => T([x - 2.6, y - 1]));
        B.line(F, { tone: "lit", w: 1.3 });
      }
      B.arrow([0, 0], T([1, 0]), { tone: "red", w: 2 });
      B.arrow([0, 0], T([0, 1]), { tone: "green", w: 2 });
      const i1 = T([1, 0]), j1 = T([0, 1]);
      B.text(i1[0] + 0.3, i1[1] - 0.35, "i′", { size: 6, tone: "hi" });
      B.text(j1[0] - 0.3, j1[1] + 0.3, "j′", { size: 6, tone: "hi" });
      if (opts.det) { const cc = T([0.5, 0.5]); B.text(cc[0], cc[1], fmt(v.a * v.d - v.b * v.c, 2), { size: 6.5, tone: "hi" }); }
    },
  });

  /* decimals: a magnified unit segment */
  S.decimal = (root) => board(root, {
    x: [-0.05, 1.05], y: [-0.5, 0.6], s: 270, grid: 0, lab: 0, axes: false, plate: "ОТ 0 ДО 1", az: 78, el: 14,
    params: { v: P(0, 1, 0.01, 0.37, "Число", { k: 90, c: 18 }) },
    readout: (v) => { const n = Math.round(v.v * 100); return `${fmt(n / 100)} = ${n}/100 = ${Math.floor(n / 10)} десят. + ${n % 10} сот.`; },
    paint(B, v) {
      B.seg([0, 0], [1, 0], { tone: "hi", w: 1.4 });
      for (let i = 0; i <= 100; i++) { const x = i / 100, big = i % 10 === 0; B.seg([x, 0], [x, big ? 0.09 : i % 5 === 0 ? 0.055 : 0.035], { tone: big ? "hi" : "lo" }); if (big) B.text(x, -0.1, fmt(i / 100, 1), { size: 5.5, tone: "mid" }); }
      const n = Math.round(B.vals.v * 100);
      for (let i = 0; i < Math.floor(n / 10); i++) B.block(i / 10 + 0.004, 0.18, 0.092, 0.2, { lit: true, d: 8 });
      for (let i = 0; i < n % 10; i++) B.block(Math.floor(n / 10) / 10 + i / 100 + 0.001, 0.18, 0.008, 0.2, { lit: true, d: 8 });
      B.text(0.5, 0.48, "десятые — широкие бруски, сотые — тонкие пластинки", { size: 4.8, tone: "mid" });
      B.dot(v.v, 0, { label: fmt(v.v), dy: -0.22, front: true });
      B.cursor(v.v, 0);
    },
  });

  /* fractions with different denominators: strips */
  S.fracstrip = (root) => {
    const g = (a, b) => (b ? g(b, a % b) : a), l = (a, b) => a / g(a, b) * b;
    return board(root, {
      x: [-0.1, 2.1], y: [0, 3.6], s: 150, grid: 0, lab: 0, axes: false, plate: "ПОЛОСКИ ДРОБЕЙ", az: 76, el: 16,
      params: { k1: P(1, 6, 1, 1, "Числитель 1"), n1: P(2, 6, 1, 2, "Знаменатель 1"), k2: P(1, 6, 1, 1, "Числитель 2"), n2: P(2, 6, 1, 3, "Знаменатель 2") },
      onSet: (k, val, st, vals) => { if (vals.k1 > vals.n1) vals.k1 = vals.n1; if (vals.k2 > vals.n2) vals.k2 = vals.n2; },
      readout: (v) => { const L = l(v.n1, v.n2), num = v.k1 * L / v.n1 + v.k2 * L / v.n2, G = g(num, L); return `${v.k1}/${v.n1} + ${v.k2}/${v.n2} = ${v.k1 * L / v.n1}/${L} + ${v.k2 * L / v.n2}/${L} = ${num}/${L}${G > 1 ? ` = ${num / G}/${L / G}` : ""}`; },
      paint(B) {
        const v = B.vals, k1 = Math.min(v.k1, v.n1), k2 = Math.min(v.k2, v.n2), L = l(v.n1, v.n2);
        const row = (y, n, k, off, lab) => {
          B.line([[0, y], [1, y], [1, y + 0.6], [0, y + 0.6], [0, y]], { tone: "mid" });
          for (let i = 1; i < n; i++) B.seg([i / n, y], [i / n, y + 0.6], { tone: "lo" });
          for (let i = 0; i < k; i++) B.block(off + i / n + 0.004, y, 1 / n - 0.008, 0.6, { lit: true, d: 9 });
          B.text(-0.04, y + 0.3, lab, { anchor: "end", size: 6 });
        };
        row(2.8, v.n1, k1, 0, `${k1}/${v.n1}`);
        row(1.9, v.n2, k2, 0, `${k2}/${v.n2}`);
        const a = k1 * L / v.n1, b = k2 * L / v.n2;
        for (const s of [0, 1]) { B.line([[s, 0.6], [s + 1, 0.6], [s + 1, 1.2], [s, 1.2], [s, 0.6]], { tone: "mid" }); for (let i = 1; i < L; i++) B.seg([s + i / L, 0.6], [s + i / L, 1.2], { tone: "faint" }); }
        for (let i = 0; i < a + b; i++) B.block(i / L + 0.003, 0.6, 1 / L - 0.006, 0.6, { lit: true, d: 9, tone: i < a ? "hi" : "mid" });
        B.text(-0.04, 0.9, `/${L}`, { anchor: "end", size: 6 });
        B.text(1, 0.25, "общий знаменатель — полоска режется на части обеих дробей", { size: 4.6, tone: "mid" });
      },
    });
  };

  /* π: a wheel unrolls along the ground */
  S.pi = (root) => board(root, {
    x: [-0.6, 8.2], y: [-0.6, 2.8], s: 34, grid: 0.5, lab: 1, plate: "ДЛИНА ОКРУЖНОСТИ",
    params: { d: P(0.5, 2.4, 0.1, 2, "Диаметр d"), t: P(0, 1, 0.01, 0, "Прокат", { k: 30, c: 11 }) },
    acts: { roll: (st, vals, set) => set("t", vals.t > 0.5 ? 0 : 1) },
    readout: (v) => `C = π·d = 3,1416·${fmt(v.d, 1)} = ${fmt(Math.PI * v.d, 3)} · прокат ${Math.round(v.t * 100)}%`,
    paint(B, v) {
      const r = v.d / 2, dist = v.t * Math.PI * v.d, cx = dist, th = -dist / r;
      B.line(B.circle(cx, r, r, 0, Math.PI * 2, 120), { tone: "hi", w: 1.4 });
      B.line(B.circle(cx, r, r * 0.12), { tone: "mid" });
      for (let i = 0; i < 6; i++) { const a = th + i * Math.PI / 3; B.seg([cx, r], [cx + Math.cos(a) * r * 0.9, r + Math.sin(a) * r * 0.9], { tone: "lo" }); }
      const mark = [cx + Math.cos(th - Math.PI / 2) * r, r + Math.sin(th - Math.PI / 2) * r];
      const cyc = [];
      for (let i = 0; i <= 80; i++) { const s = dist * i / 80, a = -s / r - Math.PI / 2; cyc.push([s + Math.cos(a) * r, r + Math.sin(a) * r]); }
      B.line(cyc, { tone: "mid", dotted: true });
      B.bar(0, Math.max(0.0001, dist), 0, { base: -0.12, d: 8 });
      B.seg([0, 0], [dist, 0], { tone: "lit", w: 2 });
      B.seg([cx - r, r], [cx + r, r], { tone: "mid", dashed: true });
      B.text(cx, r + 0.15, "d", { size: 5.5, tone: "mid" });
      B.dot(mark[0], mark[1], { tone: "lit" });
      for (let k = 1; k <= 3; k++) { const x = k * v.d; B.seg([x, -0.25], [x, 0.25], { tone: "hi" }); B.text(x, -0.45, `${k}d`, { size: 4.8, tone: "mid" }); }
      B.dot(Math.PI * v.d, 0, { tone: "hi", label: "πd", dy: -0.5, dx: 0 });
    },
  });

  /* triangle angles sum */
  S.triangle = (root) => board(root, {
    x: [-1, 9], y: [-1, 6], s: 32, plate: "СУММА УГЛОВ", grid: 1, lab: 0,
    params: { cx: P(0.5, 7.5, 0.25, 2.5, "Вершина C: x"), cy: P(1.5, 5, 0.25, 4, "Вершина C: y"), fold: P(0, 1, 0.01, 0, "Сложить углы", { k: 30, c: 11 }) },
    acts: { fold: (st, vals, set) => set("fold", vals.fold > 0.5 ? 0 : 1) },
    readout: (v) => { const A = [0, 0], B2 = [8, 0], C = [v.cx, v.cy]; const ang = (p, q, r) => { const a = Math.atan2(q[1] - p[1], q[0] - p[0]), b = Math.atan2(r[1] - p[1], r[0] - p[0]); let d = Math.abs(a - b) * 180 / Math.PI; return d > 180 ? 360 - d : d; }; const a = ang(A, B2, C), b = ang(B2, A, C), c = 180 - a - b; return `α = ${fmt(a, 1)}° + β = ${fmt(b, 1)}° + γ = ${fmt(c, 1)}° = 180°`; },
    paint(B, v) {
      const A = [0, 0], Bp = [8, 0], C = [v.cx, v.cy];
      const dir = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
      B.fill([A, Bp, C], { tone: "lit", op: 0.06 });
      B.line([A, Bp, C, A], { tone: "hi", w: 1.4 });
      B.seg([C[0] - 4, C[1]], [C[0] + 4, C[1]], { tone: "mid", dashed: true });
      const f = ease(v.fold);
      const wedge = (p, a0, a1, tone, target, rot) => {
        const R = 0.8;
        const pts = [[0, 0]];
        for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
        const ang = rot * f, ox = lerp(p[0], target[0], f), oy = lerp(p[1], target[1], f);
        B.fill(pts.map(([x, y]) => [ox + x * Math.cos(ang) - y * Math.sin(ang), oy + x * Math.sin(ang) + y * Math.cos(ang)]), { tone, op: 0.55 });
      };
      const aA0 = 0, aA1 = dir(A, C), aB0 = dir(Bp, C), aB1 = Math.PI, aC0 = dir(C, Bp), aC1 = dir(C, A);
      wedge(C, aC0, aC1, "lit", C, 0);
      wedge(A, aA0, aA1, "red", C, aC1 - aA0 + 0);
      wedge(Bp, aB0, aB1, "green", C, aC0 - aB1 + Math.PI * 2 - Math.PI * 2);
      B.text(A[0] + 0.3, -0.5, "A", { size: 6 }); B.text(Bp[0] - 0.3, -0.5, "B", { size: 6 }); B.text(C[0], C[1] + 0.45, "C", { size: 6 });
    },
  });

  /* Pythagoras: squares on the sides */
  S.pythagoras = (root) => board(root, {
    x: [-5.4, 10.6], y: [-5.4, 10.6], s: 15, grid: 0, lab: 0, axes: false, plate: "a² + b² = c²", az: 76, el: 18,
    params: { a: P(1, 5, 1, 3, "Катет a", { snap: true }), b: P(1, 5, 1, 4, "Катет b", { snap: true }) },
    readout: (v) => { const c2 = v.a * v.a + v.b * v.b, c = Math.sqrt(c2); return `${v.a}² + ${v.b}² = ${v.a * v.a} + ${v.b * v.b} = ${c2} = c² → c = ${Number.isInteger(c) ? c : "√" + c2 + " ≈ " + fmt(c, 3)}`; },
    paint(B) {
      const a = B.vals.a, b = B.vals.b;
      const O = [0, 0], Pb = [b, 0], Pa = [0, a];
      const sqr = (p, q, tone, n) => {
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const r = [q[0] + dy, q[1] - dx], s = [p[0] + dy, p[1] - dx];
        B.fill([p, q, r, s], { tone, op: 0.22 });
        B.line([p, q, r, s, p], { tone: "hi" });
        if (n) for (let i = 1; i < n; i++) { const t = i / n; B.seg([lerp(p[0], q[0], t), lerp(p[1], q[1], t)], [lerp(s[0], r[0], t), lerp(s[1], r[1], t)], { tone: "lo" }); B.seg([lerp(p[0], s[0], t), lerp(p[1], s[1], t)], [lerp(q[0], r[0], t), lerp(q[1], r[1], t)], { tone: "lo" }); }
        return [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
      };
      const ca = sqr(Pa, O, "red", a), cb = sqr(O, Pb, "green", b);
      const c = Math.sqrt(a * a + b * b);
      const cc = sqr(Pb, Pa, "lit", Number.isInteger(c) ? c : 0);
      B.fill([O, Pb, Pa], { tone: "lit", op: 0.5 });
      B.line([O, Pb, Pa, O], { tone: "lit", w: 1.6 });
      B.text(ca[0], ca[1], `a² = ${a * a}`, { size: 6 });
      B.text(cb[0], cb[1], `b² = ${b * b}`, { size: 6 });
      B.text(cc[0], cc[1], `c² = ${a * a + b * b}`, { size: 6.5 });
    },
  });

  /* similarity */
  S.similar = (root) => board(root, {
    x: [-0.5, 12], y: [-0.5, 7.5], s: 25, grid: 1, lab: 0, plate: "ПОДОБИЕ",
    params: { k: P(0.5, 2.5, 0.25, 1.5, "Коэффициент k") },
    readout: (v) => `k = ${fmt(v.k)} · стороны ×${fmt(v.k)} · площадь ×${fmt(v.k * v.k, 4)} · углы не меняются`,
    paint(B, v) {
      const T = [[0, 0], [3, 0], [1, 2.5]];
      B.fill(T, { tone: "mid", op: 0.3 }); B.line(T.concat([T[0]]), { tone: "hi", w: 1.3 });
      const ox = 4;
      const T2 = T.map(([x, y]) => [ox + x * v.k, y * v.k]);
      B.fill(T2, { tone: "lit", op: 0.25 }); B.line(T2.concat([T2[0]]), { tone: "lit", w: 1.6 });
      for (const [x, y] of T) B.seg([ox + x, y], [ox + x * v.k, y * v.k], { tone: "lo", dotted: true });
      B.line(T.map(([x, y]) => [ox + x, y]).concat([[ox, 0]]), { tone: "mid", dashed: true });
      B.text(1.5, -0.35, "3", { size: 5.5 }); B.text(ox + 1.5 * v.k, -0.35, fmt(3 * v.k), { size: 5.5 });
    },
  });

  /* probability: two dice and a histogram */
  S.dice = (root) => {
    const roll = () => 1 + Math.floor(Math.random() * 6);
    let api;
    api = board(root, {
      x: [1, 13], y: [0, 0.3], s: 24, sy: 680, grid: 0, lab: 0, axes: true, xl: "сумма", yl: "доля", plate: "ДВА КУБИКА", deep: 120, az: 70, el: 20,
      state: { counts: Array(13).fill(0), n: 0, d1: 3, d2: 4, spin: 0 },
      acts: {
        one: (st) => { st.d1 = roll(); st.d2 = roll(); st.counts[st.d1 + st.d2]++; st.n++; st.spin = 0.6; },
        many: (st) => { for (let i = 0; i < 100; i++) { const s = roll() + roll(); st.counts[s]++; st.n++; } st.d1 = roll(); st.d2 = roll(); st.spin = 0.6; },
        thousand: (st) => { for (let i = 0; i < 1000; i++) st.counts[roll() + roll()]++; st.n += 1000; },
        reset: (st) => { st.counts.fill(0); st.n = 0; },
      },
      update(dt, st) { if (st.spin > 0) { st.spin = Math.max(0, st.spin - dt); return true; } return false; },
      readout: (v, st) => st.n ? `бросков ${st.n} · сумма 7: ${fmt(st.counts[7] / st.n * 100, 1)}% (теория 16,7%) · последний ${st.d1}+${st.d2}` : "нажми «Бросить»",
      paint(B, v, st) {
        for (let s = 2; s <= 12; s++) {
          const p = st.n ? st.counts[s] / st.n : 0;
          B.bar(s - 0.35, 0.7, p, { base: 0, d: 12, lit: true });
          B.text(s, -0.016, String(s), { size: 5, tone: "mid" });
        }
        const th = []; for (let s = 2; s <= 12; s++) th.push([s, (6 - Math.abs(s - 7)) / 36]);
        B.line(th, { tone: "red", dashed: true, front: true });
        for (const y of [0.05, 0.1, 0.15, 0.2, 0.25]) { B.seg([1, y], [13, y], { tone: "faint" }); B.text(0.9, y, `${y * 100}%`, { size: 4.2, tone: "lo", anchor: "end" }); }
        const c = B.c, P2 = c.P;
        [[st.d1, -40], [st.d2, 40]].forEach(([d, x]) => {
          const j = st.spin > 0 ? Math.sin(st.spin * 30) * 4 : 0, z = st.spin * 30;
          const y = 40;
          let svg = c.cube(x + j, y, z, 22, { lit: true, mark: false });
          const pip = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[d];
          svg += c.D(pip.map(([u, w]) => iso([x + j + u * 5.5, y + w * 5.5, z + 22], P2)), { size: 1.6, tone: "hi" });
          c.add([x, y, z + 11], svg);
        });
      },
    });
    return api;
  };
})();
