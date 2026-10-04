// Sayfa acilisi: kayitli projenin son anlik goruntusunu tabloya basar
// (Orbit'e gitmeden -- hizli). Yenilemek: 'Listele'.

let anlik = null;
try { anlik = msg.payload ? JSON.parse(msg.payload) : null; } catch (e) { anlik = null; }
msg.payload = null;
const metin = (msg.obMesaj ? esc(msg.obMesaj) + "<br>" : "") + ozetMetni(anlik);
msg.submission = { proje: msg.obSecim.id, tablo: tabloYap(anlik), durum: kutu("bilgi", metin) };
msg.onInitSubmission = msg.submission;
node.status({ fill: "blue", shape: "dot", text: msg.submission.tablo.length + " madde (onbellek)" });
return msg;
