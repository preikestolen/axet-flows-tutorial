# 14. Orbit Notification System

Bir dış iş takip sistemini (Orbit, NTT DATA Business Solutions'ın Plane tabanlı
proje platformu) **API anahtarı olmadan, sadece okuyarak** izleyen bir bölüm.

**İş:** Özel bir Orbit kullanıcısıyla uygulamadan giriş yapılır. Kullanıcının
üye olduğu projeler listelenir, biri seçilir (seçim saklanır). Seçilen projede
**TS onayına gönderilmiş** maddeler en yeniden en eskiye listelenir; saatlik
okuma yeni gelenleri **YENI** diye işaretler.

**Kabul kriterleri:**

- Orbit'e hiçbir yazma isteği gitmez (tek POST: giriş)
- Şifre diske, repoya, loga yazılmaz
- Proje seçimi ve son liste deploy'dan sağ çıkar
- Büyük projede (10 bin+ iş) ilk okumadan sonrası saniyeler sürer

> Ders 11 (form, view action, Okta), 12 (zamanlayıcı, tablo sayfaları,
> kalıcılık) üzerine kurulur.

## 14.1 Orbit'i tanımak

| Konu | Bulgu |
|---|---|
| Platform | Plane (açık kaynak Jira benzeri). Arayüz kendi `/api/workspaces/<alan>/...` uçlarını çerezle çağırır |
| Resmi API | `/api/v1/...` anahtar ister; normal kullanıcı anahtar açamaz (`/api/users/api-tokens/` → 403) |
| Giriş | Yalnız e-posta + şifre (`is_email_password_enabled`), SSO / magic link yok |
| Durumlar | Yedi projenin hepsinde aynı 36 durum; `E_Writing TS Doc → F_TS Approval Awaiting → G_Ready for Development → … → N_Done` |
| TS alanı | Özel alan `ts-gerceklesen-tarih-11435` ("TS Gerçekleşen Tarih"), yedi projede aynı anahtar |
| Sayfalama | `per_page` en çok 1000; `cursor=1000:0:0`, yanıtta `next_cursor`, `next_page_results` |

**"TS onayına gönderilmiş" nasıl bulunur:** Şu an F'de bekleyen madde neredeyse
hiç yok, liste geçmişten gelmeli. Jira'dan taşınan geçmişte durum
"Ts Onayı Bekleniyor"a geçtiği anda **TS Gerçekleşen Tarih** dolmuş. Kural:

```
TS Gerceklesen Tarih dolu  YA DA  durum su an F_TS Approval Awaiting
```

Bir kez listeye giren madde çıkmaz (gönderilmiş olmak geri alınmaz); durumu güncellenir.

> **Tuzak:** Bir work item'ın detay sayfasını tarayıcıda açmak, editörün
> açıklamayı (resim boyutunu) **sizin adınızla** yeniden kaydetmesine yol açtı.
> Keşif yalnız API ile yapılmalı.

## 14.2 Mimari

```
Orbit Giris:   e-posta+sifre -> GET /auth/get-csrf-token/ -> POST /auth/sign-in/ (302, yonlendirme izlenmez)
                -> cerez -> GET /api/users/me/ -> flow context "orbitOturum" (bellek)

TS Onayi Listesi
  acilis:      secim.json -> GET projects/ (secim kutusu) -> projeler/<id>.json -> tablo   (Orbit'e is sorgusu yok, hizli)
  Listele:     GET project -> GET states -> onceki anlik goruntu
               -> GET issues?order_by=-updated_at (1000'er, onceki okumadan eskiye gelince DUR)
               -> birlestir, yenileri isaretle -> projeler/<id>.json + secim.json -> tablo
  her saat:    oturum varsa secim.json'daki projeyle ayni zincir (view action yok)
```

Kalıcı: `/internal-storage-files/orbit/secim.json`, `/internal-storage-files/orbit/projeler/<id>.json`.

## 14.3 Giriş: tarayıcı formunu taklit etmek

Plane'in giriş sayfası klasik bir HTML formu POST eder (Django). Akış aynısını yapar:

