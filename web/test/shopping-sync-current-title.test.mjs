import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BringClient } from "../bring-client.mjs";
import { BringDestination, SyncManager, SyncStore } from "../shopping-sync.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

const GRAM = { id: "u-g", name: "gram", abbreviation: "g", useAbbreviation: true };
const POTATOES = { id: "f-p", name: "Kartoffeln" };

async function boot(items, { editOnRead = false } = {}) {
  const bring = await startFakeBring();
  const dir = await mkdtemp(join(tmpdir(), "atelier-title-"));
  const timers = { set: () => () => {} };
  const find = (id) => items.find((x) => x.id === id);
  const source = {
    lists: async () => [{ id: "list-a", name: "Einkauf" }],
    items: async () => items.map((x) => ({ ...x })),
    item: async (id) => {
      if (editOnRead) find(id).quantity = 500;
      return { ...find(id) };
    },
    setChecked: async () => {},
  };
  const client = new BringClient({
    email: FAKE_EMAIL,
    password: FAKE_PASSWORD,
    base: bring.base,
    apiKey: FAKE_API_KEY,
    retryDelayMs: 0,
  });
  const manager = new SyncManager({
    store: new SyncStore({ dir }),
    source,
    destination: new BringDestination(client, { cacheMs: 0 }),
    language: () => "de",
    timers,
  });
  await manager.start();
  const list = bring.state.lists[0];
  const rule = await manager.saveRule({
    source_list_id: "list-a",
    destination_entity_id: `bring:${list.listUuid}`,
    mode: editOnRead ? "move" : "copy",
  });
  return { bring, manager, ruleId: rule.id, find, stop: () => manager.stop?.() };
}
const make = () => ({
  id: "a",
  shoppingListId: "list-a",
  checked: false,
  quantity: 300,
  unit: GRAM,
  food: POTATOES,
  note: "",
  display: "",
});

test("a line edited after sending carries the current title in the public record", async () => {
  const items = [make()];
  const env = await boot(items);
  try {
    await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    items[0].quantity = 500;
    await env.manager.run(env.ruleId, "manual");
    const [record] = env.manager.listRecords(env.ruleId, ["changed_after_send"], 10);
    assert.match(record.title, /300/);
    assert.match(record.current_title, /500/);
    assert.doesNotMatch(record.current_title, /300/);
  } finally {
    await env.stop();
    await env.bring.close?.();
  }
});

test("a line edited between send and completion carries the current title", async () => {
  const items = [make()];
  const env = await boot(items, { editOnRead: true });
  try {
    await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    const [record] = env.manager.listRecords(env.ruleId, ["changed_after_send"], 10);
    assert.match(record.current_title, /500/);
  } finally {
    await env.stop();
    await env.bring.close?.();
  }
});
