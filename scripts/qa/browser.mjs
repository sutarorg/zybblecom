import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Install the browser tooling in a separate directory (see docs) or use an existing Chromium.
export const loadTool = (name) => require(name);
export async function launchBrowser() {
  const { chromium } = loadTool("playwright-core");
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
  });
}
