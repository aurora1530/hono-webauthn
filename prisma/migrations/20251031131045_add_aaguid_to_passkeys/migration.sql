/*
  Warnings:

  - Added the required column `aaguid` to the `Passkey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Passkey" ADD COLUMN     "aaguid" VARCHAR(36) NOT NULL;
