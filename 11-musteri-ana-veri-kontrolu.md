# 11. Müşteri Ana Verisi Kontrolcüsü (Gün 2)

İlk on ders aXet.flows'un parçalarını tek tek öğretti. Bu ders hepsini
gerçek bir iş için birleştiriyor — ve yol boyunca **dokümanda yazmayan**
beş platform tuzağına çarpıyor.

**İş:** Kullanıcı bir sayfadan SAP müşteri ana verisi Excel'i yükler.
Akış kuralları kontrol eder, hatalı satırları işaretleyen bir rapor Excel'i
ve bir AI özeti üretir.

| Kural | Ne yakalar |
|---|---|
| Boş zorunlu alan | Sadece boşluk içeren hücre de boş sayılır |
| Tekrar eden vergi no | `123 456 7890` = `1234567890`; sayı/metin farkı yok sayılır |
| Geçersiz ülke kodu | ISO 3166-1 alpha-2 dışı (`UK`, `tr`, `TUR`, `Turkiye`) |
| Bozuk IBAN | Karakter, ülkeye göre uzunluk, **mod-97** kontrol basamağı |

**Kabul kriterleri:**

- Kurallar **kodla**, yorum **AI ile** — AI'a sayı saydırılmaz
- Hatalı satırların hepsi bulunur, temiz satırlar işaretlenmez
- Sayfa uygulama menüsünden açılır, **Okta arkasında**

> Bu ders Ders 5 (ajan), 7 (`catch`), 9 (form + application) ve
> 10 (`json-to-excel`) üzerine kurulur.

## 11.1 Mimari

```
form ─► ekten Buffer ─► xlsx oku ─► kurallar ─► AI istegi ─► Ajan ─► AI yaniti ─► rapor tablosu
                                                    └─(hata yoksa AI atlanir)─────────┘      │
                                                                                       json-to-excel
                                                                                             │
                                                     view action ◄── rapora kaydet ◄─────────┘
                                                (mesaj + indirme)   (flow context)

Raporlar sayfasi:  form(onInit) ─► rapor listesi ─► view action
                   form(Indir)  ─► rapor indir   ─► view action (indirme)
```

Kaynaklar: [`kaynaklar/musteri-kontrol/`](kaynaklar/musteri-kontrol/)

| Dosya | Görev |
|---|---|
| `01-ekten-buffer.js` | Form ekini **Buffer**'a çevirir (metne değil!) |
| `02-xlsx-oku.js` | `.xlsx`'i kütüphanesiz okur (zip + DEFLATE + XML) |
| `03-kurallar.js` | Dört kural + istatistik. **Bütün sayım burada** |
| `04-ai-istegi.js` / `05-ai-yaniti.js` | Ajana sadece hazır sayılar gider; AI hatası raporu durdurmaz |
| `06-rapor-tablosu.js` | Dört sayfalı rapor: Kontrol, Hatalar, Ozet, AI Ozeti |
| `07-rapora-kaydet.js` | Raporu belleğe koyar, forma yanıt + indirme hazırlar |
| `08-rapor-listesi.js` / `09-rapor-indir.js` | Raporlar sayfası |
| `10-hata-yaniti.js` | Hata olursa forma kırmızı mesaj |
| `akis-uret.py` | `.js` dosyalarını import edilebilir JSON'a gömer |
| `test/` | Gizli hatalı örnek Excel + aXet'siz yerel test |

## 11.2 Neden kendi Excel okuyucumuz?

`function` düğümü bir sandbox'tır (Ders 1.6): `require`, `zlib`, `fs`
kapalı. Bunu aXet'in kendi kaynağında da gördük:

```
require is not implemented!
```

`.xlsx` aslında bir zip; içinde XML dosyaları var. `02-xlsx-oku.js` zip
dizinini okur, DEFLATE'i saf JavaScript'le açar (RFC 1951, ~100 satır),
`sharedStrings.xml` ve `sheet1.xml`'i ayrıştırır. Satır numaraları
**Excel'deki gerçek** numaralardır — kullanıcı rapordaki "satır 22"yi
dosyada doğrudan bulur.

> Palette `Excel Utils → excel to json` düğümü de var. Biz ona bağımlı
> olmadan, satır numarasını koruyarak okumak için bu yolu seçtik.

## 11.3 Kurallar kodda, yorum AI'da

`03-kurallar.js` bütün sayıları hesaplar. Ajana giden prompt yalnızca
şunu içerir:

```json
{ "toplamSatir": 40, "hataliSatir": 19, "toplamHata": 20,
  "kuralBazinda": [{ "kural": "Tekrar eden vergi numarasi", "adet": 6 }, ...],
  "ornekler": [...] }
```

ve kural: *"Sayıları AYNEN kullan. Yeniden sayma, tahmin etme."*
Müşteri satırlarının kendisi AI'a gitmez (Ders 9.6'daki veri yolu uyarısı).

Kolon adları dosyadan dosyaya değişir; `ALANLAR` tablosu "Vergi No",
"VKN", "Tax Number", "STCD1" gibi eşleri tanır. Başlığı `*` ile biten her
kolon otomatik zorunlu sayılır. Bir kolon bulunamazsa kural **sessizce
atlanmaz** — raporun Ozet sayfasına uyarı düşer.

