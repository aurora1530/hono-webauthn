export const encodeBytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

export const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/;

export const decodeBase64ToBytes = (value: string): Uint8Array | undefined => {
  if (!BASE64_REGEX.test(value)) {
    return undefined;
  }
  try {
    return Uint8Array.from(Buffer.from(value, "base64"));
  } catch (error) {
    console.error("Failed to decode base64", error);
    return undefined;
  }
};
