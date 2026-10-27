Write-Host "====================================="
Write-Host " IT Operations Hub - Prisma Config Cleanup"
Write-Host "====================================="

$configFile = "prisma.config.ts"

if (Test-Path $configFile) {

    Remove-Item $configFile

    Write-Host "Removed old Prisma 8 config:"
    Write-Host $configFile

}
else {

    Write-Host "No prisma.config.ts found"

}


Write-Host ""
Write-Host "Prisma config cleanup completed."
