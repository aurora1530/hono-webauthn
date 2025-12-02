import { Hono } from "hono";
import Top from "../components/common/Top.js";
import wellKnownApp from "./.well-known/index.js";
import authApp from "./auth/index.js";
import profileApp from "./profile/index.js";

const routerRootApp = new Hono();

routerRootApp.route("/auth", authApp);
routerRootApp.route("/profile", profileApp);
routerRootApp.route("/.well-known", wellKnownApp);

routerRootApp.get("/", async (c) => {
  return c.render(<Top />, {
    title: "トップ",
  });
});
export default routerRootApp;
