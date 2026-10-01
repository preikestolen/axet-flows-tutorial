// Kod Adi Konseyi function'larini sahte ajan cevaplariyla, aXet'e benzer
// sandbox'ta uctan uca calistirir.
//
//   node test/calistir.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const KOK = path.join(__dirname, "..");
let hata = 0;
const kontrol = (k, ne) => { console.log((k ? "  OK   " : "  HATA ") + ne); if (!k) hata++; };

function calistir(dosya, msg) {
  const log = { warn: [], error: [] };
  const node = { status: () => {}, warn: (m) => log.warn.push(m), error: (m) => log.error.push(m) };
  const sonuc = vm.runInContext("(function(){\n" + fs.readFileSync(path.join(KOK, dosya), "utf8") + "\n})()",
    vm.createContext({ msg, node, Buffer, console, Intl, Date, Math }));
  return { sonuc, log };
}
const cikis = (dizi) => dizi.findIndex(x => x);          // hangi cikistan cikti

let pano = "";                                           // pano.jsonl taklidi
const SIRA = ["muhendis", "pazarlamaci", "sair", "baskan"];

function konsey(proje, cevaplar, baskan) {
  const [devam, uyari] = calistir("01-proje-al.js", { payload: { data: { proje } } }).sonuc;
  if (!devam) return { uyari };
  let msg = Object.assign(devam, { payload: pano });     // file in
  msg = calistir("02-konsey-hazirla.js", msg).sonuc;
  const promptlar = [];
  for (let i = 0; i < 5; i++) {
    const r = calistir("03-sonraki-konusmaci.js", msg).sonuc;
    const c = cikis(r);
    msg = r[c];
    if (c === 4) return { hata: msg };
    promptlar.push({ kim: SIRA[c], prompt: msg.payload });
    msg.payload = c < 3 ? cevaplar[c] : baskan;          // ajan cevabi (Output Schema)
    if (c === 3) break;
  }
  const k = calistir("04-karar-isle.js", msg);
  const [satir, sahne] = k.sonuc;
  pano += satir.payload + "\n";                          // file append
  return { promptlar, satir, sahne, log: k.log, konsey: msg.konsey };
}

const UC = [
  { kodAdi: "Stok-404", gerekce: "Stok bulunamadi. Klasik. En azindan hata kodu durust." },
  { kodAdi: "STOKZILLA", gerekce: "Bu bir otomasyon DEGIL, bu bir DEVRIM!!! Depolar titreyecek!" },
  { kodAdi: "Son Koli", gerekce: "Ah... rafta kalan son koli gibi beklersin sabahi, gonul tedirgin." }
];

console.log("1) gecersiz girdi AI'a gitmez");
const kisa = konsey("kisa", UC, {}).uyari;
kontrol(kisa.messages.mesaj.includes("en az") && kisa.submission.sahne.includes("konsey-uyari"), "15 karakterden kisa -> uyari (sayfada da)");
kontrol(konsey("x".repeat(401), UC, {}).uyari.messages.mesaj.includes("400"), "400'den uzun -> uyari");

console.log("2) tam konsey: sira, baglam, karar");
const PROJE = "Depodaki kritik stoklari her sabah kontrol eden bir otomasyon. Satin almaya e-posta atar.";
let s = konsey(PROJE, UC, {
  degerlendirmeler: { muhendis: "404'un kadar kuru bir espri.", pazarlamaci: "Godzilla depoya sigmaz.", sair: "Son Koli'n kalbime dokundu." },
  kazananKarakter: "sair", kazanan: "Son Koli", puan: 87, karar: "Hem akilda kalici hem projeye uygun."
});
kontrol(s.promptlar.map(p => p.kim).join(",") === "muhendis,pazarlamaci,sair,baskan", "sira: muhendis -> pazarlamaci -> sair -> baskan");
kontrol(s.promptlar[0].prompt.includes("Ilk sen konusuyorsun") && s.promptlar[2].prompt.includes("Stok-404") && s.promptlar[2].prompt.includes("STOKZILLA"), "sonraki konusmaci oncekileri goruyor");
kontrol(/\[muhendis\].*\[pazarlamaci\].*\[sair\]/s.test(s.promptlar[3].prompt), "baskan uc oneriyi de goruyor");
const kayit = JSON.parse(s.satir.payload);
kontrol(kayit.kodAdi === "Son Koli" && kayit.puan === 87 && kayit.karakter === "sair", "panoya: Son Koli, 87, sair");
const h = s.sahne.submission.sahne;
kontrol((h.match(/konsey-kart /g) || []).length === 3 && h.includes("konsey-kazanan") && h.includes("87/100"), "sahne: 3 kart, kazanan isaretli, puan");
kontrol(h.includes("404&#39;un kadar") && h.includes("Godzilla") && h.includes("kalbime"), "baskan notlari her kartta");
kontrol(h.includes("1. sira"), "panodaki sira yaziliyor");
kontrol(s.sahne.submission.proje === PROJE && /Son Koli.*87\/100.*1\. sira/.test(s.sahne.messages.ozet), "sahne sayfadaki kutuya (submission.sahne), uyariya kisa ozet");

