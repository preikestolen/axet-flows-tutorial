# AI asistanları için çalışma kuralları

Bu depo aXet.flows (Node-RED tabanlı) için uygulamalı bir eğitim ve
akış geliştirme çalışma alanıdır. Bu dosya her oturumun başında okunur.

## Her oturumda ZORUNLU sıra

1. **Önce [`MEMORY.md`](MEMORY.md)'yi baştan sona oku.** Ortam gerçekleri,
   daha önce yaşanmış hatalar ve çözümleri orada. Bir hatayla karşılaşınca
   çözüm aramadan önce burada ara.
2. **Sonra [`SKILL.md`](SKILL.md)'yi oku** (aynı içerik:
   `.claude/skills/axet-flows-workflow/SKILL.md`). Akış oluşturma, değiştirme,
   test ve deploy işlerinde bu iş akışını izle.
3. İşi yap.
4. **Oturum biterken ya da yeni bir şey öğrenildiğinde güncelle:**
   - Yeni bir hata çözüldüyse → `MEMORY.md`'ye bir satır (belirti / sebep /
     çözüm) ve `SORUN-GIDERME.md`'ye tam hata metniyle ayrıntılı madde.
   - Ortam hakkında yeni bir gerçek öğrenildiyse (port, yol, sürüm, davranış)
     → `MEMORY.md` → "Ortam gerçekleri" tablosu.
   - İş akışında daha iyi bir yol, yeni bir düğüm sözleşmesi ya da yeni bir
     "yapma" bulunduysa → `SKILL.md` **ve** `.claude/skills/axet-flows-workflow/SKILL.md`
     (ikisi aynı tutulur; skill kopyasındaki göreli bağlantılar `../../../` ile başlar).
   - `MEMORY.md`'deki "Son güncelleme" tarihini değiştir.
   - Yanlış çıkan bir bilgiyi silme yerine düzelt ve neden değiştiğini yaz.

Güncellemeyi kullanıcı ayrıca istemese de yap; bu dosyaların güncel kalması
bir sonraki oturumun saatler kaybetmemesi demek.

## Depo kuralları

- Dil: dokümanlar Türkçe; kod içi yorumlar ve dizgiler Türkçe ama ASCII
  (mevcut `kaynaklar/*.js` dosyaları gibi).
- Kurum adresleri maskelenir: portal adresi yerine `<axet-portal-adresiniz>`.
  Kişisel e-posta, kullanıcı kimliği, token yazma.
- Akış JSON'unu elle düzenleme; `.js` dosyalarını değiştirip üretici betiği
  (`kaynaklar/musteri-kontrol/akis-uret.py` gibi) çalıştır, ardından yerel
  testi (`test/calistir.js`) koştur.
- Uzak depo: `origin` = kullanıcının fork'u. Commit ve push yalnızca kullanıcı
  isteyince.
