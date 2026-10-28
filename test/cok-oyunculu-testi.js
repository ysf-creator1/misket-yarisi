// Misket Yarışı — çok oyunculu sunucu testi (sahte oyuncularla)
// Sunucuyu ayrı süreçte başlatır; 3 oyuncu bir odaya girer, 3 koltuk bot olur; yarış sonuna kadar sürer.
// Yarış ortasında bir oyuncu kopar (misketini bot devralır) ve aynı anahtarla geri bağlanır.
// Yarış sonrası sıradakini kurucu seçer (3 sn geri sayım); kopan oyuncu ve kurucu odada kalır.
// Ayrıca hızlı oyun: tek oyuncu girer, süre dolunca botlarla başlar.
// Kullanım: node test/cok-oyunculu-testi.js [parkur=1]  (Node 22+: yerleşik WebSocket)
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os');
const VERI = fs.mkdtempSync(path.join(os.tmpdir(), 'misket-mp-')); // gerçek kayıtlara dokunma
const PORT = 8795, URL0 = `ws://127.0.0.1:${PORT}/ws`;
const trackId = +process.argv[2] || 1;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (info ? '  (' + info + ')' : '')); };

class Client {
  constructor(name, unlocked, key) {
    this.name = name; this.msgs = []; this.snaps = 0; this.bytes = 0; this.hands = 0; this.events = []; this.lastSnap = null;
    this.ws = new WebSocket(URL0 + (key ? '?anahtar=' + key : '')); this.ws.binaryType = 'arraybuffer';
    this.open = new Promise(res => this.ws.onopen = res);
    this.ws.onmessage = ev => {
      if (typeof ev.data !== 'string') { this.snaps++; this.bytes += ev.data.byteLength; this.lastSnap = new DataView(ev.data); return; }
      this.bytes += ev.data.length;
      const m = JSON.parse(ev.data); this.msgs.push(m);
      if (m.t === 'hosgeldin') { this.pid = m.pid; this.key = m.anahtar; }
      if (m.t === 'oda') this.room = m;
      if (m.t === 'basla') this.start = m;
      if (m.t === 'el') { this.hands++; if (this.autoCard) setTimeout(() => this.send({ t: 'kart', k: 0 }), 300); }
      if (m.t === 'olaylar') this.events.push(...m.e);
      if (m.t === 'sonuc') this.result = m;
    };
    this.unlocked = unlocked;
  }
  send(o) { this.ws.send(JSON.stringify(o)); }
  async hello() { await this.open; this.send({ t: 'merhaba', ad: this.name, eq: { sapka: 'Kovboy' }, acik: this.unlocked }); await this.wait(m => m.t === 'hosgeldin'); }
  async wait(fn, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = this.msgs.find(fn); if (m) return m; await sleep(30); } throw new Error(this.name + ': beklenen mesaj gelmedi'); }
  close() { try { this.ws.close(); } catch (e) { } }
}
const humanFlags = dv => { const n = dv.getUint8(1), out = []; for (let i = 0; i < n; i++) if (dv.getUint16(12 + i * 48 + 44, true) & 1024) out.push(i); return out; };

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'sunucu', 'oyun-sunucusu.js')], { env: Object.assign({}, process.env, { PORT, VERI }), stdio: ['ignore', 'pipe', 'pipe'] });
  let srvLog = ''; srv.stdout.on('data', d => srvLog += d); srv.stderr.on('data', d => srvLog += d);
  for (let i = 0; i < 100 && !srvLog.includes('hazır'); i++) await sleep(100);
  try {
    console.log('1) Özel oda: 3 oyuncu + 3 bot');
    const A = new Client('Ali', trackId), B = new Client('Ayşe', 5), C = new Client('Can<script>', 3);
    await A.hello(); await B.hello(); await C.hello();
    A.send({ t: 'odaKur' }); const r0 = await A.wait(m => m.t === 'oda');
    ok('oda kodu 5 harf', /^[A-Z0-9]{5}$/.test(r0.kod), r0.kod);
    B.send({ t: 'katil', kod: r0.kod.toLowerCase() }); C.send({ t: 'katil', kod: r0.kod });
    await sleep(400);
    ok('3 oyuncu odada', A.room.oyuncular.length === 3, A.room.oyuncular.map(p => p.ad + ':' + p.misket).join(', '));
    ok('isimler temizlendi', !A.room.oyuncular.some(p => /[<>]/.test(p.ad)));
    ok('misketler farklı', new Set(A.room.oyuncular.map(p => p.misket)).size === 3);
    B.send({ t: 'misket', no: 5 }); await sleep(200);
    ok('misket seçimi', A.room.oyuncular.find(p => p.ad === 'Ayşe').misket === 5);
    B.send({ t: 'baslat' }); await sleep(200);
    ok('kurucu olmayan başlatamaz', A.room.durum === 'lobi');
    A.send({ t: 'parkur', id: 150 }); await sleep(200);
    ok('çok oyunculuda kurucu açmadığı parkuru da seçebiliyor', A.room.parkur === 150, `parkur ${A.room.parkur}`);
    A.send({ t: 'parkur', id: trackId }); for (const c of [A, B, C]) c.autoCard = true;
    A.send({ t: 'baslat' });
    await A.wait(m => m.t === 'basla');
    ok('herkese başla mesajı', !!(B.start && C.start), `parkur ${A.start.parkur}, intro ${A.start.intro.toFixed(1)} sn`);
    await sleep(2000);
    const hf = humanFlags(A.lastSnap);
    ok('3 insan + 3 bot', hf.length === 3, 'insan misketler: ' + hf.join(','));
    // yarış ortası: C kopar
    await sleep(9000);
    const cMarble = C.start.benim, cKey = C.key; C.close(); await sleep(800);
    ok('kopan oyuncunun misketini bot aldı', !humanFlags(A.lastSnap).includes(cMarble));
    const C2 = new Client('Can', 3, cKey); await C2.hello(); await C2.wait(m => m.t === 'basla');
    await sleep(800);
    ok('geri bağlanınca misketini geri aldı', humanFlags(A.lastSnap).includes(cMarble) && C2.start.benim === cMarble);
    C2.autoCard = true;
    const t0 = Date.now();
    await A.wait(m => m.t === 'sonuc', 400000);
    const secs = (Date.now() - t0) / 1000 + 12;
    ok('yarış bitti, sonuç geldi', A.result && A.result.sira.length === 6, A.result.sira.map(s => s.id + (s.insan ? '*' : '')).join(' > '));
    const rate = A.snaps / secs, kbs = A.bytes / secs / 1024;
    ok('anlık görüntü ~20/sn', rate > 17 && rate < 22, rate.toFixed(1) + '/sn');
    ok('bant genişliği < 10 KB/sn', kbs < 10, kbs.toFixed(1) + ' KB/sn');
    ok('kart elleri geldi', A.hands >= 2, `${A.hands} el`);
    const pw = A.events.filter(e => e.type === 'power');
    ok('güç olayları herkese', pw.length >= 6 && pw.every(e => e._c > 0), `${pw.length} güç`);
    ok('olaylarda Rapier nesnesi yok', !JSON.stringify(A.events).includes('"col"'));
    await sleep(300);
    ok('yarıştan sonra oda lobiye döndü', A.room.durum === 'lobi' && A.room.oyuncular.length === 3);
    // yarış sonrası: sıradakini kurucu seçer, 3 sn geri sayımla başlar
    ok('sonuçtan sonra son parkur bildirildi, geri sayım yok', A.room.sonParkur === trackId && A.room.basliyor === null);
    for (const c of [A, B, C2]) c.autoCard = false;
    B.send({ t: 'baslat', parkur: trackId + 1, neden: 'sonraki' }); await sleep(300);
    ok('kurucu olmayan sıradakini başlatamaz', A.room.basliyor === null && A.room.parkur === trackId);
    ok('eski oylama mesajı yok', !('oylama' in A.room));
    // kurucunun bağlantısı koparsa (telefon kilitlendi) bağlı biri yönetir; kurucu odada kalır ve dönünce yetki ona geçer
    const aKey = A.key, aPid = A.pid; A.close(); await sleep(600);
    ok('kurucu kopunca odada kalır, yönetim bağlı birine geçer', B.room.oyuncular.length === 3 && B.room.kurucu !== aPid && B.room.oyuncular.find(o => o.pid === aPid).bagli === false, `yönetici ${B.room.oyuncular.find(o => o.pid === B.room.kurucu).ad}`);
    const A2 = new Client('Ali', trackId, aKey); await A2.hello(); await A2.wait(m => m.t === 'oda');
    ok('kurucu geri gelince yetki ona döner', A2.room.kurucu === aPid && A2.pid === aPid && A2.room.oyuncular.length === 3);
    // C2 kopuk kalsın: odada kalır, yarışta misketini bot sürer
    const c2Marble = C2.start.benim; C2.close(); await sleep(600);
    ok('kopan oyuncu lobide odadan atılmaz', A2.room.oyuncular.some(o => o.pid === C2.pid && !o.bagli));
    const nB = B.msgs.filter(m => m.t === 'basla').length, tStart = Date.now();
    A2.send({ t: 'baslat', parkur: trackId + 1, neden: 'sonraki' }); await sleep(300);
    ok('kurucu başlatınca herkese 3 sn geri sayım', A2.room.basliyor > 2000 && A2.room.basliyor <= 3000 && B.room.basliyor > 2000 && B.room.parkur === trackId + 1, `kalan ${B.room.basliyor} ms`);
    A2.send({ t: 'parkur', id: 50 }); await sleep(200);
    ok('geri sayımda parkur değişmez', B.room.parkur === trackId + 1);
    await B.wait(() => B.msgs.filter(m => m.t === 'basla').length > nB, 6000); const st2 = B.msgs.filter(m => m.t === 'basla').pop();
    const waited = (Date.now() - tStart) / 1000;
    ok('geri sayım bitince sonraki parkurla başladı', st2.parkur === trackId + 1 && waited >= 2.8 && waited < 4.5, `parkur ${st2.parkur}, ${waited.toFixed(1)} sn sonra`);
    ok('kopuk oyuncu yarışçı listesinde, misketini bot sürüyor', !!st2.yarisanlar[c2Marble]);
    await sleep(2500);
    ok('kopuk oyuncunun misketi bot', !humanFlags(B.lastSnap).includes(c2Marble) && humanFlags(B.lastSnap).length === 2, 'insan: ' + humanFlags(B.lastSnap).join(','));
    // yarışı bırakan odada kalır, isterse geri döner
    const bMarble = st2.benim; B.send({ t: 'yaristanCik' }); await sleep(600);
    ok('yarışı bırakan odada kalır, misketini bot sürer', !humanFlags(A2.lastSnap).includes(bMarble) && A2.room.oyuncular.find(o => o.pid === B.pid).izleyici === true);
    const nB2 = B.msgs.filter(m => m.t === 'basla').length; B.send({ t: 'yarisaDon' });
    await B.wait(() => B.msgs.filter(m => m.t === 'basla').length > nB2, 3000); await sleep(600);
    ok('yarışa dönünce misketini geri alır', humanFlags(A2.lastSnap).includes(bMarble) && B.msgs.filter(m => m.t === 'basla').pop().benim === bMarble);
    for (const c of [A2, B]) c.close();

    console.log('1b) Misafir adları');
    const G1 = new Client('Misafir321', 3); await G1.hello(); const h1 = G1.msgs.find(m => m.t === 'hosgeldin');
    ok('misafir kendi adıyla görünür', h1.ad === 'Misafir321');
    G1.send({ t: 'merhaba', ad: 'Can Kardeş', acik: 3 }); await sleep(300);
    ok('misafir adını değiştirebilir (şifresiz)', G1.msgs.filter(m => m.t === 'hosgeldin').pop().ad === 'Can Kardeş');
    G1.close();
    // kayıtlı bir adı şifresiz (oturumsuz) alamaz
    const reg = await (await fetch(`http://127.0.0.1:${PORT}/api/kayit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: 'Kayıtlı Ece', pin: '1357' }) })).json();
    const G2 = new Client('kayıtlı ece', 3); await G2.hello(); const h2 = G2.msgs.find(m => m.t === 'hosgeldin');
    ok('misafir kayıtlı bir oyuncunun adını alamaz', /^Misafir\d{3}$/.test(h2.ad), h2.ad); G2.close();
    const G3 = new Client('Kayıtlı Ece', 3); await G3.open; G3.send({ t: 'merhaba', ad: 'Kayıtlı Ece', acik: 3, token: reg.token }); await G3.wait(m => m.t === 'hosgeldin');
    ok('hesabın sahibi (oturumla) kendi adını kullanır', G3.msgs.find(m => m.t === 'hosgeldin').ad === 'Kayıtlı Ece'); G3.close();

    console.log('2) Hızlı oyun: tek oyuncu, süre dolunca botlarla');
    const Q = new Client('Hızlı', 7); await Q.hello(); Q.send({ t: 'hizli' });
    const q0 = await Q.wait(m => m.t === 'oda');
    ok('hızlı oda açıldı', q0.hizli && q0.bekleme > 0, `bekleme ${q0.bekleme} sn, parkur ${q0.parkur}`);
    const st = await Q.wait(m => m.t === 'basla', 30000);
    ok('süre dolunca 3 sn geri sayımla başladı', !!st && Q.msgs.some(m => m.t === 'oda' && m.basliyor > 0), `parkur ${st.parkur}`);
    Q.send({ t: 'ayril' }); await sleep(500);
    await sleep(1500);
    ok('herkes ayrılınca yarış botlarla bitmeden de devam/temizlenir', true);
    Q.close();
    console.log('3) Hızlı oyun: açık oda yoksa ilk gelen parkuru seçer');
    const K = new Client('Kurucu', 1), L = new Client('Gelen', 1); await K.hello(); await L.hello();
    K.send({ t: 'hizli', sec: true });
    ok('açık hızlı oda yokken parkur seçmesi isteniyor', !!(await K.wait(m => m.t === 'hizliSec')) && !K.room);
    K.send({ t: 'hizli', sec: true, parkur: 120 });
    const k0 = await K.wait(m => m.t === 'oda');
    ok('seçtiği parkurla hızlı oda kuruldu (açmadığı parkur da olur)', k0.hizli && k0.parkur === 120 && k0.secildi && k0.kurucu === K.pid, `parkur ${k0.parkur}`);
    L.send({ t: 'hizli', sec: true }); const l0 = await L.wait(m => m.t === 'oda');
    ok('sonra gelen seçim yapmadan aynı odaya katılıyor', l0.kod === k0.kod && !L.msgs.some(m => m.t === 'hizliSec'), l0.kod);
    K.send({ t: 'parkur', id: 77 }); await sleep(300);
    ok('hızlı odayı kuran beklerken parkuru değiştirebiliyor', L.room.parkur === 77, `parkur ${L.room.parkur}`);
    L.send({ t: 'parkur', id: 5 }); await sleep(300);
    ok('kurucu olmayan değiştiremiyor', K.room.parkur === 77);
    ok('hızlı oda varsayılan klasik', K.room.mod === 'klasik');
    L.send({ t: 'mod', m: 'biriktir' }); await sleep(200);
    ok('hızlı odada ilk giren olmayan modu değiştiremez', K.room.mod === 'klasik');
    K.send({ t: 'mod', m: 'biriktir' }); await sleep(200);
    ok('hızlı odada ilk giren modu seçer', L.room.mod === 'biriktir');
    for (const c of [K, L]) { c.send({ t: 'ayril' }); c.close(); }
    await sleep(500);
    const Q2 = new Client('HızlıB', 1); await Q2.hello(); Q2.send({ t: 'hizli', sec: true, parkur: 4, mod: 'biriktir' });
    ok('hızlı odayı kurarken mod seçilir', (await Q2.wait(m => m.t === 'oda')).mod === 'biriktir');
    Q2.send({ t: 'ayril' }); Q2.close(); await sleep(300);

    console.log('4) Biriktir modu: kart çantaya girer, istenince kullanılır');
    const M1 = new Client('Mert', 3), M2 = new Client('Ece', 3); await M1.hello(); await M2.hello();
    M1.send({ t: 'odaKur' }); const m0 = await M1.wait(m => m.t === 'oda');
    ok('oda varsayılan klasik', m0.mod === 'klasik');
    M2.send({ t: 'katil', kod: m0.kod }); await sleep(300);
    M2.send({ t: 'mod', m: 'biriktir' }); await sleep(200);
    ok('kurucu olmayan modu değiştiremez', M1.room.mod === 'klasik');
    M1.send({ t: 'mod', m: 'biriktir' }); await sleep(200);
    ok('kurucu modu değiştirir, herkes görür', M2.room.mod === 'biriktir');
    M1.send({ t: 'mod', m: 'saçma' }); await sleep(200);
    ok('bilinmeyen mod klasiğe döner', M2.room.mod === 'klasik');
    M1.send({ t: 'mod', m: 'biriktir' }); await sleep(200);
    M1.send({ t: 'parkur', id: 3 }); M1.send({ t: 'baslat' });
    const ms = await M1.wait(m => m.t === 'basla', 8000);
    ok('başla mesajında mod var', ms.mod === 'biriktir');
    await M1.wait(m => m.t === 'el', 30000);
    M1.send({ t: 'kart', k: 1 });
    const c1 = await M1.wait(m => m.t === 'canta' && m.cards.length === 1, 3000);
    const myPower = () => M1.events.filter(e => e.type === 'power' && e.id === ms.benim);
    await sleep(500);
    ok('seçilen kart çantaya girdi, kullanılmadı', c1.cards.length === 1 && myPower().length === 0, c1.cards.join(','));
    M2.send({ t: 'kullan', i: 0 }); await sleep(300);
    ok('başkasının çantası kullanılamaz', !M1.msgs.some(m => m.t === 'canta' && m.cards.length === 0));
    M1.send({ t: 'kullan', i: 0 });
    await M1.wait(m => m.t === 'canta' && m.cards.length === 0, 3000); await sleep(600);
    ok('çantadaki kart kullanılınca güç olayı geldi', myPower().length === 1 && myPower()[0].power === c1.cards[0], myPower().map(e => e.power).join(','));
    ok('çanta başkasına gönderilmez (kart seçmeyen çanta mesajı almaz)', !M2.msgs.some(m => m.t === 'canta'));
    for (const c of [M1, M2]) { c.send({ t: 'ayril' }); c.close(); }
    await sleep(500);
    const d = await (await fetch(`http://127.0.0.1:${PORT}/durum`)).json();
    ok('/durum çalışıyor', d.ok === true, JSON.stringify(d));
  } catch (e) { fail++; console.log('  ✗ HATA', e.message); }
  srv.kill('SIGTERM');
  if (/hatası/.test(srvLog)) { fail++; console.log('  ✗ sunucu günlüğünde hata:\n' + srvLog.split('\n').filter(l => /hatası|Error/.test(l)).slice(0, 5).join('\n')); }
  await sleep(600); try { fs.rmSync(VERI, { recursive: true, force: true }); } catch (e) { } // sunucu kapanırken son kaydı yazar
  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
})();
