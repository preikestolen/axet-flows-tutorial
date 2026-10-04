// --- ortak yardimcilar: akis-uret.py bu dosyayi HER function'in basina ekler ---
// Orbit (Plane tabanli) SADECE OKUNUR: giris (POST /auth/sign-in/) disinda tum
// istekler GET. Oturum cerezi bellekte (flow context) durur, sifre hicbir yere
// yazilmaz. Adres ve calisma alani yerel.json'dan gelir (git'e girmez).
const ORBIT = "__ORBIT_ADRES__";
const ALAN = "__CALISMA_ALANI__";
const API = ORBIT + "/api/workspaces/" + ALAN + "/";
const KLASOR = "/internal-storage-files/orbit/";
const TS_ALANI = "ts-gerceklesen-tarih-11435";          // "TS Gerceklesen Tarih" -- yedi projede ayni anahtar
const TS_DURUMU = /TS Approval Awaiting/i;               // "F_TS Approval Awaiting"

function oturum() { return flow.get("orbitOturum") || null; }

function getIstegi(m, url) {
  const o = oturum();
  m.method = "GET";
  m.url = url;
  m.headers = { Accept: "application/json", Cookie: o ? o.cerez : "" };   // onceki yanitin basliklari gitmesin
  m.requestTimeout = 60000;
  delete m.payload;
  return m;
}

// http request yanitini dogrular; 401 = oturum bitti (catch -> 16-hata.js oturumu siler)
function yanitKontrol(m, ne) {
  if (m.statusCode === 401) throw new Error("OTURUM: Orbit oturumu sona erdi (" + ne + "). Orbit Giris sayfasindan yeniden giris yapin.");
  if (m.statusCode === 403) throw new Error("Orbit bu kullaniciya izin vermiyor (" + ne + ", 403). Kullanici projeye uye mi?");
  if (m.statusCode !== 200 || !m.payload || typeof m.payload !== "object")
    throw new Error("Orbit yaniti beklenmedik (" + ne + "): HTTP " + m.statusCode);
}

// view action "update" formu yeniden kurar; secim kutusunun secenekleri yanitta
// yoksa kutu bos kalir ve secili deger yerine ham kimlik gorunur. Her form
// yanitina son proje listesini (08-projeler-isle.js -> flow context) ekleyin.
function secenekleriEkle(m) {
  const s = flow.get("orbitProjeler");
  if (s && s.length) m.onInitPopulateFormStructure = { proje: s };
  return m;
}

function formdanMi(m) { return !!(m.__deptAppsFormioButtonClicked || m.__axetFlowsFormioButtonClicked || m.obFormAcilis); }

