// Yeni hareketli engellerin testi: her engel tek başına bir deneme parkurunda; takılma, düşme ve geçiş süresi
const path = require('path'); const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;
const N = +process.argv[2] || 10;
const PIECES = {
  kazik: b => b.kaziklar({ len: 15 }), sarkac: b => b.sarkac({ len: 16 }), bantGeri: b => b.bant({ len: 14, dir: -1 }), bantIleri: b => b.bant({ len: 14, dir: 1 }),
  tabla: b => b.tabla({ len: 12 }), kapi: b => b.kapi({ len: 12 }), dusus: b => b.dusus({ fall: 5 }),
};
RAPIER.init().then(() => {
  for (const [name, fn] of Object.entries(PIECES)) {
    const b = new MP.Builder({ y0: 100 }); b.start(); b.straight({ len: 12, drop: 1.2 });
    const s0 = b.s; fn(b); const s1 = b.s; fn(b); const s2 = b.s; b.straight({ len: 12, drop: 1.2 }); b.finish();
    const tr = b.finalize({ id: 900, name, target: 40 });
    let stuck = 0, fall = 0, tsum = 0, fin = 0;
    for (let r = 0; r < N; r++) {
      const race = new MF.Race(RAPIER, tr, {}); new MG.PowerSystem(race, { playerId: -1, firstAt: 1e9 }); race.openGate();
      const enter = {}, leave = {};
      while (!race.done) { race.step(0.1); for (const m of race.marbles) { if (enter[m.id] == null && m.bestS >= s0) enter[m.id] = race.t; if (leave[m.id] == null && m.bestS >= s2) leave[m.id] = race.t; } }
      for (const e of race.events) if (e.type === 'respawn') { if (e.why === 'stuck') stuck++; else fall++; }
      for (const m of race.marbles) if (leave[m.id] != null && enter[m.id] != null) { tsum += leave[m.id] - enter[m.id]; fin++; }
      race.dispose();
    }
    console.log(`${name.padEnd(10)} takılma ${(stuck / N).toFixed(2)}/yarış · düşme ${(fall / N).toFixed(2)}/yarış · iki parça geçiş ${(tsum / Math.max(1, fin)).toFixed(1)} sn (${(s2 - s0).toFixed(0)} m)`);
  }
});
