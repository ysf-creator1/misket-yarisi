// Misket Yarışı — ekransız parkur testi
// Kullanım: node test/parkur-testi.js [parkurNo|hepsi] [yarışSayısı]
// Her parkuru simüle eder: süre hedefe yakın mı, misketler takılıyor/düşüyor mu, kazananlar dengeli mi.
const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'rapier.js'));
require(path.join(root, 'js/parcalar.js'));
require(path.join(root, 'js/parkurlar.js'));
require(path.join(root, 'js/dunyalar.js'));
require(path.join(root, 'js/fizik.js'));
require(path.join(root, 'js/guclar.js'));
const { MP, MF, MG, RAPIER } = globalThis;
const withPowers = process.argv.includes('-g');

const arg = process.argv[2] || 'hepsi';
const N = process.argv[3] != null ? +process.argv[3] : 20;
const verbose = process.argv.includes('-v');
const powerCount = {};

function overlapCheck(track) {
  // parkurun kendisiyle çakıştığı yerler (farklı bölümler birbirine çok yakın mı)
  const S = track.samples.filter((s, i) => i % 2 === 0);
  const bad = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (Math.abs(a.s - b.s) < 25) continue;
    const dy = Math.abs(a.p[1] - b.p[1]), dh = Math.hypot(a.p[0] - b.p[0], a.p[2] - b.p[2]);
    if (dy < 3.2 && dh < a.hw + b.hw + 0.8) bad.push([a.s.toFixed(0), b.s.toFixed(0), dh.toFixed(1), dy.toFixed(1)]);
  }
  return bad;
}

// durgun misket testi: parkurun her ~8 m'sine duran bir misket koy, ilerleyebiliyor mu? (çukurları bulur)
function stillTest(tr) {
  const bad = [];
  const pts = tr.samples.filter(q => q.safe && q.s > 2 && q.s < tr.finishS - 4);
  let last = -1e9;
  for (const sm of pts) {
    if (sm.s - last < 4) continue; last = sm.s;
    const race = new MF.Race(RAPIER, tr, {}); race.openGate();
    const m = race.marbles[0];
    for (const o of race.marbles.slice(1)) o.body.setTranslation({ x: 0, y: -900, z: 0 }, true);
    m.body.setTranslation({ x: sm.p[0], y: sm.p[1] + 0.05, z: sm.p[2] }, true); m.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    m.s = sm.s; m.bestS = sm.s;
    race._respawn = () => { }; m.lastGain = 0; m.anchor = null;
    for (let i = 0; i < 120 * 6; i++) race._sub();
    if (m.bestS - sm.s < 6) bad.push(sm.s.toFixed(0) + (sm.lane ? 'k' + sm.lane : ''));
    race.dispose();
  }
  return bad;
}

const pieceOfS = (tr, sv) => { let k = '?'; for (const q of tr.pieceAt || []) if (q.s <= sv) k = q.k; return k; };

