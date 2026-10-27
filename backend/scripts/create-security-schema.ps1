Write-Host "====================================="
Write-Host " IT Operations Hub - Security Schema"
Write-Host "====================================="

$schemaPath = ".\prisma\schema.prisma"
$backupPath = ".\prisma\schema.backup.prisma"


Write-Host ""
Write-Host "Creating schema backup..."

if (Test-Path $schemaPath) {

    Copy-Item $schemaPath $backupPath -Force

    Write-Host "Backup created:"
    Write-Host $backupPath
}


Write-Host ""
Write-Host "Creating security database schema..."


$schema = @'
// IT Operations Hub Security Schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}


// ========================
// SYSTEM USERS
// ========================

model SystemUser {

  id           String   @id @default(uuid())

  firstName    String
  lastName     String

  email        String   @unique
  backupEmail  String?

  passwordHash String

  status       String   @default("ACTIVE")

  lastLogin    DateTime?

  roleId       String?

  role         Role? @relation(fields: [roleId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt


  sessions     Session[]
  resets       PasswordReset[]
  codes        VerificationCode[]
  logs         SecurityLog[]

}


// ========================
// ROLES
// ========================

model Role {

  id String @id @default(uuid())

  name String @unique

  users SystemUser[]

  permissions RolePermission[]

  createdAt DateTime @default(now())

}


// ========================
// PERMISSIONS
// ========================

model Permission {

  id String @id @default(uuid())

  name String @unique

  roles RolePermission[]

}


// ========================
// ROLE PERMISSIONS
// ========================

model RolePermission {

  id String @id @default(uuid())

  roleId String

  permissionId String


  role Role @relation(fields: [roleId], references: [id])

  permission Permission @relation(fields: [permissionId], references: [id])


  @@unique([roleId, permissionId])

}


// ========================
// PASSWORD RESET
// ========================

model PasswordReset {

  id String @id @default(uuid())

  userId String

  token String @unique

  expiresAt DateTime

  used Boolean @default(false)


  user SystemUser @relation(fields: [userId], references: [id])


  createdAt DateTime @default(now())

}


// ========================
// EMAIL VERIFICATION
// ========================

model VerificationCode {

  id String @id @default(uuid())

  userId String

  code String

  expiresAt DateTime

  used Boolean @default(false)


  user SystemUser @relation(fields: [userId], references: [id])


  createdAt DateTime @default(now())

}


// ========================
// USER SESSIONS
// ========================

model Session {

  id String @id @default(uuid())


  userId String

  token String @unique

  ipAddress String?

  device String?


  expiresAt DateTime


  user SystemUser @relation(fields: [userId], references: [id])


  createdAt DateTime @default(now())

}


// ========================
// SECURITY LOGS
// ========================

model SecurityLog {

  id String @id @default(uuid())


  userId String

  action String

  ipAddress String?


  user SystemUser @relation(fields: [userId], references: [id])


  createdAt DateTime @default(now())

}

'@


Write-Host ""
Write-Host "Writing schema without BOM..."


[System.IO.File]::WriteAllText(
    $schemaPath,
    $schema,
    New-Object System.Text.UTF8Encoding($false)
)


Write-Host ""
Write-Host "Security schema created successfully."


Write-Host ""
Write-Host "Validating Prisma..."


npx prisma validate


Write-Host ""
Write-Host "Finished."