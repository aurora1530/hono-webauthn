import type { PrfCiphertext } from "@prisma/client";
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
  if (typeof bounds.max === "number" && value.length > 4 * Math.ceil(bounds.max / 3)) {
    return undefined;
  }
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
  MAX_ENTRIES_PER_USER: 100,
  MAX_STORAGE_BYTES_PER_USER: 256 * 1024,
};

type PrfPayload = Pick<
  PrfCiphertext,
  "ciphertext" | "iv" | "tag" | "prfInput" | "label" | "associatedData"
>;

export const getPrfPayloadBytes = (entry: PrfPayload): number =>
  [entry.ciphertext, entry.iv, entry.tag, entry.prfInput, entry.label, entry.associatedData].reduce(
    (total, value) => total + Buffer.byteLength(value ?? "", "utf8"),
    0,
  );
