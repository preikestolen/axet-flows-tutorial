"""Test icin ornek musteri ana verisi uretir: icinde bilerek gizlenmis hatalar var.

Cikti:
  ornek-musteri.xlsx   -- akisa yuklenecek dosya
  beklenen.json        -- olmasi gereken hatalarin tam listesi (satir, kolon, kural)

Calistirma:  python ornek-uret.py
"""
import json
import random
from pathlib import Path

from openpyxl import Workbook

random.seed(42)
BURASI = Path(__file__).parent


def iban_uret(ulke, bban):
    duzen = bban + ulke + "00"
    sayi = "".join(str(int(c, 36)) for c in duzen)
    kontrol = 98 - int(sayi) % 97
    return f"{ulke}{kontrol:02d}{bban}"


def tr_iban():
    return iban_uret("TR", "".join(random.choice("0123456789") for _ in range(5)) + "0"
                     + "".join(random.choice("0123456789") for _ in range(16)))


def bosluklu(iban):
    return " ".join(iban[i:i + 4] for i in range(0, len(iban), 4))


BASLIK = ["Musteri No*", "Unvan*", "Vergi No*", "Vergi Dairesi", "Ulke*", "Sehir", "IBAN"]
SEHIR = ["Istanbul", "Ankara", "Izmir", "Bursa", "Kocaeli", "Antalya", "Konya", "Kayseri"]

satirlar = []
for i in range(1, 41):
    satirlar.append({
        "Musteri No*": f"M-{1000 + i}",
        "Unvan*": f"Ornek Ticaret {i} A.S.",
        "Vergi No*": str(1000000000 + i * 7919),
        "Vergi Dairesi": random.choice(["Kadikoy", "Cankaya", "Konak", "Nilufer"]),
        "Ulke*": "TR",
        "Sehir": random.choice(SEHIR),
        "IBAN": tr_iban(),
    })

beklenen = []


def hata(idx, kolon, kural):
    beklenen.append({"satir": idx + 2, "kolon": kolon, "kural": kural})


# ---------------- TEMIZ ama tuzak satirlar (isaretlenmemeli) ----------------
satirlar[2]["IBAN"] = bosluklu(satirlar[2]["IBAN"])          # bosluklu yazim gecerli
satirlar[3]["Ulke*"] = "DE"; satirlar[3]["Sehir"] = "Berlin"
satirlar[3]["IBAN"] = iban_uret("DE", "370400440532013000")  # gecerli DE IBAN
satirlar[4]["IBAN"] = ""                                       # IBAN zorunlu degil
satirlar[5]["Unvan*"] = satirlar[6]["Unvan*"]                  # ayni unvan, farkli VKN -> sorun degil
satirlar[7]["Ulke*"] = "AZ"; satirlar[7]["IBAN"] = iban_uret("AZ", "NABZ00000000137010001944")
satirlar[8]["Sehir"] = ""                                      # zorunlu olmayan bos alan
satirlar[9]["Vergi Dairesi"] = ""                              # zorunlu olmayan bos alan
satirlar[10]["Vergi No*"] = int(satirlar[10]["Vergi No*"])     # sayi olarak saklanan VKN
satirlar[11]["IBAN"] = satirlar[11]["IBAN"].lower()            # kucuk harf IBAN -> normalize edilir

# ---------------- GIZLI HATALAR ----------------
# 1) Zorunlu alan bos
satirlar[12]["Unvan*"] = ""; hata(12, "Unvan*", "ZORUNLU_BOS")
satirlar[15]["Vergi No*"] = "   "; hata(15, "Vergi No*", "ZORUNLU_BOS")       # sadece bosluk
satirlar[19]["Ulke*"] = ""; hata(19, "Ulke*", "ZORUNLU_BOS")
satirlar[27]["Musteri No*"] = ""; hata(27, "Musteri No*", "ZORUNLU_BOS")

# 2) Vergi no tekrari
satirlar[21]["Vergi No*"] = satirlar[17]["Vergi No*"]
hata(17, "Vergi No*", "VERGI_TEKRAR"); hata(21, "Vergi No*", "VERGI_TEKRAR")
v = satirlar[24]["Vergi No*"]                                   # bicimi farkli, numara ayni
satirlar[33]["Vergi No*"] = f"{v[:3]} {v[3:6]} {v[6:]}"
hata(24, "Vergi No*", "VERGI_TEKRAR"); hata(33, "Vergi No*", "VERGI_TEKRAR")
satirlar[36]["Vergi No*"] = int(satirlar[30]["Vergi No*"])      # biri sayi, biri metin
hata(30, "Vergi No*", "VERGI_TEKRAR"); hata(36, "Vergi No*", "VERGI_TEKRAR")

# 3) Gecersiz ulke kodu
for idx, kod in [(13, "UK"), (22, "tr"), (26, "TUR"), (31, "XX")]:
    satirlar[idx]["Ulke*"] = kod; hata(idx, "Ulke*", "ULKE_GECERSIZ")

# 4) Bozuk IBAN
ib = satirlar[14]["IBAN"]                                       # tek hane degisti
satirlar[14]["IBAN"] = ib[:10] + str((int(ib[10]) + 1) % 10) + ib[11:]; hata(14, "IBAN", "IBAN_BOZUK")
satirlar[23]["IBAN"] = satirlar[23]["IBAN"][:-1]; hata(23, "IBAN", "IBAN_BOZUK")          # eksik hane
ib = satirlar[29]["IBAN"]; satirlar[29]["IBAN"] = ib[:8] + "O" + ib[9:]; hata(29, "IBAN", "IBAN_BOZUK")  # 0 yerine O
satirlar[35]["IBAN"] = "TR12-3456-7890"; hata(35, "IBAN", "IBAN_BOZUK")

# Ayni satirda iki hata
satirlar[38]["Unvan*"] = ""; hata(38, "Unvan*", "ZORUNLU_BOS")
satirlar[38]["Ulke*"] = "Turkiye"; hata(38, "Ulke*", "ULKE_GECERSIZ")

wb = Workbook()
ws = wb.active
ws.title = "Musteriler"
ws.append(BASLIK)
for s in satirlar:
    ws.append([s[b] for b in BASLIK])
ws.insert_rows(20)                                              # ortada tamamen bos satir -- atlanmali
for b in beklenen:
    if b["satir"] >= 20:
        b["satir"] += 1

wb.save(BURASI / "ornek-musteri.xlsx")
beklenen.sort(key=lambda b: (b["satir"], b["kolon"]))
(BURASI / "beklenen.json").write_text(json.dumps(beklenen, indent=1, ensure_ascii=False), encoding="utf-8")
print(len(satirlar), "satir,", len(beklenen), "beklenen hata,",
      len({b['satir'] for b in beklenen}), "hatali satir")
