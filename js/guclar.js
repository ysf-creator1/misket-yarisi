/* Misket Yarışı — güçler, kart dağıtımı ve bot yapay zekâsı
 * Fizik tarafında çalışır (tarayıcı + Node testi). Görüntü tarafı race.events üzerinden haber alır.
 * Her 15–20 sn'de bir tüm misketlere 3 kart dağıtılır. Oyuncu 6 sn içinde seçer, botlar kişiliklerine göre seçer.
 */
(function (G) {
  'use strict';
  const MG = G.MG = G.MG || {};

  MG.POWERS = [
    { id: 'turbo', name: 'Turbo', icon: '🚀', type: 'self', tier: 1, value: 1.0, desc: '3 sn boyunca ileri fırlarsın' },
    { id: 'zipla', name: 'Süper Zıplama', icon: '🦘', type: 'self', tier: 1, value: 0.6, desc: 'İleri sıçrayıp önündekilerin üstünden geçersin' },
    { id: 'kalkan', name: 'Kalkan', icon: '🛡️', type: 'self', tier: 1, value: 0.8, desc: '8 sn boyunca tuzaklar sana işlemez' },
    { id: 'demir', name: 'Demir Misket', icon: '⚙️', type: 'self', tier: 2, value: 0.75, desc: '6 sn ağırlaşıp hızlanırsın, çarptığını itersin' },
    { id: 'hayalet', name: 'Hayalet', icon: '👻', type: 'self', tier: 2, value: 0.65, desc: '4 sn misketlerin içinden geçersin, saldırılar işlemez' },
    { id: 'isinlan', name: 'Işınlanma', icon: '✨', type: 'self', tier: 3, value: 1.3, desc: 'Parkurda biraz ileri ışınlanırsın' },
    { id: 'balcik', name: 'Yapışkan Balçık', icon: '🟢', type: 'attack', tier: 1, value: 0.9, desc: 'Öndeki rakibin yoluna yapışkan balçık dökülür' },
    { id: 'duvar', name: 'Engel Duvarı', icon: '🧱', type: 'attack', tier: 2, value: 1.0, desc: 'Öndeki rakibin önüne duvar düşer' },
    { id: 'yavas', name: 'Yavaşlatma', icon: '🐌', type: 'attack', tier: 1, value: 0.9, desc: 'Öndeki 2 rakip 4 sn yavaşlar, sen içlerinden geçersin' },
    { id: 'kucult', name: 'Küçült', icon: '🔻', type: 'attack', tier: 2, value: 0.7, desc: 'Öndeki 2 rakip 6 sn küçülüp yavaşlar' },
    { id: 'ruzgar', name: 'Ters Rüzgâr', icon: '🌪️', type: 'attack', tier: 3, value: 1.1, desc: 'Önündeki herkes 2,5 sn geri itilir' },
    { id: 'bomba', name: 'Bomba', icon: '💣', type: 'attack', tier: 2, value: 1.0, desc: 'Öndeki 2 rakip geriye savrulur' },
  ];
  MG.byId = Object.fromEntries(MG.POWERS.map(p => [p.id, p]));
  MG.PERSONALITIES = [
    { id: 'saldirgan', name: 'Saldırgan', attack: 1.6, self: 0.9, shield: 0.7 },
    { id: 'temkinli', name: 'Temkinli', attack: 0.8, self: 1.4, shield: 1.6 },
    { id: 'dengeli', name: 'Dengeli', attack: 1.1, self: 1.1, shield: 1.0 },
  ];

  // Çarpışma grupları: parkur 0x0001, her misketin kendi biti (0x0002 << id), güç duvarları 0x0100.
  // Bir tuzağı kuran misket, o tuzağın hedefiyle ve kendi duvarıyla çarpışmaz: kendi tuzağına takılmaz.
  const WALL_BIT = 0x0100;
  const grp = (mem, filter) => ((mem & 0xFFFF) << 16) | (filter & 0xFFFF);
  const BASE_TIER = { 1: 1, 2: 0.6, 3: 0.22 }, BOOST = { 1: -0.4, 2: 0.5, 3: 3 };

  class PowerSystem {
    // opts: { playerId (-1: hepsi bot), rand, firstAt, gap:[min,max], pick: süre }
    constructor(race, opts = {}) {
      this.race = race; this.rand = opts.rand || race.rand;
      this.playerId = opts.playerId != null ? opts.playerId : -1;
      this.pickTime = opts.pickTime || 6;
      this.gap = opts.gap || [15, 20];
      this.next = opts.firstAt != null ? opts.firstAt : 8 + this.rand() * 3;
      this.hands = {}; this.walls = []; this.slimes = []; this.round = 0;
      this.stats = { used: 0 };
      race.marbles.forEach((m, i) => {
        m.fx = {}; m.race = race;
        m.persona = MG.PERSONALITIES[Math.floor(this.rand() * MG.PERSONALITIES.length)];
        m.bit = 0x0002 << i; m.ignore = {}; m._grp = null;
        this._groups(m);
      });
      race.applyEffects = (m, dt) => this._apply(m, dt);
      race.onSub = dt => this._tick(dt);
      race.powers = this;
    }

    _tick() {
      const r = this.race, t = r.t;
      if (!r.started || r.done) return;
      if (t >= this.next) { this._deal(); this.next = t + this.gap[0] + this.rand() * (this.gap[1] - this.gap[0]); }
      for (const id in this.hands) {
        const h = this.hands[id], m = r.marbles[id];
        if (h.used) continue;
        if (m.finished || t > h.expires) { h.used = true; if (+id === this.playerId) r.events.push({ type: 'handGone', id: +id }); continue; }
        if (+id !== this.playerId && t >= h.botAt) this.choose(+id, this._botPick(m, h.cards));
      }
      // süreli duvarlar
      for (let i = this.walls.length - 1; i >= 0; i--) { const w = this.walls[i]; if (t > w.until) { r.world.removeCollider(w.col, true); this.walls.splice(i, 1); } }
      for (let i = this.slimes.length - 1; i >= 0; i--) if (t > this.slimes[i].until) this.slimes.splice(i, 1);
      // biten etkileri geri al
      for (const m of r.marbles) {
        const fx = m.fx;
        if (m._iron && !(fx.iron > t)) { m.body.setAdditionalMass(0, true); m._iron = false; }
        if (m._ghost && !(fx.ghost > t)) m._ghost = false;
        this._groups(m);
        if (m._small && !(fx.small > t)) { m.col.setRadius(r.P.r); m._small = false; }
      }
    }

    // misketin çarpışma filtresi: hayaletse sadece parkur; yoksa geçici olarak çarpışmadığı misketler hariç herkes
    _groups(m) {
      const t = this.race.t; let filter;
      if (m.fx.ghost > t) filter = 0x0001;
      else { filter = 0xFFFF; for (const id in m.ignore) { if (m.ignore[id] > t) filter &= ~this.race.marbles[id].bit; else delete m.ignore[id]; } }
      const g = grp(m.bit, filter);
      if (g !== m._grp) { m.col.setCollisionGroups(g); m._grp = g; }
    }
    _ignore(caster, target, until) { caster.ignore[target.id] = Math.max(caster.ignore[target.id] || 0, until); this._groups(caster); }

    // kart dağıt: sıralamada geride olana güçlü kart çıkma şansı daha yüksek
    _deal() {
      const r = this.race, st = r.standings(), n = st.length;
      this.round++;
      st.forEach((m, idx) => {
        if (m.finished) return;
        const frac = n > 1 ? idx / (n - 1) : 0, pool = MG.POWERS.map(p => ({ p, w: BASE_TIER[p.tier] * (1 + BOOST[p.tier] * frac) }));
        const cards = [];
        while (cards.length < 3) {
          const tot = pool.reduce((a, x) => a + x.w, 0); let q = this.rand() * tot;
          for (let k = 0; k < pool.length; k++) { q -= pool[k].w; if (q <= 0 || k === pool.length - 1) { cards.push(pool[k].p.id); pool.splice(k, 1); break; } }
        }
        this.hands[m.id] = { cards, dealt: r.t, expires: r.t + this.pickTime, botAt: r.t + 0.5 + this.rand() * 2.5, used: false };
        if (m.id === this.playerId) r.events.push({ type: 'hand', id: m.id, cards, expires: r.t + this.pickTime });
      });
    }

    _botPick(m, cards) {
      const r = this.race, st = r.standings(), idx = st.indexOf(m), n = st.length, frac = idx / Math.max(1, n - 1);
      const tgt = this.targetFor(m), dist = tgt ? tgt.s - m.s : 99, per = m.persona;
      let best = 0, bv = -1;
      cards.forEach((id, k) => {
        const p = MG.byId[id]; let v = p.value;
        if (p.type === 'attack') {
          v *= per.attack;
          if (idx === 0) v *= 0.6;
          if (dist > 0 && dist < 12) v *= 1.4; else if (Math.abs(dist) > 30) v *= 0.5;
          if (id === 'ruzgar') v *= Math.max(0.2, r.marbles.filter(o => o !== m && !o.finished && o.s > m.s && o.s - m.s < 40).length / 2);
        } else {
          v *= id === 'kalkan' ? per.shield : per.self;
          if (id === 'kalkan' && idx === 0) v *= 1.8;
          if (id === 'turbo' || id === 'isinlan') v *= 1 + frac;
          if (m.inZone && (id === 'turbo' || id === 'zipla')) v *= 0.4; // hunide pek işe yaramaz
        }
        v *= 0.8 + this.rand() * 0.4;
        if (v > bv) { bv = v; best = k; }
      });
      return best;
    }

    // sıralamada hemen öndeki n rakip; lider ise hemen arkadaki
    targetsFor(m, n) {
      const st = this.race.standings().filter(o => !o.finished || o === m), idx = st.indexOf(m), out = [];
      for (let k = idx - 1; k >= 0 && out.length < n; k--) out.push(st[k]);
      if (!out.length && st[idx + 1]) out.push(st[idx + 1]);
      return out;
    }
    // hedef: hemen öndeki (bitirmemiş) rakip; lider ise hemen arkasındaki
    targetFor(m) {
      const st = this.race.standings().filter(o => !o.finished || o === m), idx = st.indexOf(m);
      if (idx > 0) return st[idx - 1];
      return st[idx + 1] || null;
    }

    choose(id, k) {
      const h = this.hands[id];
      if (!h || h.used || k == null || k < 0 || k > 2) return false;
      h.used = true;
      this.activate(this.race.marbles[id], h.cards[k]);
      return true;
    }

    activate(m, pid) {
      const r = this.race, t = r.t, fx = m.fx, p = MG.byId[pid], mass = m.body.mass();
      const sm = m.lastSample, T = sm ? sm.T : [0, 0, 1];
      const ev = { type: 'power', id: m.id, power: pid, target: null, blocked: false };
      this.stats.used++;
      if (p.type === 'self') {
        if (pid === 'turbo') { fx.turbo = t + 3; fx.safe = t + 4; }
        else if (pid === 'zipla') {
          // alçak ve parkur yönünde ileri sıçrama; düşerse kaldığı yere geri konur (zaman kaybı yok)
          const h = Math.hypot(T[0], T[2]) || 1, v = m.body.linvel();
          m.body.setLinvel({ x: v.x * 0.7 + T[0] / h * 8.5, y: Math.max(0, v.y) + 4.5, z: v.z * 0.7 + T[2] / h * 8.5 }, true);
          fx.jumpAt = t; fx.safe = t + 2.5;
        }
        else if (pid === 'kalkan') fx.shield = t + 8;
        else if (pid === 'demir') { fx.iron = t + 6; fx.safe = t + 6; m.body.setAdditionalMass(mass * 3, true); m._iron = true; }
        else if (pid === 'hayalet') { fx.ghost = t + 4; fx.safe = t + 4; m._ghost = true; this._groups(m); }
        else if (pid === 'isinlan') { const from = m.body.translation(); ev.from = [from.x, from.y, from.z]; this._teleport(m, 9); const to = m.body.translation(); ev.to = [to.x, to.y, to.z]; }
      } else if (pid === 'ruzgar') {
        const hit = r.marbles.filter(o => o !== m && !o.finished && o.s > m.s && o.s - m.s < 40);
        const list = hit.length ? hit : r.marbles.filter(o => o !== m && !o.finished && Math.abs(o.s - m.s) < 20);
        ev.targets = [];
        for (const o of list) { if (o.fx.shield > t || o.fx.ghost > t) { ev.blockedIds = (ev.blockedIds || []).concat(o.id); continue; } o.fx.wind = t + 2.5; ev.targets.push(o.id); this._ignore(m, o, t + 3.5); }
      } else {
        const tg = this.targetFor(m); if (!tg) { r.events.push(ev); return; }
        ev.target = tg.id;
        if (pid === 'yavas' || pid === 'kucult' || pid === 'bomba') { this._multi(m, pid, ev); r.events.push(ev); return; }
        if ((tg.fx.shield > t || tg.fx.ghost > t) && pid !== 'balcik' && pid !== 'duvar') { ev.blocked = true; r.events.push(ev); return; }
        const tm = tg.body.mass();
        // kuran misket, saldırdığı rakibin içinden geçer: yavaşlayan rakip önünde fren olmaz
        this._ignore(m, tg, t + ({ yavas: 4.5, kucult: 6.5, bomba: 3, balcik: 5, duvar: 4 }[pid] || 3));
        if (pid === 'yavas') tg.fx.slow = t + 3.5;
        else if (pid === 'kucult') { tg.fx.small = t + 6; tg.col.setRadius(r.P.r * 0.62); tg._small = true; }
        else if (pid === 'bomba') {
          const side = this.rand() < 0.5 ? -1 : 1, R = tg.lastSample ? tg.lastSample.R : [1, 0, 0], T2 = tg.lastSample ? tg.lastSample.T : T;
          tg.body.applyImpulse({ x: (R[0] * side * 2 - T2[0] * 5) * tm, y: 6 * tm, z: (R[2] * side * 2 - T2[2] * 5) * tm }, true); tg.fx.slow = Math.max(tg.fx.slow || 0, t + 1.5);
          const q = tg.body.translation(); ev.at = [q.x, q.y, q.z];
        } else if (pid === 'balcik') { const pt = this._ahead(tg, 2.5); if (pt) { const sl = { s0: pt.s - 2.2, s1: pt.s + 2.4, p: pt.p, U: pt.U, r: Math.max(1.4, pt.hw), lane: pt.lane, until: t + 7, owner: m.id }; this.slimes.push(sl); ev.slime = sl; } }
        else if (pid === 'duvar') {
          const pt = this._ahead(tg, 4.5);
          if (pt) {
            const hh = 0.75, p0 = [pt.p[0] + pt.U[0] * (hh - 0.5), pt.p[1] + pt.U[1] * (hh - 0.5), pt.p[2] + pt.U[2] * (hh - 0.5)];
            const q = G.MP.quatFromBasis(pt.R, pt.U, G.MP.v.cross(pt.R, pt.U));
            const half = [pt.hw + 0.05, hh, 0.18];
            // duvar kuranı durdurmaz: onun için geçirgendir
            const col = r.world.createCollider(r.R.ColliderDesc.cuboid(half[0], half[1], half[2]).setTranslation(p0[0], p0[1], p0[2]).setRotation(q).setRestitution(0.3)
              .setCollisionGroups(grp(WALL_BIT, 0xFFFF & ~m.bit)));
            const w = { col, until: t + 4, p: p0, q, half, owner: m.id }; this.walls.push(w); ev.wall = w;
          }
        }
      }
      r.events.push(ev);
    }

    // yavaşlatma / küçültme / bomba: öndeki en yakın iki rakibe işler, kuran onların içinden geçer
    _multi(m, pid, ev) {
      const r = this.race, t = r.t, list = this.targetsFor(m, 2);
      ev.targets = []; ev.blockedIds = []; ev.at = null; ev.atList = [];
      for (const tg of list) {
        if (tg.fx.shield > t || tg.fx.ghost > t) { ev.blockedIds.push(tg.id); continue; }
        ev.targets.push(tg.id);
        this._ignore(m, tg, t + ({ yavas: 5, kucult: 6.5, bomba: 3.5 }[pid]));
        if (pid === 'yavas') tg.fx.slow = t + 4;
        else if (pid === 'kucult') { tg.fx.small = t + 6; tg.col.setRadius(r.P.r * 0.62); tg._small = true; }
        else {
          const tm = tg.body.mass(), side = this.rand() < 0.5 ? -1 : 1, R = tg.lastSample ? tg.lastSample.R : [1, 0, 0], T2 = tg.lastSample ? tg.lastSample.T : [0, 0, 1];
          tg.body.applyImpulse({ x: (R[0] * side * 1.5 - T2[0] * 6) * tm, y: 5.5 * tm, z: (R[2] * side * 1.5 - T2[2] * 6) * tm }, true);
          tg.fx.slow = Math.max(tg.fx.slow || 0, t + 2);
          const q = tg.body.translation(); ev.atList.push([q.x, q.y, q.z]); if (!ev.at) ev.at = [q.x, q.y, q.z];
        }
      }
      ev.blocked = !ev.targets.length && ev.blockedIds.length > 0;
    }

    // hedefin önündeki parkur noktası (kendi kulvarında); hunideyse çıkışından sonra
    _ahead(m, d) {
      const r = this.race, S = r.samples; let s = m.s + d;
      for (const z of r.track.zones) if (s > z.s0 - 2 && s < z.s1 + 2) s = z.s1 + 3;
      if (s > r.track.finishS - 3) return null;
      const lane = m.lastSample ? m.lastSample.lane : 0;
      let best = null, bd = 1e9;
      for (const q of S) { if (q.s < s - 0.5 || q.s > s + 3) continue; const dd = Math.abs(q.s - s) + (q.lane === lane ? 0 : 5); if (dd < bd && q.safe) { bd = dd; best = q; } }
      return best;
    }
    _teleport(m, d) {
      const r = this.race; let target = Math.min(m.s + d, r.track.finishS - 6);
      for (const z of r.track.zones) if (target > z.s0 - 2 && target < z.s1 + 2) target = z.s1 + 2.5;
      let sm = null; for (const q of r.safe) { if (q.s >= target) { sm = q; break; } }
      if (!sm || sm.s >= r.track.finishS - 2) return;
      const v = m.body.linvel(), sp = Math.min(8, Math.hypot(v.x, v.y, v.z));
      m.body.setTranslation({ x: sm.p[0], y: sm.p[1] + 0.3, z: sm.p[2] }, true);
      m.body.setLinvel({ x: sm.T[0] * sp, y: sm.T[1] * sp, z: sm.T[2] * sp }, true);
      m.s = sm.s; m.bestS = Math.max(m.bestS, sm.s); m.lastGain = r.t; m.lastSample = sm;
    }

    // her fizik adımında süren etkiler
    _apply(m, dt) {
      const r = this.race, t = r.t, fx = m.fx;
      if (!r.started || m.finished) return;
      const mass = m.body.mass(), v = m.body.linvel(), sp = Math.hypot(v.x, v.y, v.z), sm = m.lastSample, T = sm ? sm.T : null;
      // zıplarken ve turboda misket yolu takip etsin: viraj dönerken oluktan dışarı çıkmasın
      const homing = t - (fx.jumpAt || -9) < 1.6 ? 7 : fx.turbo > t ? 3 : 0;
      if (homing && sm) {
        const p = m.body.translation(), h = Math.hypot(T[0], T[2]) || 1, tx = T[0] / h, tz = T[2] / h;
        const along = v.x * tx + v.z * tz, lx = v.x - tx * along, lz = v.z - tz * along;   // yana kayan hız
        const ox = p.x - sm.p[0], oz = p.z - sm.p[2], oa = ox * tx + oz * tz, olx = ox - tx * oa, olz = oz - tz * oa; // orta çizgiden sapma
        const k = Math.min(0.9, homing * dt);
        m.body.applyImpulse({ x: (-lx * k - olx * homing * 0.8 * dt) * mass, y: 0, z: (-lz * k - olz * homing * 0.8 * dt) * mass }, true);
      }
      if (fx.turbo > t && T && sp < 12) m.body.applyImpulse({ x: T[0] * 9 * mass * dt, y: Math.min(0, T[1]) * 9 * mass * dt, z: T[2] * 9 * mass * dt }, true);
      if (fx.wind > t && T && !(fx.shield > t)) m.body.applyImpulse({ x: -T[0] * 8 * mass * dt, y: 0, z: -T[2] * 8 * mass * dt }, true);
      let damp = 0;
      if (fx.slow > t) damp += 3.0;
      if (fx.small > t) damp += 1.8;
      fx.inSlime = false;
      if (!(fx.shield > t) && !(fx.ghost > t)) for (const s of this.slimes) {
        if (s.owner === m.id) continue; // kendi balçığı işlemez
        if (m.s >= s.s0 && m.s <= s.s1) { const p = m.body.translation(); if (Math.hypot(p.x - s.p[0], p.y - s.p[1], p.z - s.p[2]) < s.r + 0.8) { damp += 5; fx.inSlime = true; } }
      }
      const push = fx.iron > t ? 3.5 : 0;
      if (push && T && sp < 11) m.body.applyImpulse({ x: T[0] * push * mass * dt, y: Math.min(0, T[1]) * push * mass * dt, z: T[2] * push * mass * dt }, true);
      if (damp > 0 && sp > 0.4) { const k = Math.min(0.9, damp * dt); m.body.applyImpulse({ x: -v.x * k * mass, y: -v.y * k * mass * 0.3, z: -v.z * k * mass }, true); }
    }

    // oyuncu kartları (arayüz için)
    handOf(id) { const h = this.hands[id]; return h && !h.used ? h : null; }
  }
  MG.PowerSystem = PowerSystem;
})(typeof window !== 'undefined' ? window : globalThis);
