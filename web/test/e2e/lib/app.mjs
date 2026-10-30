// Starts extra copies of the web app (plain Node route) with their own environment, so each env
// option can be switched on in isolation without touching the primary app under test.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { WEB_DIR, E2E_DIR, ACCOUNTS, mealieUrl, mealieToken } from "./config.mjs";
import { hashPassword } from "../../../security.mjs";

export async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.on("error", reject);
  });
}

export async function usersEnv() {
  const rows = [];
  for (const key of ["admin", "writer", "reader"]) {
    const { name, role, password } = ACCOUNTS[key];
    rows.push(`${name}:${role}:${await hashPassword(password)}`);
  }
  return rows.join(";");
}

// Data directories live inside the runner's work directory (E2E_WORK_DIR, removed at teardown). When a
// spec file runs on its own, they sit in the system temp directory and are removed when it exits.
const dataDirs = [];
process.on("exit", () => {
  for (const dir of dataDirs) rmSync(dir, { recursive: true, force: true });
});
export function newDataDir() {
  const dir = mkdtempSync(join(process.env.E2E_WORK_DIR || tmpdir(), "atelier-e2e-data-"));
  dataDirs.push(dir);
  return dir;
}

function baseEnv(dataDir) {
  return {
    PATH: process.env.PATH,
    MEALIE_URL: mealieUrl,
    MEALIE_API_TOKEN: mealieToken,
    ATELIER_PASSWORD: ACCOUNTS.shared.password,
    HOST: "127.0.0.1",
    ATELIER_DATA_DIR: dataDir,
  };
}

/**
 * Runs server.mjs with exactly the given environment (plus the minimum to reach Mealie).
 * `mock` is the origin of lib/mocks.mjs; when set, provider calls are redirected to it.
 * Resolves once the server prints its listening line, or rejects with the output when it exits.
 */
export async function startApp(overrides = {}, { mock, dataDir = newDataDir(), envFile } = {}) {
  const port = await freePort();
  const base = envFile
    ? { PATH: process.env.PATH, HOST: "127.0.0.1", ATELIER_DATA_DIR: dataDir }
    : baseEnv(dataDir);
  const env = { ...base, PORT: String(port), ...overrides };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  const args = envFile ? ["--env-file", envFile] : [];
  if (mock) {
    args.push("--import", join(E2E_DIR, "lib", "redirect-providers.mjs"));
    env.E2E_MOCK_ORIGIN = mock;
  }
  args.push("server.mjs");
  const child = spawn(process.execPath, args, {
    cwd: WEB_DIR,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  const listening = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 15000);
    const check = setInterval(() => {
      if (/available on http/.test(output)) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 50);
    exited.then((code) => {
      clearTimeout(timer);
      clearInterval(check);
      reject(new Error(`server exited with ${code}:\n${output}`));
    });
  });
  await listening;
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    dataDir,
    logs: () => output,
    async stop() {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await exited;
      }
    },
  };
}

/** Starts the server expecting it to refuse the configuration; returns exit code and output. */
export async function startRefused(overrides = {}) {
  const env = { ...baseEnv(newDataDir()), PORT: "0", ...overrides };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: WEB_DIR,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  const code = await new Promise((resolve) => child.on("exit", resolve));
  clearTimeout(timer);
  return { code, output };
}
