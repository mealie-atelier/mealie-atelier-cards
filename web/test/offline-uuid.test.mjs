import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const source = readFileSync(new URL("../public/offline-client.js", import.meta.url), "utf8");
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// The web app on a home network is often plain http://, where crypto.randomUUID() is missing.
function uuidV4With(crypto) {
  const body = /export function uuidV4\(\) \{[\s\S]*?\n\}/.exec(source)[0].replace("export ", "");
  return vm.runInNewContext(`${body}; uuidV4`, { crypto, Uint8Array, Array })();
}

test("offline ids are version 4 UUIDs without crypto.randomUUID", () => {
  const insecure = { getRandomValues: (array) => webcrypto.getRandomValues(array) };
  const ids = new Set(Array.from({ length: 50 }, () => uuidV4With(insecure)));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, V4);
});

test("enqueue takes its id from uuidV4, never from crypto.randomUUID directly", () => {
  const enqueue = /async enqueue\([\s\S]*?\n  \}/.exec(source)[0];
  assert.match(enqueue, /const id = uuidV4\(\);/);
  assert.doesNotMatch(
    source.replace(/\/\*\* A version 4 UUID[\s\S]*?export function uuidV4[\s\S]*?\n\}/, ""),
    /randomUUID/,
  );
});
