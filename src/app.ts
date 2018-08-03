import express from "express";
import logger from "./util/logger";
import path from "path";

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as apiController from "./controllers/api";
import * as downloadFilesController from "./controllers/api/files/download";
import * as moveFilesController from "./controllers/api/files/move";

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
app.get("/api/xml2json",    apiController.xml2json);

app.get("/api/files/download",    downloadFilesController.download);
app.get("/api/files/move",    moveFilesController.move);
// app.get("/api/files/downloadMove",    moveFilesController.move);

app.get("/api/error",       apiController.testError);
}

export default app;
