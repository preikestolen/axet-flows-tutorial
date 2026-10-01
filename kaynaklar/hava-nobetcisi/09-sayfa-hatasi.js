// Sayfalardaki dosya okumalari hata verirse: en olasi sebep dosyanin henuz
// olusmamis olmasi. Formu bekletme, acikla.
// Cikis 1 -> sayfa acilisi view action'i, Cikis 2 -> "Excel'i indir" view action'i

const metin = (msg.error && msg.error.message) || "";
const yok = /ENOENT|no such file/i.test(metin);
delete msg.error;
delete msg.downloadFileSubmission;

if (msg.hvSayfa) {                                       // sayfa acilisi
  const aciklama = yok ? "Henuz okuma yok -- zamanlayici saatte bir calisir" : "Gecmis okunamadi: " + metin;
  const ilkKolon = { ozet: "bilgi", okumalar: "zaman", uyarilar: "zaman", hatalar: "zaman" }[msg.hvSayfa] || "zaman";
  const satir = {}; satir[ilkKolon] = aciklama;
  msg.submission = { tablo: [satir] };
  return [msg, null];
}
msg.messages = { mesaj: yok ? "Excel henuz olusmadi; ilk okumadan sonra indirilebilir." : "Excel okunamadi: " + metin };
return [null, msg];
