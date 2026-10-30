// Docker route only: the container itself is hardened and reachable on the published host port.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { baseUrl } from "../lib/config.mjs";

const container = "atelier-web-e2e-atelier-1";
const inspect = () => {
  const run = spawnSync("docker", ["inspect", container], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout)[0];
};

test("ATELIER_HOST_PORT publishes the app on loopback only", () => {
  const ports = inspect().NetworkSettings.Ports["3000/tcp"];
  assert.equal(ports.length, 1);
  assert.equal(ports[0].HostIp, "127.0.0.1");
  assert.equal(`http://127.0.0.1:${ports[0].HostPort}`, baseUrl);
});

test("the container runs as a non-root user with a read-only root and no capabilities", () => {
  const info = inspect();
  assert.equal(info.Config.User, "node");
  assert.equal(info.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(info.HostConfig.CapDrop, ["ALL"]);
  assert.ok(info.HostConfig.SecurityOpt.includes("no-new-privileges:true"));
  const who = spawnSync("docker", ["exec", container, "id", "-u"], { encoding: "utf8" });
  assert.notEqual(who.stdout.trim(), "0");
});

test("the container health check reports healthy and the state directory is writable", () => {
  assert.equal(inspect().State.Health.Status, "healthy");
  const write = spawnSync(
    "docker",
    ["exec", container, "sh", "-c", "touch /app/data/.probe && rm /app/data/.probe"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(write.status, 0, write.stderr);
  const root = spawnSync("docker", ["exec", container, "sh", "-c", "touch /app/forbidden"], {
    encoding: "utf8",
  });
  assert.notEqual(root.status, 0, "the image filesystem is read-only");
});
