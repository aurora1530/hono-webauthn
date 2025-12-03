-- CreateIndex
CREATE INDEX "PasskeyHistory_passkeyID_usedAt_idx" ON "PasskeyHistory"("passkeyID", "usedAt" DESC);
