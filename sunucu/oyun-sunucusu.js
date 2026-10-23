/* Misket Yarışı — çok oyunculu oyun sunucusu
 * Fizik ve güçler burada çalışır (tarayıcıdaki ile aynı dosyalar: js/fizik.js, js/guclar.js …).
 * Oyuncular yalnızca kart seçer; konumlar saniyede 20 kez gönderilir. Boş koltukta ve oyundan düşenin yerinde bot oynar.
 * Çalıştırma: node sunucu/oyun-sunucusu.js   (PORT ortam değişkeni, varsayılan 8790)
 */
'use strict';
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const root = path.join(__dirname, '..');
for (const f of ['rapier.js', 'js/parcalar.js', 'js/parkurlar.js', 'js/dunyalar.js', 'js/fizik.js', 'js/guclar.js']) require(path.join(root, f));
const { MP, MF, MG, RAPIER } = globalThis;

const PORT = +process.env.PORT || 8790;
const HOST = process.env.HOST || '127.0.0.1';
const TICK = 1000 / 60;            // döngü: 60 Hz (her turda 2 fizik adımı)
const SNAP_EVERY = 3;              // 20 Hz anlık görüntü
const INTRO = 5.6;                 // istemcideki giriş animasyonu + 3-2-1 (js/oyun.js INTRO ile aynı)
const QUICK_WAIT = 20;             // hızlı oyunda en fazla bekleme (sn)
const MAX_ROOMS = +process.env.MAX_ROOMS || 60, MAX_PER_IP = 16, MAX_MSG = 4096, MAX_RATE = 40; // koruma sınırları
const ROOM_IDLE = 10 * 60 * 1000;  // boş oda silinme süresi
const LEAVE_GRACE = 30 * 1000;     // lobide bağlantısı kopanın yeri bu süre tutulur

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const rid = n => crypto.randomBytes(n).toString('hex');
const CODE_CH = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => CODE_CH[crypto.randomInt(CODE_CH.length)]).join(''); } while (rooms.has(c)); return c; };
const cleanName = s => String(s || '').replace(/[<>&"'`\\\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Oyuncu';
const clampTrack = n => Math.max(1, Math.min(MP.TRACKS.length, Math.floor(+n) || 1));
const cleanEq = eq => { const o = {}; if (eq && typeof eq === 'object') for (const k of ['renk', 'forma', 'desen', 'gozluk', 'sapka', 'iz']) if (typeof eq[k] === 'string' && eq[k].length < 40) o[k] = eq[k]; return o; };

// parkurlar ağırdır: son kullanılanlar bellekte tutulur
const trackCache = new Map();
function getTrack(id) {
  if (trackCache.has(id)) { const t = trackCache.get(id); trackCache.delete(id); trackCache.set(id, t); return t; }
  const t = MP.buildTrack(id); trackCache.set(id, t);
  while (trackCache.size > 12) trackCache.delete(trackCache.keys().next().value);
  return t;
}

// ================= oyuncular ve odalar =================
const players = new Map();   // pid → oyuncu
const byKey = new Map();     // yeniden bağlanma anahtarı → pid
const rooms = new Map();     // kod → oda
const ipCount = new Map();
let quickRoom = null;        // dolmakta olan hızlı oyun odası

function send(p, obj) { if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(obj)); }
function sendBin(p, buf) { if (p && p.ws && p.ws.readyState === 1 && p.ws.bufferedAmount < 256 * 1024) p.ws.send(buf); }
const humansOf = room => [...room.players.values()];
function broadcast(room, obj) { const s = JSON.stringify(obj); for (const p of room.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }

function roomInfo(room) {
  return {
    t: 'oda', kod: room.code, kurucu: room.host, parkur: room.track, hizli: room.quick, durum: room.state,
    bekleme: room.quick && room.state === 'lobi' ? Math.max(0, Math.ceil((room.quickAt - Date.now()) / 1000)) : null,
    oyuncular: humansOf(room).map(p => ({ pid: p.pid, ad: p.name, misket: p.marble, hazir: p.ready, bagli: !!(p.ws && p.ws.readyState === 1), eq: p.eq, acik: p.unlocked })),
  };
}
const pushRoom = room => broadcast(room, roomInfo(room));

function makeRoom(quick, host) {
  if (rooms.size >= MAX_ROOMS) return null;
  const room = { code: newCode(), quick, host: host ? host.pid : null, track: host ? clampTrack(host.unlocked) : 1, state: 'lobi', players: new Map(), race: null, ps: null, created: Date.now(), touched: Date.now(), quickAt: Date.now() + QUICK_WAIT * 1000, seq: 0, tick: 0 };
  rooms.set(room.code, room);
  log('oda açıldı', room.code, quick ? '(hızlı)' : '');
  return room;
}
function freeMarble(room, want) {
  const used = new Set(humansOf(room).map(p => p.marble));
  if (want != null && want >= 0 && want < 6 && !used.has(want)) return want;
  for (let i = 0; i < 6; i++) if (!used.has(i)) return i;
  return -1;
}
function joinRoom(p, room) {
  if (!room) return send(p, { t: 'hata', mesaj: 'Oda bulunamadı.' });
  if (p.room === room) return pushRoom(room);
  if (room.state !== 'lobi') return send(p, { t: 'hata', mesaj: 'Bu odada yarış sürüyor, bitince tekrar dene.' });
  if (room.players.size >= 6) return send(p, { t: 'hata', mesaj: 'Oda dolu (6 kişi).' });
  leaveRoom(p, true);
  p.room = room; p.ready = room.quick; p.marble = freeMarble(room, p.wantMarble);
  room.players.set(p.pid, p); room.touched = Date.now();
  if (!room.host || !room.players.has(room.host)) room.host = p.pid;
  if (room.quick) room.track = Math.min(...humansOf(room).map(q => clampTrack(q.unlocked)));
  pushRoom(room);
  if (room.quick && room.players.size >= 6) startRace(room);
}
function leaveRoom(p, silent) {
  const room = p.room; if (!room) return;
  room.players.delete(p.pid); p.room = null; p.ready = false;
  if (room.race && p.marble >= 0) room.ps.humans.delete(p.marble); // yerine bot geçer
  if (room.host === p.pid) room.host = room.players.size ? room.players.keys().next().value : null;
  if (!room.players.size && room.state === 'lobi') closeRoom(room);
  else pushRoom(room);
  if (!silent) send(p, { t: 'odadanCikti' });
}
function closeRoom(room) {
  if (room.race) { try { room.race.dispose(); } catch (e) { } room.race = null; }
  rooms.delete(room.code); if (quickRoom === room) quickRoom = null;
  log('oda kapandı', room.code);
}

// ================= yarış =================
function startRace(room) {
  if (room.state !== 'lobi') return;
  const humans = humansOf(room).filter(p => p.marble >= 0);
  if (!humans.length) return;
  if (quickRoom === room) quickRoom = null;
  const track = getTrack(room.track);
  const race = new MF.Race(RAPIER, track, {});
  const ps = new MG.PowerSystem(race, { humans: humans.map(p => p.marble) });
  room.race = race; room.ps = ps; room.state = 'yaris'; room.clock0 = Date.now(); room.gateAt = INTRO - 0.2; room.elapsed = 0; room.tick = 0;
  room.walls = new Map();
  room.racers = {}; // misket no → { ad, eq, pid } (yarış başındaki insanlar)
  for (const p of humans) room.racers[p.marble] = { ad: p.name, eq: p.eq, pid: p.pid };
  for (const p of humans) send(p, startMsg(room, p));
  pushRoom(room);
  log('yarış başladı', room.code, 'parkur', room.track, 'insan', humans.length);
}
function startMsg(room, p) {
  return { t: 'basla', kod: room.code, parkur: room.track, intro: Math.max(0, room.gateAt + 0.2 - room.elapsed), pickTime: room.ps.pickTime, benim: p.marble, yarisanlar: room.racers, t0: room.race.t, saat: room.race.clock };
}
// olayı istemciye gidecek düz nesneye çevir (Rapier nesneleri gönderilmez)
function plainEvent(e, room) {
  const o = {};
  for (const k in e) {
    const v = e[k];
    if (k === 'wall' && v) o.wall = { id: v.id, p: v.p, q: v.q, half: v.half, until: v.until, owner: v.owner };
    else if (k === 'slime' && v) o.slime = { s0: v.s0, s1: v.s1, p: v.p, U: v.U, r: v.r, until: v.until };
    else if (typeof v !== 'function' && typeof v !== 'object') o[k] = v;
    else if (Array.isArray(v)) o[k] = v;
  }
  o._c = room.race.clock; // istemci olayı bu fizik saatine gelince oynatır
  return o;
}
function flushEvents(room) {
  const r = room.race, out = [];
  while (r.events.length) {
    const e = r.events.shift();
    if (e.type === 'hand' || e.type === 'handGone') { // kart eli sadece sahibine
      const p = humansOf(room).find(q => q.marble === e.id);
      if (p) send(p, e.type === 'hand' ? { t: 'el', cards: e.cards, expires: e.expires } : { t: 'elGitti' });
      continue;
    }
    out.push(plainEvent(e, room));
    if (e.type === 'end') room.endPending = true;
  }
  if (out.length) broadcast(room, { t: 'olaylar', e: out });
}
// anlık görüntü (ikili): başlık 12 B + misket başına 48 B
const SNAP_HDR = 12, SNAP_M = 48;
function snapshot(room) {
  const r = room.race, n = r.marbles.length, buf = Buffer.alloc(SNAP_HDR + n * SNAP_M), t = r.t;
  buf.writeUInt8(1, 0); buf.writeUInt8(n, 1); buf.writeUInt16LE(room.seq = (room.seq + 1) & 0xFFFF, 2);
  buf.writeFloatLE(r.t, 4); buf.writeFloatLE(r.clock, 8);
  r.marbles.forEach((m, i) => {
    const o = SNAP_HDR + i * SNAP_M, p = m.body.translation(), q = m.body.rotation(), v = m.body.linvel(), fx = m.fx || {};
    buf.writeFloatLE(p.x, o); buf.writeFloatLE(p.y, o + 4); buf.writeFloatLE(p.z, o + 8);
    buf.writeFloatLE(q.x, o + 12); buf.writeFloatLE(q.y, o + 16); buf.writeFloatLE(q.z, o + 20); buf.writeFloatLE(q.w, o + 24);
    buf.writeFloatLE(v.x, o + 28); buf.writeFloatLE(v.y, o + 32); buf.writeFloatLE(v.z, o + 36);
    buf.writeFloatLE(m.s, o + 40);
    let f = 0;
    if (m.finished) f |= 1;
    if (fx.shield > t) f |= 2; if (fx.turbo > t) f |= 4; if (fx.slow > t) f |= 8; if (fx.small > t) f |= 16;
    if (fx.ghost > t) f |= 32; if (fx.iron > t) f |= 64; if (fx.wind > t) f |= 128; if (fx.stun > t) f |= 256; if (fx.inSlime) f |= 512;
    if (room.ps.humans.has(i)) f |= 1024;
    buf.writeUInt16LE(f, o + 44); buf.writeUInt8(m.place || 0, o + 46);
    buf.writeUInt8(m.inZone ? r.track.zones.indexOf(m.inZone) + 1 : 0, o + 47);
  });
  return buf;
}
function stepRoom(room, dt) {
  const r = room.race;
  room.elapsed += dt;
  if (!r.started && room.elapsed >= room.gateAt) r.openGate();
  r.step(dt);
  flushEvents(room);
  if (++room.tick % SNAP_EVERY === 0) { const b = snapshot(room); for (const p of room.players.values()) sendBin(p, b); }
  if (room.endPending || r.done) finishRaceRoom(room);
}
function finishRaceRoom(room) {
  const r = room.race;
  const order = r.finishOrder.map(m => ({ id: m.id, place: m.place, time: m.finishTime, insan: !!room.racers[m.id] }));
  broadcast(room, { t: 'sonuc', parkur: room.track, sira: order });
  log('yarış bitti', room.code, 'kazanan misket', order[0] && order[0].id);
  try { r.dispose(); } catch (e) { }
  room.race = null; room.ps = null; room.state = 'lobi'; room.endPending = false; room.quick = false; room.touched = Date.now();
  // yarış sırasında bağlantısı kopanlar odadan çıkar
  for (const p of humansOf(room)) { p.ready = false; if (!(p.ws && p.ws.readyState === 1)) { room.players.delete(p.pid); p.room = null; players.delete(p.pid); byKey.delete(p.key); } }
  if (!room.players.size) return closeRoom(room);
  if (!room.players.has(room.host)) room.host = room.players.keys().next().value;
  pushRoom(room);
}

// ================= mesajlar =================
function onMessage(p, msg) {
  const room = p.room;
  switch (msg.t) {
    case 'merhaba': {
      p.name = cleanName(msg.ad); p.eq = cleanEq(msg.eq); p.unlocked = clampTrack(msg.acik);
      send(p, { t: 'hosgeldin', pid: p.pid, anahtar: p.key, parkurSayisi: MP.TRACKS.length });
      if (p.room) { pushRoom(p.room); if (p.room.race && p.marble >= 0) { send(p, startMsg(p.room, p)); resendHand(p); } }
      return;
    }
    case 'odaKur': { const r = makeRoom(false, p); if (!r) return send(p, { t: 'hata', mesaj: 'Sunucu şu an dolu, biraz sonra dene.' }); return joinRoom(p, r); }
    case 'katil': return joinRoom(p, rooms.get(String(msg.kod || '').toUpperCase().trim()));
    case 'hizli': {
      if (!quickRoom || quickRoom.state !== 'lobi' || quickRoom.players.size >= 6) quickRoom = makeRoom(true, null);
      if (!quickRoom) return send(p, { t: 'hata', mesaj: 'Sunucu şu an dolu, biraz sonra dene.' });
      return joinRoom(p, quickRoom);
    }
    case 'ayril': return leaveRoom(p);
    case 'misket': {
      p.wantMarble = +msg.no;
      if (!room || room.state !== 'lobi') return;
      const m = freeMarble(room, +msg.no); if (m === +msg.no) { p.marble = m; pushRoom(room); }
      return;
    }
    case 'hazir': if (room && room.state === 'lobi') { p.ready = !!msg.v; pushRoom(room); } return;
    case 'parkur': if (room && room.state === 'lobi' && room.host === p.pid && !room.quick) { room.track = Math.min(clampTrack(msg.id), clampTrack(p.unlocked)); pushRoom(room); } return;
    case 'baslat': if (room && room.state === 'lobi' && room.host === p.pid) startRace(room); return;
    case 'kart': {
      if (!room || !room.race || p.marble < 0) return;
      const k = Math.floor(+msg.k); if (k >= 0 && k <= 2) room.ps.choose(p.marble, k);
      return;
    }
    case 'ping': return send(p, { t: 'pong', c: msg.c });
  }
}
function resendHand(p) {
  const room = p.room, h = room && room.ps && room.ps.hands[p.marble];
  if (h && !h.used && h.expires > room.race.t) send(p, { t: 'el', cards: h.cards, expires: h.expires });
}

// ================= HTTP + WebSocket =================
const server = http.createServer((req, res) => {
  if (req.url === '/durum') {
    let racing = 0, online = 0; for (const r of rooms.values()) if (r.race) racing++;
    for (const p of players.values()) if (p.ws && p.ws.readyState === 1) online++;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, odalar: rooms.size, yarisan: racing, cevrimici: online, bellekMB: Math.round(process.memoryUsage().rss / 1048576), calisma: Math.round(process.uptime()), dongu: loopStat }));
  }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG, perMessageDeflate: false });
