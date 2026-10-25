/* Misket Yarışı — oyun akışı: ekranlar, yarış, kamera, güç kartları, mağaza, kupalar, bahis, başarımlar, tekrar */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const { MP, MF, MG, MI, Kayit, THREE, Grafik, Magaza, Ses } = window;
  const camera = Grafik.camera, scene = Grafik.scene;

  const state = {
    player: null, trackId: 1, pick: 0, race: null, track: null, view: null, phase: 'loading', cam: 0,
    countdown: 0, endTimer: 0, slowDone: false, slowT: 0, cup: null, bet: null, mvs: [], colors: [],
    rec: [], replay: null, hand: null, wasLast: false, shop: { cat: 'renk', tryItem: null, mv: null, ped: null, ang: 0 },
  };
  const CAMS = ['Benim misketim', 'Lider', 'Genel bakış'];
  const SIDE_KINDS = ['jump', 'tramp', 'funnelExit', 'drop'];
  const INTRO = 5.6; // giriş animasyonu (≈2,4 sn) + 3-2-1 geri sayımı
  const MEDAL = ['🥇', '🥈', '🥉'];
  const OPEN_FREE = 10; // ilk 10 parkur herkese açık, sonrası sırayla açılır
  const openUpTo = p => Math.min(MP.TRACKS.length, Math.max(p.unlocked || 1, OPEN_FREE));
  const CUP_POINTS = [10, 7, 5, 3, 2, 1];
  const pointsFor = id => MP.pointsFor(id); // 1. olana verilen puan (P): 100 → 265; 2. P/2, 3. P/4
  const prizeFor = (id, place) => { const P = pointsFor(id); return place === 1 ? P : place === 2 ? Math.round(P / 2) : place === 3 ? Math.round(P / 4) : 0; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ================= SEVİYE =================
  const needXp = L => 40 * (L - 1) * L; // L. seviyeye ulaşmak için toplam XP
  function levelOf(xp) { let L = 1; while (xp >= needXp(L + 1)) L++; return L; }
  function levelFrac(xp) { const L = levelOf(xp), a = needXp(L), b = needXp(L + 1); return (xp - a) / (b - a); }

  // ================= BAŞARIMLAR =================
  const st = p => (p.stats = p.stats || {});
  const ACH = [
    { id: 'ilk_yaris', icon: '🏁', name: 'İlk Adım', desc: 'İlk yarışını bitir', reward: 50, check: p => p.races >= 1 },
    { id: 'ilk_zafer', icon: '🥇', name: 'İlk Zafer', desc: 'Bir yarış kazan', reward: 100, check: p => p.wins >= 1 },
    { id: 'podyum10', icon: '🥉', name: 'Podyum Müdavimi', desc: '10 kez ilk 3\'e gir', reward: 200, check: p => p.podiums >= 10 },
    { id: 'zafer10', icon: '🏆', name: 'Şampiyon Ruhu', desc: '10 yarış kazan', reward: 400, check: p => p.wins >= 10 },
    { id: 'zafer50', icon: '👑', name: 'Efsane', desc: '50 yarış kazan', reward: 1200, check: p => p.wins >= 50 },
    { id: 'guc10', icon: '⚡', name: 'Güç Meraklısı', desc: '10 güç kullan', reward: 50, check: p => (st(p).powers || 0) >= 10 },
    { id: 'guc100', icon: '🔋', name: 'Güç Ustası', desc: '100 güç kullan', reward: 300, check: p => (st(p).powers || 0) >= 100 },
    { id: 'tuzak25', icon: '🧱', name: 'Tuzakçı', desc: 'Rakiplere 25 tuzak kur', reward: 150, check: p => (st(p).traps || 0) >= 25 },
    { id: 'kalkan', icon: '🛡️', name: 'Delinmez', desc: 'Kalkanınla bir saldırıyı engelle', reward: 75, check: p => (st(p).blocks || 0) >= 1 },
    { id: 'geri_donus', icon: '🔥', name: 'Muhteşem Dönüş', desc: 'Sonuncuyken yarışı kazan', reward: 300, check: p => (st(p).comeback || 0) >= 1 },
    { id: 'bahis', icon: '🎲', name: 'Şanslı Tahmin', desc: 'Bir bahis kazan', reward: 75, check: p => (p.bets && p.bets.won) >= 1 },
    { id: 'kostum5', icon: '🛍️', name: 'Alışverişçi', desc: 'Mağazadan 5 ürün al', reward: 100, check: p => p.owned.length >= 5 },
    { id: 'kostum20', icon: '💎', name: 'Koleksiyoncu', desc: 'Mağazadan 20 ürün al', reward: 500, check: p => p.owned.length >= 20 },
    { id: 'kupa1', icon: '🏆', name: 'İlk Kupa', desc: 'Bir dünya kupasını kazan', reward: 150, check: p => cupWins(p) >= 1 },
    { id: 'kupa5', icon: '🥇', name: 'Kupa Avcısı', desc: '5 dünya kupası kazan', reward: 500, check: p => cupWins(p) >= 5 },
    { id: 'kupa20', icon: '💎', name: 'Dünya Şampiyonu', desc: '20 dünya kupasının hepsini kazan', reward: 2500, check: p => cupWins(p) >= 20 },
    { id: 'dunya5', icon: '🧭', name: 'Gezgin', desc: '5. dünyaya ulaş', reward: 200, check: p => p.unlocked >= 41 },
    { id: 'dunya10', icon: '🗺️', name: 'Dünya Turu', desc: '10. dünyaya ulaş', reward: 500, check: p => p.unlocked >= 91 },
    { id: 'dunya20', icon: '🚀', name: 'Uzayın Kapısı', desc: 'Son dünyaya (Uzay) ulaş', reward: 1200, check: p => p.unlocked >= 191 },
    { id: 'kasif', icon: '🏅', name: 'Kâşif', desc: '50 farklı parkurda ilk 3\'e gir', reward: 800, check: p => Object.values(p.best).filter(b => b.place <= 3).length >= 50 },
    { id: 'seviye10', icon: '⭐', name: 'Tecrübeli', desc: '10. seviyeye ulaş', reward: 300, check: p => levelOf(p.xp) >= 10 },
  ];
  const cupWins = p => Object.values(p.cups || {}).filter(v => v === 1).length;
  // ================= GÜNLÜK GÖREVLER =================
  // Her gün oyuncuya özel 3 görev (tarih + ada göre sabit) ve giriş ödülü (art arda günlerde artar)
  const DAILY_POOL = [
    { id: 'yaris', ad: '3 yarış bitir', hedef: 3, odul: 40 },
    { id: 'ilk3', ad: "2 yarışta ilk 3'e gir", hedef: 2, odul: 60 },
    { id: 'birinci', ad: '1 yarış kazan', hedef: 1, odul: 80 },
    { id: 'guc', ad: '6 güç kartı kullan', hedef: 6, odul: 40 },
    { id: 'tuzak', ad: '3 tuzak kur', hedef: 3, odul: 45 },
    { id: 'mp', ad: '1 çok oyunculu yarış yap', hedef: 1, odul: 70 },
    { id: 'kalkan', ad: 'Bir saldırıyı kalkanla engelle', hedef: 1, odul: 60 },
    { id: 'yeni', ad: 'Yeni bir parkur aç', hedef: 1, odul: 80 },
  ];
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dayBefore = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function ensureDaily(p) {
    const g = today(); p.daily = p.daily || {};
    if (p.daily.gun === g) return p.daily;
    const rnd = MP.rng([...(g + MI.key(p.name))].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
    const pool = DAILY_POOL.slice(), scale = 1 + Math.min(200, p.unlocked || 1) / 100, pick = [];
    while (pick.length < 3) { const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; pick.push({ id: t.id, ad: t.ad, hedef: t.hedef, ilerleme: 0, odul: Math.round(t.odul * scale / 5) * 5, alindi: false }); }
    const seri = p.daily.girisGun === dayBefore(g) ? (p.daily.seri || 0) + 1 : 1;
    p.daily = { gun: g, gorevler: pick, seri, girisOdul: 20 + 5 * Math.min(seri - 1, 6), girisAlindi: false, girisGun: p.daily.girisGun };
    return p.daily;
  }
  function dailyAdd(id, n = 1) {
    const p = state.player; if (!p) return;
    for (const t of ensureDaily(p).gorevler) if (t.id === id && t.ilerleme < t.hedef) { t.ilerleme = Math.min(t.hedef, t.ilerleme + n); if (t.ilerleme === t.hedef) toast(`📅 Günlük görev tamam: ${t.ad} (menüden ödülünü al)`, 'gold'); }
  }
  function renderDaily() {
    const p = state.player, d = ensureDaily(p);
    $('mGunluk').innerHTML = `<div class="dhead"><b>📅 Günlük görevler</b>${d.girisAlindi ? `<small>🔥 ${d.seri}. gün</small>` : `<button class="sm main" data-dgiris>🎁 Giriş ödülü +${d.girisOdul}${d.seri > 1 ? ` (🔥 ${d.seri}. gün)` : ''}</button>`}</div>` +
      d.gorevler.map((t, i) => `<div class="dtask${t.alindi ? ' done' : ''}"><span>${esc(t.ad)}</span><span class="dbar"><i style="width:${100 * t.ilerleme / t.hedef}%"></i></span><span class="dval">${t.ilerleme}/${t.hedef}</span>${t.alindi ? '<span class="dok">✓</span>' : t.ilerleme >= t.hedef ? `<button class="sm main" data-dal="${i}">Al +${t.odul}</button>` : `<span class="dodul">+${t.odul}</span>`}</div>`).join('');
  }
  $('mGunluk').addEventListener('click', e => {
    const p = state.player, d = ensureDaily(p);
    if (e.target.closest('[data-dgiris]') && !d.girisAlindi) { d.girisAlindi = true; d.girisGun = d.gun; p.points += d.girisOdul; p.earned += d.girisOdul; Ses.buy(); Kayit.persist(); showMenu(); return; }
    const b = e.target.closest('[data-dal]'); if (!b) return;
    const t = d.gorevler[+b.dataset.dal]; if (!t || t.alindi || t.ilerleme < t.hedef) return;
    t.alindi = true; p.points += t.odul; p.earned += t.odul; Ses.buy(); Kayit.persist(); showMenu();
  });

  // ================= LİDERLİK =================
  let liderTab = 'puan';
  async function showLider(tab) {
    liderTab = tab || liderTab; toMenuScene(); show('scrLider');
    document.querySelectorAll('#liderTabs [data-lt]').forEach(b => b.classList.toggle('on', b.dataset.lt === liderTab));
    $('liderTrackRow').classList.toggle('hidden', liderTab !== 'rekor');
    const me = MI.key(state.player.name), box = $('liderList');
    box.innerHTML = '<p class="muted" style="text-align:center">⏳ Yükleniyor…</p>';
    const row = (k, ad, val, sub) => `<div class="lrow${MI.key(ad) === me ? ' me' : ''}"><span class="lk">${MEDAL[k] || k + 1}</span><b>${esc(ad)}</b><span class="muted">${sub || ''}</span><span class="lv">${val}</span></div>`;
    if (liderTab === 'rekor') {
      const sel = $('liderTrack');
      if (!sel.options.length) sel.innerHTML = MP.TRACKS.map(t => `<option value="${t.id}">${t.id} · ${esc(t.name)}</option>`).join('');
      if (!sel.dataset.set) { sel.value = Math.max(1, Math.min(state.player.unlocked - 1, 200)) || 1; sel.dataset.set = 1; }
      const list = await Kayit.records(+sel.value);
      box.innerHTML = !list ? '<p class="muted" style="text-align:center">⚠️ Sunucuya ulaşılamadı</p>' : list.length ? list.map((x, k) => row(k, x.ad, x.sure.toFixed(1) + ' sn')).join('') : '<p class="muted" style="text-align:center">Bu parkurda henüz rekor yok. İlk sen ol!</p>';
      return;
    }
    const b = await Kayit.leaderboard();
    if (!b) { box.innerHTML = '<p class="muted" style="text-align:center">⚠️ Sunucuya ulaşılamadı</p>'; return; }
    const L = b[liderTab] || [], unit = { puan: ' puan', galibiyet: ' galibiyet', parkur: '. parkur' }[liderTab];
    box.innerHTML = (L.length ? L.map((x, k) => row(k, x.ad, x.deger + unit, 'Sv ' + x.seviye)).join('') : '<p class="muted" style="text-align:center">Henüz kimse yok</p>') + `<p class="muted" style="text-align:center;font-size:12px;margin-top:8px">Toplam ${b.oyuncu} oyuncu</p>`;
  }
  $('liderTabs').addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (b) showLider(b.dataset.lt); });
  $('liderTrack').onchange = () => showLider('rekor');

  function checkAch(p) {
    const got = [];
    for (const a of ACH) if (!p.ach[a.id] && a.check(p)) { p.ach[a.id] = Date.now(); p.points += a.reward; p.earned += a.reward; got.push(a); }
    if (got.length) Kayit.persist();
    return got;
  }

  // ================= PARKUR / SAHNE =================
  function ensureTrack(id) {
    if (state.track && state.track.id === id && state.view) return;
    Grafik.disposeView(state.view);
    state.track = MP.buildTrack(id);
    state.view = Grafik.buildView(state.track);
  }
  function disposeRace() {
    state.paused = false; state.pauseOpen = false; state.introHold = false; $('pauseBox').classList.add('hidden'); $('gucIntro').classList.add('hidden'); $('hitBanner').innerHTML = '';
    for (const mv of state.mvs) Grafik.disposeMarble(mv);
    state.mvs = [];
    Grafik.clearTemps(); Grafik.Particles.clear();
    if (state.race) state.race.dispose();
    if (window.Ag && Ag.race) Ag.race = null;
    state.race = null; state.hand = null; state.rec = []; state.replay = null; state.capture = null;
    Ses.stopRolling();
  }

  // ================= KAMERA =================
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), fwdS = new THREE.Vector3(0, 0, 1);
  let camInit = false;
  const V3 = (p) => new THREE.Vector3(p.x, p.y, p.z);
  function center(r) { const c = new THREE.Vector3(); r.marbles.forEach(m => c.add(V3(m.body.translation()))); return c.multiplyScalar(1 / r.marbles.length); }
  function updateCamera(dt) {
    const r = state.race; if (!r) return;
    const tgt = state.cam === 1 ? r.leader() : r.marbles[state.pick];
    const P = V3(tgt.body.translation()), sm = tgt.lastSample;
    const f = sm ? new THREE.Vector3(sm.T[0], 0, sm.T[2]).normalize() : new THREE.Vector3(0, 0, 1);
    fwdS.lerp(f, 1 - Math.exp(-2.2 * dt)).normalize();
    const want = new THREE.Vector3(), look = new THREE.Vector3();
    // delikten düşerken, atlarken, trambolinde: bir süre yandan bak (arkadan bakınca pist misketi kapatıyor)
    const nowS = performance.now() / 1000, vy = tgt.body.linvel().y;
    if (state.phase !== 'countdown' && state.cam !== 2 && ((sm && SIDE_KINDS.includes(sm.kind)) || (vy < -4 && !tgt.inZone))) {
      if (!(nowS < (state.sideUntil || 0))) state.sideSign = 1;
      state.sideUntil = nowS + 1.6;
    }
    const sideView = nowS < (state.sideUntil || 0) && state.phase !== 'countdown' && state.cam !== 2;
    if (sideView && !tgt.inZone) {
      const R = sm ? new THREE.Vector3(sm.R[0], 0, sm.R[2]).normalize() : new THREE.Vector3(1, 0, 0);
      // tam yandan değil: yandan ve yukarıdan (duvarların üstünden) bak
      want.copy(P).addScaledVector(R, 5 * (state.sideSign || 1)).addScaledVector(fwdS, -1.8).add(new THREE.Vector3(0, 5.2, 0)); look.copy(P).addScaledVector(fwdS, 1.2);
    } else if (state.phase === 'countdown') {
      // giriş animasyonu: önce yukarıdan parkura bakar, sonra dönerek misketlerin arkasına iner
      const c = center(r), st = state.track.samples.find(q => q.lane === 0) || state.track.samples[0];
      const T = new THREE.Vector3(st.T[0], 0, st.T[2]).normalize(), Rv = new THREE.Vector3(st.R[0], 0, st.R[2]).normalize();
      fwdS.copy(T);
      const u = Math.min(1, Math.max(0, (INTRO - state.countdown) / (INTRO - 2.4))), e = u * u * (3 - 2 * u);
      // hiç önden bakmaz: yandan-arkadan yüksekte başlar, dönerek tam arkaya alçalır
      const a = 2.0 + (Math.PI - 2.0) * e, rad = 20 + (4.8 - 20) * e, hgt = 15 + (5.2 - 15) * e;
      want.copy(c).addScaledVector(T, Math.cos(a) * rad).addScaledVector(Rv, Math.sin(a) * rad).add(new THREE.Vector3(0, hgt, 0));
      const room = state.view && state.view.room; if (room) want.y = Math.min(want.y, room.y0 + room.H - 6);
      look.copy(c).addScaledVector(T, 12 + (5 - 12) * e);
      camPos.copy(want); camLook.copy(look); camInit = true;
    } else if (state.cam === 2) {
      const c = center(r).lerp(P, 0.4); want.copy(c).addScaledVector(fwdS, -16).add(new THREE.Vector3(0, 17, 0)); look.copy(c);
    } else if (tgt.inZone) {
      const z = tgt.inZone, C = new THREE.Vector3(z.c[0], z.c[1], z.c[2]);
      want.copy(C).addScaledVector(fwdS, -z.R * 0.9).add(new THREE.Vector3(0, z.R * 1.5 + 2, 0)); look.copy(C).lerp(P, 0.5);
    } else {
      want.copy(P).addScaledVector(fwdS, -7.2).add(new THREE.Vector3(0, 3.9, 0)); look.copy(P).addScaledVector(fwdS, 3);
    }
    Grafik.fadeTrack(state.view, sideView && !tgt.inZone ? P : null, dt); // yan bakışta yakındaki duvarlar saydamlaşır
    if (!camInit) { camPos.copy(want); camLook.copy(look); camInit = true; }
    else { camPos.lerp(want, 1 - Math.exp(-3.5 * dt)); camLook.lerp(look, 1 - Math.exp(-6 * dt)); }
    camera.position.copy(camPos); camera.lookAt(camLook);
    Grafik.aimSun(camLook);
  }
  function orbitCamera(now) {
    if (!state.track) return;
    const b = state.track.bounds, t = now / 1000 * 0.045;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, R = state.view && state.view.room;
    let rad = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 0.7 + 25, y = b.maxY + 22;
    if (R) { rad = Math.min(rad, Math.min(R.W, R.D) / 2 - 48); y = Math.min(y, R.y0 + R.H - 6); } // odanın içinde kal, eşyalara girme
    camera.position.set(cx + Math.cos(t) * rad, y, cz + Math.sin(t) * rad);
    const L = new THREE.Vector3(cx, (b.minY + b.maxY) / 2, cz); camera.lookAt(L);
    Grafik.aimSun(L);
  }

  // ================= HUD =================
  let hudN = 0;
  function buildHud() {
    const dots = $('progDots'); dots.innerHTML = '';
    MF.MARBLES.forEach((m, i) => { const d = document.createElement('div'); d.className = 'pd' + (i === state.pick ? ' me' : ''); d.style.background = state.colors[i]; d.textContent = m.sembol; d.id = 'pd' + i; dots.appendChild(d); });
    const cb = $('cupBadge');
    if (state.cup) { const c = MP.CUPS[state.cup.id]; cb.textContent = `${c.icon} ${c.name} · Yarış ${state.cup.idx + 1}/3`; cb.classList.remove('hidden'); } else cb.classList.add('hidden');
  }
  const FX_ICONS = [['shield', '🛡️'], ['turbo', '🚀'], ['slow', '🐌'], ['small', '🤏'], ['ghost', '👻'], ['iron', '🔩'], ['wind', '💨'], ['stun', '💫']];
  function updateHud(force) {
    const r = state.race; if (!r) return;
    if (!force && (++hudN % 6)) return;
    const S = r.standings(), fs = r.track.finishS;
    $('stand').innerHTML = S.map((m, k) => {
      const me = m.id === state.pick;
      const fx = FX_ICONS.filter(([k2]) => m.fx && m.fx[k2] > r.t).map(x => x[1]).join('') + (m.fx && m.fx.inSlime ? '🟢' : '');
      const tm = m.finished ? `<span class="tm">${m.finishTime.toFixed(1)}</span>` : '';
      return `<div class="srow${me ? ' me' : ''}"><span class="rk">${k + 1}</span><span class="dot sym" style="background:${state.colors[m.id]}">${MF.MARBLES[m.id].sembol}</span><span class="nm">${esc(m.info.name)}</span><span class="fx">${fx}</span>${me ? '<span class="tag">SEN</span>' : ''}${tm}</div>`;
    }).join('');
    const W = $('prog').clientWidth - 36;
    for (const m of r.marbles) { const el = $('pd' + m.id); if (el) el.style.left = (18 + Math.max(0, Math.min(1, m.s / fs)) * W) + 'px'; }
    $('timer').textContent = '⏱ ' + r.t.toFixed(1);
    if (r.started && !r.done) { const idx = S.findIndex(m => m.id === state.pick); if (idx === S.length - 1 && r.t > 8) state.wasLast = true; }
  }
  function toast(msg, cls) {
    const el = document.createElement('div'); el.className = 'toast' + (cls ? ' ' + cls : ''); el.textContent = msg;
    $('toasts').appendChild(el); setTimeout(() => el.remove(), 2800);
    while ($('toasts').children.length > (window.MOBIL ? 2 : 4)) $('toasts').firstChild.remove();
  }

  // ---- güç kartları ----
  function showCards(cards, expires) {
    state.hand = { cards, expires };
    const box = $('cards');
    box.innerHTML = '<div id="cardsHead">⚡ Bir güç seç!</div>' + cards.map((id, k) => {
      const p = MG.byId[id];
      return `<button class="card ${p.type}" data-card="${k}"><span class="key">${k + 1}</span><span class="ic">${p.icon}</span><span><span class="typ">${p.type === 'self' ? 'GÜÇLEN' : 'TUZAK'}</span><b>${p.name}</b><small>${p.desc}</small></span></button>`;
    }).join('') + '<div id="cardTime"><i style="width:100%"></i></div>';
    box.classList.remove('hidden');
    Ses.card();
  }
  function hideCards() { state.hand = null; $('cards').classList.add('hidden'); }
  function pickCard(k) {
    const r = state.race; if (!r || !state.hand) return;
    if (r.powers.choose(state.pick, k)) hideCards();
  }
  $('cards').addEventListener('click', e => { const b = e.target.closest('[data-card]'); if (b) pickCard(+b.dataset.card); });

  // ================= YARIŞ =================
  // tüm güç kartları (ilk 3 parkurda yarış öncesi tanıtım, menüdeki Güç Kartları ekranı, duraklatma menüsü)
  const TIER = { 1: 'Sık çıkar', 2: 'Orta', 3: 'Nadir · güçlü' };
  function powerCardsHTML() {
    const card = p => `<div class="gcard ${p.type}"><span class="gic">${p.icon}</span><span class="gtx"><span class="gtyp">${p.type === 'self' ? 'GÜÇLEN' : 'TUZAK'} · ${TIER[p.tier]}</span><b>${p.name}</b><small>${p.desc}</small></span></div>`;
    return `<h3>💪 Güçlen (kendine)</h3><div class="ggrid">${MG.POWERS.filter(p => p.type === 'self').map(card).join('')}</div><h3>🪤 Tuzak (rakiplere)</h3><div class="ggrid">${MG.POWERS.filter(p => p.type === 'attack').map(card).join('')}</div>`;
  }
  function showGucler() { toMenuScene(); $('gucList').innerHTML = powerCardsHTML(); show('scrGuc'); }
  let introTimer = null;
  function showPowerIntro() {
    state.introHold = true; $('gucIntroList').innerHTML = powerCardsHTML(); $('gucIntro').classList.remove('hidden');
    const t0 = performance.now(), D = 15000;
    clearInterval(introTimer);
    introTimer = setInterval(() => { const u = (performance.now() - t0) / D; $('gucIntroBar').style.width = Math.max(0, 100 * (1 - u)) + '%'; if (u >= 1) endPowerIntro(); }, 100);
  }
  function endPowerIntro() { clearInterval(introTimer); state.introHold = false; $('gucIntro').classList.add('hidden'); }
  $('gucIntroGo').onclick = endPowerIntro;
  function startRace() {
    if (window.Ag && (Ag.room || state.mp)) leaveMp(); // tek oyunculu yarışa geçerken odadan çık
    ensureTrack(state.trackId);
    disposeRace();
    const r = state.race = new MF.Race(window.RAPIER, state.track, {});
    new MG.PowerSystem(r, { playerId: state.pick });
    const p = state.player;
    state.mvs = MF.MARBLES.map((info, i) => Grafik.makeMarble(info, Magaza.lookFor(info, i === state.pick ? p.eq : {}), i === state.pick, MF.PARAMS.r));
    state.colors = state.mvs.map(mv => mv.look.color);
    state.prevV = MF.MARBLES.map(() => [0, 0, 0]);
    // bahis
    state.betActive = null;
    if (state.bet && state.bet.amount > 0 && !state.cup && p.points >= state.bet.amount) {
      p.points -= state.bet.amount; Kayit.persist(); state.betActive = Object.assign({}, state.bet);
    }
    state.view.gates.forEach(g => { g.mesh.visible = true; g.mesh.position.y = g.y0; g.opening = false; });
    state.phase = 'countdown'; state.countdown = INTRO; state.endTimer = 0; state.slowDone = false; state.slowT = 0; state.wasLast = false;
    camInit = false;
    show(null); $('hud').classList.remove('hidden'); $('toasts').innerHTML = ''; $('slowmo').classList.add('hidden'); hideCards();
    buildHud(); updateHud(true);
    lastCount = null;
    if (state.trackId <= 3 && !state.cup) showPowerIntro(); // ilk 3 parkurda: yarıştan önce tüm güç kartları
  }
  let lastCount = null;
  function countdownTick(dt) {
    state.countdown -= dt;
    const n = Math.ceil(state.countdown - 0.2), el = $('count'), txt = n > 0 ? String(n) : 'BAŞLA!';
    if (n > 3) return; // giriş animasyonu sürerken geri sayım yok
    if (txt !== lastCount) { lastCount = txt; el.textContent = txt; el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop'); Ses.beep(n); }
    if (state.countdown <= 0.2 && state.phase === 'countdown') {
      state.phase = 'race'; state.race.openGate(); Ses.gate();
      setTimeout(() => $('count').classList.add('hidden'), 700);
    }
  }
  const nameOf = (r, id) => r.marbles[id].info.name;
  function onPower(e) {
    const r = state.race, P = MG.byId[e.power], u = r.marbles[e.id], mine = e.id === state.pick;
    const tg = e.target != null ? r.marbles[e.target] : null, meHit = (tg && tg.id === state.pick) || (e.targets || []).includes(state.pick);
    Ses.power(e.power, mine || meHit);
    const up = u.body.translation();
    if (e.power === 'zipla') Grafik.puff(up);
    else if (e.power === 'isinlan' && e.from) { Grafik.sparkle({ x: e.from[0], y: e.from[1], z: e.from[2] }); Grafik.sparkle({ x: e.to[0], y: e.to[1], z: e.to[2] }); }
    else if (e.power === 'balcik' && e.slime) Grafik.spawnSlime(e.slime, e.slime.until);
    else if (e.power === 'duvar' && e.wall) Grafik.spawnWall(e.wall, e.wall.until);
    else if (e.power === 'bomba') for (const a of e.atList || (e.at ? [e.at] : [])) Grafik.explode({ x: a[0], y: a[1], z: a[2] });
    else if (e.power === 'ruzgar') for (const id of e.targets || []) { const m = r.marbles[id], q = m.body.translation(); Grafik.wind(q, m.lastSample ? m.lastSample.T : [0, 0, 1]); }
    else if (e.power === 'kalkan' || e.power === 'turbo' || e.power === 'demir') Grafik.sparkle(up, e.power === 'kalkan' ? '#7fd8ff' : '#ffd166');
    const s = st(state.player);
    if (mine) { s.powers = (s.powers || 0) + 1; dailyAdd('guc'); if (P.type === 'attack') { s.traps = (s.traps || 0) + 1; dailyAdd('tuzak'); } }
    for (const bid of (e.blockedIds || []).concat(e.blocked && tg && !(e.blockedIds || []).length ? [tg.id] : [])) { Grafik.sparkle(r.marbles[bid].body.translation(), '#7fd8ff'); Ses.blocked(); if (bid === state.pick) { s.blocks = (s.blocks || 0) + 1; dailyAdd('kalkan'); } }
    // bildirim: kim (renkli ad), hangi kart, kime — 3 sn
    const who = mine ? 'Sen' : nameOf(r, e.id), nm = id => id === state.pick ? 'SEN' : nameOf(r, id);
    let detail = P.desc, blockedAll = false;
    if (e.power === 'ruzgar') detail = (e.targets || []).length ? 'Geri itilen: ' + e.targets.map(nm).join(', ') : 'Kimse etkilenmedi';
    else if (e.power === 'bomba') { const n = (e.targets || []).map(nm); detail = n.length ? 'Sersemleyen: ' + n.join(', ') : 'Kalkanla engellendi'; blockedAll = !n.length; }
    else if (e.targets && P.type === 'attack') { const n = e.targets.map(nm); detail = n.length ? 'Hedef: ' + n.join(' ve ') : 'Kalkanla engellendi'; blockedAll = !n.length; }
    else if (tg) { detail = e.blocked ? `${nm(tg.id)} kalkanla engelledi` : 'Hedef: ' + nm(tg.id); blockedAll = !!e.blocked; }
    // sana bir güç uygulandıysa (ya da kalkanın engellediyse): ekranın üstünde, kimin yaptığıyla birlikte, okunacak kadar kalır
    const myBlocked = (e.blockedIds || []).includes(state.pick) || (e.blocked && tg && tg.id === state.pick);
    if (!mine && (meHit || myBlocked)) {
      const HIT = { bomba: 'bombasıyla seni sersemletti!', ruzgar: 'sana ters rüzgâr estirdi!', yavas: 'seni yavaşlattı!', kucult: 'seni küçülttü!', balcik: 'yoluna balçık döktü!', duvar: 'önüne duvar dikti!' };
      if (myBlocked) hitBanner('🛡️', nameOf(r, e.id), state.colors[e.id], `${P.icon} ${P.name} saldırısı kalkanına çarptı`, 'Kalkanın korudu!', true);
      else hitBanner(P.icon, nameOf(r, e.id), state.colors[e.id], HIT[e.power] || `sana ${P.name} uyguladı!`, P.name, false);
      return;
    }
    // telefonda ekran küçük: yalnızca seni ilgilendiren güç bildirimleri
    if (mine || meHit || (!window.MOBIL && Math.random() < 0.6)) powerToast({ icon: blockedAll ? '🛡️' : P.icon, who, color: state.colors[e.id], power: P.name, type: P.type, detail, cls: mine ? 'mine' : meHit ? 'hit' : P.type === 'self' ? 'self' : 'atk' });
  }
  function hitBanner(icon, who, color, text, sub, good) {
    const el = document.createElement('div'); el.className = 'hitb' + (good ? ' ok' : '');
    const ic = document.createElement('span'); ic.className = 'hic'; ic.textContent = icon;
    const body = document.createElement('div');
    const top = document.createElement('div'); const w = document.createElement('b'); w.textContent = who; w.style.color = color; top.append(w, document.createTextNode(' ' + text));
    const sm = document.createElement('small'); sm.textContent = sub;
    body.append(top, sm); el.append(ic, body);
    $('hitBanner').appendChild(el);
    while ($('hitBanner').children.length > 2) $('hitBanner').firstChild.remove();
    const ms = Math.max(4000, Math.min(7000, 2600 + 55 * (who.length + text.length))); // okuma süresi
    setTimeout(() => el.classList.add('out'), ms - 400); setTimeout(() => { el.remove(); layoutTopMsgs(); }, ms);
    layoutTopMsgs();
  }
  // bilgisayarda diğer güç bildirimleri, sana uygulananların altına iner (üst üste binmesin)
  function layoutTopMsgs() {
    const t = $('toasts'), hb = $('hitBanner'); t.style.top = '';
    if (matchMedia('(max-height:500px) and (orientation:landscape)').matches) return; // yatay telefonda bildirimler sağda
    const h = hb.offsetHeight; if (h) t.style.top = (hb.offsetTop + h + 8) + 'px';
  }
  function powerToast(o) {
    const el = document.createElement('div'); el.className = 'pwt ' + o.cls;
    const ic = document.createElement('span'); ic.className = 'pic'; ic.textContent = o.icon;
    const body = document.createElement('div'); body.className = 'pbody';
    const top = document.createElement('div');
    const w = document.createElement('b'); w.textContent = o.who; w.style.color = o.color; if (o.who === 'Sen') w.style.color = '#ffd77a';
    const tag = document.createElement('span'); tag.className = 'ptag ' + o.type; tag.textContent = o.type === 'self' ? 'GÜÇLEN' : 'TUZAK';
    const pn = document.createElement('span'); pn.className = 'pname'; pn.textContent = o.power;
    top.append(w, tag, pn);
    const d = document.createElement('small'); d.textContent = o.detail;
    body.append(top, d); el.append(ic, body);
    $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2700); setTimeout(() => el.remove(), 3000);
    while ($('toasts').children.length > (window.MOBIL ? 2 : 3)) $('toasts').firstChild.remove();
  }
  function handleEvents() {
    const r = state.race;
    while (r.events.length) {
      const e = r.events.shift();
      if (e.type === 'gate') state.view.gates.forEach(g => g.opening = true);
      else if (e.type === 'hand' && e.id === state.pick) showCards(e.cards, e.expires);
      else if (e.type === 'handGone' && e.id === state.pick) hideCards();
      else if (e.type === 'power') onPower(e);
      else if (e.type === 'wallBreak') { Grafik.breakWall(e.wall); Ses.power('duvar', e.id === state.pick); toast(`⚙️ ${e.id === state.pick ? 'Demir misketin' : nameOf(r, e.id) + ' demir misketle'} duvarı kırdı!`, e.id === state.pick ? 'gold' : ''); }
      else if (e.type === 'finalRound') toast('🔥 Final kart turu! Geridekilere güçlü kartlar', 'gold');
      else if (e.type === 'finish') {
        const m = r.marbles[e.id], me = e.id === state.pick;
        Ses.finishCross();
        if (e.place <= 3) toast(`${MEDAL[e.place - 1]} ${m.info.name} ${e.place}. oldu! (${e.time.toFixed(1)} sn)`, me ? 'gold' : '');
        else if (me) toast(`Misketin ${e.place}. bitirdi`, 'gold');
        if (me) hideCards();
        if (e.place === 1) {
          const q = m.body.translation(); Grafik.Particles.burst(q, 70, ['#ffd23f', '#ff4d6d', '#45c8ff', '#7bff5a', '#ffffff'], 6, 0.35, 1.6, 0.6);
          // tekrar için birincinin bitiş anını ayrıca sakla (yarış birkaç saniye daha sürer)
          state.capture = { frames: state.rec.filter(f => f.t >= e.time - 2.6), t1: e.time + 1.0, winner: e.id, tf: e.time };
        }
      } else if (e.type === 'respawn' && e.id === state.pick) toast(e.safe ? 'Düştün ama gücün korudu: kaldığın yere kondun' : 'Misketin takıldı, yola geri kondu', 'gold');
      else if (e.type === 'end') { state.phase = 'ending'; state.endTimer = 1.0; }
    }
  }
  function slowMotion(dt) {
    const r = state.race;
    if (state.slowDone || state.phase !== 'race') return;
    const lead = r.leader();
    if (!lead.finished && r.track.finishS - lead.s < 9) { r.timeScale = 0.33; $('slowmo').classList.remove('hidden'); }
    if (r.finishOrder.length >= 1) { state.slowT += dt; if (state.slowT > 1.0) { r.timeScale = 1; state.slowDone = true; $('slowmo').classList.add('hidden'); } }
  }
  // tekrar için kayıt: son 7 sn
  function record() {
    const r = state.race, last = state.rec[state.rec.length - 1];
    if (last && r.t - last.t < 1 / 40) return;
    const d = new Float32Array(r.marbles.length * 10);
    r.marbles.forEach((m, i) => { const p = m.body.translation(), q = m.body.rotation(), v = m.body.linvel(); d.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w, v.x, v.y, v.z], i * 10); });
    const fr = { t: r.t, d };
    state.rec.push(fr);
    while (state.rec.length && state.rec[0].t < r.t - 7) state.rec.shift();
    if (state.capture && r.t <= state.capture.t1) state.capture.frames.push(fr);
  }
  function sounds() {
    const r = state.race;
    r.marbles.forEach((m, i) => {
      const v = m.body.linvel(), pv = state.prevV[i], dv = Math.hypot(v.x - pv[0], v.y - pv[1], v.z - pv[2]);
      state.prevV[i] = [v.x, v.y, v.z];
      if (dv > 2.2 && r.started) { const d = camera.position.distanceTo(V3(m.body.translation())); Ses.clack(dv / 12 / (1 + d / 14)); }
    });
    const me = r.marbles[state.pick], v = me.body.linvel();
    Ses.rolling(Math.hypot(v.x, v.y, v.z), Math.abs(v.y) < 4 && !me.finished && r.started);
  }

  // ---- bitiş tekrarı ----
  function startReplay() {
    const c = state.capture; state.capture = null;
    if (!c || c.frames.length < 20) return false;
    const frames = c.frames;
    const fin = state.track.decor.find(d => d.type === 'finishArch');
    state.replay = { frames, t: frames[0].t, t1: frames[frames.length - 1].t, fin, winner: c.winner };
    state.phase = 'replay';
    $('hud').classList.add('hidden'); $('replayBar').classList.remove('hidden'); document.body.classList.add('letterbox');
    Ses.stopRolling();
    return true;
  }
  function replayTick(dt) {
    const R = state.replay; R.t += dt * 0.5;
    if (R.t >= R.t1) { endReplay(); return; }
    let k = 0; while (k < R.frames.length - 2 && R.frames[k + 1].t < R.t) k++;
    const a = R.frames[k], b = R.frames[k + 1], u = Math.max(0, Math.min(1, (R.t - a.t) / Math.max(1e-6, b.t - a.t)));
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    state.mvs.forEach((mv, i) => {
      const o = i * 10, A = a.d, B = b.d, L = (j) => A[o + j] + (B[o + j] - A[o + j]) * u;
      qa.set(A[o + 3], A[o + 4], A[o + 5], A[o + 6]); qb.set(B[o + 3], B[o + 4], B[o + 5], B[o + 6]); qa.slerp(qb, u);
      Grafik.placeMarble(mv, [L(0), L(1), L(2)], [qa.x, qa.y, qa.z, qa.w], [L(7), L(8), L(9)], dt * 0.5);
    });
    // sinema kamerası: kazananı yandan-arkadan, yüksekten takip eder
    const w = state.mvs[R.winner].mesh.position, o = R.winner * 10;
    const vx = a.d[o + 7], vz = a.d[o + 9], hl = Math.hypot(vx, vz) || 1;
    const fwd = new THREE.Vector3(vx / hl, 0, vz / hl), side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const want = w.clone().addScaledVector(side, 2.6).addScaledVector(fwd, -2.8).add(new THREE.Vector3(0, 3.1, 0)); // duvarın üstünden, çaprazdan
    if (!R.cam) R.cam = want.clone(); else R.cam.lerp(want, 1 - Math.exp(-4 * dt));
    camera.position.copy(R.cam); camera.lookAt(w.x, w.y + 0.15, w.z);
    Grafik.aimSun(w);
  }
  function endReplay() {
    state.replay = null;
    $('replayBar').classList.add('hidden'); document.body.classList.remove('letterbox');
    finishRace();
  }
  $('btnSkip').onclick = () => { if (state.phase === 'replay') endReplay(); };

  function finishRace() {
    const r = state.race, p = state.player, id = state.trackId;
    const me = r.marbles[state.pick], place = me.place, gain = prizeFor(id, place);
    const xpGain = 10 + Math.round(gain / 2) + (6 - place) * 3, lvlBefore = levelOf(p.xp);
    p.races++; p.points += gain; p.earned += gain; p.xp += xpGain;
    if (place === 1) { p.wins++; if (state.wasLast) st(p).comeback = (st(p).comeback || 0) + 1; }
    let unlockedNew = false;
    // çok oyunculuda kilidi açık olmayan parkurda (arkadaşın seçtiği) ilk 3 sonraki parkuru açmaz
    if (place <= 3) { p.podiums++; const lim = openUpTo(p); if (id + 1 > lim && id <= lim) { p.unlocked = id + 1; unlockedNew = true; } else if (id + 1 > p.unlocked && id < OPEN_FREE) p.unlocked = id + 1; }
    if (state.mp) { st(p).mpRaces = (st(p).mpRaces || 0) + 1; if (place === 1) st(p).mpWins = (st(p).mpWins || 0) + 1; }
    if (!state.mp) Kayit.track('yaris', { misafir: Kayit.isGuest(p), parkur: id, sira: place, sure: me.finishTime || 0, mod: state.cup ? 'kupa' : 'tek' }); // rapor: tek oyunculu yarış (çok oyunculuyu sunucu zaten görür)
    dailyAdd('yaris'); if (place <= 3) dailyAdd('ilk3'); if (place === 1) dailyAdd('birinci'); if (state.mp) dailyAdd('mp'); if (unlockedNew) dailyAdd('yeni');
    const b = p.best[id];
    if (!b || place < b.place || (place === b.place && me.finishTime && me.finishTime < (b.time || 1e9))) p.best[id] = { place, time: me.finishTime || null };
    const notes = [];
    // bahis
    if (state.betActive) {
      const bt = state.betActive, bm = r.marbles[bt.marble], okBet = bt.type === 'win' ? bm.place === 1 : bm.place <= 3;
      const mult = bt.type === 'win' ? 3 : 1.5;
      if (okBet) { const w = Math.round(bt.amount * mult); p.points += w; p.earned += w - bt.amount; p.bets.won++; notes.push(`🎲 Bahsi kazandın! +${w} puan`); }
      else { p.bets.lost++; notes.push(`🎲 Bahsi kaybettin (−${bt.amount} puan)`); }
      state.betActive = null;
    }
    // kupa
    let cupDone = false;
    if (state.cup) {
      const c = state.cup;
      r.finishOrder.forEach((m, k) => { c.pts[m.id] += CUP_POINTS[k]; });
      c.results.push(r.finishOrder.map(m => m.id));
      c.idx++;
      if (c.idx >= c.tracks.length) {
        cupDone = true;
        const lastRes = c.results[c.results.length - 1];
        const order = [0, 1, 2, 3, 4, 5].sort((a, b2) => c.pts[b2] - c.pts[a] || lastRes.indexOf(a) - lastRes.indexOf(b2));
        const myPlace = order.indexOf(state.pick) + 1, cup = MP.CUPS[c.id];
        c.final = order;
        if (!p.cups[c.id] || myPlace < p.cups[c.id]) p.cups[c.id] = myPlace;
        if (myPlace === 1) { p.points += cup.bonus; p.earned += cup.bonus; notes.push(`${cup.icon} ${cup.name} şampiyonu oldun! +${cup.bonus} puan`); }
        else notes.push(`${cup.icon} Kupayı ${myPlace}. bitirdin`);
      }
    }
    if (levelOf(p.xp) > lvlBefore) notes.push(`⭐ Seviye atladın: ${levelOf(p.xp)}. seviye!`);
    const next = MP.TRACKS.find(t => t.id === id + 1);
    if (unlockedNew && next && !state.cup) notes.push(next.world !== MP.TRACKS[id - 1].world ? `🌍 Yeni dünya açıldı: ${MP.WORLDS[next.world].icon} ${MP.WORLDS[next.world].name}!` : `🔓 Yeni parkur açıldı: ${next.name}`);
    for (const a of checkAch(p)) notes.push(`🏅 Başarım: ${a.name} (+${a.reward})`);
    Kayit.persist();
    if (place === 1) Ses.fanfare(); else if (place <= 3) Ses.cheer(); else Ses.sad();

    $('hud').classList.add('hidden');
    $('resTitle').textContent = place === 1 ? '🏆 Kazandın!' : place <= 3 ? `${MEDAL[place - 1]} ${place}. oldun!` : `${place}. oldun`;
    $('resGain').textContent = gain ? `+${gain} puan` : 'Bu yarışta puan yok';
    $('resGain').className = 'gain' + (gain ? ' good' : '');
    $('resNotes').innerHTML = notes.map(n => `<div class="note${n.startsWith('🏅') ? ' ach' : ''}">${esc(n)}</div>`).join('');
    const dot = i => `<span class="dot sym" style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:${state.colors[i]};margin-right:8px;vertical-align:-3px">${MF.MARBLES[i].sembol}</span>`;
    const sen = i => i === state.pick ? ' <span class="pill" style="padding:1px 8px;font-size:11px">SEN</span>' : '';
    if (state.cup) {
      const c = state.cup, order = cupDone ? c.final : [0, 1, 2, 3, 4, 5].sort((a, b2) => c.pts[b2] - c.pts[a]);
      $('resTable').innerHTML = `<tr><td colspan="4" class="muted" style="text-align:center">${MP.CUPS[c.id].icon} Kupa puan durumu (${Math.min(c.idx, 3)}/3 yarış)</td></tr>` + order.map((i, k) => `<tr class="${i === state.pick ? 'me' : ''}"><td class="medal">${MEDAL[k] || k + 1}</td><td>${dot(i)}${r.marbles[i].info.name}${sen(i)}</td><td class="muted">bu yarış: ${r.marbles[i].place}.</td><td style="text-align:right;color:#ffd77a">${c.pts[i]} kp</td></tr>`).join('');
      $('resNote').textContent = cupDone ? `Kupa bitti! Toplam puanın: ${p.points}` : `Sıradaki parkur: ${MP.TRACKS.find(t => t.id === c.tracks[c.idx]).name}`;
      $('btnResAgain').textContent = cupDone ? 'Kupalar' : 'Sonraki Yarış ▶';
    } else {
      $('resTable').innerHTML = r.finishOrder.map((m, k) => {
        const pts = prizeFor(id, k + 1);
        return `<tr class="${m.id === state.pick ? 'me' : ''}"><td class="medal">${MEDAL[k] || (k + 1)}</td><td>${dot(m.id)}${esc(m.info.name)}${sen(m.id)}</td><td class="muted">${m.finishTime ? m.finishTime.toFixed(1) + ' sn' : 'bitiremedi'}</td><td style="text-align:right;color:#ffd77a">${pts ? '+' + pts : ''}</td></tr>`;
      }).join('');
      $('resNote').textContent = `Toplam puanın: ${p.points}`;
      $('btnResAgain').textContent = 'Tekrar Yarış ↻';
    }
    // sonraki parkura geç (açıksa); kupada gösterilmez
    const nb = $('btnResNext'), hasNext = !state.cup && id < MP.TRACKS.length, nextOpen = hasNext && openUpTo(p) >= id + 1;
    nb.classList.toggle('hidden', !hasNext); nb.disabled = !nextOpen;
    nb.textContent = nextOpen ? 'Sonraki Parkur ▶' : '🔒 Sonraki Parkur (ilk 3 gerekli)';
    $('btnResAgain').classList.toggle('main', !nextOpen);
    if (state.mp) { nb.classList.add('hidden'); $('btnResAgain').textContent = 'Lobiye Dön 👥'; $('btnResAgain').classList.remove('main'); $('resNote').textContent = `Toplam puanın: ${p.points} · Oda: ${state.mp.kod}`; }
    state.cupDone = cupDone;
    show('scrResult');
    if (state.authLost) setTimeout(authLost, 2500);
    state.phase = 'result';
    renderVote(); // çok oyunculu: aynı parkur / sonraki parkur oylaması
  }

  // ================= DÖNGÜ =================
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const r = state.race;
    if (state.phase === 'replay') replayTick(dt);
    else if (r && (state.phase === 'countdown' || state.phase === 'race' || state.phase === 'ending')) {
      if (state.paused) { Grafik.render(); return; } // tek kişilikte duraklatıldı: her şey durur
      if (state.phase === 'countdown' && !state.introHold) countdownTick(dt); // ilk parkurlarda güç kartları tanıtımı bitene kadar bekler
      // ağır çekim kaldırıldı (oyuncu isteği): yarış hep normal hızda akar
      r.step(dt);
      handleEvents();
      if (state.phase === 'ending') { state.endTimer -= dt; if (state.endTimer <= 0) finishRace(); } // yavaş çekimli bitiş tekrarı kaldırıldı
      if (state.race) {
        r.marbles.forEach((m, i) => Grafik.syncMarble(state.mvs[i], m, dt, state.phase, r.t));
        r.spinners.forEach((sp, i) => { const q = sp.body.rotation(), m = state.view.spinners[i]; if (m) m.quaternion.set(q.x, q.y, q.z, q.w); });
        r.pistons.forEach((ps, i) => { const q = ps.body.translation(), m = state.view.movers[i]; if (m) m.position.set(q.x, q.y, q.z); });
        r.kins.forEach((k, i) => { const m = state.view.kins && state.view.kins[i]; if (m) Grafik.syncKin(m, k.body.translation(), k.body.rotation()); });
        for (const g of state.view.gates) if (g.opening && g.mesh.visible) { g.mesh.position.y += dt * 6; if (g.mesh.position.y > g.y0 + 4) g.mesh.visible = false; }
        if (r.started) record();
        sounds();
        if (state.hand) { const el = document.querySelector('#cardTime i'); if (el) el.style.width = Math.max(0, (state.hand.expires - r.t) / r.powers.pickTime * 100) + '%'; }
        if (state.phase !== 'replay' && state.phase !== 'result') { updateCamera(dt); updateHud(); }
      }
    } else if (state.phase === 'shop') shopTick(dt, now);
    else if (state.phase !== 'result') orbitCamera(now);
    Grafik.kinAuto = !(state.race && (state.phase === 'countdown' || state.phase === 'race' || state.phase === 'ending'));
    Grafik.updateView(state.view, now / 1000);
    Grafik.updateTemps(r ? r.t : 0, dt);
    Grafik.Particles.update(dt);
    Grafik.render();
  }

  // ================= EKRANLAR =================
  const SCREENS = ['loading', 'scrProfile', 'scrMenu', 'scrTracks', 'scrCups', 'scrPick', 'scrResult', 'scrShop', 'scrAch', 'scrMp', 'scrLider', 'scrSifre', 'scrCihaz', 'scrGuc'];
  const NAV_OF = { scrMenu: 'menu', scrTracks: 'tracks', scrCups: 'cups', scrPick: 'tracks', scrResult: '', scrShop: 'shop', scrAch: 'ach', scrMp: 'mp', scrLider: 'lider', scrSifre: 'menu', scrCihaz: 'menu', scrGuc: 'menu' };
  function show(id) {
    SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); $('shopHint').classList.toggle('hidden', id !== 'scrShop');
    const navOn = id in NAV_OF && !!state.player;
    $('topnav').classList.toggle('hidden', !navOn); document.body.classList.toggle('navon', navOn);
    if (navOn) { document.querySelectorAll('#topnav [data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === NAV_OF[id])); $('navPoints').textContent = state.player.points; }
  }
  // üst menü: her ekrandan doğrudan geçiş
  $('topnav').addEventListener('click', e => {
    const b = e.target.closest('[data-nav]'); if (!b) return;
    const to = b.dataset.nav;
    if (state.phase === 'shop' && to !== 'shop') leaveShop();
    if (to !== 'mp' && state.phase === 'result') leaveMp();
    if (to === 'menu') showMenu();
    else if (to === 'tracks') { state.cup = null; state.world = null; showTracks(); }
    else if (to === 'cups') { state.cup = null; showCups(); }
    else if (to === 'shop') { if (state.phase !== 'shop') { state.cup = null; showShop(); } }
    else if (to === 'ach') { state.cup = null; toMenuScene(); showAch(); }
    else if (to === 'mp') { state.cup = null; showMp(); }
    else if (to === 'lider') { state.cup = null; showLider(); }
  });
  document.addEventListener('click', e => { if (e.target.closest('button')) Ses.click(); });

  function saveStatusText() {
    const s = Kayit.status();
    return s === 'ok' ? '☁️ Kayıtların bulutta' : s === 'wait' ? '⏳ Kaydediliyor…'
      : s === 'auth' ? '🔑 Oturum bitti: tekrar gir' : s === 'guest' ? '📱 Misafirsin: puanların bu cihazda' : '⚠️ İnternet yok: bağlanınca kaydedilecek';
  }
  Kayit.onStatus = () => { for (const id of ['saveStatus1', 'saveStatus2']) { const el = $(id); el.textContent = saveStatusText(); el.className = 'savestatus s-' + Kayit.status(); } };
  // başka cihazda PIN değişti ya da oturum düştü: yarışta değilsek giriş ekranına
  Kayit.onAuthLost = name => { state.authLost = name; if (!['countdown', 'race', 'ending'].includes(state.phase)) authLost(); };
  function authLost() { const n = state.authLost; if (!n) return; state.authLost = null; showProfiles('giris', n, "Oturumun sona erdi (şifre değişmiş olabilir). Şifrenle tekrar gir."); }
  // buluttan daha yeni profil geldi (başka cihazda oynanmış)
  Kayit.onProfile = () => { if (!$('scrMenu').classList.contains('hidden')) showMenu(); };

  function toMenuScene() { if (state.phase !== 'result') state.phase = 'menu'; state.phase = 'menu'; $('hud').classList.add('hidden'); hideCards(); Ses.stopRolling(); }
  // ---- giriş ekranı: bu cihazdaki hesaplar, eski kayıtlar, giriş / yeni oyuncu / kodla giriş / şifremi unuttum ----
  // resimli şifre: 12 resimden 1'i; sunucu yalnız sırasını (0–11) saklar. Izgara her gösterilişte karışık dizilir.
  const RESIMLER = ['🐶', '🐱', '🦁', '🐸', '🍕', '🍦', '🍎', '⚽', '🚀', '🌈', '⭐', '🎸'];
  function drawGrid(el, sel, disabled) {
    const order = RESIMLER.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    el.innerHTML = order.map(i => `<button type="button" class="rbtn${sel === i ? ' on' : ''}" data-r="${i}" ${disabled ? 'disabled' : ''} aria-label="resim ${i + 1}">${RESIMLER[i]}</button>`).join('');
  }
  const markGrid = (el, i) => el.querySelectorAll('[data-r]').forEach(b => b.classList.toggle('on', +b.dataset.r === i));
  // resimli şifrede 3 yanlıştan sonra bu cihazda bekleme (sunucu da uygular; burada geri sayım için tutulur)
  const KILIT = 'misket-kilit';
  const lockLeft = name => { try { const m = JSON.parse(localStorage.getItem(KILIT)) || {}; return Math.max(0, Math.ceil(((m[MI.key(name)] || 0) - Date.now()) / 1000)); } catch (e) { return 0; } };
  const setLock = (name, sn) => { try { const m = JSON.parse(localStorage.getItem(KILIT)) || {}; m[MI.key(name)] = Date.now() + sn * 1000; localStorage.setItem(KILIT, JSON.stringify(m)); } catch (e) { } };
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  let pendingCode = null;
  try { const q = new URLSearchParams(location.search).get('kod'); if (q && /^\d{6}$/.test(q)) pendingCode = q; } catch (e) { }

  let authMode = 'giris', authLegacy = null, authTur = null, authPick = null, nameTimer = null, lockTimer = null;
  function showProfiles(mode, name, msg) {
    toMenuScene();
    const list = Kayit.players();
    $('plist').innerHTML = list.length ? list.map(p => `<button class="pcard" data-name="${esc(p.name)}"><b>${esc(p.name)}${Kayit.isGuest(p) ? ' <span class="pill" style="padding:0 6px;font-size:10px">misafir</span>' : ''}</b><small>Seviye ${levelOf(p.xp || 0)} · ⭐ ${p.points} puan</small><small>${p.races} yarış · ${p.wins} galibiyet</small><span class="del" data-del="${esc(p.name)}" title="Bu cihazdan çıkış">✕</span></button>`).join('')
      : '<p class="muted" style="grid-column:1/-1;text-align:center;margin:0">Bu cihazda henüz giriş yapılmadı.</p>';
    const leg = Kayit.legacyPlayers();
    $('legacyBox').classList.toggle('hidden', !leg.length);
    $('legacyList').innerHTML = leg.map(p => `<button class="pcard" data-legacy="${esc(p.name)}"><b>${esc(p.name)}</b><small>⭐ ${p.points || 0} puan · ${p.races || 0} yarış</small><small class="best">☁️ Buluta taşı</small><span class="del" data-legdel="${esc(p.name)}" title="Gizle">✕</span></button>`).join('');
    if (!mode && pendingCode) mode = 'kod';
    setAuth(mode || (list.length ? 'giris' : 'yeni'), name, msg);
    $('btnGuestPlay').textContent = `🎮 ${Kayit.guest().name} olarak misafir devam et`;
    Kayit.onStatus(); show('scrProfile');
    if (mode === 'kod' && pendingCode) { $('authKod').value = pendingCode; pendingCode = null; submitAuth(); }
  }
  // formu moda göre düzenle
  function setAuth(mode, name, msg) {
    authMode = mode; if (mode !== 'legacy') authLegacy = null;
    if (mode === 'yeni' || mode === 'legacy') { authTur = authTur === 'resim' ? 'resim' : 'pin'; } else if (mode === 'giris') authTur = null;
    authPick = null;
    document.querySelectorAll('#authTabs [data-auth]').forEach(b => b.classList.toggle('on', b.dataset.auth === (mode === 'legacy' ? 'yeni' : mode)));
    if (name != null) $('authName').value = name;
    for (const id of ['authPin', 'authPin2', 'authKod']) $(id).value = '';
    $('authNameMsg').textContent = '';
    $('authErr').textContent = msg || ''; $('authErr').className = 'autherr' + (msg ? ' info' : '');
    renderAuth();
    if (mode === 'giris' || mode === 'yeni' || mode === 'legacy') checkNameSoon(true);
    setTimeout(() => { const ae = document.activeElement; if (ae && ae.tagName === 'INPUT') return; (mode === 'kod' ? $('authKod') : $('authName').value ? $('authPin') : $('authName')).focus(); }, 50); // yazılan kutudan imleci kaçırma
  }
  function renderAuth() {
    const m = authMode, setting = m === 'yeni' || m === 'legacy', name = $('authName').value;
    const lock = m === 'giris' && authTur === 'resim' && name ? lockLeft(name) : 0;
    $('authName').classList.toggle('hidden', m === 'kod');
    $('authKod').classList.toggle('hidden', m !== 'kod');
    $('authType').classList.toggle('hidden', !setting);
    document.querySelectorAll('#authType [data-tur]').forEach(b => b.classList.toggle('on', b.dataset.tur === authTur));
    const showPin = (setting && authTur === 'pin') || (m === 'giris' && authTur === 'pin');
    const showGrid = (setting && authTur === 'resim') || (m === 'giris' && authTur === 'resim');
    $('authPin').classList.toggle('hidden', !showPin); $('authPin2').classList.toggle('hidden', !(showPin && setting));
    $('authPin').placeholder = setting ? 'PIN belirle (4 rakam)' : '4 haneli PIN';
    $('authPin').autocomplete = setting ? 'new-password' : 'current-password';
    $('authGrid').classList.toggle('hidden', !showGrid);
    if (showGrid) drawGrid($('authGrid'), setting ? authPick : null, !!lock);
    $('authTypeHint').classList.toggle('hidden', !showGrid);
    $('authTypeHint').textContent = setting ? ('Bir resim seç. Girişte bu resme dokunacaksın.') : 'Resmine dokun:';
    $('btnAuth').classList.toggle('hidden', m === 'giris' && authTur !== 'pin');
    $('btnAuth').textContent = m === 'giris' ? 'Giriş yap' : m === 'legacy' ? '☁️ Buluta taşı ve oyna' : m === 'kod' ? 'Kodla gir' : 'Oyuncu oluştur';
    $('authForgot').classList.toggle('hidden', m !== 'giris');
    const carry = m === 'yeni' && Kayit.isGuest(state.player) && (state.player.races > 0 || state.player.points > 0);
    $('authCarryRow').classList.toggle('hidden', !carry);
    if (carry) $('authCarryTxt').textContent = `Misafir ilerlemem bu hesaba taşınsın (⭐ ${state.player.points} puan, ${state.player.races} yarış)`;
    clearInterval(lockTimer);
    if (lock) { const tick = () => { const l = lockLeft(name); if (!l) { clearInterval(lockTimer); $('authErr').textContent = '✅ Bekleme bitti, tekrar deneyebilirsin.'; $('authErr').className = 'autherr info'; drawGrid($('authGrid'), null, false); return; } $('authErr').textContent = `⏳ 3 kez yanlış resim seçildi. Bu cihazda 30 dakika beklemen gerekiyor. Kalan: ${mmss(l)}`; $('authErr').className = 'autherr'; }; tick(); lockTimer = setInterval(tick, 1000); }
  }
  function checkNameSoon(now) {
    clearTimeout(nameTimer); const n = $('authName').value;
    if (authMode === 'kod') return;
    if (!n.trim()) { $('authNameMsg').textContent = ''; if (authMode === 'giris' && authTur) { authTur = null; renderAuth(); } return; }
    if (authMode !== 'giris') { const local = MI.check(n); if (local) { $('authNameMsg').textContent = '⚠️ ' + local; $('authNameMsg').className = 'namemsg bad'; return; } }
    nameTimer = setTimeout(async () => {
      const r = await Kayit.checkName(n); if ($('authName').value !== n) return;
      if (authMode === 'giris') { // giriş: şifre türüne göre PIN kutusu ya da resim ızgarası
        const tur = r.var ? r.tur : null;
        $('authNameMsg').textContent = r.var ? (authMode === 'giris' ? (tur === 'resim' ? '🖼️ Resimli şifre' : '🔢 PIN') : '') : (r.uygun === null ? '⚠️ ' + (r.hata || '') : "⚠️ Bu adla oyuncu yok. 'Yeni oyuncu' ile oluşturabilirsin.");
        $('authNameMsg').className = 'namemsg ' + (r.var ? 'good' : 'bad');
        if (authMode === 'giris' && tur !== authTur) { authTur = tur; renderAuth(); }
        return;
      }
      $('authNameMsg').textContent = r.uygun ? '✅ Bu ad boş' : r.uygun === false ? '⚠️ ' + (r.hata || 'Bu ad alınmış') + (authMode === 'legacy' && r.var ? ". Senin hesabınsa 'Giriş yap' ile gir." : '') : '⚠️ ' + (r.hata || '');
      $('authNameMsg').className = 'namemsg ' + (r.uygun ? 'good' : 'bad');
    }, now === true ? 0 : 350);
  }
  $('authName').addEventListener('input', () => { if (!/⏳/.test($('authErr').textContent)) $('authErr').textContent = ''; checkNameSoon(); });
  $('authTabs').addEventListener('click', e => { const b = e.target.closest('[data-auth]'); if (b) setAuth(b.dataset.auth, authMode === 'legacy' ? '' : null); });
  $('authType').addEventListener('click', e => { const b = e.target.closest('[data-tur]'); if (!b) return; authTur = b.dataset.tur; authPick = null; renderAuth(); });
  $('authForgot').onclick = () => { $('authErr').innerHTML = "Girişli cihazında <b>📱 Yeni cihaz ekle</b> de, kodu burada <b>📱 Kodla gir</b>'e yaz. Yoksa oyunun sahibinden sıfırlamasını iste."; $('authErr').className = 'autherr info'; };
  $('authGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b || b.disabled) return;
    const i = +b.dataset.r;
    if (authMode === 'giris') { submitAuth(i); return; } // girişte resme dokunmak yeter
    authPick = i; markGrid($('authGrid'), i);
  });
  for (const id of ['authName', 'authPin', 'authPin2', 'authKod']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
  async function submitAuth(resim) {
    const m = authMode, ad = MI.tidy($('authName').value), err = t => { $('authErr').textContent = '⚠️ ' + t; $('authErr').className = 'autherr'; };
    let secret = null;
    if (m === 'kod') { const k = $('authKod').value.replace(/\D/g, ''); if (k.length !== 6) return err('Kod 6 rakam olmalı'); secret = k; }
    else {
      if (!ad) return err('Adını yaz');
      if (m === 'giris') {
        if (authTur === 'resim') { if (resim == null) return; if (lockLeft(ad)) return renderAuth(); secret = { resim }; }
        else if (authTur === 'pin') { const pin = $('authPin').value.trim(); if (!MI.pinOk(pin)) return err('PIN 4 rakam olmalı'); secret = { pin }; }
        else return err('Bu adla oyuncu bulunamadı');
      } else {
        { const e = MI.check(ad); if (e) return err(e); if (MI.guestLike(ad)) return err("'Misafir' ile başlayan adlar misafirlere ayrılmış, başka bir ad seç"); }
        if (authTur === 'pin') { const pin = $('authPin').value.trim(); if (!MI.pinOk(pin)) return err('PIN 4 rakam olmalı'); if ($('authPin2').value.trim() !== pin) return err('İki PIN aynı değil'); secret = { tur: 'pin', pin }; }
        else { if (authPick == null) return err('Bir resim seç'); secret = { tur: 'resim', resim: authPick }; }
      }
    }
    $('btnAuth').disabled = true; $('authErr').textContent = '⏳ Bekle…'; $('authErr').className = 'autherr info';
    const r = m === 'giris' ? await Kayit.login(ad, secret) : m === 'kod' ? await Kayit.codeLogin(secret)
      : await Kayit.register(ad, secret, m === 'legacy' ? authLegacy : (Kayit.isGuest(state.player) && $('authCarry').checked ? state.player : null));
    $('btnAuth').disabled = false;
    if (r.hata) {
      if (r.kalanSn) { setLock(ad, r.kalanSn); renderAuth(); return; }
      err(r.hata + (m === 'legacy' && /alınmış/.test(r.hata) ? ". Senin hesabınsa 'Giriş yap' ile gir." : ''));
      if (m === 'giris' && authTur === 'resim') drawGrid($('authGrid'), null, false); // yanlış resim: dizilişi yeniden karıştır
      return;
    }
    selectPlayer(r.profil.name);
  }
  $('btnAuth').onclick = () => submitAuth();
  $('btnGuestPlay').onclick = () => selectPlayer(Kayit.guest().name);
  // misafirin adını değiştir (şifresiz, sadece bu cihazda; çok oyunculuda bu adla görünür)
  async function renameGuest(done) {
    const p = state.player; if (!Kayit.isGuest(p)) return;
    const ad = prompt('Çok oyunculuda görünecek adın (şifre gerekmez, sadece bu cihazda kalır):', p.name); if (ad == null || MI.tidy(ad) === p.name) return;
    const r = await Kayit.renameGuest(ad); if (r.hata) { alert('⚠️ ' + r.hata); return; }
    if (Ag.connected) Ag.connect(agProfile());
    if (done) done();
  }
  $('plist').addEventListener('click', async e => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); const n = del.dataset.del; if (confirm(Kayit.isGuest(Kayit.get(n)) ? `Misafir "${n}" ve bu cihazdaki puanları silinsin mi?` : `"${n}" bu cihazdan çıkış yapsın mı?\nHesap ve puanlar bulutta kalır; tekrar adın ve şifrenle girebilirsin.`)) { await Kayit.forget(n); if (state.player && MI.key(state.player.name) === MI.key(n)) state.player = null; showProfiles(); } return; }
    const b = e.target.closest('[data-name]'); if (b) selectPlayer(b.dataset.name);
  });
  $('legacyList').addEventListener('click', e => {
    const del = e.target.closest('[data-legdel]');
    if (del) { e.stopPropagation(); if (confirm(`"${del.dataset.legdel}" eski kaydı gizlensin mi? (Buluta taşınmaz)`)) { Kayit.dismissLegacy(del.dataset.legdel); showProfiles(); } return; }
    const b = e.target.closest('[data-legacy]'); if (!b) return;
    const legacy = Kayit.legacyPlayers().find(p => MI.key(p.name) === MI.key(b.dataset.legacy)) || null;
    setAuth('legacy', b.dataset.legacy, ''); authLegacy = legacy;
    $('authErr').textContent = `"${b.dataset.legacy}" için bir şifre belirle: ilerlemen (${legacy ? legacy.points || 0 : 0} puan) buluta taşınacak.`; $('authErr').className = 'autherr info';
    Kayit.checkName(b.dataset.legacy).then(r => { // bu ad bulutta zaten varsa (taşınmışsa) giriş
      if (r.var) setAuth('giris', b.dataset.legacy, `"${b.dataset.legacy}" bulutta zaten kayıtlı. Şifrenle giriş yap.`);
    });
  });
  // ---- şifre değiştir ----
  let sfOld = null, sfTur = 'pin', sfNew = null;
  function showSifre() {
    const info = Kayit.info() || { tur: 'pin' };
    sfOld = null; sfNew = null; sfTur = info.tur;
    $('sfOldPin').value = ''; $('sfNewPin').value = ''; $('sfNewPin2').value = ''; $('sfErr').textContent = '';
    $('sfOldPin').classList.toggle('hidden', info.tur !== 'pin'); $('sfOldGrid').classList.toggle('hidden', info.tur !== 'resim');
    $('sfOldTxt').textContent = info.tur === 'resim' ? 'Önce şu anki resmine dokun:' : 'Önce şu anki PIN\'ini yaz:';
    if (info.tur === 'resim') drawGrid($('sfOldGrid'), null, false);
    renderSifre(); show('scrSifre');
  }
  function renderSifre() {
    document.querySelectorAll('#sfType [data-tur]').forEach(b => b.classList.toggle('on', b.dataset.tur === sfTur));
    $('sfNewPin').classList.toggle('hidden', sfTur !== 'pin'); $('sfNewPin2').classList.toggle('hidden', sfTur !== 'pin');
    $('sfNewGrid').classList.toggle('hidden', sfTur !== 'resim'); if (sfTur === 'resim') drawGrid($('sfNewGrid'), sfNew, false);
  }
  $('sfType').addEventListener('click', e => { const b = e.target.closest('[data-tur]'); if (b) { sfTur = b.dataset.tur; sfNew = null; renderSifre(); } });
  $('sfOldGrid').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { sfOld = +b.dataset.r; markGrid($('sfOldGrid'), sfOld); } });
  $('sfNewGrid').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { sfNew = +b.dataset.r; markGrid($('sfNewGrid'), sfNew); } });
  $('sfBack').onclick = () => showMenu();
  $('sfSave').onclick = async () => {
    const info = Kayit.info() || { tur: 'pin' }, err = t => { $('sfErr').textContent = '⚠️ ' + t; $('sfErr').className = 'autherr'; };
    let eski;
    if (info.tur === 'resim') { if (sfOld == null) return err('Şu anki resmine dokun'); eski = { resim: sfOld }; }
    else { const p = $('sfOldPin').value.trim(); if (!MI.pinOk(p)) return err('Şu anki PIN 4 rakam olmalı'); eski = { pin: p }; }
    let yeni;
    if (sfTur === 'pin') { const p = $('sfNewPin').value.trim(); if (!MI.pinOk(p)) return err('Yeni PIN 4 rakam olmalı'); if ($('sfNewPin2').value.trim() !== p) return err('İki PIN aynı değil'); yeni = { tur: 'pin', pin: p }; }
    else { if (sfNew == null) return err('Yeni resmini seç'); yeni = { tur: 'resim', resim: sfNew }; }
    $('sfSave').disabled = true; const r = await Kayit.changeSecret(eski, yeni); $('sfSave').disabled = false;
    if (!r.ok) { err(r.hata); if (info.tur === 'resim') { sfOld = null; drawGrid($('sfOldGrid'), null, false); } return; }
    $('sfErr').textContent = '✅ Şifren değişti. Diğer cihazlarda yeniden giriş gerekecek.'; $('sfErr').className = 'autherr info';
    setTimeout(showMenu, 1600);
  };

  // ---- yeni cihaz ekle (6 haneli kod + QR, 5 dk) ----
  let cdTimer = null;
  async function showCihaz() {
    show('scrCihaz'); $('cdKod').textContent = '······'; $('cdQr').innerHTML = ''; $('cdSure').textContent = '⏳ Kod alınıyor…';
    clearInterval(cdTimer);
    const r = await Kayit.deviceCode();
    if (r.hata) { $('cdSure').textContent = '⚠️ ' + r.hata; return; }
    $('cdKod').textContent = r.kod.slice(0, 3) + ' ' + r.kod.slice(3);
    try { const q = window.qrcode(0, 'M'); q.addData('https://ysf-creator1.github.io/misket-yarisi/?kod=' + r.kod); q.make(); $('cdQr').innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { }
    const until = Date.now() + r.sureSn * 1000;
    const tick = () => { const l = Math.ceil((until - Date.now()) / 1000); if (l <= 0) { clearInterval(cdTimer); $('cdSure').textContent = '⌛ Kodun süresi doldu. "Yeni kod" ile yenisini al.'; $('cdKod').textContent = '······'; $('cdQr').innerHTML = ''; return; } $('cdSure').textContent = `Kod ${mmss(l)} geçerli, bir kez kullanılır.`; };
    tick(); cdTimer = setInterval(tick, 1000);
  }
  $('cdNew').onclick = showCihaz;
  $('cdBack').onclick = () => { clearInterval(cdTimer); showMenu(); };

  let opened = false;
  function selectPlayer(name) {
    state.player = Kayit.use(name); if (!state.player) return showProfiles();
    if (!opened) { opened = true; const g = Kayit.isGuest(state.player); Kayit.track('acilis', { misafir: g, ad: g ? undefined : state.player.name, mobil: !!window.MOBIL }); } // rapor: oyun açıldı
    if (Ag.connected) Ag.connect(agProfile()); // oyuncu değişti: sunucuya yeni adı bildir
    if (pendingRoom) { const k = pendingRoom; pendingRoom = null; showMp(); joinWhenReady(k); return; }
    showMenu();
  }

  function showMenu() {
    toMenuScene(); state.cup = null;
    const p = state.player;
    $('mName').textContent = p.name; $('mPoints').textContent = p.points;
    $('mLevel').textContent = levelOf(p.xp); $('mLevelBar').style.width = (levelFrac(p.xp) * 100).toFixed(0) + '%';
    $('mAch').textContent = `${Object.keys(p.ach).length} / ${ACH.length} açıldı`;
    $('mStats').textContent = `${p.races} yarış · ${p.wins} galibiyet · ${p.podiums} kez ilk 3 · toplam ${p.earned} puan kazanıldı`;
    $('btnSound').textContent = Kayit.save.sound === false ? '🔇 Ses: Kapalı' : '🔊 Ses: Açık';
    $('btnGfx').textContent = '🖥️ Grafik: ' + ({ yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' }[Grafik.quality()]);
    renderDaily();
    const guest = Kayit.isGuest(p);
    $('mMisafir').classList.toggle('hidden', !guest); $('mHesapAyar').classList.toggle('hidden', guest);
    if (guest) $('mMisafirTxt').textContent = `Misafirsin (${p.name}). Puanların sadece bu cihazda. Kaybolmasın istersen hesap oluştur.`;
    Kayit.onStatus(); show('scrMenu');
    if (state.authLost) authLost();
  }
  $('btnSwitch').onclick = () => showProfiles();
  // dil: Türkçe ↔ English (sayfa yenilenir; yarış sırasında değil)
  for (const id of ['btnDil', 'btnDil2']) { $(id).textContent = Dil.lang === 'en' ? '🌐 Türkçe' : '🌐 English'; $(id).onclick = () => Dil.set(Dil.lang === 'en' ? 'tr' : 'en'); }
  $('btnLider').onclick = () => showLider();
  $('btnGuc').onclick = showGucler;
  $('gucBack').onclick = showMenu;
  $('btnPin').onclick = showSifre;
  $('btnCihaz').onclick = showCihaz;
  $('mHesap').onclick = () => showProfiles('yeni');
  $('mGiris').onclick = () => showProfiles('giris');
  $('mAdDegis').onclick = () => renameGuest(() => showMenu());
  $('btnRace').onclick = () => { state.cup = null; state.world = null; showTracks(); };
  $('btnSound').onclick = () => { Kayit.save.sound = Kayit.save.sound === false; Ses.on = Kayit.save.sound !== false; Kayit.persist(); showMenu(); };
  $('btnGfx').onclick = () => {
    const L = Grafik.QUALITIES, cur = Grafik.quality(); Kayit.save.gfx = L[(L.indexOf(cur) + 1) % L.length]; Kayit.persist(); Grafik.setQuality(Kayit.save.gfx);
    if (state.track) { disposeRace(); Grafik.disposeView(state.view); state.view = Grafik.buildView(state.track); }
    showMenu();
  };

  // parkur seçimi: dünyalar akordiyon gibi; başlığa dokununca altında 10 parkuru açılır. Varsayılan: en son oynanan parkurun dünyası.
  function showTracks(world, scroll = true) {
    toMenuScene();
    const p = state.player, maxOpen = openUpTo(p);
    if (world == null) {
      const last = state.trackId && state.trackId <= maxOpen ? state.trackId : maxOpen;
      world = state.world != null ? state.world : MP.worldOf(last).id;
    }
    state.world = world;
    $('tlist').innerHTML = MP.WORLDS.map(w => {
      const first = w.id * 10 + 1, open = first <= maxOpen, on = open && w.id === world;
      const done = MP.TRACKS.filter(t => t.world === w.id && p.best[t.id] && p.best[t.id].place <= 3).length;
      const head = `<button class="acchead${on ? ' on' : ''}" ${open ? `data-world="${w.id}"` : 'disabled'}><span class="ic">${w.icon}</span><span class="nm"><b style="color:${open ? w.pal[0] : 'inherit'}">${esc(w.name)}</b><small>Parkur ${first}–${first + 9}${open ? '' : ' · 🔒 önceki dünyada ilerle'}</small></span><span class="dn">${open ? `${done}/10 ✓` : '🔒'}</span><span class="ar">${open ? (on ? '▴' : '▾') : ''}</span></button>`;
      if (!on) return `<div class="acc${open ? '' : ' locked'}">${head}</div>`;
      const ts = MP.TRACKS.filter(t => t.world === w.id);
      return `<div class="acc open" id="accOpen">${head}<p class="muted" style="margin:6px 4px;font-size:12px;font-weight:700">Son 3 parkur dünya kupasıdır.</p><div class="tgrid">${ts.map(t => {
        const topen = t.id <= maxOpen, b = p.best[t.id];
        const sub = !topen ? "🔒 Önceki parkurda ilk 3'e gir" : `⏱ ~${t.target} sn · 🥇 ${pointsFor(t.id)} puan`;
        return `<button class="tcard${topen ? '' : ' locked'}${t.id === state.trackId ? ' last' : ''}" ${topen ? `data-track="${t.id}"` : 'disabled'}><span class="num">PARKUR ${t.id}${t.hand ? ' · ⭐ ÖZEL' : ''}${t.id === state.trackId ? ' · son oynanan' : ''}</span><b>${esc(t.name)}</b><small>${sub}</small>${b ? `<small class="best">En iyi: ${MEDAL[b.place - 1] || b.place + '.'}${b.time ? ' · ' + b.time.toFixed(1) + ' sn' : ''}</small>` : ''}</button>`;
      }).join('')}</div></div>`;
    }).join('');
    show('scrTracks');
    if (scroll) requestAnimationFrame(() => { const el = $('accOpen'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  }
  $('tlist').addEventListener('click', e => {
    const w = e.target.closest('[data-world]');
    if (w) { const id = +w.dataset.world; showTracks(id === state.world ? -1 : id); return; } // açık başlığa dokununca kapanır
    const b = e.target.closest('[data-track]'); if (b) { state.trackId = +b.dataset.track; showPick(); }
  });
  $('btnTracksBack').onclick = showMenu;

  // ---- kupalar ----
  function showCups() {
    toMenuScene();
    const p = state.player;
    $('clist').innerHTML = MP.CUPS.map(c => {
      const ts = c.tracks.map(id => MP.TRACKS[id - 1]), lastId = c.tracks[2];
      const open = openUpTo(p) >= lastId, best = p.cups[c.id];
      return `<button class="cupcard" ${open ? `data-cup="${c.id}"` : 'disabled'} style="${open ? '' : 'opacity:.5'}"><span class="ic">${c.icon}</span><span><b style="color:${c.color}">${esc(c.name)}</b><small>${ts.map(t => esc(t.name)).join(' · ')}</small><small>${open ? `Şampiyonluk ödülü: +${c.bonus} puan` : `🔒 ${lastId}. parkuru açınca oynanır`}${best ? ` · En iyi: ${MEDAL[best - 1] || best + '.'}` : ''}</small></span></button>`;
    }).join('');
    show('scrCups');
  }
  $('btnCups').onclick = showCups;
  $('btnCupsBack').onclick = showMenu;
  $('clist').addEventListener('click', e => {
    const b = e.target.closest('[data-cup]'); if (!b) return;
    const id = +b.dataset.cup, tracks = MP.CUPS[id].tracks.slice();
    state.cup = { id, tracks, idx: 0, pts: [0, 0, 0, 0, 0, 0], results: [] };
    state.trackId = tracks[0]; showPick();
  });

  // ---- misket seçimi + bahis ----
  function showPick() {
    const t = MP.TRACKS.find(x => x.id === state.trackId);
    $('pickTitle').textContent = state.cup ? `${MP.CUPS[state.cup.id].icon} ${MP.CUPS[state.cup.id].name} — Misketini Seç` : `${MP.WORLDS[t.world].icon} Parkur ${t.id}: ${t.name} — Misketini Seç`;
    const eq = state.player.eq;
    $('mgrid').innerHTML = MF.MARBLES.map((m, i) => {
      const look = i === state.pick ? Magaza.lookFor(m, eq) : m;
      return `<button class="mcard${i === state.pick ? ' sel' : ''}" data-pick="${i}"><div class="ball" style="background:radial-gradient(circle at 35% 30%, ${look.color2 || '#ffffff'}, ${look.color} 55%, #000 140%)"></div><b>${m.name}</b>${i === state.pick ? '<small class="muted">kostümün bunda</small>' : ''}</button>`;
    }).join('');
    $('betBox').classList.toggle('hidden', !!state.cup);
    if (!state.cup) setupBet();
    ensureTrack(state.trackId);
    show('scrPick');
  }
  function setupBet() {
    const p = state.player, max = Math.floor(p.points * 0.5 / 5) * 5;
    state.bet = state.bet || { marble: state.pick, type: 'win', amount: 0 };
    $('betMarble').innerHTML = MF.MARBLES.map((m, i) => `<option value="${i}" ${i === state.bet.marble ? 'selected' : ''}>${m.name}${i === state.pick ? ' (senin)' : ''}</option>`).join('');
    $('betAmt').max = Math.max(0, max); $('betAmt').disabled = max < 5;
    state.bet.amount = Math.min(state.bet.amount, max); $('betAmt').value = state.bet.amount;
    document.querySelectorAll('#betType button').forEach(b => b.classList.toggle('on', b.dataset.bt === state.bet.type));
    betText();
  }
  function betText() {
    const b = state.bet, mult = b.type === 'win' ? 3 : 1.5;
    $('betAmtTxt').textContent = b.amount > 0 ? `${b.amount} → ${Math.round(b.amount * mult)}` : ($('betAmt').disabled ? 'Puan yetersiz' : 'Bahis yok');
  }
  $('betMarble').onchange = e => { state.bet.marble = +e.target.value; };
  $('betAmt').oninput = e => { state.bet.amount = +e.target.value; betText(); };
  $('betType').addEventListener('click', e => { const b = e.target.closest('[data-bt]'); if (!b) return; state.bet.type = b.dataset.bt; setupBet(); });
  $('mgrid').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; const old = state.pick; state.pick = +b.dataset.pick; if (state.bet && state.bet.marble === old) state.bet.marble = state.pick; showPick(); });
  $('btnPickBack').onclick = () => { if (state.cup) { state.cup = null; showCups(); } else showTracks(); };
  $('btnGo').onclick = startRace;
  $('btnResAgain').onclick = () => {
    if (state.mp) { disposeRace(); showMp(); return; }
    if (state.cup) { if (state.cupDone) { state.cup = null; showCups(); } else { state.trackId = state.cup.tracks[state.cup.idx]; startRace(); } }
    else showPick();
  };
  $('btnResTracks').onclick = () => { state.cup = null; leaveMp(); showTracks(); };
  $('btnResNext').onclick = () => { if (state.cup || state.trackId >= MP.TRACKS.length || openUpTo(state.player) < state.trackId + 1) return; state.trackId++; state.world = null; showPick(); };
  $('btnResMenu').onclick = () => { leaveMp(); showMenu(); };
  function cycleCam() { state.cam = (state.cam + 1) % CAMS.length; $('camName').textContent = CAMS[state.cam]; }
  $('btnCam').onclick = cycleCam;
  function quitRace(sure) {
    if (state.mp) {
      if (!sure && (state.phase === 'race' || state.phase === 'countdown' || state.phase === 'ending') && !confirm('Yarıştan çıkılsın mı? (Misketini bot sürer, puan alınmaz)')) return;
      Ag.send({ t: 'ayril' }); disposeRace(); state.mp = null; showMp(); return;
    }
    if (!sure && (state.phase === 'race' || state.phase === 'countdown' || state.phase === 'ending')) { if (!confirm('Yarıştan çıkılsın mı? (Puan alınmaz' + (state.betActive ? ', bahis iade edilir' : '') + ')')) return; }
    if (state.betActive) { state.player.points += state.betActive.amount; state.betActive = null; Kayit.persist(); }
    disposeRace(); state.cup = null; showTracks();
  }
  $('btnQuit').onclick = () => openPause();
  // duraklat: tek kişilikte yarış durur; çok kişilikte yarış sürer (sadece menü açılır)
  function openPause() {
    if (!['countdown', 'race', 'ending'].includes(state.phase) || state.pauseOpen) return;
    state.pauseOpen = true; if (!state.mp) { state.paused = true; Ses.stopRolling(); }
    $('pauseTitle').textContent = state.mp ? '⏸ Menü' : '⏸ Oyun durdu';
    $('pauseSub').textContent = state.mp ? 'Yarış sürüyor. Çıkarsan misketini bot sürer.' : 'Yarış durdu. Çıkarsan puan alınmaz.';
    $('pauseBox').classList.remove('hidden');
  }
  function closePause() { state.pauseOpen = false; state.paused = false; $('pauseBox').classList.add('hidden'); }
  $('pauseGo').onclick = closePause;
  $('pauseCards').onclick = () => { $('pauseCardList').classList.toggle('hidden'); if (!$('pauseCardList').innerHTML) $('pauseCardList').innerHTML = powerCardsHTML(); };
  $('pauseQuit').onclick = () => { closePause(); quitRace(true); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && !state.mp) openPause(); }); // başka uygulamaya geçince durur
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (state.phase === 'replay' && (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter')) { endReplay(); return; }
    if (state.phase === 'race' || state.phase === 'countdown' || state.phase === 'ending') {
      if (e.key === 'c' || e.key === 'C') cycleCam();
      if (e.key === 'Escape') { if (state.pauseOpen) closePause(); else openPause(); }
      if (e.key >= '1' && e.key <= '3') pickCard(+e.key - 1);
    }
  });


  // ================= ÇOK OYUNCULU =================
  // Fizik sunucuda (sunucu/oyun-sunucusu.js); burada lobi ve Ag.RemoteRace ile oynatma. Puanlar normal yarış gibi profile yazılır.
  let pendingRoom = null, joinAfter = null, mpMsgTimer = null;
  try { const q = new URLSearchParams(location.search).get('oda'); if (q && /^[A-Za-z0-9]{5}$/.test(q)) pendingRoom = q.toUpperCase(); } catch (e) { }
  const agProfile = () => ({ ad: state.player.name, eq: state.player.eq, acik: openUpTo(state.player), token: Kayit.token() }); // kayıtlı adın sahibi olduğunu göstermek için
  function showMp() {
    if (state.phase === 'shop') leaveShop();
    toMenuScene();
    Ag.connect(agProfile()); // bağlıysa güncel ad/kostüm yeniden bildirilir
    renderMp(); show('scrMp'); renderVote();
  }
  function leaveMp() { if (Ag.room) Ag.send({ t: 'ayril' }); Ag.room = null; state.mp = null; }
  function joinWhenReady(k) { if (Ag.connected && Ag.pid) Ag.send({ t: 'katil', kod: k }); else { joinAfter = k; Ag.connect(agProfile()); } }
  function mpMsg(t) { const el = $('mpMsg'); el.textContent = t || ''; el.classList.toggle('hidden', !t); clearTimeout(mpMsgTimer); if (t) mpMsgTimer = setTimeout(() => el.classList.add('hidden'), 5000); }
  Ag.on('durum', d => { if (d.bagli && joinAfter) { Ag.send({ t: 'katil', kod: joinAfter }); joinAfter = null; } renderMp(); });
  Ag.on('oda', () => { renderMp(); renderVote(); });
  // ---- yarış sonrası oylama: aynı parkur mu, sonraki mi? (yarış başlayana kadar değiştirilebilir / iptal edilebilir) ----
  function voteHTML(room) {
    const v = room && room.oylama; if (!v) return '';
    const mine = v.oylar[Ag.pid], last = v.sonParkur, nextId = Math.min(MP.TRACKS.length, last + 1);
    const names = c => room.oyuncular.filter(o => v.oylar[o.pid] === c).map(o => esc(o.ad)).join(', ');
    const opt = (c, icon, title, t, dis) => `<button class="voteopt${mine === c ? ' on' : ''}${v.kalan != null && v.secim === c ? ' win' : ''}" data-oy="${c}" ${dis ? 'disabled' : ''}><span class="vic">${icon}</span><b>${title}</b><small>Parkur ${t.id} · ${esc(t.name)}</small><span class="vwho">${names(c) ? '✋ ' + names(c) : 'henüz seçen yok'}</span>${v.kalan != null && v.secim === c ? '<span class="vwin">▶ bu başlayacak</span>' : ''}</button>`;
    const status = v.kalan != null ? `⏳ <b>${v.kalan} sn</b> sonra: <b>${v.secim === 'sonraki' ? 'Sonraki parkur' : 'Aynı parkur'}</b>. Değiştirmek için diğerine dokun.`
      : mine ? `Diğerleri bekleniyor…${v.bekleme != null ? ` (en geç ${v.bekleme} sn)` : ''}` : 'Sıradaki yarışı seç:';
    return `<div class="vote"><p class="vstat">${status}</p><div class="vopts">${opt('ayni', '🔁', 'Aynı parkur', MP.TRACKS[last - 1])}${opt('sonraki', '⏭', 'Sonraki parkur', MP.TRACKS[nextId - 1], last >= MP.TRACKS.length)}</div>${mine ? '<button class="sm" data-oy="iptal">✖ Seçimimi iptal et</button>' : ''}</div>`;
  }
  function renderVote() {
    const room = Ag.room, show1 = !!(state.mp && state.phase === 'result' && room && room.oylama);
    $('resVote').innerHTML = show1 ? voteHTML(room) : ''; $('resVote').classList.toggle('hidden', !show1);
    const show2 = !!(room && room.oylama && room.oylama.sonParkur);
    $('mpVote').innerHTML = show2 ? voteHTML(room) : ''; $('mpVote').classList.toggle('hidden', !show2);
  }
  for (const id of ['resVote', 'mpVote']) $(id).addEventListener('click', e => {
    const b = e.target.closest('[data-oy]'); if (!b || b.disabled) return;
    const mine = Ag.room && Ag.room.oylama && Ag.room.oylama.oylar[Ag.pid], c = b.dataset.oy;
    Ag.send({ t: 'oy', secim: c === 'iptal' || c === mine ? null : c }); // aynı seçeneğe tekrar dokunmak da iptal eder
  });
  Ag.on('hata', m => { mpMsg('⚠️ ' + m.mesaj); if (state.mp && state.race) toast('⚠️ ' + m.mesaj, 'bad'); });
  Ag.on('basla', m => startNetRace(m));
  let mpTrackN = 0;
  function renderMp() {
    const room = Ag.room, me = Ag.pid, ready = Ag.connected && !!me;
    $('mpStatus').textContent = ready ? '🟢 Sunucuya bağlısın' : Ag.want ? '⏳ Sunucuya bağlanılıyor…' : '🔴 Bağlı değil';
    const guest = Kayit.isGuest(state.player);
    $('mpMe').classList.toggle('hidden', guest); $('mpGuest').classList.toggle('hidden', !guest);
    if (!guest) $('mpMe').innerHTML = `Bu oyunda adın: <b>${esc(Ag.ad || state.player.name)}</b>`;
    else if (document.activeElement !== $('mpName')) $('mpName').value = Ag.ad && Ag.ad !== state.player.name && !MI.guestLike(state.player.name) ? Ag.ad : state.player.name;
    $('mpHome').classList.toggle('hidden', !!room); $('mpRoom').classList.toggle('hidden', !room);
    for (const id of ['mpQuick', 'mpCreate', 'mpJoin']) $(id).disabled = !ready;
    if (!room) return;
    const host = room.kurucu === me, mine = room.oyuncular.find(q => q.pid === me), T = MP.TRACKS[room.parkur - 1];
    $('mpRoomCode').textContent = room.kod; $('mpCopy').classList.toggle('hidden', room.hizli);
    $('mpTitle').textContent = room.hizli ? '⚡ Hızlı oyun' : '🏠 Özel oda';
    const canPick = host && !room.hizli && room.durum === 'lobi';
    $('mpTrack').classList.toggle('hidden', !canPick); $('mpTrackTxt').classList.toggle('hidden', canPick);
    if (canPick) {
      const n = openUpTo(state.player);
      if (n !== mpTrackN) { mpTrackN = n; $('mpTrack').innerHTML = MP.TRACKS.slice(0, n).map(t => `<option value="${t.id}">${t.id} · ${esc(t.name)} (${MP.WORLDS[t.world].icon} ~${t.target} sn)</option>`).join(''); }
      $('mpTrack').value = room.parkur;
    }
    $('mpTrackTxt').textContent = `${room.parkur} · ${T.name} (${MP.WORLDS[T.world].icon} ${MP.WORLDS[T.world].name}, ~${T.target} sn)`;
    $('mpQuickInfo').textContent = room.hizli && room.durum === 'lobi' ? `Oyuncular bekleniyor… ${room.bekleme} sn (eksiklere bot)` : room.durum === 'yaris' && !state.race ? '🏁 Bu odada yarış sürüyor, bitince katılabilirsin.' : '';
    $('mpSlots').innerHTML = MF.MARBLES.map((info, i) => {
      const q = room.oyuncular.find(x => x.misket === i), isMe = q && q.pid === me, lk = q ? Magaza.lookFor(info, q.eq || {}) : info; // kostüm rengi
      const who = q ? `<b>${esc(q.ad)}${isMe ? ' (sen)' : ''}${q.misafir ? ' 👤' : ''}${q.pid === room.kurucu && !room.hizli ? ' 👑' : ''}</b><small>${!q.bagli ? '📴 bağlantı koptu' : q.hazir ? '✅ hazır' : '⏳ hazırlanıyor'}</small>` : `<b>🤖 Bot</b><small>${room.durum === 'lobi' ? 'seçmek için dokun' : ''}</small>`;
      return `<button class="mpslot${isMe ? ' me' : ''}${q ? '' : ' free'}" data-slot="${i}" ${q && !isMe ? 'disabled' : ''}><span class="ball" style="background:radial-gradient(circle at 35% 30%, ${lk.color2 || '#ffffff'}, ${lk.color} 55%, #000 140%)"></span><span class="mn">${esc(info.name)}</span>${who}</button>`;
    }).join('');
    const n = room.oyuncular.length;
    $('mpReady').classList.toggle('hidden', room.hizli); $('mpReady').textContent = mine && mine.hazir ? '✅ Hazırsın' : 'Hazırım';
    $('mpStart').classList.toggle('hidden', !host || room.hizli); $('mpStart').disabled = room.durum !== 'lobi';
    $('mpStart').textContent = `Yarışı Başlat ▶ (${n} kişi + ${6 - n} bot)`;
  }
  $('mpQuick').onclick = () => Ag.send({ t: 'hizli' });
  // misafir: adını kutuya yazıp kaydeder (şifresiz, sadece bu cihazda)
  async function saveGuestName() {
    const v = MI.tidy($('mpName').value); if (!v || v === state.player.name) { $('mpNameMsg').textContent = ''; return; }
    $('mpNameMsg').textContent = '⏳'; const r = await Kayit.renameGuest(v);
    if (r.hata) { $('mpNameMsg').textContent = '⚠️ ' + r.hata; $('mpNameMsg').className = 'namemsg bad'; return; }
    $('mpNameMsg').textContent = '✅ Adın kaydedildi'; $('mpNameMsg').className = 'namemsg good';
    Ag.connect(agProfile()); setTimeout(() => { if (/✅/.test($('mpNameMsg').textContent)) $('mpNameMsg').textContent = ''; }, 2500);
  }
  $('mpNameOk').onclick = saveGuestName;
  $('mpName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); saveGuestName(); } });
  $('mpName').addEventListener('focus', e => { if (MI.guestLike(e.target.value)) e.target.select(); }); // misafir adı dokununca seçilir, yazınca silinir
  $('mpCreate').onclick = () => Ag.send({ t: 'odaKur' });
  $('mpJoin').onclick = () => { const k = $('mpCode').value.trim().toUpperCase(); if (!/^[A-Z0-9]{5}$/.test(k)) { mpMsg('Oda kodu 5 harf/rakam olmalı'); return; } Ag.send({ t: 'katil', kod: k }); };
  $('mpCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('mpJoin').click(); });
  $('mpLeave').onclick = () => { leaveMp(); renderMp(); };
  $('mpReady').onclick = () => { const mine = Ag.room && Ag.room.oyuncular.find(q => q.pid === Ag.pid); Ag.send({ t: 'hazir', v: !(mine && mine.hazir) }); };
  $('mpStart').onclick = () => Ag.send({ t: 'baslat' });
  $('mpTrack').onchange = e => Ag.send({ t: 'parkur', id: +e.target.value });
  $('mpSlots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b && !b.disabled) Ag.send({ t: 'misket', no: +b.dataset.slot }); });
  $('mpCopy').onclick = () => {
    const link = `${location.origin}${location.pathname}?oda=${Ag.room.kod}`;
    const done = () => mpMsg('🔗 Davet linki kopyalandı: arkadaşına gönder');
    if (navigator.share && window.MOBIL) navigator.share({ title: 'Misket Yarışı', text: 'Misket yarışına gel! Oda: ' + Ag.room.kod, url: link }).catch(() => { });
    else if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => prompt('Davet linki:', link));
    else prompt('Davet linki:', link);
  };
  function startNetRace(m) {
    if (!state.player) return;
    if (state.race && !state.mp && ['countdown', 'race', 'ending'].includes(state.phase)) { Ag.send({ t: 'ayril' }); return; } // tek oyunculu yarıştayken
    if (state.phase === 'shop') leaveShop();
    state.mp = { kod: m.kod, racers: m.yarisanlar }; state.cup = null; state.betActive = null;
    state.trackId = m.parkur; ensureTrack(m.parkur); disposeRace();
    const r = state.race = Ag.startRace(state.track, m), p = state.player;
    state.pick = m.benim;
    state.mvs = MF.MARBLES.map((info, i) => {
      const h = m.yarisanlar[i], me = i === state.pick;
      const look = Magaza.lookFor(info, me ? p.eq : h ? h.eq || {} : {});
      return Grafik.makeMarble(r.marbles[i].info, look, me, MF.PARAMS.r);
    });
    state.colors = state.mvs.map(mv => mv.look.color);
    state.prevV = MF.MARBLES.map(() => [0, 0, 0]);
    state.view.gates.forEach(g => { g.mesh.visible = true; g.mesh.position.y = g.y0; g.opening = false; });
    state.endTimer = 0; state.wasLast = false;
    if (m.intro > 0.3) { state.phase = 'countdown'; state.countdown = m.intro; }
    else { state.phase = 'race'; state.view.gates.forEach(g => { g.mesh.visible = false; }); } // yarış ortasında geri bağlandı
    camInit = false;
    show(null); $('hud').classList.remove('hidden'); $('toasts').innerHTML = ''; $('slowmo').classList.add('hidden'); hideCards();
    buildHud(); updateHud(true);
    lastCount = null;
    if (m.intro <= 0.3) toast('🔌 Yarışa geri döndün', 'gold');
  }

  // ================= MAĞAZA =================
  const SHOP_DEFAULT = { renk: 'Misketin kendi rengi', forma: 'Formasız', desen: 'Misketin kendi deseni', gozluk: 'Gözlüksüz', sapka: 'Şapkasız', iz: 'İzsiz' };
  function shopLook() {
    const p = state.player, eq = Object.assign({}, p.eq), t = state.shop.tryItem;
    if (t) { if (t.item) eq[t.cat] = t.item; else delete eq[t.cat]; }
    return Magaza.lookFor(MF.MARBLES[state.pick], eq);
  }
  function shopSpot() { const s = state.track.slots[2] || [0, 100, 0]; return new THREE.Vector3(s[0] + 6, s[1] + 9, s[2] - 6); }
  function rebuildPreview() {
    const S = state.shop;
    if (S.mv) Grafik.disposeMarble(S.mv);
    S.mv = Grafik.makeMarble(MF.MARBLES[state.pick], shopLook(), true, MF.PARAMS.r);
    S.mv.label.visible = false;
    Grafik.Particles.clear();
  }
  function showShop() {
    disposeRace();
    ensureTrack(state.trackId || 1);
    state.phase = 'shop'; $('hud').classList.add('hidden');
    state.shop.tryItem = null;
    if (!state.shop.ped) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 48), new THREE.MeshStandardMaterial({ color: Grafik.col('#dfe3ea'), metalness: 1, roughness: 0.18 }));
      ped.receiveShadow = true; ped.castShadow = true; scene.add(ped); state.shop.ped = ped;
    }
    state.shop.ped.visible = true;
    rebuildPreview(); renderShop(); show('scrShop');
  }
  function leaveShop() {
    const S = state.shop; if (S.mv) { Grafik.disposeMarble(S.mv); S.mv = null; } if (S.ped) S.ped.visible = false;
    Grafik.Particles.clear();
  }
  function closeShop() { leaveShop(); showMenu(); }
  function shopTick(dt, now) {
    const S = state.shop; if (!S.mv) return;
    const c = shopSpot(), mv = S.mv;
    S.ang += dt * 0.35;
    mv.mesh.position.copy(c); mv.mesh.rotation.y += dt * 0.8; mv.mesh.rotation.x = 0.25;
    S.ped.position.set(c.x, c.y - 0.68, c.z);
    const dist = innerWidth < innerHeight ? 3.8 : 2.9;
    const cam = new THREE.Vector3(c.x + Math.sin(S.ang) * dist, c.y + 0.55, c.z + Math.cos(S.ang) * dist);
    if (innerWidth < innerHeight) { camera.position.copy(cam); camera.lookAt(c.x, c.y - 1.1, c.z); } // dikey ekran: misket üstte, mağaza paneli altta
    else { camera.position.copy(cam); camera.lookAt(c.x + Math.cos(S.ang) * 1.15, c.y + 0.1, c.z - Math.sin(S.ang) * 1.15); } // misket ekranın solunda, panel sağda
    // aksesuarlar kameraya çapraz baksın, iz arkaya doğru aksın
    const toCam = Math.atan2(cam.x - c.x, cam.z - c.z) + 0.6;
    mv.acc.position.copy(c); mv.acc.rotation.set(0, toCam, 0);
    mv.acc.traverse(o => { if (o.userData && o.userData.spin) o.rotation.y += o.userData.spin * dt; });
    mv.shield.visible = false;
    if (mv.look.iz) { mv.trailT += dt; while (mv.trailT > 0.03) { mv.trailT -= 0.03; Magaza.emitTrail(Grafik.Particles, mv.look.iz, c, { x: Math.sin(toCam) * 5, y: 0, z: Math.cos(toCam) * 5 }, now / 1000); } }
    Grafik.aimSun(c);
  }
  function renderShop() {
    const p = state.player, S = state.shop;
    $('shopPoints').textContent = p.points; $('navPoints').textContent = p.points;
    $('shopTabs').innerHTML = Magaza.CATS.map(c => `<button data-cat="${c.id}" class="${c.id === S.cat ? 'on' : ''}">${c.icon} ${c.name}</button>`).join('');
    const cat = Magaza.CATS.find(c => c.id === S.cat), eqId = p.eq[S.cat];
    const tryId = S.tryItem && S.tryItem.cat === S.cat ? (S.tryItem.item || '') : null;
    const def = `<div class="item${!eqId ? ' eq' : ''}${tryId === '' ? ' try' : ''}" data-item=""><span class="ic">↺</span><b>${SHOP_DEFAULT[S.cat]}</b><span class="pr">Ücretsiz</span>${eqId ? '<button class="sm" data-act="unequip">Seç</button>' : '<span class="muted" style="font-size:12px">✓ Kullanılıyor</span>'}</div>`;
    $('shopGrid').innerHTML = def + cat.items.map(it => {
      const owned = p.owned.includes(it.id), eq = eqId === it.id, can = p.points >= it.price;
      const ic = it.cat === 'renk' ? `<span class="sw" style="background:radial-gradient(circle at 35% 30%,#ffffff88,${it.hex} 60%)"></span>` : Magaza.iconFor(it);
      const act = eq ? '<span class="muted" style="font-size:12px">✓ Giyildi</span>' : owned ? `<button class="sm" data-act="equip" data-id="${it.id}">Giy</button>` : `<button class="sm main" style="padding:6px 10px;font-size:13px" data-act="buy" data-id="${it.id}" ${can ? '' : 'disabled'}>Satın al</button>`;
      return `<div class="item${eq ? ' eq' : ''}${tryId === it.id ? ' try' : ''}" data-item="${it.id}"><span class="ic">${ic}</span><b>${esc(it.name)}</b><span class="pr${owned || can ? '' : ' no'}">${owned ? '✓ Sende' : '⭐ ' + it.price}</span>${act}</div>`;
    }).join('');
  }
  $('shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; state.shop.cat = b.dataset.cat; state.shop.tryItem = null; rebuildPreview(); renderShop(); });
  $('shopGrid').addEventListener('click', e => {
    const p = state.player, S = state.shop, act = e.target.closest('[data-act]');
    if (act) {
      const id = act.dataset.id, it = id && Magaza.ITEMS[id];
      if (act.dataset.act === 'buy' && it && !p.owned.includes(id) && p.points >= it.price) {
        p.points -= it.price; p.owned.push(id); p.eq[it.cat] = id; Ses.buy();
        const got = checkAch(p); if (got.length) setTimeout(() => alert(got.map(a => `🏅 Başarım açıldı: ${a.name} (+${a.reward} puan)`).join('\n')), 50);
      } else if (act.dataset.act === 'equip' && it) p.eq[it.cat] = id;
      else if (act.dataset.act === 'unequip') delete p.eq[S.cat];
      Kayit.persist(); S.tryItem = null; rebuildPreview(); renderShop(); return;
    }
    const card = e.target.closest('[data-item]'); if (!card) return;
    S.tryItem = { cat: S.cat, item: card.dataset.item }; rebuildPreview(); renderShop();
  });
  $('btnShop').onclick = showShop;
  $('btnShopBack').onclick = closeShop;

  // ================= BAŞARIMLAR =================
  function showAch() {
    const p = state.player;
    $('achSub').textContent = `${Object.keys(p.ach).length} / ${ACH.length} başarım açıldı`;
    $('alist').innerHTML = ACH.map(a => `<div class="ach${p.ach[a.id] ? ' done' : ''}"><span class="ic">${a.icon}</span><span><b>${a.name}</b><small>${a.desc}</small></span><span class="rw">${p.ach[a.id] ? '✓' : '+' + a.reward}</span></div>`).join('');
    show('scrAch');
  }
  $('btnAch').onclick = showAch;
  $('btnMp').onclick = showMp;
  $('btnAchBack').onclick = showMenu;

  // test kancası (otomatik ekran testleri için)
  window.__misket = {
    state, ACH,
    ileri(sn, kosul) { const r = state.race; if (!r) return; for (let i = 0; i < sn * 10 && !r.done; i++) { r.step(0.1); if (kosul && kosul(r)) break; } handleEvents(); camInit = false; },
    kart(k) { pickCard(k); }, showMp: () => showMp(),
    goster(id) { disposeRace(); ensureTrack(id); show(null); state.phase = 'menu'; state.trackId = id; },
  };

  // ================= BAŞLAT =================
  Ses.on = Kayit.save.sound !== false;
  // ses seviyesi (menü + duraklatma menüsü; cihazda hatırlanır)
  Ses.setVol(Kayit.save.vol != null ? Kayit.save.vol : 0.7);
  function syncVol() { document.querySelectorAll('.volSlider').forEach(el => { el.value = Math.round(Ses.vol * 100); }); document.querySelectorAll('.volv').forEach(el => { el.textContent = Math.round(Ses.vol * 100) + '%'; }); }
  document.querySelectorAll('.volSlider').forEach(el => {
    el.addEventListener('input', () => { Ses.setVol(el.value / 100); syncVol(); if (Ses.vol > 0 && Kayit.save.sound === false) { Kayit.save.sound = true; Ses.on = true; } });
    el.addEventListener('change', () => { Kayit.save.vol = Ses.vol; Kayit.persist(); Ses.click(); });
  });
  syncVol();
  Grafik.setQuality(Kayit.save.gfx || null); // kayıtlı seçim yoksa: telefonda düşük, bilgisayarda yüksek
  $('loadMsg').textContent = 'Gökyüzü ve dokular yükleniyor…';
  Grafik.init().then(() => { $('loadMsg').textContent = 'Fizik motoru hazırlanıyor…'; return window.RAPIER.init(); }).then(() => {
    $('loadMsg').textContent = 'Parkur kuruluyor…';
    return new Promise(res => setTimeout(res, 30));
  }).then(() => {
    ensureTrack(1);
    const lp = Kayit.save.last && Kayit.get(Kayit.save.last);
    if (pendingCode) showProfiles('kod'); // ?kod= ile gelindiyse kodla giriş
    else selectPlayer((lp || Kayit.guest()).name); // hesap zorunlu değil: misafirle doğrudan oyuna
    requestAnimationFrame(loop);
  }).catch(err => { $('loadMsg').textContent = 'Yüklenemedi: ' + err; console.error(err); });
})();
