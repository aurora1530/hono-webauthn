const STORAGE_KEY = "prf-animation-enabled";

export const PRF_ANIMATION_STORAGE_KEY = STORAGE_KEY;

export const getPrfAnimationEnabled = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true; // デフォルトは有効
  return stored !== "false";
};

export const setPrfAnimationEnabled = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
};
