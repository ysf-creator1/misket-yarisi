/* Misket Yarışı — bulut kayıt sistemi
 * Oyuncular sunucuda (sunucu/hesaplar.js): ad tekildir, 4 haneli PIN ile her cihazdan girilir.
 * Bu cihazda girilmiş hesaplar hatırlanır; profilin bir kopyası cihazda tutulur, internet yoksa değişiklikler bekler ve bağlanınca gönderilir.
 * Eski (bulut öncesi) cihaz kayıtları okunur ve buluta taşınabilir: localStorage 'misket-yarisi-v1' + kayit/kayit.js.
 */
(function (G) {
  'use strict';
  const STORE = 'misket-bulut-v1', AYAR = 'misket-ayar', OLD_KEY = 'misket-yarisi-v1', MOVED = 'misket-eski-tasindi', CIHAZ = 'misket-cihaz';
  const MI = G.MI;
  // sunucu adresi: js/ag.js ile aynı kural (?sunucu=ws://… yerel test)
  let api = 'https://misket-yarisi.swedencentral.cloudapp.azure.com/api/';
  try {
    const q = new URLSearchParams(location.search).get('sunucu') || sessionStorage.getItem('misket-sunucu');
    if (q && /^wss?:\/\//.test(q)) api = q.replace(/^ws/, 'http').replace(/\/ws\/?$/, '') + '/api/';
  } catch (e) { }
  // bu tarayıcının kimliği: resimli şifrede yanlış deneme kilidi cihaza göre tutulur
  let device = null; try { device = localStorage.getItem(CIHAZ); if (!device) { device = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(CIHAZ, device); } } catch (e) { device = null; }
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

  // ---- cihaz ayarları (ses, grafik, son oyuncu) ----
  const save = Object.assign({ sound: true, gfx: null, last: '' }, readJSON(AYAR) || {});
  const old0 = readJSON(OLD_KEY); // bulut öncesi ayarları devral
  if (!readJSON(AYAR) && old0) { if (old0.sound === false) save.sound = false; if (old0.gfx) save.gfx = old0.gfx; }

  // ---- bu cihazdaki hesaplar ----
  const store = Object.assign({ accounts: {} }, readJSON(STORE) || {});
  const keep = () => writeJSON(STORE, store);
  const acc = name => store.accounts[MI.key(name)] || null;

  function newPlayer(name) {
    return { name, points: 0, earned: 0, races: 0, wins: 0, podiums: 0, xp: 0, unlocked: 1, best: {}, cups: {}, owned: [], eq: {}, ach: {}, stats: {}, bets: { won: 0, lost: 0 }, daily: {} };
  }
  function migratePlayer(p) { const d = newPlayer(p.name); for (const k in d) if (p[k] === undefined) p[k] = d[k]; return p; }
  for (const k in store.accounts) migratePlayer(store.accounts[k].profile);
  // misafir oyuncu: sunucuda yok, yalnız bu cihazda
  function ensureGuest() { if (!store.guest || !store.guest.profile) { store.guest = { profile: newPlayer(MI.guestName()), last: 0 }; keep(); } migratePlayer(store.guest.profile); return store.guest.profile; }
  const isGuest = p => !!(p && store.guest && store.guest.profile === p);
  const guestByName = name => store.guest && store.guest.profile && MI.key(store.guest.profile.name) === MI.key(name) ? store.guest : null;

  // ---- eski cihaz kayıtları (buluta taşınmamış) ----
  function legacyPlayers() {
    const moved = readJSON(MOVED) || [], out = {};
    const add = s => { if (s && s.players) for (const n in s.players) { const p = s.players[n]; if (!p || typeof p !== 'object') continue; const k = MI.key(p.name || n); if (moved.includes(k) || store.accounts[k]) continue; if (!out[k] || (p.earned || 0) > (out[k].earned || 0)) out[k] = Object.assign({}, p, { name: p.name || n }); } };
    add(readJSON(OLD_KEY));
    try { if (G.MISKET_KAYIT) add(JSON.parse(JSON.stringify(G.MISKET_KAYIT))); } catch (e) { }
    return Object.values(out);
  }
  const markMoved = name => { const m = readJSON(MOVED) || []; if (!m.includes(MI.key(name))) m.push(MI.key(name)); writeJSON(MOVED, m); };

  // ---- sunucu istekleri ----
  async function call(route, opt = {}) {
    let r;
    try {
      r = await fetch(api + route, { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: Object.assign({ 'Content-Type': 'application/json' }, device ? { 'X-Cihaz': device } : {}, opt.token ? { Authorization: 'Bearer ' + opt.token } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined, keepalive: !!opt.keepalive });
    } catch (e) { return { code: 0, j: { hata: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.' } }; }
    let j = null; try { j = await r.json(); } catch (e) { }
    return { code: r.status, j: j || {} };
  }

  // ---- kaydetme (değişiklikten 1,5 sn sonra; hata olursa 15 sn'de bir yeniden) ----
  let state = 'ok', timer = null, busy = false;
  const setState = s => { if (s !== state) { state = s; Kayit.onStatus(); } };
  function persist() {
    writeJSON(AYAR, save);
    if (isGuest(Kayit.active)) { keep(); setState('guest'); return; } // misafir: yalnız bu cihaza
    const a = Kayit.active && acc(Kayit.active.name);
    if (!a) return;
    a.profile = Kayit.active; a.dirty = true; keep();
    setState(state === 'off' ? 'off' : 'wait');
    clearTimeout(timer); timer = setTimeout(push, 1500);
  }
  async function push(keepalive) {
    const a = Kayit.active && acc(Kayit.active.name);
    if (!a || !a.dirty || busy) return;
    busy = true; a.dirty = false;
    const body = { profil: a.profile, rev: a.rev };
    const r = await call('profil', { method: 'PUT', token: a.token, body, keepalive });
    busy = false;
    if (r.code === 200) { a.rev = r.j.rev; keep(); setState(a.dirty ? 'wait' : 'ok'); if (a.dirty) { clearTimeout(timer); timer = setTimeout(push, 800); } return; }
    if (r.code === 409) { // başka cihaz daha yeni kaydetmiş: daha ilerlemiş olan kalır
      const srv = r.j.profil, mine = a.profile;
      a.rev = r.j.rev;
      if (ahead(srv, mine)) { Object.keys(mine).forEach(k => delete mine[k]); Object.assign(mine, migratePlayer(srv)); keep(); setState('ok'); Kayit.onProfile(); }
      else { a.dirty = true; keep(); push(); }
      return;
    }
    a.dirty = true; keep();
    if (r.code === 401) { setState('auth'); Kayit.onAuthLost(a.profile.name); return; }
    setState('off'); clearTimeout(timer); timer = setTimeout(push, 15000);
  }
  const score = p => [p.earned || 0, p.races || 0];
  function ahead(a, b) { const x = score(a), y = score(b); return x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1]; }

  function remember(name, token, profil, rev, tur) {
    const k = MI.key(name);
    const p = migratePlayer(Object.assign(newPlayer(profil.name), profil));
    store.accounts[k] = { token, rev, profile: p, dirty: false, last: Date.now(), tur: tur || 'pin' }; keep();
    return p;
  }
  // gelen giriş yanıtı → { profil } ya da { hata, kalanSn, kalanHak }
  function loggedIn(r) {
    if (r.code !== 200) return { hata: r.j.hata || 'Giriş olmadı', kalanSn: r.j.kalanSn || 0, kalanHak: r.j.kalanHak };
    markMoved(r.j.profil.name);
    const old = acc(r.j.profil.name);
    if (old && old.dirty && ahead(old.profile, r.j.profil)) { old.token = r.j.token; old.rev = r.j.rev; old.tur = r.j.tur; keep(); return { profil: old.profile }; } // cihazda bekleyen ilerleme
    return { profil: remember(r.j.profil.name, r.j.token, r.j.profil, r.j.rev, r.j.tur) };
  }

  const Kayit = G.Kayit = {
    save, FILE_MODE: false, WEB: true, CLOUD: true, api, active: null,
    onStatus() { }, onAuthLost() { }, onProfile() { },
    status: () => state,
    persist, flush: k => push(k),
    // bu cihazda girilmiş hesaplar (son kullanılan önce)
    players() { const L = Object.values(store.accounts); if (store.guest && store.guest.profile) L.push(store.guest); return L.sort((a, b) => (b.last || 0) - (a.last || 0)).map(a => a.profile); },
    get(name) { const a = acc(name) || guestByName(name); return a ? a.profile : null; },
    guest: ensureGuest, isGuest,
    // misafirin görünen adını değiştir (şifresiz; kayıtlı bir oyuncunun adı alınamaz)
    async renameGuest(ad) {
      const g = store.guest; if (!g) return { hata: 'Misafir yok' };
      ad = MI.tidy(ad); const e = MI.check(ad); if (e) return { hata: e };
      if (!MI.guestLike(ad)) { const r = await Kayit.checkName(ad); if (r.var) return { hata: 'Bu ad kayıtlı bir oyuncunun, başka bir ad seç' }; if (r.uygun === null) return { hata: r.hata || 'Sunucuya ulaşılamadı' }; }
      if (acc(ad)) return { hata: 'Bu cihazda bu adla bir hesap var' };
      g.profile.name = ad; if (Kayit.active === g.profile) save.last = ad; keep(); writeJSON(AYAR, save);
      return { ok: true };
    },
    // çok oyunculu sunucuya adın sahibi olduğunu göstermek için (misafirde boş)
    token() { const a = Kayit.active && !isGuest(Kayit.active) && acc(Kayit.active.name); return a ? a.token : ''; },
    // oyuna gir: önce cihazdaki kopya, sonra buluttan tazele
    use(name) {
      const a = acc(name) || guestByName(name); if (!a) return null;
      if (a === store.guest) { Kayit.active = a.profile; a.last = Date.now(); save.last = a.profile.name; keep(); writeJSON(AYAR, save); setState('guest'); return a.profile; }
      Kayit.active = a.profile; a.last = Date.now(); save.last = a.profile.name; keep(); writeJSON(AYAR, save);
      Kayit.refresh();
      return a.profile;
    },
    async refresh() {
      if (isGuest(Kayit.active)) return;
      const a = Kayit.active && acc(Kayit.active.name); if (!a) return;
      if (a.dirty) { push(); return; }
      const r = await call('profil', { token: a.token });
      if (r.code === 200) {
        a.tur = r.j.tur || a.tur; keep();
        if (r.j.rev !== a.rev || ahead(r.j.profil, a.profile)) { const mine = a.profile; Object.keys(mine).forEach(k => delete mine[k]); Object.assign(mine, migratePlayer(r.j.profil)); a.rev = r.j.rev; keep(); Kayit.onProfile(); }
        setState('ok');
      } else if (r.code === 401) { setState('auth'); Kayit.onAuthLost(a.profile.name); }
      else setState('off');
    },
    checkName: async ad => { const e = MI.check(ad); if (e) return { uygun: false, hata: e }; const r = await call('isim?ad=' + encodeURIComponent(MI.tidy(ad))); return r.code === 200 ? r.j : { uygun: null, hata: r.j.hata }; },
    // yeni hesap; sifre = { tur: 'pin', pin } ya da { tur: 'resim', resim: 0..11 }; eski cihaz kaydı varsa onunla
    // fromLegacy: eski cihaz kaydı ya da misafirin profili (ilerlemesi yeni hesaba taşınır)
    async register(ad, sifre, fromLegacy) {
      const wasGuest = isGuest(fromLegacy);
      const r = await call('kayit', { body: Object.assign({ ad: MI.tidy(ad), misafirden: wasGuest }, sifre) }); // misafirden: rapor için (misafir → hesap)
      if (r.code !== 200) return { hata: r.j.hata || 'Kayıt olmadı' };
      const out = loggedIn(r), p = out.profil;
      if (fromLegacy) { // eski ilerlemeyi buluta yükle
        Object.assign(p, migratePlayer(Object.assign({}, fromLegacy, { name: p.name })));
        const a = store.accounts[MI.key(p.name)];
        const u = await call('profil', { method: 'PUT', token: a.token, body: { profil: p, rev: a.rev } });
        if (u.code === 200) a.rev = u.j.rev; else a.dirty = true;
        if (wasGuest) { if (Kayit.active === store.guest.profile) Kayit.active = null; delete store.guest; } else markMoved(fromLegacy.name);
        keep();
      }
      return out;
    },
    // sifre = { pin } ya da { resim }
    login: async (ad, sifre) => loggedIn(await call('giris', { body: Object.assign({ ad: MI.tidy(ad) }, sifre) })),
    // başka cihazda gösterilen 6 haneli kodla giriş
    codeLogin: async kod => loggedIn(await call('kodla', { body: { kod } })),
    // girişli cihazda: yeni cihaz kodu
    async deviceCode() { const a = Kayit.active && acc(Kayit.active.name); if (!a) return { hata: 'Önce giriş yap' }; const r = await call('cihazkodu', { method: 'POST', token: a.token, body: {} }); return r.code === 200 ? r.j : { hata: r.j.hata }; },
    // etkin hesabın şifre türü (misafirde null)
    info() { const a = Kayit.active && acc(Kayit.active.name); return a ? { tur: a.tur || 'pin' } : null; },
    // bu cihazdan çıkış (bulut hesabı silinmez)
    async forget(name) {
      if (guestByName(name)) { if (isGuest(Kayit.active)) Kayit.active = null; delete store.guest; keep(); return; } // misafir ilerlemesi silinir
      const a = acc(name); if (!a) return;
      if (a.dirty) await push();
      call('cikis', { method: 'POST', token: a.token });
      delete store.accounts[MI.key(name)]; keep();
      if (Kayit.active && MI.key(Kayit.active.name) === MI.key(name)) Kayit.active = null;
    },
    // eski = { pin } | { resim }, yeni = { tur, pin | resim }
    async changeSecret(eski, yeni) {
      const a = Kayit.active && acc(Kayit.active.name); if (!a) return { hata: 'Önce giriş yap' };
      const r = await call('sifre', { token: a.token, body: { eski, yeni } });
      if (r.code === 200) { a.tur = r.j.tur; keep(); return { ok: true }; }
      return { hata: r.j.hata || 'Şifre değişmedi' };
    },
    leaderboard: async () => { const r = await call('liderlik'); return r.code === 200 ? r.j : null; },
    records: async id => { const r = await call('rekor?parkur=' + id); return r.code === 200 ? r.j.liste : null; },
    legacyPlayers, dismissLegacy: markMoved, trLower: s => MI.key(s),
    // kullanım bildirimi (rapor için; ad dışında kişisel bilgi yok, misafirde ad da yok)
    track(tur, veri) {
      const kaynak = location.protocol === 'file:' ? 'dosya' : /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 'mac' : (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'anaekran' : 'web';
      call('olay', { body: Object.assign({ tur, cihaz: device ? device.slice(0, 12) : '', kaynak }, veri), keepalive: true });
    },
  };

  window.addEventListener('pagehide', () => push(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(true); else if (Kayit.active) Kayit.refresh(); });
  window.addEventListener('online', () => push());
})(window);
