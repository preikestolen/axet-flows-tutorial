// Hava nobetcisi function'larini aXet'e benzer sandbox'ta, sahte servis
// yanitlariyla calistirir. Gecmis dosyasi bellekte taklit edilir.
//
//   node test/calistir.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const KOK = path.join(__dirname, "..");
let hatalar = 0;
const kontrol = (kosul, ne) => { console.log((kosul ? "  OK   " : "  HATA ") + ne); if (!kosul) hatalar++; };

function calistir(dosya, msg) {
  const kod = fs.readFileSync(path.join(KOK, dosya), "utf8");
  const log = { error: [], warn: [] };
  const node = {
    status: () => {}, warn: (m) => log.warn.push(m),
    error: (m, msg) => { log.error.push(m); }        // aXet'te catch'e gider
  };
  const sonuc = vm.runInContext("(function(){\n" + kod + "\n})()", vm.createContext({ msg, node, Buffer, console, Intl, Date }));
  return { sonuc, log };
}

let jsonl = "";                                       // kalici dosya taklidi
const okumalar = [];

// Zamanlayicinin bir kosusu: istek -> (sahte) yanit -> kontrol / catch -> kayit
function kosu(kaynak, yanitlar) {
  let msg = { kaynak };
  for (let i = 0; i < 5; i++) {
    msg = calistir("01-istek-hazirla.js", msg).sonuc;
    if (i === 0) kontrol(/api\.open-meteo\.com/.test(msg.url) && msg.requestTimeout === 20000, "istek: url + 20 sn zaman asimi");
    const y = yanitlar[Math.min(i, yanitlar.length - 1)];
    let hataMetni = null;
    if (y.firlat) hataMetni = y.firlat;                // http request hatasi (timeout vb.)
    else {
      msg.statusCode = y.kod; msg.payload = y.govde;
      const r = calistir("02-yanit-kontrol.js", msg);
      if (r.log.error.length) hataMetni = r.log.error[0];
      else { msg = r.sonuc; break; }
    }
    msg.error = { message: hataMetni };
    const [tekrar, vazgec] = calistir("03-hata-siniflandir.js", msg).sonuc;
    if (vazgec) { msg = vazgec; break; }
    msg = tekrar;                                      // delay -> istek hazirla
  }
  msg.payload = jsonl;                                  // file in
  const [satir, devam] = calistir("05-kaydi-isle.js", msg).sonuc;
  jsonl += satir.payload + "\n";                        // file append
  kontrol(satir.filename === "/internal-storage-files/hava/okumalar.jsonl", "kalici klasore yaziliyor");
  return calistir("06-excel-tablosu.js", devam).sonuc;
}

const iyi = (s, r) => ({ kod: 200, govde: { current: { time: "2026-10-01T16:30", temperature_2m: s, wind_speed_10m: r } } });

console.log("1) ilk okuma (gecmis yok)");
let x = kosu("zamanlayici", [iyi(18.2, 24.5)]);
kontrol(x.payload.data.Okumalar.length === 1 && x.payload.data.Okumalar[0]["Fark (C)"] === "", "1 satir, fark bos");

console.log("2) +2.0 C -> uyari YOK");
x = kosu("zamanlayici", [iyi(20.2, 20)]);
kontrol(x.payload.data.Okumalar[1]["Fark (C)"] === 2, "fark 2");
kontrol(x.payload.data.Uyarilar[0]["Okuma zamani"].startsWith("Henuz"), "uyari sayfasi bos");

console.log("3) -3.5 C -> UYARI (dusus)");
x = kosu("zamanlayici", [iyi(16.7, 30)]);
kontrol(x.payload.data.Uyarilar.length === 1 && x.payload.data.Uyarilar[0]["Yon"] === "DUSUS", "uyari: DUSUS");
kontrol(x.payload.data.Uyarilar[0]["Fark (C)"].value === -3.5, "fark -3.5");

console.log("4) tam 3.0 C -> uyari YOK (esik: 3'ten FAZLA)");
x = kosu("zamanlayici", [iyi(19.7, 30)]);
kontrol(x.payload.data.Uyarilar.length === 1, "hala 1 uyari");

