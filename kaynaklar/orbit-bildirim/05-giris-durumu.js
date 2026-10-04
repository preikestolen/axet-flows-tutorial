// "Orbit Giris" sayfasi acilirken: oturum var mi?

const o = oturum();
const metin = o
  ? "Orbit oturumu acik: " + esc(o.ad) + " (" + esc(o.eposta) + "), giris " + yerel(o.zaman, true) + ". Saatlik okuma bu oturumla calisir."
  : "Orbit oturumu yok. Ozel Orbit kullanicisinin e-posta ve sifresiyle giris yapin. Sifre saklanmaz; uygulama yeniden baslarsa tekrar giris gerekir.";
msg.submission = { eposta: o ? o.eposta : "", sifre: "", durum: kutu(o ? "tamam" : "bilgi", metin) };
msg.onInitSubmission = msg.submission;
return msg;
