// Raporlar > Indir: diskten okunan rapor (file in, Buffer) -> indirme kutusu.
// Dosya yoksa (elle silinmis) file in hata verir -> catch -> "rapor yok" mesaji.

msg.indirilecek = { data: msg.payload, ad: msg.indirmeRaporu.ad };   // -> ortak/indirme-bagi-olustur.js
msg.messages = { mesaj: msg.indirmeRaporu.ozet + ". Rapor:" };
delete msg.indirmeRaporu;
return msg;
