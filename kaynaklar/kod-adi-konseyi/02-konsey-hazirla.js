// Konseyi kurar: oturuma ozel ilham konulari secer, panodaki isimleri
// "yasakli" listesine alir. Sonra 03-sonraki-konusmaci.js ilk konusmaciyi cagirir.
//
// Neden ilham + yasak liste: ayni proje icin bile her oturum farkli tonda
// isim ciksin, panoda ayni isim iki kez olmasin. Bicim ise ajanlarin
// Output Schema'si ile sabit kalir.
//
// Girdi: msg.payload = pano.jsonl icerigi (file in) ya da "" (ilk kullanim)

const ILHAM = {
  muhendis: ["eski hata kodlari", "COBOL ve ana bilgisayarlar", "bitmeyen toplantilar", "Unix komutlari", "kahve makinesi",
             "uretimde cuma deploy'u", "yari kalmis dokumantasyon", "legacy kod arkeolojisi", "ag kablosu karmasasi"],
  pazarlamaci: ["uzay yarisi", "luks otomobil reklamlari", "spor finali spikerligi", "Silikon Vadisi lansmanlari",
                "superkahraman filmleri", "moda haftasi", "teleshopping", "olimpiyat tores", "rock konseri"],
  sair: ["deniz ve fener", "kuzey yildizi", "Anadolu masallari", "sonbahar yapraklari", "kayip mektuplar",
         "eski Istanbul vapurlari", "col ve serap", "ay tutulmasi", "goc eden kuslar"]
};
const sec = (a) => a[Math.floor(Math.random() * a.length)];

const pano = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { pano.push(JSON.parse(satir)); } catch (e) {}
}

msg.konsey = {
  proje: msg.proje,
  ilham: { muhendis: sec(ILHAM.muhendis), pazarlamaci: sec(ILHAM.pazarlamaci), sair: sec(ILHAM.sair) },
  yasakli: pano.map(p => p.kodAdi).filter(Boolean).slice(-30),
  konusmalar: [],          // [{ karakter, kodAdi, gerekce }]
  bekleyen: null
};
msg.panoKayitlari = pano;   // 04-karar-isle.js kazananin sirasini bununla hesaplar
msg.payload = null;
node.status({ fill: "blue", shape: "dot", text: "konsey toplaniyor (" + pano.length + " isim panoda)" });
return msg;
