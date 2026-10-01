// HTTP yanitini dogrular ve tek bir "okuma" kaydina cevirir.
//
// http request dugumu 4xx/5xx'te hata FIRLATMAZ, sadece statusCode koyar.
// Bu yuzden kontrolu biz yapiyoruz ve sorun varsa node.error(..., msg) ile
// catch'e gonderiyoruz -- akis sessizce olmesin (Ders 7).

const p = msg.payload;
const kod = msg.statusCode;

if (kod !== 200) {
  node.error("Hava servisi HTTP " + kod + " dondu", msg);
  return null;
}
if (!p || typeof p !== "object" || !p.current) {
  node.error("Hava servisi beklenmeyen yanit verdi (JSON degil ya da 'current' yok)", msg);
  return null;
}

const sicaklik = Number(p.current.temperature_2m);
const ruzgar = Number(p.current.wind_speed_10m);
if (!isFinite(sicaklik) || !isFinite(ruzgar)) {
  node.error("Hava servisi yanitinda sicaklik/ruzgar sayi degil", msg);
  return null;
}

msg.yeniKayit = {
  tip: "okuma",
  zaman: new Date().toISOString(),          // okumayi yaptigimiz an (UTC)
  olcumZamani: p.current.time,              // servisin olcum zamani (Istanbul saati)
  sicaklik: sicaklik,
  ruzgar: ruzgar,
  kaynak: msg.kaynak,
  deneme: (msg.deneme || 0) + 1
};

node.status({ fill: "green", shape: "dot", text: sicaklik + " C / " + ruzgar + " km/s" });
return msg;
