import type { Result } from "@shared/type";

export const MAX_PRF_PLAINTEXT_CHARS = 3500;
const AES_GCM_TAG_BYTE_LENGTH = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    combined.set(arr, offset);
    offset += arr.length;
  }
  return combined;
};

const deriveAesArtifacts = async (
  keyData: Uint8Array,
  salt: Uint8Array,
): Promise<{ aesKey: CryptoKey; iv: ArrayBuffer }> => {
  const hkdfKey = await crypto.subtle.importKey("raw", keyData as BufferSource, "HKDF", false, [
    "deriveBits",
  ]);
  const deriveBits = async (infoLabel: string, bitLength: number) =>
    crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: salt as BufferSource,
        info: textEncoder.encode(infoLabel),
      },
      hkdfKey,
      bitLength,
    );
  const keyBits = await deriveBits("prf-demo-aes-key-v1", 128);
  const ivBits = await deriveBits("prf-demo-aes-iv-v1", 96);
  const aesKey = await crypto.subtle.importKey(
    "raw",
    keyBits,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt", "decrypt"],
  );
  return {
    aesKey,
    iv: ivBits,
  };
};

interface EncryptRequest {
  plaintext: string;
  keyData: Uint8Array;
  salt: Uint8Array;
  associatedData?: string;
  onStartDerivationKey?: () => Promise<void>;
  onFinishDerivationKey?: () => Promise<void>;
  onStartEncryption?: () => Promise<void>;
  onFinishEncryption?: () => Promise<void>;
}

interface EncryptResponse {
  cyphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  version: number;
}

export const encryptWithAesGcm = async (
  request: EncryptRequest,
): Promise<Result<EncryptResponse, string>> => {
  const plaintextBytesEncoded = textEncoder.encode(request.plaintext);
  if (plaintextBytesEncoded.length === 0) {
    return { success: false, error: "平文が空です" };
  }
  if (plaintextBytesEncoded.length > MAX_PRF_PLAINTEXT_CHARS) {
    return { success: false, error: `平文が長すぎます (最大 ${MAX_PRF_PLAINTEXT_CHARS} バイト)` };
  }

  try {
    await request.onStartDerivationKey?.();
    const { aesKey, iv } = await deriveAesArtifacts(request.keyData, request.salt);
    await request.onFinishDerivationKey?.();

    await request.onStartEncryption?.();
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: request.associatedData
          ? textEncoder.encode(request.associatedData)
          : undefined,
      },
      aesKey,
      plaintextBytesEncoded,
    );
    await request.onFinishEncryption?.();

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const ivBytes = new Uint8Array(iv);
    const tagBytes = encryptedBytes.slice(encryptedBytes.length - AES_GCM_TAG_BYTE_LENGTH);
    return {
      success: true,
      value: {
        cyphertext: encryptedBytes.slice(0, encryptedBytes.length - AES_GCM_TAG_BYTE_LENGTH),
        iv: ivBytes,
        tag: tagBytes,
        version: 1,
      },
    };
  } catch (error) {
    return { success: false, error: `暗号化に失敗しました: ${(error as Error).message}` };
  }
};

interface DecryptRequest {
  cyphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  keyData: Uint8Array;
  salt: Uint8Array;
  associatedData?: string;
  onStartDerivationKey?: () => Promise<void>;
  onFinishDerivationKey?: () => Promise<void>;
  onStartDecryption?: () => Promise<void>;
  onFinishDecryption?: () => Promise<void>;
}

export const decryptWithAesGcm = async (
  request: DecryptRequest,
): Promise<Result<string, string>> => {
  try {
    await request.onStartDerivationKey?.();
    const { aesKey } = await deriveAesArtifacts(request.keyData, request.salt);
    await request.onFinishDerivationKey?.();

    await request.onStartDecryption?.();
    const cipherBytes = concatBytes(request.cyphertext, request.tag);
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: request.iv as BufferSource,
        additionalData: request.associatedData
          ? textEncoder.encode(request.associatedData)
          : undefined,
      },
      aesKey,
      cipherBytes as BufferSource,
    );
    await request.onFinishDecryption?.();
    const decryptedText = textDecoder.decode(decryptedBuffer);
    return { success: true, value: decryptedText };
  } catch (error) {
    return { success: false, error: `復号に失敗しました: ${(error as Error).message}` };
  }
};
