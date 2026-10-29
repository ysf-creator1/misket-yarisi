/* Misket Yarışı — güçler, kart dağıtımı ve bot yapay zekâsı
 * Fizik tarafında çalışır (tarayıcı + Node testi). Görüntü tarafı race.events üzerinden haber alır.
 * Her 15–20 sn'de bir tüm misketlere 3 kart dağıtılır. Oyuncu 15 sn içinde seçer, botlar kişiliklerine göre seçer.
 */
(function (G) {
  'use strict';
  const MG = G.MG = G.MG || {};

  MG.POWERS = [
    { id: 'turbo', name: 'Turbo', icon: '🚀', type: 'self', tier: 1, value: 1.0, desc: '3 sn ileri fırla' },
    { id: 'zipla', name: 'Süper Zıplama', icon: '🦘', type: 'self', tier: 1, value: 0.6, desc: 'Duvar ve direklerin üstünden atla' },
    { id: 'kalkan', name: 'Kalkan', icon: '🛡️', type: 'self', tier: 1, value: 0.8, desc: '8 sn tuzaklardan korun (duvar hariç)' },
    { id: 'demir', name: 'Demir Misket', icon: '🔩', type: 'self', tier: 2, value: 0.75, desc: '6 sn ağır ve hızlı ol, duvarı kır' },
    { id: 'hayalet', name: 'Hayalet', icon: '👻', type: 'self', tier: 2, value: 0.65, desc: '4 sn misket ve engellerin içinden geç' },
    { id: 'isinlan', name: 'Işınlanma', icon: '🌀', type: 'self', tier: 3, value: 1.3, desc: 'Biraz ileri ışınlan' },
    { id: 'miknatis', name: 'Mıknatıs', icon: '🧲', type: 'self', tier: 2, value: 0.9, desc: '5 sn öndeki rakibe doğru çekil' },
    { id: 'balcik', name: 'Yapışkan Balçık', icon: '🟢', type: 'attack', tier: 1, value: 0.9, desc: 'Rakibin yoluna yapışkan balçık dök' },
    { id: 'duvar', name: 'Engel Duvarı', icon: '🧱', type: 'attack', tier: 2, value: 1.0, desc: 'Rakibin önüne duvar dik' },
    { id: 'yavas', name: 'Yavaşlatma', icon: '🐌', type: 'attack', tier: 1, value: 0.9, desc: 'Yakındaki 2 rakibi 4 sn yavaşlat' },
    { id: 'kucult', name: 'Küçült', icon: '🤏', type: 'attack', tier: 2, value: 0.7, desc: 'Yakındaki 2 rakibi 6 sn küçült' },
    { id: 'ruzgar', name: 'Ters Rüzgâr', icon: '💨', type: 'attack', tier: 3, value: 1.1, desc: 'Öndekileri 2,5 sn geri it' },
    { id: 'bomba', name: 'Bomba', icon: '💣', type: 'attack', tier: 2, value: 1.0, desc: 'Rakip kalabalığında patla, sersemlet' },
    { id: 'takas', name: 'Yer Değiştir', icon: '🔄', type: 'attack', tier: 3, value: 1.2, desc: 'Hemen öndeki rakiple yer değiştir' },
  ];
  MG.byId = Object.fromEntries(MG.POWERS.map(p => [p.id, p]));
  // lidere yetişme ayarları: lastik (lidere uzak kalan hafifçe itilir), rüzgâr tüneli (öndekinin arkasında çekilme), kaçan lider eşiği
  // (tünel ve lastik hafif tutulur: güçlüyse kartla kazanılan mesafeyi geri alıp kartları etkisiz bırakıyordu)
  MG.DENGE = { lastikBas: 16, lastikK: 0.09, lastikMax: 2.4, tunelMax: 6, tunelA: 0.6, kacan: 10, liderFren: 0.1 };
  MG.FLY = { bomba: 0.7, balcik: 0.62, ruzgar: 0.5 }; // uçuş süresi (sn): atan misketten hedefe
  // Biriktir modu: çanta 5 kart; iki kullanım arası 1,5 sn; Yer Değiştir parkurun son %10'unda kullanılamaz (bitişte lideri çizgide geçmek olmasın)
  MG.BAG = { size: 5, cd: 1.5, takasSon: 0.9 };
  MG.MODES = ['klasik', 'biriktir'];
  MG.PERSONALITIES = [
    { id: 'saldirgan', name: 'Saldırgan', attack: 1.6, self: 0.9, shield: 0.7 },
    { id: 'temkinli', name: 'Temkinli', attack: 0.8, self: 1.4, shield: 1.6 },
    { id: 'dengeli', name: 'Dengeli', attack: 1.1, self: 1.1, shield: 1.0 },
  ];

  // Çarpışma grupları: parkur 0x0001, her misketin kendi biti (0x0002 << id), güç duvarları 0x0100.
  // Bir tuzağı kuran misket, o tuzağın hedefiyle ve kendi duvarıyla çarpışmaz: kendi tuzağına takılmaz.
  const WALL_BIT = 0x0100;
  MG.OBST_BIT = 0x0200; // engeller (direk, tampon, tahta, pervane, piston…): hayalet bunlardan geçer
  const grp = (mem, filter) => ((mem & 0xFFFF) << 16) | (filter & 0xFFFF);
  const BASE_TIER = { 1: 1, 2: 0.6, 3: 0.22 }, BOOST = { 1: -0.4, 2: 0.5, 3: 3 };

  class PowerSystem {
    // opts: { playerId (-1: hepsi bot) ya da humans: [misket no…] (çok oyunculu), rand, firstAt, gap:[min,max], pickTime }
    constructor(race, opts = {}) {
      this.race = race; this.rand = opts.rand || race.rand;
      this.playerId = opts.playerId != null ? opts.playerId : -1;
      // kartını kendisi seçen insan oyuncular; diğerlerini bot seçer (çok oyunculuda oyundan düşenin yerine bot geçer)
      this.humans = new Set(opts.humans || (this.playerId >= 0 ? [this.playerId] : []));
      this.wallSeq = 0;
      this.pickTime = opts.pickTime || 15; // kart seçme süresi (sn)
      this.gap = opts.gap || [15, 20];
      this.next = opts.firstAt != null ? opts.firstAt : 8 + this.rand() * 3;
      this.hands = {}; this.walls = []; this.slimes = []; this.round = 0; this.delayed = []; // delayed: yolda olan bomba/balçık/rüzgâr
      this.stats = { used: 0 };
      // Biriktir modu: seçilen kart çantaya girer (en fazla MG.BAG.size), oyuncu istediği an kullanır
      this.mode = opts.mode === 'biriktir' ? 'biriktir' : 'klasik';
      this.bags = {}; this.lastUse = {}; this.botUseAt = 0;
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
      for (let i = 0; i < this.delayed.length; i++) { // yolda olan tuzak vardı: etkisini uygula
        const d = this.delayed[i]; if (t < d.at) continue;
        this.delayed.splice(i--, 1); this.activate(d.m, d.pid, d.tgs.filter(o => !o.finished));
      }
      if (t >= this.next) { this._deal(); this.next = t + this.gap[0] + this.rand() * (this.gap[1] - this.gap[0]); }
      // final kart turu: lider parkurun %70'ini geçince herkese ek kart (geridekilere güçlü kart şansı daha yüksek)
      if (!this.finalDone && r.leader().s > r.track.finishS * 0.7) {
        this.finalDone = true; this._deal(true); this.next = Math.max(this.next, t + this.pickTime + 2);
        r.events.push({ type: 'finalRound' });
      }
      for (const id in this.hands) {
        const h = this.hands[id], m = r.marbles[id];
        if (h.used) continue;
        if (m.finished || t > h.expires) { h.used = true; if (this.humans.has(+id)) r.events.push({ type: 'handGone', id: +id }); continue; }
        if (!this.humans.has(+id) && t >= h.botAt) this.choose(+id, this._botPick(m, h.cards));
      }
      if (this.mode === 'biriktir' && t >= this.botUseAt) { // botlar çantadaki kartı uygun anda kullanır (saniyede 4 kez bakar)
        this.botUseAt = t + 0.25;
        for (const m of r.marbles) if (!this.humans.has(m.id) && !m.finished) { const k = this._botUse(m); if (k >= 0) this.use(m.id, k); }
      }
      this._ironWalls();
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
      if (m.fx.jumpThru > t) filter &= ~MG.OBST_BIT; // engelin dibinden zıplarken yükselme anı
      const g = grp(m.bit, filter);
      if (g !== m._grp) { m.col.setCollisionGroups(g); m._grp = g; }
    }
    _ignore(caster, target, until) { caster.ignore[target.id] = Math.max(caster.ignore[target.id] || 0, until); this._groups(caster); }

    // kart dağıt: sıralamada geride olana güçlü kart çıkma şansı daha yüksek
    _deal(final) {
      const r = this.race, st = r.standings(), n = st.length;
      this.round++;
      st.forEach((m, idx) => {
        if (m.finished) return;
        if (this.mode === 'biriktir' && this.bagOf(m.id).length >= MG.BAG.size) return; // çanta dolu: kart gelmez
        const fb = final ? 1.8 : 1; // finalde geride olanın güçlü kart şansı daha da artar
        const frac = n > 1 ? idx / (n - 1) : 0, pool = MG.POWERS.map(p => ({ p, w: BASE_TIER[p.tier] * Math.max(0.15, 1 + BOOST[p.tier] * frac * fb) }));
        const cards = [];
        while (cards.length < 3) {
          const tot = pool.reduce((a, x) => a + x.w, 0); let q = this.rand() * tot;
          for (let k = 0; k < pool.length; k++) { q -= pool[k].w; if (q <= 0 || k === pool.length - 1) { cards.push(pool[k].p.id); pool.splice(k, 1); break; } }
        }
        this.hands[m.id] = { cards, dealt: r.t, expires: r.t + this.pickTime, botAt: r.t + 0.5 + this.rand() * 2.5, used: false };
        if (this.humans.has(m.id)) r.events.push({ type: 'hand', id: m.id, cards, expires: r.t + this.pickTime });
      });
    }

    _botPick(m, cards) {
      const r = this.race, st = r.standings(), idx = st.indexOf(m), n = st.length, frac = idx / Math.max(1, n - 1);
      const tgt = this.trapTargets(m, 'yavas', 1)[0], dist = tgt ? tgt.s - m.s : 99, per = m.persona;
      let best = 0, bv = -1;
      cards.forEach((id, k) => {
        const p = MG.byId[id]; let v = p.value;
        if (id === 'takas') { // yer değiştirme: önündeki ne kadar uzaksa o kadar değerli; önünde kimse yoksa işe yaramaz
          const o = this._swapTarget(m), gap = o ? o.s - m.s : 0;
          v *= o ? per.attack * Math.max(0.3, Math.min(1.6, gap / 10)) * (1 + 0.5 * frac) : 0;
        } else if (id === 'miknatis') {
          const o = this._pullTarget(m); v *= per.self * (o ? Math.max(0.5, Math.min(1.5, (o.s - m.s) / 12)) : 0.3);
        } else if (p.type === 'attack') {
          v *= per.attack;
          if (idx === 0) v *= 0.6;
          if (dist > 0 && dist < 12) v *= 1.4; else if (dist < 0 && dist > -7) v *= 1.2; else if (Math.abs(dist) > 30) v *= 0.5;
          if (this._farLeader(m) && id !== 'ruzgar') v *= 1.4; // lider kaçtı: onu yavaşlat
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
    // tuzak hedefi koşullara göre seçilir: yakındaki öndeki ya da arkadaki rakipler puanlanır
    //  - yakınlık (önde 30 m, arkada 15 m içinde), arkadan hızla yaklaşan tehdit, hemen öndeki (geçilecek) rakip
    //  - lider çok açıldıysa lider; kalkanlı/hayalet ve zaten etkilenmiş rakipler geri planda
    //  - bomba: rakiplerin kümelendiği yere
    trapTargets(m, pid, n = 1) {
      const r = this.race, t = r.t, st = r.standings().filter(o => !o.finished || o === m), idx = st.indexOf(m);
      const far = this._farLeader(m), mv = m.body.linvel(), T = m.lastSample ? m.lastSample.T : [0, 0, 1];
      const spd = v => v.x * T[0] + v.y * T[1] + v.z * T[2];
      const cand = [];
      for (const o of st) {
        if (o === m || o.finished) continue;
        const d = o.s - m.s; let w;
        if (d >= 0) w = d <= 30 ? 1.15 - d / 30 : 0;
        else {
          // tuzaklar çoğunlukla öndekilere: arkadaki yalnızca dibindeyse ve hızla geçmek üzereyse (geridekiler kopmasın)
          const closing = spd(o.body.linvel()) - spd(mv);
          w = -d < 4 && closing > 1.2 ? 0.3 + Math.min(0.3, closing / 10) : 0;
        }
        if (o === far) w = Math.max(w, 0.9) * 2;                     // kaçan lidere uzanılabilir
        if (w <= 0) continue;
        if (st.indexOf(o) === idx - 1) w *= 1.25;                    // hemen öndeki: geçmek istediğin
        const immune = o.fx.ghost > t || (o.fx.shield > t && pid !== 'duvar' && pid !== 'balcik');
        if (immune) w *= 0.12;
        if (o.fx.slow > t || o.fx.stun > t || (pid === 'kucult' && o._small)) w *= 0.5;
        if (pid === 'bomba') {                                       // yakınında başka rakip varsa daha değerli
          const c = o.body.translation(); let near = 0;
          for (const q of r.marbles) { if (q === m || q === o || q.finished) continue; const p = q.body.translation(); if (Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) < 3.5) near++; }
          w *= 1 + 0.6 * near;
        }
        w *= 0.9 + this.rand() * 0.2;
        cand.push({ o, w });
      }
      cand.sort((a, b) => b.w - a.w);
      const out = cand.slice(0, n).map(c => c.o);
      if (!out.length) { const tg = this.targetFor(m); if (tg) out.push(tg); }
      return out;
    }
    targetFor(m) {
      const st = this.race.standings().filter(o => !o.finished || o === m), idx = st.indexOf(m);
      if (idx > 0) return st[idx - 1];
      return st[idx + 1] || null;
    }

    choose(id, k) {
      const h = this.hands[id];
      if (!h || h.used || k == null || k < 0 || k > 2) return false;
      if (this.mode === 'biriktir') { // seçilen kart çantaya girer
        const bag = this.bagOf(id); if (bag.length >= MG.BAG.size) return false;
        h.used = true; bag.push(h.cards[k]); this._bagEvent(id);
        return true;
      }
      h.used = true;
      this.activate(this.race.marbles[id], h.cards[k]);
      return true;
    }

    // ---- Biriktir modu: çanta ----
    bagOf(id) { return this.bags[id] || (this.bags[id] = []); }
    _bagEvent(id) { if (this.humans.has(+id)) this.race.events.push({ type: 'bag', id: +id, cards: this.bagOf(id).slice(), cdUntil: (this.lastUse[id] || -9) + MG.BAG.cd }); }
    // çantadaki k. kart şu an kullanılabilir mi
    canUse(id, k) {
      const r = this.race, m = r.marbles[id], bag = this.bagOf(id), pid = bag[k];
      if (this.mode !== 'biriktir' || !pid || !r.started || r.done || m.finished) return false;
      if (r.t - (this.lastUse[id] != null ? this.lastUse[id] : -9) < MG.BAG.cd) return false;
      if (pid === 'takas' && m.s > r.track.finishS * MG.BAG.takasSon) return false;
      return true;
    }
    use(id, k) {
      if (k == null || !this.canUse(id, k)) return false;
      const pid = this.bagOf(id).splice(k, 1)[0];
      this.lastUse[id] = this.race.t;
      this.activate(this.race.marbles[id], pid);
      this._bagEvent(id);
      return true;
    }
    // bot: çantadaki hangi kartı şimdi kullanmalı (-1: bekle). İnsan gibi hemen değil, biraz gecikmeyle davranır.
    _botUse(m) {
      const r = this.race, t = r.t, bag = this.bagOf(m.id);
      if (!bag.length || r.t - (this.lastUse[m.id] != null ? this.lastUse[m.id] : -9) < MG.BAG.cd) return -1;
      const st = r.standings().filter(o => !o.finished || o === m), idx = st.indexOf(m), per = m.persona, fs = r.track.finishS;
      const endF = m.s / fs, full = bag.length >= MG.BAG.size;
      const incoming = this.delayed.some(d => d.tgs.includes(m) && d.m !== m); // üstüne bomba/balçık/rüzgâr uçuyor
      const tgt = this.trapTargets(m, 'yavas', 1)[0], dist = tgt ? tgt.s - m.s : 99;
      const p = m.body.translation(), T = m.lastSample && !m.inZone ? m.lastSample.T : null;
      const wallAhead = !!T && this.walls.some(w => { if (w.owner === m.id) return false; const dx = w.p[0] - p.x, dy = w.p[1] - p.y, dz = w.p[2] - p.z, a = dx * T[0] + dy * T[1] + dz * T[2]; return a > 1 && a < 7 && Math.hypot(dx, dy, dz) < 8; });
      const zoneNear = r.track.zones.some(z => z.s0 > m.s - 1 && z.s0 - m.s < 14);
      let best = -1, bv = 0;
      bag.forEach((id, k) => {
        if (!this.canUse(m.id, k)) return;
        const P = MG.byId[id]; let v = 0;
        if (id === 'kalkan') v = incoming ? 6 : (m.fx.slow > t || m.fx.stun > t || m.fx.small > t) ? 2.2 : idx === 0 && endF > 0.75 ? 1 : 0;
        else if (id === 'takas') { const o = this._swapTarget(m), gap = o ? o.s - m.s : 0; v = o && gap > 5 ? 1.2 + gap / 10 : 0; }
        else if (id === 'ruzgar') v = r.marbles.filter(o => o !== m && !o.finished && o.s > m.s && o.s - m.s < 40).length >= 2 ? 2 : 0;
        else if (P.type === 'attack') v = tgt && dist > 0 && dist < 14 ? 2 : tgt && dist < 0 && dist > -6 ? 1.2 : 0;
        else if (id === 'zipla' || id === 'hayalet') v = wallAhead ? 4 : !T ? 0 : 0.5;
        else if (id === 'demir') v = wallAhead ? 4 : T ? 1.4 : 0;
        else if (id === 'miknatis') { const o = this._pullTarget(m); v = T && o && o.s - m.s > 4 ? 1.8 : 0; }
        else if (id === 'isinlan') v = T && !zoneNear ? 1.6 : 0;
        else if (id === 'turbo') v = T && !zoneNear && m.speed < 11 ? 1.6 : 0;
        v *= P.type === 'attack' ? per.attack : id === 'kalkan' ? per.shield : per.self;
        if (v > bv) { bv = v; best = k; }
      });
      if (best < 0) return -1;
      // eşik: çanta dolu ya da bitişe yakınsa daha kolay kullanır; tepki biraz gecikmeli (her bakışta her zaman değil)
      const lim = incoming && bag[best] === 'kalkan' ? 0 : full || endF > 0.85 ? 0.5 : 1.5;
      if (bv < lim) return -1;
      return this.rand() < (incoming ? 0.7 : 0.35) ? best : -1;
    }

    // forced: uçan tuzak varınca (bomba, balçık, rüzgâr) atış anında seçilen hedefler
    activate(m, pid, forced) {
      const r = this.race, t = r.t, fx = m.fx, p = MG.byId[pid], mass = m.body.mass();
      const sm = m.lastSample, T = sm ? sm.T : [0, 0, 1];
      const ev = { type: 'power', id: m.id, power: pid, target: null, blocked: false };
      if (!forced) this.stats.used++;
      // bomba, balçık ve ters rüzgâr atan misketten hedefe uçar; etki varınca işler
      if (MG.FLY[pid] && !forced) {
        const tgs = pid === 'ruzgar' ? this._windList(m) : this.trapTargets(m, pid, 1);
        if (tgs.length) { r.events.push({ type: 'atis', id: m.id, power: pid, targets: tgs.map(o => o.id), sure: MG.FLY[pid] }); this.delayed.push({ at: t + MG.FLY[pid], m, pid, tgs }); return; }
      }
      if (p.type === 'self') {
        if (pid === 'turbo') { fx.turbo = t + 3; fx.safe = t + 4; }
        else if (pid === 'zipla') {
          // alçak ve parkur yönünde ileri sıçrama; düşerse kaldığı yere geri konur (zaman kaybı yok)
          // tepe ≈ 2,4 m (Engel Duvarı 1,5 m), ≈10 m ileri (3 sıra çarpma direği); havada yolu takip eder
          const h = Math.hypot(T[0], T[2]) || 1, v = m.body.linvel(), along = Math.max(0, (v.x * T[0] + v.z * T[2]) / h);
          let fwd = Math.max(10.5, Math.min(13.5, along + 4)), vy = 10.2;
          // önünde huni varsa huninin üstünden aşıp dışarı uçmasın: girişin önüne inecek kadar kısa zıpla
          const z = m.inZone || r.track.zones.find(q => q.s0 > m.s - 1 && q.s0 - m.s < 18);
          if (z) { const room = m.inZone ? 0 : z.s0 - m.s - 1.5; vy = 7; fwd = Math.max(along, Math.min(fwd, room / 0.7)); } // hiçbir zaman yavaşlatmaz
          let blocked = false;
          if (!z) try {
            const q = m.body.translation(), o = { x: q.x, y: q.y, z: q.z }, dir = { x: T[0], y: T[1], z: T[2] };
            blocked = !!r.world.castRay(new r.R.Ray(o, dir), 1.9, true, undefined, undefined, m.col, m.body)
              // misket genişliğinde süpür: tam önde değil de yanda kalan direk/kazık/duvar da görülsün
              || !!r.world.castShape(o, { x: 0, y: 0, z: 0, w: 1 }, dir, new r.R.Ball(r.P.r * 0.9), 0, 2.2, true, undefined, grp(0xFFFF, MG.OBST_BIT | WALL_BIT), m.col, m.body);
          } catch (e) { }
          // dibindeki engel: önce yukarı (yükselirken direk ve kazıklara takılmaz), sonra ileri
          if (blocked) { m.body.setLinvel({ x: T[0] / h * 0.6, y: 11.5, z: T[2] / h * 0.6 }, true); fx.jumpFwdAt = t + 0.26; fx.jumpFwd = fwd; fx.jumpThru = t + 0.3; this._groups(m); }
          else m.body.setLinvel({ x: T[0] / h * fwd, y: vy, z: T[2] / h * fwd }, true);
          fx.jumpAt = t; fx.safe = t + 2.5;
        }
        else if (pid === 'kalkan') { fx.shield = t + 8; fx.slow = fx.stun = fx.wind = 0; if (m._small) { fx.small = 0; m.col.setRadius(r.P.r); m._small = false; } }
        else if (pid === 'demir') { fx.iron = t + 6; fx.safe = t + 6; m.body.setAdditionalMass(mass * 3, true); m._iron = true; }
        else if (pid === 'hayalet') { fx.ghost = t + 4; fx.safe = t + 4; m._ghost = true; this._groups(m); }
        else if (pid === 'miknatis') { fx.magnet = t + 5; fx.safe = t + 5.5; }
        else if (pid === 'isinlan') { const from = m.body.translation(); ev.from = [from.x, from.y, from.z]; this._teleport(m, 6.5); const to = m.body.translation(); ev.to = [to.x, to.y, to.z]; }
      } else if (pid === 'takas') {
        const tg = this._swapTarget(m);
        if (!tg) ev.none = true;
        else if (tg.fx.shield > t || tg.fx.ghost > t) { ev.target = tg.id; ev.blocked = true; }
        else { ev.target = tg.id; this._swap(m, tg, ev); }
      } else if (pid === 'ruzgar') {
        const list = forced || this._windList(m);
        ev.targets = [];
        for (const o of list) { if (o.fx.shield > t || o.fx.ghost > t) { ev.blockedIds = (ev.blockedIds || []).concat(o.id); continue; } o.fx.wind = t + 2.5; ev.targets.push(o.id); this._ignore(m, o, t + 3.5); }
      } else {
        const tg = forced ? forced[0] : this.trapTargets(m, pid, 1)[0]; if (!tg) { r.events.push(ev); return; }
        ev.target = tg.id;
        if (pid === 'bomba') { this._bomb(m, ev, tg); r.events.push(ev); return; }
        if (pid === 'yavas' || pid === 'kucult') { this._multi(m, pid, ev); r.events.push(ev); return; }
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
            const w = { id: ++this.wallSeq, col, until: t + 4, p: p0, q, half, owner: m.id, R: pt.R, U: pt.U, N: G.MP.v.cross(pt.R, pt.U) }; this.walls.push(w); ev.wall = w;
          }
        }
      }
      r.events.push(ev);
    }

    // yavaşlatma / küçültme / bomba: öndeki en yakın iki rakibe işler, kuran onların içinden geçer
    _multi(m, pid, ev) {
      const r = this.race, t = r.t, list = this.trapTargets(m, pid, 2);
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

    // bomba: öndeki rakibin olduğu yerde patlar; 3,5 m içindeki herkes (kuran, kalkanlı, hayalet hariç) savrulur ve 1 sn sersemler
    // ters rüzgârın hedefleri: öndekiler (40 m), seni geçmek üzere olan yakın kovalayan
    _windList(m) {
      const r = this.race;
      const hit = r.marbles.filter(o => o !== m && !o.finished && ((o.s > m.s && o.s - m.s < 40) || (o.s <= m.s && m.s - o.s < 4)));
      return hit.length ? hit : r.marbles.filter(o => o !== m && !o.finished && Math.abs(o.s - m.s) < 20);
    }
    _bomb(m, ev, forcedTg) {
      const r = this.race, t = r.t;
      const tg = forcedTg || this.trapTargets(m, 'bomba', 1)[0];
      if (!tg) return;
      const c = tg.body.translation(), T = tg.lastSample ? tg.lastSample.T : [0, 0, 1];
      ev.at = [c.x, c.y, c.z]; ev.atList = [ev.at]; ev.targets = []; ev.blockedIds = []; ev.target = tg.id;
      for (const o of r.marbles) {
        if (o === m || o.finished) continue;
        const p = o.body.translation(), dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, p.y - c.y, dz);
        if (d > 3.5) continue;
        if (o.fx.shield > t || o.fx.ghost > t) { ev.blockedIds.push(o.id); continue; }
        const hl = Math.hypot(dx, dz), ox = hl > 0.2 ? dx / hl : 0, oz = hl > 0.2 ? dz / hl : 0, k = 1 - d / 4.5, om = o.body.mass();
        o.body.applyImpulse({ x: (ox * 3.5 - T[0] * 6) * k * om, y: 5 * k * om, z: (oz * 3.5 - T[2] * 6) * k * om }, true);
        o.fx.stun = t + 1.5;
        ev.targets.push(o.id);
        this._ignore(m, o, t + 3);
      }
      ev.blocked = !ev.targets.length && ev.blockedIds.length > 0;
    }
    // lider 2.'den çok öndeyse (MG.DENGE.kacan m+) ve m lider değilse lideri döndür: geridekilerin umudu kalsın
    _farLeader(m) {
      const st = this.race.standings().filter(o => !o.finished), idx = st.indexOf(m);
      if (st.length < 2 || idx <= 0 || idx > 2) return null; // sadece kovalayan ilk 3 lidere uzanır; gerisi önündekine
      return st[0].s - st[1].s > MG.DENGE.kacan ? st[0] : null;
    }
    // yer değiştirme hedefi: önündeki en yakın (bitirmemiş) rakip, 35 m içinde
    _swapTarget(m) {
      let best = null;
      for (const o of this.race.marbles) { if (o === m || o.finished || o.s <= m.s + 0.5 || o.s - m.s > 35) continue; if (!best || o.s < best.s) best = o; }
      return best;
    }
    // mıknatısın çektiği rakip: önündeki en yakın, 45 m içinde
    _pullTarget(m) {
      let best = null;
      for (const o of this.race.marbles) { if (o === m || o.finished || o.s <= m.s + 0.3 || o.s - m.s > 45) continue; if (!best || o.s < best.s) best = o; }
      return best;
    }
    // iki misket yer değiştirir: konum, hız, parkurdaki ilerleme; geri düşen misketin rekoru da geri alınır (kaldığı yere geri konmasın)
    _swap(m, o, ev) {
      const r = this.race, t = r.t, a = m.body.translation(), b = o.body.translation(), va = m.body.linvel(), vb = o.body.linvel();
      const A = { x: a.x, y: a.y, z: a.z }, B = { x: b.x, y: b.y, z: b.z }, VA = { x: va.x, y: va.y, z: va.z }, VB = { x: vb.x, y: vb.y, z: vb.z };
      m.body.setTranslation(B, true); o.body.setTranslation(A, true); m.body.setLinvel(VB, true); o.body.setLinvel(VA, true);
      const sm = m.s, so = o.s, lm = m.lastSample, lo = o.lastSample, zm = m.inZone, zo = o.inZone;
      m.s = so; m.lastSample = lo; m.inZone = zo; m.bestS = Math.max(m.bestS, so);
      o.s = sm; o.lastSample = lm; o.inZone = zm; o.bestS = sm;
      for (const q of [m, o]) { q.lastGain = t; q.anchor = null; }
      this._ignore(m, o, t + 1); this._ignore(o, m, t + 1);
      ev.from = [A.x, A.y, A.z]; ev.to = [B.x, B.y, B.z];
    }
    // demir misket Engel Duvarı'na değerse duvar kırılır, demir etkisi biter
    _ironWalls() {
      const r = this.race, t = r.t;
      for (const m of r.marbles) {
        if (!(m.fx.iron > t)) continue;
        const p = m.body.translation(), rad = m.col.radius();
        for (let i = this.walls.length - 1; i >= 0; i--) {
          const w = this.walls[i], d = [p.x - w.p[0], p.y - w.p[1], p.z - w.p[2]], dot = (a) => d[0] * a[0] + d[1] * a[1] + d[2] * a[2];
          if (Math.abs(dot(w.R)) < w.half[0] + rad && Math.abs(dot(w.U)) < w.half[1] + rad && Math.abs(dot(w.N)) < w.half[2] + rad + 0.12) {
            r.world.removeCollider(w.col, true); this.walls.splice(i, 1);
            m.fx.iron = t; m.body.setAdditionalMass(0, true); m._iron = false;
            r.events.push({ type: 'wallBreak', id: m.id, wall: w, at: w.p });
            break;
          }
        }
      }
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
      // hunide parkur yönü yoktur (son örnek huniye girmeden önceki yol): yöne bağlı itişler (turbo, mıknatıs, lastik, rüzgâr…)
      // misketi huni duvarına ve dışarı sürüyordu → hunideyken kapalı
      const mass = m.body.mass(), v = m.body.linvel(), sp = Math.hypot(v.x, v.y, v.z), sm = m.lastSample, T = sm && !m.inZone ? sm.T : null;
      if (fx.jumpFwdAt && t >= fx.jumpFwdAt && T) { // engelin üstüne çıktı: şimdi ileri
        const h = Math.hypot(T[0], T[2]) || 1; m.body.setLinvel({ x: T[0] / h * fx.jumpFwd, y: v.y, z: T[2] / h * fx.jumpFwd }, true); fx.jumpFwdAt = 0;
      }
      // liderden geride kalan hafifçe yetişir (lastik etkisi): yarıştan kopmasın, lider rahat kaçamasın
      const D = MG.DENGE;
      if (T && sp < 12.5) {
        let lead = 0, second = 0;
        for (const o of r.marbles) { if (o.finished) continue; if (o.s > lead) { second = lead; lead = o.s; } else if (o.s > second) second = o.s; }
        const gap = lead - m.s;
        if (gap > D.lastikBas && !(fx.slow > t) && !(fx.stun > t)) { const a = Math.min(D.lastikMax, (gap - D.lastikBas) * D.lastikK) * mass * dt; m.body.applyImpulse({ x: T[0] * a, y: T[1] * a, z: T[2] * a }, true); }
        // tek başına kaçan lider (2.'den 8 m+ önde) çok hafif frenlenir: önü boş olduğu için çarpışmasız gidiyordu
        if (gap <= 0 && lead - second > 8 && D.liderFren > 0 && !(fx.turbo > t) && !(fx.magnet > t)) { const k = Math.min(0.5, D.liderFren * Math.min(2, (lead - second - 8) / 8)) * dt; m.body.applyImpulse({ x: -v.x * k * mass, y: 0, z: -v.z * k * mass }, true); }
      }
      // mıknatıs: öndeki en yakın rakibe doğru çekilir (yaklaştıkça içinden geçer); önünde kimse yoksa hafif itiş
      if (fx.magnet > t && T && sp < 13) {
        const o = this._pullTarget(m), gap = o ? o.s - m.s : 0, a = (o ? 4 + Math.min(3, gap * 0.12) : 2) * mass * dt;
        m.body.applyImpulse({ x: T[0] * a, y: Math.min(0, T[1]) * a, z: T[2] * a }, true);
        if (o && gap < 3) this._ignore(m, o, t + 0.4);
      }
      // zıplarken ve turboda misket yolu takip etsin: viraj dönerken oluktan dışarı çıkmasın
      const homing = t - (fx.jumpAt || -9) < 1.6 ? 7 : (fx.turbo > t || fx.magnet > t) ? 3 : 0;
      if (homing && T) {
        const p = m.body.translation(), h = Math.hypot(T[0], T[2]) || 1, tx = T[0] / h, tz = T[2] / h;
        const along = v.x * tx + v.z * tz, lx = v.x - tx * along, lz = v.z - tz * along;   // yana kayan hız
        const ox = p.x - sm.p[0], oz = p.z - sm.p[2], oa = ox * tx + oz * tz, olx = ox - tx * oa, olz = oz - tz * oa; // orta çizgiden sapma
        const k = Math.min(0.9, homing * dt);
        m.body.applyImpulse({ x: (-lx * k - olx * homing * 0.8 * dt) * mass, y: 0, z: (-lz * k - olz * homing * 0.8 * dt) * mass }, true);
        // kenara çok yaklaşırsa (duvarın üstünden aşmak üzere) sert biçimde içeri çek: yandan düşmesin
        const off = Math.hypot(olx, olz), lim = Math.max(0.4, (sm.hw || 2) - 0.6);
        if (off > lim) { const vin = (lx * olx + lz * olz) / off; if (vin > 0) m.body.applyImpulse({ x: -olx / off * vin * mass, y: 0, z: -olz / off * vin * mass }, true); }
      }
      // rüzgâr tüneli: hemen öndeki misketin 0,8–6 m arkasındaysan hafifçe öne çekilirsin (arkadan yetişme şansı)
      // yalnız ikisi de ilerliyorsa (≥2 m/sn): çukurda birikmiş misketleri sallayıp takılı tutmasın
      if (T && sp < 11 && v.x * T[0] + v.y * T[1] + v.z * T[2] > 2) {
        const p = m.body.translation();
        for (const o of r.marbles) {
          if (o === m || o.finished || o.speed < 2) continue;
          const ds = o.s - m.s; if (ds < 0.8 || ds > D.tunelMax) continue;
          const q = o.body.translation(); if (Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > D.tunelMax + 0.5) continue;
          m.body.applyImpulse({ x: T[0] * D.tunelA * mass * dt, y: 0, z: T[2] * D.tunelA * mass * dt }, true); fx.draft = t + 0.2; break;
        }
      }
      if (fx.turbo > t && T && sp < 12) m.body.applyImpulse({ x: T[0] * 9 * mass * dt, y: Math.min(0, T[1]) * 9 * mass * dt, z: T[2] * 9 * mass * dt }, true);
      const shielded = fx.shield > t;
      if (fx.wind > t && T && !shielded) m.body.applyImpulse({ x: -T[0] * 8 * mass * dt, y: 0, z: -T[2] * 8 * mass * dt }, true);
      let damp = 0;
      if (!shielded) {
        if (fx.slow > t) damp += 3.0;
        if (fx.small > t) damp += 1.8;
        if (fx.stun > t) damp += 5.5; // sersem
      }
      fx.inSlime = false;
      const jumping = t - (fx.jumpAt || -9) < 0.4; // zıplamanın ilk anı: balçık misketi yerde tutmasın
      if (!(fx.shield > t) && !(fx.ghost > t) && !jumping) for (const s of this.slimes) {
        if (s.owner === m.id) continue; // kendi balçığı işlemez
        if (m.s >= s.s0 && m.s <= s.s1) {
          const p = m.body.translation(), dx = p.x - s.p[0], dy = p.y - s.p[1], dz = p.z - s.p[2];
          const up = s.U ? dx * s.U[0] + dy * s.U[1] + dz * s.U[2] : 0; // balçık yüzeyinden yükseklik: havadaki misketi yavaşlatmaz
          if (up < 0.35 && Math.hypot(dx, dy, dz) < s.r + 0.8) { damp += 5; fx.inSlime = true; }
        }
      }
      const push = fx.iron > t ? 3.5 : fx.ghost > t ? 2 : 0; // hayalet de hafifçe ileri süzülür
      if (push && T && sp < 11) m.body.applyImpulse({ x: T[0] * push * mass * dt, y: Math.min(0, T[1]) * push * mass * dt, z: T[2] * push * mass * dt }, true);
      if (damp > 0 && sp > 0.4) { const k = Math.min(0.9, damp * dt); m.body.applyImpulse({ x: -v.x * k * mass, y: -v.y * k * mass * 0.3, z: -v.z * k * mass }, true); }
    }

    // oyuncu kartları (arayüz için)
    handOf(id) { const h = this.hands[id]; return h && !h.used ? h : null; }
  }
  MG.PowerSystem = PowerSystem;
})(typeof window !== 'undefined' ? window : globalThis);
