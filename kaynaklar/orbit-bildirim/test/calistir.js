// Orbit Notification System function'larini, uretilmis akistaki halleriyle
// (00-ortak.js eklenmis), aXet'e benzer sandbox'ta sahte Orbit yanitlariyla calistirir.
//
//   python akis-uret.py && node test/calistir.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const KOK = path.join(__dirname, "..");
const akis = JSON.parse(fs.readFileSync(path.join(KOK, "orbit-bildirim-akis.json"), "utf8"));
const D = Object.fromEntries(akis.map(n => [n.id, n]));
let hatalar = 0;
const kontrol = (kosul, ne) => { console.log((kosul ? "  OK   " : "  HATA ") + ne); if (!kosul) hatalar++; };

const flowDepo = {};
const flow = { get: (k) => flowDepo[k], set: (k, v) => { flowDepo[k] = v; } };

// function dugumu: throw -> catch (ob_hata) gibi davranir
function calistir(id, msg) {
  const node = { status: () => {}, warn: () => {}, error: (e) => { throw e; } };
  const kod = "(function(){\n" + D[id].func + "\n})()";
  try {
    return { sonuc: vm.runInContext(kod, vm.createContext({ msg, node, flow, Buffer, Date, JSON, encodeURIComponent, decodeURIComponent })) };
  } catch (e) {
    msg.error = { message: String(e.message || e) };
    return { hata: e, catchSonuc: vm.runInContext("(function(){\n" + D.ob_hata.func + "\n})()",
      vm.createContext({ msg, node, flow, Buffer, Date, JSON })) };
  }
}

console.log("0) akis yapisi");
const ids = new Set(akis.map(n => n.id));
let kabloTamam = true, ciktiTamam = true;
for (const n of akis) {
  for (const w of n.wires || []) for (const h of w) if (!ids.has(h)) { kabloTamam = false; console.log("    yok:", n.id, "->", h); }
  if (n.type === "function" && n.wires.length !== n.outputs) { ciktiTamam = false; console.log("    outputs:", n.id); }
  if (n.type === "function") { try { new Function("msg", "node", "flow", n.func); } catch (e) { ciktiTamam = false; console.log("    sozdizimi:", n.id, e.message); } }
}
kontrol(kabloTamam, "butun kablolar var olan dugumlere gidiyor");
kontrol(ciktiTamam, "function outputs = wires, sozdizimi gecerli");
for (const f of ["ob_form_giris", "ob_form_ts"]) kontrol(D[f].outputs === D[f].buttons.length + 1, f + ": cikis = dugme + 1 (onInit)");
const catchKapsam = new Set(D.ob_catch.scope);
kontrol(akis.filter(n => n.type === "function" && !/_f$/.test(n.id) && !["ob_hata", "ob_ag", "ob_ag_yon"].includes(n.id)).every(n => catchKapsam.has(n.id)), "her function catch kapsaminda");
const kodlar = akis.filter(n => n.type === "function").map(n => n.func).join("\n");
kontrol(!/method\s*=\s*"(PUT|PATCH|DELETE)"/.test(kodlar) && (kodlar.match(/method\s*=\s*"POST"/g) || []).length === 1, "Orbit'e tek POST (giris), PUT/PATCH/DELETE yok");
kontrol(!/__ORBIT_ADRES__|__CALISMA_ALANI__/.test(kodlar), "adres yer tutuculari dolduruldu");

const FORM = { __deptAppsFormioButtonClicked: "x" };

console.log("1) giris");
let r = calistir("ob_g1", Object.assign({ payload: { data: { eposta: "kotu", sifre: "" } } }, FORM)).sonuc;
kontrol(r[0] === null && /gerekli/.test(r[1].messages.mesaj), "eksik bilgi: uyari, Orbit'e gidilmez");

