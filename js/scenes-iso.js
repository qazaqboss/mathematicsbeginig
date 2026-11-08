/* Mechanical isometric figures for grades 2–11: each is a small machine. */
(function () {
  const { Stage, Spring, clamp, lerp, ease, easeOut, still } = window.ISO;
  const fmt = (v, d = 2) => window.ISO.fmt(v, d);
  const S = (window.SCENES = window.SCENES || {});
  const mk = (stage, params, acts, extra = {}) => Object.assign({ stage, params: params || {}, act: acts || {}, vals: extra.vals || {}, set: extra.set }, extra);
  /* a tiny param store shared by the mechanical figures */
  function store(defs, onSet) {
    const vals = {}, sp = {};
    for (const [k, p] of Object.entries(defs)) { vals[k] = p.v; sp[k] = new Spring(p.v, { k: p.k || 120, c: p.c || 20 }); }
    const v = new Proxy({}, { get: (_, k) => sp[k].v });
    let stage;
    const set = (k, val) => {
      const p = defs[k];
      val = clamp(val, p.min, p.max);
      if (p.step) val = Math.round(val / p.step) * p.step;
      vals[k] = val; sp[k].set(val);
      if (onSet) onSet(k, val);
      stage && stage.touch();
    };
    const step = (dt) => { let m = false; for (const k in sp) m = sp[k].step(dt) || m; return m; };
    return { vals, v, sp, set, step, bind: (s) => (stage = s) };
  }

  /* ---------- Multiplication table as a city of columns ---------- */
  S.multable = (root) => {
    const C = 17, H = 1.5;
    const ps = store({ a: { v: 6, min: 1, max: 10, step: 1, label: "Строка" }, b: { v: 7, min: 1, max: 10, step: 1, label: "Столбец" } });
    let grow = 0;
    const X = (i) => -C * 5.5 + i * C, Y = (j) => -C * 5.5 + j * C;
    const stage = new Stage(root, {
      W: 600, H: 470, az: 38, el: 30, fit: 45, bounds: [[-112, -112, -12], [112, 112, 150]], pad: 10,
      label: "Таблица умножения как город столбиков: высота столбика — произведение номера строки и столбца.",
      readout: () => `${ps.vals.a} × ${ps.vals.b} = ${ps.vals.a * ps.vals.b}`,
      update(dt) { const m = ps.step(dt); if (grow < 1) { grow = Math.min(1, grow + dt * 0.7); return true; } return m; },
      onKey: (k) => { const d = { ArrowUp: ["a", 1], ArrowDown: ["a", -1], ArrowRight: ["b", 1], ArrowLeft: ["b", -1] }[k]; if (!d) return false; ps.set(d[0], ps.vals[d[0]] + d[1]); },
      draw(c) {
        const P = c.P;
        c.plate({ x: -112, y: -112, w: 224, d: 224, r: 8 }, { ruler: false });
        const a = ps.vals.a, b = ps.vals.b;
        for (let i = 1; i <= 10; i++) {
          c.base(c.topText(X(i), Y(0) + 2, 0, String(i), { size: 6, tone: i === b ? "hi" : "lo" }));
          c.base(c.topText(X(0) + 2, Y(i), 0, String(i), { size: 6, tone: i === a ? "hi" : "lo" }));
        }
        c.base(c.topText(X(0) + 2, Y(0) + 2, 0, "×", { size: 7, tone: "mid" }));
        const g = easeOut(grow);
        for (let j = 1; j <= 10; j++) for (let i = 1; i <= 10; i++) {
          const h = Math.max(0.6, i * j * H * clamp(g * 1.6 - (i + j) * 0.03, 0, 1));
          const on = i === b && j === a, line = i === b || j === a, under = i <= b && j <= a;
          const plan = { x: X(i) - C * 0.4, y: Y(j) - C * 0.4, w: C * 0.8, d: C * 0.8, r: 1 };
          let svg = c.slab(plan, 0, h, { tone: line ? "hi" : under ? "hi" : "mid", lit: on || line, crease: "faint" }, 2, 0.4);
          if (on) svg += c.topText(X(i), Y(j), h, String(i * j), { size: 6.5, tone: "hi" });
          c.add([X(i), Y(j), h / 2], svg);
        }
      },
    });
    ps.bind(stage);
    return mk(stage, { a: { min: 1, max: 10, step: 1, label: "Строка" }, b: { min: 1, max: 10, step: 1, label: "Столбец" } }, { turn: () => stage.spinBy(90) }, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Area and perimeter: tiles in a fenced yard ---------- */
  S.area = (root, opts = {}) => {
    const U = 18;
    const sq = !!opts.square;
    const defs = sq ? { n: { v: 4, min: 1, max: 9, step: 1, label: "Сторона" } } : { a: { v: 5, min: 1, max: 9, step: 1, label: "Длина" }, b: { v: 3, min: 1, max: 7, step: 1, label: "Ширина" } };
    let t0 = 0, clock = 0;
    const ps = store(defs, () => (t0 = clock));
    const dims = () => (sq ? [ps.vals.n, ps.vals.n] : [ps.vals.a, ps.vals.b]);
    const stage = new Stage(root, {
      W: 600, H: 440, az: 40, el: 34, fit: 40, bounds: [[-100, -84, -12], [100, 84, 24]], pad: 12,
      label: "Площадка из единичных плиток с забором: плитки — площадь, звенья забора — периметр.",
      readout: () => { const [a, b] = dims(); return sq ? `S = ${a * a} → √${a * a} = ${a}` : `S = ${a}·${b} = ${a * b} · P = 2·(${a}+${b}) = ${2 * (a + b)}`; },
      update(dt) { clock += dt; ps.step(dt); const [a, b] = dims(); return clock - t0 < a * b * 0.04 + 1; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -100, y: -84, w: 200, d: 168, r: 8 }, { ticks: 6 });
        const [a, b] = dims();
        const ox = -a * U / 2, oy = -b * U / 2;
        const ds = [];
        for (let i = 0; i <= 9; i++) for (let j = 0; j <= 7 + (sq ? 2 : 0); j++) if (i * U - 81 < 82 && j * U - 72 < 74) ds.push(iso([-81 + i * U, -72 + j * U, 0], P));
        c.base(c.D(ds, { size: 0.4, tone: "lo" }));
        let k = 0;
        for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) {
          const p = clamp((clock - t0 - k++ * 0.04) / 0.35, 0, 1);
          if (p <= 0) continue;
          const plan = { x: ox + i * U + 0.8, y: oy + j * U + 0.8, w: U - 1.6, d: U - 1.6, r: 1 };
          const z = (1 - easeOut(p)) * 18;
          c.add([plan.x + U / 2, plan.y + U / 2, z], `<g opacity="${Math.min(1, p * 2).toFixed(2)}">${c.slab(plan, z, 2.2, { tone: "hi", lit: true }, 2, 0.3)}</g>`);
        }
        // fence: a post at every unit step of the perimeter, rails between
        const posts = [];
        for (let i = 0; i <= a; i++) posts.push([ox + i * U, oy - 4], [ox + i * U, oy + b * U + 4]);
        for (let j = 1; j < b; j++) posts.push([ox - 4, oy + j * U], [ox + a * U + 4, oy + j * U]);
        posts.push([ox - 4, oy - 4], [ox + a * U + 4, oy - 4], [ox - 4, oy + b * U + 4], [ox + a * U + 4, oy + b * U + 4]);
        for (const [x, y] of posts) c.add([x, y, 6], c.slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, 0, 12, { tone: "mid" }, 2, 0.3));
        const rails = [
          { x: ox - 4, y: oy - 5, w: a * U + 8, d: 1.6 }, { x: ox - 4, y: oy + b * U + 3.4, w: a * U + 8, d: 1.6 },
          { x: ox - 5, y: oy - 4, w: 1.6, d: b * U + 8 }, { x: ox + a * U + 3.4, y: oy - 4, w: 1.6, d: b * U + 8 },
        ];
        for (const r of rails) for (const z of [4, 9]) c.add([r.x + r.w / 2, r.y + r.d / 2, z], c.slab({ ...r, r: 0.4 }, z, 1.4, { tone: "hi" }, 1, 0));
        c.base(c.topText(0, oy + b * U + 14, 0, `${a}`, { size: 7, tone: "hi" }));
        c.base(c.topText(ox + a * U + 14, 0, 0, `${b}`, { size: 7, tone: "hi" }));
      },
    });
    ps.bind(stage);
    return mk(stage, sq ? { n: defs.n } : { a: defs.a, b: defs.b }, {}, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Volume and powers: a box filled with unit cubes ---------- */
  S.volume = (root, opts = {}) => {
    const U = 16;
    const pow = !!opts.power;
    const defs = pow ? { n: { v: 3, min: 1, max: 6, step: 1, label: "Основание n" }, k: { v: 3, min: 1, max: 3, step: 1, label: "Степень" } } : { a: { v: 4, min: 1, max: 6, step: 1, label: "Длина" }, b: { v: 3, min: 1, max: 6, step: 1, label: "Ширина" }, c: { v: 3, min: 1, max: 6, step: 1, label: "Высота" } };
    let t0 = 0, clock = 0;
    const ps = store(defs, () => (t0 = clock));
    const dims = () => (pow ? [ps.vals.n, ps.vals.k >= 2 ? ps.vals.n : 1, ps.vals.k >= 3 ? ps.vals.n : 1] : [ps.vals.a, ps.vals.b, ps.vals.c]);
    const sup = ["", "", "²", "³"];
    const stage = new Stage(root, {
      W: 600, H: 460, az: 38, el: 30, fit: 40, bounds: [[-70, -70, -12], [70, 70, 6 * U + 8]], pad: 12,
      label: "Коробка, которую заполняют единичными кубиками слой за слоем.",
      readout: () => { const [a, b, h] = dims(); return pow ? `${ps.vals.n}${sup[ps.vals.k] || ""} = ${a * b * h}` : `V = ${a}·${b}·${h} = ${a * b * h}`; },
      update(dt) { clock += dt; ps.step(dt); const [a, b, h] = dims(); return clock - t0 < a * b * h * 0.02 + 1.2; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -70, y: -70, w: 140, d: 140, r: 7 }, { ruler: false });
        const [a, b, h] = dims();
        const ox = -a * U / 2, oy = -b * U / 2;
        c.base(c.slab({ x: ox - 4, y: oy - 4, w: a * U + 8, d: b * U + 8, r: 2 }, 0, 3, { tone: "mid" }, 3, 0.4));
        // wire frame of the box, back edges first
        const top = 3 + h * U + 2;
        const cs = [[ox - 2, oy - 2], [ox + a * U + 2, oy - 2], [ox + a * U + 2, oy + b * U + 2], [ox - 2, oy + b * U + 2]];
        const far = cs.reduce((best, p) => (c.depth([p[0], p[1], 0]) < c.depth([best[0], best[1], 0]) ? p : best));
        c.base(c.L(c.seg([far[0], far[1], 3], [far[0], far[1], top]), { tone: "lo", dashed: true }));
        let k = 0;
        for (let z = 0; z < h; z++) for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) {
          const p = clamp((clock - t0 - k++ * 0.02) / 0.4, 0, 1);
          if (p <= 0) continue;
          const zz = 3 + z * U + (1 - easeOut(p)) * 30;
          c.add([ox + i * U + U / 2, oy + j * U + U / 2, zz + U / 2], c.cube(ox + i * U + U / 2, oy + j * U + U / 2, zz, U - 1, { lit: z === h - 1, opacity: Math.min(1, p * 2) }));
        }
        const frame = [];
        for (const [x, y] of cs) if (x !== far[0] || y !== far[1]) frame.push(c.seg([x, y, 3], [x, y, top]));
        frame.push(c.poly(cs.concat([cs[0]]).map(([x, y]) => [x, y, top])));
        c.over(c.L(frame.join(""), { tone: "mid", dashed: true }));
      },
    });
    ps.bind(stage);
    return mk(stage, defs, {}, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Fractions: cakes cut into equal slices ---------- */
  S.pie = (root, opts = {}) => {
    const two = !!opts.two;
    const defs = { n: { v: opts.n || 4, min: 2, max: 12, step: 1, label: "Частей" }, k: { v: opts.k || 3, min: 0, max: 12, step: 1, label: "Взяли" } };
    if (two) Object.assign(defs, { n2: { v: 3, min: 2, max: 12, step: 1, label: "Частей (2)" }, k2: { v: 2, min: 0, max: 12, step: 1, label: "Взяли (2)" } });
    const ps = store(defs, (key) => { if (key === "n" && ps.vals.k > ps.vals.n) ps.set("k", ps.vals.n); if (key === "n2" && ps.vals.k2 > ps.vals.n2) ps.set("k2", ps.vals.n2); });
    const pull = Array.from({ length: 24 }, () => new Spring(0, { k: 140, c: 18 }));
    const R = 46;
    const cakes = two ? [[-62, 0, "n", "k", 0], [62, 0, "n2", "k2", 12]] : [[0, 0, "n", "k", 0]];
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const stage = new Stage(root, {
      W: 600, H: two ? 360 : 420, az: 40, el: 34, fit: 30, bounds: two ? [[-120, -60, -12], [120, 60, 30]] : [[-66, -66, -12], [66, 66, 30]], pad: 12,
      label: "Торт, разрезанный на равные части: взятые куски выдвинуты и светятся.",
      readout: () => {
        const f = (k, n) => `${k}/${n}`;
        if (!two) { const g = gcd(ps.vals.k, ps.vals.n) || 1; return `${f(ps.vals.k, ps.vals.n)}${g > 1 && ps.vals.k ? ` = ${f(ps.vals.k / g, ps.vals.n / g)}` : ""} · ${fmt((ps.vals.k / ps.vals.n) * 100, 1)}% торта`; }
        const a = ps.vals.k / ps.vals.n, b = ps.vals.k2 / ps.vals.n2;
        return `${f(ps.vals.k, ps.vals.n)} ${Math.abs(a - b) < 1e-9 ? "=" : a > b ? ">" : "<"} ${f(ps.vals.k2, ps.vals.n2)} · ${fmt(a, 3)} и ${fmt(b, 3)}`;
      },
      update(dt) {
        let m = ps.step(dt);
        for (const [, , nk, kk, off] of cakes) for (let i = 0; i < 12; i++) { pull[off + i].set(i < ps.vals[kk] ? 7 : 0); m = pull[off + i].step(dt) || m; }
        return m;
      },
      draw(c) {
        const P = c.P;
        c.plate(two ? { x: -120, y: -60, w: 240, d: 120, r: 8 } : { x: -66, y: -66, w: 132, d: 132, r: 8 }, { ruler: two, ticks: 6 });
        for (const [cx, cy, nk, kk, off] of cakes) {
          const n = ps.vals[nk];
          c.add([cx, cy, 2], c.cyl(cx, cy, 14, 0, 6, { tone: "mid" }, 32, 0.6) + c.cyl(cx, cy, R + 6, 6, 3, { tone: "mid" }, 72, 0.8) + c.L(ring(cx, cy, R + 3, 9, P, 72), { tone: "lo" }), -400);
          for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, mid = (a0 + a1) / 2;
            const p = pull[off + i].v, dx = Math.cos(mid) * p, dy = -Math.sin(mid) * p;
            const steps = Math.max(3, Math.ceil(48 / n));
            const pts = [[cx + dx, cy + dy]];
            for (let s = 0; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; pts.push([cx + dx + Math.cos(a) * R, cy + dy - Math.sin(a) * R]); }
            const on = i < ps.vals[kk];
            const z = 9 + p * 0.6;
            let svg = solidSvg(extrude(pts, z, 14, P, { convex: n > 1 }), { tone: on ? "hi" : "mid", lit: on, crease: "faint" });
            svg += c.L(onTop(pts.slice(1).map(([x, y]) => [lerp(x, cx + dx, 0.12), lerp(y, cy + dy, 0.12)]), z + 14, P), { tone: on ? "mid" : "faint" });
            c.add([cx + dx + Math.cos(mid) * R * 0.5, cy + dy - Math.sin(mid) * R * 0.5, z + 7], svg);
          }
          c.over(c.topText(cx, cy + R + 16, 0, `${ps.vals[kk]}/${n}`, { size: 9, tone: "hi" }));
        }
      },
    });
    ps.bind(stage);
    return mk(stage, defs, {}, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Angles: a protractor with a turning arm ---------- */
  S.angle = (root) => {
    const R = 90;
    const ps = store({ d: { v: 60, min: 0, max: 180, step: 1, label: "Угол, °", k: 90, c: 18 } });
    const kind = (d) => (d === 0 ? "нулевой" : d < 90 ? "острый" : d === 90 ? "прямой" : d < 180 ? "тупой" : "развёрнутый");
    const stage = new Stage(root, {
      W: 600, H: 400, az: 80, el: 42, fit: 15, spin: [30, 140], bounds: [[-118, -40, -12], [118, 108, 12]], pad: 12,
      label: "Транспортир со стрелкой: стрелка поворачивается от нулевой отметки.",
      readout: () => `∠ = ${ps.vals.d}° · ${kind(ps.vals.d)}`,
      update: (dt) => ps.step(dt),
      onKey: (k) => { if (k === "ArrowRight") ps.set("d", ps.vals.d - 5); else if (k === "ArrowLeft") ps.set("d", ps.vals.d + 5); else return false; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -118, y: -40, w: 236, d: 148 - 40 + 40, r: 8 }, { ticks: 6 });
        // world (x, -y): math angles read counter-clockwise from above
        const half = [[0, 0]];
        for (let i = 0; i <= 72; i++) { const a = Math.PI * i / 72; half.push([Math.cos(a) * R, -Math.sin(a) * R]); }
        c.base(solidSvg(extrude(half.map(([x, y]) => [x, y + 30]), 0, 3, P), { tone: "mid" }));
        const cy = 30;
        const ticks = [], big = [];
        for (let g = 0; g <= 180; g += 2) {
          const a = g * Math.PI / 180, l = g % 10 === 0 ? 9 : 4.5;
          (g % 10 ? ticks : big).push(c.seg([Math.cos(a) * (R - 1), cy - Math.sin(a) * (R - 1), 3], [Math.cos(a) * (R - 1 - l), cy - Math.sin(a) * (R - 1 - l), 3]));
          if (g % 30 === 0) c.base(c.topText(Math.cos(a) * (R - 18), cy - Math.sin(a) * (R - 18), 3, String(g), { size: 6, tone: "mid" }));
        }
        c.base(c.L(ticks.join(""), { tone: "lo" }) + c.L(big.join(""), { tone: "mid" }));
        c.base(c.L(onTop(half.slice(1).map(([x, y]) => [x * 0.55, y * 0.55 + cy]), 3, P), { tone: "faint" }));
        const d = ps.v.d * Math.PI / 180;
        const arc = [];
        for (let i = 0; i <= 40; i++) { const a = d * i / 40; arc.push([Math.cos(a) * 30, cy - Math.sin(a) * 30, 3.4]); }
        c.over(c.L(c.poly(arc), { tone: "lit" }));
        const bar = (a, len, z, lit) => {
          const ux = Math.cos(a), uy = -Math.sin(a), nx = -uy * 3, ny = ux * 3;
          const pts = [];
          for (const zz of [z, z + 3]) for (const [s, t] of [[-4, -1], [len, -1], [len, 1], [-4, 1]]) pts.push([ux * s + nx * t, cy + uy * s + ny * t, zz]);
          return c.hexa(pts, { tone: "hi", lit });
        };
        c.add([40, cy, 4], bar(0, R + 14, 3.2, false));
        c.add([Math.cos(d) * 50, cy - Math.sin(d) * 50, 8], bar(d, R + 18, 6.4, true));
        c.add([0, cy, 10], c.cyl(0, cy, 4.5, 3, 7.5, { tone: "hi" }, 24, 0.8) + c.D([iso([0, cy, 10.5], P)], { size: 1, tone: "hi" }), 2);
        c.over(c.topText(Math.cos(d / 2) * 44, cy - Math.sin(d / 2) * 44, 3.4, `${ps.vals.d}°`, { size: 7, tone: "hi" }));
      },
    });
    ps.bind(stage);
    return mk(stage, { d: { min: 0, max: 180, step: 1, label: "Угол, °" } }, { a30: () => ps.set("d", 30), a90: () => ps.set("d", 90), a135: () => ps.set("d", 135), a180: () => ps.set("d", 180) }, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Negative numbers: a lift in a shaft that goes below ground ---------- */
  S.lift = (root) => {
    const FH = 15, zf = (f) => (f + 6) * FH;
    const ps = store({ a: { v: 2, min: -6, max: 6, step: 1, label: "Старт" }, b: { v: -5, min: -9, max: 9, step: 1, label: "Едем" } });
    let floor = new Spring(2, { k: 50, c: 13 }), phase = "idle";
    const sync = () => { phase = "idle"; floor.set(ps.vals.a); };
    const stage = new Stage(root, {
      W: 600, H: 500, az: 58, el: 22, fit: 15, spin: [10, 130], bounds: [[-60, -40, -12], [60, 40, zf(6) + 24]], pad: 10,
      label: "Лифт в шахте: этажи выше нуля — над землёй, ниже — подземная парковка.",
      readout: () => { const a = ps.vals.a, b = ps.vals.b, r = a + b; const bt = b < 0 ? `(−${-b})` : String(b); const at = a < 0 ? `−${-a}` : String(a); return phase === "done" ? `${at} + ${bt} = ${r < 0 ? "−" + -r : r}` : `${at} + ${bt} = ?`; },
      update(dt) {
        let m = ps.step(dt);
        m = floor.step(dt) || m;
        if (phase === "run" && !m) phase = "done";
        return m || phase === "run";
      },
      onTap: () => go(),
      draw(c) {
        const P = c.P;
        c.plate({ x: -60, y: -40, w: 120, d: 80, r: 7 }, { ticks: 5 });
        const sh = { x: -22, y: -22, w: 44, d: 44 };
        // ground slab at floor 0
        const gz = zf(0) - 3;
        const ground = c.slab({ x: -42, y: -34, w: 84, d: 68, r: 3 }, gz - 3, 3, { tone: "mid" }, 4, 0.5)
          + c.sideText(20, 34, gz - 1.5, [0, 1], "ЗЕМЛЯ · 0", { size: 3.6, tone: "mid" });
        // posts
        for (const [x, y] of corners(sh)) c.add([x, y, zf(6) / 2], c.slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.6 }, 0, zf(6) + 16, { tone: "mid" }, 2, 0.3), x + y > 0 ? 30 : -30);
        // floors: ledge at the back and engraved numbers on the front post strip
        for (let f = -5; f <= 6; f++) {
          const z = zf(f) - 1.5;
          const t = c.slab({ x: -22, y: -22, w: 44, d: 3, r: 0.4 }, z, 1.5, { tone: f === 0 ? "hi" : "lo" }, 1, 0) + c.sideText(-30, 22, z + 5, [0, 1], f > 0 ? `+${f}` : f < 0 ? `−${-f}` : "0", { size: 5.5, tone: f === ps.vals.a + (phase === "done" ? ps.vals.b : 0) ? "hi" : f < 0 ? "lo" : "mid" });
          c.add([0, -20, z], t, -80);
        }
        c.add([0, 0, gz], ground, -10);
        const cz = zf(floor.v);
        let cab = c.slab({ x: -15, y: -15, w: 30, d: 30, r: 1.5 }, cz, FH - 3, { tone: "hi", lit: true }, 3, 0.6);
        cab += c.L(planOutline({ x: -11, y: -11, w: 22, d: 22, r: 1 }, cz + FH - 3, P, 2), { tone: "mid" });
        cab += c.L(c.seg([0, 0, cz + FH - 3], [0, 0, zf(6) + 14]), { tone: "mid" });
        c.add([0, 0, cz + 6], cab, 5);
        c.add([0, 0, zf(6) + 16], c.cyl(0, 0, 6, zf(6) + 14, 4, { tone: "hi" }, 24, 0.6) + c.slab({ x: -26, y: -4, w: 52, d: 8, r: 1 }, zf(6) + 16, 3, { tone: "mid" }, 2, 0.3), 40);
      },
    });
    ps.bind(stage);
    const go = () => { phase = "run"; floor.jump(ps.vals.a); floor.set(clamp(ps.vals.a + ps.vals.b, -5, 6)); stage.touch(); };
    const setAB = (k, v) => { ps.set(k, v); sync(); };
    return mk(stage, { a: { min: -5, max: 6, step: 1, label: "Старт" }, b: { min: -9, max: 9, step: 1, label: "Едем" } }, { go }, { set: setAB, vals: ps.vals });
  };

  /* ---------- Ratios: two meshing gears ---------- */
  S.gears = (root) => {
    const M = 4.2;
    const ps = store({ n1: { v: 12, min: 6, max: 24, step: 1, label: "Зубья ведущей" }, n2: { v: 24, min: 6, max: 36, step: 1, label: "Зубья ведомой" } });
    let th = 0, target = 0;
    const gearRing = (n, r, cx, cy, rot) => {
      const ra = r + M * 0.9, rr = r - M * 1.1, pts = [];
      for (let i = 0; i < n; i++) {
        const b = rot + i * 2 * Math.PI / n, w = Math.PI / n;
        for (const [a, rad] of [[b - w * 0.5, rr], [b - w * 0.28, ra], [b + w * 0.28, ra], [b + w * 0.5, rr]]) pts.push([cx + Math.cos(a) * rad, cy - Math.sin(a) * rad]);
      }
      return pts;
    };
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const stage = new Stage(root, {
      W: 620, H: 400, az: 62, el: 36, fit: 12, spin: [10, 140], bounds: [[-150, -90, -12], [150, 90, 20]], pad: 10,
      label: "Две шестерни в зацеплении: ведущая и ведомая. Число оборотов обратно числу зубьев.",
      readout: () => { const g = gcd(ps.vals.n1, ps.vals.n2); return `${ps.vals.n1} : ${ps.vals.n2} = ${ps.vals.n1 / g} : ${ps.vals.n2 / g} · 1 оборот ведущей → ${fmt(ps.vals.n1 / ps.vals.n2, 3)} оборота ведомой`; },
      update(dt) {
        const m = ps.step(dt);
        if (Math.abs(target - th) > 1e-3) { th += Math.sign(target - th) * Math.min(Math.abs(target - th), dt * (still.matches ? 100 : 2.4)); return true; }
        return m;
      },
      onTap: () => { target += Math.PI * 2; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -150, y: -90, w: 300, d: 180, r: 8 }, { ticks: 6 });
        const n1 = ps.vals.n1, n2 = ps.vals.n2, r1 = M * n1 / 2, r2 = M * n2 / 2;
        const c1 = [-(r1 + r2) / 2 + (r2 - r1) * 0.0, 0], c2 = [c1[0] + r1 + r2, 0];
        const off = c1[0] + (r1 + r2) / 2; c1[0] -= off; c2[0] -= off;
        const rot2 = -th * n1 / n2 + Math.PI + Math.PI / n2;
        [[c1, n1, r1, th, true], [c2, n2, r2, rot2, false]].forEach(([[cx, cy], n, r, rot, drive]) => {
          let svg = c.cyl(cx, cy, 7, 0, 10, { tone: "mid" }, 24, 0.6);
          svg += solidSvg(extrude(gearRing(n, r, cx, cy, rot), 10, 6, P, { convex: false }), { tone: "hi", lit: drive, crease: "faint" });
          svg += c.L(ring(cx, cy, r * 0.62, 16, P, 64), { tone: "lo" }) + c.L(ring(cx, cy, 4, 16, P, 20), { tone: "mid" });
          for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2 + Math.PI / 4; svg += c.L(ring(cx + Math.cos(a) * r * 0.38, cy - Math.sin(a) * r * 0.38, Math.min(5, r * 0.12), 16, P, 20), { tone: "faint" }); }
          svg += c.cyl(cx, cy, 3, 16, 4, { tone: "hi" }, 16, 0.4);
          const mx = cx + Math.cos(rot) * r * 0.78, my = cy - Math.sin(rot) * r * 0.78;
          svg += c.cyl(mx, my, 2.6, 16, 3, { tone: "hi", lit: true }, 16, 0.4);
          c.add([cx, cy, 10], svg);
        });
        c.base(c.topText(c1[0], 70, 0, `${n1} зуб.`, { size: 6, tone: "mid" }) + c.topText(c2[0], 70, 0, `${n2} зуб.`, { size: 6, tone: "mid" }));
      },
    });
    ps.bind(stage);
    return mk(stage, { n1: { min: 6, max: 24, step: 1, label: "Ведущая" }, n2: { min: 6, max: 36, step: 1, label: "Ведомая" } }, { turn: () => (target += Math.PI * 2), reset: () => { th = target = 0; } }, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Equations: a balance with x-boxes and unit weights ---------- */
  S.eqbalance = (root) => {
    const PIV = [0, -10, 118], HALF = 106, HANG = 58, PAN_R = 34;
    const tasks = [[2, 3, 0, 11, 4], [3, 2, 0, 14, 4], [2, 5, 0, 9, 2], [3, 1, 1, 9, 4], [4, 2, 2, 12, 5], [2, 1, 0, 7, 3]];
    let ti = 0, s = {}, X = 4, msg = "";
    const load = () => { const [lx, lc, rx, rc, x] = tasks[ti % tasks.length]; s = { lx, lc, rx, rc }; X = x; msg = ""; };
    load();
    const tilt = new Spring(0, { k: 40, c: 9 });
    const eq = () => {
      const side = (x, k) => [x ? (x === 1 ? "x" : `${x}x`) : "", k ? String(k) : ""].filter(Boolean).join(" + ") || "0";
      return `${side(s.lx, s.lc)} = ${side(s.rx, s.rc)}`;
    };
    const stage = new Stage(root, {
      W: 620, H: 400, az: 54, el: 24, spin: [-30, 200], tilt: [10, 50], bounds: [[-150, -54, -12], [150, 54, 150]], pad: 16,
      label: "Весы с иксами: коробка x весит неизвестно сколько, гиря — единицу. Одинаковые действия с обеими чашами не нарушают равновесия.",
      readout: () => (s.lx === 1 && s.lc === 0 && s.rx === 0 ? `x = ${s.rc} · решено!` : `${eq()}${msg ? " · " + msg : ""}`),
      update: (dt) => tilt.step(dt),
      draw(c) {
        const P = c.P;
        const th = tilt.v * Math.PI / 180;
        const rot = ([x, y, z]) => [PIV[0] + x * Math.cos(th) + z * Math.sin(th), PIV[1] + y, PIV[2] - x * Math.sin(th) + z * Math.cos(th)];
        c.plate({ x: -150, y: -54, w: 300, d: 108, r: 8 }, { ticks: 6 });
        let post = c.slab({ x: -20, y: -30, w: 40, d: 40, r: 4 }, 0, 8, { tone: "mid" }, 6, 0.8);
        post += c.cyl(0, -10, 4.6, 8, PIV[2] - 12, { tone: "mid", crease: "none" }, 24);
        post += c.slab({ x: -7, y: -17, w: 14, d: 14, r: 2 }, PIV[2] - 8, 6, { tone: "mid" }, 3, 0.4);
        c.add([0, -10, 40], post, -2);
        const B = [];
        for (const z of [-4, 4]) for (const [x, y] of [[-HALF, -4], [HALF, -4], [HALF, 4], [-HALF, 4]]) B.push(rot([x, y, z]));
        c.add(PIV, c.hexa(B, { tone: "hi" }) + c.D([iso(rot([0, 4.2, 0]), P)], { size: 1.3, tone: "hi" }));
        [[-1, s.lx, s.lc], [1, s.rx, s.rc]].forEach(([sgn, nx, nc]) => {
          const end = rot([sgn * (HALF - 6), 0, -4]);
          const pz = end[2] - HANG, px = end[0], py = PIV[1];
          const rim = [90, 210, 330].map((a) => [px + Math.cos(a * Math.PI / 180) * (PAN_R - 3), py + Math.sin(a * Math.PI / 180) * (PAN_R - 3), pz + 3]);
          const hook = [px, py, end[2] - 2];
          const back = [], front = [];
          for (const r of rim) (c.depth(r) < c.depth([px, py, pz]) ? back : front).push(c.seg(hook, r));
          let g = c.L(back.join(""), { tone: "mid" }) + c.cyl(px, py, PAN_R, pz, 3, { tone: "mid" }, 56, 0.8);
          const items = [];
          for (let i = 0; i < nx; i++) items.push("x");
          for (let i = 0; i < nc; i++) items.push("1");
          const placed = items.map((t, i) => { const sl = i % 9, layer = Math.floor(i / 9); return { t, x: px + ((sl % 3) - 1) * 17, y: py + (Math.floor(sl / 3) - 1) * 17, z: pz + 3 + layer * 16 }; })
            .sort((a, b) => c.depth([a.x, a.y, a.z]) - c.depth([b.x, b.y, b.z]));
          for (const it of placed) {
            if (it.t === "x") g += c.cube(it.x, it.y, it.z, 15, { lit: true, mark: false }) + c.topText(it.x, it.y, it.z + 15, "x", { size: 8, tone: "hi" });
            else g += c.cyl(it.x, it.y, 6, it.z, 7, { tone: "hi" }, 24, 1) + c.cyl(it.x, it.y, 2.2, it.z + 7, 3, { tone: "hi" }, 12, 0.4);
          }
          g += c.L(front.join(""), { tone: "mid" });
          c.add([px, py, pz + 20], g);
        });
      },
    });
    const weight = (x, k) => x * X + k;
    const settle = () => { tilt.set(clamp((weight(s.rx, s.rc) - weight(s.lx, s.lc)) * 3, -16, 16)); stage.touch(); };
    const act = {
      sub1: () => { if (s.lc > 0 && s.rc > 0) { s.lc--; s.rc--; msg = "сняли по гире"; } else msg = "гирь нет на обеих чашах"; settle(); },
      subx: () => { if (s.lx > 0 && s.rx > 0) { s.lx--; s.rx--; msg = "сняли по иксу"; } else msg = "иксов нет на обеих чашах"; settle(); },
      half: () => {
        const g = [s.lx, s.lc, s.rx, s.rc].reduce((a, b) => { const f = (p, q) => (q ? f(q, p % q) : p); return f(a, b); });
        const d = s.lx > 1 ? s.lx : g;
        if (d > 1 && [s.lx, s.lc, s.rx, s.rc].every((t) => t % d === 0)) { s.lx /= d; s.lc /= d; s.rx /= d; s.rc /= d; msg = `разделили всё на ${d}`; }
        else msg = "поровну не делится";
        settle();
      },
      cheat: () => { s.lc++; msg = "гиря только слева — весы наклонились!"; settle(); },
      next: () => { ti++; load(); settle(); },
    };
    stage.touch();
    return mk(stage, {}, act);
  };

  /* ---------- Logarithms: a slide rule ---------- */
  S.sliderule = (root) => {
    const L = 280, x0 = -140, lg = Math.log10;
    const ps = store({ a: { v: 2, min: 1, max: 9.9, step: 0.1, label: "a", k: 80, c: 17 }, b: { v: 3, min: 1, max: 9.9, step: 0.1, label: "b", k: 80, c: 17 } });
    const stage = new Stage(root, {
      W: 640, H: 300, az: 70, el: 44, fit: 8, spin: [40, 120], bounds: [[-160, -40, -12], [160, 40, 14]], pad: 10,
      label: "Логарифмическая линейка: длины на шкалах — логарифмы чисел, поэтому сложение длин даёт умножение.",
      readout: () => {
        const a = ps.vals.a, b = ps.vals.b, p = a * b;
        return p < 10 ? `${fmt(a, 1)} × ${fmt(b, 1)} = ${fmt(p, 2)} · lg ${fmt(a, 1)} + lg ${fmt(b, 1)} = lg ${fmt(p, 2)}` : `${fmt(a, 1)} × ${fmt(b, 1)} = ${fmt(p, 2)} · читаем ${fmt(p / 10, 3)} и сдвигаем запятую`;
      },
      update: (dt) => ps.step(dt),
      draw(c) {
        const P = c.P;
        c.plate({ x: -160, y: -40, w: 320, d: 80, r: 6 }, { ruler: false, screws: true });
        const a = ps.v.a, b = ps.v.b;
        const over = a * b >= 10;
        const shift = over ? L * (lg(a) - 1) : L * lg(a);
        const scale = (yy, z, dx, tone, up) => {
          const minor = [], major = [], out = [];
          for (let v = 1; v <= 10.0001; v += v < 2 ? 0.05 : v < 5 ? 0.1 : 0.2) {
            const x = x0 + dx + L * lg(v), isMaj = Math.abs(v - Math.round(v)) < 1e-6;
            if (x < -150 || x > 150) continue;
            (isMaj ? major : minor).push(c.seg([x, yy, z], [x, yy + (up ? -1 : 1) * (isMaj ? 6 : Math.abs(v * 2 - Math.round(v * 2)) < 1e-6 ? 4 : 2.4), z]));
            if (isMaj) out.push(c.topText(x, yy + (up ? -10 : 10), z, String(Math.round(v)), { size: 5.5, tone }));
          }
          return c.L(minor.join(""), { tone: "lo" }) + c.L(major.join(""), { tone: "mid" }) + out.join("");
        };
        let st = c.slab({ x: -150, y: 10, w: 300, d: 20, r: 1.5 }, 0, 5, { tone: "mid" }, 3, 0.5) + c.slab({ x: -150, y: -30, w: 300, d: 20, r: 1.5 }, 0, 5, { tone: "mid" }, 3, 0.5);
        st += scale(11, 5, 0, "mid", false) + c.sideText(-146, 30, 2.5, [0, 1], "D", { size: 4, tone: "lo", anchor: "start" });
        c.add([0, 0, 0], st, -50);
        let sl = c.slab({ x: -150 + shift, y: -9.5, w: 300, d: 19, r: 1.2 }, 0.5, 4.2, { tone: "hi", lit: true }, 3, 0.4);
        sl += scale(9, 4.7, shift, "hi", true);
        sl += c.topText(-150 + shift + 8, -4, 4.7, "C", { size: 4.5, tone: "mid" });
        c.add([shift, 0, 2], sl, -20);
        const xc = x0 + shift + L * lg(b);
        let cur = c.slab({ x: xc - 9, y: -34, w: 18, d: 3, r: 0.6 }, 5, 3, { tone: "hi" }, 2, 0.3) + c.slab({ x: xc - 9, y: 31, w: 18, d: 3, r: 0.6 }, 5, 3, { tone: "hi" }, 2, 0.3);
        cur += c.L(c.seg([xc - 9, -32, 7.6], [xc - 9, 32, 7.6]) + c.seg([xc + 9, -32, 7.6], [xc + 9, 32, 7.6]), { tone: "faint" });
        cur += c.L(c.seg([xc, -33, 7.8], [xc, 33, 7.8]), { tone: "red" });
        c.add([xc, 0, 8], cur, 30);
        const ax = x0 + shift + (over ? L : 0);
        c.over(c.L(c.seg([ax, -9, 4.8], [ax, 9, 4.8]), { tone: "lit" }));
      },
    });
    ps.bind(stage);
    return mk(stage, { a: { min: 1, max: 9.9, step: 0.1, label: "a" }, b: { min: 1, max: 9.9, step: 0.1, label: "b" } }, {}, { set: ps.set, vals: ps.vals });
  };

  /* ---------- Permutations: lettered blocks on a tray ---------- */
  S.perm = (root) => {
    const ps = store({ n: { v: 4, min: 2, max: 5, step: 1, label: "Блоков" } }, () => { idx = 0; place(); });
    const letters = "ABCDE";
    let idx = 0, auto = false, clock = 0, last = 0;
    const xs = Array.from({ length: 5 }, (_, i) => new Spring(0, { k: 90, c: 15 }));
    const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
    const permAt = (n, k) => { const pool = [...Array(n).keys()], out = []; for (let i = n; i >= 1; i--) { const f = fact(i - 1), q = Math.floor(k / f); k %= f; out.push(pool.splice(q, 1)[0]); } return out; };
    const place = () => { const n = ps.vals.n, p = permAt(n, idx); p.forEach((block, slot) => xs[block].set((slot - (n - 1) / 2) * 30)); };
    const stage = new Stage(root, {
      W: 600, H: 300, az: 66, el: 34, fit: 10, spin: [20, 140], bounds: [[-100, -36, -12], [100, 36, 30]], pad: 12,
      label: "Лоток с буквенными блоками: каждое нажатие ставит их в следующем порядке.",
      readout: () => { const n = ps.vals.n; return `№ ${idx + 1} из ${n}! = ${fact(n)} · ${permAt(n, idx).map((i) => letters[i]).join("")}`; },
      update(dt) {
        clock += dt;
        let m = ps.step(dt);
        for (const s of xs) m = s.step(dt) || m;
        if (auto && clock - last > 0.9) { last = clock; idx = (idx + 1) % fact(ps.vals.n); place(); m = true; }
        return m || auto;
      },
      onTap: () => { idx = (idx + 1) % fact(ps.vals.n); place(); },
      draw(c) {
        const P = c.P;
        c.plate({ x: -100, y: -36, w: 200, d: 72, r: 7 }, { ticks: 5 });
        const n = ps.vals.n;
        for (let s = 0; s < n; s++) { const x = (s - (n - 1) / 2) * 30; c.base(c.L(planOutline({ x: x - 13, y: -13, w: 26, d: 26, r: 2 }, 0, P, 2), { tone: "lo" }) + c.topText(x, 20, 0, String(s + 1), { size: 5, tone: "lo" })); }
        for (let i = 0; i < n; i++) {
          const x = xs[i].v, lift = Math.min(16, Math.abs(xs[i].t - xs[i].v) * 0.5);
          c.add([x, 0, lift + 11], c.cube(x, 0, lift, 22, { lit: true, mark: false }) + c.topText(x, 0, lift + 22, letters[i], { size: 11, tone: "hi" }));
        }
      },
    });
    ps.bind(stage);
    place(); xs.forEach((s) => s.jump(s.t));
    return mk(stage, { n: { min: 2, max: 5, step: 1, label: "Блоков" } }, { next: () => { idx = (idx + 1) % fact(ps.vals.n); place(); }, auto: () => { auto = !auto; } }, { set: ps.set, vals: ps.vals });
  };
  /* ---------- Percent: a hundred-hole board ---------- */
  S.percent = (root) => {
    const C = 18, X = (i) => -C * 4.5 + i * C, Y = (j) => -C * 4.5 + j * C;
    let t0 = 0, clock = 0, prev = 0;
    const ps = store({ p: { v: 40, min: 0, max: 100, step: 1, label: "Процентов" } }, (k, val) => { t0 = clock; });
    const stage = new Stage(root, {
      W: 560, H: 440, az: 40, el: 34, fit: 45, bounds: [[-102, -102, -12], [102, 102, 20]], pad: 10,
      label: "Доска на сто лунок: каждая заполненная лунка — один процент.",
      readout: () => `${ps.vals.p}% = ${ps.vals.p}/100 = ${fmt(ps.vals.p / 100)}`,
      update(dt) { clock += dt; ps.step(dt); return clock - t0 < 1.4; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -102, y: -102, w: 204, d: 204, r: 8 }, { ruler: false });
        const rings = [];
        for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) rings.push(ring(X(i), Y(j), 5, 0, P, 16));
        c.base(c.L(rings.join(""), { tone: "lo" }));
        for (let j = 0; j < 10; j++) c.base(c.topText(-96, Y(j), 0, String((j + 1) * 10), { size: 4.4, tone: (j + 1) * 10 <= ps.vals.p ? "hi" : "lo" }));
        const n = ps.vals.p;
        for (let k = 0; k < n; k++) {
          const i = k % 10, j = Math.floor(k / 10);
          const p = clamp((clock - t0 - Math.max(0, k - prev) * 0.012) / 0.3, 0, 1);
          const z = k < prev ? 0 : (1 - easeOut(p)) * 16;
          c.add([X(i), Y(j), z + 4], c.cube(X(i), Y(j), z, 13, { lit: true }));
        }
        if (clock - t0 > 1.3) prev = n;
      },
    });
    ps.bind(stage);
    return mk(stage, { p: { min: 0, max: 100, step: 1, label: "Процентов" } }, { p25: () => ps.set("p", 25), p50: () => ps.set("p", 50), p75: () => ps.set("p", 75) }, { set: (k, v) => { prev = Math.min(prev, v); ps.set(k, v); }, vals: ps.vals });
  };
})();
