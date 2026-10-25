// Misket Yarışı — yarış dengesi testi (final sürprizleri ne kadar işe yarıyor?)
// Yarı yolda lider olan misket ne sıklıkla kazanıyor, yarı yolda sonuncu olan ne sıklıkla kazanıyor?
// Kullanım: node test/denge-testi.js [parkurlar: 25,75,125] [her parkur için yarış sayısı] ['{"lastikBas":18,...}' MG.DENGE'yi değiştir]
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;
const ids = (process.argv[2] || '25,75,125').split(',').map(Number), N = +process.argv[3] || 20;
if (process.argv[4]) Object.assign(MG.DENGE, JSON.parse(process.argv[4]));

RAPIER.init().then(() => {
  let races = 0, leadWin = 0, lastWin = 0, gapSum = 0, bigGap = 0, bigGapWin = 0, finGap = 0, lead75Win = 0, lastSec = 0;
  for (const id of ids) {
    const tr = MP.buildTrack(id);
    for (let k = 0; k < N; k++) {
      const race = new MF.Race(RAPIER, tr, {});
      new MG.PowerSystem(race, { playerId: -1 });
      race.openGate();
      let half = null, q3 = null;
      while (!race.done) {
        race.step(0.1);
        if (!half && race.leader().s > tr.finishS * 0.5) { const st = race.standings(); half = { lead: st[0].id, last: st[st.length - 1].id, gap: st[0].s - st[1].s }; }
        if (!q3 && race.leader().s > tr.finishS * 0.75) q3 = race.standings()[0].id;
      }
      const win = race.finishOrder[0].id, fo = race.finishOrder;
      if (fo[1].finishTime) finGap += fo[1].finishTime - fo[0].finishTime; if (q3 === win) lead75Win++;
      const fins = fo.filter(m => m.finishTime); lastSec += fins[fins.length - 1].finishTime - fo[0].finishTime;
      races++; if (half) { if (win === half.lead) leadWin++; if (win === half.last) lastWin++; gapSum += half.gap; if (half.gap > 15) { bigGap++; if (win === half.lead) bigGapWin++; } }
      race.dispose();
    }
  }
  const pc = x => (100 * x / races).toFixed(0) + '%';
  console.log(`${races} yarış (parkurlar ${ids.join(',')}): yarı yolda lider kazandı ${pc(leadWin)} | yarı yolda sonuncu kazandı ${pc(lastWin)} | ort. fark ${(gapSum / races).toFixed(1)} m | fark >15 m iken lider kazandı ${bigGap ? (100 * bigGapWin / bigGap).toFixed(0) + '%' : '-'} (${bigGap} yarış) | %75'te lider kazandı ${pc(lead75Win)} | 1.–2. bitiş farkı ort ${(finGap / races).toFixed(2)} sn | sonuncu bitirenin farkı ort ${(lastSec / races).toFixed(1)} sn`);
});
