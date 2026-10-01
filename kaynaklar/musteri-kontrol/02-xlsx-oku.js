// .xlsx dosyasini (Buffer) satirlara cevirir -- hicbir kutuphane kullanmadan.
//
// Neden kendi okuyucumuz? function dugumu sandbox'tir: require, zlib, fs kapali.
// xlsx aslinda bir zip; icinde XML dosyalari var. Zip'i acmak icin DEFLATE
// cozucu gerekiyor -- asagidaki inflate() RFC 1951'in kisa bir uygulamasi.
//
// Girdi : msg.payload = Buffer (.xlsx)
// Cikti : msg.sayfaAdi, msg.basliklar = ["Musteri No", ...]
//         msg.satirlar = [{ satir: 2, degerler: { "Musteri No": "M-001", ... } }, ...]
//         (satir = Excel'deki GERCEK satir numarasi)

// ---------------------------------------------------------------- inflate
const LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
const LEXT  = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
const DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
const DEXT  = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
const CL_SIRA = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

function inflate(src, boyut) {
  let out = Buffer.alloc(boyut > 0 ? boyut : src.length * 4 + 1024);
  let n = 0, pos = 0, bb = 0, bc = 0;

  function bits(k) {
    while (bc < k) {
      if (pos >= src.length) throw new Error("xlsx: sikistirilmis veri beklenenden kisa");
      bb |= src[pos++] << bc;
      bc += 8;
    }
    const v = bb & ((1 << k) - 1);
    bb >>>= k;
    bc -= k;
    return v;
  }
  function yaz(b) {
    if (n >= out.length) { const y = Buffer.alloc(out.length * 2); out.copy(y); out = y; }
    out[n++] = b;
  }
  function agac(uzunluklar) {
    const say = new Uint16Array(16), ofs = new Uint16Array(16);
    for (const l of uzunluklar) say[l]++;
    say[0] = 0;
    for (let i = 1; i < 16; i++) ofs[i] = ofs[i - 1] + say[i - 1];
    const sembol = new Uint16Array(uzunluklar.length);
    for (let s = 0; s < uzunluklar.length; s++) if (uzunluklar[s]) sembol[ofs[uzunluklar[s]]++] = s;
    return { say, sembol };
  }
  function coz(h) {
    let kod = 0, ilk = 0, idx = 0;
    for (let len = 1; len < 16; len++) {
      kod |= bits(1);
      const c = h.say[len];
      if (kod - c < ilk) return h.sembol[idx + (kod - ilk)];
      idx += c; ilk += c; ilk <<= 1; kod <<= 1;
    }
    throw new Error("xlsx: gecersiz huffman kodu");
  }

  let sabitL = null, sabitD = null, son;
  do {
    son = bits(1);
    const tip = bits(2);
    if (tip === 0) {                                   // sikistirilmamis blok
      bb = 0; bc = 0;
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      for (let i = 0; i < len; i++) yaz(src[pos++]);
      continue;
    }
    let lk, dk;
    if (tip === 1) {                                   // sabit huffman
      if (!sabitL) {
        const l = [];
        for (let i = 0; i < 288; i++) l.push(i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8);
        sabitL = agac(l);
        sabitD = agac(new Array(30).fill(5));
      }
      lk = sabitL; dk = sabitD;
    } else if (tip === 2) {                            // dinamik huffman
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const cl = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) cl[CL_SIRA[i]] = bits(3);
      const clAgac = agac(cl);
      const u = [];
      while (u.length < hlit + hdist) {
        const s = coz(clAgac);
        if (s < 16) u.push(s);
        else if (s === 16) { const p = u[u.length - 1]; for (let r = 3 + bits(2); r > 0; r--) u.push(p); }
        else if (s === 17) { for (let r = 3 + bits(3); r > 0; r--) u.push(0); }
        else { for (let r = 11 + bits(7); r > 0; r--) u.push(0); }
      }
      lk = agac(u.slice(0, hlit));
      dk = agac(u.slice(hlit));
    } else {
      throw new Error("xlsx: gecersiz blok tipi");
    }
    for (;;) {
      let s = coz(lk);
      if (s < 256) { yaz(s); continue; }
      if (s === 256) break;
      s -= 257;
      const len = LBASE[s] + bits(LEXT[s]);
      const ds = coz(dk);
      const mesafe = DBASE[ds] + bits(DEXT[ds]);
      for (let i = 0; i < len; i++) yaz(out[n - mesafe]);
    }
  } while (!son);

  return out.slice(0, n);
}

// ---------------------------------------------------------------- zip
function zipAc(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("xlsx: zip dizini bulunamadi (dosya bozuk veya .xlsx degil)");

  const adet = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const dosyalar = {};

  for (let i = 0; i < adet; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("xlsx: zip dizini bozuk");
    const yontem = buf.readUInt16LE(p + 10);
    const sikisik = buf.readUInt32LE(p + 20);
    const acik = buf.readUInt32LE(p + 24);
    const adLen = buf.readUInt16LE(p + 28), ekLen = buf.readUInt16LE(p + 30), yorumLen = buf.readUInt16LE(p + 32);
    const yerel = buf.readUInt32LE(p + 42);
    const ad = buf.slice(p + 46, p + 46 + adLen).toString("utf8");
    p += 46 + adLen + ekLen + yorumLen;

    dosyalar[ad] = () => {                             // tembel: sadece gereken acilir
      const bas = yerel + 30 + buf.readUInt16LE(yerel + 26) + buf.readUInt16LE(yerel + 28);
      const ham = buf.slice(bas, bas + sikisik);
      if (yontem === 0) return ham;
      if (yontem === 8) return inflate(ham, acik);
      throw new Error("xlsx: desteklenmeyen sikistirma yontemi " + yontem);
    };
  }
  return dosyalar;
}

