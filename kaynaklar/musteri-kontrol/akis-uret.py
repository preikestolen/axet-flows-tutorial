"""musteri-kontrol-akis.json dosyasini .js kaynaklarindan uretir.

Function kodlari ayri .js dosyalarinda durur (okunur, test edilir); bu betik
onlari import edilebilir tek bir akis JSON'una gomer. Kodu degistirdiyseniz
yeniden calistirin:

    python akis-uret.py
"""
import base64
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ortak"))
from form_bilesenleri import indirme_alani  # noqa: E402

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
# Indirme baglantisi uyari kutusunda DEGIL, sayfadaki kalici kutuda (ortak/indirme-bagi-olustur.js)
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


def dosya_oku(id_, ad, yol, x, y, wires, bicim):
    # yol "" ise msg.filename kullanilir; bicim "utf8" (tek metin) ya da "" (Buffer)
    return {"id": id_, "type": "file in", "z": TAB, "name": ad, "filename": yol or "filename",
            "filenameType": "str" if yol else "msg", "format": bicim, "chunk": False, "sendError": False,
            "encoding": "none" if bicim == "" else "utf8", "allProps": True, "x": x, "y": y, "wires": wires}


def dosya_yaz(id_, ad, x, y, encoding, kip):
    # kip: "true" uzerine yaz, "delete" dosyayi sil; dosya adi msg.filename, klasor yoksa olusturulur
    return {"id": id_, "type": "file", "z": TAB, "name": ad, "filename": "filename", "filenameType": "msg",
            "appendNewline": False, "createDir": True, "overwriteFile": kip, "encoding": encoding,
            "x": x, "y": y, "wires": [[]]}


def catch_bos(id_, ad, kaynak, hedef, x, y):
    # file in hata verdiyse (ilk kullanimda dosya yok) bos icerikle devam
    return [{"id": id_, "type": "catch", "z": TAB, "name": ad, "scope": [kaynak], "uncaught": False,
             "x": x, "y": y, "wires": [[id_ + "_f"]]},
            fn(id_ + "_f", "bos liste", BOS_KOD, x + 180, y, [[hedef]])]


