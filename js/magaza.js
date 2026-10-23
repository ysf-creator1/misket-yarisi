/* Misket Yarışı — mağaza: ürün kataloğu, fiyatlar ve kostümlerin çizimi
 * Kategoriler: renk, desen, forma, gözlük, şapka, iz. Her kategoride 8 ürün; fiyat sırayla ×1.5 artar.
 * Şapka ve gözlük misketle dönmez, misketin gittiği yöne bakar.
 */
(function () {
  'use strict';
  const { THREE } = window;
  const Magaza = window.Magaza = {};
  const col = c => new THREE.Color(c).convertSRGBToLinear();

  // her kategoride 24 ürün; fiyat sırayla artar (başta yavaş, sona doğru hızlı) — hepsini almak ~500 yarış
  const CATS = [
    { id: 'renk', name: 'Renk', icon: '🎨', base: 40, top: 1300, items: [['pembe', 'Pembe Şeker', '#ff6fb5'], ['turkuaz', 'Turkuaz', '#1fd1c1'], ['lacivert', 'Lacivert', '#24407a'], ['fistik', 'Fıstık Yeşili', '#8fd94f'], ['bordo', 'Bordo', '#8d1b3d'], ['gece', 'Gece Siyahı', '#1b1b24'], ['inci', 'İnci Beyazı', '#f3efe6'], ['altin', 'Saf Altın', '#d9a520'],
      ['kiraz', 'Kiraz Kırmızısı', '#d00000'], ['gunbatimi', 'Gün Batımı', '#ff7b00'], ['limon', 'Limon', '#f7e733'], ['nane', 'Nane', '#6ee7b7'], ['gokyuzu', 'Gökyüzü', '#4cc9f0'], ['lavanta', 'Lavanta', '#b8a1ff'], ['morgece', 'Mor Gece', '#4b1d78'], ['kahve', 'Kahve', '#7a4a2a'],
      ['gumus', 'Gümüş', '#c0c6cf', 'metal'], ['bronz', 'Bronz', '#b0703c', 'metal'], ['bakir', 'Bakır', '#c36b38', 'metal'], ['zumrut', 'Zümrüt', '#12a150', 'metal'], ['yakut', 'Yakut', '#c3123c', 'metal'], ['safir', 'Safir', '#1f4fd1', 'metal'], ['neonyesil', 'Neon Yeşil', '#39ff14', 'neon'], ['neonpembe', 'Neon Pembe', '#ff2fd6', 'neon']] },
    { id: 'forma', name: 'Forma', icon: '👕', base: 55, top: 1700, items: [['bant', 'Beyaz Bant'], ['cift', 'Çift Şerit'], ['no7', '7 Numara'], ['no10', '10 Numara'], ['simsek', 'Şimşek'], ['taraftar', 'Taraftar'], ['yildizf', 'Yıldızlı Forma'], ['sampiyon', 'Şampiyon Forması'],
      ['sarikirmizi', 'Sarı-Kırmızı'], ['sarilacivert', 'Sarı-Lacivert'], ['siyahbeyaz', 'Siyah-Beyaz'], ['bordomavi', 'Bordo-Mavi'], ['yesilbeyaz', 'Yeşil-Beyaz'], ['kirmizibeyaz', 'Kırmızı-Beyaz'], ['turuncusiyah', 'Turuncu-Siyah'], ['morsari', 'Mor-Sarı'],
      ['no1', '1 Numara'], ['no9', '9 Numara'], ['no23', '23 Numara'], ['no99', '99 Numara'], ['kaptan', 'Kaptan Bandı'], ['alev', 'Alev Bandı'], ['elmasb', 'Elmas Bant'], ['altinkaptan', 'Altın Kaptan']] },
    { id: 'desen', name: 'Desen', icon: '🌀', base: 60, top: 1900, items: [['cizgili', 'Çizgili'], ['puantiye', 'Puantiyeli'], ['dama', 'Damalı'], ['zebra', 'Zebra'], ['yildiz', 'Yıldızlı'], ['bayrak', 'Ay Yıldız'], ['galaksi', 'Galaksi'], ['ates', 'Ateş'],
      ['kalpd', 'Kalpli'], ['kafes', 'Kafes'], ['karpuz', 'Karpuz'], ['futbol', 'Futbol Topu'], ['basket', 'Basketbol'], ['mermer', 'Mermer'], ['kamuflaj', 'Kamuflaj'], ['leopar', 'Leopar'],
      ['ekose', 'Ekose'], ['zigzag', 'Zikzak'], ['seker', 'Şeker Kamışı'], ['gokkusagid', 'Gökkuşağı'], ['yapboz', 'Yapboz'], ['cicek', 'Çiçekli'], ['nota', 'Notalar'], ['dunya', 'Dünya']] },
    { id: 'gozluk', name: 'Gözlük', icon: '🕶️', base: 65, top: 2100, items: [['gunes', 'Güneş Gözlüğü'], ['yuvarlak', 'Yuvarlak Gözlük'], ['kalp', 'Kalp Gözlük'], ['yildizg', 'Yıldız Gözlük'], ['3d', '3D Gözlük'], ['kayak', 'Kayak Gözlüğü'], ['monokl', 'Tek Gözlük'], ['lazer', 'Lazer Vizör'],
      ['pilot', 'Pilot Gözlüğü'], ['kedi', 'Kedi Gözü'], ['kalin', 'Kalın Çerçeve'], ['pembeyuv', 'Pembe Yuvarlak'], ['dalgic', 'Dalgıç Maskesi'], ['kaynak', 'Kaynakçı Gözlüğü'], ['komik', 'Komik Gözler'], ['korsanbant', 'Korsan Bandı'],
      ['neonvizor', 'Neon Vizör'], ['vr', 'Sanal Gerçeklik'], ['gecegorus', 'Gece Görüş'], ['kalpneon', 'Neon Kalp'], ['yildizneon', 'Neon Yıldız'], ['karmaske', 'Kar Maskesi'], ['parti', 'Parti Gözlüğü'], ['durbun', 'Dürbün']] },
    { id: 'sapka', name: 'Şapka', icon: '🎩', base: 80, top: 2600, items: [['kep', 'Kep'], ['parti', 'Parti Şapkası'], ['kovboy', 'Kovboy Şapkası'], ['silindir', 'Silindir Şapka'], ['korsan', 'Korsan Şapkası'], ['viking', 'Viking Miğferi'], ['sihirbaz', 'Sihirbaz Şapkası'], ['tac', 'Kral Tacı'],
      ['bere', 'Bere'], ['fes', 'Fes'], ['sef', 'Şef Şapkası'], ['polis', 'Polis Kepi'], ['itfaiye', 'İtfaiyeci Kaskı'], ['yariskaski', 'Yarış Kaskı'], ['tavsan', 'Tavşan Kulakları'], ['kedikulak', 'Kedi Kulakları'],
      ['noel', 'Noel Baba'], ['cadi', 'Cadı Şapkası'], ['aycicegi', 'Ayçiçeği'], ['pervaneli', 'Pervaneli Şapka'], ['mezuniyet', 'Mezuniyet Kepi'], ['sombrero', 'Sombrero'], ['kralice', 'Kraliçe Tacı'], ['astronot', 'Astronot Kaskı']] },
    { id: 'iz', name: 'İz', icon: '✨', base: 95, top: 3200, items: [['kivilcim', 'Kıvılcım'], ['duman', 'Duman'], ['kalpler', 'Kalpler'], ['yildizlar', 'Yıldızlar'], ['gokkusagi', 'Gökkuşağı'], ['atesiz', 'Ateş İzi'], ['buz', 'Buz Kristalleri'], ['altintozu', 'Altın Tozu'],
      ['baloncuk', 'Baloncuklar'], ['yaprak', 'Yapraklar'], ['notalar', 'Notalar'], ['konfeti', 'Konfeti'], ['murekkep', 'Mürekkep'], ['neoncizgi', 'Neon Çizgi'], ['maviates', 'Mavi Ateş'], ['zehir', 'Zehir Yeşili'],
      ['elmaslar', 'Elmaslar'], ['paralar', 'Altın Paralar'], ['simsekler', 'Şimşekler'], ['altinkalp', 'Altın Kalpler'], ['kelebek', 'Kelebekler'], ['gokkusagiyildiz', 'Gökkuşağı Yıldızı'], ['galaksitozu', 'Galaksi Tozu'], ['krallik', 'Kraliyet İzi']] },
  ];
  const r5 = x => Math.round(x / 5) * 5;
  const priceOf = (c, i) => r5(c.base * (1 + 0.16 * i) + c.top * 0.14 * Math.pow(i / 23, 3));
  Magaza.CATS = CATS.map(c => {
    let prev = 0;
    return {
      id: c.id, name: c.name, icon: c.icon,
      items: c.items.map(([id, name, hex, fx], i) => { const price = Math.max(prev + 5, priceOf(c, i)); prev = price; return { id: c.id + ':' + id, key: id, cat: c.id, name, hex, fx, price, order: i }; }),
    };
  });
  Magaza.ITEMS = Object.fromEntries(Magaza.CATS.flatMap(c => c.items).map(it => [it.id, it]));
  Magaza.total = Object.values(Magaza.ITEMS).reduce((a, it) => a + it.price, 0);

  // oyuncunun giydiği ürünlerden misket görünümü
  Magaza.lookFor = function (info, eq) {
    eq = eq || {};
    const look = { color: info.color, color2: info.color2 };
    const renk = eq.renk && Magaza.ITEMS[eq.renk];
    if (renk) { look.color = renk.hex; look.color2 = null; if (renk.key === 'altin' || renk.fx === 'metal') look.metal = true; if (renk.fx === 'neon') look.neon = true; }
    for (const k of ['desen', 'forma', 'gozluk', 'sapka', 'iz']) { const it = eq[k] && Magaza.ITEMS[eq[k]]; if (it) look[k] = it.key; }
    return look;
  };

  // ================= DESENLER (misket dokusuna) =================
  function star(g, x, y, r, n = 5, inner = 0.45) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  function heart2d(g, x, y, r) { g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x + r * 1.4, y, x + r * 0.8, y - r, x, y - r * 0.35); g.bezierCurveTo(x - r * 0.8, y - r, x - r * 1.4, y, x, y + r * 0.9); g.fill(); }
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
    } else if (id === 'kalpd') { g.fillStyle = '#ff3d6e'; for (let k = 0; k < 30; k++) { const x = (k * 173) % W, y = 40 + ((k * 97) % (H - 80)); heart2d(g, x, y, 20); } }
    else if (id === 'kafes') { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; for (let x = 0; x <= W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
    else if (id === 'karpuz') { g.fillStyle = '#2d6a4f'; g.fillRect(0, 0, W, H); for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#40916c' : '#1b4332'; g.fillRect(k * W / 16, 0, W / 32, H); } g.fillStyle = '#ff4d6d'; g.fillRect(0, H * 0.3, W, H * 0.4); g.fillStyle = '#111'; for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse((k * 157) % W, H * 0.35 + ((k * 61) % (H * 0.3)), 6, 10, 0, 0, 7); g.fill(); } }
    else if (id === 'futbol') { g.fillStyle = '#fafafa'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; for (let y = 1; y < 4; y++) for (let x = 0; x < 6; x++) { const cx = x * W / 6 + (y % 2) * W / 12, cy = y * H / 4; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.lineTo(cx + Math.cos(a) * 40 / Math.max(0.4, Math.sin(Math.PI * y / 4)), cy + Math.sin(a) * 40); } g.closePath(); g.fill(); } }
    else if (id === 'basket') { g.fillStyle = '#e8701a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2b1a0e'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); for (const x of [W / 4, W * 3 / 4]) { g.moveTo(x, 0); g.lineTo(x, H); } g.stroke(); for (const x of [W / 4, W * 3 / 4]) { g.beginPath(); g.ellipse(x, H / 2, W / 8, H / 2, 0, 0, 7); g.stroke(); } }
    else if (id === 'mermer') { g.fillStyle = '#f2efe8'; g.fillRect(0, 0, W, H); for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(90,90,110,${0.15 + (k % 4) * 0.08})`; g.lineWidth = 2 + (k % 3) * 2; g.beginPath(); let y = (k * 71) % H; g.moveTo(0, y); for (let x = 0; x <= W; x += 20) { y += Math.sin(x / 60 + k) * 8; g.lineTo(x, y); } g.stroke(); } }
    else if (id === 'kamuflaj') { g.fillStyle = '#6b8e4e'; g.fillRect(0, 0, W, H); const cs = ['#3d5a2a', '#a3b18a', '#2b2d1f', '#8a7a4f']; for (let k = 0; k < 70; k++) { g.fillStyle = cs[k % 4]; g.beginPath(); const x = (k * 233) % W, y = (k * 127) % H; for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, r = 30 + ((k * i * 13) % 30); g.lineTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r); } g.fill(); } }
    else if (id === 'leopar') { g.fillStyle = '#e6b45a'; g.fillRect(0, 0, W, H); for (let k = 0; k < 60; k++) { const x = (k * 211) % W, y = (k * 89) % H; g.strokeStyle = '#2b1a0e'; g.lineWidth = 7; g.beginPath(); g.arc(x, y, 14, 0.3, 5.5); g.stroke(); g.fillStyle = '#8a5a1e'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
    else if (id === 'ekose') { g.fillStyle = '#b5121b'; g.fillRect(0, 0, W, H); for (let k = 0; k < 16; k++) { g.fillStyle = 'rgba(20,20,40,0.45)'; g.fillRect(k * 64, 0, 26, H); g.fillRect(0, k * 64, W, 26); g.fillStyle = 'rgba(255,220,120,0.5)'; g.fillRect(k * 64 + 40, 0, 4, H); g.fillRect(0, k * 64 + 40, W, 4); } }
    else if (id === 'zigzag') { g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 16; for (let y = 40; y < H; y += 90) { g.beginPath(); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + ((x / 40) % 2 ? 26 : -26)); g.stroke(); } }
    else if (id === 'seker') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.fillStyle = '#e63946'; for (let k = -10; k < 30; k++) { g.beginPath(); g.moveTo(k * 60, 0); g.lineTo(k * 60 + 30, 0); g.lineTo(k * 60 + 30 + H, H); g.lineTo(k * 60 + H, H); g.closePath(); g.fill(); } }
    else if (id === 'gokkusagid') { const cs = ['#e63946', '#ff9f1c', '#ffd60a', '#52b788', '#4cc9f0', '#3a0ca3', '#9d4edd']; cs.forEach((c, k) => { g.fillStyle = c; g.fillRect(0, k * H / cs.length, W, H / cs.length + 1); }); }
    else if (id === 'yapboz') { const cs = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4']; for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { g.fillStyle = cs[(x + y * 3) % 4]; g.fillRect(x * W / 8, y * H / 4, W / 8, H / 4); g.beginPath(); g.arc(x * W / 8 + W / 8, y * H / 4 + H / 8, 16, 0, 7); g.fill(); } }
    else if (id === 'cicek') { for (let k = 0; k < 26; k++) { const x = (k * 149) % W, y = 30 + ((k * 83) % (H - 60)); g.fillStyle = ['#ffffff', '#ffafcc', '#ffd60a'][k % 3]; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; g.beginPath(); g.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 11, 0, 7); g.fill(); } g.fillStyle = '#ff9f1c'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); } }
    else if (id === 'nota') { g.fillStyle = '#ffffff'; g.font = '900 64px Arial'; g.textAlign = 'center'; for (let k = 0; k < 28; k++) g.fillText(k % 2 ? '♪' : '♫', (k * 151) % W, 60 + ((k * 79) % (H - 80))); }
    else if (id === 'dunya') { g.fillStyle = '#1e6fb8'; g.fillRect(0, 0, W, H); g.fillStyle = '#3f9b4a'; for (let k = 0; k < 9; k++) { g.beginPath(); const x = (k * 263) % W, y = H * 0.25 + ((k * 97) % (H * 0.5)); for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9, r = 50 + ((k * i * 17) % 50); g.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 0.8); } g.fill(); } g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 34); g.fillRect(0, H - 34, W, 34); }
    else { // varsayılan kıvrım
      for (let k = 0; k < 3; k++) { g.strokeStyle = k === 1 ? light : c2; g.lineWidth = k === 1 ? 16 : 46; g.beginPath(); for (let x = -20; x <= W + 20; x += 10) { const y = H * (0.3 + 0.2 * k) + Math.sin(x / W * Math.PI * 4 + k * 1.7) * H * 0.13; x > -20 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    }
  };
  const TWO = { sarikirmizi: ['#ffd60a', '#d00000'], sarilacivert: ['#ffd60a', '#14213d'], siyahbeyaz: ['#111111', '#ffffff'], bordomavi: ['#7a1730', '#3a86ff'], yesilbeyaz: ['#2d9b4e', '#ffffff'], kirmizibeyaz: ['#e63946', '#ffffff'], turuncusiyah: ['#ff7b00', '#111111'], morsari: ['#7b2cbf', '#ffd60a'] };
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
    else if (TWO[id]) { const [a, b] = TWO[id]; for (let k = 0; k < 6; k++) band(H * (0.36 + k * 0.056), 30, k % 2 ? b : a); }
    else if (/^no\d+$/.test(id)) { band(H / 2, 150, '#1b1b24'); num(id.slice(2), '#ffd60a'); }
    else if (id === 'kaptan') { band(H / 2, 110, '#ffd60a'); num('C', '#1b1b24'); }
    else if (id === 'alev') { band(H / 2, 120, '#1b1b24'); g.fillStyle = '#ff6d00'; for (let k = 0; k < 24; k++) { const x = k * W / 24; g.beginPath(); g.moveTo(x, H / 2 + 50); g.quadraticCurveTo(x + 8, H / 2, x + 20, H / 2 - 50); g.quadraticCurveTo(x + 30, H / 2 + 5, x + 42, H / 2 + 50); g.fill(); } }
    else if (id === 'elmasb') { band(H / 2, 120, '#e0f7ff'); g.fillStyle = '#4cc9f0'; for (let k = 0; k < 14; k++) { const x = (k + 0.5) * W / 14; g.beginPath(); g.moveTo(x, H / 2 - 45); g.lineTo(x + 26, H / 2); g.lineTo(x, H / 2 + 45); g.lineTo(x - 26, H / 2); g.closePath(); g.fill(); } }
    else if (id === 'altinkaptan') { band(H / 2, 160, '#d9a520'); band(H / 2 - 76, 10, '#ffffff'); band(H / 2 + 76, 10, '#ffffff'); num('C', '#ffffff', '#7a5200'); }
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
  const S2 = (c, rough) => new THREE.MeshStandardMaterial({ color: col(c), roughness: rough != null ? rough : 0.6 });
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
    } else if (id === 'bere') {
      h.add(mesh(new THREE.SphereGeometry(r * 0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), S2('#e63946', 1), 0, -0.04, 0));
      const rim = mesh(new THREE.TorusGeometry(r * 0.58, r * 0.08, 8, 28), S2('#ffffff', 1), 0, -0.02, 0); rim.rotation.x = Math.PI / 2; h.add(rim);
      h.add(mesh(new THREE.SphereGeometry(r * 0.16, 12, 8), S2('#ffffff', 1), 0, r * 0.62, 0));
    } else if (id === 'fes') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.42, r * 0.55, 24), S2('#b5121b', 0.6), 0, r * 0.26, 0));
      h.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, r * 0.4, 6), M.black, r * 0.2, r * 0.45, 0));
      h.add(mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), M.black, r * 0.3, r * 0.26, 0));
    } else if (id === 'sef') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, r * 0.35, 24), M.white, 0, r * 0.16, 0));
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; h.add(mesh(new THREE.SphereGeometry(r * 0.26, 12, 8), M.white, Math.cos(a) * r * 0.22, r * 0.5, Math.sin(a) * r * 0.22)); }
    } else if (id === 'polis') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.44, r * 0.32, 24), S2('#14213d', 0.5), 0, r * 0.14, 0));
      h.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.04, 24, 1, false, -Math.PI / 2, Math.PI), M.black, 0, 0, r * 0.25));
      h.add(mesh(new THREE.CircleGeometry(r * 0.1, 6), M.gold, 0, r * 0.18, r * 0.5));
    } else if (id === 'itfaiye') {
      h.add(mesh(new THREE.SphereGeometry(r * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), S2('#d00000', 0.3), 0, -0.04, 0));
      const br = mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.85, 0.04, 28), S2('#d00000', 0.3)); br.scale.z = 1.25; br.position.z = r * 0.1; h.add(br);
      h.add(mesh(new THREE.BoxGeometry(r * 0.12, r * 0.5, r * 0.06), M.gold, 0, r * 0.25, r * 0.55));
    } else if (id === 'yariskaski' || id === 'astronot') {
      const dome = mesh(new THREE.SphereGeometry(r * 1.12, 32, 20), id === 'astronot' ? new THREE.MeshPhysicalMaterial({ color: col('#e8f4ff'), transparent: true, opacity: 0.32, roughness: 0, clearcoat: 1 }) : S2('#1d3557', 0.2), 0, -r * 0.82, 0);
      if (id === 'yariskaski') { const v = mesh(new THREE.SphereGeometry(r * 1.13, 32, 12, -0.9, 1.8, 1.2, 0.6), S2('#ffd60a', 0.1), 0, -r * 0.82, 0); h.add(v); }
      else { const rg = mesh(new THREE.TorusGeometry(r * 1.08, 0.06, 8, 40), M.white, 0, -r * 1.3, 0); rg.rotation.x = Math.PI / 2; h.add(rg); }
      h.add(dome);
    } else if (id === 'tavsan' || id === 'kedikulak') {
      for (const sx of [-1, 1]) {
        const e = id === 'tavsan' ? mesh(new THREE.SphereGeometry(r * 0.18, 12, 10), M.white, sx * r * 0.25, r * 0.5, 0) : mesh(new THREE.ConeGeometry(r * 0.2, r * 0.35, 4), S2('#8d6e63', 0.8), sx * r * 0.32, r * 0.12, 0);
        if (id === 'tavsan') { e.scale.set(0.8, 3, 0.6); e.rotation.z = -sx * 0.15; const inner = mesh(new THREE.SphereGeometry(r * 0.1, 10, 8), M.pink, sx * r * 0.25, r * 0.5, r * 0.06); inner.scale.set(0.8, 3, 0.3); h.add(inner); }
        else e.rotation.z = -sx * 0.3;
        h.add(e);
      }
    } else if (id === 'noel') {
      const c = mesh(new THREE.ConeGeometry(r * 0.45, r * 0.9, 24), M.red, 0, r * 0.4, 0); c.rotation.z = 0.35; h.add(c);
      const rim = mesh(new THREE.TorusGeometry(r * 0.45, r * 0.1, 8, 24), M.white, 0, 0.02, 0); rim.rotation.x = Math.PI / 2; h.add(rim);
      h.add(mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), M.white, r * 0.3, r * 0.75, 0));
    } else if (id === 'cadi') {
      const c = mesh(new THREE.ConeGeometry(r * 0.4, r * 1.3, 24), S2('#2b1d3a', 0.7), 0, r * 0.62, 0); c.rotation.z = -0.2; h.add(c);
      h.add(mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.03, 32), S2('#2b1d3a', 0.7)));
      const band = mesh(new THREE.TorusGeometry(r * 0.4, 0.035, 6, 24), S2('#7b2cbf', 0.4), 0, r * 0.06, 0); band.rotation.x = Math.PI / 2; h.add(band);
    } else if (id === 'aycicegi') {
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, pt = mesh(new THREE.SphereGeometry(r * 0.16, 10, 8), M.yellow, Math.cos(a) * r * 0.38, r * 0.08, Math.sin(a) * r * 0.38); pt.scale.set(1.4, 0.3, 0.7); pt.rotation.y = -a; h.add(pt); }
      h.add(mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, 0.06, 20), M.brown, 0, r * 0.1, 0));
    } else if (id === 'pervaneli') {
      h.add(mesh(new THREE.SphereGeometry(r * 0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), S2('#3a86ff', 0.6), 0, -0.04, 0));
      h.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, r * 0.3, 8), M.steel, 0, r * 0.62, 0));
      const prop = new THREE.Group(); prop.position.y = r * 0.78; prop.userData.spin = 14;
      for (const c2 of ['#e63946', '#ffd60a']) { const bl = mesh(new THREE.BoxGeometry(r * 0.9, 0.02, r * 0.14), S2(c2, 0.4)); bl.rotation.y = c2 === '#e63946' ? 0 : Math.PI / 2; prop.add(bl); }
      h.add(prop);
    } else if (id === 'mezuniyet') {
      h.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.44, r * 0.22, 24), M.black, 0, r * 0.08, 0));
      const top = mesh(new THREE.BoxGeometry(r * 1.1, 0.04, r * 1.1), M.black, 0, r * 0.22, 0); top.rotation.y = Math.PI / 4; h.add(top);
      h.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, r * 0.4, 6), M.yellow, r * 0.4, r * 0.05, 0));
    } else if (id === 'sombrero') {
      h.add(mesh(new THREE.ConeGeometry(r * 0.38, r * 0.6, 24), S2('#e9c46a', 0.9), 0, r * 0.28, 0));
      h.add(mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.15, 0.05, 36), S2('#e9c46a', 0.9)));
      const band = mesh(new THREE.TorusGeometry(r * 1.1, 0.05, 6, 36), M.red, 0, 0.03, 0); band.rotation.x = Math.PI / 2; h.add(band);
    } else if (id === 'kralice') {
      const ring = mesh(new THREE.TorusGeometry(r * 0.45, 0.04, 8, 32, Math.PI), M.gold, 0, r * 0.05, 0); h.add(ring);
      for (let k = 0; k < 5; k++) { const a = Math.PI * (k + 0.5) / 5; h.add(mesh(new THREE.ConeGeometry(r * 0.06, r * (k === 2 ? 0.38 : 0.24), 8), M.gold, Math.cos(a) * r * 0.45, r * 0.18, Math.sin(a) * r * 0.45)); }
      h.add(mesh(new THREE.OctahedronGeometry(r * 0.09), M.pink, 0, r * 0.32, r * 0.45));
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
    else if (id === 'pilot') { for (const sx of [-1, 1]) { const m = ext(heartShape(ls * 1.0), M.lensDark, sx * lx); } bridge(M.gold); g.children.forEach(c => { if (c.geometry && c.geometry.type === 'ExtrudeGeometry') c.rotation.z = Math.PI; }); }
    else if (id === 'kedi') { for (const sx of [-1, 1]) { const m = lens(new THREE.BoxGeometry(ls * 2.2, ls * 1.1, 0.03), M.lensDark, sx * lx); m.rotation.z = -sx * 0.25; const tip = mesh(new THREE.ConeGeometry(ls * 0.35, ls * 0.8, 3), M.pink, sx * (lx + ls * 1.2), ls * 0.6, 0); tip.rotation.z = -sx * 1.2; g.add(tip); } bridge(M.pink); }
    else if (id === 'kalin') { for (const sx of [-1, 1]) { lens(new THREE.BoxGeometry(ls * 2.1, ls * 1.6, 0.03), M.lensClear, sx * lx); g.add(mesh(new THREE.BoxGeometry(ls * 2.3, ls * 0.35, 0.06), M.black, sx * lx, ls * 0.7, 0.01)); } bridge(M.black); }
    else if (id === 'pembeyuv') { for (const sx of [-1, 1]) { disc(ls * 1.05, M.lensRed, sx * lx); ring(ls * 1.05, M.pink, sx * lx); } bridge(M.pink); }
    else if (id === 'dalgic' || id === 'karmaske') { const v = mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.6, ls * 1.9, 0.12), id === 'dalgic' ? M.lensClear : M.white, 0, 0, 0); g.add(v); g.add(mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.9, ls * 2.2, 0.06), id === 'dalgic' ? M.blue : M.black, 0, 0, -0.04)); if (id === 'dalgic') { const sn = mesh(new THREE.CylinderGeometry(0.05, 0.05, r * 1.4, 8), M.yellow, lx + ls * 1.8, r * 0.3, -r * 0.3); g.add(sn); } else { const st = mesh(new THREE.TorusGeometry(r * 0.99, 0.04, 6, 40), M.lensBlue, 0, 0, -r * 0.93); st.rotation.x = Math.PI / 2; g.add(st); } }
    else if (id === 'kaynak') { for (const sx of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(ls * 0.9, ls * 1.05, 0.18, 20), M.black, sx * lx, 0, 0.05); c.rotation.x = Math.PI / 2; g.add(c); disc(ls * 0.8, M.lensBlue, sx * lx).position.z = 0.15; } bridge(M.black); }
    else if (id === 'komik') { for (const sx of [-1, 1]) { g.add(mesh(new THREE.SphereGeometry(ls * 1.05, 16, 12), M.white, sx * lx, 0.02, 0.02)); g.add(mesh(new THREE.SphereGeometry(ls * 0.5, 12, 10), M.black, sx * lx + 0.03, -0.04, ls * 0.75)); } }
    else if (id === 'korsanbant') { const pb = mesh(new THREE.CylinderGeometry(ls * 1.1, ls * 1.1, 0.05, 20), M.black, lx, 0, 0.02); pb.rotation.x = Math.PI / 2; g.add(pb); const st = mesh(new THREE.TorusGeometry(r * 1.0, 0.025, 6, 40), M.black, 0, 0.06, -r * 0.93); st.rotation.x = Math.PI / 2 - 0.3; g.add(st); }
    else if (id === 'neonvizor') { const v = mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.6, ls * 0.9, 0.05), new THREE.MeshStandardMaterial({ color: col('#00f5d4'), emissive: col('#00f5d4'), emissiveIntensity: 2.2, transparent: true, opacity: 0.85 }), 0, 0, 0); g.add(v); bridge(M.steel); }
    else if (id === 'vr') { g.add(mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.4, ls * 1.8, ls * 1.4), M.white, 0, 0, ls * 0.4)); g.add(mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.2, ls * 1.4, 0.02), new THREE.MeshStandardMaterial({ color: col('#4cc9f0'), emissive: col('#4cc9f0'), emissiveIntensity: 1.2 }), 0, 0, ls * 1.12)); }
    else if (id === 'gecegorus') { for (const sx of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(ls * 0.6, ls * 0.7, ls * 1.6, 16), M.black, sx * lx * 0.8, 0, ls * 0.7); c.rotation.x = Math.PI / 2; g.add(c); const d = disc(ls * 0.55, new THREE.MeshStandardMaterial({ color: col('#39ff14'), emissive: col('#39ff14'), emissiveIntensity: 2 }), sx * lx * 0.8); d.position.z = ls * 1.52; } }
    else if (id === 'kalpneon' || id === 'yildizneon') { const nm = new THREE.MeshStandardMaterial({ color: col(id === 'kalpneon' ? '#ff2fd6' : '#ffd60a'), emissive: col(id === 'kalpneon' ? '#ff2fd6' : '#ffd60a'), emissiveIntensity: 2.2 }); for (const sx of [-1, 1]) ext(id === 'kalpneon' ? heartShape(ls * 1.05) : starShape(ls * 1.25), nm, sx * lx); bridge(nm); }
    else if (id === 'parti') { for (const sx of [-1, 1]) { ext(starShape(ls * 1.3), new THREE.MeshStandardMaterial({ color: col(sx < 0 ? '#ff006e' : '#3a86ff'), metalness: 0.9, roughness: 0.2 }), sx * lx); } bridge(M.gold); }
    else if (id === 'durbun') { for (const sx of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(ls * 0.55, ls * 0.75, ls * 2.4, 16), M.black, sx * lx * 0.8, 0, ls * 1.1); c.rotation.x = Math.PI / 2; g.add(c); } g.add(mesh(new THREE.BoxGeometry(lx * 1.2, ls * 0.5, ls * 0.8), M.black, 0, 0, ls * 0.9)); }
    else if (id === 'lazer') { const v = mesh(new THREE.BoxGeometry(lx * 2 + ls * 2.4, ls * 0.7, 0.05), M.laser, 0, 0, 0); g.add(v); bridge(M.steel); }
  };

  // ================= İZLER =================
  // şekiller: 0 daire, 1 kalp, 2 yıldız, 3 kar tanesi, 4 nota, 5 yaprak, 6 elmas, 7 şimşek
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
    else if (id === 'baloncuk') P.emit(at, { x: back.x + rr(0.3), y: 0.7 + Math.random() * 0.5, z: back.z + rr(0.3) }, '#d6f4ff', 0.35 + Math.random() * 0.3, 1.4, -0.12, 0);
    else if (id === 'yaprak') P.emit(at, { x: back.x + rr(0.7), y: 0.5, z: back.z + rr(0.7) }, ['#52b788', '#95d5b2', '#e9c46a', '#f4a261'][Math.floor(Math.random() * 4)], 0.38, 1.3, 0.12, 5);
    else if (id === 'notalar') P.emit(at, { x: back.x + rr(0.4), y: 0.8, z: back.z + rr(0.4) }, ['#ffffff', '#ffd60a', '#ff70a6'][Math.floor(Math.random() * 3)], 0.42, 1.0, -0.08, 4);
    else if (id === 'konfeti') P.emit(at, { x: back.x + rr(1.5), y: 1 + Math.random() * 2, z: back.z + rr(1.5) }, ['#ff006e', '#ffbe0b', '#3a86ff', '#8ac926', '#8338ec'][Math.floor(Math.random() * 5)], 0.18, 1.2, 0.5, Math.random() < 0.5 ? 6 : 0);
    else if (id === 'murekkep') P.emit(at, { x: back.x * 0.3, y: 0.05, z: back.z * 0.3 }, Math.random() < 0.7 ? '#111a3a' : '#3a0ca3', 0.6, 1.4, 0, 0);
    else if (id === 'neoncizgi') { P.emit(at, { x: 0, y: 0, z: 0 }, '#00f5d4', 0.3, 0.6, 0, 0); P.emit(at, { x: 0, y: 0, z: 0 }, '#ff2fd6', 0.18, 0.6, 0, 0); }
    else if (id === 'maviates') P.emit(at, { x: back.x + rr(0.4), y: 1.3 + Math.random(), z: back.z + rr(0.4) }, ['#e0f7ff', '#4cc9f0', '#3a0ca3'][Math.floor(Math.random() * 3)], 0.45, 0.45, -0.3, 0);
    else if (id === 'zehir') P.emit(at, { x: back.x + rr(0.4), y: 0.4, z: back.z + rr(0.4) }, Math.random() < 0.6 ? '#7bff00' : '#2d6a00', 0.5, 0.9, -0.05, 0);
    else if (id === 'elmaslar') P.emit(at, { x: back.x + rr(0.6), y: 0.6 + rr(0.4), z: back.z + rr(0.6) }, Math.random() < 0.6 ? '#bdf3ff' : '#ffffff', 0.4, 0.9, 0.2, 6);
    else if (id === 'paralar') P.emit(at, { x: back.x + rr(0.8), y: 1.2 + Math.random(), z: back.z + rr(0.8) }, Math.random() < 0.7 ? '#ffc300' : '#ffe680', 0.32, 1.0, 0.9, 0);
    else if (id === 'simsekler') P.emit(at, { x: back.x + rr(0.8), y: rr(0.8), z: back.z + rr(0.8) }, Math.random() < 0.6 ? '#fff275' : '#ffffff', 0.48, 0.4, 0, 7);
    else if (id === 'altinkalp') P.emit(at, { x: back.x + rr(0.4), y: 0.9, z: back.z + rr(0.4) }, Math.random() < 0.6 ? '#ffc300' : '#fff3b0', 0.42, 0.9, -0.05, 1);
    else if (id === 'kelebek') P.emit(at, { x: back.x + rr(1), y: 0.8 + rr(0.6), z: back.z + rr(1) }, ['#ff70a6', '#70d6ff', '#ffd670', '#c77dff'][Math.floor(Math.random() * 4)], 0.42, 1.2, -0.1, 1);
    else if (id === 'gokkusagiyildiz') { const c = new THREE.Color().setHSL((t * 0.8 + Math.random() * 0.1) % 1, 0.95, 0.62); P.emit(at, { x: back.x + rr(0.5), y: 0.4, z: back.z + rr(0.5) }, '#' + c.getHexString(), 0.4, 1.0, 0, 2); }
    else if (id === 'galaksitozu') P.emit(at, { x: back.x + rr(0.6), y: rr(0.6), z: back.z + rr(0.6) }, ['#7b2cbf', '#4cc9f0', '#f72585', '#ffffff'][Math.floor(Math.random() * 4)], 0.22, 1.3, 0, Math.random() < 0.3 ? 2 : 0);
    else if (id === 'krallik') { P.emit(at, { x: back.x + rr(0.5), y: 0.5, z: back.z + rr(0.5) }, Math.random() < 0.5 ? '#ffd700' : '#7b2cbf', 0.42, 1.0, 0, 2); if (Math.random() < 0.3) P.emit(at, { x: rr(0.5), y: 1.5, z: rr(0.5) }, '#ffffff', 0.2, 0.6, 0.4, 6); }
  };
  // mağaza kartı simgesi
  Magaza.iconFor = function (it) {
    const e = { renk: '', forma: '👕', desen: '🌀', gozluk: '🕶️', sapka: '🎩', iz: '✨' }[it.cat];
    const map = { kep: '🧢', parti: '🥳', kovboy: '🤠', silindir: '🎩', korsan: '🏴‍☠️', viking: '🪖', sihirbaz: '🧙', tac: '👑', gunes: '🕶️', yuvarlak: '👓', kalp: '😍', yildizg: '🤩', '3d': '🥽', kayak: '🥽', monokl: '🧐', lazer: '🔴', kivilcim: '🎇', duman: '💨', kalpler: '💕', yildizlar: '🌟', gokkusagi: '🌈', atesiz: '🔥', buz: '❄️', altintozu: '💫', cizgili: '〰️', puantiye: '⚪', dama: '🏁', zebra: '🦓', yildiz: '⭐', bayrak: '🇹🇷', galaksi: '🌌', ates: '🔥', bant: '🎽', cift: '🎽', no7: '7️⃣', no10: '🔟', simsek: '⚡', taraftar: '📣', yildizf: '✴️', sampiyon: '🏆', kiraz: '🍒', gunbatimi: '🌅', limon: '🍋', nane: '🌿', gokyuzu: '☁️', lavanta: '💜', morgece: '🌌', kahve: '☕', gumus: '🥈', bronz: '🥉', bakir: '🟠', zumrut: '💚', yakut: '❤️', safir: '💙', neonyesil: '🟩', neonpembe: '🩷', sarikirmizi: '🟨', sarilacivert: '🟦', siyahbeyaz: '⬛', bordomavi: '🟥', yesilbeyaz: '🟩', kirmizibeyaz: '🔴', turuncusiyah: '🟧', morsari: '🟪', no1: '1️⃣', no9: '9️⃣', no23: '🔢', no99: '💯', kaptan: '©️', alev: '🔥', elmasb: '💎', altinkaptan: '🏅', kalpd: '💗', kafes: '#️⃣', karpuz: '🍉', futbol: '⚽', basket: '🏀', mermer: '🪨', kamuflaj: '🪖', leopar: '🐆', ekose: '🧣', zigzag: '⚡', seker: '🍭', gokkusagid: '🌈', yapboz: '🧩', cicek: '🌸', nota: '🎵', dunya: '🌍', pilot: '🕶️', kedi: '🐱', kalin: '🤓', pembeyuv: '💗', dalgic: '🤿', kaynak: '🥽', komik: '👀', korsanbant: '🏴‍☠️', neonvizor: '🟦', vr: '🥽', gecegorus: '🟢', kalpneon: '💖', yildizneon: '🌟', karmaske: '⛷️', durbun: '🔭', bere: '🧶', fes: '🪭', sef: '👨‍🍳', polis: '👮', itfaiye: '🧑‍🚒', yariskaski: '🏎️', tavsan: '🐰', kedikulak: '😺', noel: '🎅', cadi: '🧙‍♀️', aycicegi: '🌻', pervaneli: '🚁', mezuniyet: '🎓', sombrero: '🪅', kralice: '👸', astronot: '👩‍🚀', baloncuk: '🫧', yaprak: '🍃', notalar: '🎶', konfeti: '🎊', murekkep: '🖋️', neoncizgi: '〰️', maviates: '🔵', zehir: '☣️', elmaslar: '💎', paralar: '🪙', simsekler: '⚡', altinkalp: '💛', kelebek: '🦋', gokkusagiyildiz: '🌠', galaksitozu: '🌌', krallik: '👑' };
    return map[it.key] || e;
  };
})();
