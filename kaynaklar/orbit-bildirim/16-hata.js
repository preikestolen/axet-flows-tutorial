// Orbit akisindaki her hata (catch). Oturum bittiyse bellekten silinir.
// Formdan gelindiyse sayfada kalici kutuda gosterilir; zamanlayicidaysa sadece durum rozeti.
// Sifre / cerez / istek govdesi msg'den temizlenir.

const ham = (msg.error && msg.error.message) || "bilinmeyen hata";
if (/^OTURUM/.test(ham)) flow.set("orbitOturum", null);
const metin = ham.replace(/^OTURUM: /, "");

delete msg.orbitGiris; delete msg.yeniCerez; delete msg.csrfCerez;
delete msg.obToplanan; delete msg.obOnceki; delete msg.obDurumlar;
msg.payload = null;
node.status({ fill: "red", shape: "ring", text: metin.slice(0, 50) });

if (!formdanMi(msg)) return null;
msg.messages = { mesaj: metin };
msg.submission = { sifre: "", durum: kutu("hata", esc(metin)) };
if (msg.orbitEposta) msg.submission.eposta = msg.orbitEposta;
if (msg.obProje) { msg.submission.proje = msg.obProje.id; secenekleriEkle(msg); }
delete msg.error;
return msg;
