// "Raporlar" sayfasinda Indir dugmesi: secilen raporu tarayiciya gonderir.

const veri = (msg.payload && msg.payload.data) || (msg.submission && msg.submission.data) || {};
const secilen = veri.rapor;
const liste = flow.get("raporlar") || [];
const r = liste.find(x => x.id === String(secilen));

if (!r) {
  msg.messages = { mesaj: "Rapor bulunamadi. Uygulama yeniden baslatildiysa eski raporlar silinmis olabilir; dosyayi tekrar yukleyin." };
  delete msg.downloadFileSubmission;
  node.status({ fill: "yellow", shape: "ring", text: "rapor yok: " + secilen });
  return msg;
}

msg.downloadFileSubmission = { data: r.icerik, fileName: r.ad, inputType: "buffer" };
msg.messages = { mesaj: r.ad + " indiriliyor (" + r.ozet + ")." };
node.status({ fill: "green", shape: "dot", text: r.ad });
return msg;
