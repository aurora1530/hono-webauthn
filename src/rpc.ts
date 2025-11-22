export type AuthAppType = typeof import("./routes/auth/index.tsx").authAppRoutes;
export type WebAuthnAppType = typeof import("./routes/auth/webauthn/index.tsx").webAuthnRoutes;
export type ProfileAppType = typeof import("./routes/profile/index.tsx").profileRoutes;
