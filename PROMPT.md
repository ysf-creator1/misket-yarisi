# Misket Yarışı — Oyun Tasarım Prompt'u

Bu dosya oyunun ana tarifidir. Her geliştirme aşaması buna göre yapılır.

## Prompt

Türkçe, çevrimdışı çalışan, tarayıcıda açılan 3D bir **misket yarışı** oyunu yap. Adı "Misket Yarışı". three.js (yerel `three.min.js`) ile çiz, Rapier 3D (yerel `rapier.js`, WASM gömülü) ile gerçek fizik uygula.

6 misket tepedeki bir kapıdan aynı anda bırakılır ve yalnızca fizikle hareket eder; kimse misketi sürmez. Oyuncu yarış öncesi 6 misketten birini seçer, diğer 5'i botdur.

Parkurlar modüler parçalardan oluşur: rampa, virajlı oluk, yolun 2–3 kola ayrıldığı çatal ve tekrar birleştiği nokta, misketlerin dönerek ortadaki delikten alt yola düştüğü huni, çivi tahtası, atlama rampası ve boşluk, trambolin, dönen pervane, piston, spiral. Görsel mesh ve fizik collider aynı geometriden üretilir. Her parkurun orta çizgisi ilerleme/sıralama için kullanılır; takılan veya düşen misket son kontrol noktasına döner.

12 parkur, 4 kupa (Bronz, Gümüş, Altın, Elmas). Parkur 1 yaklaşık 60 sn sürer, her parkur ~11 sn uzar, parkur 12 yaklaşık 180 sn. Zorluk ve engel sayısı artar. İlk 3'e girmek sonraki parkuru açar.

Yarış sırasında 15–20 sn'de bir ekranın sağında 3 güç kartı çıkar; oyuncu tıklayarak veya 1/2/3 ile birini 6 sn içinde seçer. Botlar da kendi kartlarından kişiliklerine göre seçer. Güçler: Turbo, Süper Zıplama, Kalkan, Demir Misket, Hayalet, Işınlanma (kendine); Yapışkan Balçık, Engel Duvarı, Yavaşlatma, Küçült, Ters Rüzgâr, Bomba (rakibe, otomatik olarak öndeki rakibe). Geride kalana daha güçlü kart çıkma şansı.

Puan: 1. P, 2. P/2, 3. P/4; P parkur 1'de 100, parkur başına +15. Kupa bonusu, bahis (kazanır ×3, ilk 3 ×1.5) ve başarım ödülleri var.

Mağaza: renk, desen, şapka, gözlük, forma, iz kategorileri; her kategoride ~8 ürün, fiyat sırayla ×1.5 artar (toplam ~21.500 puan); tüm ürünleri almak yaklaşık 250–300 yarış sürer.

Oyuncu profilleri, seviye, istatistik ve başarımlar tarayıcıda ve `kayit/kayit.json` dosyasında saklanır (yerel `sunucu.py` ile, yedekli). Ağır çekim ve yavaş çekimli bitiş tekrarı oyuncu isteğiyle kaldırıldı; yarış hep normal hızda akar. Kamera: benim misketim / lider / genel. Sesler Web Audio ile üretilir.

## 200 parkur ve 20 dünya (ek istek)

Parkur sayısı 200'e çıkarıldı. Parkurlar `js/dunyalar.js` içindeki üreticiyle numarasına göre hep aynı şekilde üretilir (tohumlu rastgele),
dağdan zikzak inen koşulardan oluşur ve hedef süreye ulaşana kadar engel eklenir; kendi üstüne binen parkur başka varyasyonla yeniden üretilir.
Süre 1. parkurda ~60 sn, 200. parkurda ~180 sn; 1.'lik puanı 100 → 265. Elle yapılmış 12 parkur süresi uyan sıralara "özel parkur" olarak yerleştirildi
(1, 19, 37, 56, 74, 92, 109, 127, 145, 164, 182, 200).

Her 10 parkur bir dünyadır ve kendi çevresi vardır (`js/cevre.js`): Yeşil Vadi, Mutfak, Salon, Çocuk Odası, Banyo (dev oda içinde minyatür parkur),
Şehir Merkezi, Oyun Parkı, Lunapark (dönen dönme dolap ve atlıkarınca), Spor Salonu, Kapadokya (süzülen balonlar), Pamukkale, Mısır Piramitleri,
Paris (Eyfel), Venedik (kanallar, gondollar), Japon Bahçesi (kiraz ağaçları, pagoda, Fuji), Kutup (kuzey ışıkları), Tropik Ada, Büyük Kanyon, Volkan, Uzay.
Her dünyanın son 3 parkuru o dünyanın kupasıdır (20 kupa).

## Aşamalar