server.on('upgrade', (req, sock, head) => {
  if (!req.url.startsWith('/ws')) return sock.destroy();
  const xff = req.headers['x-forwarded-for']; // Caddy gerçek istemci IP'sini yazar (dışarıdan gelen başlığı ezer)
  const ip = (xff || req.socket.remoteAddress || '').split(',')[0].trim();
  const local = !xff && /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || ''); // sunucu içi testler
  if (!local && (ipCount.get(ip) || 0) >= MAX_PER_IP) return sock.destroy();
  wss.handleUpgrade(req, sock, head, ws => onConnect(ws, req, ip));
});
function onConnect(ws, req, ip) {
  ipCount.set(ip, (ipCount.get(ip) || 0) + 1);
  const url = new URL(req.url, 'http://x');
  const key = url.searchParams.get('anahtar');
  let p = key && byKey.has(key) ? players.get(byKey.get(key)) : null;
  if (p) { if (p.ws && p.ws !== ws) try { p.ws.close(4000, 'yeni bağlantı'); } catch (e) { } clearTimeout(p.dropTimer); }
  else {
    p = { pid: rid(6), key: rid(16), ws: null, name: 'Oyuncu', eq: {}, unlocked: 1, room: null, marble: -1, wantMarble: null, ready: false };
    players.set(p.pid, p); byKey.set(p.key, p.pid);
  }
  p.ws = ws; p.ip = ip; p.rate = 0; p.rateT = Date.now();
  // yarış sürüyorsa misketini botun elinden geri al
  if (p.room && p.room.race && p.marble >= 0 && p.room.racers[p.marble] && p.room.racers[p.marble].pid === p.pid) p.room.ps.humans.add(p.marble);
  ws.on('message', (data, isBin) => {
    const now = Date.now(); if (now - p.rateT > 1000) { p.rateT = now; p.rate = 0; }
    if (++p.rate > MAX_RATE || isBin) return;
    let msg; try { msg = JSON.parse(data); } catch (e) { return; }
    if (msg && typeof msg.t === 'string') { try { onMessage(p, msg); } catch (e) { log('mesaj hatası', e && e.stack); } }
  });
  ws.on('close', () => {
    ipCount.set(ip, Math.max(0, (ipCount.get(ip) || 1) - 1));
    if (p.ws !== ws) return;
    p.ws = null;
    const room = p.room;
    if (room) {
      if (room.race && p.marble >= 0) room.ps.humans.delete(p.marble); // yarışta: misketi bot devralır
      pushRoom(room);
    }
    p.dropTimer = setTimeout(() => { // geri gelmezse temizle
      if (p.ws) return;
      if (p.room && p.room.state === 'lobi') leaveRoom(p, true);
      if (!p.room) { players.delete(p.pid); byKey.delete(p.key); }
    }, LEAVE_GRACE);
  });
  ws.on('error', () => { });
}

