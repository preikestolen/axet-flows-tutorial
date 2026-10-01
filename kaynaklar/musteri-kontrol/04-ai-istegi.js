// AI'a SAYMA isi verilmez: sayilar kural dugumunde hesaplandi, buraya hazir
// gelir. Ajandan istenen tek sey YORUM -- en sik hata ne, ne yapilmali.
//
// Musteri satirlarinin kendisi gonderilmez, sadece istatistik ve birkac ornek
// aciklama gider (veri AI'a ne kadar az giderse o kadar iyi -- Ders 9.6).

const ist = msg.istatistik;

if (ist.toplamHata === 0 && ist.dosyaUyarilari.length === 0) {
  // Hata yoksa AI'a gitmeye gerek yok -- rapora dogrudan gec (2. cikis)
  msg.aiOzet = "Dosyada kural ihlali bulunmadi. " + ist.toplamSatir + " satirin tamami temiz.";
  node.status({ fill: "green", shape: "dot", text: "hata yok, AI atlandi" });
  return [null, msg];
}

msg.payload = `Bir SAP musteri ana verisi Excel'i kontrol edildi. Kontrolu KOD yapti;
asagidaki sayilar kesindir.

KURALLAR:
1. Sayilari AYNEN kullan. Yeniden sayma, tahmin etme, yuvarlama.
2. Verilmeyen bir bilgi uydurma.
3. Turkce yaz, en fazla 180 kelime, Markdown kullan.
4. Su yapida yaz:
   ## Genel durum   (1-2 cumle: kac satirdan kaci hatali)
   ## En sik hata   (hangisi, kac kez, neden onemli -- SAP acisindan)
   ## Ne yapilmali  (her hata turu icin tek satirlik somut duzeltme talimati, en sik olandan baslayarak)
   ## Oncelik       (once neyi duzeltmek gerekir ve neden; tek cumle)

KONTROL SONUCU (JSON):
${JSON.stringify(ist, null, 2)}`;

node.status({ fill: "blue", shape: "dot", text: "AI ozeti isteniyor..." });
return [msg, null];
