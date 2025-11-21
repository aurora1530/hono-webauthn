import type { AuthAppType } from "../../../routes/auth/index.tsx";
import { hc } from "hono/client";

export const authClient = hc<AuthAppType>("/auth");
