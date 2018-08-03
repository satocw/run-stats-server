import { Response, Request, NextFunction } from "express";
import { spawn, spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

import { parseString } from "xml2js";

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

export let xml2json = (req: Request, res: Response, next: NextFunction) => {
  fs.readFile(
    path.resolve(__dirname, "../../tmp/activity_2864943605.tcx"),
    (err, data) => {
      if (err) {
        return res.send("Error readFile");
      }

      parseString(data + "", (err, result) => {
        if (err) {
          return res.send("Error parseString");
        }

        fs.writeFile(
          path.resolve(__dirname, "../../tmp/test.json"),
          JSON.stringify(result),
          err => {
            if (err) {
              return res.send("Error writeFile");
            }
            res.send("Done");
          }
        );
      });
    }
  );
};

export let testError = (req: Request, res: Response, next: NextFunction) => {
  throw new Error("BROKEN");
};
