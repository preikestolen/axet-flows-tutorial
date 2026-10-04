// "Listele" dugmesi (form) ya da saatlik zamanlayici (msg.payload = secim.json).
// Cikis 1 -> GET projects/<id>/ (ad + kimlik)
// Cikis 2 -> eksik: uyari (sadece formdan)

const formdan = formdanMi(msg);
let id = "";
if (formdan) {
  const veri = (msg.payload && msg.payload.data) || (msg.submission && msg.submission.data) || msg.submission || {};
  id = String(veri.proje || "");
} else {
  try { id = (JSON.parse(msg.payload || "{}").id) || ""; } catch (e) { id = ""; }
}

function uyar(metin) {
  if (!formdan) { node.status({ fill: "yellow", shape: "ring", text: metin.slice(0, 40) }); return [null, null]; }
  msg.messages = { mesaj: metin };
  msg.submission = { proje: id, durum: kutu("uyari", esc(metin)) };
  secenekleriEkle(msg);
  return [null, msg];
}
if (!oturum()) return uyar("Orbit oturumu yok. Once 'Orbit Giris' sayfasindan giris yapin.");
if (!/^[0-9a-f-]{36}$/.test(id)) return uyar("Listeden bir proje secin.");

msg.obKaynak = formdan ? "elle" : "zamanlayici";
msg.obProje = { id: id };
getIstegi(msg, API + "projects/" + id + "/");
node.status({ fill: "blue", shape: "dot", text: "okunuyor (" + msg.obKaynak + ")" });
return [msg, null];
