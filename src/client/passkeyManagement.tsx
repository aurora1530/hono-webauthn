import type { PasskeyHistory } from "@prisma/client";
import { PasskeyExplanationModal } from "./components/common/PasskeyExplanationModal.js";
import { showStatusToast } from "./components/common/StatusToast.js";
import PasskeyHistories from "./components/PasskeyHistories.js";
import { handleChangePasskeyName } from "./lib/changePasskeyName.js";
import { handleDeletePasskey } from "./lib/deletePasskey.js";
import { openModal } from "./lib/modal/base.js";
import { openMessageModal } from "./lib/modal/message.js";
import { handleRegistration } from "./lib/registration.js";
import { webauthnClient } from "./lib/rpc/webauthnClient.js";
import {
  clearWebAuthnRequest,
  handleWebAuthnAbort,
  startWebAuthnRequest,
} from "./lib/webauthnAbort.js";

type PasskeyHistoryPage = {
  histories: PasskeyHistory[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
};

const HISTORY_PAGE_LIMIT = 10;

/**
 * パスキー利用履歴のキャッシュ
 * ```
 * key: passkeyId
 * value: {
 *   pages: Map<pageNumber, PasskeyHistory[]>
 *   meta: { total, totalPages, limit }
 * }
 * ```
 */
const passkeyHistoryCache = new Map<
  string,
  {
    pages: Map<number, PasskeyHistory[]>;
    meta?: Pick<PasskeyHistoryPage, "total" | "totalPages" | "limit">;
  }
>();

const invalidatePasskeyHistoryCache = (passkeyId: string) => {
  passkeyHistoryCache.delete(passkeyId);
};

document.getElementById("add-passkey-button")?.addEventListener("click", () => {
  openModal(
    <PasskeyExplanationModal
      onContinue={() => {
        handleRegistration(false);
      }}
    />,
  );
});

const changePasskeyNameBtns = document.getElementsByClassName(
  "change-passkey-name-btn",
) as HTMLCollectionOf<HTMLButtonElement>;
Array.from(changePasskeyNameBtns).forEach((btn) => {
  btn.addEventListener("click", () => {
    const passkeyId = btn.dataset.passkeyId;
    const passkeyName = btn.dataset.passkeyName;
    const defaultName = btn.dataset.passkeyDefaultName;
    if (passkeyId && passkeyName) {
      handleChangePasskeyName(passkeyId, passkeyName, defaultName ?? "パスキー");
    }
  });
});

const deletePasskeyBtns = document.getElementsByClassName(
  "delete-passkey-btn",
) as HTMLCollectionOf<HTMLButtonElement>;
Array.from(deletePasskeyBtns).forEach((btn) => {
  btn.addEventListener("click", () => {
    const passkeyId = btn.dataset.passkeyId;
    const onlySyncedPasskey = btn.dataset.onlySyncedPasskey === "true";
    if (passkeyId) handleDeletePasskey(passkeyId, onlySyncedPasskey);
  });
});

const viewPasskeyHistoryBtns = document.getElementsByClassName(
  "view-passkey-history-btn",
) as HTMLCollectionOf<HTMLButtonElement>;

const fetchPasskeyHistoryPage = async (
  passkeyId: string,
  page: number,
  forceRefetch = false,
): Promise<PasskeyHistoryPage | null> => {
  const cache = passkeyHistoryCache.get(passkeyId);
  if (!forceRefetch) {
    const cachedPage = cache?.pages.get(page);
    if (cachedPage && cache?.meta) {
      return {
        histories: cachedPage,
        page,
        total: cache.meta.total,
        totalPages: cache.meta.totalPages,
        limit: cache.meta.limit,
      };
    }
  }

  openMessageModal("パスキー履歴を取得中...", undefined, { loading: true });

  const res = await webauthnClient["passkey-histories"].$post({
    json: { passkeyId, limit: HISTORY_PAGE_LIMIT, page },
  });

  if (!res.ok) {
    const error = (await res.json()).error || "Unknown error";
    openMessageModal("パスキー履歴の取得に失敗しました。");
    showStatusToast({
      message: `パスキー履歴の取得に失敗しました: ${error}`,
      variant: "error",
      ariaLive: "assertive",
    });
    return null;
  }

  const data = await res.json();
  const histories = data.histories.map((h) => ({
    ...h,
    usedAt: new Date(h.usedAt),
  }));

  const nextCache = cache ?? { pages: new Map<number, PasskeyHistory[]>() };
  nextCache.pages.set(page, histories);
  nextCache.meta = {
    total: data.total,
    totalPages: data.totalPages,
    limit: data.limit,
  };
  passkeyHistoryCache.set(passkeyId, nextCache);

  return {
    histories,
    page: data.page,
    total: data.total,
    totalPages: data.totalPages,
    limit: data.limit,
  };
};

async function openPasskeyHistoryModal(
  passkeyId: string,
  page = 1,
  options?: { forceRefetch?: boolean },
) {
  const data = await fetchPasskeyHistoryPage(passkeyId, page, options?.forceRefetch === true);
  if (!data) return;

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage === data.page || nextPage > data.totalPages) return;
    void openPasskeyHistoryModal(passkeyId, nextPage);
  };

  const reload = () => {
    invalidatePasskeyHistoryCache(passkeyId);
    void openPasskeyHistoryModal(passkeyId, data.page, { forceRefetch: true });
  };

  openModal(
    <PasskeyHistories
      passkeyId={passkeyId}
      histories={data.histories}
      page={data.page}
      totalPages={data.totalPages}
      total={data.total}
      limit={data.limit}
      onChangePage={handleChangePage}
      reload={reload}
    />,
  );
}

