// Konsey dagilirsa (ajan hatasi, bos cevap, dosya hatasi) Submit donup
// kalmasin: kullaniciya ne oldugunu soyle.

const m = msg.hata ||
  (msg.error && (msg.error.message || msg.error.code)) ||
  (msg.payload && msg.payload.error) || "bilinmeyen sebep";
const metin = "Konsey dagildi: " + String(m).slice(0, 250) + " -- Birazdan tekrar dene.";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
msg.messages = { mesaj: metin };
msg.submission = { proje: (msg.konsey && msg.konsey.proje) || msg.proje || "", sahne: '<div class="konsey-hata">\u{1F4A5} ' + esc(metin) + '</div>' };
delete msg.error;
return msg;
