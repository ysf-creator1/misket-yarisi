/* Misket Yarışı — bulut oyuncu hesapları
 * Şifre türü: 4 haneli PIN ya da 12 resimden 1'i (resimli şifre). Giriş yapılan cihaz hatırlanır, yeni cihazda yeniden sorulur.
 * Unutmaya karşı: "yeni cihaz ekle" kodu (5 dk, tek kullanımlık) ve yönetici sıfırlaması. Hesap açmak zorunlu değil: misafirler sunucuda kayıtlı değildir.
 * Kayıtlar tek JSON dosyasında (VERI/hesaplar.json), değişiklikten 2 sn sonra güvenli yazılır; her gün yedeklenir (30 gün).
 * HTTP: /api/isim, kayit, giris, kodla, profil (GET/PUT), sifre, cihazkodu, cikis, liderlik, rekor, yonetici/sifirla (yalnız sunucu içinden)
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
const RESIM_SAYISI = 12;                       // resimli şifrede seçenek sayısı (js/oyun.js RESIMLER ile aynı)
const RESIM_HAK = 3, RESIM_BEKLE = 30 * 60e3;  // resimli şifre: cihaz başına 3 yanlışta 30 dk bekleme
const ALLOWED_ORIGINS = [/^https:\/\/ysf-creator1\.github\.io$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/, /^null$/];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[hesap]', ...a);

fs.mkdirSync(YEDEK, { recursive: true });
let db = { players: {}, tokens: {}, created: Date.now() };
try { db = JSON.parse(fs.readFileSync(DOSYA, 'utf8')); db.players = db.players || {}; db.tokens = db.tokens || {}; log('yüklendi:', Object.keys(db.players).length, 'oyuncu'); }
catch (e) { if (e.code !== 'ENOENT') { log('OKUNAMADI, yedekten devam edilmeli:', e.message); throw e; } }
for (const a of Object.values(db.players)) { if (!a.tur) a.tur = 'pin'; delete a.kurtarma; delete a.kurtarmaSalt; } // eski hesaplar (kurtarma kodu kaldırıldı)

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

// ---- şifre ve oturum ----
const hashS = (v, salt) => crypto.scryptSync(String(v), salt, 32).toString('hex');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const eq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const resimOk = r => Number.isInteger(r) && r >= 0 && r < RESIM_SAYISI;
// gelen şifre (tür + değer) → saklanacak dize; geçersizse null
function secretOf(tur, b) {
  if (tur === 'pin') return MI.pinOk(b.pin) ? 'p:' + b.pin : null;
  if (tur === 'resim') return resimOk(b.resim) ? 'r:' + b.resim : null;
  return null;
}
function setSecret(acc, tur, secret) { acc.tur = tur; acc.salt = crypto.randomBytes(8).toString('hex'); acc.pin = hashS(secret, acc.salt); }
function checkSecret(acc, b) { const s = secretOf(acc.tur, b); return !!s && eq(hashS(s, acc.salt), acc.pin) || (acc.tur === 'pin' && !!b.pin && eq(hashS(b.pin, acc.salt), acc.pin)); } // ikinci koşul: türsüz eski PIN kaydı

function newToken(k) {
  const tok = crypto.randomBytes(24).toString('hex'), h = sha(tok), acc = db.players[k];
  acc.tokens = (acc.tokens || []).concat(h);
  while (acc.tokens.length > MAX_TOKENS) delete db.tokens[acc.tokens.shift()];
  db.tokens[h] = k; return tok;
}
function revokeOthers(acc, keepTok) { for (const h of acc.tokens || []) if (!keepTok || h !== sha(keepTok)) delete db.tokens[h]; acc.tokens = keepTok ? [sha(keepTok)] : []; }
const accOf = tok => { const k = tok && db.tokens[sha(tok)]; return k && db.players[k] ? db.players[k] : null; };

// ---- yanlış deneme sayaçları (bellekte) ----
// f = { n, t (ilk hatanın zamanı), lock (kilidin bitişi) }
const fails = new Map();
function locked(id) { const f = fails.get(id); return f && f.lock > Date.now() ? Math.ceil((f.lock - Date.now()) / 1000) : 0; }
function fail(id, max, win, lockMs) {
  const now = Date.now(); let f = fails.get(id);
  if (!f || now - f.t > win || (f.lock && f.lock <= now)) f = { n: 0, t: now, lock: 0 };
  f.n++; if (f.n >= max) { f.lock = now + lockMs; } fails.set(id, f); return Math.max(0, max - f.n);
}
setInterval(() => { const now = Date.now(); for (const [k, f] of fails) if (f.lock < now && now - f.t > 864e5) fails.delete(k); }, 3600e3).unref();
// "yeni cihaz ekle" kodları: kod → { k, until }
const deviceCodes = new Map();

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
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function loginOk(acc, reply, extra) { const token = newToken(acc.key); save(); return reply(200, Object.assign({ token, profil: acc.profile, rev: acc.rev, tur: acc.tur }, extra || {})); }

async function handle(req, res, ip, local) {
  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGINS.some(r => r.test(origin));
  const head = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (allowed) Object.assign(head, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cihaz', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Vary': 'Origin' });
  const reply = (code, obj) => { res.writeHead(code, head); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, head); return res.end(); }
  const url = new URL(req.url, 'http://x'), route = url.pathname.replace(/^\/api\//, '');
  const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const dev = String(req.headers['x-cihaz'] || '').replace(/[^a-f0-9]/gi, '').slice(0, 40) || 'ip:' + ip; // tarayıcı kimliği (yoksa IP)
  try {
    if (route === 'isim' && req.method === 'GET') {
      const ad = MI.tidy(url.searchParams.get('ad')), err = MI.check(ad), acc = db.players[MI.key(ad)];
      return reply(200, { uygun: !err && !acc, var: !!acc, tur: acc ? acc.tur : null, hata: err || (acc ? 'Bu ad alınmış, başka bir ad seç' : null) });
    }
    if (route === 'kayit' && req.method === 'POST') {
      const b = await readBody(req), ad = MI.tidy(b.ad), err = MI.check(ad), k = MI.key(ad), tur = b.tur === 'resim' ? 'resim' : 'pin';
      if (err) return reply(400, { hata: err });
      if (MI.guestLike(ad)) return reply(400, { hata: "'Misafir' ile başlayan adlar misafirlere ayrılmış, başka bir ad seç" });
      const secret = secretOf(tur, b);
      if (!secret) return reply(400, { hata: tur === 'pin' ? 'PIN 4 rakam olmalı' : 'Bir resim seç' });
      if (db.players[k]) return reply(409, { hata: 'Bu ad alınmış, başka bir ad seç' });
      if (locked('kayit:' + ip)) return reply(429, { hata: 'Çok fazla yeni oyuncu açıldı, biraz sonra tekrar dene' });
      fail('kayit:' + ip, 20, 3600e3, 3600e3); // IP başına saatte en fazla 20 yeni hesap
      const acc = db.players[k] = { key: k, profile: newProfile(ad), rev: 1, created: Date.now(), upd: Date.now(), tokens: [] };
      setSecret(acc, tur, secret);
      board = null;
      log('yeni oyuncu', ad, tur);
      return loginOk(acc, reply);
    }
    if (route === 'giris' && req.method === 'POST') {
      const b = await readBody(req), k = MI.key(b.ad), acc = db.players[k];
      if (!acc) return reply(401, { hata: 'Bu adla oyuncu yok' });
      if (acc.tur === 'resim') {
        const ids = ['rc:' + k + ':' + dev, 'ri:' + ip, 'ra:' + k];
        const w = Math.max(...ids.map(locked));
        if (w) return reply(429, { hata: `3 kez yanlış resim seçildi. Bu cihazda ${mmss(w)} dakika beklemen gerekiyor.`, kalanSn: w });
        if (checkSecret(acc, b)) { fails.delete(ids[0]); return loginOk(acc, reply); }
        const left = fail(ids[0], RESIM_HAK, RESIM_BEKLE, RESIM_BEKLE);
        fail(ids[1], 20, 3600e3, RESIM_BEKLE);  // aynı ağdan çok deneme (gizli sekme / başka tarayıcıyla aşmaya karşı)
        fail(ids[2], 10, 864e5, RESIM_BEKLE);   // hesaba günde 10 yanlış
        const w2 = Math.max(...ids.map(locked));
        if (w2) return reply(429, { hata: `3 kez yanlış resim seçildi. Bu cihazda ${mmss(w2)} dakika beklemen gerekiyor.`, kalanSn: w2 });
        return reply(401, { hata: `Yanlış resim. ${left} hakkın kaldı.`, kalanHak: left });
      }
      if (locked('ip:' + ip) || locked('ad:' + k)) return reply(429, { hata: 'Çok fazla yanlış deneme. 10 dakika sonra tekrar dene.', kalanSn: Math.max(locked('ip:' + ip), locked('ad:' + k)) });
      if (!checkSecret(acc, b)) { fail('ip:' + ip, 40, 3600e3, 600e3); fail('ad:' + k, 5, 3600e3, 600e3); return reply(401, { hata: 'PIN yanlış' }); }
      fails.delete('ad:' + k);
      return loginOk(acc, reply);
    }
    if (route === 'kodla' && req.method === 'POST') { // "yeni cihaz ekle" koduyla giriş
      const b = await readBody(req), kod = String(b.kod || '').replace(/\D/g, ''), id = 'kod:' + ip;
      if (locked(id)) return reply(429, { hata: 'Çok fazla yanlış kod. 10 dakika sonra tekrar dene.' });
      const d = deviceCodes.get(kod);
      if (!d || d.until < Date.now() || !db.players[d.k]) { fail(id, 10, 600e3, 600e3); return reply(401, { hata: 'Kod yanlış ya da süresi doldu' }); }
      deviceCodes.delete(kod);
      return loginOk(db.players[d.k], reply);
    }
    if (route === 'liderlik' && req.method === 'GET') return reply(200, leaderboard());
    if (route === 'rekor' && req.method === 'GET') return reply(200, { parkur: num(url.searchParams.get('parkur'), 200), liste: records(num(url.searchParams.get('parkur'), 200)) });
    if (route === 'yonetici/sifirla' && req.method === 'POST') { // yalnızca sunucunun içinden (ssh): unutan oyuncuya yeni PIN
      if (!local) return reply(403, { hata: 'yasak' });
      const b = await readBody(req), acc = db.players[MI.key(b.ad)];
      if (!acc) return reply(404, { hata: 'Bu adla oyuncu yok' });
      const pin = String(crypto.randomInt(10000)).padStart(4, '0');
      setSecret(acc, 'pin', 'p:' + pin); revokeOthers(acc, null);
      for (const key of [...fails.keys()]) if (key.includes(acc.key)) fails.delete(key);
      save(); log('yönetici sıfırladı', acc.profile.name);
      return reply(200, { ad: acc.profile.name, pin });
    }
    // buradan sonrası oturum ister
    const acc = accOf(tok);
    if (!acc) return reply(401, { hata: 'Oturum geçersiz, yeniden giriş yap' });
    if (route === 'profil' && req.method === 'GET') return reply(200, { profil: acc.profile, rev: acc.rev, tur: acc.tur });
    if (route === 'profil' && req.method === 'PUT') {
      const b = await readBody(req);
      if (b.rev !== acc.rev) return reply(409, { hata: 'çakışma', profil: acc.profile, rev: acc.rev }); // başka cihaz daha yeni kaydetmiş
      acc.profile = cleanProfile(b.profil, acc.profile.name); acc.rev++; acc.upd = Date.now(); save(); board = null;
      return reply(200, { rev: acc.rev });
    }
    if ((route === 'sifre' || route === 'pin') && req.method === 'POST') { // şifre değiştir (PIN ↔ resim); eski şifre gerekir
      const b = await readBody(req), id = 'sf:' + acc.key;
      if (locked(id)) return reply(429, { hata: 'Çok fazla yanlış deneme, biraz sonra tekrar dene.' });
      const old = b.eski && typeof b.eski === 'object' ? b.eski : { pin: b.eski };
      if (!checkSecret(acc, old)) { fail(id, 5, 3600e3, 1800e3); return reply(401, { hata: acc.tur === 'resim' ? 'Şu anki resmin yanlış' : 'Şu anki PIN yanlış' }); }
      const yeni = b.yeni && typeof b.yeni === 'object' ? b.yeni : { tur: 'pin', pin: b.yeni };
      const tur = yeni.tur === 'resim' ? 'resim' : 'pin', secret = secretOf(tur, yeni);
      if (!secret) return reply(400, { hata: tur === 'pin' ? 'Yeni PIN 4 rakam olmalı' : 'Yeni resmini seç' });
      setSecret(acc, tur, secret); revokeOthers(acc, tok);
      save();
      return reply(200, { ok: true, tur });
    }
    if (route === 'cihazkodu' && req.method === 'POST') { // yeni cihaz eklemek için 6 haneli kod (5 dk, tek kullanım)
      for (const [c, d] of deviceCodes) if (d.k === acc.key || d.until < Date.now()) deviceCodes.delete(c);
      let kod; do { kod = String(crypto.randomInt(1000000)).padStart(6, '0'); } while (deviceCodes.has(kod));
      deviceCodes.set(kod, { k: acc.key, until: Date.now() + 5 * 60e3 });
      return reply(200, { kod, sureSn: 300 });
    }
    if (route === 'cikis' && req.method === 'POST') { const h = sha(tok); delete db.tokens[h]; acc.tokens = (acc.tokens || []).filter(x => x !== h); save(); return reply(200, { ok: true }); }
    return reply(404, { hata: 'yok' });
  } catch (e) { log('istek hatası', e.message); return reply(400, { hata: 'Geçersiz istek' }); }
}

// bir kerelik aktarım (sunucuda, servis durdurulmuşken): node sunucu/hesaplar.js aktar dosya.json → her oyuncu için rastgele PIN yazdırır
if (require.main === module && process.argv[2] === 'aktar') {
  const src = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  for (const p of Object.values(src.players || {})) {
    const ad = MI.tidy(p.name), k = MI.key(ad);
    if (MI.check(ad)) { console.log('ATLANDI (ad uygun değil):', ad); continue; }
    if (db.players[k]) { console.log('ATLANDI (zaten var):', ad); continue; }
    const pin = String(crypto.randomInt(10000)).padStart(4, '0');
    const acc = db.players[k] = { key: k, profile: cleanProfile(p, ad), rev: 1, created: Date.now(), upd: Date.now(), tokens: [], aktarildi: true };
    setSecret(acc, 'pin', 'p:' + pin);
    console.log(`AKTARILDI: ${ad} | PIN ${pin} | puan ${acc.profile.points} | açık parkur ${acc.profile.unlocked}`);
  }
  save(true); process.exit(0);
}

// çok oyunculu: kayıtlı bir oyuncunun adını yalnızca o hesabın oturumu kullanabilir (misafir başkasının adını alamaz)
function mpName(name, tok) {
  const acc = db.players[MI.key(name)];
  if (!acc) return { name, kayitli: false };
  const a = accOf(tok);
  return a === acc ? { name: acc.profile.name, kayitli: true } : null;
}
module.exports = { handle, mpName, flush: () => save(true), count: () => Object.keys(db.players).length };
