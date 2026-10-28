import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { OfflineLedger } from "../offline-ledger.mjs";

async function ledger({ item = { checked: false }, mutate } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "atelier-ledger-"));
  return new OfflineLedger({
    dir,
    readItem: async () => item,
    mutate: mutate || (async () => ({ ok: true })),
  });
}
const toggle = (over = {}) => ({
  id: randomUUID(),
  action: "shopping_toggle",
  payload: { item_id: "i1", checked: true, expected_checked: false, ...over },
});
const add = () => ({
  id: randomUUID(),
  action: "shopping_add",
  payload: { list_id: "l1", note: "Milk" },
});

test("an operation id reused with other content maps to offline_op_reused", async () => {
  const l = await ledger();
  const op = toggle();
  await l.process(op);
  const other = { ...op, payload: { ...op.payload, item_id: "i2" } };
  await assert.rejects(l.process(other), { status: 409, atelierCode: "offline_op_reused" });
});

test("a changed item maps to offline_conflict, also when replayed", async () => {
  const l = await ledger({ item: { checked: true } });
  const op = toggle({ checked: false, expected_checked: false });
  await assert.rejects(l.process(op), { status: 409, atelierCode: "offline_conflict" });
  await assert.rejects(l.process(op), { status: 409, atelierCode: "offline_conflict" });
});

test("an add that may have reached Mealie maps to offline_add_uncertain", async () => {
  const l = await ledger({
    mutate: async () => {
      throw Object.assign(new Error("timeout"), { status: 502 });
    },
  });
  const op = add();
  await assert.rejects(l.process(op), { status: 502 });
  await assert.rejects(l.process(op), { status: 409, atelierCode: "offline_add_uncertain" });
});
