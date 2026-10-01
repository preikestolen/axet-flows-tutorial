// Indirilecek dosyayi, view action mesajinda gosterilecek bir data: baglantisina
// cevirir:  <a href="data:<tur>;base64,<veri>" download="<dosya>">
//
// Neden:
//  1. aXet'in view action indirmesi (downloadFileSubmission) tarayicida tipsiz
//     bir Blob'u, sayfaya eklenmemis bir <a> ile tikliyor; Edge dosyayi ".tmp"
//     olarak kaydediyor.
//  2. Kendi "http in" ucumuz da olmuyor: aXet http in'leri uygulama oturumuyla
//     dogruluyor ve Okta yolunda kendi kodu cokuyor
//     ("auth-manager-rest.js ... ReferenceError: logger is not defined"), istek askida kaliyor.
// data: baglantisi sayfanin ICINDE, turu ve adi belli; dosya Okta korumali form
// yanitiyla geldigi icin baska bir erisim yolu da acilmiyor.
//
// Girdi : msg.indirilecek = { data: Buffer, ad: "dosya.xlsx" }
// Cikti : msg.messages.{veri, tur, dosya}  (view action mesajinda <%= %>)

const k = msg.indirilecek;
if (!k || !k.data) { node.error("indirilecek dosya yok", msg); return null; }

const buf = Buffer.isBuffer(k.data) ? k.data : Buffer.from(k.data);
const tur = /\.xlsx$/i.test(k.ad)
  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  : "application/octet-stream";

msg.messages = Object.assign({}, msg.messages, {
  veri: buf.toString("base64"),
  tur: tur,
  dosya: String(k.ad).replace(/[^A-Za-z0-9._-]/g, "_")
});
delete msg.indirilecek;
delete msg.downloadFileSubmission;     // aXet'in kendi (hatali) indirmesi devre disi

node.status({ fill: "green", shape: "dot", text: k.ad + " (" + Math.round(buf.length / 1024) + " KB)" });
return msg;