let m = calistir("ob_g1", Object.assign({ payload: { data: { eposta: "bot@ornek.com", sifre: "S&if re=1" } } }, FORM)).sonuc[0];
kontrol(/\/auth\/get-csrf-token\/$/.test(m.url) && m.method === "GET", "once CSRF anahtari");
m.statusCode = 200; m.payload = { csrf_token: "TOK" }; m.responseCookies = { csrftoken: { value: "CK" } };
m = calistir("ob_g2", m).sonuc;
kontrol(m.method === "POST" && /\/auth\/sign-in\/$/.test(m.url) && m.followRedirects === false, "POST sign-in, yonlendirme izlenmez");
kontrol(m.payload.includes("password=S%26if%20re%3D1") && m.payload.includes("csrfmiddlewaretoken=TOK") && m.headers.Cookie === "csrftoken=CK", "govde kodlu, csrf cerezi gonderiliyor");
kontrol(!m.orbitGiris, "sifre msg.orbitGiris'ten silindi");

const kopya = JSON.parse(JSON.stringify(m));
kopya.statusCode = 302; kopya.headers = { location: "https://orbit/?error_code=5005&error_message=AUTHENTICATION_FAILED_SIGN_IN&email=x" };
let rr = calistir("ob_g3", kopya).sonuc;
kontrol(rr[0] === null && /sifre hatali/.test(rr[1].messages.mesaj) && rr[1].payload === null && rr[1].submission.sifre === "", "yanlis sifre: anlasilir mesaj, govde temizlendi");

m.statusCode = 302; m.headers = { location: "https://orbit/nttdata/" };
m.responseCookies = { "session-id": { value: "SES" }, csrftoken: { value: "CK2" } };
m = calistir("ob_g3", m).sonuc[0];
kontrol(m.payload === undefined || m.payload === null, "sign-in sonrasi msg'de sifreli govde yok");
kontrol(/\/api\/users\/me\/$/.test(m.url) && /session-id=SES/.test(m.headers.Cookie), "oturum cerezi ile users/me");
m.statusCode = 200; m.payload = { id: "u1", display_name: "Orbit Bot" };
m = calistir("ob_g4", m).sonuc;
kontrol(flowDepo.orbitOturum && flowDepo.orbitOturum.ad === "Orbit Bot" && !JSON.stringify(flowDepo).includes("S&if"), "oturum bellekte, sifre yok");
kontrol(/giris yapildi/.test(m.messages.mesaj), "giris basarili mesaji");
kontrol(/Orbit Bot/.test(calistir("ob_g_ac", {}).sonuc.submission.durum), "Giris sayfasi acilisi: oturum gorunur");

console.log("2) TS sayfasi acilisi (secim yok)");
m = calistir("ob_t_ac", {}).sonuc;
m.payload = "";                                   // catch_bos: secim.json yok
let [httpe, dogrudan] = calistir("ob_t_proj", m).sonuc;
kontrol(httpe && /\/projects\/$/.test(httpe.url), "oturum var: proje listesi istenir");
httpe.statusCode = 200;
httpe.payload = [{ id: "11111111-1111-1111-1111-111111111111", name: "Redington", identifier: "REEM", archived_at: null, member_role: 15 },
                 { id: "22222222-2222-2222-2222-222222222222", name: "Arsiv", identifier: "ARS", archived_at: "2026-01-01", member_role: 15 }];
let [anlikOku, view] = calistir("ob_t_isle", httpe).sonuc;
kontrol(anlikOku === null && view.onInitPopulateFormStructure.proje.length === 1, "arsivli proje gizli, secim yok -> bos tablo");

console.log("3) Listele: ilk okuma (tam tarama, 2 sayfa)");
const PID = "11111111-1111-1111-1111-111111111111";
const DURUM = [{ id: "sF", name: "F_TS Approval Awaiting" }, { id: "sN", name: "N_Done" }, { id: "sB", name: "B_Not Started" }];
const is = (seq, upd, durum, ts) => ({ id: "i" + seq, name: "Is " + seq, sequence_id: seq, state_id: durum, updated_at: upd,
  is_draft: false, archived_at: null, custom_field_values: { "ts-gerceklesen-tarih-11435": ts || null } });
const disk = {};