## 11.4 Yerel test: aXet'e girmeden doğrulamak

```bash
python kaynaklar/musteri-kontrol/test/ornek-uret.py     # 40 satir, 20 gizli hata
node kaynaklar/musteri-kontrol/test/calistir.js         # fonksiyonlari sandbox'ta kosturur
```

```
beklenen 20 | bulunan 20
KACIRILAN : yok
YANLIS ALARM: yok
```

Örnek dosyada temiz ama tuzak satırlar da var: boşluklu yazılmış geçerli
IBAN, küçük harf IBAN, yabancı geçerli IBAN, boş ama zorunlu olmayan IBAN,
aynı unvanlı farklı vergi no. **Doğru çalışan bir kontrolcü bunları
işaretlememeli.** Ortada tamamen boş bir satır da var — atlanmalı.

Gerçek dosyanızı da verebilirsiniz: `node test/calistir.js musteri.xlsx`

## 11.5 Tuzak 1 — `function` düğümünün zorunlu alanları

Akışı JSON olarak üretip import ettik; deploy şunu dedi:

```
invalid properties: setupErrors functionErrors closeErrors
```

aXet v6.5.4 stok `function` düğümünü kendi sürümüyle değiştirmiş
(`10-function-af.html`). Stok Node-RED'deki `noerr` yerine bu üç alanı
**zorunlu** tutuyor. Elle JSON üretiyorsanız her `function` düğümüne:

```json
"setupErrors": 0, "functionErrors": 0, "closeErrors": 0
```

## 11.6 Tuzak 2 — Okta'yı seçmek yetmiyor

`application → Auth → Okta` seçip Production'ı açtık:

```
Error on load application
Not found config node with id '' for auth Okta
```

Okta girişi, **kimin girebileceğini tutan bir kullanıcı tablosu** ister.
Bunu elle kurmak yerine editördeki asistan kuruyor:

1. Alt araç çubuğundaki **sihirli değnek** → *aXet.flows Assistant*
2. **Apply Auth App** sekmesi → DB engine: **LocalStorage BD**
3. **OKTA Authentication** → **Accept**

Asistan şunları üretir: `deptapp-user-login-okta` tablosu, Okta config
düğümü (`application`'a bağlanır), kullanıcı yönetim formları (yeni
sekme: *User Okta Entity*) ve yalnızca `ROLE_ADMIN`'in gördüğü
**Admin. Area** menüsü. Tablo boşken **ilk giren kişi otomatik yönetici**
olur.

Okta girişinden sonra uygulama proje ve model seçtirir; ajanlar bu
seçimle çalışır.

## 11.7 Tuzak 3 — Submit düğmesi sonsuza kadar dönüyor

Rapor üretiliyordu ama kullanıcının ekranında düğme dönmeye devam etti.
`view action` düğümünün yardım metni sebebi söylüyor:

> Formdan başlayan akışın bir noktada `view action` düğümünde bitmesi
> **kesinlikle zorunludur.**

`view action` hem mesaj gösterir hem dosya indirtir:

```javascript
msg.downloadFileSubmission = { data: buffer, fileName: "rapor.xlsx", inputType: "buffer" };
msg.messages = { hatali: "19", toplam: "40" };   // mesajdaki <%= hatali %> alanlari (EJS)
```

**Asıl tuzak:** yardım metni formun koyduğu alanı
`msg.__axetFlowsFormioButtonClicked` diye anlatıyor. Form düğümünün
**kodunda** ad `msg.__deptAppsFormioButtonClicked`. Dokümana güvenip
"formdan mı geldi?" kontrolünü yanlış adla yazdık; akış her isteği
"formsuz test" sandı ve yanıt göndermedi. Şimdi ikisine de bakıyoruz:

```javascript
function formdanMi(m) { return !!(m.__deptAppsFormioButtonClicked || m.__axetFlowsFormioButtonClicked); }
```

## 11.8 Sonuç dosyaya değil, kullanıcıya

İlk sürüm raporu `/internal-storage-files/` altına yazıyordu — kullanıcı
AppData'da klasör aramak zorundaydı. Son sürümde:

- Submit'ten sonra rapor **tarayıcıya iner**, kullanıcı istediği yere kaydeder
- **Ana Veri → Raporlar** sayfası son 20 raporu listeler, **İndir** ile tekrar indirilir

Liste `flow` context'te durur. Form düğümünün **son çıkışı** her zaman
`onInitForm`'dur (sayfa açılırken tetiklenir); seçim kutusu şöyle dolar:

```javascript
msg.onInitPopulateFormStructure = { rapor: [{ label: "...", value: "..." }] };
```

> Bedeli: context bellektedir, Production yeniden başlatılınca liste
> sıfırlanır. Kalıcı arşiv için asistanın kurduğu LocalStorage tablosu
> yöntemi kullanılabilir (alıştırma 3).

## 11.9 Tuzak 4 — Production portu Windows'tan açılmıyor

