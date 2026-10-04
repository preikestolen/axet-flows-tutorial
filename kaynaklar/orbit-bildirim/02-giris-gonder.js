// CSRF anahtariyla Orbit'in kendi giris formunu taklit eder:
// POST /auth/sign-in/  (csrfmiddlewaretoken, email, password, next_path)
// Orbit 302 doner: basarida oturum cerezi, hatada ?error_code=... adresi.
// Yonlendirme izlenmez (msg.followRedirects = false) ki cerez ve adres okunabilsin.

if (msg.statusCode !== 200 || !msg.payload || !msg.payload.csrf_token) {
  throw new Error("Orbit giris sayfasi yanit vermedi (CSRF): HTTP " + msg.statusCode);
}
const c = msg.responseCookies || {};
const csrfCerez = c.csrftoken && c.csrftoken.value;
if (!csrfCerez) throw new Error("Orbit CSRF cerezi gelmedi.");

const g = msg.orbitGiris;
const kodla = encodeURIComponent;
msg.payload = "csrfmiddlewaretoken=" + kodla(msg.payload.csrf_token) +
  "&email=" + kodla(g.eposta) + "&password=" + kodla(g.sifre) + "&next_path=" + kodla("/" + ALAN + "/");
msg.orbitEposta = g.eposta;
delete msg.orbitGiris;                 // sifre artik sadece istek govdesinde

msg.method = "POST";
msg.url = ORBIT + "/auth/sign-in/";
msg.headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Cookie: "csrftoken=" + csrfCerez,
  Origin: ORBIT,
  Referer: ORBIT + "/"                  // Django HTTPS'te Referer/Origin kontrol eder
};
msg.csrfCerez = csrfCerez;
msg.followRedirects = false;
return msg;
