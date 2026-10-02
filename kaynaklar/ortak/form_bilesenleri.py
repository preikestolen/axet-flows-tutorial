"""Uretici betiklerin ortak formio bilesenleri."""


def kalici_kutu(alan, sinif):
    """Sayfada KALICI duran HTML kutusu.

    aXet uyarilari (view action mesaji) 10 sn sonra kendiliginden siliniyor.
    Kalici gostermek icin: gizli bir alan (alan) + onu gosteren htmlelement.
    Akis HTML'i msg.submission[alan]'a yazar, view action "update" forma basar,
    htmlelement `{{ data.<alan> }}` ile ham HTML olarak gosterir (HTML'i akista
    escape edin). Bos iken hicbir sey gostermez.
    """
    return [
        {"type": "hidden", "key": alan, "id": "gz" + alan, "input": True, "persistent": False,
         "tableView": False, "clearOnHide": False},
        {"type": "htmlelement", "key": alan + "Goster", "id": "gs" + alan, "input": False, "tag": "div",
         "className": sinif, "content": "{{ data." + alan + " || '' }}", "refreshOnChange": True,
         "attrs": [{"attr": "", "value": ""}]},
    ]


def indirme_alani(alan="indirme", etiket="Rapor (indirmek icin dosya adina tiklayin)"):
    """Kalici indirme kutusu: aciklama metni + salt okunur File bileseni.

    Neden File bileseni: htmlelement icerigi DOMPurify ile temizleniyor ve
    <a href="data:..."> baglantisinin href'i siliniyor (tiklanamaz). File bileseni
    base64 dosyayi kendi koduyla (downloadjs: dogru MIME + dosya adi) indirir.
    Akis msg.submission[alan] = HTML metin, msg.submission[alan + "Dosyasi"] = [dosya]
    yazar (ortak/indirme-bagi-olustur.js).
    """
    return kalici_kutu(alan, "indirme-alani") + [{
        "type": "file", "key": alan + "Dosyasi", "id": "fd" + alan, "label": etiket, "input": True,
        "storage": "base64", "multiple": False, "disabled": True, "image": False, "webcam": False,
        "tableView": False, "persistent": False, "clearOnHide": False, "customClass": "indirme-dosyasi",
        "fileTypes": [{"label": "", "value": ""}], "validate": {"required": False},
        "customConditional": "show = !!(data." + alan + "Dosyasi && data." + alan + "Dosyasi.length);",
        "conditional": {"show": None, "when": None, "eq": ""},
    }]
