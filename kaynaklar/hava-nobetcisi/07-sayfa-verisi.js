// Hava Nobetcisi menusundeki dort sayfanin (Ozet / Okumalar / Uyarilar /
// Hatalar) acilisinda calisir. Excel'deki ayni adli sayfanin satirlarini
// uretir ve sayfadaki tabloya (datagrid, anahtari "tablo") basar.
//
// Hangi sayfa oldugu msg.hvSayfa'da (form'un onInit cikisindaki kucuk
// isaret dugumu koyar).
//
// view action "update" yaniti, msg.submission'daki alanlari forma doldurur:
// { tablo: [ {kolon: deger}, ... ] }   (aXet on yuz: initSubmission = response.submission)

const kayitlar = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { kayitlar.push(JSON.parse(satir)); } catch (e) {}
}

function yerel(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return iso; }
}
const isaretli = (f) => (f > 0 ? "+" : "") + f;
const kaynakAdi = (k) => k.kaynak === "zamanlayici" ? "otomatik" : (k.kaynak || "");
const S = (v) => (v === null || v === undefined) ? "" : String(v);

const okumalar = kayitlar.filter(k => k.tip === "okuma");
const hatalar = kayitlar.filter(k => k.tip === "hata");
const uyarilar = okumalar.filter(k => k.uyari);
const otomatik = okumalar.filter(k => k.kaynak === "zamanlayici").length;
const son = okumalar[okumalar.length - 1];

let tablo;
switch (msg.hvSayfa) {
  case "ozet":
    tablo = [
      { bilgi: "Otomatik okuma sayisi", deger: otomatik + (otomatik >= 3 ? "  (kabul kriteri en az 3: TAMAM)" : "  (kabul kriteri: en az 3)") },
      { bilgi: "Toplam okuma", deger: S(okumalar.length) },
      { bilgi: "Uyari", deger: S(uyarilar.length) },
      { bilgi: "Servis hatasi", deger: S(hatalar.length) },
      { bilgi: "Son okuma", deger: son ? yerel(son.zaman) + "  --  " + son.sicaklik + " C, " + son.ruzgar + " km/s" : "Henuz okuma yok" },
      { bilgi: "Zamanlayici", deger: "saatte bir (3600 sn)" },
      { bilgi: "Uyari esigi", deger: "onceki okumaya gore 3 C'den fazla" }
    ];
    break;

  case "okumalar":                                       // en yeni ustte
    tablo = okumalar.map((k, i) => ({
      no: S(i + 1), zaman: yerel(k.zaman), sicaklik: k.sicaklik + " C", ruzgar: k.ruzgar + " km/s",
      fark: k.fark === null || k.fark === undefined ? "-" : isaretli(k.fark) + " C" + (k.uyari ? "  UYARI" : ""),
      kaynak: kaynakAdi(k)
    })).reverse();
    if (!tablo.length) tablo = [{ no: "", zaman: "Henuz okuma yok", sicaklik: "", ruzgar: "", fark: "", kaynak: "" }];
    break;

  case "uyarilar":
    tablo = uyarilar.map(k => ({
      zaman: yerel(k.zaman), yon: k.fark > 0 ? "YUKSELIS" : "DUSUS",
      onceki: k.onceki + " C", simdiki: k.sicaklik + " C", fark: isaretli(k.fark) + " C", kaynak: kaynakAdi(k)
    })).reverse();
    if (!tablo.length) tablo = [{ zaman: "Henuz uyari yok (3 C'den buyuk degisim olmadi)", yon: "", onceki: "", simdiki: "", fark: "", kaynak: "" }];
    break;

  case "hatalar":
    tablo = hatalar.map(k => ({
      zaman: yerel(k.zaman), hata: S(k.mesaj), deneme: S(k.deneme),
      tur: k.gecici ? "gecici" : "kalici", kaynak: kaynakAdi(k)
    })).reverse();
    if (!tablo.length) tablo = [{ zaman: "Hata yok", hata: "", deneme: "", tur: "", kaynak: "" }];
    break;

  default:
    node.error("Bilinmeyen sayfa: " + msg.hvSayfa, msg);
    return null;
}

msg.submission = { tablo: tablo };
node.status({ fill: "blue", shape: "dot", text: msg.hvSayfa + ": " + tablo.length + " satir" });
return msg;
