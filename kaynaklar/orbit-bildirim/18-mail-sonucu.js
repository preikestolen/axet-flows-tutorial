// Mail dosyasi orbit/giden/'e yazildi -> imza (saatlik okumada ayni listeyi tekrar
// gondermemek icin) + son mail bilgisi. Asil gonderim Windows'ta outlook-gonderici.ps1.

const m = msg.obMail || {};
const imzalar = flow.get("orbitMailImza") || {};
imzalar[m.proje] = m.imza;
flow.set("orbitMailImza", imzalar);
flow.set("orbitSonMail", { durum: "siraya", zaman: new Date().toISOString(), alici: m.alici, adet: m.adet, kimlik: m.kimlik });
node.status({ fill: "green", shape: "dot", text: "mail sirada: " + m.kimlik + " " + m.adet + " bekleyen -> " + m.alici });
return null;
