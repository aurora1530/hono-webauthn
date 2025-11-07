import type { WebAuthnAppType } from "../../../routes/auth/webauthn/index.tsx";
import { hc } from "hono/client";

export const webauthnClient = hc<WebAuthnAppType>('/auth/webauthn');