const esc = (s) => String(s === undefined || s === null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function yerel(iso, saatli) {
  if (!iso) return "";
  try {
    const o = { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric" };
    if (saatli) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return new Date(iso).toLocaleString("tr-TR", o);
  } catch (e) { return String(iso); }
}

function kutu(sinif, metin) { return '<div class="orbit-kutu orbit-' + sinif + '">' + metin + '</div>'; }

// --- mail: onay bekleyen TS'ler (durum su an F_TS Approval Awaiting) ---
// Listele: her seferinde gonderilir. Saatlik okuma: sadece bekleyen liste
// bir onceki mailden farkliysa (yeni geldi / biri cikti) -- saatte bir ayni mail gelmesin.
const MAIL_SAATLIK_SADECE_DEGISINCE = true;

function bekleyenler(anlik) {
  return Object.values((anlik && anlik.kayitlar) || {})
    .filter(x => TS_DURUMU.test(x.durum || ""))
    .sort((a, b) => String(b.upd || "").localeCompare(String(a.upd || "")) || (b.seq - a.seq));
}

// Turkce harfler HTML karsiligiyla (kaynak ASCII kalsin, mailde dogru gorunsun)
const TR = (s) => String(s).replace(/\{([a-zA-Z])\}/g, (_, h) => ({
  c: "&#231;", C: "&#199;", g: "&#287;", G: "&#286;", i: "&#305;", I: "&#304;",
  o: "&#246;", O: "&#214;", s: "&#351;", S: "&#350;", u: "&#252;", U: "&#220;"
})[h] || h);

function mailYap(anlik, alici, kaynak) {
  const b = bekleyenler(anlik);
  const p = anlik.proje;
  const projeUrl = ORBIT + "/" + ALAN + "/projects/" + p.id + "/issues/";
  const H = 'style="padding:8px 10px;border-bottom:1px solid #e3e8ee;text-align:left;font-size:12px;color:#5b6b7b;text-transform:uppercase;letter-spacing:.03em"';
  const D = 'style="padding:8px 10px;border-bottom:1px solid #eef1f4;vertical-align:top;font-size:14px;color:#1f2d3d"';
  const satir = (x, i) => '<tr>' +
    '<td ' + D + '>' + (i + 1) + '</td>' +
    '<td ' + D + ' nowrap><a href="' + esc(ORBIT + "/" + ALAN + "/browse/" + x.no + "/") + '" style="color:#0b63c5;font-weight:600;text-decoration:none">' + esc(x.no) + '</a></td>' +
    '<td ' + D + '>' + esc(x.baslik) + (x.modul ? '<div style="color:#7a8896;font-size:12px;margin-top:2px">' + TR("Mod{u}l: ") + esc(x.modul) + '</div>' : '') + '</td>' +
    '<td ' + D + '>' + esc(x.tsSorumlu || "-") + '</td>' +
    '<td ' + D + ' nowrap>' + esc(yerel(x.upd, true)) + '</td></tr>';
  const tablo = b.length
    ? '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin-top:8px">' +
      '<tr style="background:#f4f7f9"><th ' + H + '>#</th><th ' + H + '>Madde</th><th ' + H + '>' + TR("Ba{s}l{i}k") + '</th>' +
      '<th ' + H + '>TS sorumlusu</th><th ' + H + '>' + TR("Son g{u}ncelleme") + '</th></tr>' +
      b.map(satir).join("") + '</table>'
    : '<p style="font-size:14px;color:#1d5b33;background:#eaf6ee;padding:10px 12px;border-radius:6px">' +
      TR("{S}u an onay bekleyen TS yok.") + '</p>';
  const govde =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:860px;color:#1f2d3d">' +
    '<div style="background:#1b2a4a;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0">' +
      '<div style="font-size:12px;opacity:.8">Orbit Notification System</div>' +
      '<div style="font-size:18px;font-weight:600;margin-top:2px">' + esc(p.kimlik) + ' &middot; ' + esc(p.ad) + '</div></div>' +
    '<div style="border:1px solid #e3e8ee;border-top:0;padding:14px 18px;border-radius:0 0 8px 8px">' +
      '<p style="font-size:15px;margin:0 0 6px"><b>' + b.length + '</b> ' + TR("TS onay bekliyor") +
      ' <span style="color:#7a8896">(durum: F_TS Approval Awaiting)</span></p>' +
      '<p style="font-size:13px;color:#5b6b7b;margin:0 0 6px">' + TR("En son g{u}ncellenen {u}stte. Madde numaras{i}na t{i}klay{i}nca Orbit'te a{c}{i}l{i}r.") + '</p>' +
      tablo +
      '<p style="margin:16px 0 0"><a href="' + esc(projeUrl) + '" style="display:inline-block;background:#0b63c5;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:14px">' +
      TR("Projeyi Orbit'te a{c}") + '</a></p>' +
      '<p style="font-size:12px;color:#8a97a3;margin:16px 0 0">' +
      (kaynak === "zamanlayici" ? TR("Saatlik otomatik kontrol") : TR("Listele ile istendi")) + ' &middot; ' + esc(yerel(anlik.sonOkuma, true)) +
      ' &middot; ' + TR("TS onay{i}na g{o}nderilmi{s} toplam madde: ") + Object.keys(anlik.kayitlar || {}).length +
      '<br>' + TR("Bu mail aXet.flows taraf{i}ndan otomatik g{o}nderildi; Orbit yaln{i}zca okunur.") + '</p>' +
    '</div></div>';
  return {
    payload: {
      subject: "[Orbit] " + p.kimlik + " - " + p.ad + ": " + b.length + " TS onay bekliyor",
      toRecipients: [{ emailAddress: { address: alici } }],
      importance: b.length ? "normal" : "low",
      body: { contentType: "HTML", content: govde }
    },
    obMail: { alici: alici, adet: b.length, proje: p.id, kimlik: p.kimlik, imza: b.map(x => x.no).sort().join(","), kaynak: kaynak }
  };
}

function sonMailMetni() {
  const m = flow.get("orbitSonMail");
  if (!m) return "";
  return m.durum === "siraya"
    ? "Son mail: " + yerel(m.zaman, true) + ", " + esc(m.alici) + " (" + esc(m.kimlik) + ", " + m.adet + " bekleyen) -- Outlook ile gonderilmek uzere siraya alindi."
    : "Son mail SIRAYA ALINAMADI (" + yerel(m.zaman, true) + "): " + esc(m.hata);
}

function anlikYolu(projeId) { return KLASOR + "projeler/" + String(projeId).replace(/[^A-Za-z0-9-]/g, "") + ".json"; }

// Anlik goruntu (projeler/<id>.json) -> sayfadaki tablo satirlari.
// En yeni TS tarihi ustte; tarihi bos olan (su an F_TS Approval Awaiting) en ustte.
function tabloYap(anlik) {
  const k = Object.values((anlik && anlik.kayitlar) || {});
  k.sort((a, b) => String(b.ts || "9999").localeCompare(String(a.ts || "9999")) || (b.seq - a.seq));
  return k.map((x, i) => ({
    sira: String(i + 1),
    no: x.no,
    baslik: x.baslik,
    tsTarihi: x.ts ? yerel(x.ts) : "onay bekliyor",
    durum: x.durum,
    yeni: x.ilk ? "YENI  " + yerel(x.ilk, true) : ""
  }));
}

function ozetMetni(anlik) {
  if (!anlik) return "Bu proje henuz okunmadi. 'Listele'ye basin (ilk okuma buyuk projede 1 dakika surebilir).";
  const n = Object.keys(anlik.kayitlar || {}).length;
  const yeni = (anlik.sonYeniler || []).length;
  return "<b>" + esc(anlik.proje.kimlik) + "</b> " + esc(anlik.proje.ad) + ": <b>" + n + "</b> madde TS onayina gonderilmis. " +
    "Son okuma " + yerel(anlik.sonOkuma, true) + " (" + (anlik.kaynak === "zamanlayici" ? "otomatik" : "elle") + "), " +
    (yeni ? "<b>" + yeni + " yeni</b>: " + esc(anlik.sonYeniler.slice(0, 10).join(", ")) + (yeni > 10 ? "..." : "") : "yeni madde yok") + ". " +
    "Onay bekleyen (F_TS Approval Awaiting): <b>" + bekleyenler(anlik).length + "</b>." +
    (sonMailMetni() ? "<br>" + sonMailMetni() : "");
}
// --- ortak sonu ---
