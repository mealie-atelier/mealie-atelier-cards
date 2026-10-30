// Docker route only: the container started from the SHIPPED web/compose.yaml (plus a small override
// that sets no hardening) carries that file's hardening, the image's own health check reports healthy,
// and the published port is loopback only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { baseUrl, E2E_DIR, WEB_DIR } from "../lib/config.mjs";
import { eventually } from "../lib/mealie.mjs";

const container = "atelier-web-e2e-mealie-atelier-1";
const inspect = (target = container) => {
  const run = spawnSync("docker", ["inspect", target], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout)[0];
};

test("the override used for this run does not set any hardening of its own", () => {
  const override = readFileSync(join(E2E_DIR, "app.override.yaml"), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  for (const key of [
    "read_only",
    "cap_drop",
    "security_opt",
    "mem_limit",
    "cpus",
    "pids_limit",
    "healthcheck",
    "tmpfs",
    "user",
    "privileged",
  ])
    assert.doesNotMatch(
      override,
      new RegExp(`^\\s+${key}:`, "m"),
      `${key} must come from web/compose.yaml`,
    );
});

test("the shipped compose file asks for the hardening this suite then finds on the container", () => {
  const shipped = readFileSync(join(WEB_DIR, "compose.yaml"), "utf8");
  for (const line of [
    "read_only: true",
    "cap_drop: [ALL]",
    "no-new-privileges:true",
    "mem_limit: 256m",
    "cpus: 1.0",
    "pids_limit: 128",
    "127.0.0.1:${ATELIER_HOST_PORT:-3008}:3000",
  ])
    assert.ok(shipped.includes(line), `web/compose.yaml lost: ${line}`);
});

test("the container carries the hardening and the limits of the shipped compose file", () => {
  const info = inspect();
  assert.equal(info.Config.User, "node", "from the Dockerfile");
  assert.equal(info.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(info.HostConfig.CapDrop, ["ALL"]);
  assert.ok(info.HostConfig.SecurityOpt.includes("no-new-privileges:true"));
  assert.equal(info.HostConfig.Memory, 256 * 1024 * 1024);
  assert.equal(info.HostConfig.NanoCpus, 1_000_000_000);
  assert.equal(info.HostConfig.PidsLimit, 128);
  assert.ok(Object.keys(info.HostConfig.Tmpfs || {}).includes("/tmp"));
  assert.equal(info.HostConfig.RestartPolicy.Name, "unless-stopped");
  const who = spawnSync("docker", ["exec", container, "id", "-u"], { encoding: "utf8" });
  assert.notEqual(who.stdout.trim(), "0");
});

test("the fixed container side values win, so the port mapping and data directory always match", () => {
  const info = inspect();
  const env = Object.fromEntries(info.Config.Env.map((entry) => entry.split(/=(.*)/s).slice(0, 2)));
  assert.equal(env.PORT, "3000");
  assert.equal(env.HOST, "0.0.0.0");
  assert.equal(env.ATELIER_DATA_DIR, "/app/data");
  const ports = info.NetworkSettings.Ports["3000/tcp"];
  assert.equal(ports.length, 1);
  assert.equal(ports[0].HostIp, "127.0.0.1", "published on loopback only");
  assert.equal(`http://127.0.0.1:${ports[0].HostPort}`, baseUrl);
});

test("the image's own HEALTHCHECK is the one that reports the container healthy", async () => {
  const info = inspect();
  assert.deepEqual(info.Config.Healthcheck.Test, ["CMD", "node", "healthcheck.mjs"]);
  const image = inspect(info.Image);
  assert.deepEqual(image.Config.Healthcheck.Test, ["CMD", "node", "healthcheck.mjs"]);
  assert.equal(image.Config.Healthcheck.Interval, 30_000_000_000);
  // The first probe runs after the 30 s interval, so give it room instead of probing sooner.
  await eventually(() => inspect().State.Health.Status === "healthy", {
    timeout: 120000,
    label: "container health status healthy",
  });
});

test("the state directory is writable and the image filesystem is not", () => {
  const write = spawnSync(
    "docker",
    ["exec", container, "sh", "-c", "touch /app/data/.probe && rm /app/data/.probe"],
    { encoding: "utf8" },
  );
  assert.equal(write.status, 0, write.stderr);
  const root = spawnSync("docker", ["exec", container, "sh", "-c", "touch /app/forbidden"], {
    encoding: "utf8",
  });
  assert.notEqual(root.status, 0, "the image filesystem is read-only");
});
