// "Excel'i indir" dugmesi: kalici klasordeki Excel'i (file in, Buffer)
// indirme baglantisina cevirir (ortak/indirme-bagi-olustur.js). Dosya yoksa catch -> 09-sayfa-hatasi.js.

msg.indirilecek = { data: msg.payload, ad: "hava-nobetcisi.xlsx" };   // -> ortak/indirme-bagi-olustur.js
msg.messages = { mesaj: "Excel hazir." };
node.status({ fill: "green", shape: "dot", text: Math.round(msg.payload.length / 1024) + " KB" });
return msg;
