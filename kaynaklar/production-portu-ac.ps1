# Production uygulamasini Windows tarayicisindan acilabilir hale getirir.
#
# Neden gerekli: Production konteyneri portunu sadece WSL icindeki Docker
# koprusunde (172.17.0.1) aciyor; Windows'taki "localhost" oraya ulasamiyor.
# Bu betik WSL icinde 127.0.0.1:<port> -> 172.17.0.1:<port> koprusu kurar.
#
# Her "Run Flow"dan sonra bir kez calistirin (port her seferinde degisir):
#   powershell -ExecutionPolicy Bypass -File kaynaklar\production-portu-ac.ps1
#
# Bkz. MEMORY.md / SORUN-GIDERME.md -> "Production localhost:<port> acilmiyor"

$distro = "aXet-flows_WSL"

$satirlar = wsl.exe -d $distro -- docker ps --filter "name=deptapps-flows-runner" --format "{{.Ports}}"   # "|" kullanmayin: wsl kabugu boru sanar
$portlar = @()
foreach ($s in $satirlar) {
    if ($s -match '172\.17\.0\.1:(\d+)->1880') { $portlar += $Matches[1] }
}

if ($portlar.Count -eq 0) {
    Write-Host "Calisan Production konteyneri yok. Portalda: versiyon satiri -> ... -> Run Flow" -ForegroundColor Yellow
    exit 1
}

# Eski kopruleri kapat (onceki Run Flow'lardan kalanlar)
wsl.exe -d $distro -- sh -c "pkill -f 'socat TCP-LISTEN' 2>/dev/null; true"

foreach ($p in $portlar) {
    # setsid -f SART: nohup/& ile baslatilan surec wsl.exe kapaninca WSL tarafindan oldurulur.
    wsl.exe -d $distro -- sh -c "setsid -f socat TCP-LISTEN:$p,bind=127.0.0.1,reuseaddr,fork TCP:172.17.0.1:$p >/dev/null 2>&1 < /dev/null"
}
Start-Sleep -Seconds 2

foreach ($p in $portlar) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$p/credentials/activate.html" -TimeoutSec 10 -MaximumRedirection 0 -ErrorAction SilentlyContinue
        Write-Host "HAZIR: http://localhost:$p" -ForegroundColor Green
        Write-Host "  AI aktivasyonu: http://localhost:$p/credentials/activate.html"
        Write-Host "  Orbit mail yardimcisi durumu: uygulamada Orbit Notification System > Kurulum ve Mail"
    } catch {
        Write-Host "Kopru kuruldu ama http://localhost:$p yanit vermedi: $($_.Exception.Message)" -ForegroundColor Red
    }
}
