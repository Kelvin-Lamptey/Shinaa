import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables from the root .env file relative to this source file
let envPath: string | undefined;
if (typeof __dirname !== "undefined") {
  envPath = path.resolve(__dirname, "../../../.env");
} else {
  let currentDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const checkPath = path.resolve(currentDir, ".env");
    if (fs.existsSync(checkPath)) {
      envPath = checkPath;
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
}
