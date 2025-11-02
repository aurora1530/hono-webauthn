function handleChangePasskeyName(passkeyId: string, currentName: string) {
  const newName = prompt("新しいパスキー名を入力してください:", currentName);
  if (newName) {
    fetch('/auth/webauthn/change-passkey-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passkeyId, newName }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert(`パスキー名を "${newName}" に変更しました。`);
          location.reload();
        } else {
          alert(`パスキー名の変更に失敗しました: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('パスキー名の変更に失敗しました。');
      });
  }
}