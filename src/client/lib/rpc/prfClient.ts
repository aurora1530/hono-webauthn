import { hc } from "hono/client";
import type { PrfAppType } from "../../../rpc.js";

export const prfClient = hc<PrfAppType>("/auth/webauthn/prf");
