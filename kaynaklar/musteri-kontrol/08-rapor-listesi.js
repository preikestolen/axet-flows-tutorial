// "Raporlar" sayfasi acilirken (form onInitForm cikisi): kalici rapor listesini
// (raporlar.jsonl, file in ile okundu) secim kutusuna doldurur.
//
// msg.onInitPopulateFormStructure = { <bilesen anahtari>: [{label, value}] }
// aXet'in kendi sablonlarinda (Apply Auth App) kullanilan mekanizma.

const liste = [];
for (const satir of String(msg.payload || "").split(/\r?\n/)) {
  if (!satir.trim()) continue;
  try { liste.push(JSON.parse(satir)); } catch (e) {}
}

const secenekler = liste.map(r => ({
  label: r.ad + "  --  " + r.ozet,
  value: r.id
}));

msg.onInitPopulateFormStructure = { rapor: secenekler };
msg.onInitSubmission = {};

node.status({ fill: "blue", shape: "dot", text: secenekler.length + " rapor listelendi" });
return msg;
