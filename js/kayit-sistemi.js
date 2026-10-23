/* Misket Yarışı — kayıt sistemi
 * Tarayıcı (localStorage) + oyun klasöründeki kayit/kayit.json (yerel sunucu ile).
 * Oyun hangi yolla açılırsa açılsın kayit/kayit.js okunur; tarayıcı verisi silinse bile kayıtlar dosyadan geri gelir.
 * (Zirve Top Yarışı'ndaki sistemin aynısı; birleştirme kuralı sunucu.py içindeki birlestir ile aynı.)
 */
(function (G) {
  'use strict';
  const SAVE_KEY = 'misket-yarisi-v1';
  // dosyaya kayıt yalnızca bu bilgisayardaki oyun sunucusuyla (internetten açılınca kayıtlar o cihazın tarayıcısında)
  const FILE_MODE = /^https?:$/.test(location.protocol) && /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const trLower = s => String(s || '').trim().toLocaleLowerCase('tr');
  const pKey = p => [p.earned || 0, p.races || 0, p.upd || 0];
  function pAtLeast(a, b) { const x = pKey(a), y = pKey(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; }

  // İki kaydı birleştir: her oyuncu için daha ilerlemiş olan (toplam kazanılan puan, yarış sayısı, son değişiklik) kalır.
  function mergeSaves(a, b) {
    const ok = s => s && typeof s === 'object' && s.players && typeof s.players === 'object';
    if (!ok(a)) return ok(b) ? b : null; if (!ok(b)) return a;
    const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
    const out = Object.assign({}, older, newer), deleted = {}, best = {};
    for (const s of [a, b]) for (const n in (s.deleted || {})) deleted[n] = Math.max(deleted[n] || 0, s.deleted[n] || 0);
    for (const s of [older, newer]) for (const name in s.players) {
      const p = s.players[name]; if (!p || typeof p !== 'object') continue;
      const k = trLower(p.name || name); if ((deleted[k] || 0) > (p.upd || 0)) continue;
      if (!best[k] || pAtLeast(p, best[k])) best[k] = p;
    }
    out.players = {}; for (const k in best) out.players[best[k].name || k] = best[k];
    out.deleted = deleted; out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return out;
  }
  function loadSave() {
    let ls = null; try { ls = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
    let file = null; try { if (G.MISKET_KAYIT && typeof G.MISKET_KAYIT === 'object') file = JSON.parse(JSON.stringify(G.MISKET_KAYIT)); } catch (e) { }
    return mergeSaves(ls, file) || { players: {}, last: '', sound: true, deleted: {}, updatedAt: 0 };
  }

  const save = loadSave();
  // değişen oyuncunun "upd" zamanını güncellemek için son kaydedilen hâllerin özeti
  const snap = {};
  const playerSnap = p => { const c = Object.assign({}, p); delete c.upd; return JSON.stringify(c); };
  for (const k in save.players) snap[k] = playerSnap(save.players[k]);

  const FileSave = {
    state: FILE_MODE ? 'wait' : 'off', timer: null,
    schedule() { if (!FILE_MODE) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 300); },
    flush(keepalive) {
      if (!FILE_MODE) return; clearTimeout(this.timer);
      return fetch('api/kayit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Misket': '1' }, body: JSON.stringify(save), keepalive: !!keepalive })
        .then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => { this.state = j && j.ok ? 'ok' : 'err'; Kayit.onStatus(); })
        .catch(() => { this.state = 'err'; Kayit.onStatus(); });
    },
  };

  function persist() {
    const now = Date.now();
    for (const k in save.players) { const js = playerSnap(save.players[k]); if (snap[k] !== js) { save.players[k].upd = now; snap[k] = js; } }
    save.updatedAt = now;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
    FileSave.schedule();
  }

  function newPlayer(name) {
    return {
      name, points: 0, earned: 0, races: 0, wins: 0, podiums: 0, xp: 0,
      unlocked: 1, best: {}, cups: {}, owned: [], eq: {}, ach: {}, stats: {}, bets: { won: 0, lost: 0 },
    };
  }
  // eski kayıtlara yeni alanları ekle (sonraki aşamalarda yeni alanlar buraya)
  function migratePlayer(p) {
    const d = newPlayer(p.name);
    for (const k in d) if (p[k] === undefined) p[k] = d[k];
    return p;
  }
  for (const k in save.players) migratePlayer(save.players[k]);

  const Kayit = G.Kayit = {
    save, persist, FILE_MODE, WEB: /^https?:$/.test(location.protocol) && !FILE_MODE, trLower,
    onStatus() { },
    status() { return FileSave.state; },
    players() { return Object.values(save.players).sort((a, b) => (b.upd || 0) - (a.upd || 0)); },
    get(name) { const k = trLower(name); return Object.values(save.players).find(p => trLower(p.name) === k) || null; },
    create(name) {
      name = String(name || '').trim().slice(0, 16);
      if (!name || Kayit.get(name)) return null;
      const p = newPlayer(name); save.players[name] = p; persist(); return p;
    },
    remove(name) {
      const p = Kayit.get(name); if (!p) return;
      for (const k in save.players) if (save.players[k] === p) delete save.players[k];
      save.deleted = save.deleted || {}; save.deleted[trLower(name)] = Date.now();
      if (trLower(save.last) === trLower(name)) save.last = '';
      persist();
    },
    flush: k => FileSave.flush(k),
  };

  if (FILE_MODE) {
    setInterval(() => fetch('api/ping').then(r => { if (!r.ok) throw 0; if (FileSave.state === 'err') FileSave.flush(); })
      .catch(() => { FileSave.state = 'err'; Kayit.onStatus(); }), 60000);
    window.addEventListener('pagehide', () => FileSave.flush(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') FileSave.flush(true); });
    FileSave.flush();
  }
})(window);
