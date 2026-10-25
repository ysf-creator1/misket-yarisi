# 🔴 Misket Yarışı

6 misketin gerçek fizikle (Rapier) yarıştığı, güç kartlı 3D misket yarışı oyunu. Tarayıcıda çalışır, internetsiz de oynanır.

**▶ Oyna:** https://ysf-creator1.github.io/misket-yarisi/ · 🌐 Türkçe / English — telefonda, tablette ve bilgisayarda açılır; ekrana kendiliğinden uyar.
Telefonda tarayıcı menüsünden **"Ana Ekrana Ekle"** dersen uygulama gibi tam ekran açılır.

## Neler var?
- **200 parkur, 20 dünya:** Yeşil Vadi, Mutfak, Salon, Çocuk Odası, Banyo, Şehir Merkezi, Oyun Parkı, Lunapark, Spor Salonu, Kapadokya, Pamukkale, Mısır Piramitleri, Paris, Venedik, Japon Bahçesi, Kutup, Tropik Ada, Büyük Kanyon, Volkan, Uzay.
- Parkurlar 1 dakikadan 3 dakikaya kadar uzar ve zorlaşır; 5 farklı yerleşim (zikzak, sarmal kule, geniş kıvrımlar, şelale, labirent). Engeller: çatallar, huniler, atlamalar, trambolinler, pervaneler, pistonlar, çivi tahtaları, spiraller, zeminden çıkan kazıklar, sarkaçlar, hareketli bantlar, döner tablalar, kapılar.
- Son bölümde sürprizler ve final kart turu: lider kaçsa bile yarış son ana kadar heyecanlı.
- **Güç kartları:** 15–20 saniyede bir 3 kart çıkar; kendini güçlendir (Turbo, Kalkan, Işınlanma…) ya da öndeki rakiplere tuzak kur (Yavaşlatma, Bomba, Duvar…). Botlar da güç kullanır.
- **Mağaza:** renk, desen, forma, gözlük, şapka ve iz (144 ürün). **Kupalar**, **bahis**, **başarımlar**, **seviye**.

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

## 👥 Çok oyunculu
Menüdeki **Çok Oyunculu** düğmesinden:
- **Hızlı Oyun:** bekleyen oyuncularla eşleşirsin (en fazla 20 sn bekler), eksik koltuklarda bot yarışır.
- **Oda Kur:** 5 harfli oda kodu ya da **davet linki** (`…/misket-yarisi/?oda=KOD`) ile arkadaşların katılır; kurucu parkuru seçer ve başlatır.
- En fazla 6 kişi; boş koltuklarda ve bağlantısı kopanın yerinde bot oynar, geri gelen oyuncu misketini geri alır.
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
