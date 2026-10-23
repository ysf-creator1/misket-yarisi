/* Misket Yarışı — mağaza: ürün kataloğu, fiyatlar ve kostümlerin çizimi
 * Kategoriler: renk, desen, forma, gözlük, şapka, iz. Her kategoride 8 ürün; fiyat sırayla ×1.5 artar.
 * Şapka ve gözlük misketle dönmez, misketin gittiği yöne bakar.
 */
(function () {
  'use strict';
  const { THREE } = window;
  const Magaza = window.Magaza = {};
  const col = c => new THREE.Color(c).convertSRGBToLinear();

  const GROWTH = 1.5;
  const CATS = [
    { id: 'renk', name: 'Renk', icon: '🎨', base: 40, items: [['pembe', 'Pembe Şeker', '#ff6fb5'], ['turkuaz', 'Turkuaz', '#1fd1c1'], ['lacivert', 'Lacivert', '#24407a'], ['fistik', 'Fıstık Yeşili', '#8fd94f'], ['bordo', 'Bordo', '#8d1b3d'], ['gece', 'Gece Siyahı', '#1b1b24'], ['inci', 'İnci Beyazı', '#f3efe6'], ['altin', 'Saf Altın', '#d9a520']] },
    { id: 'forma', name: 'Forma', icon: '👕', base: 60, items: [['bant', 'Beyaz Bant'], ['cift', 'Çift Şerit'], ['no7', '7 Numara'], ['no10', '10 Numara'], ['simsek', 'Şimşek'], ['taraftar', 'Taraftar'], ['yildizf', 'Yıldızlı Forma'], ['sampiyon', 'Şampiyon Forması']] },
    { id: 'desen', name: 'Desen', icon: '🌀', base: 65, items: [['cizgili', 'Çizgili'], ['puantiye', 'Puantiyeli'], ['dama', 'Damalı'], ['zebra', 'Zebra'], ['yildiz', 'Yıldızlı'], ['bayrak', 'Ay Yıldız'], ['galaksi', 'Galaksi'], ['ates', 'Ateş']] },
    { id: 'gozluk', name: 'Gözlük', icon: '🕶️', base: 70, items: [['gunes', 'Güneş Gözlüğü'], ['yuvarlak', 'Yuvarlak Gözlük'], ['kalp', 'Kalp Gözlük'], ['yildizg', 'Yıldız Gözlük'], ['3d', '3D Gözlük'], ['kayak', 'Kayak Gözlüğü'], ['monokl', 'Tek Gözlük'], ['lazer', 'Lazer Vizör']] },
    { id: 'sapka', name: 'Şapka', icon: '🎩', base: 90, items: [['kep', 'Kep'], ['parti', 'Parti Şapkası'], ['kovboy', 'Kovboy Şapkası'], ['silindir', 'Silindir Şapka'], ['korsan', 'Korsan Şapkası'], ['viking', 'Viking Miğferi'], ['sihirbaz', 'Sihirbaz Şapkası'], ['tac', 'Kral Tacı']] },
    { id: 'iz', name: 'İz', icon: '✨', base: 110, items: [['kivilcim', 'Kıvılcım'], ['duman', 'Duman'], ['kalpler', 'Kalpler'], ['yildizlar', 'Yıldızlar'], ['gokkusagi', 'Gökkuşağı'], ['atesiz', 'Ateş İzi'], ['buz', 'Buz Kristalleri'], ['altintozu', 'Altın Tozu']] },
  ];
  const r5 = x => Math.round(x / 5) * 5;
  Magaza.CATS = CATS.map(c => ({
    id: c.id, name: c.name, icon: c.icon,
    items: c.items.map(([id, name, hex], i) => ({ id: c.id + ':' + id, key: id, cat: c.id, name, hex, price: r5(c.base * Math.pow(GROWTH, i)), order: i })),
  }));
  Magaza.ITEMS = Object.fromEntries(Magaza.CATS.flatMap(c => c.items).map(it => [it.id, it]));
  Magaza.total = Object.values(Magaza.ITEMS).reduce((a, it) => a + it.price, 0);

  // oyuncunun giydiği ürünlerden misket görünümü
  Magaza.lookFor = function (info, eq) {
    eq = eq || {};
    const look = { color: info.color, color2: info.color2 };
    const renk = eq.renk && Magaza.ITEMS[eq.renk];
    if (renk) { look.color = renk.hex; look.color2 = null; if (renk.key === 'altin') look.metal = true; }
    for (const k of ['desen', 'forma', 'gozluk', 'sapka', 'iz']) { const it = eq[k] && Magaza.ITEMS[eq[k]]; if (it) look[k] = it.key; }
    return look;
  };

  // ================= DESENLER (misket dokusuna) =================
  function star(g, x, y, r, n = 5, inner = 0.45) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  Magaza.drawPattern = function (g, W, H, id, c1, c2) {
    const light = 'rgba(255,255,255,0.92)';
    if (id === 'cizgili') { for (let k = 0; k < 9; k++) if (k % 2) { g.fillStyle = light; g.fillRect(0, k * H / 9, W, H / 9); } }
    else if (id === 'puantiye') { g.fillStyle = light; for (let y = 1; y < 8; y++) for (let x = 0; x < 16; x++) { const ox = (y % 2) * W / 32; g.beginPath(); g.ellipse(x * W / 16 + ox, y * H / 8, 18 / Math.max(0.35, Math.sin(Math.PI * y / 8)), 18, 0, 0, Math.PI * 2); g.fill(); } }
    else if (id === 'dama') { for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2) { g.fillStyle = '#111'; g.fillRect(x * W / 16, y * H / 8, W / 16, H / 8); } }
    else if (id === 'zebra') { g.fillStyle = '#111'; for (let k = 0; k < 14; k++) { g.beginPath(); const x0 = k * W / 14; g.moveTo(x0, 0); for (let y = 0; y <= H; y += 16) g.lineTo(x0 + Math.sin(y / 40 + k) * 26, y); for (let y = H; y >= 0; y -= 16) g.lineTo(x0 + 24 + Math.sin(y / 34 + k * 1.3) * 22, y); g.fill(); } }
    else if (id === 'yildiz') { g.fillStyle = '#ffe066'; for (let k = 0; k < 40; k++) { const x = (k * 197) % W, y = 40 + ((k * 89) % (H - 80)); star(g, x, y, 22); } }
    else if (id === 'bayrak') {
      g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
      for (const cx of [W * 0.25, W * 0.75]) {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 40, H / 2, 95, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e30a17'; g.beginPath(); g.arc(cx - 16, H / 2, 76, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.save(); g.translate(cx + 70, H / 2); g.rotate(-0.3); star(g, 0, 0, 46, 5, 0.38); g.restore();
      }
    } else if (id === 'galaksi') {
      g.fillStyle = '#0b0820'; g.fillRect(0, 0, W, H);
      for (const [x, y, r, c] of [[W * 0.2, H * 0.4, 260, 'rgba(140,60,255,0.55)'], [W * 0.62, H * 0.6, 300, 'rgba(40,140,255,0.45)'], [W * 0.9, H * 0.35, 200, 'rgba(255,60,180,0.4)']]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + (k % 5) / 8})`; g.fillRect((k * 7919) % W, (k * 104729) % H, (k % 7) ? 2 : 4, (k % 7) ? 2 : 4); }
    } else if (id === 'ates') {
      const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#7a0a00'); gr.addColorStop(0.45, '#ff4d00'); gr.addColorStop(0.8, '#ffb000'); gr.addColorStop(1, '#fff1a0');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,240,150,0.6)';
      for (let k = 0; k < 18; k++) { const x = k * W / 18; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + 10, H * 0.5, x + 28, H * (0.15 + (k % 3) * 0.1)); g.quadraticCurveTo(x + 40, H * 0.6, x + 56, H); g.fill(); }
    } else { // varsayılan kıvrım
      for (let k = 0; k < 3; k++) { g.strokeStyle = k === 1 ? light : c2; g.lineWidth = k === 1 ? 16 : 46; g.beginPath(); for (let x = -20; x <= W + 20; x += 10) { const y = H * (0.3 + 0.2 * k) + Math.sin(x / W * Math.PI * 4 + k * 1.7) * H * 0.13; x > -20 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    }
  };
  Magaza.drawKit = function (g, W, H, id, c1) {
    const band = (y, h, c) => { g.fillStyle = c; g.fillRect(0, y - h / 2, W, h); };
    const num = (txt, color, stroke) => { g.font = '900 120px Nunito, "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const x of [W * 0.25, W * 0.75]) { if (stroke) { g.lineWidth = 10; g.strokeStyle = stroke; g.strokeText(txt, x, H / 2 + 4); } g.fillStyle = color; g.fillText(txt, x, H / 2 + 4); } };
    if (id === 'bant') band(H / 2, 70, '#ffffff');
    else if (id === 'cift') { band(H * 0.42, 34, '#ffffff'); band(H * 0.58, 34, '#ffffff'); }
    else if (id === 'no7' || id === 'no10') { band(H / 2, 150, '#ffffff'); num(id === 'no7' ? '7' : '10', '#1b1b24'); }
    else if (id === 'simsek') { band(H / 2, 120, '#1b1b24'); g.fillStyle = '#ffd60a'; for (const x of [W * 0.25, W * 0.75]) { g.beginPath(); g.moveTo(x - 10, H / 2 - 55); g.lineTo(x + 30, H / 2 - 55); g.lineTo(x + 5, H / 2 - 5); g.lineTo(x + 30, H / 2 - 5); g.lineTo(x - 25, H / 2 + 60); g.lineTo(x - 5, H / 2 + 8); g.lineTo(x - 30, H / 2 + 8); g.closePath(); g.fill(); } }
    else if (id === 'taraftar') { band(H * 0.45, 60, '#ffd60a'); band(H * 0.55, 60, '#1d3fbb'); }
    else if (id === 'yildizf') { band(H / 2, 130, '#1d3557'); g.fillStyle = '#ffffff'; for (let k = 0; k < 10; k++) star(g, (k + 0.5) * W / 10, H / 2, 26); }
    else if (id === 'sampiyon') { band(H / 2, 150, '#d9a520'); band(H / 2 - 70, 12, '#fff3b0'); band(H / 2 + 70, 12, '#fff3b0'); num('1', '#ffffff', '#7a5200'); }
  };

  // ================= ŞAPKALAR (3D) =================
  const M = {};
  function mats() {
    if (M.ok) return; M.ok = true;
    const S = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: col(c), roughness: 0.6 }, o));
    M.black = S('#16161b', { roughness: 0.5 }); M.red = S('#d62828'); M.white = S('#f5f5f5'); M.brown = S('#8a5a2b', { roughness: 0.8 });
    M.gold = S('#ffcf40', { metalness: 1, roughness: 0.22 }); M.steel = S('#b8c0c8', { metalness: 1, roughness: 0.3 }); M.horn = S('#efe4c8', { roughness: 0.5 });
    M.blue = S('#2b3fb3'); M.yellow = S('#ffd60a', { roughness: 0.4 }); M.pink = S('#ff5fa2');
    M.lensDark = new THREE.MeshPhysicalMaterial({ color: col('#101014'), roughness: 0.05, metalness: 0.2, clearcoat: 1 });
    M.lensClear = new THREE.MeshPhysicalMaterial({ color: col('#d8ecff'), roughness: 0, transparent: true, opacity: 0.3, clearcoat: 1 });
    M.lensRed = new THREE.MeshPhysicalMaterial({ color: col('#ff2050'), roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 });
    M.lensBlue = new THREE.MeshPhysicalMaterial({ color: col('#20a0ff'), roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 });
    M.visor = new THREE.MeshPhysicalMaterial({ color: col('#ff7b00'), roughness: 0.05, metalness: 0.5, clearcoat: 1, transparent: true, opacity: 0.9 });
    M.laser = new THREE.MeshStandardMaterial({ color: col('#ff1030'), emissive: col('#ff1030'), emissiveIntensity: 2.5, roughness: 0.2 });
    M.partyTex = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#ff5fa2'; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 8; k++) { g.fillStyle = ['#ffd60a', '#3ad0ff', '#7bff5a'][k % 3]; g.fillRect(k * 32, 0, 14, 256); } const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; })();
    M.party = new THREE.MeshStandardMaterial({ map: M.partyTex, roughness: 0.6 });
    M.wizard = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#2a2f8f'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ffe066'; for (let k = 0; k < 14; k++) star(g, (k * 71) % 256, (k * 113) % 256, 12); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); })();
  }
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
  Magaza.buildHat = function (grp, id, r) {
    mats();
    const h = new THREE.Group(); h.position.y = r * 0.82; grp.add(h);
    if (id === 'kep') {
      h.add(mesh(new THREE.SphereGeometry(r * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.red, 0, -0.02, 0));
      const brim = mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), M.red, 0, 0, r * 0.35); h.add(brim);
      h.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), M.white, 0, r * 0.62, 0));
    } else if (id === 'parti') {
      h.add(mesh(new THREE.ConeGeometry(r * 0.38, r * 1.1, 24), M.party, 0, r * 0.5, 0));
      h.add(mesh(new THREE.SphereGeometry(r * 0.12, 12, 8), M.yellow, 0, r * 1.07, 0));
    } else if (id === 'kovboy') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.5, r * 0.5, 24), M.brown, 0, r * 0.22, 0));
      const br = mesh(new THREE.TorusGeometry(r * 0.75, r * 0.12, 8, 32), M.brown, 0, 0.02, 0); br.rotation.x = Math.PI / 2; br.scale.z = 0.35; h.add(br);
      h.add(mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.03, 32), M.brown));
      h.add(mesh(new THREE.CylinderGeometry(r * 0.505, r * 0.505, r * 0.1, 24), M.black, 0, r * 0.05, 0));
    } else if (id === 'silindir') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, r * 0.95, 28), M.black, 0, r * 0.47, 0));
      h.add(mesh(new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.04, 32), M.black));
      h.add(mesh(new THREE.CylinderGeometry(r * 0.425, r * 0.425, r * 0.16, 28), M.red, 0, r * 0.1, 0));
    } else if (id === 'korsan') {
      const b = mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, r * 0.2, 24, 1, false, 0, Math.PI), M.black, 0, r * 0.2, 0);
      b.rotation.z = Math.PI / 2; b.rotation.y = Math.PI / 2; b.scale.set(1, 1, 1.6); h.add(b);
      h.add(mesh(new THREE.SphereGeometry(r * 0.48, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.black));
      h.add(mesh(new THREE.CircleGeometry(r * 0.13, 16), M.white, 0, r * 0.3, r * 0.34));
    } else if (id === 'viking') {
      h.add(mesh(new THREE.SphereGeometry(r * 0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel, 0, -0.08, 0));
      const band = mesh(new THREE.TorusGeometry(r * 0.6, 0.035, 8, 32), M.gold, 0, -0.06, 0); band.rotation.x = Math.PI / 2; h.add(band);
      for (const sx of [-1, 1]) { const hn = mesh(new THREE.ConeGeometry(r * 0.12, r * 0.7, 12), M.horn, sx * r * 0.55, r * 0.25, 0); hn.rotation.z = -sx * 0.9; h.add(hn); }
    } else if (id === 'sihirbaz') {
      const c = mesh(new THREE.ConeGeometry(r * 0.42, r * 1.5, 28), M.wizard, 0, r * 0.7, 0); c.rotation.z = 0.15; h.add(c);
      h.add(mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.03, 32), M.wizard));
    } else if (id === 'tac') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.28, 28, 1, true), M.gold, 0, r * 0.12, 0));
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; h.add(mesh(new THREE.ConeGeometry(r * 0.08, r * 0.3, 8), M.gold, Math.cos(a) * r * 0.45, r * 0.4, Math.sin(a) * r * 0.45)); h.add(mesh(new THREE.SphereGeometry(r * 0.05, 8, 6), k % 2 ? M.red : M.blue, Math.cos(a) * r * 0.46, r * 0.14, Math.sin(a) * r * 0.46)); }
    }
  };
  // ================= GÖZLÜKLER (3D) =================
  function heartShape(s) { const p = new THREE.Shape(); p.moveTo(0, -s); p.bezierCurveTo(s * 1.2, -s * 0.2, s * 0.9, s * 0.9, 0, s * 0.35); p.bezierCurveTo(-s * 0.9, s * 0.9, -s * 1.2, -s * 0.2, 0, -s); return p; }
  function starShape(s) { const p = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.45 : s; i ? p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } return p; }
  Magaza.buildGlasses = function (grp, id, r) {
    mats();
    const g = new THREE.Group(); g.position.set(0, r * 0.18, r * 0.93); grp.add(g);
    const lx = r * 0.32, ls = r * 0.24;
    const lens = (geo, mat, x) => { const m = mesh(geo, mat, x, 0, 0.01); g.add(m); return m; };
    const bridge = mat => { g.add(mesh(new THREE.BoxGeometry(lx * 0.8, 0.025, 0.025), mat, 0, ls * 0.25, 0)); for (const sx of [-1, 1]) { const arm = mesh(new THREE.BoxGeometry(0.02, 0.02, r * 0.75), mat, sx * (lx + ls * 0.9), ls * 0.2, -r * 0.37); arm.rotation.y = sx * 0.35; g.add(arm); } };
    const disc = (rad, mat, x) => { const m = lens(new THREE.CylinderGeometry(rad, rad, 0.03, 24), mat, x); m.rotation.x = Math.PI / 2; return m; };
    const ring = (rad, mat, x) => { const m = mesh(new THREE.TorusGeometry(rad, 0.022, 8, 24), mat, x, 0, 0); g.add(m); };
    const ext = (shape, mat, x) => { const m = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), mat, x, 0, 0); g.add(m); };
    if (id === 'gunes') { for (const sx of [-1, 1]) { const m = lens(new THREE.BoxGeometry(ls * 2.1, ls * 1.3, 0.03), M.lensDark, sx * lx); m.geometry.translate(0, 0, 0); } bridge(M.black); }
    else if (id === 'yuvarlak') { for (const sx of [-1, 1]) { disc(ls, M.lensClear, sx * lx); ring(ls, M.gold, sx * lx); } bridge(M.gold); }
    else if (id === 'kalp') { for (const sx of [-1, 1]) ext(heartShape(ls * 1.05), M.lensRed, sx * lx); bridge(M.pink); }
    else if (id === 'yildizg') { for (const sx of [-1, 1]) ext(starShape(ls * 1.25), M.yellow, sx * lx); bridge(M.yellow); }
    else if (id === '3d') { lens(new THREE.BoxGeometry(ls * 2, ls * 1.3, 0.03), M.lensRed, -lx); lens(new THREE.BoxGeometry(ls * 2, ls * 1.3, 0.03), M.lensBlue, lx); g.add(mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.4, ls * 1.6, 0.02), M.white, 0, 0, -0.01)); bridge(M.white); }
    else if (id === 'kayak') { const v = mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.0, ls * 1.5, 32, 1, true, -0.9, 1.8), M.visor, 0, 0, -r * 0.93); v.rotation.y = Math.PI; g.add(v); const st = mesh(new THREE.TorusGeometry(r * 0.99, 0.04, 6, 40), M.black, 0, 0, -r * 0.93); st.rotation.x = Math.PI / 2; g.add(st); }
    else if (id === 'monokl') { disc(ls * 1.1, M.lensClear, lx); ring(ls * 1.1, M.gold, lx); const ch = mesh(new THREE.TorusGeometry(r * 0.35, 0.01, 4, 20, Math.PI * 0.8), M.gold, lx + 0.05, -r * 0.3, 0); ch.rotation.z = -1.2; g.add(ch); }
    else if (id === 'lazer') { const v = mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.4, ls * 0.7, 0.05), M.laser, 0, 0, 0); g.add(v); bridge(M.steel); }
  };

  // ================= İZLER =================
  // şekiller: 0 daire, 1 kalp, 2 yıldız, 3 kar tanesi
  const rr = k => (Math.random() - 0.5) * 2 * k;
  Magaza.emitTrail = function (P, id, p, v, t) {
    const back = { x: -v.x * 0.15, y: 0.2, z: -v.z * 0.15 };
    const at = { x: p.x + rr(0.15), y: p.y + rr(0.15), z: p.z + rr(0.15) };
    if (id === 'kivilcim') P.emit(at, { x: back.x + rr(1.5), y: 1 + Math.random() * 2, z: back.z + rr(1.5) }, Math.random() < 0.5 ? '#ffe28a' : '#ffae00', 0.12, 0.5, 0.8, 0);
    else if (id === 'duman') P.emit(at, { x: back.x + rr(0.3), y: 0.6, z: back.z + rr(0.3) }, '#d8d8d8', 0.7, 1.2, -0.05, 0);
    else if (id === 'kalpler') P.emit(at, { x: back.x + rr(0.4), y: 0.9, z: back.z + rr(0.4) }, Math.random() < 0.5 ? '#ff4f8b' : '#ff9ec4', 0.4, 0.9, -0.05, 1);
    else if (id === 'yildizlar') P.emit(at, { x: back.x + rr(0.6), y: 0.6 + rr(0.4), z: back.z + rr(0.6) }, Math.random() < 0.5 ? '#fff4a3' : '#ffffff', 0.38, 0.8, 0, 2);
    else if (id === 'gokkusagi') { const c = new THREE.Color().setHSL((t * 0.6 + Math.random() * 0.05) % 1, 0.9, 0.6); P.emit(at, { x: back.x, y: 0.1, z: back.z }, '#' + c.getHexString(), 0.42, 0.9, 0, 0); }
    else if (id === 'atesiz') P.emit(at, { x: back.x + rr(0.4), y: 1.4 + Math.random(), z: back.z + rr(0.4) }, ['#fff1a0', '#ffb000', '#ff4d00'][Math.floor(Math.random() * 3)], 0.45, 0.45, -0.3, 0);
    else if (id === 'buz') P.emit(at, { x: back.x + rr(0.6), y: 0.4 + rr(0.3), z: back.z + rr(0.6) }, Math.random() < 0.5 ? '#bfefff' : '#ffffff', 0.34, 1.0, 0.1, 3);
    else if (id === 'altintozu') P.emit(at, { x: back.x + rr(0.8), y: rr(0.8), z: back.z + rr(0.8) }, Math.random() < 0.6 ? '#ffd23f' : '#fff6c9', 0.16, 1.1, 0.15, 2);
  };
  // mağaza kartı simgesi
  Magaza.iconFor = function (it) {
    const e = { renk: '', forma: '👕', desen: '🌀', gozluk: '🕶️', sapka: '🎩', iz: '✨' }[it.cat];
    const map = { kep: '🧢', parti: '🥳', kovboy: '🤠', silindir: '🎩', korsan: '🏴‍☠️', viking: '🪖', sihirbaz: '🧙', tac: '👑', gunes: '🕶️', yuvarlak: '👓', kalp: '😍', yildizg: '🤩', '3d': '🥽', kayak: '🥽', monokl: '🧐', lazer: '🔴', kivilcim: '🎇', duman: '💨', kalpler: '💕', yildizlar: '🌟', gokkusagi: '🌈', atesiz: '🔥', buz: '❄️', altintozu: '💫', cizgili: '〰️', puantiye: '⚪', dama: '🏁', zebra: '🦓', yildiz: '⭐', bayrak: '🇹🇷', galaksi: '🌌', ates: '🔥', bant: '🎽', cift: '🎽', no7: '7️⃣', no10: '🔟', simsek: '⚡', taraftar: '📣', yildizf: '✴️', sampiyon: '🏆' };
    return map[it.key] || e;
  };
})();
