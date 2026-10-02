// "Raporlar" sayfasinda Indir dugmesi: secilen raporu kalici listeden
// (raporlar.jsonl, file in ile okundu -> msg.payload) bulur, dosyasini okumaya yollar.
// Cikis 1 -> rapor xlsx'ini oku (file in, msg.filename) -> indirme baglantisi -> view action
// Cikis 2 -> (rapor yok) view action

const secilen = msg.secilenRapor;          // file in payload'i ezmeden once saklandi (akis-uret.py: "secimi sakla")

const liste = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { liste.push(JSON.parse(satir)); } catch (e) {}
}
const r = liste.find(x => x.id === String(secilen));

if (!r) {
  msg.messages = { mesaj: "Rapor bulunamadi. Listeden bir rapor secin; liste son 20 raporu tutar." };
  delete msg.indirilecek;
  node.status({ fill: "yellow", shape: "ring", text: "rapor yok: " + secilen });
  return [null, msg];
}

msg.filename = r.yol;
msg.indirmeRaporu = { ad: r.ad, ozet: r.ozet };
node.status({ fill: "green", shape: "dot", text: r.ad });
return [msg, null];
