// "Raporlar" sayfasinda Indir dugmesi: secilen raporu indirme baglantisina cevirir.
// Cikis 1 -> indirme-bagi-olustur -> view action, Cikis 2 -> (rapor yok) view action

const veri = (msg.payload && msg.payload.data) || (msg.submission && msg.submission.data) || {};
const secilen = veri.rapor;
const liste = flow.get("raporlar") || [];
const r = liste.find(x => x.id === String(secilen));

if (!r) {
  msg.messages = { mesaj: "Rapor bulunamadi. Uygulama yeniden baslatildiysa eski raporlar silinmis olabilir; dosyayi tekrar yukleyin." };
  delete msg.indirilecek;
  node.status({ fill: "yellow", shape: "ring", text: "rapor yok: " + secilen });
  return [null, msg];                                   // dogrudan view action (mesaj)
}

msg.indirilecek = { data: r.icerik, ad: r.ad };                // -> ortak/indirme-bagi-olustur.js
msg.messages = { mesaj: r.ozet + "." };
node.status({ fill: "green", shape: "dot", text: r.ad });
return [msg, null];                                     // -> indirme baglantisi -> view action
