/* varliklar/doku/ klasöründeki dosyalardan varliklar/dokular.js'i üretir.
 * dokular.js yalnızca index.html'e çift tıklanarak (file://) açıldığında kullanılır; tarayıcı orada
 * ayrı resim dosyalarını WebGL'e veremediği için dosyalar base64 olarak gömülür.
 * Kullanım: node varliklar/dokular-uret.js   (doku/ içinde bir dosya değişince çalıştır) */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'doku');
const satirlar = [];
for (const f of fs.readdirSync(dir).sort()) {
  const key = f.replace(/\.(jpg|hdr)$/, ''), b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  if (f.endsWith('.jpg')) satirlar.push(`  ${JSON.stringify(key)}: "data:image/jpeg;base64,${b64}",`);
  else if (f.endsWith('.hdr')) satirlar.push(`  ${JSON.stringify(key)}: "${b64}",`);
}
fs.writeFileSync(path.join(__dirname, 'dokular.js'),
  '/* Misket Yarışı — doku ve gökyüzü dosyaları (Poly Haven, CC0 lisanslı: polyhaven.com)\n' +
  ' * Yalnızca index.html doğrudan (file://) açıldığında yüklenir; normalde varliklar/doku/ klasöründeki dosyalar kullanılır.\n' +
  ' * Otomatik üretildi: node varliklar/dokular-uret.js */\nwindow.MISKET_DOKU = {\n' + satirlar.join('\n') + '\n};\n');
console.log('dokular.js yazıldı:', (fs.statSync(path.join(__dirname, 'dokular.js')).size / 1e6).toFixed(2), 'MB');
