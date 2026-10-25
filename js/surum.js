/* Misket Yarışı — oyun sürümü (tarayıcı ve sunucu ortak). Parkur, fizik ya da mesajlar değişince artır:
 * bash sunucu/surum-artir.sh  → bu sayı ve index.html'deki dosya etiketleri (?v=) birlikte artar. */
(function (G) { G.OYUN_SURUM = 20; })(typeof window !== 'undefined' ? window : globalThis);
