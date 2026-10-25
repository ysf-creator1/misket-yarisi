// Misket Yarışı — güç senaryo testleri (her gücün istenen davranışı)
// Kullanım: node test/guc-senaryo.js
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;

function testTrack() {
  const b = new MP.Builder({ y0: 100 });
  b.start(); b.straight({ len: 14, drop: 1.4 });          // düz (duvar testi)
  const sBump = b.s; b.bumpers({ len: 14 });             // çarpma direkleri
  b.straight({ len: 8, drop: 0.8 });
  const sPeg = b.s; b.pegs({ len: 14 });                 // çivi tahtası (hayalet testi)
  b.straight({ len: 20, drop: 2 });
  b.finish();
  const tr = b.finalize({ id: 999, name: 'senaryo', target: 60 }); tr.sBump = sBump; tr.sPeg = sPeg; return tr;
}
const sampleAt = (tr, s) => tr.samples.find(q => q.lane === 0 && q.s >= s);
function setup(tr) {
  const race = new MF.Race(RAPIER, tr, {}); const ps = new MG.PowerSystem(race, { playerId: -1, firstAt: 1e9 });
  race.openGate();
  for (const m of race.marbles) { m.body.setTranslation({ x: 0, y: -500 - m.id * 5, z: 0 }, true); m.body.setLinvel({ x: 0, y: 0, z: 0 }, true); m.body.setGravityScale(0, true); }
  race._respawn = (m, why) => { race.events.push({ type: 'respawn', id: m.id, why }); }; // test: yola koymadan say
  return { race, ps };
}
function place(race, m, tr, s, lat, speed) {
  const sm = sampleAt(tr, s); m.body.setGravityScale(1, true);
  m.body.setTranslation({ x: sm.p[0] + sm.R[0] * lat, y: sm.p[1] + 0.05, z: sm.p[2] + sm.R[2] * lat }, true);
  m.body.setLinvel({ x: sm.T[0] * speed, y: sm.T[1] * speed, z: sm.T[2] * speed }, true); m.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  m.s = sm.s; m.bestS = sm.s; m.lastSample = sm; m.anchor = null; m.lastGain = race.t;
}
const run = (race, sec) => { for (let i = 0; i < sec * 120; i++) race._sub(); };
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (info ? '  (' + info + ')' : '')); };

