Write-Host "====================================="
Write-Host " IT Operations Hub - Prisma Cleanup"
Write-Host "====================================="

Write-Host "Removing Prisma packages..."

npm uninstall prisma @prisma/client

Write-Host "Installing stable Prisma 6..."

npm install prisma@6 @prisma/client@6

Write-Host ""
Write-Host "Checking Prisma version..."

npx prisma --version

Write-Host ""
Write-Host "Prisma setup completed."