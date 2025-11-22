import { typedEnv } from "../../../env.js";

export const MAX_PASSKEYS_PER_USER = 10;
export const rpName = "Hono WebAuthn Example";
export const rpID = "localhost";
export const ORIGIN = typedEnv.NODE_ENV === "production" ? "" : `http://${rpID}:3000`;