// ---------------------------------------------------------------- xml
function varlik(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" }[e];
  });
}
function metinler(xml) {                               // <t>..</t> parcalarini birlestir (<rPh> haric)
  xml = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let s = "";
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) s += m[1];
  return varlik(s);
}
function oznitelik(attrs, ad) {
  const m = new RegExp("\\b" + ad + "=\"([^\"]*)\"").exec(attrs);
  return m ? m[1] : null;
}
function kolonNo(ref) {                                // "AB12" -> 27 (0 tabanli)
  const m = /^([A-Z]+)/.exec(ref || "");
  if (!m) return -1;
  let k = 0;
  for (const ch of m[1]) k = k * 26 + (ch.charCodeAt(0) - 64);
  return k - 1;
}

// ---------------------------------------------------------------- ana is
const zip = zipAc(msg.payload);
const oku = (ad) => zip[ad] ? zip[ad]().toString("utf8") : null;

// Paylasilan metinler
const paylasilan = [];
const ss = oku("xl/sharedStrings.xml");
if (ss) {
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g;
  let m;
  while ((m = re.exec(ss))) paylasilan.push(m[1] ? metinler(m[1]) : "");
}

// Ilk sayfanin yolunu bul: workbook.xml -> rels
let sayfaAdi = "Sayfa1", sayfaYolu = "xl/worksheets/sheet1.xml";
const wb = oku("xl/workbook.xml"), rels = oku("xl/_rels/workbook.xml.rels");
if (wb) {
  const s = /<sheet\b([^>]*)\/?>/.exec(wb);
  if (s) {
    sayfaAdi = varlik(oznitelik(s[1], "name") || sayfaAdi);
    const rid = oznitelik(s[1], "r:id");
    if (rid && rels) {
      const r = new RegExp("<Relationship\\b[^>]*Id=\"" + rid + "\"[^>]*>").exec(rels);
      const hedef = r && oznitelik(r[0], "Target");
      if (hedef) sayfaYolu = hedef[0] === "/" ? hedef.slice(1) : "xl/" + hedef.replace(/^\.\//, "");
    }
  }
}
const sayfa = oku(sayfaYolu);
if (!sayfa) throw new Error("xlsx: sayfa bulunamadi: " + sayfaYolu);

// Hucreleri oku
const hamSatirlar = [];                                 // [{ satir, hucreler: [] }]
const satirRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
let sm, sonrakiSatir = 1;
while ((sm = satirRe.exec(sayfa))) {
  const r = oznitelik(sm[1], "r");
  const satirNo = r ? parseInt(r, 10) : sonrakiSatir;
  sonrakiSatir = satirNo + 1;
  const hucreler = [];
  const hucreRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let hm, sira = 0;
  while ((hm = hucreRe.exec(sm[2] || ""))) {
    const k = kolonNo(oznitelik(hm[1], "r"));
    const kolon = k >= 0 ? k : sira;
    sira = kolon + 1;
    const tip = oznitelik(hm[1], "t");
    const ic = hm[2] || "";
    const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(ic);
    let deger = "";
    if (tip === "s") deger = v ? (paylasilan[parseInt(v[1], 10)] || "") : "";
    else if (tip === "inlineStr") deger = metinler(ic);
    else if (tip === "b") deger = v && v[1] === "1" ? "TRUE" : "FALSE";
    else if (v) {
      deger = varlik(v[1]);
      if (tip !== "str" && tip !== "e" && /e/i.test(deger)) {   // 1.2345E+9 -> 1234500000
        const sayi = Number(deger);
        if (Number.isInteger(sayi) && Math.abs(sayi) < 1e21) deger = String(sayi);
      }
    }
    hucreler[kolon] = deger;
  }
  hamSatirlar.push({ satir: satirNo, hucreler });
}

const bosMu = (v) => v === undefined || v === null || String(v).trim() === "";
const dolu = hamSatirlar.filter(r => r.hucreler.some(v => !bosMu(v)));
if (dolu.length === 0) {
  node.error("Excel bos: " + (msg.dosyaAdi || ""), msg);
  return null;
}

// Ilk dolu satir baslik satiri
const baslikSatiri = dolu[0];
const basliklar = [];
const kullanilan = {};
for (let k = 0; k < baslikSatiri.hucreler.length; k++) {
  let b = String(baslikSatiri.hucreler[k] || "").trim() || ("Kolon " + String.fromCharCode(65 + (k % 26)));
  if (kullanilan[b]) b = b + " (" + (++kullanilan[b]) + ")";
  kullanilan[b] = kullanilan[b] || 1;
  basliklar[k] = b;
}

msg.sayfaAdi = sayfaAdi;
msg.basliklar = basliklar;
msg.satirlar = dolu.slice(1).map(r => {
  const degerler = {};
  basliklar.forEach((b, k) => { degerler[b] = r.hucreler[k] === undefined ? "" : String(r.hucreler[k]); });
  return { satir: r.satir, degerler };
});
msg.payload = { sayfa: sayfaAdi, kolon: basliklar.length, satir: msg.satirlar.length };

node.status({ fill: "blue", shape: "dot", text: msg.satirlar.length + " satir / " + basliklar.length + " kolon" });
return msg;
