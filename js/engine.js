/* Scene engine on top of the Anatomy iso kit.
   Every frame the whole figure is re-projected from world space at the current
   camera azimuth/elevation, so a drag turns the drawing in true 3D. */
(function () {
  const RAD = Math.PI / 180;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const r1 = (v) => Math.round(v * 10) / 10;

  /* Critically-damped-ish spring for one number. */
  class Spring {
    constructor(v, { k = 170, c = 22 } = {}) { this.v = v; this.t = v; this.r = 0; this.k = k; this.c = c; }
    set(t) { this.t = t; return this; }
    jump(v) { this.v = this.t = v; this.r = 0; return this; }
    step(dt) {
      if (still.matches) { this.v = this.t; this.r = 0; return false; }
      for (let i = 0; i < 4; i++) {
        this.r += ((this.t - this.v) * this.k - this.r * this.c) * dt / 4;
        this.v += this.r * dt / 4;
      }
      if (Math.abs(this.t - this.v) < 0.002 && Math.abs(this.r) < 0.002) { this.v = this.t; this.r = 0; return false; }
      return true;
    }
  }

  const toward = (P) => {
    const a = P.azimuth * RAD, e = P.elevation * RAD;
    return [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  };

  /* Drawing context handed to a scene's draw(): collects items with depth keys. */
  function makeContext(P) {
    const items = [];
    const base = [];
    const over = [];
    let seq = 0;
    const V = toward(P);
    const c = {
      P, V,
      at: (p) => iso(p, P),
      depth: (p) => depthOf(p, P),
      base: (svg) => base.push(svg),
      over: (svg) => over.push(svg),
      add: (point, svg, bias = 0) => items.push({ k: depthOf(point, P) + bias, n: seq++, svg }),
      S: (paths, style) => solidSvg(paths, style),
      L: (d, style) => lineSvg(d, style),
      D: (pts, style) => dotsSvg(pts, style),
      seg: (a, b) => segment(a, b, P),
      poly: (pts, closed = false) => pathOf(pts.map((p) => iso(p, P)), closed),
      faces: (normal) => normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2] > 1e-6,
    };

    c.slab = (plan, z, h, style = {}, steps = 3, bevel = 0.5) => solidSvg(slabOf(plan, z, h, P, steps, bevel), style);
    c.cyl = (x, y, r, z, h, style = {}, steps = 32, bevel = 0) => solidSvg(cylinder(x, y, r, z, h, P, steps, bevel), style);

    /* A cube resting with its base centre at (x, y, z). */
    c.cube = (x, y, z, s, { lit = false, opacity = 1, mark = true, tone, dim = false, accent } = {}) => {
      const plan = { x: x - s / 2, y: y - s / 2, w: s, d: s, r: Math.min(1.4, s * 0.08) };
      let svg = solidSvg(slabOf(plan, z, s, P, 3, 0.5), { tone: tone || (dim ? "mid" : "hi"), crease: dim ? "faint" : "lo", lit: lit && !dim });
      if (mark) svg += lineSvg(planOutline(insetPlan(plan, s * 0.16), z + s, P, 3), { tone: accent || (dim ? "lo" : lit ? "mid" : "faint") });
      if (accent) svg += dotsSvg([iso([x, y, z + s], P)], { size: 1.1, tone: "hi" }).replace('class="iso-dots"', `class="iso-dots" style="--anatomy-dot:var(--anatomy-${accent})"`);
      return opacity < 0.999 ? `<g opacity="${Math.max(0, opacity).toFixed(2)}">${svg}</g>` : svg;
    };

    /* Text lying on a horizontal face, turned so it always reads left to right. */
    c.topText = (x, y, z, text, { size = 6, tone = "mid" } = {}) => {
      const o = iso([x, y, z], P);
      const axes = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => {
        const p = iso([x + dx, y + dy, z], P);
        return { d: [dx, dy], s: [p[0] - o[0], p[1] - o[1]] };
      });
      const u = axes.reduce((best, a) => (a.s[0] > best.s[0] ? a : best));
      const perp = axes.filter((a) => a.d[0] * u.d[0] + a.d[1] * u.d[1] === 0).reduce((best, a) => (a.s[1] > best.s[1] ? a : best));
      const ox = o[0] + perp.s[0] * size * 0.36, oy = o[1] + perp.s[1] * size * 0.36;
      const m = `matrix(${r3(u.s[0])} ${r3(u.s[1])} ${r3(perp.s[0])} ${r3(perp.s[1])} ${r3(ox)} ${r3(oy)})`;
      return faceTextSvg(m, text, { size, tone, anchor: "middle" });
    };
    /* Text on a vertical face with outward normal n (axis aligned); hidden when the face turns away. */
    c.sideText = (x, y, z, n, text, { size = 5, tone = "mid", anchor = "middle" } = {}) => {
      if (!c.faces([n[0], n[1], 0])) return "";
      const along = [-n[1], n[0]];
      const o = iso([x, y, z], P);
      let a = iso([x + along[0], y + along[1], z], P);
      let u = [a[0] - o[0], a[1] - o[1]];
      if (u[0] < 0) u = [-u[0], -u[1]];
      const dn = iso([x, y, z - 1], P);
      const v = [dn[0] - o[0], dn[1] - o[1]];
      const ox = o[0] + v[0] * size * 0.36, oy = o[1] + v[1] * size * 0.36;
      return faceTextSvg(`matrix(${r3(u[0])} ${r3(u[1])} ${r3(v[0])} ${r3(v[1])} ${r3(ox)} ${r3(oy)})`, text, { size, tone, anchor });
    };

    /* A convex hexahedron from 8 corners (0-3 bottom ring, 4-7 top ring), any orientation. */
    c.hexa = (pts, { tone = "hi", lit = false } = {}) => {
      const F = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
      const cen = pts.reduce((s, p) => [s[0] + p[0] / 8, s[1] + p[1] / 8, s[2] + p[2] / 8], [0, 0, 0]);
      const a = (P.azimuth) * RAD;
      const light = [-Math.sin(a), Math.cos(a)];
      const scr = pts.map((p) => iso(p, P));
      const out = [];
      const lines = [];
      for (const f of F) {
        const [p0, p1, p2] = [pts[f[0]], pts[f[1]], pts[f[2]]];
        const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const w = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
        let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const fc = f.reduce((s, i) => [s[0] + pts[i][0] / 4, s[1] + pts[i][1] / 4, s[2] + pts[i][2] / 4], [0, 0, 0]);
        if (n[0] * (fc[0] - cen[0]) + n[1] * (fc[1] - cen[1]) + n[2] * (fc[2] - cen[2]) < 0) n = n.map((v) => -v);
        const len = Math.hypot(...n) || 1;
        n = n.map((v) => v / len);
        if (!c.faces(n)) continue;
        const d = pathOf(f.map((i) => scr[i]), true);
        if (n[2] > 0.6) out.push(`<path class="iso-top" d="${d}"/>`);
        else {
          const h = Math.hypot(n[0], n[1]) || 1;
          const l = ((n[0] / h) * light[0] + (n[1] / h) * light[1] + 1) / 2;
          out.push(`<path class="iso-shade" data-shade="${clamp(Math.floor(l * 4), 0, 3)}" d="${d}"/>`);
        }
        lines.push(d);
      }
      const hull = pathOf(hull2(scr), true);
      return `<g class="iso-solid"${lit ? " data-lit" : ""}><path class="iso-fill" d="${hull}"/>${out.join("")}<path class="iso-line" data-tone="faint" d="${lines.join("")}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${hull}"/></g>`;
    };

    /* A crafted base plate: feet, bevelled slab, inset groove, corner screws, ruler strip. */
    c.plate = (plan, { h = 8, foot = 4, ruler = true, screws = true, ticks = 4 } = {}) => {
      base.push(`<path class="iso-halo" d="${haloOf(plan, -h - foot, h, P)}"/>`);
      const feet = corners(plan, Math.min(18, plan.w * 0.12, plan.d * 0.2)).sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
      for (const [x, y] of feet) {
        base.push(solidSvg(cylinder(x, y, 6, -h - foot, 1.4, P, 24), { tone: "lo" }));
        base.push(solidSvg(cylinder(x, y, 4.6, -h - foot + 1.4, foot - 1.4, P, 24), { tone: "mid" }));
      }
      base.push(solidSvg(slabOf(plan, -h, h, P, 8, 1.4), { tone: "mid" }));
      base.push(lineSvg(planOutline(insetPlan(plan, 5), 0, P), { tone: "lo" }));
      if (screws) {
        const sc = corners(plan, 10);
        base.push(lineSvg(sc.map(([x, y]) => ring(x, y, 2, 0, P, 14)).join(""), { tone: "lo" }));
        base.push(dotsSvg(sc.map(([x, y]) => iso([x, y, 0], P)), { size: 0.5 }));
      }
      if (ruler) {
        const strip = { x: plan.x + 18, y: plan.y + plan.d - 13, w: plan.w - 36, d: 6, r: 1 };
        base.push(solidSvg(slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
        const t = topTicks(strip.x + 3, strip.x + strip.w - 3, ticks, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
        base.push(lineSvg(t.minor, { tone: "lo" }), lineSvg(t.major, { tone: "mid" }));
      }
    };

    c.finish = () => {
      items.sort((a, b) => a.k - b.k || a.n - b.n);
      return base.join("") + items.map((i) => i.svg).join("") + over.join("");
    };
    return c;
  }
  const r3 = (v) => Math.round(v * 1000) / 1000;

  function hull2(points) {
    const s = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return [...lo.slice(0, -1), ...up.slice(0, -1)];
  }

  /* A live figure: owns the camera, the loop, orbit dragging and the readout. */
  class Stage {
    constructor(root, opt) {
      this.root = root;
      this.opt = Object.assign({ W: 600, H: 380, az: 42, el: 30, pad: 22, spin: [-180, 540], tilt: [12, 62], autoSpin: 0 }, opt);
      this.figure = root.closest(".iso-figure") || root.parentElement;
      this.readoutEl = this.figure.querySelector("[data-readout]");
      const { W, H } = this.opt;
      root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${this.opt.label || ""}"><g></g></svg>`;
      this.svg = root.querySelector("svg");
      this.g = this.svg.firstChild;
      this.az = new Spring(this.opt.az, { k: 60, c: 15 });
      this.el = new Spring(this.opt.el, { k: 60, c: 15 });
      this.fitScale();
      this.frame = 0; this.last = 0; this.visible = false; this.dirty = true; this.drag = null; this.idle = 0; this.touched = false;
      this.bind();
      this.render(0);
    }
    fitScale() {
      const [[x0, y0, z0], [x1, y1, z1]] = this.opt.bounds;
      const pts = [];
      for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) pts.push([x, y, z]);
      this.center = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      const half = this.opt.fit ?? 20;
      const azs = [];
      for (let a = -half; a <= half; a += 5) azs.push(this.opt.az + a);
      let s = Infinity;
      for (const a of azs) for (const e of [this.opt.el - 6, this.opt.el, this.opt.el + 6]) {
        const P = fitProjection(pts, this.opt.W, this.opt.H, { pad: this.opt.pad, azimuth: a, elevation: e });
        s = Math.min(s, P.scale);
      }
      this.scale = s * (this.opt.zoom || 1.08);
    }
    projection() {
      const P = { origin: [0, 0], scale: this.scale, azimuth: this.az.v, elevation: this.el.v };
      const c = iso(this.center, P);
      P.origin = [this.opt.W / 2 - c[0], this.opt.H / 2 - c[1] + (this.opt.shiftY || 0)];
      return P;
    }
    render(dt) {
      const P = this.projection();
      const c = makeContext(P);
      this.opt.draw(c, this);
      this.g.innerHTML = c.finish();
      if (this.opt.readout && this.readoutEl) {
        const t = this.opt.readout(this);
        if (this.readoutEl.textContent !== t) { this.readoutEl.textContent = t; if (this.touched) this.figure.dispatchEvent(new CustomEvent("readout", { detail: t, bubbles: true })); }
      }
    }
    tick(now) {
      if (this.dead) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 1 / 60;
      this.last = now;
      let moving = false;
      if (this.opt.autoSpin && !this.drag && !still.matches && this.idle > 2.5) { this.az.t += this.opt.autoSpin * dt; this.az.v += this.opt.autoSpin * dt; }
      moving = this.az.step(dt) || moving;
      moving = this.el.step(dt) || moving;
      if (this.opt.update) moving = this.opt.update(dt, this) || moving;
      if (!this.drag) this.idle += dt;
      if (this.opt.tour && !this.touched && this.idle > 1.2) moving = this.opt.tour(dt, this) || moving;
      this.render(dt);
      const keep = this.visible && (moving || this.drag || this.dirty || (this.opt.autoSpin && !still.matches) || (this.opt.tour && !this.touched));
      this.dirty = false;
      this.frame = keep ? requestAnimationFrame((t) => this.tick(t)) : 0;
    }
    destroy() { this.dead = true; if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; if (this.io) this.io.disconnect(); }
    wake() {
      if (this.dead) return;
      this.dirty = true;
      if (!this.frame && this.visible) { this.last = 0; this.frame = requestAnimationFrame((t) => this.tick(t)); }
    }
    touch() { this.touched = true; this.idle = 0; this.wake(); }
    spinBy(deg) { this.az.set(this.az.t + deg); this.touch(); }
    resetView() { this.az.set(this.opt.az + Math.round((this.az.t - this.opt.az) / 360) * 360); this.el.set(this.opt.el); this.wake(); }
    bind() {
      this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; if (this.visible) this.wake(); }, { rootMargin: "100px 0px" });
      this.io.observe(this.root);
      const r = this.root;
      r.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        this.drag = { x: e.clientX, y: e.clientY, az: this.az.t, el: this.el.t, moved: 0, id: e.pointerId };
        this.idle = 0;
        this.wake();
      });
      r.addEventListener("pointermove", (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.moved = Math.max(d.moved, Math.hypot(dx, dy));
        if (d.moved > 5) {
          if (!d.captured) { try { r.setPointerCapture(e.pointerId); } catch (_) {} d.captured = true; r.classList.add("is-dragging"); }
          const [lo, hi] = this.opt.spin;
          const az = clamp(d.az - dx * 0.45, lo, hi);
          const el = clamp(d.el + dy * 0.3, this.opt.tilt[0], this.opt.tilt[1]);
          this.az.set(az); this.el.set(el);
          if (still.matches) { this.az.jump(az); this.el.jump(el); }
          this.wake();
        }
      });
      const end = (e) => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        this.drag = null;
        r.classList.remove("is-dragging");
        if (d.moved <= 5 && e.type === "pointerup" && this.opt.onTap) {
          const box = this.svg.getBoundingClientRect();
          this.touch();
          this.opt.onTap((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, this);
        }
        this.idle = 0;
        this.wake();
      };
      r.addEventListener("pointerup", end);
      r.addEventListener("pointercancel", end);
      r.addEventListener("dblclick", () => this.resetView());
      r.addEventListener("keydown", (e) => {
        if (e.key === "[" || e.key === "]") { e.preventDefault(); this.spinBy(e.key === "[" ? -30 : 30); return; }
        if (this.opt.onKey && this.opt.onKey(e.key, this) !== false) { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter", "Home", "End"].includes(e.key)) e.preventDefault(); this.touch(); }
      });
    }
  }

  window.ISO = { Stage, Spring, clamp, lerp, ease, easeOut, r1, still, RAD };
})();