console.log("3) her oturum farkli ilham, panodaki isim yasakli");
const ilhamlar = new Set();
for (let i = 0; i < 12; i++) {
  const m = calistir("02-konsey-hazirla.js", { proje: PROJE, payload: pano }).sonuc;
  ilhamlar.add(JSON.stringify(m.konsey.ilham));
}
kontrol(ilhamlar.size > 6, "12 oturumda " + ilhamlar.size + " farkli ilham kombinasyonu");
s = konsey(PROJE, UC, { degerlendirmeler: {}, kazananKarakter: "muhendis", kazanan: "Stok-404", puan: 40, karar: "Kuru ama durust." });
kontrol(s.promptlar[0].prompt.includes("KULLANMA: Son Koli"), "panodaki isim yeni oturumda yasakli");
kontrol(s.sahne.submission.sahne.includes("Baskan bu uyeye bir sey demedi"), "eksik degerlendirme bozmuyor");

console.log("4) model bicimi bozarsa");
s = konsey(PROJE, UC, { degerlendirmeler: {}, kazananKarakter: "uzayli", kazanan: "STOKZILLA", puan: 250, karar: "" });
let k2 = JSON.parse(s.satir.payload);
kontrol(k2.kodAdi === "STOKZILLA" && k2.karakter === "pazarlamaci" && k2.puan === 100, "gecersiz karakter -> isimden bulundu, puan 100'e sikisti");
s = konsey(PROJE, UC, { kazanan: "<script>alert(1)</script>", puan: "yuksek" });
k2 = JSON.parse(s.satir.payload);
kontrol(k2.kodAdi === "Stok-404" && k2.puan === 50 && s.log.warn.length === 1, "hic eslesme yok -> ilk oneri, puan 50, uyari");
kontrol(!s.sahne.submission.sahne.includes("<script>"), "HTML escape: script enjekte edilemiyor");
const bos = konsey(PROJE, [{ kodAdi: "", gerekce: "" }], {});
kontrol(bos.hata && /anlasilmaz/.test(bos.hata.hata), "bos ajan cevabi -> 'konsey dagildi' yoluna");

console.log("5) Isim Panosu siralamasi");
const t = calistir("05-pano.js", { payload: pano }).sonuc.submission.tablo;
kontrol(t.map(r => r.puan).join(",") === "100,87,50,40", "puana gore azalan: " + t.map(r => r.kodAdi + ":" + r.puan).join(" "));
kontrol(t[0].sira.startsWith("\u{1F947}") && t[1].sira.startsWith("\u{1F948}") && t[3].sira === "4", "madalyalar ilk ucte");
pano += JSON.stringify({ zaman: "2099-01-01T00:00:00Z", kodAdi: "Gec Gelen", puan: 87, karakter: "muhendis", proje: "x" }) + "\n";
const t2 = calistir("05-pano.js", { payload: pano }).sonuc.submission.tablo;
kontrol(t2[1].kodAdi === "Son Koli" && t2[2].kodAdi === "Gec Gelen", "esit puanda once kazanan ustte");
kontrol(calistir("05-pano.js", { payload: "" }).sonuc.submission.tablo[0].kodAdi.startsWith("Pano bos"), "bos pano mesaji");

console.log("6) ajan hatasi: yeniden deneme");
let m6 = calistir("02-konsey-hazirla.js", { proje: PROJE, payload: "" }).sonuc;
let r6 = calistir("03-sonraki-konusmaci.js", m6).sonuc;          // muhendis'e gider
m6 = r6[0]; const ilkPrompt = m6.payload;
m6.error = { message: "Mastra API error 500: Bad Gateway" }; m6.payload = { error: "x" };
let y6 = calistir("07-ajan-yeniden.js", m6).sonuc;
kontrol(y6[0] && y6[0].payload === ilkPrompt && !y6[0].error, "1. hata: ayni prompt ayni ajana (muhendis)");
y6 = calistir("07-ajan-yeniden.js", Object.assign(y6[0], { error: { message: "yine" } })).sonuc;
kontrol(y6[0], "2. hata: bir kez daha");
y6 = calistir("07-ajan-yeniden.js", Object.assign(y6[0], { error: { message: "ve yine" } })).sonuc;
kontrol(y6[4] && /3 deneme/.test(y6[4].hata), "3. hata: vazgec -> hata yolu");

console.log("7) hata yaniti");
const h7 = calistir("06-hata-yaniti.js", { error: { message: "Budget <b>exhausted</b>" }, konsey: { proje: PROJE } }).sonuc;
kontrol(/Konsey dagildi: Budget/.test(h7.messages.mesaj) && h7.submission.sahne.includes("konsey-hata") && h7.submission.sahne.includes("&lt;b&gt;") && h7.submission.proje === PROJE, "hata sayfada, escape'li, proje korunur");

console.log("\n" + (hata ? hata + " HATA" : "HEPSI GECTI"));
process.exitCode = hata ? 1 : 0;