Array.from(viewPasskeyHistoryBtns).forEach((btn) => {
  btn.addEventListener("click", async () => {
    const passkeyId = btn.dataset.passkeyId;
    if (passkeyId) {
      await openPasskeyHistoryModal(passkeyId, 1, { forceRefetch: true });
    }
  });
});

// --- Test authentication per passkey ---
const testPasskeyBtns = document.getElementsByClassName(
  "test-passkey-btn",
) as HTMLCollectionOf<HTMLButtonElement>;

async function handleTestAuthentication(passkeyId: string) {
  openMessageModal("認証テストを開始します...", undefined, { loading: true });
  const generateRes = await webauthnClient["test-authentication"].generate.$post({
    json: { passkeyId },
  });
  if (!generateRes.ok) {
    openMessageModal("認証テスト開始に失敗しました。");
    return;
  }
  const json = await generateRes.json();
  let options: PublicKeyCredentialRequestOptions;
  try {
    options = PublicKeyCredential.parseRequestOptionsFromJSON(json);
  } catch (e) {
    console.error(e);
    openMessageModal("認証テスト用オプションの解析に失敗しました。");
    return;
  }
  try {
    const signal = startWebAuthnRequest();
    const credential = await navigator.credentials.get({
      publicKey: options,
      signal,
    });
    clearWebAuthnRequest();
    if (!credential) {
      showStatusToast({
        message: "認証情報の取得に失敗しました。",
        variant: "error",
        ariaLive: "assertive",
      });
      openMessageModal("認証テストに失敗しました。認証情報を取得できませんでした。");
      return;
    }
    const verifyRes = await webauthnClient["test-authentication"].verify.$post({
      json: { body: credential },
    });
    if (!verifyRes.ok) {
      const err = (await verifyRes.json()).error;
      openMessageModal(`認証テストに失敗しました。エラー: ${err}`);
      return;
    }
    openMessageModal("認証テストが成功しました。");
  } catch (e) {
    clearWebAuthnRequest();
    if (handleWebAuthnAbort(e, "認証テストを中断しました。")) {
      showStatusToast({
        message: "認証テストを中断しました。",
        variant: "warning",
        ariaLive: "polite",
      });
      openMessageModal("認証テストを中断しました。");
      return;
    }
    console.error(e);
    showStatusToast({
      message: "認証テストに失敗しました。時間をおいて再試行してください。",
      variant: "error",
      ariaLive: "assertive",
    });
    openMessageModal("認証テストに失敗しました。キャンセルされたか、エラーが発生しました。");
  }
}

Array.from(testPasskeyBtns).forEach((btn) => {
  btn.addEventListener("click", async () => {
    const passkeyId = btn.dataset.passkeyId;
    if (passkeyId) {
      await handleTestAuthentication(passkeyId);
    }
  });
});

const viewDeletionReasonBtns = document.getElementsByClassName(
  "view-deletion-reason-btn",
) as HTMLCollectionOf<HTMLButtonElement>;

Array.from(viewDeletionReasonBtns).forEach((btn) => {
  btn.addEventListener("click", () => {
    const dialogID = btn.dataset.dialogId;
    if (dialogID) {
      const dialog = document.getElementById(dialogID) as HTMLDialogElement | null;
      if (dialog) {
        dialog.showModal();
      }
    }
  });
});
