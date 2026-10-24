const REDIRECT_BASE_ORIGIN = "https://redirect.invalid";
const MAX_REDIRECT_LENGTH = 2000;

export const sanitizeRedirectPath = (candidate?: string | null): string | undefined => {
  if (!candidate || candidate.length > MAX_REDIRECT_LENGTH) return undefined;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return undefined;
  if (/[\\\p{Cc}]/u.test(candidate)) return undefined;

  try {
    const resolved = new URL(candidate, REDIRECT_BASE_ORIGIN);
    if (resolved.origin !== REDIRECT_BASE_ORIGIN) return undefined;
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    // 正規化したパスを再び URL として使う際も、ホスト指定にならないようにする。
    if (path.startsWith("//")) return undefined;
    return path;
  } catch {
    return undefined;
  }
};
