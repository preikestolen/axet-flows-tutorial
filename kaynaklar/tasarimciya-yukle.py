"""Uretilen akis JSON'larini calisan aXet tasarimcisina yukler (Admin API).

    python kaynaklar/tasarimciya-yukle.py

Ne yapar:
  1. Tasarimcinin portunu bulur (aXet.flows.exe'nin dinledigi, /settings'e 200 donen port;
     genelde 52333 ama SABIT DEGIL -- yeni surece gore degisiyor).
  2. Her sekmeyi etiketine gore bulur: varsa PUT /flow/<id>, yoksa POST /flow
     (POST yeni sekmeye YENI bir id verir; dugum id'leri korunur).
  3. Gun 2 sekmesindeki application dugumunun Okta config'ini (oktaDb) ve
     Apply Auth App asistaninin ekledigi "Admin. Area" menusunu KORUR.

Sonra: tasarimcida versiyon kaydet (bulut+ok) -> Production -> production-portu-ac.ps1
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

KAYNAK = Path(__file__).parent
SEKMELER = [  # (akis dosyasi, application dugumu bu sekmede mi)
    ("musteri-kontrol/musteri-kontrol-akis.json", True),
    ("hava-nobetcisi/hava-nobetcisi-akis.json", False),
    ("kod-adi-konseyi/kod-adi-konseyi-akis.json", False),
]


def portlar():
    ps = ("Get-NetTCPConnection -State Listen | Where-Object { (Get-Process -Id $_.OwningProcess "
          "-ErrorAction SilentlyContinue).ProcessName -eq 'aXet.flows' } | Select-Object -ExpandProperty LocalPort -Unique")
    cikti = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True).stdout
    return [int(p) for p in cikti.split() if p.strip().isdigit()]


def tasarimci(bekle_sn=300):
    # New Version'dan sonra tasarimci port'u dinler ama 2-3 dk yanit vermeyebilir; bekle.
    import time
    son = time.time() + bekle_sn
    while time.time() < son:
        for p in portlar():
            try:
                if urllib.request.urlopen(f"http://127.0.0.1:{p}/settings", timeout=8).status == 200:
                    return f"http://127.0.0.1:{p}"
            except Exception:
                pass
        print("  tasarimci henuz hazir degil, bekleniyor...")
        time.sleep(10)
    sys.exit("Tasarimci bulunamadi ya da " + str(bekle_sn) + " sn icinde yanit vermedi.")


BASE = tasarimci()


def get(u):
    return json.load(urllib.request.urlopen(BASE + u, timeout=60))


def gonder(u, govde, yontem):
    r = urllib.request.Request(BASE + u, data=json.dumps(govde).encode(), method=yontem,
                               headers={"Content-Type": "application/json"})
    return urllib.request.urlopen(r, timeout=60).status


print("tasarimci:", BASE)
sekmeler = {n["label"]: n["id"] for n in get("/flows") if n["type"] == "tab"}

for dosya, uygulama_burada in SEKMELER:
    akis = json.loads((KAYNAK / dosya).read_text(encoding="utf-8"))
    tab, dugumler = akis[0], akis[1:]
    tid = sekmeler.get(tab["label"])
    configs = []
    if tid:
        canli = get("/flow/" + tid)
        configs = canli.get("configs", [])
        if uygulama_burada:
            eski = next((n for n in canli["nodes"] if n["type"] == "axetflows-app"), None)
            yeni = next(n for n in dugumler if n["type"] == "axetflows-app")
            if eski:
                yeni["id"] = eski["id"]
                yeni["oktaDb"] = eski.get("oktaDb", "")
                yeni["menu"][0]["children"] += [s for s in eski["menu"][0]["children"] if s.get("text") == "Admin. Area"]
                if not yeni["oktaDb"]:
                    print("  UYARI: Okta config yok -- editorde sihirli degnek > Apply Auth App > LocalStorage > OKTA")
    for n in dugumler:
        n["z"] = tid or tab["id"]
    govde = {"id": tid or tab["id"], "label": tab["label"], "info": tab.get("info", ""),
             "disabled": False, "nodes": dugumler, "configs": configs}
    durum = gonder("/flow/" + tid, govde, "PUT") if tid else gonder("/flow", govde, "POST")
    print(f"  {'PUT ' if tid else 'POST'} {tab['label']}: {durum} ({len(dugumler)} dugum)")

son = get("/flows")
app = next(n for n in son if n["type"] == "axetflows-app")
print("menu:", [(s["text"], [c["text"] for c in s.get("children", [])]) for s in app["menu"][0]["children"]])
print("oktaDb:", app.get("oktaDb") or "YOK")
