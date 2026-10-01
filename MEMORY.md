# aXet.flows — Hafıza: hatalar ve çözümleri

> **AI asistanları:** her oturumun başında bu dosyayı oku; yeni bir hata
> çözdüğünde ya da ortam hakkında yeni bir şey öğrendiğinde güncelle (bkz. [CLAUDE.md](CLAUDE.md)).

Gerçek kurulumda yaşanan hataların kısa listesi. Ayrıntılı açıklama ve
komutlar için [SORUN-GIDERME.md](SORUN-GIDERME.md); bu dosya hızlı
hatırlatma içindir. Yeni bir hata çözdüğünüzde buraya bir satır ekleyin.

Son güncelleme: 2026-10-01 · Platform: aXet.flows v6.5.4 (Node-RED v4.1.1)

## Ortam gerçekleri (önce bunları bilin)

| Konu | Gerçek |
|---|---|
| Mimari | Portal sadece arayüz. Akış **sizin makinenizde** çalışır: tasarımcı (Desktop penceresi veya Docker) + Production (WSL içinde Docker) |
| Tasarımcı açma | Her zaman portaldan: **Catalog → flow → + New Version → Regular Deployment** |
| Production açma | Versiyon satırı **… → Run Flow → Regular Deployment** |
| Aynı anda | Bir flow ya tasarımcıda ya Production'da çalışır, ikisi birden olmaz |
| Kayıt | Deploy sadece yerel tasarımcıya. Portala kaydetmek = **versiyon** (alt araç çubuğu bulut+ok). Kaydedilen şey **son deploy** |
| Editör | Production'da kapalı (`Admin UI disabled`); değişiklik → yeni versiyon |
| Kalıcı yol | `/internal-storage-files/` kalıcı, `/data/` konteynerle silinir |
| Desktop tasarım modu | `/internal-storage-files` → `C:\internal-storage-files\`; Admin API genelde `127.0.0.1:52333` |
| Production dosyaları | `%LOCALAPPDATA%\axet-flows\.deptapps-instances\<flowId>\` |
| Günlükler | Desktop: `%LOCALAPPDATA%\axet-flows\.deptapps-desktop\logs\application.log` · Tasarımcı: `...\.deptapps-instances-in-designer-mode\<id>\logs\` · Production: `...\.deptapps-instances\<id>\logs\` |
| function sandbox | `require`, `process`, `fs`, `zlib` **yok**. `Buffer`, `env.get`, `flow/global/context`, `node.*`, `setTimeout` var |

## Hata → çözüm

### Kurulum ve oturum

| Hata / belirti | Sebep | Çözüm |
|---|---|---|
| "Starting SSH proxy for mirrored networking mode..." takılı | WSL/SSH proxy | SORUN-GIDERME → Kurulum |
| `JWT expired at ...` (Desktop günlüğü), proje listesi boş, "not activated" | Desktop oturumu doldu; ağ kopukken yenilenmiyor (`ENOTFOUND`) | Tepsi → **Exit**, Desktop'ı **bir kez** aç, Okta ile gir, tasarımcıyı portaldan yeniden aç |
| `error trying to recover aXet.Core user data` | Aynı (süresi dolmuş oturum) | Aynı |
| `Unexpected starting error` / `file is locked: ...mv.db` | Desktop iki kez başlatıldı | Görev Yöneticisi'nden tüm `aXet.flows-Desktop` kapat, bir kez aç |
| `Flow configuration not exists or is bad!` | `aXet.flows.exe` doğrudan açıldı | Tasarımcıyı portaldan aç |
| Tasarımcıda ansızın `401` (SQL + AI) | Konteyner token'ı açılışta alır, yenilemez | Save in Cloud → kill instance → New Version |
| Catalog boş | Liste geç yükleniyor / filtre | Bekle, **My Flows** filtresini kontrol et |

### Akış ve düğümler

| Hata / belirti | Sebep | Çözüm |
|---|---|---|
| `ReferenceError: process/require is not defined` | function sandbox | `env.get()`, `Buffer`; kütüphane gerekiyorsa saf JS ya da palet düğümü |
| `invalid properties: setupErrors functionErrors closeErrors` | aXet function düğümü bu alanları zorunlu tutar | Her function'a `"setupErrors":0,"functionErrors":0,"closeErrors":0` |
| function'dan sonraki düğüme bir şey gitmiyor | `return msg;` yok | Döndür; çok çıkışta `return [a, b]` |
| `msg.payload.x` undefined, switch dala girmiyor | HTTP yanıtı string | `http request` Return = **a parsed JSON object** |
| `catch` tetiklenmiyor | Hata `msg` olmadan atıldı | `node.error(err, msg)` / `throw` |
| `catch` kendi hatasını yakalıyor (döngü) | Kapsam tüm sekme | `catch` kapsamını düğümlerle sınırla |
| Dosyaya `[object Object]` | Nesne yazıldı | `JSON.stringify` ya da metin üret |
| `.xlsx` bozuk açılıyor | `file` Encoding ≠ none | Encoding = **none** |
| `_Style.style: 'backgroundColor' is not a valid style` | xlsx-populate anahtarı | Arka plan = **`fill`**, renkler `#`'siz hex |
| Excel formülü metin | Formül string verildi | `() => "=D2-E2"` (parametresiz fonksiyon) |
| Yüklenen xlsx metne çevrilip bozuldu | `.toString("utf8")` | Buffer olarak bırak |
| Ajan: `Invalid ephemeral agent config` | Model seçilmemiş | Model listeden fareyle seç |
| Ajan: `Project ID not configured` | Proje boş | Projeyi seç, Deploy, yeni versiyon |
| Ajan: `Budget exhausted or billing disabled` | Proje bütçesi | Başka proje / platform ekibi |
| Ajan: `OKTA token not returned from ai-config endpoint` | Production aktive edilmedi ya da oturum düştü | `http://localhost:<port>/credentials/activate.html`; tasarımcıdaysa Desktop'ı yeniden başlat |
| `No database password found for flowId` | Akış veritabanı platformda açılmamış | Platform ekibi; geçici olarak JSONL dosyası |
| MS Graph `Please select the tenant` / token hatası | Tenant / izin | Config'te Tenant seç; MS Graph Mail izni iste |

