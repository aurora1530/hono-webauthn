import type { AuthAppType } from "@shared/rpc.js";
import { hc } from "hono/client";

export const authClient = hc<AuthAppType>("/auth");
