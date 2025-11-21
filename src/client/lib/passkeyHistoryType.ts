export const PASSKEY_HISTORY_TYPE_LABELS = {
  LOGIN: 'ログイン',
  REAUTH: '再認証',
  TEST: 'テスト',
} as const;

export type ClientPasskeyHistoryType = keyof typeof PASSKEY_HISTORY_TYPE_LABELS;

export const getPasskeyHistoryTypeLabel = (type: string): string => {
  if (type in PASSKEY_HISTORY_TYPE_LABELS) {
    return PASSKEY_HISTORY_TYPE_LABELS[type as ClientPasskeyHistoryType];
  }
  return type;
};
