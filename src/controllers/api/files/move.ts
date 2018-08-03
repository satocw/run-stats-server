import { Response, Request, NextFunction } from "express";
import { readdir, readFile, rename } from "fs";
import { extname, resolve as path_resolve } from "path";
import { parseString } from "xml2js";

import { assureDirExists, writeToFile } from "../../../_internal/fs";
import {
  DATA_TMP_DIR,
  DATA_TCX_DIR,
  DATA_JSON_DIR,
  DATA_META_DIR
} from "../../../util/constants";

export let move = (req: Request, res: Response, next: NextFunction) => {
  move_(DATA_TMP_DIR, DATA_TCX_DIR, DATA_JSON_DIR, DATA_META_DIR)
    .then(val => {
      console.log("THEN");
      res.end(val + "");
    })
    .catch(err => {
      console.log("CATCH");
      res.end(err + "");
    });
};

export let move_ = (
  dataOrigDir: string,
  dataDestDir: string,
  dataJsonDir: string,
  dataMetaDir: string
) => {
  return new Promise((resolve, reject) => {
    const promises: Promise<any>[] = [];
    readdir(dataOrigDir, (err, files) => {
      if (err) {
        reject("Error readdir: " + dataOrigDir);
      }

      files.filter(extensionIs(".tcx")).forEach(file => {
        promises.push(readTCXFile(path_resolve(DATA_TMP_DIR, file)));
      });

      resolve(promises.length > 0 && Promise.all(promises));
    });
  });
};

const readTCXFile = (filepath: string) => {
  return new Promise((resolve, reject) => {
    readFile(filepath, (err, data) => {
      if (err) {
        reject("Error readFile: " + filepath);
      }

      parseString(data + "", (err, result) => {
        if (err) {
          reject("Error parseString");
        }

        const newFileName = toStartDateStr(result);
        rename(
          filepath,
          path_resolve(DATA_TCX_DIR, "201808", newFileName + ".tcx"),
          err => {
            if (err) {
              reject("Error rename: " + filepath);
            }
          }
        );

        resolve(toStartDateStr(result));
      });
    });
  });
};

// 2018.08.03-18.10.00
const toStartDateStr = (activityJson: any): string => {
  try {
    // prettier-ignore
    const timeNode =
      activityJson["TrainingCenterDatabase"]["Activities"][0]["Activity"][0]["Id"][0];
    const dDate = new Date(timeNode);

    const year = dDate.getFullYear();
    const month = dDate.getMonth() + 1;
    const date = dDate.getDate();
    const hour = dDate.getHours();
    const minute = dDate.getMinutes();
    const second = dDate.getSeconds();

    function pad(num: number | string): string {
      return +num < 10 ? "0" + num : "" + num;
    }

    // prettier-ignore
    const full =
      year + "." + pad(month) + "." + pad(date) +
      "-" +
      pad(hour) + "." + pad(minute) + "." + pad(second);

    return full;
  } catch (e) {
    console.error("Failed to Get StartTime from Activity TCX");
    return "";
  }
};

const extensionIs = (ext: string) => (filename: string) => {
  return extname(filename) === ext;
};
