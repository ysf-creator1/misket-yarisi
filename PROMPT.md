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
| `test/guc-senaryo.js` | Her gücün istenen davranışı (zıplama, bomba, kalkan, demir, hayalet) |
| `test/denge-testi.js` | Yarı yolda lider/sonuncu kazanma oranları |
| `test/yeni-engel-testi.js` | Kazık, sarkaç, bant, tabla, kapı, şelale düşüşü testleri |
| `test/parkur-testi.js` | Ekransız parkur testi: `node test/parkur-testi.js 5 10 -g` (`-g`: güçler açık; `hepsi` / `ornek` / `ozel` / `10-30` aralık; `-h`: çukur testini atla) |

## 3. Güncelleme (oyuncu geri bildirimi)

### Prompt
> Misket Yarışı'nı oyuncu geri bildirimine göre geliştir. Fizik gerçekçi kalsın; her değişiklikten sonra ekransız testlerle doğrula.
> **Güçler:** (1) Süper Zıplama, önündeki Engel Duvarı'nın ve en az iki çarpma direğinin üstünden aşacak kadar yükseğe/ileriye sıçrasın; havada yolu takip etsin, yandan düşmesin (düşerse kaldığı yere konsun).
> (2) Bomba hedefin olduğu yerde patlasın; yakındaki tüm rakipler (kuran ve kalkanlılar hariç) geriye/yana savrulsun ve 1 sn sersemlesin; sersemleyenin başında dönen yıldızlar çıksın.
> (3) Hayalet; misketlerden, güç duvarlarından ve tüm engellerden (direk, tampon, tahta, pervane, piston, çivi) geçsin ama parkurun zemini ve yan duvarlarından geçmesin; denge için süre boyunca biraz yavaşlasın.
> (4) Kalkan; rüzgâr, yavaşlatma, balçık, küçültme ve bombadan etkilenmesin, ama Engel Duvarı onu da durdursun.
> (5) Demir Misket bir Engel Duvarı'na çarpınca duvarı kırsın; kırınca demir etkisi bitsin.
> **Kamera:** Huni deliğinden düşerken, atlama boşluğunda ve trambolinde kamera birkaç saniye yandan baksın, sonra arkaya dönsün.
> **Geriye düşme:** Delikten düşen ya da atlayan misket geriye kaymasın, sıralamada geri düşmesin; güç kullanırken düşen misket geriye konmasın.
> **Çeşitlilik:** Parkurlar 5 farklı yerleşimle üretilsin (zikzak, sarmal kule, geniş kıvrımlar, şelale düşüşleri, labirent çatallar); yeni hareketli engeller eklensin: zeminden çıkan kazıklar, sarkaç, hareketli bant, döner tabla, açılıp kapanan kapı. Dünyaya göre engel ağırlıkları ve parkur malzemesi değişsin.
> **Final sürprizleri (orta):** Parkurun son %25'inde sürpriz bölüm, liderin %70'i geçmesiyle herkese ek "final kart turu" (geridekilere güçlü kart), arkadan yetişene rüzgâr tüneli, lider çok açılınca kovalayanların saldırıları lideri hedefleyebilsin. Lider yine favori ama sonuç kesin olmasın.
> **Mağaza:** Her kategoride 8 → 24 ürün (toplam 144); fiyatlar sırayla artsın, hepsini almak ~500 yarış sürsün.

### Yapılanlar ve ölçümler
- Güç senaryoları (`node test/guc-senaryo.js`): zıplama duvarı aşıyor (12/12), 2 sıra direği aşıyor, yandan düşme 0/16; bomba 3 misketi savurup sersemletiyor; kalkan yavaşlatma/rüzgâra bağışık; demir duvarı kırıp etkisi bitiyor (6/6); hayalet çivilerden düz geçiyor (8/8).
- Yarış dengesi (`node test/denge-testi.js`): yarı yolda lider kazandı %67 → **%37**, yarı yolda sonuncu kazandı %2 → **%8**.
- Yeni engeller (`node test/yeni-engel-testi.js`): takılma ve düşme ≤ 0,13/yarış.
- Geri kayma ölçümü parkur testine eklendi; huni ilerlemesi geri gitmiyor, atlama inişi rampanın altından başlıyor, bu bölgelerde düşen misket kaldığı yere konuyor.
- Mağaza: 144 ürün, toplam 38.155 puan (≈490 yarış).

## 4. Güncelleme (oyuncu geri bildirimi)

### Prompt
> (1) Yarış başında kamera önden değil arkadan baksın; animasyonlu giriş olsun. (2) Güç kartları 10 sn görünsün ve seçilebilsin. (3) Süper Zıplama daha yükseğe ve daha ileri sıçrasın. (4) Delik/atlamadaki yan görüşte duvarlar misketleri kapatmasın: o bölümler saydamlaşsın; kamera tam yandan değil yandan-yukarıdan baksın ve kısa sürede normal görünüme dönsün.

