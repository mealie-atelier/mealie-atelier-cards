import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { loadCards, makeCard } from "./support/card-harness.mjs";

// Over plain http:// browsers expose crypto.getRandomValues() but not crypto.randomUUID().
const insecureCrypto = { getRandomValues: (array) => webcrypto.getRandomValues(array) };

async function startTimer(globals) {
  const cards = loadCards({ globals });
  const card = makeCard(cards);
  const created = [];
  card._modal = "cook";
  card._render = () => {};
  card._flash = () => {};
  card._hass = { callWS: async () => ({}) };
  card._ws = async (op, payload) => {
    if (op === "alarm_create") created.push(payload.timer.id);
    return {};
  };
  const input = { value: "1" };
  const label = { value: "Ofen" };
  const live = { textContent: "" };
  card.shadowRoot.querySelector = (s) =>
    s === "[data-timer-minutes]"
      ? input
      : s === "[data-timer-label]"
        ? label
        : s === "[data-timer-announce]"
          ? live
          : null;
  const button = { dataset: { action: "timer-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  return { card, created };
}

test("a timer starts without crypto.randomUUID, as on a dashboard opened over http://", async () => {
  const { card, created } = await startTimer({ crypto: insecureCrypto });
  assert.equal(card._timers.length, 1, "the timer is running");
  assert.equal(card._timers[0].label, "Ofen");
  assert.match(
    card._timers[0].id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    "a version 4 UUID, like randomUUID() returns",
  );
  assert.deepEqual(created, [card._timers[0].id], "the Bridge alarm gets the same id");
});

test("randomUUID is still used where the browser offers it", async () => {
  const { card } = await startTimer({
    crypto: { ...insecureCrypto, randomUUID: () => "00000000-0000-4000-8000-000000000001" },
  });
  assert.equal(card._timers[0].id, "00000000-0000-4000-8000-000000000001");
});

test("the offline queue takes operations without crypto.randomUUID", () => {
  const cards = loadCards({ globals: { crypto: insecureCrypto } });
  const card = makeCard(cards);
  const ops = [];
  assert.equal(card._offlinePush(ops, "shopping_add", { note: "Milch" }, "Milch"), true);
  assert.match(ops[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
