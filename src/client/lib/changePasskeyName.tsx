import type { Result } from "@shared/type.js";
import { PasskeyRenameModal } from "../components/common/PasskeyRenameModal.js";
import { showStatusToast } from "../components/common/StatusToast.js";
import { openModalWithJSX } from "./modal/base.js";
import { webauthnClient } from "./rpc/webauthnClient.js";

type SubmitResult = Result<never, string>;

const updateDomPasskeyName = (passkeyId: string, newName: string) => {
  const card = document.querySelector<HTMLElement>(`[data-passkey-id="${passkeyId}"]`);
  const nameEl = card?.querySelector<HTMLElement>("[data-passkey-name-label]");
  if (nameEl) nameEl.textContent = newName;

  const renameBtn = card?.querySelector<HTMLButtonElement>(".change-passkey-name-btn");
  if (renameBtn) renameBtn.dataset.passkeyName = newName;
};

async function handleChangePasskeyName(
  passkeyId: string,
  currentName: string,
  defaultName: string,
) {
  const submit = async (newName: string): Promise<SubmitResult> => {
    try {
      const res = await webauthnClient["change-passkey-name"].$post({
        json: { newName, passkeyId },
      });

      if (!res.ok) {
        const error = (await res.json()).error;
        return { success: false, error: error ?? "エラーが発生しました。" };
      }

      updateDomPasskeyName(passkeyId, newName);
      showStatusToast({
        message: `パスキー名を「${newName}」に更新しました。`,
        variant: "success",
        ariaLive: "polite",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to change passkey name", error);
      return { success: false, error: "通信に失敗しました。時間をおいて再度お試しください。" };
    }
  };

  const handleReset = async (): Promise<SubmitResult> => {
    const ok = confirm("パスキー名をデフォルトに戻しますか？");
    if (!ok) return { success: false, error: "ユーザーが操作をキャンセルしました。" };
    return submit(defaultName);
  };

  openModalWithJSX(
    <PasskeyRenameModal
      currentName={currentName}
      onSubmit={submit}
      defaultName={defaultName}
      onReset={handleReset}
    />,
  );
}

export { handleChangePasskeyName };
