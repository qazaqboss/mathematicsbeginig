/* Three.js stage drawn in the Anatomy manner: orthographic camera at the
   kit's azimuth/elevation, flat four-tone grey solids, hairline edges,
   a bench plate with feet, mono labels. World is right-handed, z up. */
(function () {
  const { Spring, clamp, still } = window.ISO;
  const RAD = Math.PI / 180;
  const css = (name) => getComputedStyle(document.body).getPropertyValue(name).trim() || "#888";

  class ThreeStage {
    constructor(root, cfg) {
      this.root = root; this.cfg = cfg;
      this.figure = root.closest(".iso-figure") || root.parentElement;
      this.readoutEl = this.figure.querySelector("[data-readout]");
      this.az = new Spring(cfg.az ?? 35, { k: 60, c: 15 });
      this.el = new Spring(cfg.el ?? 26, { k: 60, c: 15 });
      this.aspect = (cfg.H || 440) / (cfg.W || 640);
      this.R = cfg.radius || 120;
      this.mats = [];
      this.labels = [];
      root.classList.add("three-stage");
      root.innerHTML = `<div class="three-wrap" style="padding-top:${(this.aspect * 100).toFixed(2)}%"><canvas></canvas><div class="three-labels"></div></div>`;
      this.canvas = root.querySelector("canvas");
      this.labelBox = root.querySelector(".three-labels");
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      } catch (e) {
        root.innerHTML = `<p class="three-fallback">Для этой 3D-фигуры нужен WebGL — он выключен в этом браузере.</p>`;
        this.dead = true; return;
      }
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
      this.camera.up.set(0, 0, 1);
      this.ambient = new THREE.AmbientLight(0xffffff, 0.72);
      this.sun = new THREE.DirectionalLight(0xffffff, 0.55);
      this.scene.add(this.ambient, this.sun);
      this.center = new THREE.Vector3(...(cfg.center || [0, 0, 0]));
      this.theme = null;
      this.st = cfg.state || {};
      this.sp = {}; this.vals = {};
      for (const [k, p] of Object.entries(cfg.params || {})) { this.sp[k] = new Spring(p.v, { k: p.k || 110, c: p.c || 20 }); this.vals[k] = p.v; }
      this.v = new Proxy({}, { get: (_, k) => (this.sp[k] ? this.sp[k].v : undefined) });
      this.idle = 0; this.frame = 0; this.visible = false; this.touched = false;
      this.retheme();
      cfg.build && cfg.build(this, this.v, this.st);
      this.bind();
      this.resize();
      this.render();
    }
    /* ---------- palette ---------- */
    retheme() {
      const t = document.body.dataset.theme;
      if (t === this.theme) return;
      this.theme = t;
      const light = t === "light";
      this.pal = {
        solid: new THREE.Color(light ? "#f4f4f1" : "#262626"),
        lit: new THREE.Color(light ? "#ffffff" : "#3a3a3a"),
        plate: new THREE.Color(light ? "#ebebe8" : "#1b1b1b"),
        ink: new THREE.Color(light ? "#26262a" : "#e6e6e6"), ink2: new THREE.Color(light ? "#8a8a8f" : "#8f8f8f"),
        hi: new THREE.Color(css("--anatomy-hi")), mid: new THREE.Color(css("--anatomy-mid")), lo: new THREE.Color(css("--anatomy-lo")),
        faint: new THREE.Color(css("--anatomy-faint")), litLine: new THREE.Color(css("--anatomy-lit")),
        red: new THREE.Color(css("--anatomy-red")), green: new THREE.Color(css("--anatomy-green")), blue: new THREE.Color(css("--anatomy-blue")),
      };
      this.ambient.intensity = light ? 0.78 : 0.7;
      this.sun.intensity = light ? 0.35 : 0.6;
      for (const m of this.mats) this.paint(m);
    }
    paint(m) {
      const p = this.pal, tone = m.userData.tone;
      const map = { hi: p.hi, mid: p.mid, lo: p.lo, faint: p.faint, lit: p.litLine, red: p.red, green: p.green, blue: p.blue };
      if (m.userData.kind === "line") m.color.copy(map[tone] || p.hi);
      else if (m.userData.kind === "solid") m.color.copy(tone === "ink" ? p.ink : tone === "ink2" ? p.ink2 : tone === "lit" ? p.lit : tone === "plate" ? p.plate : map[tone] && tone !== "hi" ? map[tone] : p.solid);
    }
    mat(kind, tone, extra = {}) {
      let m;
      if (kind === "line") m = extra.dashed ? new THREE.LineDashedMaterial({ dashSize: 3, gapSize: 3 }) : new THREE.LineBasicMaterial({ transparent: extra.op !== undefined, opacity: extra.op ?? 1 });
      else m = new THREE.MeshLambertMaterial({ flatShading: true, transparent: extra.op !== undefined, opacity: extra.op ?? 1, side: extra.double ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, depthWrite: extra.op === undefined || extra.op > 0.6 });
      m.userData = { kind, tone };
      this.paint(m);
      this.mats.push(m);
      return m;
    }
    /* ---------- builders ---------- */
    solid(geom, o = {}) {
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(geom, this.mat("solid", o.tone || (o.lit ? "lit" : "hi"), { op: o.op, double: o.double }));
      g.add(mesh);
      if (o.edges !== false) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geom, o.crease ?? 25), this.mat("line", o.line || (o.lit ? "lit" : "hi"), { op: o.lineOp }));
        g.add(e);
        g.userData.edges = e;
      }
      g.userData.mesh = mesh;
      return g;
    }
    box(w, d, h, o = {}) { const g = new THREE.BoxGeometry(w, d, h); return this.solid(g, o); }
    line(points, o = {}) {
      const geo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
      const l = new THREE.Line(geo, this.mat("line", o.tone || "hi", { dashed: o.dashed, op: o.op }));
      if (o.dashed) l.computeLineDistances();
      return l;
    }
    setLine(l, points) {
      l.geometry.setFromPoints(points.map((p) => new THREE.Vector3(...p)));
      l.geometry.attributes.position.needsUpdate = true;
      if (l.material.isLineDashedMaterial) l.computeLineDistances();
    }
    arrow(o = {}) {
      const g = new THREE.Group();
      const r = o.r || 1.6, tone = o.tone || "lit";
      const st = tone === "lit" ? "ink" : tone === "hi" || tone === "mid" ? "ink2" : tone;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), this.mat("solid", st));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 7, 18), this.mat("solid", st));
      const line = this.line([[0, 0, 0], [0, 0, 0]], { tone });
      g.add(shaft, cone, line);
      g.userData = { shaft, cone, line, r };
      g.set = (a, b) => {
        const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
        g.visible = L > 1e-3;
        if (!g.visible) return;
        const hl = Math.min(r * 7, L * 0.45), dir = d.clone().normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        shaft.scale.set(1, Math.max(0.001, L - hl), 1);
        shaft.position.copy(A.clone().add(dir.clone().multiplyScalar((L - hl) / 2)));
        shaft.quaternion.copy(q);
        cone.position.copy(Bv.clone().sub(dir.clone().multiplyScalar(hl / 2)));
        cone.scale.set(1, hl / (r * 7), 1);
        cone.quaternion.copy(q);
        this.setLine(line, [a, b]);
      };
      return g;
    }
    label(text, pos, o = {}) {
      const el = document.createElement("span");
      el.className = "three-label";
      if (o.tone) el.dataset.tone = o.tone;
      el.textContent = text;
      this.labelBox.appendChild(el);
      const L = { el, pos: new THREE.Vector3(...pos), set: (t, p) => { if (t !== undefined && el.textContent !== t) el.textContent = t; if (p) L.pos.set(...p); }, show: (b) => (el.style.display = b ? "" : "none") };
      this.labels.push(L);
      return L;
    }
    plate(w, d, o = {}) {
      const g = new THREE.Group();
      const h = o.h || 8, z = o.z ?? 0;
      const slab = this.box(w, d, h, { tone: "plate", line: "mid" });
      slab.position.set(0, 0, z - h / 2);
      g.add(slab);
      const foot = new THREE.CylinderGeometry(5, 5, 4, 20);
      foot.rotateX(Math.PI / 2);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const f = this.solid(foot, { tone: "plate", line: "lo" });
        f.position.set(sx * (w / 2 - 16), sy * (d / 2 - 14), z - h - 2);
        g.add(f);
      }
      const inset = 5;
      g.add(this.line([[-w / 2 + inset, -d / 2 + inset, z + 0.05], [w / 2 - inset, -d / 2 + inset, z + 0.05], [w / 2 - inset, d / 2 - inset, z + 0.05], [-w / 2 + inset, d / 2 - inset, z + 0.05], [-w / 2 + inset, -d / 2 + inset, z + 0.05]], { tone: "lo" }));
      const ticks = [];
      for (let x = -w / 2 + 18; x <= w / 2 - 18; x += 6) {
        const big = Math.round((x + w / 2 - 18) / 6) % 5 === 0;
        ticks.push([x, -d / 2 + 9, z + 0.05], [x, -d / 2 + 9 + (big ? 4 : 2), z + 0.05]);
      }
      const tg = new THREE.BufferGeometry().setFromPoints(ticks.map((p) => new THREE.Vector3(...p)));
      g.add(new THREE.LineSegments(tg, this.mat("line", "lo")));
      return g;
    }
    grid(size, step, z = 0.06, tone = "faint") {
      const pts = [];
      for (let a = -size; a <= size + 1e-6; a += step) pts.push([a, -size, z], [a, size, z], [-size, a, z], [size, a, z]);
      return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p))), this.mat("line", tone));
    }
    /* ---------- params ---------- */
    set(k, val) {
      const p = this.cfg.params[k];
      if (!p) return;
      val = clamp(val, p.min ?? -Infinity, p.max ?? Infinity);
      if (p.step) val = Math.round(val / p.step) * p.step;
      this.vals[k] = val; this.sp[k].set(val);
      if (this.cfg.onSet) this.cfg.onSet(k, val, this.st, this.vals);
      this.touch();
    }
    /* ---------- loop ---------- */
    resize() {
      const w = this.root.clientWidth || 600, h = w * this.aspect;
      this.renderer.setSize(w, h, false);
      this.canvas.style.width = "100%"; this.canvas.style.height = "100%";
      const half = this.R / (this.cfg.zoom || 1);
      const ar = w / h;
      if (ar >= 1) { this.camera.left = -half * ar; this.camera.right = half * ar; this.camera.top = half; this.camera.bottom = -half; }
      else { this.camera.left = -half; this.camera.right = half; this.camera.top = half / ar; this.camera.bottom = -half / ar; }
      this.camera.updateProjectionMatrix();
      this.wake();
    }
    render() {
      if (this.dead) return;
      this.retheme();
      const a = this.az.v * RAD, e = this.el.v * RAD;
      const dir = new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e));
      this.camera.position.copy(this.center.clone().add(dir.clone().multiplyScalar(800)));
      this.camera.lookAt(this.center);
      const side = new THREE.Vector3(Math.cos(a + 1.1), Math.sin(a + 1.1), 0);
      this.sun.position.copy(dir.clone().multiplyScalar(0.4).add(side).add(new THREE.Vector3(0, 0, 1.2)));
      this.renderer.render(this.scene, this.camera);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      for (const L of this.labels) {
        const p = L.pos.clone().project(this.camera);
        L.el.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px, ${((1 - p.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
      }
      if (this.cfg.readout && this.readoutEl) {
        const t = this.cfg.readout(this.vals, this.st, this.v);
        if (this.readoutEl.textContent !== t) { this.readoutEl.textContent = t; if (this.touched) this.figure.dispatchEvent(new CustomEvent("readout", { detail: t, bubbles: true })); }
      }
    }
    tick(now) {
      if (this.dead) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 1 / 60;
      this.last = now;
      let moving = this.az.step(dt);
      moving = this.el.step(dt) || moving;
      for (const k in this.sp) moving = this.sp[k].step(dt) || moving;
      if (this.cfg.autoSpin && !this.drag && !still.matches && this.idle > 2) { this.az.t += this.cfg.autoSpin * dt; this.az.v += this.cfg.autoSpin * dt; moving = true; }
      if (this.cfg.update) moving = this.cfg.update(dt, this, this.v, this.st) || moving;
      if (!this.drag) this.idle += dt;
      this.render();
      const keep = this.visible && (moving || this.drag || this.dirty);
      this.dirty = false;
      this.frame = keep ? requestAnimationFrame((t) => this.tick(t)) : 0;
    }
    wake() { if (this.dead) return; this.dirty = true; if (!this.frame && this.visible) { this.last = 0; this.frame = requestAnimationFrame((t) => this.tick(t)); } }
    touch() { this.touched = true; this.idle = 0; this.wake(); }
    spinBy(d) { this.az.set(this.az.t + d); this.touch(); }
    destroy() {
      this.dead = true;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.io && this.io.disconnect(); this.ro && this.ro.disconnect();
      if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); }
    }
    bind() {
      this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; if (this.visible) this.wake(); }, { rootMargin: "100px 0px" });
      this.io.observe(this.root);
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.root);
      new MutationObserver(() => this.wake()).observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
      const r = this.root;
      r.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; this.drag = { x: e.clientX, y: e.clientY, az: this.az.t, el: this.el.t, moved: 0, id: e.pointerId }; this.idle = 0; this.wake(); });
      r.addEventListener("pointermove", (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.moved = Math.max(d.moved, Math.hypot(dx, dy));
        if (d.moved > 5) {
          if (!d.captured) { try { r.setPointerCapture(e.pointerId); } catch (_) {} d.captured = true; r.classList.add("is-dragging"); }
          this.az.set(d.az - dx * 0.45); this.el.set(clamp(d.el + dy * 0.3, -10, 80));
          if (still.matches) { this.az.jump(this.az.t); this.el.jump(this.el.t); }
          this.wake();
        }
      });
      const end = (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        this.drag = null; r.classList.remove("is-dragging");
        if (d.moved <= 5 && e.type === "pointerup" && this.cfg.onTap) { this.touch(); this.cfg.onTap(this, this.st, this.vals); }
        this.wake();
      };
      r.addEventListener("pointerup", end);
      r.addEventListener("pointercancel", end);
      r.addEventListener("dblclick", () => { this.az.set(this.cfg.az ?? 35); this.el.set(this.cfg.el ?? 26); this.wake(); });
      r.addEventListener("keydown", (e) => {
        if (e.key === "[" || e.key === "]") { e.preventDefault(); this.spinBy(e.key === "[" ? -30 : 30); }
      });
    }
  }

  window.ISO.three = (root, cfg) => {
    const stage = new ThreeStage(root, cfg);
    const api = { stage, set: (k, v) => stage.set(k, v), vals: stage.vals, st: stage.st, params: cfg.params || {}, act: {} };
    for (const [k, fn] of Object.entries(cfg.acts || {})) api.act[k] = () => { fn(stage.st, stage.vals, (a, b) => stage.set(a, b), stage); stage.touch(); };
    return api;
  };
})();
