/* Lessons: each figure is a small physical machine whose working is the idea. */
(function () {
  const { Stage, Spring, clamp, lerp, ease, easeOut, still } = window.ISO;
  const WORDS = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять"];
  const plural = (n, [one, few, many]) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const scenes = {};
  window.LESSONS = { scenes, WORDS, plural };

  /* ---------- Hero: a turntable with a spiral staircase of cubes 1…9 ---------- */
  function hero(root) {
    const S = 22, G = 25;
    const order = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, 0]];
    const cubes = [];
    order.forEach(([gx, gy], col) => {
      for (let i = 0; i <= col; i++) cubes.push({ x: gx * G, y: gy * G, z: i * S, col, top: i === col, born: 0.35 + col * 0.16 + i * 0.05 });
    });
    let clock = 0;
    const stage = new Stage(root, {
      W: 560, H: 520, az: 30, el: 28, pad: 14, fit: 45, autoSpin: 9, tilt: [14, 58],
      bounds: [[-96, -96, -16], [96, 96, 9 * S]],
      label: "Вращающийся столик с лестницей из кубиков: столбики из 1, 2, 3 … 9 кубиков.",
      update(dt) { clock += dt; return clock < 3.5; },
      draw(c) {
        const P = c.P;
        c.base(`<path class="iso-halo" d="${haloOf({ x: -96, y: -96, w: 192, d: 192, r: 96 }, -16, 6, P)}"/>`);
        c.base(c.cyl(0, 0, 70, -16, 4, { tone: "lo" }, 72));
        c.base(c.cyl(0, 0, 96, -12, 12, { tone: "mid" }, 96, 1.4));
        c.base(c.L(ring(0, 0, 90, 0, P, 96), { tone: "lo" }));
        const t = radialTicks(0, 0, 93, 72, 6, 0, [1.6, 3.4], P);
        c.base(c.L(t.minor, { tone: "lo" }) + c.L(t.major, { tone: "mid" }));
        c.base(c.L(ring(0, 0, 50, 0, P, 72), { tone: "faint" }));
        c.base(c.D([0, 60, 120, 180, 240, 300].map((a) => iso([Math.cos(a * Math.PI / 180) * 80, Math.sin(a * Math.PI / 180) * 80, 0], P)), { size: 0.55 }));
        for (const q of cubes) {
          const k = clamp((clock - q.born) / 0.55, 0, 1);
          if (k <= 0) continue;
          const z = q.z + (1 - easeOut(k)) * 70;
          let svg = c.cube(q.x, q.y, z, S - 1, { lit: true, opacity: Math.min(1, k * 2.2) });
          if (q.top && k > 0.6) svg += c.topText(q.x, q.y, z + S - 1, String(q.col + 1), { size: 10, tone: "hi" });
          c.add([q.x, q.y, z + S / 2], svg);
        }
      },
    });
    return stage;
  }

  /* ---------- Fig 1: counting tray, 0…10 ---------- */
  function count(root, fig) {
    const S = 20, X = (i) => -117 + i * 26;
    let n = 0;
    const cubes = Array.from({ length: 10 }, () => ({ z: new Spring(70, { k: 210, c: 20 }), o: new Spring(0, { k: 120, c: 22 }) }));
    let tourT = 0;
    const set = (v) => {
      v = clamp(v, 0, 10);
      for (let i = 0; i < 10; i++) {
        const on = i < v, was = i < n;
        if (on && !was) { cubes[i].z.jump(70 + i * 2); cubes[i].z.set(0); cubes[i].o.set(1); }
        if (!on && was) { cubes[i].z.set(46); cubes[i].o.set(0); }
      }
      n = v;
      stage.wake();
    };
    const stage = new Stage(root, {
      W: 640, H: 300, az: 64, el: 30, spin: [20, 130], fit: 12, bounds: [[-134, -40, -12], [216, 40, 60]], pad: 16,
      label: "Счётный лоток: десять гнёзд, в каждое ложится кубик.",
      readout: () => (n === 0 ? "0 · ноль — лоток пуст" : `${n} · ${WORDS[n]}`),
      update(dt) { let m = false; for (const q of cubes) { m = q.z.step(dt) || m; m = q.o.step(dt) || m; } return m; },
      tour(dt) { tourT += dt; if (tourT > 0.85) { tourT = 0; set(n >= 10 ? 0 : n + 1); } return true; },
      onTap: () => set(n >= 10 ? 0 : n + 1),
      onKey: (k) => {
        if (k === "ArrowUp" || k === "ArrowRight") set(n + 1);
        else if (k === "ArrowDown" || k === "ArrowLeft") set(n - 1);
        else if (k === "Home") set(0);
        else if (k === "End") set(10);
        else return false;
      },
      draw(c) {
        const P = c.P;
        c.plate({ x: -136, y: -38, w: 356, d: 76, r: 8 }, { ticks: 6.5 });
        for (let i = 0; i < 10; i++) {
          const x = X(i);
          c.base(c.L(planOutline({ x: x - 12, y: -18, w: 24, d: 24, r: 2 }, 0, P, 3), { tone: i < n ? "mid" : "lo" }));
          c.base(c.D([iso([x - 9, -15, 0], P), iso([x + 9, -15, 0], P), iso([x - 9, 3, 0], P), iso([x + 9, 3, 0], P)], { size: 0.35, tone: "lo" }));
          c.base(c.topText(x, 14, 0, String(i + 1), { size: 7, tone: i < n ? "hi" : "lo" }));
        }
        // display plinth with the engraved total
        const disp = { x: 150, y: -26, w: 56, d: 52, r: 3 };
        let d = c.slab(disp, 0, 14, { tone: "hi", lit: true }, 4, 0.8);
        d += c.L(planOutline(insetPlan(disp, 4), 14, P, 3), { tone: "mid" });
        d += c.topText(178, 0, 14, String(n), { size: 26, tone: "hi" });
        d += c.D(corners(disp, 3).map(([x, y]) => iso([x, y, 14], P)), { size: 0.45, tone: "mid" });
        d += c.sideText(178, 26, 7, [0, 1], WORDS[n].toUpperCase(), { size: 5, tone: "mid" });
        c.add([178, 0, 7], d, -40);
        cubes.forEach((q, i) => {
          if (q.o.v < 0.02) return;
          c.add([X(i), -6, q.z.v + 10], c.cube(X(i), -6, q.z.v, S, { opacity: q.o.v, lit: true }));
        });
      },
    });
    scenes.count = { stage, act: { add: () => set(n + 1), sub: () => set(n - 1), reset: () => set(0), fill: () => set(10) } };
    return stage;
  }

  /* ---------- Fig 2: balance — more, less, equal ---------- */
  function balance(root) {
    const PIV = [0, -10, 124], HALF = 112, HANG = 62, PAN_R = 30, CS = 15;
    let L = 3, R = 5;
    const tilt = new Spring(0, { k: 40, c: 9 });
    const pans = [[], []];
    const sync = () => {
      [L, R].forEach((cnt, side) => {
        const arr = pans[side];
        while (arr.length < cnt) arr.push({ z: new Spring(60, { k: 200, c: 20 }).set(0), o: new Spring(0).set(1) });
        arr.forEach((q, i) => { if (i >= cnt) { q.o.set(0); q.z.set(40); q.dead = true; } else if (q.dead) { q.dead = false; q.o.set(1); q.z.set(0); } });
      });
      tilt.set(clamp((R - L) * 4, -16, 16));
      stage.wake();
    };
    const setSide = (side, v) => { v = clamp(v, 0, 10); if (side === 0) L = v; else R = v; sync(); };
    const stage = new Stage(root, {
      W: 620, H: 400, az: 50, el: 24, spin: [-40, 220], tilt: [10, 50], bounds: [[-150, -54, -12], [150, 54, 172]], pad: 18,
      label: "Рычажные весы: две чаши с кубиками. Тяжелее та, где кубиков больше.",
      readout: () => `${L} ${L > R ? ">" : L < R ? "<" : "="} ${R} · ${L > R ? "слева больше" : L < R ? "слева меньше" : "поровну"}`,
      update(dt) {
        let m = tilt.step(dt);
        for (const arr of pans) for (const q of arr) { m = q.z.step(dt) || m; m = q.o.step(dt) || m; }
        for (const s of [0, 1]) for (let i = pans[s].length - 1; i >= 0; i--) if (pans[s][i].dead && pans[s][i].o.v < 0.02) pans[s].splice(i, 1);
        return m;
      },
      onTap: (fx) => setSide(fx < 0.5 ? 0 : 1, (fx < 0.5 ? L : R) + 1),
      onKey: (k) => {
        if (k === "ArrowLeft") setSide(0, L + 1);
        else if (k === "ArrowRight") setSide(1, R + 1);
        else if (k === "ArrowDown") { setSide(0, L - 1); }
        else if (k === "ArrowUp") { setSide(1, R - 1); }
        else return false;
      },
      draw(c) {
        const P = c.P;
        const th = tilt.v * Math.PI / 180;
        const rot = ([x, y, z]) => [PIV[0] + x * Math.cos(th) + z * Math.sin(th), PIV[1] + y, PIV[2] - x * Math.sin(th) + z * Math.cos(th)];
        c.plate({ x: -150, y: -54, w: 300, d: 108, r: 8 }, { ticks: 6 });
        // column and foot
        let post = c.slab({ x: -20, y: -30, w: 40, d: 40, r: 4 }, 0, 8, { tone: "mid" }, 6, 0.8);
        post += c.L(planOutline({ x: -16, y: -26, w: 32, d: 32, r: 3 }, 8, P), { tone: "lo" });
        post += c.D(corners({ x: -20, y: -30, w: 40, d: 40 }, 4).map(([x, y]) => iso([x, y, 8], P)), { size: 0.45 });
        post += c.cyl(0, -10, 8, 8, 6, { tone: "mid" }, 28, 0.6);
        post += c.cyl(0, -10, 4.6, 14, PIV[2] - 22, { tone: "mid", crease: "none" }, 24);
        post += c.L([50, 80].map((z) => sideArc(0, -10, 4.6, z, P, 16)).join(""), { tone: "faint" });
        post += c.slab({ x: -7, y: -17, w: 14, d: 14, r: 2 }, PIV[2] - 8, 6, { tone: "mid" }, 3, 0.4);
        c.add([0, -10, 40], post, -2);
        // beam as a tilted bar, plus end hooks
        const B = [];
        for (const z of [-4, 4]) for (const [x, y] of [[-HALF, -4], [HALF, -4], [HALF, 4], [-HALF, 4]]) B.push(rot([x, y, z]));
        let beam = c.hexa(B, { tone: "hi" });
        const pv = rot([0, 4.2, 0]);
        beam += c.D([iso(pv, P)], { size: 1.3, tone: "hi" });
        beam += c.D([-70, -35, 35, 70].map((x) => iso(rot([x, 4.1, 0]), P)), { size: 0.45, tone: "mid" });
        c.add(PIV, beam);
        // dial plate above the beam
        const DP = [];
        for (const z of [PIV[2] + 10, PIV[2] + 44]) for (const [x, y] of [[-26, -8], [26, -8], [26, -5], [-26, -5]]) DP.push([x, y, z]);
        let dial = c.slab({ x: -2.5, y: -8, w: 5, d: 3, r: 0.6 }, PIV[2] + 2, 9, { tone: "mid" }, 2, 0.3);
        dial += c.hexa(DP, { tone: "mid" });
        const ticks = [];
        for (let a = -20; a <= 20; a += 4) {
          const r0 = a % 20 === 0 || a === 0 ? 26 : 29, rr = a * Math.PI / 180;
          ticks.push(c.seg([Math.sin(rr) * r0, -4.6, PIV[2] + Math.cos(rr) * r0], [Math.sin(rr) * 32, -4.6, PIV[2] + Math.cos(rr) * 32]));
        }
        const front = c.faces([0, 1, 0]);
        if (front) dial += c.L(ticks.join(""), { tone: "mid" });
        dial += c.sideText(-17, -4.6, PIV[2] + 16, [0, 1], "<", { size: 6, tone: "mid" });
        dial += c.sideText(0, -4.6, PIV[2] + 20, [0, 1], "=", { size: 6, tone: "mid" });
        dial += c.sideText(17, -4.6, PIV[2] + 16, [0, 1], ">", { size: 6, tone: "mid" });
        const nb = rot([0, 5.5, 6]), nt = rot([0, 5.5, 31]);
        if (front) dial += c.L(c.seg([nb[0], -4, nb[2]], [nt[0], -4, nt[2]]), { tone: "lit" });
        c.add([0, -6, PIV[2] + 28], dial);
        // pans
        [-1, 1].forEach((sgn, side) => {
          const end = rot([sgn * (HALF - 6), 0, -4]);
          const pz = end[2] - HANG;
          const px = end[0], py = PIV[1];
          const rim = [90, 210, 330].map((a) => [px + Math.cos(a * Math.PI / 180) * (PAN_R - 3), py + Math.sin(a * Math.PI / 180) * (PAN_R - 3), pz + 3]);
          const hook = [px, py, end[2] - 2];
          const back = [], front = [];
          for (const r of rim) (c.depth(r) < c.depth([px, py, pz]) ? back : front).push(c.seg(hook, r));
          let g = c.L(back.join(""), { tone: "mid" });
          g += c.cyl(px, py, 2.6, end[2] - 7, 7, { tone: "mid" }, 16);
          g += c.cyl(px, py, PAN_R, pz, 3, { tone: "mid" }, 56, 0.8);
          g += c.L(ring(px, py, PAN_R - 4, pz + 3, P, 56), { tone: "lo" });
          const arr = pans[side];
          const placed = arr.map((q, i) => {
            const slot = i % 4, layer = Math.floor(i / 4);
            const ox = (slot % 2 ? 1 : -1) * 8.4, oy = (slot < 2 ? -1 : 1) * 8.4;
            return { q, x: px + ox, y: py + oy, z: pz + 3 + layer * CS + q.z.v };
          }).sort((a, b) => c.depth([a.x, a.y, a.z]) - c.depth([b.x, b.y, b.z]));
          for (const p of placed) g += c.cube(p.x, p.y, p.z, CS - 0.6, { opacity: p.q.o.v, lit: true });
          g += c.L(front.join(""), { tone: "mid" });
          g += c.D([iso(hook, P)], { size: 0.9, tone: "hi" });
          c.add([px, py, pz + 20], g);
        });
      },
    });
    scenes.balance = { stage, act: { lAdd: () => setSide(0, L + 1), lSub: () => setSide(0, L - 1), rAdd: () => setSide(1, R + 1), rSub: () => setSide(1, R - 1), even: () => { L = R = 4; sync(); } } };
    sync();
    return stage;
  }

  /* ---------- Fig 3: number line — a hopping marker ---------- */
  function numberLine(root) {
    const X = (i) => i * 24;
    let a = 3, b = 4, op = "+", phase = "idle", hop = 0, ht = 0, tourT = 0;
    const end = () => (op === "+" ? a + b : a - b);
    const posAt = () => {
      if (phase === "idle") return { x: X(a), z: 0, done: 0 };
      if (phase === "done") return { x: X(end()), z: 0, done: b };
      const dir = op === "+" ? 1 : -1;
      const from = a + dir * hop, k = ease(ht);
      return { x: lerp(X(from), X(from + dir), k), z: Math.sin(Math.PI * ht) * 22, done: hop };
    };
    const run = () => {
      if (b === 0) { phase = "done"; stage.wake(); return; }
      phase = "run"; hop = 0; ht = 0; stage.wake();
    };
    const fix = () => {
      a = clamp(a, 0, 10);
      b = clamp(b, 0, op === "+" ? 10 - a : a);
      phase = "idle"; stage.wake(); sync();
    };
    const stage = new Stage(root, {
      W: 640, H: 280, az: 72, el: 34, spin: [30, 130], fit: 10, tilt: [18, 62], bounds: [[-22, -34, -10], [262, 34, 30]], pad: 14,
      label: "Числовая прямая: плитки от 0 до 10 и фишка, которая прыгает на нужное число шагов.",
      readout: () => {
        const p = posAt();
        if (phase === "idle") return `${a} ${op === "+" ? "+" : "−"} ${b} = ?`;
        if (phase === "run") return `${a} ${op === "+" ? "+" : "−"} ${b} · шаг ${p.done + 1} из ${b}`;
        return `${a} ${op === "+" ? "+" : "−"} ${b} = ${end()}`;
      },
      update(dt) {
        if (phase !== "run") return false;
        ht += dt / (still.matches ? 0.05 : 0.42);
        if (ht >= 1) { ht = 0; hop++; if (hop >= b) phase = "done"; }
        return true;
      },
      tour(dt) {
        if (phase === "run") return true;
        tourT += dt;
        if (tourT > 2.6) {
          tourT = 0;
          op = Math.random() < 0.6 ? "+" : "-";
          a = op === "+" ? 1 + Math.floor(Math.random() * 6) : 4 + Math.floor(Math.random() * 7);
          b = op === "+" ? 1 + Math.floor(Math.random() * (10 - a)) : 1 + Math.floor(Math.random() * a);
          sync();
          run();
        }
        return true;
      },
      onTap: () => run(),
      onKey: (k) => {
        if (k === "Enter" || k === " ") run();
        else if (k === "ArrowRight") { b++; fix(); }
        else if (k === "ArrowLeft") { b--; fix(); }
        else if (k === "ArrowUp") { a++; fix(); }
        else if (k === "ArrowDown") { a--; fix(); }
        else return false;
      },
      draw(c) {
        const P = c.P;
        c.plate({ x: -22, y: -34, w: 284, d: 68, r: 7 }, { ruler: false });
        c.base(c.slab({ x: -12, y: -26, w: 264, d: 5, r: 1 }, 0, 2.4, { tone: "mid" }, 3, 0.4));
        c.base(c.D([-6, 246].map((x) => iso([x, -23.5, 2.4], P)), { size: 0.45 }));
        const p = posAt();
        const lo = Math.min(a, end()), hi = Math.max(a, end());
        for (let i = 0; i <= 10; i++) {
          const x = X(i);
          const on = phase !== "idle" && i >= lo && i <= hi && (op === "+" ? i <= a + p.done : i >= a - p.done);
          const tgt = phase === "done" && i === end();
          const plan = { x: x - 10.5, y: -14, w: 21, d: 28, r: 2 };
          let s = c.slab(plan, 0, 3, { tone: tgt ? "hi" : on ? "hi" : "mid", lit: tgt }, 3, 0.5);
          s += c.topText(x, 3, 3, String(i), { size: 9, tone: tgt || i === a ? "hi" : on ? "mid" : "lo" });
          s += c.L(c.seg([x, -14, 3], [x, -9, 3]), { tone: i === a ? "hi" : "lo" });
          c.base(s);
        }
        // trail of hops already made
        const dir = op === "+" ? 1 : -1;
        const arcs = [];
        const made = phase === "done" ? b : phase === "run" ? p.done : 0;
        for (let h = 0; h < made; h++) {
          const x0 = X(a + dir * h), x1 = X(a + dir * (h + 1));
          const pts = [];
          for (let t = 0; t <= 1.0001; t += 0.1) pts.push([lerp(x0, x1, t), -4, 4 + Math.sin(Math.PI * t) * 22]);
          arcs.push(c.poly(pts));
        }
        if (phase === "run") {
          const x0 = X(a + dir * hop);
          const pts = [];
          for (let t = 0; t <= ht + 1e-4; t += 0.05) pts.push([lerp(x0, x0 + dir * 24, ease(t)), -4, 4 + Math.sin(Math.PI * t) * 22]);
          if (pts.length > 1) arcs.push(c.poly(pts));
        }
        // marker: puck, stem and a lit head
        let m = c.cyl(p.x, -4, 7.5, 3 + p.z, 2.6, { tone: "mid" }, 28, 0.5);
        m += c.cyl(p.x, -4, 1.6, 5.6 + p.z, 11, { tone: "mid", crease: "none" }, 14);
        m += c.cyl(p.x, -4, 5, 16 + p.z, 5, { tone: "hi", lit: true }, 28, 1.2);
        if (p.z > 0.5) c.base(`<path class="iso-halo" style="opacity:${0.5 * (1 - p.z / 30)}" d="${haloOf({ x: p.x - 6, y: -10, w: 12, d: 12, r: 6 }, 3, 0.1, P)}"/>`);
        c.add([p.x, -4, 10], m);
        c.over(c.L(arcs.join(""), { tone: "lit", dotted: true }));
      },
    });
    const sync = () => { const o = root.closest("section")?.querySelector("[data-op]"); if (o) o.textContent = op === "+" ? "+" : "−"; };
    scenes.line = { stage, act: { aAdd: () => { a++; fix(); }, aSub: () => { a--; fix(); }, bAdd: () => { b++; fix(); }, bSub: () => { b--; fix(); }, op: () => { op = op === "+" ? "-" : "+"; fix(); }, run } };
    return stage;
  }

  /* ---------- Fig 4: subtraction — a tower that gives cubes away ---------- */
  function tower(root) {
    const CS = 18, TX = -28, Z0 = 6, TRAY = { x: 14, y: -34, w: 116, d: 64, r: 4 };
    let n = 8, b = 3, phase = "idle", t = 0;
    const slot = (j) => [TRAY.x + 16 + (j % 5) * 21, TRAY.y + 20 + Math.floor(j / 5) * 24, 3];
    const fix = () => { n = clamp(n, 1, 10); b = clamp(b, 0, n); phase = "idle"; t = 0; stage.wake(); };
    const run = () => { phase = "run"; t = 0; stage.wake(); };
    const stage = new Stage(root, {
      W: 600, H: 420, az: 38, el: 26, spin: [-30, 150], tilt: [10, 50], bounds: [[-72, -54, -12], [140, 46, Z0 + 10 * CS + 30]], pad: 16,
      label: "Башня из кубиков: верхние кубики снимают и переносят на поднос.",
      readout: () => (phase === "done" ? `${n} − ${b} = ${n - b}` : phase === "run" ? `${n} − ${b} · убираем…` : `${n} − ${b} = ?`),
      update(dt) {
        if (phase !== "run") return false;
        t += dt * (still.matches ? 40 : 1);
        if (t > b * 0.28 + 1) phase = "done";
        return true;
      },
      onTap: () => (phase === "run" ? 0 : phase === "done" ? fix() : run()),
      onKey: (k) => {
        if (k === "Enter" || k === " ") (phase === "idle" ? run() : fix());
        else if (k === "ArrowUp") { n++; fix(); }
        else if (k === "ArrowDown") { n--; fix(); }
        else if (k === "ArrowRight") { b++; fix(); }
        else if (k === "ArrowLeft") { b--; fix(); }
        else return false;
      },
      draw(c) {
        const P = c.P;
        c.plate({ x: -76, y: -54, w: 220, d: 100, r: 8 }, { ticks: 5 });
        // pedestal
        let ped = c.slab({ x: TX - 18, y: -18, w: 36, d: 36, r: 3 }, 0, Z0, { tone: "mid" }, 4, 0.8);
        ped += c.D(corners({ x: TX - 18, y: -18, w: 36, d: 36 }, 3.5).map(([x, y]) => iso([x, y, Z0], P)), { size: 0.4 });
        c.add([TX, 0, 1], ped, -30);
        // height gauge with a mark per cube
        const G = { x: TX - 34, y: -14, w: 8, d: 6, r: 1 };
        let g = c.slab(G, 0, Z0 + 10 * CS + 8, { tone: "mid" }, 2, 0.4);
        const marks = [];
        for (let i = 0; i <= 10; i++) {
          const z = Z0 + i * CS;
          marks.push(c.seg([G.x + 8, -8, z], [G.x + 3, -8, z]));
          if (i > 0) g += c.sideText(G.x + 4, -8, z - CS / 2 + 1, [0, 1], String(i), { size: 5.4, tone: i === n - (phase === "done" ? b : 0) ? "hi" : "lo" });
        }
        g += c.L(marks.join(""), { tone: "mid" });
        c.add([G.x + 4, -11, 60], g);
        // tray
        let tr = c.slab(TRAY, 0, 3, { tone: "mid" }, 6, 0.6);
        tr += c.L(planOutline(insetPlan(TRAY, 5), 3, P), { tone: "lo" });
        for (let j = 0; j < 10; j++) { const [x, y] = slot(j); tr += c.L(planOutline({ x: x - 9, y: y - 9, w: 18, d: 18, r: 1.5 }, 3, P, 2), { tone: "faint" }); }
        c.add([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, 1], tr, -60);
        for (let i = 0; i < n; i++) {
          const fromTop = n - 1 - i;
          let x = TX, y = 0, z = Z0 + i * CS, moving = fromTop < b && phase !== "idle", lit = true, op = 1, dim = false;
          if (moving) {
            const k = clamp((t - fromTop * 0.28) / 0.9, 0, 1);
            const [sx, sy, sz] = slot(fromTop);
            const top = Z0 + n * CS + 16;
            if (k < 0.3) z = lerp(z, top, ease(k / 0.3));
            else if (k < 0.75) { z = top; const m = ease((k - 0.3) / 0.45); x = lerp(TX, sx, m); y = lerp(0, sy, m); }
            else { x = sx; y = sy; z = lerp(top, sz, ease((k - 0.75) / 0.25)); }
            if (k >= 1) dim = true;
          }
          c.add([x, y, z + CS / 2], c.cube(x, y, z, CS - 0.8, { lit, opacity: op, dim }));
        }
      },
    });
    scenes.tower = { stage, act: { nAdd: () => { n++; fix(); }, nSub: () => { n--; fix(); }, bAdd: () => { b++; fix(); }, bSub: () => { b--; fix(); }, run: () => (phase === "idle" ? run() : (fix(), run())), reset: fix } };
    return stage;
  }

  /* ---------- Fig 5: spike abacus — ones, tens, hundreds, with carrying ---------- */
  function abacus(root) {
    const RODS = [-62, 0, 62], BH = 8.2, BASE_Z = 18, ROD_TOP = BASE_Z + 10 * BH + 14, NAMES = ["СОТНИ", "ДЕСЯТКИ", "ЕДИНИЦЫ"];
    const rods = [[], [], []];
    const queue = [];
    let clock = 0;
    const live = (r) => rods[r].filter((q) => !q.leaving);
    const value = () => live(0).length * 100 + live(1).length * 10 + live(2).length;
    const restack = (r) => live(r).forEach((q, i) => q.z.set(BASE_Z + i * BH));
    const later = (dt, fn) => queue.push({ at: clock + (still.matches ? 0 : dt), fn });
    const drop = (r) => { const q = { z: new Spring(ROD_TOP + 50, { k: 180, c: 19 }), o: new Spring(0, { k: 140, c: 24 }).set(1), born: clock }; rods[r].push(q); restack(r); };
    const lift = (r, count) => { const l = live(r); for (let i = 0; i < count; i++) { const q = l[l.length - 1 - i]; q.leaving = true; q.z.set(ROD_TOP + 40 + i * 2); q.o.set(0); } restack(r); };
    let busy = 0;
    const add = (r) => {
      if (value() + [100, 10, 1][r] > 999) return;
      busy++;
      drop(r);
      if (live(r).length === 10) {
        later(0.55, () => { lift(r, 10); later(0.35, () => { busy--; add(r - 1); }); });
      } else busy--;
      stage.wake();
    };
    const sub = (r) => {
      if (value() - [100, 10, 1][r] < 0) return;
      if (live(r).length > 0) { lift(r, 1); stage.wake(); return; }
      busy++;
      sub(r - 1);
      later(0.4, () => { for (let i = 0; i < 10; i++) later(i * 0.05, () => drop(r)); later(0.9, () => { lift(r, 1); busy--; }); });
      stage.wake();
    };
    const setTo = (v) => {
      v = clamp(v, 0, 999); queue.length = 0; busy = 0;
      const ds = [Math.floor(v / 100), Math.floor(v / 10) % 10, v % 10];
      ds.forEach((d, r) => { const l = live(r); if (l.length > d) lift(r, l.length - d); for (let i = l.length; i < d; i++) later(i * 0.05 + r * 0.12, () => drop(r)); });
      stage.wake();
    };
    const stage = new Stage(root, {
      W: 600, H: 420, az: 36, el: 24, spin: [-40, 130], tilt: [10, 50], bounds: [[-112, -50, -12], [112, 50, ROD_TOP + 12]], pad: 16,
      label: "Счёты с тремя стержнями: сотни, десятки, единицы. Десять бусин меняются на одну на соседнем стержне.",
      readout: () => {
        const [h, t, u] = [0, 1, 2].map((r) => live(r).length);
        return `${h * 100 + t * 10 + u} = ${h} сот. + ${t} дес. + ${u} ед.`;
      },
      update(dt) {
        clock += dt;
        let m = queue.length > 0;
        for (let i = 0; i < queue.length; i++) if (queue[i].at <= clock) { const job = queue.splice(i, 1)[0]; i--; job.fn(); }
        for (const r of rods) {
          for (const q of r) { m = q.z.step(dt) || m; m = q.o.step(dt) || m; }
          for (let i = r.length - 1; i >= 0; i--) if (r[i].leaving && r[i].o.v < 0.02 && r[i].o.t === 0) r.splice(i, 1);
        }
        return m;
      },
      onTap: () => add(2),
      onKey: (k) => {
        if (k === "ArrowUp") add(2);
        else if (k === "ArrowDown") sub(2);
        else if (k === "ArrowRight") add(1);
        else if (k === "ArrowLeft") sub(1);
        else return false;
      },
      draw(c) {
        const P = c.P;
        c.plate({ x: -112, y: -50, w: 224, d: 100, r: 8 }, { ticks: 5 });
        const blk = { x: -94, y: -22, w: 188, d: 44, r: 4 };
        let b = c.slab(blk, 0, BASE_Z, { tone: "mid" }, 6, 1);
        b += c.L(planOutline(insetPlan(blk, 4), BASE_Z, P, 4), { tone: "lo" });
        b += c.D(corners(blk, 5).map(([x, y]) => iso([x, y, BASE_Z], P)), { size: 0.45 });
        RODS.forEach((x, r) => {
          b += c.L(ring(x, 0, 16, BASE_Z, P, 40), { tone: "faint" });
          b += c.topText(x, 15.5, BASE_Z, ["100", "10", "1"][r], { size: 6, tone: "mid" });
          b += c.sideText(x, 22, BASE_Z / 2, [0, 1], NAMES[r], { size: 4.2, tone: "lo" });
          b += c.sideText(x, -22, BASE_Z / 2, [0, -1], NAMES[r], { size: 4.2, tone: "lo" });
        });
        c.add([0, 0, 2], b, -200);
        RODS.forEach((x, r) => {
          const list = [...rods[r]].sort((p, q) => p.z.v - q.z.v);
          const stackTop = live(r).length ? Math.max(...live(r).map((q) => q.z.v)) + BH : BASE_Z;
          let g = c.cyl(x, 0, 2, BASE_Z, Math.max(0.1, Math.min(stackTop, ROD_TOP) - BASE_Z), { tone: "mid", crease: "none" }, 16);
          const onRod = list.filter((q) => q.z.v < ROD_TOP - 2);
          const flying = list.filter((q) => q.z.v >= ROD_TOP - 2);
          onRod.forEach((q, i) => {
            const isTop = i === onRod.length - 1;
            let s = c.cyl(x, 0, 13, q.z.v, BH - 0.5, { tone: "hi", lit: true }, 36, 1.6);
            if (isTop) s += c.L(ring(x, 0, 5, q.z.v + BH - 0.5, P, 24), { tone: "lo" });
            g += q.o.v < 0.99 ? `<g opacity="${q.o.v.toFixed(2)}">${s}</g>` : s;
          });
          if (stackTop < ROD_TOP) {
            g += c.cyl(x, 0, 2, stackTop, ROD_TOP - stackTop, { tone: "mid", crease: "none" }, 16);
          }
          g += c.cyl(x, 0, 3.6, ROD_TOP, 3, { tone: "hi" }, 20, 0.8);
          flying.forEach((q) => {
            const s = c.cyl(x, 0, 13, q.z.v, BH - 0.5, { tone: "hi", lit: true }, 36, 1.6);
            g += `<g opacity="${q.o.v.toFixed(2)}">${s}</g>`;
          });
          c.add([x, 0, 40], g);
        });
      },
    });
    scenes.abacus = { stage, act: { a1: () => add(2), a10: () => add(1), a100: () => add(0), s1: () => sub(2), reset: () => setTo(0), rand: () => setTo(10 + Math.floor(Math.random() * 980)), nine: () => setTo(99) } };
    setTo(47);
    return stage;
  }

  /* ---------- Fig 6: multiplication — an array on a pegboard ---------- */
  function grid(root) {
    const CELL = 20, X = (i) => -80 + i * CELL, Y = (j) => -80 + j * CELL, CS = 15;
    let a = 3, b = 4, setAt = 0, clock = 0;
    const az0 = 40;
    const fix = () => { a = clamp(a, 1, 9); b = clamp(b, 1, 9); setAt = clock; stage.wake(); };
    const turned = (s) => Math.abs(Math.round((s.az.t - az0) / 90)) % 2 === 1;
    const stage = new Stage(root, {
      W: 560, H: 460, az: az0, el: 34, fit: 45, tilt: [16, 70], bounds: [[-108, -108, -12], [108, 108, 20]], pad: 10,
      label: "Доска с лунками 9 на 9: кубики выстраиваются в ряды. Умножение — это одинаковые ряды.",
      readout: (s) => (turned(s) ? `${b} × ${a} = ${a * b} · ${b} ${plural(b, ["ряд", "ряда", "рядов"])} по ${a}` : `${a} × ${b} = ${a * b} · ${a} ${plural(a, ["ряд", "ряда", "рядов"])} по ${b}`),
      update(dt) { clock += dt; return clock - setAt < (a * b) * 0.035 + 0.8; },
      onTap: () => stage.spinBy(90),
      onKey: (k) => {
        if (k === "ArrowUp") { a++; fix(); }
        else if (k === "ArrowDown") { a--; fix(); }
        else if (k === "ArrowRight") { b++; fix(); }
        else if (k === "ArrowLeft") { b--; fix(); }
        else return false;
      },
      draw(c) {
        const P = c.P;
        const board = { x: -108, y: -108, w: 216, d: 216, r: 8 };
        c.plate(board, { ruler: false });
        const rings = [], fills = [];
        for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) (i < b && j < a ? fills : rings).push(ring(X(i), Y(j), 4, 0, P, 16));
        c.base(c.L(rings.join(""), { tone: "lo" }) + c.L(fills.join(""), { tone: "mid" }));
        for (let i = 0; i < 9; i++) {
          c.base(c.topText(X(i), -97, 0, String(i + 1), { size: 6.5, tone: i < b ? "hi" : "lo" }));
          c.base(c.topText(-97, Y(i), 0, String(i + 1), { size: 6.5, tone: i < a ? "hi" : "lo" }));
          c.base(c.topText(X(i), 97, 0, String(i + 1), { size: 6.5, tone: i < b ? "mid" : "faint" }));
          c.base(c.topText(97, Y(i), 0, String(i + 1), { size: 6.5, tone: i < a ? "mid" : "faint" }));
        }
        c.base(c.L(planOutline({ x: -89.5, y: -89.5, w: b * CELL - 1, d: a * CELL - 1, r: 3 }, 0, P, 3), { tone: "hi", dashed: true }));
        let k = 0;
        for (let j = 0; j < a; j++) for (let i = 0; i < b; i++) {
          const p = clamp((clock - setAt - k * 0.035) / 0.4, 0, 1);
          k++;
          if (p <= 0) continue;
          const z = (1 - easeOut(p)) * 40;
          c.add([X(i), Y(j), z + CS / 2], c.cube(X(i), Y(j), z, CS, { opacity: Math.min(1, p * 2), lit: true }));
        }
      },
    });
    scenes.grid = { stage, act: { aAdd: () => { a++; fix(); }, aSub: () => { a--; fix(); }, bAdd: () => { b++; fix(); }, bSub: () => { b--; fix(); }, turn: () => stage.spinBy(90) } };
    return stage;
  }

  /* ---------- Fig 7: division — dealing cubes into equal bins ---------- */
  function deal(root) {
    const CS = 14, HOP = { x: -76, y: -74, w: 152, d: 56, r: 4 };
    let N = 13, k = 4, phase = "idle", t = 0;
    const home = (i) => [HOP.x + 14 + (i % 7) * 20.6, HOP.y + 10 + Math.floor(i / 7) * 18, 4];
    const binX = (j) => (j - (k - 1) / 2) * 46;
    const binSlot = (j, level) => { const s = level % 4, l = Math.floor(level / 4); return [binX(j) + (s % 2 ? 7.6 : -7.6), 42 + (s < 2 ? -7.6 : 7.6), 3 + l * CS]; };
    const dealt = () => Math.floor(N / k) * k;
    const STEP = 0.3, FLY = 0.55;
    const fix = () => { N = clamp(N, 1, 21); k = clamp(k, 1, 6); phase = "idle"; t = 0; stage.wake(); };
    const run = () => { phase = "run"; t = 0; stage.wake(); };
    const stage = new Stage(root, {
      W: 620, H: 440, az: 52, el: 30, spin: [-20, 150], tilt: [14, 60], bounds: [[-150, -82, -12], [150, 82, 60]], pad: 14,
      label: "Раздача: кубики из общего лотка по одному раскладываются в коробки поровну.",
      readout: () => {
        const q = Math.floor(N / k), r = N % k;
        if (phase !== "done") return `${N} : ${k} = ?`;
        return r ? `${N} : ${k} = ${q} (ост. ${r})` : `${N} : ${k} = ${q}`;
      },
      update(dt) {
        if (phase !== "run") return false;
        t += dt * (still.matches ? 40 : 1);
        if (t > dealt() * STEP + FLY + 0.1) phase = "done";
        return true;
      },
      onTap: () => (phase === "idle" ? run() : fix()),
      onKey: (key) => {
        if (key === "Enter" || key === " ") (phase === "idle" ? run() : fix());
        else if (key === "ArrowUp") { N++; fix(); }
        else if (key === "ArrowDown") { N--; fix(); }
        else if (key === "ArrowRight") { k++; fix(); }
        else if (key === "ArrowLeft") { k--; fix(); }
        else return false;
      },
      draw(c) {
        const P = c.P;
        c.plate({ x: -150, y: -82, w: 300, d: 164, r: 8 }, { ticks: 6 });
        let h = c.slab(HOP, 0, 4, { tone: "mid" }, 6, 0.6);
        h += c.L(planOutline(insetPlan(HOP, 4), 4, P), { tone: "lo" });
        h += c.sideText(0, HOP.y + HOP.d, 2, [0, 1], "ВСЕГО", { size: 3.2, tone: "lo" });
        c.add([0, HOP.y + HOP.d / 2, 0], h, -80);
        for (let j = 0; j < k; j++) {
          const bp = { x: binX(j) - 19, y: 42 - 19, w: 38, d: 38, r: 3 };
          let s = c.slab(bp, 0, 3, { tone: "mid" }, 4, 0.5);
          s += c.L(planOutline(insetPlan(bp, 3), 3, P, 3), { tone: "lo" });
          s += c.sideText(binX(j), 61, 1.6, [0, 1], String(j + 1), { size: 3.2, tone: "mid" });
          c.add([binX(j), 42, 0], s, -80);
        }
        const moved = phase === "idle" ? 0 : dealt();
        for (let i = 0; i < N; i++) {
          const order = N - 1 - i;
          let [x, y, z] = home(i), lit = true, accent;
          if (order < moved) {
            const p = clamp((t - order * STEP) / FLY, 0, 1);
            const [bx, by, bz] = binSlot(order % k, Math.floor(order / k));
            const e = ease(p);
            x = lerp(x, bx, e); y = lerp(y, by, e); z = lerp(z, bz, e) + Math.sin(Math.PI * p) * 46;
          } else if (phase === "done") accent = "red";
          c.add([x, y, z + CS / 2], c.cube(x, y, z, CS - 0.6, { lit, accent }));
        }
      },
    });
    scenes.deal = { stage, act: { nAdd: () => { N++; fix(); }, nSub: () => { N--; fix(); }, kAdd: () => { k++; fix(); }, kSub: () => { k--; fix(); }, run: () => (phase === "idle" ? run() : (fix(), run())), reset: fix } };
    return stage;
  }

  /* ---------- Fig 8: practice — a score tray filled by right answers ---------- */
  function practice(root) {
    const X = (i) => -84 + (i % 5) * 42, Y = (i) => (i < 5 ? -14 : 22);
    let score = 0, tries = 0;
    const cubes = Array.from({ length: 10 }, () => ({ z: new Spring(80, { k: 200, c: 18 }), o: new Spring(0) }));
    const stage = new Stage(root, {
      W: 560, H: 300, az: 40, el: 32, spin: [-30, 120], bounds: [[-118, -46, -12], [118, 52, 40]], pad: 14,
      label: "Лоток для очков: за каждый верный ответ в гнездо падает кубик.",
      readout: () => `верно ${score} из ${tries}`,
      update(dt) { let m = false; for (const q of cubes) { m = q.z.step(dt) || m; m = q.o.step(dt) || m; } return m; },
      draw(c) {
        const P = c.P;
        c.plate({ x: -118, y: -46, w: 236, d: 98, r: 8 }, { ticks: 5 });
        for (let i = 0; i < 10; i++) {
          c.base(c.L(planOutline({ x: X(i) - 14, y: Y(i) - 14, w: 28, d: 28, r: 3 }, 0, P, 3), { tone: i < score % 11 ? "mid" : "lo" }));
        }
        const full = score >= 10;
        cubes.forEach((q, i) => {
          if (q.o.v < 0.02) return;
          let s = c.cube(X(i), Y(i), q.z.v, 22, { opacity: q.o.v, lit: true });
          s += c.topText(X(i), Y(i), q.z.v + 22, String(i + 1), { size: 7, tone: full ? "hi" : "mid" });
          c.add([X(i), Y(i), q.z.v + 11], s);
        });
      },
    });
    const api = {
      stage,
      answer(ok) {
        tries++;
        if (ok) {
          if (score >= 10) { score = 0; cubes.forEach((q) => { q.o.jump(0); q.z.jump(80); }); }
          const q = cubes[score]; q.z.jump(80); q.z.set(0); q.o.set(1);
          score++;
        }
        stage.wake();
      },
      reset() { score = 0; tries = 0; cubes.forEach((q) => { q.o.set(0); q.z.set(40); }); stage.wake(); },
    };
    scenes.practice = api;
    return stage;
  }

  window.LESSONS.build = { hero, count, balance, numberLine, tower, abacus, grid, deal, practice };
})();
