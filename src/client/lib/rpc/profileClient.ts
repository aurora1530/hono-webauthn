import type { ProfileAppType } from "../../../routes/profile/index.ts";
import { hc } from "hono/client";

export const profileClient = hc<ProfileAppType>("/profile");
