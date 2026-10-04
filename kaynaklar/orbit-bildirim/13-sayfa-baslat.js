// Onceki anlik goruntu (ya da "") -> is listesini en son guncellenenden
// geriye dogru sayfa sayfa (1000'er, Orbit'in ust siniri) iste.
// Onceki okuma varsa sadece o zamandan sonra degisenler okunur (14).

let onceki = null;
try { onceki = msg.payload ? JSON.parse(msg.payload) : null; } catch (e) { onceki = null; }
msg.obOnceki = onceki && onceki.proje && onceki.proje.id === msg.obProje.id ? onceki : null;
msg.obToplanan = {};
msg.obTaranan = 0;
msg.obSayfa = 0;
msg.obEnYeni = "";

msg.obIsUrl = API + "projects/" + msg.obProje.id +
  "/issues/?order_by=-updated_at&sub_issue=true&filters=%7B%7D&layout=list&per_page=1000&cursor=";
getIstegi(msg, msg.obIsUrl + encodeURIComponent("1000:0:0"));
return msg;
