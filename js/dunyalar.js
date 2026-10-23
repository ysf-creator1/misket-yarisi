/* Misket Yarışı — 20 dünya, 200 parkur, kupalar ve parkur üreticisi
 * Her dünya 10 parkurdur ve kendine özgü bir çevresi vardır (ev odaları, şehir, lunapark, dünyanın ilginç yerleri…).
 * Parkurlar numarasına göre hep aynı şekilde üretilir (tohumlu rastgele). Zorluk ve süre 1 → 200 yavaş yavaş artar:
 * 1. parkur ≈ 60 sn, 200. parkur ≈ 180 sn. Elle yapılmış 12 özel parkur, süresi uyan sıralara yerleştirilmiştir.
 */
(function (G) {
  'use strict';
  const MP = G.MP = G.MP || {};
  const NT = 200, PER = 10;

  // ---- dünyalar ----
  // env: grafik çevresi (js/cevre.js) · style: o dünyada sık çıkan engeller · pal: parkur renkleri
  const W = (id, name, icon, env, pal, style, names, extra) => Object.assign({ id, name, icon, env, pal, style, names }, extra || {});
  MP.WORLDS = [
    W(0, 'Yeşil Vadi', '🌲', 'doga', ['#3d8bff', '#ff6b6b', '#ffd166', '#06d6a0'], { duz: 1.3, slalom: 1.2 },
      ['Çaylak Tepesi', 'Çam Yokuşu', 'Dere Kenarı', 'Mantar Patikası', 'Rüzgârlı Sırt', 'Göl Kıyısı', 'Kozalak Yolu', 'Yaban Çayırı', 'Şelale Başı', 'Vadi Finali']),
    W(1, 'Mutfak', '🍳', 'mutfak', ['#ff6b35', '#f7c548', '#2ec4b6', '#e71d36'], { huni: 1.6, civi: 1.3 },
      ['Tezgâh Kaydırağı', 'Çaydanlık Virajı', 'Kaşık Köprüsü', 'Buzdolabı İnişi', 'Tabak Hunisi', 'Lavabo Yolu', 'Fırın Rampası', 'Baharat Rafı', 'Kahvaltı Masası', 'Tencere Turu']),
    W(2, 'Salon', '🛋️', 'salon', ['#8e5bd8', '#f2a541', '#3aa7a3', '#e5446d'], { tampon: 1.4, slalom: 1.3 },
      ['Koltuk Tepesi', 'Halı Yolu', 'Kitaplık Rampası', 'Sehpa Virajı', 'Şömine Önü', 'Televizyon Kanyonu', 'Yastık Dağı', 'Lamba Kulesi', 'Perde Şelalesi', 'Salon Finali']),
    W(3, 'Çocuk Odası', '🧸', 'cocuk', ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'], { trambolin: 1.6, tampon: 1.3 },
      ['Lego Kalesi', 'Oyuncak Kutusu', 'Ranza Kaydırağı', 'Ayıcık Tepesi', 'Renkli Küpler', 'Tren Rayı', 'Uçurtma Yolu', 'Boya Kalemi Virajı', 'Masal Kitabı', 'Uyku Vakti']),
    W(4, 'Banyo', '🛁', 'banyo', ['#4cc9f0', '#f72585', '#b8f2e6', '#ffd166'], { huni: 1.7, catal2: 1.2 },
      ['Küvet Kaydırağı', 'Köpük Yolu', 'Lavabo Hunisi', 'Havlu Rampası', 'Fayans Labirenti', 'Sabun Kaydırağı', 'Diş Fırçası Köprüsü', 'Duş Şelalesi', 'Ayna Virajı', 'Banyo Finali']),
    W(5, 'Şehir Merkezi', '🏙️', 'sehir', ['#ffb703', '#219ebc', '#e63946', '#8ecae6'], { piston: 1.7, slalom: 1.3 },
      ['Gökdelen Rampası', 'Trafik Işıkları', 'Metro Tüneli', 'Köprü Geçidi', 'Çatı Katı', 'Meydan Turu', 'Otobüs Durağı', 'Neon Caddesi', 'Kule İnişi', 'Şehir Maratonu']),
    W(6, 'Oyun Parkı', '🛝', 'park', ['#ff70a6', '#70d6ff', '#ffd670', '#9b5de5'], { trambolin: 1.5, atlama: 1.5 },
      ['Kaydırak Başı', 'Salıncak Virajı', 'Kum Havuzu', 'Tahterevalli', 'Tırmanma Duvarı', 'Top Havuzu', 'Park Yolu', 'Fıskiye Meydanı', 'Ağaç Ev', 'Park Şampiyonası']),
    W(7, 'Lunapark', '🎡', 'lunapark', ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec'], { spiral: 1.8, pervane: 1.6 },
      ['Dönme Dolap', 'Atlıkarınca', 'Çarpışan Arabalar', 'Pamuk Şeker', 'Hız Treni', 'Korku Tüneli', 'Balon Patlatma', 'Gece Işıkları', 'Ayna Labirenti', 'Lunapark Gecesi']),
    W(8, 'Spor Salonu', '🏀', 'spor', ['#f77f00', '#003049', '#fcbf49', '#d62828'], { tampon: 1.6, trambolin: 1.4 },
      ['Basket Potası', 'Tribün İnişi', 'Voleybol Filesi', 'Koşu Bandı', 'Halter Rampası', 'Jimnastik Barı', 'Penaltı Noktası', 'Smaç Virajı', 'Soyunma Odası', 'Final Maçı']),
    W(9, 'Kapadokya', '🎈', 'kapadokya', ['#e76f51', '#f4a261', '#2a9d8f', '#e9c46a'], { atlama: 1.4, huni: 1.2 },
      ['Peri Bacaları', 'Balon Turu', 'Güvercinlik Vadisi', 'Uçhisar Kalesi', 'Kızıl Vadi', 'Yeraltı Şehri', 'Aşk Vadisi', 'Gün Doğumu', 'Ihlara Kanyonu', 'Göreme Finali']),
    W(10, 'Pamukkale', '⛰️', 'pamukkale', ['#48cae4', '#ffffff', '#ffb4a2', '#90e0ef'], { catal3: 1.5, huni: 1.3 },
      ['Beyaz Teraslar', 'Travertenler', 'Antik Havuz', 'Kireç Şelalesi', 'Hierapolis', 'Pamuk Kalesi', 'Mavi Göletler', 'Termal Yol', 'Gün Batımı Terası', 'Pamukkale Finali']),
    W(11, 'Mısır Piramitleri', '🐪', 'misir', ['#e9c46a', '#264653', '#e76f51', '#2a9d8f'], { civi: 1.4, catal2: 1.3 },
      ['Büyük Piramit', 'Sfenks Yolu', 'Nil Kıyısı', 'Çöl Fırtınası', 'Firavun Mezarı', 'Vaha Molası', 'Kum Tepeleri', 'Hiyeroglif Duvarı', 'Deve Kervanı', 'Giza Finali']),
    W(12, 'Paris', '🗼', 'paris', ['#003f88', '#ffffff', '#d90429', '#ffd60a'], { spiral: 1.4, slalom: 1.3 },
      ['Eyfel Kulesi', 'Sen Nehri', 'Zafer Takı', 'Montmartre Merdivenleri', 'Louvre Piramidi', 'Kafe Köşesi', 'Şanzelize', 'Notre Dame', 'Işık Şehri', 'Paris Finali']),
    W(13, 'Venedik', '🛶', 'venedik', ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'], { catal3: 1.6, catal2: 1.3 },
      ['Gondol Yolu', 'Rialto Köprüsü', 'Büyük Kanal', 'San Marco Meydanı', 'Maske Festivali', 'İç Çekiş Köprüsü', 'Murano Camı', 'Lagün Turu', 'Dar Sokaklar', 'Venedik Finali']),
    W(14, 'Japon Bahçesi', '🌸', 'japon', ['#ff8fab', '#ffffff', '#d62828', '#52b788'], { slalom: 1.5, pervane: 1.2 },
      ['Kiraz Çiçekleri', 'Pagoda Kulesi', 'Torii Kapısı', 'Koi Göleti', 'Bambu Ormanı', 'Taş Fenerler', 'Zen Bahçesi', 'Fuji Manzarası', 'Çay Evi', 'Sakura Finali']),
    W(15, 'Kutup', '🐧', 'kutup', ['#a2d2ff', '#ffffff', '#cdb4db', '#ffafcc'], { spiral: 1.4, atlama: 1.4 },
      ['Buz Dağı', 'Penguen Kaydırağı', 'İglo Köyü', 'Kuzey Işıkları', 'Kar Fırtınası', 'Buz Mağarası', 'Fok Kıyısı', 'Donmuş Göl', 'Kızak Yolu', 'Kutup Finali']),
    W(16, 'Tropik Ada', '🏝️', 'tropik', ['#00b4d8', '#ffb703', '#fb8500', '#52b788'], { trambolin: 1.4, huni: 1.3 },
      ['Palmiye Sahili', 'Mercan Resifi', 'Hindistan Cevizi', 'Lagün Kıyısı', 'Gün Batımı Plajı', 'Korsan Koyu', 'Şelale Ormanı', 'Volkan Adası', 'Kum Kalesi', 'Ada Finali']),
    W(17, 'Büyük Kanyon', '🌵', 'kanyon', ['#c1440e', '#f2a65a', '#3e1f0d', '#ffd29d'], { atlama: 1.5, piston: 1.2 },
      ['Kızıl Kayalar', 'Kanyon Kenarı', 'Kartal Yuvası', 'Kaktüs Vadisi', 'Colorado Nehri', 'Rüzgâr Kayası', 'Masa Dağı', 'Kayıp Patika', 'Gün Batımı Kanyonu', 'Kanyon Finali']),
    W(18, 'Volkan', '🌋', 'volkan', ['#d00000', '#ffba08', '#6a040f', '#f48c06'], { trambolin: 1.4, piston: 1.4 },
      ['Lav Nehri', 'Kül Bulutu', 'Magma Odası', 'Kraterin Ağzı', 'Obsidyen Yol', 'Duman Bacası', 'Ateş Çemberi', 'Sıcak Kaynak', 'Bazalt Sütunlar', 'Volkan Finali']),
    W(19, 'Uzay', '🚀', 'uzay', ['#7b2cbf', '#00f5d4', '#f15bb5', '#fee440'], { spiral: 1.6, pervane: 1.5, huni: 1.3 },
      ['Ay Yüzeyi', 'Asteroit Kuşağı', 'Mars Kanyonu', 'Satürn Halkası', 'Kara Delik', 'Uzay İstasyonu', 'Meteor Yağmuru', 'Samanyolu', 'Nebula Yolu', 'Şampiyonlar Galaksisi']),
  ];

  // ---- süre, puan, kupa ----
  MP.targetFor = id => Math.round(60 + 120 * (id - 1) / (NT - 1));
  MP.pointsFor = id => Math.round((100 + 165 * (id - 1) / (NT - 1)) / 5) * 5; // 1. olana verilen puan: 100 → 265
  MP.worldOf = id => MP.WORLDS[Math.floor((id - 1) / PER)];
  MP.CUPS = MP.WORLDS.map(w => ({
    id: w.id, name: w.name + ' Kupası', icon: w.icon, color: w.pal[0],
    bonus: 200 + 40 * w.id, tracks: [w.id * PER + 8, w.id * PER + 9, w.id * PER + 10],
  }));

  // elle yapılmış 12 özel parkur: süresi uyan sıraya
  const HAND_IDS = {};
  for (let k = 1; k <= 12; k++) { const T = Math.round(60 + (k - 1) * 120 / 11); HAND_IDS[Math.round(1 + (T - 60) / 120 * (NT - 1))] = k; }

  MP.TRACKS = [];
  for (let id = 1; id <= NT; id++) {
    const w = MP.worldOf(id), k = (id - 1) % PER;
    MP.TRACKS.push({
      id, world: w.id, name: w.names[k], target: MP.targetFor(id), hand: HAND_IDS[id] || null,
      theme: { env: w.env, palette: w.pal, world: w.id }, build: true,
    });
  }

  // ---- üretici ----
  // t: tahmini süre (sn, güçler açık) — test/uretici-testi.js ile ayarlandı
  const S = (b, len, drop) => b.straight({ len, drop: drop != null ? drop : len * 0.095 });
  const U = (b, dir, r = 8) => b.curve({ angle: 180 * dir, radius: r, drop: Math.PI * r * 0.09 });
  const SPI = (b, turns, dir, r = 6.5) => b.curve({ angle: 360 * turns * dir, radius: r, drop: 2 * Math.PI * r * turns * 0.115, bank: 12 });
  const sign = r => r() < 0.5 ? -1 : 1;
  const PIECES = {
    duz: { t: 3.2, w: d => 1.4 - d, f: (b, r) => S(b, 10 + Math.round(r() * 6)) },
    slalom: { t: 5.4, w: () => 1, f: (b, r, d) => b.slalom({ len: 12 + Math.round(r() * 4), boards: 3 + (d > 0.5 && r() < 0.5 ? 1 : 0) }) },
    tampon: { t: 5.2, w: () => 1, f: (b, r) => b.bumpers({ len: 11 + Math.round(r() * 3) }) },
    civi: { t: 5.0, w: () => 0.9, f: (b, r) => b.pegs({ len: 13 + Math.round(r() * 4), hw: 3.2 + r() * 0.4 }) },
    catal2: { t: 6.2, w: () => 0.9, f: (b, r) => b.split({ lanes: 2, lw: 1.2, len: 16 + Math.round(r() * 4), drop: 2.1, spread: 2.4, laneOpts: [{ spread: 3 }, { spread: 1, profile: MP.humps(0.2, 0.75, 3, 0.15) }] }) },
    catal3: { t: 6.8, w: d => 0.2 + d, f: (b, r) => b.split({ lanes: 3, lw: 1.15, len: 18 + Math.round(r() * 4), drop: 2.4, spread: 2.4, laneOpts: [{ spread: 3.2 }, { profile: MP.humps(0.25, 0.7, 2, 0.14) }, { spread: 1.6 }] }) },
    atlama: { t: 4.3, w: () => 0.9, f: (b, r, d) => b.jump({ run: 7, gap: 3 + d * 1.5 + r() * 0.5 }) },
    huni: { t: 11.5, w: d => 0.35 + 0.5 * d, f: (b, r) => b.funnel({ R: 5.5 + r() * 1.5, side: sign(r), depth: 3.2 + r() * 0.6 }) },
    pervane: { t: 5.0, w: d => 0.3 + 0.8 * d, f: (b, r, d) => b.spinner({ len: 11, arms: d > 0.4 && r() < 0.5 ? 3 : 2, speed: 1.3 + d * 0.6, dir: sign(r) }) },
    piston: { t: 5.8, w: d => 0.1 + 1.1 * d, f: (b, r, d) => b.pistons({ len: 14, count: 2 + (d > 0.5 && r() < 0.6 ? 1 : 0), period: 2.8 - d * 0.8 }) },
    trambolin: { t: 5.4, w: d => 0.2 + 0.8 * d, f: (b, r) => b.trampoline({ fall: 3.4 + r() * 0.7 }) },
    spiral: { t: 7.6, w: d => 0.15 + 0.6 * d, f: (b, r) => SPI(b, 1, sign(r), 6.5 + r() * 0.8) },
  };
  const T_START = 5.5, T_U = 4.6, T_FINISH = 3;
  MP.PIECES = PIECES;

  function pickPiece(r, d, style, recent) {
    const keys = Object.keys(PIECES);
    const ws = keys.map(k => Math.max(0, PIECES[k].w(d)) * (style[k] || 1) * (recent.includes(k) ? 0.25 : 1));
    let q = r() * ws.reduce((a, x) => a + x, 0);
    for (let i = 0; i < keys.length; i++) { q -= ws[i]; if (q <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  MP.timeScale = 0.94; // gerçek/tahmini süre oranı: 21 parkurluk simülasyonla ölçüldü (test/parkur-testi.js ornek)

  function genTrack(def, variant) {
    const r = MP.rng(def.id * 7919 + variant * 104729 + 17), d = (def.id - 1) / (NT - 1), w = MP.WORLDS[def.world];
    const pal = w.pal.slice(); for (let i = pal.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pal[i], pal[j]] = [pal[j], pal[i]]; }
    const b = new MP.Builder({ y0: 160, palette: pal });
    const goal = def.target / MP.timeScale;
    let est = T_START + T_FINISH, dir = sign(r), recent = [], pieces = [], pieceAt = [];
    b.start(); S(b, 8 + Math.round(r() * 4), 1.3); est += 2.5;
    while (est < goal - 2) {
      const n = 2 + (r() < 0.45 ? 1 : 0);
      for (let k = 0; k < n && est < goal - 2; k++) {
        const key = pickPiece(r, d, w.style, recent);
        pieceAt.push({ k: key, s: b.s });
        PIECES[key].f(b, r, d); est += PIECES[key].t; pieces.push(key);
        recent.push(key); if (recent.length > 3) recent.shift();
      }
      if (est < goal - 4) { pieceAt.push({ k: 'U', s: b.s }); U(b, dir, 8 + Math.round(r())); est += T_U; dir = -dir; }
    }
    S(b, 6); b.finish();
    const tr = b.finalize(def);
    tr.pieces = pieces; tr.pieceAt = pieceAt; tr.est = est;
    return tr;
  }

  // parkuru kur: özel (elle yapılmış) ya da üretilmiş; kendisiyle çakışıyorsa başka varyasyon dene
  const cache = {};
  MP.buildTrack = function (id) {
    const def = MP.TRACKS.find(t => t.id === id);
    if (!def) return null;
    if (def.hand) {
      const b = new MP.Builder({ y0: 160, palette: def.theme.palette });
      MP.HAND[def.hand](b);
      const tr = b.finalize(def); tr.special = true; return tr;
    }
    let tr = null;
    const v0 = cache[id] || 0;
    for (let v = v0; v < v0 + 12; v++) {
      tr = genTrack(def, v);
      if (!MP.overlaps(tr)) { cache[id] = v; tr.variant = v; break; }
    }
    return tr;
  };

  // parkurun kendisiyle çakıştığı yer var mı (farklı bölümler birbirine çok yakın)
  MP.overlaps = function (track) {
    const S2 = track.samples.filter((s, i) => i % 2 === 0);
    for (let i = 0; i < S2.length; i++) for (let j = i + 1; j < S2.length; j++) {
      const a = S2[i], c = S2[j];
      if (Math.abs(a.s - c.s) < 25) continue;
      if (Math.abs(a.p[1] - c.p[1]) < 3.2 && Math.hypot(a.p[0] - c.p[0], a.p[2] - c.p[2]) < a.hw + c.hw + 0.8) return true;
    }
    return false;
  };
})(typeof window !== 'undefined' ? window : globalThis);
