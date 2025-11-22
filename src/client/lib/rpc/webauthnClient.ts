import { hc } from "hono/client";
import type { WebAuthnAppType } from "../../../rpc";

export const webauthnClient = hc<WebAuthnAppType>("/auth/webauthn");
