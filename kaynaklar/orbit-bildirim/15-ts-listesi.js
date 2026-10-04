// Toplananlari onceki anlik goruntuyle birlestirir, yenileri isaretler.
// Ilk okumada hicbiri "yeni" sayilmaz (hepsi zaten vardi).
// Cikis 1 -> projeler/<id>.json (file, uzerine yaz)   -- kalici liste
// Cikis 2 -> secim.json (file, uzerine yaz)           -- sadece formdan: secim saklanir
// Cikis 3 -> view action (tablo)                      -- sadece formdan
// Cikis 4 -> onay bekleyen TS maili: orbit/giden/<zaman>-<proje>.json (file) -- Windows'taki
//            outlook-gonderici.ps1 bu klasoru izler ve maili acik Outlook ile gonderir.
//            (MS Graph DELEGATED bu kurumda Kosullu Erisimle engelli: AADSTS 53003.)
//            Listele: her zaman. Saatlik: bekleyen liste son mailden farkliysa.

const onceki = msg.obOnceki;
const simdi = new Date().toISOString();
const kayitlar = onceki ? Object.assign({}, onceki.kayitlar) : {};
const yeniler = [];
for (const id of Object.keys(msg.obToplanan)) {
  const k = msg.obToplanan[id];
  const eski = kayitlar[id];
  k.ilk = eski ? (eski.ilk || null) : (onceki ? simdi : null);
  if (!eski && onceki) yeniler.push(k.no);
  kayitlar[id] = k;
}
const sonGuncelleme = [onceki ? onceki.sonGuncelleme : "", msg.obEnYeni].sort().pop();
const anlik = {
  proje: { id: msg.obProje.id, ad: msg.obProje.ad, kimlik: msg.obProje.kimlik },
  sonGuncelleme: sonGuncelleme, sonOkuma: simdi, kaynak: msg.obKaynak, taranan: msg.obTaranan,
  kayitlar: kayitlar, sonYeniler: yeniler
};

const anlikYaz = { filename: anlikYolu(msg.obProje.id), payload: JSON.stringify(anlik) };
const formdan = formdanMi(msg);

// --- mail karari
const o = oturum();
let mail = null;
if (o && o.eposta) {
  mail = mailYap(anlik, o.eposta, msg.obKaynak);
  const imzalar = flow.get("orbitMailImza") || {};
  if (!formdan && MAIL_SAATLIK_SADECE_DEGISINCE &&
      (mail.obMail.adet === 0 || imzalar[anlik.proje.id] === mail.obMail.imza)) mail = null;   // degisiklik yok / bekleyen yok
}
if (mail) mail = {
  filename: KLASOR + "giden/" + Date.now() + "-" + mail.obMail.kimlik + ".json",
  payload: JSON.stringify({ to: mail.obMail.alici, subject: mail.payload.subject, html: mail.payload.body.content, zaman: simdi }),
  obMail: mail.obMail
};

node.status({ fill: yeniler.length ? "green" : "blue", shape: "dot",
  text: anlik.proje.kimlik + ": " + Object.keys(kayitlar).length + " madde, " + yeniler.length + " yeni, " +
        bekleyenler(anlik).length + " bekleyen" + (mail ? ", mail" : "") });

delete msg.obToplanan; delete msg.obOnceki; delete msg.obDurumlar;
if (!formdan) return [anlikYaz, null, null, mail];

const secimYaz = { filename: KLASOR + "secim.json",
  payload: JSON.stringify({ id: anlik.proje.id, ad: anlik.proje.ad, kimlik: anlik.proje.kimlik, zaman: simdi }) };
msg.messages = { mesaj: anlik.proje.kimlik + ": " + Object.keys(kayitlar).length + " madde, " + yeniler.length + " yeni." +
  (mail ? " Onay bekleyen " + mail.obMail.adet + " TS " + mail.obMail.alici + " adresine Outlook ile gonderilmek uzere siraya alindi." : "") };
msg.submission = { proje: anlik.proje.id, tablo: tabloYap(anlik),
  durum: kutu(yeniler.length ? "tamam" : "bilgi", ozetMetni(anlik) +
    (mail ? "<br>Mail siraya alindi: " + esc(mail.obMail.alici) + " (" + mail.obMail.adet + " bekleyen). Outlook birkac saniye icinde gonderir (Gonderilmis Ogeler); yardimcinin durumu 'Kurulum ve Mail' sayfasinda." : "")) };
secenekleriEkle(msg);
return [anlikYaz, secimYaz, msg, mail];
