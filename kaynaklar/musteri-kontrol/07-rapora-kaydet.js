// json-to-excel'den gelen raporu KALICI klasore yazar ve rapor listesini
// (raporlar.jsonl) gunceller; sonra forma yanit + indirme baglantisi hazirlar.
//
//   /internal-storage-files/musteri-kontrol/raporlar.jsonl            liste (son 20)
//   /internal-storage-files/musteri-kontrol/raporlar/<ad>.xlsx        raporlarin kendisi
//
// Neden diske: flow context bellektedir, her Run Flow / yeni surumde silinir.
// /internal-storage-files ise konteyner disinda, makinedeki instance klasorune
// bagli -- deploy'lardan sag cikar (Gun 1 hava okumalari gibi).
// Dosya birikmesin: listede son 20 rapor kalir, daha eskilerin xlsx'i silinir.
//
// Girdi : msg.raporBuffer = rapor (json-to-excel, akista saklandi), msg.payload = raporlar.jsonl icerigi (file in)
// Cikis 1 -> indirme baglantisi -> view action (form)
// Cikis 2 -> debug
// Cikis 3 -> rapor xlsx'i yaz (file, encoding none)
// Cikis 4 -> raporlar.jsonl'i yeniden yaz (file, overwrite)
// Cikis 5 -> eski xlsx'leri sil (file, delete) -- birden fazla mesaj olabilir

const ENFAZLA = 20;
const KLASOR = "/internal-storage-files/musteri-kontrol/";
const ist = msg.istatistik || {};

const liste = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { liste.push(JSON.parse(satir)); } catch (e) {}
}

const ad = msg.raporAdi || ("rapor-" + Date.now() + ".xlsx");
const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);   // ayni saniyede iki kosu olabilir
const rapor = {
  id: id,
  ad: ad,                                                // kullanicinin gordugu / indirdigi ad
  yol: KLASOR + "raporlar/" + id + "-" + ad,            // diskteki ad BENZERSIZ: ayni saniyedeki iki rapor cakismasin
  zaman: new Date().toISOString(),
  dosya: ist.dosya || "",
  ozet: (ist.hataliSatir || 0) + "/" + (ist.toplamSatir || 0) + " satir hatali, " + (ist.toplamHata || 0) + " hata"
};

liste.unshift(rapor);
const kalan = liste.slice(0, ENFAZLA);
const silinecek = liste.slice(ENFAZLA).filter(r => r.yol);

const buf = msg.raporBuffer;
const xlsxMsg = { filename: rapor.yol, payload: buf };
const listeMsg = { filename: KLASOR + "raporlar.jsonl", payload: kalan.map(r => JSON.stringify(r)).join("\n") + "\n" };
const silMsgs = silinecek.map(r => ({ filename: r.yol, payload: "" }));
const kayit = { payload: { rapor: rapor.ad, ozet: rapor.ozet, yol: rapor.yol, listede: kalan.length, silinen: silinecek.length } };

// Form dugumunun koydugu alanin GERCEK adi __deptAppsFormioButtonClicked.
// view action'in yardim metni __axetFlowsFormioButtonClicked yaziyor -- yanlis;
// ikisine de bakiyoruz ki surum degisirse kirilmasin.
function formdanMi(m) { return !!(m.__deptAppsFormioButtonClicked || m.__axetFlowsFormioButtonClicked); }

// Tasarimcidaki "ornek dosyayla test" kosusunda form yok -> view action'a gitme
// (ama rapor yine diske yazilir).
let formaYanit = null;
if (formdanMi(msg)) {
  msg.indirilecek = { data: buf, ad: rapor.ad };              // -> ortak/indirme-bagi-olustur.js
  msg.messages = {
    mesaj: "Kontrol tamamlandi: " + (ist.toplamSatir || 0) + " satirin " + (ist.hataliSatir || 0) + " tanesi hatali (" + (ist.toplamHata || 0) + " hata). Rapor:",
    dosya: String(rapor.dosya),
    toplam: String(ist.toplamSatir || 0),
    hatali: String(ist.hataliSatir || 0),
    hata: String(ist.toplamHata || 0)
  };
  delete msg.raporBuffer;
  msg.payload = null;
  formaYanit = msg;
}

node.status({ fill: "green", shape: "dot", text: rapor.ozet + " (" + kalan.length + " rapor)" });
return [formaYanit, kayit, xlsxMsg, listeMsg, silMsgs.length ? silMsgs : null];