RAPIER.init().then(() => {
  const tr = testTrack();
  // 1) zıplama duvarı aşar
  {
    let over = 0, N = 12;
    for (let k = 0; k < N; k++) {
      const { race, ps } = setup(tr), a = race.marbles[0], o = race.marbles[1];
      place(race, a, tr, 10, (k % 3 - 1) * 0.6, 5); place(race, o, tr, 14, 0, 0);
      ps.activate(o, 'duvar'); // o'nun önüne değil: a için sahte duvar — duvarı a'nın 4 m önüne taşı
      const w = ps.walls[0]; if (w) { race.world.removeCollider(w.col, true); ps.walls.length = 0; }
      o.body.setTranslation({ x: 0, y: -600, z: 0 }, true); o.body.setGravityScale(0, true);
      // duvarı a'nın önüne kur
      a.s = 10; const fakeTarget = { s: 10, lastSample: sampleAt(tr, 10) }; const pt = ps._ahead(fakeTarget, 4.5);
      const half = [pt.hw + 0.05, 0.75, 0.18], q = MP.quatFromBasis(pt.R, pt.U, MP.v.cross(pt.R, pt.U)), p0 = [pt.p[0] + pt.U[0] * 0.25, pt.p[1] + pt.U[1] * 0.25, pt.p[2] + pt.U[2] * 0.25];
      race.world.createCollider(RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2]).setTranslation(p0[0], p0[1], p0[2]).setRotation(q));
      run(race, 0.25); ps.activate(a, 'zipla'); run(race, 2.5);
      if (a.s > pt.s + 2) over++;
      race.dispose();
    }
    ok('Zıplama Engel Duvarı\'nın üstünden aşıyor', over >= N * 0.8, `${over}/${N}`);
  }
  // 1b) duvarın dibinde dururken zıplayınca aşar
  {
    let over = 0, N = 9;
    for (let k = 0; k < N; k++) {
      const { race, ps } = setup(tr), a = race.marbles[0];
      place(race, a, tr, 10, (k % 3 - 1) * 0.6, 0);
      const fakeTarget = { s: 10, lastSample: sampleAt(tr, 10) }; const pt = ps._ahead(fakeTarget, 0.85);
      const half = [pt.hw + 0.05, 0.75, 0.18], q = MP.quatFromBasis(pt.R, pt.U, MP.v.cross(pt.R, pt.U)), p0 = [pt.p[0] + pt.U[0] * 0.25, pt.p[1] + pt.U[1] * 0.25, pt.p[2] + pt.U[2] * 0.25];
      race.world.createCollider(RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2]).setTranslation(p0[0], p0[1], p0[2]).setRotation(q));
      run(race, 0.4); ps.activate(a, 'zipla'); run(race, 2.5);
      if (a.s > pt.s + 2) over++;
      race.dispose();
    }
    ok('Duvarın dibindeyken zıplayınca duvarı aşıyor', over >= N - 1, `${over}/${N}`);
  }
  // 1c) direğin dibinde dururken zıplayınca aşar
  {
    let over = 0, N = 6;
    const cyls = tr.prims.filter(q => q.type === 'cyl');
    for (let k = 0; k < N; k++) {
      const { race, ps } = setup(tr), a = race.marbles[0], c = cyls[k % Math.min(3, cyls.length)];
      // direğin hemen önüne (parkur yönünde) koy
      const sm = tr.samples.filter(q => q.lane === 0).reduce((b2, q) => Math.hypot(q.p[0] - c.p[0], q.p[2] - c.p[2]) < Math.hypot(b2.p[0] - c.p[0], b2.p[2] - c.p[2]) ? q : b2);
      const back = c.r + 0.62;
      a.body.setGravityScale(1, true);
      a.body.setTranslation({ x: c.p[0] - sm.T[0] * back, y: sm.p[1] + 0.55 + sm.T[1] * -back, z: c.p[2] - sm.T[2] * back }, true);
      a.body.setLinvel({ x: 0, y: 0, z: 0 }, true); a.s = sm.s - back; a.bestS = a.s; a.lastSample = sm;
      run(race, 0.3); const s0 = a.s; ps.activate(a, 'zipla'); run(race, 2.0);
      if (a.s > s0 + 3) over++;
      race.dispose();
    }
    ok('Direğin dibindeyken zıplayınca direği aşıyor', over >= N - 1, `${over}/${N}`);
  }
  // 2) zıplama iki sıra çarpma direğini aşar, yandan düşmez
  {
    let gain = 0, falls = 0, N = 16; let base = 0;
    for (let k = 0; k < N; k++) {
      for (const jump of [false, true]) {
        const { race, ps } = setup(tr), a = race.marbles[0];
        place(race, a, tr, tr.sBump + 1, ((k % 5) - 2) * 0.45, 5);
        if (jump) ps.activate(a, 'zipla');
        run(race, 1.4);
        const d = a.bestS - (tr.sBump + 1);
        if (jump) { gain += d; if (race.events.some(e => e.type === 'respawn' && e.why === 'fall' && e.id === a.id)) falls++; } else base += d;
        race.dispose();
      }
    }
    ok('Zıplama çarpma direklerinin üstünden ileri taşıyor', gain / N > base / N + 2.5, `zıplayınca ${(gain / N).toFixed(1)} m, zıplamadan ${(base / N).toFixed(1)} m`);
    ok('Zıplarken yandan düşmüyor', falls === 0, `${falls}/${N} düşme`);
  }
  // 3) bomba alanı: yakındaki birden fazla rakip savrulur ve sersemler
  {
    const { race, ps } = setup(tr), a = race.marbles[0], b = race.marbles[1], c = race.marbles[2], d = race.marbles[3];
    place(race, a, tr, 16, 0, 0); place(race, b, tr, 22, -0.7, 0); place(race, c, tr, 22.6, 0.7, 0); place(race, d, tr, 23.2, 0, 0);
    run(race, 0.4); for (const m of race.marbles) race._progress(m, false);
    const s0 = [b.s, c.s, d.s];
    ps.activate(a, 'bomba'); run(race, MG.FLY.bomba + 0.15); const ev = race.events.filter(e => e.type === 'power').pop(); const atis = race.events.find(e => e.type === 'atis');
    ok('Bomba önce atan misketten hedefe uçuyor', !!atis && atis.sure > 0.3 && atis.targets.length === 1, atis ? `${atis.sure} sn` : 'atış yok');
    run(race, 0.2);
    ok('Bomba birden fazla misketi etkiliyor', ev.targets.length >= 2, `${ev.targets.length} misket`);
    ok('Bomba hedefleri 1 sn sersemletiyor', [b, c, d].filter(m => ev.targets.includes(m.id)).every(m => m.fx.stun > 0), '');
    race.dispose();
  }
  // 4) kalkan: yavaşlatma ve rüzgâr işlemez; duvar durdurur
  {
    const { race, ps } = setup(tr), a = race.marbles[0], b = race.marbles[1];
    place(race, a, tr, 10, 0, 0); place(race, b, tr, 14, 0, 5);
    run(race, 0.2); for (const m of race.marbles) race._progress(m, false);
    ps.activate(b, 'kalkan'); ps.activate(a, 'yavas'); ps.activate(a, 'ruzgar');
    ok('Kalkanlıya yavaşlatma işlemiyor', !(b.fx.slow > race.t), '');
    ok('Kalkanlıya rüzgâr işlemiyor', !(b.fx.wind > race.t), '');
    race.dispose();
  }
  // 5) demir misket duvarı kırar, etkisi biter
  {
    let broke = 0, N = 6;
    for (let k = 0; k < N; k++) {
      const { race, ps } = setup(tr), a = race.marbles[0], o = race.marbles[1];
      place(race, o, tr, 13, 0, 0); place(race, a, tr, 8, (k % 3 - 1) * 0.6, 4);
      run(race, 0.2); for (const m of race.marbles) race._progress(m, false);
      ps.activate(o, 'duvar'); // o'nun hedefi a (arkadaki) → duvar a'nın önüne
      o.body.setTranslation({ x: 0, y: -600, z: 0 }, true); o.body.setGravityScale(0, true);
      ps.activate(a, 'demir'); run(race, 2.5);
      if (race.events.some(e => e.type === 'wallBreak' && e.id === a.id) && !(a.fx.iron > race.t)) broke++;
      race.dispose();
    }
    ok('Demir misket duvarı kırıyor ve etkisi bitiyor', broke >= N - 1, `${broke}/${N}`);
  }
  // 6) hayalet çivilerden geçer (sapmadan)
  {
    let straightRuns = 0, N = 8;
    for (let k = 0; k < N; k++) {
      const { race, ps } = setup(tr), a = race.marbles[0];
      place(race, a, tr, tr.sPeg + 1.5, ((k % 4) - 1.5) * 0.8, 4); ps.activate(a, 'hayalet');
      let maxLat = 0; const sm0 = sampleAt(tr, tr.sPeg + 1.5), p0 = a.body.translation(), lat0 = (p0.x - sm0.p[0]) * sm0.R[0] + (p0.z - sm0.p[2]) * sm0.R[2];
      for (let i = 0; i < 2.2 * 120; i++) { race._sub(); const sm = a.lastSample, p = a.body.translation(); if (sm) maxLat = Math.max(maxLat, Math.abs((p.x - sm.p[0]) * sm.R[0] + (p.z - sm.p[2]) * sm.R[2] - lat0)); }
      if (maxLat < 0.5) straightRuns++;
      race.dispose();
    }
    ok('Hayalet çivilere çarpmadan geçiyor', straightRuns >= N - 1, `${straightRuns}/${N} düz geçiş`);
  }
  console.log(`\n${pass} geçti, ${fail} kaldı`);
});