BOS_KOD = 'delete msg.error;\nmsg.payload = "";\nreturn msg;\n'


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
form["formStructure"]["components"] += indirme_alani()
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
form2["formStructure"]["components"] = [secim, buton] + indirme_alani()
form2.update({"id": "mk_form2", "name": RAPOR_SAYFASI, "buttons": [buton],
              "x": 150, "y": 600, "wires": [["mk_secim"], ["mk_liste_oku"]]})   # son cikis: onInitForm

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
}, {
    # Gun 3 -- dugumleri ayri sekmede: ../kod-adi-konseyi/akis-uret.py
    "id": "kk_bolum", "text": "Kod Adi Konseyi", "icon": "fa fa-gavel", "data": {}, "type": "section",
    "children": [{"id": "kk_sayfa1", "text": "Konsey", "icon": "fa fa-users", "type": "form",
                  "data": {"form_id": "kk_form_konsey"}, "children": []},
                 {"id": "kk_sayfa2", "text": "Isim Panosu", "icon": "fa fa-trophy", "type": "form",
                  "data": {"form_id": "kk_form_pano"}, "children": []}],
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
     "bufferProp": "payload", "payloadProp": "payload", "x": 760, "y": 320, "wires": [["mk_sakla"]]},
    # rapor Buffer'ini sakla -> kalici rapor listesini oku (yoksa bos) -> kaydet
    fn("mk_sakla", "raporu sakla", "msg.raporBuffer = msg.payload;\nreturn msg;\n", 760, 380, [["mk_liste_oku1"]]),
    dosya_oku("mk_liste_oku1", "raporlar.jsonl oku", "/internal-storage-files/musteri-kontrol/raporlar.jsonl", 960, 380, [["mk_kaydet"]], "utf8"),
    catch_bos("mk_c_liste1", "liste yok", "mk_liste_oku1", "mk_kaydet", 960, 440),
    fn("mk_kaydet", "rapora kaydet", js("07-rapora-kaydet.js"), 1160, 380,
       [["mk_bag"], ["mk_bitti"], ["mk_xls_w"], ["mk_liste_w"], ["mk_sil"]], outputs=5),
    dosya_yaz("mk_xls_w", "raporlar/<ad>.xlsx", 1380, 360, "none", "true"),
    dosya_yaz("mk_liste_w", "raporlar.jsonl", 1380, 400, "utf8", "true"),
    dosya_yaz("mk_sil", "eski raporu sil", 1380, 440, "utf8", "delete"),
    fn("mk_bag", "indirme baglantisi", (ORTAK / "indirme-bagi-olustur.js").read_text(encoding="utf-8"), 1160, 300, [["mk_view"]]),
    view_action("mk_view", "sonucu goster + baglanti", 1360, 300, "success", False,
                "<%= mesaj %> Indirme baglantisi asagida."),
    debug("mk_bitti", "RAPOR HAZIR", 1180, 360, alan="payload", status=True),

    # --- Raporlar sayfasi
    form2,
    dosya_oku("mk_liste_oku", "raporlar.jsonl oku", "/internal-storage-files/musteri-kontrol/raporlar.jsonl", 380, 680, [["mk_liste"]], "utf8"),
    catch_bos("mk_c_liste2", "liste yok", "mk_liste_oku", "mk_liste", 380, 740),
    fn("mk_liste", "rapor listesi", js("08-rapor-listesi.js"), 580, 680, [["mk_view_liste"]]),
    view_action("mk_view_liste", "listeyi goster", 780, 680, "info", False, None),
    fn("mk_secim", "secimi sakla",
       "const v = (msg.payload && msg.payload.data) || (msg.submission && (msg.submission.data || msg.submission)) || {};\n"
       "msg.secilenRapor = v.rapor;\nreturn msg;\n", 380, 560, [["mk_liste_oku3"]]),
    dosya_oku("mk_liste_oku3", "raporlar.jsonl oku", "/internal-storage-files/musteri-kontrol/raporlar.jsonl", 560, 560, [["mk_indir"]], "utf8"),
    catch_bos("mk_c_liste3", "liste yok", "mk_liste_oku3", "mk_indir", 560, 500),
    fn("mk_indir", "rapor indir", js("09-rapor-indir.js"), 760, 560, [["mk_rapor_oku"], ["mk_view_yok"]], outputs=2),
    dosya_oku("mk_rapor_oku", "rapor xlsx oku", "", 960, 560, [["mk_rapor_dosya"]], ""),
    {"id": "mk_c_rapor", "type": "catch", "z": TAB, "name": "rapor dosyasi yok", "scope": ["mk_rapor_oku"],
     "uncaught": False, "x": 960, "y": 620, "wires": [["mk_rapor_yok"]]},
    fn("mk_rapor_yok", "dosya yok mesaji",
       'delete msg.error;\nmsg.messages = { mesaj: "Rapor dosyasi bulunamadi (silinmis olabilir)." };\nreturn msg;\n',
       1160, 620, [["mk_view_yok"]]),
    fn("mk_rapor_dosya", "rapor dosyasi", js("11-rapor-dosyasi.js"), 1160, 560, [["mk_bag2"]]),
    fn("mk_bag2", "indirme baglantisi", (ORTAK / "indirme-bagi-olustur.js").read_text(encoding="utf-8"), 1360, 560, [["mk_view_indir"]]),
    view_action("mk_view_indir", "baglantiyi goster", 1560, 560, "success", False, "<%= mesaj %> Indirme baglantisi asagida."),
    view_action("mk_view_yok", "rapor yok", 1360, 620, "warning", False, "<%= mesaj %>"),


    # Kapsam bilerek SINIRLI: ajan dugumu kendi hata cikisiyla yonetiliyor; o da
    # catch'e dusseydi forma iki kez yanit gidebilirdi.
    {"id": "mk_catch", "type": "catch", "z": TAB, "name": "kontrol hatalari",
     "scope": ["mk_buffer", "mk_oku", "mk_kural", "mk_ai_hz", "mk_ai_cvp", "mk_rapor",
               "mk_xls", "mk_sakla", "mk_kaydet", "mk_bag", "mk_xls_w", "mk_liste_w"],
     "uncaught": False, "x": 160, "y": 460, "wires": [["mk_hata_dbg", "mk_hata_yanit"]]},
    debug("mk_hata_dbg", "KONTROL HATASI", 380, 460, alan="error", status=True),
    fn("mk_hata_yanit", "hata yaniti", js("10-hata-yaniti.js"), 380, 510, [["mk_view_hata"]]),
    view_action("mk_view_hata", "hatayi goster", 600, 510, "danger", False,
                "Kontrol tamamlanamadi: <%= hata %>"),
]

duz = []
for n in akis:
    duz.extend(n if isinstance(n, list) else [n])
akis = duz

hedef = BURASI / "musteri-kontrol-akis.json"
hedef.write_text(json.dumps(akis, indent=1, ensure_ascii=False), encoding="utf-8")
print(hedef.name, len(akis), "dugum,", round(hedef.stat().st_size / 1024), "KB")