function listele(msg, sayfalar) {
  let [a, uyari] = calistir("ob_l1", msg).sonuc;
  if (!a) return { uyari };
  a.statusCode = 200; a.payload = { name: "Redington", identifier: "REEM" };
  a = calistir("ob_l2", a).sonuc;
  a.statusCode = 200; a.payload = DURUM;
  a = calistir("ob_l3", a).sonuc;
  a.payload = disk[a.filename] || "";
  a = calistir("ob_l4", a).sonuc;
  const istenen = [];
  for (let i = 0; ; i++) {
    istenen.push(a.url);
    a.statusCode = 200; a.payload = sayfalar[i];
    const [devam, bitti] = calistir("ob_l5", a).sonuc;
    if (bitti) { a = bitti; break; }
    a = devam;
  }
  const [anlikYaz, secimYaz, gorunum, mail] = calistir("ob_l6", a).sonuc;
  disk[anlikYaz.filename] = anlikYaz.payload;
  if (secimYaz) disk[secimYaz.filename] = secimYaz.payload;
  if (mail) calistir("ob_mail_ok", mail);               // ms-graph-mail-send basarili
  return { gorunum, istenen, anlik: JSON.parse(anlikYaz.payload), secimYaz, mail };
}

let s = listele(Object.assign({ payload: { data: { proje: PID } } }, FORM), [
  { results: [is(5, "2026-10-04T10:00:00Z", "sN", "2026-09-01"), is(4, "2026-10-03T10:00:00Z", "sB", null),
              is(3, "2026-10-02T10:00:00Z", "sF", null)], next_page_results: true, next_cursor: "1000:1:0" },
  { results: [is(2, "2026-09-01T10:00:00Z", "sN", "2026-08-15"), is(1, "2026-08-01T10:00:00Z", "sN", null)], next_page_results: false }
]);
kontrol(s.istenen.length === 2 && /order_by=-updated_at/.test(s.istenen[0]) && /cursor=1000%3A1%3A0/.test(s.istenen[1]), "iki sayfa, en son guncellenenden geriye");
kontrol(s.istenen.every(u => /^https:\/\//.test(u)), "istek adresleri tam");
const tablo = s.gorunum.submission.tablo;
kontrol(tablo.map(t => t.no).join(",") === "REEM-3,REEM-5,REEM-2", "TS onayina gonderilenler: bekleyen ustte, sonra en yeni TS tarihi");
kontrol(tablo[0].tsTarihi === "onay bekliyor" && tablo.every(t => t.yeni === ""), "ilk okumada 'yeni' isareti yok");
kontrol(s.secimYaz && JSON.parse(s.secimYaz.payload).id === PID, "secim saklandi (secim.json)");
const mj = s.mail && JSON.parse(s.mail.payload);
kontrol(s.mail && /\/internal-storage-files\/orbit\/giden\/\d+-REEM\.json$/.test(s.mail.filename) && mj.to === "bot@ornek.com" && s.mail.obMail.adet === 1, "Listele: orbit/giden/ kuyruguna mail dosyasi, alici Orbit adresi");
kontrol(/REEM-3/.test(mj.html) && !/REEM-5/.test(mj.html) && /browse\/REEM-3\//.test(mj.html), "mailde sadece F_TS Approval Awaiting olanlar, Orbit baglantisiyla");
kontrol(/1 TS onay bekliyor/.test(mj.subject) && /siraya alindi/.test(s.gorunum.messages.mesaj), "konu: proje + bekleyen sayisi; kullaniciya siraya alindi denir");
kontrol(s.gorunum.onInitPopulateFormStructure && s.gorunum.onInitPopulateFormStructure.proje.length === 1, "Listele yaniti proje seceneklerini de tasir (kutu bos kalmaz)");

console.log("4) saatlik okuma: sadece degisenler, yeni madde isaretlenir");
let z = calistir("ob_z", { }).sonuc;
kontrol(z.filename === "/internal-storage-files/orbit/secim.json", "zamanlayici kayitli secimi okur");
z.payload = disk[z.filename];
s = listele(z, [
  { results: [is(6, "2026-10-05T09:00:00Z", "sN", "2026-10-05"), is(4, "2026-10-05T08:00:00Z", "sF", null),
              is(5, "2026-10-04T10:00:00Z", "sN", "2026-09-01"), is(9, "2026-09-30T00:00:00Z", "sN", "2026-09-30")],
    next_page_results: true, next_cursor: "1000:1:0" }
]);
kontrol(s.istenen.length === 1, "onceki okumadan eski kayda gelince durur (ikinci sayfa istenmez)");
kontrol(!s.gorunum, "zamanlayicida view action yok");
kontrol(s.anlik.sonYeniler.sort().join(",") === "REEM-4,REEM-6" && s.anlik.kaynak === "zamanlayici", "yeniler: REEM-6 (TS tarihi), REEM-4 (F'ye gecti)");
kontrol(!s.anlik.kayitlar.i9, "sinirdan eski kayit okunmadi");
kontrol(s.mail && s.mail.obMail.adet === 2, "saatlik: bekleyen liste degisti (REEM-4 F'ye gecti) -> mail");
z = calistir("ob_z", {}).sonuc; z.payload = disk[z.filename];
let s2 = listele(z, [{ results: [], next_page_results: false }]);
kontrol(!s2.mail, "saatlik: bekleyen liste ayni -> tekrar mail yok");


console.log("5) sayfa acilisi onbellekten");
m = calistir("ob_t_ac", {}).sonuc; m.payload = disk[m.filename];
[httpe] = calistir("ob_t_proj", m).sonuc;
httpe.statusCode = 200; httpe.payload = [{ id: PID, name: "Redington", identifier: "REEM", archived_at: null, member_role: 15 }];
[anlikOku] = calistir("ob_t_isle", httpe).sonuc;
kontrol(anlikOku && /projeler\/1111.*\.json$/.test(anlikOku.filename), "kayitli proje secili, anlik goruntu okunur");
anlikOku.payload = disk[anlikOku.filename];
view = calistir("ob_t_tablo", anlikOku).sonuc;
kontrol(view.submission.proje === PID && view.submission.tablo.length === 5 && view.submission.tablo.filter(t => t.yeni).length === 2, "5 madde, 2'si YENI");
kontrol(/Onay bekleyen \(F_TS Approval Awaiting\): <b>2<\/b>/.test(view.submission.durum) && /Son mail: .*bot@ornek\.com/.test(view.submission.durum), "ozet: bekleyen sayisi + son mail");

console.log("5b) mail hatasi");
calistir("ob_mail_hata", { obMail: { alici: "bot@ornek.com", adet: 2, kimlik: "REEM" }, error: { message: "An error occurred trying to retrieve the token." } });
kontrol(flowDepo.orbitSonMail.durum === "hata", "mail dosyasi yazilamadi: hata kaydedilir");
m = calistir("ob_t_ac", {}).sonuc; m.payload = disk[m.filename];
[httpe] = calistir("ob_t_proj", m).sonuc; httpe.statusCode = 200; httpe.payload = [{ id: PID, name: "Redington", identifier: "REEM", archived_at: null, member_role: 15 }];
[anlikOku] = calistir("ob_t_isle", httpe).sonuc; anlikOku.payload = disk[anlikOku.filename];
kontrol(/SIRAYA ALINAMADI/.test(calistir("ob_t_tablo", anlikOku).sonuc.submission.durum), "sayfa ozetinde mail hatasi gorunur");

console.log("5c) Kurulum ve Mail sayfasi");
let k = calistir("ob_k_ac", {}).sonuc;
kontrol(k.filename === "/internal-storage-files/orbit/outlook-gonderici.durum.json", "sayfa yardimcinin nabiz dosyasini okur");
k.payload = "";                                                     // catch_bos: dosya yok
let ks = calistir("ob_k_goster", k).sonuc.submission;
kontrol(/hi&#231; &#231;al&#305;&#351;mam&#305;&#351;/.test(ks.yardimciDurum), "nabiz yok: 'hic calismamis' uyarisi");
const indirilen = (f) => Buffer.from(f[0].url.split(",")[1], "base64").toString("utf8");
kontrol(indirilen(ks.gondericiDosyasi) === fs.readFileSync(path.join(KOK, "outlook-gonderici.ps1"), "utf8") &&
        indirilen(ks.kurulumDosyasi) === fs.readFileSync(path.join(KOK, "orbit-mail-kurulum.ps1"), "utf8") &&
        ks.gondericiDosyasi[0].originalName === "outlook-gonderici.ps1", "indirilen iki dosya depodaki betiklerle birebir ayni");
k = calistir("ob_k_ac", {}).sonuc;
k.payload = "﻿" + JSON.stringify({ zaman: new Date().toISOString(), bilgisayar: "PC1", outlook: "acik", gonderilen: 2, hata: 0, son: "[Orbit] REEM -> a@ornek.com", bekleyen: 0 });
ks = calistir("ob_k_goster", k).sonuc.submission;
kontrol(/&#231;al&#305;&#351;&#305;yor/.test(ks.yardimciDurum) && /orbit-tamam/.test(ks.yardimciDurum) && /PC1/.test(ks.yardimciDurum), "taze nabiz + Outlook acik: 'calisiyor' (BOM'a ragmen)");
k = calistir("ob_k_ac", {}).sonuc;
k.payload = JSON.stringify({ zaman: new Date(Date.now() - 30 * 60000).toISOString(), bilgisayar: "PC1", outlook: "kapali", gonderilen: 0, hata: 0, son: "", bekleyen: 3 });
ks = calistir("ob_k_goster", k).sonuc.submission;
kontrol(/30 dakikad&#305;r sessiz/.test(ks.yardimciDurum) && /orbit-uyari/.test(ks.yardimciDurum), "eski nabiz: 'dakikadir sessiz' uyarisi");

console.log("5d) gecici ag hatasi");
let ag = { url: "https://orbit/x", method: "GET", obProje: { id: PID }, error: { message: "RequestError: connect ENETUNREACH 20.86.49.173:443", source: { id: "ob_http_is" } } };
let [agHata, agTekrar] = calistir("ob_ag", ag).sonuc;
kontrol(!agHata && agTekrar.obAgHedef === "ob_http_is" && !agTekrar.error, "ENETUNREACH: yeniden denenir");
const yon = calistir("ob_ag_yon", agTekrar).sonuc;
kontrol(yon[D.ob_ag_yon.wires.findIndex(w => w[0] === "ob_http_is")] === agTekrar && yon.filter(Boolean).length === 1, "ayni http dugumune (ob_http_is) geri gonderilir");
agTekrar.error = { message: "connect ENETUNREACH", source: { id: "ob_http_is" } }; calistir("ob_ag", agTekrar);
agTekrar.error = { message: "connect ENETUNREACH", source: { id: "ob_http_is" } };
[agHata, agTekrar] = calistir("ob_ag", agTekrar).sonuc;
kontrol(!agHata && agTekrar.obAgDeneme === 3, "3. denemeye kadar tekrar");
agTekrar.error = { message: "connect ENETUNREACH", source: { id: "ob_http_is" } };
[agHata, agTekrar] = calistir("ob_ag", agTekrar).sonuc;
kontrol(agHata && !agTekrar, "4. hatada vazgecilir -> hata yaniti");
[agHata] = calistir("ob_ag", { error: { message: "OTURUM: Orbit oturumu sona erdi", source: { id: "ob_l5" } } }).sonuc;
kontrol(!!agHata, "kalici hata (oturum) tekrar denenmez");

console.log("6) oturum biter");
let h = calistir("ob_l2", Object.assign({ statusCode: 401, payload: { detail: "x" }, obProje: { id: PID } }, FORM));
kontrol(h.hata && flowDepo.orbitOturum === null && /yeniden giris/.test(h.catchSonuc.messages.mesaj), "401: oturum silinir, kullaniciya soylenir");
r = calistir("ob_l1", Object.assign({ payload: { data: { proje: PID } } }, FORM)).sonuc;
kontrol(r[0] === null && /Orbit Giris/.test(r[1].messages.mesaj), "oturumsuz Listele: once giris");
kontrol(calistir("ob_z", {}).sonuc === null, "oturumsuz zamanlayici durur");
m = calistir("ob_t_ac", {}).sonuc; m.payload = disk[m.filename];
[httpe, dogrudan] = calistir("ob_t_proj", m).sonuc;
[anlikOku] = calistir("ob_t_isle", dogrudan).sonuc;
anlikOku.payload = disk[anlikOku.filename];
view = calistir("ob_t_tablo", anlikOku).sonuc;
kontrol(httpe === null && view.submission.tablo.length === 5 && /oturumu yok/.test(view.submission.durum), "oturumsuz acilis: son liste yine gorunur");

console.log(hatalar ? "\n" + hatalar + " HATA" : "\nHepsi gecti.");
process.exit(hatalar ? 1 : 0);
