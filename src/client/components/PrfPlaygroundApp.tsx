import { css, cx } from "hono/css";
import { useEffect, useMemo, useRef, useState } from "hono/jsx/dom";
import {
  badgeClass,
  buttonClass,
  inputFieldClass,
  surfaceClass,
  textMutedClass,
} from "../../ui/theme.js";
import { closeModal, openModalWithJSX } from "../lib/modal/base.js";
import { decryptWithAesGcm, encryptWithAesGcm } from "../lib/prf/cryptoHandler.js";
import {
  getPrfAnimationEnabled,
  PRF_ANIMATION_STORAGE_KEY,
} from "../lib/prf/prfAnimationPreference.js";
import { requestPrfEvaluation } from "../lib/prf/prfEvaluation.js";
import { prfClient } from "../lib/rpc/prfClient";
import { webauthnClient } from "../lib/rpc/webauthnClient";
import { isAbortError } from "../lib/webauthnAbort.js";
import { LoadingIndicator } from "./common/LoadingIndicator.js";
import { showStatusToast } from "./common/StatusToast.js";
import {
  PrfProcessVisualizer,
  type ProcessMode,
  type ProcessStep,
} from "./PrfProcessVisualizer.js";

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
  variant: "error" | "info" | "success";
} | null;

const textEncoder = new TextEncoder();
const PRF_INPUT_BYTE_LENGTH = 32;
const PRF_ENTRIES_PAGE_SIZE = 5;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const randomBase64 = (byteLength: number): { bytes: Uint8Array; base64: string } => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return { bytes, base64: toBase64(bytes) };
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

const navButtonClass = buttonClass("secondary", "sm");

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
    color: var(--text-color);
  }

  select,
  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
`;

const helperTextClass = cx(
  textMutedClass,
  css`
    font-size: 11px;
    text-align: left;
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
    background: var(--color-code-bg);
    color: var(--color-code-text);
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

const iconButtonClass = css`
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  color: var(--text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--color-surface-muted);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const deleteIconButtonClass = cx(
  iconButtonClass,
  css`
    &:hover {
      color: var(--color-danger);
      background: var(--color-danger-surface);
    }
  `,
);

const entryHeaderClass = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const entryTitleClass = css`
  font-weight: 700;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-all;
  flex: 1;
  text-align: left;
`;

const iconButtonGroupClass = css`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-right: -4px;

  @media (max-width: 480px) {
    margin-right: 0;
    justify-content: flex-end;
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
  background: var(--color-surface-strong);
  color: var(--text-color);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--color-surface-muted);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    background: var(--color-surface-strong);
    color: var(--text-muted);
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
    gap: 8px;
    text-align: left;
  `,
);

const entryMetaClass = cx(
  textMutedClass,
  css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    font-size: 12px;
    text-align: left;

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
      background: var(--color-code-bg);
      color: var(--color-code-text);
      word-break: break-all;
      white-space: pre-wrap;
    }
  `,
);

const cypherTextClass = css`
  max-height: 5em;
  overflow-y: auto;
`;

const entryChipClass = badgeClass("neutral");

