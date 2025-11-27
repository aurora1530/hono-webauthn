import type { AuthAppType } from "@shared/contract/rpc.js";
import { hc } from "hono/client";

export const authClient = hc<AuthAppType>("/auth");
