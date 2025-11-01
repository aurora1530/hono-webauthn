/*
  Warnings:

  - Added the required column `userAgent` to the `Passkey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Passkey" ADD COLUMN     "userAgent" TEXT NOT NULL;
