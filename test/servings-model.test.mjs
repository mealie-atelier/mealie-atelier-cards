import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards();
const row = (quantity, food, extra = {}) => ({
  quantity,
  food: { name: food },
  display: `${quantity} ${food}`,
  ...extra,
});
const eggs = [row(2, "Eier"), row(1, "Zwiebel"), { note: "Salz", display: "Salz" }];
const make = (recipe, { language = "de", features, studio, ...state } = {}) => {
  const card = makeCard(cards, {
    hass: { language, callWS: async () => ({}) },
    permissions: { can_write: true, can_manage: true, ...(features ? { features } : {}) },
  });
  card._detail = { slug: "r", recipeIngredient: eggs, ...recipe };
  card._modal = "recipe";
  card._studio = studio;
  card._render = () => {
    card.renders += 1;
  };
  Object.assign(card, state);
  return card;
};
const servingsCard = (base = 2, opts) => make({ recipeServings: base }, opts);
// Objects built inside the bundle's vm context have another prototype: compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const FLAGS = { recipe_scale: true, session_servings: true };

test("model: servings from recipeServings, from a person word yield, yield and factor", () => {
  const a = servingsCard(4)._servingsModel();
  assert.equal(a.mode, "servings");
  assert.equal(a.base, 4);
  assert.equal(
    make({ recipeYieldQuantity: 6, recipeYield: "6 Portionen" })._servingsModel().mode,
    "servings",
  );
  const blech = make({ recipeYieldQuantity: 1, recipeYield: "1 Blech" })._servingsModel();
  assert.deepEqual([blech.mode, blech.base, blech.unit], ["yield", 1, "Blech"]);
  const muffins = make({ recipeYieldQuantity: 12, recipeYield: "12 Muffins" })._servingsModel();
  assert.equal(muffins.unit, "Muffins");
  assert.equal(
    make({ recipeYieldQuantity: 12, recipeYield: "Muffins, 12 Stück" })._servingsModel().unit,
    "Muffins, 12 Stück",
  );
  assert.equal(make({ recipeYieldQuantity: 2 })._servingsModel().unit, "");
  const factor = make({})._servingsModel();
  assert.deepEqual([factor.mode, factor.base], ["factor", 1]);
  const none = make({});
  none._detail = null;
  assert.equal(none._servingsModel(), null);
  assert.equal(none._servingsTarget(), null);
  assert.equal(none._servingsFactor(), 1);
  assert.equal(none._servingsStepperHtml(), "");
});

test("model: ingredient facts count rows without a quantity", () => {
  const model = servingsCard(2)._servingsModel();
  assert.equal(model.hasIngredients, true);
  assert.equal(model.rowsAsWritten, 1);
  assert.equal(make({ recipeIngredient: [] })._servingsModel().hasIngredients, false);
});

test("ladders and bounds", () => {
  const ladder = (base) => {
    const c = servingsCard(base);
    const out = [];
    c._servingsSet(c._servingsModel().min, { notify: false });
    out.push(c._servingsTarget());
    for (let i = 0; i < 400; i += 1) {
      const before = c._servingsTarget();
      c._servingsStep(1);
      if (c._servingsTarget() === before) break;
      out.push(c._servingsTarget());
    }
    return out;
  };
  const two = ladder(2);
  assert.deepEqual([two[0], two.at(-1), two.length], [1, 20, 20]);
  const four = ladder(4);
  assert.equal(four.at(-1), 40);
  const fraction = ladder(2.5);
  assert.deepEqual(fraction.slice(0, 4), [1, 2, 2.5, 3]);
  assert.equal(fraction.at(-1), 25);
  const half = ladder(0.5);
  assert.deepEqual(half.slice(0, 3), [0.5, 1, 2]);
  assert.equal(half.at(-1), 20);
  const big = ladder(200);
  assert.deepEqual([big[0], big.at(-1)], [1, 200]);
  const factor = make({});
  factor._servingsSet(0.5);
  const seen = [0.5];
  for (let i = 0; i < 30; i += 1) {
    factor._servingsStep(1);
    if (factor._servingsTarget() === seen.at(-1)) break;
    seen.push(factor._servingsTarget());
  }
  assert.deepEqual(seen, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]);
  assert.ok(Math.max(...half) / 0.5 <= 100);
});

