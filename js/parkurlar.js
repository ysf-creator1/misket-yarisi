/* Misket Yarışı — elle yapılmış 12 özel parkur
 * Her parkur, Builder (js/parcalar.js) üzerinde sırayla çağrılan parçalardan oluşur.
 * 200 parkurun listesi, dünyalar ve üretici js/dunyalar.js içindedir.
 */
(function (G) {
  'use strict';
  const MP = G.MP = G.MP || {};

  // yumuşak tümsekler: t0..t1 arasında n tane, yükseklik h
  MP.humps = (t0, t1, n, h) => t => { if (t < t0 || t > t1) return 0; const u = (t - t0) / (t1 - t0) * n; return h * Math.pow(Math.sin(Math.PI * u), 2); };


  // Parkur 1: tüm temel parçaların yumuşak hâli
  function parkur1(b) {
    b.start();
    b.straight({ len: 10, drop: 1.6 });
    b.curve({ angle: 90, radius: 8, drop: 1.2 });
    b.slalom({ len: 14, boards: 3 });
    b.split({
      lanes: 2, lw: 1.2, len: 17, drop: 2.0, spread: 2.2, laneOpts: [
        { spread: 2.8 },
        { spread: 1.0, profile: MP.humps(0.2, 0.75, 4, 0.12) },
      ]
    });
    b.curve({ angle: -120, radius: 7, drop: 1.4 });
    b.bumpers({ len: 13 });
    b.jump({ run: 7, gap: 3 });
    b.pegs({ len: 14 });
    b.curve({ angle: 90, radius: 8, drop: 1.2 });
    b.funnel({ R: 6, side: 1, exitTurn: 0 });
    b.straight({ len: 5, drop: 0.7 });
    b.spinner({ len: 11 });
    b.curve({ angle: -180, radius: 6, drop: 2.6 });
    b.bumpers({ len: 11 });
    b.curve({ angle: 90, radius: 9, drop: 1.6 });
    b.finish();
  }

  // ---- yardımcılar: dağdan zikzak inen yol (koşu → U dönüşü → koşu …) ----
  const S = (b, len, drop) => b.straight({ len, drop: drop != null ? drop : len * 0.095 });
  const U = (b, dir, r = 8, drop) => b.curve({ angle: 180 * dir, radius: r, drop: drop != null ? drop : Math.PI * r * 0.09 });
  const SPI = (b, turns, dir, r = 6.5) => b.curve({ angle: 360 * turns * dir, radius: r, drop: 2 * Math.PI * r * turns * 0.115, bank: 12 });
  const SPLIT2 = (b, len = 18) => b.split({ lanes: 2, lw: 1.2, len, drop: len * 0.12, spread: 2.4, laneOpts: [{ spread: 3 }, { spread: 1, profile: MP.humps(0.2, 0.75, 3, 0.11) }] });
  const SPLIT3 = (b, len = 20) => b.split({ lanes: 3, lw: 1.15, len, drop: len * 0.12, spread: 2.4, laneOpts: [{ spread: 3.2 }, { profile: MP.humps(0.25, 0.7, 2, 0.11) }, { spread: 1.6 }] });

  function parkur2(b) { // Kayan Vadi
    b.start(); S(b, 10, 1.5); b.slalom({ len: 14 }); U(b, 1);
    SPLIT2(b); b.bumpers({ len: 12 }); U(b, -1);
    b.jump({ run: 7, gap: 3 }); b.pegs({ len: 14 }); U(b, 1);
    b.funnel({ R: 6, side: -1 }); b.spinner({ len: 11 }); S(b, 6); U(b, -1);
    b.bumpers({ len: 11 }); b.slalom({ len: 12 }); S(b, 6);
    b.finish();
  }
  function parkur3(b) { // İkiz Yollar
    b.start(); S(b, 8, 1.2); SPLIT3(b, 22); U(b, 1);
    SPLIT2(b, 18); b.bumpers({ len: 12 }); U(b, -1);
    b.pistons({ len: 13, count: 2 }); SPLIT2(b, 16); U(b, 1);
    b.jump({ run: 7, gap: 3 }); b.funnel({ R: 6, side: -1 }); S(b, 6); U(b, -1);
    b.slalom({ len: 14 }); SPLIT3(b, 18); b.pegs({ len: 12 });
    b.finish();
  }
  function parkur4(b) { // Huni Kasırgası
    b.start(); S(b, 8, 1.2); b.slalom({ len: 12 }); b.funnel({ R: 6, side: 1 }); S(b, 5); U(b, -1, 9);
    b.bumpers({ len: 12 }); b.funnel({ R: 7, side: -1, depth: 3.6 }); b.spinner({ len: 11 }); U(b, 1, 9);
    b.pegs({ len: 13 }); b.funnel({ R: 5.5, side: 1 }); S(b, 5); U(b, -1, 9);
    b.jump({ run: 7, gap: 3 }); b.funnel({ R: 7, side: -1, depth: 3.8 }); b.bumpers({ len: 10 }); U(b, 1, 9);
    b.slalom({ len: 12 }); S(b, 6);
    b.finish();
  }
  function parkur5(b) { // Zıpzıp Köprü
    b.start(); S(b, 10, 1.5); b.jump({ run: 7, gap: 3.5 }); b.trampoline(); U(b, 1);
    b.bumpers({ len: 12 }); b.trampoline({ fall: 3.8 }); b.jump({ run: 7, gap: 4 }); U(b, -1);
    SPLIT2(b, 16); b.trampoline(); b.pegs({ len: 12 }); U(b, 1);
    b.funnel({ R: 6, side: -1 }); b.jump({ run: 6, gap: 3.5 }); b.trampoline({ tilt: 26 }); U(b, -1);
    b.slalom({ len: 12 }); b.jump({ run: 7, gap: 4.5, fall: 3.4 }); b.spinner({ len: 11 }); U(b, 1);
    b.bumpers({ len: 11 }); U(b, -1);
    b.trampoline(); b.pegs({ len: 14 }); b.slalom({ len: 12 }); S(b, 6);
    b.finish();
  }
  function parkur6(b) { // Çivili Orman
    b.start(); S(b, 8, 1.2); b.pegs({ len: 16 }); U(b, 1);
    b.bumpers({ len: 14 }); b.pegs({ len: 18, hw: 3.6 }); U(b, -1);
    SPLIT3(b, 20); b.pegs({ len: 14 }); U(b, 1);
    b.funnel({ R: 6, side: -1 }); b.pegs({ len: 16 }); b.bumpers({ len: 12 }); U(b, -1);
    b.slalom({ len: 14 }); b.pegs({ len: 14 }); b.jump({ run: 7, gap: 3 }); U(b, 1);
    b.bumpers({ len: 13 }); b.pegs({ len: 12 }); U(b, -1);
    b.pegs({ len: 16, hw: 3.6 }); b.slalom({ len: 12 }); b.bumpers({ len: 11 }); b.jump({ run: 7, gap: 3.5 }); S(b, 6);
    b.finish();
  }
  function parkur7(b) { // Dev Spiral
    b.start(); S(b, 10, 1.4); SPI(b, 1.5, 1); b.funnel({ R: 6, side: 1 }); S(b, 6);
    b.slalom({ len: 14 }); SPI(b, 1, -1, 7); b.bumpers({ len: 12 }); U(b, 1);
    b.funnel({ R: 7, side: -1, depth: 3.6 }); SPI(b, 1.5, -1, 7); b.jump({ run: 7, gap: 3 }); SPLIT2(b, 16); U(b, -1);
    b.pegs({ len: 14 }); SPI(b, 2, 1, 6.5); b.spinner({ len: 11 }); U(b, 1);
    b.bumpers({ len: 11 }); SPI(b, 1, 1, 6); S(b, 6);
    b.finish();
  }
  function parkur8(b) { // Pervane Fabrikası
    b.start(); S(b, 8, 1.2); b.spinner({ len: 11 }); b.pistons({ len: 14, count: 2 }); U(b, 1);
    b.spinner({ len: 11, dir: -1, arms: 3 }); b.bumpers({ len: 12 }); b.pistons({ len: 16, count: 3, period: 2.2 }); U(b, -1);
    b.funnel({ R: 6, side: 1 }); b.spinner({ len: 12, arms: 3, speed: 1.8 }); SPLIT2(b, 16); U(b, 1);
    b.pistons({ len: 14, count: 2, period: 2 }); b.jump({ run: 7, gap: 3 }); b.spinner({ len: 11, dir: -1 }); U(b, -1);
    b.slalom({ len: 14 }); b.pegs({ len: 13 }); b.pistons({ len: 14, count: 3, period: 2.4 }); U(b, 1);
    b.spinner({ len: 11, arms: 3 }); b.bumpers({ len: 11 }); U(b, -1);
    b.pistons({ len: 14, count: 3, period: 2.1 }); b.spinner({ len: 11, dir: -1 }); b.pegs({ len: 13 }); b.slalom({ len: 14 }); b.bumpers({ len: 11 }); S(b, 6);
    b.finish();
  }
  function parkur9(b) { // Labirent Şelale
    b.start(); S(b, 8, 1.2); SPLIT3(b, 22); b.trampoline({ fall: 4 }); U(b, 1);
    SPLIT2(b, 18); b.slalom({ len: 14 }); SPLIT3(b, 20); U(b, -1);
    b.trampoline({ fall: 4.2 }); b.pegs({ len: 14 }); SPLIT2(b, 16); U(b, 1);
    b.funnel({ R: 6.5, side: -1 }); SPLIT3(b, 20); b.trampoline(); U(b, -1);
    b.slalom({ len: 14 }); b.pistons({ len: 13, count: 2 }); SPLIT2(b, 18); U(b, 1);
    b.bumpers({ len: 12 }); b.trampoline({ fall: 3.8 }); U(b, -1);
    SPLIT3(b, 20); b.pegs({ len: 14 }); b.trampoline(); U(b, 1);
    b.slalom({ len: 14 }); SPLIT2(b, 16); b.bumpers({ len: 11 }); S(b, 6);
    b.finish();
  }
  function parkur10(b) { // Volkan İnişi
    b.start(); S(b, 10, 1.6); b.jump({ run: 7, gap: 4 }); b.bumpers({ len: 13 }); U(b, 1);
    b.trampoline({ fall: 4 }); b.pistons({ len: 15, count: 3, period: 2.2 }); b.funnel({ R: 7, side: -1, depth: 3.8 }); U(b, -1);
    b.spinner({ len: 11, arms: 3 }); b.jump({ run: 7, gap: 4.5 }); b.pegs({ len: 15 }); U(b, 1);
    SPLIT3(b, 20); b.trampoline({ tilt: 25 }); b.bumpers({ len: 12 }); U(b, -1);
    b.funnel({ R: 6, side: 1 }); b.slalom({ len: 14 }); b.pistons({ len: 14, count: 2, period: 1.9 }); U(b, 1);
    b.jump({ run: 7, gap: 4 }); b.spinner({ len: 11, dir: -1 }); b.bumpers({ len: 11 }); U(b, -1);
    b.trampoline({ fall: 4 }); b.pegs({ len: 14 }); b.funnel({ R: 6.5, side: 1 }); U(b, 1);
    b.pistons({ len: 14, count: 3 }); b.jump({ run: 7, gap: 4 }); b.bumpers({ len: 12 }); S(b, 6);
    b.finish();
  }
  function parkur11(b) { // Uzay Rampası
    b.start(); S(b, 10, 1.4); SPI(b, 1, 1); b.spinner({ len: 11, arms: 3 }); b.funnel({ R: 7, side: -1, depth: 3.8 }); U(b, -1);
    b.pistons({ len: 14, count: 3 }); SPI(b, 1.5, -1, 7); b.jump({ run: 7, gap: 4 }); U(b, 1);
    b.trampoline({ fall: 4 }); SPLIT3(b, 20); b.funnel({ R: 6, side: 1 }); U(b, -1);
    b.spinner({ len: 12, arms: 3, speed: 1.9 }); SPI(b, 2, 1, 6.5); b.bumpers({ len: 12 }); U(b, 1);
    b.pegs({ len: 15 }); b.funnel({ R: 7, side: -1, depth: 4 }); b.slalom({ len: 14 }); U(b, -1);
    b.pistons({ len: 14, count: 2, period: 2 }); b.trampoline(); U(b, 1);
    b.spinner({ len: 11, dir: -1, arms: 3 }); SPI(b, 1, -1, 6.5); b.bumpers({ len: 12 }); b.jump({ run: 7, gap: 4 }); S(b, 6);
    b.finish();
  }
  function parkur12(b) { // Şampiyonlar Dağı
    b.start(); S(b, 10, 1.4); b.slalom({ len: 14 }); SPLIT3(b, 20); U(b, 1);
    b.funnel({ R: 7, side: -1, depth: 3.8 }); b.jump({ run: 7, gap: 4 }); b.bumpers({ len: 13 }); U(b, -1);
    b.pistons({ len: 15, count: 3, period: 2.2 }); SPI(b, 1.5, 1, 7); b.trampoline({ fall: 4 }); U(b, 1);
    b.pegs({ len: 16 }); b.spinner({ len: 12, arms: 3 }); SPLIT2(b, 18); U(b, -1);
    b.funnel({ R: 6, side: 1 }); b.trampoline({ tilt: 25 }); b.slalom({ len: 14 }); U(b, 1);
    SPI(b, 2, -1, 6.5); b.bumpers({ len: 12 }); b.jump({ run: 7, gap: 4.5 }); U(b, -1);
    b.spinner({ len: 11, dir: -1, arms: 3 }); b.pistons({ len: 14, count: 2, period: 1.9 }); b.funnel({ R: 7, side: -1, depth: 4 }); U(b, 1);
    b.pegs({ len: 14 }); b.bumpers({ len: 11 }); S(b, 6);
    b.finish();
  }

  // elle yapılmış 12 özel parkur (js/dunyalar.js bunları süresi uyan sıralara yerleştirir)
  MP.HAND = { 1: parkur1, 2: parkur2, 3: parkur3, 4: parkur4, 5: parkur5, 6: parkur6, 7: parkur7, 8: parkur8, 9: parkur9, 10: parkur10, 11: parkur11, 12: parkur12 };
})(typeof window !== 'undefined' ? window : globalThis);