1. **Temel** ✅ — profiller + kalıcı kayıt, fizik, temel parçalar, parkur 1, sıralama, bitiş, puan ekranı.
2. **Güçler + botlar** ✅ — kart sistemi (15–20 sn'de bir 3 kart, 6 sn süre, 1/2/3 tuşları), 12 güç, bot kişilikleri (Saldırgan / Temkinli / Dengeli), bildirimler, efektler.
3. **Mağaza + kostümler** ✅ — 6 kategori × 8 ürün (toplam ~21.500 puan), 3D vitrin, yarışta görünüm, iz efektleri.
4. **12 parkur + kupalar + bahis** ✅ — yeni parçalar: pervane, piston, spiral, trambolin, çarpma direkleri, zikzak tahtalar; 4 kupa; bahis.
5. **Cilalama** ✅ — gerçekçi grafik (HDR gökyüzü fotoğrafı, Poly Haven dokuları, tepeli arazi, ağaçlar), bitiş tekrarı, 19 başarım, seviye, Web Audio sesleri, ses/grafik ayarı.

Ek istekler: parkurlarda daha çok çarpmalı/yavaşlatan engel; yüksek çözünürlüklü, gerçekçi görüntü.

Güç kuralları (oyuncu geri bildirimiyle): bir gücü kullanan misket kendi gücünden asla zarar görmez.
Yavaşlatma, Küçült ve Bomba sıralamada öndeki 2 rakibe işler; kuran, etki süresince onların içinden geçer.
Kendi kurduğu duvar ve balçık kurana işlemez; Ters Rüzgâr'la itilenler kurana çarpmaz.
Zıplama alçak ve ileridir, havadayken yolu takip eder. Zıplama, Turbo, Demir veya Hayalet sırasında düşen misket kaldığı yere konur.
Denge ölçümü: `node test/guc-testi.js 1 40` (oyuncu her turda aynı gücü seçer, ortalama sıra ve kendine zarar raporlanır).

## Ölçülen süreler (güçler açık, test/parkur-testi.js)

| Parkur | Hedef | Kazanan ort. |
|---|---|---|
| 1 Çaylak Tepesi | 60 | ~68 |
| 2 Kayan Vadi | 71 | ~73 |
| 3 İkiz Yollar | 82 | ~85 |
| 4 Huni Kasırgası | 93 | ~107 |
| 5 Zıpzıp Köprü | 104 | ~110 |
| 6 Çivili Orman | 115 | ~119 |
| 7 Dev Spiral | 125 | ~129 |
| 8 Pervane Fabrikası | 136 | ~139 |
| 9 Labirent Şelale | 147 | ~146 |
| 10 Volkan İnişi | 158 | ~160 |
| 11 Uzay Rampası | 169 | ~179 |
| 12 Şampiyonlar Dağı | 180 | ~182 |

## Dosyalar

| Dosya | Görev |
|---|---|
| `index.html` | Ekranlar ve görünüm (CSS) |
| `js/parcalar.js` | Parkur parçalarının geometrisi (oluk, viraj, çatal, huni, çivi, atlama, trambolin, piston, pervane…) |
| `js/parkurlar.js` | Elle yapılmış 12 özel parkur |
| `js/dunyalar.js` | 20 dünya, 200 parkurun adları, kupalar, puanlar, parkur üreticisi |
| `js/cevre.js` | Dünya çevreleri: zemin, ışık, gökyüzü, süsler, hareketli parçalar |
| `js/fizik.js` | Rapier fizik dünyası, misketler, ilerleme, takılma kurtarma, bitiş |
| `js/guclar.js` | 12 güç, kart dağıtımı, bot yapay zekâsı |
| `js/magaza.js` | Mağaza kataloğu, fiyatlar, desen/forma çizimi, 3D şapka ve gözlükler, izler |
| `js/grafik.js` | three.js görüntü: HDR gökyüzü, malzemeler, arazi, ağaçlar, misketler, parçacıklar, efektler |
| `js/ses.js` | Web Audio ile üretilen sesler |
| `js/kayit-sistemi.js` | Profiller ve kalıcı kayıt |
| `js/oyun.js` | Yarış akışı, kamera, güç kartları, mağaza, kupa, bahis, başarımlar, tekrar |
| `varliklar/dokular.js` | HDR gökyüzü ve doku fotoğrafları (Poly Haven, CC0), base64 gömülü |
| `sunucu.py` | Yerel sunucu: kayıtları `kayit/kayit.json`'a yazar, yedek alır |
| `test/guc-testi.js` | Güç denge testi: her gücün ortalama sıraya etkisi ve kendine zarar |
| `test/parkur-testi.js` | Ekransız parkur testi: `node test/parkur-testi.js 5 10 -g` (`-g`: güçler açık; `hepsi` / `ornek` / `ozel` / `10-30` aralık; `-h`: çukur testini atla) |
