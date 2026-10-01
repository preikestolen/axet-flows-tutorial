// "Konsey" sayfasindaki "Konseyi topla" dugmesi. Proje metnini dogrular.
// Cikis 1 -> pano (onceki isimler) okunur, konsey toplanir
// Cikis 2 -> girdi gecersiz: dogrudan uyari (view action) -- AI'a gitmez

const veri = (msg.payload && msg.payload.data) || (msg.submission && msg.submission.data) || msg.submission || {};
const proje = String(veri.proje || "").replace(/\s+/g, " ").trim();

function uyar(metin) {
  msg.messages = { mesaj: metin };
  msg.submission = { proje: proje, sahne: '<div class="konsey-uyari">\u26A0\uFE0F ' + metin + '</div>' };
  return [null, msg];
}
if (proje.length < 15) return uyar("Konsey bos bir dosyayla toplanmaz. Projeni en az bir-iki cumleyle anlat.");
if (proje.length > 400) return uyar("Konsey sabirsizdir: projeni en fazla 400 karakterde, iki cumleyle anlat (" + proje.length + " karakter yazdin).");

msg.proje = proje;
node.status({ fill: "blue", shape: "dot", text: proje.slice(0, 30) + "..." });
return [msg, null];
