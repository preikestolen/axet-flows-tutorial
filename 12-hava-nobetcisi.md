# 12. Hava Nöbetçisi (Gün 1)

Zamanlanmış bir akışın üç zor sorusu: **gerçekten kendi kendine çalışıyor
mu, verisi kalıcı mı, dış servis çökünce ne oluyor?** Bu ders üçünü de
cevaplayan küçük ama eksiksiz bir akış kuruyor.

**İş:** Belirli aralıklarla İstanbul'un sıcaklığını ve rüzgar hızını
herkese açık bir hava servisinden çek, Excel'e yeni satır olarak ekle.
Sıcaklık önceki okumaya göre **3 °C'den fazla** değiştiyse ayrı bir
"Uyarılar" sayfasına yaz.

**Kabul kriterleri:**

- Zamanlayıcı elle tetiklemeden çalışıyor
- Veri deploy sonrası da duruyor (kalıcı klasör)
- Servis cevap vermezse akış sessizce ölmüyor
- **Bitti:** Excel'de en az 3 otomatik satır

> Görev "2 saatte bir" diyordu; kullanıcı isteğiyle **saatte bire** çekildi
> (`akis-uret.py` → `ARALIK_SN`). Ders 4 (zamanlayıcı, `file`), 7 (`catch`,
> yeniden deneme), 10 (`json-to-excel`) ve 11 (form sayfaları) üzerine kurulur.

## 12.1 Mimari

```
inject (saatte bir, deploy'dan 15 sn sonra da) ─► istek hazirla ─► http request ─► yanit kontrol ─┐
inject (elle, test)  ─┘                    ▲                                                     │
                                           └── delay 60 sn ◄── hata siniflandir ◄── catch        │
                                                                    │ (3. denemede vazgec)       │
                                                                    ▼                            ▼
                                                  gecmisi oku (file in, JSONL) ─► kaydi isle ─► okumalar.jsonl (ekle)
                                                                                       └──────► excel tablosu ─► json-to-excel ─► hava-nobetcisi.xlsx

Menu "Hava Nobetcisi":  Ozet | Okumalar | Uyarilar | Hatalar   (her biri form onInit ─► gecmisi oku ─► tablo)
```

Kaynaklar: [`kaynaklar/hava-nobetcisi/`](kaynaklar/hava-nobetcisi/)

| Dosya | Görev |
|---|---|
| `01-istek-hazirla.js` | Open-Meteo URL'si, 20 sn zaman aşımı, eski `msg.headers` temizliği |
| `02-yanit-kontrol.js` | `statusCode` ve alanları doğrular; sorun varsa `node.error(…, msg)` |
| `03-hata-siniflandir.js` | Geçici hata (timeout, 5xx, 429) → 60 sn sonra yeniden; 3. denemede ya da kalıcı hatada **hata kaydı** |
| `04-gecmis-yok.js` | İlk çalışmada geçmiş dosyası yok — hata değil, boş geçmiş |
| `05-kaydi-isle.js` | Önceki okumaya göre fark, `|fark| > 3` → uyarı; JSONL satırı |
| `06-excel-tablosu.js` | Okumalar / Uyarilar / Hatalar / Ozet |
| `07-sayfa-verisi.js` | Menüdeki dört sayfanın tablosu |
| `08-excel-indir.js` + `../ortak/indirme-*.js` | Excel indirme bağlantısı (12.6) |
| `test/calistir.js` | 12 senaryo: fark eşiği, 503 → yeniden deneme, timeout → hata kaydı, 404 → tek deneme… |

## 12.2 Servis: Open-Meteo

Anahtar istemeyen, herkese açık bir servis:

```
https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784
    &current=temperature_2m,wind_speed_10m&timezone=Europe%2FIstanbul
```

