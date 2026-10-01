// Indirilecek dosya icin 10 dakika gecerli, tahmin edilemez bir baglanti uretir.
//
// Neden: aXet'in view action indirmesi tarayicida tipsiz bir Blob'u, sayfaya
// eklenmemis bir <a> ile tikliyor; Edge dosyayi ".tmp" olarak kaydedebiliyor.
// Bu yuzden dosyayi kendi HTTP ucumuzdan (indirme-sun.js) dogru basliklarla
// veriyoruz. Baglanti, Okta korumali bir form islemi sonunda uretildigi icin
// sadece giris yapmis kullanici gorur.
//
// Girdi : msg.indirilecek = { data: Buffer, ad: "dosya.xlsx" }
// Cikti : msg.messages.token / msg.messages.dosya  (view action mesajinda <%= %>)

const SURE_DK = 10;
const k = msg.indirilecek;
if (!k || !k.data) { node.error("indirilecek dosya yok", msg); return null; }

const depo = global.get("indirmeler") || {};
const simdi = Date.now();
for (const t of Object.keys(depo)) if (depo[t].bitis < simdi) delete depo[t];   // suresi dolanlari temizle

let token = "";
while (token.length < 32) token += Math.random().toString(36).slice(2);
token = token.slice(0, 32);

depo[token] = { data: k.data, ad: k.ad, bitis: simdi + SURE_DK * 60000 };
global.set("indirmeler", depo);

msg.messages = Object.assign({}, msg.messages, { token: token, dosya: k.ad, sure: String(SURE_DK) });
delete msg.indirilecek;
delete msg.downloadFileSubmission;     // aXet'in kendi (hatali) indirmesi devre disi

node.status({ fill: "green", shape: "dot", text: k.ad + " (" + Object.keys(depo).length + " bagli)" });
return msg;
