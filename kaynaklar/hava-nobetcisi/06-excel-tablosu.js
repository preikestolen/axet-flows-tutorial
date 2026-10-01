// Tum kayitlardan dort sayfali Excel kurar (json-to-excel, Ders 10.1):
//   Okumalar  -- her okuma bir satir (en yeni en altta)
//   Uyarilar  -- onceki okumaya gore 3 C'den fazla degisim
//   Hatalar   -- servis cevap vermediginde
//   Ozet      -- kabul kriteri icin: otomatik satir sayisi vb.

const KIRMIZI = { fontColor: "9C0006", fill: "FFC7CE" };
const MAVI    = { fontColor: "1F4E79", fill: "DDEBF7" };
const BASLIK  = { bold: true };

function yerel(iso) {     // UTC ISO -> Istanbul saati, "01.10.2026 16:30"
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return iso; }
}

const kayitlar = msg.kayitlar || [];
const okumalar = kayitlar.filter(k => k.tip === "okuma");
const hatalar = kayitlar.filter(k => k.tip === "hata");

const okumaSayfasi = okumalar.map((k, i) => ({
  "No": i + 1,
  "Okuma zamani": yerel(k.zaman),
  "Olcum zamani (servis)": k.olcumZamani || "",
  "Sicaklik (C)": k.sicaklik,
  "Ruzgar (km/s)": k.ruzgar,
  "Fark (C)": k.fark === null || k.fark === undefined ? "" : (k.uyari ? { value: k.fark, style: KIRMIZI } : k.fark),
  "Kaynak": k.kaynak === "zamanlayici" ? "otomatik" : (k.kaynak || "")
}));

const uyariSayfasi = okumalar.filter(k => k.uyari).map(k => ({
  "Okuma zamani": yerel(k.zaman),
  "Onceki (C)": k.onceki,
  "Simdiki (C)": k.sicaklik,
  "Fark (C)": { value: k.fark, style: KIRMIZI },
  "Yon": k.fark > 0 ? "YUKSELIS" : "DUSUS",
  "Kaynak": k.kaynak === "zamanlayici" ? "otomatik" : (k.kaynak || "")
}));
if (uyariSayfasi.length === 0) uyariSayfasi.push({ "Okuma zamani": "Henuz 3 C'den buyuk degisim yok", "Onceki (C)": "", "Simdiki (C)": "", "Fark (C)": "", "Yon": "", "Kaynak": "" });

const hataSayfasi = hatalar.map(k => ({
  "Zaman": yerel(k.zaman),
  "Hata": k.mesaj,
  "Deneme": k.deneme,
  "Gecici mi": k.gecici ? "evet" : "hayir",
  "Kaynak": k.kaynak === "zamanlayici" ? "otomatik" : (k.kaynak || "")
}));
if (hataSayfasi.length === 0) hataSayfasi.push({ "Zaman": "Hata yok", "Hata": "", "Deneme": "", "Gecici mi": "", "Kaynak": "" });

const otomatik = okumalar.filter(k => k.kaynak === "zamanlayici").length;
const son = okumalar[okumalar.length - 1];
const ozet = [
  { "Bilgi": { value: "Otomatik okuma sayisi", style: BASLIK }, "Deger": otomatik >= 3 ? { value: otomatik, style: MAVI } : otomatik },
  { "Bilgi": { value: "Toplam okuma", style: BASLIK }, "Deger": okumalar.length },
  { "Bilgi": { value: "Uyari", style: BASLIK }, "Deger": okumalar.filter(k => k.uyari).length },
  { "Bilgi": { value: "Servis hatasi", style: BASLIK }, "Deger": hatalar.length },
  { "Bilgi": { value: "Son okuma", style: BASLIK }, "Deger": son ? yerel(son.zaman) + " -- " + son.sicaklik + " C, " + son.ruzgar + " km/s" : "-" },
  { "Bilgi": { value: "Zamanlayici", style: BASLIK }, "Deger": "saatte bir (3600 sn)" },
  { "Bilgi": { value: "Uyari esigi", style: BASLIK }, "Deger": "onceki okumaya gore 3 C'den fazla" }
];

msg.payload = { data: { "Okumalar": okumaSayfasi, "Uyarilar": uyariSayfasi, "Hatalar": hataSayfasi, "Ozet": ozet } };
msg.filename = "/internal-storage-files/hava/hava-nobetcisi.xlsx";

node.status({ fill: "blue", shape: "dot", text: okumalar.length + " okuma, " + otomatik + " otomatik" });
return msg;
