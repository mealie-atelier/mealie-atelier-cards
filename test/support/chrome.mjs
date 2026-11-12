import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** A headless Chromium from CHROME_BIN or the Playwright cache, if one is installed. */
export function findChrome() {
  const candidates = [process.env.CHROME_BIN];
  for (const dir of [".cache/ms-playwright", "Library/Caches/ms-playwright"]) {
    const root = join(process.env.HOME ?? "", dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root).sort().reverse()) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      for (const sub of readdirSync(join(root, entry)))
        candidates.push(join(root, entry, sub, "chrome-headless-shell"));
    }
  }
  return candidates.find((path) => path && existsSync(path));
}
