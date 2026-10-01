"""musteri-kontrol-akis.json dosyasini .js kaynaklarindan uretir.

Function kodlari ayri .js dosyalarinda durur (okunur, test edilir); bu betik
onlari import edilebilir tek bir akis JSON'una gomer. Kodu degistirdiyseniz
yeniden calistirin:

    python akis-uret.py
"""
import base64
import copy
import json
from pathlib import Path

BURASI = Path(__file__).parent
KAYNAK = BURASI.parent
TAB = "mk_tab0000000001"
MODEL = "aws-anthropic/eu.anthropic.claude-sonnet-4-6"
PROJE = "33909419-e9c2-45c1-99c6-124ac059ca56"   # NDBS TR Project Development -- tasarimcidan okundu
FORM_ADI = "Musteri Excel yukle"
RAPOR_SAYFASI = "Raporlar"


def js(ad):
    return (BURASI / ad).read_text(encoding="utf-8")


ORTAK = KAYNAK / "ortak"
LINK = ('<a href="/indir/<%= token %>" download="<%= dosya %>"><b><%= dosya %></b></a> '
        '-- indirmek icin tiklayin (<%= sure %> dk gecerli).')
# Uygulama geneli Custom CSS: salt okunur tablolari duz metin gibi goster (Ders 9.9)
UYGULAMA_CSS = (KAYNAK / "ortak" / "uygulama.css").read_text(encoding="utf-8")


def fn(id_, ad, kod, x, y, wires, outputs=1):
    # aXet'in function dugumu (10-function-af.html) stok Node-RED'deki "noerr"
    # yerine bu uc alani ZORUNLU tutar; eksikse deploy "invalid properties" der.
    return {"id": id_, "type": "function", "z": TAB, "name": ad, "func": kod, "outputs": outputs,
            "timeout": 0, "setupErrors": 0, "functionErrors": 0, "closeErrors": 0,
            "initialize": "", "finalize": "", "libs": [],
            "x": x, "y": y, "wires": wires}


def debug(id_, ad, x, y, alan="payload", status=False):
    return {"id": id_, "type": "debug", "z": TAB, "name": ad, "active": True, "tosidebar": True,
            "console": False, "tostatus": status, "complete": alan, "targetType": "msg",
            "statusVal": "", "statusType": "auto", "x": x, "y": y, "wires": []}


def view_action(id_, ad, x, y, tur, indir, mesaj):
    # Formdan baslayan her kosu bir view action'da bitmeli; yoksa Submit dugmesi
    # sonsuza kadar doner. Mesaj EJS'dir, degerler msg.messages'tan gelir.
    return {"id": id_, "type": "axetflows-view-action", "z": TAB, "name": ad, "action": "update",
            "redirectPage": None, "downloadFile": indir, "fileName": "rapor.xlsx", "inputType": "buffer",
            "message": mesaj, "messageType": tur, "x": x, "y": y, "wires": []}


# ------------------------------------------------ form ve uygulama (Ders 9'dan sablon)
ders9 = json.loads((KAYNAK / "ornek-09-form-zincir.json").read_text(encoding="utf-8"))
form = copy.deepcopy(next(n for n in ders9 if n["type"] == "axetflows-form"))
app = copy.deepcopy(next(n for n in ders9 if n["type"] == "axetflows-app"))

dosya_bileseni = form["formStructure"]["components"][0]
dosya_bileseni.update({
    "key": "musteriExcel",
    "label": "Musteri ana verisi (Excel)",
    "description": "Tek bir .xlsx dosyasi yukleyin. Ilk satir baslik olmali; ilk sayfa kontrol edilir.",
    "multiple": False,
    "filePattern": ".xlsx",
    "fileMaxSize": "5MB",
    "id": "mkexcel1",
})
form.update({"id": "mk_form", "z": TAB, "name": FORM_ADI, "x": 150, "y": 160, "wires": [["mk_buffer"], []]})

# --- ikinci sayfa: Raporlar (secim kutusu + Indir dugmesi)
buton = copy.deepcopy(form["formStructure"]["components"][1])          # Ders 9'daki Submit dugmesi
buton.update({"label": "Indir", "key": "indir", "id": "mkindir1", "leftIcon": "fa fa-download"})
secim = {
    "type": "select", "key": "rapor", "label": "Rapor", "id": "mkrapor1", "input": True,
    "placeholder": "Bir rapor secin", "widget": "choicesjs", "dataSrc": "values",
    "data": {"values": []}, "valueProperty": "value", "template": "<span>{{ item.label }}</span>",
    "searchEnabled": True, "tableView": True, "persistent": True, "hidden": False,
    "description": "Son 20 kontrol. Liste uygulama yeniden baslatilinca sifirlanir.",
    "validate": {"required": True}, "conditional": {"show": None, "when": None, "eq": ""},
}
form2 = copy.deepcopy(form)
form2["formStructure"]["components"] = [secim, buton]
form2.update({"id": "mk_form2", "name": RAPOR_SAYFASI, "buttons": [buton],
              "x": 150, "y": 600, "wires": [["mk_indir"], ["mk_liste"]]})   # son cikis: onInitForm

