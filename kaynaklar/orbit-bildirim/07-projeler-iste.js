// Sayfa acilisi: kayitli secim (secim.json icerigi ya da "") -> msg.obSecim.
// Cikis 1 -> oturum var: GET projects/ (kullanicinin uye oldugu projeler)
// Cikis 2 -> oturum yok: projeler okunamaz; secim + son anlik goruntu yine gosterilir

let secim = null;
try { secim = msg.payload ? JSON.parse(msg.payload) : null; } catch (e) { secim = null; }
msg.obSecim = secim && secim.id ? secim : null;
delete msg.statusCode;

if (!oturum()) return [null, msg];
getIstegi(msg, API + "projects/");
return [msg, null];
