/* Misket Yarışı — oyuncu adı kuralları (tarayıcı ve sunucu ortak)
 * Ad 2–16 karakter: harf (Türkçe dahil), rakam, boşluk, - _ .  Büyük/küçük harf ve boşluk farkı aynı ad sayılır.
 * Uygunsuz ad filtresi Zirve Top Yarışı'ndaki listeyle aynıdır.
 */
(function (G) {
  'use strict';
  const BAD_ROOTS = ['amcik','amina','aminak','aminiz','sikt','siker','sikis','sikik','sikim','sikey','sikec','sikiy','sikko','yarak','yarag','orospu','orosbu','orspu',
  'pezevenk','gavat','kahpe','kaltak','surtuk','ibne','gotveren','gotune','gotunu','tasak','yavsak','serefsiz','haysiyetsiz','picler','pezo',
  'gerizekali','dangalak','embesil','gerzek','domal','penis','vajina','seks','porno','osur','pirt','boktan','lavuk','anani','ananin','anasini','bacini',
  'kevase','fahise','sict','zikim','fuck','shit','bitch','pusy','cunt','ashole','bastard','slut','whore','porn','dildo','hitler','salak','aptal'];
  const BAD_WORDS = ['am','amk','mk','aq','oc','sg','pic','mal','got','bok','kaka','meme','esek','hiyar','sik','sic','ahmak','dick','fag','cock','anal','anus','niger','niga','sex','sexy','nazi','nazist'];
  const collapseRep = w => w.replace(/(.)\1+/g, '$1');
  function normName(n) {
    return String(n).toLocaleLowerCase('tr').replace(/[ıİî]/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/[öô]/g, 'o').replace(/[üû]/g, 'u').replace(/[âà]/g, 'a')
      .replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g');
  }
  function isBad(name) {
    const n = normName(name), compact = collapseRep(n.replace(/[^a-z]/g, ''));
    if (BAD_ROOTS.some(r => compact.includes(r))) return true;
    const words = n.split(/[^a-z]+/).filter(Boolean).map(collapseRep);
    return BAD_WORDS.includes(compact) || words.some(w => BAD_WORDS.includes(w));
  }
  const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
  // tekil ad anahtarı: "Ali", "ali", " ALİ " aynı
  const key = s => tidy(s).toLocaleLowerCase('tr');
  // hata metni ya da null
  function check(name) {
    const n = tidy(name);
    if (n.length < 2) return 'Ad en az 2 karakter olmalı';
    if (n.length > 16) return 'Ad en fazla 16 karakter olabilir';
    if (!/^[\p{L}\p{N} ._-]+$/u.test(n)) return 'Adda sadece harf, rakam, boşluk, - _ . olabilir';
    if (isBad(n)) return 'Bu ad uygun değil, başka bir ad seç';
    return null;
  }
  const pinOk = p => /^[0-9]{4}$/.test(String(p || ''));
  G.MI = { tidy, key, check, isBad, pinOk };
})(typeof window !== 'undefined' ? window : globalThis);