// ================= ana döngü =================
let lastLoop = performance.now(), loopStat = { ms: 0, en: 0 };
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - lastLoop) / 1000); lastLoop = now;
  const t0 = performance.now();
  for (const room of rooms.values()) {
    if (room.race) { try { stepRoom(room, dt); } catch (e) { log('yarış hatası', room.code, e && e.stack); finishRaceRoom(room); } }
    else if (room.quick && room.state === 'lobi' && Date.now() >= room.quickAt && room.players.size) startRace(room);
  }
  const ms = performance.now() - t0; loopStat.ms = loopStat.ms * 0.98 + ms * 0.02; loopStat.en = Math.max(loopStat.en * 0.999, ms);
}, TICK);
// hızlı oyun geri sayımı ve boş oda temizliği
setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    if (room.quick && room.state === 'lobi') pushRoom(room);
    const anyOnline = humansOf(room).some(p => p.ws && p.ws.readyState === 1);
    if (!anyOnline && now - room.touched > (room.race ? 60 * 1000 : ROOM_IDLE)) closeRoom(room);
    else if (anyOnline) room.touched = now;
  }
}, 1000);

RAPIER.init().then(() => {
  server.listen(PORT, HOST, () => log(`Misket sunucusu hazır: http://${HOST}:${PORT} (ws: /ws)`));
});
process.on('SIGTERM', () => { log('kapanıyor'); for (const r of rooms.values()) broadcast(r, { t: 'hata', mesaj: 'Sunucu yeniden başlıyor, birkaç saniye sonra tekrar bağlan.' }); setTimeout(() => process.exit(0), 300); });
