// Bir sayfa is (1000 kayit). TS onayina gonderilmis olanlari toplar:
//   "TS Gerceklesen Tarih" dolu  YA DA  durum su an F_TS Approval Awaiting
// (Jira gecmisinde durum "Ts Onayi Bekleniyor"a gectigi anda bu tarih dolmus.)
// Bir kez listeye giren madde cikmaz; durumu/basligi guncellenir.
// Cikis 1 -> sonraki sayfa (ayni http request'e geri)
// Cikis 2 -> bitti -> 15

yanitKontrol(msg, "is listesi");
const p = msg.payload;
const sonuclar = p.results || [];
msg.obSayfa++;
msg.obTaranan += sonuclar.length;

const onceki = msg.obOnceki;
const sinir = onceki ? onceki.sonGuncelleme : "";    // bundan eski guncellenenler zaten biliniyor
let durdu = false;
for (const i of sonuclar) {
  if (sinir && i.updated_at < sinir) { durdu = true; break; }
  if (i.is_draft || i.archived_at) continue;
  if (i.updated_at > msg.obEnYeni) msg.obEnYeni = i.updated_at;
  const durum = msg.obDurumlar[i.state_id] || "";
  const cf = i.custom_field_values || {};
  const ts = cf[TS_ALANI] || null;
  const eski = onceki && onceki.kayitlar[i.id];
  if (ts || TS_DURUMU.test(durum) || eski) {
    msg.obToplanan[i.id] = {
      no: msg.obProje.kimlik + "-" + i.sequence_id, seq: i.sequence_id,
      baslik: i.name, durum: durum, ts: ts || (eski && eski.ts) || null, upd: i.updated_at,
      tsSorumlu: cf["ts-sorumlusu"] || "", modul: cf["main-responsible-modul"] || ""
    };
  }
}
msg.payload = null;

if (!durdu && p.next_page_results && p.next_cursor && msg.obSayfa < 60) {
  getIstegi(msg, msg.obIsUrl + encodeURIComponent(p.next_cursor));
  node.status({ fill: "blue", shape: "dot", text: msg.obTaranan + " kayit tarandi..." });
  return [msg, null];
}
return [null, msg];
