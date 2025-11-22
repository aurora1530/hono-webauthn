import { hc } from "hono/client";
import type { PrfAppType } from "../../../rpc.ts";

export const prfClient = hc<PrfAppType>("/auth/webauthn/prf");
