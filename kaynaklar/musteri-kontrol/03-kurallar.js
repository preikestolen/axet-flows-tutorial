// Musteri ana verisi kurallari. SAYIM BURADA YAPILIR -- AI'a sayi saydirmiyoruz.
//
// Dort kural:
//   ZORUNLU_BOS    zorunlu alan bos (sadece bosluk da bos sayilir)
//   VERGI_TEKRAR   ayni vergi numarasi birden fazla satirda
//   ULKE_GECERSIZ  ulke kodu ISO 3166-1 alpha-2 degil
//   IBAN_BOZUK     IBAN karakter / uzunluk / mod-97 kontrolunden gecmiyor
//
// Girdi : msg.basliklar, msg.satirlar  (xlsx oku dugumunden)
// Cikti : msg.hatalar = [{ satir, kolon, kural, deger, aciklama }]
//         msg.istatistik = AI'a ve rapora giden hazir sayilar

// ------------------------------------------------------------ AYARLAR
// Kolon basliklari dosyadan dosyaya degisir. Her mantiksal alan icin kabul
// edilen basliklar (kucuk harf, Turkce karaktersiz) asagida. Basligi "*" ile
// biten her kolon da ayrica zorunlu sayilir.
const ALANLAR = {
  musteriNo: { zorunlu: true,  esler: ["musteri no", "musteri numarasi", "musteri kodu", "customer", "customer no", "customer number", "kunnr", "debitor", "musteri"] },
  unvan:     { zorunlu: true,  esler: ["unvan", "ad", "adi", "musteri adi", "firma", "firma adi", "name", "name1", "ad soyad"] },
  vergiNo:   { zorunlu: true,  esler: ["vergi no", "vergi numarasi", "vkn", "tckn", "vkn tckn", "tax number", "tax no", "tax id", "stcd1", "vergi kimlik no"] },
  ulke:      { zorunlu: true,  esler: ["ulke", "ulke kodu", "country", "country key", "country code", "land1", "land"] },
  iban:      { zorunlu: false, esler: ["iban", "iban no"] }
};
const TEKRARIN_ILKINI_DE_ISARETLE = true;   // false: yalnizca ikinci ve sonraki tekrarlar

// ISO 3166-1 alpha-2 (249 kod)
const ULKELER = new Set((
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" "));

// Bilinen yanlislar icin yol gosterici not
const ULKE_IPUCU = { UK: "GB", TU: "TR", EN: "GB", GER: "DE", TUR: "TR", USA: "US", DEU: "DE", GBR: "GB" };

// IBAN uzunluklari (SWIFT IBAN Registry). Listede olmayan ulkede uzunluk
// kontrolu atlanir, mod-97 yine uygulanir.
const IBAN_UZUNLUK = {
  AD:24, AE:23, AL:28, AT:20, AZ:28, BA:20, BE:16, BG:22, BH:22, BI:27, BR:29, BY:28, CH:21, CR:22, CY:28, CZ:24,
  DE:22, DJ:27, DK:18, DO:28, EE:20, EG:29, ES:24, FI:18, FK:18, FO:18, FR:27, GB:22, GE:22, GI:23, GL:18, GR:27,
  GT:28, HR:21, HU:28, IE:22, IL:23, IQ:23, IS:26, IT:27, JO:30, KW:30, KZ:20, LB:28, LC:32, LI:21, LT:20, LU:20,
  LV:21, LY:25, MC:27, MD:24, ME:22, MK:19, MN:20, MR:27, MT:31, MU:30, NI:28, NL:18, NO:15, OM:23, PK:24, PL:28,
  PS:29, PT:25, QA:29, RO:24, RS:22, RU:33, SA:24, SC:31, SD:18, SE:24, SI:19, SK:24, SM:27, SO:23, ST:25, SV:28,
  TL:23, TN:24, TR:26, UA:29, VA:22, VG:24, XK:20, YE:30
};

// ------------------------------------------------------------ yardimcilar
function sade(s) {                                      // "Vergi No*" -> "vergi no"
  return String(s).replace(/\*/g, "")
    .replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i")
    .toLowerCase()
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
const bos = (v) => v === undefined || v === null || String(v).trim() === "";

function ibanKontrol(ham) {                             // hata metni veya null
  const iban = String(ham).replace(/\s+/g, "").toUpperCase();
  if (/[^A-Z0-9]/.test(iban)) return "gecersiz karakter iceriyor";
  if (!/^[A-Z]{2}[0-9]{2}/.test(iban)) return "ulke kodu + 2 haneli kontrol basamagiyla baslamiyor";
  const ulke = iban.slice(0, 2);
  const beklenen = IBAN_UZUNLUK[ulke];
  if (beklenen && iban.length !== beklenen) return ulke + " IBAN'i " + beklenen + " karakter olmali, " + iban.length + " karakter";
  if (!beklenen && (iban.length < 15 || iban.length > 34)) return "uzunluk " + iban.length + " (15-34 olmali)";
  if (ulke === "TR" && !/^TR[0-9]{24}$/.test(iban)) return "TR IBAN'i yalnizca rakam icermeli";
  const duzen = iban.slice(4) + iban.slice(0, 4);
  let kalan = 0;
  for (const ch of duzen) {
    const d = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const r of d) kalan = (kalan * 10 + (r.charCodeAt(0) - 48)) % 97;
  }
  if (kalan !== 1) return "kontrol basamagi tutmuyor (mod-97) -- yazim hatasi olabilir";
  return null;
}

// ------------------------------------------------------------ kolon eslestirme
const basliklar = msg.basliklar || [];
const satirlar = msg.satirlar || [];
const kolon = {};                                       // mantiksal alan -> baslik
const dosyaUyarilari = [];

