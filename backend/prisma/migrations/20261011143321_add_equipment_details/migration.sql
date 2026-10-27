-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "pcName" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ramGB" INTEGER,
ADD COLUMN     "storageGB" INTEGER;
