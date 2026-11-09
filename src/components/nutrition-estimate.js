/**
 * Pure client helpers for the nutrition dialog: German ingredient name to a USDA search term,
 * result ordering, and a gram estimate for household units. No DOM, no network.
 * The build inlines this file ahead of the component methods, so keep it dependency free.
 */

// Lowercase, no diacritics, and ß as ss, so "Käse", "kase" and "KÄSE" meet.
function nutriNorm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function nutriTokens(value) {
  return nutriNorm(value).match(/[a-z]+/g) || [];
}

// Strip one German plural or case ending. Applied to dictionary keys and input alike,
// so both sides land on the same stem.
function nutriStem(token) {
  for (const suffix of ["ern", "en", "er", "es", "em", "n", "e"]) {
    if (token.length - suffix.length >= 2 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

const NUTRI_NOISE = /^(bio|frisch(?:e[rnsm]?)?|klein\w*|gross\w*|mittel\w*|reif\w*|ganz\w*)$/;

function nutriStems(value) {
  return nutriTokens(value)
    .filter((token) => !NUTRI_NOISE.test(token))
    .map(nutriStem);
}

function nutriIndex(entries) {
  const map = new Map();
  let longest = 1;
  for (const [key, value] of Object.entries(entries)) {
    const stems = nutriStems(key);
    longest = Math.max(longest, stems.length);
    map.set(stems.join(" "), value);
  }
  return { map, longest };
}

// Longest phrase wins, then the earliest one. Words are matched whole: compounds need their own key.
function nutriFind(index, stems, onlyFirst = false) {
  for (let size = Math.min(index.longest, stems.length); size >= 1; size--) {
    const last = onlyFirst ? 0 : stems.length - size;
    for (let at = 0; at <= last; at++) {
      const hit = index.map.get(stems.slice(at, at + size).join(" "));
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

const NUTRI_TERMS = nutriIndex({
  // dairy and eggs
  milch: "milk, whole",
  vollmilch: "milk, whole",
  "fettarme milch": "milk, reduced fat",
  buttermilch: "milk, buttermilk, fluid, cultured, lowfat",
  sahne: "cream, fluid, heavy whipping",
  schlagsahne: "cream, fluid, heavy whipping",
  "saure sahne": "cream, sour, cultured",
  schmand: "cream, sour, cultured",
  sauerrahm: "cream, sour, cultured",
  joghurt: "yogurt, plain, whole milk",
  quark: "cheese, cottage, lowfat",
  butter: "butter, salted",
  kase: "cheese, cheddar",
  gouda: "cheese, gouda",
  parmesan: "cheese, parmesan, grated",
  mozzarella: "cheese, mozzarella, whole milk",
  feta: "cheese, feta",
  frischkäse: "cheese, cream",
  mascarpone: "cheese, cream",
  ricotta: "cheese, ricotta, whole milk",
  ei: "egg, whole, raw, fresh",
  eigelb: "egg, yolk, raw, fresh",
  eiweiss: "egg, white, raw, fresh",
  // flours, baking, bread
  mehl: "wheat flour, white, all-purpose, enriched",
  weizenmehl: "wheat flour, white, all-purpose, enriched",
  vollkornmehl: "wheat flour, whole-grain",
  roggenmehl: "rye flour, medium",
  maisstarke: "cornstarch",
  speisestarke: "cornstarch",
  haferflocken: "oats",
  backpulver: "leavening agents, baking powder, double-acting",
  natron: "leavening agents, baking soda",
  hefe: "leavening agents, yeast, baker's, active dry",
  semmelbrosel: "bread crumbs, dry, grated, plain",
  paniermehl: "bread crumbs, dry, grated, plain",
  brot: "bread, white, commercially prepared",
  // sugars, sweet
  zucker: "sugars, granulated",
  puderzucker: "sugars, powdered",
  vanillezucker: "sugars, granulated",
  vanillinzucker: "sugars, granulated",
  "brauner zucker": "sugars, brown",
  honig: "honey",
  ahornsirup: "syrup, maple",
  kakao: "cocoa, dry powder, unsweetened",
  schokolade: "chocolate, dark",
  // salt, spices, condiments
  salz: "salt, table",
  pfeffer: "spices, pepper, black",
  paprikapulver: "spices, paprika",
  zimt: "spices, cinnamon, ground",
  kurkuma: "spices, turmeric, ground",
  kreuzkummel: "spices, cumin seed",
  kummel: "spices, cumin seed",
  muskat: "spices, nutmeg, ground",
  oregano: "spices, oregano, dried",
  thymian: "spices, thyme, dried",
  curry: "spices, curry powder",
  currypulver: "spices, curry powder",
  vanilleextrakt: "vanilla extract",
  senf: "mustard, prepared, yellow",
  essig: "vinegar, distilled",
  sojasauce: "soy sauce made from soy and wheat (shoyu)",
  sojasosse: "soy sauce made from soy and wheat (shoyu)",
  ketchup: "catsup",
  wasser: "water, tap, drinking",
  // fats and oils
  ol: "oil, vegetable, canola",
  rapsol: "oil, canola",
  olivenol: "oil, olive, salad or cooking",
  sonnenblumenol: "oil, sunflower, linoleic",
  kokosol: "oil, coconut",
  sesamol: "oil, sesame, salad or cooking",
  margarine: "margarine, regular",
  schmalz: "lard",
  // vegetables and herbs
  zwiebel: "onions, raw",
  knoblauch: "garlic, raw",
  knoblauchzehe: "garlic, raw",
  kartoffel: "potatoes, flesh and skin, raw",
  susskartoffel: "sweet potato, raw, unprepared",
  tomate: "tomatoes, red, ripe, raw",
  tomatenmark: "tomato paste, canned",
  karotte: "carrots, raw",
  mohre: "carrots, raw",
  paprika: "peppers, sweet, red, raw",
  gurke: "cucumber, with peel, raw",
  zucchini: "squash, summer, zucchini, includes skin, raw",
  brokkoli: "broccoli, raw",
  blumenkohl: "cauliflower, raw",
  spinat: "spinach, raw",
  salat: "lettuce, green leaf, raw",
  lauch: "leeks, raw",
  porree: "leeks, raw",
  sellerie: "celery, raw",
  champignon: "mushrooms, white, raw",
  champignons: "mushrooms, white, raw",
  pilz: "mushrooms, white, raw",
  kurbis: "squash, winter, butternut, raw",
  mais: "corn, sweet, yellow, raw",
  kohl: "cabbage, raw",
  aubergine: "eggplant, raw",
  ingwer: "ginger root, raw",
  petersilie: "parsley, fresh",
  basilikum: "basil, fresh",
  schnittlauch: "chives, raw",
  dill: "dill weed, fresh",
  // fruit
  apfel: "apples, raw, with skin",
  zitrone: "lemons, raw, without peel",
  zitronensaft: "lemon juice, raw",
  limette: "limes, raw",
  banane: "bananas, raw",
  orange: "oranges, raw",
  birne: "pears, raw",
  erdbeere: "strawberries, raw",
  himbeere: "raspberries, raw",
  blaubeere: "blueberries, raw",
  traube: "grapes, red or green, raw",
  rosine: "raisins, seedless",
  kirsche: "cherries, sweet, raw",
  ananas: "pineapple, raw",
  avocado: "avocados, raw, all commercial varieties",
  kokosmilch: "nuts, coconut milk, canned",
  // meat and fish
  hackfleisch: "beef, ground, raw",
  rinderhack: "beef, ground, raw",
  hähnchen: "chicken, broilers or fryers, breast, meat only, raw",
  hähnchenbrust: "chicken, broilers or fryers, breast, meat only, raw",
  hähnchenbrustfilet: "chicken, broilers or fryers, breast, meat only, raw",
  gemüsebrühe: "soup, vegetable broth",
  hühnerbrühe: "soup, stock, chicken",
  rinderbrühe: "soup, stock, beef",
  speisestärke: "cornstarch",
  rindfleisch: "beef, round, top round, raw",
  schweinefleisch: "pork, fresh, loin, raw",
  hahnchen: "chicken, broilers or fryers, breast, meat only, raw",
  hahnchenbrust: "chicken, broilers or fryers, breast, meat only, raw",
  huhn: "chicken, broilers or fryers, breast, meat only, raw",
  pute: "turkey, breast, meat only, raw",
  lamm: "lamb, leg, raw",
  speck: "pork, cured, bacon, raw",
  schinken: "ham, sliced, regular",
  lachs: "fish, salmon, atlantic, farmed, raw",
  thunfisch: "fish, tuna, light, canned in water",
  kabeljau: "fish, cod, atlantic, raw",
  forelle: "fish, trout, rainbow, farmed, raw",
  garnele: "crustaceans, shrimp, raw",
  // pasta, rice, pulses
  nudel: "pasta, dry, enriched",
  pasta: "pasta, dry, enriched",
  spaghetti: "pasta, dry, enriched",
  reis: "rice, white, long-grain, regular, raw, enriched",
  linse: "lentils, raw",
  kichererbse: "chickpeas, mature seeds, raw",
  erbse: "peas, green, raw",
  bohne: "beans, snap, green, raw",
  kidneybohne: "beans, kidney, red, mature seeds, raw",
  tofu: "tofu, raw, firm",
  // nuts and seeds
  mandel: "nuts, almonds",
  walnuss: "nuts, walnuts, english",
  haselnuss: "nuts, hazelnuts or filberts",
  cashew: "nuts, cashew nuts, raw",
  erdnuss: "peanuts, all types, raw",
  pistazie: "nuts, pistachio nuts, raw",
  sesam: "seeds, sesame seeds, whole, dried",
  sonnenblumenkern: "seeds, sunflower seed kernels, dried",
  leinsamen: "seeds, flaxseed",
});

/**
 * Map a German ingredient name to a descriptive USDA search term.
 * Unknown names and English input come back unchanged.
 */
export function usdaQuery(germanName) {
  const text = String(germanName ?? "");
  return nutriFind(NUTRI_TERMS, nutriStems(text)) ?? text;
}

const NUTRI_RANK = { Foundation: 0, "SR Legacy": 1, Branded: 2 };

/**
 * Foods named after the searched word first, so "milk" leads to milk and not to a ricotta made
 * of whole milk. Inside that Foundation, SR Legacy, Branded. Stable inside each group.
 */
export function sortFoods(foods, query = "") {
  const needle = String(query).trim().toLowerCase();
  const head = needle.split(/[\s,]+/)[0];
  const named = (food) => {
    const name = String(food?.name || "").toLowerCase();
    if (!head || name.startsWith(needle)) return 0;
    return name.startsWith(head) ? 1 : 2;
  };
  const rank = (food) => NUTRI_RANK[food?.data_type] ?? 3;
  return [...(foods || [])].sort((a, b) => named(a) - named(b) || rank(a) - rank(b));
}

const NUTRI_FRACTION = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
const NUTRI_NUMBER = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔]?|[½¼¾⅓⅔])`;
const NUTRI_AMOUNT = new RegExp(
  String.raw`^\s*(${NUTRI_NUMBER})(?:\s*(?:-|–|bis)\s*(${NUTRI_NUMBER}))?`,
  "i",
);

function nutriNumber(raw) {
  const text = raw.trim();
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const glyph = text.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])$/);
  if (glyph) return Number((glyph[1] || "0").replace(",", ".")) + NUTRI_FRACTION[glyph[2]];
  return Number(text.replace(",", "."));
}

// Gram weights and densities. Keys go through the same stemming as the search terms.
const NUTRI_DENSITY = nutriIndex({
  milch: 1.03,
  vollmilch: 1.03,
  sahne: 1.0,
  schlagsahne: 1.0,
  wasser: 1.0,
  ol: 0.92,
  olivenol: 0.92,
  rapsol: 0.92,
  sonnenblumenol: 0.92,
  pflanzenol: 0.92,
  kokosol: 0.92,
  sesamol: 0.92,
});
const NUTRI_SPOON = nutriIndex({
  zucker: 12.5,
  puderzucker: 12.5,
  mehl: 7.8,
  weizenmehl: 7.8,
  salz: 18,
  butter: 14.2,
  ol: 13.6,
  olivenol: 13.6,
  rapsol: 13.6,
  sonnenblumenol: 13.6,
  pflanzenol: 13.6,
  honig: 21,
  milch: 15.3,
  vollmilch: 15.3,
});
const NUTRI_PIECE = nutriIndex({
  ei: 50,
  zwiebel: 110,
  knoblauchzehe: 3,
  kartoffel: 170,
  tomate: 123,
  karotte: 61,
  mohre: 61,
  apfel: 182,
  zitrone: 58,
  banane: 118,
  paprika: 119,
});
const NUTRI_SPOON_DEFAULT = 15;
const NUTRI_PINCH_GRAMS = 0.4;

const NUTRI_WEIGHT_UNITS = { g: 1, gramm: 1, kg: 1000, kilogramm: 1000, mg: 0.001 };
const NUTRI_VOLUME_UNITS = {
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  liter: 1000,
};
const NUTRI_SPOONS = { el: 1, essloffel: 1, tl: 1 / 3, teeloffel: 1 / 3 };
const NUTRI_PINCHES = new Set(["prise", "prisen", "msp", "messerspitze", "messerspitzen"]);

const nutriHas = (table, key) => Object.hasOwn(table, key);
const nutriRound = (value) => Math.round(value * 10) / 10;

/**
 * Estimate grams for a leading amount and unit. Returns {grams, basis} or null.
 * basis.kind is "weight", "volume" (per: g per ml), "spoon" (per: g per spoon, spoon: "EL" or "TL"),
 * "pinch" (per: g per pinch) or "piece" (per: g per piece).
 * Packs, cans, bunches and unknown foods are never guessed.
 */
export function estimateGrams(text, name) {
  const match = String(text ?? "").match(NUTRI_AMOUNT);
  if (!match) return null;
  const amount = nutriNumber(match[2] ?? match[1]);
  if (!(amount > 0)) return null;
  const rest = String(text).slice(match[0].length);
  const restTokens = nutriTokens(rest);
  // Size and freshness words ("große", "Bio") sit before the unit or the food.
  let at = 0;
  while (at < restTokens.length && NUTRI_NOISE.test(restTokens[at])) at++;
  const unit = restTokens[at];
  const foodStems = (after) => {
    const own = nutriStems(name);
    return own.length ? own : restTokens.slice(after).map(nutriStem);
  };
  let result = null;
  if (nutriHas(NUTRI_WEIGHT_UNITS, unit)) {
    result = { grams: amount * NUTRI_WEIGHT_UNITS[unit], basis: { kind: "weight" } };
  } else if (nutriHas(NUTRI_VOLUME_UNITS, unit)) {
    const per = nutriFind(NUTRI_DENSITY, foodStems(at + 1)) ?? 1.0;
    result = { grams: amount * NUTRI_VOLUME_UNITS[unit] * per, basis: { kind: "volume", per } };
  } else if (nutriHas(NUTRI_SPOONS, unit)) {
    const tablespoon = nutriFind(NUTRI_SPOON, foodStems(at + 1)) ?? NUTRI_SPOON_DEFAULT;
    const per = nutriRound(tablespoon * NUTRI_SPOONS[unit]);
    result = {
      grams: amount * tablespoon * NUTRI_SPOONS[unit],
      basis: { kind: "spoon", spoon: NUTRI_SPOONS[unit] === 1 ? "EL" : "TL", per },
    };
  } else if (NUTRI_PINCHES.has(unit)) {
    result = {
      grams: amount * NUTRI_PINCH_GRAMS,
      basis: { kind: "pinch", per: NUTRI_PINCH_GRAMS },
    };
  } else if (unit === "zehe" || unit === "zehen") {
    result = { grams: amount * 3, basis: { kind: "piece", per: 3 } };
  } else {
    // A bare count: the first word is the food ("2 Eier"), or "Stück" followed by it.
    const counted = unit === "stuck" || unit === "stk";
    const stems = restTokens.slice(at + (counted ? 1 : 0)).map(nutriStem);
    const per = nutriFind(NUTRI_PIECE, stems, true);
    if (per !== undefined) result = { grams: amount * per, basis: { kind: "piece", per } };
  }
  if (!result || !(result.grams > 0) || result.grams > 50000) return null;
  return { grams: nutriRound(result.grams), basis: result.basis };
}

/**
 * Prepare one dialog row: English search term, estimated grams and the data for the hint line.
 * A backend gram value is kept when the text states a weight; for volumes, spoons, pinches
 * and counts it was measured in the wrong unit, so the estimate replaces it.
 */
export function prepareNutritionRow(row) {
  const german = String(row.query || "");
  const estimate = estimateGrams(row.text, german);
  const next = { ...row, germanQuery: german, query: usdaQuery(german), estimate: null };
  if (estimate && (row.grams == null || estimate.basis.kind !== "weight")) {
    next.grams = estimate.grams;
    next.estimate = estimate;
  }
  return next;
}
