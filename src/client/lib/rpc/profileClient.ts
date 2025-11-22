import { hc } from "hono/client";
import type { ProfileAppType } from "../../../rpc";

export const profileClient = hc<ProfileAppType>("/profile");
