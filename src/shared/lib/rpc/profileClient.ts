import type { ProfileAppType } from "@shared/contract/rpc.js";
import { hc } from "hono/client";

export const profileClient = hc<ProfileAppType>("/profile");
