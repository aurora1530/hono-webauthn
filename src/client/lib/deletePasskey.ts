import { handleReauthentication } from "./reauthentication.ts";

async function handleDeletePasskey(passkeyId: string) {
  if (confirm("本当にこのパスキーを削除しますか？")) {
    alert('再認証を開始します。');
    const reauthSuccess = await handleReauthentication();
    if (!reauthSuccess) {
      alert('再認証に失敗しました。パスキーは削除されませんでした。');
      return;
    }

    fetch('/auth/webauthn/delete-passkey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passkeyId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert(`${data.message}`);
          location.reload();
        } else {
          alert(`パスキーの削除に失敗しました: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('パスキーの削除に失敗しました。');
      });
  }
}

export { handleDeletePasskey };
