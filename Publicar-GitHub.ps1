param(
    [Parameter(Mandatory=$true)][string]$RepoUrl
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path 'frontend/package.json') -or !(Test-Path 'backend/package.json')) {
    throw 'No estas en la carpeta extraida del paquete.'
}
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instala Git for Windows primero.' }
$danger = Get-ChildItem . -Recurse -File -Force | Where-Object {
    $_.FullName -notmatch '[\\/](node_modules|\.git)[\\/]' -and
    ($_.Name -eq '.env' -or $_.Name -like '.env.*' -and $_.Name -ne '.env.example' -or
     $_.Extension -in @('.pem','.pfx','.p12','.key','.sqlite','.db'))
}
if ($danger) { $danger | Select-Object -ExpandProperty FullName; throw 'Archivos sensibles detectados: cancelado.' }
if (Test-Path '.git') { throw 'Ya existe .git: evita sobrescribir o mezclar repositorios.' }
& git init -b main
if ($LASTEXITCODE -ne 0) {throw 'git init fallo'}
& git add -- frontend backend render.yaml .gitignore GUIA-DESPLIEGUE.txt Publicar-GitHub.ps1
if ($LASTEXITCODE -ne 0) {throw 'git add fallo'}
$tracked = & git diff --cached --name-only
if ($tracked | Where-Object {$_ -match '(^|/)(\.env($|\.)|node_modules|\.next|dist/|.*\.pem$|.*\.key$)' -and $_ -notmatch '\.env\.example$'}) {
    throw 'Archivo sensible preparado para commit. Cancelado.'
}
Write-Host 'Resumen del commit:' -ForegroundColor Cyan
& git diff --cached --stat
& git commit -m 'Deploy snapshot: IT Operations Hub frontend and backend'
if ($LASTEXITCODE -ne 0) {throw 'git commit fallo: configure user.name/user.email'}
& git remote add origin $RepoUrl
if ($LASTEXITCODE -ne 0) {throw 'No se pudo establecer remote'}
Write-Host 'Subiendo al repositorio remoto privado...' -ForegroundColor Yellow
& git push -u origin main
if ($LASTEXITCODE -ne 0) {throw 'GitHub push fallo: comprueba URL y autenticacion'}
Write-Host 'Push realizado. Sigue con Render y Vercel.' -ForegroundColor Green
