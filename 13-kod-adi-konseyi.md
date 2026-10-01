# 13. Kod Adı Konseyi (Gün 3)

Eğlence görevi, ama altında ciddi bir soru var: **birden fazla AI'ı aynı
sahnede, her biri kendi sesiyle konuşturup sonucu bozulmayan bir biçimde
nasıl toplarsınız?**

**İş:** Kullanıcı projesini iki cümleyle anlatır. Üç AI karakter sırayla
konuşur — **alaycı mühendis, abartılı pazarlamacı, dramatik şair** — her biri
bir kod adı önerir ve savunur. **Başkan** hepsini dinler, kazananı seçer,
gerekçeli karar verir. Kazanan isimler puanıyla **İsim Panosu**'nda listelenir.

**Kabul kriterleri:**

- Üç karakter gerçekten farklı sesle konuşuyor, Başkan hepsine değiniyor
- Öneriler her seferinde aynı kalıpta değil, ama biçim bozulmuyor
- İsim Panosu kalıcı, sıralama doğru
- Görünüşe emek verilmiş
- **Bitti:** Bir arkadaş projesini yazıp kazanan ismi alıyor ve panoda görüyor

> Ders 5 (ajan, Output Schema), 8 (ajan zinciri, geçici hatalar), 11
> (form, view action) ve 12 (tablo sayfaları, Custom CSS) üzerine kurulur.

## 13.1 Mimari

```
Konsey sayfasi (form)
  └─ proje al ─► panoyu oku ─► konseyi kur ─► SIRA YONETICISI ─┬─► Alayci Muhendis ──┐
                                                ▲               ├─► Abartili Pazarlamaci┤ (her cevap
                                                └───────────────┼─► Dramatik Sair ──────┘  geri doner)
                                                                └─► Baskan ─► karari isle ─┬─► pano.jsonl (ekle)
     ajan hatasi ─► 3 sn bekle ─► ajan yeniden (ayni prompt, en cok 3 deneme)            └─► view action (sahne)

Isim Panosu sayfasi (form onInit) ─► panoyu oku ─► sirala ─► view action (tablo)
```

Kaynaklar: [`kaynaklar/kod-adi-konseyi/`](kaynaklar/kod-adi-konseyi/)

| Dosya | Görev |
|---|---|
| `01-proje-al.js` | 15-400 karakter; değilse AI'a gitmeden uyarı |
| `02-konsey-hazirla.js` | Oturuma rastgele **ilham** konuları, panodaki isimler **yasaklı** |
| `03-sonraki-konusmaci.js` | Sıra yöneticisi: cevabı kaydeder, sıradakinin prompt'unu kurar, doğru ajana yollar (5 çıkış) |
| `04-karar-isle.js` | Başkan'ın kararını doğrular, pano kaydı + sahne HTML'i |
| `05-pano.js` | Puana göre sırala, madalyalar |
| `06-hata-yaniti.js` / `07-ajan-yeniden.js` | Konsey dağılırsa mesaj; geçici ajan hatasında yeniden deneme |
| `test/calistir.js` | Sahte ajan cevaplarıyla 25 kontrol |

## 13.2 Ses ajanda, içerik prompt'ta

Her karakter **ayrı bir ajan düğümü**: kişiliği düğümün *Instructions*
alanında sabit, sıcaklığı yüksek (1.0). Başkan'ın sıcaklığı düşük (0.4) —
karar tutarlı olsun.

| Karakter | Instructions'tan | Sahnede (CSS) |
|---|---|---|
| 🛠️ Alaycı Mühendis | Kuru mizah, hata kodları, soğuyan kahve; **asla ünlem yok** | Daktilo yazısı |
| 📣 Abartılı Pazarlamacı | "Devrim", "sinerji", BÜYÜK HARF, ünlem!!! | Kalın |
| 🎭 Dramatik Şair | Kader, deniz, yıldız, "ah…", gönül, hüzün | İtalik, serif |
| ⚖️ Başkan | Her üyeye ayrı seslen, adil ol, hafif esprili | Lacivert karar panosu |

Sıra yöneticisi her konuşmacıya **öncekilerin önerilerini** de verir
("onlardan farklı bir isim öner, istersen laf at") — konsey bir sohbet gibi
akar, üç bağımsız çağrı gibi değil.

## 13.3 Çeşitlilik serbest, biçim değil

| İstek | Nasıl |
|---|---|
| Her seferinde farklı | Rastgele ilham (mühendis: "COBOL", pazarlamacı: "uzay yarışı", şair: "kayıp mektuplar"…), yüksek sıcaklık, panodaki isimler yasaklı |
| Biçim bozulmasın | **Output Schema:** karakterler `{kodAdi, gerekce}`; Başkan `{degerlendirmeler:{muhendis,pazarlamaci,sair}, kazananKarakter (enum), kazanan, puan, karar}` |

