import Top from "@components/common/Top.js";
import authApp from "@feature/auth/server/routes.js";
import profileApp from "@feature/profile/server/routes.js";
import { Hono } from "hono";

const routerRootApp = new Hono();

routerRootApp.route("/auth", authApp);
routerRootApp.route("/profile", profileApp);

routerRootApp.get("/", async (c) => {
  return c.render(<Top />, {
    title: "トップ",
  });
});
export default routerRootApp;
