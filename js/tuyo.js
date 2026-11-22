/* Misket Yarışı — Biriktir modunda kart tüyoları: "bu kart ne zaman işe yarar, şu an hangisini kullanmalıyım?"
 * Yalnız okur: fiziğe, kart dağıtımına ve rastgele sayılara dokunmaz. Tek oyunculu ve çevrimiçi yarışta aynı çalışır.
 * Kural eşikleri botların kart kullanımıyla (guclar.js _botUse) uyumludur. Ayarlar > İpuçları kapalıysa gösterilmez.
 */
(function (G) {
  'use strict';
  const MT = G.MT = G.MT || {};

  // kartın üstünde ve Güç Kartları ekranında görünen kısa "ne zaman" bilgisi
  MT.NE_ZAMAN = {
    turbo: 'Rakibe yetişince', zipla: 'Önünde duvar varken', kalkan: 'Tuzak gelirken, liderken',
    demir: 'Duvar görünce', hayalet: 'Duvar ya da kalabalıkta', isinlan: 'Rakibin hemen arkasında',
    miknatis: 'Öndeki uzaklaşınca', balcik: 'Rakip hemen öndeyken', duvar: 'Rakip hemen öndeyken',
    yavas: 'İki rakip yakınken', kucult: 'İki rakip yakınken', ruzgar: 'Önünde 2+ rakip varken',
    bomba: 'Rakipler toplanınca', takas: 'Öndeki çok uzaktayken',
  };

  const YAKIN = 14, ESIK = 1.5, GEVSEK = 0.5, SON = 0.85, KUME = 3.5;

  // duvar: tek oyunculuda powers.walls (dizi), çevrimiçinde race.walls (Map)
  function onundeDuvar(r, m, T) {
    if (!T) return false;
    const P = r.powers, list = Array.isArray(P.walls) ? P.walls : r.walls ? Array.from(r.walls.values()) : [], c = m.body.translation();
    return list.some(w => {
      if (w.owner === m.id || !w.p || (w.until != null && w.until <= r.t)) return false;
      const dx = w.p[0] - c.x, dy = w.p[1] - c.y, dz = w.p[2] - c.z, a = dx * T[0] + dy * T[1] + dz * T[2];
      return a > 1 && a < 7 && Math.hypot(dx, dy, dz) < 8;
    });
  }

  // şu anki durumda bir kartın değeri ve sebebi: [puan, metin]
  function degerle(id, d) {
    const { r, m, t, T, ondekiler, yakinlar, enYakin, bosYol, duvarVar, gelenTuzak, lider, sonda } = d;
    const acik = (o, kalkanIsler) => !(o.fx.ghost > t) && !(kalkanIsler && o.fx.shield > t);
    const fark = enYakin ? enYakin.s - m.s : Infinity;
    switch (id) {
      case 'kalkan':
        if (m.fx.shield > t) return [0];
        if (gelenTuzak) return [6, 'Üstüne tuzak geliyor, kalkanı aç!'];
        return lider && sonda ? [1.7, 'Liderliğini korumak için aç!'] : [0];
      case 'zipla': return duvarVar ? [4, 'Önünde duvar var, üstünden atla!'] : [T ? 0.6 : 0];
      case 'hayalet':
        if (duvarVar) return [4, 'Önünde duvar var, içinden geç!'];
        return T && fark < 6 ? [1.6, 'Rakibin içinden geçip öne çık!'] : [T ? 0.6 : 0];
      case 'demir':
        if (duvarVar) return [4, 'Önünde duvar var, kırıp geç!'];
        return T && fark < 10 ? [1.6, 'Ağırlaş, öndekini itip geç!'] : [T ? 0.6 : 0];
      case 'turbo':
        if (!bosYol || m.speed >= 11) return [0];
        return fark < 10 ? [1.8, 'Öndekini geçmek için hızlan!'] : [0.6];
      case 'isinlan':
        if (!bosYol) return [0];
        return fark < 7 ? [2, 'Işınlan, rakibin önüne geç!'] : [0.6];
      case 'miknatis':
        if (!T || !enYakin || fark > 45) return [0];
        return fark > 4 ? [1.8, 'Öndeki uzaklaşıyor, ona yetiş!'] : [0];
      case 'takas': {
        if (!enYakin || fark > 35 || !acik(enYakin, true)) return [0];
        return fark > 5 ? [Math.min(5, 1.6 + fark / 10), 'Öndeki rakip uzakta, yerini al!'] : [0];
      }
      case 'ruzgar': {
        const n = ondekiler.filter(o => o.s - m.s < 40 && acik(o, true)).length;
        return n >= 2 ? [2.2, 'Öndeki rakipleri geri it!'] : [0];
      }
      case 'bomba': {
        const hedefler = ondekiler.filter(o => o.s - m.s < 30 && acik(o, true));
        const kume = hedefler.some(o => { const c = o.body.translation(); return r.marbles.some(q => q !== m && q !== o && !q.finished && Math.hypot(q.body.translation().x - c.x, q.body.translation().y - c.y, q.body.translation().z - c.z) < KUME); });
        if (kume) return [2.6, 'Rakipler toplandı, tam zamanı!'];
        return yakinlar.some(o => acik(o, true)) ? [1.6, 'Rakip hemen önünde, patlat!'] : [0];
      }
      case 'yavas': case 'kucult': {
        const n = yakinlar.filter(o => acik(o, true) && !(id === 'yavas' ? o.fx.slow > t : o.fx.small > t)).length;
        return n >= 2 ? [2.4, 'İki rakip yakınında, şimdi kullan!'] : n === 1 ? [1.7, 'Rakip hemen önünde, şimdi kullan!'] : [0];
      }
      case 'balcik': return yakinlar.some(o => acik(o, false)) ? [2, 'Rakip hemen önünde, yoluna dök!'] : [0];
      case 'duvar': return yakinlar.some(o => acik(o, false)) ? [2, 'Rakip hemen önünde, duvar dik!'] : [0];
      default: return [0];
    }
  }

  // çantada şu an en mantıklı kart: { id, k, puan, txt } ya da null. tut: ekrandaki öneri (gereksiz yere değişip titremesin)
  MT.oner = function (r, pid, bag, tut) {
    const P = r.powers, m = r.marbles[pid];
    if (!P || P.mode !== 'biriktir' || !m || m.finished || !r.started || !bag || !bag.length) return null;
    const t = r.t, fs = r.track.finishS, T = m.lastSample && !m.inZone ? m.lastSample.T : null;
    const ondekiler = r.marbles.filter(o => o !== m && !o.finished && o.s > m.s + 0.3).sort((a, b) => a.s - b.s);
    const st = r.standings().filter(o => !o.finished || o === m);
    const d = {
      r, m, t, T, ondekiler, enYakin: ondekiler[0] || null,
      yakinlar: ondekiler.filter(o => o.s - m.s < YAKIN),
      bosYol: !!T && !r.track.zones.some(z => z.s0 > m.s - 1 && z.s0 - m.s < YAKIN),
      duvarVar: onundeDuvar(r, m, T),
      gelenTuzak: !!(P.delayed && P.delayed.some(x => x.tgs.includes(m) && x.m !== m)),
      lider: st[0] === m, sonda: m.s / fs > 0.75,
    };
    const dolu = bag.length >= G.MG.BAG.size, bitis = m.s / fs > SON, esik = dolu || bitis ? GEVSEK : ESIK;
    let en = null, tutulan = null;
    bag.forEach((id, k) => {
      if (!P.canUse(pid, k)) return;
      const [puan, txt] = degerle(id, d);
      if (puan < esik) return;
      const o = { id, k, puan, txt: puan >= ESIK && txt ? txt : dolu ? 'Çantan dolu, yeni kart gelmez: bunu kullan!' : 'Bitişe az kaldı, kartını harca!' };
      if (!en || puan > en.puan) en = o;
      if (id === tut && !tutulan) tutulan = o;
    });
    return tutulan && en && en.puan < tutulan.puan + 1.5 ? tutulan : en;
  };
})(typeof window !== 'undefined' ? window : globalThis);
