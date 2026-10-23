/* Misket Yarışı — dünya çevreleri
 * Her dünyanın zemini, ışığı, gökyüzü ve süsleri. Tüm modeller kod içinde basit şekillerden üretilir.
 * Ev dünyalarında parkur dev bir odanın içindedir (misketler minyatür gibi görünür).
 * Cevre.settings(env) → ışık/zemin ayarları; Cevre.build(env, ctx) → süsleri kurar, hareketli parçalar için güncelleyiciler döner.
 */
(function () {
  'use strict';
  const { THREE, MP } = window;
  const Cevre = window.Cevre = {};
  const col = c => new THREE.Color(c).convertSRGBToLinear();

  // ---- ayarlar ----
  // sky: hdri | gece | uzay | ic (oda) · ground: cimen | kum | kar | kaya | asfalt | beyaz | ay | yok · hills: tepe yüksekliği çarpanı
  const D = { sky: 'hdri', exposure: 1.15, sun: '#fff3e0', sunI: 3.8, hemi: 0.4, ground: 'cimen', tint: '#b7c99a', hills: 1, mountains: '#8f9a86', trees: 650, rocks: 140, fog: null };
  const SET = {
    doga: {},
    mutfak: { sky: 'ic', ground: 'yok', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 1.0, hemi: 0.5 },
    salon: { sky: 'ic', ground: 'yok', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 1.15, hemi: 0.55, sun: '#ffe2b8' },
    cocuk: { sky: 'ic', ground: 'yok', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 1.05, hemi: 0.5 },
    banyo: { sky: 'ic', ground: 'yok', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 0.95, hemi: 0.45, sun: '#eef6ff' },
    sehir: { ground: 'asfalt', tint: '#9a9a9a', hills: 0, mountains: null, trees: 0, rocks: 0 },
    park: { ground: 'cimen', tint: '#a8d08d', hills: 0.25, mountains: '#8fae7a', trees: 0, rocks: 30 },
    lunapark: { sky: 'gece', ground: 'asfalt', tint: '#8a8496', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 1.1, sun: '#ffc08a', sunI: 2.6, hemi: 0.55, fog: '#4a2d66' },
    spor: { sky: 'ic', ground: 'yok', hills: 0, mountains: null, trees: 0, rocks: 0, exposure: 1.05, hemi: 0.5, sun: '#ffffff' },
    kapadokya: { ground: 'kum', tint: '#e2c39a', hills: 0.9, mountains: '#d7a777', trees: 0, rocks: 60, sun: '#ffd9a8' },
    pamukkale: { ground: 'beyaz', tint: '#f4f1ea', hills: 0.7, mountains: '#efe9df', trees: 40, rocks: 0 },
    misir: { ground: 'kum', tint: '#e8cf9a', hills: 0.45, mountains: '#e0c08a', trees: 0, rocks: 20, sun: '#fff0cf', sunI: 4.4 },
    paris: { ground: 'asfalt', tint: '#b9b3a8', hills: 0, mountains: null, trees: 0, rocks: 0 },
    venedik: { ground: 'su', tint: '#6f8f8a', hills: 0, mountains: null, trees: 0, rocks: 0 },
    japon: { ground: 'cimen', tint: '#a7c98a', hills: 0.6, mountains: '#7f9b7a', trees: 0, rocks: 50 },
    kutup: { ground: 'kar', tint: '#f4f8ff', hills: 0.8, mountains: '#e6eef8', trees: 0, rocks: 0, sun: '#e8f0ff', exposure: 1.05 },
    tropik: { ground: 'su', tint: '#4fb3bf', hills: 0, mountains: null, trees: 0, rocks: 0, sunI: 4.4 },
    kanyon: { ground: 'kaya', tint: '#c9714a', hills: 1.6, mountains: '#b4532e', trees: 0, rocks: 120, sun: '#ffd0a0' },
    volkan: { ground: 'kaya', tint: '#5b3b2e', hills: 1.2, mountains: '#4a2a22', trees: 50, rocks: 160, exposure: 1.0, sun: '#ffb38a', fog: '#5a3a30' },
    uzay: { sky: 'uzay', ground: 'ay', tint: '#8a8d99', hills: 0.5, mountains: '#4b4e5c', trees: 0, rocks: 120, exposure: 1.25, hemi: 0.15 },
  };
  Cevre.settings = env => Object.assign({}, D, SET[env] || {});

  // ---- yardımcılar ----
  const cache = {};
  function ctex(key, w, h, draw, rep) {
    if (!cache[key]) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; cache[key] = t;
    }
    const t = cache[key].clone(); t.needsUpdate = true; if (rep) t.repeat.set(rep[0], rep[1]); return t;
  }
  const noise = (g, w, h, base, amt, n) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * amt; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); } };
  Cevre.groundTexture = function (kind) {
    if (kind === 'kum') return ctex('kum', 512, 512, (g, w, h) => { noise(g, w, h, '#e3c48f', 0.25, 9000); g.strokeStyle = 'rgba(160,120,60,0.18)'; g.lineWidth = 3; for (let y = 0; y < h; y += 22) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 6); g.stroke(); } });
    if (kind === 'kar') return ctex('kar', 512, 512, (g, w, h) => noise(g, w, h, '#f5f8ff', 0.12, 7000));
    if (kind === 'beyaz') return ctex('beyaz', 512, 512, (g, w, h) => { noise(g, w, h, '#f3efe6', 0.12, 6000); g.strokeStyle = 'rgba(170,160,140,0.25)'; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, Math.PI); g.stroke(); } });
    if (kind === 'asfalt') return ctex('asfalt', 512, 512, (g, w, h) => noise(g, w, h, '#4a4a4f', 0.25, 12000));
    if (kind === 'ay') return ctex('ay', 512, 512, (g, w, h) => { noise(g, w, h, '#8e9099', 0.25, 9000); for (let k = 0; k < 30; k++) { const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 28; g.strokeStyle = 'rgba(40,40,50,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill(); } });
    return null;
  };
  function M(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: col(c), roughness: 0.7 }, o || {})); }
  function mesh(g, m, x, y, z, ry) { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (ry) o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; return o; }
  const box = (w, h, d, m, x, y, z, ry) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, ry);
  const cyl = (r1, r2, h, m, x, y, z, seg) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 20), m, x, y + h / 2, z);
  const sph = (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 24, 16), m, x, y, z);
  const cone = (r, h, m, x, y, z, seg) => mesh(new THREE.ConeGeometry(r, h, seg || 20), m, x, y + h / 2, z);
  function windowsTex(key, wall, lit, cols, rows) {
    return ctex(key, 256, 512, (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      const cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = Math.random() < 0.35 ? lit : '#2b3a4a'; g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.55); }
    });
  }

  // yerleşim: parkura çarpmayan rastgele noktalar
  function placer(ctx) {
    const { track, terr, rnd } = ctx, S = track.samples.filter((s, i) => i % 3 === 0);
    const clear = (x, z, top, rad) => {
      for (const s of S) if (Math.hypot(s.p[0] - x, s.p[2] - z) < s.hw + 2.5 + rad && s.p[1] - 1.5 < top) return false;
      for (const zn of track.zones) if (Math.hypot(zn.c[0] - x, zn.c[2] - z) < zn.R + 2.5 + rad && zn.yBot - 1 < top) return false;
      return true;
    };
    return function (n, rMin, rMax, sizeFn, cb) {
      let made = 0;
      for (let i = 0; i < n * 8 && made < n; i++) {
        const a = rnd() * Math.PI * 2, r = rMin + Math.sqrt(rnd()) * (rMax - rMin);
        const x = terr.cx + Math.cos(a) * r, z = terr.cz + Math.sin(a) * r, s = sizeFn();
        const y = terr.height(x, z);
        if (!clear(x, z, y + s.h, s.r)) continue;
        cb(x, y, z, s, made++);
      }
    };
  }

  // ---- ev odaları: dev oda (duvarlar, tavan, zemin) ----
  function room(ctx, floorTex, wallTex, floorTint, wallTint) {
    const { grp, track } = ctx, b = track.bounds, m = 70;
    const x0 = b.minX - m, x1 = b.maxX + m, z0 = b.minZ - m, z1 = b.maxZ + m, y0 = track.groundY, H = b.maxY - y0 + 45;
    const W = x1 - x0, Dp = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), new THREE.MeshStandardMaterial({ map: floorTex, color: col(floorTint || '#ffffff'), roughness: 0.55 }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(cx, y0, cz); fl.receiveShadow = true; grp.add(fl);
    if (floorTex) floorTex.repeat.set(W / 24, Dp / 24);
    const wm = new THREE.MeshStandardMaterial({ map: wallTex, color: col(wallTint || '#ffffff'), roughness: 0.9, side: THREE.FrontSide });
    const walls = [[cx, z0, 0, W], [cx, z1, Math.PI, W], [x0, cz, Math.PI / 2, Dp], [x1, cz, -Math.PI / 2, Dp]];
    for (const [x, z, ry, len] of walls) {
      const t = wallTex ? wallTex.clone() : null; if (t) { t.needsUpdate = true; t.repeat.set(len / 30, H / 30); }
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wm.clone()); w.material.map = t;
      w.position.set(x, y0 + H / 2, z); w.rotation.y = ry; w.receiveShadow = true; grp.add(w);
      const base = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 0.8), M('#f2efe8')); base.position.set(x, y0 + 1.5, z); base.rotation.y = ry; grp.add(base);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), M('#f7f5f0', { side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, y0 + H, cz); grp.add(ceil);
    // tavan lambaları
    for (const [ux, uz] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.6, 32), new THREE.MeshStandardMaterial({ color: col('#ffffff'), emissive: col('#fff4d6'), emissiveIntensity: 2 }));
      l.position.set(x0 + W * ux, y0 + H - 0.4, z0 + Dp * uz); grp.add(l);
    }
    const R = { x0, x1, z0, z1, y0, H, W, D: Dp, cx, cz }; ctx.room = R;
    return R;
  }
  // odanın duvar boyunca, parkura değmeyen yerine eşya koy
  function alongWalls(ctx, R, n, depth, cb) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const side = i % 4, u = (Math.floor(i / 4) + 0.5) / Math.ceil(n / 4);
      if (side === 0) pts.push([R.x0 + depth / 2 + 2, R.z0 + R.D * u, Math.PI / 2]);
      else if (side === 1) pts.push([R.x1 - depth / 2 - 2, R.z0 + R.D * u, -Math.PI / 2]);
      else if (side === 2) pts.push([R.x0 + R.W * u, R.z0 + depth / 2 + 2, 0]);
      else pts.push([R.x0 + R.W * u, R.z1 - depth / 2 - 2, Math.PI]);
    }
    pts.forEach((p, i) => cb(p[0], R.y0, p[1], p[2], i));
  }
  const ok = (ctx) => placer(ctx);

  const tiles = (key, a, b2, n) => ctex(key, 256, 256, (g, w, h) => { const s = w / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b2; g.fillRect(x * s, y * s, s, s); } g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2; for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, h); g.moveTo(0, k * s); g.lineTo(w, k * s); g.stroke(); } });
  const stripes = (key, a, b2) => ctex(key, 256, 256, (g, w, h) => { for (let x = 0; x < 8; x++) { g.fillStyle = x % 2 ? a : b2; g.fillRect(x * w / 8, 0, w / 8, h); } });

  const B = {};
  B.mutfak = ctx => {
    const R = room(ctx, tiles('mutfakZ', '#f2f2f2', '#2b2b2b', 4), ctex('mutfakD', 256, 256, (g, w, h) => { g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#dcefe9'; g.fillRect(0, h * 0.6, w, h * 0.4); g.strokeStyle = '#bcd9d0'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, h * 0.6); g.lineTo(x, h); g.stroke(); } }));
    const wood = M('#b07a45', { roughness: 0.6, map: ctx.TX.woodC || null }), counter = M('#e9e4dc', { roughness: 0.3 }), steel = M('#cfd5db', { metalness: 0.9, roughness: 0.25 });
    alongWalls(ctx, R, 12, 26, (x, y, z, ry, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
      if (i === 11) { g.add(box(28, R.H * 0.6, 24, M('#dfe8ee', { roughness: 0.3 }), 0, 0, 0)); g.add(box(1.2, 14, 1.2, steel, 10, R.H * 0.3, 12.5)); } // buzdolabı
      else { g.add(box(36, R.H * 0.33, 24, wood, 0, 0, 0)); g.add(box(38, 2, 26, counter, 0, R.H * 0.33, 0)); if (i % 3 === 0) for (const dx of [-8, 8]) g.add(cyl(5, 5, 1, M('#222'), dx, R.H * 0.33 + 2, 0)); if (i % 4 === 1) g.add(cyl(7, 6, 10, steel, 0, R.H * 0.33 + 2, 0)); }
      ctx.grp.add(g);
    });
    const P = ok(ctx), plateM = M('#ffffff', { roughness: 0.25 }), fruit = ['#e63946', '#ff9f1c', '#8ac926', '#ffca3a'].map(c => M(c, { roughness: 0.4 }));
    P(14, 30, Math.min(R.W, R.D) * 0.5, () => ({ h: 6, r: 9 }), (x, y, z, s, i) => {
      if (i % 2) { ctx.grp.add(cyl(9, 7, 1.2, plateM, x, y, z, 40)); ctx.grp.add(sph(3.5, fruit[i % 4], x, y + 4, z)); }
      else { ctx.grp.add(cyl(5, 4.5, 10, M(['#ff6b6b', '#4cc9f0', '#ffd166'][i % 3], { roughness: 0.3 }), x, y, z)); }
    });
  };
  B.salon = ctx => {
    const R = room(ctx, ctx.TX.woodC ? (() => { const t = ctx.TX.woodC.clone(); t.needsUpdate = true; return t; })() : null, stripes('salonD', '#efe3d0', '#e6d6bd'), '#d9b48a');
    const fabric = M('#5b6bbf', { roughness: 0.95 }), wood = M('#6b4226'), cushion = M('#f2a541', { roughness: 0.95 });
    alongWalls(ctx, R, 8, 40, (x, y, z, ry, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; const h = R.H;
      if (i % 4 === 0) { g.add(box(70, h * 0.18, 34, fabric, 0, 0, 0)); g.add(box(70, h * 0.22, 8, fabric, 0, h * 0.18, -13)); for (const sx of [-1, 1]) g.add(box(8, h * 0.26, 34, fabric, sx * 35, 0, 0)); for (const sx of [-18, 0, 18]) g.add(box(16, 6, 16, cushion, sx, h * 0.18, 4)); }
      else if (i % 4 === 1) { g.add(box(60, h * 0.16, 22, wood, 0, 0, 0)); g.add(box(56, h * 0.3, 3, M('#111', { roughness: 0.2 }), 0, h * 0.16, -4)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(52, h * 0.27), new THREE.MeshStandardMaterial({ color: col('#3a7bd5'), emissive: col('#4facfe'), emissiveIntensity: 0.8 })); scr.position.set(0, h * 0.31, -2.4); g.add(scr); }
      else if (i % 4 === 2) { g.add(box(46, h * 0.7, 16, wood, 0, 0, 0)); for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) g.add(box(4.5, h * 0.12, 10, M(['#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261'][(r + k) % 5]), -18 + k * 6, h * (0.04 + r * 0.17), 2)); }
      else { g.add(cyl(1.2, 2, h * 0.55, M('#333'), 0, 0, 0)); const sh = cone(9, 10, new THREE.MeshStandardMaterial({ color: col('#fff3d6'), emissive: col('#ffd89b'), emissiveIntensity: 0.9, side: THREE.DoubleSide }), 0, h * 0.55, 0); g.add(sh); }
      ctx.grp.add(g);
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(R.W * 0.6, R.D * 0.6), new THREE.MeshStandardMaterial({ map: ctex('hali', 256, 256, (g, w, h) => { g.fillStyle = '#8e2d3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2c14e'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); g.strokeRect(40, 40, w - 80, h - 80); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7); g.fill(); }), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(R.cx, R.y0 + 0.15, R.cz); rug.receiveShadow = true; ctx.grp.add(rug);
  };
  B.cocuk = ctx => {
    const R = room(ctx, ctex('cocukZ', 256, 256, (g, w, h) => { g.fillStyle = '#bde0fe'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc8dd'; for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 14, 0, 7); g.fill(); } }),
      ctex('cocukD', 256, 256, (g, w, h) => { g.fillStyle = '#a2d2ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (let k = 0; k < 6; k++) { const x = Math.random() * w, y = Math.random() * h; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + j * 14, y + (j % 2) * 6, 14, 0, 7); g.fill(); } } g.fillStyle = '#ffe066'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 5, 0, 7); g.fill(); } }));
    const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].map(c => M(c, { roughness: 0.4 }));
    const letter = ch => new THREE.MeshStandardMaterial({ map: ctex('harf' + ch, 128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = ['#ff595e', '#1982c4', '#8ac926'][ch.charCodeAt(0) % 3]; g.font = '900 96px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 4); }), roughness: 0.5 });
    alongWalls(ctx, R, 4, 60, (x, y, z, ry, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
      if (i === 0) { g.add(box(90, R.H * 0.12, 50, M('#f1faee'), 0, 0, 0)); g.add(box(90, 6, 50, M('#e5989b'), 0, R.H * 0.12, 0)); g.add(box(26, 8, 18, M('#ffffff'), -28, R.H * 0.12 + 6, 0)); g.add(box(8, R.H * 0.3, 50, M('#b5838d'), -45, 0, 0)); }
      else { g.add(sph(16, M('#b5651d', { roughness: 1 }), 0, 16, 0)); g.add(sph(11, M('#b5651d', { roughness: 1 }), 0, 38, 0)); for (const sx of [-1, 1]) g.add(sph(4.5, M('#8b4513'), sx * 8, 47, 0)); g.add(sph(4, M('#f5deb3'), 0, 37, 9)); }
      ctx.grp.add(g);
    });
    const P = ok(ctx), L = 'ABCÇDEFGHIJKLMNOÖPRSŞTUÜVYZ';
    P(26, 25, Math.min(R.W, R.D) * 0.5, () => ({ h: 10, r: 8 }), (x, y, z, s, i) => {
      if (i % 3 === 2) ctx.grp.add(sph(5, colors[i % 5], x, y + 5, z));
      else { const c = box(10, 10, 10, letter(L[i % L.length]), x, y, z, Math.random() * 3); ctx.grp.add(c); if (i % 4 === 0) ctx.grp.add(box(10, 10, 10, colors[(i + 2) % 5], x, y + 10, z, Math.random() * 3)); }
    });
  };
  B.banyo = ctx => {
    const R = room(ctx, tiles('banyoZ', '#7cc6de', '#2f8fb0', 8), tiles('banyoD', '#bfe6f2', '#e8f7fc', 6));
    const white = M('#fbfbfb', { roughness: 0.15 }), water = new THREE.MeshPhysicalMaterial({ color: col('#7fd3f7'), roughness: 0.05, transparent: true, opacity: 0.8, clearcoat: 1 }), chrome = M('#e8ebf0', { metalness: 1, roughness: 0.15 });
    alongWalls(ctx, R, 4, 50, (x, y, z, ry, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; const h = R.H;
      if (i === 0) { g.add(box(110, h * 0.22, 50, white, 0, 0, 0)); const w2 = new THREE.Mesh(new THREE.PlaneGeometry(100, 40), water); w2.rotation.x = -Math.PI / 2; w2.position.y = h * 0.2; g.add(w2); for (let k = 0; k < 3; k++) { g.add(sph(5, M('#ffd60a', { roughness: 0.3 }), -30 + k * 25, h * 0.2 + 3, 0)); g.add(cone(1.5, 4, M('#ff8800'), -30 + k * 25 + 5, h * 0.2 + 3, 0)); } }
      else if (i === 1) { g.add(box(50, h * 0.28, 30, white, 0, 0, 0)); g.add(cyl(1.5, 1.5, 8, chrome, 0, h * 0.28, -8)); const mir = new THREE.Mesh(new THREE.PlaneGeometry(46, h * 0.3), M('#dfe9f0', { metalness: 1, roughness: 0.02 })); mir.position.set(0, h * 0.55, -14); g.add(mir); }
      else if (i === 2) { g.add(cyl(14, 12, h * 0.14, white, 0, 0, 0, 32)); g.add(box(28, h * 0.25, 10, white, 0, 0, -15)); }
      else { for (let k = 0; k < 3; k++) g.add(box(18, h * 0.35, 3, M(['#ff8fab', '#80ed99', '#ffd166'][k], { roughness: 1 }), -22 + k * 22, h * 0.2, 0)); }
      ctx.grp.add(g);
    });
    const P = ok(ctx);
    P(20, 25, Math.min(R.W, R.D) * 0.5, () => ({ h: 12, r: 7 }), (x, y, z, s, i) => { ctx.grp.add(sph(5 + (i % 3) * 2, new THREE.MeshPhysicalMaterial({ color: col('#ffffff'), transparent: true, opacity: 0.35, roughness: 0, clearcoat: 1 }), x, y + 8 + (i % 5) * 3, z)); });
  };
  B.spor = ctx => {
    const court = ctex('saha', 1024, 512, (g, w, h) => {
      g.fillStyle = '#d9a066'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = `rgba(120,70,20,${0.05 + Math.random() * 0.08})`; g.fillRect(x, 0, 2, h); }
      g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(30, 30, w - 60, h - 60); g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 30); g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.stroke(); g.fillStyle = 'rgba(214,40,40,0.55)'; for (const x of [30, w - 210]) g.fillRect(x, h / 2 - 90, 180, 180);
      for (const [x, s] of [[30, 1], [w - 30, -1]]) { g.beginPath(); g.arc(x, h / 2, 230, -Math.PI / 2 * s, Math.PI / 2 * s, s < 0); g.stroke(); }
    });
    const R = room(ctx, court, stripes('sporD', '#e9ecef', '#dee2e6'));
    court.repeat.set(1, 1);
    const orange = M('#f77f00', { roughness: 0.5 }), seat = ['#003049', '#d62828', '#fcbf49'].map(c => M(c));
    alongWalls(ctx, R, 8, 46, (x, y, z, ry, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; const h = R.H;
      if (i % 2) { for (let st = 0; st < 6; st++) g.add(box(80, 6 + st * 6, 7, seat[st % 3], 0, 0, -18 + st * 7)); }
      else { g.add(cyl(1.5, 1.5, h * 0.55, M('#555', { metalness: 0.6 }), 0, 0, -16)); g.add(box(30, 18, 1.5, M('#ffffff', { roughness: 0.2 }), 0, h * 0.5, -14)); const ring = mesh(new THREE.TorusGeometry(6, 0.6, 8, 32), orange, 0, h * 0.47, -7); ring.rotation.x = Math.PI / 2; g.add(ring); }
      ctx.grp.add(g);
    });
    const ballTex = ctex('basket', 256, 128, (g, w, h) => { g.fillStyle = '#e8701a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2b1a0e'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 4, 0); g.lineTo(w / 4, h); g.moveTo(w * 3 / 4, 0); g.lineTo(w * 3 / 4, h); g.stroke(); });
    const P = ok(ctx);
    P(10, 25, Math.min(R.W, R.D) * 0.5, () => ({ h: 16, r: 9 }), (x, y, z) => ctx.grp.add(sph(8, new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.6 }), x, y + 8, z)));
  };

  // ---- dış mekânlar ----
  function trees(ctx, n, crown, trunk, rMin, shape) {
    const P = ok(ctx), cm = M(crown, { roughness: 0.9 }), tm = M(trunk || '#6b4423');
    const geoC = shape === 'palm' ? null : new THREE.IcosahedronGeometry(1, 1), geoT = new THREE.CylinderGeometry(0.25, 0.4, 1, 7);
    const list = [];
    P(n, rMin || 8, ctx.terr.span * 0.5, () => ({ h: 10, r: 3 }), (x, y, z) => list.push([x, y, z, 0.8 + ctx.rnd() * 0.8]));
    if (!list.length) return;
    const it = new THREE.InstancedMesh(geoT, tm, list.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), P3 = new THREE.Vector3();
    list.forEach(([x, y, z, s], i) => { S3.set(s, (shape === 'palm' ? 9 : 4) * s, s); P3.set(x, y + (shape === 'palm' ? 4.5 : 2) * s, z); M4.compose(P3, Q, S3); it.setMatrixAt(i, M4); });
    it.castShadow = true; ctx.grp.add(it);
    if (shape === 'palm') {
      const leaf = new THREE.ConeGeometry(0.6, 5, 4); leaf.translate(0, 2.5, 0); leaf.rotateZ(Math.PI / 2.4);
      const il = new THREE.InstancedMesh(leaf, cm, list.length * 6); let k = 0;
      list.forEach(([x, y, z, s]) => { for (let j = 0; j < 6; j++) { Q.setFromEuler(new THREE.Euler(0, j * Math.PI / 3, 0)); S3.set(s, s, s * 1.6); P3.set(x, y + 9 * s, z); M4.compose(P3, Q, S3); il.setMatrixAt(k++, M4); } });
      il.castShadow = true; ctx.grp.add(il);
    } else {
      const ic = new THREE.InstancedMesh(geoC, cm, list.length * 3); let k = 0;
      list.forEach(([x, y, z, s]) => { for (let j = 0; j < 3; j++) { S3.set(2.6 * s, 2.2 * s, 2.6 * s); P3.set(x + (j - 1) * 1.3 * s, y + (5 + (j % 2) * 1.5) * s, z + ((j * 7) % 3 - 1) * s); M4.compose(P3, Q, S3); ic.setMatrixAt(k++, M4); } });
      ic.castShadow = true; ctx.grp.add(ic);
    }
  }
  function buildings(ctx, n, rMin, palette, roof, hRange) {
    const P = ok(ctx);
    P(n, rMin, ctx.terr.span * 0.55, () => { const w = 14 + ctx.rnd() * 16; return { h: hRange[0] + ctx.rnd() * (hRange[1] - hRange[0]), r: w * 0.75, w }; }, (x, y, z, s, i) => {
      const c = palette[i % palette.length], tex = windowsTex('win' + c, c, '#ffe9a8', 4, 8);
      tex.repeat.set(Math.max(1, Math.round(s.w / 12)), Math.max(1, Math.round(s.h / 18)));
      const b2 = box(s.w, s.h, s.w * (0.7 + ctx.rnd() * 0.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), x, y - 0.5, z, ctx.rnd() * Math.PI);
      ctx.grp.add(b2);
      if (roof) ctx.grp.add(box(s.w * 1.05, 3, s.w * 0.9, M(roof), x, y + s.h - 0.5, z, b2.rotation.y));
    });
  }
  function water(ctx, y, tint, size) {
    const t = ctx.terr, m = new THREE.MeshPhysicalMaterial({ color: col(tint), roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.88, envMapIntensity: 1.3 });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(size || t.span * 14, size || t.span * 14), m);
    w.rotation.x = -Math.PI / 2; w.position.set(t.cx, y, t.cz); w.receiveShadow = true; ctx.grp.add(w);
    return w;
  }

  B.doga = () => { };
  B.sehir = ctx => {
    buildings(ctx, 70, 20, ['#c9d6df', '#e8d5b7', '#a3b5c9', '#d4a5a5', '#b8c4bb'], null, [25, 110]);
    const P = ok(ctx), lamp = M('#333', { metalness: 0.5 }), light = new THREE.MeshStandardMaterial({ color: col('#fff'), emissive: col('#fff1c1'), emissiveIntensity: 1.5 });
    P(40, 8, ctx.terr.span * 0.4, () => ({ h: 9, r: 1 }), (x, y, z) => { ctx.grp.add(cyl(0.2, 0.3, 9, lamp, x, y, z, 8)); ctx.grp.add(sph(0.6, light, x, y + 9, z)); });
    P(40, 8, ctx.terr.span * 0.4, () => ({ h: 3, r: 3 }), (x, y, z, s, i) => { const c = new THREE.Group(); c.add(box(4.5, 1.4, 2.2, M(['#e63946', '#1d3557', '#ffb703', '#f1faee'][i % 4], { metalness: 0.4, roughness: 0.3 }), 0, 0.4, 0)); c.add(box(2.6, 1, 2, M('#9fb4c7', { metalness: 0.5, roughness: 0.1 }), -0.2, 1.8, 0)); c.position.set(x, y, z); c.rotation.y = ctx.rnd() * 6; ctx.grp.add(c); });
  };
  B.paris = ctx => {
    buildings(ctx, 55, 30, ['#e8dcc4', '#efe6d2', '#dcd0b6'], '#5d6b78', [18, 32]);
    // Eyfel kulesi
    const t = ctx.terr, x = t.cx + t.span * 0.33, z = t.cz - t.span * 0.2, y = t.height(x, z), iron = M('#7b5b3e', { metalness: 0.6, roughness: 0.5 }), H = 150, g = new THREE.Group();
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.5, H * 0.45, 6), iron); leg.position.set(sx * 14, H * 0.2, sz * 14); leg.rotation.set(sz * 0.33, 0, -sx * 0.33); g.add(leg); }
    g.add(box(30, 3, 30, iron, 0, H * 0.27, 0)); const mid = new THREE.Mesh(new THREE.CylinderGeometry(3, 11, H * 0.35, 4), iron); mid.position.y = H * 0.45; g.add(mid);
    g.add(box(10, 2.5, 10, iron, 0, H * 0.62, 0)); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3, H * 0.35, 4), iron); top.position.y = H * 0.8; g.add(top);
    g.position.set(x, y, z); g.traverse(o => o.castShadow = true); ctx.grp.add(g);
    trees(ctx, 60, '#5f8f4e', '#5a4030', 10);
  };
  B.venedik = ctx => {
    water(ctx, ctx.track.groundY + 0.5, '#2f7f8f');
    buildings(ctx, 60, 22, ['#e07a5f', '#f2cc8f', '#d4a373', '#e9c46a', '#c9ada7'], '#9c5a3c', [14, 30]);
    const P = ok(ctx), black = M('#151515', { roughness: 0.3 }), gond = [];
    P(14, 10, ctx.terr.span * 0.4, () => ({ h: 2, r: 5 }), (x, y, z) => { const g = new THREE.Group(); const hull = box(10, 1.2, 1.8, black, 0, 0, 0); g.add(hull); g.add(box(0.4, 3, 0.4, black, 4.8, 0.8, 0)); g.position.set(x, ctx.track.groundY + 0.4, z); g.rotation.y = ctx.rnd() * 6; ctx.grp.add(g); gond.push(g); });
    ctx.updaters.push(tt => gond.forEach((g, i) => { g.position.y = ctx.track.groundY + 0.4 + Math.sin(tt * 1.2 + i) * 0.15; g.rotation.z = Math.sin(tt + i) * 0.04; }));
  };
  B.park = ctx => {
    trees(ctx, 160, '#5e9e4a', '#6b4423', 8);
    const P = ok(ctx), red = M('#e63946', { roughness: 0.4 }), blue = M('#3a86ff', { roughness: 0.4 }), yel = M('#ffbe0b', { roughness: 0.4 }), sand = M('#e9d8a6', { roughness: 1 });
    P(14, 10, ctx.terr.span * 0.4, () => ({ h: 9, r: 7 }), (x, y, z, s, i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ctx.rnd() * 6;
      if (i % 4 === 0) { g.add(box(3, 7, 3, blue, -5, 0, 0)); const sl = box(2.5, 0.4, 10, yel, 0, 3.2, 0); sl.rotation.x = 0.55; sl.position.set(0, 3.5, 3.5); g.add(sl); }
      else if (i % 4 === 1) { for (const sx of [-5, 5]) { const a = cyl(0.25, 0.25, 7, red, sx, 0, 0, 8); a.rotation.z = 0.12 * Math.sign(sx); g.add(a); } g.add(box(10.5, 0.4, 0.4, red, 0, 6.8, 0)); for (const sx of [-2, 2]) { g.add(box(1.6, 0.3, 0.8, yel, sx, 2, 0)); } }
      else if (i % 4 === 2) g.add(box(9, 0.8, 9, sand, 0, 0, 0));
      else { g.add(box(6, 0.4, 1.6, M('#8d6e63'), 0, 1.4, 0)); for (const sx of [-2.5, 2.5]) g.add(box(0.3, 1.4, 1.4, M('#333'), sx, 0, 0)); }
      ctx.grp.add(g);
    });
  };
  B.lunapark = ctx => {
    const t = ctx.terr, gy = ctx.track.groundY;
    // dönme dolap
    const wheel = new THREE.Group(), R = 45, wx = t.cx + t.span * 0.35, wz = t.cz + t.span * 0.1, wy = t.height(wx, wz);
    const rimM = new THREE.MeshStandardMaterial({ color: col('#ffffff'), emissive: col('#ff4fd8'), emissiveIntensity: 0.6, metalness: 0.4 });
    for (const dz of [-3, 3]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.6, 8, 64), rimM); rim.position.z = dz; wheel.add(rim); }
    for (let k = 0; k < 16; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, R * 2, 0.4), rimM); sp.rotation.z = k * Math.PI / 16; wheel.add(sp); }
    const cabins = [];
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, c = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 5), M(['#ff006e', '#ffbe0b', '#3a86ff', '#8ac926'][k % 4], { roughness: 0.4 })); c.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); wheel.add(c); cabins.push(c); }
    wheel.position.set(wx, wy + R + 6, wz); wheel.rotation.y = 0.6; ctx.grp.add(wheel);
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, R + 8, 8), M('#888', { metalness: 0.6 })); leg.position.set(wx + sx * 12 * Math.cos(0.6), wy + (R + 8) / 2, wz - sx * 12 * Math.sin(0.6)); leg.rotation.z = sx * 0.25; ctx.grp.add(leg); }
    // atlıkarınca
    const car = new THREE.Group(), cx = t.cx - t.span * 0.3, cz = t.cz + t.span * 0.25, cy = t.height(cx, cz);
    car.add(cyl(14, 14, 1.5, M('#f1faee'), 0, 0, 0, 40)); car.add(cone(16, 8, new THREE.MeshStandardMaterial({ map: stripes('cadir', '#e63946', '#ffffff'), roughness: 0.6 }), 0, 11, 0, 24));
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; car.add(cyl(0.2, 0.2, 10, M('#ffd166', { metalness: 0.8, roughness: 0.2 }), Math.cos(a) * 10, 1.5, Math.sin(a) * 10, 8)); car.add(box(1.4, 2.4, 3.5, M(['#ffffff', '#ffafcc', '#bde0fe'][k % 3]), Math.cos(a) * 10, 3.5 + (k % 2), Math.sin(a) * 10, -a)); }
    car.position.set(cx, cy, cz); ctx.grp.add(car);
    // çadırlar ve ışık zincirleri
    const P = ok(ctx), bulbs = [];
    P(16, 18, t.span * 0.45, () => ({ h: 14, r: 8 }), (x, y, z, s, i) => { ctx.grp.add(cyl(7, 7, 6, M(['#ffbe0b', '#8338ec', '#3a86ff'][i % 3]), x, y, z, 16)); ctx.grp.add(cone(8, 7, new THREE.MeshStandardMaterial({ map: stripes('cadir' + i % 2, i % 2 ? '#ff006e' : '#3a86ff', '#ffffff'), roughness: 0.6 }), x, y + 6, z, 16)); });
    const bm = ['#ff006e', '#ffbe0b', '#3a86ff', '#8ac926'].map(c => new THREE.MeshStandardMaterial({ color: col(c), emissive: col(c), emissiveIntensity: 2.2 }));
    P(260, 6, t.span * 0.4, () => ({ h: 7, r: 0.5 }), (x, y, z, s, i) => { const b2 = sph(0.35, bm[i % 4], x, y + 6 + Math.sin(i) * 0.8, z); b2.castShadow = false; ctx.grp.add(b2); bulbs.push(b2); });
    ctx.updaters.push(tt => { wheel.rotation.z = tt * 0.12; cabins.forEach(c => c.rotation.z = -wheel.rotation.z); car.rotation.y = tt * 0.5; });
  };
  B.kapadokya = ctx => {
    const P = ok(ctx), stone = M('#e0b98c', { roughness: 0.95, map: ctx.TX.rockC || null }), capM = M('#8c6a4f', { roughness: 0.95 });
    P(90, 14, ctx.terr.span * 0.55, () => { const h = 10 + ctx.rnd() * 26; return { h, r: h * 0.25 }; }, (x, y, z, s) => { ctx.grp.add(cone(s.h * 0.22, s.h, stone, x, y - 1, z, 14)); ctx.grp.add(cone(s.h * 0.12, s.h * 0.22, capM, x, y + s.h - 1.5, z, 12)); });
    const balloons = [], bc = ['#e63946', '#ffb703', '#2a9d8f', '#8338ec', '#fb5607', '#3a86ff'];
    for (let k = 0; k < 14; k++) {
      const g = new THREE.Group(), a = ctx.rnd() * 6.28, r = 40 + ctx.rnd() * ctx.terr.span * 0.4;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshStandardMaterial({ map: stripes('balon' + k % 3, bc[k % 6], bc[(k + 2) % 6]), roughness: 0.6 })));
      g.children[0].scale.y = 1.25; g.add(box(2.5, 2, 2.5, M('#7a5230'), 0, -12, 0));
      g.position.set(ctx.terr.cx + Math.cos(a) * r, ctx.track.bounds.maxY + 10 + ctx.rnd() * 40, ctx.terr.cz + Math.sin(a) * r); ctx.grp.add(g); balloons.push([g, g.position.y, ctx.rnd() * 6]);
    }
    ctx.updaters.push(tt => balloons.forEach(([g, y0, ph]) => { g.position.y = y0 + Math.sin(tt * 0.3 + ph) * 3; g.position.x += 0.004; }));
  };
  B.pamukkale = ctx => {
    const P = ok(ctx), white = M('#f7f4ee', { roughness: 0.6 }), wat = new THREE.MeshPhysicalMaterial({ color: col('#5fd4e8'), roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
    P(60, 14, ctx.terr.span * 0.5, () => ({ h: 4, r: 9 }), (x, y, z, s, i) => {
      for (let k = 0; k < 3; k++) { const r = 9 - k * 2.5; ctx.grp.add(cyl(r, r + 0.6, 1.4, white, x, y + k * 1.4 - 0.4, z, 24)); const w2 = new THREE.Mesh(new THREE.CircleGeometry(r - 0.4, 24), wat); w2.rotation.x = -Math.PI / 2; w2.position.set(x, y + k * 1.4 + 1.02, z); ctx.grp.add(w2); }
    });
    trees(ctx, 30, '#6f9e5a', '#6b4423', 20);
  };
  B.misir = ctx => {
    const t = ctx.terr, stone = M('#d9b77a', { roughness: 0.95 });
    for (let k = 0; k < 3; k++) { const s = [120, 90, 60][k], a = 0.5 + k * 0.4, r = t.span * (0.45 + k * 0.05), x = t.cx + Math.cos(a) * r, z = t.cz + Math.sin(a) * r; const p = cone(s * 0.75, s, stone, x, t.height(x, z) - 2, z, 4); p.rotation.y = Math.PI / 4; ctx.grp.add(p); }
    const sx = t.cx - t.span * 0.3, sz = t.cz + t.span * 0.3, sy = t.height(sx, sz), sph2 = new THREE.Group();
    sph2.add(box(30, 10, 12, stone, 0, 0, 0)); sph2.add(box(9, 16, 10, stone, 14, 0, 0)); sph2.add(box(8, 7, 9, M('#cfa968'), 16, 13, 0)); sph2.position.set(sx, sy, sz); ctx.grp.add(sph2);
    trees(ctx, 50, '#5c8d3a', '#8a6a3b', 20, 'palm');
    const P = ok(ctx); P(8, 30, t.span * 0.4, () => ({ h: 24, r: 2 }), (x, y, z) => ctx.grp.add(cone(1.8, 24, stone, x, y, z, 4)));
  };
  B.japon = ctx => {
    const t = ctx.terr, P = ok(ctx), red = M('#c1121f', { roughness: 0.5 }), dark = M('#2b2d42');
    trees(ctx, 120, '#ffafcc', '#5a3d2b', 8);
    P(6, 16, t.span * 0.4, () => ({ h: 12, r: 6 }), (x, y, z) => { for (const sx of [-4, 4]) ctx.grp.add(cyl(0.5, 0.6, 10, red, x + sx, y, z, 10)); ctx.grp.add(box(12, 1, 1.4, dark, x, y + 10, z)); ctx.grp.add(box(10, 0.7, 1, red, x, y + 8.4, z)); });
    // pagoda
    const px = t.cx + t.span * 0.3, pz = t.cz - t.span * 0.25, py = t.height(px, pz), pg = new THREE.Group();
    for (let k = 0; k < 5; k++) { const s = 16 - k * 2.4; pg.add(box(s * 0.6, 6, s * 0.6, M('#f1e3c8'), 0, k * 8, 0)); const rf = cone(s * 0.75, 3, dark, 0, k * 8 + 6, 0, 4); rf.rotation.y = Math.PI / 4; pg.add(rf); }
    pg.position.set(px, py, pz); ctx.grp.add(pg);
    // Fuji dağı
    const fx = t.cx - t.span * 1.3, fz = t.cz - t.span * 1.1; ctx.grp.add(cone(260, 230, M('#6c7a96', { roughness: 1 }), fx, t.height(t.cx, t.cz) - 10, fz, 48)); ctx.grp.add(cone(80, 70, M('#ffffff', { roughness: 0.8 }), fx, t.height(t.cx, t.cz) + 150, fz, 48));
    P(30, 10, t.span * 0.45, () => ({ h: 3, r: 1 }), (x, y, z) => { ctx.grp.add(box(1.2, 2, 1.2, M('#9a9a9a'), x, y, z)); ctx.grp.add(cone(1.5, 1, M('#7a7a7a'), x, y + 2, z, 4)); });
  };
  B.kutup = ctx => {
    const P = ok(ctx), ice = new THREE.MeshPhysicalMaterial({ color: col('#bfe6ff'), roughness: 0.1, transparent: true, opacity: 0.85, clearcoat: 1 }), snow = M('#ffffff', { roughness: 0.8 });
    P(60, 12, ctx.terr.span * 0.5, () => { const h = 6 + ctx.rnd() * 22; return { h, r: h * 0.3 }; }, (x, y, z, s) => ctx.grp.add(cone(s.h * 0.3, s.h, ice, x, y - 0.5, z, 6)));
    P(14, 10, ctx.terr.span * 0.4, () => ({ h: 5, r: 5 }), (x, y, z) => { const ig = mesh(new THREE.SphereGeometry(5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), snow, x, y - 0.3, z); ctx.grp.add(ig); ctx.grp.add(box(2.4, 2.4, 3, M('#2b2d42'), x + 4.5, y, z)); });
    P(40, 8, ctx.terr.span * 0.35, () => ({ h: 2, r: 1 }), (x, y, z) => { ctx.grp.add(sph(0.7, M('#111'), x, y + 0.9, z)); ctx.grp.add(sph(0.5, M('#fff'), x, y + 0.9, z + 0.3)); ctx.grp.add(cone(0.15, 0.4, M('#ff9f1c'), x, y + 1.3, z + 0.65)); });
    // kuzey ışıkları
    const aur = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.PlaneGeometry(500, 80, 40, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / 60 + k) * 40);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col(['#3cffa0', '#7b5cff', '#2ee6d6', '#a0ff6a'][k]), transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      m.position.set(ctx.terr.cx, ctx.track.bounds.maxY + 140 + k * 15, ctx.terr.cz - 250 - k * 40); m.rotation.x = -0.2; ctx.grp.add(m); aur.push(m);
    }
    ctx.updaters.push(tt => aur.forEach((m, k) => { m.material.opacity = 0.18 + 0.12 * Math.sin(tt * 0.5 + k); m.position.x = ctx.terr.cx + Math.sin(tt * 0.1 + k) * 30; }));
  };
  B.tropik = ctx => {
    const t = ctx.terr; water(ctx, ctx.track.groundY + 0.6, '#19b3c4');
    // ada: parkurun altında kum
    const isl = new THREE.Mesh(new THREE.CircleGeometry(Math.max(t.span * 0.36, 80), 64), new THREE.MeshStandardMaterial({ map: Cevre.groundTexture('kum'), roughness: 1 }));
    isl.material.map.repeat.set(20, 20); isl.rotation.x = -Math.PI / 2; isl.position.set(t.cx, ctx.track.groundY + 0.9, t.cz); isl.receiveShadow = true; ctx.grp.add(isl);
    trees(ctx, 90, '#3f8f3a', '#9a7148', 8, 'palm');
    const P = ok(ctx);
    P(16, 10, t.span * 0.3, () => ({ h: 6, r: 3 }), (x, y, z, s, i) => { ctx.grp.add(cyl(0.12, 0.12, 5, M('#eee'), x, ctx.track.groundY + 0.9, z, 6)); ctx.grp.add(cone(3.2, 1.6, new THREE.MeshStandardMaterial({ map: stripes('semsiye' + i % 2, i % 2 ? '#ff006e' : '#ffbe0b', '#ffffff') }), x, ctx.track.groundY + 5, z, 12)); });
  };
  B.kanyon = ctx => {
    const P = ok(ctx), red = M('#b5532f', { roughness: 0.95, map: ctx.TX.rockC || null }), cact = M('#4f7942', { roughness: 0.8 });
    P(30, 30, ctx.terr.span * 0.6, () => { const h = 20 + ctx.rnd() * 40; return { h, r: 12 + ctx.rnd() * 10 }; }, (x, y, z, s) => ctx.grp.add(cyl(s.r * 0.8, s.r, s.h, red, x, y - 2, z, 9)));
    P(60, 8, ctx.terr.span * 0.4, () => ({ h: 6, r: 1.5 }), (x, y, z) => { ctx.grp.add(cyl(0.6, 0.7, 6, cact, x, y, z, 10)); ctx.grp.add(cyl(0.4, 0.4, 2.5, cact, x + 1, y + 2.5, z, 8)); });
  };
  B.volkan = ctx => {
    const t = ctx.terr, lava = new THREE.MeshStandardMaterial({ color: col('#ff5400'), emissive: col('#ff3d00'), emissiveIntensity: 2.2, roughness: 0.6 });
    const vx = t.cx - t.span * 0.9, vz = t.cz - t.span * 0.6, vy = t.height(t.cx, t.cz);
    ctx.grp.add(cone(220, 180, M('#3b2620', { roughness: 1, map: ctx.TX.rockC || null }), vx, vy - 5, vz, 40));
    const crater = mesh(new THREE.CircleGeometry(40, 32), lava, vx, vy + 165, vz); crater.rotation.x = -Math.PI / 2; ctx.grp.add(crater);
    const P = ok(ctx); P(24, 12, t.span * 0.45, () => ({ h: 0.5, r: 6 }), (x, y, z) => { const l = mesh(new THREE.CircleGeometry(3 + ctx.rnd() * 5, 16), lava, x, y + 0.2, z); l.rotation.x = -Math.PI / 2; ctx.grp.add(l); });
    const smoke = []; for (let k = 0; k < 10; k++) { const s = sph(20 + k * 4, new THREE.MeshStandardMaterial({ color: col('#555'), transparent: true, opacity: 0.25, depthWrite: false }), vx + (k % 3) * 10, vy + 190 + k * 18, vz); s.castShadow = false; ctx.grp.add(s); smoke.push(s); }
    ctx.updaters.push(tt => { crater.material.emissiveIntensity = 1.8 + Math.sin(tt * 2) * 0.5; smoke.forEach((s, k) => s.position.x = vx + Math.sin(tt * 0.2 + k) * 12); });
  };
  B.uzay = ctx => {
    const t = ctx.terr, N = 4000, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3), rnd = MP.rng(42);
    for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 1800, q = Math.sqrt(1 - u * u); sp[i * 3] = Math.cos(a) * q * r; sp[i * 3 + 1] = Math.abs(u) * r * 0.9 + 50; sp[i * 3 + 2] = Math.sin(a) * q * r; const w = 0.6 + rnd() * 0.4; sc[i * 3] = w; sc[i * 3 + 1] = w; sc[i * 3 + 2] = w; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false })); stars.position.set(t.cx, 0, t.cz); ctx.grp.add(stars);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(160, 48, 32), new THREE.MeshStandardMaterial({ color: col('#7b5cff'), emissive: col('#2a1a66'), emissiveIntensity: 0.6, roughness: 0.9, fog: false }));
    planet.position.set(t.cx - 900, 500, t.cz - 1100); ctx.grp.add(planet);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(200, 290, 64), new THREE.MeshBasicMaterial({ color: col('#d9c3ff'), transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false })); ringM.position.copy(planet.position); ringM.rotation.x = 1.2; ctx.grp.add(ringM);
    const rocks = [], rm = M('#6d6a75', { roughness: 1, map: ctx.TX.rockC || null });
    for (let k = 0; k < 30; k++) { const r2 = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rnd() * 6, 1), rm); r2.position.set(t.cx + (rnd() - 0.5) * t.span, ctx.track.bounds.maxY + 20 + rnd() * 60, t.cz + (rnd() - 0.5) * t.span); ctx.grp.add(r2); rocks.push(r2); }
    ctx.updaters.push(tt => rocks.forEach((r2, k) => { r2.rotation.x = tt * 0.1 + k; r2.rotation.y = tt * 0.13 + k; }));
  };

  Cevre.build = function (env, ctx) { (B[env] || B.doga)(ctx); };
})();
