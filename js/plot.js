/* Plotting board: a real drafting board standing on a bench plate.
   Math happens on its front face (plane y = 0); bars, beads and blocks
   stand out of the face in true depth, so the whole bench can be turned. */
(function () {
  const { Stage, Spring, clamp, lerp } = window.ISO;
  const fmt = (v, d = 2) => {
    const t = Number(v.toFixed(d)).toString().replace(".", ",").replace("-", "−");
    return t === "−0" ? "0" : t;
  };

  function board(root, cfg) {
    const [x0, x1] = cfg.x, [y0, y1] = cfg.y;
    const Sx = x1 - x0, Sy = y1 - y0;
    const s = cfg.s || Math.min(300 / Sx, 210 / Sy);
    const sy = cfg.sy || s, ky = s / sy;
    const m = cfg.margin ?? 14, ZB = cfg.lift ?? 18, T = 6;
    const X = (x) => (x - (x0 + x1) / 2) * s;
    const Z = (y) => ZB + m + (y - y0) * sy;
    const BW = Sx * s + 2 * m, BH = Sy * sy + 2 * m;
    const PANEL = { x: -BW / 2, y: -T, w: BW, d: T, r: 2.5 };
    const PLATE = { x: -BW / 2 - 22, y: -46, w: BW + 44, d: cfg.deep || 92, r: 8 };
    const st = cfg.state || {};
    const vals = {};
    const sp = {};
    for (const [k, p] of Object.entries(cfg.params || {})) { sp[k] = new Spring(p.v, { k: p.k || 120, c: p.c || 20 }); vals[k] = p.v; }
    const v = new Proxy({}, { get: (_, k) => (sp[k] ? sp[k].v : undefined) });
    const set = (k, val) => {
      const p = cfg.params[k];
      if (!p) return;
      val = clamp(val, p.min ?? -Infinity, p.max ?? Infinity);
      if (p.step) val = Math.round(val / p.step) * p.step;
      vals[k] = val; sp[k].set(val);
      if (p.snap) sp[k].jump(val);
      if (cfg.onSet) cfg.onSet(k, val, st, vals);
      api.stage.touch();
      document.dispatchEvent(new CustomEvent("param", { detail: { root, k, val } }));
    };
    const head = cfg.head || Math.max(Sx, Sy) / 34;

    const stage = new Stage(root, {
      W: cfg.W || 640, H: cfg.H || 440, az: cfg.az ?? 74, el: cfg.el ?? 16, spin: cfg.spin || [20, 160], tilt: [4, 52], fit: cfg.fit ?? 8, pad: cfg.pad ?? 12,
      bounds: [[PLATE.x, PLATE.y, -12], [PLATE.x + PLATE.w, PLATE.y + PLATE.d, ZB + BH + 6]],
      label: cfg.label || "",
      readout: () => (cfg.readout ? cfg.readout(vals, st, v) : ""),
      update(dt) {
        let m = false;
        for (const k in sp) m = sp[k].step(dt) || m;
        if (cfg.update) m = cfg.update(dt, st, vals) || m;
        return m;
      },
      onTap: cfg.onTap ? (fx, fy) => cfg.onTap(fx, fy, st, vals, set) : undefined,
      onKey: cfg.onKey ? (k) => cfg.onKey(k, st, vals, set) : undefined,
      tour: cfg.tour,
      draw(c) {
        const P = c.P;
        c.plate(PLATE, { ticks: 6 });
        // two uprights carrying the board, with feet blocks and screws
        for (const ex of [-BW / 2 + 10, BW / 2 - 18]) {
          c.base(c.slab({ x: ex - 4, y: -T - 10, w: 16, d: T + 22, r: 2 }, 0, 6, { tone: "mid" }, 3, 0.5));
          c.base(c.D([iso([ex + 4, 6, 6], P), iso([ex + 4, -T - 5, 6], P)], { size: 0.5 }));
          c.base(c.slab({ x: ex, y: -T - 4, w: 8, d: 4, r: 1 }, 6, ZB - 6 + BH * 0.6, { tone: "mid" }, 2, 0.3));
        }
        // the panel
        c.base(c.slab(PANEL, ZB, BH, { tone: "mid" }, 4, 0.8));
        const face = [];
        const at = (x, y, off = 0.25) => [X(x), off, Z(y)];
        const seg = (a, b) => c.seg(at(...a), at(...b));
        // grid
        const g = cfg.grid ?? 1, minor = [], major = [];
        if (g) {
          for (let x = Math.ceil(x0 / g) * g; x <= x1 + 1e-9; x += g) (Math.abs(x) < 1e-9 ? major : minor).push(seg([x, y0], [x, y1]));
          for (let y = Math.ceil(y0 / g) * g; y <= y1 + 1e-9; y += g) (Math.abs(y) < 1e-9 ? major : minor).push(seg([x0, y], [x1, y]));
        }
        face.push(c.L(minor.join(""), { tone: "faint" }));
        if (cfg.axes !== false) {
          const ax = [], txt = [];
          if (y0 <= 0 && y1 >= 0) { ax.push(seg([x0, 0], [x1, 0]), seg([x1, 0], [x1 - head, head * 0.45 * ky]), seg([x1, 0], [x1 - head, -head * 0.45 * ky])); txt.push(c.sideText(X(x1) - 6, 0.3, Z(0) + 9, [0, 1], cfg.xl || "x", { size: 6.5, tone: "hi" })); }
          if (x0 <= 0 && x1 >= 0) { ax.push(seg([0, y0], [0, y1]), seg([0, y1], [head * 0.45, y1 - head * ky]), seg([0, y1], [-head * 0.45, y1 - head * ky])); txt.push(c.sideText(X(0) + 9, 0.3, Z(y1) - 3, [0, 1], cfg.yl || "y", { size: 6.5, tone: "hi" })); }
          face.push(c.L(major.concat(ax).join(""), { tone: "mid" }));
          const lab = cfg.lab ?? 1, fs = cfg.fs || clamp(s * 0.36, 4.2, 6.5);
          const ty = y0 <= 0 && y1 >= 0 ? 0 : y0, tx = x0 <= 0 && x1 >= 0 ? 0 : x0;
          const tk = [];
          if (lab) {
            for (let x = Math.ceil(x0 / lab) * lab; x <= x1 - head * 1.5; x += lab) {
              if (Math.abs(x) < 1e-9) continue;
              tk.push(seg([x, ty - head * 0.3 * ky], [x, ty + head * 0.3 * ky]));
              txt.push(c.sideText(X(x), 0.3, Z(ty) - fs * 0.9, [0, 1], (cfg.xfmt || fmt)(x), { size: fs, tone: "lo" }));
            }
            for (let y = Math.ceil(y0 / lab) * lab; y <= y1 - head * 1.5; y += lab) {
              if (Math.abs(y) < 1e-9) continue;
              tk.push(seg([tx - head * 0.3, y], [tx + head * 0.3, y]));
              txt.push(c.sideText(X(tx) - fs * 0.9, 0.3, Z(y) + fs * 0.1, [0, 1], (cfg.yfmt || fmt)(y), { size: fs, tone: "lo", anchor: "end" }));
            }
            if (x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0) txt.push(c.sideText(X(0) - fs * 0.7, 0.3, Z(0) - fs * 0.9, [0, 1], "0", { size: fs, tone: "lo" }));
          }
          face.push(c.L(tk.join(""), { tone: "mid" }), txt.join(""));
        }
        // corner screws and a nameplate engraved on the panel
        face.push(c.D([[PANEL.x + 5, ZB + 5], [PANEL.x + BW - 5, ZB + 5], [PANEL.x + 5, ZB + BH - 5], [PANEL.x + BW - 5, ZB + BH - 5]].map(([x, z]) => iso([x, 0.3, z], P)), { size: 0.6 }));
        if (cfg.plate) face.push(c.sideText(PANEL.x + BW - 10, 0.3, ZB + 6.5, [0, 1], cfg.plate, { size: 3.6, tone: "lo", anchor: "end" }));
        c.base(face.join(""));
        // top rail with a cursor carriage
        c.base(c.slab({ x: PANEL.x + 4, y: 0, w: BW - 8, d: 4, r: 1 }, ZB + BH - 3, 3, { tone: "mid" }, 2, 0.3));

        const B = {
          c, P, s, X, Z, at, v, vals, st, fmt, head,
          x0, x1, y0, y1,
          face: (svg) => c.base(svg),
          line(pts, o = {}) {
            const d = c.poly(pts.map((p) => at(p[0], p[1], o.off ?? 0.4)));
            const svg = c.L(d, { tone: o.tone || "hi", dotted: o.dotted, dashed: o.dashed });
            const w = o.w ? svg.replace("<path", `<path style="stroke-width:${o.w}"`) : svg;
            o.front ? c.over(w) : c.base(w);
          },
          fn(f, o = {}) {
            const a = o.from ?? x0, b = o.to ?? x1, n = o.n || 220;
            const lo = y0 - 0.02 * Sy, hi = y1 + 0.02 * Sy;
            let run = [];
            const out = [];
            let prev = null;
            for (let i = 0; i <= n; i++) {
              const x = a + (b - a) * i / n, y = f(x);
              const ok = Number.isFinite(y) && y >= lo && y <= hi && !(prev !== null && Math.abs(y - prev) > Sy * 0.6);
              if (ok) run.push([x, clamp(y, y0, y1)]);
              else { if (run.length > 1) out.push(run); run = []; if (Number.isFinite(y) && y >= lo && y <= hi) run.push([x, y]); }
              prev = Number.isFinite(y) ? y : null;
            }
            if (run.length > 1) out.push(run);
            for (const r of out) B.line(r, o);
          },
          seg(a, b, o = {}) { B.line([a, b], o); },
          arrow(a, b, o = {}) {
            const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
            if (L < 1e-6) return;
            const h = Math.min(o.head || head * 1.3, L * 0.4), ux = dx / L, uy = dy / L;
            const p1 = [b[0] - ux * h - uy * h * 0.45, b[1] - uy * h + ux * h * 0.45];
            const p2 = [b[0] - ux * h + uy * h * 0.45, b[1] - uy * h - ux * h * 0.45];
            B.line([a, b], o);
            B.fill([b, p1, p2], { tone: o.tone || "hi", op: 1 });
          },
          fill(pts, o = {}) {
            const d = c.poly(pts.map((p) => at(p[0], p[1], o.off ?? 0.35)), true);
            const svg = `<path class="iso-region" data-tone="${o.tone || "lit"}" style="opacity:${o.op ?? 0.18}" d="${d}"/>`;
            o.front ? c.over(svg) : c.base(svg);
          },
          dot(x, y, o = {}) {
            const [px, py] = iso(at(x, y, 0.6), P);
            const svg = `<circle class="iso-pin" data-tone="${o.tone || "lit"}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${o.r || 3.2}"/>`;
            o.front ? c.over(svg) : c.base(svg);
            if (o.label) B.text(x + (o.dx ?? head * 0.6), y + (o.dy ?? head * 0.6), o.label, { tone: o.ltone || "hi", size: o.size, anchor: o.anchor || "start", front: o.front });
          },
          text(x, y, t, o = {}) {
            const svg = c.sideText(X(x), 0.5, Z(y), [0, 1], t, { size: o.size || 6, tone: o.tone || "hi", anchor: o.anchor || "middle" });
            o.front ? c.over(svg) : c.base(svg);
          },
          circle(cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 96) {
            const pts = [];
            for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
            return pts;
          },
          bar(x, w, y, o = {}) {
            const base = o.base ?? 0, lo = Math.min(base, y), hi = Math.max(base, y);
            if (hi - lo < 1e-6) return;
            const d = o.d ?? 10;
            const plan = { x: X(x), y: 0.2, w: w * s, d, r: 0.8 };
            let svg = c.slab(plan, Z(lo), (hi - lo) * sy, { tone: o.tone || "hi", lit: o.lit !== false }, 2, 0.4);
            if (o.label) svg += c.topText(X(x) + w * s / 2, 0.2 + d / 2, Z(hi), o.label, { size: o.size || 4.5, tone: "hi" });
            c.add([X(x) + w * s / 2, d / 2, Z((lo + hi) / 2)], o.op && o.op < 1 ? `<g opacity="${o.op}">${svg}</g>` : svg);
          },
          block(x, y, w, h, o = {}) { B.bar(x, w, y + h, Object.assign({ base: y }, o)); },
          cursor(x, y) {
            const xx = clamp(x, x0, x1);
            c.add([X(xx), 4, Z(y1) + m], c.slab({ x: X(xx) - 6, y: -1, w: 12, d: 8, r: 1.5 }, ZB + BH - 5, 7, { tone: "hi", lit: true }, 2, 0.4));
            if (y !== undefined) B.line([[xx, y1], [xx, clamp(y, y0, y1)]], { tone: "mid", dotted: true });
          },
        };
        cfg.paint(B, v, st);
      },
    });
    const api = { stage, set, vals, st, act: {}, params: cfg.params || {} };
    for (const [k, fn] of Object.entries(cfg.acts || {})) api.act[k] = () => { fn(st, vals, set, api); stage.touch(); };
    return api;
  }

  window.ISO.board = board;
  window.ISO.fmt = fmt;
})();
