# Uygulamayı çalıştırma — her Run Flow'dan sonra

Bu sayfa, portalda bir versiyonu **Run Flow** ile başlattıktan sonra uygulamaya
ulaşmak için yapılacakları sırayla anlatır. Ayrıntılı sebepler:
[MEMORY.md](MEMORY.md), [SORUN-GIDERME.md](SORUN-GIDERME.md).

## 1. Portu aç (her Run Flow'dan sonra, zorunlu)

Portaldaki **Local access URL** (`http://localhost:<port>`) doğrudan açılmaz:
Production WSL içindeki Docker'da çalışır ve port sadece `172.17.0.1`'de dinler.
Port da her Run Flow'da değişir. Köprüyü bu betik kurar.

Bu klasörde (`axet-flows-tutorial`) PowerShell açıp:

```powershell
powershell -ExecutionPolicy Bypass -File kaynaklar\production-portu-ac.ps1
```

`HAZIR: http://localhost:<port>` yazınca portaldaki link açılır.

| Betiğin çıktısı | Ne yapmalı |
|---|---|
| `HAZIR: http://localhost:<port>` | Linki açın |
| `Kopru kuruldu ama ... yanit vermedi` | Uygulama hâlâ açılıyor: 30 sn bekleyip betiği tekrar çalıştırın |
| Birkaç dakika sonra da yanıt yok | aXet açılışta takılmış olabilir ("cloud context"): portalda Production'ı durdurun, aynı versiyonu yeniden **Run Flow** yapın, betiği tekrar çalıştırın |

## 2. Uygulamaya gir

1. Linki açın. Okta girişi istenirse kurumsal hesabınızla girin.
2. Proje (**NDBS TR Project Development**) ve model seçin.

## 3. Orbit Notification System (her Run Flow'dan sonra)

1. **Orbit Notification System → Orbit Giris**: Orbit e-posta ve şifresiyle giriş yapın.
   Şifre saklanmaz; uygulama her yeniden başladığında bu adım tekrarlanır. Yapılmazsa
   saatlik okuma ve mail durur (son liste ve proje seçimi yine görünür).
2. **TS Onayi Listesi**: proje seçili gelir; **Listele** → liste + onay bekleyen TS maili.

## 4. Mail yardımcısı (bir kez)

Mailler, uygulamanın çalıştığı bu bilgisayarda açık **klasik Outlook** ile gönderilir.

1. **Orbit Notification System → Kurulum ve Mail** sayfasındaki iki dosyayı
   (`outlook-gonderici.ps1`, `orbit-mail-kurulum.ps1`) aynı klasöre indirin.
2. O klasörde:

   ```powershell
   powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1
   ```

3. Sayfayı yeniden açın: **"Mail yardımcısı çalışıyor"** görünmeli.

Yardımcı Görev Zamanlayıcı'dan Windows oturumu açılınca kendiliğinden başlar;
Run Flow'dan sonra tekrar kurmak gerekmez. Kaldırmak:
`powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1 -Kaldir`

## Kısa liste

| Ne zaman | Yapılacak |
|---|---|
| Her Run Flow'dan sonra | `kaynaklar\production-portu-ac.ps1` → linki aç → Orbit Giris |
| Bir kez | Kurulum ve Mail sayfasından yardımcıyı kur |
| Her sabah (Desktop ~11–12 saatte oturumu düşürür) | Versiyon kaydı "Not authorized" derse: Desktop'ı tepsiden **Exit** edip tek kez açın, Okta'ya girin |

## Kod değiştirdiyseniz (geliştirici için)

1. `.js` dosyalarını değiştirin → ilgili `akis-uret.py` → `test/calistir.js`
2. Portal → **+ New Version → Regular Deployment** (tasarımcı açılır)
3. `python kaynaklar\tasarimciya-yukle.py` (portu bulur, sekmeleri yükler, Okta'yı korur)
4. Tasarımcıda bulut+ok ile versiyonu kaydedin → tasarımcıyı durdurun → **Run Flow**
5. Yukarıdaki 1. adımdan devam
