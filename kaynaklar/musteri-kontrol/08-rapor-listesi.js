// "Raporlar" sayfasi acilirken (form dugumunun son cikisi: onInitForm) calisir.
// Bellekteki raporlari secim kutusuna doldurur.
//
// msg.onInitPopulateFormStructure = { <bilesen anahtari>: [{label, value}] }
// aXet'in kendi sablonlarinda (Apply Auth App) kullanilan mekanizma.

const liste = flow.get("raporlar") || [];

const secenekler = liste.map(r => ({
  label: r.ad + "  --  " + r.ozet,
  value: r.id
}));

msg.onInitPopulateFormStructure = { rapor: secenekler };
msg.onInitSubmission = {};

node.status({ fill: "blue", shape: "dot", text: secenekler.length + " rapor listelendi" });
return msg;
