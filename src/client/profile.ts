import { changeDebugMode } from "./lib/changeDebugMode";

document.getElementById("change-debug-mode-btn")?.addEventListener("change", async (e) => {
  const target = e.target as HTMLInputElement;
  const debugMode = target.checked;
  const result = await changeDebugMode(debugMode);

  if (!result.success) {
    alert(`Error changing debug mode: ${result.error}`);
    target.checked = !debugMode;
  }

  location.reload();
});