### Form ve uygulama

| Hata / belirti | Sebep | Çözüm |
|---|---|---|
| Tasarımcı portunda uygulama yok (404) | Uygulama sadece Production'da yayınlanır | Run Flow → Local access URL |
| Production `localhost:<port>` zaman aşımı | Port sadece `172.17.0.1`'de dinliyor | WSL'de `socat TCP-LISTEN:<p>,bind=127.0.0.1,reuseaddr,fork TCP:172.17.0.1:<p>` |
| `Not found config node with id '' for auth Okta` | Okta kullanıcı tablosu yok | Sihirli değnek → **Apply Auth App** → LocalStorage → OKTA |
| `The form '<ad>' does not exist ...` | Menü etiketi/biçimi | Etiket = form adı; v6.5.4'te `{type:"form", data:{form_id}}` |
| Menü ve karşılama sayfası import'ta boş | Import bu ayarları taşımayabilir | `application` → Welcome Page + Menu |
| **Submit sonsuza kadar dönüyor** | Akış `view action`'da bitmiyor | Sonuna `view action` (update) |
| `view action` var, yine dönüyor | Yanlış alan adı kontrol edildi | Gerçek ad `msg.__deptAppsFormioButtonClicked` (yardım metnindeki `__axetFlows...` yanlış) |
| Form verisi `msg.payload.<alan>`'da yok | Yapı farklı | `msg.payload.data.<alan>` |
| Dosya eki içerik yerine adres | Storage modu | File bileşeni Storage = **base64** |
| `Other instance ... running yet in production mode!` | Production açıkken tasarımcı | Production'ı kafatasıyla durdur |
| Üretilen dosyalar kayboldu | `/data/` altına yazıldı | `/internal-storage-files/` kullan ya da kullanıcıya indir |

## Doğrulanmış teknikler

| İhtiyaç | Yöntem |
|---|---|
| Forma "bitti" mesajı | `view action` + `msg.messages = {k: "v"}`; mesajda `<%= k %>` (EJS) |
| Kullanıcıya dosya indirme | `msg.downloadFileSubmission = { data: buffer, fileName, inputType: "buffer" }` + view action'da **Download file** |
| Sayfa açılırken veri yükleme | Form düğümünün **son çıkışı** = `onInitForm` → function → view action |
| Seçim kutusunu doldurma | `msg.onInitPopulateFormStructure = { <key>: [{label, value}] }` |
| xlsx okuma (kütüphanesiz) | `kaynaklar/musteri-kontrol/02-xlsx-oku.js` (zip + inflate + XML) |
| Tarayıcısız çalıştırma | Admin API: `GET/POST /flows`, `PUT /flow/<tabId>`, `POST /inject/<id>` (import'ta ID'ler değişebilir) |
| Okta + roller | Apply Auth App asistanı; boş tabloda ilk giren `ROLE_ADMIN` |
| Akışı kodla üretmek | `.js` dosyaları + üretici betik (`akis-uret.py`) + yerel sandbox testi (`test/calistir.js`) |
