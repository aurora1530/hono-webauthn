import { typedEnv } from "../../../env.js";

export const MAX_PASSKEYS_PER_USER = 10;
export const rpName = "Hono WebAuthn Example";
export const rpID = typedEnv.RP_ID;
export const ORIGIN = typedEnv.NODE_ENV === "production" ? typedEnv.ORIGIN : `http://${rpID}:3000`;
