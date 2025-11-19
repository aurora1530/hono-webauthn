import { profileClient } from "./lib/rpc/profileClient";

document.getElementById('change-debug-mode-btn')?.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const debugMode = target.checked;
  const res = await profileClient["change-debug-mode"].$post({
    json: {
      debugMode
    }
  });

  if (!res.ok) {
    alert('デバッグモードの変更に失敗しました。');
    target.checked = !debugMode;
  }

  location.reload();
})