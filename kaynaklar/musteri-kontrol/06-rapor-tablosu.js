// json-to-excel dugumunun bekledigi sekli kurar (Ders 10.1):
//   msg.payload.data = { "<Sayfa adi>": [ {kolon: deger}, ... ] }
//
// Dort sayfa:
//   Kontrol   -- yuklenen dosyanin TUM satirlari; hatali HUCRE kirmizi,
//                Durum kolonu HATALI/TEMIZ
//   Hatalar   -- her hata bir satir
//   Ozet      -- kural bazinda sayilar (koddan)
//   AI Ozeti  -- ajanin yorumu
//
// AI yorumu ayri bir dosyaya degil, raporun 'AI Ozeti' sayfasina gider.

const KIRMIZI = { fontColor: "9C0006", fill: "FFC7CE" };
const YESIL   = { fontColor: "006100", fill: "C6EFCE" };
const BASLIK  = { bold: true };

const basliklar = msg.basliklar;
const hatalar = msg.hatalar;
const ist = msg.istatistik;
const kuralAdi = msg.kuralAdlari;

// satir -> kolon -> [aciklama]
const harita = {};
for (const h of hatalar) {
  harita[h.satir] = harita[h.satir] || {};
  (harita[h.satir][h.kolon] = harita[h.satir][h.kolon] || []).push(h.aciklama);
}

// --- Kontrol
const kontrol = msg.satirlar.map(s => {
  const hs = harita[s.satir];
  const r = { "Excel Satiri": s.satir };
  for (const b of basliklar) {
    const v = s.degerler[b];
    if (hs && hs[b]) {
      // Bos hucreyi de boyayabilmek icin gorunur bir deger yaziyoruz
      r[b] = { value: String(v).trim() === "" ? "(bos)" : v, style: KIRMIZI };
    } else {
      r[b] = v;
    }
  }
  r["Durum"] = hs ? { value: "HATALI", style: Object.assign({ bold: true }, KIRMIZI) }
                  : { value: "TEMIZ",  style: Object.assign({ bold: true }, YESIL) };
  r["Hata Aciklamasi"] = hs ? Object.values(hs).reduce((a, x) => a.concat(x), []).join(" | ") : "";
  return r;
});

// --- Hatalar
const hataSayfasi = hatalar.map(h => ({
  "Excel Satiri": h.satir,
  "Kolon": h.kolon,
  "Kural": kuralAdi[h.kural],
  "Deger": h.deger.trim() === "" ? "(bos)" : h.deger,
  "Aciklama": h.aciklama
}));
if (hataSayfasi.length === 0) {
  hataSayfasi.push({ "Excel Satiri": "", "Kolon": "", "Kural": "", "Deger": "", "Aciklama": "Hata bulunmadi" });
}

// --- Ozet
const ozet = [
  { "Bilgi": { value: "Dosya", style: BASLIK },         "Deger": ist.dosya || "" },
  { "Bilgi": { value: "Kontrol zamani", style: BASLIK }, "Deger": msg.kosuZamani || "" },
  { "Bilgi": { value: "Toplam satir", style: BASLIK },   "Deger": ist.toplamSatir },
  { "Bilgi": { value: "Hatali satir", style: BASLIK },   "Deger": ist.hataliSatir },
  { "Bilgi": { value: "Temiz satir", style: BASLIK },    "Deger": ist.temizSatir },
  { "Bilgi": { value: "Toplam hata", style: BASLIK },    "Deger": ist.toplamHata },
  { "Bilgi": "", "Deger": "" }
];
for (const k of ist.kuralBazinda) {
  ozet.push({ "Bilgi": k.kural, "Deger": k.adet > 0 ? { value: k.adet, style: KIRMIZI } : 0 });
}
for (const u of ist.dosyaUyarilari) ozet.push({ "Bilgi": "UYARI", "Deger": u });

// --- AI Ozeti (her satir ayri hucre -- Excel'de okunur kalsin)
const NL = String.fromCharCode(10);
const aiSatirlar = String(msg.aiOzet || "").split(NL).map(x => ({ "AI Ozeti (yorum -- sayilar Ozet sayfasindan)": x }));

msg.payload = { data: { "Kontrol": kontrol, "Hatalar": hataSayfasi, "Ozet": ozet, "AI Ozeti": aiSatirlar } };

// Rapor adi: uygulamadaki "Raporlar" sayfasinda ve indirilen dosyada bu ad gorunur.
const t = new Date();
const iki = (n) => String(n).padStart(2, "0");
const damga = t.getFullYear() + iki(t.getMonth() + 1) + iki(t.getDate()) + "-" + iki(t.getHours()) + iki(t.getMinutes()) + iki(t.getSeconds());
const kok = String(ist.dosya || "musteri").replace(/\.xlsx$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_");
msg.raporAdi = damga + "-" + kok + "-RAPOR.xlsx";

node.status({ fill: "blue", shape: "dot", text: kontrol.length + " satir rapora yazildi" });
return msg;
