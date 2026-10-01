// Formdan gelen Excel ekini Buffer'a cevirir.
//
// Formio "base64" depolama modunda dosya su bicimde gelir:
//   msg.payload.data.musteriExcel = [{ name, originalName, size, url: "data:...;base64,UEsDB..." }]
//
// Ders 9'daki kopruden TEK farki: .toString("utf8") YOK.
// xlsx ikili bir dosyadir (zip); metne cevirirsek bozulur.

const veri = (msg.payload && msg.payload.data) || {};
let dosyalar = veri.musteriExcel;
if (dosyalar && !Array.isArray(dosyalar)) dosyalar = [dosyalar];

if (!Array.isArray(dosyalar) || dosyalar.length === 0) {
  node.status({ fill: "red", shape: "ring", text: "dosya yok" });
  node.error("Form dosya eklenmeden gonderildi", msg);
  return null;
}

const d = dosyalar[0];
const url = d.url || "";
const virgul = url.indexOf(",");

if (virgul < 0 || url.indexOf("base64") < 0) {
  node.error("Dosya base64 degil, File bileseninin Storage ayarini kontrol edin: " + (d.name || "?"), msg);
  return null;
}

msg.dosyaAdi = d.originalName || d.name || "musteri.xlsx";
msg.kosuZamani = new Date().toISOString();
msg.payload = Buffer.from(url.slice(virgul + 1), "base64");

// xlsx bir zip'tir; zip dosyalari "PK" ile baslar
if (msg.payload.length < 4 || msg.payload[0] !== 0x50 || msg.payload[1] !== 0x4b) {
  node.error("Yuklenen dosya .xlsx degil (eski .xls veya .csv olabilir): " + msg.dosyaAdi, msg);
  return null;
}

node.status({ fill: "blue", shape: "dot", text: msg.dosyaAdi + " / " + Math.round(msg.payload.length / 1024) + " KB" });
return msg;
