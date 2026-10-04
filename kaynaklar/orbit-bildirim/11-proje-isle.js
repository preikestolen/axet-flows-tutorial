// Proje adi + kimligi (REEM, OSSDDP...) -> durum listesini iste.

yanitKontrol(msg, "proje");
msg.obProje.ad = msg.payload.name;
msg.obProje.kimlik = msg.payload.identifier;
getIstegi(msg, API + "projects/" + msg.obProje.id + "/states/");
return msg;
