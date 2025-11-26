const REDIRECT_QUERY_KEY = "redirect";
const MAX_REDIRECT_LENGTH = 2000;

const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

const sanitizeRedirectPath = (candidate?: string | null): string | undefined => {
  if (!candidate) return undefined;
  if (!candidate.startsWith("/")) return undefined;
  if (candidate.startsWith("//")) return undefined;
  if (candidate.length > MAX_REDIRECT_LENGTH) return undefined;
  if (hasScheme(candidate)) return undefined;
  return candidate;
};

const buildLoginRedirectUrl = (request: Request): string => {
  const url = new URL(request.url);
  const pathWithSearch = `${url.pathname}${url.search}`;
  const safePath = sanitizeRedirectPath(pathWithSearch);
  if (!safePath) return "/auth/login";

  const searchParams = new URLSearchParams();
  searchParams.set(REDIRECT_QUERY_KEY, safePath);
  return `/auth/login?${searchParams.toString()}`;
};

const extractRedirectPath = (request: Request): string | undefined => {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get(REDIRECT_QUERY_KEY);
  return sanitizeRedirectPath(redirectParam);
};

export { buildLoginRedirectUrl, extractRedirectPath, sanitizeRedirectPath };
