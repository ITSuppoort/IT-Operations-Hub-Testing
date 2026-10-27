-- Safe additive migration: optional equipment type
ALTER TABLE "Equipment" ADD COLUMN "type" TEXT;
