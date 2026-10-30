import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const familyCard = (extra = {}) => {
  const calls = [];
  const card = makeCard(loadCards(), {
    hass: {
      language: "en",
      callWS: async (msg) => {
        calls.push(msg);
        if (extra.fail && msg.action === extra.fail.action) throw extra.fail.error;
        return { revision: 1, journal: {}, family: { members: [], session: null } };
      },
    },
  });
  card._studio = {
    revision: 0,
    journal: {},
    profile: {},
    pantry: [],
    family: {
      members: [{ id: "m1", name: "Mia" }],
      session: {
        id: "s1",
        slug: "",
        step: 0,
        timers: [],
        tasks: [{ id: "t1", text: "Wash herbs", done: true, memberId: "m1" }],
      },
    },
  };
  card._render = () => {};
  card._studioRefresh = async () => {};
  card._recoverPermissions = async () => {};
  return { card, calls };
};
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
};

test("a helper task has a remove button that sends session_task with remove", async () => {
  const { card, calls } = familyCard();
  assert.match(card._studioFamily(), /data-action="studio-task-remove" data-id="t1"/);
  await click(card, { action: "studio-task-remove", id: "t1" });
  const sent = calls.find((c) => c.action === "session_task");
  assert.equal(JSON.stringify(sent.payload), '{"session_id":"s1","id":"t1","remove":true}');
});

test("the Bridge refusal to remove a person with tasks is shown as translated text", async () => {
  const error = {
    code: "invalid_request",
    message: "This person still has cooking tasks. Remove or finish the tasks first.",
  };
  const { card } = familyCard({ fail: { action: "family_member", error } });
  await card._studioWrite("family_member", { id: "m1", remove: true });
  assert.equal(card._studioError, "This person still has tasks. Remove their tasks first.");
  const german = makeCard(loadCards(), { hass: { language: "de", callWS: async () => ({}) } });
  assert.match(german._studioErrorText(error), /Diese Person hat noch Aufgaben/);
});
