"""orbit-bildirim-akis.json dosyasini .js kaynaklarindan uretir.

Ayri sekme ("Orbit Notification System"), AYNI uygulama: menu (Gun 2 sekmesindeki
application dugumu) "Orbit Notification System" bolumunde uc sayfa gosterir:
  Orbit Giris        (ob_form_giris)   -- ozel Orbit kullanicisiyla giris (sifre saklanmaz)
  TS Onayi Listesi   (ob_form_ts)      -- proje sec, TS onayina gonderilmis maddeler (en yeni ustte)
  Kurulum ve Mail    (ob_form_kurulum) -- rehber, mail yardimcisi indirme + canli durumu

Orbit SADECE OKUNUR (giris disinda hep GET). Adres git'e girmez:
    yerel.json  {"adres": "https://<orbit-adresiniz>", "calisma_alani": "<calisma-alani>"}
(yerel.ornek.json'u kopyalayin). Uretilen JSON da adresi icerdigi icin .gitignore'da.

    python akis-uret.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ortak"))
from form_bilesenleri import indirme_alani, kalici_kutu  # noqa: E402
import base64  # noqa: E402
import re  # noqa: E402

BURASI = Path(__file__).parent
KAYNAK = BURASI.parent
TAB = "ob_tab0000000001"
ARALIK_SN = 3600

ayar_dosyasi = BURASI / "yerel.json"
if not ayar_dosyasi.exists():
    sys.exit("yerel.json yok: yerel.ornek.json'u yerel.json olarak kopyalayip Orbit adresini yazin.")
AYAR = json.loads(ayar_dosyasi.read_text(encoding="utf-8"))
ORTAK = ((BURASI / "00-ortak.js").read_text(encoding="utf-8")
         .replace("__ORBIT_ADRES__", AYAR["adres"].rstrip("/"))
         .replace("__CALISMA_ALANI__", AYAR["calisma_alani"]))


# Kurulum ve Mail sayfasinda indirilen betikler function'a base64 gomulur
B64 = {"__GONDERICI_B64__": base64.b64encode((BURASI / "outlook-gonderici.ps1").read_bytes()).decode(),
       "__KURULUM_B64__": base64.b64encode((BURASI / "orbit-mail-kurulum.ps1").read_bytes()).decode()}


HTTP_DUGUMLERI = ["ob_http_csrf", "ob_http_giris", "ob_http_me", "ob_http_projeler", "ob_http_proje",
                  "ob_http_durum", "ob_http_is"]


def js(ad):
    kod = (BURASI / ad).read_text(encoding="utf-8")
    for k, v in B64.items():
        kod = kod.replace(k, v)
    kod = kod.replace("__HTTP_DUGUMLERI__", json.dumps(HTTP_DUGUMLERI))
    return ORTAK + "\n" + kod


def TR(s):
    """{c}{g}{i}{o}{s}{u} (buyukleri de) -> HTML karsiligi; kaynak ASCII kalsin."""
    harf = {"c": "&#231;", "C": "&#199;", "g": "&#287;", "G": "&#286;", "i": "&#305;", "I": "&#304;",
            "o": "&#246;", "O": "&#214;", "s": "&#351;", "S": "&#350;", "u": "&#252;", "U": "&#220;"}
    return re.sub(r"\{([a-zA-Z])\}", lambda m: harf.get(m.group(1), m.group(1)), s)


def fn(id_, ad, dosya, x, y, wires, outputs=1):
    # aXet function dugumu bu uc alani ZORUNLU tutar (MEMORY.md)
    return {"id": id_, "type": "function", "z": TAB, "name": ad, "func": js(dosya), "outputs": outputs,
            "timeout": 0, "setupErrors": 0, "functionErrors": 0, "closeErrors": 0,
            "initialize": "", "finalize": "", "libs": [], "x": x, "y": y, "wires": wires}


def http(id_, ad, ret, x, y, hedef):
    # url / method / headers msg'den; 4xx-5xx hata sayilmaz (yanitKontrol bakar)
    return {"id": id_, "type": "http request", "z": TAB, "name": ad, "method": "use", "ret": ret,
            "paytoqs": "ignore", "url": "", "tls": "", "persist": False, "proxy": "", "insecureHTTPParser": False,
            "authType": "", "senderr": False, "headers": [], "x": x, "y": y, "wires": [[hedef]]}


def dosya_oku(id_, ad, x, y, hedef):
    return {"id": id_, "type": "file in", "z": TAB, "name": ad, "filename": "filename", "filenameType": "msg",
            "format": "utf8", "chunk": False, "sendError": False, "encoding": "utf8", "allProps": True,
            "x": x, "y": y, "wires": [[hedef]]}


def dosya_yaz(id_, ad, x, y):
    return {"id": id_, "type": "file", "z": TAB, "name": ad, "filename": "filename", "filenameType": "msg",
            "appendNewline": False, "createDir": True, "overwriteFile": "true", "encoding": "utf8",
            "x": x, "y": y, "wires": [[]]}


def catch_bos(id_, ad, kaynak, hedef, x, y):
    # file in hata verdiyse (ilk kullanimda dosya yok) bos icerikle devam
    return [{"id": id_, "type": "catch", "z": TAB, "name": ad, "scope": [kaynak], "uncaught": False,
             "x": x, "y": y, "wires": [[id_ + "_f"]]},
            {"id": id_ + "_f", "type": "function", "z": TAB, "name": "dosya yok -> bos",
             "func": 'delete msg.error;\nmsg.payload = "";\nreturn msg;\n', "outputs": 1, "timeout": 0,
             "setupErrors": 0, "functionErrors": 0, "closeErrors": 0, "initialize": "", "finalize": "",
             "libs": [], "x": x + 180, "y": y, "wires": [[hedef]]}]


def view_action(id_, ad, x, y, tur, mesaj):
    return {"id": id_, "type": "axetflows-view-action", "z": TAB, "name": ad, "action": "update",
            "redirectPage": None, "downloadFile": False, "fileName": "", "inputType": "buffer",
            "message": mesaj, "messageType": tur, "x": x, "y": y, "wires": []}


# ------------------------------------------------ sayfalar
ders9 = json.loads((KAYNAK / "ornek-09-form-zincir.json").read_text(encoding="utf-8"))
sablon = next(n for n in ders9 if n["type"] == "axetflows-form")
buton_sablon = sablon["formStructure"]["components"][1]
YOK = {"show": None, "when": None, "eq": ""}

# Orbit Giris
aciklama = {"type": "htmlelement", "key": "aciklama", "id": "obacik1", "input": False, "tag": "div",
            "className": "orbit-aciklama", "attrs": [{"attr": "", "value": ""}], "refreshOnChange": False,
            "content": ("Ozel Orbit kullanicisinin e-posta ve sifresi. Uygulama Orbit'i <b>sadece okur</b>. "
                        "Sifre saklanmaz; oturum uygulama yeniden baslayana kadar bellekte kalir ve saatlik okuma bu oturumla calisir.")}
eposta = {"type": "email", "key": "eposta", "id": "obeposta1", "input": True, "label": "Orbit e-posta",
          "tableView": True, "persistent": False, "validate": {"required": True}, "conditional": YOK}
sifre = {"type": "password", "key": "sifre", "id": "obsifre1", "input": True, "label": "Orbit sifre",
         "tableView": False, "persistent": False, "validate": {"required": True}, "conditional": YOK}
giris_btn = copy.deepcopy(buton_sablon)
giris_btn.update({"label": "Giris yap", "key": "giris", "id": "obgiris1", "leftIcon": "fa fa-sign-in"})
form_giris = copy.deepcopy(sablon)
form_giris["formStructure"]["components"] = [aciklama, eposta, sifre, giris_btn] + kalici_kutu("durum", "orbit-durum")
form_giris.update({"id": "ob_form_giris", "z": TAB, "name": "Orbit Giris", "buttons": [giris_btn], "outputs": 2,
                   "x": 150, "y": 100, "wires": [["ob_g1"], ["ob_g_ac"]]})

# TS Onayi Listesi
proje = {"type": "select", "key": "proje", "label": "Proje", "id": "obproje1", "input": True,
         "placeholder": "Bir proje secin", "widget": "choicesjs", "dataSrc": "values",
         "data": {"values": []}, "valueProperty": "value", "template": "<span>{{ item.label }}</span>",
         "searchEnabled": True, "tableView": True, "persistent": False, "hidden": False,
         "validate": {"required": True}, "conditional": YOK}
listele_btn = copy.deepcopy(buton_sablon)
listele_btn.update({"label": "Listele", "key": "listele", "id": "oblistele1", "leftIcon": "fa fa-refresh"})
KOLONLAR = [("sira", "#"), ("no", "Madde"), ("baslik", "Baslik"), ("tsTarihi", "TS tarihi"),
            ("durum", "Durum (simdi)"), ("yeni", "Yeni")]
tablo = {"type": "datagrid", "key": "tablo", "label": "", "hideLabel": True, "id": "obtablo1", "input": True,
         "disabled": True, "disableAddingRemovingRows": True, "reorder": False, "initEmpty": True,
         "tableView": False, "persistent": False, "customClass": "orbit-tablo",
         "description": "TS onayina gonderilmis maddeler (TS Gerceklesen Tarih dolu ya da durum F_TS Approval Awaiting); "
                        "en yeni ustte. 'Yeni': saatlik okumada ilk kez gorulen.",
         "conditional": YOK,
         "components": [{"type": "textfield", "key": k, "label": b, "id": "ob" + k, "input": True,
                         "disabled": True, "tableView": True} for k, b in KOLONLAR]}
form_ts = copy.deepcopy(sablon)
form_ts["formStructure"]["components"] = [proje, listele_btn] + kalici_kutu("durum", "orbit-durum") + [tablo]
form_ts.update({"id": "ob_form_ts", "z": TAB, "name": "TS Onayi Listesi", "buttons": [listele_btn], "outputs": 2,
                "x": 150, "y": 400, "wires": [["ob_l1"], ["ob_t_ac"]]})

# Kurulum ve Mail (yardimci durumu + indirilecek iki betik + rehber)
REHBER = TR(r"""
<div class="orbit-rehber">
<h4>Bu b{o}l{u}m ne yapar?</h4>
<p>Orbit'te se{c}ti{g}iniz projede <b>TS onay{i}na g{o}nderilmi{s}</b> maddeleri listeler; durumu
<b>F_TS Approval Awaiting</b> olanlar{i} (onay bekleyen TS'ler) <b>Orbit'e giri{s} yapt{i}{g}{i}n{i}z e-posta adresine</b> mail atar.
Orbit'e hi{c}bir {s}ey yaz{i}lmaz; uygulama Orbit'i <b>yaln{i}zca okur</b>.</p>

<h4>Gerekenler</h4>
<ol>
<li><b>Orbit kullan{i}c{i}s{i}</b> (e-posta + {s}ifre). {S}ifre saklanmaz; oturum uygulama yeniden ba{s}layana kadar bellekte kal{i}r.</li>
<li>Uygulaman{i}n (aXet Production) <b>{c}al{i}{s}t{i}{g}{i} bilgisayarda</b>: Windows, <b>klasik Outlook</b> (oturumu a{c}{i}k;
"Yeni Outlook" olmaz) ve yukar{i}daki <b>mail yard{i}mc{i}s{i}</b>. Uygulamay{i} sadece web ba{g}lant{i}s{i}yla kullananlar{i}n
kendi bilgisayar{i}na kurmas{i} gerekmez.</li>
</ol>
<p class="orbit-not">Neden yard{i}mc{i}? aXet'in kendi Microsoft mail d{u}{g}{u}m{u} cihaz kodu giri{s}i istiyor; kurumun
Ko{s}ullu Eri{s}im kural{i} bunu engelliyor (hata 53003). Yard{i}mc{i} maili zaten a{c}{i}k olan Outlook ile g{o}nderir;
mail o hesaptan gider ve G{o}nderilmi{s} {O}{g}eler'de g{o}r{u}n{u}r.</p>

<h4>Kurulum (bir kez, uygulaman{i}n {c}al{i}{s}t{i}{g}{i} bilgisayarda)</h4>
<ol>
<li>Yukar{i}daki <b>iki dosyay{i}</b> ayn{i} klas{o}re indirin (dosya ad{i}na t{i}klay{i}n). Taray{i}c{i} uyar{i}rsa "Sakla" deyin.</li>
<li>O klas{o}rde PowerShell a{c}{i}n ve {c}al{i}{s}t{i}r{i}n:<br>
<code>powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1</code></li>
<li>Kurulum yard{i}mc{i}y{i} <b>G{o}rev Zamanlay{i}c{i}</b>'ya ekler: Windows oturumu a{c}{i}l{i}nca gizli pencerede ba{s}lar,
15 sn'de bir mail kuyru{g}una bakar. Y{o}netici yetkisi gerekmez.</li>
<li>Bu sayfay{i} yeniden a{c}{i}n: durum kutusunda <b>"Mail yard{i}mc{i}s{i} {c}al{i}{s}{i}yor"</b> yazmal{i}.</li>
</ol>
<p>Kald{i}rmak i{c}in: <code>powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1 -Kaldir</code></p>

<h4>Kullan{i}m</h4>
<ol>
<li><b>Orbit Giris</b>: Orbit e-posta ve {s}ifrenizle giri{s} yap{i}n.</li>
<li><b>TS Onayi Listesi</b>: proje se{c}in, <b>Listele</b>'ye bas{i}n. Liste en yeniden eskiye gelir; onay bekleyen TS'ler
<b>hemen</b> mail olarak g{o}nderilir (bekleyen yoksa "bekleyen yok" maili).</li>
<li><b>Otomatik:</b> uygulama saatte bir son se{c}ilen projeyi okur; onay bekleyen liste <b>de{g}i{s}tiyse</b> mail atar
(ayn{i} liste i{c}in her saat tekrar mail gelmez).</li>
</ol>

<h4>Bilinmesi gerekenler</h4>
<ul>
<li>Uygulama yeniden ba{s}larsa (yeni versiyon / Run Flow) <b>Orbit Giris'i tekrar yap{i}n</b>; aksi halde saatlik okuma durur.
Son liste ve proje se{c}imi saklan{i}r.</li>
<li>Bilgisayar ya da Outlook kapal{i}yken mail gitmez; kuyrukta bekler, a{c}{i}l{i}nca g{o}nderilir.</li>
<li>Yard{i}mc{i} yaln{i}zca <b>nttdata.com</b> ve <b>bs.nttdata.com</b> adreslerine g{o}nderir.</li>
<li>Kay{i}tlar: <code>%LOCALAPPDATA%\axet-flows\.deptapps-instances\&lt;flowId&gt;\orbit\</code>
(giden mailler ve <code>outlook-gonderici.log</code>).</li>
</ul>
</div>
""")


def baslik(key, metin):
    return {"type": "htmlelement", "key": key, "id": "ob" + key, "input": False, "tag": "h4", "className": "orbit-baslik",
            "attrs": [{"attr": "", "value": ""}], "refreshOnChange": False, "content": TR(metin)}


rehber = {"type": "htmlelement", "key": "rehber", "id": "obrehber1", "input": False, "tag": "div",
          "className": "orbit-rehber-kap", "attrs": [{"attr": "", "value": ""}], "refreshOnChange": False, "content": REHBER}
form_kurulum = copy.deepcopy(sablon)
form_kurulum["formStructure"]["components"] = (
    [baslik("durumBaslik", "Mail yard{i}mc{i}s{i}n{i}n durumu")] + kalici_kutu("yardimciDurum", "orbit-durum") +
    [baslik("indirBaslik", "{I}ndirilecek dosyalar")] +
    indirme_alani("gonderici", "") + indirme_alani("kurulum", "") + [rehber])
for b in form_kurulum["formStructure"]["components"]:          # dosya etiketleri kutuda yaziyor; tekrarlamasin
    if b["type"] == "file":
        b.update({"label": "", "hideLabel": True})
form_kurulum.update({"id": "ob_form_kurulum", "z": TAB, "name": "Kurulum ve Mail", "buttons": [], "outputs": 1,
                     "x": 150, "y": 1180, "wires": [["ob_k_ac"]]})

TUM_FN = ["ob_g1", "ob_g2", "ob_g3", "ob_g4", "ob_g_ac", "ob_t_ac", "ob_t_proj", "ob_t_isle", "ob_t_tablo",
          "ob_l1", "ob_l2", "ob_l3", "ob_l4", "ob_l5", "ob_l6", "ob_z",
          "ob_http_csrf", "ob_http_giris", "ob_http_me", "ob_http_projeler", "ob_http_proje", "ob_http_durum",
          "ob_http_is", "ob_anlik_yaz", "ob_secim_yaz", "ob_mail_ok", "ob_mail_hata", "ob_k_ac", "ob_k_goster"]

akis = [
    {"id": TAB, "type": "tab", "label": "Orbit Notification System", "disabled": False,
     "info": "Orbit (Plane) -> TS onayina gonderilmis maddeler. SADECE OKUMA.\n"
             "Kalici: /internal-storage-files/orbit/secim.json, /internal-storage-files/orbit/projeler/<id>.json\n"
             "Oturum: flow context (bellek). Sifre hicbir yere yazilmaz."},

    # --- Orbit Giris
    form_giris,
    fn("ob_g1", "giris hazirla", "01-giris-hazirla.js", 360, 60, [["ob_http_csrf"], ["ob_view_giris"]], outputs=2),
    http("ob_http_csrf", "GET csrf", "obj", 560, 60, "ob_g2"),
    fn("ob_g2", "giris gonder", "02-giris-gonder.js", 740, 60, [["ob_http_giris"]]),
    http("ob_http_giris", "POST sign-in", "txt", 920, 60, "ob_g3"),
    fn("ob_g3", "giris sonucu", "03-giris-sonuc.js", 1100, 60, [["ob_http_me"], ["ob_view_giris"]], outputs=2),
    http("ob_http_me", "GET users/me", "obj", 1280, 40, "ob_g4"),
    fn("ob_g4", "oturumu kaydet", "04-oturum-kaydet.js", 1460, 40, [["ob_view_giris"]]),
    view_action("ob_view_giris", "giris sonucu", 1660, 100, "info", "<%= mesaj %>"),
    fn("ob_g_ac", "oturum durumu", "05-giris-durumu.js", 360, 160, [["ob_view_ac"]]),
    view_action("ob_view_ac", "sayfayi doldur", 560, 160, "info", None),

    # --- TS Onayi Listesi: sayfa acilisi (onbellekten, hizli)
    form_ts,
    fn("ob_t_ac", "sayfa acildi", "06-ts-ac.js", 360, 460, [["ob_t_secim_oku"]]),
    dosya_oku("ob_t_secim_oku", "secim.json oku", 540, 460, "ob_t_proj"),
    *catch_bos("ob_c_t_secim", "secim yok", "ob_t_secim_oku", "ob_t_proj", 540, 520),
    fn("ob_t_proj", "projeleri iste", "07-projeler-iste.js", 740, 460, [["ob_http_projeler"], ["ob_t_isle"]], outputs=2),
    http("ob_http_projeler", "GET projects", "obj", 920, 440, "ob_t_isle"),
    fn("ob_t_isle", "proje secimi", "08-projeler-isle.js", 1100, 460, [["ob_t_anlik_oku"], ["ob_view_ac"]], outputs=2),
    dosya_oku("ob_t_anlik_oku", "anlik goruntu oku", 1280, 460, "ob_t_tablo"),
    *catch_bos("ob_c_t_anlik", "anlik yok", "ob_t_anlik_oku", "ob_t_tablo", 1280, 520),
    fn("ob_t_tablo", "tabloyu kur", "09-tablo-goster.js", 1480, 460, [["ob_view_ac"]]),

    # --- Listele (form) ve saatlik okuma: ayni zincir
    fn("ob_l1", "listele hazirla", "10-listele-hazirla.js", 360, 620, [["ob_http_proje"], ["ob_view_ts"]], outputs=2),
    http("ob_http_proje", "GET project", "obj", 540, 620, "ob_l2"),
    fn("ob_l2", "proje", "11-proje-isle.js", 720, 620, [["ob_http_durum"]]),
    http("ob_http_durum", "GET states", "obj", 900, 620, "ob_l3"),
    fn("ob_l3", "durumlar", "12-durumlar-isle.js", 1080, 620, [["ob_l_anlik_oku"]]),
    dosya_oku("ob_l_anlik_oku", "onceki anlik goruntu", 1260, 620, "ob_l4"),
    *catch_bos("ob_c_l_anlik", "ilk okuma", "ob_l_anlik_oku", "ob_l4", 1260, 680),
    fn("ob_l4", "sayfalamayi baslat", "13-sayfa-baslat.js", 360, 760, [["ob_http_is"]]),
    http("ob_http_is", "GET issues (1000)", "obj", 560, 760, "ob_l5"),
    fn("ob_l5", "sayfayi topla", "14-sayfa-topla.js", 760, 760, [["ob_http_is"], ["ob_l6"]], outputs=2),
    fn("ob_l6", "TS listesi", "15-ts-listesi.js", 960, 760,
       [["ob_anlik_yaz"], ["ob_secim_yaz"], ["ob_view_ts"], ["ob_mail"]], outputs=4),
    dosya_yaz("ob_anlik_yaz", "projeler/<id>.json", 1180, 720),
    dosya_yaz("ob_secim_yaz", "secim.json", 1180, 760),
    view_action("ob_view_ts", "listeyi goster", 1180, 820, "info", "<%= mesaj %>"),

    # --- mail: onay bekleyen TS'ler -> orbit/giden/*.json; Windows'ta outlook-gonderici.ps1 acik
    # Outlook ile gonderir (MS Graph DELEGATED bu kurumda Kosullu Erisimle engelli, AADSTS 53003)
    {"id": "ob_mail", "type": "file", "z": TAB, "name": "orbit/giden/<zaman>.json", "filename": "filename",
     "filenameType": "msg", "appendNewline": False, "createDir": True, "overwriteFile": "true", "encoding": "utf8",
     "x": 1200, "y": 880, "wires": [["ob_mail_ok"]]},
    fn("ob_mail_ok", "mail siraya alindi", "18-mail-sonucu.js", 1420, 880, [[]]),
    {"id": "ob_catch_mail", "type": "catch", "z": TAB, "name": "mail hatasi", "scope": ["ob_mail"], "uncaught": False,
     "x": 1200, "y": 940, "wires": [["ob_mail_hata"]]},
    fn("ob_mail_hata", "mail hatasi", "19-mail-hatasi.js", 1420, 940, [[]]),

    {"id": "ob_zaman", "type": "inject", "z": TAB, "name": "her saat", "props": [],
     "repeat": str(ARALIK_SN), "crontab": "", "once": True, "onceDelay": 120, "topic": "",
     "x": 150, "y": 900, "wires": [["ob_z"]]},
    fn("ob_z", "saatlik okuma", "17-zamanlayici.js", 360, 900, [["ob_z_secim_oku"]]),
    dosya_oku("ob_z_secim_oku", "secim.json oku", 560, 900, "ob_l1"),
    *catch_bos("ob_c_z_secim", "secim yok", "ob_z_secim_oku", "ob_l1", 560, 960),

    # --- Kurulum ve Mail sayfasi
    form_kurulum,
    fn("ob_k_ac", "sayfa acildi", "21-kurulum-ac.js", 360, 1180, [["ob_k_durum_oku"]]),
    dosya_oku("ob_k_durum_oku", "yardimci durumu oku", 560, 1180, "ob_k_goster"),
    *catch_bos("ob_c_k_durum", "durum yok", "ob_k_durum_oku", "ob_k_goster", 560, 1240),
    fn("ob_k_goster", "kurulum sayfasi", "20-kurulum-sayfasi.js", 780, 1180, [["ob_view_ac"]]),

    # --- hatalar
    {"id": "ob_catch", "type": "catch", "z": TAB, "name": "orbit hatalari", "scope": TUM_FN, "uncaught": False,
     "x": 150, "y": 1060, "wires": [["ob_ag"]]},
    # gecici ag hatasi (ENETUNREACH...) -> 5 sn sonra ayni http dugumune, en fazla 3 kez
    fn("ob_ag", "ag hatasi mi?", "22-ag-yeniden.js", 330, 1060, [["ob_hata"], ["ob_ag_bekle"]], outputs=2),
    {"id": "ob_ag_bekle", "type": "delay", "z": TAB, "name": "5 sn bekle", "pauseType": "delay",
     "timeout": "5", "timeoutUnits": "seconds", "rate": "1", "nbRateUnits": "1", "rateUnits": "second",
     "randomFirst": "1", "randomLast": "5", "randomUnits": "seconds", "drop": False, "allowrate": False,
     "outputs": 1, "x": 520, "y": 1120, "wires": [["ob_ag_yon"]]},
    fn("ob_ag_yon", "ayni istegi tekrarla", "23-ag-yonlendir.js", 720, 1120,
       [[h] for h in HTTP_DUGUMLERI], outputs=len(HTTP_DUGUMLERI)),
    fn("ob_hata", "hata yaniti", "16-hata.js", 560, 1000, [["ob_view_hata"]]),
    view_action("ob_view_hata", "hatayi goster", 560, 1060, "danger", "<%= mesaj %>"),
]

hedef = BURASI / "orbit-bildirim-akis.json"
hedef.write_text(json.dumps(akis, indent=1, ensure_ascii=False), encoding="utf-8")
print(hedef.name, len(akis), "dugum,", round(hedef.stat().st_size / 1024), "KB")
