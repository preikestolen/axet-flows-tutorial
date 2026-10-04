// "Orbit Giris" sayfasindaki "Giris yap" dugmesi: e-posta + sifreyi dogrular,
// once Orbit'ten CSRF anahtari ister (Django). Sifre sadece msg uzerinde tasinir.
// Cikis 1 -> GET /auth/get-csrf-token/
// Cikis 2 -> eksik bilgi: uyari (view action)

const veri = (msg.payload && msg.payload.data) || (msg.submission && msg.submission.data) || msg.submission || {};
const eposta = String(veri.eposta || "").trim();
const sifre = String(veri.sifre || "");

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta) || !sifre) {
  msg.messages = { mesaj: "Orbit e-postasi ve sifresi gerekli." };
  msg.submission = { eposta: eposta, sifre: "", durum: kutu("uyari", "Orbit e-postasi ve sifresi gerekli.") };
  return [null, msg];
}

msg.orbitGiris = { eposta: eposta, sifre: sifre };
msg.method = "GET";
msg.url = ORBIT + "/auth/get-csrf-token/";
msg.headers = { Accept: "application/json" };
msg.requestTimeout = 30000;
delete msg.payload;
node.status({ fill: "blue", shape: "dot", text: "giris: " + eposta });
return [msg, null];
