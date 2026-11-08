/* True-3D figures on Three.js, drawn in the Anatomy manner. */
(function () {
  const { clamp, lerp, ease } = window.ISO;
  const fmt = (v, d = 2) => window.ISO.fmt(v, d);
  const S = (window.SCENES = window.SCENES || {});
  const P = (min, max, step, v, label, extra = {}) => Object.assign({ min, max, step, v, label }, extra);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* axes with mono labels */
  function axes(T, L, o = {}) {
    const g = new THREE.Group();
    const cols = ["red", "green", "blue"], names = o.names || ["x", "y", "z"];
    [[L, 0, 0], [0, L, 0], [0, 0, L]].forEach((e, i) => {
      const a = T.arrow({ tone: cols[i], r: 0.9 });
      a.set([0, 0, 0], e);
      g.add(a);
      T.label(names[i], [e[0] * 1.08, e[1] * 1.08, e[2] * 1.08], { tone: cols[i] });
    });
    return g;
  }

  /* ---------- Polyhedra and solids, with a cube net that unfolds ---------- */
  S.solids = (root) => {
    const A = 56;
    const shapes = [
      { name: "Куб", geo: () => new THREE.BoxGeometry(A, A, A), v: 8, e: 12, f: 6, vol: "V = a³", net: true },
      { name: "Треугольная призма", geo: () => { const g = new THREE.CylinderGeometry(A * 0.62, A * 0.62, A, 3); g.rotateX(Math.PI / 2); return g; }, v: 6, e: 9, f: 5, vol: "V = S·h" },
      { name: "Четырёхугольная пирамида", geo: () => { const g = new THREE.ConeGeometry(A * 0.72, A, 4); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 4); return g; }, v: 5, e: 8, f: 5, vol: "V = ⅓·S·h" },
      { name: "Тетраэдр", geo: () => new THREE.TetrahedronGeometry(A * 0.75), v: 4, e: 6, f: 4, vol: "V = a³√2/12" },
      { name: "Октаэдр", geo: () => new THREE.OctahedronGeometry(A * 0.7), v: 6, e: 12, f: 8, vol: "V = a³√2/3" },
      { name: "Додекаэдр", geo: () => new THREE.DodecahedronGeometry(A * 0.68), v: 20, e: 30, f: 12, vol: "12 пятиугольников" },
      { name: "Икосаэдр", geo: () => new THREE.IcosahedronGeometry(A * 0.7), v: 12, e: 30, f: 20, vol: "20 треугольников" },
      { name: "Цилиндр", geo: () => { const g = new THREE.CylinderGeometry(A * 0.5, A * 0.5, A, 48); g.rotateX(Math.PI / 2); return g; }, vol: "V = πr²h", round: true },
      { name: "Конус", geo: () => { const g = new THREE.ConeGeometry(A * 0.55, A, 48); g.rotateX(Math.PI / 2); return g; }, vol: "V = ⅓πr²h", round: true },
      { name: "Шар", geo: () => new THREE.SphereGeometry(A * 0.55, 32, 20), vol: "V = ⁴⁄₃πr³", round: true },
    ];
    let mesh = null, net = null;
    const api = window.ISO.three(root, {
      W: 640, H: 440, az: 35, el: 24, radius: 92, center: [0, 0, 18],
      params: { open: P(0, 1, 0.01, 0, "Развернуть", { k: 40, c: 12 }) },
      state: { i: 0 },
      readout: (v, st) => { const s = shapes[st.i]; return s.round ? `${s.name} · тело вращения · ${s.vol}` : `${s.name} · В ${s.v} − Р ${s.e} + Г ${s.f} = ${s.v - s.e + s.f} · ${s.vol}`; },
      acts: {
        next: (st, v, set, T) => { st.i = (st.i + 1) % shapes.length; set("open", 0); show(T, st); },
        prev: (st, v, set, T) => { st.i = (st.i + shapes.length - 1) % shapes.length; set("open", 0); show(T, st); },
        unfold: (st, v, set, T) => { if (st.i !== 0) { st.i = 0; show(T, st); } set("open", v.open > 0.5 ? 0 : 1); },
      },
      build(T, v, st) {
        T.scene.add(T.plate(170, 130, { z: -30 }));
        net = new THREE.Group();
        const face = (lit) => T.box(A, A, 1.2, { lit, crease: 10 });
        const mk = (pos, axis) => { const h = new THREE.Group(); h.position.set(...pos); h.userData.axis = axis; return h; };
        const bottom = face(false); bottom.position.set(0, 0, -A / 2); net.add(bottom);
        const hinges = [];
        const side = (pos, axis, off, sign) => { const h = mk(pos, axis); const f = face(false); f.position.set(...off); h.add(f); h.userData.sign = sign; hinges.push(h); net.add(h); return h; };
        const hx = side([A / 2, 0, -A / 2], "y", [A / 2, 0, 0], -1);
        side([-A / 2, 0, -A / 2], "y", [-A / 2, 0, 0], 1);
        side([0, A / 2, -A / 2], "x", [0, A / 2, 0], 1);
        side([0, -A / 2, -A / 2], "x", [0, -A / 2, 0], -1);
        const top = mk([A, 0, 0], "y"); const tf = face(true); tf.position.set(A / 2, 0, 0); top.add(tf); top.userData.sign = -1; hx.add(top); hinges.push(top);
        net.userData.hinges = hinges;
        T.scene.add(net);
        show(T, st);
      },
      update(dt, T, v, st) {
        if (st.i === 0 && net) {
          const th = (Math.PI / 2) * (1 - v.open);
          for (const h of net.userData.hinges) { h.rotation.set(0, 0, 0); h.rotation[h.userData.axis] = h.userData.sign * th; }
        }
        return false;
      },
    });
    function show(T, st) {
      if (mesh) { T.scene.remove(mesh); mesh = null; }
      net.visible = st.i === 0;
      if (st.i !== 0) {
        const s = shapes[st.i];
        mesh = T.solid(s.geo(), { lit: true, crease: s.round ? 40 : 10 });
        T.scene.add(mesh);
      }
      T.wake();
    }
    return api;
  };

  /* ---------- Solids of revolution ---------- */
  S.revolve = (root) => {
    const H = 70;
    const profiles = [
      { name: "цилиндр", r: () => 26 },
      { name: "конус", r: (t) => 34 * (1 - t) + 0.01 },
      { name: "шар", r: (t) => Math.sqrt(Math.max(0, 0.25 - (t - 0.5) ** 2)) * 2 * 32 + 0.01 },
      { name: "параболоид", r: (t) => 34 * Math.sqrt(t) + 0.01 },
      { name: "ваза", r: (t) => 16 + 10 * Math.sin(t * Math.PI * 2.2 + 0.6) + 6 * t },
    ];
    let solid = null, curve = null, cap = null;
    const volume = (pr) => { let s = 0; const n = 400; for (let i = 0; i < n; i++) { const r = pr.r((i + 0.5) / n); s += Math.PI * r * r * (H / n); } return s; };
    const api = window.ISO.three(root, {
      W: 640, H: 460, az: 30, el: 22, radius: 82, center: [0, 0, 26],
      params: { sweep: P(0, 360, 5, 250, "Поворот, °", { k: 30, c: 11 }) },
      state: { i: 4 },
      readout: (v, st) => `${profiles[st.i].name} · поворот ${Math.round(v.sweep)}° · V = π∫r²dh ≈ ${fmt(volume(profiles[st.i]) / 1000, 2)} тыс. ед³`,
      acts: { next: (st, v, set, T) => { st.i = (st.i + 1) % profiles.length; rebuild(T, st, T.v.sweep); }, spin: (st, v, set) => set("sweep", v.sweep > 180 ? 0 : 360) },
      build(T, v, st) {
        T.scene.add(T.plate(150, 110, { z: -12 }));
        const ax = T.line([[0, 0, -10], [0, 0, H + 16]], { tone: "mid", dashed: true });
        T.scene.add(ax);
        T.label("ось", [0, 0, H + 22], { tone: "mid" });
        rebuild(T, st, v.sweep);
      },
      update(dt, T, v, st) { if (Math.abs((T.lastSweep ?? -1) - v.sweep) > 0.2) rebuild(T, st, v.sweep); return false; },
    });
    function rebuild(T, st, sweep) {
      T.lastSweep = sweep;
      const pr = profiles[st.i];
      const pts = [];
      for (let i = 0; i <= 48; i++) { const t = i / 48; pts.push(new THREE.Vector2(pr.r(t), t * H)); }
      for (const o of [solid, curve, cap]) if (o) T.scene.remove(o);
      const g = new THREE.LatheGeometry(pts, 64, 0, Math.max(0.001, sweep * Math.PI / 180));
      g.rotateX(Math.PI / 2);
      solid = T.solid(g, { lit: true, crease: 50, double: true, op: 0.92 });
      T.scene.add(solid);
      curve = T.line(pts.map((p) => [p.x, 0, p.y]), { tone: "lit" });
      T.scene.add(curve);
      T.wake();
    }
    return api;
  };

  /* ---------- Vectors in space: sum and cross product ---------- */
  S.vectors3 = (root) => {
    const K = 14;
    let va, vb, vs, vc, par;
    const api = window.ISO.three(root, {
      W: 640, H: 460, az: 30, el: 24, radius: 80, center: [0, 0, 10],
      params: { ax: P(-3, 3, 0.5, 2, "aₓ"), ay: P(-3, 3, 0.5, 0, "a_y"), az: P(-3, 3, 0.5, 1, "a_z"), bx: P(-3, 3, 0.5, 0, "bₓ"), by: P(-3, 3, 0.5, 2, "b_y"), bz: P(-3, 3, 0.5, 0, "b_z") },
      readout: (v) => {
        const c = [v.ay * v.bz - v.az * v.by, v.az * v.bx - v.ax * v.bz, v.ax * v.by - v.ay * v.bx];
        return `a·b = ${fmt(v.ax * v.bx + v.ay * v.by + v.az * v.bz)} · a×b = (${c.map((t) => fmt(t)).join("; ")}) · |a×b| = ${fmt(Math.hypot(...c))}`;
      },
      build(T) {
        T.scene.add(T.plate(130, 130, { z: -2 }));
        T.scene.add(T.grid(56, 14, -1.9, "faint"));
        T.scene.add(axes(T, 62));
        va = T.arrow({ tone: "hi", r: 1.2 }); vb = T.arrow({ tone: "hi", r: 1.2 }); vs = T.arrow({ tone: "lit", r: 1.3 }); vc = T.arrow({ tone: "lit", r: 1.6 });
        par = T.line([[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], { tone: "mid", dashed: true });
        T.scene.add(va, vb, vs, vc, par);
        T.la = T.label("a", [0, 0, 0]); T.lb = T.label("b", [0, 0, 0]); T.ls = T.label("a+b", [0, 0, 0]); T.lc = T.label("a×b", [0, 0, 0], { tone: "lit" });
      },
      update(dt, T, v) {
        const a = [v.ax * K, v.ay * K, v.az * K], b = [v.bx * K, v.by * K, v.bz * K];
        const s = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
        const c = [(v.ay * v.bz - v.az * v.by) * K / 2, (v.az * v.bx - v.ax * v.bz) * K / 2, (v.ax * v.by - v.ay * v.bx) * K / 2];
        va.set([0, 0, 0], a); vb.set([0, 0, 0], b); vs.set([0, 0, 0], s); vc.set([0, 0, 0], c);
        T.setLine(par, [a, s, b, [0, 0, 0], a]);
        T.la.set(undefined, a.map((t) => t * 1.12)); T.lb.set(undefined, b.map((t) => t * 1.12)); T.ls.set(undefined, s.map((t) => t * 1.08)); T.lc.set(undefined, c.map((t) => t * 1.12));
        return false;
      },
    });
    return api;
  };

  /* ---------- 3×3 matrix acting on a cube ---------- */
  S.matrix3 = (root) => {
    const K = 40;
    const keys = ["m11", "m12", "m13", "m21", "m22", "m23", "m31", "m32", "m33"];
    const params = {};
    keys.forEach((k, i) => (params[k] = P(-2, 2, 0.25, [1, 0, 0, 0, 1, 0, 0, 0, 1][i], k, { k: 70, c: 15 })));
    const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    let mesh, edges, ai, aj, ak, ghost;
    const setM = (set, m) => keys.forEach((k, i) => set(k, m[i]));
    const det = (v) => v.m11 * (v.m22 * v.m33 - v.m23 * v.m32) - v.m12 * (v.m21 * v.m33 - v.m23 * v.m31) + v.m13 * (v.m21 * v.m32 - v.m22 * v.m31);
    const api = window.ISO.three(root, {
      W: 640, H: 480, az: 32, el: 24, radius: 86, center: [8, 8, 14],
      params,
      readout: (v) => { const d = det(v); return `det A = ${fmt(d, 3)} · объём куба ×${fmt(Math.abs(d), 3)}${Math.abs(d) < 1e-9 ? " — пространство сплющено" : d < 0 ? " — зеркально" : ""}`; },
      acts: {
        id: (st, v, set) => setM(set, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
        rot: (st, v, set) => setM(set, [0.75, -0.75, 0, 0.75, 0.75, 0, 0, 0, 1]),
        shear: (st, v, set) => setM(set, [1, 0, 1, 0, 1, 0, 0, 0, 1]),
        stretch: (st, v, set) => setM(set, [2, 0, 0, 0, 1, 0, 0, 0, 0.5]),
        mirror: (st, v, set) => setM(set, [1, 0, 0, 0, -1, 0, 0, 0, 1]),
        flat: (st, v, set) => setM(set, [1, 0, 1, 0, 1, 1, 0, 0, 0]),
      },
      build(T) {
        T.scene.add(T.plate(140, 140, { z: -34 }));
        T.scene.add(T.grid(60, 15, -33.9, "faint"));
        T.scene.add(axes(T, 75));
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(36 * 3), 3));
        mesh = new THREE.Mesh(g, T.mat("solid", "lit", { op: 0.55, double: true }));
        const eg = new THREE.BufferGeometry();
        eg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
        edges = new THREE.LineSegments(eg, T.mat("line", "lit"));
        const gp = [];
        for (const [a, b] of E) gp.push(V3(...C[a].map((t) => t * K)), V3(...C[b].map((t) => t * K)));
        ghost = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), T.mat("line", "mid", { dashed: true }));
        ghost.computeLineDistances();
        ai = T.arrow({ tone: "red", r: 1.1 }); aj = T.arrow({ tone: "green", r: 1.1 }); ak = T.arrow({ tone: "blue", r: 1.1 });
        T.scene.add(mesh, edges, ghost, ai, aj, ak);
        T.li = T.label("i′", [0, 0, 0], { tone: "red" }); T.lj = T.label("j′", [0, 0, 0], { tone: "green" }); T.lk = T.label("k′", [0, 0, 0], { tone: "blue" });
      },
      update(dt, T, v) {
        const M = (p) => [(v.m11 * p[0] + v.m12 * p[1] + v.m13 * p[2]) * K, (v.m21 * p[0] + v.m22 * p[1] + v.m23 * p[2]) * K, (v.m31 * p[0] + v.m32 * p[1] + v.m33 * p[2]) * K];
        const W = C.map(M);
        const pos = mesh.geometry.attributes.position.array;
        let o = 0;
        for (const f of F) for (const idx of [f[0], f[1], f[2], f[0], f[2], f[3]]) { pos[o++] = W[idx][0]; pos[o++] = W[idx][1]; pos[o++] = W[idx][2]; }
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        const ep = edges.geometry.attributes.position.array;
        o = 0;
        for (const [a, b] of E) for (const idx of [a, b]) { ep[o++] = W[idx][0]; ep[o++] = W[idx][1]; ep[o++] = W[idx][2]; }
        edges.geometry.attributes.position.needsUpdate = true;
        edges.geometry.computeBoundingSphere(); mesh.geometry.computeBoundingSphere();
        ai.set([0, 0, 0], W[1]); aj.set([0, 0, 0], W[3]); ak.set([0, 0, 0], W[4]);
        T.li.set(undefined, W[1].map((t) => t * 1.15)); T.lj.set(undefined, W[3].map((t) => t * 1.15)); T.lk.set(undefined, W[4].map((t) => t * 1.15));
        return false;
      },
    });
    api.matrix = keys;
    return api;
  };

  /* ---------- Three planes: a 3×3 linear system ---------- */
  S.planes = (root) => {
    const systems = [
      { name: "одно решение", eq: [[1, 1, 1, 6], [1, -1, 2, 5], [2, 1, -1, 1]] },
      { name: "решений нет", eq: [[1, 1, 1, 6], [1, 1, 1, 2], [1, -1, 0, 0]] },
      { name: "бесконечно много (прямая)", eq: [[1, 1, 1, 6], [1, -1, 1, 2], [2, 0, 2, 8]] },
    ];
    const K = 9;
    let quads = [], dot;
    const solve = (eq) => {
      const m = eq.map((r) => r.slice());
      for (let c = 0; c < 3; c++) {
        let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
        if (Math.abs(m[p][c]) < 1e-9) return null;
        [m[c], m[p]] = [m[p], m[c]];
        for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; }
      }
      return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
    };
    const term = (a, n, first) => (a === 0 ? "" : `${a < 0 ? (first ? "−" : " − ") : first ? "" : " + "}${Math.abs(a) === 1 ? "" : Math.abs(a)}${n}`);
    const show = (eq) => eq.map((r) => { let s = "", f = true; ["x", "y", "z"].forEach((n, i) => { const t = term(r[i], n, f); if (t) { s += t; f = false; } }); return `${s} = ${r[3]}`; }).join(" ; ");
    const api = window.ISO.three(root, {
      W: 640, H: 460, az: 40, el: 22, radius: 78, center: [10, 10, 14],
      state: { i: 0 },
      readout: (v, st) => { const sys = systems[st.i]; const s = solve(sys.eq); return `${show(sys.eq)} · ${s ? `x = ${fmt(s[0])}, y = ${fmt(s[1])}, z = ${fmt(s[2])}` : sys.name}`; },
      acts: { next: (st, v, set, T) => { st.i = (st.i + 1) % systems.length; build(T, st); } },
      build(T, v, st) {
        T.scene.add(T.plate(140, 140, { z: -40 }));
        T.scene.add(axes(T, 60));
        dot = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 12), T.mat("solid", "ink"));
        T.scene.add(dot);
        build(T, st);
      },
    });
    function build(T, st) {
      for (const q of quads) T.scene.remove(q);
      quads = [];
      const sys = systems[st.i];
      const tones = ["red", "green", "blue"];
      const sol = solve(sys.eq);
      const c0 = sol ? V3(...sol.map((t) => t * K)) : V3(18, 18, 18);
      sys.eq.forEach((r, i) => {
        const n = V3(r[0], r[1], r[2]).normalize();
        const d = r[3] / Math.hypot(r[0], r[1], r[2]) * K;
        const p0 = c0.clone().sub(n.clone().multiplyScalar(c0.dot(n) - d));
        const u = V3(1, 0, 0).cross(n).length() > 0.1 ? V3(1, 0, 0).cross(n).normalize() : V3(0, 1, 0).cross(n).normalize();
        const w = n.clone().cross(u).normalize();
        const s = 46, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => p0.clone().add(u.clone().multiplyScalar(a * s)).add(w.clone().multiplyScalar(b * s)));
        const g = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[0], pts[2], pts[3]]);
        g.computeVertexNormals();
        const mesh = new THREE.Mesh(g, T.mat("solid", tones[i], { op: 0.28, double: true }));
        const edge = T.line([pts[0], pts[1], pts[2], pts[3], pts[0]].map((p) => [p.x, p.y, p.z]), { tone: tones[i] });
        quads.push(mesh, edge);
        T.scene.add(mesh, edge);
      });
      dot.visible = !!sol;
      if (sol) dot.position.copy(c0);
      T.wake();
    }
    return api;
  };
})();
