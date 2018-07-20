import express from "express";
import logger from "./util/logger";
import path from "path";

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as apiController from "./controllers/api";
import * as downloadController from "./controllers/api/download";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");

logger.debug("Server started");

/**
 * Primary app routes.
 */
// prettier-ignore
{
app.get("/",                homeController.index);
app.get("/api/spawn",       apiController.testSpawn);
app.get("/api/py",          apiController.spawn2);

app.get("/api/download",    downloadController.download);

app.get("/api/error",       apiController.testError);
}

export default app;
