import { Response, Request, NextFunction } from "express";
import { spawn, spawnSync } from "child_process";
import * as path from "path";

export let testSpawn = (req: Request, res: Response, next: NextFunction) => {
  const child = spawn("cmd", ["/c", "echo", "abc"]);
  child.stdout.on("data", data => {
    console.log(`child stdout:\n${data}`);
  });
  child.on("exit", (code, signal) => {
    console.log(
      "child process exited with" + `code ${code} and signal ${signal}`
    );
  });
  res.send("OK");
};

export let spawn2 = (req: Request, res: Response, next: NextFunction) => {
  const child = spawnSync("python", ["test.py"], {
    cwd: path.resolve(__dirname, "../../"),
    stdio: "inherit"
  });

  res.send("ok");
};

export let testError = (req: Request, res: Response, next: NextFunction) => {
  throw new Error("BROKEN");
};
