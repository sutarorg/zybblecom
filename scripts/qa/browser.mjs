import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Install the browser tooling in a separate directory (see docs) or use an existing Chromium.
export const loadTool = (name) => require(name);
export async function launchBrowser() {
  const engines = loadTool("playwright-core");
  const name = process.env.QA_BROWSER ?? "chromium";
  if (!["chromium", "firefox", "webkit"].includes(name))
    throw new Error(`Unknown QA_BROWSER: ${name}`);
  return engines[name].launch({
    executablePath: name === "chromium" ? process.env.CHROMIUM_PATH : undefined,
    headless: true,
  });
}
