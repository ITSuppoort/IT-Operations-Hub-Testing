Write-Host "====================================="
Write-Host " IT Operations Hub - Schema Repair"
Write-Host "====================================="


# Always execute from backend root
$projectRoot = Split-Path $PSScriptRoot -Parent

Set-Location $projectRoot


$schemaPath = Join-Path $projectRoot "prisma\schema.prisma"


Write-Host ""
Write-Host "Project Root:"
Write-Host $projectRoot


Write-Host ""
Write-Host "Reading schema..."

$content = Get-Content $schemaPath -Raw


# Remove UTF-8 BOM
$content = $content.TrimStart([char]0xFEFF)


Write-Host "Writing clean UTF-8 without BOM..."


$utf8 = New-Object System.Text.UTF8Encoding($false)


[System.IO.File]::WriteAllText(
    $schemaPath,
    $content,
    $utf8
)


Write-Host ""
Write-Host "Schema repaired successfully."


Write-Host ""
Write-Host "Validating Prisma..."


npx prisma validate