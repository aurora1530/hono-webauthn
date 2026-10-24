import { sanitizeRedirectPath } from "../../shared/redirect.js";

const REDIRECT_QUERY_KEY = "redirect";

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
