import { css, cx } from "hono/css";
import { useEffect, useMemo, useRef, useState } from "hono/jsx/dom";
import {
  badgeClass,
  buttonClass,
  inputFieldClass,
  surfaceClass,
  textMutedClass,
} from "../../ui/theme.js";
import { prfClient } from "../lib/rpc/prfClient";
import { webauthnClient } from "../lib/rpc/webauthnClient";
import { LoadingIndicator } from "./common/LoadingIndicator.js";
import { StatusToast } from "./common/StatusToast.js";

export const MAX_PRF_LABEL_LENGTH = 120;
export const MAX_PRF_PLAINTEXT_CHARS = 3500;

export type PasskeyOption = {
  id: string;
  name: string;
};

export type PrfEntry = {
  id: string;
  passkeyId: string;
  passkeyName: string;
  label: string | null;
  ciphertext: string;
  iv: string;
  tag: string;
  associatedData: string | null;
  version: number;
  createdAt: string;
  prfInput: string;
};

export type LatestOutputRow = {
  label: string;
  value: string;
  copyAnnounce?: string;
  copyValue?: string;
  fullWidth?: boolean;
};

export type LatestOutput = {
  title: string;
  rows: LatestOutputRow[];
} | null;

export type StatusMessage = {
  text: string;
  isError: boolean;
} | null;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const AES_GCM_TAG_BYTE_LENGTH = 16;
const PRF_INPUT_BYTE_LENGTH = 32;
const PRF_ENTRIES_PAGE_SIZE = 5;
const STATUS_DISPLAY_DURATION_MS = 4000;

const toBase64Url = (bytes: ArrayBuffer | Uint8Array | null | undefined): string | null => {
  if (!bytes) return null;
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const serializeAssertionForServer = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;
  const sanitizedExtensions = (() => {
    const ext = credential.getClientExtensionResults?.();
    if (!ext) return undefined;
    // PRF の結果は送らない
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { prf, ...rest } = ext as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  })();

  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      userHandle: toBase64Url(response.userHandle),
    },
    clientExtensionResults: sanitizedExtensions,
  };
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

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

const randomBase64 = (byteLength: number): { bytes: Uint8Array; base64: string } => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return { bytes, base64: toBase64(bytes) };
};

const deriveAesArtifacts = async (prfBytes: Uint8Array, salt: Uint8Array) => {
  const hkdfKey = await crypto.subtle.importKey("raw", prfBytes as BufferSource, "HKDF", false, [
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
    iv: new Uint8Array(ivBits),
  };
};

const requestPrfEvaluation = async (passkeyId: string, prfInputBase64: string) => {
  const generateRes = await prfClient.assertion.generate.$post({
    json: { passkeyId, prfInput: prfInputBase64 },
  });
  if (!generateRes.ok) {
    const error = (await generateRes.json()).error;
    throw new Error(error ?? "PRFオプションの取得に失敗しました");
  }
  const generateJson = await generateRes.json();
  const options = PublicKeyCredential.parseRequestOptionsFromJSON(generateJson);
  const credential = await navigator.credentials.get({
    publicKey: options,
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("認証情報の取得に失敗しました");
  }

  const credentialJson = serializeAssertionForServer(credential);

  const verifyRes = await prfClient.assertion.verify.$post({
    json: { body: credentialJson },
  });
  if (!verifyRes.ok) {
    const error = (await verifyRes.json()).error;
    throw new Error(error ?? "PRF認証の検証に失敗しました");
  }
  const prfResult = credential.getClientExtensionResults().prf?.results?.first as
    | ArrayBuffer
    | undefined;
  if (!prfResult) {
    throw new Error("この環境ではPRF拡張を利用できません");
  }
  return new Uint8Array(prfResult);
};

const containerClass = css`
  max-width: 920px;
  margin: 0 auto;
  padding: 32px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const headerClass = css`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
  }

  p {
    margin: auto;
    max-width: 90%;
    line-height: 1.5;
  }
`;

const navButtonClass = css`
  cursor: pointer;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  background: #0f172a;
  color: #fff;
  text-decoration: none;
  &:hover {
    opacity: 0.9;
  }
`;

const sectionClass = css`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

const fieldClass = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;

  label {
    font-weight: 600;
    color: #0f172a;
  }

  select,
  input,
  textarea {
    border: 1px solid #cbd5f5;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 14px;
    width: 100%;
    box-sizing: border-box;
    background: #fff;
  }
`;

const helperTextClass = cx(
  textMutedClass,
  css`
    font-size: 11px;
  `,
);

const textareaClass = css`
  grid-column: 1 / -1;
`;

const buttonRowClass = css`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const primaryButtonClass = buttonClass("primary", "md");
const secondaryButtonClass = buttonClass("secondary", "md");

const outputClass = cx(
  surfaceClass("muted"),
  css`
    border-style: dashed;
    padding: 16px;
  `,
);

const outputGridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  font-size: 13px;

  code {
    display: block;
    background: #0f172a;
    color: #e2e8f0;
    padding: 6px 8px;
    border-radius: 6px;
    word-break: break-all;
  }
`;

const outputRowHeaderClass = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 4px;
`;

const outputRowClass = css`
  display: flex;
  flex-direction: column;
`;

const outputRowFullWidthClass = css`
  grid-column: 1 / -1;
`;

const copyIconButtonClass = css`
  border: none;
  background: transparent;
  padding: 2px;
  border-radius: 4px;
  color: #0f172a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const entriesHeaderClass = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const entriesSummaryClass = css`
  display: flex;
  align-items: center;
  gap: 10px;

  h4 {
    margin: 0;
  }
`;

const entriesControlsClass = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
`;

const entriesControlGroupClass = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const entriesFilterLabelClass = cx(
  textMutedClass,
  css`
    font-size: 12px;
  `,
);

const entriesFilterSelectClass = cx(
  inputFieldClass,
  css`
    min-width: 180px;
  `,
);

const entriesPaginationClass = cx(
  surfaceClass("muted"),
  css`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border-radius: 999px;
    padding: 6px 16px;
    margin: auto;
  `,
);

// 既存のグレー基調に揃える
const entriesPaginationButtonClass = css`
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  background: #e2e8f0;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #cbd5f5;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    background: #e2e8f0;
    color: #0f172a;
  }
`;

const entriesPaginationStatusClass = cx(
  textMutedClass,
  css`
    font-size: 12px;
    min-width: 3rem;
    text-align: center;
  `,
);

const entriesContainerClass = css`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const entryCardClass = cx(
  surfaceClass(),
  css`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
);

