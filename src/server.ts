import errorHandler from "errorhandler";

import app from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */
import { Request, Response, NextFunction } from "express";
function myErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("----- myErrorHandler -----");
  console.log(err);
  res.status(500).json(err);
}
app.use(myErrorHandler);
app.use(errorHandler());

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
  console.log(
    "  App is running at http://localhost:%d in %s mode",
    app.get("port"),
    app.get("env")
  );
  console.log("  Press CTRL-C to stop\n");
});

export default server;