RAPIER.init().then(() => {
  // hepsi | ornek (her 10. parkur + özel parkurlar) | ozel | 5 | 10-30
  const ids = arg === 'hepsi' ? MP.TRACKS.map(t => t.id)
    : arg === 'ornek' ? MP.TRACKS.filter(t => t.id % 10 === 5 || t.id === 1 || t.id === 200).map(t => t.id)
      : arg === 'ozel' ? MP.TRACKS.filter(t => t.hand).map(t => t.id)
        : arg.includes('-') ? MP.TRACKS.filter(t => t.id >= +arg.split('-')[0] && t.id <= +arg.split('-')[1]).map(t => t.id) : [+arg];
  const ratios = [];
  const skipStill = process.argv.includes('-h'); // hızlı: durgun misket testini atla
  for (const id of ids) {
    const tr = MP.buildTrack(id);
    const tris = tr.meshes.reduce((a, m) => a + m.i.length / 3, 0);
    console.log(`\n=== Parkur ${id}${tr.special ? ' (özel)' : ''}: ${tr.name} — hedef ${tr.target} sn, uzunluk ${tr.finishS.toFixed(0)}, ${tris} üçgen, ${tr.prims.length} engel, iniş ${(tr.bounds.maxY - tr.bounds.minY).toFixed(0)}`);
    if (tr.warnings.length) console.log('  ! UYARI', tr.warnings.join(' | '));
    const still = skipStill ? [] : stillTest(tr);
    const pieceOf = sv => { let k = '?'; for (const q of tr.pieceAt || []) if (q.s <= sv) k = q.k; return k; };
    if (still.length) console.log('  ! ÇUKUR (duran misket ilerleyemiyor) s:', still.map(x => x + '(' + pieceOf(parseFloat(x)) + ')').join(' '));
    if (N === 0) continue;
    const ov = overlapCheck(tr);
    if (ov.length) console.log('  ! ÇAKIŞMA', ov.length, 'nokta, ör:', ov.slice(0, 5).map(x => x.join('/')).join('  '));
    const wins = [0, 0, 0, 0, 0, 0], slotWins = [0, 0, 0, 0, 0, 0];
    let tW = [], t3 = [], tEnd = [], resp = { fall: 0, stuck: 0 }, respAt = {}, unfinished = 0, backTotal = 0; const backKinds = {};
    const t0 = Date.now();
    for (let r = 0; r < N; r++) {
      const race = new MF.Race(RAPIER, tr, {});
      if (withPowers) new MG.PowerSystem(race, { playerId: -1 });
      for (let k = 0; k < 120; k++) race.step(1 / 60);
      race.openGate();
      const hist = race.marbles.map(() => []), lastResp = {};
      while (!race.done) {
        race.step(0.1);
        for (const e of race.events) if (e.type === 'respawn') lastResp[e.id] = race.t;
        // geri kayma: 1 sn içinde 3 m'den fazla geri (rüzgâr, bomba, yola geri konma hariç)
        for (const m of race.marbles) {
          const h = hist[m.id]; h.push(m.s); if (h.length > 10) h.shift();
          const fx = m.fx || {}, back = Math.max(...h) - m.s;
          if (back > 3 && !m.finished && !(fx.wind > race.t - 1.5) && !(fx.stun > race.t - 1.5) && !(race.t - (lastResp[m.id] || -9) < 1.5) && !m._backCounted) {
            m._backCounted = true; backTotal++; const kk = ((m.lastSample && m.lastSample.kind) || pieceOfS(tr, m.s)) + '@' + Math.round(m.s / 10) * 10; backKinds[kk] = (backKinds[kk] || 0) + 1;
          }
          if (back < 0.5) m._backCounted = false;
        }
      }
      for (const e of race.events) if (e.type === 'respawn') {
        resp[e.why]++;
        const key = Math.round(e.s / 10) * 10; respAt[key] = (respAt[key] || 0) + 1;
      }
      for (const e of race.events) if (e.type === 'power') powerCount[e.power] = (powerCount[e.power] || 0) + 1;
      const o = race.finishOrder;
      wins[o[0].id]++; slotWins[o[0].slot]++;
      tW.push(o[0].finishTime); if (o[2].finishTime) t3.push(o[2].finishTime);
      unfinished += race.marbles.filter(m => !m.finished).length;
      tEnd.push(race.t);
      if (verbose) console.log('  yarış', r + 1, o.map(m => `${m.info.name.split(' ')[0]}${m.finishTime ? ' ' + m.finishTime.toFixed(1) : ' -'}`).join(' | '), ' geri:', race.marbles.map(m => m.respawns).join(','));
      race.dispose();
    }
    const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : NaN;
    ratios.push(avg(tW) / tr.target);
    console.log(`  1. süresi ort ${avg(tW).toFixed(1)} sn (min ${Math.min(...tW).toFixed(1)}, max ${Math.max(...tW).toFixed(1)}) | 3. ort ${avg(t3).toFixed(1)} | yarış sonu ort ${avg(tEnd).toFixed(1)}`);
    console.log(`  geri dönüş / yarış: düşme ${(resp.fall / N).toFixed(2)}, takılma ${(resp.stuck / N).toFixed(2)} | bitiremeyen/yarış ${(unfinished / N).toFixed(2)}`);
    console.log(`  geri kayma / yarış: ${(backTotal / N).toFixed(2)}`, Object.keys(backKinds).length ? JSON.stringify(backKinds) : '');
    console.log('  geri dönüş yerleri (s):', Object.entries(respAt).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ':' + v).join(' '));
    if (withPowers) { console.log('  güç kullanımı / yarış:', Object.entries(powerCount).map(([k, v]) => k + ':' + (v / N).toFixed(1)).join(' ')); for (const k in powerCount) delete powerCount[k]; }
    if (ids.length > 1 && id === ids[ids.length - 1]) { const m = ratios.reduce((a, b) => a + b, 0) / ratios.length; console.log(`\nGERÇEK/HEDEF süre oranı: ort ${m.toFixed(3)}, en düşük ${Math.min(...ratios).toFixed(2)}, en yüksek ${Math.max(...ratios).toFixed(2)}`); }
    console.log('  kazanan misket:', wins.join(' '), '| kazanan kulvar:', slotWins.join(' '), `| ${((Date.now() - t0) / N).toFixed(0)} ms/yarış`);
  }
});
