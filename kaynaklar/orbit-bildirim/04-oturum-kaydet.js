// /api/users/me/ 200 dondu -> oturumu bellege (flow context) koy.
// Bellek: Run Flow / yeniden baslatmada silinir -> yeniden giris gerekir.
// Bu bilerek: sifre ve cerez diske YAZILMAZ.

if (msg.statusCode !== 200 || !msg.payload || !msg.payload.id) {
  throw new Error("Orbit girisi dogrulanamadi (users/me): HTTP " + msg.statusCode);
}
const ad = msg.payload.display_name || msg.payload.first_name || msg.orbitEposta;
flow.set("orbitOturum", { cerez: msg.yeniCerez, eposta: msg.orbitEposta, ad: ad, zaman: new Date().toISOString() });
delete msg.yeniCerez;
msg.payload = null;

const metin = "Orbit'e giris yapildi: " + ad + ". Simdi 'TS Onayi Listesi' sayfasindan proje secin.";
msg.messages = { mesaj: metin };
msg.submission = { eposta: msg.orbitEposta, sifre: "", durum: kutu("tamam", esc(metin)) };
node.status({ fill: "green", shape: "dot", text: "oturum: " + ad });
return msg;
