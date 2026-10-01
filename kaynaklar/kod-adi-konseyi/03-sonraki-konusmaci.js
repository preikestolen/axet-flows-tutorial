// Konseyin "sira yoneticisi". Her ajan cevabindan sonra buraya donulur:
//   1) az once konusanin cevabini kaydeder (Output Schema: { kodAdi, gerekce })
//   2) siradaki konusmacinin prompt'unu kurar ve dogru cikisa yollar
//
// Cikislar: 1 muhendis | 2 pazarlamaci | 3 sair | 4 baskan | 5 hata
//
// Karakterlerin KISILIGI ajan dugumunun Instructions alaninda (akis-uret.py);
// burada sadece o oturumun gorevi ve baglami var. Boylece ses ajan basina
// sabit, icerik her oturumda farkli.

const SIRA = ["muhendis", "pazarlamaci", "sair"];
const AD = { muhendis: "Alayci Muhendis", pazarlamaci: "Abartili Pazarlamaci", sair: "Dramatik Sair" };
const k = msg.konsey;
const NL = String.fromCharCode(10);

function temiz(s, enfazla) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, enfazla); }

// 1) az once konusani kaydet
if (k.bekleyen) {
  const p = msg.payload || {};
  const kodAdi = temiz(p.kodAdi, 40);
  const gerekce = temiz(p.gerekce, 600);
  if (!kodAdi || !gerekce) {
    msg.hata = AD[k.bekleyen] + " anlasilmaz bir sey mirildandi (bos isim/gerekce).";
    return [null, null, null, null, msg];
  }
  k.konusmalar.push({ karakter: k.bekleyen, kodAdi: kodAdi, gerekce: gerekce });
  k.bekleyen = null;
}

// 2) siradaki
const siradaki = SIRA[k.konusmalar.length];
const onceki = k.konusmalar.map(x => "- " + AD[x.karakter] + ": \"" + x.kodAdi + "\" -- " + x.gerekce).join(NL);

if (siradaki) {
  k.bekleyen = siradaki;
  msg.payload = [
    "Kod Adi Konseyi toplandi. Bir proje icin KOD ADI oneriyorsun.",
    "",
    "PROJE: " + k.proje,
    "",
    "Bu oturumdaki ilham kaynagin: " + k.ilham[siradaki] + " (istersen kullan, zorunlu degil).",
    onceki ? "Senden once konusanlar:" + NL + onceki + NL + "Onlardan FARKLI bir isim oner; istersen onlara kendi uslubunla laf at." : "Ilk sen konusuyorsun.",
    k.yasakli.length ? "Bu isimler panoda zaten var, KULLANMA: " + k.yasakli.join(", ") : "",
    "",
    "Kurallar:",
    "- kodAdi: 1-3 kelime, en fazla 24 karakter. Turkce ya da Ingilizce olabilir.",
    "- gerekce: 2-3 cumle, en fazla 60 kelime, TAMAMEN kendi karakterinin sesiyle.",
    "- Projeyle gercek bir bag kur; sadece komik olsun diye alakasiz isim verme."
  ].filter(s => s !== "").join(NL);
  k.sonPrompt = msg.payload; k.sonHedef = SIRA.indexOf(siradaki); k.deneme = 1;   // 07-ajan-yeniden.js icin
  node.status({ fill: "blue", shape: "dot", text: AD[siradaki] + " konusuyor..." });
  const cikis = [null, null, null, null, null];
  cikis[SIRA.indexOf(siradaki)] = msg;
  return cikis;
}

// 3) uc uye de konustu -> Baskan
msg.payload = [
  "Kod Adi Konseyi'nin baskanisin. Uc uyeyi dinledin, simdi karar veriyorsun.",
  "",
  "PROJE: " + k.proje,
  "",
  "ONERILER:",
  k.konusmalar.map(x => "- [" + x.karakter + "] " + AD[x.karakter] + ": \"" + x.kodAdi + "\" -- " + x.gerekce).join(NL),
  "",
  "Gorevin:",
  "1. degerlendirmeler.muhendis / .pazarlamaci / .sair: HER UYEYE ayri ayri, onun uslubuna ve onerisine",
  "   dogrudan degin (1-2 cumle, adini ya da onerdigi ismi an).",
  "2. Tek bir kazanan sec. kazananKarakter alanina karakter anahtarini yaz (muhendis | pazarlamaci | sair),",
  "   kazanan alanina o uyenin onerdigi ismi AYNEN yaz.",
  "3. puan: kazanan isme 1-100 arasi tam sayi (akilda kalicilik, projeye uygunluk, ozgunluk).",
  "4. karar: 2-3 cumlelik gerekceli karar; hafif esprili, ama adil."
].join(NL);
k.sonPrompt = msg.payload; k.sonHedef = 3; k.deneme = 1;
node.status({ fill: "blue", shape: "dot", text: "Baskan karar veriyor..." });
return [null, null, null, msg, null];
