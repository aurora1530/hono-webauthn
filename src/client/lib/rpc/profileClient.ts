import type { ProfileAppType } from "@shared/rpc.js";
import { hc } from "hono/client";

export const profileClient = hc<ProfileAppType>("/profile");