const entryMetaClass = cx(
  textMutedClass,
  css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    font-size: 12px;

    div {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    span {
      font-weight: 700;
      color: var(--text-color);
    }

    code {
      display: block;
      padding: 6px 8px;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      word-break: break-all;
      white-space: pre-wrap;
    }
  `,
);

const cypherTextClass = css`
  max-height: 5em;
  overflow-y: auto;
`;

const entryActionsClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const entryChipClass = badgeClass("neutral");

const actionButtonClass = buttonClass("secondary", "sm");

const deleteActionButtonClass = buttonClass("danger", "sm");

const infoMessageClass = cx(
  textMutedClass,
  css`
    margin: 0;
    padding: 12px 16px;
    border-radius: 8px;
    background: #fff8eb;
    color: #92400e;
    font-size: 13px;
  `,
);

const emptyMessageClass = cx(
  textMutedClass,
  css`
    margin: 0;
  `,
);

const latestOutputHeadingClass = css`
  margin: 0 0 12px;
`;

export const PrfPlaygroundApp = () => {
  const [passkeys, setPasskeys] = useState<PasskeyOption[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [selectedPasskeyId, setSelectedPasskeyId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [entries, setEntries] = useState<PrfEntry[]>([]);
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesTotalPages, setEntriesTotalPages] = useState(0);
  const [entriesFilterPasskeyId, setEntriesFilterPasskeyId] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const entriesRequestIdRef = useRef<number>(0);
  const [latestOutput, setLatestOutput] = useState<LatestOutput>(null);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [busy, setBusy] = useState(false);
  const latestOutputRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToLatestOutputRef = useRef(false);

  const controlsDisabled = passkeysLoading || passkeys.length === 0;
  const noPasskeys = !passkeysLoading && passkeys.length === 0;
  const actionDisabled = controlsDisabled || busy;
  const refreshDisabled = busy || entriesLoading;
  const plaintextBytes = useMemo(() => textEncoder.encode(plaintext).length, [plaintext]);
  const emptyEntriesMessage = entriesFilterPasskeyId
    ? "選択したパスキーの暗号化データはありません。"
    : "暗号化済みのデータはまだありません。";

  const showStatus = (message: string, isError = false) => setStatus({ text: message, isError });
  const clearStatus = () => setStatus(null);

  useEffect(() => {
    if (!status) {
      return;
    }

    const currentStatus = status;
    const timer = window.setTimeout(() => {
      setStatus((prev) => (prev === currentStatus ? null : prev));
    }, STATUS_DISPLAY_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status]);

  /**
   * Load registered passkeys from the server
   * setPasskeys and setSelectedPasskeyId accordingly
   */
  const loadPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      const res = await webauthnClient["passkeys-list"].$get();
      if (!res.ok) {
        const error = (await res.json()).error;
        throw new Error(error ?? "パスキーの取得に失敗しました");
      }
      const { passkeys } = await res.json();
      setPasskeys(passkeys);
      setSelectedPasskeyId((prev) => {
        if (prev && passkeys.some((pk) => pk.id === prev)) {
          return prev;
        }
        return passkeys[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "パスキーの取得に失敗しました", true);
      setPasskeys([]);
      setSelectedPasskeyId(null);
    } finally {
      setPasskeysLoading(false);
    }
  };

  /**
   * Load registered passkeys and entries from the server
   */
  const loadEntries = async (options?: {
    silent?: boolean;
    page?: number;
    passkeyId?: string | null;
    force?: boolean;
  }) => {
    if (entriesLoading && !options?.force) {
      return;
    }

    const hasPasskeyOverride = options ? "passkeyId" in options : false;
    const targetPasskeyId = hasPasskeyOverride
      ? (options?.passkeyId ?? null)
      : entriesFilterPasskeyId;
    const targetPage = options?.page ?? entriesPage;
    const silent = options?.silent ?? false;

    if (hasPasskeyOverride) {
      setEntriesFilterPasskeyId(targetPasskeyId);
    }

    const requestId = (entriesRequestIdRef.current ?? 0) + 1;
    entriesRequestIdRef.current = requestId;

    setEntriesLoading(true);
    if (!silent) {
      showStatus("暗号化済みデータを取得しています...");
    }

    try {
      const payload: {
        page: number;
        limit: number;
        passkeyId?: string;
      } = {
        page: Math.max(1, targetPage),
        limit: PRF_ENTRIES_PAGE_SIZE,
      };
      if (targetPasskeyId) {
        payload.passkeyId = targetPasskeyId;
      }

      const res = await prfClient.entries.$post({ json: payload });
      if (!res.ok) {
        const error = (await res.json()).error;
        throw new Error(error ?? "一覧の取得に失敗しました");
      }
      const body = await res.json();
      if ((entriesRequestIdRef.current ?? 0) !== requestId) {
        return;
      }

      setEntries(body.entries ?? []);
      const nextPage = Math.max(1, body.pagination?.page ?? targetPage);
      setEntriesPage(nextPage);
      setEntriesTotal(body.pagination?.total ?? body.entries?.length ?? 0);
      const paginationTotalPages = body.pagination?.totalPages;
      const fallbackTotalPages = body.entries && body.entries.length > 0 ? 1 : 0;
      setEntriesTotalPages(
        typeof paginationTotalPages === "number" ? paginationTotalPages : fallbackTotalPages,
      );

      if (!silent) {
        showStatus("暗号化済みデータの取得が完了しました。");
      } else {
        clearStatus();
      }
    } catch (error) {
      console.error(error);
      if ((entriesRequestIdRef.current ?? 0) !== requestId) {
        return;
      }
      showStatus(
        error instanceof Error ? error.message : "一覧の取得中にエラーが発生しました",
        true,
      );
    } finally {
      if ((entriesRequestIdRef.current ?? 0) === requestId) {
        setEntriesLoading(false);
      }
    }
  };

  /**
   * Load registered passkeys and entries from the server
   */
  useEffect(() => {
    void loadPasskeys();
    void loadEntries({ silent: true });
  }, []);

  useEffect(() => {
    if (shouldScrollToLatestOutputRef.current && latestOutputRef.current) {
      latestOutputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      shouldScrollToLatestOutputRef.current = false;
    }
  }, [latestOutput]);

  const handleSelectChange = (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
    setSelectedPasskeyId(target.value || null);
    clearStatus();
  };

  const handleLabelInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    setLabel(target.value.slice(0, MAX_PRF_LABEL_LENGTH));
  };

  const handlePlaintextInput = (event: Event) => {
    const target = event.currentTarget as HTMLTextAreaElement;
    setPlaintext(target.value);
  };

  const handleEntriesFilterChange = (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
    const nextValue = target.value ? target.value : null;
    void loadEntries({
      page: 1,
      passkeyId: nextValue,
      silent: true,
      force: true,
    });
  };

  const handleEntriesPageChange = (nextPage: number) => {
    if (busy || entriesLoading) {
      return;
    }
    const safeTotalPages = entriesTotalPages > 0 ? entriesTotalPages : 1;
    const normalizedPage = Math.min(Math.max(1, nextPage), safeTotalPages);
    void loadEntries({ page: normalizedPage });
  };

  const handleEncrypt = async () => {
    if (busy) {
      return;
    }
    if (!selectedPasskeyId) {
      showStatus("使用するパスキーを選択してください。", true);
      return;
    }
    const plaintextBytesEncoded = textEncoder.encode(plaintext);
    if (plaintextBytesEncoded.length === 0) {
      showStatus("平文を入力してください。", true);
      return;
    }
    if (plaintextBytesEncoded.length > MAX_PRF_PLAINTEXT_CHARS) {
      showStatus(`平文が長すぎます (最大 ${MAX_PRF_PLAINTEXT_CHARS} バイト)`, true);
      return;
    }

    setBusy(true);
    showStatus("PRFを利用して暗号化しています...");
    try {
      const { bytes: prfInputBytes, base64: prfInputBase64 } = randomBase64(PRF_INPUT_BYTE_LENGTH);
      const prfBytes = await requestPrfEvaluation(selectedPasskeyId, prfInputBase64);
      const { aesKey, iv } = await deriveAesArtifacts(prfBytes, prfInputBytes);
      const associatedData = `${selectedPasskeyId}:${crypto.randomUUID()}`;
      const ciphertextBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: textEncoder.encode(associatedData),
        },
        aesKey,
        plaintextBytesEncoded,
      );
      const ciphertextBytes = new Uint8Array(ciphertextBuffer);
      const tagStart = ciphertextBytes.length - AES_GCM_TAG_BYTE_LENGTH;
      const ciphertext = ciphertextBytes.slice(0, tagStart);
      const tag = ciphertextBytes.slice(tagStart);

      const normalizedLabel = label.trim();
      const payload = {
        passkeyId: selectedPasskeyId,
        label: normalizedLabel || undefined,
        ciphertext: toBase64(ciphertext),
        iv: toBase64(iv),
        tag: toBase64(tag),
        associatedData,
        version: 1,
        prfInput: prfInputBase64,
      };

      const storeRes = await prfClient.encrypt.$post({ json: payload });
      if (!storeRes.ok) {
        const storeJson = await storeRes.json();
        throw new Error(storeJson.error ?? "暗号化データの保存に失敗しました");
      }
      const storeJson = await storeRes.json();
      setLabel("");
      setPlaintext("");
      setLatestOutput({
        title: "暗号化結果",
        rows: [
          { label: "Entry ID", value: storeJson.entry.id },
          { label: "Ciphertext", value: storeJson.entry.ciphertext },
          { label: "IV", value: storeJson.entry.iv },
          { label: "Tag", value: storeJson.entry.tag },
          { label: "Associated Data", value: storeJson.entry.associatedData ?? "" },
          { label: "PRF Input", value: storeJson.entry.prfInput },
        ],
      });
      await loadEntries({
        page: 1,
        passkeyId: entriesFilterPasskeyId ?? null,
        silent: true,
        force: true,
      });
      showStatus("暗号化と保存が完了しました。", false);
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "暗号化中にエラーが発生しました", true);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshEntries = () => {
    if (busy || entriesLoading) {
      return;
    }
    void loadEntries();
  };

  const handleDecrypt = async (entryId: string) => {
    if (busy) {
      return;
    }
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }

    setBusy(true);
    showStatus("PRFを利用して復号しています...");
    try {
      const prfBytes = await requestPrfEvaluation(entry.passkeyId, entry.prfInput);
      const prfInputBytes = fromBase64(entry.prfInput);
      const { aesKey, iv } = await deriveAesArtifacts(prfBytes, prfInputBytes);
      const cipherBytes = concatBytes(fromBase64(entry.ciphertext), fromBase64(entry.tag));
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: entry.associatedData
            ? textEncoder.encode(entry.associatedData)
            : undefined,
        },
        aesKey,
        cipherBytes.buffer as ArrayBuffer,
      );
      const plaintextResult = textDecoder.decode(decrypted);
      shouldScrollToLatestOutputRef.current = true;
      setLatestOutput({
        title: "復号結果",
        rows: [
          { label: "Entry ID", value: entry.id },
          {
            label: "Label",
            value: entry.label ?? "(ラベル未設定)",
            copyAnnounce: "ラベル",
            copyValue: entry.label ?? "",
          },
          {
            label: "Plaintext",
            value: plaintextResult,
            copyAnnounce: "プレインテキスト",
            copyValue: plaintextResult,
            fullWidth: true,
          },
        ],
      });
      showStatus("復号に成功しました。", false);
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "復号に失敗しました", true);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (busy) {
      return;
    }
    if (!confirm("この暗号化データを削除しますか？")) {
      return;
    }
    setBusy(true);
    showStatus("暗号化データを削除しています...");
    try {
      const res = await prfClient.entries[":id"].$delete({ param: { id: entryId } });
      if (!res.ok) {
        const error = (await res.json()).error;
        throw new Error(error ?? "暗号化データの削除に失敗しました");
      }
      await loadEntries({
        page: entriesPage,
        passkeyId: entriesFilterPasskeyId ?? null,
        silent: true,
        force: true,
      });
      showStatus("暗号化データを削除しました。", false);
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "削除に失敗しました", true);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyEntry = async (entryId: string) => {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }
    if (!navigator.clipboard) {
      showStatus("クリップボードAPIがサポートされていません。", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      showStatus("暗号化データをクリップボードにコピーしました。", false);
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "コピーに失敗しました", true);
    }
  };

  const handleCopyLatestOutputValue = async (value: string, description: string) => {
    if (!navigator.clipboard) {
      showStatus("クリップボードAPIがサポートされていません。", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showStatus(`${description}をクリップボードにコピーしました。`);
    } catch (error) {
      console.error(error);
      showStatus(error instanceof Error ? error.message : "コピーに失敗しました", true);
    }
  };

  return (
    <div class={containerClass}>
      <StatusToast
        message={status?.text ?? null}
        variant={status?.isError ? "error" : "info"}
        ariaLive="polite"
      />

      <div class={headerClass}>
        <div>
          <h2>WebAuthn PRF 暗号化プレイグラウンド</h2>
          <p>
            パスキー由来のシークレットを使い、クライアント側のみで AES-128-GCM
            による暗号化を行います。
            生成された暗号文だけがサーバーに保存され、復号にも同じAuthenticatorが必要になります。
          </p>
        </div>
        <a class={navButtonClass} href="/auth/passkey-management">
          パスキー管理へ戻る
        </a>
      </div>

      {passkeysLoading ? (
        <LoadingIndicator message="パスキーを取得しています..." />
      ) : (
        noPasskeys && (
          <p class={infoMessageClass}>
            まずパスキーを 1 件以上登録してください。登録後、このページから暗号化・復号を試せます。
          </p>
        )
      )}

      <section class={sectionClass}>
        <div class={gridClass}>
          <div class={fieldClass}>
            <label htmlFor="prf-passkey-select">使用するパスキー</label>
            <select
              id="prf-passkey-select"
              value={selectedPasskeyId ?? ""}
              onChange={handleSelectChange}
              disabled={controlsDisabled}
            >
              <option value="">選択してください</option>
              {passkeys.map((passkey) => (
                <option key={passkey.id} value={passkey.id}>
                  {passkey.name}
                </option>
              ))}
            </select>
          </div>

          <div class={fieldClass}>
            <label htmlFor="prf-label-input">ラベル (任意)</label>
            <input
              id="prf-label-input"
              type="text"
              maxLength={MAX_PRF_LABEL_LENGTH}
              placeholder="例: 家計簿バックアップ"
              value={label}
              onInput={handleLabelInput}
              disabled={controlsDisabled}
            />
            <span class={helperTextClass}>
              {label.length}/{MAX_PRF_LABEL_LENGTH} 文字
            </span>
          </div>

          <div class={cx(fieldClass, textareaClass)}>
            <label htmlFor="prf-plaintext-input">
              平文 (最大約 {MAX_PRF_PLAINTEXT_CHARS} バイト)
            </label>
            <textarea
              id="prf-plaintext-input"
              rows={4}
              value={plaintext}
              onInput={handlePlaintextInput}
              placeholder="暗号化したいテキストを入力してください"
              disabled={controlsDisabled}
            ></textarea>
            <span class={helperTextClass}>
              {plaintextBytes}/{MAX_PRF_PLAINTEXT_CHARS} バイト
            </span>
          </div>
        </div>

        <div class={buttonRowClass}>
          <button
            class={primaryButtonClass}
            type="button"
            onClick={handleEncrypt}
            disabled={actionDisabled}
          >
            暗号化して保存
          </button>
          <button
            class={secondaryButtonClass}
            type="button"
            onClick={handleRefreshEntries}
            disabled={refreshDisabled}
          >
            一覧を更新
          </button>
        </div>

        {latestOutput && (
          <div class={outputClass} ref={latestOutputRef}>
            <h4 class={latestOutputHeadingClass}>{latestOutput.title}</h4>
            <div class={outputGridClass}>
              {latestOutput.rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  class={cx(outputRowClass, row.fullWidth && outputRowFullWidthClass)}
                >
                  <div class={outputRowHeaderClass}>
                    <p style="margin:0;font-weight:600;">{row.label}</p>
                    {row.copyAnnounce && (
                      <button
                        type="button"
                        class={copyIconButtonClass}
                        aria-label={`${row.copyAnnounce}をコピー`}
                        onClick={() =>
                          handleCopyLatestOutputValue(row.copyValue ?? row.value, row.copyAnnounce!)
                        }
                      >
                        <span class="material-symbols-outlined">content_copy</span>
                      </button>
                    )}
                  </div>
                  <code>{row.value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div class={entriesHeaderClass}>
          <div class={entriesSummaryClass}>
            <h4>暗号化済みデータ</h4>
            <span class={entryChipClass}>総件数 {entriesTotal}件</span>
          </div>
          <div class={entriesControlsClass}>
            <div class={entriesControlGroupClass}>
              <label class={entriesFilterLabelClass} htmlFor="prf-entries-filter">
                パスキーで絞り込み
              </label>
              <select
                id="prf-entries-filter"
                class={entriesFilterSelectClass}
                value={entriesFilterPasskeyId ?? ""}
                onChange={handleEntriesFilterChange}
                disabled={passkeysLoading || passkeys.length === 0}
              >
                <option value="">すべて</option>
                {passkeys.map((passkey) => (
                  <option key={`list-filter-${passkey.id}`} value={passkey.id}>
                    {passkey.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {entriesTotalPages > 1 && (
          <div class={entriesPaginationClass}>
            <button
              class={entriesPaginationButtonClass}
              type="button"
              onClick={() => handleEntriesPageChange(Math.max(1, entriesPage - 1))}
              disabled={entriesPage <= 1 || entriesLoading || busy}
            >
              ◀ 前へ
            </button>
            <span class={entriesPaginationStatusClass}>
              {entriesTotal === 0 ? "0 / 0" : `${entriesPage} / ${entriesTotalPages}`}
            </span>
            <button
              class={entriesPaginationButtonClass}
              type="button"
              onClick={() => handleEntriesPageChange(entriesPage + 1)}
              disabled={entriesPage >= entriesTotalPages || entriesLoading || busy}
            >
              次へ ▶
            </button>
          </div>
        )}

        <div class={entriesContainerClass}>
          {entriesLoading && <LoadingIndicator message="暗号化済みデータを読み込み中です..." />}
          {entries.length === 0 && !entriesLoading ? (
            <p class={emptyMessageClass}>{emptyEntriesMessage}</p>
          ) : (
            entries.map((entry) => (
              <article key={entry.id} class={entryCardClass}>
                <div>
                  <strong>{entry.label || "(ラベル未設定)"}</strong>
                </div>
                <div class={helperTextClass}>
                  {entry.passkeyName} ・ {new Date(entry.createdAt).toLocaleString()}
                </div>

                <div class={entryMetaClass}>
                  <div>
                    <span>Entry ID</span>
                    <code>{entry.id}</code>
                  </div>
                  <div>
                    <span>Ciphertext</span>
                    <code class={cypherTextClass}>{entry.ciphertext}</code>
                  </div>
                  <div>
                    <span>IV</span>
                    <code>{entry.iv}</code>
                  </div>
                  <div>
                    <span>Tag</span>
                    <code>{entry.tag}</code>
                  </div>
                  {entry.associatedData && (
                    <div>
                      <span>Associated Data</span>
                      <code>{entry.associatedData}</code>
                    </div>
                  )}
                  <div>
                    <span>PRF Input</span>
                    <code>{entry.prfInput}</code>
                  </div>
                </div>

                <div class={entryActionsClass}>
                  <button
                    class={actionButtonClass}
                    type="button"
                    onClick={() => handleDecrypt(entry.id)}
                    disabled={busy}
                  >
                    復号
                  </button>
                  <button
                    class={actionButtonClass}
                    type="button"
                    onClick={() => handleCopyEntry(entry.id)}
                  >
                    コピー
                  </button>
                  <button
                    class={deleteActionButtonClass}
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    disabled={busy}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
