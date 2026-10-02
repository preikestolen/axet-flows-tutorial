// function dugumlerini Node-RED'e benzer bir sandbox'ta (require/process YOK)
// sirayla calistirir ve bulunan hatalari beklenen.json ile karsilastirir.
// Sonra formdan gelmis gibi rapor kaydetme / listeleme / indirme yolunu dener.
//
//   node calistir.js [dosya.xlsx]

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const KOK = path.join(__dirname, "..");
const xlsx = process.argv[2] || path.join(__dirname, "ornek-musteri.xlsx");

const flowCtx = {};                                     // flow context taklidi
const flow = { get: (k) => flowCtx[k], set: (k, v) => { flowCtx[k] = v; } };
const globalCtx = {};
const global_ = { get: (k) => globalCtx[k], set: (k, v) => { globalCtx[k] = v; } };

function calistir(dosya, msg) {
  const kod = fs.readFileSync(path.join(KOK, dosya), "utf8");   // dosya "../ortak/..." da olabilir
  const node = {
    status: () => {}, warn: (m) => console.log("  [warn]", m),
    error: (m) => { throw new Error("node.error: " + m); }
  };
  const ctx = vm.createContext({ msg, node, flow, global: global_, Buffer, console, env: { get: () => "" } });
  return vm.runInContext("(function(){\n" + kod + "\n})()", ctx);
}
const kontrol = (kosul, ne) => { if (!kosul) { console.log("HATA:", ne); process.exitCode = 1; } };

// Form dugumunun koydugu alanlar (view action bunlarla calisir)
const FORM = { __deptAppsFormioButtonClicked: "submit", __deptAppsFormioButtons: [], submission: {} };  // form dugumunun gercek alan adlari

let msg = Object.assign({ payload: { data: { musteriExcel: [{
  name: path.basename(xlsx), originalName: path.basename(xlsx), storage: "base64",
  url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
       fs.readFileSync(xlsx).toString("base64")
}] } } }, FORM);

msg = calistir("01-ekten-buffer.js", msg);
const t0 = Date.now();
msg = calistir("02-xlsx-oku.js", msg);
console.log("xlsx okundu:", msg.payload, (Date.now() - t0) + " ms");
msg = calistir("03-kurallar.js", msg);
console.log("istatistik:", JSON.stringify(msg.istatistik.kuralBazinda));

const [aiMsg, atla] = calistir("04-ai-istegi.js", msg);
msg = aiMsg || atla;
msg.payload = { response: "## Genel durum\n(test) sahte AI yaniti" };
msg = calistir("05-ai-yaniti.js", msg);
msg = calistir("06-rapor-tablosu.js", msg);
console.log("sayfalar:", Object.entries(msg.payload.data).map(([k, v]) => k + "=" + v.length).join(", "));

// json-to-excel taklidi: aXet dugumu Buffer uretir; akista "raporu sakla" + raporlar.jsonl oku (file in)
let diskListe = "";                                     // /internal-storage-files/musteri-kontrol/raporlar.jsonl taklidi
const diskDosya = {};                                   // raporlar/<ad>.xlsx taklidi
function kaydet(m) {
  const r = calistir("07-rapora-kaydet.js", Object.assign({}, m, { raporBuffer: Buffer.from("sahte-xlsx"), payload: diskListe }));
  if (r[2]) diskDosya[r[2].filename] = r[2].payload;    // xlsx yaz
  if (r[3]) diskListe = r[3].payload;                   // liste yeniden yaz
  for (const s of (r[4] || [])) delete diskDosya[s.filename];   // eskileri sil
  return r;
}
const [formaYanit, kayit, xlsxMsg, listeMsg] = kaydet(msg);
kontrol(/^\/internal-storage-files\/musteri-kontrol\/raporlar\/.*-RAPOR\.xlsx$/.test(xlsxMsg.filename) && Buffer.isBuffer(xlsxMsg.payload), "rapor kalici klasore: musteri-kontrol/raporlar/<ad>.xlsx");
kontrol(listeMsg.filename === "/internal-storage-files/musteri-kontrol/raporlar.jsonl" && listeMsg.payload.split("\n").filter(Boolean).length === 1, "liste: musteri-kontrol/raporlar.jsonl (1 kayit)");
kontrol(formaYanit && formaYanit.indirilecek && Buffer.isBuffer(formaYanit.indirilecek.data), "indirilecek rapor hazir");
const bagli = calistir("../ortak/indirme-bagi-olustur.js", formaYanit);
const kutu = bagli.submission && bagli.submission.indirme || "";
kontrol(!bagli.downloadFileSubmission && /Kontrol tamamlandi: 40 satirin 19/.test(kutu), "aXet indirmesi kapali; sayfadaki kutuda ozet");
const dosyaAlani = (bagli.submission.indirmeDosyasi || [])[0] || {};
kontrol(!/href=/.test(kutu), "metin kutusunda baglanti yok (DOMPurify data: href'i siliyor)");
kontrol(dosyaAlani.storage === "base64" && /spreadsheetml/.test(dosyaAlani.type) && /-RAPOR\.xlsx$/.test(dosyaAlani.originalName), "salt okunur File bileseni: base64, xlsx turu, dosya adi");
kontrol(Buffer.from(dosyaAlani.url.split(",")[1], "base64").toString() === "sahte-xlsx", "base64 icerik dosyanin aynisi");
kontrol(formaYanit.messages && formaYanit.messages.hatali === String(msg.istatistik.hataliSatir), "mesaj sayilari");
kontrol(formaYanit.__deptAppsFormioButtonClicked === "submit", "form alanlari korunuyor");
console.log("rapor kaydi:", kayit.payload);

