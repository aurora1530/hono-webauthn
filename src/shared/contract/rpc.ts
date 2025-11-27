export type AuthAppType = typeof import("./routes/auth/index.js").authAppRoutes;
export type WebAuthnAppType = typeof import("./routes/auth/webauthn/index.js").webAuthnRoutes;
export type ProfileAppType = typeof import("./routes/profile/index.js").profileRoutes;
export type PrfAppType = typeof import("./routes/auth/webauthn/prf/index.js").prfRoutes;
