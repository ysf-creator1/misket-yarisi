/* Misket Yarışı — yeni oyuncuya kolaylık ve oyuncunun misketi etkilemesi (yalnız tek oyunculu)
 * Fizik tarafında çalışır (tarayıcı + Node testi). Ayarlardan kapatılabilir; çok oyunculuda hiç kullanılmaz.
 *  - Kolay başlangıç: ilk parkurlarda botlar biraz yavaş (ilk yarış kazanılabilsin), kartlar kademeli açılır.
 *  - Misketi etkile: çatalda yol seçimi (sol/sağ). ("Üfle" itişi kaldırıldı: etkisi anlaşılmıyordu, telefonda kartların üstüne biniyordu.)
 */
(function (G) {
  'use strict';
  const MK = G.MK = G.MK || {};

  // kademeli kartlar: başta 5 temel kart; oyuncu ilerledikçe (açtığı en uzak parkur) yenileri gelir
  MK.TEMEL = ['turbo', 'kalkan', 'zipla', 'balcik', 'yavas'];
  MK.KART_ACILIS = { bomba: 3, duvar: 4, demir: 5, kucult: 6, hayalet: 7, miknatis: 8, ruzgar: 9, isinlan: 10, takas: 11 };
  MK.acikKartlar = unlocked => MK.TEMEL.concat(Object.keys(MK.KART_ACILIS).filter(id => (unlocked || 1) >= MK.KART_ACILIS[id]));
  MK.tumKartlarAcik = unlocked => (unlocked || 1) >= Math.max(...Object.values(MK.KART_ACILIS));

  // bot yumuşatma (sn başına hız sönümü): parkur 1 en kolay, 4'ten sonra yok; hiç kazanmamış oyuncuya biraz daha
  MK.yumusak = (trackId, wins) => {
    const base = trackId === 1 ? 0.25 : trackId === 2 ? 0.14 : trackId === 3 ? 0.12 : 0;
    return base && (wins || 0) < 10 ? base * (wins ? 1 : 1.25) : 0;
  };

  // çatal: kollar ayrılmadan önceki son 9 m'de seçilen yöne yana çekilir
  MK.CATAL = { once: 9, guc: 6 };

  // parkurdaki çatallar: başladığı yer (s0) ve kolların sağa/sola sapması (orta çizgiye göre)
  MK.catallar = function (track) {
    const by = {};
    for (const q of track.samples) {
      if (!q.lane) continue;
      const g = Math.floor(q.lane / 10), j = q.lane % 10;
      const f = by[g] || (by[g] = { s0: q.s, lanes: {} });
      if (q.s < f.s0) f.s0 = q.s;
      if (!f.lanes[j] || q.s < f.lanes[j].s) f.lanes[j] = q;
    }
    const main = track.samples.filter(q => !q.lane);
    return Object.values(by).map(f => {
      let ref = null; for (const q of main) { if (q.s <= f.s0) ref = q; else break; }
      return { s0: f.s0, n: Object.keys(f.lanes).length, ref };
    }).filter(f => f.ref).sort((a, b) => a.s0 - b.s0);
  };

  // race'e bağla: opts { player, soft, etkile } → kontrol nesnesi (yol(-1|1))
  MK.bagla = function (race, opts = {}) {
    const base = race.applyEffects, pl = opts.player, soft = opts.soft || 0, on = !!opts.etkile;
    const C = MK.CATAL;
    const forks = on ? MK.catallar(race.track) : [];
    const ctl = { on, yon: 0, catal: null, kullandi: false, yolSayisi: 0 };
    race.applyEffects = (m, dt) => {
      if (base) base(m, dt);
      if (!race.started || m.finished) return;
      const v = m.body.linvel(), mass = m.body.mass();
      if (m.id !== pl) {
        if (soft > 0) { const k = soft * dt; m.body.applyImpulse({ x: -v.x * k * mass, y: 0, z: -v.z * k * mass }, true); }
        return;
      }
      if (!on) return;
      // yaklaşan çatal
      const f = forks.find(q => m.s > q.s0 - C.once - 6 && m.s < q.s0 + 1);
      ctl.catal = f && m.s < q0(f) ? f : null;
      if (!f) ctl.yon = 0;
      if (f && ctl.yon && m.s > f.s0 - C.once && m.s < f.s0 + 0.5) {
        const R = f.ref.R, a = C.guc * ctl.yon * mass * dt;
        const side = v.x * R[0] + v.z * R[2]; // yana hızı sınırla: duvardan sekip geri dönmesin
        if (side * ctl.yon < 3) m.body.applyImpulse({ x: R[0] * a, y: 0, z: R[2] * a }, true);
      }
    };
    const q0 = f => f.s0 - 0.5;
    ctl.yol = d => { if (!on || !ctl.catal) return false; if (ctl.yon !== d) ctl.yolSayisi++; ctl.yon = d; ctl.kullandi = true; return true; };
    return ctl;
  };
})(typeof window !== 'undefined' ? window : globalThis);
