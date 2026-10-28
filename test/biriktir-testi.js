// Misket Yarışı — Biriktir modu testi
// Çanta kuralları (en fazla 5 kart, kullanım arası bekleme, bitişe yakın Yer Değiştir yok), botların çantayı kullanması
// ve hiç kart seçmeyen misketin sonucu (klasik ile karşılaştırma).
// Kullanım: node test/biriktir-testi.js [her mod için yarış sayısı=18]
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;
const N = +process.argv[2] || 18;
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (info ? '  (' + info + ')' : '')); };
const run = (race, sec) => { for (let i = 0; i < sec * 120 && !race.done; i++) race._sub(); };

RAPIER.init().then(() => {
  const tr = MP.buildTrack(15);
  console.log('Çanta kuralları');
  {
    const race = new MF.Race(RAPIER, tr, {});
    const ps = new MG.PowerSystem(race, { humans: [0], mode: 'biriktir', firstAt: 1e9 }); ps.finalDone = true;
    race.openGate(); run(race, 1);
    ok('mod biriktir', ps.mode === 'biriktir');
    // 6 kart seçmeye çalış: 5'i çantaya girer, 6. girmez
    let took = 0;
    for (let k = 0; k < 6; k++) { ps.hands[0] = { cards: ['turbo', 'kalkan', 'yavas'], dealt: race.t, expires: race.t + 15, botAt: 1e9, used: false }; if (ps.choose(0, k % 3)) took++; }
    ok('çanta en fazla 5 kart alır', took === 5 && ps.bagOf(0).length === 5, took + ' kart');
    const bagEv = race.events.filter(e => e.type === 'bag' && e.id === 0);
    ok('her seçimde çanta bildirimi gider', bagEv.length === 5 && bagEv[4].cards.length === 5);
    // dolu çantaya kart dağıtılmaz
    race.events.length = 0; ps._deal();
    ok('çanta doluyken kart gelmez', !race.events.some(e => e.type === 'hand' && e.id === 0));
    ok('seçmek kartı kullanmaz', !race.events.some(e => e.type === 'power' && e.id === 0) && !(race.marbles[0].fx.turbo > race.t));
    // kullan
    race.events.length = 0;
    const first = ps.bagOf(0)[0];
    ok('çantadaki kart kullanılır', ps.use(0, 0) && race.events.some(e => e.type === 'power' && e.id === 0 && e.power === first) && ps.bagOf(0).length === 4);
    ok('hemen ikinci kullanım beklemede', !ps.use(0, 0));
    run(race, MG.BAG.cd + 0.1);
    ok('bekleme bitince kullanılır', ps.use(0, 0) && ps.bagOf(0).length === 3);
    // Yer Değiştir bitişe yakın kullanılamaz
    ps.bags[0] = ['takas']; ps.lastUse[0] = -9;
    const m = race.marbles[0], sOld = m.s; m.s = tr.finishS * 0.95;
    ok('Yer Değiştir son %10\'da kullanılamaz', !ps.canUse(0, 0));
    m.s = sOld;
    ok('Yer Değiştir yarış ortasında kullanılır', ps.canUse(0, 0));
    ok('klasik modda use çalışmaz', !new MG.PowerSystem(new MF.Race(RAPIER, tr, {}), { humans: [0] }).use(0, 0));
    race.dispose();
  }

  // botlar çantayı kullanıyor mu, hiç seçmeyen misket nerede bitiriyor (klasik ile karşılaştırma)
  console.log(`Yarışlar (her mod ${N} yarış; misket 0 hiç kart seçmez, diğerleri bot)`);
  const tracks = [3, 15, 40, 70, 100, 140].map(id => MP.buildTrack(id));
  const res = {};
  for (const mode of ['klasik', 'biriktir']) {
    let sum = 0, top3 = 0, botUses = 0, maxBag = 0, stuckFull = 0;
    for (let k = 0; k < N; k++) {
      const race = new MF.Race(RAPIER, tracks[k % tracks.length], {});
      const ps = new MG.PowerSystem(race, { humans: [0], mode });
      race.openGate();
      while (!race.done) {
        race.step(0.1);
        for (const e of race.events) if (e.type === 'power' && e.id !== 0) botUses++;
        race.events.length = 0;
        if (mode === 'biriktir') for (let i = 1; i < 6; i++) maxBag = Math.max(maxBag, ps.bagOf(i).length);
      }
      if (mode === 'biriktir') for (let i = 1; i < 6; i++) if (ps.bagOf(i).length >= MG.BAG.size) stuckFull++;
      sum += race.marbles[0].place; if (race.marbles[0].place <= 3) top3++;
      race.dispose();
    }
    res[mode] = { avg: sum / N, top3: top3 / N, botUses: botUses / N / 5 };
    console.log(`  ${mode.padEnd(8)} boştaki ort. sıra ${(sum / N).toFixed(2)} | ilk 3: ${(100 * top3 / N).toFixed(0)}% | bot başına kart ${(botUses / N / 5).toFixed(1)}` + (mode === 'biriktir' ? ` | en dolu çanta ${maxBag} | yarış sonu dolu kalan bot ${stuckFull}` : ''));
    if (mode === 'biriktir') {
      ok('botlar çantadaki kartları kullanır', res.biriktir.botUses >= 3, res.biriktir.botUses.toFixed(1) + ' kart/yarış');
      ok('çanta 5\'i aşmaz', maxBag <= MG.BAG.size);
    }
  }
  ok('biriktirde de hiç seçmeyen geride kalır', res.biriktir.avg >= 4, res.biriktir.avg.toFixed(2));
  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
});
