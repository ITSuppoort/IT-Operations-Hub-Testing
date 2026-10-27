Write-Host "====================================="
Write-Host " IT Operations Hub - Backend Setup"
Write-Host "====================================="

# Crear estructura principal

$folders = @(
    "src",
    "src/config",
    "src/controllers",
    "src/middleware",
    "src/routes",
    "src/services",
    "src/utils",
    "prisma",
    "logs"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created: $folder"
    }
    else {
        Write-Host "Exists: $folder"
    }
}


# Crear archivos base

$files = @(
    ".env",
    "src/server.ts",
    "src/app.ts"
)

foreach ($file in $files) {

    if (!(Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created file: $file"
    }
    else {
        Write-Host "Exists file: $file"
    }
}


Write-Host ""
Write-Host "Backend structure completed."