app.update({
    "id": "mk_app", "z": TAB, "name": "Musteri Veri Kontrolu",
    "welcomePage": "mk_form",
    "customCSS": UYGULAMA_CSS, "customCSSErrors": 0,
    "authConfig": "Okta",   # tasarimcida Okta secilince yazilan deger
    "x": 150, "y": 80,
})
app["menu"][0]["children"] = [{
    "id": "mk_bolum", "text": "Ana Veri", "icon": "fa fa-database", "data": {}, "type": "section",
    # v6.5.4 menu ogesini {type:"form", data:{form_id}} bicimiyle cozuyor (Apply Auth App
    # asistaninin urettigi menu boyle). Ders 9'daki "page"/"pageId" bicimi uyari veriyor.
    "children": [{"id": "mk_sayfa", "text": FORM_ADI, "icon": "fa fa-file-excel-o", "type": "form",
                  "data": {"form_id": "mk_form"}, "children": []},
                 {"id": "mk_sayfa2", "text": RAPOR_SAYFASI, "icon": "fa fa-download", "type": "form",
                  "data": {"form_id": "mk_form2"}, "children": []}],
}, {
    # Gun 1 -- dugumleri ayri sekmede: ../hava-nobetcisi/akis-uret.py (hv_form)
    "id": "hv_bolum", "text": "Hava Nobetcisi", "icon": "fa fa-cloud", "data": {}, "type": "section",
    # Excel'deki dort sayfa = dort menu sayfasi. Etiket = form adi (Ders 9.7).
    "children": [{"id": "hv_" + fid, "text": ad, "icon": ikon, "type": "form", "data": {"form_id": fid}, "children": []}
                 for fid, ad, ikon in [("hv_form_ozet", "Ozet", "fa fa-dashboard"),
                                       ("hv_form_okuma", "Okumalar", "fa fa-thermometer-half"),
                                       ("hv_form_uyari", "Uyarilar", "fa fa-exclamation-triangle"),
                                       ("hv_form_hata", "Hatalar", "fa fa-bug")]],
}]

# ------------------------------------------------ test girisi (tasarimcida formsuz deneme)
ornek = base64.b64encode((BURASI / "test" / "ornek-musteri.xlsx").read_bytes()).decode()
test_kodu = f"""// Tasarimcida form yayinlanmaz (Ders 9.1). Bu dugum formun gonderecegi
// veriyi taklit eder: icine gomulu ornek Excel'de 20 gizli hata var.

msg.payload = {{
  data: {{
    musteriExcel: [{{
      storage: "base64",
      name: "ornek-musteri.xlsx",
      originalName: "ornek-musteri.xlsx",
      url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{ornek}"
    }}]
  }}
}};
return msg;
"""

