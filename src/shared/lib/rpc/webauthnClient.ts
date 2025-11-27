import type { WebAuthnAppType } from "@shared/contract/rpc.js";
import { hc } from "hono/client";

export const webauthnClient = hc<WebAuthnAppType>("/auth/webauthn");
