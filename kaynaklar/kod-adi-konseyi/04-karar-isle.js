// Baskanin kararini (Output Schema) dogrular, panoya eklenecek kaydi ve
// "Konsey" sayfasinda gosterilecek sahneyi (HTML) uretir.
//
// Model ciktisina guvenmiyoruz: kazananKarakter gecersizse isimden buluruz,
// puan araliga sikistirilir, eksik degerlendirme "(sessiz kaldi)" olur.
// Gorunum bozulmasin diye butun metinler HTML-escape edilir.
//
// Cikis 1 -> pano.jsonl'e eklenecek satir (file, append)  -- sadece kazananlar
// Cikis 3 -> oturumlar/<YYYY-MM-DD>.jsonl (file, append)    -- oturumun TAM kaydi:
//            proje, ilhamlar, uc oneri + gerekceleri, Baskanin notlari, kazanan, puan
// Cikis 2 -> view action: sahne msg.submission.sahne'ye (sayfada kalici kutu),
//            uyari kutusuna kisa ozet (aXet uyarilari 10 sn'de siliniyor)

const AD = { muhendis: "Alayci Muhendis", pazarlamaci: "Abartili Pazarlamaci", sair: "Dramatik Sair" };
const IKON = { muhendis: "\u{1F6E0}\u{FE0F}", pazarlamaci: "\u{1F4E3}", sair: "\u{1F3AD}", baskan: "⚖\u{FE0F}" };
const k = msg.konsey;
const b = msg.payload || {};
const esc = (s) => String(s === undefined || s === null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const sade = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// --- kazanan: once karakter anahtari, olmazsa isim eslesmesi, olmazsa ilk oneri
let kazanan = k.konusmalar.find(x => x.karakter === b.kazananKarakter);
if (!kazanan) kazanan = k.konusmalar.find(x => sade(x.kodAdi) === sade(b.kazanan));
if (!kazanan) kazanan = k.konusmalar.find(x => sade(b.kazanan).includes(sade(x.kodAdi)) && sade(x.kodAdi));
if (!kazanan) { kazanan = k.konusmalar[0]; node.warn("Baskan gecerli bir kazanan vermedi, ilk oneri secildi: " + JSON.stringify(b).slice(0, 200)); }

let puan = Math.round(Number(b.puan));
if (!isFinite(puan)) puan = 50;
puan = Math.max(1, Math.min(100, puan));

const deg = b.degerlendirmeler || {};
const karar = String(b.karar || "Konsey karar verdi.").trim();

const kayit = {
  zaman: new Date().toISOString(),
  kodAdi: kazanan.kodAdi,
  puan: puan,
  karakter: kazanan.karakter,
  proje: k.proje.slice(0, 160),
  karar: karar.slice(0, 500),
  oneriler: k.konusmalar.map(x => ({ karakter: x.karakter, kodAdi: x.kodAdi }))
};

// --- panodaki sira (bu kayit dahil)
const pano = (msg.panoKayitlari || []).concat([kayit]);
pano.sort((x, y) => y.puan - x.puan || x.zaman.localeCompare(y.zaman));
const sira = pano.indexOf(kayit) + 1;

// --- sahne
const kart = (x) =>
  '<div class="konsey-kart konsey-' + x.karakter + (x === kazanan ? ' konsey-kazanan' : '') + '">' +
    '<div class="konsey-kim">' + IKON[x.karakter] + ' ' + esc(AD[x.karakter]) + '</div>' +
    '<div class="konsey-isim">&laquo;' + esc(x.kodAdi) + '&raquo;</div>' +
    '<div class="konsey-gerekce">' + esc(x.gerekce) + '</div>' +
    '<div class="konsey-baskan-notu">' + IKON.baskan + ' ' + esc(deg[x.karakter] || "(Baskan bu uyeye bir sey demedi.)") + '</div>' +
  '</div>';

const sahne =
    '<div class="konsey-sahne">' +
      '<div class="konsey-baslik">Kod Adi Konseyi toplandi</div>' +
      '<div class="konsey-proje">' + esc(k.proje) + '</div>' +
      '<div class="konsey-kartlar">' + k.konusmalar.map(kart).join("") + '</div>' +
      '<div class="konsey-karar">' +
        '<div class="konsey-karar-ust">' + IKON.baskan + ' Baskanin karari</div>' +
        '<div class="konsey-karar-isim">&laquo;' + esc(kazanan.kodAdi) + '&raquo; <span class="konsey-puan">' + puan + '/100</span></div>' +
        '<div class="konsey-karar-metin">' + esc(karar) + '</div>' +
        '<div class="konsey-pano-notu">Isim Panosu\'na eklendi: <b>' + sira + '. sira</b> (' + pano.length + ' isim arasinda).</div>' +
      '</div>' +
    '</div>';
msg.submission = { proje: k.proje, sahne: sahne };
msg.messages = { ozet: "Konsey karar verdi: \u00AB" + kazanan.kodAdi + "\u00BB " + puan + "/100 -- panoda " + sira + ". sira." };

const satir = { filename: "/internal-storage-files/konsey/pano.jsonl", payload: JSON.stringify(kayit) };

const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });   // YYYY-MM-DD
const oturum = {
  filename: "/internal-storage-files/konsey/oturumlar/" + gun + ".jsonl",
  payload: JSON.stringify({
    zaman: kayit.zaman,
    proje: k.proje,
    ilham: k.ilham,
    oneriler: k.konusmalar.map(x => ({ karakter: x.karakter, kodAdi: x.kodAdi, gerekce: x.gerekce, baskanNotu: deg[x.karakter] || "" })),
    kazanan: { kodAdi: kazanan.kodAdi, karakter: kazanan.karakter, puan: puan },
    karar: karar,
    panodakiSira: sira
  })
};
node.status({ fill: "green", shape: "dot", text: kazanan.kodAdi + " " + puan + "/100 -> #" + sira });
return [satir, msg, oturum];
