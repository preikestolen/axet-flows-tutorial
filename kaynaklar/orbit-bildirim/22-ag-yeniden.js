// Orbit'e giden bir http istegi ag hatasiyla dustu mu (ENETUNREACH, ETIMEDOUT...)?
// Gercek kosuda bir kez "connect ENETUNREACH" goruldu; hemen sonraki deneme 200 dondu.
// Gecici ag hatasi + en fazla 3 deneme -> 5 sn bekle, ayni http dugumune tekrar (23).
// Cikis 1 -> hata yaniti (16-hata.js)   -- kalici hata ya da deneme bitti
// Cikis 2 -> 5 sn bekle -> 23-ag-yonlendir.js

const GECICI = /ENETUNREACH|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ESOCKETTIMEDOUT|EHOSTUNREACH|socket hang up|timed out/i;
const kaynak = msg.error && msg.error.source && msg.error.source.id;
const metin = (msg.error && msg.error.message) || "";
msg.obAgDeneme = (msg.obAgDeneme || 0) + 1;

if (/^ob_http_/.test(kaynak || "") && GECICI.test(metin) && msg.obAgDeneme <= 3) {
  msg.obAgHedef = kaynak;
  node.status({ fill: "yellow", shape: "ring", text: "ag hatasi, tekrar " + msg.obAgDeneme + "/3: " + metin.slice(0, 30) });
  delete msg.error;
  return [null, msg];
}
return [msg, null];
