# Orbit Notification System -- Outlook gondericisi (Windows tarafi)
#
# Akis (aXet Production konteyneri) gonderilecek mailleri
#   /internal-storage-files/orbit/giden/<zaman>-<proje>.json   {to, subject, html, zaman}
# olarak birakir. Bu klasor Windows'ta
#   %LOCALAPPDATA%\axet-flows\.deptapps-instances\<flowId>\orbit\giden
# altindadir. Betik bu klasorleri izler ve maili ACIK klasik Outlook ile gonderir
# (Gonderilmis Ogeler'de gorunur). Yeni Microsoft girisi gerekmez.
#
# Neden: aXet'in ms-graph-mail-send dugumu (DELEGATED) cihaz kodu girisi ister;
# kurumsal Kosullu Erisim bunu engelleyebiliyor (AADSTS 53003).
#
# Uygulamanin (Production) CALISTIGI bilgisayarda calismalidir.
# Her turda orbit\outlook-gonderici.durum.json yazar; uygulamanin
# "Kurulum ve Mail" sayfasi bunu "yardimci calisiyor mu" diye gosterir.
#
# Guvenlik: sadece izinli alan adlarina (varsayilan nttdata.com, bs.nttdata.com)
# gonderir; digerleri giden\hata\ klasorune tasinir.
#
#   powershell -ExecutionPolicy Bypass -File outlook-gonderici.ps1            (surekli)
#   powershell -ExecutionPolicy Bypass -File outlook-gonderici.ps1 -TekSefer  (bir tur)
# Kalici kurulum: orbit-mail-kurulum.ps1

param(
    [string]$FlowId = "",                       # bos: orbit klasoru olan butun aXet instance'lari
    [string[]]$IzinliAlanlar = @("nttdata.com", "bs.nttdata.com"),
    [int]$AralikSn = 15,
    [switch]$TekSefer
)

$SURUM = "2"

function Kokler {
    # orbit\ klasoru olan instance'lar (Production) + tasarim modu (C:\internal-storage-files)
    $taban = Join-Path $env:LOCALAPPDATA "axet-flows\.deptapps-instances"
    $liste = @()
    if ($FlowId) { $liste += Join-Path $taban "$FlowId\orbit" }
    elseif (Test-Path $taban) {
        $liste += Get-ChildItem -Path $taban -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { Join-Path $_.FullName "orbit" } | Where-Object { Test-Path $_ }
    }
    if (Test-Path "C:\internal-storage-files\orbit") { $liste += "C:\internal-storage-files\orbit" }
    return $liste | Select-Object -Unique
}

$Sayac = @{ gonderilen = 0; hata = 0; son = "" }

function Yaz($kok, $metin) {
    $satir = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $metin
    Write-Host $satir
    Add-Content -Path (Join-Path $kok "outlook-gonderici.log") -Value $satir -Encoding UTF8
}

function OutlookAcikMi {
    # GetActiveObject farkli oturum/yetkide yaniltici "yok" donebiliyor; surece bak
    return [bool](Get-Process -Name OUTLOOK -ErrorAction SilentlyContinue)
}

function Outlook {
    # Outlook acilirken ilk cagrilar "mesgul" (RPC_E_CALL_REJECTED) donebilir: birkac kez dene
    for ($i = 0; $i -lt 10; $i++) {
        try { return [Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application") } catch { }
        try { $o = New-Object -ComObject Outlook.Application; $null = $o.GetNamespace("MAPI"); return $o } catch { }
        Start-Sleep -Seconds 3
    }
    throw "Outlook'a baglanilamadi (klasik Outlook kurulu ve oturum acik mi?)"
}

function Izinli($adres) {
    $alan = ($adres -split "@")[-1].ToLower()
    return $IzinliAlanlar -contains $alan
}

function Gonder($kok, $dosya) {
    $giden = Join-Path $kok "giden"
    $hedef = $null
    try {
        $m = Get-Content -Raw -Encoding UTF8 -Path $dosya.FullName | ConvertFrom-Json
        $alicilar = @("$($m.to)" -split "[,;]" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        if (-not $alicilar.Count) { throw "alici yok" }
        foreach ($a in $alicilar) { if (-not (Izinli $a)) { throw "izinli olmayan alan adi: $a" } }
        if (-not $m.subject -or -not $m.html) { throw "konu ya da govde bos" }

        $o = Outlook
        $posta = $o.CreateItem(0)                 # olMailItem
        $posta.To = ($alicilar -join "; ")
        $posta.Subject = [string]$m.subject
        $posta.HTMLBody = [string]$m.html
        $posta.Send()
        $hedef = Join-Path $giden "gonderildi"
        $Sayac.gonderilen++
        $Sayac.son = "{0} -> {1}" -f $m.subject, ($alicilar -join ", ")
        Yaz $kok ("GONDERILDI  {0}  ({1})" -f $Sayac.son, $dosya.Name)
    } catch {
        $hedef = Join-Path $giden "hata"
        $Sayac.hata++
        Yaz $kok ("HATA  {0}: {1}" -f $dosya.Name, $_.Exception.Message)
        Set-Content -Path (Join-Path $hedef ($dosya.BaseName + ".hata.txt")) -Value $_.Exception.Message -Encoding UTF8
    }
    Move-Item -Force -Path $dosya.FullName -Destination (Join-Path $hedef $dosya.Name)
}

function Nabiz($kok) {
    $d = [ordered]@{
        surum = $SURUM; zaman = (Get-Date).ToUniversalTime().ToString("o"); bilgisayar = $env:COMPUTERNAME
        outlook = $(if (OutlookAcikMi) { "acik" } else { "kapali" }); aralikSn = $AralikSn
        gonderilen = $Sayac.gonderilen; hata = $Sayac.hata; son = $Sayac.son
        bekleyen = @(Get-ChildItem -Path (Join-Path $kok "giden") -Filter *.json -File -ErrorAction SilentlyContinue).Count
    }
    # BOM'suz UTF-8 (akis JSON.parse eder)
    [IO.File]::WriteAllText((Join-Path $kok "outlook-gonderici.durum.json"), ($d | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
}

$ilk = $true
do {
    foreach ($kok in Kokler) {
        $giden = Join-Path $kok "giden"
        New-Item -ItemType Directory -Force -Path $giden, (Join-Path $giden "gonderildi"), (Join-Path $giden "hata") | Out-Null
        if ($ilk) { Yaz $kok "Outlook gondericisi basladi (surum $SURUM). Izinli: $($IzinliAlanlar -join ', ')" }
        # yazilmasi yeni bitmemis dosyaya dokunma (2 sn)
        Get-ChildItem -Path $giden -Filter *.json -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddSeconds(-2) } | Sort-Object Name |
            ForEach-Object { Gonder $kok $_ }
        Nabiz $kok
    }
    $ilk = $false
    if (-not $TekSefer) { Start-Sleep -Seconds $AralikSn }
} while (-not $TekSefer)
