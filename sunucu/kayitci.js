/* Misket Yarışı — kullanım olayları (rapor için)
 * Her olay VERI/olaylar/YYYY-MM-DD.jsonl dosyasına bir satır JSON olarak yazılır (2 sn'de bir toplu), 400 gün saklanır.
 * Kişisel veri azaltma: tam IP saklanmaz; IPv4'ün son kısmı (a.b.c.0), IPv6'nın ilk 3 bölümü tutulur (şehir/ülke için yeterli).
 * Cihaz/oturum anahtarları tek yönlü kısaltılır (sha256'nın ilk 12 hanesi).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERI = process.env.VERI || path.join(__dirname, '..', '..', 'veri');
const DIR = path.join(VERI, 'olaylar');
const KEEP_DAYS = 400;
fs.mkdirSync(DIR, { recursive: true });

let buf = [];
const day = d => d.toISOString().slice(0, 10);
function flush() {
  if (!buf.length) return;
  const byDay = {};
  for (const [d, line] of buf) (byDay[d] = byDay[d] || []).push(line);
  buf = [];
  for (const d in byDay) { try { fs.appendFileSync(path.join(DIR, d + '.jsonl'), byDay[d].join('')); } catch (e) { console.log('[olay] yazma hatası', e.message); } }
}
setInterval(flush, 2000).unref();
setInterval(() => { // eski dosyaları sil
  try { for (const n of fs.readdirSync(DIR)) { const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(n); if (m && Date.now() - Date.parse(m[1]) > KEEP_DAYS * 864e5) fs.unlinkSync(path.join(DIR, n)); } } catch (e) { }
}, 6 * 3600e3).unref();

// olay(tür, { ...ayrıntılar })
function olay(tur, veri) {
  const now = new Date();
  buf.push([day(now), JSON.stringify(Object.assign({}, veri || {}, { z: now.toISOString(), tur })) + '\n']); // olay türü ayrıntılardaki alanlarla ezilmesin
}
// IP'nin yalnız ağ kısmı
function ipKisa(ip) {
  ip = String(ip || '').replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, '.0');
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::';
  return '';
}
const kisalt = s => s ? crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 12) : '';

module.exports = { olay, flush, ipKisa, kisalt, DIR };
