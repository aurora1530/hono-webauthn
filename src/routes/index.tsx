import { Hono } from "hono";
import authApp from "./auth/index.js";
import profileApp from "./profile/index.tsx";
import Top from "../components/common/Top.js";

const routerRootApp = new Hono();

routerRootApp.route("/auth", authApp);
routerRootApp.route("/profile", profileApp);

routerRootApp.get("/", async (c) => {
  return c.render(<Top />, {
    title: "トップ",
  });
});
export default routerRootApp;
