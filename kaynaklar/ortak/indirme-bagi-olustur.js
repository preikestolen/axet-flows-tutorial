// Indirilecek dosyayi sayfada KALICI duran bir indirme kutusuna cevirir:
//   <a href="data:<tur>;base64,<veri>" download="<dosya>">
//
// Neden data: baglantisi:
//  1. aXet'in view action indirmesi (downloadFileSubmission) tarayicida tipsiz
//     bir Blob'u, sayfaya eklenmemis bir <a> ile tikliyor; Edge ".tmp" kaydediyor.
//  2. Kendi "http in" ucumuz da olmuyor: aXet http in'leri uygulama oturumuyla
//     dogruluyor ve Okta yolunda kendi kodu cokuyor (logger is not defined).
// Neden uyari kutusunda degil de sayfada:
//  3. aXet uyarilari 10 sn sonra kendiliginden siliniyor (DeptAppsAlerts.addAlert:
//     `if (alert !== 'danger')` nesneyi metinle karsilastiriyor). Baglanti formdaki
//     gizli bir alana (varsayilan "indirme") yazilir; ayni formdaki htmlelement
//     onu `{{ data.indirme }}` ile gosterir.
//
// Girdi : msg.indirilecek = { data: Buffer, ad: "dosya.xlsx" }
//         msg.messages.mesaj  (kutudaki aciklama, duz metin)
//         msg.indirmeAlani    (istege bagli, formdaki gizli alanin anahtari)
// Cikti : msg.submission[alan] = HTML kutu  (view action "update" forma basar)

const k = msg.indirilecek;
if (!k || !k.data) { node.error("indirilecek dosya yok", msg); return null; }

const esc = (s) => String(s === undefined || s === null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const buf = Buffer.isBuffer(k.data) ? k.data : Buffer.from(k.data);
const tur = /\.xlsx$/i.test(k.ad)
  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  : "application/octet-stream";
const dosya = String(k.ad).replace(/[^A-Za-z0-9._-]/g, "_");
const aciklama = (msg.messages && msg.messages.mesaj) || "Dosya hazir.";

const html =
  '<div class="indirme-kutu">' +
    '<span class="indirme-metin">' + esc(aciklama) + '</span> ' +
    '<a class="indirme-bag" href="data:' + tur + ';base64,' + buf.toString("base64") + '" download="' + esc(dosya) + '">' +
      '⬇️ ' + esc(dosya) + '</a>' +
  '</div>';

const alan = msg.indirmeAlani || "indirme";
const mevcut = (msg.submission && typeof msg.submission === "object")
  ? (msg.submission.data && typeof msg.submission.data === "object" ? msg.submission.data : msg.submission)
  : {};
msg.submission = Object.assign({}, mevcut);
msg.submission[alan] = html;

delete msg.indirilecek;
delete msg.downloadFileSubmission;     // aXet'in kendi (hatali) indirmesi devre disi

node.status({ fill: "green", shape: "dot", text: k.ad + " (" + Math.round(buf.length / 1024) + " KB)" });
return msg;
