// json-to-excel'den gelen raporu (Buffer) diske DEGIL uygulamanin hafizasina
// koyar; "Raporlar" sayfasi listeyi buradan okur. Sonra forma yanit hazirlar.
//
// Neden flow context: kullanici raporu kendi bilgisayarinda istedigi yere
// tarayicidan indirir; sunucuda dosya birikmez.
// Bedeli: context bellekte tutulur, Production yeniden baslatilinca liste
// sifirlanir. Bu yuzden rapor gonderim aninda da indirilir (asagida).
//
// Cikis 1 -> indirme baglantisi -> view action (forma "tamamlandi" mesaji + baglanti)
// Cikis 2 -> debug (her durumda)

const ENFAZLA = 20;                                    // bellekte tutulan son rapor sayisi
const ist = msg.istatistik || {};

const rapor = {
  id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),   // ayni milisaniyede iki kosu olabilir
  ad: msg.raporAdi || ("rapor-" + Date.now() + ".xlsx"),
  zaman: new Date().toISOString(),
  dosya: ist.dosya || "",
  ozet: (ist.hataliSatir || 0) + "/" + (ist.toplamSatir || 0) + " satir hatali, " + (ist.toplamHata || 0) + " hata",
  icerik: msg.payload                                  // Buffer
};

const liste = flow.get("raporlar") || [];
liste.unshift(rapor);
flow.set("raporlar", liste.slice(0, ENFAZLA));

const kayit = { payload: { rapor: rapor.ad, ozet: rapor.ozet, bellekteki: Math.min(liste.length, ENFAZLA) } };

// Form dugumunun koydugu alanin GERCEK adi __deptAppsFormioButtonClicked.
// view action'in yardim metni __axetFlowsFormioButtonClicked yaziyor -- yanlis;
// ikisine de bakiyoruz ki surum degisirse kirilmasin.
function formdanMi(m) { return !!(m.__deptAppsFormioButtonClicked || m.__axetFlowsFormioButtonClicked); }

// Tasarimcidaki "ornek dosyayla test" kosusunda form yok -> view action'a gitme.
// Form dugumu bu ozellikleri koyar; view action onlarsiz calismaz, DOKUNMAYIN.
if (!formdanMi(msg)) {
  node.status({ fill: "grey", shape: "dot", text: "kaydedildi (formsuz test)" });
  return [null, kayit];
}

msg.indirilecek = { data: rapor.icerik, ad: rapor.ad };      // -> ortak/indirme-bagi-olustur.js
msg.messages = {
  mesaj: "Kontrol tamamlandi: " + (ist.toplamSatir || 0) + " satirin " + (ist.hataliSatir || 0) + " tanesi hatali (" + (ist.toplamHata || 0) + " hata). Rapor:",
  dosya: String(rapor.dosya),
  toplam: String(ist.toplamSatir || 0),
  hatali: String(ist.hataliSatir || 0),
  hata: String(ist.toplamHata || 0)
};

node.status({ fill: "green", shape: "dot", text: rapor.ozet });
return [msg, kayit];
