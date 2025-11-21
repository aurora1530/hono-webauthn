import { decodeBase64ToBytes, encodeBytesToBase64Url } from "../base64.ts";

export const buildPrfExtensions = (
  bytes?: Uint8Array,
): PublicKeyCredentialRequestOptionsJSON["extensions"] | undefined =>
  bytes
    ? ({
      prf: {
        eval: {
          first: encodeBytesToBase64Url(bytes),
        },
      },
    } as unknown as PublicKeyCredentialRequestOptionsJSON["extensions"])
    : undefined;

export const decodeBase64ToBytesWithBounds = (
  value: string,
  bounds: { min?: number; max?: number },
): Uint8Array | undefined => {
  const decoded = decodeBase64ToBytes(value);
  if (!decoded) {
    return undefined;
  }
  if (typeof bounds.min === "number" && decoded.length < bounds.min) {
    return undefined;
  }
  if (typeof bounds.max === "number" && decoded.length > bounds.max) {
    return undefined;
  }
  return decoded;
};

export const PRF_CONSTRAINTS = {
  label: { maxLength: 120 },
  associatedData: { maxLength: 512 },
  ciphertext: { maxLength: 8192 },
  iv: { maxLength: 64 },
  tag: { maxLength: 64 },
  prfInput: {
    exactLength: 64, // base64 for 32 bytes
    byteLength: 32
  },
  ivByteLength: 12,
  tagByteLength: 16,
  maxCiphertextBytes: 4096,
};
