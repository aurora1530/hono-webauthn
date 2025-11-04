-- Safely rename columns to preserve data
ALTER TABLE "Passkey"
  RENAME COLUMN "registeredBrowser" TO "createdBrowser";

ALTER TABLE "Passkey"
  RENAME COLUMN "registeredOS" TO "createdOS";
