import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export const isAuthenticatorTransportFuture = (
  target: unknown,
): target is AuthenticatorTransportFuture => {
  if (typeof target !== "string") {
    return false;
  }
  return ["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"].includes(target);
};
