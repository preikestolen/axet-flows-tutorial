// Gecmisi (JSONL, her satir bir kayit) okur, yeni kaydi ekler.
// Okumaysa bir ONCEKI okumaya gore farki hesaplar; |fark| > 3 C ise uyari.
//
// Neden JSONL + Excel'i her seferinde bastan uretmek: Excel'e "satir eklemek"
// icin dosyayi okuyup cozmek gerekir; JSONL'e eklemek tek satirdir ve bozulmaz.
// Gercek kayit JSONL'dir, Excel onun goruntusudur.
//
// Cikis 1 -> JSONL'e eklenecek satir (file, append)
// Cikis 2 -> tum kayitlar (Excel uretimi)

const ESIK = 3;   // derece

const kayitlar = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { kayitlar.push(JSON.parse(satir)); }
  catch (e) { node.warn("Bozuk gecmis satiri atlandi: " + satir.slice(0, 80)); }
}

const k = msg.yeniKayit;
if (!k) { node.error("yeniKayit yok", msg); return null; }

if (k.tip === "okuma") {
  const onceki = kayitlar.filter(x => x.tip === "okuma").pop();
  if (onceki) {
    k.onceki = onceki.sicaklik;
    k.fark = Math.round((k.sicaklik - onceki.sicaklik) * 10) / 10;
    k.uyari = Math.abs(k.fark) > ESIK;
  } else {
    k.onceki = null;
    k.fark = null;
    k.uyari = false;
  }
}
kayitlar.push(k);

const satirMsg = { filename: "/internal-storage-files/hava/okumalar.jsonl", payload: JSON.stringify(k) };

msg.kayitlar = kayitlar;
msg.payload = null;

const okumaSayisi = kayitlar.filter(x => x.tip === "okuma").length;
node.status(k.tip === "okuma"
  ? { fill: k.uyari ? "yellow" : "green", shape: "dot", text: "#" + okumaSayisi + " " + k.sicaklik + " C" + (k.fark !== null ? " (" + (k.fark > 0 ? "+" : "") + k.fark + ")" : "") + (k.uyari ? " UYARI" : "") }
  : { fill: "red", shape: "ring", text: "hata kaydedildi" });

return [satirMsg, msg];
