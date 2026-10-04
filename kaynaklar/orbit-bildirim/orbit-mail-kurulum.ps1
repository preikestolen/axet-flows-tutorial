# Orbit Notification System -- mail yardimcisi kurulumu
#
# outlook-gonderici.ps1'i %LOCALAPPDATA%\OrbitBildirim\ altina kopyalar ve
# Windows Gorev Zamanlayici'ya "Orbit Bildirim Outlook" gorevi olarak ekler:
# oturum acilinca gizli pencerede baslar. Yonetici yetkisi gerekmez (sadece
# bu kullanici icin). Hemen de baslatir.
#
# Iki dosyayi AYNI klasore indirin, sonra o klasorde:
#   powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1
# Kaldirmak:
#   powershell -ExecutionPolicy Bypass -File orbit-mail-kurulum.ps1 -Kaldir
#
# Uygulamanin (aXet Production) CALISTIGI bilgisayarda kurun. Klasik Outlook
# kurulu ve oturumu acik olmali.

param([switch]$Kaldir)

$GOREV = "Orbit Bildirim Outlook"
$Hedef = Join-Path $env:LOCALAPPDATA "OrbitBildirim"
$Betik = Join-Path $Hedef "outlook-gonderici.ps1"

if ($Kaldir) {
    Stop-ScheduledTask -TaskName $GOREV -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $GOREV -Confirm:$false -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
        Where-Object { $_.CommandLine -like "*OrbitBildirim*outlook-gonderici.ps1*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "Kaldirildi: '$GOREV' gorevi silindi. (Dosyalar: $Hedef -- isterseniz elle silin.)"
    return
}

$kaynak = Join-Path $PSScriptRoot "outlook-gonderici.ps1"
if (-not (Test-Path $kaynak)) {
    Write-Host "HATA: outlook-gonderici.ps1 bu dosyayla ayni klasorde degil ($PSScriptRoot). Iki dosyayi ayni klasore indirin." -ForegroundColor Red
    exit 1
}

# Klasik Outlook var mi?
$com = Get-ItemProperty "Registry::HKEY_CLASSES_ROOT\Outlook.Application\CLSID" -ErrorAction SilentlyContinue
if (-not $com) {
    Write-Host "UYARI: Klasik Outlook bulunamadi. 'Yeni Outlook' bu otomasyonu desteklemez; klasik Outlook gerekir." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force -Path $Hedef | Out-Null
Copy-Item -Force -Path $kaynak -Destination $Betik
Unblock-File -Path $Betik -ErrorAction SilentlyContinue        # internetten indirildi isaretini kaldir

$eylem = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Betik`""
$tetik = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$ayar = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $GOREV -Action $eylem -Trigger $tetik -Settings $ayar `
    -Description "Orbit Notification System: aXet'in biraktigi mailleri klasik Outlook ile gonderir." -Force | Out-Null
Start-ScheduledTask -TaskName $GOREV

Write-Host "Kuruldu: '$GOREV' gorevi oturum acilinca baslayacak; simdi de baslatildi."
Write-Host "Betik: $Betik"
Write-Host "Durumu uygulamadaki 'Kurulum ve Mail' sayfasinda gorursunuz (en gec 15 sn)."
