import type { PrfAppType } from "@shared/rpc.js";
import { hc } from "hono/client";

export const prfClient = hc<PrfAppType>("/auth/webauthn/prf");