console.log("5) servis 503 verip sonra duzeliyor -> yeniden deneme, okuma yazilir");
x = kosu("zamanlayici", [{ kod: 503, govde: "Service Unavailable" }, iyi(23.0, 10)]);
const son = x.payload.data.Okumalar[x.payload.data.Okumalar.length - 1];
kontrol(son["Sicaklik (C)"] === 23 && son["Fark (C)"].value === 3.3, "2. denemede okundu, +3.3 uyari");

console.log("6) servis hep zaman asimi -> 3 deneme, sonra HATA kaydi (sessiz olum yok)");
x = kosu("zamanlayici", [{ firlat: "ETIMEDOUT: request timed out" }]);
kontrol(x.payload.data.Hatalar.length === 1 && x.payload.data.Hatalar[0]["Deneme"] === 3, "hata kaydi, 3 deneme");

console.log("7) kalici hata (404) -> yeniden denenmez");
x = kosu("zamanlayici", [{ kod: 404, govde: "Not Found" }]);
kontrol(x.payload.data.Hatalar.length === 2 && x.payload.data.Hatalar[1]["Deneme"] === 1, "tek deneme");

console.log("8) bozuk JSON -> hata kaydi");
x = kosu("elle", [{ kod: 200, govde: "<html>proxy</html>" }]);
kontrol(x.payload.data.Hatalar.length === 3, "3. hata");

console.log("9) Ozet: otomatik satir sayisi");
const ozet = Object.fromEntries(x.payload.data.Ozet.map(r => [r.Bilgi.value, r.Deger]));
kontrol((ozet["Otomatik okuma sayisi"].value || ozet["Otomatik okuma sayisi"]) === 5, "5 otomatik okuma");

console.log("10) menudeki dort sayfa (Excel'in dort sayfasi)");
const sayfa = (ad, gecmis) => calistir("07-sayfa-verisi.js", { payload: gecmis, hvSayfa: ad, submission: {} }).sonuc.submission.tablo;
const oz = Object.fromEntries(sayfa("ozet", jsonl).map(r => [r.bilgi, r.deger]));
kontrol(/^5 .*TAMAM/.test(oz["Otomatik okuma sayisi"]) && oz["Servis hatasi"] === "3" && oz["Uyari"] === "2", "Ozet: 5 otomatik (TAMAM), 2 uyari, 3 hata");
const ok = sayfa("okumalar", jsonl);
kontrol(ok.length === 5 && ok[0].no === "5" && ok[4].no === "1" && ok[4].fark === "-", "Okumalar: 5 satir, en yeni ustte");
kontrol(ok.filter(r => /UYARI/.test(r.fark)).length === 2, "Okumalar: 2 satir UYARI etiketli");
const uy = sayfa("uyarilar", jsonl);
kontrol(uy.length === 2 && uy[0].yon === "YUKSELIS" && uy[0].fark === "+3.3 C" && uy[1].yon === "DUSUS", "Uyarilar: 2 satir, yon + fark");
const ha = sayfa("hatalar", jsonl);
kontrol(ha.length === 3 && ha[0].tur === "kalici" && ha[2].deneme === "3" && ha[2].tur === "gecici", "Hatalar: 3 satir, deneme + tur");
kontrol(sayfa("okumalar", "")[0].zaman === "Henuz okuma yok" && sayfa("uyarilar", "")[0].zaman.startsWith("Henuz uyari yok") && sayfa("hatalar", "")[0].zaman === "Hata yok", "bos gecmiste aciklama satiri");

console.log("11) gecmis dosyasi yok (ilk calisma)");
const g = calistir("04-gecmis-yok.js", { error: { message: "ENOENT: no such file or directory" } });
kontrol(g.sonuc.payload === "" && g.log.warn.length === 0, "bos gecmis, uyari yok");

console.log("12) sayfa hatalari");
const s1 = calistir("09-sayfa-hatasi.js", { error: { message: "ENOENT" } }).sonuc;
kontrol(s1[0] === null && /henuz olusmadi/.test(s1[1].messages.mesaj), "Excel yok mesaji");
const s2 = calistir("09-sayfa-hatasi.js", { hvSayfa: "okumalar", error: { message: "ENOENT" } }).sonuc;
kontrol(s2[1] === null && /Henuz okuma yok/.test(s2[0].submission.tablo[0].zaman), "sayfa: henuz okuma yok");

console.log("\n" + (hatalar ? hatalar + " HATA" : "HEPSI GECTI"));
process.exitCode = hatalar ? 1 : 0;
