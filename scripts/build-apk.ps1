param([Parameter(Mandatory=$true)][uri]$ServerUrl)
$ErrorActionPreference = 'Stop'
if ($ServerUrl.Scheme -notin @('http','https')) { throw 'Informe uma URL HTTP/HTTPS do jogo e backend.' }
$projectDirectory = Split-Path -Parent $PSScriptRoot
Push-Location $projectDirectory
try {
    $portableJdk = Get-ChildItem -LiteralPath '.tools/jdk' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portableJdk) { $env:JAVA_HOME = $portableJdk.FullName }
    if (Test-Path '.tools/android-sdk') { $env:ANDROID_HOME = (Resolve-Path '.tools/android-sdk').Path }
    if (!$env:JAVA_HOME -or !$env:ANDROID_HOME) { throw 'Configure JAVA_HOME (JDK 21) e ANDROID_HOME (SDK 36).' }
    $env:GRADLE_USER_HOME = Join-Path $projectDirectory '.tools/gradle'
    $env:CAPACITOR_SERVER_URL = $ServerUrl.AbsoluteUri.TrimEnd('/')
    & npm.cmd run build
    if ($LASTEXITCODE) { throw 'Falha na compilação web.' }
    & npx.cmd cap sync android
    if ($LASTEXITCODE) { throw 'Falha na sincronização Android.' }
    Push-Location android
    try {
        & .\gradlew.bat assembleDebug --no-daemon --console=plain
        if ($LASTEXITCODE) { throw 'Falha na compilação Android.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination 'artifacts/Farm-Valley-debug.apk' -Force
    Get-FileHash -LiteralPath 'artifacts/Farm-Valley-debug.apk' -Algorithm SHA256
} finally { Pop-Location }