1. `GET /auth/get-csrf-token/` → `{csrf_token}` + `csrftoken` çerezi (`msg.responseCookies`)
2. `POST /auth/sign-in/`, `application/x-www-form-urlencoded`:
   `csrfmiddlewaretoken, email, password, next_path`; başlıklar `Cookie: csrftoken=…`,
   `Origin`, `Referer` (Django HTTPS'te kontrol eder); **`msg.followRedirects = false`**
3. Yanıt 302. Hata: `Location` içinde `error_code=…&error_message=AUTHENTICATION_FAILED_SIGN_IN`.
   Başarı: `Set-Cookie` ile oturum çerezi
4. `GET /api/users/me/` ile çerez doğrulanır, bellekte saklanır

Şifre sadece istek gövdesinde yaşar; sonraki her function `msg.payload`'ı siler,
hata dalı da temizler. Oturum bellekte: Run Flow / yeniden başlatmada tekrar giriş gerekir (bilerek).

## 14.4 Artımlı okuma

İşler `order_by=-updated_at` ile istenir. Önceki okumanın en yeni
`updated_at` değeri saklanır; okuma o değerden eski bir kayda gelince durur.
Redington (10.310 iş): ilk okuma 11 sayfa / ~55 sn, sonrakiler genelde tek sayfa.

## 14.5 Tuzak — düğmeden sonra seçim kutusu boşalıyor

İlk gerçek koşuda "Listele"den sonra proje kutusunda ad yerine ham kimlik
göründü. view action `update` formu yeniden kurar ve seçenekleri yalnız
**o yanıttaki** `onInitPopulateFormStructure`'dan alır. Çözüm: proje listesi
flow context'te; her form yanıtına `secenekleriEkle(msg)` ile yeniden eklenir.

Gerçek koşu (v15, Redington): giriş aXet içinden çalıştı, ilk Listele ~60 sn →
534 madde (tarayıcıdaki sayımla aynı), ikinci Listele 13 sn.

v16 (düzeltme): Listele sonrası kutu dolu kalıyor. Yeni deploy'dan sonra
oturumsuz açılışta seçim + son liste diskten geliyor. OSSDDP ilk okuma 17 sn →
119 madde; en üstte durumu şu an F_TS Approval Awaiting olanlar ("onay bekliyor").

## 14.6 Mail: onay bekleyen TS'ler

**Kime / ne zaman:** Orbit Giris'te girilen adrese; içerik seçili projede durumu
şu an `F_TS Approval Awaiting` olan maddeler (madde bağlantısı, başlık, modül,
TS sorumlusu, son güncelleme). Listele → her seferinde; saatlik okuma → sadece
bekleyen liste son maildekinden farklıysa (`MAIL_SAATLIK_SADECE_DEGISINCE`).

**Neden Outlook, MS Graph değil:** `ms-graph-mail-send` (DELEGATED) token'ı bir
kez **cihaz koduyla** alır (`/credentials/ms-graph` → kod → login.microsoft.com/device).
Bu kurumda Koşullu Erişim cihaz kodu girişini engelliyor: **AADSTS 53003**, Edge'de de.
Çözüm iki parçalı:

1. Akış maili `/internal-storage-files/orbit/giden/<zaman>-<proje>.json`
   (`{to, subject, html}`) olarak bırakır.
2. Windows'ta `outlook-gonderici.ps1` klasörü 15 sn'de bir okur, açık **klasik
   Outlook** ile (COM) gönderir → Gönderilmiş Öğeler. Sadece `nttdata.com` /
   `bs.nttdata.com` alıcılarına gönderir. Her turda `outlook-gonderici.durum.json`
   (nabız) yazar.

**Kurulum ve Mail sayfası:** Rehber (ne yapar, gerekenler, kurulum, kullanım,
sınırlar), indirilecek iki betik (salt okunur File bileşeni, betikler function'a
base64 gömülü) ve yardımcının canlı durumu (nabız ≤ 2 dk → "çalışıyor").
`orbit-mail-kurulum.ps1` göndericiyi Görev Zamanlayıcı'ya (oturum açılışı, yönetici
gerekmez) ekler; `-Kaldir` siler. Yardımcı **uygulamanın çalıştığı** bilgisayara
kurulur; sadece web bağlantısıyla kullananların kurması gerekmez.

## 14.7 Hazır akışı kurmak

```
copy kaynaklar\orbit-bildirim\yerel.ornek.json kaynaklar\orbit-bildirim\yerel.json   (adresi yazin)
python kaynaklar\orbit-bildirim\akis-uret.py
node kaynaklar\orbit-bildirim\test\calistir.js
python kaynaklar\musteri-kontrol\akis-uret.py        (menu)
python kaynaklar\tasarimciya-yukle.py
```

`yerel.json` ve üretilen `orbit-bildirim-akis.json` kurum adresini içerir, git'e girmez.