const infoMessageClass = cx(
  textMutedClass,
  css`
    margin: 0;
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--color-warning-surface);
    color: var(--color-warning);
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

export const PrfPlaygroundApp = ({ debugMode = false }: { debugMode?: boolean }) => {
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
  const [busy, setBusy] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
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

  /**
   * localStorage に設定されたPRF Visualizerアニメーション設定を反映する。
   */
  useEffect(() => {
    setAnimationEnabled(getPrfAnimationEnabled());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PRF_ANIMATION_STORAGE_KEY) {
        setAnimationEnabled(getPrfAnimationEnabled());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const createPRFVisualizerModal = <T extends ProcessMode>(mode: T, intervalMS: number) => {
    /**
     * コンポーネントが無効化されているかどうかを示すフラグ
     * モーダルが閉じられた後にアニメーションを再開しないようにするために使用する。
     */
    let closed = false;
    return {
      show: (step: ProcessStep<T>) => {
        if (step === "idle") {
          if (!closed) closeModal();
          return;
        }

        if (!animationEnabled) {
          return;
        }

        if (closed) {
          return;
        }

        openModalWithJSX(<PrfProcessVisualizer step={step} mode={mode} />, {
          onClose: () => {
            closed = true;
          },
        });
      },
      onSuccess: () => {
        if (!closed) closeModal();
        /**
         * 出力結果へスクロールする
         */
        if (shouldScrollToLatestOutputRef.current && latestOutputRef.current) {
          latestOutputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          shouldScrollToLatestOutputRef.current = false;
        }
      },
      waitInterval: async () => {
        return animationEnabled && !closed ? wait(intervalMS) : Promise.resolve();
      },
    };
  };

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
      showStatusToast({
        message: error instanceof Error ? error.message : "パスキーの取得に失敗しました",
        variant: "error",
        ariaLive: "polite",
      });
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
      showStatusToast({
        message: "暗号化済みデータを取得しています...",
        variant: "info",
        ariaLive: "polite",
      });
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
        showStatusToast({
          message: "暗号化済みデータの取得が完了しました。",
          variant: "success",
          ariaLive: "polite",
        });
      }
    } catch (error) {
      console.error(error);
      if ((entriesRequestIdRef.current ?? 0) !== requestId) {
        return;
      }
      showStatusToast({
        message: error instanceof Error ? error.message : "一覧の取得中にエラーが発生しました",
        variant: "error",
        ariaLive: "polite",
      });
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

  const handleSelectChange = (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
    setSelectedPasskeyId(target.value || null);
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
      showStatusToast({
        message: "使用するパスキーを選択してください。",
        variant: "info",
        ariaLive: "polite",
      });
      return;
    }
    const plaintextBytesEncoded = textEncoder.encode(plaintext);
    if (plaintextBytesEncoded.length === 0) {
      showStatusToast({
        message: "平文を入力してください。",
        variant: "error",
        ariaLive: "polite",
      });
      return;
    }
    if (plaintextBytesEncoded.length > MAX_PRF_PLAINTEXT_CHARS) {
      showStatusToast({
        message: `平文が長すぎます (最大 ${MAX_PRF_PLAINTEXT_CHARS} バイト)`,
        variant: "error",
        ariaLive: "polite",
      });
      return;
    }

    setBusy(true);
    const prfVisualizer = createPRFVisualizerModal("encrypt", 600);
    prfVisualizer.show("prf");
    showStatusToast({
      message: "PRFを利用して暗号化しています...",
      variant: "info",
      ariaLive: "polite",
    });
    try {
      const { bytes: prfInputBytes, base64: prfInputBase64 } = randomBase64(PRF_INPUT_BYTE_LENGTH);
      const prfBytes = await requestPrfEvaluation(selectedPasskeyId, prfInputBase64);

      const associatedData = `${selectedPasskeyId}:${crypto.randomUUID()}`;
      const encryptResult = await encryptWithAesGcm({
        plaintext,
        keyData: prfBytes,
        salt: prfInputBytes,
        associatedData,
        onStartDerivationKey: async () => {
          prfVisualizer.show("derive");
        },
        onFinishDerivationKey: async () => {
          await prfVisualizer.waitInterval();
        },
        onStartEncryption: async () => {
          prfVisualizer.show("encrypt");
        },
        onFinishEncryption: async () => {
          await prfVisualizer.waitInterval();
        },
      });
      if (!encryptResult.success) {
        throw new Error(encryptResult.error);
      }

      const normalizedLabel = label.trim();
      const payload = {
        passkeyId: selectedPasskeyId,
        label: normalizedLabel || undefined,
        ciphertext: toBase64(encryptResult.value.cyphertext),
        iv: toBase64(encryptResult.value.iv),
        tag: toBase64(encryptResult.value.tag),
        associatedData,
        version: 1,
        prfInput: prfInputBase64,
      };

      prfVisualizer.show("save");
      await prfVisualizer.waitInterval();

      const storeRes = await prfClient.encrypt.$post({ json: payload });
      if (!storeRes.ok) {
        const storeJson = await storeRes.json();
        throw new Error(storeJson.error ?? "暗号化データの保存に失敗しました");
      }
      const storeJson = await storeRes.json();

      prfVisualizer.show("complete");
      await prfVisualizer.waitInterval();

      setLabel("");
      setPlaintext("");
      setLatestOutput({
        title: "暗号化結果",
        rows: debugMode
          ? [
              { label: "Entry ID", value: storeJson.entry.id },
              { label: "Ciphertext", value: storeJson.entry.ciphertext },
              { label: "IV", value: storeJson.entry.iv },
              { label: "Tag", value: storeJson.entry.tag },
              { label: "Associated Data", value: storeJson.entry.associatedData ?? "" },
              { label: "PRF Input", value: storeJson.entry.prfInput },
            ]
          : [{ label: "Ciphertext", value: storeJson.entry.ciphertext }],
      });
      await loadEntries({
        page: 1,
        passkeyId: entriesFilterPasskeyId ?? null,
        silent: true,
        force: true,
      });
      showStatusToast({
        message: "暗号化と保存が完了しました。",
        variant: "success",
        ariaLive: "polite",
      });
      prfVisualizer.onSuccess();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error(error);
      showStatusToast({
        message: error instanceof Error ? error.message : "暗号化中にエラーが発生しました",
        variant: "error",
        ariaLive: "polite",
      });
    } finally {
      setBusy(false);
      prfVisualizer.show("idle");
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
    const prfVisualizer = createPRFVisualizerModal("decrypt", 600);
    prfVisualizer.show("prf");
    showStatusToast({
      message: "PRFを利用して復号しています...",
      variant: "info",
      ariaLive: "polite",
    });
    try {
      const prfBytes = await requestPrfEvaluation(entry.passkeyId, entry.prfInput);

      const decryptedResult = await decryptWithAesGcm({
        cyphertext: fromBase64(entry.ciphertext),
        tag: fromBase64(entry.tag),
        iv: fromBase64(entry.iv),
        keyData: prfBytes,
        salt: fromBase64(entry.prfInput),
        associatedData: entry.associatedData ?? undefined,
        onStartDerivationKey: async () => {
          prfVisualizer.show("derive");
        },
        onFinishDerivationKey: async () => {
          await prfVisualizer.waitInterval();
        },
        onStartDecryption: async () => {
          prfVisualizer.show("decrypt");
        },
        onFinishDecryption: async () => {
          await prfVisualizer.waitInterval();
        },
      });

      if (!decryptedResult.success) {
        throw new Error(decryptedResult.error);
      }

      const plaintextResult = decryptedResult.value;
      prfVisualizer.show("complete");
      await prfVisualizer.waitInterval();

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
      showStatusToast({ message: "復号に成功しました。", variant: "success", ariaLive: "polite" });
      prfVisualizer.onSuccess();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error(error);
      showStatusToast({
        message: error instanceof Error ? error.message : "復号に失敗しました",
        variant: "error",
        ariaLive: "polite",
      });
    } finally {
      setBusy(false);
      prfVisualizer.show("idle");
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
    showStatusToast({
      message: "暗号化データを削除しています...",
      variant: "info",
      ariaLive: "polite",
    });
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
      showStatusToast({
        message: "暗号化データを削除しました。",
        variant: "success",
        ariaLive: "polite",
      });
    } catch (error) {
      console.error(error);
      showStatusToast({
        message: error instanceof Error ? error.message : "削除に失敗しました",
        variant: "error",
        ariaLive: "polite",
      });
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
      showStatusToast({
        message: "クリップボードAPIがサポートされていません。",
        variant: "error",
        ariaLive: "polite",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      showStatusToast({
        message: "暗号化データをクリップボードにコピーしました。",
        variant: "success",
        ariaLive: "polite",
      });
    } catch (error) {
      console.error(error);
      showStatusToast({
        message: error instanceof Error ? error.message : "コピーに失敗しました",
        variant: "error",
        ariaLive: "polite",
      });
    }
  };

  const handleCopyLatestOutputValue = async (value: string, description: string) => {
    if (!navigator.clipboard) {
      showStatusToast({
        message: "クリップボードAPIがサポートされていません。",
        variant: "error",
        ariaLive: "polite",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showStatusToast({
        message: `${description}をクリップボードにコピーしました。`,
        variant: "success",
        ariaLive: "polite",
      });
    } catch (error) {
      console.error(error);
      showStatusToast({
        message: error instanceof Error ? error.message : "コピーに失敗しました",
        variant: "error",
        ariaLive: "polite",
      });
    }
  };

  return (
    <div class={containerClass}>
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
              class={inputFieldClass}
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
              class={inputFieldClass}
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
              class={inputFieldClass}
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
                        class={iconButtonClass}
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
                <div class={entryHeaderClass}>
                  <div class={entryTitleClass}>{entry.label || "(ラベル未設定)"}</div>
                  <div class={iconButtonGroupClass}>
                    <button
                      class={iconButtonClass}
                      type="button"
                      title="復号"
                      aria-label="復号"
                      onClick={() => handleDecrypt(entry.id)}
                      disabled={busy}
                    >
                      <span class="material-symbols-outlined">lock_open</span>
                    </button>
                    <button
                      class={iconButtonClass}
                      type="button"
                      title="コピー"
                      aria-label="コピー"
                      onClick={() => handleCopyEntry(entry.id)}
                    >
                      <span class="material-symbols-outlined">content_copy</span>
                    </button>
                    <button
                      class={deleteIconButtonClass}
                      type="button"
                      title="削除"
                      aria-label="削除"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={busy}
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>

                <div class={helperTextClass}>
                  {entry.passkeyName} ・ {new Date(entry.createdAt).toLocaleString()}
                </div>

                <div class={entryMetaClass}>
                  {debugMode && (
                    <div>
                      <span>Entry ID</span>
                      <code>{entry.id}</code>
                    </div>
                  )}
                  <div>
                    <span>Ciphertext</span>
                    <code class={cypherTextClass}>{entry.ciphertext}</code>
                  </div>
                  {debugMode && (
                    <>
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
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
