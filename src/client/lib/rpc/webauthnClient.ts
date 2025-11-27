import type { WebAuthnAppType } from "@shared/rpc.js";
import { hc } from "hono/client";

export const webauthnClient = hc<WebAuthnAppType>("/auth/webauthn");
