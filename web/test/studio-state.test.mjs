import test from "node:test";
import assert from "node:assert/strict";
import { initial, apply } from "../studio-state.mjs";
test("persistent studio operations support pantry, review, helpers, shared steps and timers", () => {
  let s = initial();
  s = apply(s, "pantry_put", { name: "Tomaten", amount: 500, unit: "g", expires: "2026-10-30" });
  assert.equal(s.pantry.length, 1);
  s = apply(s, "profile_set", { people: 3, maxMinutes: 30, diets: ["vegan"], exclude: ["Pilze"] });
  assert.equal(s.profile.people, 3);
  s = apply(s, "journal_set", {
    slug: "tomatensuppe",
    rating: 5,
    note: "Etwas schärfer",
    cooked: true,
    favorite: true,
  });
  assert.ok(s.journal.tomatensuppe.lastCooked);
  s = apply(s, "family_member", { name: "Kind", child: true });
  const memberId = s.family.members[0].id;
  s = apply(s, "session_start", { slug: "tomatensuppe", name: "Tomatensuppe" });
  const id = s.family.session.id;
  assert.throws(
    () =>
      apply(s, "session_task", { session_id: id, memberId, text: "Waschen", adultApproved: false }),
    /adult approval/,
  );
  s = apply(s, "session_task", {
    session_id: id,
    memberId,
    text: "Salat waschen",
    adultApproved: true,
  });
  assert.equal(s.family.session.tasks.length, 1);
  s = apply(s, "session_timer", { session_id: id, minutes: 10, name: "Pasta" });
  assert.equal(s.family.session.timers.length, 1);
  s = apply(s, "session_step", { session_id: id, step: 2 });
  assert.equal(s.family.session.step, 2);
  s = apply(s, "session_end", { session_id: id });
  assert.equal(s.family.session, null);
  assert.throws(
    () => apply(s, "pantry_put", { name: "X", amount: -2, unit: "g" }),
    /Invalid pantry/,
  );
});

test("active cooking sessions require explicit confirmation to replace", () => {
  let s = apply(initial(), "session_start", { slug: "soup", name: "Soup" });
  assert.throws(
    () => apply(s, "session_start", { slug: "pasta", name: "Pasta" }),
    /already active/,
  );
  s = apply(s, "session_start", { slug: "pasta", name: "Pasta", replace_existing: true });
  assert.equal(s.family.session.slug, "pasta");
});
test("Kochinspo profile persists validated recipe discovery preferences", () => {
  let s = initial();
  s = apply(s, "profile_set", {
    people: 4,
    maxMinutes: 35,
    mealStyle: "vegan",
    diets: ["vegan"],
    kidFriendly: true,
    usePantry: false,
    exclude: ["Pilze", "Schärfe"],
    cookbooks: ["vegan", "schnell"],
  });
  assert.deepEqual(s.profile, {
    people: 4,
    maxMinutes: 35,
    diets: ["vegan"],
    mealStyle: "vegan",
    kidFriendly: true,
    usePantry: false,
    exclude: ["Pilze", "Schärfe"],
    cookbooks: ["vegan", "schnell"],
    quietHours: false,
  });
  assert.throws(
    () => apply(s, "profile_set", { people: 2, maxMinutes: 35, mealStyle: "allergy-safe" }),
    /Unsupported meal style/,
  );
  assert.throws(
    () => apply(s, "profile_set", { people: 2, maxMinutes: 35, cookbooks: ["../private"] }),
    /Invalid cookbook selection/,
  );
});
test("removing a family member with outstanding assignments is rejected", () => {
  let s = apply(initial(), "family_member", { name: "Helper", child: false });
  const member = s.family.members[0].id;
  s = apply(s, "session_start", { slug: "pasta", name: "Pasta" });
  const session = s.family.session.id;
  s = apply(s, "session_task", { session_id: session, memberId: member, text: "Set table" });
  assert.throws(
    () => apply(s, "family_member", { id: member, remove: true }),
    /still has cooking tasks/,
  );
});
test("cooking sessions carry an optional validated servings pair", () => {
  let s = apply(initial(), "session_start", { slug: "soup", name: "Soup" });
  assert.equal("servings" in s.family.session, false);
  assert.equal("servingsBase" in s.family.session, false);
  s = apply(s, "session_start", {
    slug: "soup",
    name: "Soup",
    replace_existing: true,
    servings: 6,
    servings_base: 2.5,
  });
  assert.equal(s.family.session.servings, 6);
  assert.equal(s.family.session.servingsBase, 2.5);
  const start = (extra) =>
    apply(initial(), "session_start", { slug: "soup", name: "Soup", ...extra });
  assert.throws(() => start({ servings: 4 }), /Invalid servings/);
  assert.throws(() => start({ servings_base: 4 }), /Invalid servings/);
  for (const v of [0, 0.009, 1000.5, "4", true, Number.NaN, Infinity])
    assert.throws(() => start({ servings: v, servings_base: 2 }), /Invalid servings/);
  assert.equal(start({ servings: 0.01, servings_base: 1000 }).family.session.servings, 0.01);
});
test("session_servings updates the pair, bumps the revision and checks the session", () => {
  let s = apply(initial(), "session_start", { slug: "soup", name: "Soup" });
  const id = s.family.session.id;
  const before = s.family.session.revision;
  const next = apply(s, "session_servings", { session_id: id, servings: 4, servings_base: 2 });
  assert.equal(next.family.session.servings, 4);
  assert.equal(next.family.session.servingsBase, 2);
  assert.equal(next.family.session.revision, before + 1);
  assert.equal(next.revision, s.revision + 1);
  assert.throws(
    () => apply(s, "session_servings", { session_id: "x", servings: 4, servings_base: 2 }),
    /Cooking session changed/,
  );
  assert.throws(
    () => apply(initial(), "session_servings", { session_id: id, servings: 4, servings_base: 2 }),
    /Cooking session changed/,
  );
  assert.throws(
    () => apply(s, "session_servings", { session_id: id, servings: 4 }),
    /Invalid servings/,
  );
  s = apply(next, "session_step", { session_id: id, step: 2 });
  assert.equal(s.family.session.servings, 4, "step keeps the pair");
});
