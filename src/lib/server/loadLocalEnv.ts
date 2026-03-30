import fs from "fs";
import path from "path";

export const loadLocalEnv = (cwd: string = process.cwd()) => {
  try {
    const envPath = path.resolve(cwd, ".env.local");
    if (!fs.existsSync(envPath)) {
      return;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
      if (!match) {
        return;
      }

      const key = match[1];
      let value = match[2].trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      const commentIndex = value.indexOf(" #");
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error("Failed to load .env.local manually:", error);
  }
};
