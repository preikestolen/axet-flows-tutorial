// Mail dosyasi yazilamadi (catch). Listeyi bozmaz; sayfadaki ozet kutusunda gorunur.

const m = msg.obMail || {};
const hata = (msg.error && msg.error.message) || "bilinmeyen hata";
flow.set("orbitSonMail", { durum: "hata", zaman: new Date().toISOString(), alici: m.alici, adet: m.adet, kimlik: m.kimlik, hata: hata });
node.status({ fill: "red", shape: "ring", text: "mail hatasi: " + hata.slice(0, 40) });
return null;
