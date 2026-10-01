// Bir konsey ajani hata verirse (ajan dugumunun 2. cikisi -> 3 sn bekle -> burasi).
//
// Ajan hatalari cogu zaman gecici: gercek kosuda "Mastra API error 500:
// Agent execution failed - Bad Gateway" geldi (Ders 8.7). Ayni prompt'u ayni
// ajana en fazla 2 kez daha gonderiyoruz; olmazsa konsey dagilir.
//
// Cikislar (03 ile ayni): 1 muhendis | 2 pazarlamaci | 3 sair | 4 baskan | 5 hata

const ENFAZLA = 3;   // toplam deneme (ilk + 2 yeniden)
const k = msg.konsey || {};
const metin = (msg.error && (msg.error.message || msg.error.code)) || "bilinmeyen ajan hatasi";

k.deneme = (k.deneme || 1) + 1;
if (k.sonPrompt && k.sonHedef !== undefined && k.deneme <= ENFAZLA) {
  node.warn("Konsey ajani hata verdi, yeniden deneniyor (" + k.deneme + "/" + ENFAZLA + "): " + metin);
  delete msg.error;
  msg.payload = k.sonPrompt;
  node.status({ fill: "yellow", shape: "ring", text: "yeniden " + k.deneme + "/" + ENFAZLA });
  const cikis = [null, null, null, null, null];
  cikis[k.sonHedef] = msg;
  return cikis;
}

msg.hata = metin + " (" + ENFAZLA + " deneme)";
node.status({ fill: "red", shape: "dot", text: "vazgecildi" });
return [null, null, null, null, msg];
