/* Misket Yarışı — canlı kullanım raporu (tarayıcıda)
 * GET /api/rapor        → rapor sayfası (veri içermez)
 * GET /api/rapor/veri   → olay kayıtları + hesap özeti (JSON); "X-Anahtar" başlığı gerekir
 * Anahtar: VERI/rapor-anahtar.txt (ilk açılışta kendiliğinden oluşur). Link: https://…/api/rapor#k=ANAHTAR
 * Tam IP gönderilmez: yalnız yaklaşık konum ve ağın kısa özeti (aynı ağdan gelenleri saymak için).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readAll, geoReader } = require('./rapor');

const VERI = process.env.VERI || path.join(__dirname, '..', '..', 'veri');
const KEY_FILE = path.join(VERI, 'rapor-anahtar.txt');
const PAGE = path.join(__dirname, 'rapor.html');

function anahtar() {
  try { const k = fs.readFileSync(KEY_FILE, 'utf8').trim(); if (k.length >= 16) return k; } catch (e) { }
  const k = crypto.randomBytes(18).toString('base64url');
  fs.mkdirSync(VERI, { recursive: true });
  fs.writeFileSync(KEY_FILE, k + '\n', { mode: 0o600 });
  console.log('[rapor] yeni anahtar oluşturuldu:', KEY_FILE);
  return k;
}
anahtar(); // sunucu açılırken dosya hazır olsun

// ---- konum (veritabanı günde bir yeniden açılır) ----
let geo = null, geoAt = 0;
const ipCache = new Map();
const UL = { Turkey: 'Türkiye', Germany: 'Almanya', Netherlands: 'Hollanda', 'The Netherlands': 'Hollanda', 'United States': 'ABD', 'United Kingdom': 'İngiltere', France: 'Fransa', Sweden: 'İsveç', Azerbaijan: 'Azerbaycan', Cyprus: 'Kıbrıs', Austria: 'Avusturya', Belgium: 'Belçika', Switzerland: 'İsviçre' };
const TR_AD = { Istanbul: 'İstanbul', Izmir: 'İzmir', Igdir: 'Iğdır' };
const tr = s => { s = String(s || '').replace(/ Province$/, ''); return TR_AD[s] || s; };
async function getGeo() {
  if (!geo || Date.now() - geoAt > 864e5) { geo = await geoReader(); geoAt = Date.now(); ipCache.clear(); }
  return geo;
}
function konum(g, ip) {
  if (ipCache.has(ip)) return ipCache.get(ip);
  let out = null;
  try {
    const r = g && g.get(ip.replace(/::$/, '::1').replace(/\.0$/, '.1'));
    if (r) {
      const nm = o => o && o.names && (o.names.tr || o.names.en);
      const u = r.country && r.country.names && r.country.names.en;
      out = { sh: tr(nm(r.city)) || '?', il: tr(nm(r.subdivisions && r.subdivisions[0])) || '', ul: UL[u] || nm(r.country) || '?' };
    }
  } catch (e) { }
  ipCache.set(ip, out);
  return out;
}

async function veri() {
  const g = await getGeo();
  const olaylar = readAll().map(e => {
    const o = Object.assign({}, e); delete o.d; delete o.ip;
    if (e.ip) { Object.assign(o, konum(g, e.ip) || {}); o.ag = crypto.createHash('sha256').update(e.ip).digest('hex').slice(0, 8); }
    return o;
  });
  let db = { players: {} };
  try { db = JSON.parse(fs.readFileSync(path.join(VERI, 'hesaplar.json'), 'utf8')); } catch (e) { }
  const hesaplar = Object.values(db.players || {}).map(a => ({
    ad: a.profile && a.profile.name, acildi: a.created, guncel: a.upd, sifre: a.tur || 'pin',
    puan: (a.profile && a.profile.earned) || 0, yaris: (a.profile && a.profile.races) || 0,
  }));
  return { uretildi: new Date().toISOString(), konum: !!g, olaylar, hesaplar };
}

function esit(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function handle(req, res) {
  const p = req.url.split('?')[0].replace(/\/+$/, '');
  const head = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' };
  if (p === '/api/rapor') {
    fs.readFile(PAGE, (err, buf) => {
      if (err) { res.writeHead(500, head); return res.end('rapor sayfası yok'); }
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, head)); res.end(buf);
    });
    return;
  }
  if (p === '/api/rapor/veri') {
    if (!esit(req.headers['x-anahtar'], anahtar())) {
      return void setTimeout(() => { res.writeHead(401, Object.assign({ 'Content-Type': 'application/json' }, head)); res.end('{"hata":"anahtar yanlış"}'); }, 800);
    }
    veri().then(d => {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, head)); res.end(JSON.stringify(d));
    }, e => { res.writeHead(500, head); res.end(JSON.stringify({ hata: e.message })); });
    return;
  }
  res.writeHead(404, head); res.end();
}

module.exports = { handle };
