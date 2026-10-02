"""hava-nobetcisi-akis.json dosyasini .js kaynaklarindan uretir.

Ayri bir sekme ("Gun 1 - Hava Nobetcisi") ama AYNI flow / ayni uygulama:
uygulama dugumu ve menusu Gun 2 sekmesinde durur (musteri-kontrol/akis-uret.py),
menudeki "Hava Nobetcisi" bolumu buradaki hv_form'a baglanir.

    python akis-uret.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ortak"))
from form_bilesenleri import indirme_alani  # noqa: E402

BURASI = Path(__file__).parent
KAYNAK = BURASI.parent
TAB = "hv_tab0000000001"
VERI = "/internal-storage-files/hava/okumalar.jsonl"
EXCEL = "/internal-storage-files/hava/hava-nobetcisi.xlsx"
ARALIK_SN = 3600                     # 1 saat (gorev "2 saatte bir" diyor; kullanici saatlik istedi).
                                     # Degistirirsen 06/07/09 .js metinlerini de guncelle.
YENIDEN_DENE_SN = 60


def js(ad):
    return (BURASI / ad).read_text(encoding="utf-8")


def fn(id_, ad, kod, x, y, wires, outputs=1):
    # aXet function dugumu bu uc alani ZORUNLU tutar (MEMORY.md)
    return {"id": id_, "type": "function", "z": TAB, "name": ad, "func": kod, "outputs": outputs,
            "timeout": 0, "setupErrors": 0, "functionErrors": 0, "closeErrors": 0,
            "initialize": "", "finalize": "", "libs": [], "x": x, "y": y, "wires": wires}


def debug(id_, ad, x, y, alan="payload", status=False):
    return {"id": id_, "type": "debug", "z": TAB, "name": ad, "active": True, "tosidebar": True,
            "console": False, "tostatus": status, "complete": alan, "targetType": "msg",
            "statusVal": "", "statusType": "auto", "x": x, "y": y, "wires": []}


def dosya_oku(id_, ad, yol, x, y, wires, bicim):
    # bicim: "utf8" (tek metin) ya da "" (Buffer)
    return {"id": id_, "type": "file in", "z": TAB, "name": ad, "filename": yol, "filenameType": "str",
            "format": bicim, "chunk": False, "sendError": False, "encoding": "none" if bicim == "" else "utf8",
            "allProps": True, "x": x, "y": y, "wires": wires}


def dosya_yaz(id_, ad, x, y, wires, encoding, ekle):
    return {"id": id_, "type": "file", "z": TAB, "name": ad, "filename": "filename", "filenameType": "msg",
            "appendNewline": ekle, "createDir": True, "overwriteFile": "false" if ekle else "true",
            "encoding": encoding, "x": x, "y": y, "wires": wires}


def view_action(id_, ad, x, y, tur, indir, mesaj):
    return {"id": id_, "type": "axetflows-view-action", "z": TAB, "name": ad, "action": "update",
            "redirectPage": None, "downloadFile": indir, "fileName": "hava-nobetcisi.xlsx", "inputType": "buffer",
            "message": mesaj, "messageType": tur, "x": x, "y": y, "wires": []}


def inject(id_, ad, kaynak, x, y, repeat="", once=False, once_delay=0.1):
    return {"id": id_, "type": "inject", "z": TAB, "name": ad,
            "props": [{"p": "kaynak", "v": kaynak, "vt": "str"}],
            "repeat": str(repeat), "crontab": "", "once": once, "onceDelay": once_delay, "topic": "",
            "x": x, "y": y, "wires": [["hv_istek"]]}


def isaretle(id_, ad, sayfa, x, y, wires):
    return fn(id_, ad, 'msg.hvSayfa = "' + sayfa + '";\nreturn msg;\n', x, y, wires)


# ------------------------------------------------ menudeki dort sayfa (Excel'in dort sayfasi)
# Menu (Gun 2 sekmesindeki application dugumu) her sayfayi form_id ile ve
# ETIKET = FORM ADI olacak sekilde gosterir (Ders 9.7). Etiketleri degistirirsen
# musteri-kontrol/akis-uret.py'deki menuyu de degistir.
SAYFALAR = [   # (anahtar, form id, form/menu adi, kolonlar [(key, baslik)])
    ("ozet", "hv_form_ozet", "Ozet", [("bilgi", "Bilgi"), ("deger", "Deger")]),
    ("okumalar", "hv_form_okuma", "Okumalar", [("no", "No"), ("zaman", "Okuma zamani"), ("sicaklik", "Sicaklik"),
                                               ("ruzgar", "Ruzgar"), ("fark", "Fark"), ("kaynak", "Kaynak")]),
    ("uyarilar", "hv_form_uyari", "Uyarilar", [("zaman", "Okuma zamani"), ("yon", "Yon"), ("onceki", "Onceki"),
                                              ("simdiki", "Simdiki"), ("fark", "Fark"), ("kaynak", "Kaynak")]),
    ("hatalar", "hv_form_hata", "Hatalar", [("zaman", "Zaman"), ("hata", "Hata"), ("deneme", "Deneme"),
                                           ("tur", "Tur"), ("kaynak", "Kaynak")]),
]
ACIKLAMA = {
    "ozet": "Istanbul -- Open-Meteo. Zamanlayici saatte bir okur; veri kalici klasorde.",
    "okumalar": "Her okuma bir satir, en yeni ustte. Fark: bir onceki okumaya gore.",
    "uyarilar": "Bir onceki okumaya gore 3 C'den fazla yukselis ya da dusus.",
    "hatalar": "Servis cevap vermediginde: 3 deneme, sonra buraya kayit.",
}

ders9 = json.loads((KAYNAK / "ornek-09-form-zincir.json").read_text(encoding="utf-8"))
sablon = next(n for n in ders9 if n["type"] == "axetflows-form")


def tablo(kolonlar, aciklama):
    # Salt okunur tablo (formio datagrid). Satirlari sayfa acilisinda 07-sayfa-verisi.js basar.
    return {"type": "datagrid", "key": "tablo", "label": "", "hideLabel": True, "id": "hvtablo1", "input": True,
            "disabled": True, "disableAddingRemovingRows": True, "reorder": False, "initEmpty": True,
            "tableView": False, "persistent": False, "description": aciklama,
            "conditional": {"show": None, "when": None, "eq": ""},
            "components": [{"type": "textfield", "key": k, "label": b, "id": "hv" + k, "input": True,
                            "disabled": True, "tableView": True} for k, b in kolonlar]}


formlar, sayfa_dugumleri = [], []
for i, (anahtar, fid, ad, kolonlar) in enumerate(SAYFALAR):
    f = copy.deepcopy(sablon)
    bilesenler = [tablo(kolonlar, ACIKLAMA[anahtar])]
    butonlar = []
    if anahtar == "ozet":                                   # Excel indirme Ozet sayfasinda
        b = copy.deepcopy(sablon["formStructure"]["components"][1])
        b.update({"label": "Excel'i indir", "key": "indir", "id": "hvindir1", "leftIcon": "fa fa-download"})
        bilesenler.append(b)
        bilesenler += indirme_alani()
        butonlar = [b]
    f["formStructure"]["components"] = bilesenler
    y = 500 + i * 60
    isaret = "hv_isaret_" + anahtar
    f.update({"id": fid, "z": TAB, "name": ad, "buttons": butonlar, "outputs": len(butonlar) + 1,
              "x": 150, "y": y,
              # cikislar: [butonlar..., onInitForm]
              "wires": ([["hv_xls_oku"]] if butonlar else []) + [[isaret]]})
    formlar.append(f)
    sayfa_dugumleri.append(isaretle(isaret, ad + " acildi", anahtar, 360, y, [["hv_sayfa_oku"]]))

akis = [
    {"id": TAB, "type": "tab", "label": "Gun 1 - Hava Nobetcisi", "disabled": False,
     "info": "Saatte bir Istanbul sicaklik + ruzgar (Open-Meteo) -> JSONL gecmis -> Excel.\n"
             "Kalici: " + VERI + " ve " + EXCEL + "\n"
             "Servis hatasi: 3 deneme, sonra Hatalar sayfasina kayit."},

    # --- tetikleyiciler
    inject("hv_zaman", "her saat", "zamanlayici", 150, 80, repeat=ARALIK_SN, once=True, once_delay=15),
    inject("hv_elle", "elle oku (test)", "elle", 150, 130),

    # --- servis cagrisi + dogrulama
    fn("hv_istek", "istek hazirla", js("01-istek-hazirla.js"), 360, 100, [["hv_http"]]),
    {"id": "hv_http", "type": "http request", "z": TAB, "name": "Open-Meteo", "method": "use", "ret": "obj",
     "paytoqs": "ignore", "url": "", "tls": "", "persist": False, "proxy": "", "insecureHTTPParser": False,
     "authType": "", "senderr": False, "headers": [], "x": 550, "y": 100, "wires": [["hv_kontrol"]]},
    fn("hv_kontrol", "yanit kontrol", js("02-yanit-kontrol.js"), 740, 100, [["hv_gecmis"]]),

    # --- hata: yeniden dene ya da kayda yaz
    {"id": "hv_catch", "type": "catch", "z": TAB, "name": "servis hatalari",
     "scope": ["hv_istek", "hv_http", "hv_kontrol"], "uncaught": False,
     "x": 150, "y": 220, "wires": [["hv_sinif"]]},
    fn("hv_sinif", "hata siniflandir", js("03-hata-siniflandir.js"), 360, 220, [["hv_bekle"], ["hv_gecmis"]], outputs=2),
    {"id": "hv_bekle", "type": "delay", "z": TAB, "name": f"{YENIDEN_DENE_SN} sn bekle", "pauseType": "delay",
     "timeout": str(YENIDEN_DENE_SN), "timeoutUnits": "seconds", "rate": "1", "nbRateUnits": "1",
     "rateUnits": "second", "randomFirst": "1", "randomLast": "5", "randomUnits": "seconds",
     "drop": False, "allowrate": False, "outputs": 1, "x": 560, "y": 200, "wires": [["hv_istek"]]},

    # --- gecmis + yeni kayit
    dosya_oku("hv_gecmis", "gecmisi oku", VERI, 940, 140, [["hv_isle"]], "utf8"),
    {"id": "hv_catch_gecmis", "type": "catch", "z": TAB, "name": "gecmis yok (ilk calisma)",
     "scope": ["hv_gecmis"], "uncaught": False, "x": 940, "y": 220, "wires": [["hv_gecmis_yok"]]},
    fn("hv_gecmis_yok", "bos gecmis", js("04-gecmis-yok.js"), 1140, 220, [["hv_isle"]]),
    fn("hv_isle", "kaydi isle", js("05-kaydi-isle.js"), 1140, 140, [["hv_jsonl"], ["hv_tablo"]], outputs=2),
    dosya_yaz("hv_jsonl", "okumalar.jsonl (ekle)", 1360, 100, [[]], "utf8", True),

    # --- Excel
    fn("hv_tablo", "excel tablosu", js("06-excel-tablosu.js"), 360, 340, [["hv_xls"]]),
    {"id": "hv_xls", "type": "json-to-excel", "z": TAB, "name": "excel uret", "kind": "auto",
     "bufferProp": "payload", "payloadProp": "payload", "x": 560, "y": 340, "wires": [["hv_xls_w"]]},
    dosya_yaz("hv_xls_w", "hava-nobetcisi.xlsx", 760, 340, [["hv_bitti"]], "none", False),
    debug("hv_bitti", "EXCEL GUNCELLENDI", 960, 340, alan="filename", status=True),

    {"id": "hv_catch_kayit", "type": "catch", "z": TAB, "name": "kayit/excel hatalari",
     "scope": ["hv_gecmis_yok", "hv_isle", "hv_jsonl", "hv_tablo", "hv_xls", "hv_xls_w"], "uncaught": False,
     "x": 150, "y": 400, "wires": [["hv_kayit_hata"]]},
    debug("hv_kayit_hata", "KAYIT HATASI", 360, 400, alan="error", status=True),

    # --- menudeki dort sayfa
    *formlar,
    *sayfa_dugumleri,
    dosya_oku("hv_sayfa_oku", "gecmisi oku", VERI, 560, 590, [["hv_sayfa"]], "utf8"),
    fn("hv_sayfa", "sayfa verisi", js("07-sayfa-verisi.js"), 760, 590, [["hv_view_sayfa"]]),
    view_action("hv_view_sayfa", "tabloyu goster", 960, 590, "info", False, None),

    # --- Excel indir (Ozet sayfasindaki dugme)
    dosya_oku("hv_xls_oku", "excel oku", EXCEL, 560, 740, [["hv_indir_f"]], ""),
    fn("hv_indir_f", "excel indir", js("08-excel-indir.js"), 760, 740, [["hv_bag"]]),
    fn("hv_bag", "indirme baglantisi", (KAYNAK / "ortak" / "indirme-bagi-olustur.js").read_text(encoding="utf-8"), 960, 740, [["hv_view_indir"]]),
    view_action("hv_view_indir", "baglantiyi goster", 1160, 740, "success", False,
                "<%= mesaj %> Indirme baglantisi asagida."),

    {"id": "hv_catch_sayfa", "type": "catch", "z": TAB, "name": "sayfa dosya hatalari",
     "scope": ["hv_sayfa_oku", "hv_sayfa", "hv_xls_oku", "hv_indir_f", "hv_bag"], "uncaught": False,
     "x": 150, "y": 800, "wires": [["hv_sayfa_hata"]]},
    fn("hv_sayfa_hata", "sayfa hatasi", js("09-sayfa-hatasi.js"), 360, 800, [["hv_view_sayfa"], ["hv_view_yok"]], outputs=2),
    view_action("hv_view_yok", "excel yok", 560, 860, "warning", False, "<%= mesaj %>"),
]

hedef = BURASI / "hava-nobetcisi-akis.json"
hedef.write_text(json.dumps(akis, indent=1, ensure_ascii=False), encoding="utf-8")
print(hedef.name, len(akis), "dugum,", round(hedef.stat().st_size / 1024), "KB")
