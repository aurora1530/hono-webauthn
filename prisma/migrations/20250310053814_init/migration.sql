-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "userID" TEXT NOT NULL,
    "webauthnUserID" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "deviceType" VARCHAR(32) NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE INDEX "webauthnUserID" ON "Passkey"("webauthnUserID");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
