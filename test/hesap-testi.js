// Misket Yarışı — bulut hesap testi (geçici klasörde sunucu açar)
// Kullanım: node test/hesap-testi.js
const path = require('path'), fs = require('fs'), os = require('os');
const { spawn, execFileSync } = require('child_process');
const PORT = 8797, B = `http://127.0.0.1:${PORT}/api/`;
const VERI = fs.mkdtempSync(path.join(os.tmpdir(), 'misket-hesap-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (info ? '  (' + info + ')' : '')); };
const api = async (route, opt = {}) => {
  const r = await fetch(B + route, { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: Object.assign({ 'Content-Type': 'application/json', Origin: 'https://ysf-creator1.github.io', 'X-Forwarded-For': opt.ip || '10.0.0.1' }, opt.tok ? { Authorization: 'Bearer ' + opt.tok } : {}, opt.dev ? { 'X-Cihaz': opt.dev } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined });
  return { code: r.status, cors: r.headers.get('access-control-allow-origin'), j: await r.json().catch(() => null) };
};
(async () => {
  // bir kerelik aktarım (sunucu kapalıyken)
  const src = path.join(VERI, 'yerel.json');
  fs.writeFileSync(src, JSON.stringify({ players: { ysf: { name: 'ysf', points: 1560, earned: 2010, races: 27, wins: 5, xp: 900, unlocked: 12, owned: ['sapka:kovboy'], eq: {}, ach: { ilk: 1 }, best: { 3: { place: 1, time: 61.2 } } } } }));
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'sunucu', 'hesaplar.js'), 'aktar', src], { env: Object.assign({}, process.env, { VERI }) }).toString();
  const pinYsf = (/PIN (\d{4})/.exec(out) || [])[1];
  ok('yerel kayıt aktarıldı, PIN üretildi', !!pinYsf, out.trim());

  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'sunucu', 'oyun-sunucusu.js')], { env: Object.assign({}, process.env, { PORT, VERI }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 100 && !log.includes('hazır'); i++) await sleep(100);
  try {
    let r = await api('isim?ad=Ali'); ok('boş ad uygun', r.j.uygun === true && r.cors === 'https://ysf-creator1.github.io', 'CORS ' + r.cors);
    r = await api('kayit', { body: { ad: 'Ali', pin: '1234' } }); const tokA = r.j.token;
    ok('kayıt', r.code === 200 && tokA && r.j.profil.name === 'Ali' && r.j.rev === 1);
    r = await api('kayit', { body: { ad: '  aLİ ', pin: '5555' } }); ok('aynı ad (büyük/küçük harf farklı) reddedildi', r.code === 409, r.j.hata);
    r = await api('isim?ad=ali'); ok('isim kontrolü alınmış diyor', r.j.uygun === false && /alınmış/.test(r.j.hata));
    r = await api('kayit', { body: { ad: 'orospu', pin: '1234' } }); ok('uygunsuz ad reddedildi', r.code === 400, r.j.hata);
    r = await api('kayit', { body: { ad: 'Veli', pin: '12a4' } }); ok('PIN 4 rakam olmalı', r.code === 400);
    r = await api('giris', { body: { ad: 'ali', pin: '0000' } }); ok('yanlış PIN', r.code === 401, r.j.hata);
    r = await api('giris', { body: { ad: 'ALİ', pin: '1234' } }); const tokA2 = r.j.token; ok('doğru PIN ile giriş (büyük harfle)', r.code === 200 && tokA2);
    r = await api('profil', { tok: tokA }); ok('profil okundu', r.code === 200 && r.j.rev === 1);
    const p = r.j.profil; p.points = 300; p.earned = 300; p.races = 3; p.wins = 2; p.xp = 120; p.best = { 2: { place: 1, time: 58.4 } }; p.hile = 'x';
    r = await api('profil', { method: 'PUT', tok: tokA, body: { profil: p, rev: 1 } }); ok('profil kaydedildi', r.code === 200 && r.j.rev === 2);
    r = await api('profil', { method: 'PUT', tok: tokA2, body: { profil: p, rev: 1 } }); ok('eski sürümle yazma engellendi (çakışma)', r.code === 409 && r.j.rev === 2);
    r = await api('profil', { tok: tokA2 }); ok('diğer cihaz güncel profili görür, fazla alan atıldı', r.j.profil.points === 300 && r.j.profil.hile === undefined);
    r = await api('profil', { tok: 'yanlis' }); ok('geçersiz oturum', r.code === 401);
    for (let i = 0; i < 5; i++) await api('giris', { body: { ad: 'ysf', pin: '9999' === pinYsf ? '9998' : '9999' } });
    r = await api('giris', { body: { ad: 'ysf', pin: pinYsf } }); ok('5 yanlış denemeden sonra kilit', r.code === 429, r.j.hata);
    r = await api('pin', { tok: tokA, body: { eski: '1234', yeni: '4321' } }); ok('PIN değişti', r.code === 200);
    r = await api('profil', { tok: tokA2 }); ok('PIN değişince diğer cihazdan çıkış', r.code === 401);
    r = await api('giris', { body: { ad: 'Ali', pin: '4321' } }); ok('yeni PIN ile giriş', r.code === 200);
    r = await api('liderlik'); ok('liderlik tablosu', r.j.puan.length === 2 && r.j.puan[0].ad === 'ysf' && r.j.oyuncu === 2, r.j.puan.map(x => `${x.ad}:${x.deger}`).join(', '));
    r = await api('rekor?parkur=2'); ok('parkur rekoru', r.j.liste.length === 1 && r.j.liste[0].ad === 'Ali' && r.j.liste[0].sure === 58.4);
    r = await fetch(B + 'profil', { method: 'OPTIONS', headers: { Origin: 'https://kotu-site.com' } }); ok('başka siteye CORS izni yok', !r.headers.get('access-control-allow-origin'));
    // --- resimli şifre ---
    r = await api('kayit', { body: { ad: 'Resimci', tur: 'resim', resim: 7 } });
    ok('resimli şifreyle kayıt (kurtarma kodu yok)', r.code === 200 && r.j.tur === 'resim' && r.j.kurtarma === undefined);
    const tokR = r.j.token;
    r = await api('kayit', { body: { ad: 'Misafir123', pin: '1234' } }); ok('misafir adıyla hesap açılamaz', r.code === 400, r.j.hata);
    r = await api('isim?ad=resimci'); ok('isim sorgusu şifre türünü söyler', r.j.var && r.j.tur === 'resim');
    r = await api('giris', { dev: 'aaaa1111', body: { ad: 'resimci', resim: 3 } }); ok('yanlış resim: 2 hak kaldı', r.code === 401 && r.j.kalanHak === 2, r.j.hata);
    r = await api('giris', { dev: 'aaaa1111', body: { ad: 'resimci', resim: 4 } }); ok('yanlış resim: 1 hak kaldı', r.j.kalanHak === 1);
    r = await api('giris', { dev: 'aaaa1111', body: { ad: 'resimci', resim: 5 } }); ok('3. yanlışta 30 dk bekleme', r.code === 429 && r.j.kalanSn > 1700, r.j.hata);
    r = await api('giris', { dev: 'aaaa1111', body: { ad: 'resimci', resim: 7 } }); ok('beklemedeyken doğru resim de kabul edilmez', r.code === 429);
    r = await api('giris', { dev: 'bbbb2222', ip: '10.0.0.9', body: { ad: 'resimci', resim: 7 } }); ok('başka cihazdan doğru resimle girilir (kilit sadece o cihazda)', r.code === 200);
    r = await api('profil', { tok: tokR }); ok('kayıtlı cihaz yeniden sormadan girer', r.code === 200 && r.j.kurtarmaVar === undefined);
    // --- yeni cihaz ekle kodu ---
    r = await api('cihazkodu', { tok: tokR, body: {} }); const kod = r.j.kod; ok('yeni cihaz kodu (6 hane, 5 dk)', /^\d{6}$/.test(kod) && r.j.sureSn === 300);
    r = await api('kodla', { body: { kod } }); ok('kodla giriş', r.code === 200 && r.j.profil.name === 'Resimci');
    r = await api('kodla', { body: { kod } }); ok('kod tek kullanımlık', r.code === 401);
    r = await api('kurtar', { body: { ad: 'Resimci', kod: 'ABCD1234', tur: 'pin', pin: '2468' } }); ok('kurtarma kodu kaldırıldı', r.code === 401 || r.code === 404);
    r = await api('giris', { dev: 'dddd4444', ip: '10.0.0.7', body: { ad: 'Resimci', resim: 7 } }); const tokR2 = r.j.token; ok('başka cihazdan resimle giriş', r.code === 200);
    r = await api('sifre', { tok: tokR2, body: { eski: { resim: 7 }, yeni: { tur: 'pin', pin: '2468' } } }); ok('şifre türü resim → PIN', r.code === 200 && r.j.tur === 'pin');
    r = await api('sifre', { tok: tokR2, body: { eski: { pin: '2468' }, yeni: { tur: 'resim', resim: 11 } } }); ok('şifre türü PIN → resim', r.code === 200 && r.j.tur === 'resim');
    r = await api('giris', { dev: 'cccc3333', ip: '10.0.0.5', body: { ad: 'Resimci', resim: 11 } }); ok('yeni resimle giriş', r.code === 200);
    // --- yönetici sıfırlama (yalnız sunucu içinden) ---
    let rr = await fetch(B + 'yonetici/sifirla', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4' }, body: JSON.stringify({ ad: 'Resimci' }) });
    ok('dışarıdan yönetici sıfırlaması yasak', rr.status === 403);
    rr = await fetch(B + 'yonetici/sifirla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: 'Resimci' }) }); const sf = await rr.json();
    ok('sunucu içinden sıfırlama yeni PIN verir', rr.status === 200 && /^\d{4}$/.test(sf.pin) && sf.kurtarma === undefined, `PIN ${sf.pin}`);
    r = await api('giris', { body: { ad: 'Resimci', pin: sf.pin } }); ok('sıfırlanan PIN ile giriş', r.code === 200);
    await sleep(2500);
    const saved = JSON.parse(fs.readFileSync(path.join(VERI, 'hesaplar.json'), 'utf8'));
    ok('dosyaya yazıldı', Object.keys(saved.players).length === 3 && !JSON.stringify(saved).includes('"1234"'));
    await sleep(3000);
    ok('günlük yedek alındı', fs.readdirSync(path.join(VERI, 'yedek')).some(n => /^hesaplar-\d{4}-\d{2}-\d{2}\.json$/.test(n)));
  } catch (e) { fail++; console.log('  ✗ HATA', e.stack); }
  srv.kill('SIGTERM'); await sleep(400);
  if (/istek hatası|Error/.test(log)) console.log('sunucu günlüğü:\n' + log.split('\n').filter(l => /hata|Error/.test(l)).slice(0, 5).join('\n'));
  fs.rmSync(VERI, { recursive: true, force: true });
  console.log(`\n${pass} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
})();
