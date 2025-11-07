-- CreateTable
CREATE TABLE "PasskeyHistory" (
    "id" TEXT NOT NULL,
    "passkeyID" TEXT NOT NULL,
    "usedBrowser" TEXT NOT NULL,
    "usedOS" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasskeyHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PasskeyHistory" ADD CONSTRAINT "PasskeyHistory_passkeyID_fkey" FOREIGN KEY ("passkeyID") REFERENCES "Passkey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
