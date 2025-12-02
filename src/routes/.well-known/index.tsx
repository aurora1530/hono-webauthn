import { Hono } from "hono";
import { typedEnv } from "src/env.js";

const wellKnownApp = new Hono();

wellKnownApp.get("/webauthn", (c) => {
  const data = {
    origins: typedEnv.RELATED_ORIGINS
      ? [typedEnv.ORIGIN, ...typedEnv.RELATED_ORIGINS.split(",").map((s) => s.trim())]
      : [typedEnv.ORIGIN],
  };
  return c.json(data);
});

export default wellKnownApp;
