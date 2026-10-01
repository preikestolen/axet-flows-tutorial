---
name: axet-flows-workflow
description: Build, test and deploy an aXet.flows (NTT DATA, Node-RED based) automation flow end to end — from a business requirement to a versioned Production app with form UI, Okta login, AI agent and file download. Use when the user asks to create, change, debug or deploy an aXet.flows flow, an aXet form/application, or any Node-RED flow intended for aXet.
---

# aXet.flows akışı geliştirme

> Kaynak: depo kökündeki `SKILL.md`. Değiştirirseniz ikisini birlikte güncelleyin.

aXet.flows = Node-RED v4.1 + NTT eklentileri (form/application UI, AI ajanı,
Excel, MS Graph, SQL, Okta). Node-RED bilgisi geçerli; **ama aXet birçok
yerde stok davranışı değiştirmiş.** Bu skill, Node-RED dokümantasyonunu
(https://nodered.org/docs/) temel alır ve aXet'te gerçek kurulumda
doğrulanmış farkları üstüne koyar.

> **Her oturumda:** önce `MEMORY.md`, sonra bu dosya okunur; öğrenilenler
> ikisine de geri yazılır (bkz. [CLAUDE.md](../../../CLAUDE.md)).

Önce [MEMORY.md](../../../MEMORY.md) dosyasını okuyun: bilinen hatalar ve çözümleri
orada. Kalıcı örnek: [`kaynaklar/musteri-kontrol/`](../../../kaynaklar/musteri-kontrol/) (Ders 11).

## İş akışı

### 1. İsteri ayrıştır

- **Girdi** ne (form, dosya, zamanlayıcı, HTTP, e-posta)?
- **Kurallar** neler? Kesin olan her şey (sayım, doğrulama, eşleştirme) **kodla**
  yapılır. AI yalnızca yorum/özet/metin üretir; ona sayı saydırılmaz.
- **Çıktı** kime, nasıl teslim edilir? Varsayılan: kullanıcının tarayıcısına
  indirme + uygulama içinde bir "Raporlar" sayfası. Sunucu diskine dosya
  yazmak son çaredir.
- **Kabul kriteri** ölçülebilir olsun ("gizli hataların tamamı bulunur,
  temiz satır işaretlenmez").

### 2. Akışı tasarla

Düğüm zinciri çiz. Kalıp:

```
giris -> kopru(function) -> isleme(function...) -> [AI istegi -> ajan -> AI yaniti] -> cikti uretimi -> view action
                                                                      catch(kapsamli) -> hata yaniti -> view action
```

Kurallar:
- Her `function` tek iş yapar; ara sonuçları `msg.<ad>` üzerinde taşı, `msg`'yi
  yeniden yaratma (HTTP/form alanları kaybolur).
- Dış servis çağıran düğümlerin (ajan, HTTP, SQL) **hata çıkışını bağla**;
  AI başarısız olsa da ana çıktı üretilsin.
- `catch` kapsamını düğüm listesiyle **sınırla**; ajanın kendi hata dalı varsa
  catch'e alma (forma iki yanıt gider).
- Formdan başlayan **her** yol bir `view action`'da bitmeli.

### 3. Kodu dosyalarda yaz, akışı üret

`function` gövdelerini ayrı `.js` dosyalarına yaz (okunur, test edilir,
git'te izlenir). Bir üretici betik bunları import edilebilir JSON'a gömsün
(örnek: `kaynaklar/musteri-kontrol/akis-uret.py`). JSON'u elle yazarken:

```json
{ "type": "function", "func": "...", "outputs": 1, "timeout": 0,
  "setupErrors": 0, "functionErrors": 0, "closeErrors": 0,
  "initialize": "", "finalize": "", "libs": [] }
```

Sabit ID'ler kullan (`mk_form`, `mk_buffer`...) — menü, `catch` kapsamı ve
Admin API çağrıları bunlara dayanır.

### 4. aXet'siz yerel test

Function kodlarını Node'un `vm` modülüyle, aXet sandbox'ına benzer bir
bağlamda (`msg, node, flow, env, Buffer`; `require` yok) sırayla çalıştır.
Bilerek hatalı ve **tuzak temiz satırlar** içeren örnek veri üret,
beklenen sonucu dosyaya yaz, karşılaştır. Örnek: `test/ornek-uret.py`,
`test/calistir.js`. Kriter: kaçırılan = 0, yanlış alarm = 0.

Ayrıca: kablo hedeflerinin var olduğunu, `outputs` ile `wires` sayısının
tuttuğunu ve her `func`'un sözdizimini (`new Function(...)`) kontrol et.

### 5. Tasarımcıda kur

0. Tasarımcı zaten açıksa ve akışlar üretildiyse: `python kaynaklar/tasarimciya-yukle.py` (portu bulur, sekmeleri yükler, Okta'yı korur) — 2. adımın yerine geçer
1. Portal → **Catalog** → (yoksa **+ Add Flow**: ad, proje, kategori, use case)
   → **+ New Version → Regular Deployment**
2. **☰ → Import** (ya da tasarımcı açıkken Admin API: `PUT /flow/<tabId>`)
3. Ajan düğümü: **Project** ve **Model** listeden seç (import'ta boş kalabilir)
4. Okta gerekiyorsa: **sihirli değnek → Apply Auth App → LocalStorage BD → OKTA**
5. **Deploy** → test inject'i çalıştır → debug/durum rozetlerini oku
   (tarayıcısız: `POST /inject/<id>`, sonra editörde `RED.nodes.eachNode` ile `n.status`)

### 6. Versiyon ve Production

1. Deploy et → alt araç çubuğu **bulut+ok** → alias (`v1`, `v2`...) + açıklama → Save
2. Tasarımcıyı durdur (In Design → kafatası)
3. Versiyon satırı **… → Run Flow → Regular Deployment**
4. Port Windows'tan açılmaz (sadece `172.17.0.1`'de dinler) ve her Run Flow'da değişir:
   `powershell -ExecutionPolicy Bypass -File kaynaklar\production-portu-ac.ps1`
   (köprüyü `setsid -f socat ...` ile kurar; `nohup ... &` WSL'de ölür)
5. `http://localhost:<p>/credentials/activate.html` (AI düğümleri için)
6. Uygulamayı aç, kabul kriterlerini **gerçek arayüzden** doğrula

Değişiklik döngüsü: Production'ı durdur → tasarımcı → değiştir + Deploy →
yeni versiyon → tasarımcıyı durdur → Run Flow.

### 7. Belgele

Yeni bulunan her hata için `MEMORY.md`'ye bir satır, `SORUN-GIDERME.md`'ye
ayrıntılı madde (tam hata metni + sebep + çözüm) ekle.

## Düğüm sözleşmeleri (aXet'te doğrulanmış)

| Düğüm | Girdi | Çıktı / not |
|---|---|---|
| `axetflows-form` | — | `msg.payload.data.<key>` (alan adı = bileşen **Property Name**). Çıkış sayısı = buton + 1; **son çıkış `onInitForm`** |
| File bileşeni (base64) | — | `data.<key> = [{ name, originalName, size, url: "data:<mime>;base64,..." }]` |
| `axetflows-app` | — | Auth: `authNone` / `Okta` / `authBasicInternal`. Okta için `oktaDb` config şart. Menü öğesi: `{type:"form", text, data:{form_id}}` |
| `axetflows-view-action` | Form msg'si (dokunulmamış) | `action:"update"`; `msg.messages` → mesajdaki `<%= k %>`; `msg.downloadFileSubmission = {data, fileName, inputType:"buffer"\|"base64"\|"path"}`; onInit'te `msg.onInitPopulateFormStructure = {key: [{label,value}]}` |
| Dosya indirme | Okta korumalı form işlemi | **`downloadFileSubmission` kullanma** (Edge'de `.tmp`). `kaynaklar/ortak/indirme-bagi-olustur.js` → view action mesajında `<a href="data:<%= tur %>;base64,<%= veri %>" download="<%= dosya %>">`. Okta'lı uygulamada tarayıcıdan `http in` çağırma (aXet REST auth çöküyor) |
| Tablo sayfası | form onInit | `msg.submission = { tablo: [ {kolon: "deger"} ] }` → view action (update); bileşen datagrid (`disabled`, `disableAddingRemovingRows`); görünüm için `ortak/uygulama.css` |
| Kalıcı sayfa kutusu | — | view action mesajı 10 sn'de silinir. Sonuç/bağlantı/hata için formda `hidden <alan>` + `htmlelement` (`content: "{{ data.<alan> || '' }}"`, `refreshOnChange: true`); akış `msg.submission.<alan>` = escape'li HTML (`kaynaklar/ortak/form_bilesenleri.py`) |
| Çok ajanlı akış | — | Ses = ajanın Instructions'ı (sabit), görev = prompt; tek bir çok çıkışlı "sıra yöneticisi" function; her ajanın hata çıkışı → delay → aynı prompt'la yeniden (en çok 3); Output Schema + kodla doğrulama (enum, aralık, escape) |
| Menü bölümü | — | `{type:"section", text, children:[{type:"form", text: <form adı>, data:{form_id}}]}`; etiket = form adı |
| Form msg alanları | — | `msg.__deptAppsFormioButtonClicked`, `msg.__deptAppsFormioButtons`, `msg.submission` — **silme** |
| `axet-agents-execute` | `msg.payload` (metin/nesne) | Çıkış 1: `msg.payload.response` (şemasız) veya şema nesnesi; çıkış 2: `msg.error`. Diğer `msg` alanları korunur |
| `json-to-excel` | `msg.payload.data = { "<Sayfa>": [ {kolon: değer} ] }` | `msg.payload` = Buffer. Stil `{value, style:{fill, fontColor, bold, numberFormat}}`, formül `() => "=A1"` |
| `file` (yazma) | `msg.filename`, `msg.payload` | Buffer için Encoding = `none` |
| `catch` | — | `msg.error = {message, source}`; kapsamı `scope: [id...]` ile sınırla |

## Node-RED temelleri (kısa)

- **Mesaj:** `msg.payload` asıl veri; `return msg` / `return [m1, m2]` / `node.send()`. `null` = durdur.
- **Hata:** `node.error(err, msg)` ya da `throw` → `catch` yakalar. `msg`'siz hata yakalanmaz.
- **Durum:** `node.status({fill, shape, text})` — test ve teşhis için her function'da kullan.
- **Context:** `context` (düğüm), `flow` (sekme), `global`. aXet'te depo bellekte: yeniden başlatınca silinir.
- **Ortam:** `env.get("AD")`; düğüm alanında `${AD}` (alanın tamamıysa).
- **Switch:** varsayılan olarak eşleşen **her** kurala gönderir.
- **HTTP Request:** zincirde önceki yanıt başlıkları sonraki isteğe gider — arada `msg.headers` temizle.
- **Admin API:** `GET /flows`, `POST /flows` (`Node-RED-Deployment-Type`), `GET/PUT /flow/:id`, `POST /flow` (yeni sekme — sekme ID'si yeniden üretilir, düğüm ID'leri korunur), `POST /inject/:id`.
- Referans: https://nodered.org/docs/user-guide/ · https://nodered.org/docs/user-guide/writing-functions · https://nodered.org/docs/api/admin/methods/

## Yapma

- Yardım metnine körü körüne güvenme; şüphede aXet kaynağına bak:
  `%LOCALAPPDATA%\axet-flows\.deptapps-desktop\electron-releases\WINDOWS_X64\latest-prod\resources\app\packages\node_modules\@node-red\nodes\`
- `/data/` altına kalıcı çıktı yazma.
- Kullanıcıyı AppData klasöründe dosya aramaya mecbur bırakma — indir.
- AI çıktısındaki sayıları ve SAP işlem kodlarını doğrulamadan kullanma.
- Salt okunur çok satırlı veriyi `textarea`'da gösterme (satırlar birleşir) — datagrid kullan.
- Zamanlanmış akışta "önceki değer"i bellekte tutma — kalıcı dosyadan (JSONL) oku.
- Gerçek müşteri verisini ajana gönderme; sadece özet/istatistik gönder.
- Desktop'ı ikinci kez başlatma; tasarımcı penceresini doğrudan açma.
