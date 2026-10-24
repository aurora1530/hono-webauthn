import { decodeBase64ToBytes, encodeBytesToBase64Url } from "../base64.js";

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
  LABEL: { MAX_LENGTH: 120 },
  ASSOCIATED_DATA: { MAX_LENGTH: 512 },
  CIPHERTEXT: { MAX_LENGTH: 8192 },
  IV: { MAX_LENGTH: 64 },
  TAG: { MAX_LENGTH: 64 },
  PRF_INPUT: {
    EXACT_LENGTH: 64, // base64 for 32 bytes
    BYTE_LENGTH: 32,
  },
  IV_BYTE_LENGTH: 12,
  TAG_BYTE_LENGTH: 16,
  MAX_CIPHERTEXT_BYTES: 4096,
};
