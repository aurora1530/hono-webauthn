/*
  Warnings:

  - You are about to drop the column `userAgent` on the `Passkey` table. All the data in the column will be lost.
  - Added the required column `registeredBrowser` to the `Passkey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registeredOS` to the `Passkey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Passkey" DROP COLUMN "userAgent",
ADD COLUMN     "registeredBrowser" TEXT NOT NULL,
ADD COLUMN     "registeredOS" TEXT NOT NULL;
