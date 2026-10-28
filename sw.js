/* Misket Yarışı — çevrimdışı önbellek (service worker)
 * - Sayfa (index.html): önce internetten; 4 sn içinde gelmezse ya da internet yoksa önbellekten.
 *   Böylece yeni sürüm hemen görünür, internetsizken de oyun açılır.
 * - Diğer dosyalar (js, doku, ikon): önce önbellekten (anında açılış), arkada internetten tazelenir.
 * - Başka sitelere giden istekler (oyun sunucusu, hesaplar) hiç ellenmez.
 * SURUM, sunucu/surum-artir.sh ile js/surum.js'teki sayıyla birlikte artar; eski önbellek silinir. */
const SURUM = 23;
const CACHE = 'misket-v' + SURUM;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('misket-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function sakla(req, res) {
  if (res && res.ok && res.type === 'basic') {
    const kopya = res.clone();
    caches.open(CACHE).then(c => c.put(req, kopya)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // ?oda=KOD gibi parametreler farklı olsa da sayfa tek kopya saklanır
    const anahtar = url.origin + url.pathname;
    e.respondWith(new Promise(resolve => {
      let bitti = false;
      const onbellek = () => caches.match(anahtar).then(r => r || fetch(req));
      const zaman = setTimeout(() => { if (!bitti) { bitti = true; resolve(onbellek()); } }, 4000);
      fetch(req).then(res => {
        if (res.ok) sakla(anahtar, res.clone());
        if (!bitti) { bitti = true; clearTimeout(zaman); resolve(res); }
      }).catch(() => {
        if (!bitti) { bitti = true; clearTimeout(zaman); resolve(onbellek()); }
      });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(kayitli => {
    const ag = fetch(req).then(res => sakla(req, res));
    if (kayitli) { e.waitUntil(ag.catch(() => {})); return kayitli; }
    return ag;
  }));
});
