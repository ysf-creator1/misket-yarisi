/* Misket Yarışı — grafik (three.js r128)
 * Gerçekçi görüntü: HDR gökyüzü fotoğrafından ışık ve yansıma, fotoğraf dokuları (Poly Haven, CC0),
 * yumuşak gölgeler, tepeli arazi, uzak dağlar, ağaçlar ve kayalar.
 * Misket görünümü (renk, desen, forma, şapka, gözlük, iz) ve güç efektleri de buradadır.
 */
(function () {
  'use strict';
  const { THREE, MP } = window;
  const V = MP.v;
  const Grafik = window.Grafik = {};
  const col = c => new THREE.Color(c).convertSRGBToLinear();
  Grafik.col = col;

  // ================= ÇİZİCİ =================
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.physicallyCorrectLights = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);
  Grafik.renderer = renderer; Grafik.scene = scene; Grafik.camera = camera;

  // telefon/tablet: dokunmatik ekran veya küçük ekran → varsayılan "düşük" grafik ve dokunmatik düzen
  const MOBIL = window.MOBIL = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
  if (MOBIL) document.documentElement.classList.add('mobil');
  let quality = 'yuksek';
  const KALITE = { yuksek: { pr: 2, sh: 4096, k: 1 }, orta: { pr: 1, sh: 2048, k: 0.5 }, dusuk: { pr: 1.5, sh: 1024, k: 0.28 } };
  function applyQuality() {
    const q = KALITE[quality];
    renderer.setPixelRatio(Math.min(q.pr, window.devicePixelRatio || 1));
    sun.shadow.mapSize.set(q.sh, q.sh);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }
  Grafik.QUALITIES = ['yuksek', 'orta', 'dusuk'];
  Grafik.quality = () => quality;
  Grafik.setQuality = q => { quality = KALITE[q] ? q : (MOBIL ? 'dusuk' : 'yuksek'); applyQuality(); };
  // dikey ekranda görüş açısı genişler (yatayda neyse dikeyde de yaklaşık o kadar yan görünsün)
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? Math.min(80, 58 / Math.max(0.55, w / h) * 0.75) : 58; camera.updateProjectionMatrix(); }
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  addEventListener('resize', resize);

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 0.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.8);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  const sunDir = new THREE.Vector3(0.45, 0.75, 0.35).normalize();
  Grafik.sun = sun;
  applyQuality();

  // güneşi kameranın baktığı yere göre konumla (gölgeler hep netin içinde kalsın)
  Grafik.aimSun = function (target) {
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(sunDir, 120);
  };

  // ================= DOKULAR =================
  const D = window.MISKET_DOKU || {};
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const texLoader = new THREE.TextureLoader();
  function imgTex(key, srgb, rep) {
    if (!D[key]) return null;
    const t = texLoader.load(D[key]);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  const TX = {};
  function loadTextures() {
    TX.woodC = imgTex('ahsapRenk', true); TX.woodN = imgTex('ahsapNormal'); TX.woodR = imgTex('ahsapPuruz');
    for (const t of [TX.woodC, TX.woodN, TX.woodR]) if (t) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(0.5, 1.5); }
    TX.grassC = imgTex('cimenRenk', true); TX.grassN = imgTex('cimenNormal');
    TX.concC = imgTex('betonRenk', true, [1, 6]); TX.concN = imgTex('betonNormal', false, [1, 6]);
    TX.rockC = imgTex('kayaRenk', true); TX.rockN = imgTex('kayaNormal');
  }
  function canvasTex(w, h, draw, srgb = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso); return t;
  }
  Grafik.canvasTex = canvasTex;

  // ================= GÖKYÜZÜ (HDR) =================
  let envTex = null, skyTex = null, fogColor = new THREE.Color(0xb8c9dc);
  function halfToFloat(h) {
    const s = (h & 0x8000) >> 15, e = (h & 0x7C00) >> 10, f = h & 0x03FF;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    if (e === 0x1F) return f ? NaN : (s ? -1 : 1) * Infinity;
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
  }
  function base64ToBlobUrl(b64) {
    const bin = atob(b64), n = bin.length, u8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: 'application/octet-stream' }));
  }
  // HDR'deki en parlak noktayı (güneşi) bul: ışığı ve gölgeleri gökyüzüyle aynı yöne koy
  function findSun(tex) {
    const img = tex.image, W = img.width, H = img.height, d = img.data, ch = d.length / (W * H);
    let best = -1, bx = 0, by = 0, hr = 0, hg = 0, hb = 0, hn = 0;
    for (let y = 0; y < H / 2; y += 2) for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * ch, l = halfToFloat(d[i]) + halfToFloat(d[i + 1]) + halfToFloat(d[i + 2]);
      if (l > best) { best = l; bx = x; by = y; }
    }
    for (let x = 0; x < W; x += 4) { // ufuk rengi (sis için)
      const y = Math.floor(H * 0.47), i = (y * W + x) * ch;
      hr += halfToFloat(d[i]); hg += halfToFloat(d[i + 1]); hb += halfToFloat(d[i + 2]); hn++;
    }
    const u = (bx + 0.5) / W, v = 1 - (by + 0.5) / H;
    const phi = (u - 0.5) * 2 * Math.PI, lat = (v - 0.5) * Math.PI;
    const dir = new THREE.Vector3(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat));
    if (dir.y < 0.25) { dir.y = 0.25; }
    sunDir.copy(dir.normalize());
    const m = Math.max(hr, hg, hb) / hn || 1;
    fogColor = new THREE.Color(hr / hn / m, hg / hn / m, hb / hn / m).multiplyScalar(0.82);
  }
  Grafik.init = function () {
    loadTextures();
    return new Promise(resolve => {
      if (!D.gokyuzu || !THREE.RGBELoader) { envFallback(); resolve(); return; }
      const url = base64ToBlobUrl(D.gokyuzu);
      new THREE.RGBELoader().setDataType(THREE.HalfFloatType).load(url, tex => {
        try { findSun(tex); } catch (e) { }
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const pm = new THREE.PMREMGenerator(renderer);
        envTex = pm.fromEquirectangular(tex).texture; pm.dispose();
        skyTex = tex;
        scene.environment = envTex; scene.background = skyTex;
        URL.revokeObjectURL(url);
        resolve();
      }, undefined, () => { envFallback(); resolve(); });
    });
  };
  function envFallback() { // doku dosyası yoksa basit gökyüzü
    scene.background = col('#8fc8ff');
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.background = new THREE.Color(0x9fd0ff); envTex = pm.fromScene(es).texture; pm.dispose(); scene.environment = envTex;
  }

  // ================= MALZEMELER =================
  const matCache = {};
  let trackStyle = 'tahta';
  function trackMat(c) {
    const k = 'track' + trackStyle + c; if (matCache[k]) return matCache[k];
    if (trackStyle === 'metal') return (matCache[k] = new THREE.MeshPhysicalMaterial({ color: col(c), metalness: 0.65, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide, envMapIntensity: 1.1 }));
    if (trackStyle === 'cam') return (matCache[k] = new THREE.MeshPhysicalMaterial({ color: col(c), roughness: 0.06, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.72, side: THREE.DoubleSide, envMapIntensity: 1.3 }));
    if (trackStyle === 'buz') return (matCache[k] = new THREE.MeshPhysicalMaterial({ color: col(c).lerp(new THREE.Color(0xdff4ff), 0.55), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.85, side: THREE.DoubleSide, envMapIntensity: 1.4 }));
    return (matCache[k] = new THREE.MeshPhysicalMaterial({
      color: col(c), roughness: 0.5, roughnessMap: TX.woodR, normalMap: TX.woodN, normalScale: new THREE.Vector2(0.35, 0.35),
      clearcoat: 0.7, clearcoatRoughness: 0.18, side: THREE.DoubleSide, envMapIntensity: 0.9,
    }));
  }
  const chevronTex = () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#20232b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (const y of [10, 74]) { g.beginPath(); g.moveTo(24, y + 40); g.lineTo(64, y); g.lineTo(104, y + 40); g.lineTo(104, y + 52); g.lineTo(64, y + 14); g.lineTo(24, y + 52); g.closePath(); g.fill(); } });
  const hazardTex = () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffd60a'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161b'; for (let k = -2; k < 6; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 16, 0); g.lineTo(k * 32 + 16 + h, h); g.lineTo(k * 32 + h, h); g.closePath(); g.fill(); } });
  const M = {};
  function makeMats() {
    M.chrome = new THREE.MeshStandardMaterial({ color: col('#e8ebf0'), metalness: 1, roughness: 0.16 });
    M.rubber = new THREE.MeshStandardMaterial({ color: col('#262833'), roughness: 0.62, metalness: 0 });
    M.ring = new THREE.MeshStandardMaterial({ color: col('#ff3d6e'), roughness: 0.4, emissive: col('#ff3d6e'), emissiveIntensity: 0.15 });
    M.woodNat = new THREE.MeshPhysicalMaterial({ map: TX.woodC, normalMap: TX.woodN, roughnessMap: TX.woodR, roughness: 0.6, clearcoat: 0.4, clearcoatRoughness: 0.3 });
    M.paintMetal = c => new THREE.MeshStandardMaterial({ color: col(c), metalness: 0.55, roughness: 0.32 });
    M.glass = new THREE.MeshPhysicalMaterial({ color: col('#e6f3ff'), roughness: 0.04, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
    M.concrete = new THREE.MeshStandardMaterial({ color: col('#c9c6bf'), map: TX.concC, normalMap: TX.concN, roughness: 0.85 });
    M.steel = new THREE.MeshStandardMaterial({ color: col('#9aa3ad'), metalness: 0.9, roughness: 0.35 });
    M.dark = new THREE.MeshStandardMaterial({ color: col('#20232b'), metalness: 0.6, roughness: 0.4 });
    M.pad = new THREE.MeshPhysicalMaterial({ color: col('#ff2d6f'), roughness: 0.35, clearcoat: 0.6 });
    M.gate = new THREE.MeshPhysicalMaterial({ color: col('#ff4d6d'), roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.75 });
  }

  // ================= ARAZİ =================
  // tekrarlanabilir değer gürültüsü
  function makeNoise(seed) {
    const rnd = MP.rng(seed), P = new Float32Array(512);
    for (let i = 0; i < 512; i++) P[i] = rnd();
    const h = (x, y) => P[((x * 73856093) ^ (y * 19349663)) & 511];
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
    };
    return (x, y, oct = 4) => { let a = 0, f = 1, amp = 1, s = 0; for (let i = 0; i < oct; i++) { a += n(x * f, y * f) * amp; s += amp; f *= 2.03; amp *= 0.5; } return a / s; };
  }
  // parkurun her noktasına yatay uzaklık ızgarası (arazi yüksekliği için)
  function distField(track, x0, z0, size, N) {
    const S = track.samples.filter((s, i) => i % 3 === 0), cell = size / N, Dm = new Float32Array((N + 1) * (N + 1));
    const zones = track.zones;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = x0 + i * cell, z = z0 + j * cell; let d = 1e9;
      for (const s of S) { const dx = s.p[0] - x, dz = s.p[2] - z, q = dx * dx + dz * dz; if (q < d) d = q; }
      for (const zn of zones) { const q = Math.max(0, Math.hypot(zn.c[0] - x, zn.c[2] - z) - zn.R); d = Math.min(d, q * q); }
      Dm[j * (N + 1) + i] = Math.sqrt(d);
    }
    return { at(x, z) { const fi = V.clamp((x - x0) / cell, 0, N), fj = V.clamp((z - z0) / cell, 0, N); const i = Math.min(N - 1, Math.floor(fi)), j = Math.min(N - 1, Math.floor(fj)); const u = fi - i, v = fj - j; const g = (a, b) => Dm[b * (N + 1) + a]; return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v; } };
  }
  function buildTerrain(track, grp, theme) {
    const b = track.bounds, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 240, x0 = cx - span / 2, z0 = cz - span / 2;
    const noise = makeNoise((track.id || 1) * 131 + 7), df = distField(track, x0, z0, span, 70);
    const g0 = track.groundY, hill = theme.hills != null ? theme.hills : 1;
    if (theme.ground === 'yok') return { height: () => g0, df, cx, cz, span }; // ev odaları: zemini oda kurar
    const height = (x, z) => {
      const d = df.at(x, z), n = noise(x * 0.012, z * 0.012, 5);
      const near = (n - 0.5) * 2.0;                         // parkurun altı: hafif dalgalı
      const far = V.smooth((d - 14) / 90) * (n * 46 + 8) * hill; // uzaklaştıkça tepeler
      return g0 + near + far;
    };
    const N = quality === 'yuksek' ? 200 : quality === 'orta' ? 120 : 70, geo = new THREE.PlaneGeometry(span, span, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx, z = pos.getZ(i) + cz;
      pos.setXYZ(i, x, height(x, z), z); uv.setXY(i, x / 9, z / 9);
    }
    geo.computeVertexNormals();
    const kind = theme.ground || 'cimen';
    const base = kind === 'cimen' ? TX.grassC : kind === 'kaya' ? TX.rockC : (window.Cevre && Cevre.groundTexture(kind === 'su' ? 'kum' : kind)) || TX.grassC;
    const gc = base && base.clone(), gn = (kind === 'kaya' ? TX.rockN : TX.grassN), gn2 = gn && gn.clone();
    if (gc) gc.needsUpdate = true; if (gn2) gn2.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: col(theme.tint || '#b7c99a'), map: gc, normalMap: kind === 'kar' || kind === 'beyaz' ? null : gn2, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.95 });
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; grp.add(mesh);
    if (!theme.mountains) return { height, df, cx, cz, span };
    // uzak dağlar (ufku kapatır)
    const R0 = span * 0.62, R1 = span * 2.6, mg = new THREE.RingGeometry(R0, R1, 128, 12);
    mg.rotateX(-Math.PI / 2);
    const mp = mg.attributes.position, muv = mg.attributes.uv;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), z = mp.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
      const t = (r - R0) / (R1 - R0), ridge = Math.pow(noise(Math.cos(a) * 3 + 40, Math.sin(a) * 3 + 40, 5), 1.6);
      const hgt = (Math.sin(Math.PI * Math.min(1, t * 1.6)) * 0.6 + 0.4) * (60 + ridge * 260) * hill * (t < 0.04 ? t / 0.04 : 1);
      mp.setXYZ(i, x + cx, g0 + 6 + hgt, z + cz); muv.setXY(i, (x + cx) / 60, (z + cz) / 60);
    }
    mg.computeVertexNormals();
    const snowy = theme.ground === 'kar' || theme.ground === 'beyaz';
    const rc = snowy && window.Cevre ? Cevre.groundTexture(theme.ground) : TX.rockC && TX.rockC.clone(); if (rc) { rc.needsUpdate = true; if (snowy) rc.repeat.set(1, 1); }
    const mm = new THREE.MeshStandardMaterial({ color: col(theme.mountains || '#8f9a86'), map: rc, roughness: 1 });
    grp.add(new THREE.Mesh(mg, mm));
    return { height, df, cx, cz, span };
  }

  // gerçekçi çam ağacı: gövde + titreşimli katmanlar (tek geometride birleşik, renkler köşe rengi)
  function pineGeometry(rnd) {
    const parts = [];
    const trunk = new THREE.CylinderGeometry(0.14, 0.26, 2.4, 7); trunk.translate(0, 1.2, 0); parts.push([trunk, '#5b3f2a']);
    const layers = 5;
    for (let k = 0; k < layers; k++) {
      const r = 1.9 - k * 0.32, h = 2.2 - k * 0.18, y = 1.5 + k * 1.05;
      const c = new THREE.ConeGeometry(r, h, 9, 2, true); c.translate(0, y + h / 2, 0);
      const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) { const j = 1 + (rnd() - 0.5) * 0.28; p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); p.setY(i, p.getY(i) + (rnd() - 0.5) * 0.15); }
      parts.push([c, k % 2 ? '#2d5a2e' : '#26502a']);
    }
    let total = 0; for (const [g] of parts) total += g.toNonIndexed().attributes.position.count;
    const pos = new Float32Array(total * 3), colr = new Float32Array(total * 3); let o = 0;
    for (const [g, c] of parts) {
      const ng = g.toNonIndexed(), pp = ng.attributes.position, cc = col(c);
      for (let i = 0; i < pp.count; i++) { pos[o * 3] = pp.getX(i); pos[o * 3 + 1] = pp.getY(i); pos[o * 3 + 2] = pp.getZ(i); const sh = 0.8 + 0.4 * Math.min(1, pp.getY(i) / 7); colr[o * 3] = cc.r * sh; colr[o * 3 + 1] = cc.g * sh; colr[o * 3 + 2] = cc.b * sh; o++; }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    out.computeVertexNormals();
    return out;
  }
  function rockGeometry(rnd) {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.75 + rnd() * 0.5; v.multiplyScalar(k); v.y *= 0.6; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }
  function scatter(track, grp, terr, theme) {
    const rnd = MP.rng((track.id || 1) * 977 + 3), S = track.samples.filter((s, i) => i % 2 === 0);
    const clearUnder = (x, z, top) => { // ağaç parkurun içine girmesin
      for (const s of S) if (Math.hypot(s.p[0] - x, s.p[2] - z) < s.hw + 2.5 && s.p[1] - 1.5 < top) return false;
      for (const zn of track.zones) if (Math.hypot(zn.c[0] - x, zn.c[2] - z) < zn.R + 2.5 && zn.yBot - 1 < top) return false;
      return true;
    };
    const nTree = Math.round((theme.trees != null ? theme.trees : 650) * KALITE[quality].k);
    const variants = [0, 1, 2].map(() => pineGeometry(rnd));
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, normalMap: TX.grassN, normalScale: new THREE.Vector2(0.6, 0.6) });
    const lists = [[], [], []];
    for (let i = 0; i < nTree * 3 && lists[0].length + lists[1].length + lists[2].length < nTree; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * terr.span * 0.5;
      const x = terr.cx + Math.cos(a) * r, z = terr.cz + Math.sin(a) * r, d = terr.df.at(x, z);
      if (d < 5) continue;
      const s = 0.8 + rnd() * 0.9, y = terr.height(x, z);
      if (!clearUnder(x, z, y + 8.5 * s)) continue;
      lists[Math.floor(rnd() * 3)].push([x, y - 0.2, z, s, rnd() * Math.PI * 2]);
    }
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), P3 = new THREE.Vector3(), E = new THREE.Euler();
    lists.forEach((L, k) => {
      if (!L.length) return;
      const im = new THREE.InstancedMesh(variants[k], treeMat, L.length);
      L.forEach(([x, y, z, s, r], i) => { E.set(0, r, 0); Q.setFromEuler(E); S3.set(s, s * (0.9 + (i % 5) * 0.05), s); P3.set(x, y, z); M4.compose(P3, Q, S3); im.setMatrixAt(i, M4); });
      im.castShadow = true; im.receiveShadow = true; grp.add(im);
    });
    // kayalar
    const rocks = [], nRock = Math.round((theme.rocks != null ? theme.rocks : 140) * KALITE[quality].k);
    for (let i = 0; i < nRock * 3 && rocks.length < nRock; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * terr.span * 0.45;
      const x = terr.cx + Math.cos(a) * r, z = terr.cz + Math.sin(a) * r;
      if (terr.df.at(x, z) < 3) continue;
      const s = 0.4 + Math.pow(rnd(), 2) * 2.2, y = terr.height(x, z);
      if (!clearUnder(x, z, y + s)) continue;
      rocks.push([x, y, z, s, rnd() * 6]);
    }
    if (rocks.length) {
      const rm = new THREE.MeshStandardMaterial({ color: col('#9a958c'), map: TX.rockC, normalMap: TX.rockN, roughness: 0.95 });
      const im = new THREE.InstancedMesh(rockGeometry(rnd), rm, rocks.length);
      rocks.forEach(([x, y, z, s, r], i) => { E.set(rnd() * 0.4, r, rnd() * 0.4); Q.setFromEuler(E); S3.set(s * (0.8 + rnd() * 0.5), s, s * (0.8 + rnd() * 0.5)); P3.set(x, y, z); M4.compose(P3, Q, S3); im.setMatrixAt(i, M4); });
      im.castShadow = true; im.receiveShadow = true; grp.add(im);
    }
  }

  // ================= PARKUR GÖRÜNÜMÜ =================
  function bannerTex(text, bg, fg) {
    return canvasTex(1024, 192, (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, bg); gr.addColorStop(1, shade(bg, -0.25));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, W, 10);
      g.fillStyle = fg; g.font = '900 118px Nunito, "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.fillText(text, W / 2, H / 2 + 6);
    });
  }
  function shade(hex, k) { const c = new THREE.Color(hex); const t = k < 0 ? new THREE.Color(0, 0, 0) : new THREE.Color(1, 1, 1); c.lerp(t, Math.abs(k)); return '#' + c.getHexString(); }
  const checker = () => canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x * 16, y * 16, 16, 16); } });

  Grafik.buildView = function (track) {
    const grp = new THREE.Group(), th = track.theme || {};
    if (!M.chrome) makeMats();
    const env = th.env || 'doga', S = window.Cevre ? Cevre.settings(env) : {};
    const theme = Object.assign({}, S, th);
    // ışık ve gökyüzü (dünyaya göre)
    renderer.toneMappingExposure = S.exposure || 1.15;
    sun.color = col(S.sun || '#fff3e0'); sun.intensity = S.sunI || 3.8; hemi.intensity = S.hemi != null ? S.hemi : 0.4;
    scene.fog = new THREE.Fog(S.fog ? col(S.fog) : fogColor.clone(), 160, 1400);
    if (S.sky === 'uzay') { scene.background = col('#03040c'); scene.fog.color = col('#0b0d1e'); scene.fog.near = 300; scene.fog.far = 2600; }
    else if (S.sky === 'gece') { scene.background = col(S.fog || '#2a1840'); scene.fog.near = 120; scene.fog.far = 900; }
    else if (S.sky === 'ic') { scene.background = col('#efe9df'); scene.fog.near = 600; scene.fog.far = 4000; }
    else if (skyTex) scene.background = skyTex;

    trackStyle = th.trackMat || 'tahta';
    const belts = [];
    for (const m of track.meshes) {
      if (m.kind === 'belt') { // hareketli bant: akan ok dokusu
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(m.v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2)); g.setIndex(m.i); g.computeVertexNormals();
        const tx = chevronTex(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, 1); if (m.dir < 0) { tx.center.set(0.5, 0.5); tx.rotation = Math.PI; }
        const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tx, color: col(m.color), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
        mesh.receiveShadow = true; grp.add(mesh); belts.push({ tx, dir: m.dir }); continue;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(m.v, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
      g.setIndex(m.i); g.computeVertexNormals();
      const mat = m.kind === 'rim' ? M.glass : trackMat(m.color);
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = m.kind !== 'rim'; mesh.receiveShadow = m.kind !== 'rim';
      if (m.kind === 'rim') mesh.renderOrder = 2;
      grp.add(mesh);
    }
    const gates = [], spinners = [], movers = [], kins = [];
    for (const pr of track.prims) {
      if (pr.type === 'kin') { const km = kinMesh(pr); grp.add(km); kins.push(km); const P0 = window.MF.kinPose(pr, 0); Grafik.syncKin(km, { x: P0.p[0], y: P0.p[1], z: P0.p[2] }, P0.q); continue; }
      if (pr.type === 'spinner') {
        const sg = new THREE.Group(), am = M.paintMetal(pr.color);
        for (let k = 0; k < pr.arms; k++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(pr.arm * 2, pr.hh * 2, pr.th * 2), am);
          bar.rotation.y = k * Math.PI / pr.arms; bar.castShadow = true; bar.receiveShadow = true; sg.add(bar);
          for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(pr.hh, pr.hh, pr.th * 2.2, 14), M.ring); cap.rotation.x = Math.PI / 2; cap.position.x = sx * pr.arm; bar.add(cap); }
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(pr.hub, pr.hub, pr.hh * 2 + 0.7, 20), M.chrome); hub.castShadow = true; sg.add(hub);
        sg.position.set(pr.p[0], pr.p[1], pr.p[2]); sg.quaternion.set(pr.q.x, pr.q.y, pr.q.z, pr.q.w);
        grp.add(sg); spinners.push(sg); continue;
      }
      if (pr.type === 'piston') {
        const m = new THREE.Mesh(new THREE.BoxGeometry(pr.half[0] * 2, pr.half[1] * 2, pr.half[2] * 2), M.paintMetal(pr.color || '#ffb703'));
        m.castShadow = true; m.receiveShadow = true; m.quaternion.set(pr.q.x, pr.q.y, pr.q.z, pr.q.w); m.position.set(pr.p[0], pr.p[1], pr.p[2]);
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.06, pr.half[1] * 1.6, pr.half[2] * 1.6), M.rubber);
        face.position.x = (pr.dir[0] * (pr.q ? 1 : 1) >= 0 ? 1 : 1) * 0; m.add(face);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, pr.stroke + 1.2, 10), M.chrome); rod.rotation.z = Math.PI / 2; m.add(rod);
        grp.add(m); movers.push(m);
        continue;
      }
      let mesh;
      if (pr.type === 'cyl') {
        if (pr.bumper) {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(pr.r, pr.r * 1.05, pr.hh * 2, 28), M.rubber);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(pr.r * 1.02, 0.06, 8, 28), M.ring); ring.rotation.x = Math.PI / 2; ring.position.y = pr.hh * 0.55; mesh.add(ring);
          const top = new THREE.Mesh(new THREE.CylinderGeometry(pr.r * 0.55, pr.r * 0.55, 0.05, 20), M.chrome); top.position.y = pr.hh; mesh.add(top);
        } else mesh = new THREE.Mesh(new THREE.CylinderGeometry(pr.r, pr.r, pr.hh * 2, 20), M.chrome);
      } else if (pr.type === 'box') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(pr.half[0] * 2, pr.half[1] * 2, pr.half[2] * 2), pr.gate ? M.gate : pr.pad ? M.pad : pr.glass ? M.glass : pr.board ? trackMat(pr.color || '#ffb703') : M.woodNat);
      } else continue;
      mesh.position.set(pr.p[0], pr.p[1], pr.p[2]);
      mesh.quaternion.set(pr.q.x, pr.q.y, pr.q.z, pr.q.w);
      mesh.castShadow = true; mesh.receiveShadow = true;
      grp.add(mesh);
      if (pr.gate) gates.push({ mesh, y0: pr.p[1] });
    }
    const terr = buildTerrain(track, grp, theme);
    // destek ayakları (beton) — araziye kadar iner
    for (const d of track.decor) {
      if (d.type === 'pillar') {
        const by = terr.height(d.top[0], d.top[2]) - 0.6, h = d.top[1] - by; if (h < 0.6) continue;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, h, 14), M.concrete);
        m.position.set(d.top[0], by + h / 2, d.top[2]); m.castShadow = true; m.receiveShadow = true; grp.add(m);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.1), M.steel); cap.position.set(d.top[0], d.top[1] - 0.05, d.top[2]); cap.castShadow = true; grp.add(cap);
      } else if (d.type === 'finishArch' || d.type === 'startArch') {
        const fin = d.type === 'finishArch', w = d.hw * 2 + 1.6, H = fin ? 4.6 : 3.8;
        const a = new THREE.Group();
        for (const sx of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, H, 14), M.steel); p.position.set(sx * w / 2, H / 2, 0); p.castShadow = true; a.add(p);
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12), fin ? M.chrome : M.ring); ball.position.set(sx * w / 2, H + 0.25, 0); a.add(ball);
        }
        const bt = fin ? (() => { const t = checker(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; })() : bannerTex('BAŞLANGIÇ', '#e63950', '#ffffff');
        const ban = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, 0.12), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.75 }));
        ban.position.y = H - 0.3; ban.castShadow = true; a.add(ban);
        if (fin) {
          const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.7, 0.14), new THREE.MeshStandardMaterial({ map: bannerTex('BİTİŞ', '#1d1f27', '#ffd23f'), roughness: 0.7 }));
          top.position.y = H + 0.55; a.add(top);
          const lt = checker(); lt.wrapS = THREE.RepeatWrapping; lt.repeat.set(Math.max(1, d.hw), 1);
          const line = new THREE.Mesh(new THREE.PlaneGeometry(d.hw * 2, 0.9), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
          line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, 0); line.receiveShadow = true; a.add(line);
        }
        a.position.set(d.p[0], d.p[1], d.p[2]); a.rotation.y = d.yaw; grp.add(a);
      } else if (d.type === 'jumpSign') {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, map: bannerTex('⇧ ZIPLA', '#ffc93c', '#2b1700'), roughness: 0.6 }));
        const ofs = V.mul(V.leftOf(d.yaw), d.hw + 0.9);
        s.position.set(d.p[0] + ofs[0], d.p[1] + 2.4, d.p[2] + ofs[2]); s.rotation.y = d.yaw + Math.PI; grp.add(s);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), M.steel); pole.position.set(d.p[0] + ofs[0], d.p[1] + 1.2, d.p[2] + ofs[2]); grp.add(pole);
      } else if (d.type === 'kapiDirek') {
        for (const sx of [-1, 1]) {
          const x = d.p[0] + d.R[0] * sx * (d.hw + 0.3), z = d.p[2] + d.R[2] * sx * (d.hw + 0.3);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 10), M.steel); pole.position.set(x, d.p[1] + 1.3, z); pole.castShadow = true; grp.add(pole);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: col('#ff3355'), emissive: col('#ff3355'), emissiveIntensity: 2 })); lamp.position.set(x, d.p[1] + 2.7, z); grp.add(lamp);
        }
      } else if (d.type === 'selale') {
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(d.hw * 2, d.fall), new THREE.MeshPhysicalMaterial({ color: col('#8fd8ff'), transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
        const dd = V.dirOf(d.yaw); curtain.position.set(d.p[0] + dd[0] * 0.15, d.p[1] - d.fall / 2, d.p[2] + dd[2] * 0.15); curtain.rotation.y = d.yaw; grp.add(curtain);
      } else if (d.type === 'funnel') {
        const ringM = new THREE.Mesh(new THREE.TorusGeometry(d.R + 0.02, 0.08, 10, 96), M.chrome);
        ringM.rotation.x = Math.PI / 2; ringM.position.set(d.c[0], d.yRim + (d.wallH || 1.3), d.c[2]); grp.add(ringM);
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + Math.PI / 4, x = d.c[0] + Math.cos(a) * (d.R - 0.3), z = d.c[2] + Math.sin(a) * (d.R - 0.3);
          const by = terr.height(x, z) - 0.5, h = d.yRim - by;
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h, 10), M.steel);
          m.position.set(x, by + h / 2, z); m.castShadow = true; grp.add(m);
        }
      }
    }
    if ((theme.trees || 0) + (theme.rocks || 0) > 0) scatter(track, grp, terr, theme);
    const updaters = [];
    const cctx = { grp, track, terr, rnd: MP.rng((track.id || 1) * 31 + 5), TX, updaters, room: null };
    if (window.Cevre) { try { Cevre.build(env, cctx); } catch (e) { console.error('çevre', e); } }
    scene.add(grp);
    if (belts.length) updaters.push(t => { for (const b of belts) b.tx.offset.y = (t * 0.9) % 1; });
    // yarış yokken (menüde) hareketli engeller kendi saatleriyle oynasın
    if (kins.length) updaters.push(t => { if (!Grafik.kinAuto) return; kins.forEach(km => { const P = window.MF.kinPose(km.userData.pr, t); Grafik.syncKin(km, { x: P.p[0], y: P.p[1], z: P.p[2] }, P.q); }); });
    return { grp, gates, spinners, movers, kins, terr, patches: [], updaters, room: cctx.room };
  };
  // hareketli süsler (dönme dolap, balonlar, kuzey ışıkları…)
  Grafik.updateView = function (v, t) { if (v && v.updaters) for (const u of v.updaters) u(t); };
  // hareketli engellerin görüntüsü (konum/dönüş her karede fizikten gelir)
  function kinMesh(pr) {
    const g = new THREE.Group();
    if (pr.kind === 'kazik') {
      const t = hazardTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(pr.r, pr.r, pr.hh * 2, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.2 })); c.castShadow = true; g.add(c);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(pr.r * 0.7, pr.r, 0.12, 20), M.chrome); top.position.y = pr.hh + 0.06; g.add(top);
    } else if (pr.kind === 'sarkac') {
      const bob = new THREE.Mesh(new THREE.SphereGeometry(pr.bob, 28, 18), new THREE.MeshStandardMaterial({ map: hazardTex(), color: col('#ff6b6b'), roughness: 0.35, metalness: 0.4 })); bob.castShadow = true; g.add(bob);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, pr.armL, 8), M.steel); arm.name = 'kol'; g.add(arm); g.userData.arm = arm;
      // taşıyıcı çerçeve: iki direk + üst kiriş
      const fr = new THREE.Group(); g.userData.frame = fr;
      for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, pr.armL + 1.2, 10), M.steel); pole.position.set(pr.pivot[0] + pr.R[0] * sx * (pr.hw + 0.4), pr.pivot[1] - (pr.armL + 1.2) / 2, pr.pivot[2] + pr.R[2] * sx * (pr.hw + 0.4)); pole.castShadow = true; fr.add(pole); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, pr.hw * 2 + 1.1), M.steel); beam.position.set(pr.pivot[0], pr.pivot[1], pr.pivot[2]); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(pr.R[0], pr.R[1], pr.R[2])); fr.add(beam);
    } else if (pr.kind === 'tabla') {
      const t = canvasTex(256, 256, (gg, w, h) => { for (let k = 0; k < 12; k++) { gg.fillStyle = k % 2 ? '#ffbe0b' : '#3a86ff'; gg.beginPath(); gg.moveTo(128, 128); gg.arc(128, 128, 128, k * Math.PI / 6, (k + 1) * Math.PI / 6); gg.fill(); } gg.fillStyle = '#fff'; gg.beginPath(); gg.arc(128, 128, 22, 0, 7); gg.fill(); });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(pr.r, pr.r, pr.hh * 2, 48), [new THREE.MeshStandardMaterial({ color: col('#555') }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: col('#555') })]);
      disc.receiveShadow = true; g.add(disc);
    } else {
      const t = canvasTex(256, 64, (gg, w, h) => { for (let k = 0; k < 8; k++) { gg.fillStyle = k % 2 ? '#ffffff' : '#ff006e'; gg.fillRect(k * 32, 0, 32, h); } });
      const box = new THREE.Mesh(new THREE.BoxGeometry(pr.half[0] * 2, pr.half[1] * 2, pr.half[2] * 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); box.castShadow = true; g.add(box);
    }
    g.userData.pr = pr;
    return g;
  }
  // hareketli engeli konumla (sarkaçta kol pivottan tokmağa uzanır)
  Grafik.syncKin = function (g, pos, rot) {
    const pr = g.userData.pr;
    g.position.set(pos.x, pos.y, pos.z); g.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    if (pr.kind === 'sarkac') {
      const arm = g.userData.arm, a = new THREE.Vector3(pr.pivot[0] - pos.x, pr.pivot[1] - pos.y, pr.pivot[2] - pos.z);
      arm.position.copy(a).multiplyScalar(0.5); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().normalize());
      if (g.userData.frame && !g.userData.frame.parent) g.parent.add(g.userData.frame);
    }
  };
  Grafik.disposeView = function (v) {
    if (!v) return;
    scene.remove(v.grp);
    v.grp.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!Object.values(matCache).includes(m) && !Object.values(M).includes(m)) { if (m.map && m.map.isCanvasTexture) m.map.dispose(); m.dispose(); } });
    });
  };

  // ================= MİSKETLER =================
  // misket dokusu: temel renk + desen + forma (mağazadaki görünüm de bununla çizilir)
  Grafik.marbleTexture = function (look) {
    const W = 1024, H = 512, c1 = look.color, c2 = look.color2 || shade(c1, 0.55);
    return canvasTex(W, H, (g) => {
      g.fillStyle = c1; g.fillRect(0, 0, W, H);
      const pat = (window.Magaza && Magaza.drawPattern) ? Magaza.drawPattern : null;
      if (look.desen && pat) pat(g, W, H, look.desen, c1, c2);
      else { // varsayılan: cam misket kıvrımları
        for (let k = 0; k < 3; k++) {
          g.strokeStyle = k === 1 ? 'rgba(255,255,255,0.9)' : c2; g.lineWidth = k === 1 ? 16 : 46; g.lineCap = 'round';
          g.beginPath();
          for (let x = -20; x <= W + 20; x += 10) { const y = H * (0.3 + 0.2 * k) + Math.sin(x / W * Math.PI * 4 + k * 1.7) * H * 0.13; x > -20 ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
      }
      if (look.forma && window.Magaza && Magaza.drawKit) Magaza.drawKit(g, W, H, look.forma, c1);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
  };
  Grafik.marbleMaterial = function (look) {
    return new THREE.MeshPhysicalMaterial({
      map: Grafik.marbleTexture(look), roughness: look.metal ? 0.2 : 0.08, metalness: look.metal ? 0.85 : 0.0,
      clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.25,
      emissive: look.neon ? col(look.color) : col('#000000'), emissiveIntensity: look.neon ? 0.55 : 0,
    });
  };
  function labelTex(text, color, me) {
    return canvasTex(512, 112, (g, w, h) => {
      g.font = '800 52px Nunito, Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = Math.min(w - 8, g.measureText(text).width + 52);
      g.fillStyle = me ? 'rgba(255,194,61,0.96)' : 'rgba(10,16,36,0.78)';
      const x = (w - tw) / 2, r = 30; g.beginPath(); g.moveTo(x + r, 10); g.arcTo(x + tw, 10, x + tw, h - 10, r); g.arcTo(x + tw, h - 10, x, h - 10, r); g.arcTo(x, h - 10, x, 10, r); g.arcTo(x, 10, x + tw, 10, r); g.fill();
      g.fillStyle = me ? '#2b1700' : color; g.fillText(text, w / 2, h / 2 + 2);
    });
  }
  // misket görüntüsü: küre + etiket + aksesuar grubu (dönmez, gidiş yönüne bakar) + efektler
  Grafik.makeMarble = function (info, look, me, r) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), Grafik.marbleMaterial(look));
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(me ? 'SEN · ' + info.name : info.name, info.color, me), depthTest: false, transparent: true }));
    label.scale.set(me ? 2.5 : 1.9, me ? 0.55 : 0.42, 1); label.renderOrder = 5; scene.add(label);
    const acc = new THREE.Group(); scene.add(acc);
    if (window.Magaza) { if (look.sapka) Magaza.buildHat(acc, look.sapka, r, look.color); if (look.gozluk) Magaza.buildGlasses(acc, look.gozluk, r); }
    const shield = new THREE.Mesh(new THREE.SphereGeometry(r * 1.45, 32, 20), new THREE.MeshPhysicalMaterial({ color: col('#7fd8ff'), transparent: true, opacity: 0.28, roughness: 0, clearcoat: 1, emissive: col('#3fb8ff'), emissiveIntensity: 0.5, depthWrite: false }));
    shield.visible = false; scene.add(shield);
    // sersemlik: başının üstünde dönen yıldızlar
    const stars = new THREE.Group(); stars.visible = false; scene.add(stars);
    for (let k = 0; k < 4; k++) { const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), depthTest: false, transparent: true })); st.scale.set(0.42, 0.42, 1); st.renderOrder = 6; st.userData.a = k * Math.PI / 2; stars.add(st); }
    const baseMat = mesh.material;
    return { mesh, label, acc, shield, stars, me, look, baseMat, yaw: 0, scale: 1, trailT: 0 };
  };
  const ironMat = new THREE.MeshStandardMaterial({ color: col('#b9c0c9'), metalness: 1, roughness: 0.22 });
  let _starTex = null;
  function starTex() {
    if (_starTex) return _starTex;
    return (_starTex = canvasTex(64, 64, (g) => { g.fillStyle = '#ffe14d'; g.strokeStyle = '#b8860b'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }));
  }
  Grafik.disposeMarble = function (mv) {
    for (const o of [mv.mesh, mv.label, mv.acc, mv.shield, mv.stars].filter(Boolean)) { scene.remove(o); o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material && c.material !== ironMat) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); }
  };
  // her karede: fizikten konum/dönüş, aksesuar yönü, güç efektlerinin görünümü
  const tmpV = new THREE.Vector3();
  // tekrar (replay) için: kayıtlı konum/dönüşle yerleştir
  Grafik.placeMarble = function (mv, p, q, v, dt) {
    mv.mesh.position.set(p[0], p[1], p[2]); mv.mesh.quaternion.set(q[0], q[1], q[2], q[3]); mv.mesh.scale.setScalar(1);
    mv.mesh.material = mv.baseMat; mv.mesh.material.opacity = 1; mv.shield.visible = false; if (mv.stars) mv.stars.visible = false;
    if (Math.hypot(v[0], v[2]) > 0.6) { const ty = Math.atan2(v[0], v[2]); let d = ty - mv.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; mv.yaw += d * Math.min(1, dt * 6); }
    mv.acc.position.set(p[0], p[1], p[2]); mv.acc.rotation.set(0, mv.yaw, 0); mv.acc.scale.setScalar(1);
    mv.label.position.set(p[0], p[1] + (mv.me ? 1.35 : 1.05) + (mv.look.sapka ? 0.35 : 0), p[2]); mv.label.visible = mv.me;
    if (mv.look.iz && window.Magaza && Math.hypot(v[0], v[1], v[2]) > 1.2) { mv.trailT += dt; while (mv.trailT > 0.022) { mv.trailT -= 0.022; Magaza.emitTrail(Particles, mv.look.iz, tmpV.set(p[0], p[1], p[2]), { x: v[0], y: v[1], z: v[2] }, performance.now() / 1000); } }
  };
  Grafik.syncMarble = function (mv, m, dt, phase, now) {
    const p = m.body.translation(), q = m.body.rotation(), v = m.body.linvel();
    mv.mesh.position.set(p.x, p.y, p.z); mv.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    const fx = m.fx || {};
    const sc = fx.small > now ? 0.62 : 1; mv.scale += (sc - mv.scale) * Math.min(1, dt * 8);
    mv.mesh.scale.setScalar(mv.scale);
    mv.mesh.material = fx.iron > now ? ironMat : mv.baseMat;
    const ghost = fx.ghost > now; mv.mesh.material.transparent = ghost; mv.mesh.material.opacity = ghost ? 0.35 : 1;
    mv.shield.visible = fx.shield > now; mv.shield.position.set(p.x, p.y, p.z); mv.shield.scale.setScalar(mv.scale * (1 + Math.sin(performance.now() / 120) * 0.03));
    if (mv.stars) {
      const stun = fx.stun > now; mv.stars.visible = stun;
      if (stun) { const tt = performance.now() / 1000; mv.stars.position.set(p.x, p.y + 0.85 * mv.scale + (mv.look.sapka ? 0.35 : 0), p.z); mv.stars.children.forEach(st => { const a = st.userData.a + tt * 5; st.position.set(Math.cos(a) * 0.55, Math.sin(tt * 6 + st.userData.a) * 0.06, Math.sin(a) * 0.55); }); }
    }
    const hs = Math.hypot(v.x, v.z);
    if (hs > 0.6) { const ty = Math.atan2(v.x, v.z); let d = ty - mv.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; mv.yaw += d * Math.min(1, dt * 6); }
    mv.acc.position.set(p.x, p.y, p.z); mv.acc.rotation.set(0, mv.yaw, 0); mv.acc.scale.setScalar(mv.scale);
    if (mv.spinners === undefined) { mv.spinners = []; mv.acc.traverse(o => { if (o.userData && o.userData.spin) mv.spinners.push(o); }); }
    for (const o of mv.spinners) o.rotation.y += o.userData.spin * dt; // pervaneli şapka
    mv.label.position.set(p.x, p.y + (mv.me ? 1.35 : 1.05) * mv.scale + (mv.look.sapka ? 0.35 : 0), p.z);
    if (!mv.me) { const d = camera.position.distanceTo(mv.mesh.position); mv.label.visible = phase !== 'countdown' && d > 6 && d < 70; }
    // iz (kostüm) ve güç parçacıkları
    const spd = Math.hypot(v.x, v.y, v.z);
    if (mv.look.iz && window.Magaza && spd > 1.2) { mv.trailT += dt; const iv = 0.022; while (mv.trailT > iv) { mv.trailT -= iv; Magaza.emitTrail(Particles, mv.look.iz, tmpV.set(p.x, p.y, p.z), v, now); } }
    if (fx.turbo > now) for (let k = 0; k < 2; k++) Particles.emit(tmpV.set(p.x, p.y, p.z), { x: -v.x * 0.3 + rr(1), y: rr(1) + 0.5, z: -v.z * 0.3 + rr(1) }, k ? '#ffd166' : '#ff6b1a', 0.45, 0.35, 0.3);
    if (fx.slime > now || fx.inSlime) if (Math.random() < 0.5) Particles.emit(tmpV.set(p.x, p.y - 0.3, p.z), { x: rr(0.6), y: 0.8, z: rr(0.6) }, '#7bd629', 0.25, 0.5, 0.0);
    if (fx.slow > now) if (Math.random() < 0.4) Particles.emit(tmpV.set(p.x, p.y + 0.6, p.z), { x: rr(0.3), y: 0.6, z: rr(0.3) }, '#9fd6ff', 0.2, 0.7, -0.2);
  };
  const rr = k => (Math.random() - 0.5) * 2 * k;

  // ================= PARÇACIKLAR =================
  const Particles = Grafik.Particles = (function () {
    const N = 4000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), colr = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), shape = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1)); geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('shape', new THREE.BufferAttribute(shape, 1));
    const vel = new Float32Array(N * 3), life = new Float32Array(N), maxLife = new Float32Array(N), grav = new Float32Array(N), size0 = new Float32Array(N);
    const sprite = canvasTex(512, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(96, 54); g.bezierCurveTo(70, 36, 70, 12, 86, 12); g.bezierCurveTo(94, 12, 96, 20, 96, 22); g.bezierCurveTo(96, 20, 98, 12, 106, 12); g.bezierCurveTo(122, 12, 122, 36, 96, 54); g.fill();
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; g.lineTo(160 + Math.cos(a) * r, 34 + Math.sin(a) * r); } g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(224 - Math.cos(a) * 26, 32 - Math.sin(a) * 26); g.lineTo(224 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); g.stroke(); }
      g.font = '900 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 288, 34);           // 4 nota
      g.beginPath(); g.ellipse(352, 32, 12, 26, 0.6, 0, 7); g.fill();                                                 // 5 yaprak
      g.beginPath(); g.moveTo(416, 6); g.lineTo(438, 30); g.lineTo(416, 58); g.lineTo(394, 30); g.closePath(); g.fill(); // 6 elmas
      g.beginPath(); g.moveTo(486, 4); g.lineTo(466, 34); g.lineTo(480, 34); g.lineTo(470, 60); g.lineTo(496, 26); g.lineTo(482, 26); g.closePath(); g.fill(); // 7 şimşek
    }, false);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sprite }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.NormalBlending, vertexColors: true,
      vertexShader: 'attribute float size; attribute float alpha; attribute float shape; varying float vA; varying float vS; varying vec3 vC; uniform float scale; void main(){ vA=alpha; vS=shape; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; varying float vS; varying vec3 vC; void main(){ vec2 uv=vec2((gl_PointCoord.x+floor(vS+0.5))/8.0,1.0-gl_PointCoord.y); vec4 t=texture2D(map,uv); gl_FragColor=vec4(vC,t.a*vA); if(gl_FragColor.a<0.01) discard; }',
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts);
    let head = 0;
    const C = new THREE.Color();
    return {
      emit(p, v, color, sz, lifeS, g, shp) {
        const i = head; head = (head + 1) % N;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
        C.set(color); colr[i * 3] = C.r; colr[i * 3 + 1] = C.g; colr[i * 3 + 2] = C.b;
        size0[i] = sz; size[i] = sz; life[i] = lifeS; maxLife[i] = lifeS; grav[i] = g || 0; alpha[i] = 1; shape[i] = shp || 0;
      },
      burst(p, n, color, speed, sz, lifeS, g) { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, s = speed * (0.4 + Math.random() * 0.6); this.emit(p, { x: Math.cos(a) * Math.cos(b) * s, y: Math.abs(Math.sin(b)) * s, z: Math.sin(a) * Math.cos(b) * s }, Array.isArray(color) ? color[k % color.length] : color, sz, lifeS * (0.6 + Math.random() * 0.6), g); } },
      update(dt) {
        for (let i = 0; i < N; i++) {
          if (life[i] <= 0) { if (alpha[i] !== 0) { alpha[i] = 0; } continue; }
          life[i] -= dt; const k = Math.max(0, life[i] / maxLife[i]);
          vel[i * 3 + 1] -= grav[i] * 9.8 * dt;
          pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
          alpha[i] = Math.min(1, k * 1.6); size[i] = size0[i] * (0.4 + 0.6 * k);
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.shape.needsUpdate = true;
        mat.uniforms.scale.value = innerHeight * renderer.getPixelRatio() * 0.6;
      },
      clear() { life.fill(0); alpha.fill(0); },
    };
  })();

  // ================= GÜÇ EFEKTLERİ (sahnedeki geçici nesneler) =================
  const temp = [];
  Grafik.addTemp = function (obj, until, onUpdate) { const e = { obj, until, onUpdate }; scene.add(obj); temp.push(e); return e; };
  Grafik.updateTemps = function (t, dt) {
    for (let i = temp.length - 1; i >= 0; i--) {
      const e = temp[i];
      if (t > e.until || e.dead) { scene.remove(e.obj); e.obj.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); temp.splice(i, 1); continue; }
      if (e.onUpdate) e.onUpdate(e.obj, t, dt);
    }
  };
  Grafik.clearTemps = function () { for (const e of temp) e.dead = true; Grafik.updateTemps(1e9, 0); };
  const brickTex = () => canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#7a2e1d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 32; g.fillStyle = ['#b5452c', '#a63d27', '#c24e33'][(x + y + 3) % 3]; g.fillRect(x * 64 + ox + 3, y * 32 + 3, 58, 26); }
  });
  Grafik.spawnWall = function (w, until) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.half[0] * 2, w.half[1] * 2, w.half[2] * 2), new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 }));
    m.position.set(w.p[0], w.p[1] + 3, w.p[2]); m.quaternion.set(w.q.x, w.q.y, w.q.z, w.q.w); m.castShadow = true;
    w._vis = Grafik.addTemp(m, until, (o, t, dt) => { o.position.y = Math.max(w.p[1], o.position.y - dt * 14); if (until - t < 0.3) o.scale.y = Math.max(0.01, (until - t) / 0.3); });
    Particles.burst({ x: w.p[0], y: w.p[1], z: w.p[2] }, 25, ['#c9b79c', '#a0907a'], 3, 0.35, 0.8, 0.6);
  };
  Grafik.spawnSlime = function (pt, until) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(pt.r, 32), new THREE.MeshPhysicalMaterial({ color: col('#62c21c'), roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4 }));
    const up = new THREE.Vector3(pt.U[0], pt.U[1], pt.U[2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up); m.position.set(pt.p[0], pt.p[1], pt.p[2]).addScaledVector(up, 0.03);
    m.scale.setScalar(0.01);
    Grafik.addTemp(m, until, (o, t, dt) => { const s = Math.min(1, o.scale.x + dt * 3); o.scale.set(s, s * 1.4, s); if (until - t < 0.5) o.material.opacity = 0.85 * (until - t) / 0.5; });
  };
  Grafik.explode = function (p) {
    Particles.burst(p, 60, ['#fff3b0', '#ffb703', '#fb5607', '#6c6c6c'], 7, 0.7, 0.9, 0.4);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }));
    f.position.set(p.x, p.y, p.z);
    const t0 = performance.now();
    Grafik.addTemp(f, Infinity, (o) => { const k = (performance.now() - t0) / 350; o.scale.setScalar(1 + k * 5); o.material.opacity = Math.max(0, 0.9 * (1 - k)); if (k >= 1) temp.find(e => e.obj === o).dead = true; });
  };
  Grafik.breakWall = function (w) {
    if (w._vis) w._vis.dead = true;
    Particles.burst({ x: w.p[0], y: w.p[1], z: w.p[2] }, 70, ['#b5452c', '#a63d27', '#c24e33', '#d9c3a0'], 6, 0.4, 1.2, 0.9);
  };
  Grafik.sparkle = function (p, color) { Particles.burst(p, 40, [color || '#d0b3ff', '#ffffff'], 4, 0.4, 0.8, -0.1); };
  Grafik.puff = function (p) { Particles.burst(p, 18, ['#e8e2d6', '#cfc7b8'], 2.5, 0.5, 0.7, 0.2); };
  Grafik.wind = function (p, dir) { for (let k = 0; k < 40; k++) Particles.emit({ x: p.x + rr(3), y: p.y + Math.random() * 1.5, z: p.z + rr(3) }, { x: -dir[0] * 9 + rr(1), y: rr(0.3), z: -dir[2] * 9 + rr(1) }, '#e8f6ff', 0.22, 0.8, 0); };

  // menüde/yarışta çiz
  Grafik.render = function () { renderer.render(scene, camera); };
})();
