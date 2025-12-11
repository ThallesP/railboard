import aggregate from "@convex-dev/aggregate/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workpool, { name: "addUserPool" });
app.use(aggregate);
export default app;
