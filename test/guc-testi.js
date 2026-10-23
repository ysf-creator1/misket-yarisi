// Misket Yarışı — güç denge testi
// Oyuncunun misketi (0) her kart turunda belirli bir gücü seçer (kartlarında yoksa zorla verilir).
// Her güç için ortalama bitiş sırası, kendine zarar (kendi gücünden sonra yola geri konma) ölçülür.
// Kullanım: node test/guc-testi.js [parkurNo] [yarışSayısı]
const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'rapier.js'));
require(path.join(root, 'js/parcalar.js'));
require(path.join(root, 'js/parkurlar.js'));
require(path.join(root, 'js/dunyalar.js'));
require(path.join(root, 'js/fizik.js'));
require(path.join(root, 'js/guclar.js'));
const { MP, MF, MG, RAPIER } = globalThis;
const tid = +process.argv[2] || 1, N = +process.argv[3] || 12;

RAPIER.init().then(() => {
  const tr = MP.buildTrack(tid);
  console.log(`Parkur ${tid}: ${tr.name} — her satır ${N} yarış. Sıra 1 = en iyi. (6 misket, rakipler bot)`);
  const only = process.argv[4] ? process.argv[4].split(',') : null; // ör: yavas,bomba
  const list = ['(güç yok)'].concat(MG.POWERS.map(p => p.id)).filter(x => !only || only.includes(x));
  for (const pid of list) {
    let sumPlace = 0, selfHarm = 0, resp = 0, uses = 0;
    for (let r = 0; r < N; r++) {
      const race = new MF.Race(RAPIER, tr, {});
      const ps = new MG.PowerSystem(race, { playerId: 0 });
      race.openGate();
      let lastUse = -99;
      while (!race.done) {
        race.step(0.1);
        const h = ps.handOf(0);
        if (h && pid !== '(güç yok)') { h.cards[0] = pid; ps.choose(0, 0); lastUse = race.t; uses++; }
        else if (h) { h.used = true; }
        for (const e of race.events) if (e.type === 'respawn' && e.id === 0) { resp++; if (race.t - lastUse < 4) selfHarm++; }
        race.events.length = 0;
      }
      sumPlace += race.marbles[0].place;
      race.dispose();
    }
    console.log(`  ${pid.padEnd(10)} ort. sıra ${(sumPlace / N).toFixed(2)} | yola geri konma ${(resp / N).toFixed(2)}/yarış | gücünden hemen sonra ${(selfHarm / N).toFixed(2)}/yarış | kullanım ${(uses / N).toFixed(1)}/yarış`);
  }
});