### Yapılanlar ve ölçümler
- Giriş: geri sayım 5,6 sn; ilk ≈3 sn kamera yüksekten yan-arkadan parkuru gösterip dönerek misketlerin arkasına iner (hiç önden bakmaz), sonra 3-2-1.
- Kart süresi 6 → 10 sn (final kart turundan sonraki dağıtım da buna göre ertelenir).
- Zıplama: dikey hız 8,4 → 10,2 (tepe ≈2,4 m), ileri 8,5–11 → 10,5–13,5 m/sn. Önünde 18 m içinde huni varsa huninin girişinin önüne inecek kadar kısa zıplar (huninin üstünden aşıp düşmesin); zıplama misketi hiç yavaşlatmaz.
  Senaryo: 1,4 sn'de 13,8 m ilerleme (zıplamadan 2,8 m), yandan düşme 0/16. Parkur 1 (40 yarış): ortalama sıra 4,08 → 3,48, zıpladıktan sonra düşme 0,17 → 0,13/yarış.
- Yan kamera: 7 m yandan/2,2 m yukarıdan → 5 m yandan/5,2 m yukarıdan, süre 2,5 → 1,6 sn. Yan görüşte misketin 5 m yakınındaki parkur parçaları %80 saydamlaşır, sonra yumuşakça eski hâline döner (`Grafik.fadeTrack`).

## 5. Güncelleme (oyuncu geri bildirimi)

### Prompt
> (1) Bölüm bitince sonraki bölüme geçme butonu olsun. (2) Tuzaklar sadece en öndekine değil, bana yakın öndeki ya da arkadakilere kurulabilsin; şartlara göre otomatik karar versin. (3) Menülere, mağazaya vb. geçiş için en üstte butonlar olsun.

### Yapılanlar ve ölçümler
- Sonuç ekranında **Sonraki Parkur ▶** (kupada yok). Sonraki parkur kilitliyse "🔒 ilk 3 gerekli" yazar ve basılamaz.
- Tuzak hedefi `PowerSystem.trapTargets(m, güç, n)`: öndekiler (30 m) ve arkadakiler (10 m) puanlanır. Arkadan yakından ve hızlı gelen rakip, hemen öndeki rakip ve 15 m+ kaçan lider öne çıkar; kalkanlı/hayalet (duvar ve balçıkta kalkan sayılmaz) ve zaten etkilenmiş rakip geri planda kalır. Bomba rakiplerin kümelendiği yeri seçer; rüzgâr öndekilere ve 8 m içinden kovalayanlara eser.
  Ölçüm (botlar, 18 yarış): hedeflerin %76'sı önde, %24'ü arkada (eskiden arkadaki yalnızca lider tuzak kurunca). Denge (`denge-testi 25,75,125 16`): yarı yolda lider kazandı %44 (eski kodla aynı ölçümde %53).
- Üst menü çubuğu (`#topnav`): Menü · Parkurlar · Kupalar · Mağaza · Başarımlar + puan; menü ekranlarında hep görünür, yarışta gizli. Telefonda simge + kısa yazı.

## 6. Güncelleme: çok oyunculu (Azure)

### Prompt
> Oyunu 6 kişilik çok oyunculu yap; katılamayanların yerine bot olsun. Sunucu Azure'da (ücretsiz hesap), fatura riskine karşı en düşük alarm. Arkadaşlar oda kodu/davet linki ve hızlı eşleşmeyle katılsın; çok oyunculu puanlar profile eklensin; kupa ve bahis şimdilik tek oyunculuda kalsın. Performanslı çalışsın.

### Yapılanlar ve ölçümler
- Azure: `rg-misket` (swedencentral), `misket-sunucu` Standard_B2ats_v2 (12 ay ücretsiz pakette), Ubuntu 24.04, 64 GB P6 disk, Caddy + Let's Encrypt, fail2ban, otomatik güncellemeler. Bütçe alarmı 1 $/ay (%50, %100, tahmini %100).
- Sunucu `sunucu/oyun-sunucusu.js`: tarayıcıdaki fizik/güç dosyalarını aynen kullanır; 120 Hz fizik, 20 Hz ikili anlık görüntü (oyuncu başına ≈6 KB/sn), olaylar fizik saatiyle damgalı. Odalar (5 harfli kod), hızlı oyun (20 sn), kopan oyuncunun misketi bota geçer, aynı anahtarla dönen geri alır. Koruma: mesaj boyutu/sıklık, IP başına 16 bağlantı, en fazla 16 oda.
- `js/guclar.js`: `PowerSystem` birden çok insan oyuncu (`humans`), duvarlara numara.
- İstemci `js/ag.js`: bağlantı + `RemoteRace` (Race arayüzünü taklit eder, 120 ms tampon + ara değer) → kamera, HUD, kartlar, efektler değişmeden çalışır. Lobi ekranı `scrMp`, üst çubukta 👥.
- Testler: `test/cok-oyunculu-testi.js` 21/21; tarayıcıda iki profil (bilgisayar + telefon) yerel ve canlı sunucuyla uçtan uca; yük testi Azure'da 20 oda: CPU %69 (tek çekirdek), döngü 10,6 ms / 16,7 ms, bellek 342 MB. Canlı gecikme ≈74 ms.
