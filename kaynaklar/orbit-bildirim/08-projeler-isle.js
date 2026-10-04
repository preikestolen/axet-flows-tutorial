// Proje secim kutusunu doldurur, kayitli secimi isaretler.
// Cikis 1 -> secili projenin anlik goruntusunu oku (file in, msg.filename)
// Cikis 2 -> secim yok: bos tablo (view action)

const s = msg.obSecim;
let secenekler = [];
if (msg.statusCode !== undefined) {                       // http'den geldik (oturum var)
  yanitKontrol(msg, "projeler");
  const liste = Array.isArray(msg.payload) ? msg.payload : (msg.payload.results || []);
  secenekler = liste
    .filter(p => !p.archived_at && (p.member_role === undefined || p.member_role !== null))
    .map(p => ({ label: p.identifier + " - " + p.name, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label));
  flow.set("orbitProjeler", secenekler);                  // Listele / hata yanitlari da kullanir (secenekleriEkle)
} else if (s) {
  secenekler = [{ label: s.kimlik + " - " + s.ad, value: s.id }];   // oturum yok: en azindan kayitli secim
}
msg.payload = null;
msg.onInitPopulateFormStructure = { proje: secenekler };
msg.obMesaj = oturum() ? "" : "Orbit oturumu yok: liste son okumadan gosteriliyor. Yenilemek icin once 'Orbit Giris'.";

if (s && secenekler.some(x => x.value === s.id)) {
  msg.filename = anlikYolu(s.id);
  return [msg, null];
}
const metin = (msg.obMesaj ? msg.obMesaj + " " : "") + "Bir proje secip 'Listele'ye basin. Secim saklanir.";
msg.submission = { proje: "", tablo: [], durum: kutu("bilgi", esc(metin)) };
msg.onInitSubmission = msg.submission;
node.status({ fill: "blue", shape: "dot", text: secenekler.length + " proje" });
return [null, msg];
