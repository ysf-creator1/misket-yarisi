/* Misket Yarışı — çok oyunculu bağlantı (istemci)
 * Fizik sunucuda çalışır; burada gelen konumlar ara değerle oynatılır.
 * RemoteRace, js/fizik.js'teki Race ile aynı arayüzü taklit eder: oyun.js'teki kamera, HUD, kartlar ve efektler aynen çalışır.
 */
(function () {
  'use strict';
  const VARSAYILAN = 'wss://misket-yarisi.swedencentral.cloudapp.azure.com/ws';
  const KEY = 'misket-ag-anahtar';
  const DELAY = 0.12;                // oynatma gecikmesi (sn): iki anlık görüntü arasında yumuşak geçiş
  let sunucu = VARSAYILAN;
  try { const q = new URLSearchParams(location.search).get('sunucu'); if (q && /^wss?:\/\//.test(q)) { sunucu = q; sessionStorage.setItem('misket-sunucu', q); } else { const s = sessionStorage.getItem('misket-sunucu'); if (s) sunucu = s; } } catch (e) { }

  const Ag = window.Ag = { url: sunucu, ws: null, connected: false, want: false, pid: null, room: null, race: null, handlers: {}, profile: null, retry: 0, ping: null };
  Ag.on = (type, fn) => { Ag.handlers[type] = fn; };
  const emit = (type, msg) => { const f = Ag.handlers[type]; if (f) try { f(msg); } catch (e) { console.error(e); } };
  Ag.send = o => { if (Ag.ws && Ag.ws.readyState === 1) { Ag.ws.send(JSON.stringify(o)); return true; } return false; };
  const getKey = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const setKey = k => { try { localStorage.setItem(KEY, k); } catch (e) { } };

  // profil: { ad, eq, acik } — bağlanınca sunucuya bildirilir
  Ag.connect = function (profile) {
    Ag.profile = profile || Ag.profile; Ag.want = true;
    if (Ag.ws && (Ag.ws.readyState === 0 || Ag.ws.readyState === 1)) { if (Ag.ws.readyState === 1) hello(); return; }
    const k = getKey();
    let ws; try { ws = new WebSocket(Ag.url + (k ? '?anahtar=' + encodeURIComponent(k) : '')); } catch (e) { emit('durum', { bagli: false, hata: true }); return; }
    ws.binaryType = 'arraybuffer'; Ag.ws = ws;
    emit('durum', { bagli: false, baglaniyor: true });
    ws.onopen = () => { Ag.connected = true; Ag.retry = 0; hello(); clearInterval(Ag.ping); Ag.ping = setInterval(() => Ag.send({ t: 'ping', c: Date.now() }), 10000); };
    ws.onmessage = ev => {
      if (typeof ev.data !== 'string') { if (Ag.race) Ag.race.onSnap(new DataView(ev.data)); return; }
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      switch (m.t) {
        case 'hosgeldin': Ag.pid = m.pid; Ag.ad = m.ad; setKey(m.anahtar); emit('durum', { bagli: true }); break; // ad: sunucunun onayladığı görünen ad
        case 'oda': Ag.room = m; emit('oda', m); break;
        case 'odadanCikti': Ag.room = null; emit('oda', null); break;
        case 'basla': emit('basla', m); break;
        case 'olaylar': if (Ag.race) Ag.race.onEvents(m.e); break;
        case 'el': if (Ag.race) Ag.race.events.push({ type: 'hand', id: Ag.race.me, cards: m.cards, expires: m.expires }); break;
        case 'elGitti': if (Ag.race) Ag.race.events.push({ type: 'handGone', id: Ag.race.me }); break;
        case 'sonuc': if (Ag.race) Ag.race.onResult(m); emit('sonuc', m); break;
        case 'hata': emit('hata', m); break;
        case 'surumEski': emit('surumEski', m); break; // sunucu daha yeni: sayfa yenilenmeli
      }
    };
    ws.onclose = () => {
      if (Ag.ws !== ws) return;
      Ag.connected = false; Ag.ws = null; clearInterval(Ag.ping);
      emit('durum', { bagli: false });
      if (Ag.want) { const d = Math.min(5000, 800 * Math.pow(1.6, Ag.retry++)); setTimeout(() => { if (Ag.want && !Ag.ws) Ag.connect(); }, d); }
    };
    ws.onerror = () => { };
  };
  // token: kayıtlı adın sahibi olduğunu gösterir (yoksa sunucu misafir adı verir); eq: kostüm (diğer oyuncular görür)
  function hello() { const p = Ag.profile || {}; Ag.send({ t: 'merhaba', ad: p.ad, eq: p.eq, acik: p.acik, token: p.token || '', surum: window.OYUN_SURUM || 0 }); }
  Ag.disconnect = function () { Ag.want = false; Ag.room = null; if (Ag.ws) try { Ag.ws.close(); } catch (e) { } Ag.ws = null; Ag.connected = false; };

  // ================= uzak yarış =================
  function lowerBound(S, s) { let a = 0, b = S.length; while (a < b) { const m = (a + b) >> 1; if (S[m].s < s) a = m + 1; else b = m; } return a; }
  class FakeBody {
    constructor() { this.p = { x: 0, y: 0, z: 0 }; this.q = { x: 0, y: 0, z: 0, w: 1 }; this.v = { x: 0, y: 0, z: 0 }; }
    translation() { return this.p; } rotation() { return this.q; } linvel() { return this.v; } mass() { return 1; }
  }
  const FX_BITS = [['shield', 2], ['turbo', 4], ['slow', 8], ['small', 16], ['ghost', 32], ['iron', 64], ['wind', 128], ['stun', 256]];

  class RemoteRace {
    // start: sunucunun 'basla' mesajı
    constructor(track, start) {
      this.track = track; this.samples = track.samples; this.P = window.MF.PARAMS;
      this.t = start.t0 || 0; this.clock = start.saat || 0; this.pc = null;
      this.started = this.t > 0; this.done = false; this.timeScale = 1;
      this.events = []; this.pending = []; this.snaps = []; this.finishOrder = []; this.walls = new Map();
      this.me = start.benim; this.racers = start.yarisanlar || {};
      this.marbles = window.MF.MARBLES.map((info, i) => {
        const h = this.racers[i];
        return { id: i, info: h ? Object.assign({}, info, { name: h.ad, marbleName: info.name }) : info, human: !!h, body: new FakeBody(), s: 0, bestS: 0, fx: {}, place: null, finished: false, finishTime: null, lastSample: null, inZone: null, speed: 0 };
      });
      const kinPose = window.MF.kinPose, pistonPos = window.MF.Race.prototype.pistonPos, MP = window.MP, self = this;
      this.spinners = []; this.pistons = []; this.kins = [];
      for (const pr of track.prims) {
        if (pr.type === 'spinner') this.spinners.push({ pr, body: { rotation: () => MP.qmul(pr.q, MP.qY(self.clock * pr.speed)), translation: () => ({ x: pr.p[0], y: pr.p[1], z: pr.p[2] }) } });
        else if (pr.type === 'piston') this.pistons.push({ pr, body: { translation: () => pistonPos(pr, self.clock), rotation: () => pr.q } });
        else if (pr.type === 'kin') this.kins.push({ pr, body: { translation: () => { const P = kinPose(pr, self.clock); return { x: P.p[0], y: P.p[1], z: P.p[2] }; }, rotation: () => kinPose(pr, self.clock).q } });
      }
      const send = o => Ag.send(o);
      this.powers = { pickTime: start.pickTime || 10, hands: {}, choose(id, k) { return send({ t: 'kart', k }); } };
    }
    openGate() { } // kapıyı sunucu açar
    dispose() { if (Ag.race === this) Ag.race = null; }
    onSnap(dv) {
      if (dv.getUint8(0) !== 1) return;
      const n = dv.getUint8(1), sn = { t: dv.getFloat32(4, true), c: dv.getFloat32(8, true), d: new Float32Array(n * 11), f: new Uint16Array(n), pl: new Uint8Array(n), z: new Uint8Array(n) };
      for (let i = 0; i < n; i++) {
        const o = 12 + i * 48;
        for (let j = 0; j < 11; j++) sn.d[i * 11 + j] = dv.getFloat32(o + j * 4, true);
        sn.f[i] = dv.getUint16(o + 44, true); sn.pl[i] = dv.getUint8(o + 46); sn.z[i] = dv.getUint8(o + 47);
      }
      const last = this.snaps[this.snaps.length - 1];
      if (last && sn.c <= last.c) return;
      this.snaps.push(sn); if (this.snaps.length > 80) this.snaps.shift();
      if (this.pc === null) this._apply(sn, sn, 0);
    }
    onEvents(list) {
      for (const e of list) {
        if (e.type === 'end') continue; // bitişi sonuç mesajı belirler
        if (e.type === 'power' && e.wall) this.walls.set(e.wall.id, e.wall);
        if (e.type === 'wallBreak' && e.wall) e.wall = this.walls.get(e.wall.id) || e.wall;
        this.pending.push(e);
      }
    }
    onResult(m) {
      this._release(Infinity);
      const byId = {}; for (const x of m.sira) byId[x.id] = x;
      this.finishOrder = [];
      for (const x of m.sira) { const mb = this.marbles[x.id]; mb.place = x.place; if (x.time != null) { mb.finished = true; mb.finishTime = x.time; } this.finishOrder.push(mb); }
      this.done = true; this.events.push({ type: 'end' });
    }
    _release(c) {
      while (this.pending.length && this.pending[0]._c <= c) {
        const e = this.pending.shift();
        if (e.type === 'gate') this.started = true;
        if (e.type === 'finish') { const mb = this.marbles[e.id]; mb.finished = true; mb.place = e.place; mb.finishTime = e.time; if (!this.finishOrder.includes(mb)) this.finishOrder.push(mb); }
        this.events.push(e);
      }
    }
    step(dt) {
      const S = this.snaps; if (!S.length) return;
      const latest = S[S.length - 1], target = latest.c - DELAY;
      if (this.pc === null || Math.abs(this.pc - target) > 0.6) this.pc = target;
      else this.pc += dt + (target - this.pc) * Math.min(1, dt * 2);
      let k = 0; while (k < S.length - 2 && S[k + 1].c <= this.pc) k++;
      const a = S[k], b = S[Math.min(k + 1, S.length - 1)];
      const u = b.c > a.c ? Math.max(0, Math.min(1.25, (this.pc - a.c) / (b.c - a.c))) : 0; // en son görüntüyü biraz aşınca hızla tahmin
      this._apply(a, b, u);
      this._release(this.clock);
      while (S.length > 3 && S[1].c < this.pc - 1) S.shift();
    }
    _apply(a, b, u) {
      this.clock = a.c + (b.c - a.c) * u; this.t = Math.max(0, a.t + (b.t - a.t) * u);
      if (this.t > 0) this.started = true;
      const t = this.t, zones = this.track.zones;
      this.marbles.forEach((m, i) => {
        const A = a.d, B = b.d, o = i * 11, L = j => A[o + j] + (B[o + j] - A[o + j]) * u;
        m.body.p = { x: L(0), y: L(1), z: L(2) };
        let qx = L(3), qy = L(4), qz = L(5), qw = L(6); const ql = Math.hypot(qx, qy, qz, qw) || 1;
        m.body.q = { x: qx / ql, y: qy / ql, z: qz / ql, w: qw / ql };
        m.body.v = { x: L(7), y: L(8), z: L(9) };
        m.s = L(10); m.bestS = Math.max(m.bestS, m.s); m.speed = Math.hypot(m.body.v.x, m.body.v.y, m.body.v.z);
        const f = (u < 0.5 ? a : b).f[i];
        for (const [k, bit] of FX_BITS) m.fx[k] = f & bit ? t + 0.25 : 0;
        m.fx.inSlime = !!(f & 512);
        const zi = (u < 0.5 ? a : b).z[i]; m.inZone = zi ? zones[zi - 1] : null;
        if ((a.f[i] & 1) && !m.finished && a.pl[i]) { m.finished = true; m.place = a.pl[i]; m.finishTime = t; if (!this.finishOrder.includes(m)) this.finishOrder.push(m); } // geç bağlanan için
        m.lastSample = this._sample(m);
      });
    }
    // en yakın parkur noktası (kamera yönü, yan kamera türü için)
    _sample(m) {
      const S = this.samples, p = m.body.p; let i = lowerBound(S, m.s - 4), best = m.lastSample, bd = Infinity;
      for (; i < S.length && S[i].s <= m.s + 4; i++) { const q = S[i].p, d = (q[0] - p.x) ** 2 + (q[1] - p.y) ** 2 + (q[2] - p.z) ** 2; if (d < bd) { bd = d; best = S[i]; } }
      return best;
    }
    standings() {
      const fin = this.marbles.filter(m => m.finished).sort((a, b) => a.place - b.place);
      const rest = this.marbles.filter(m => !m.finished).sort((a, b) => b.s - a.s);
      return fin.concat(rest);
    }
    leader() { return this.standings()[0]; }
  }
  Ag.RemoteRace = RemoteRace;
  Ag.startRace = function (track, start) { const r = new RemoteRace(track, start); Ag.race = r; return r; };
})();
