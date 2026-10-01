// Open-Meteo'dan Istanbul'un anlik sicaklik ve ruzgar hizini isteyecek
// msg'yi hazirlar. Anahtar gerektirmeyen, herkese acik bir servis.
//
// Zamanlayici (saatte bir) ve elle tetikleme buraya gelir; yeniden deneme
// dongusu de (delay) buraya geri baglanir -- o yuzden deneme sayacini
// SIFIRLAMIYORUZ, sadece yoksa baslatiyoruz.

msg.kaynak = msg.kaynak || "zamanlayici";
msg.deneme = msg.deneme || 0;
msg.tetiklenme = msg.tetiklenme || new Date().toISOString();

msg.method = "GET";
msg.url = "https://api.open-meteo.com/v1/forecast" +
  "?latitude=41.0082&longitude=28.9784" +
  "&current=temperature_2m,wind_speed_10m" +
  "&timezone=Europe%2FIstanbul";
msg.requestTimeout = 20000;      // 20 sn icinde cevap yoksa hata -> catch
delete msg.headers;              // onceki bir HTTP yanitinin basliklari istege gitmesin
delete msg.payload;

node.status({ fill: "blue", shape: "dot", text: msg.kaynak + (msg.deneme ? " / deneme " + (msg.deneme + 1) : "") });
return msg;
