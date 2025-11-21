-- CreateEnum
CREATE TYPE "PasskeyHistoryType" AS ENUM ('LOGIN', 'REAUTH', 'TEST');

-- AlterTable
ALTER TABLE "PasskeyHistory" ADD COLUMN     "type" "PasskeyHistoryType" NOT NULL DEFAULT 'LOGIN';
