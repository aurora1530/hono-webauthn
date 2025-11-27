import type { AuthAppType } from "@shared/contract/rpc";
import { hc } from "hono/client";

export const authClient = hc<AuthAppType>("/auth");
