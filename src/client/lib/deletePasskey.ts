import { showStatusToast } from "../components/common/StatusToast.js";
import { closeModal } from "./modal/base.js";
import { openMessageModal } from "./modal/message.js";
import { webauthnClient } from "./rpc/webauthnClient.js";
import { handleReauthentication } from "./webauthn/reauthentication.js";

async function handleDeletePasskey(passkeyId: string, onlySyncedPasskey: boolean = false) {
  if (confirm("本当にこのパスキーを削除しますか？")) {
    if (
      onlySyncedPasskey &&
      !confirm(
        "このパスキーは同期されている唯一のパスキーです。削除すると、残りのパスキーは同期されておらず、デバイスを紛失するとアカウントにアクセスできなくなります。本当に削除しますか？",
      )
    ) {
      return;
    }

    openMessageModal(`再認証を開始します。`, { loading: true });
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      openMessageModal("再認証に失敗しました。パスキーは削除されませんでした。");
      return;
    }
    closeModal();

    const res = await webauthnClient["delete-passkey"].$post({
      json: { passkeyId },
    });
    if (!res.ok) {
      const error = (await res.json()).error;
      showStatusToast({
        message: `パスキーの削除に失敗しました: ${error}`,
        variant: "error",
        ariaLive: "assertive",
      });
      return;
    }

    const json = await res.json();
    // reload 前の成功メッセージなので、alert を使う。
    alert(`${json.passkeyName} を削除しました。`);

    if (PublicKeyCredential.signalUnknownCredential) {
      await PublicKeyCredential.signalUnknownCredential({
        rpId: json.rpId,
        credentialId: json.passkeyId,
      });
    }

    location.reload();
  }
}

export { handleDeletePasskey };
