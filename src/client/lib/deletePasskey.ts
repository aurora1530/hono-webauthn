import { closeModal, openModal } from "./modal.ts";
import { handleReauthentication } from "./reauthentication.ts";
import { webauthnClient } from "./rpc/webauthnClient.ts";

async function handleDeletePasskey(passkeyId: string) {
  if (confirm("本当にこのパスキーを削除しますか？")) {
    openModal(`<p>再認証を開始します。</p>`);
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      openModal('<p>再認証に失敗しました。パスキーは削除されませんでした。</p>');
      return;
    }
    closeModal();

    const res = await webauthnClient['delete-passkey'].$post({
      json: { passkeyId }
    })
    if (!res.ok) {
      const error = (await res.json()).error
      alert(`パスキーの削除に失敗しました: ${error}`);
      return;
    }

    const json = await res.json();
    alert(`${json.passkeyName} を削除しました。`);
    location.reload();
  }
}

export { handleDeletePasskey };