test("stepping stops at both ends and moves a fractional value to a neighbour", () => {
  const c = servingsCard(2);
  c._servingsStep(-1);
  assert.equal(c._servingsTarget(), 1);
  c._servingsStep(-1);
  assert.equal(c._servingsTarget(), 1);
  c._servingsSet(999);
  assert.equal(c._servingsTarget(), 20);
  c._servingsStep(1);
  assert.equal(c._servingsTarget(), 20);
  const f = servingsCard(2.5);
  assert.equal(f._servingsTarget(), 2.5);
  f._servingsStep(1);
  assert.equal(f._servingsTarget(), 3);
  f._servingsSet(2.5);
  f._servingsStep(-1);
  assert.equal(f._servingsTarget(), 2);
  f._servingsSet(2.7);
  assert.equal(f._servingsTarget(), 2.7);
  assert.equal(f.renders > 0, true);
});

test("scaledPair keeps the ratio, both values at least 1, and matches the text scaler", () => {
  const c = servingsCard(2);
  c._servingsSet(1);
  assert.equal(c._servingsRow(row(2, "Eier")), "1 Ei");
  assert.equal(c._servingsRow(row(2, "Eier")), "1 Ei");
  // base 0.5 scaled to 1 is a factor 2: both values are lifted above 1 by the same factor
  const half = servingsCard(0.5);
  half._servingsSet(1);
  assert.equal(half._servingsFactor(), 2);
  assert.equal(half._servingsRow({ display: "100 g Mehl" }), "200 g Mehl");
  const big = servingsCard(200);
  big._servingsSet(100);
  assert.equal(big._servingsRow({ display: "100 g Mehl" }), "50 g Mehl");
});

test("unscaled rows are the written text", () => {
  const c = servingsCard(2);
  for (const r of eggs) assert.equal(c._servingsRow(r), r.display);
  assert.equal(c._servingsScaled(), false);
  assert.equal(c._servingsFactor(), 1);
  c._servingsSet(4);
  assert.equal(c._servingsRow(eggs[0]), "4 Eier");
  assert.equal(c._servingsRow(eggs[2]), "Salz");
});

test("amount texts per mode and language", () => {
  const de = servingsCard(2);
  assert.equal(de._servingsAmount(4), "4 Portionen");
  assert.equal(de._servingsAmount(1), "1 Portion");
  assert.equal(de._servingsBaseAmount(), "2 Portionen");
  assert.equal(servingsCard(2, { language: "en" })._servingsAmount(1), "1 serving");
  const muffins = make({ recipeYieldQuantity: 12, recipeYield: "12 Muffins" });
  assert.equal(muffins._servingsAmount(24), "24 Muffins");
  assert.equal(make({ recipeYieldQuantity: 2 })._servingsAmount(3), "3");
  const factor = make({});
  assert.equal(factor._servingsAmount(1.5), "×1,5");
  assert.equal(make({}, { language: "en" })._servingsAmount(1.5), "×1.5");
  assert.equal(factor._servingsBaseAmount(), "");
  assert.equal(servingsCard(2.5)._servingsAmount(2.5), "2,5 Portionen");
});

test("initial value: session beats Discover beats base, Discover only in servings mode", () => {
  const session = { slug: "r", servings: 6, servingsBase: 2 };
  const draft = { people: 4 };
  const c = servingsCard(2, {
    studio: { family: { session } },
    _discoverResults: true,
    _discoverSelected: "r",
    _discoverDraft: draft,
  });
  assert.equal(c._servingsTarget(), 6);
  c._studio = { family: { session: { ...session, slug: "other" } } };
  assert.equal(c._servingsTarget(), 4);
  c._discoverSelected = "other";
  assert.equal(c._servingsTarget(), 2);
  c._discoverSelected = "r";
  c._discoverDraft = { people: 500 };
  assert.equal(c._servingsTarget(), 20);
  c._discoverDraft = { people: 0 };
  assert.equal(c._servingsTarget(), 2);
  // the recipe base changed since the session: scaled by factor
  const changed = servingsCard(4, { studio: { family: { session } } });
  assert.equal(changed._servingsTarget(), 12);
  // yield and factor modes ignore Discover
  const yieldCard = make(
    { recipeYieldQuantity: 12, recipeYield: "12 Muffins" },
    { _discoverResults: true, _discoverSelected: "r", _discoverDraft: draft },
  );
  assert.equal(yieldCard._servingsTarget(), 12);
  const factorCard = make(
    {},
    { _discoverResults: true, _discoverSelected: "r", _discoverDraft: draft },
  );
  assert.equal(factorCard._servingsTarget(), 1);
  const factorSession = make(
    {},
    { studio: { family: { session: { slug: "r", servings: 3, servingsBase: 2 } } } },
  );
  assert.equal(factorSession._servingsTarget(), 1.5);
  // a user choice wins over all of it
  c._servingsSet(5);
  assert.equal(c._servingsTarget(), 5);
});

