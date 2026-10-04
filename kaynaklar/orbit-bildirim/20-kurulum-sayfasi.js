// "Kurulum ve Mail" sayfasi acilirken:
//  1) yardimci (outlook-gonderici.ps1) en son ne zaman calisti? -> orbit/outlook-gonderici.durum.json
//  2) indirilecek iki dosya (salt okunur File bilesenleri): gonderici + kurulum betigi.
//     Betikler akis-uret.py tarafindan base64 olarak buraya gomulur (__..._B64__).
// Girdi: msg.payload = durum dosyasi icerigi ya da "" (dosya yok)

const GONDERICI_B64 = "__GONDERICI_B64__";
const KURULUM_B64 = "__KURULUM_B64__";

let d = null;
try { d = msg.payload ? JSON.parse(String(msg.payload).replace(/^﻿/, "")) : null; } catch (e) { d = null; }
msg.payload = null;

let durum;
if (!d) {
  durum = kutu("uyari", "<b>Mail yard&#305;mc&#305;s&#305; hi&#231; &#231;al&#305;&#351;mam&#305;&#351;.</b> " +
    "A&#351;a&#287;&#305;daki iki dosyay&#305; indirip uygulaman&#305;n &#231;al&#305;&#351;t&#305;&#287;&#305; bilgisayarda kurun. " +
    "Kurulana kadar mailler kuyrukta bekler, kaybolmaz.");
} else {
  const dk = Math.round((Date.now() - new Date(d.zaman).getTime()) / 60000);
  const canli = dk <= 2;
  const satirlar = [
    (canli ? "<b>Mail yard&#305;mc&#305;s&#305; &#231;al&#305;&#351;&#305;yor.</b>" : "<b>Mail yard&#305;mc&#305;s&#305; " + dk + " dakikad&#305;r sessiz</b> (bilgisayar kapal&#305; ya da yard&#305;mc&#305; durmu&#351; olabilir).") +
      " Son nab&#305;z: " + yerel(d.zaman, true) + ", bilgisayar: " + esc(d.bilgisayar) + ".",
    "Outlook: " + (d.outlook === "acik" ? "a&#231;&#305;k" : "<b>kapal&#305;</b> (mail gelince yard&#305;mc&#305; a&#231;may&#305; dener; oturumu a&#231;&#305;k klasik Outlook gerekir)") +
      " &middot; Bu oturumda g&#246;nderilen: " + esc(d.gonderilen) + " &middot; Hata: " + esc(d.hata) + " &middot; Kuyrukta bekleyen: " + esc(d.bekleyen) + ".",
    d.son ? "Son g&#246;nderilen: " + esc(d.son) : ""
  ].filter(Boolean);
  durum = kutu(canli && d.outlook === "acik" ? "tamam" : "uyari", satirlar.join("<br>"));
}

const dosya = (ad, b64) => [{
  storage: "base64", name: ad, originalName: ad, size: Math.round(b64.length * 3 / 4), type: "text/plain",
  url: "data:text/plain;base64," + b64
}];
msg.submission = {
  yardimciDurum: durum,
  gonderici: '<div class="indirme-kutu">1) <b>outlook-gonderici.ps1</b> &mdash; mailleri Outlook ile g&#246;nderen yard&#305;mc&#305;. &#304;ndirmek i&#231;in a&#351;a&#287;&#305;daki dosya ad&#305;na t&#305;klay&#305;n.</div>',
  gondericiDosyasi: dosya("outlook-gonderici.ps1", GONDERICI_B64),
  kurulum: '<div class="indirme-kutu">2) <b>orbit-mail-kurulum.ps1</b> &mdash; yard&#305;mc&#305;y&#305; G&#246;rev Zamanlay&#305;c&#305;\'ya ekler (oturum a&#231;&#305;l&#305;nca ba&#351;lar). &#304;ndirmek i&#231;in a&#351;a&#287;&#305;daki dosya ad&#305;na t&#305;klay&#305;n.</div>',
  kurulumDosyasi: dosya("orbit-mail-kurulum.ps1", KURULUM_B64)
};
msg.onInitSubmission = msg.submission;
node.status({ fill: d ? "green" : "yellow", shape: "dot", text: d ? "yardimci nabzi " + yerel(d.zaman, true) : "yardimci hic calismamis" });
return msg;
