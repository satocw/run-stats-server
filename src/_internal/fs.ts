import * as fs from "fs";
import * as path from "path";

/**
 * @param dir 作成するディレクトリパス
 * ディレクトリを再帰的に作成する
 */
export function assureDirExists(...dirs: string[]): void {
  const dir = path.resolve(...dirs);
  if (fs.existsSync(dir)) return;
  const sep = path.sep;
  dir.split(sep).reduce((parent, child) => {
    const parentDir = path.resolve(sep, parent);
    const childDir = path.resolve(sep, parent, child);
    if (fs.existsSync(parentDir) && !fs.existsSync(childDir)) {
      fs.mkdirSync(childDir);
    }
    return childDir;
  });
}

export function writeToFile(filepath: string, data: string): Promise<boolean> {
  assureDirExists(path.resolve(filepath, "../"));
  return new Promise((resolve, reject) => {
    fs.open(filepath, "w", err => {
      if (err) {
        // console.error(err);
        reject(err);
      }
      fs.writeFile(filepath, data, err => {
        if (err) {
          // console.error(err);
          reject(err);
        }
        resolve(true);
      });
    });
  });
}
