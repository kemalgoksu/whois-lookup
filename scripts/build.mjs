import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "build");
const browsers = {
  firefox: "manifest.json",
  chrome: "manifest.chrome.json"
};
const sharedFiles = ["background.js", "popup.css", "popup.html", "popup.js"];

await rm(outputRoot, { recursive: true, force: true });

for (const [browser, manifestFile] of Object.entries(browsers)) {
  const output = path.join(outputRoot, browser);
  await mkdir(output, { recursive: true });

  for (const file of sharedFiles) {
    await cp(path.join(root, file), path.join(output, file));
  }
  await cp(path.join(root, "icons"), path.join(output, "icons"), { recursive: true });
  await writeFile(
    path.join(output, "manifest.json"),
    await readFile(path.join(root, manifestFile), "utf8")
  );
}

console.log("Built Firefox extension in build/firefox");
console.log("Built Chrome extension in build/chrome");
