"""kod-adi-konseyi-akis.json dosyasini .js kaynaklarindan uretir.

Ayri sekme ("Gun 3 - Kod Adi Konseyi"), AYNI uygulama: menu (Gun 2 sekmesindeki
application dugumu) "Kod Adi Konseyi" bolumunde iki sayfa gosterir:
  Konsey       (kk_form_konsey)  -- proje yaz, konseyi topla
  Isim Panosu  (kk_form_pano)    -- kazananlar, puana gore

    python akis-uret.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ortak"))
from form_bilesenleri import kalici_kutu  # noqa: E402

BURASI = Path(__file__).parent
KAYNAK = BURASI.parent
TAB = "kk_tab0000000001"
PANO = "/internal-storage-files/konsey/pano.jsonl"
MODEL = "aws-anthropic/eu.anthropic.claude-sonnet-4-6"
PROJE = "33909419-e9c2-45c1-99c6-124ac059ca56"   # NDBS TR Project Development


def js(ad):
    return (BURASI / ad).read_text(encoding="utf-8")


def fn(id_, ad, kod, x, y, wires, outputs=1):
    # aXet function dugumu bu uc alani ZORUNLU tutar (MEMORY.md)
    return {"id": id_, "type": "function", "z": TAB, "name": ad, "func": kod, "outputs": outputs,
            "timeout": 0, "setupErrors": 0, "functionErrors": 0, "closeErrors": 0,
            "initialize": "", "finalize": "", "libs": [], "x": x, "y": y, "wires": wires}


def dosya_oku(id_, ad, x, y, wires):
    return {"id": id_, "type": "file in", "z": TAB, "name": ad, "filename": PANO, "filenameType": "str",
            "format": "utf8", "chunk": False, "sendError": False, "encoding": "utf8", "allProps": True,
            "x": x, "y": y, "wires": wires}


def view_action(id_, ad, x, y, tur, mesaj):
    return {"id": id_, "type": "axetflows-view-action", "z": TAB, "name": ad, "action": "update",
            "redirectPage": None, "downloadFile": False, "fileName": "", "inputType": "buffer",
            "message": mesaj, "messageType": tur, "x": x, "y": y, "wires": []}


def bos_gecmis(id_, x, y, hedef):
    # file in hata verdiyse (ilk kullanimda pano.jsonl yok) bos pano ile devam
    return fn(id_, "pano yok -> bos", 'delete msg.error;\nmsg.payload = "";\nreturn msg;\n', x, y, [[hedef]])


def ajan(id_, ad, kisilik, sema, sicaklik, x, y, basari, hata="kk_bekle"):
    return {"id": id_, "type": "axet-agents-execute", "z": TAB, "name": ad,
            "agentId": "", "agentName": "", "description": ad, "instructions": kisilik,
            "model": MODEL, "input": "", "mcpTools": "[]", "coreTools": "", "customTools": "[]",
            "temperature": sicaklik, "maxRetries": 2, "maxSteps": 3, "timeout": 120000, "stream": False,
            "outputSchema": json.dumps(sema, ensure_ascii=False), "projectId": PROJE,
            "x": x, "y": y, "wires": [[basari], [hata]]}


# ------------------------------------------------ karakterler (ses = Instructions, sabit)
ONERI_SEMASI = {
    "type": "object",
    "properties": {
        "kodAdi": {"type": "string", "description": "Onerilen kod adi, 1-3 kelime, en fazla 24 karakter"},
        "gerekce": {"type": "string", "description": "2-3 cumlelik savunma, karakterin kendi sesiyle"},
    },
    "required": ["kodAdi", "gerekce"],
}
BASKAN_SEMASI = {
    "type": "object",
    "properties": {
        "degerlendirmeler": {
            "type": "object",
            "description": "Her uyeye ayri, ona dogrudan hitap eden 1-2 cumle",
            "properties": {"muhendis": {"type": "string"}, "pazarlamaci": {"type": "string"}, "sair": {"type": "string"}},
            "required": ["muhendis", "pazarlamaci", "sair"],
        },
        "kazananKarakter": {"type": "string", "enum": ["muhendis", "pazarlamaci", "sair"]},
        "kazanan": {"type": "string", "description": "Kazanan uyenin onerdigi ismin AYNISI"},
        "puan": {"type": "integer", "description": "Kazanan isme 1-100 arasi puan"},
        "karar": {"type": "string", "description": "2-3 cumlelik gerekceli karar"},
    },
    "required": ["degerlendirmeler", "kazananKarakter", "kazanan", "puan", "karar"],
}
MUHENDIS = ("Sen 20 yildir sektorde olan, her seyi gormus ALAYCI bir yazilim muhendisisin. Kuru mizah, "
            "teknik gondermeler (hata kodlari, eski sistemler, gece 3'te gelen alarmlar, soguyan kahve) kullanirsin. "
            "Abartiya tahammulun yok; kisa, igneleyici ve gozunu deviren cumlelerle konusursun. Asla unlem kullanmazsin.")
PAZARLAMACI = ("Sen her seyi DEVRIM ilan eden ABARTILI bir pazarlamacisin. 'Oyun degistirici', 'sinerji', "
               "'yeni nesil', 'disruptif' gibi kliseleri bilerek ve keyifle kullanirsin; BUYUK HARFLE vurgu yapar, "
               "unlem isaretini seversin!!! Her ismi bir lansman sahnesinde haykiriyormus gibi sunarsin.")
SAIR = ("Sen DRAMATIK, melankolik bir sairsin. Her projede kaderi, denizi, yildizlari, gurbeti gorursun. "
        "Benzetmeler, ic cekisler ('ah...'), eski kelimeler (gonul, huzun, sevda, firak) kullanirsin; "
        "cumlelerin agirbasli, teatral ve bir parca huzunludur. Gerekce bir siir gibi akar.")
BASKAN = ("Sen Kod Adi Konseyi'nin bilge ve hafif esprili BASKANISIN. Uc uyeyi de adil dinlersin ve her birine "
          "ayri ayri, onun tarzina gondermeyle seslenirsin. Sonra tek bir kazanan secer, gerekcesini netce "
          "aciklarsin. Puani isim kalitesine gore verirsin: akilda kalicilik, projeye uygunluk, ozgunluk.")

DIL = " Cevaplarini duzgun Turkce yaz (c, g, i, o, s, u harflerinin Turkce bicimleriyle: ç ğ ı ö ş ü)."
MUHENDIS, PAZARLAMACI, SAIR, BASKAN = (x + DIL for x in (MUHENDIS, PAZARLAMACI, SAIR, BASKAN))

# ------------------------------------------------ sayfalar
ders9 = json.loads((KAYNAK / "ornek-09-form-zincir.json").read_text(encoding="utf-8"))
sablon = next(n for n in ders9 if n["type"] == "axetflows-form")
buton_sablon = sablon["formStructure"]["components"][1]

# Konsey sayfasi
giris = {"type": "htmlelement", "key": "giris", "id": "kkgiris1", "input": False, "tag": "div",
         "className": "konsey-giris", "attrs": [{"attr": "", "value": ""}], "refreshOnChange": False,
         "content": ('<div class="konsey-giris-baslik">Kod Adi Konseyi</div>'
                     '<div class="konsey-giris-metin">Projeni iki cumleyle anlat. Uc konsey uyesi sirayla bir kod adi '
                     'onerip savunacak, Baskan kazanani secip puanlayacak. Kazanan Isim Panosu\'na yazilir.</div>'
                     '<div class="konsey-uyeler"><span>\U0001F6E0️ Alayci Muhendis</span>'
                     '<span>\U0001F4E3 Abartili Pazarlamaci</span><span>\U0001F3AD Dramatik Sair</span>'
                     '<span>⚖️ Baskan</span></div>')}
proje = {"type": "textarea", "key": "proje", "id": "kkproje1", "input": True, "label": "Projen (iki cumle)",
         "placeholder": "Orn: Depodaki kritik stoklari her sabah kontrol edip satin almaya e-postayla bildiren bir otomasyon. "
                        "Excel'le ugrasan planlamacilarin isini yarim saate indiriyor.",
         "rows": 4, "autoExpand": False, "tableView": True, "persistent": False, "hidden": False,
         "validate": {"required": True, "minLength": 15, "maxLength": 400},
         "conditional": {"show": None, "when": None, "eq": ""}}
topla = copy.deepcopy(buton_sablon)
topla.update({"label": "Konseyi topla", "key": "topla", "id": "kktopla1", "leftIcon": "fa fa-gavel"})
form_konsey = copy.deepcopy(sablon)
form_konsey["formStructure"]["components"] = [giris, proje, topla] + kalici_kutu("sahne", "konsey-sahne-alani")
form_konsey.update({"id": "kk_form_konsey", "z": TAB, "name": "Konsey", "buttons": [topla], "outputs": 2,
                    "x": 150, "y": 100, "wires": [["kk_al"], []]})

# Isim Panosu sayfasi (datagrid, salt okunur; gorunum ortak/uygulama.css)
KOLONLAR = [("sira", "Sira"), ("kodAdi", "Kod adi"), ("puan", "Puan"), ("karakter", "Oneren"),
            ("proje", "Proje"), ("zaman", "Tarih")]
tablo = {"type": "datagrid", "key": "tablo", "label": "", "hideLabel": True, "id": "kktablo1", "input": True,
         "disabled": True, "disableAddingRemovingRows": True, "reorder": False, "initEmpty": True,
         "tableView": False, "persistent": False, "customClass": "konsey-pano",
         "description": "Konseyin sectigi isimler; en yuksek puan en ustte. Esitlikte once kazanan ustte.",
         "conditional": {"show": None, "when": None, "eq": ""},
         "components": [{"type": "textfield", "key": k, "label": b, "id": "kk" + k, "input": True,
                         "disabled": True, "tableView": True} for k, b in KOLONLAR]}
form_pano = copy.deepcopy(sablon)
form_pano["formStructure"]["components"] = [tablo]
form_pano.update({"id": "kk_form_pano", "z": TAB, "name": "Isim Panosu", "buttons": [], "outputs": 1,
                  "x": 150, "y": 600, "wires": [["kk_pano_oku2"]]})          # tek cikis: onInitForm

akis = [
    {"id": TAB, "type": "tab", "label": "Gun 3 - Kod Adi Konseyi", "disabled": False,
     "info": "Proje -> Alayci Muhendis -> Abartili Pazarlamaci -> Dramatik Sair -> Baskan -> Isim Panosu.\n"
             "Kalici: " + PANO},

    # --- Konsey
    form_konsey,
    fn("kk_al", "proje al", js("01-proje-al.js"), 340, 100, [["kk_pano_oku"], ["kk_view_uyari"]], outputs=2),
    view_action("kk_view_uyari", "gecersiz proje", 560, 160, "warning", "<%= mesaj %>"),
    dosya_oku("kk_pano_oku", "panoyu oku", 540, 100, [["kk_hazirla"]]),
    {"id": "kk_catch_pano", "type": "catch", "z": TAB, "name": "pano yok (ilk kullanim)", "scope": ["kk_pano_oku"],
     "uncaught": False, "x": 540, "y": 40, "wires": [["kk_pano_bos"]]},
    bos_gecmis("kk_pano_bos", 740, 40, "kk_hazirla"),
    fn("kk_hazirla", "konseyi kur", js("02-konsey-hazirla.js"), 740, 100, [["kk_sira"]]),
    fn("kk_sira", "sira yoneticisi", js("03-sonraki-konusmaci.js"), 950, 100,
       [["kk_ai_muh"], ["kk_ai_paz"], ["kk_ai_sair"], ["kk_ai_baskan"], ["kk_hata"]], outputs=5),

    ajan("kk_ai_muh", "Alayci Muhendis", MUHENDIS, ONERI_SEMASI, 1.0, 1200, 40, "kk_sira"),
    ajan("kk_ai_paz", "Abartili Pazarlamaci", PAZARLAMACI, ONERI_SEMASI, 1.0, 1200, 100, "kk_sira"),
    ajan("kk_ai_sair", "Dramatik Sair", SAIR, ONERI_SEMASI, 1.0, 1200, 160, "kk_sira"),
    ajan("kk_ai_baskan", "Baskan", BASKAN, BASKAN_SEMASI, 0.4, 1200, 240, "kk_karar"),

    fn("kk_karar", "karari isle", js("04-karar-isle.js"), 1400, 240, [["kk_pano_yaz"], ["kk_view_sonuc"], ["kk_oturum_yaz"]], outputs=3),
    {"id": "kk_oturum_yaz", "type": "file", "z": TAB, "name": "oturumlar/<gun>.jsonl (ekle)", "filename": "filename",
     "filenameType": "msg", "appendNewline": True, "createDir": True, "overwriteFile": "false",
     "encoding": "utf8", "x": 1640, "y": 320, "wires": [[]]},
    {"id": "kk_pano_yaz", "type": "file", "z": TAB, "name": "pano.jsonl (ekle)", "filename": "filename",
     "filenameType": "msg", "appendNewline": True, "createDir": True, "overwriteFile": "false",
     "encoding": "utf8", "x": 1620, "y": 200, "wires": [[]]},
    # sahne HTML'i 04-karar-isle.js'de escape edilip kuruluyor; burada ham basiliyor (<%-)
    # sahne sayfadaki kalici kutuda (msg.submission.sahne); uyari kutusunda kisa ozet
    view_action("kk_view_sonuc", "konsey sahnesi", 1620, 260, "success", "<%= ozet %>"),

    # --- ajan hatasi: 3 sn bekle, ayni ajana en fazla 2 kez daha (07-ajan-yeniden.js)
    {"id": "kk_bekle", "type": "delay", "z": TAB, "name": "3 sn bekle", "pauseType": "delay",
     "timeout": "3", "timeoutUnits": "seconds", "rate": "1", "nbRateUnits": "1", "rateUnits": "second",
     "randomFirst": "1", "randomLast": "5", "randomUnits": "seconds", "drop": False, "allowrate": False,
     "outputs": 1, "x": 1400, "y": 420, "wires": [["kk_yeniden"]]},
    fn("kk_yeniden", "ajan yeniden", js("07-ajan-yeniden.js"), 1600, 420,
       [["kk_ai_muh"], ["kk_ai_paz"], ["kk_ai_sair"], ["kk_ai_baskan"], ["kk_hata"]], outputs=5),

    {"id": "kk_catch", "type": "catch", "z": TAB, "name": "konsey hatalari",
     "scope": ["kk_al", "kk_hazirla", "kk_sira", "kk_karar", "kk_pano_yaz", "kk_oturum_yaz", "kk_pano_bos", "kk_yeniden"], "uncaught": False,
     "x": 150, "y": 340, "wires": [["kk_hata"]]},
    fn("kk_hata", "konsey dagildi", js("06-hata-yaniti.js"), 950, 340, [["kk_view_hata"]]),
    view_action("kk_view_hata", "hatayi goster", 1160, 340, "danger", "<%= mesaj %>"),

    # --- Isim Panosu
    form_pano,
    dosya_oku("kk_pano_oku2", "panoyu oku", 360, 600, [["kk_pano"]]),
    {"id": "kk_catch_pano2", "type": "catch", "z": TAB, "name": "pano yok", "scope": ["kk_pano_oku2"],
     "uncaught": False, "x": 360, "y": 660, "wires": [["kk_pano_bos2"]]},
    bos_gecmis("kk_pano_bos2", 560, 660, "kk_pano"),
    fn("kk_pano", "panoyu sirala", js("05-pano.js"), 560, 600, [["kk_view_pano"]]),
    view_action("kk_view_pano", "panoyu goster", 760, 600, "info", None),
]

hedef = BURASI / "kod-adi-konseyi-akis.json"
hedef.write_text(json.dumps(akis, indent=1, ensure_ascii=False), encoding="utf-8")
print(hedef.name, len(akis), "dugum,", round(hedef.stat().st_size / 1024), "KB")
