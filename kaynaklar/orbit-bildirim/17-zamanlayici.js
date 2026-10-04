// Saatlik okuma: oturum varsa kayitli projeyi (secim.json) yeniler.
// Oturum yoksa sessizce durmaz -- durum rozetinde yazar.

if (!oturum()) {
  node.status({ fill: "yellow", shape: "ring", text: "oturum yok " + yerel(new Date().toISOString(), true) });
  return null;
}
msg.filename = KLASOR + "secim.json";
return msg;
