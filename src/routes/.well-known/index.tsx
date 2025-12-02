import { Hono } from "hono";
import { typedEnv } from "../../env.js";
import { relatedOrigins } from "../../lib/auth/relatedOrigins.js";

const wellKnownApp = new Hono();

wellKnownApp.get("/webauthn", (c) => {
  const data = typedEnv.NODE_ENV === "production" ? relatedOrigins : "";
  return c.json(data);
});

export default wellKnownApp;
