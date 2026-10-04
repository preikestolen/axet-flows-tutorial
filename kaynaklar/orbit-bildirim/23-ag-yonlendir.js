// Ag hatasindan sonra: msg'yi dusen http dugumune geri yollar (url/method/headers msg'de duruyor).
// Cikis sirasi akis-uret.py'deki HTTP_DUGUMLERI ile ayni olmali.

const SIRA = __HTTP_DUGUMLERI__;
const i = SIRA.indexOf(msg.obAgHedef);
if (i < 0) { node.error("bilinmeyen http dugumu: " + msg.obAgHedef, msg); return null; }
const cikis = SIRA.map(() => null);
cikis[i] = msg;
return cikis;
