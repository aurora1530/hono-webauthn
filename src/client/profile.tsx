import { css, cx } from "hono/css";
import { badgeClass, buttonClass, inputFieldClass } from "../ui/theme.js";
import { showStatusToast } from "./components/common/StatusToast.js";
import { changeDebugMode } from "./lib/changeDebugMode.js";
import {
  type AccountDeletionSummary,
  deleteAccount,
  fetchAccountDeletionSummary,
} from "./lib/deleteAccount.js";
import { closeModal, openModalWithJSX } from "./lib/modal/base.js";
import { openMessageModal } from "./lib/modal/message.js";
import { getPrfAnimationEnabled, setPrfAnimationEnabled } from "./lib/prfAnimationPreference.js";
import { handleReauthentication } from "./lib/reauthentication.js";

// --- debug mode toggle ---
const debugToggle = document.getElementById("change-debug-mode-btn") as HTMLInputElement | null;
const debugToggleTrack = debugToggle?.nextElementSibling as HTMLSpanElement | null;

debugToggle?.addEventListener("change", async (e) => {
  const target = e.target as HTMLInputElement;
  const debugMode = target.checked;
  debugToggleTrack?.setAttribute("data-enabled", String(debugMode));
  const result = await changeDebugMode(debugMode);

  if (!result.success) {
    showStatusToast({
      message: `Error changing debug mode: ${result.error}`,
      variant: "error",
      ariaLive: "assertive",
    });
    target.checked = !debugMode;
    debugToggleTrack?.setAttribute("data-enabled", String(!debugMode));
    return;
  }

  location.reload();
});

// --- PRF animation toggle ---
const prfAnimationToggle = document.getElementById(
  "toggle-prf-animation",
) as HTMLInputElement | null;
const prfAnimationTrack = prfAnimationToggle?.nextElementSibling as HTMLSpanElement | null;

if (prfAnimationToggle) {
  const current = getPrfAnimationEnabled();
  prfAnimationToggle.checked = current;
  prfAnimationTrack?.setAttribute("data-enabled", String(current));

  prfAnimationToggle.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;
    prfAnimationTrack?.setAttribute("data-enabled", String(enabled));
    setPrfAnimationEnabled(enabled);
    showStatusToast({
      message: enabled
        ? "PRFプレイグラウンドのアニメーションを有効にしました"
        : "PRFプレイグラウンドのアニメーションを無効にしました",
      variant: "info",
      ariaLive: "polite",
    });
  });
}

// --- account deletion flow ---
const deleteAccountBtn = document.getElementById("delete-account-btn") as HTMLButtonElement | null;

const openConfirmModal = (summary: AccountDeletionSummary) => {
  const wrapClass = css`
    display: grid;
    gap: 12px;
    max-width: 520px;
  `;

  const listClass = css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  `;

  const btnRow = css`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const cancelClass = buttonClass("secondary", "md");
  const proceedClass = buttonClass("danger", "md");

  openModalWithJSX(
    <div class={wrapClass}>
      <h3>本当にアカウントを削除しますか？</h3>
      <p>
        プロフィール <strong>{summary.username}</strong> を削除します。この操作は元に戻せません。
      </p>
      <div class={badgeClass("danger")}>
        {summary.ciphertextCount} 個の暗号データが削除されます。
      </div>
      <ul class={listClass}>
        <li>パスキー: {summary.passkeyCount} 件</li>
        <li>履歴: {summary.passkeyHistoryCount} 件</li>
      </ul>
      <div class={btnRow}>
        <button class={cancelClass} type="button" onClick={() => closeModal()}>
          キャンセル
        </button>
        <button
          class={proceedClass}
          type="button"
          onClick={async () => {
            closeModal();
            openMessageModal("再認証を実行しています...", undefined, { loading: true });
            const ok = await handleReauthentication();
            closeModal();
            if (!ok) {
              openMessageModal("再認証に失敗しました。もう一度お試しください。");
              return;
            }
            openPhraseModal(summary);
          }}
        >
          続行する
        </button>
      </div>
    </div>,
  );
};

const openPhraseModal = (summary: AccountDeletionSummary) => {
  const wrapClass = css`
    display: grid;
    gap: 12px;
    max-width: 520px;
  `;

  const codeClass = css`
    display: inline-block;
    background: #0f172a;
    color: #e2e8f0;
    padding: 6px 10px;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    user-select: none;
  `;

  const inputClass = cx(
    inputFieldClass,
    css`
      width: 100%;
      box-sizing: border-box;
    `,
  );

  const btnRow = css`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const secondaryBtn = buttonClass("secondary", "md");
  const dangerBtn = buttonClass("danger", "md");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>("input[name=confirmation]");
    const value = input?.value.trim() ?? "";

    if (value.length === 0) {
      // Fatal error なので alert で良い。通常、そもそも input は required 属性であり、空送信はできない。
      alert("確認文字列を入力してください");
      return;
    }

    openMessageModal("アカウント削除を実行しています...", undefined, {
      loading: true,
    });

    const result = await deleteAccount(value);
    if (!result.success) {
      openMessageModal(`削除に失敗しました: ${result.error}`);
      return;
    }

    if (PublicKeyCredential.signalUnknownCredential) {
      for (const credentialId of result.value.credentialIds) {
        try {
          await PublicKeyCredential.signalUnknownCredential({
            credentialId,
            rpId: result.value.rpId,
          });
        } catch (err) {
          console.error("Failed to signal unknown credential:", credentialId, err);
        }
      }
    }

    openMessageModal("アカウントを削除しました。", () => {
      window.location.href = "/";
    });
  };

  openModalWithJSX(
    <form class={wrapClass} onSubmit={handleSubmit}>
      <h3>確認用の文字列を入力してください</h3>
      <p>削除を実行するには、次の文字列をそのまま入力してください。</p>
      <p>
        <code class={codeClass}>{summary.confirmationText}</code>
      </p>
      <label>
        <span>確認文字列</span>
        <input
          type="text"
          name="confirmation"
          class={inputClass}
          placeholder="delete username"
          autoComplete="off"
          required
        />
      </label>
      <div class={btnRow}>
        <button type="button" class={secondaryBtn} onClick={() => closeModal()}>
          キャンセル
        </button>
        <button type="submit" class={dangerBtn}>
          アカウントを削除する
        </button>
      </div>
    </form>,
  );
};

deleteAccountBtn?.addEventListener("click", async () => {
  const summaryResult = await fetchAccountDeletionSummary();
  if (!summaryResult.success) {
    openMessageModal(`削除の準備に失敗しました: ${summaryResult.error}`);
    return;
  }
  openConfirmModal(summaryResult.value);
});