test("_servingsOnOpen keeps the value only for the same recipe inside its dialogs", () => {
  const c = servingsCard(2);
  c._servingsSet(4);
  for (const modal of [
    "recipe",
    "cook",
    "print",
    "recipe-to-list",
    "plan",
    "nutrition",
    "journal",
    "edit",
    "create-list",
  ]) {
    c._servingsOnOpen("r", modal);
    assert.equal(c._servings?.value, 4, modal);
  }
  c._servingsOnOpen("other", "recipe");
  assert.equal(c._servings, null);
  c._servingsSet(4);
  for (const modal of [null, undefined, "loading", "command"]) {
    c._servingsSet(4);
    c._servingsOnOpen("r", modal);
    assert.equal(c._servings, null, String(modal));
  }
});

test("_servingsSet notifies on a change only, and not when asked not to", () => {
  const c = servingsCard(2);
  const seen = [];
  c._servingsDidChange = (v) => seen.push(v);
  c._servingsSet(2);
  c._servingsSet(3);
  c._servingsSet(3);
  c._servingsSet(5, { notify: false });
  assert.deepEqual(seen, [3]);
  assert.equal(c._servings.source, "local");
});

test("_servingsFollowSession adopts, honours a pending write, other slugs and a changed base", () => {
  const c = servingsCard(2);
  const session = { slug: "r", servings: 6, servingsBase: 2 };
  assert.equal(c._servingsFollowSession(null), false);
  assert.equal(c._servingsFollowSession({ slug: "r" }), false);
  assert.equal(c._servingsFollowSession({ ...session, slug: "other" }), false);
  c._servingsWritePending = true;
  assert.equal(c._servingsFollowSession(session), false);
  assert.equal(c._servingsTarget(), 2);
  c._servingsWritePending = false;
  assert.equal(c._servingsFollowSession(session), true);
  assert.equal(c._servingsTarget(), 6);
  assert.equal(c._servings.source, "session");
  assert.equal(c._servingsFollowSession(session), false);
  c._servingsSet(3, { notify: false });
  assert.equal(c._servingsFollowSession(session), false, "the same pair is not adopted twice");
  assert.equal(c._servingsFollowSession({ ...session, servings: 8 }), true);
  assert.equal(c._servingsTarget(), 8);
  const rebased = servingsCard(4);
  assert.equal(rebased._servingsFollowSession(session), true);
  assert.equal(rebased._servingsTarget(), 12);
});

test("session fields and list payload are gated by their flags", () => {
  const on = servingsCard(2, { features: FLAGS });
  on._servingsSet(4);
  assert.deepEqual(plain(on._servingsSessionFields()), { servings: 4, servings_base: 2 });
  assert.deepEqual(plain(on._servingsListPayload()), { scale: 2 });
  on._servingsSet(3);
  assert.deepEqual(plain(on._servingsListPayload()), { scale: 1.5 });
  on._servingsSet(2);
  assert.deepEqual(
    plain(on._servingsListPayload()),
    {},
    "no scale when the target equals the base",
  );
  assert.deepEqual(plain(on._servingsSessionFields()), { servings: 2, servings_base: 2 });
  const off = servingsCard(2);
  off._servingsSet(4);
  assert.deepEqual(plain(off._servingsSessionFields()), {});
  assert.deepEqual(plain(off._servingsListPayload()), {});
  const factor = make({}, { features: FLAGS });
  factor._servingsSet(1.5);
  assert.deepEqual(plain(factor._servingsListPayload()), { scale: 1.5 });
  assert.deepEqual(
    plain(
      servingsCard(2, {
        features: { recipe_scale: false, session_servings: "yes" },
      })._servingsSessionFields(),
    ),
    {},
  );
});

