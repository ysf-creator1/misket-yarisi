/* Misket Yarışı — parkur parçaları (geometri üretimi)
 * Tarayıcıda ve Node testinde ortak çalışır; three.js veya Rapier'e bağlı değildir.
 * Her parça hem görsel mesh hem fizik collider için aynı üçgenleri üretir.
 * Koordinatlar: y yukarı. Yön (yaw): dir = (sin yaw, 0, cos yaw); pozitif açı = sola dönüş.
 */
(function (G) {
  'use strict';
  const MP = G.MP = G.MP || {};

  // ---------- vektör yardımcıları ----------
  const DEG = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const dirOf = y => [Math.sin(y), 0, Math.cos(y)];
  const leftOf = y => [Math.cos(y), 0, -Math.sin(y)];
  const UP = [0, 1, 0];
  MP.v = { add, sub, mul, dot, cross, len, norm, lerp, clamp, smooth, dirOf, leftOf, DEG, UP };

  function rotAround(v, k, ang) { // Rodrigues döndürmesi (k birim eksen)
    const c = Math.cos(ang), s = Math.sin(ang);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }
  // +Y eksenini a vektörüne çeviren dördey (silindirler için)
  function quatFromY(a) {
    a = norm(a);
    if (a[1] > 0.99999) return { x: 0, y: 0, z: 0, w: 1 };
    if (a[1] < -0.99999) return { x: 1, y: 0, z: 0, w: 0 };
    const ax = norm(cross(UP, a)), ang = Math.acos(clamp(a[1], -1, 1)), s = Math.sin(ang / 2);
    return { x: ax[0] * s, y: ax[1] * s, z: ax[2] * s, w: Math.cos(ang / 2) };
  }
  // sütunları x, y, z olan dönme matrisinden dördey
  function quatFromBasis(x, y, z) {
    const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
    const tr = m00 + m11 + m22; let qw, qx, qy, qz;
    if (tr > 0) { const S = Math.sqrt(tr + 1) * 2; qw = 0.25 * S; qx = (m21 - m12) / S; qy = (m02 - m20) / S; qz = (m10 - m01) / S; }
    else if (m00 > m11 && m00 > m22) { const S = Math.sqrt(1 + m00 - m11 - m22) * 2; qw = (m21 - m12) / S; qx = 0.25 * S; qy = (m01 + m10) / S; qz = (m02 + m20) / S; }
    else if (m11 > m22) { const S = Math.sqrt(1 + m11 - m00 - m22) * 2; qw = (m02 - m20) / S; qx = (m01 + m10) / S; qy = 0.25 * S; qz = (m12 + m21) / S; }
    else { const S = Math.sqrt(1 + m22 - m00 - m11) * 2; qw = (m10 - m01) / S; qx = (m02 + m20) / S; qy = (m12 + m21) / S; qz = 0.25 * S; }
    return { x: qx, y: qy, z: qz, w: qw };
  }
  // dördey çarpımı (önce b, sonra a)
  function qmul(a, b) {
    return {
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    };
  }
  const qY = ang => ({ x: 0, y: Math.sin(ang / 2), z: 0, w: Math.cos(ang / 2) });
  MP.quatFromY = quatFromY; MP.quatFromBasis = quatFromBasis; MP.qmul = qmul; MP.qY = qY;

  // tekrarlanabilir rastgele sayı (dekor için)
  MP.rng = function (seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // ---------- üçgen ağı ----------
  class Mesh {
    constructor(kind, color, o = {}) {
      this.kind = kind; this.color = color; this.v = []; this.uv = []; this.i = [];
      this.physics = o.physics !== false; this.friction = o.friction; this.restitution = o.restitution;
      this.opacity = o.opacity || 1;
    }
    vert(p, u, v) { this.v.push(p[0], p[1], p[2]); this.uv.push(u || 0, v || 0); return this.v.length / 3 - 1; }
    P(i) { return [this.v[i * 3], this.v[i * 3 + 1], this.v[i * 3 + 2]]; }
    // ref verilirse üçgenin yüzü ref noktasına (misketin olduğu tarafa) bakacak şekilde çevrilir
    tri(a, b, c, ref) {
      if (ref) {
        const A = this.P(a), B = this.P(b), C = this.P(c);
        const n = cross(sub(B, A), sub(C, A)), ctr = mul(add(add(A, B), C), 1 / 3);
        if (dot(n, sub(ref, ctr)) < 0) { const t = b; b = c; c = t; }
      }
      this.i.push(a, b, c);
    }
  }
  MP.Mesh = Mesh;

  // Oluğun kesiti: yuvarlatılmış U (soldaki duvar tepesinden sağdaki duvar tepesine)
  function uProfile(hw, wh, rc, n = 4) {
    const pts = [[-hw, wh]];
    for (let k = 0; k <= n; k++) { const a = Math.PI + (Math.PI / 2) * k / n; pts.push([-hw + rc + rc * Math.cos(a), rc + rc * Math.sin(a)]); }
    for (let k = 0; k <= n; k++) { const a = 1.5 * Math.PI + (Math.PI / 2) * k / n; pts.push([hw - rc + rc * Math.cos(a), rc + rc * Math.sin(a)]); }
    pts.push([hw, wh]);
    return pts;
  }

  // ---------- parkur kurucu ----------
  class Builder {
    constructor(o = {}) {
      this.o = o;
      this.pos = [0, o.y0 != null ? o.y0 : 150, 0];
      this.yaw = o.yaw0 || 0;
      this.s = 0; this.hw = o.hw || 2.1; this.wh = o.wh || 1.35; this.baseWh = this.wh; this.baseHw = this.hw;
      this.egim = o.egim || 1; // engel bölümlerinin eğim çarpanı (üretilen parkurlar; özel parkurlarda 1)
      this.meshes = []; this.prims = []; this.samples = []; this.zones = []; this.decor = [];
      this.slots = []; this.finishS = null; this.startS = 0;
      this.palette = o.palette || ['#3d8bff', '#ff6b6b', '#ffd166', '#06d6a0'];
      this.pc = 0; this.lane = 0; this.laneCount = 0;
    }
    _color(c) { return c || this.palette[(this.pc++) % this.palette.length]; }

    // fn(t) -> {p, hw, wh, bank, floor}; çerçeveleri (T: ileri, R: sağ, U: yukarı) hesaplar
    _frames(n, fn) {
      const F = [];
      for (let k = 0; k <= n; k++) { const t = k / n; F.push(Object.assign({ t }, fn(t))); }
      for (let k = 0; k <= n; k++) {
        const a = F[Math.max(0, k - 1)].p, b = F[Math.min(n, k + 1)].p;
        const T = norm(sub(b, a)); let R = norm(cross(T, UP)); let U = cross(R, T);
        const bk = F[k].bank || 0;
        if (bk) {
          R = rotAround(R, T, -bk); U = rotAround(U, T, -bk);
          // yatırım iç kenar etrafında: iç kenar alçalmaz, viraj çıkışında çukur oluşmaz
          F[k].p = add(F[k].p, [0, 0.5 * F[k].hw * Math.sin(Math.abs(bk)), 0]);
        }
        F[k].T = T; F[k].R = R; F[k].U = U;
      }
      return F;
    }
    _arc(F) { const A = [0]; for (let k = 1; k < F.length; k++) A.push(A[k - 1] + len(sub(F[k].p, F[k - 1].p))); return A; }

    // U kesitli oluğu çerçeveler boyunca süpür
    _sweep(F, o = {}) {
      const m = new Mesh(o.kind || 'track', this._color(o.color), { friction: o.friction, restitution: o.restitution });
      const prof = F.map(f => uProfile(f.hw, f.wh, Math.min(o.rc != null ? o.rc : 0.5, f.hw * 0.45)));
      const np = prof[0].length, A = this._arc(F);
      for (let k = 0; k < F.length; k++) {
        for (let j = 0; j < np; j++) {
          const [x, y] = prof[k][j];
          m.vert(add(add(F[k].p, mul(F[k].R, x)), mul(F[k].U, y)), j / (np - 1), (this.s + A[k]) / 3);
        }
      }
      for (let k = 0; k < F.length - 1; k++) {
        const ref = add(F[k].p, mul(F[k].U, F[k].wh * 0.7));
        for (let j = 0; j < np - 1; j++) {
          const a = k * np + j, b = (k + 1) * np + j, c = k * np + j + 1, d = (k + 1) * np + j + 1;
          m.tri(a, c, b, ref); m.tri(c, d, b, ref);
        }
      }
      if (o.capStart) this._cap(m, F[0], 0, np, mul(F[0].T, 1));
      if (o.capEnd) this._cap(m, F[F.length - 1], (F.length - 1) * np, np, mul(F[F.length - 1].T, -1));
      this.meshes.push(m);
      this._shell(F, m.color, o.rc != null ? o.rc : 0.5);
      return m;
    }
    // görsel kalınlık: oluğun dış yüzü ve duvarların üst kenarı (fizikte yok)
    _shell(F, color, rc0) {
      const th = 0.14, sh = new Mesh('shell', color, { physics: false });
      const np = uProfile(1, 1, 0.3).length, row = np + 4;
      for (let k = 0; k < F.length; k++) {
        const f = F[k], rc = Math.min(rc0, f.hw * 0.45) + th;
        const outer = uProfile(f.hw + th, f.wh + th, rc).map(([x, y]) => [x, y - th]);
        const pts = outer.concat([[-f.hw, f.wh], [-f.hw - th, f.wh], [f.hw, f.wh], [f.hw + th, f.wh]]);
        for (const [x, y] of pts) sh.vert(add(add(f.p, mul(f.R, x)), mul(f.U, y)), 0, 0);
      }
      for (let k = 0; k < F.length - 1; k++) {
        const f = F[k], inRef = add(f.p, mul(f.U, f.wh * 0.6)), upRef = add(f.p, mul(f.U, f.wh + 5));
        const a0 = k * row, b0 = (k + 1) * row;
        for (let j = 0; j < np - 1; j++) { sh.tri(a0 + j, a0 + j + 1, b0 + j, inRef); sh.tri(a0 + j + 1, b0 + j + 1, b0 + j, inRef); }
        for (const q of [np, np + 2]) { sh.tri(a0 + q, a0 + q + 1, b0 + q, upRef); sh.tri(a0 + q + 1, b0 + q + 1, b0 + q, upRef); }
      }
      this.meshes.push(sh);
    }
    _cap(m, f, base, np, inward) {
      const ctr = m.vert(add(f.p, mul(f.U, f.wh * 0.5)), 0.5, 0);
      const ref = add(add(f.p, inward), mul(f.U, f.wh * 0.5));
      for (let j = 0; j < np - 1; j++) m.tri(ctr, base + j, base + j + 1, ref);
      m.tri(ctr, base + np - 1, base, ref);
    }
    // ilerleme örnekleri (sıralama, geri dönüş noktası, kamera için)
    _samples(F, sOf, o = {}) {
      for (let k = 0; k < F.length; k++) {
        const f = F[k];
        this.samples.push({
          p: add(f.p, mul(f.U, 0.55)), s: sOf(k), T: f.T, R: f.R, U: f.U, hw: f.hw,
          safe: o.safe !== false && !(o.unsafe && o.unsafe(f.t)), lane: o.lane || 0,
          kind: o.kindOf ? o.kindOf(f.t, k) : (o.kind || null), // atlama/trambolin/huni çıkışı: kamera ve kurtarma için
        });
      }
    }
    _posts(F, posts, color) {
      if (!posts) return;
      for (const pt of posts) {
        const k = Math.round(clamp(pt.t, 0, 1) * (F.length - 1)), f = F[k];
        const h = pt.h || f.wh, r = pt.r || 0.32;
        const p = add(add(f.p, mul(f.R, pt.x || 0)), mul(f.U, h / 2));
        // misket (çap 1) direkle duvar arasına sıkışmasın: boşluk ya kapalı ya da rahat geçilebilir olmalı
        for (const g of [f.hw - (pt.x || 0) - r, f.hw + (pt.x || 0) - r]) {
          if (g > 0.05 && g < 1.2) (this.warnings = this.warnings || []).push(`dar boşluk s=${(this.s + pt.t * 0).toFixed(0)} x=${pt.x} boşluk=${g.toFixed(2)}`);
        }
        this.prims.push({ type: 'cyl', p, q: quatFromY(f.U), r, hh: h / 2, color: pt.color || color || '#f4f1ea', bumper: !!pt.bumper });
      }
    }
    _advance(F, sEnd, yaw) {
      const f = F[F.length - 1];
      this.pos = f.p.slice(); this.s = sEnd; this.hw = f.hw; this.wh = f.wh;
      this.yaw = yaw != null ? yaw : Math.atan2(f.T[0], f.T[2]);
    }
    _widths(o) {
      const hw0 = o.hw0 != null ? o.hw0 : this.hw, hw1 = o.hw != null ? o.hw : hw0;
      const wh0 = o.wh0 != null ? o.wh0 : this.wh, wh1 = o.wh != null ? o.wh : wh0;
      return { hw0, hw1, wh0, wh1 };
    }

    // ---------- PARÇALAR ----------

    // Düz (eğimli) rampa. profile(t): zemine eklenen yükseklik (tümsek vb.)
    straight(o = {}) {
      const L = o.len != null ? o.len : 10, drop = o.drop != null ? o.drop : L * 0.08;
      const { hw0, hw1, wh0, wh1 } = this._widths(o);
      const n = Math.max(2, Math.ceil(L / 0.6)), d = dirOf(this.yaw), p0 = this.pos.slice(), prof = o.profile;
      const F = this._frames(n, t => ({
        p: [p0[0] + d[0] * L * t, p0[1] - drop * t + (prof ? prof(t) : 0), p0[2] + d[2] * L * t],
        hw: lerp(hw0, hw1, smooth(t)), wh: lerp(wh0, wh1, smooth(t)),
      }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      this._posts(F, o.posts, o.postColor);
      this._advance(F, s0 + A[A.length - 1], this.yaw);
      return F;
    }

    // Viraj (yatırmalı). angle: derece, + sola, - sağa. Büyük açı = spiral.
    curve(o = {}) {
      const a = (o.angle != null ? o.angle : 90) * DEG, sg = Math.sign(a) || 1, Rr = o.radius != null ? o.radius : 7;
      const arcLen = Math.abs(a) * Rr, drop = o.drop != null ? o.drop : arcLen * 0.07;
      const { hw0, hw1, wh0, wh1 } = this._widths(o);
      const bank = (o.bank != null ? o.bank : 10) * DEG;
      const yaw0 = this.yaw, p0 = this.pos.slice(), c = add(p0, mul(leftOf(yaw0), Rr * sg));
      const n = Math.max(3, Math.ceil(arcLen / 0.55)), ramp = Math.min(0.25, 6 / arcLen);
      const F = this._frames(n, t => {
        const lt = leftOf(yaw0 + a * t), p = sub(c, mul(lt, Rr * sg));
        p[1] = p0[1] - drop * t;
        const env = smooth(Math.min(t / ramp, (1 - t) / ramp, 1));
        return { p, hw: lerp(hw0, hw1, smooth(t)), wh: lerp(wh0, wh1, smooth(t)) + 0.25 * env, bank: sg * bank * env };
      });
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      this._posts(F, o.posts, o.postColor);
      this._advance(F, s0 + A[A.length - 1], yaw0 + a);
      return F;
    }

    // Başlangıç: 6 misket yan yana, önlerinde kapı
    start(o = {}) {
      const n = o.n || 6, sp = o.spacing || 1.22, hwS = n * sp / 2 + 0.3;
      const d = dirOf(this.yaw), Rv = mul(leftOf(this.yaw), -1), p0 = this.pos.slice();
      const L = 5, drop = 0.4;
      this.straight({ len: L, drop, hw0: hwS, hw: hwS, wh0: 1.6, wh: 1.6, capStart: true, color: o.color || '#e9ecf5' });
      const xs = 2.0, yFloor = p0[1] - drop * xs / L;
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * sp;
        this.slots.push([p0[0] + d[0] * xs + Rv[0] * off, yFloor + 0.53, p0[2] + d[2] * xs + Rv[2] * off]);
      }
      const xg = 3.6, yg = p0[1] - drop * xg / L;
      this.prims.push({ type: 'box', gate: true, p: [p0[0] + d[0] * xg, yg + 0.8, p0[2] + d[2] * xg], half: [hwS, 0.8, 0.1], q: { x: 0, y: Math.sin(this.yaw / 2), z: 0, w: Math.cos(this.yaw / 2) }, color: '#ff4d6d' });
      this.decor.push({ type: 'startArch', p: [p0[0] + d[0] * xg, yg, p0[2] + d[2] * xg], yaw: this.yaw, hw: hwS });
      this.startS = 0;
      this.straight({ len: 9, drop: 2.0, hw: o.hw || this.baseHw, wh: this.baseWh });
    }

    // Çivi tahtası (plinko)
    pegs(o = {}) {
      const L = o.len || 14, drop = o.drop != null ? o.drop : L * 0.32 * this.egim, hwP = o.hw || 3.4, hw0 = this.hw, wh = this.wh;
      const sp = o.spacing || 1.8, r = o.r || 0.2, tin = 0.14, tout = 0.86;
      const n = Math.ceil(L / 0.5), d = dirOf(this.yaw), p0 = this.pos.slice();
      const hwAt = t => t < tin ? lerp(hw0, hwP, smooth(t / tin)) : t > tout ? lerp(hwP, hw0, smooth((t - tout) / (1 - tout))) : hwP;
      const F = this._frames(n, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw: hwAt(t), wh }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      const posts = [], rowStep = sp * 0.85, z0 = L * (tin + 0.04), z1 = L * (tout - 0.04);
      let row = 0;
      for (let z = z0; z <= z1; z += rowStep, row++) {
        const off = (row % 2) ? sp / 2 : 0;
        for (let x = -hwP + 1.5 + off; x <= hwP - 1.5 + 1e-6; x += sp) posts.push({ t: z / L, x, r, h: wh, color: o.pegColor || '#ffffff' });
      }
      this._posts(F, posts);
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Atlama: rampanın ucu yukarı kalkar, misket uçar, alttaki geniş iniş oluğuna düşer (kimse dışarı düşmez)
    jump(o = {}) {
      const run = o.run || 7, runDrop = o.runDrop != null ? o.runDrop : 1.8, kick = o.kick || 2.4;
      // rampanın ucu yataya yakın biter: önünde çukur olmaz, yavaş misket de geçer (yukarı kalkan uç yavaşları hapsediyordu)
      const lift = Math.min(o.lift != null ? o.lift : 1, runDrop * kick / (2 * run) * 0.92);
      const gap = o.gap != null ? o.gap : 3.5, fall = o.fall || 3.0, land = o.land || 10, landDrop = o.landDrop != null ? o.landDrop : 0.9;
      const hw0 = this.hw, wh0 = this.wh, hwL = o.landHw || hw0 + 0.9, whL = o.landWh || 2.3;
      const d = dirOf(this.yaw), p0 = this.pos.slice(), s0 = this.s, yaw = this.yaw;
      const yRun = x => -runDrop * x / run + (x > run - kick ? lift * Math.pow((x - (run - kick)) / kick, 2) : 0);
      const n1 = Math.ceil(run / 0.4);
      const F1 = this._frames(n1, t => { const x = run * t; return { p: [p0[0] + d[0] * x, p0[1] + yRun(x), p0[2] + d[2] * x], hw: hw0, wh: wh0 }; });
      this._sweep(F1, o);
      this._samples(F1, k => s0 + run * F1[k].t, Object.assign({}, o, { kindOf: t => t > 0.6 ? 'jump' : null }));
      // iniş oluğu rampanın ucunun hemen altından başlar: düşen misket geriye kaymaz
      const yLip = p0[1] + yRun(run), xa = run - 0.3, xb = run + gap + land, yL0 = yLip - fall;
      const n2 = Math.ceil((xb - xa) / 0.5);
      const F2 = this._frames(n2, t => {
        const x = lerp(xa, xb, t), e = smooth((t - 0.8) / 0.2);
        return { p: [p0[0] + d[0] * x, yL0 - landDrop * t, p0[2] + d[2] * x], hw: lerp(hwL, hw0, e), wh: lerp(whL, wh0, e) };
      });
      this._sweep(F2, { capStart: true, color: o.landColor });
      // iniş örneklerinin ilerlemesi rampanın ucundan küçük olmaz: sıralamada geri düşme olmaz
      this._samples(F2, k => s0 + Math.max(run, lerp(xa, xb, F2[k].t)), Object.assign({}, o, { kindOf: t => lerp(xa, xb, t) < run + gap + 2.5 ? 'jump' : null }));
      this.decor.push({ type: 'jumpSign', p: [p0[0] + d[0] * run, yLip, p0[2] + d[2] * run], yaw, hw: hw0 });
      this._advance(F2, s0 + xb, yaw);
    }

    // Çatal: yol 2-3 kola ayrılır, sonra birleşir. laneOpts[j]: {spread, posts, profile, color}
    split(o = {}) {
      const n = o.lanes || 2, lw = o.lw || 1.1, L = o.len || 22, drop = o.drop != null ? o.drop : L * 0.09, wid = o.widen || 4;
      const hwBefore = this.hw;
      this.straight({ len: wid, drop: wid * 0.08, hw: n * lw });
      const d = dirOf(this.yaw), Rv = mul(leftOf(this.yaw), -1), p0 = this.pos.slice(), s0 = this.s, wh = this.wh, yaw = this.yaw;
      const lanes = o.laneOpts || [];
      const bump = t => t < 0.3 ? (1 - Math.cos(Math.PI * t / 0.3)) / 2 : t > 0.7 ? (1 - Math.cos(Math.PI * (1 - t) / 0.3)) / 2 : 1;
      const ns = Math.ceil(L / 0.5);
      this.laneCount++;
      // kol genişlikleri: 2 kolluda biri geniş biri dar → ayırıcı direk tam ortada olmaz, ortadan gelen misket direkte dengede kalmaz
      const lws = lanes.slice(0, n).map(l => l && l.lw).every(x => x) ? lanes.slice(0, n).map(l => l.lw)
        : n === 2 ? [lw + 0.13, lw - 0.13] : new Array(n).fill(lw);
      const tot = lws.reduce((a, x) => a + x, 0), cum = [0]; for (const x of lws) cum.push(cum[cum.length - 1] + x);
      for (let j = 0; j < n; j++) {
        const lo = lanes[j] || {}, lwj = lws[j], o0 = -tot + 2 * cum[j] + lwj, sgn = Math.abs(o0) < 0.3 ? 0 : Math.sign(o0);
        const om = o0 + sgn * (lo.spread != null ? lo.spread : (o.spread != null ? o.spread : 2.6)), prof = lo.profile;
        const F = this._frames(ns, t => {
          const off = lerp(o0, om, bump(t)), base = add(p0, mul(d, L * t));
          return { p: [base[0] + Rv[0] * off, p0[1] - drop * t + (prof ? prof(t) : 0), base[2] + Rv[2] * off], hw: lwj, wh: lo.wh || wh };
        });
        this._sweep(F, { color: lo.color });
        this._samples(F, k => s0 + L * F[k].t, { lane: this.laneCount * 10 + j + 1 });
        this._posts(F, lo.posts, lo.postColor);
      }
      for (let j = 0; j < n - 1; j++) { // ayırıcı direkler
        const off = -tot + 2 * cum[j + 1];
        for (const e of [0, 1]) {
          const p = add(add(p0, mul(d, L * e)), mul(Rv, off)); p[1] = p0[1] - drop * e + wh / 2;
          this.prims.push({ type: 'cyl', p, q: { x: 0, y: 0, z: 0, w: 1 }, r: 0.16, hh: wh / 2, color: '#ffffff' });
        }
      }
      this.pos = add(p0, mul(d, L)); this.pos[1] = p0[1] - drop; this.s = s0 + L; this.hw = n * lw; this.yaw = yaw;
      this.straight({ len: wid, drop: wid * 0.08, hw: hwBefore });
    }

    // Huni: misketler teğet olarak girer, dönerek ortadaki delikten alttaki yola düşer
    funnel(o = {}) {
      const Rr = o.R || 6, depth = o.depth || 3.2, hole = o.hole || 1.15, side = o.side || 1, above = o.above || 2.6;
      const wallH = o.wallH || 1.3, exitTurn = (o.exitTurn || 0) * DEG, hw = this.hw;
      const dd = Rr - hw - 0.7, la = Math.sqrt(Rr * Rr - dd * dd) + 1.5;
      this.straight({ len: la, drop: la * 0.05 }); // yaklaşma: huninin kenarının üstünden geçer
      const E = this.pos.slice(), yaw = this.yaw;
      const c = add(E, mul(leftOf(yaw), side * dd)), yRim = E[1] - above; c[1] = yRim;
      const yAt = r => yRim - depth * ((Rr / r - 1) / (Rr / hole - 1));
      const m = new Mesh('funnel', this._color(o.color), { friction: o.friction });
      const NR = 24, NS = 64, top = add(c, [0, 60, 0]);
      for (let k = 0; k <= NR; k++) {
        const r = hole + (Rr - hole) * Math.pow(1 - k / NR, 1.5);
        for (let q = 0; q <= NS; q++) { const a = 2 * Math.PI * q / NS; m.vert([c[0] + Math.cos(a) * r, yAt(r), c[2] + Math.sin(a) * r], q / NS * 8, k / NR * 3); }
      }
      for (let k = 0; k < NR; k++) for (let q = 0; q < NS; q++) {
        const a = k * (NS + 1) + q, b = (k + 1) * (NS + 1) + q, cc = a + 1, dq = b + 1;
        m.tri(a, b, cc, top); m.tri(cc, b, dq, top);
      }
      this.meshes.push(m);
      const sh = new Mesh('shell', m.color, { physics: false });
      for (let k = 0; k <= NR; k++) {
        const r = hole + (Rr - hole) * Math.pow(1 - k / NR, 1.5);
        for (let q = 0; q <= NS; q++) { const a = 2 * Math.PI * q / NS; sh.vert([c[0] + Math.cos(a) * r, yAt(r) - 0.16, c[2] + Math.sin(a) * r], 0, 0); }
      }
      for (let k = 0; k < NR; k++) for (let q = 0; q < NS; q++) {
        const a = k * (NS + 1) + q, b = (k + 1) * (NS + 1) + q, cc = a + 1, dq = b + 1;
        sh.tri(a, b, cc, top); sh.tri(cc, b, dq, top);
      }
      this.meshes.push(sh);
      const w = new Mesh('rim', o.rimColor || '#dfe6ff', {});
      for (let q = 0; q <= NS; q++) {
        const a = 2 * Math.PI * q / NS, x = c[0] + Math.cos(a) * Rr, z = c[2] + Math.sin(a) * Rr;
        w.vert([x, yRim - 0.1, z], q / NS * 8, 0); w.vert([x, yRim + wallH, z], q / NS * 8, 1);
      }
      for (let q = 0; q < NS; q++) {
        const a = 2 * q, ref = [c[0], yRim + 0.5, c[2]];
        w.tri(a, a + 2, a + 1, ref); w.tri(a + 1, a + 2, a + 3, ref);
      }
      this.meshes.push(w);
      const Lf = 2.4 * Rr, s0 = this.s;
      this.zones.push({ kind: 'funnel', c, R: Rr, hole, yTop: yRim + 1.9, yBot: yAt(hole) - 0.35, s0, s1: s0 + Lf });
      this.decor.push({ type: 'funnel', c, R: Rr, yRim, yHole: yAt(hole), hole, wallH });
      // çıkış: deliğin altından başlayan, arkası kapalı, yüksek duvarlı oluk
      const yaw2 = yaw + exitTurn, d2 = dirOf(yaw2), yHole = yAt(hole);
      // çıkış oluğu deliğin hemen altından başlar ve ilk metreler daha eğimli: misket geriye kaçmaz
      const back = hole + 0.4; // arka duvar deliğin arka kenarının biraz gerisinde: delikten düşen her misket oluğa düşer
      this.pos = [c[0] - d2[0] * back, yHole - 2.9, c[2] - d2[2] * back];
      this.yaw = yaw2; this.s = s0 + Lf;
      this.straight({ len: 6, drop: 0.95, wh0: 2.4, wh: 2.4, capStart: true, kind: 'funnelExit' });
      this.straight({ len: 4, drop: 0.35, wh: this.baseWh });
    }

    // genişleyip daralan bölme (çivi tahtası, çarpma direkleri, pervane için ortak)
    _wideSection(o, L, drop, hwW, flatMid) {
      const hw0 = this.hw, wh = this.wh, tin = 0.16, tout = 0.84;
      const n = Math.ceil(L / 0.5), d = dirOf(this.yaw), p0 = this.pos.slice();
      const hwAt = t => t < tin ? lerp(hw0, hwW, smooth(t / tin)) : t > tout ? lerp(hwW, hw0, smooth((t - tout) / (1 - tout))) : hwW;
      // flatMid: ortası düz (dönen pervane zemine sürtmesin), iniş giriş ve çıkışta
      const yAt = t => flatMid ? -drop * (t < tin ? 0.5 * t / tin : t > tout ? 0.5 + 0.5 * (t - tout) / (1 - tout) : 0.5) : -drop * t;
      const F = this._frames(n, t => ({ p: [p0[0] + d[0] * L * t, p0[1] + yAt(t), p0[2] + d[2] * L * t], hw: hwAt(t), wh }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      return { F, A, s0, tin, tout };
    }

    // Çarpma direkleri: kalın, yuvarlak, sektiren direkler (aralar misketin rahat geçeceği kadar)
    bumpers(o = {}) {
      const L = o.len || 12, drop = o.drop != null ? o.drop : L * 0.17 * this.egim, hwB = o.hw || 3.0, r = o.r || 0.42;
      const { F, A, s0, tin, tout } = this._wideSection(o, L, drop, hwB);
      const posts = [], rowStep = o.rowStep || 2.1;
      let row = 0;
      for (let z = L * (tin + 0.06); z <= L * (tout - 0.06); z += rowStep, row++) {
        const xs = row % 2 ? [0] : [-1.2, 1.2];
        for (const x of xs) posts.push({ t: z / L, x, r, h: this.wh, bumper: true, color: o.bumperColor || '#2b2d42' });
      }
      this._posts(F, posts);
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Zikzak tahtalar: duvardan eğik çıkan tahtalar misketi bir yandan öbür yana sektirir
    slalom(o = {}) {
      const L = o.len || 14, drop = o.drop != null ? o.drop : L * 0.15 * this.egim, gap = o.gap || 1.5, th = 45 * DEG;
      // tahtalar arası en az ~4,1 m: daha sıkı olursa bir tahtanın ucuyla diğerinin dibi arasında misketi sıkıştıran cep oluşur
      const n = Math.max(2, Math.min(o.boards || 3, Math.floor(L / 4.1 - 0.4)));
      const { hw0, wh0 } = this._widths(o);
      const d = dirOf(this.yaw), p0 = this.pos.slice(), nf = Math.ceil(L / 0.5);
      const F = this._frames(nf, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw: hw0, wh: wh0 }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.7) / (n + 0.4), f = F[Math.round(t * (F.length - 1))], side = k % 2 ? 1 : -1;
        const Lb = (2 * f.hw - gap) / Math.cos(th);
        const db = norm(add(mul(f.R, -side * Math.cos(th)), mul(f.T, Math.sin(th)))); // duvardan içe ve ileri
        const w = add(add(f.p, mul(f.R, side * f.hw)), mul(f.U, f.wh / 2));
        const c = add(w, mul(db, Lb / 2));
        const z = cross(db, f.U);
        this.prims.push({ type: 'box', p: c, half: [Lb / 2, f.wh / 2, 0.1], q: quatFromBasis(db, f.U, z), color: o.boardColor || '#ffb703', board: true });
      }
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Dönen pervane: geniş bir bölmenin ortasında dönen çarpı, misketlere vurup savurur
    spinner(o = {}) {
      const L = o.len || 11, drop = o.drop != null ? o.drop : L * 0.14 * this.egim, hwS = o.hw || 3.3;
      const { F, A, s0 } = this._wideSection(o, L, drop, hwS, false);
      const f = F[Math.round(0.5 * (F.length - 1))];
      const arm = hwS - 1.35; // uçta misketin geçeceği boşluk kalır
      this.prims.push({
        type: 'spinner', p: add(f.p, mul(f.U, 0.5)), q: quatFromY(f.U), arm, hh: 0.32, th: 0.14,
        arms: o.arms || 2, speed: (o.speed || 1.5) * (o.dir || 1), color: o.color2 || '#1d3557', hub: 0.34,
      });
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Trambolin: yol biter, misket aşağıdaki öne eğik esnek yastığa düşer ve ileri sıçrar
    trampoline(o = {}) {
      const hw0 = this.hw, wh0 = this.wh, d = dirOf(this.yaw), L = leftOf(this.yaw), Rv = mul(L, -1), yaw = this.yaw;
      const p0 = this.pos.slice(), s0 = this.s, fall = o.fall || 3.4, tilt = (o.tilt || 17) * DEG, padLen = o.padLen || 3.6;
      const nUp = norm(add(mul(UP, Math.cos(tilt)), mul(d, Math.sin(tilt))));
      const q = quatFromBasis(Rv, nUp, cross(Rv, nUp)); // sağ el kuralına uygun eksenler
      const pc = add(p0, add(mul(d, 2.2), [0, -fall, 0]));
      const hwB = hw0 + 0.5;
      this.prims.push({ type: 'box', pad: true, p: pc, half: [hwB, 0.16, padLen / 2], q, color: o.color || '#ff2d6f', restitution: o.bounce || 0.92 });
      // yan duvarlar ve arka duvar (misket dışarı kaçmasın)
      const wallH = fall + 1.6, wq = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
      for (const sd of [-1, 1]) this.prims.push({ type: 'box', glass: true, p: add(add(p0, mul(d, 3.2)), add(mul(Rv, sd * (hwB + 0.1)), [0, -fall + wallH / 2 - 0.4, 0])), half: [0.08, wallH / 2, 4.2], q: wq });
      this.prims.push({ type: 'box', glass: true, p: add(add(p0, mul(d, -0.15)), [0, -fall / 2 - 0.6, 0]), half: [hwB + 0.1, fall / 2 + 0.1, 0.08], q: wq });
      // iniş oluğu: yastığın ön kenarından başlar
      const front = add(pc, add(mul(d, padLen / 2 * Math.cos(tilt)), [0, -padLen / 2 * Math.sin(tilt) - 0.35, 0]));
      const xa = len(sub([front[0], 0, front[2]], [p0[0], 0, p0[2]]));
      const gap = [];
      for (let x = 0; x <= xa; x += 0.5) gap.push({ p: [p0[0] + d[0] * x, p0[1] - fall * Math.min(1, x / 2.2) + 0.55, p0[2] + d[2] * x], s: s0 + x, T: d, R: Rv, U: UP, hw: hwB, safe: false, lane: 0, kind: 'tramp' });
      this.samples.push(...gap);
      this.pos = front; this.s = s0 + xa; this.hw = hwB; this.wh = 2.6;
      this.straight({ len: 11, drop: 1.0, hw0: hwB, hw: hwB, wh0: 2.8, wh: 2.6, kindOf: t => t < 0.5 ? 'tramp' : null }); // uzun iniş: hızlı gelen misket de içine düşer
      this.straight({ len: 5, drop: 0.5, hw: hw0, wh: wh0 });
      this.decor.push({ type: 'tramp', p: pc, yaw });
    }

    // Pistonlar: duvardan çıkıp misketleri iten hareketli bloklar
    pistons(o = {}) {
      const L = o.len || 14, drop = o.drop != null ? o.drop : L * 0.12 * this.egim, n = o.count || 2, hw = this.hw;
      const d = dirOf(this.yaw), p0 = this.pos.slice(), nf = Math.ceil(L / 0.5), wh = this.wh;
      const F = this._frames(nf, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw, wh }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.75) / (n + 0.5), f = F[Math.round(t * (F.length - 1))], side = k % 2 ? 1 : -1;
        const stroke = 2 * hw - 1.45 - 0.2; // en çok uzandığında karşı duvarla arada misket geçecek boşluk kalır
        const half = [0.55, 0.5, 0.6];
        const base = add(add(f.p, mul(f.R, side * (hw + half[0] - 0.1))), mul(f.U, half[1] + 0.02));
        this.prims.push({ type: 'piston', p: base, dir: mul(f.R, -side), stroke, half, q: quatFromBasis(f.R, f.U, cross(f.R, f.U)), period: o.period || 2.6, phase: k * 0.37, color: o.color || '#ffb703' });
      }
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // ---------- hareketli engeller (kinematik cisimler; js/fizik.js MF.kinPose ile hareket eder) ----------

    // Kazıklar: zeminden zamanlı çıkıp giren kazık sıraları (aralar misketin geçeceği kadar)
    kaziklar(o = {}) {
      const L = o.len || 14, drop = o.drop != null ? o.drop : L * 0.14 * this.egim, hwK = o.hw || 2.8;
      const { F, A, s0, tin, tout } = this._wideSection(o, L, drop, hwK);
      let row = 0;
      for (let z = L * (tin + 0.07); z <= L * (tout - 0.07); z += 2.4, row++) {
        const f = F[Math.round(z / L * (F.length - 1))], xs = row % 2 ? [0] : [-1.25, 1.25];
        for (const x of xs) {
          const base = add(f.p, mul(f.R, x));
          this.prims.push({ type: 'kin', kind: 'kazik', p: base, U: f.U, q: quatFromY(f.U), r: 0.32, hh: 0.62, period: o.period || 2.6, phase: (row * 0.31) % 1, color: '#ffd60a' });
        }
      }
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Sarkaç: yolun üstünde yana sallanan ağır tokmak
    sarkac(o = {}) {
      const L = o.len || 13, drop = o.drop != null ? o.drop : L * 0.1 * this.egim, n = o.count || (L >= 16 ? 2 : 1);
      const { hw0, wh0 } = this._widths(o);
      const d = dirOf(this.yaw), p0 = this.pos.slice(), nf = Math.ceil(L / 0.5);
      const F = this._frames(nf, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw: hw0, wh: wh0 }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      for (let k = 0; k < n; k++) {
        const f = F[Math.round(((k + 0.5) / n) * (F.length - 1))], bob = 0.72, armL = wh0 + 3.6;
        const pivot = add(f.p, mul(f.U, armL + 1.15)); // tokmak en altta zeminden ~0,4 m yukarıda geçer
        const amp = Math.asin(Math.min(0.95, (f.hw - 0.7) / armL));
        this.prims.push({ type: 'kin', kind: 'sarkac', pivot, R: f.R, U: f.U, N: f.T, armL, bob, amp, period: o.period || 2.4, phase: k * 0.5, hw: f.hw, color: '#e63946' });
      }
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Hareketli bant: zemini ileri (hızlandırır) ya da geri (yavaşlatır, ama misketi asla geri taşımaz) akan bölge
    bant(o = {}) {
      const L = o.len || 12, drop = o.drop != null ? o.drop : L * 0.1 * this.egim, dir = o.dir || 1;
      const { hw0, wh0 } = this._widths(o);
      const d = dirOf(this.yaw), p0 = this.pos.slice(), nf = Math.ceil(L / 0.5);
      const F = this._frames(nf, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw: hw0, wh: wh0 }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      // görsel bant şeridi (fizikte yok; kuvvet bölgesi fizik.js'te)
      const m = new Mesh('belt', dir > 0 ? '#2ec4b6' : '#ff595e', { physics: false }); m.dir = dir;
      const half = hw0 - 0.45;
      for (let k = 0; k < F.length; k++) for (const x of [-half, half]) m.vert(add(add(F[k].p, mul(F[k].R, x)), mul(F[k].U, 0.03)), x < 0 ? 0 : 1, A[k] / 2);
      for (let k = 0; k < F.length - 1; k++) { const a = k * 2, ref = add(F[k].p, mul(F[k].U, 2)); m.tri(a, a + 1, a + 2, ref); m.tri(a + 1, a + 3, a + 2, ref); }
      this.meshes.push(m);
      (this.belts = this.belts || []).push({ s0, s1: s0 + A[A.length - 1], accel: dir > 0 ? 4 : -1.1 });
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Döner tabla: zemine gömülü, dönen disk; üstüne gelen misketi yana savurur
    tabla(o = {}) {
      const L = o.len || 12, drop = o.drop != null ? o.drop : L * 0.12 * this.egim, hwT = o.hw || 3.2;
      const { F, A, s0 } = this._wideSection(o, L, drop, hwT);
      const f = F[Math.round(0.5 * (F.length - 1))];
      this.prims.push({ type: 'kin', kind: 'tabla', p: add(f.p, mul(f.U, 0.06)), U: f.U, q: quatFromY(f.U), r: hwT - 0.75, hh: 0.06, speed: (o.dir || 1) * 1.3, color: '#ffbe0b' });
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Kapı: zeminden yükselip yolu kısa süre kapatan bariyer; geridekiler arkasında toplanır
    kapi(o = {}) {
      const L = o.len || 12, drop = o.drop != null ? o.drop : L * 0.1;
      const { hw0, wh0 } = this._widths(o);
      const d = dirOf(this.yaw), p0 = this.pos.slice(), nf = Math.ceil(L / 0.5);
      const F = this._frames(nf, t => ({ p: [p0[0] + d[0] * L * t, p0[1] - drop * t, p0[2] + d[2] * L * t], hw: hw0, wh: wh0 }));
      this._sweep(F, o);
      const A = this._arc(F), s0 = this.s;
      this._samples(F, k => s0 + A[k], o);
      const f = F[Math.round(0.55 * (F.length - 1))];
      this.prims.push({ type: 'kin', kind: 'kapi', p: f.p.slice(), U: f.U, q: quatFromBasis(f.R, f.U, cross(f.R, f.U)), half: [f.hw - 0.04, 0.6, 0.16], period: o.period || 4.2, phase: this.rngPhase || 0, color: '#ff006e' });
      this.decor.push({ type: 'kapiDirek', p: f.p.slice(), R: f.R, U: f.U, hw: f.hw });
      this._advance(F, s0 + A[A.length - 1], this.yaw);
    }

    // Şelale düşüşü: yol biter, misket 4–5 m aşağıdaki arkası kapalı geniş oluğa düşer
    dusus(o = {}) {
      const fall = o.fall || 4.4, hw0 = this.hw, wh0 = this.wh, d = dirOf(this.yaw), Rv = mul(leftOf(this.yaw), -1), p0 = this.pos.slice(), s0 = this.s;
      const hwL = hw0 + 0.7;
      for (let x = 0; x <= 1.5; x += 0.5) this.samples.push({ p: [p0[0] + d[0] * x, p0[1] - fall * Math.min(1, x / 1.5) + 0.55, p0[2] + d[2] * x], s: s0 + x, T: d, R: Rv, U: UP, hw: hwL, safe: false, lane: 0, kind: 'drop' });
      this.pos = [p0[0] - d[0] * 0.3, p0[1] - fall, p0[2] - d[2] * 0.3]; this.s = s0 + 0.01; this.hw = hwL; this.wh = 2.7;
      this.straight({ len: 8, drop: 0.9, hw0: hwL, hw: hwL, wh0: 2.7, wh: 2.5, capStart: true, kindOf: t => t < 0.45 ? 'drop' : null });
      this.straight({ len: 4, drop: 0.4, hw: hw0, wh: wh0 });
      this.decor.push({ type: 'selale', p: p0, yaw: this.yaw, hw: hw0, fall });
    }

    // Bitiş çizgisi ve sonrasında misketlerin durduğu alan
    finish(o = {}) {
      this.straight({ len: o.before || 6, drop: 0.35 });
      this.finishS = this.s;
      this.decor.push({ type: 'finishArch', p: this.pos.slice(), yaw: this.yaw, hw: this.hw });
      this.straight({ len: 12, drop: 0.15, hw: this.hw + 1.6, wh: 2.0, capEnd: true, color: o.color || '#e9ecf5' });
    }

    // Parkuru tamamla: örnekleri sırala, ayakları ve zemini hesapla
    finalize(def = {}) {
      const S = this.samples.slice().sort((a, b) => a.s - b.s);
      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const sm of S) {
        minY = Math.min(minY, sm.p[1]); maxY = Math.max(maxY, sm.p[1]);
        minX = Math.min(minX, sm.p[0]); maxX = Math.max(maxX, sm.p[0]); minZ = Math.min(minZ, sm.p[2]); maxZ = Math.max(maxZ, sm.p[2]);
      }
      for (const z of this.zones) {
        minY = Math.min(minY, z.yBot); minX = Math.min(minX, z.c[0] - z.R); maxX = Math.max(maxX, z.c[0] + z.R);
        minZ = Math.min(minZ, z.c[2] - z.R); maxZ = Math.max(maxZ, z.c[2] + z.R);
      }
      const groundY = minY - 10;
      // destek ayakları: altında başka parkur yoksa
      const main = S.filter(sm => sm.lane === 0);
      let lastS = -1e9;
      for (const sm of main) {
        if (sm.s - lastS < 11) continue;
        const top = sub(sm.p, mul(sm.U, 0.75));
        let blocked = false;
        for (const o of S) {
          if (o.p[1] < top[1] - 1.5 && Math.hypot(o.p[0] - top[0], o.p[2] - top[2]) < o.hw + 1.2) { blocked = true; break; }
        }
        // huninin üstünden geçen yerde ayak huniyi delmesin
        for (const z of this.zones) if (top[1] > z.yBot && Math.hypot(z.c[0] - top[0], z.c[2] - top[2]) < z.R + 1.2) blocked = true;
        if (!blocked) { this.decor.push({ type: 'pillar', top, bottomY: groundY }); lastS = sm.s; }
      }
      return {
        id: def.id, name: def.name, meshes: this.meshes, prims: this.prims, samples: S, zones: this.zones, decor: this.decor,
        slots: this.slots, finishS: this.finishS, startS: this.startS, groundY, bounds: { minX, maxX, minY, maxY, minZ, maxZ },
        target: def.target, theme: def.theme || {}, warnings: this.warnings || [], belts: this.belts || [],
      };
    }
  }
  MP.Builder = Builder;
})(typeof window !== 'undefined' ? window : globalThis);
