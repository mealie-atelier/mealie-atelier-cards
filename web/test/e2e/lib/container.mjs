// Extra containers of the image built from web/Dockerfile (Docker route), each with its own
// environment, so options can be switched on in isolation exactly like the plain Node route does.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { E2E_DIR, ACCOUNTS } from "./config.mjs";
import { usersEnv } from "./app.mjs";

export const PROJECT = "atelier-web-e2e";
export const IMAGE = `${PROJECT}-mealie-atelier`;
export const NETWORK = `${PROJECT}_default`;
const MEALIE_INTERNAL = "http://mealie:9000";
const work = process.env.E2E_WORK_DIR || E2E_DIR;
// One id per e2e run, shared with the spec child processes through the environment. Every container
// and volume carries it as a label, so the runner can sweep what a killed spec process left behind.
export const RUN_ID = process.env.E2E_RUN_ID || randomUUID();
const LABEL = `atelier-web-e2e-run=${RUN_ID}`;
const started = [];
const volumes = [];
let counter = 0;

const docker = (...args) => spawnSync("docker", args, { encoding: "utf8" });

function baseEnv() {
  return {
    MEALIE_URL: MEALIE_INTERNAL,
    MEALIE_API_TOKEN: process.env.E2E_MEALIE_TOKEN,
    ATELIER_PASSWORD: ACCOUNTS.shared.password,
    PORT: "3000",
    HOST: "0.0.0.0",
    ATELIER_DATA_DIR: "/app/data",
  };
}

function envFile(overrides) {
  const env = { ...baseEnv(), ...overrides };
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  const dir = join(work, "container-env");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, `env-${process.pid}-${(counter += 1)}`);
  writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });
  return file;
}

/** Docker run arguments that match the hardening of the shipped compose file. */
const hardening = [
  "--read-only",
  "--tmpfs",
  "/tmp",
  "--cap-drop",
  "ALL",
  "--security-opt",
  "no-new-privileges:true",
  "--add-host",
  "host.docker.internal:host-gateway",
];

export const newVolume = () => {
  const name = `${PROJECT}-data-${process.pid}-${(counter += 1)}`;
  docker("volume", "create", "--label", LABEL, name);
  volumes.push(name);
  return name;
};

/** Starts a container and resolves once the app prints its listening line. */
export async function startContainer(overrides = {}, { mock, volume, hostPort } = {}) {
  const env = { ...overrides };
  const extra = [];
  if (mock) {
    env.E2E_MOCK_ORIGIN = mock;
    env.NODE_OPTIONS = "--import=/e2e/redirect-providers.mjs";
    extra.push("-v", `${join(E2E_DIR, "lib")}:/e2e:ro`);
  }
  if (volume) extra.push("-v", `${volume}:/app/data`);
  else extra.push("--tmpfs", "/app/data:uid=1000,gid=1000");
  const name = `${PROJECT}-extra-${process.pid}-${(counter += 1)}`;
  const run = docker(
    "run",
    "-d",
    "--name",
    name,
    "--label",
    LABEL,
    "--network",
    NETWORK,
    "-p",
    `127.0.0.1:${hostPort || ""}:3000`,
    "--env-file",
    envFile(env),
    ...hardening,
    ...extra,
    IMAGE,
  );
  if (run.status !== 0) throw new Error(`docker run failed: ${run.stderr}`);
  started.push(name);
  // A random host port is published again on every start (unless one is given), so the URL is looked up each time.
  const lookup = () =>
    `http://127.0.0.1:${docker("port", name, "3000/tcp").stdout.trim().split("\n")[0].split(":").pop()}`;
  const handle = { name, url: lookup() };
  const logs = () => {
    const out = docker("logs", name);
    return `${out.stdout}${out.stderr}`;
  };
  const deadline = Date.now() + 30000;
  while (!/available on http/.test(logs())) {
    if (docker("inspect", "-f", "{{.State.Running}}", name).stdout.trim() !== "true")
      throw new Error(`container exited:\n${logs()}`);
    if (Date.now() > deadline) throw new Error(`container did not start:\n${logs()}`);
    await new Promise((done) => setTimeout(done, 200));
  }
  return Object.assign(handle, {
    logs,
    stop: () => docker("stop", "-t", "3", name),
    start: async () => {
      docker("start", name);
      handle.url = lookup();
      const again = Date.now() + 30000;
      for (;;) {
        try {
          if ((await fetch(`${handle.url}/healthz`)).status < 600) return;
        } catch {}
        if (Date.now() > again) throw new Error("container did not restart");
        await new Promise((done) => setTimeout(done, 200));
      }
    },
  });
}

/** Runs the image with a configuration it must refuse; returns exit code and output. */
export function runRefused(overrides = {}) {
  const run = docker(
    "run",
    "--rm",
    "--network",
    NETWORK,
    "--env-file",
    envFile(overrides),
    ...hardening,
    "--tmpfs",
    "/app/data:uid=1000,gid=1000",
    IMAGE,
  );
  return { code: run.status, output: `${run.stdout}${run.stderr}` };
}

/** Removes every container, volume and env file this process created. */
export function removeContainers() {
  for (const name of started.splice(0)) docker("rm", "-f", name);
  // Containers created by another process of this run (a spec child that was killed) are found by label.
  const labelled = docker("ps", "-aq", "--filter", `label=${LABEL}`)
    .stdout.split("\n")
    .filter(Boolean);
  for (const id of labelled) docker("rm", "-f", id);
  for (const name of volumes.splice(0)) docker("volume", "rm", "-f", name);
  const stray = docker("volume", "ls", "-q", "--filter", `label=${LABEL}`)
    .stdout.split("\n")
    .filter(Boolean);
  for (const name of stray) docker("volume", "rm", "-f", name);
  rmSync(join(work, "container-env"), { recursive: true, force: true });
}

export const usersForContainer = usersEnv;

// A spec process that is interrupted removes its own containers before it exits.
if (process.env.E2E_RUN_ID) {
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      removeContainers();
      process.exit(130);
    });
}