Modele yine de güvenmiyoruz (`04-karar-isle.js`):

- `kazananKarakter` geçersizse kazanan **isimden** bulunur
- `puan` 1-100'e sıkıştırılır, sayı değilse 50
- Eksik değerlendirme → "(Başkan bu üyeye bir şey demedi.)"
- Bütün metinler HTML-escape — `<script>` sahneye giremez

## 13.4 Tuzak — aXet uyarıları 10 saniyede siliniyor

Sonucu ilk olarak view action mesajında (yeşil kutu) gösterdik. Kutu
kayboldu. aXet'in ön yüz kodu:

```javascript
if (alert !== 'danger') {             // nesne, metinle karsilastiriliyor -> hep true
  setTimeout(() => self.removeAlert(alert), 10000);
}
```

**Kırmızı hatalar dahil bütün uyarılar 10 saniye sonra silinir.** Kalıcı
gösterim için formda iki bileşen ([`kaynaklar/ortak/form_bilesenleri.py`](kaynaklar/ortak/form_bilesenleri.py)):

```json
{ "type": "hidden",      "key": "sahne" },
{ "type": "htmlelement", "key": "sahneGoster", "content": "{{ data.sahne || '' }}", "refreshOnChange": true }
```

Akış HTML'i `msg.submission.sahne`'ye yazar; view action (update) forma
basar; htmlelement onu **ham HTML** olarak gösterir (bu yüzden akışta escape
şart). Uyarı kutusunda yalnızca kısa bir özet kalır. Aynı yöntem Gün 1 ve
Gün 2'deki **indirme bağlantılarına** da uygulandı.

## 13.5 Tuzak — ajan hataları geçici olabilir

İlk gerçek koşuda Pazarlamacı düştü:

```
[axet-agents-execute:Abartili Pazarlamaci] Error: Mastra API error 500: {"error":"Agent execution failed - Bad Gateway"}
```

Ders 8.7'nin dersi: ajan çağrıları geçici olarak başarısız olabilir. Her
ajanın hata çıkışı → 3 sn `delay` → `07-ajan-yeniden.js`: sıra yöneticisinin
sakladığı **aynı prompt** aynı ajana, en fazla 3 deneme; sonra "Konsey
dağıldı" (sayfada kalıcı kırmızı kutu).

## 13.6 Gerçek bir oturum

Proje: *"Depodaki kritik stokları her sabah kontrol edip satın alma ekibine
Excel ekli e-posta atan bir otomasyon…"*

| Üye | Öneri | Ses |
|---|---|---|
| 🛠️ Mühendis | StokNobetcisi | *"Nöbetçi uyumaz, tatile çıkmaz, Cuma deploy'undan korkmaz."* |
| 📣 Pazarlamacı | SabahFırsatı | *"…Excel'i GÖZÜNÜZÜN ÖNÜNE SER ve planlamacıların o yarım saatini tarihe GÖMER!!!"* |
| 🎭 Şair | **Sabah Yıldızı** 👑 | *"Ah… Kuzey yıldızı gibi her sabah aynı noktada doğar…"* |

Başkan, **81/100**: *"…'nöbetçi' kelimesi biraz kasvetli… SabahFırsatı ise
bir alışveriş kanalına ait — konsey kararını verdi, tencere seti dahil
değil."* — üç üyeye de değindi.

## 13.7 Hazır akışı kurmak

1. Ders 11 ve 12'nin akışları (uygulama + menü Ders 11'de)
2. **☰ → Import** → `kaynaklar/kod-adi-konseyi/kod-adi-konseyi-akis.json`
   — ya da tasarımcı açıkken: `python kaynaklar/tasarimciya-yukle.py`
3. Dört ajan düğümünde **Project** / **Model** kontrolü
4. Versiyon → Production → `kaynaklar\production-portu-ac.ps1` →
   `/credentials/activate.html` → **Kod Adi Konseyi → Konsey**

## 13.8 Alıştırmalar

1. **Dördüncü üye.** Bürokrat bir hukukçu ekleyin: yeni ajan düğümü, `SIRA`
   dizisine bir anahtar, Başkan şemasına bir değerlendirme alanı.
2. **Seyirci oyu.** Panoda her isme "beğen" düğmesi; puan = Başkan puanı +
   oylar.
3. **Kişilik testi.** Aynı projeyi 5 kez verin; karakterler sesini koruyor
   mu, isimler tekrar ediyor mu? Sıcaklığı 0.3'e çekip farkı görün.

---

**Önceki:** [12. Hava Nöbetçisi](12-hava-nobetcisi.md) ·
**Takıldınız mı?** → [Sorun Giderme](SORUN-GIDERME.md)
