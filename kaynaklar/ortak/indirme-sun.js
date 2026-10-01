// GET /indir/:token  ->  dosyayi dogru basliklarla gonderir (http response'a).
// Baglantiyi indirme-bagi-olustur.js uretir; 10 dakika gecerlidir.

const depo = global.get("indirmeler") || {};
const token = msg.req && msg.req.params && msg.req.params.token;
const k = token && depo[token];

if (!k || k.bitis < Date.now()) {
  msg.statusCode = 404;
  msg.headers = { "Content-Type": "text/plain; charset=utf-8" };
  msg.payload = "Indirme baglantisinin suresi doldu ya da gecersiz. Sayfaya donup tekrar indirin.";
  node.status({ fill: "yellow", shape: "ring", text: "gecersiz/suresi dolmus" });
  return msg;
}

const tur = /\.xlsx$/i.test(k.ad)
  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  : "application/octet-stream";

msg.statusCode = 200;
msg.headers = {
  "Content-Type": tur,
  "Content-Disposition": "attachment; filename=\"" + String(k.ad).replace(/[^A-Za-z0-9._-]/g, "_") + "\"",
  "Cache-Control": "no-store"
};
msg.payload = Buffer.isBuffer(k.data) ? k.data : Buffer.from(k.data);
node.status({ fill: "green", shape: "dot", text: k.ad });
return msg;
