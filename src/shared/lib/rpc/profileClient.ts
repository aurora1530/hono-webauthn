import type { ProfileAppType } from "@shared/contract/rpc";
import { hc } from "hono/client";

export const profileClient = hc<ProfileAppType>("/profile");
