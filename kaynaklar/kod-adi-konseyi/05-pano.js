// "Isim Panosu" sayfasi acilirken: pano.jsonl'i okur, puana gore siralar
// (esitlikte once gelen ustte), datagrid'e basar.

const kayitlar = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { const k = JSON.parse(satir); if (k && k.kodAdi) kayitlar.push(k); } catch (e) {}
}
kayitlar.sort((x, y) => (y.puan - x.puan) || String(x.zaman).localeCompare(String(y.zaman)));

const AD = { muhendis: "Alayci Muhendis", pazarlamaci: "Abartili Pazarlamaci", sair: "Dramatik Sair" };
const MADALYA = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

function yerel(iso) {
  try { return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return iso; }
}

let tablo = kayitlar.map((k, i) => ({
  sira: (MADALYA[i] ? MADALYA[i] + " " : "") + (i + 1),
  kodAdi: k.kodAdi,
  puan: String(k.puan),
  karakter: AD[k.karakter] || k.karakter,
  proje: k.proje,
  zaman: yerel(k.zaman)
}));
if (!tablo.length) tablo = [{ sira: "", kodAdi: "Pano bos -- ilk ismi Konsey sayfasindan sen al!", puan: "", karakter: "", proje: "", zaman: "" }];

msg.submission = { tablo: tablo };
node.status({ fill: "blue", shape: "dot", text: kayitlar.length + " isim" });
return msg;
