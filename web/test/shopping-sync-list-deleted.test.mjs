import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BringClient } from "../bring-client.mjs";
import { BringDestination, SyncManager, SyncStore } from "../shopping-sync.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

test("Send now right after the Bring! list was deleted reports a missing list, not unreachable", async () => {
  const bring = await startFakeBring();
  const dir = await mkdtemp(join(tmpdir(), "atelier-deleted-"));
  const source = {
    lists: async () => [{ id: "list-a", name: "Einkauf" }],
    items: async () => [
      {
        id: "a",
        shoppingListId: "list-a",
        checked: false,
        quantity: 1,
        unit: null,
        food: { id: "f", name: "Milch" },
        note: "",
        display: "",
      },
    ],
    item: async () => ({}),
    setChecked: async () => {},
  };
  const client = new BringClient({
    email: FAKE_EMAIL,
    password: FAKE_PASSWORD,
    base: bring.base,
    apiKey: FAKE_API_KEY,
    retryDelayMs: 0,
  });
  // A long cache keeps the deleted list visible, like the real 30 second window.
  const manager = new SyncManager({
    store: new SyncStore({ dir }),
    source,
    destination: new BringDestination(client, { cacheMs: 60000 }),
    language: () => "de",
    timers: { set: () => () => {} },
  });
  try {
    await manager.start();
    const list = bring.state.lists[0];
    const rule = await manager.saveRule({
      source_list_id: "list-a",
      destination_entity_id: `bring:${list.listUuid}`,
      mode: "copy",
    });
    await manager.describe(rule.destination_entity_id);
    bring.state.lists = bring.state.lists.filter((row) => row !== list);
    const result = await manager.run(rule.id, "manual", { confirmFirstBatch: true });
    assert.equal(result.outcome, "destination_missing");
  } finally {
    await manager.stop?.();
    await bring.close?.();
  }
});