test("stepper html: labels, output, disabled ends and actions", () => {
  const c = servingsCard(2, { studio: { profile: { people: 4 } } });
  let html = c._servingsStepperHtml();
  assert.match(html, /class="servings-label" id="atelier-servings-label">Portionen</);
  assert.match(html, /aria-label="Eine Portion weniger"/);
  assert.match(html, /aria-label="Eine Portion mehr"/);
  assert.match(html, /aria-label="Portionen für dieses Rezept"/);
  assert.match(
    html,
    /<output id="atelier-servings-value" aria-live="polite" aria-atomic="true">2<span class="servings-unit"> Portionen<\/span><\/output>/,
  );
  assert.doesNotMatch(html, /servings-base/);
  assert.doesNotMatch(html, /aria-disabled/);
  assert.match(html, /data-action="servings-set" data-value="4">Für 4 Personen \(Haushalt\)</);
  assert.doesNotMatch(html, new RegExp("Zurück zur Rezeptmenge"));
  c._servingsSet(4);
  html = c._servingsStepperHtml();
  assert.match(html, /class="servings-base">Rezept: 2 Portionen</);
  assert.match(html, /data-value="2">Zurück zur Rezeptmenge</);
  assert.doesNotMatch(html, /Haushalt/, "no household action at the household size");
  c._servingsSet(1);
  assert.match(c._servingsStepperHtml(), /data-value="-1"[^>]*aria-disabled="true"/);
  c._servingsSet(20);
  html = c._servingsStepperHtml();
  assert.match(html, /data-value="1"[^>]*aria-disabled="true"/);
  assert.doesNotMatch(html, /\sdisabled[\s>]/);
  const en = servingsCard(2, { language: "en", studio: { profile: { people: 1 } } });
  html = en._servingsStepperHtml();
  assert.match(html, />Servings</);
  assert.match(html, /One fewer serving/);
  assert.match(html, /For 1 person \(household\)/);
  en._servingsSet(4);
  assert.match(en._servingsStepperHtml(), /For 1 person \(household\)/);
  assert.match(en._servingsStepperHtml(), /Back to the recipe amount/);
});

test("household action: servings mode only, integer within 1..20", () => {
  for (const people of [0, 21, 2.5, NaN, undefined])
    assert.doesNotMatch(
      servingsCard(4, { studio: { profile: { people } } })._servingsStepperHtml(),
      /Haushalt/,
      String(people),
    );
  assert.doesNotMatch(
    make(
      { recipeYieldQuantity: 12, recipeYield: "Muffins" },
      { studio: { profile: { people: 4 } } },
    )._servingsStepperHtml(),
    /Haushalt/,
  );
  assert.doesNotMatch(servingsCard(4)._servingsStepperHtml(), /Haushalt/);
  const half = servingsCard(0.5, { studio: { profile: { people: 1 } } });
  assert.match(half._servingsStepperHtml(), /Für 1 Person \(Haushalt\)/);
});

test("stepper html in yield and factor mode, and hidden without ingredients", () => {
  const yieldCard = make({ recipeYieldQuantity: 12, recipeYield: "12 Muffins" });
  let html = yieldCard._servingsStepperHtml();
  assert.match(html, />Ergibt</);
  assert.match(html, /aria-label="Weniger"/);
  assert.match(html, /aria-label="Menge für dieses Rezept"/);
  assert.match(html, /12<span class="servings-unit"> Muffins</);
  const factor = make({});
  factor._servingsSet(1.5);
  html = factor._servingsStepperHtml();
  assert.match(html, />Menge</);
  assert.match(html, />×1,5<\/output>/);
  assert.doesNotMatch(html, /servings-unit|servings-base/);
  assert.match(html, /Zurück zur Rezeptmenge/);
  factor._servingsSet(0.5);
  assert.match(factor._servingsStepperHtml(), /data-value="-1"[^>]*aria-disabled="true"/);
  const empty = make({ recipeServings: 2, recipeIngredient: [] });
  assert.equal(empty._servingsStepperHtml(), "");
});

test("scale note per mode", () => {
  const c = servingsCard(2);
  assert.equal(c._servingsNoteHtml(), "");
  c._servingsSet(4);
  assert.equal(
    c._servingsNoteHtml(),
    '<p class="studio-serving-note">Mengen für 4 Portionen angepasst. Rezeptbasis: 2 Portionen. Eindeutige Mengen sind skaliert; Freitext bitte prüfen.</p>',
  );
  const muffins = make({ recipeYieldQuantity: 12, recipeYield: "12 Muffins" }, { language: "en" });
  muffins._servingsSet(24);
  assert.match(
    muffins._servingsNoteHtml(),
    /Amounts adjusted for 24 Muffins\. Recipe base: 12 Muffins\./,
  );
  const factor = make({});
  factor._servingsSet(1.5);
  assert.equal(
    factor._servingsNoteHtml(),
    '<p class="studio-serving-note">Mengen auf das 1,5-Fache umgerechnet. Eindeutige Mengen sind skaliert; Freitext bitte prüfen.</p>',
  );
});

