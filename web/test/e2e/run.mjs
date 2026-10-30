#!/usr/bin/env node
// End-to-end runner for the standalone web app (the version without Home Assistant).
//
//   npm run test:e2e                 both delivery routes (plain Node, then the Docker image)
//   npm run test:e2e -- --route=node route "node" or "docker" only
//   npm run test:e2e -- --only=roles run only spec files whose name contains "roles"
//   npm run test:e2e -- --strict     fail (exit 1) instead of skipping when Docker is unavailable
//   npm run test:e2e -- --keep       keep the disposable Mealie running afterwards (debugging only)
//
// It starts a disposable Mealie (fictional seed data) on non-default ports, starts the app, waits for
// health, runs the Playwright specs and always tears everything down again. Not part of CI or of the
// pre-commit hook on purpose: it needs Docker, pulls images and takes a few minutes.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_DIR, ACCOUNTS } from "./lib/config.mjs";
import { startApp, usersEnv, newDataDir } from "./lib/app.mjs";
import { createToken, seed, waitForMealie } from "./seed.mjs";
import { removeContainers } from "./lib/container.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const strict = args.includes("--strict");
const routes = flag("route") ? [flag("route")] : ["node", "docker"];
const only = flag("only") || "";
// Debug aid: leave the disposable Mealie running between runs (the app is still stopped).
const keep = args.includes("--keep");

const MEALIE_PORT = process.env.E2E_MEALIE_PORT || "29925";
const DOCKER_PORT = process.env.E2E_DOCKER_PORT || "23008";
const MEALIE_URL = `http://127.0.0.1:${MEALIE_PORT}`;
// The Mealie base file, the shipped web/compose.yaml and the small override. Order matters: relative
// paths resolve against the first file, which is why the override names the build context itself.
const composeFiles = [
  join(E2E_DIR, "compose.yaml"),
  join(E2E_DIR, "..", "..", "compose.yaml"),
  join(E2E_DIR, "app.override.yaml"),
].flatMap((file) => ["-f", file]);
const compose = (...rest) =>
  spawnSync("docker", ["compose", ...composeFiles, ...rest], {
    cwd: E2E_DIR,
    stdio: "inherit",
    env: { ...process.env, E2E_MEALIE_PORT: MEALIE_PORT, ATELIER_HOST_PORT: DOCKER_PORT },
  });

function skip(reason) {
  console.log(`E2E SKIPPED: ${reason}`);
  process.exit(strict ? 1 : 0);
}

if (!routes.every((r) => ["node", "docker"].includes(r))) {
  console.error("--route must be node or docker");
  process.exit(2);
}
if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0)
  skip("Docker is not installed or its daemon is not running (needed for the disposable Mealie).");

if (!existsSync(join(E2E_DIR, "node_modules", "playwright"))) {
  console.log("Installing the e2e dependencies (Playwright) ...");
  const install = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: E2E_DIR,
    stdio: "inherit",
  });
  if (install.status !== 0) skip("could not install Playwright (npm ci failed in web/test/e2e).");
}
const { chromium } = await import("playwright");
if (!existsSync(chromium.executablePath())) {
  console.log("Downloading the Chromium build used by Playwright ...");
  spawnSync("npx", ["playwright", "install", "chromium"], { cwd: E2E_DIR, stdio: "inherit" });
  if (!existsSync(chromium.executablePath())) skip("Chromium for Playwright is not available.");
}

const work = mkdtempSync(join(tmpdir(), "atelier-e2e-"));
let primary = null;
let failed = false;

function runSpecs(route, baseUrl, token) {
  const suffix = route === "node" ? /\.(node\.)?e2e\.mjs$/ : /(?<!\.node)\.e2e\.mjs$/;
  const specs = readdirSync(join(E2E_DIR, "specs"))
    .filter((f) => suffix.test(f) && f.includes(only))
    .filter((f) =>
      route === "docker" ? !f.endsWith(".node.e2e.mjs") : !f.endsWith(".docker.e2e.mjs"),
    )
    .sort()
    .map((f) => join("specs", f));
  if (!specs.length) {
    console.log(`no spec files match for route ${route}`);
    return 0;
  }
  console.log(`\n=== route: ${route} (${baseUrl}) ===`);
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--test", "--test-reporter=spec", "--test-concurrency=1", "--test-timeout=240000", ...specs],
      {
        cwd: E2E_DIR,
        stdio: "inherit",
        env: {
          ...process.env,
          E2E_ROUTE: route,
          E2E_WORK_DIR: work,
          E2E_BASE_URL: baseUrl,
          E2E_MEALIE_URL: MEALIE_URL,
          E2E_MEALIE_TOKEN: token,
          E2E_DOCKER_PORT: DOCKER_PORT,
        },
      },
    );
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function waitHealthy(url, tries = 90) {
  for (let i = 0; i < tries; i += 1) {
    try {
      if ((await fetch(`${url}/healthz`)).status === 200) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 2000));
  }
  throw new Error(`${url}/healthz did not become healthy`);
}

const cleanup = async () => {
  await primary?.stop().catch(() => {});
  removeContainers();
  compose("rm", "-sf", "mealie-atelier");
  if (!keep) compose("down", "-v", "--remove-orphans");
  rmSync(work, { recursive: true, force: true });
};
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => cleanup().finally(() => process.exit(130)));

try {
  console.log("Starting the disposable Mealie ...");
  if (compose("up", "-d", "mealie").status !== 0) throw new Error("docker compose up failed");
  await waitForMealie(MEALIE_URL);
  const token = await createToken(MEALIE_URL);
  await seed(MEALIE_URL, token);
  const users = await usersEnv();
  const envText = (mealieUrl) =>
    [
      `MEALIE_URL=${mealieUrl}`,
      `MEALIE_API_TOKEN=${token}`,
      `ATELIER_PASSWORD=${ACCOUNTS.shared.password}`,
      `ATELIER_USERS='${users}'`,
      "",
    ].join("\n");

  for (const route of routes) {
    let code;
    if (route === "node") {
      const envFile = join(work, "node.env");
      writeFileSync(envFile, envText(MEALIE_URL), { mode: 0o600 });
      // The plain Node route exactly as documented: node --env-file=.env server.mjs
      primary = await startApp({}, { dataDir: newDataDir(), envFile });
      await waitHealthy(primary.url);
      code = await runSpecs("node", primary.url, token);
      await primary.stop();
      primary = null;
    } else {
      const envFile = join(work, "docker.env");
      writeFileSync(envFile, envText("http://mealie:9000"), { mode: 0o600 });
      process.env.E2E_ENV_FILE = envFile;
      console.log("Building and starting the Docker image from web/Dockerfile ...");
      const up = compose("up", "-d", "--build", "mealie-atelier");
      if (up.status !== 0) throw new Error("docker compose up (app) failed");
      const url = `http://127.0.0.1:${DOCKER_PORT}`;
      await waitHealthy(url);
      code = await runSpecs("docker", url, token);
    }
    if (code !== 0) failed = true;
  }
} catch (error) {
  console.error(`E2E error: ${error.message}`);
  failed = true;
} finally {
  await cleanup();
}
console.log(failed ? "\nE2E FAILED" : "\nE2E PASSED");
process.exit(failed ? 1 : 0);
