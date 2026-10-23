# 🔴 Misket Yarışı

6 misketin gerçek fizikle (Rapier) yarıştığı, güç kartlı 3D misket yarışı oyunu. Tarayıcıda çalışır, internetsiz de oynanır.

**▶ Oyna:** https://ydursun.github.io/misket-yarisi/ — telefonda, tablette ve bilgisayarda açılır; ekrana kendiliğinden uyar.
Telefonda tarayıcı menüsünden **"Ana Ekrana Ekle"** dersen uygulama gibi tam ekran açılır.

## Neler var?
- **200 parkur, 20 dünya:** Yeşil Vadi, Mutfak, Salon, Çocuk Odası, Banyo, Şehir Merkezi, Oyun Parkı, Lunapark, Spor Salonu, Kapadokya, Pamukkale, Mısır Piramitleri, Paris, Venedik, Japon Bahçesi, Kutup, Tropik Ada, Büyük Kanyon, Volkan, Uzay.
- Parkurlar 1 dakikadan 3 dakikaya kadar uzar ve zorlaşır; 5 farklı yerleşim (zikzak, sarmal kule, geniş kıvrımlar, şelale, labirent). Engeller: çatallar, huniler, atlamalar, trambolinler, pervaneler, pistonlar, çivi tahtaları, spiraller, zeminden çıkan kazıklar, sarkaçlar, hareketli bantlar, döner tablalar, kapılar.
- Son bölümde sürprizler ve final kart turu: lider kaçsa bile yarış son ana kadar heyecanlı.
- **Güç kartları:** 15–20 saniyede bir 3 kart çıkar; kendini güçlendir (Turbo, Kalkan, Işınlanma…) ya da öndeki rakiplere tuzak kur (Yavaşlatma, Bomba, Duvar…). Botlar da güç kullanır.
- **Mağaza:** renk, desen, forma, gözlük, şapka ve iz (144 ürün). **Kupalar**, **bahis**, **başarımlar**, **seviye**.

## Bilgisayarda kalıcı kayıtla oynamak
- **Mac:** klasördeki **Misket Yarışı** uygulamasına çift tıkla (ilk seferde sağ tık → Aç). Kayıtlar `kayit/kayit.json` dosyasına yazılır.
- **Windows / diğer:** `python3 sunucu.py` çalıştır ya da `index.html` dosyasını aç (o zaman kayıtlar tarayıcıda tutulur).

## Testler
```
node test/parkur-testi.js ornek 3 -g   # örnek parkurları güçler açıkken simüle eder
node test/guc-testi.js 1 40            # güçlerin dengesini ölçer
```

## Lisanslar
three.js (MIT) · Rapier (Apache-2.0, `RAPIER-LICENSE.txt`) · gökyüzü ve dokular: [Poly Haven](https://polyhaven.com) (CC0)
