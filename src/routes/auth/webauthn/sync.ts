import type { Passkey } from "@prisma/client";

export const isSynced = (passkey: Passkey): boolean => {
  return passkey.backedUp && passkey.deviceType === 'multiDevice';
}