for (const [alan, tanim] of Object.entries(ALANLAR)) {
  const b = basliklar.find(x => tanim.esler.includes(sade(x)));
  if (b) kolon[alan] = b;
  else if (tanim.zorunlu || alan === "iban") {
    dosyaUyarilari.push("'" + alan + "' kolonu bulunamadi -- ilgili kural uygulanamadi. Basliklar: " + basliklar.join(", "));
  }
}

const zorunluKolonlar = new Set();
for (const [alan, tanim] of Object.entries(ALANLAR)) if (tanim.zorunlu && kolon[alan]) zorunluKolonlar.add(kolon[alan]);
for (const b of basliklar) if (/\*\s*$/.test(b)) zorunluKolonlar.add(b);

// ------------------------------------------------------------ kurallar
const hatalar = [];
const ekle = (s, k, kural, deger, aciklama) =>
  hatalar.push({ satir: s.satir, kolon: k, kural, deger: deger === undefined ? "" : String(deger), aciklama });

// 1) Zorunlu alanlar
for (const s of satirlar) {
  for (const k of zorunluKolonlar) {
    if (bos(s.degerler[k])) ekle(s, k, "ZORUNLU_BOS", s.degerler[k], k + " bos birakilmis");
  }
}

// 2) Vergi numarasi tekrari (bosluk, nokta, tire yok sayilir)
if (kolon.vergiNo) {
  const gruplar = {};
  for (const s of satirlar) {
    const v = s.degerler[kolon.vergiNo];
    if (bos(v)) continue;                               // bos olan zaten kural 1'de
    const anahtar = String(v).replace(/[\s.\-\/]/g, "").toUpperCase();
    (gruplar[anahtar] = gruplar[anahtar] || []).push(s);
  }
  for (const [vno, grup] of Object.entries(gruplar)) {
    if (grup.length < 2) continue;
    grup.forEach((s, i) => {
      if (i === 0 && !TEKRARIN_ILKINI_DE_ISARETLE) return;
      const digerleri = grup.filter(x => x !== s).map(x => x.satir).join(", ");
      ekle(s, kolon.vergiNo, "VERGI_TEKRAR", s.degerler[kolon.vergiNo],
        "Vergi no " + vno + " su satir(lar)da da var: " + digerleri);
    });
  }
}

// 3) Ulke kodu
if (kolon.ulke) {
  for (const s of satirlar) {
    const ham = s.degerler[kolon.ulke];
    if (bos(ham)) continue;
    const v = String(ham).trim();
    if (ULKELER.has(v)) continue;
    let not = "'" + v + "' gecerli bir ISO ulke kodu degil";
    if (ULKELER.has(v.toUpperCase())) not = "'" + v + "' kucuk harfle yazilmis, '" + v.toUpperCase() + "' olmali";
    else if (ULKE_IPUCU[v.toUpperCase()]) not += ", '" + ULKE_IPUCU[v.toUpperCase()] + "' olmali";
    else if (v.length !== 2) not += " (2 harfli olmali)";
    ekle(s, kolon.ulke, "ULKE_GECERSIZ", ham, not);
  }
}

// 4) IBAN (bos IBAN hata degil -- zorunlu degilse)
if (kolon.iban) {
  for (const s of satirlar) {
    const ham = s.degerler[kolon.iban];
    if (bos(ham)) continue;
    const sorun = ibanKontrol(ham);
    if (sorun) ekle(s, kolon.iban, "IBAN_BOZUK", ham, "IBAN " + sorun);
  }
}

hatalar.sort((a, b) => a.satir - b.satir || basliklar.indexOf(a.kolon) - basliklar.indexOf(b.kolon));

// ------------------------------------------------------------ istatistik
const KURAL_ADI = {
  ZORUNLU_BOS: "Bos zorunlu alan",
  VERGI_TEKRAR: "Tekrar eden vergi numarasi",
  ULKE_GECERSIZ: "Gecersiz ulke kodu",
  IBAN_BOZUK: "Bozuk IBAN"
};
const kuralSayisi = {};
for (const k of Object.keys(KURAL_ADI)) kuralSayisi[k] = 0;
const kolonSayisi = {};
const hataliSatirlar = new Set();
for (const h of hatalar) {
  kuralSayisi[h.kural]++;
  kolonSayisi[h.kolon] = (kolonSayisi[h.kolon] || 0) + 1;
  hataliSatirlar.add(h.satir);
}

msg.hatalar = hatalar;
msg.kolonEslesme = kolon;
msg.zorunluKolonlar = Array.from(zorunluKolonlar);
msg.kuralAdlari = KURAL_ADI;
msg.istatistik = {
  dosya: msg.dosyaAdi,
  toplamSatir: satirlar.length,
  hataliSatir: hataliSatirlar.size,
  temizSatir: satirlar.length - hataliSatirlar.size,
  toplamHata: hatalar.length,
  kuralBazinda: Object.entries(kuralSayisi).map(([kod, adet]) => ({ kural: KURAL_ADI[kod], kod, adet }))
    .sort((a, b) => b.adet - a.adet),
  kolonBazinda: kolonSayisi,
  dosyaUyarilari,
  ornekler: Object.keys(KURAL_ADI).map(kod => ({
    kural: KURAL_ADI[kod],
    ilkUc: hatalar.filter(h => h.kural === kod).slice(0, 3).map(h => "satir " + h.satir + ": " + h.aciklama)
  })).filter(o => o.ilkUc.length > 0)
};

for (const u of dosyaUyarilari) node.warn(u);
node.status(hatalar.length
  ? { fill: "yellow", shape: "dot", text: hataliSatirlar.size + "/" + satirlar.length + " satir hatali, " + hatalar.length + " hata" }
  : { fill: "green", shape: "dot", text: satirlar.length + " satir, hata yok" });
return msg;