Dashboard `http://localhost:4352` dedi; tarayıcı `ERR_CONNECTION_TIMED_OUT`.

```bash
wsl.exe -d aXet-flows_WSL -- ss -ltn
# LISTEN  172.17.0.1:4352     <- sadece Docker koprusunde
```

Konteyner portu `172.17.0.1`'e bağlanıyor; Windows `localhost`'u ise
(mirrored ağ) yalnızca WSL'in `127.0.0.1`'ine ulaşıyor. Köprü:

```bash
wsl.exe -d aXet-flows_WSL -- socat TCP-LISTEN:4352,bind=127.0.0.1,reuseaddr,fork TCP:172.17.0.1:4352
```

Production her başladığında port değişir; bu yüzden hazır betik var.
Her **Run Flow**'dan sonra bir kez:

```powershell
powershell -ExecutionPolicy Bypass -File kaynaklar\production-portu-ac.ps1
```

Betik köprüyü `setsid -f` ile başlatır — `nohup ... &` ile başlatılan süreç
`wsl.exe` kapanınca WSL tarafından öldürülür.

## 11.10 Tuzak 5 — Tasarımcı ve Production aynı anda olmaz

Production açıkken tasarımcıyı başlatmak:

```
Other instance of this Axet Flow is running yet in production mode!
```

Değişiklik döngüsü bu yüzden:

```
Production'i durdur -> New Version (tasarimci) -> degistir + Deploy
-> versiyon kaydet (bulut+ok) -> tasarimciyi durdur -> Run Flow (Production)
```

Portalda iki düğme karıştırılıyor: sağ üstteki **+ New Version**
tasarımcıyı, versiyon satırındaki **… → Run Flow** Production'ı açar.

## 11.11 Desktop tasarım modu

Bu kurulumda tasarımcı Docker'da değil, **Desktop'ın kendi penceresinde**
çalışıyordu (tepsi menüsünde *Disable Flows Desktop in design mode*).
Farkları:

| | Docker tasarımcı (Ders 1-10) | Desktop tasarım modu |
|---|---|---|
| Aktivasyon | Gerekmez | Ajan düğümü "not activated" diyebilir |
| `/internal-storage-files` | Konteyner volume'u | **`C:\internal-storage-files`** |
| Admin API | Konteyner portu | `127.0.0.1:52333` (genelde) |

Tasarımcı penceresi (`aXet.flows.exe`) tek başına açılmaz
(`Flow configuration not exists or is bad!`); her zaman portaldan açılır.

## 11.12 Sonuç

| Kriter | Sonuç |
|---|---|
| Menüden açılan sayfa, Okta arkasında | ✅ v4, Okta → proje → model → uygulama |
| Kurallar kodla, yorum AI ile | ✅ AI sayıları değiştirmedi |
| Hatalı satırların hepsi, temizler değil | ✅ 40 satır: 19 HATALI, 21 TEMİZ — 20/20 hata, 0 yanlış alarm |
| Kullanıcıya teslim | ✅ Mesaj + indirme + Raporlar sayfası |

> **AI'ın eklediği ayrıntılara dikkat:** özet, tekrar eden kayıtlar için
> `FLCU00` işlem kodunu önerdi — o bir birleştirme aracı değil. Sayılar
> koddan geldiği için doğruydu; modelin SAP ayrıntıları ise doğrulanmalı.

## 11.13 Hazır akışı import etmek

1. **☰ → Import** → [`kaynaklar/musteri-kontrol/musteri-kontrol-akis.json`](kaynaklar/musteri-kontrol/musteri-kontrol-akis.json)
2. Ajan düğümünde **Project** ve **Model**'i listeden seçin
3. **Sihirli değnek → Apply Auth App → LocalStorage BD → OKTA** (11.6)
4. **Deploy** → `ornek dosyayla test` → debug: *KONTROL SONUCU* 40/19/20
5. Versiyon kaydedin → Production → port köprüsü (11.9) → uygulamayı açın

## 11.14 Alıştırmalar

1. **Beşinci kural.** Vergi numarası biçimi: TR'de VKN 10, TCKN 11 hane
   (TCKN'nin kendi kontrol algoritması da var). `03-kurallar.js`'e ekleyin,
   `ornek-uret.py`'ye gizli hatasını koyun, testin 21/21 bulduğunu görün.
2. **IBAN ile ülke uyumu.** IBAN'ın ilk iki harfi `Ulke` kolonuyla
   eşleşmiyorsa uyarı (hata değil) verin.
3. **Kalıcı arşiv.** Raporları `flow` context yerine LocalStorage
   tablosuna yazın; Production yeniden başlasa da Raporlar sayfası dolu kalsın.
4. **Tekrarın ilk satırı.** `TEKRARIN_ILKINI_DE_ISARETLE = false` yapın;
   rapor nasıl değişiyor, hangisi iş açısından doğru?

---

**Önceki:** [10. Sonucu Teslim Etmek](10-sonucu-teslim.md) ·
**Takıldınız mı?** → [Sorun Giderme](SORUN-GIDERME.md)
