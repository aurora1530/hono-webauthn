import type { PasskeyHistoryType } from "@prisma/client";

export const PASSKEY_HISTORY_TYPE_LABELS: Record<PasskeyHistoryType, string> = {
  LOGIN: "ログイン",
  REAUTH: "再認証",
  TEST: "テスト",
  PRF: "PRF派生",
};

export const getPasskeyHistoryTypeLabel = (type: PasskeyHistoryType): string => {
  return PASSKEY_HISTORY_TYPE_LABELS[type] ?? type;
};
