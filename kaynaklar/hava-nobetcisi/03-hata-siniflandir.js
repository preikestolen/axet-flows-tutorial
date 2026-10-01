// catch -> burasi. Servis cevap vermedi ya da bozuk cevap verdi.
//
// Cikis 1: yeniden dene (delay -> istek hazirla)
// Cikis 2: vazgec -> hatayi da kayda yaz (Excel'in "Hatalar" sayfasi)
//
// Sayac msg uzerinde (Ders 7.6): ayni anda gelen iki tetikleme birbirinin
// hakkini yemesin.

const ENUST_DENEME = 3;
const metin = (msg.error && msg.error.message) || String(msg.error || "bilinmeyen hata");
const gecici = /timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|HTTP 5\d\d|HTTP 429/i.test(metin);

msg.deneme = (msg.deneme || 0) + 1;

if (gecici && msg.deneme < ENUST_DENEME) {
  node.status({ fill: "yellow", shape: "ring", text: "deneme " + msg.deneme + "/" + ENUST_DENEME + ": " + metin.slice(0, 30) });
  node.warn("Hava servisi hatasi, yeniden denenecek (" + msg.deneme + "/" + ENUST_DENEME + "): " + metin);
  delete msg.error;
  return [msg, null];
}

msg.yeniKayit = {
  tip: "hata",
  zaman: new Date().toISOString(),
  mesaj: metin.slice(0, 300),
  gecici: gecici,
  deneme: msg.deneme,
  kaynak: msg.kaynak || "?"
};
delete msg.error;

node.status({ fill: "red", shape: "dot", text: "vazgecildi: " + metin.slice(0, 40) });
return [null, msg];
