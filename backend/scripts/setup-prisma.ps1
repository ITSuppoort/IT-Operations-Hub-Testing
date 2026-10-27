Write-Host "====================================="
Write-Host " IT Operations Hub - Prisma Setup"
Write-Host "====================================="

if (!(Test-Path "prisma")) {
    New-Item -ItemType Directory -Path "prisma"
    Write-Host "Created prisma folder"
}

if (!(Test-Path "prisma\schema.prisma")) {

@"
// IT Operations Hub Database Schema

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
"@ | Out-File prisma\schema.prisma -Encoding UTF8

Write-Host "Created schema.prisma"

}
else {

Write-Host "schema.prisma already exists"

}

Write-Host ""
Write-Host "Prisma setup completed."