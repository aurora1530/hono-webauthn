import type { WebAuthnAppType } from "@shared/contract/rpc";
import { hc } from "hono/client";

export const webauthnClient = hc<WebAuthnAppType>("/auth/webauthn");
