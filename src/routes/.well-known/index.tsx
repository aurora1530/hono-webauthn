import { Hono } from "hono";
import { relatedOrigins } from "src/lib/auth/relatedOrigins.js";
import { typedEnv } from "../../env.js";

const wellKnownApp = new Hono();

wellKnownApp.get("/webauthn", (c) => {
  const data = typedEnv.NODE_ENV === "production" ? relatedOrigins : "";
  return c.json(data);
});

export default wellKnownApp;
