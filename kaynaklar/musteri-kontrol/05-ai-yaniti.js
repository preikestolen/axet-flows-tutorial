// Ajanin iki cikisi da buraya baglidir:
//   1. cikis (basari): msg.payload.response = ozet metni
//   2. cikis (hata):   msg.error = { message, code, details }
//
// AI basarisiz olsa bile rapor Excel'i URETILMELI -- kurallar zaten koddan
// geldi, AI sadece yorum katmani. Bu yuzden hata da rapora devam ediyor.

if (msg.error && !(msg.payload && msg.payload.response)) {
  const m = msg.error.message || String(msg.error);
  msg.aiOzet = "AI ozeti alinamadi (" + m + "). Hata sayilari rapordaki 'Ozet' sayfasinda.";
  node.warn("AI ozeti alinamadi: " + m);
  node.status({ fill: "red", shape: "ring", text: "AI hatasi, rapor yine uretilecek" });
  delete msg.error;                      // asagidaki catch dalini tetiklemesin
} else {
  msg.aiOzet = (msg.payload && msg.payload.response) || String(msg.payload);
  node.status({ fill: "green", shape: "dot", text: "AI ozeti alindi" });
}
return msg;
