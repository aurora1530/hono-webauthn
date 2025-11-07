import { webauthnClient } from "./rpc/webauthnClient.ts";

async function handleChangePasskeyName(passkeyId: string, currentName: string) {
  const newName = prompt("新しいパスキー名を入力してください:", currentName);
  if (newName) {
    const res = await webauthnClient["change-passkey-name"].$post({
      json: { newName, passkeyId }
    })

    if (!res.ok) {
      const error = (await res.json()).error
      alert(`パスキー名の変更に失敗しました: ${error}`);
      return;
    }

    alert(`パスキー名を "${newName}" に変更しました。`);
    location.reload();
  }
}

export { handleChangePasskeyName };