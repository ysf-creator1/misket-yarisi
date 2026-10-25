/* Misket Yarışı — kullanım raporu (sunucuda çalışır, Markdown yazar)
 * node sunucu/rapor.js [7 | 30 | bugun | dun | tumu | 2026-10-20..2026-10-25]
 * node sunucu/rapor.js gecmis < journalctl çıktısı   → olay kaydından önceki günleri sunucu günlüğünden ekler (bir kez)
 * Konum: IP'nin ağ kısmından DB-IP Lite şehir veritabanıyla (yaklaşık; "IP Geolocation by DB-IP", CC BY 4.0).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { DIR } = require('./kayitci');

const VERI = process.env.VERI || path.join(__dirname, '..', '..', 'veri');
const GEO = path.join(VERI, 'geo', 'dbip-city-lite.mmdb');
const TZ = 'Europe/Istanbul';
const trDay = d => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const trHour = d => +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d) % 24;
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
const uniq = a => new Set(a.filter(Boolean)).size;
const fmtSn = s => s >= 3600 ? `${(s / 3600).toFixed(1)} sa` : s >= 60 ? `${Math.round(s / 60)} dk` : `${Math.round(s)} sn`;

function readAll() {
  const out = [];
  if (!fs.existsSync(DIR)) return out;
  for (const n of fs.readdirSync(DIR).sort()) {
    if (!/\.jsonl$/.test(n)) continue;
    for (const line of fs.readFileSync(path.join(DIR, n), 'utf8').split('\n')) { if (!line) continue; try { const e = JSON.parse(line); e.d = new Date(e.z); out.push(e); } catch (x) { } }
  }
  return out.sort((a, b) => a.d - b.d);
}

// ---- geçmiş: sunucu günlüğünden (journalctl -u misket -o short-iso) ----
function backfill() {
  const all = readAll(), first = all.find(e => !e.geri);
  const until = first ? first.d : new Date();
  const lines = fs.readFileSync(0, 'utf8').split('\n'), add = [];
  for (const L of lines) {
    const m = /^(\S+)\s+\S+\s+node\[\d+\]:\s+\S+\s+(.*)$/.exec(L); if (!m) continue;
    const d = new Date(m[1].replace(/([+-]\d\d)(\d\d)$/, '$1:$2')); if (!(d < until)) continue;
    let mm, e = null;
    if ((mm = /^oda açıldı (\S+)( \(hızlı\))?/.exec(m[2]))) e = { tur: 'oda', kod: mm[1], hizli: !!mm[2] };
    else if ((mm = /^yarış başladı (\S+) parkur (\d+) insan (\d+)/.exec(m[2]))) e = { tur: 'cok_basla', kod: mm[1], parkur: +mm[2], insan: +mm[3] };
    else if ((mm = /^yarış bitti (\S+)/.exec(m[2]))) e = { tur: 'cok_bitti', kod: mm[1] };
    else if ((mm = /^\[hesap\] yeni oyuncu (.+?)( pin| resim)?$/.exec(m[2]))) e = { tur: 'hesap', ad: mm[1], tur2: (mm[2] || '').trim() || undefined };
    if (e) { if (e.tur2) { e.sifre = e.tur2; delete e.tur2; } add.push(Object.assign({ z: d.toISOString(), geri: true }, e)); }
  }
  const byDay = {};
  for (const e of add) (byDay[e.z.slice(0, 10)] = byDay[e.z.slice(0, 10)] || []).push(JSON.stringify(e) + '\n');
  fs.mkdirSync(DIR, { recursive: true });
  for (const day in byDay) fs.appendFileSync(path.join(DIR, day + '.jsonl'), byDay[day].join(''));
  console.log(`geçmişten eklendi: ${add.length} olay (${Object.keys(byDay).join(', ') || '-'})`);
}

// ---- konum veritabanı (ayda bir indirilir) ----
function download(url, dest) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      const tmp = dest + '.tmp'; fs.mkdirSync(path.dirname(dest), { recursive: true });
      r.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(tmp)).on('finish', () => { fs.renameSync(tmp, dest); res(); }).on('error', rej);
    }).on('error', rej);
  });
}
async function geoReader() {
  try {
    const old = !fs.existsSync(GEO) || Date.now() - fs.statSync(GEO).mtimeMs > 35 * 864e5;
    if (old) {
      const d = new Date();
      for (const k of [0, 1]) { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); const m = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; try { await download(`https://download.db-ip.com/free/dbip-city-lite-${m}.mmdb.gz`, GEO); break; } catch (e) { } }
    }
    if (!fs.existsSync(GEO)) return null;
    const { Reader } = require('maxmind');
    return new Reader(fs.readFileSync(GEO));
  } catch (e) { return null; }
}
function place(geo, ip) {
  if (!geo || !ip) return null;
  try {
    const r = geo.get(ip.replace(/::$/, '::1').replace(/\.0$/, '.1')); if (!r) return null;
    const nm = o => o && o.names && (o.names.tr || o.names.en);
    const UL = { Turkey: 'Türkiye', Germany: 'Almanya', Netherlands: 'Hollanda', 'United States': 'ABD', 'United Kingdom': 'İngiltere', France: 'Fransa', Sweden: 'İsveç', Azerbaijan: 'Azerbaycan', 'Cyprus': 'Kıbrıs', Austria: 'Avusturya', Belgium: 'Belçika', Switzerland: 'İsviçre' };
    const u = nm(r.country);
    return { ulke: UL[u] || u || '?', sehir: nm(r.city) || nm(r.subdivisions && r.subdivisions[0]) || '?' };
  } catch (e) { return null; }
}

function range(arg) {
  const today = trDay(new Date()), d0 = s => new Date(s + 'T00:00:00+03:00');
  if (!arg || /^\d+$/.test(arg)) { const n = +(arg || 7); const a = new Date(d0(today) - (n - 1) * 864e5); return [a, new Date(+d0(today) + 864e5), `Son ${n} gün`]; }
  if (arg === 'bugun') return [d0(today), new Date(+d0(today) + 864e5), `Bugün (${today})`];
  if (arg === 'dun') { const a = new Date(+d0(today) - 864e5); return [a, d0(today), `Dün (${trDay(a)})`]; }
  if (arg === 'tumu') return [new Date(0), new Date(8.64e15), 'Tüm zamanlar'];
  const m = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(arg);
  if (m) return [d0(m[1]), new Date(+d0(m[2]) + 864e5), `${m[1]} – ${m[2]}`];
  throw new Error('Tarih anlaşılmadı: ' + arg);
}
const bar = (n, max, w = 24) => '█'.repeat(max ? Math.round(w * n / max) : 0) || (n ? '▏' : '');

async function report(arg) {
  const [A, B, title] = range(arg);
  const all = readAll(), E = all.filter(e => e.d >= A && e.d < B), T = t => E.filter(e => e.tur === t);
  let db = { players: {} }; try { db = JSON.parse(fs.readFileSync(path.join(VERI, 'hesaplar.json'), 'utf8')); } catch (e) { }
  const accs = Object.values(db.players || {});
  const firstSeen = new Map(); for (const e of all) { const c = e.cihaz || e.c; if (c && !firstSeen.has(c)) firstSeen.set(c, e.d); }
  const out = [], P = s => out.push(s);
  P(`# Misket Yarışı — kullanım raporu`);
  P(`**Dönem:** ${title} · Türkiye saati · hazırlandı ${new Date().toLocaleString('tr-TR', { timeZone: TZ })}`);
  const oldest = all[0]; if (oldest) P(`_Kayıt başlangıcı: ${trDay(oldest.d)}${all.some(e => e.geri) ? ' (ilk günler sunucu günlüğünden: oda/yarış/hesap var, açılış ve konum yok)' : ''}_`);
  P('');
  // ---- ziyaretler ----
  const ac = T('acilis'), dev = ac.map(e => e.cihaz), devU = uniq(dev);
  const newDev = [...new Set(dev.filter(Boolean))].filter(c => firstSeen.get(c) >= A).length;
  P(`## 👀 Oyunu açanlar`);
  P(`- Açılış: **${ac.length}** · farklı cihaz: **${devU}** (ilk kez gelen: ${newDev})`);
  const guestDev = uniq(ac.filter(e => e.misafir).map(e => e.cihaz)), accDev = uniq(ac.filter(e => !e.misafir).map(e => e.cihaz));
  P(`- Misafir olarak oynayan cihaz: **${guestDev}** · hesapla oynayan cihaz: **${accDev}** (farklı hesap: ${uniq(ac.filter(e => !e.misafir).map(e => e.ad))})`);
  P(`- Cihaz türü: 📱 telefon/tablet ${pct(ac.filter(e => e.mobil).length, ac.length)} · 💻 bilgisayar ${pct(ac.filter(e => !e.mobil).length, ac.length)}`);
  const src = {}; for (const e of ac) src[e.kaynak || 'web'] = (src[e.kaynak || 'web'] || 0) + 1;
  const SRC = { web: 'internet sitesi', anaekran: 'telefon ana ekranı', mac: 'Mac uygulaması', dosya: 'dosyadan' };
  if (ac.length) P(`- Nereden açıldı: ${Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${SRC[k] || k} ${v}`).join(' · ')}`);
  P('');
  // ---- tek oyunculu ----
  const ty = T('tek_yaris');
  P(`## 🏁 Tek oyunculu`);
  P(`- Biten yarış: **${ty.length}** (kupa yarışı: ${ty.filter(e => e.mod === 'kupa').length}) · oynayan cihaz: ${uniq(ty.map(e => e.cihaz))} · birincilik: ${ty.filter(e => e.sira === 1).length}`);
  const tp = {}; for (const e of ty) tp[e.parkur] = (tp[e.parkur] || 0) + 1;
  const topT = Object.entries(tp).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topT.length) P(`- En çok oynanan parkurlar: ${topT.map(([k, v]) => `P${k} (${v})`).join(' · ')} · en uzağa giden: P${Math.max(...ty.map(e => e.parkur))}`);
  P('');
  // ---- çok oyunculu ----
  const od = T('oda'), cb = T('cok_basla'), cf = T('cok_bitti'), bg = T('baglan'), mh = T('merhaba'), ay = T('ayril');
  P(`## 👥 Çok oyunculu`);
  P(`- Açılan oda: **${od.length}** (özel ${od.filter(e => !e.hizli).length} · hızlı oyun ${od.filter(e => e.hizli).length})`);
  const ins = cb.map(e => e.insan || 0);
  P(`- Başlayan yarış: **${cb.length}** · biten: ${cf.length} · yarış başına ortalama insan: ${ins.length ? (ins.reduce((a, b) => a + b, 0) / ins.length).toFixed(1) : '-'} (en kalabalık: ${ins.length ? Math.max(...ins) : '-'} kişi; kalanlar bot)`);
  const reason = {}; for (const e of cb) if (e.sebep) reason[e.sebep] = (reason[e.sebep] || 0) + 1;
  const R = { kurucu: 'kurucu başlattı', hizli: 'hızlı oyun', 'oylama:ayni': 'oylama → aynı parkur', 'oylama:sonraki': 'oylama → sonraki parkur' };
  if (Object.keys(reason).length) P(`- Nasıl başladı: ${Object.entries(reason).map(([k, v]) => `${R[k] || k} ${v}`).join(' · ')}`);
  P(`- Sunucuya bağlanan: **${uniq(bg.map(e => e.c))}** farklı oyuncu, ${bg.length} bağlantı · telefondan ${pct(bg.filter(e => e.mobil).length, bg.length)}`);
  const names = mh.filter(e => e.ad); P(`- Görünen adlar: kayıtlı ${uniq(names.filter(e => e.kayitli).map(e => e.ad))} · misafir ${uniq(names.filter(e => !e.kayitli).map(e => e.ad))}`);
  const ses = ay.map(e => e.sureSn || 0).filter(s => s > 3);
  if (ses.length) P(`- Oturum süresi (çok oyunculu ekranında): ortalama ${fmtSn(ses.reduce((a, b) => a + b, 0) / ses.length)} · en uzun ${fmtSn(Math.max(...ses))}`);
  P('');
  // ---- hesaplar ----
  const he = T('hesap'), gi = T('giris'), gh = T('giris_hata');
  const accNew = accs.filter(a => a.created >= +A && a.created < +B);
  P(`## 👤 Hesaplar`);
  P(`- Toplam hesap: **${accs.length}** (🔢 PIN ${accs.filter(a => (a.tur || 'pin') === 'pin').length} · 🖼️ resim ${accs.filter(a => a.tur === 'resim').length})`);
  P(`- Bu dönemde açılan: **${accNew.length}**${accNew.length ? ' — ' + accNew.map(a => a.profile.name).join(', ') : ''}`);
  P(`- Misafirken hesap açan (ilerlemesini taşıyan): **${he.filter(e => e.misafirden).length}** · doğrudan hesap açan: ${he.filter(e => !e.misafirden && !e.geri).length}${he.some(e => e.geri) ? ` · eski kayıttan (bilinmiyor): ${he.filter(e => e.geri).length}` : ''}`);
  if (guestDev) P(`- Misafir cihazların hesaba dönme oranı: ${pct(he.filter(e => e.misafirden).length, guestDev)}`);
  P(`- Giriş: ${gi.length} (başka cihazdan / yeniden) · yanlış şifre denemesi: ${gh.length} · kodla yeni cihaz ekleme: ${T('kodla').length} · şifre sıfırlama: ${T('sifirla').length}`);
  P('');
  // ---- saatler ----
  const act = E.filter(e => ['acilis', 'tek_yaris', 'cok_basla', 'baglan'].includes(e.tur));
  const hours = Array(24).fill(0); for (const e of act) hours[trHour(e.d)]++;
  const hmax = Math.max(...hours);
  P(`## 🕒 Hangi saatlerde oynandı (açılış + yarış + bağlantı)`);
  if (!act.length) P('_Bu dönemde etkinlik yok._');
  else {
    const hs = hours.map((n, h) => n ? h : -1).filter(h => h >= 0), h0 = Math.min(...hs), h1 = Math.max(...hs);
    P('```'); for (let h = h0; h <= h1; h++) P(`${String(h).padStart(2, '0')}:00 ${bar(hours[h], hmax).padEnd(24)} ${hours[h] || ''}`); P('```');
    const peak = hours.indexOf(hmax); P(`En yoğun saat: **${String(peak).padStart(2, '0')}:00–${String((peak + 1) % 24).padStart(2, '0')}:00**`);
  }
  P('');
  // ---- günler ----
  const days = {}; const dd = e => (days[trDay(e.d)] = days[trDay(e.d)] || { ac: 0, cihaz: new Set(), ty: 0, cy: 0, he: 0, oda: 0 });
  for (const e of E) { const x = dd(e); if (e.tur === 'acilis') { x.ac++; if (e.cihaz) x.cihaz.add(e.cihaz); } if (e.tur === 'tek_yaris') x.ty++; if (e.tur === 'cok_basla') x.cy++; if (e.tur === 'hesap') x.he++; if (e.tur === 'oda') x.oda++; }
  P(`## 📅 Günlere göre`);
  P('| Gün | Açılış | Cihaz | Tek yarış | Oda | Çok oyunculu yarış | Yeni hesap |'); P('|---|---|---|---|---|---|---|');
  for (const k of Object.keys(days).sort()) { const x = days[k]; P(`| ${k} | ${x.ac} | ${x.cihaz.size} | ${x.ty} | ${x.oda} | ${x.cy} | ${x.he} |`); }
  P('');
  // ---- konum ----
  const geo = await geoReader();
  P(`## 📍 Nereden bağlanıldı (yaklaşık, farklı cihaz sayısı)`);
  if (!geo) P('_Konum veritabanı yüklenemedi._');
  else {
    const city = {}, country = {}, seen = new Set();
    for (const e of E) {
      const id = e.cihaz || e.c, ip = e.ip; if (!ip || !id) continue;
      const k = id + '|' + ip; if (seen.has(k)) continue; seen.add(k);
      const pl = place(geo, ip); if (!pl) continue;
      const cty = `${pl.sehir}, ${pl.ulke}`; (city[cty] = city[cty] || new Set()).add(id); (country[pl.ulke] = country[pl.ulke] || new Set()).add(id);
    }
    const top = o => Object.entries(o).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]);
    if (!seen.size) P('_Bu dönemde konum bilgisi olan bağlantı yok._');
    else { P(`- Ülkeler: ${top(country).map(([k, v]) => `${k} ${v}`).join(' · ')}`); P(`- Şehirler: ${top(city).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(' · ')}`); }
    P('_IP konumu yaklaşıktır (internet sağlayıcısının merkezi görünebilir). Konum: IP Geolocation by DB-IP (db-ip.com)._');
  }
  P('');
  // ---- oyuncular ----
  const top5 = accs.map(a => a.profile).sort((a, b) => (b.earned || 0) - (a.earned || 0)).slice(0, 5);
  P(`## 🏆 Oyuncular`);
  if (top5.length) P(`- En çok puan kazanan: ${top5.map(p => `${p.name} (${p.earned || 0} puan, ${p.races || 0} yarış)`).join(' · ')}`);
  const active = {}; for (const e of E) if (e.ad && ['acilis', 'merhaba', 'giris'].includes(e.tur) && !(e.tur === 'merhaba' && !e.kayitli)) active[e.ad] = (active[e.ad] || 0) + 1;
  const ta = Object.entries(active).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (ta.length) P(`- Bu dönemde en sık gelen hesaplar: ${ta.map(([k, v]) => `${k} (${v})`).join(' · ')}`);
  console.log(out.join('\n'));
}

if (process.argv[2] === 'gecmis') backfill();
else report(process.argv[2]).catch(e => { console.error('Rapor hatası:', e.message); process.exit(1); });
