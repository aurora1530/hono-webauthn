import { showStatusToast } from "../components/common/StatusToast.js";
import { webauthnClient } from "./rpc/webauthnClient.js";

async function handleChangePasskeyName(passkeyId: string, currentName: string) {
  const newName = prompt("新しいパスキー名を入力してください:", currentName);
  if (newName) {
    const res = await webauthnClient["change-passkey-name"].$post({
      json: { newName, passkeyId },
    });

    if (!res.ok) {
      const error = (await res.json()).error;
      showStatusToast({
        message: `パスキー名の変更に失敗しました: ${error}`,
        variant: "error",
        ariaLive: "assertive",
      });
      return;
    }

    // reload 前の成功メッセージなので、alert を使う。
    alert(`パスキー名を "${newName}" に変更しました。`);
    location.reload();
  }
}

export { handleChangePasskeyName };
