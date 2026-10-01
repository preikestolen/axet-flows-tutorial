// "gecmisi oku" (file in) hata verdiyse buraya gelir. Ilk calismada dosya
// henuz yoktur -- bu bir hata degil, bos gecmistir.

const metin = (msg.error && msg.error.message) || "";
if (!/ENOENT|no such file/i.test(metin)) {
  node.warn("Gecmis dosyasi okunamadi, bos kabul ediliyor: " + metin);
}
delete msg.error;
msg.payload = "";
return msg;
