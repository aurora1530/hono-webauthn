import { hc } from "hono/client";
import type { AuthAppType } from "../../../rpc";

export const authClient = hc<AuthAppType>("/auth");
