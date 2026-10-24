/* Misket Yarışı — bulut oyuncu hesapları (ad + 4 haneli PIN)
 * Kayıtlar tek JSON dosyasında (VERI/hesaplar.json), her değişiklikten 2 sn sonra güvenli yazılır; her gün yedeklenir (30 gün).
 * HTTP: /api/isim, /api/kayit, /api/giris, /api/profil (GET/PUT), /api/pin, /api/cikis, /api/liderlik, /api/rekor
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require(path.join(__dirname, '..', 'js', 'isim.js'));
const { MI } = globalThis;

const VERI = process.env.VERI || path.join(__dirname, '..', '..', 'veri');
const DOSYA = path.join(VERI, 'hesaplar.json'), YEDEK = path.join(VERI, 'yedek');
const MAX_BODY = 64 * 1024, MAX_TOKENS = 10, KEEP_DAYS = 30;
const ALLOWED_ORIGINS = [/^https:\/\/ysf-creator1\.github\.io$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/, /^null$/];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[hesap]', ...a);

fs.mkdirSync(YEDEK, { recursive: true });
let db = { players: {}, tokens: {}, created: Date.now() };
try { db = JSON.parse(fs.readFileSync(DOSYA, 'utf8')); db.players = db.players || {}; db.tokens = db.tokens || {}; log('yüklendi:', Object.keys(db.players).length, 'oyuncu'); }
catch (e) { if (e.code !== 'ENOENT') { log('OKUNAMADI, yedekten devam edilmeli:', e.message); throw e; } }

let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  const write = () => { const tmp = DOSYA + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DOSYA); };
  if (now) write(); else saveTimer = setTimeout(() => { try { write(); } catch (e) { log('yazma hatası', e.message); } }, 2000);
}
function dailyBackup() {
  const day = new Date().toISOString().slice(0, 10), f = path.join(YEDEK, `hesaplar-${day}.json`);
  if (!fs.existsSync(f) && Object.keys(db.players).length) { fs.writeFileSync(f, JSON.stringify(db)); log('yedek alındı', f); }
  for (const n of fs.readdirSync(YEDEK)) { const m = /^hesaplar-(\d{4}-\d{2}-\d{2})\.json$/.exec(n); if (m && Date.now() - Date.parse(m[1]) > KEEP_DAYS * 864e5) fs.unlinkSync(path.join(YEDEK, n)); }
}
setInterval(() => { try { dailyBackup(); } catch (e) { log('yedek hatası', e.message); } }, 3600 * 1000).unref();
setTimeout(() => { try { dailyBackup(); } catch (e) { } }, 5000).unref();

// ---- PIN ve oturum anahtarı ----
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function newToken(k) {
  const tok = crypto.randomBytes(24).toString('hex'), h = sha(tok), acc = db.players[k];
  acc.tokens = (acc.tokens || []).concat(h);
  while (acc.tokens.length > MAX_TOKENS) delete db.tokens[acc.tokens.shift()];
  db.tokens[h] = k; return tok;
}
const accOf = tok => { const k = tok && db.tokens[sha(tok)]; return k && db.players[k] ? db.players[k] : null; };
// yanlış PIN denemeleri: ad başına 5 hatada 10 dk kilit, IP başına saatte 40
const fails = new Map();
function failCheck(id, max, win) { const f = fails.get(id); return f && f.n >= max && Date.now() - f.t < win; }
function failAdd(id) { const f = fails.get(id) || { n: 0, t: 0 }; if (Date.now() - f.t > 3600e3) f.n = 0; f.n++; f.t = Date.now(); fails.set(id, f); }

// ---- profil temizliği (istemciden gelen) ----
const num = (v, max = 1e9) => Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.round(+v))) : 0;
const PROFILE_KEYS = { points: 1, earned: 1, races: 1, wins: 1, podiums: 1, xp: 1, unlocked: 1, best: 1, cups: 1, owned: 1, eq: 1, ach: 1, stats: 1, bets: 1, daily: 1 };
function cleanProfile(p, name) {
  const o = { name };
  for (const k in PROFILE_KEYS) if (p && p[k] !== undefined) o[k] = p[k];
  for (const k of ['points', 'earned', 'races', 'wins', 'podiums', 'xp']) o[k] = num(o[k]);
  o.unlocked = Math.max(1, Math.min(200, num(o.unlocked) || 1));
  for (const k of ['best', 'cups', 'eq', 'ach', 'stats', 'bets', 'daily']) if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {};
  if (!Array.isArray(o.owned)) o.owned = [];
  o.owned = o.owned.filter(x => typeof x === 'string' && x.length < 60).slice(0, 400);
  return o;
}
const newProfile = name => cleanProfile({ points: 0, earned: 0, races: 0, wins: 0, podiums: 0, xp: 0, unlocked: 1, best: {}, cups: {}, owned: [], eq: {}, ach: {}, stats: {}, bets: { won: 0, lost: 0 } }, name);

// ---- liderlik (30 sn önbellek) ----
let board = null, boardAt = 0;
const levelOf = xp => { let L = 1; while (xp >= 40 * L * (L + 1)) L++; return L; };
function leaderboard() {
  if (board && Date.now() - boardAt < 30000) return board;
  const all = Object.values(db.players).map(a => a.profile);
  const top = (f, n = 20) => all.filter(p => f(p) > 0).sort((a, b) => f(b) - f(a)).slice(0, n);
  board = {
    puan: top(p => p.earned).map(p => ({ ad: p.name, deger: p.earned, seviye: levelOf(p.xp) })),
    galibiyet: top(p => p.wins).map(p => ({ ad: p.name, deger: p.wins, seviye: levelOf(p.xp) })),
    parkur: top(p => p.unlocked).map(p => ({ ad: p.name, deger: p.unlocked, seviye: levelOf(p.xp) })),
    oyuncu: all.length,
  };
  boardAt = Date.now(); return board;
}
function records(track) {
  const out = [];
  for (const a of Object.values(db.players)) { const b = a.profile.best && a.profile.best[track]; if (b && b.time && b.place === 1) out.push({ ad: a.profile.name, sure: b.time }); }
  return out.sort((x, y) => x.sure - y.sure).slice(0, 10);
}

// ---- HTTP ----
function readBody(req) {
  return new Promise((res, rej) => {
    let size = 0; const parts = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { rej(new Error('büyük')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { res(parts.length ? JSON.parse(Buffer.concat(parts).toString('utf8')) : {}); } catch (e) { rej(e); } });
    req.on('error', rej);
  });
}
async function handle(req, res, ip) {
  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGINS.some(r => r.test(origin));
  const head = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (allowed) Object.assign(head, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Vary': 'Origin' });
  const reply = (code, obj) => { res.writeHead(code, head); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, head); return res.end(); }
  const url = new URL(req.url, 'http://x'), route = url.pathname.replace(/^\/api\//, '');
  const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    if (route === 'isim' && req.method === 'GET') {
      const ad = MI.tidy(url.searchParams.get('ad')), err = MI.check(ad);
      return reply(200, { uygun: !err && !db.players[MI.key(ad)], hata: err || (db.players[MI.key(ad)] ? 'Bu ad alınmış, başka bir ad seç' : null) });
    }
    if (route === 'kayit' && req.method === 'POST') {
      const b = await readBody(req), ad = MI.tidy(b.ad), err = MI.check(ad), k = MI.key(ad);
      if (err) return reply(400, { hata: err });
      if (!MI.pinOk(b.pin)) return reply(400, { hata: 'PIN 4 rakam olmalı' });
      if (db.players[k]) return reply(409, { hata: 'Bu ad alınmış, başka bir ad seç' });
      if (failCheck('kayit:' + ip, 20, 3600e3)) return reply(429, { hata: 'Çok fazla deneme, biraz sonra tekrar dene' });
      failAdd('kayit:' + ip); // IP başına saatte en fazla 20 yeni hesap
      const salt = crypto.randomBytes(8).toString('hex');
      db.players[k] = { key: k, salt, pin: hashPin(b.pin, salt), profile: newProfile(ad), rev: 1, created: Date.now(), upd: Date.now(), tokens: [] };
      const token = newToken(k); save(); board = null;
      log('yeni oyuncu', ad);
      return reply(200, { token, profil: db.players[k].profile, rev: 1 });
    }
    if (route === 'giris' && req.method === 'POST') {
      const b = await readBody(req), k = MI.key(b.ad), acc = db.players[k];
      if (failCheck('ip:' + ip, 40, 3600e3) || failCheck('ad:' + k, 5, 600e3)) return reply(429, { hata: 'Çok fazla yanlış deneme. 10 dakika sonra tekrar dene.' });
      if (!acc || !MI.pinOk(b.pin) || hashPin(b.pin, acc.salt) !== acc.pin) { failAdd('ip:' + ip); failAdd('ad:' + k); return reply(401, { hata: acc ? 'PIN yanlış' : 'Bu adla oyuncu yok' }); }
      fails.delete('ad:' + k);
      const token = newToken(k); save();
      return reply(200, { token, profil: acc.profile, rev: acc.rev });
    }
    if (route === 'liderlik' && req.method === 'GET') return reply(200, leaderboard());
    if (route === 'rekor' && req.method === 'GET') return reply(200, { parkur: num(url.searchParams.get('parkur'), 200), liste: records(num(url.searchParams.get('parkur'), 200)) });
    // buradan sonrası oturum ister
    const acc = accOf(tok);
    if (!acc) return reply(401, { hata: 'Oturum geçersiz, yeniden giriş yap' });
    if (route === 'profil' && req.method === 'GET') return reply(200, { profil: acc.profile, rev: acc.rev });
    if (route === 'profil' && req.method === 'PUT') {
      const b = await readBody(req);
      if (b.rev !== acc.rev) return reply(409, { hata: 'çakışma', profil: acc.profile, rev: acc.rev }); // başka cihaz daha yeni kaydetmiş
      acc.profile = cleanProfile(b.profil, acc.profile.name); acc.rev++; acc.upd = Date.now(); save(); board = null;
      return reply(200, { rev: acc.rev });
    }
    if (route === 'pin' && req.method === 'POST') {
      const b = await readBody(req);
      if (hashPin(b.eski, acc.salt) !== acc.pin) return reply(401, { hata: 'Eski PIN yanlış' });
      if (!MI.pinOk(b.yeni)) return reply(400, { hata: 'Yeni PIN 4 rakam olmalı' });
      acc.pin = hashPin(b.yeni, acc.salt);
      for (const h of acc.tokens || []) if (h !== sha(tok)) delete db.tokens[h]; // diğer cihazlardan çıkış
      acc.tokens = [sha(tok)]; save();
      return reply(200, { ok: true });
    }
    if (route === 'cikis' && req.method === 'POST') { const h = sha(tok); delete db.tokens[h]; acc.tokens = (acc.tokens || []).filter(x => x !== h); save(); return reply(200, { ok: true }); }
    return reply(404, { hata: 'yok' });
  } catch (e) { log('istek hatası', e.message); return reply(400, { hata: 'Geçersiz istek' }); }
}

// bir kerelik aktarım (sunucuda komut satırından): node sunucu/hesaplar.js aktar dosya.json  → her oyuncu için rastgele PIN yazdırır
if (require.main === module && process.argv[2] === 'aktar') {
  const src = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  for (const p of Object.values(src.players || {})) {
    const ad = MI.tidy(p.name), k = MI.key(ad);
    if (MI.check(ad)) { console.log('ATLANDI (ad uygun değil):', ad); continue; }
    if (db.players[k]) { console.log('ATLANDI (zaten var):', ad); continue; }
    const pin = String(crypto.randomInt(10000)).padStart(4, '0'), salt = crypto.randomBytes(8).toString('hex');
    db.players[k] = { key: k, salt, pin: hashPin(pin, salt), profile: cleanProfile(p, ad), rev: 1, created: Date.now(), upd: Date.now(), tokens: [], aktarildi: true };
    console.log(`AKTARILDI: ${ad} | PIN ${pin} | puan ${db.players[k].profile.points} | açık parkur ${db.players[k].profile.unlocked}`);
  }
  save(true); process.exit(0);
}

module.exports = { handle, flush: () => save(true), count: () => Object.keys(db.players).length };
