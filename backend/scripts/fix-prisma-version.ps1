Write-Host "====================================="
Write-Host " IT Operations Hub - Prisma Fix"
Write-Host "====================================="

Write-Host "Removing Prisma RC version..."

npm uninstall prisma @prisma/client

Write-Host "Installing stable Prisma..."

npm install prisma@6 @prisma/client@6

Write-Host ""
Write-Host "Checking version..."

npx prisma --version

Write-Host ""
Write-Host "Prisma stable installation completed."