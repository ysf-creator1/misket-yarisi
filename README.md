# 🔴 Misket Yarışı

6 misketin gerçek fizikle (Rapier) yarıştığı, güç kartlı 3D misket yarışı oyunu. Tarayıcıda çalışır, internetsiz de oynanır.

**▶ Oyna:** https://ysf-creator1.github.io/misket-yarisi/ · 🌐 Türkçe / English — telefonda, tablette ve bilgisayarda açılır; ekrana kendiliğinden uyar.
Telefonda tarayıcı menüsünden **"Ana Ekrana Ekle"** dersen uygulama gibi tam ekran açılır.

## Neler var?
- **200 parkur, 20 dünya:** Yeşil Vadi, Mutfak, Salon, Çocuk Odası, Banyo, Şehir Merkezi, Oyun Parkı, Lunapark, Spor Salonu, Kapadokya, Pamukkale, Mısır Piramitleri, Paris, Venedik, Japon Bahçesi, Kutup, Tropik Ada, Büyük Kanyon, Volkan, Uzay.
- Parkurlar ~1 dakikadan ~3,3 dakikaya kadar uzar ve zorlaşır; 5 farklı yerleşim (zikzak, sarmal kule, geniş kıvrımlar, şelale, labirent). Engeller: çatallar, huniler, atlamalar, trambolinler, pervaneler, pistonlar, çivi tahtaları, spiraller, zeminden çıkan kazıklar, sarkaçlar, hareketli bantlar, döner tablalar, kapılar, merdivenler, vantilatörler, dönen tamburlar.
- Son bölümde sürprizler ve final kart turu: lider kaçsa bile yarış son ana kadar heyecanlı.
- **Güç kartları:** 15–20 saniyede bir 3 kart çıkar; kendini güçlendir (Turbo, Kalkan, Işınlanma, Mıknatıs…) ya da öndeki rakiplere tuzak kur (Yavaşlatma, Bomba, Duvar, Yer Değiştir…). Botlar da güç kullanır.
- **Mağaza:** renk, desen, forma, gözlük, şapka ve iz (144 ürün). **Kupalar**, **bahis**, **başarımlar**, **seviye**.

