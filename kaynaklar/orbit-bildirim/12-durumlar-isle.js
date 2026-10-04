// Durum kimligi -> adi ("F_TS Approval Awaiting" ...). Sonra onceki anlik
// goruntuyu oku (file in, msg.filename): artimli okuma icin.

yanitKontrol(msg, "durumlar");
const liste = Array.isArray(msg.payload) ? msg.payload : (msg.payload.results || []);
msg.obDurumlar = {};
for (const s of liste) msg.obDurumlar[s.id] = s.name;
msg.payload = null;
msg.filename = anlikYolu(msg.obProje.id);
return msg;