// formsuz (tasarimci testi) kosu view action'a gitmez ama rapor yine diske yazilir
const formsuz = Object.assign({}, msg); delete formsuz.__deptAppsFormioButtonClicked;
const rf = kaydet(formsuz);
kontrol(rf[0] === null && rf[2] && Object.keys(diskDosya).length === 2, "formsuz kosu: view action yok, rapor diskte");

// 20 rapor siniri: 25 kosu sonra listede 20, diskte 20 dosya
for (let i = 0; i < 23; i++) kaydet(formsuz);
kontrol(diskListe.split("\n").filter(Boolean).length === 20 && Object.keys(diskDosya).length === 20, "son 20 rapor kalir, eskilerin dosyasi silinir");

const liste = calistir("08-rapor-listesi.js", Object.assign({ payload: diskListe }, FORM));
const secenekler = liste.onInitPopulateFormStructure.rapor;
kontrol(secenekler.length === 20, "Raporlar sayfasi: kalici listeden 20 secenek");

const [indir, indirYok] = calistir("09-rapor-indir.js", Object.assign({ secilenRapor: secenekler[0].value, payload: diskListe }, FORM));
kontrol(indirYok === null && /\/raporlar\/.*-RAPOR\.xlsx$/.test(indir.filename) && diskDosya[indir.filename], "Indir: secilen raporun dosya yolu (diskte var)");
const dosyadan = calistir("11-rapor-dosyasi.js", Object.assign(indir, { payload: diskDosya[indir.filename] }));
kontrol(dosyadan.indirilecek && dosyadan.indirilecek.ad.endsWith("-RAPOR.xlsx") && /satir hatali/.test(dosyadan.messages.mesaj), "diskten okunan rapor indirme kutusuna gider");
const [yokVar, yok] = calistir("09-rapor-indir.js", Object.assign({ secilenRapor: "yok", payload: diskListe }, FORM));
kontrol(yokVar === null && /bulunamadi/.test(yok.messages.mesaj), "olmayan rapor: uyari mesaji");


const beklenenYol = path.join(__dirname, "beklenen.json");
if (!process.argv[2] && fs.existsSync(beklenenYol)) {
  const anahtar = (h) => h.satir + "|" + h.kolon + "|" + h.kural;
  const bulunan = new Set(msg.hatalar.map(anahtar));
  const beklenen = new Set(JSON.parse(fs.readFileSync(beklenenYol, "utf8")).map(anahtar));
  const eksik = [...beklenen].filter(x => !bulunan.has(x));
  const fazla = [...bulunan].filter(x => !beklenen.has(x));
  console.log("\nbeklenen", beklenen.size, "| bulunan", bulunan.size);
  console.log("KACIRILAN :", eksik.length ? eksik : "yok");
  console.log("YANLIS ALARM:", fazla.length ? fazla : "yok");
  if (eksik.length || fazla.length) process.exitCode = 1;
}
