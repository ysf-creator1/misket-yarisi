/* Misket Yarışı — fizik ve yarış motoru (Rapier 3D)
 * Tarayıcıda ve Node testinde ortak. Görüntüden bağımsızdır.
 */
(function (G) {
  'use strict';
  const MF = G.MF = G.MF || {};

  MF.PARAMS = {
    r: 0.5,              // misket yarıçapı
    g: -22,              // yerçekimi
    dt: 1 / 120,         // sabit fizik adımı
    density: 1.0,
    friction: 0.35, restitution: 0.38,          // misket
    trackFriction: 0.45, trackRestitution: 0.32, // parkur
    postRestitution: 0.55, bumperRestitution: 0.85,
    linDamp: 0.04, angDamp: 0.18,
    drag: 0.0045,        // hava direnci (hızın karesiyle)
    stuckTime: 5, zoneStuckTime: 14,
    fallDist: 7,
  };

  // her misketin rengi, deseni ve sembolü farklı (renk körü oyuncular da ayırt edebilsin)
  MF.MARBLES = [
    { name: 'Kızıl Şimşek', color: '#ff3b3b', color2: '#ffd0d0', desen: 'zigzag', sembol: '▲' },
    { name: 'Mavi Kasırga', color: '#2f7bff', color2: '#c9dcff', desen: 'cizgili', sembol: '■' },
    { name: 'Yeşil Yıldırım', color: '#22c55e', color2: '#d3f7df', desen: 'puantiye', sembol: '●' },
    { name: 'Altın Ok', color: '#ffc21a', color2: '#fff1c2', desen: 'yildiz', sembol: '★' },
    { name: 'Mor Fırtına', color: '#a855f7', color2: '#ead7ff', desen: 'dama', sembol: '◆' },
    { name: 'Turuncu Roket', color: '#ff7a1a', color2: '#ffe0c7', desen: null, sembol: '✚' },
  ];

  const hyp = Math.hypot;
  const OBST = (0x0200 << 16) | 0xFFFF; // engel çarpışma grubu (js/guclar.js MG.OBST_BIT)

  class Race {
    // R: başlatılmış RAPIER, track: MP.buildTrack çıktısı
    constructor(R, track, opts = {}) {
      this.R = R; this.track = track;
      const P = this.P = Object.assign({}, MF.PARAMS, opts.params || {});
      this.rand = opts.rand || Math.random;
      const w = this.world = new R.World({ x: 0, y: P.g, z: 0 });
      w.timestep = P.dt;
      this.t = 0; this.acc = 0; this.timeScale = 1; this.started = false; this.done = false;
      this.events = []; // {type, ...} — görüntü/ses tarafı tüketir

      const fixed = w.createRigidBody(R.RigidBodyDesc.fixed());
      const flags = opts.fixEdges === false ? undefined : R.TriMeshFlags.FIX_INTERNAL_EDGES;
      for (const m of track.meshes) {
        if (!m.physics || !m.i.length) continue;
        const d = R.ColliderDesc.trimesh(new Float32Array(m.v), new Uint32Array(m.i), flags)
          .setFriction(m.friction != null ? m.friction : P.trackFriction)
          .setRestitution(m.restitution != null ? m.restitution : P.trackRestitution);
        w.createCollider(d, fixed);
      }
      this.gateCols = []; this.spinners = []; this.pistons = []; this.kins = []; this.clock = 0;
      this.belts = track.belts || []; this.fans = track.fans || [];
      for (const pr of track.prims) {
        let d;
        if (pr.type === 'spinner') { this._spinner(pr); continue; }
        if (pr.type === 'piston') { this._piston(pr); continue; }
        if (pr.type === 'kin') { this._kin(pr); continue; }
        if (pr.type === 'cyl') d = R.ColliderDesc.cylinder(pr.hh, pr.r).setRestitution(pr.bumper ? P.bumperRestitution : P.postRestitution).setFriction(0);
        else if (pr.type === 'box') d = R.ColliderDesc.cuboid(pr.half[0], pr.half[1], pr.half[2]).setFriction(pr.board ? 0.05 : pr.pad ? 0.2 : 0.3).setRestitution(pr.restitution != null ? pr.restitution : pr.board ? 0.45 : 0.3);
        else continue;
        d.setTranslation(pr.p[0], pr.p[1], pr.p[2]).setRotation(pr.q);
        if (pr.type === 'cyl' || pr.board) d.setCollisionGroups(OBST); // hayalet engellerden geçer (yastık, cam duvar, kapı geçilmez)
        const c = w.createCollider(d, fixed);
        if (pr.gate) this.gateCols.push(c);
      }

      // misketler: başlangıç yerleri her yarışta karıştırılır
      const order = opts.order || shuffle([0, 1, 2, 3, 4, 5], this.rand);
      this.marbles = MF.MARBLES.map((info, i) => {
        const slot = track.slots[order[i]];
        const bd = R.RigidBodyDesc.dynamic()
          .setTranslation(slot[0] + (this.rand() - 0.5) * 0.04, slot[1], slot[2] + (this.rand() - 0.5) * 0.04)
          .setLinearDamping(P.linDamp).setAngularDamping(P.angDamp).setCcdEnabled(true);
        const body = w.createRigidBody(bd);
        const col = w.createCollider(R.ColliderDesc.ball(P.r).setDensity(P.density).setFriction(P.friction).setRestitution(P.restitution), body);
        return {
          id: i, info, body, col, slot: order[i],
          s: 0, bestS: 0, lastGain: 0, finished: false, finishTime: null, place: null,
          respawns: 0, inZone: null, lastSample: null, speed: 0,
          fx: {}, // güç etkileri (2. aşama)
        };
      });
      this.finishOrder = [];
      this.samples = track.samples;
      this.safe = track.samples.filter(sm => sm.safe && sm.lane === 0);
      this.endAfterThird = opts.endAfterThird != null ? opts.endAfterThird : 6;
      this.timeLimit = opts.timeLimit || (track.target || 60) * 3;
      for (const m of this.marbles) this._progress(m, true);
    }

    // dönen pervane: kinematik cisim, her adımda kendi ekseni etrafında döner
    _spinner(pr) {
      const R = this.R, w = this.world;
      const body = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pr.p[0], pr.p[1], pr.p[2]).setRotation(pr.q));
      for (let k = 0; k < pr.arms; k++) {
        const qa = MP.qY(k * Math.PI / pr.arms);
        w.createCollider(R.ColliderDesc.cuboid(pr.arm, pr.hh, pr.th).setRotation(qa).setRestitution(0.6).setFriction(0.1).setCollisionGroups(OBST), body);
      }
      w.createCollider(R.ColliderDesc.cylinder(pr.hh + 0.1, pr.hub).setRestitution(0.6).setCollisionGroups(OBST), body);
      this.spinners.push({ body, pr, ang: 0 });
    }

    _piston(pr) {
      const R = this.R, w = this.world;
      const body = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pr.p[0], pr.p[1], pr.p[2]).setRotation(pr.q));
      w.createCollider(R.ColliderDesc.cuboid(pr.half[0], pr.half[1], pr.half[2]).setRestitution(0.5).setFriction(0.1).setCollisionGroups(OBST), body);
      this.pistons.push({ body, pr });
    }
    pistonPos(pr, t) {
      const ph = (t / pr.period + pr.phase) % 1, e = ph < 0.25 ? ph / 0.25 : ph < 0.5 ? 1 : ph < 0.75 ? 1 - (ph - 0.5) / 0.25 : 0; // it, bekle, geri çek, bekle
      const k = pr.stroke * (e * e * (3 - 2 * e));
      return { x: pr.p[0] + pr.dir[0] * k, y: pr.p[1] + pr.dir[1] * k, z: pr.p[2] + pr.dir[2] * k };
    }

    // hareketli engeller: kazık, sarkaç, döner tabla, kapı (kinematik)
    _kin(pr) {
      const R = this.R, w = this.world, P0 = MF.kinPose(pr, 0);
      const body = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(P0.p[0], P0.p[1], P0.p[2]).setRotation(P0.q));
      if (pr.kind === 'tambur') { // dönen tambur: oluk gibi (hayalet de içinden geçemez), sürtünmesi misketi döndürüp kaldırır
        for (const pt of pr.parts) w.createCollider(R.ColliderDesc.cuboid(pt.half[0], pt.half[1], pt.half[2]).setTranslation(pt.p[0], pt.p[1], pt.p[2]).setRotation(pt.q).setFriction(pt.fin ? 0.3 : 0.6).setRestitution(0.25), body);
        this.kins.push({ body, pr }); return;
      }
      let d;
      if (pr.kind === 'kazik') d = R.ColliderDesc.cylinder(pr.hh, pr.r).setRestitution(0.5).setFriction(0.1);
      else if (pr.kind === 'sarkac') d = R.ColliderDesc.ball(pr.bob).setRestitution(0.7).setFriction(0.1);
      else if (pr.kind === 'tabla') d = R.ColliderDesc.cylinder(pr.hh, pr.r).setRestitution(0.2).setFriction(0.9);
      else d = R.ColliderDesc.cuboid(pr.half[0], pr.half[1], pr.half[2]).setRestitution(0.3).setFriction(0.2);
      w.createCollider(d.setCollisionGroups(OBST), body);
      this.kins.push({ body, pr });
    }

    openGate() {
      if (this.started) return;
      this.started = true; this.t = 0;
      for (const c of this.gateCols) this.world.removeCollider(c, true);
      for (const m of this.marbles) { m.lastGain = 0; m.anchor = null; m.body.wakeUp(); }
      this.events.push({ type: 'gate' });
    }

    // gerçek zamanlı adım (dt saniye), timeScale ile yavaş çekim
    step(dt) {
      if (this.done) return;
      this.acc += Math.min(dt, 0.1) * this.timeScale;
      let n = 0;
      while (this.acc >= this.P.dt && n < 12) { this._sub(); this.acc -= this.P.dt; n++; }
      if (n === 12) this.acc = 0;
    }

    _sub() {
      const P = this.P, dt = P.dt;
      if (this.onSub) this.onSub(dt);
      for (const m of this.marbles) {
        const v = m.body.linvel(), sp = hyp(v.x, v.y, v.z);
        m.speed = sp;
        if (sp > 0.01) {
          const mass = m.body.mass(), k = P.drag * sp * dt * mass;
          m.body.applyImpulse({ x: -v.x * k, y: -v.y * k, z: -v.z * k }, true);
        }
        if (this.applyEffects) this.applyEffects(m, dt);
      }
      this.clock += dt;
      for (const ps of this.pistons) ps.body.setNextKinematicTranslation(this.pistonPos(ps.pr, this.clock));
      for (const k of this.kins) { const P = MF.kinPose(k.pr, this.clock); k.body.setNextKinematicTranslation({ x: P.p[0], y: P.p[1], z: P.p[2] }); k.body.setNextKinematicRotation(P.q); }
      // hareketli bantlar: üstündeki misketi iter (geri bant sadece yavaşlatır, misketi geri taşımaz)
      if (this.belts.length) for (const m of this.marbles) {
        if (m.finished || !m.lastSample || m.lastSample.lane) continue;
        for (const b of this.belts) {
          if (m.s < b.s0 || m.s > b.s1) continue;
          const sm = m.lastSample, q = m.body.translation(), hgt = (q.x - sm.p[0]) * sm.U[0] + (q.y - sm.p[1]) * sm.U[1] + (q.z - sm.p[2]) * sm.U[2];
          if (hgt > 0.5) continue; // havadaysa bant itmez
          const v = m.body.linvel(), along = v.x * sm.T[0] + v.y * sm.T[1] + v.z * sm.T[2], mass = m.body.mass();
          if (b.accel > 0 && along > 11) continue;
          if (b.accel < 0 && along < 1.2) continue;
          const k = b.accel * mass * dt; m.body.applyImpulse({ x: sm.T[0] * k, y: sm.T[1] * k, z: sm.T[2] * k }, true);
        }
      }
      // vantilatörler: açıkken önlerinden geçen misketi karşı duvara iter
      if (this.fans.length) for (const m of this.marbles) {
        if (m.finished) continue;
        for (const f of this.fans) {
          if (m.s < f.s0 || m.s > f.s1 || !MF.fanOn(f, this.clock)) continue;
          const k = f.accel * m.body.mass() * dt; m.body.applyImpulse({ x: f.dir[0] * k, y: f.dir[1] * k, z: f.dir[2] * k }, true);
        }
      }
      for (const sp of this.spinners) {
        sp.ang = this.clock * sp.pr.speed;
        sp.body.setNextKinematicRotation(MP.qmul(sp.pr.q, MP.qY(sp.ang)));
      }
      this.world.step();
      if (this.started) this.t += dt;
      this._tick = (this._tick || 0) + 1;
      if (this._tick % 3 === 0) {
        for (const m of this.marbles) this._progress(m, false);
        this._checkEnd();
      }
    }

    // misketin parkur üzerindeki ilerlemesi (s)
    _progress(m, init) {
      const p = m.body.translation(), P = this.P;
      let s = null, zone = null, best = null;
      for (const z of this.track.zones) {
        if (!init && (m.s < z.s0 - 4 || m.s > z.s1 + 1)) continue;
        const r = hyp(p.x - z.c[0], p.z - z.c[2]);
        if (r < z.R + 0.4 && p.y < z.yTop && p.y > z.yBot) {
          const f = Math.max(0, Math.min(1, (z.R - r) / (z.R - z.hole)));
          s = z.s0 + f * (z.s1 - z.s0); zone = z;
          if (m.inZone === z) s = Math.max(s, m.s); // hunide ilerleme geri gitmez (dışa savrulan misket sıralamada geri düşmez)
          break;
        }
      }
      if (s === null) {
        const S = this.samples, lo = init ? -1e9 : m.s - 14, hi = init ? 1e9 : m.s + 22;
        let i = lowerBound(S, lo), bd = Infinity;
        for (; i < S.length && S[i].s <= hi; i++) {
          const q = S[i].p, d = (q[0] - p.x) ** 2 + (q[1] - p.y) ** 2 + (q[2] - p.z) ** 2;
          if (d < bd) { bd = d; best = S[i]; }
        }
        if (!best) return;
        s = best.s; m.lastSample = best;
        if (this.started && !m.finished && Math.sqrt(bd) > P.fallDist) { this._respawn(m, 'fall'); return; }
      }
      m.inZone = zone; m.s = s;
      if (s > m.bestS + 0.3) { m.bestS = s; m.lastGain = this.t; }
      // gerçekten yerinde mi duruyor? (geri itilen ama hareket eden misket takılmış sayılmaz)
      if (!m.anchor || hyp(p.x - m.anchor[0], p.y - m.anchor[1], p.z - m.anchor[2]) > 1.0) { m.anchor = [p.x, p.y, p.z]; m.anchorT = this.t; }
      if (!this.started || m.finished) return;
      if (s >= this.track.finishS) {
        m.finished = true; m.finishTime = this.t; this.finishOrder.push(m); m.place = this.finishOrder.length;
        this.events.push({ type: 'finish', id: m.id, place: m.place, time: m.finishTime });
        return;
      }
      const lim = zone ? P.zoneStuckTime : P.stuckTime, idle = Math.min(this.t - m.lastGain, this.t - (m.anchorT || 0));
      if (idle > lim) { this._respawn(m, 'stuck'); return; }
      // bir engelin önünde dengede kalan misket: gerçekteki küçük sarsıntı gibi hafifçe yana it
      // (yerinde ileri geri sallanan misket de: hızı var ama 1 m'den fazla yer değiştirmiyor)
      if (idle > (zone ? 4 : 2) && m.speed < 3 && this.t - (m.lastNudge || 0) > 1 && m.lastSample) {
        const R = m.lastSample.R, T = m.lastSample.T, side = this.rand() < 0.5 ? -1 : 1, mass = m.body.mass();
        m.body.applyImpulse({ x: (R[0] * side * 2.2 + T[0] * 0.8) * mass, y: 0.8 * mass, z: (R[2] * side * 2.2 + T[2] * 0.8) * mass }, true);
        m.lastNudge = this.t; m.nudges = (m.nudges || 0) + 1;
      }
    }

    _respawn(m, why) {
      const sAt = m.s;
      // zıplama/turbo gibi bir güç sırasında düşen misket zaman kaybetmesin: ulaştığı yere geri konur
      // güç sırasında ya da atlama/trambolin/delik/düşüş bölgesinde düşen misket zaman kaybetmesin: ulaştığı yere konur
      const kind = m.lastSample && m.lastSample.kind;
      const safe = why === 'fall' && (!!(m.fx && m.fx.safe > this.t) || !!m.inZone || kind === 'jump' || kind === 'tramp' || kind === 'funnelExit' || kind === 'drop' || kind === 'tambur');
      const target = safe ? m.bestS + 1 : Math.max(0, m.bestS - 2.5);
      let sm = null;
      for (const q of this.safe) { if (q.s <= target) sm = q; else break; }
      if (!sm) sm = this.safe[0];
      const off = (this.rand() - 0.5) * Math.min(1.2, (sm.hw || 2) - 0.6) * 2;
      const p = [sm.p[0] + sm.R[0] * off, sm.p[1] + sm.R[1] * off + 0.35, sm.p[2] + sm.R[2] * off];
      m.body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
      const v0 = safe ? Math.max(4, Math.min(9, m.speed)) : 2;
      m.body.setLinvel({ x: sm.T[0] * v0, y: sm.T[1] * v0, z: sm.T[2] * v0 }, true);
      m.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      m.s = sm.s; m.bestS = safe ? Math.max(m.bestS, sm.s) : Math.max(sm.s, Math.min(m.bestS, sm.s + 0.01)); m.lastGain = this.t; m.anchor = null; m.respawns++;
      this.events.push({ type: 'respawn', id: m.id, why, s: sAt, safe });
    }

    _checkEnd() {
      if (!this.started || this.done) return;
      const fin = this.finishOrder.length;
      if (fin === this.marbles.length) { this._end(); return; }
      if (fin >= 3) {
        const third = this.finishOrder[2].finishTime;
        if (this.t - third > this.endAfterThird) { this._end(); return; }
      }
      if (this.t > this.timeLimit) this._end();
    }
    _end() {
      // bitiremeyenler: ilerlemeye göre sıralanır
      const rest = this.marbles.filter(m => !m.finished).sort((a, b) => b.s - a.s);
      for (const m of rest) { this.finishOrder.push(m); m.place = this.finishOrder.length; }
      this.done = true;
      this.events.push({ type: 'end' });
    }

    // canlı sıralama: bitirenler bitiş sırasıyla, diğerleri ilerlemeye göre
    standings() {
      const fin = this.marbles.filter(m => m.finished).sort((a, b) => a.place - b.place);
      const rest = this.marbles.filter(m => !m.finished).sort((a, b) => b.s - a.s);
      return fin.concat(rest);
    }
    leader() { return this.standings()[0]; }

    dispose() { try { this.world.free(); } catch (e) { } }
  }

  // hareketli engelin t anındaki konumu ve dönüşü (fizik ve görüntü aynı fonksiyonu kullanır)
  const lerpN = (a, b, t) => a + (b - a) * t, sm3 = t => t * t * (3 - 2 * t);
  MF.kinPose = function (pr, t) {
    const add3 = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
    if (pr.kind === 'kazik') { // yükselir (0,3 sn), bekler, iner, gizli bekler
      const u = ((t / pr.period) + pr.phase) % 1;
      const h = u < 0.12 ? lerpN(-0.75, 0.55, sm3(u / 0.12)) : u < 0.45 ? 0.55 : u < 0.57 ? lerpN(0.55, -0.75, sm3((u - 0.45) / 0.12)) : -0.75;
      return { p: add3(pr.p, pr.U, h), q: pr.q };
    }
    if (pr.kind === 'sarkac') {
      const th = pr.amp * Math.sin(2 * Math.PI * (t / pr.period + pr.phase));
      return { p: add3(add3(pr.pivot, pr.R, Math.sin(th) * pr.armL), pr.U, -Math.cos(th) * pr.armL), q: { x: 0, y: 0, z: 0, w: 1 }, th };
    }
    if (pr.kind === 'tabla') return { p: pr.p, q: G.MP.qmul(pr.q, G.MP.qY(t * pr.speed)) };
    if (pr.kind === 'tambur') { const h = t * pr.speed / 2, s = Math.sin(h); return { p: pr.p, q: G.MP.qmul({ x: pr.A[0] * s, y: pr.A[1] * s, z: pr.A[2] * s, w: Math.cos(h) }, pr.q) }; }
    // kapı: zeminden yükselir, 1,1 sn yolu kapatır, iner
    const u = ((t / pr.period) + pr.phase) % 1, up = 0.09, hold = 0.26;
    const e = u < up ? sm3(u / up) : u < up + hold ? 1 : u < 2 * up + hold ? 1 - sm3((u - up - hold) / up) : 0;
    return { p: add3(pr.p, pr.U, lerpN(-0.75, 0.6, e)), q: pr.q };
  };

  // vantilatör açık mı (fizik ve görüntü aynı saati kullanır): her periyodun ilk yarısı eser
  MF.fanOn = (f, t) => ((t / f.period + f.phase) % 1 + 1) % 1 < 0.5;

  function lowerBound(S, s) { let a = 0, b = S.length; while (a < b) { const m = (a + b) >> 1; if (S[m].s < s) a = m + 1; else b = m; } return a; }
  function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  MF.shuffle = shuffle;
  MF.Race = Race;
})(typeof window !== 'undefined' ? window : globalThis);
