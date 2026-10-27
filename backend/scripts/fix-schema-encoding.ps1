Write-Host "====================================="
Write-Host " IT Operations Hub - Schema Fix"
Write-Host "====================================="

$schema = "prisma\schema.prisma"

$content = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
}
'@

$content | Set-Content $schema -Encoding UTF8

Write-Host "schema.prisma recreated successfully."