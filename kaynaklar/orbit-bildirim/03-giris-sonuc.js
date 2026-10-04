// sign-in yaniti: hata adresi mi, oturum cerezi mi?
// Cikis 1 -> GET /api/users/me/ (cerez gercekten calisiyor mu)
// Cikis 2 -> giris reddedildi: uyari (view action)

msg.payload = null;                    // istek govdesi (sifre) msg'de kalmasin
const yer = String((msg.headers && (msg.headers.location || msg.headers.Location)) || "");

const HATA = {
  AUTHENTICATION_FAILED_SIGN_IN: "E-posta ya da sifre hatali.",
  USER_DOES_NOT_EXIST: "Bu e-postayla Orbit kullanicisi yok.",
  USER_ACCOUNT_DEACTIVATED: "Orbit hesabi devre disi.",
  INVALID_EMAIL_SIGN_IN: "E-posta gecersiz.",
  REQUIRED_EMAIL_PASSWORD_SIGN_IN: "E-posta ve sifre gerekli.",
  RATE_LIMIT_EXCEEDED: "Cok fazla deneme; biraz sonra tekrar deneyin."
};
if (/error_code=/.test(yer) || (msg.statusCode !== 302 && msg.statusCode !== 301 && msg.statusCode !== 303)) {
  const m = /error_message=([^&]+)/.exec(yer);
  const kod = m ? decodeURIComponent(m[1]) : "";
  const metin = HATA[kod] || ("Orbit girisi reddetti" + (kod ? " (" + kod + ")" : " (HTTP " + msg.statusCode + ")") + ".");
  msg.messages = { mesaj: metin };
  msg.submission = { eposta: msg.orbitEposta, sifre: "", durum: kutu("hata", esc(metin)) };
  node.status({ fill: "red", shape: "ring", text: kod || ("HTTP " + msg.statusCode) });
  return [null, msg];
}

const c = msg.responseCookies || {};
const ciftler = Object.keys(c).map(ad => ad + "=" + c[ad].value);
if (!ciftler.some(x => !/^csrftoken=/.test(x))) throw new Error("Orbit girisi oturum cerezi vermedi.");
if (!c.csrftoken) ciftler.push("csrftoken=" + msg.csrfCerez);
msg.yeniCerez = ciftler.join("; ");
delete msg.csrfCerez;
delete msg.followRedirects;

msg.method = "GET";
msg.url = ORBIT + "/api/users/me/";
msg.headers = { Accept: "application/json", Cookie: msg.yeniCerez };
return [msg, null];
