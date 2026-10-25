// Misket Yarışı — huni testi: misketler huniye girerken karşı duvarın üstüne çıkıyor / dışarı uçuyor mu?
// Kullanım: node test/huni-testi.js [parkur sayısı=24] [her parkurda yarış=3] [ozel]  ('ozel': elle yapılmış 12 parkur)
// Ayar denemek için: HUNI='{"olcek":1.4,"ileri":0.3,"yan":0.4}' node test/huni-testi.js
const path = require('path'); const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;
if (process.env.HUNI) Object.assign(MP.HUNI, JSON.parse(process.env.HUNI));
const NTR = +process.argv[2] || 24, N = +process.argv[3] || 3, ozel = process.argv.includes('ozel');
RAPIER.init().then(() => {
  const ids = [];
  if (ozel) ids.push(...MP.TRACKS.filter(t => t.hand).map(t => t.id));
  else for (let id = 4; id <= 200 && ids.length < NTR; id += 3) { const tr = MP.buildTrack(id); if (!tr.special && tr.zones.length) ids.push(id); }
  let entries = 0, over = 0, out = 0, resp = 0;
  for (const id of ids) {
    const tr = MP.buildTrack(id), fz = tr.decor.filter(d => d.type === 'funnel');
    for (let r = 0; r < N; r++) {
      const race = new MF.Race(RAPIER, tr, {}); new MG.PowerSystem(race, { playerId: -1 }); race.openGate();
      const st = race.marbles.map(() => tr.zones.map(() => ({ seen: false, over: false, out: false })));
      while (!race.done) {
        race.step(1 / 30);
        for (const m of race.marbles) {
          const p = m.body.translation();
          tr.zones.forEach((z, k) => {
            const d = fz[k], rr = Math.hypot(p.x - z.c[0], p.z - z.c[2]), S = st[m.id][k];
            if (m.s < z.s0 - 6 || m.s > z.s1) return;
            if (rr < z.R && p.y < d.yRim + d.wallH + 1 && !S.seen) S.seen = true;
            if (!S.seen) return;
            if (rr > z.R - 0.6 && p.y - 0.5 > d.yRim + d.wallH - 0.3) S.over = true; // duvarın tepesine çıktı
            if (rr > z.R + 0.3 && p.y > d.yRim - 1) S.out = true;                     // duvarın dışına geçti
          });
        }
        for (const e of race.events) if (e.type === 'respawn' && tr.zones.some(z => e.s > z.s0 - 6 && e.s < z.s1 + 2)) resp++;
        race.events.length = 0;
      }
      for (const a of st) for (const S of a) if (S.seen) { entries++; if (S.over) over++; if (S.out) out++; }
      race.dispose();
    }
  }
  console.log(`${ids.length} parkur, ${entries} huni girişi: duvar üstüne çıkan %${(100 * over / entries).toFixed(1)} | dışarı geçen %${(100 * out / entries).toFixed(1)} | huni çevresinde yola geri konma ${resp}`);
  console.log('(Yer Değiştir gücüyle huninin üstündeki yola konan misket de "dışarı" sayılabilir: küçük oranlar normal)');
});