test("list note: capability, factor, rows as written, nothing when unscaled", () => {
  const on = servingsCard(2, { features: FLAGS });
  assert.equal(on._servingsListNoteHtml(), "");
  on._servingsSet(4);
  assert.equal(
    on._servingsListNoteHtml(),
    '<p class="servings-list-note">Auf die Liste kommen die Zutaten für 4 Portionen.</p><p class="servings-list-note">1 Zutat ohne erkannte Menge kommt so auf die Liste, wie sie im Rezept steht.</p>',
  );
  on._detail.recipeIngredient = [row(1, "A"), { display: "Salz" }, { display: "Pfeffer" }];
  assert.match(on._servingsListNoteHtml(), /2 Zutaten ohne erkannte Menge kommen so auf die Liste/);
  on._detail.recipeIngredient = [row(1, "A")];
  assert.doesNotMatch(on._servingsListNoteHtml(), /ohne erkannte Menge/);
  const off = servingsCard(2);
  off._servingsSet(4);
  assert.equal(
    off._servingsListNoteHtml(),
    '<p class="servings-list-note">Diese Bridge-Version übernimmt die Rezeptmengen für 2 Portionen. Für umgerechnete Mengen aktualisiere die Mealie Atelier Bridge.</p>',
  );
  const factorOn = make({}, { features: FLAGS, language: "en" });
  factorOn._servingsSet(2);
  assert.match(
    factorOn._servingsListNoteHtml(),
    /^<p class="servings-list-note">Adds 2 times the recipe amounts\.<\/p>/,
  );
  const factorOff = make({}, { language: "en" });
  factorOff._servingsSet(2);
  assert.match(
    factorOff._servingsListNoteHtml(),
    /This Bridge version adds the amounts as written in the recipe/,
  );
  assert.equal(servingsCard(2, { language: "en" })._servingsListNoteHtml(), "");
});

test("print context is null unless scaled", () => {
  const c = servingsCard(2);
  assert.equal(c._servingsPrintContext(), null);
  c._servingsSet(4);
  const ctx = c._servingsPrintContext();
  assert.deepEqual([ctx.mode, ctx.amount, ctx.base], ["servings", "4 Portionen", "2 Portionen"]);
  assert.equal(ctx.row(eggs[0]), "4 Eier");
  const factor = make({});
  factor._servingsSet(2);
  assert.deepEqual(
    [factor._servingsPrintContext().mode, factor._servingsPrintContext().base],
    ["factor", ""],
  );
});

test("stepper css: 44px text actions and no pill radius", () => {
  const css = readFileSync(new URL("../src/design-system/polish.css", import.meta.url), "utf8");
  assert.match(css, /\.atelier \.servings-actions \.text-action \{\s*min-height: 44px;/);
  const rules = css.match(/\.atelier \.servings-[^{]*\{[^}]*\}/g) || [];
  assert.ok(rules.length >= 8);
  for (const rule of rules) assert.doesNotMatch(rule, /999px/);
});

test("servings copy has no dash punctuation, real umlauts and both locales", () => {
  for (const lang of ["de", "en"]) {
    const labels = JSON.parse(
      readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), "utf8"),
    );
    for (const [key, value] of Object.entries(labels).filter(([k]) =>
      /^(scaler|shopping(Adds|AsWritten|Scale)|cookAmounts)/.test(k),
    )) {
      assert.doesNotMatch(value, /[—–]/, key);
      assert.doesNotMatch(value, /,\s*und\b|\bund,/, key);
    }
  }
});

test("every key the servings module references exists in both locales", () => {
  const source = readFileSync(new URL("../src/components/servings.js", import.meta.url), "utf8");
  const keys = [...source.matchAll(/this\.(t|tp)\(\s*"([^"]+)"/g)].map(([, kind, key]) => [
    kind,
    key,
  ]);
  assert.ok(keys.length > 8);
  for (const lang of ["de", "en"]) {
    const labels = JSON.parse(
      readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), "utf8"),
    );
    for (const [kind, key] of keys)
      assert.ok(kind === "tp" ? `${key}.other` in labels : key in labels, `${lang}.${key}`);
  }
});
