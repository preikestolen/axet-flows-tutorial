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
