import { typedEnv } from "../../../env.ts";

export const MAX_PASSKEYS_PER_USER = 10;
export const rpName = "Hono WebAuthn Example";
export const rpID = "localhost";
export const origin = typedEnv.NODE_ENV === "production" ? "" : `http://${rpID}:3000`;