akis = [
    {"id": TAB, "type": "tab", "label": "Gun 2 - Musteri Ana Veri Kontrolu", "disabled": False,
     "info": "Excel yukle -> kurallar (kod) -> AI yorumu -> rapor Excel'i + AI ozeti.\n"
             "Ciktilar: /internal-storage-files/musteri-kontrol/"},
    app,
    form,
    {"id": "mk_test_i", "type": "inject", "z": TAB, "name": "ornek dosyayla test",
     "props": [], "repeat": "", "crontab": "", "once": False, "onceDelay": 0.1, "topic": "",
     "x": 150, "y": 240, "wires": [["mk_test_f"]]},
    fn("mk_test_f", "ornek form verisi", test_kodu, 350, 240, [["mk_buffer"]]),

    fn("mk_buffer", "ekten Buffer", js("01-ekten-buffer.js"), 560, 160, [["mk_oku"]]),
    fn("mk_oku", "xlsx oku", js("02-xlsx-oku.js"), 740, 160, [["mk_kural"]]),
    fn("mk_kural", "kurallar", js("03-kurallar.js"), 910, 160, [["mk_ai_hz", "mk_ist_dbg"]]),
    debug("mk_ist_dbg", "KONTROL SONUCU", 1110, 100, alan="istatistik"),

    fn("mk_ai_hz", "AI istegi", js("04-ai-istegi.js"), 1100, 160, [["mk_ai"], ["mk_rapor"]], outputs=2),
    {"id": "mk_ai", "type": "axet-agents-execute", "z": TAB, "name": "Veri kalitesi yorumcusu",
     "agentId": "", "agentName": "", "description": "Veri kalitesi yorumcusu",
     "instructions": "Sen SAP musteri ana verisi (KNA1/BUT000) konusunda deneyimli bir veri kalitesi "
                     "danismanisin. Sana kod tarafindan hesaplanmis kesin sayilar verilir; bunlari "
                     "DEGISTIRMEZ, yeniden saymazsin. Gorevin yorumlamak: en sik hatayi, is etkisini "
                     "ve somut duzeltme adimlarini kisa ve net yazmak.",
     "model": MODEL, "input": "", "mcpTools": "[]", "coreTools": "", "customTools": "[]",
     "temperature": 0.2, "maxRetries": 2, "maxSteps": 5, "timeout": 120000, "stream": False,
     "outputSchema": "", "projectId": PROJE,
     "x": 1310, "y": 160, "wires": [["mk_ai_cvp"], ["mk_ai_cvp"]]},
    fn("mk_ai_cvp", "AI yaniti", js("05-ai-yaniti.js"), 1500, 160, [["mk_rapor"]]),

    fn("mk_rapor", "rapor tablosu", js("06-rapor-tablosu.js"), 560, 320, [["mk_xls"]]),
    {"id": "mk_xls", "type": "json-to-excel", "z": TAB, "name": "excel uret", "kind": "auto",
     "bufferProp": "payload", "payloadProp": "payload", "x": 760, "y": 320, "wires": [["mk_kaydet"]]},
    fn("mk_kaydet", "rapora kaydet", js("07-rapora-kaydet.js"), 960, 320, [["mk_bag"], ["mk_bitti"]], outputs=2),
    fn("mk_bag", "indirme baglantisi", (ORTAK / "indirme-bagi-olustur.js").read_text(encoding="utf-8"), 1160, 300, [["mk_view"]]),
    view_action("mk_view", "sonucu goster + baglanti", 1360, 300, "success", False,
                "Kontrol tamamlandi: <%= toplam %> satirin <%= hatali %> tanesi hatali (<%= hata %> hata). " + LINK),
    debug("mk_bitti", "RAPOR HAZIR", 1180, 360, alan="payload", status=True),

    # --- Raporlar sayfasi
    form2,
    fn("mk_liste", "rapor listesi", js("08-rapor-listesi.js"), 380, 640, [["mk_view_liste"]]),
    view_action("mk_view_liste", "listeyi goster", 600, 640, "info", False, None),
    fn("mk_indir", "rapor indir", js("09-rapor-indir.js"), 380, 580, [["mk_bag2"], ["mk_view_yok"]], outputs=2),
    fn("mk_bag2", "indirme baglantisi", (ORTAK / "indirme-bagi-olustur.js").read_text(encoding="utf-8"), 600, 560, [["mk_view_indir"]]),
    view_action("mk_view_indir", "baglantiyi goster", 820, 560, "success", False, "<%= mesaj %> " + LINK),
    view_action("mk_view_yok", "rapor yok", 600, 620, "warning", False, "<%= mesaj %>"),

    # --- indirme ucu: GET /indir/:token (dogru Content-Type + dosya adi)
    {"id": "mk_http_in", "type": "http in", "z": TAB, "name": "GET /indir/:token", "url": "/indir/:token",
     "method": "get", "upload": False, "swaggerDoc": "", "x": 170, "y": 700, "wires": [["mk_sun"]]},
    fn("mk_sun", "dosyayi sun", (ORTAK / "indirme-sun.js").read_text(encoding="utf-8"), 380, 700, [["mk_http_out"]]),
    {"id": "mk_http_out", "type": "http response", "z": TAB, "name": "", "statusCode": "", "headers": {},
     "x": 560, "y": 700, "wires": []},

    # Kapsam bilerek SINIRLI: ajan dugumu kendi hata cikisiyla yonetiliyor; o da
    # catch'e dusseydi forma iki kez yanit gidebilirdi.
    {"id": "mk_catch", "type": "catch", "z": TAB, "name": "kontrol hatalari",
     "scope": ["mk_buffer", "mk_oku", "mk_kural", "mk_ai_hz", "mk_ai_cvp", "mk_rapor",
               "mk_xls", "mk_kaydet", "mk_bag"],
     "uncaught": False, "x": 160, "y": 460, "wires": [["mk_hata_dbg", "mk_hata_yanit"]]},
    debug("mk_hata_dbg", "KONTROL HATASI", 380, 460, alan="error", status=True),
    fn("mk_hata_yanit", "hata yaniti", js("10-hata-yaniti.js"), 380, 510, [["mk_view_hata"]]),
    view_action("mk_view_hata", "hatayi goster", 600, 510, "danger", False,
                "Kontrol tamamlanamadi: <%= hata %>"),
]

hedef = BURASI / "musteri-kontrol-akis.json"
hedef.write_text(json.dumps(akis, indent=1, ensure_ascii=False), encoding="utf-8")
print(hedef.name, len(akis), "dugum,", round(hedef.stat().st_size / 1024), "KB")
