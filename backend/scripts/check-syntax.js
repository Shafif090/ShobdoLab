import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourceDir = new URL("../src/", import.meta.url);

async function listJavaScriptFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const childUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
      if (entry.isDirectory()) {
        return listJavaScriptFiles(childUrl);
      }

      return entry.name.endsWith(".js") ? [childUrl] : [];
    }),
  );

  return files.flat();
}

for (const fileUrl of await listJavaScriptFiles(sourceDir)) {
  execFileSync(process.execPath, ["--check", fileURLToPath(fileUrl)], {
    stdio: "inherit",
  });
}

console.log("Syntax check passed.");
