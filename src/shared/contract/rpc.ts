export type AuthAppType = typeof import("@feature/auth/server/routes.js").authAppRoutes;
export type WebAuthnAppType =
  typeof import("@feature/auth/server/webauthn/routes.js").webAuthnRoutes;
export type ProfileAppType = typeof import("@feature/profile/server/routes.js").profileRoutes;
export type PrfAppType = typeof import("@feature/auth/server/webauthn/prf/routes.js").prfRoutes;
