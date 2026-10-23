// Misket Yarışı — sunucu yük testi: aynı anda N oda (her odada 1 sahte oyuncu + 5 bot)
// Sunucunun kendisinde çalıştırılır: node test/yuk-testi.js [oda=20] [süre sn=90] [adres=ws://127.0.0.1:8790/ws]
const N = +process.argv[2] || 20, DUR = +process.argv[3] || 90, URL0 = process.argv[4] || 'ws://127.0.0.1:8790/ws';
const http = URL0.replace(/^ws/, 'http').replace(/\/ws$/, '/durum');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
function cpuOf(pid) { try { const a = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' '); return (+a[11] + +a[12]) / 100; } catch (e) { return null; } } // utime+stime (sn)
(async () => {
  const clients = [];
  for (let i = 0; i < N; i++) {
    const ws = new WebSocket(URL0); ws.binaryType = 'arraybuffer';
    const c = { ws, snaps: 0, started: false, done: 0, gaps: [], last: 0 };
    ws.onmessage = ev => {
      if (typeof ev.data !== 'string') { const now = performance.now(); if (c.last) c.gaps.push(now - c.last); c.last = now; c.snaps++; return; }
      const m = JSON.parse(ev.data);
      if (m.t === 'hosgeldin') ws.send(JSON.stringify({ t: 'odaKur' }));
      if (m.t === 'oda' && !c.started && m.durum === 'lobi') { c.started = true; ws.send(JSON.stringify({ t: 'parkur', id: 20 + i * 9 })); setTimeout(() => ws.send(JSON.stringify({ t: 'baslat' })), 200); }
      if (m.t === 'el') setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'kart', k: 1 })), 500);
      if (m.t === 'sonuc') { c.done++; setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'baslat' })), 300); } // bitince yeniden
    };
    ws.onopen = () => ws.send(JSON.stringify({ t: 'merhaba', ad: 'Yük' + i, acik: 200 }));
    clients.push(c);
    await sleep(50);
  }
  const pid = +process.env.SUNUCU_PID || 0;
  await sleep(8000); // parkurlar kurulsun, yarışlar başlasın
  const c0 = pid ? cpuOf(pid) : null, t0 = Date.now(); let maxLoop = 0, sumLoop = 0, k = 0, mem = 0;
  while (Date.now() - t0 < DUR * 1000) {
    await sleep(2000);
    try { const d = await (await fetch(http)).json(); sumLoop += d.dongu.ms; maxLoop = Math.max(maxLoop, d.dongu.ms); mem = Math.max(mem, d.bellekMB); k++; if (k === 1) console.log('yarışan oda:', d.yarisan, 'çevrimiçi:', d.cevrimici); } catch (e) { }
  }
  const secs = (Date.now() - t0) / 1000, cpu = pid && c0 != null ? (cpuOf(pid) - c0) / secs * 100 : null;
  const gaps = clients.flatMap(c => c.gaps.slice(-200)).sort((a, b) => a - b), pct = q => gaps[Math.floor(gaps.length * q)] || 0;
  const rate = clients.reduce((a, c) => a + c.snaps, 0) / N / (secs + 8);
  console.log(`${N} oda, ${secs.toFixed(0)} sn: sunucu CPU ${cpu != null ? cpu.toFixed(0) + '% (tek çekirdek = 100%)' : '?'} | döngü ort ${(sumLoop / k).toFixed(2)} ms / en ${maxLoop.toFixed(2)} ms (bütçe 16.7 ms) | bellek en ${mem} MB`);
  console.log(`anlık görüntü: oyuncu başına ${rate.toFixed(1)}/sn | aralık p50 ${pct(0.5).toFixed(0)} ms, p95 ${pct(0.95).toFixed(0)} ms, p99 ${pct(0.99).toFixed(0)} ms | biten yarış ${clients.reduce((a, c) => a + c.done, 0)}`);
  for (const c of clients) c.ws.close();
  process.exit(0);
})();