## 🎯 Yeni oyuncu ve tekrar oynama
- **İlk açılış:** rehber sayfaları yerine doğrudan Parkur 1 başlar; yardım yarışın içinde kısa ipuçlarıyla gelir (ilk kartlarda kartlar parlar; ağır çekim yok, yavaşlatıcı kart sanılıyordu). "Nasıl oynanır" menüde durur.
- **▶ Oyna:** menüdeki büyük düğme, misket seçimini atlayıp kaldığın parkuru başlatır. Menü sade başlar: mağaza/başarımlar/liderlik/günün parkuru 1 yarıştan, kupalar ve bahis 3 yarıştan sonra açılır.
- **Kolay başlangıç:** Parkur 1–3'te botlar biraz yavaş (ilk yarış kazanılabilsin); güç kartları 5 temel kartla başlar, ilerledikçe açılır (Bomba 3, Duvar 4, Demir 5, Küçült 6, Hayalet 7, Mıknatıs 8, Ters Rüzgâr 9, Işınlanma 10, Yer Değiştir 11. parkurda).
- **Kart modları:** yeni oyuncu 1. yarışı ⚡ Klasik, 2. yarışı 🎒 Biriktir (önce bilgi kartı) oynar; 3. yarıştan önce iki mod kart olarak sorulur. Biriktir'i denememiş eski oyuncu menüde "YENİ" şeridini görür, ilk yarışı Biriktir'dir, sonunda iki kartla seçer. Tercih profilde (`stats.kartMod`) saklanır; her yarış sonunda iki küçük kartla değişir.
- **Misketi etkile (tek oyunculu):** 💨 Üfle = misketi 0,6 sn ileri iter (Boşluk; enerji 12 sn'de dolar, en fazla 2) ve çatalda ⬅ ➡ yol seçimi (oklar ya da A/D). Kullanılan yarışın süresi rekorlara girmez. Çok oyunculuda yok.
- **Sonuç ekranı:** kısa yarış özeti (en fazla 3 satır) ve sıradaki hedefler (en fazla 2), sıradaki yarışın modu, büyük Sonraki/Tekrar (doğrudan başlar) ve 9–11 sn'lik otomatik geri sayım ("⏸ Bekle" ile durur).
- **Yıldızlar:** her parkurda ★ bitir · ★★ ilk 3 · ★★★ kazan. **Günün parkuru:** herkes aynı parkurda, ilk bitirişe +50 puan, liderlikte günlük sıralama (`/api/gunluk`).
- **Anlatıcı:** rakip tanıtımı (😈 Saldırgan, 🛡️ Temkinli, ⚖️ Dengeli), lider değişimi, son düzlük, foto finiş, sıra geçince "+1 ⬆". Dünya finali rozeti, yeni dünya ve ilk zafer kutlaması.
- **Meydan okuma:** sonuçta "🤝 Arkadaşına meydan oku" linki (`?parkur=5&hedef=70.5&kim=Ad`); açan, o süreyi geçmeye çalışır.
- **Ana ekrana ekle** daveti 2. yarıştan sonra (7 günde bir, en fazla 3 kez).
- **⚙️ Oyun ayarları** (menü ve duraklatma): Misketi etkile, Kolay başlangıç, İpuçları, Otomatik sonraki yarış, Anlatıcı — hepsi kapatılabilir, cihazda hatırlanır.
- Rapor sayfasında "Yeni gelenler" (ilk yarışı bitiren, ertesi gün / 7 gün içinde dönen) ve "Oyun içi davranış" (yarıda bırakma, ilk kart, ayar kapatma, meydan okuma) bölümleri var. "Kart modları" ve "Mod seçimleri": tek/kupa/çok oyunculu yarışların hangi modda oynandığı, oyuncuların tercihi ve nerede seçtiği (olaylar: `tek_yaris.kart`, `mod`, `mod_bilgi`; çok oyunculu `cok_basla.mod`).

## ☁️ Oyuncu hesapları (bulut)
- **Hesap zorunlu değil:** ilk açılışta bu cihaza özel bir misafir oyuncu (ör. Misafir123) verilir, puanları sadece bu cihazda durur. İsterse menüden hesap oluşturur; misafir ilerlemesi yeni hesaba taşınır. Çok oyunculuda misafir bu adla görünür ve şifresiz adını değiştirebilir (kayıtlı bir oyuncunun adını alamaz; "Misafir…" adları hesap için ayrılmıştır).
- Oyuncu adı **tekildir** (büyük/küçük harf farkı aynı sayılır); uygunsuz adlar kabul edilmez. Her oyuncunun **4 haneli PIN**'i vardır.
- Puan, seviye, açılan parkurlar, eşyalar, başarımlar sunucuda saklanır; başka cihazdan adın + PIN'inle girersin. İnternet yoksa ilerleme cihazda bekler, bağlanınca gönderilir.
- Bulut öncesi bu cihazda oynanmış kayıtlar giriş ekranında "eski kayıtlar" olarak görünür; PIN belirleyip buluta taşınır.
- **Liderlik:** puan, galibiyet, en uzak parkur ve parkur rekorları. **Günlük görevler:** her gün 3 görev + giriş ödülü (art arda günlerde artar).
- Şifre: **4 haneli PIN** ya da **resimli şifre** (12 resimden 1'i; bir cihazda 3 yanlışta o cihaz 30 dakika bekler). Giriş yapılan cihaz bir daha sormaz.
- Unutunca: **📱 Yeni cihaz ekle** (girişli cihazda 6 haneli kod + QR, 5 dk) ya da yönetici: `bash sunucu/sifre-sifirla.sh "Ad"`.
- Sunucu kayıtları her gün yedekler (30 gün); `bash sunucu/yedek-indir.sh` bir kopyayı bilgisayara indirir.

## 📊 Kullanım raporu
Sunucu oyun olaylarını (açılış, tek/çok oyunculu yarış, oda, bağlantı, hesap açma/giriş) `/opt/misket/veri/olaylar/` altına günlük dosyalara yazar (400 gün).
Tam IP saklanmaz (yalnız ağ kısmı → yaklaşık şehir/ülke, DB-IP Lite). Rapor: `bash sunucu/rapor.sh 7` (ya da `30`, `bugun`, `dun`, `tumu`, `2026-10-20..2026-10-25`).
**Canlı rapor sayfası:** `https://misket-yarisi.swedencentral.cloudapp.azure.com/api/rapor#k=ANAHTAR` — her açılışta kayıtları o an okur (dönem seçimi, saatler, oyuncular, konum, grafikler). Anahtar sunucuda `/opt/misket/veri/rapor-anahtar.txt` (ilk açılışta oluşur; görmek için `ssh … sudo cat` ile oku, silinirse yenisi üretilir). Sayfa `sunucu/rapor.html`, veri `sunucu/panel.js`.

## 👥 Çok oyunculu
Menüdeki **Çok Oyunculu** düğmesinden:
- **Hızlı Oyun:** bekleyen oyuncularla eşleşirsin (en fazla 20 sn bekler), eksik koltuklarda bot yarışır. Açık hızlı oda yoksa parkuru sen seçersin (200 parkurun hepsi), gelenler senin odana katılır.
- **Parkur seçimi:** çok oyunculuda tüm parkurlar açık; oda kurucusu önce dünyayı, sonra o dünyanın 10 parkurundan birini seçer (🎲 rastgele de var).
- **Oda Kur:** 5 harfli oda kodu ya da **davet linki** (`…/misket-yarisi/?oda=KOD`) ile arkadaşların katılır; kurucu parkuru seçer ve başlatır.
- En fazla 6 kişi; boş koltuklarda ve bağlantısı kopanın yerinde bot oynar, geri gelen oyuncu misketini geri alır.
- **Odada kalırsın:** odadan yalnızca "← Odadan çık" ile çıkılır. Yarış arasında mağazaya, menüye ya da parkurlara gitmek odadan çıkarmaz (üst menüde "Çok Oyunculu"da yeşil nokta). Sayfa yenilense ya da telefon kilitlense de aynı odaya dönülür; bağlantısı kopan 10 dakika odada tutulur. Odadayken tek başına yarış başlatmak "odadan çıkılsın mı?" diye sorar.
- **Sıradakini kurucu seçer:** yarış bitince kurucu sonuç ekranında "🔁 Aynı parkur" ya da "⏭ Sonraki parkur"a basar (başka parkur için lobide "Parkuru değiştir"). Diğerleri seçim yapmaz; beklerken mağazaya bakabilir. Kurucunun bağlantısı koparsa bağlı biri geçici olarak yönetir, kurucu dönünce yetki ona geçer.
- **3-2-1:** yarış başlatılınca herkesin ekranında, hangi ekranda olursa olsun (mağaza dahil) 3 saniyelik geri sayım çıkar; bu sırada alışveriş sürer, sonra herkes yarışa alınır. Yarıştan çıkan odada kalır ve "🏁 Yarışa dön" ile geri girebilir.
- Puanlar ve başarımlar normal yarış gibi profiline eklenir (kupa ve bahis tek oyunculu modda).

Fizik sunucuda çalışır (`sunucu/oyun-sunucusu.js`, Node.js + ws); telefonlar sadece görüntüyü çizer.
Sunucu: Azure (İsveç), `wss://misket-yarisi.swedencentral.cloudapp.azure.com/ws`.

### Sunucu yönetimi
```
bash sunucu/guncelle.sh                       # GitHub'daki son sürümü sunucuya kur ve yeniden başlat
curl https://misket-yarisi.swedencentral.cloudapp.azure.com/durum   # oda/oyuncu sayısı, bellek
node test/cok-oyunculu-testi.js               # yerel sunucu + sahte oyuncularla test
node test/yuk-testi.js 20 90                  # yük testi (sunucunun içinde çalıştırılır)
```
Yerelde denemek için: `PORT=8790 node sunucu/oyun-sunucusu.js` ve oyunu `index.html?sunucu=ws://127.0.0.1:8790/ws` ile aç.
İlk kurulum: `sudo bash sunucu/kur.sh` (Ubuntu 24.04; Node 22, Caddy ile otomatik HTTPS).
Parkur, fizik ya da mesajlar değişince önce `bash sunucu/surum-artir.sh` (oyun sürümü + dosya etiketleri artar; eski sayfayla çok oyunculuya bağlanana "sayfayı yenile" uyarısı çıkar), sonra commit + push + `guncelle.sh`.

## ⚡ Hızlı açılış
- Gökyüzü ve dokular `varliklar/doku/` klasöründe ayrı dosyalardır. Menü yalnızca küçük ışık dosyasını (`gokyuzu-isik.hdr`, 512×256) bekler; görünen gökyüzü (`gokyuzu.jpg`) ve dokular menü açıldıktan sonra arkada iner. İlk açılışta inen miktar ~8,5 MB'tan ~1,5 MB'a indi.
- `sw.js` (service worker): ikinci açılıştan itibaren dosyalar telefondan gelir, internetsiz de açılır. Sayfa her açılışta önce internetten istenir (yeni sürüm hemen görünür); `surum-artir.sh` önbelleği de yeniler.
- `index.html` dosyasına çift tıklayınca (file://) tarayıcı ayrı resimleri yükleyemediği için gömülü kopya `varliklar/dokular.js` kullanılır. `varliklar/doku/` içinde bir dosya değişirse: `node varliklar/dokular-uret.js`.

## Bilgisayarda kalıcı kayıtla oynamak
- **Mac:** klasördeki **Misket Yarışı** uygulamasına çift tıkla (ilk seferde sağ tık → Aç). Kayıtlar `kayit/kayit.json` dosyasına yazılır.
- **Windows / diğer:** `python3 sunucu.py` çalıştır ya da `index.html` dosyasını aç (o zaman kayıtlar tarayıcıda tutulur).

## Testler
```
node test/parkur-testi.js ornek 3 -g   # örnek parkurları güçler açıkken simüle eder
node test/guc-testi.js 1 40            # güçlerin dengesini ölçer
node test/guc-senaryo.js               # zıplama, bomba uçuşu, kalkan vb. senaryolar
```

## Lisanslar
three.js (MIT) · Rapier (Apache-2.0, `RAPIER-LICENSE.txt`) · gökyüzü ve dokular: [Poly Haven](https://polyhaven.com) (CC0)
