-- AlterEnum
ALTER TYPE "PasskeyHistoryType" ADD VALUE IF NOT EXISTS 'PRF';

-- CreateTable
CREATE TABLE "PrfCiphertext" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "passkeyID" TEXT NOT NULL,
    "label" VARCHAR(120),
    "ciphertext" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "tag" VARCHAR(64) NOT NULL,
    "associatedData" TEXT,
    "prfInput" VARCHAR(128) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrfCiphertext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrfCiphertext_userID_idx" ON "PrfCiphertext"("userID");
CREATE INDEX "PrfCiphertext_passkeyID_idx" ON "PrfCiphertext"("passkeyID");

-- AddForeignKey
ALTER TABLE "PrfCiphertext" ADD CONSTRAINT "PrfCiphertext_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrfCiphertext" ADD CONSTRAINT "PrfCiphertext_passkeyID_fkey" FOREIGN KEY ("passkeyID") REFERENCES "Passkey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