Kurum ağından erişilebildiğini **konteynerin içinden** doğrulayın (tarayıcı
proxy'si farklı olabilir):

```bash
wsl.exe -d aXet-flows_WSL -- docker exec <runner-konteyner> node -e "require('https').get('https://api.open-meteo.com/v1/forecast?latitude=41&longitude=29&current=temperature_2m',r=>console.log(r.statusCode))"
```

> Servis `current` değerini 15 dakikada bir günceller; aynı çeyrek saatteki
> iki okuma aynı sıcaklığı verir (fark 0).

## 12.3 Kalıcılık: JSONL asıl kayıt, Excel görüntü

Excel'e "satır eklemek" dosyayı okuyup çözmeyi gerektirir. Bunun yerine:

- Her okuma `/internal-storage-files/hava/okumalar.jsonl` dosyasına **bir
  satır** olarak eklenir (`file`, append). Bozulmaz, sırası korunur.
- Excel her çalışmada bu geçmişten **baştan** üretilir.

Önceki okuma **bellekten değil dosyadan** okunur — Production yeniden
başlasa, yeni sürüm gelse de fark hesabı kaldığı yerden devam eder. Bu
derste dosya üç sürüm değişikliğinden (v6 → v7 → v8) sağ çıktı.

| Ortam | `/internal-storage-files/hava/` nereye düşer |
|---|---|
| Production | `%LOCALAPPDATA%\axet-flows\.deptapps-instances\<flowId>\hava\` |
| Desktop tasarımcı | `C:\internal-storage-files\hava\` |

## 12.4 Servis çökerse: sessiz ölüm yok

`http request` düğümü 4xx/5xx'te **hata fırlatmaz**, sadece `statusCode`
koyar. Kontrolü `02-yanit-kontrol.js` yapar ve `node.error(…, msg)` ile
`catch`'e gönderir. Sonra Ders 7.6'nın üç kuralı:

| Durum | Davranış |
|---|---|
| Timeout, `ECONNRESET`, 5xx, 429 | 60 sn bekle, yeniden dene (en çok 3) |
| 3. deneme de başarısız | `{tip:"hata"}` kaydı → JSONL + Excel'in **Hatalar** sayfası |
| 404, bozuk JSON, eksik alan | Yeniden deneme yok, doğrudan hata kaydı |

Sayaç `msg.deneme` üzerinde — aynı anda gelen iki tetikleme birbirinin
hakkını yemez.

## 12.5 Uygulama sayfaları: tablo

Menüde **Hava Nobetcisi** bölümü, altında Excel'in dört sayfası: **Ozet,
Okumalar, Uyarilar, Hatalar**. Her sayfa açılırken (form'un son çıkışı
`onInitForm`) geçmişi okur ve bir **datagrid**'i doldurur:

```javascript
msg.submission = { tablo: [ { zaman: "...", sicaklik: "17.4 C", ... }, ... ] };
// -> view action (update) -> form verisi olarak basilir
```

İki tuzak:

1. **Salt okunur `textarea` satır sonlarını yutuyor** — çok satırlı metin
   tek satıra dizildi. Tablo için datagrid kullanın.
2. **Devre dışı hücreler gri kutu, dar kolon metni kesiyor**
   ("01.10.2026 17:38" → "01.10.2026"). Uygulamanın Custom CSS'i
   ([`kaynaklar/ortak/uygulama.css`](kaynaklar/ortak/uygulama.css)) hücreyi
   düz metne çevirir ve kolonu içeriğe göre açar (`field-sizing: content`).

## 12.6 Tuzak — indirilen dosya `.tmp`

`view action`'ın **Download file** seçeneği ile inen Excel, Edge'de `.tmp`
uzantısıyla kaydedildi. Sunucu yanıtı doğruydu (`fileName:
"hava-nobetcisi.xlsx"`, 8 KB); sorun aXet'in tarayıcı kodunda:

```javascript
const blob = new Blob([bytes]);          // tur (MIME) yok
link.download = fileName;
link.click();                            // <a> sayfaya EKLENMEDEN tiklaniyor
document.body.removeChild(link);         // ... ve burada hata
```

Bu kodu değiştiremeyiz; indirmeyi kendi yolumuzdan yapıyoruz:

1. Okta korumalı form işlemi sonunda `ortak/indirme-bagi-olustur.js`
   dosyayı `global` context'e koyar ve **10 dakika geçerli, 32 karakterlik**
   bir anahtar üretir.
2. `view action` mesajı HTML gösterebildiği için mesaja bağlantı konur:
   `<a href="/indir/<%= token %>" download>…xlsx</a>`.
3. `http in GET /indir/:token` → `ortak/indirme-sun.js` →
   `Content-Type: …spreadsheetml.sheet` ve
   `Content-Disposition: attachment; filename="….xlsx"`.

> **Neden düz bir indirme ucu değil:** aXet'in `http in` düğümünde kimlik
> doğrulama yok; Okta'nın dışında kalır. Bağlantı yalnızca giriş yapmış
> kullanıcının ekranında üretilir ve 10 dakika sonra geçersizdir. Aynı
> yöntem Gün 2'nin müşteri raporlarına da uygulandı.

## 12.7 Sonuç

| Kriter | Kanıt |
|---|---|
| Elle tetiklemeden çalışıyor | Okumaların hepsi `kaynak: zamanlayici` |
| Deploy sonrası duruyor | 17:00 okuması v6 → v7 → v8 sürüm değişikliklerinden sonra yerinde |
| Servis çökünce ölmüyor | Yerel testte 503 → yeniden deneme, timeout → 3 deneme + hata kaydı |
| ≥ 3 otomatik satır | Ozet sayfası: *"Otomatik okuma sayısı 3 (kabul kriteri en az 3: TAMAM)"* |

## 12.8 Hazır akışı kurmak

1. Önce Ders 11'in akışı (uygulama + menü orada): `kaynaklar/musteri-kontrol/musteri-kontrol-akis.json`
2. Sonra **☰ → Import** → `kaynaklar/hava-nobetcisi/hava-nobetcisi-akis.json`
3. **Deploy** → `elle oku (test)` → `C:\internal-storage-files\hava\` altında JSONL + Excel
4. Versiyon kaydet → Production → `kaynaklar\production-portu-ac.ps1` → **Hava Nobetcisi → Ozet**

## 12.9 Alıştırmalar

1. **Eşiği ayara taşıyın.** `ESIK = 3` sabit; `env.get("UYARI_ESIGI")` ile
   akış ortam değişkeninden okuyun.
2. **Uyarıda bildirim.** Uyarı oluşunca Ders 10'daki e-posta yolunu tetikleyin.
3. **Günlük özet.** Gece yarısı çalışan ikinci bir `inject` ile günün en
   yüksek/en düşük sıcaklığını ayrı bir sayfaya yazın.
4. **Hata yolunu canlıda görün.** URL'yi geçici olarak bozuk bir alan
   adına çevirip deploy edin; Hatalar sayfasında 3 denemeli kaydı izleyin.

---

**Önceki:** [11. Müşteri Ana Verisi Kontrolcüsü](11-musteri-ana-veri-kontrolu.md) ·
**Takıldınız mı?** → [Sorun Giderme](SORUN-GIDERME.md)
