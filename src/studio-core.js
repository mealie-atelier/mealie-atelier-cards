/* Shared, deterministic Kitchen Intelligence. No AI claims, no external calls. */
const AtelierStudio = (() => {
  const clean = (x) =>
    String(x ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9äöüß ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  const stop = new Set(
    "der die das den dem ein eine einer und mit für frisch frische gehackt nach geschmack etwas bei in auf oder von ganze kleinen große kleine paar samt zum zur g kg ml l el tl stueck stück prise".split(
      " ",
    ),
  );
  function words(x) {
    return clean(x)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w))
      .map((w) => w.replace(/(en|ern|e|n|s)$/, ""))
      .filter(Boolean);
  }
  function similarity(a, b) {
    const aa = words(a),
      bb = words(b);
    if (!aa.length || !bb.length) return false;
    return aa.some((x) =>
      bb.some(
        (y) => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))),
      ),
    );
  }
  function ingredient(row) {
    return String(
      row?.display ||
        row?.originalText ||
        [row?.quantity || "", row?.unit?.name || "", row?.food?.name || "", row?.note || ""]
          .filter(Boolean)
          .join(" "),
    ).trim();
  }
  function durationMinutes(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    const source = String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!source.trim()) return null;
    if (/^\d+(?:[.,]\d+)?$/.test(source.trim()))
      return Number(source.trim().replace(",", ".")) || null;
    const unitFactor = (unit) => (/^(h|hr|hrs|hour|hours|stunde|stunden|std)$/.test(unit) ? 60 : 1);
    const token =
      /([0-9]+(?:[.,][0-9]+)?)\s*(stunden?|std|hours?|hrs?|h|minuten?|minutes?|mins?|min)\b/g;
    const tokens = (text) =>
      [...text.matchAll(token)]
        .map((match) => ({ value: Number(match[1].replace(",", ".")), unit: match[2] }))
        .filter((part) => Number.isFinite(part.value));
    const ready = source.match(/(?:fertig|ready)\s+in\s+(.+)$/);
    if (ready) {
      const parts = tokens(ready[1]);
      if (parts.length)
        return parts.reduce((sum, part) => sum + part.value * unitFactor(part.unit), 0);
    }
    const range = source.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(?:-|–|—|bis|to)\s*([0-9]+(?:[.,][0-9]+)?)\s*(stunden?|std|hours?|hrs?|h|minuten?|minutes?|mins?|min)\b/,
    );
    if (range) return Number(range[2].replace(",", ".")) * unitFactor(range[3]);
    const parts = tokens(source);
    if (!parts.length) return null;
    return parts.reduce((sum, part) => sum + part.value * unitFactor(part.unit), 0);
  }
  function formatTime(value, locale = "de") {
    if (typeof value === "number")
      return Number.isFinite(value) && value > 0
        ? `${value} ${locale === "de" ? "Min." : "min"}`
        : "";
    const text = String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
    return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text} ${locale === "de" ? "Min." : "min"}` : text;
  }
  function recipeServings(recipe) {
    const known = Number(recipe?.recipeServings);
    if (Number.isFinite(known) && known > 0) return known;
    const unit = clean(recipe?.recipeYield || ""),
      count = Number(recipe?.recipeYieldQuantity);
    return Number.isFinite(count) &&
      count > 0 &&
      /\b(person|personen|portion|portionen|serving|servings)\b/.test(unit)
      ? count
      : null;
  }
  function scaleIngredient(row, targetServings, baseServings) {
    const raw = typeof row === "string" ? row : ingredient(row),
      target = Number(targetServings),
      base = Number(baseServings);
    if (
      !raw ||
      !Number.isFinite(target) ||
      !Number.isFinite(base) ||
      target < 1 ||
      base < 1 ||
      target === base
    )
      return raw;
    const match = raw.match(/^(\s*)(\d+(?:[.,]\d+)?)(\s+.*)$/);
    if (!match) return raw;
    const amount = (Number(match[2].replace(",", ".")) * target) / base;
    const scaled = Number(amount.toFixed(2)).toLocaleString("de-DE", { maximumFractionDigits: 2 });
    return `${match[1]}${scaled}${match[3]}`;
  }
  // Treat a pantry match as a verified quantity claim, not just a shared word.
  // Mealie has both structured foods/units and legacy display-only ingredients.
  const unitInfo = (raw) => {
    const s = clean(raw).replace(/\s+/g, "");
    if (["g", "gram", "grams", "gramm"].includes(s)) return { unit: "g", factor: 1 };
    if (["kg", "kilogram", "kilograms", "kilogramm"].includes(s))
      return { unit: "g", factor: 1000 };
    if (["ml", "milliliter", "milliliters", "millilitre"].includes(s))
      return { unit: "ml", factor: 1 };
    if (["l", "liter", "litre", "liters"].includes(s)) return { unit: "ml", factor: 1000 };
    if (["stück", "stueck", "stk", "piece", "pieces"].includes(s))
      return { unit: "stück", factor: 1 };
    return { unit: s, factor: 1 };
  };
  function parseIngredient(row) {
    const raw = typeof row === "string" ? row : ingredient(row);
    const m = raw
      .trim()
      .match(
        /^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(kg|g|gramm|ml|l|stück|stueck|stk|el|tl)?(?:\s+|$)/i,
      );
    const structured =
      typeof row === "object" &&
      row !== null &&
      row.food?.name &&
      typeof row.quantity === "number" &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0;
    const source = structured ? unitInfo(row.unit?.name || "") : unitInfo(m?.[3] || "");
    const quantity = structured
      ? Math.round(row.quantity * source.factor * 1000) / 1000
      : m
        ? Math.round(Number((m[2] || m[1]).replace(",", ".")) * source.factor * 1000) / 1000
        : null;
    const label = structured
      ? String(row.food.name).trim()
      : raw
          .slice(m ? m[0].length : 0)
          .replace(/^[,;\s]+/, "")
          .trim() || raw;
    // Missing units, spoons and unknown units are never silently converted to g/ml.
    // Quantity without a unit means pieces, but is explicitly marked estimated.
    const unit = !structured && !source.unit && quantity !== null ? "stück" : source.unit;
    return {
      label,
      raw,
      quantity,
      unit,
      estimated:
        !quantity ||
        !["g", "ml", "stück"].includes(unit) ||
        (unit === "stück" && !structured && !m?.[3]) ||
        ["el", "tl"].includes(unit),
    };
  }
  const prepWords = new Set(
    "frisch frische frischer frischen fein gehackt gerieben gewurfelt geschnitten geschalt geschält reif reife roh bio klein kleine mittel groß grosse großen".split(
      " ",
    ),
  );
  const identity = (name) =>
    words(name)
      .filter((w) => !prepWords.has(w))
      .sort()
      .join("|");
  const sameFood = (a, b) => !!identity(a) && identity(a) === identity(b);
  const goodStock = (row, today) =>
    row &&
    (!row.expires || row.expires >= today) &&
    Number.isFinite(Number(row.amount)) &&
    Number(row.amount) >= 0;
  function pantryCoverage(ingredientRows, pantry = []) {
    const today = new Date().toISOString().slice(0, 10),
      ledger = new Map();
    for (const p of pantry) {
      if (!goodStock(p, today)) continue;
      const unit = unitInfo(p.unit);
      if (!["g", "ml", "stück"].includes(unit.unit)) continue;
      const key = identity(p.name) + "/" + unit.unit;
      if (!identity(p.name)) continue;
      const old = ledger.get(key) || { quantity: 0, staple: false, expires: [] };
      old.quantity += Number(p.amount) * unit.factor;
      old.staple ||= p.staple === true;
      if (p.expires) old.expires.push(p.expires);
      ledger.set(key, old);
    }
    return ingredientRows.map((row) => {
      const item = parseIngredient(row),
        key = identity(item.label) + "/" + item.unit,
        stock = ledger.get(key);
      if (item.quantity === null || !["g", "ml", "stück"].includes(item.unit))
        return { ...item, covered: false, available: 0, unknown: true, expiring: false };
      if (!stock) return { ...item, covered: false, available: 0, unknown: false, expiring: false };
      const available = stock.staple ? Infinity : Math.max(0, stock.quantity);
      const covered = available >= item.quantity;
      if (!stock.staple) stock.quantity = Math.max(0, stock.quantity - item.quantity);
      const expiring =
        covered &&
        stock.expires.some(
          (d) => d >= today && Date.parse(d + "T12:00:00Z") - Date.now() <= 4 * 86400000,
        );
      return { ...item, covered, available, unknown: false, expiring };
    });
  }
  function recipeTags(recipe) {
    return [...(recipe.tags || []), ...(recipe.recipeCategory || [])].map((x) =>
      clean(x?.name || x),
    );
  }
  function cookbookRule(book) {
    const parts = book?.queryFilter?.parts;
    if (!Array.isArray(parts) || parts.length !== 1) return null;
    const part = parts[0];
    if (
      !["tags.id", "recipe_category.id"].includes(part?.attributeName) ||
      part?.relationalOperator !== "IN" ||
      !Array.isArray(part.value) ||
      !part.value.length
    )
      return null;
    return {
      field: part.attributeName === "tags.id" ? "tags" : "recipeCategory",
      ids: new Set(part.value.map(String)),
    };
  }
  function supportedCookbooks(cookbooks = []) {
    return cookbooks
      .filter((book) => book?.slug && book?.name && cookbookRule(book))
      .sort(
        (a, b) =>
          (Number(a.position) || 0) - (Number(b.position) || 0) ||
          String(a.name).localeCompare(String(b.name), "de"),
      );
  }
  function matchesCookbook(recipe, book) {
    const rule = cookbookRule(book);
    if (!rule) return false;
    return (Array.isArray(recipe?.[rule.field]) ? recipe[rule.field] : []).some((item) =>
      rule.ids.has(String(item?.id || "")),
    );
  }
  function searchMatch(recipe, query) {
    const q = clean(query);
    if (!q) return "match";
    const terms = q.split(" ").filter(Boolean);
    const recipeText = [recipe?.name];
    const ingredientText = (recipe?.recipeIngredient || []).map(ingredient);
    const hasTerm = (value, term) => {
      const text = clean(value);
      return (
        text.includes(term) ||
        text
          .split(" ")
          .some(
            (token) =>
              token === term ||
              (term.length >= 4 && token.startsWith(term)) ||
              (token.length >= 4 && term.startsWith(token)),
          )
      );
    };
    const hasQuery = (values) => {
      const text = clean(values.join(" "));
      return text.includes(q) || (terms.length > 1 && terms.every((term) => hasTerm(text, term)));
    };
    const recipeMatch = hasQuery(recipeText),
      ingredientMatch = hasQuery(ingredientText);
    if (recipeMatch && ingredientMatch) return "mixed";
    if (
      terms.length > 1 &&
      recipeText.some((value) => terms.some((term) => hasTerm(value, term))) &&
      ingredientText.some((value) => terms.some((term) => hasTerm(value, term))) &&
      terms.every((term) => recipeText.concat(ingredientText).some((value) => hasTerm(value, term)))
    )
      return "mixed";
    return ingredientMatch ? "ingredient" : recipeMatch ? "recipe" : "match";
  }
  function convertMeasurementQuery(query) {
    const match = String(query || "")
      .trim()
      .match(
        /^([+-]?(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?))\s*(fl[ -]?oz|[\p{L}°-]+)\s*(?:to|in|into|nach|→)\s*(fl[ -]?oz|[\p{L}°-]+)$/iu,
      );
    if (!match) return null;
    const parseAmount = (value) => {
      const mixed = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
      if (mixed) {
        const whole = Number(mixed[1]);
        const numerator = Number(mixed[2]);
        const denominator = Number(mixed[3]);
        return denominator ? whole + Math.sign(whole || 1) * (numerator / denominator) : NaN;
      }
      const fraction = value.match(/^(\d+)\/(\d+)$/);
      if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : NaN;
      return Number(value.replace(",", "."));
    };
    const sourceUnit = match[2].toLowerCase().replace(/\s+/g, "-");
    const targetUnit = match[3].toLowerCase().replace(/\s+/g, "-");
    const units = {
      g: { family: "mass", factor: 1, label: "g" },
      gram: { family: "mass", factor: 1, label: "g" },
      grams: { family: "mass", factor: 1, label: "g" },
      gramm: { family: "mass", factor: 1, label: "g" },
      kg: { family: "mass", factor: 1000, label: "kg" },
      kilogram: { family: "mass", factor: 1000, label: "kg" },
      mg: { family: "mass", factor: 0.001, label: "mg" },
      oz: { family: "mass", factor: 28.349523125, label: "oz" },
      ounce: { family: "mass", factor: 28.349523125, label: "oz" },
      ounces: { family: "mass", factor: 28.349523125, label: "oz" },
      lb: { family: "mass", factor: 453.59237, label: "lb" },
      lbs: { family: "mass", factor: 453.59237, label: "lb" },
      pound: { family: "mass", factor: 453.59237, label: "lb" },
      pounds: { family: "mass", factor: 453.59237, label: "lb" },
      ml: { family: "volume", factor: 1, label: "ml" },
      milliliter: { family: "volume", factor: 1, label: "ml" },
      milliliters: { family: "volume", factor: 1, label: "ml" },
      millilitre: { family: "volume", factor: 1, label: "ml" },
      millilitres: { family: "volume", factor: 1, label: "ml" },
      l: { family: "volume", factor: 1000, label: "l" },
      liter: { family: "volume", factor: 1000, label: "l" },
      litre: { family: "volume", factor: 1000, label: "l" },
      tsp: { family: "volume", factor: 4.92892159375, label: "tsp" },
      teaspoon: { family: "volume", factor: 4.92892159375, label: "tsp" },
      teaspoons: { family: "volume", factor: 4.92892159375, label: "tsp" },
      tl: { family: "volume", factor: 5, label: "tsp" },
      tbsp: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      tablespoon: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      tablespoons: { family: "volume", factor: 14.78676478125, label: "tbsp" },
      el: { family: "volume", factor: 15, label: "tbsp" },
      cup: { family: "volume", factor: 236.5882365, label: "cup" },
      cups: { family: "volume", factor: 236.5882365, label: "cups" },
      "fl-oz": { family: "volume", factor: 29.5735295625, label: "fl oz" },
      floz: { family: "volume", factor: 29.5735295625, label: "fl oz" },
      c: { family: "temperature", label: "°C" },
      "°c": { family: "temperature", label: "°C" },
      celsius: { family: "temperature", label: "°C" },
      f: { family: "temperature", label: "°F" },
      "°f": { family: "temperature", label: "°F" },
      fahrenheit: { family: "temperature", label: "°F" },
    };
    const source = units[sourceUnit],
      target = units[targetUnit];
    if (!source || !target) return null;
    const amount = parseAmount(match[1]);
    if (source.family !== target.family) {
      if (
        [source.family, target.family].includes("mass") &&
        [source.family, target.family].includes("volume")
      )
        return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
          ? {
              amount,
              sourceUnit: source.label,
              targetUnit: target.label,
              unsupported: "density-required",
            }
          : null;
      return null;
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return null;
    let converted;
    if (source.family === "temperature") {
      const sourceIsCelsius = source.label === "°C";
      const targetIsCelsius = target.label === "°C";
      converted =
        sourceIsCelsius === targetIsCelsius
          ? amount
          : sourceIsCelsius
            ? amount * (9 / 5) + 32
            : (amount - 32) * (5 / 9);
    } else {
      converted = (amount * source.factor) / target.factor;
    }
    return {
      amount,
      sourceUnit: source.label,
      converted: Number(converted.toFixed(4)),
      targetUnit: target.label,
      family: source.family,
    };
  }
  function dietSafe(recipe, profile = {}) {
    const tags = recipeTags(recipe),
      rows = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
    let style = profile.mealStyle || "";
    if (!style && profile.diets?.length)
      style = profile.diets.includes("vegan")
        ? "vegan"
        : profile.diets.includes("vegetarian")
          ? "vegetarian"
          : "";
    const names = rows.map(ingredient).filter(Boolean).map(clean),
      all = names.join(" ");
    const tagged = (...terms) => tags.some((tag) => terms.some((term) => tag.includes(term)));
    const has = (pattern) => pattern.test(all);
    // German puts the animal anywhere in a compound (Hähnchenbrust, Miesmuscheln, Seelachs), so most
    // meat and fish stems match inside words. A plant product never counts as animal, and look-alikes
    // (Kürbisfleisch, Hühnereier, Parmesanrinde, Steakpfeffer, Hirschhornsalz) are removed first.
    const plant =
      /\b(?:vegan\w*|vegetari\w*|veggie\w*|pflanzlich\w*|plant based|fleischfrei\w*|fleischlos\w*|fleischersatz|meatless|beyond|tofu\w*|seitan|tempeh|\w*protein)\b|\bsoja(?!\s?(?:sauce|sose|soße|sosse))\w*/;
    const plantDairy =
      /\b(?:hafer|soja|mandel|kokos|reis|cashew|erbsen|dinkel|oat|almond|soy|coconut|rice|peanut|cocoa|nut)\s?(?:milch|sahne|drink|joghurt|butter|cuisine|creme|cream|milk|yogurt)\b/g;
    const lookalike =
      /\w*(?:frucht|kurbis|mango|kokos|melonen?|avocado|papaya|ananas)fleisch\w*|\bfleischtomate\w*|\bkokos\w*|\w*(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\w*rinden?\b|\brinds? of\b|\b(?:lemon|lime|orange|citrus|zitronen|orangen|limetten|parmesan|cheese|melon|watermelon)\s+rinds?\b|\bauster\w*\s?(?:pilz|seitling)\w*|\boyster mushrooms?\b|\bmuschelnudel\w*|\bbeefsteak tomato\w*|\w*gewu(?:e)?rz(?:mischung|salz)?\b|\w+\s+gewu(?:e)?rz(?:mischung)?\b|\b(?:chicken|poultry|steak|beef)\s+(?:seasoning|spice|rub)\b|\bsteak(?:pfeffer|salz|sauce|sose|soße)\b|\bhirschhorn\w*|\blamb\s?s\s+lettuce\b|(?<=\b(?:cauliflower|celeriac|mushroom|portobello|cabbage|tofu|tuna|salmon|swordfish|sellerie|blumenkohl|kohl|kohlrabi|rotkohl|weisskohl|weißkohl|auberginen?|pilz|kurbis|thunfisch|lachs|in)\s)steaks?\b/g;
    const animalSide = names.filter((name) => !plant.test(name));
    const flesh = animalSide.map((name) => name.replace(lookalike, " "));
    const dairy = animalSide.map((name) => name.replace(plantDairy, " "));
    const eats = (pattern) => flesh.some((name) => pattern.test(name));
    const meat =
      /fleisch|wurst|schinken|speck|salami|chorizo|salsiccia|schwein|huhn|hahnchen|haehnchen|geflugel|gefluegel|truthahn|hirsch|kaninchen|kasseler|kotelett|gyros|(?<!g|tama)rind|(?<!ge)hack(?!t|en\b|er\b)|(?<![fc])lamm|gans(?:e\w*)?\b|\b(?:kalb|pute|(?:barbarie|flug|peking)?ente|mett|leber|schnitzel|frikadelle|bacon|pancetta|guanciale|prosciutto|beef|pork|chicken|turkey|veal|duck|lamb(?!rusco)|venison|rabbit|goose(?!berr)|mutton|sausage|rumpsteak|huftsteak|roastbeef)|(?<!(?:crab|lobster|coconut)\s?)\bmeat|\b(?:ham|mince|steaks?)\b|\bgehacktes(?:$|\s+(?:halb|gemischt|vom|aus|rind|schwein))|\bwild(?:schwein|gulasch|ragout|ragu|braten|keule|fond)|\bwild(?:$|\s+(?:vom|aus|gewurfelt|oder|tiefgekuhlt))|\breh(?:\b|rucken|keule|gulasch|ragout|braten|medaillon)/;
    const seafood =
      /fisch|(?<!f)lachs(?!schinken)|forelle|kabeljau|garnele|shrimp|krabbe|muschel|sardine|sardelle|anchovi|anchov|matjes|hering|herring|calamar|oktopus|octopus|dorade|zander|scholle|hummer|languste|auster|scampi|meeresfrucht|makrele|karpfen|barsch|heilbutt|seezunge|krebs|pangasius|tilapia|fish|\b(?:kaviar|salmon|tuna|prawn|crab|lobster|mussel|clam|oyster|squid|scallop|mackerel|trout|halibut|haddock|pollock|seafood)|\b(?:raucher)?aal\b|\bcod\b/;
    const animal =
      /\b(milch|kaese|kase|käse|joghurt|quark|sahne|rahm|butter|ei|eier|eigelb|honig|gelatine|molke|parmesan|mozzarella|cream|cheese|yogurt|milk|egg|eggs|honey)\b|(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\beiernudel\w*|\beiwei(?:ss|ß)/;
    if (
      style === "vegan" &&
      (eats(meat) ||
        eats(seafood) ||
        dairy.some((name) => animal.test(name)) ||
        (!tagged("vegan") && (!rows.length || names.length !== rows.length)))
    )
      return false;
    if (
      style === "vegetarian" &&
      (eats(meat) ||
        eats(seafood) ||
        /\b(gelatine|gelatin)\b/.test(all) ||
        (!tagged("vegetarian", "vegetarisch") && (!rows.length || names.length !== rows.length)))
    )
      return false;
    if (style === "meat" && !tagged("fleisch", "meat") && !eats(meat)) return false;
    if (style === "fish" && !tagged("fisch", "fish", "seafood") && !eats(seafood)) return false;
    if (
      profile.kidFriendly === true &&
      has(/\b(chili|chilli|scharf|sriracha|jalapeno|cayenne|hot sauce|habanero)\b/) &&
      !tagged("mild", "kind", "kinderfreundlich")
    )
      return false;
    const diets = profile.diets || [];
    if (
      !profile.mealStyle &&
      diets.length &&
      !diets.every((d) => tags.some((x) => x.includes(clean(d))))
    )
      return false;
    const excluded = profile.exclude || [];
    if (
      excluded.length &&
      Array.isArray(recipe.recipeIngredient) &&
      recipe.recipeIngredient.some((i) =>
        excluded.some((x) =>
          clean(x) === "scharfe"
            ? /\b(chili|chilli|scharf|sriracha|jalapeno|cayenne|hot sauce|habanero)\b/.test(
                clean(ingredient(i)),
              )
            : similarity(ingredient(i), x),
        ),
      )
    )
      return false;
    return true;
  }
  function recommendation(recipe, profile = {}, pantry = [], journal = {}) {
    if (!dietSafe(recipe, profile)) return null;
    const rows = recipe.recipeIngredient || [];
    const coverage = pantryCoverage(rows, pantry);
    const available = coverage.filter((x) => x.covered),
      expiring = coverage.filter((x) => x.expiring);
    const unknown = coverage.filter((x) => x.unknown).length;
    const timeSource = recipe.totalTime || recipe.prepTime || recipe.performTime;
    const prep = durationMinutes(timeSource);
    if (profile.maxMinutes && prep && prep > profile.maxMinutes) return null;
    const feedback = journal[recipe.slug] || {};
    const age = feedback.lastCooked
      ? Math.max(0, (Date.now() - Date.parse(feedback.lastCooked)) / 86400000)
      : 999;
    const timeBonus = prep
      ? prep <= Number(profile.maxMinutes || 40)
        ? 20
        : -Math.min(30, prep - Number(profile.maxMinutes || 40))
      : 0;
    const pantryBoost =
      profile.usePantry === false
        ? 0
        : (rows.length ? (available.length / rows.length) * 32 : 0) + expiring.length * 8;
    const kidTags = recipeTags(recipe).some((x) => /\b(kind|kinder|family|familie|mild)\b/.test(x));
    const mildBonus = profile.kidFriendly === true && kidTags ? 8 : 0;
    const serves = recipeServings(recipe) || 0,
      people = Math.max(1, Number(profile.people) || 2);
    const portionBonus = serves ? Math.max(0, 8 - Math.min(8, Math.abs(serves - people) * 2)) : 0;
    const score =
      30 +
      pantryBoost +
      timeBonus +
      mildBonus +
      portionBonus +
      (Number(feedback.rating) || 0) * 6 +
      (feedback.favorite === true ? 14 : 0) +
      (age < 3 ? -35 : age < 10 ? -15 : 6);
    // Reasons are translation keys with values; the UI resolves them in the active locale.
    const reasons = [
      profile.usePantry === false
        ? null
        : available.length
          ? {
              key: "studioReasonPantryCovered",
              values: { covered: available.length, total: rows.length },
            }
          : { key: "studioReasonPantryUnchecked" },
      unknown ? { key: "studioReasonAmountsUnclear", values: { count: unknown } } : null,
      profile.kidFriendly && kidTags ? { key: "studioReasonFamilyFriendly" } : null,
      serves
        ? { key: "studioReasonServingsBase", values: { servings: serves } }
        : { key: "studioReasonServingsOpen" },
      prep && prep <= Number(profile.maxMinutes || 40)
        ? { key: "studioReasonWithinBudget", values: { minutes: prep } }
        : prep
          ? { key: "studioReasonOverBudget", values: { minutes: prep } }
          : null,
    ].filter(Boolean);
    return {
      slug: recipe.slug,
      id: recipe.id,
      name: recipe.name,
      totalTime: prep,
      timeLabel: formatTime(timeSource),
      servings: serves || null,
      people,
      score: Math.round(score),
      available: available.length,
      total: rows.length,
      missing: Math.max(0, rows.length - available.length - unknown),
      unknown,
      expiring: profile.usePantry === false ? 0 : expiring.length,
      rating: Number(feedback.rating) || 0,
      reasons,
      recipe,
    };
  }
  function suggest(recipes, profile = {}, pantry = [], journal = {}, cookbooks = []) {
    const selected = new Set(Array.isArray(profile.cookbooks) ? profile.cookbooks : []),
      available = supportedCookbooks(cookbooks),
      selectedBooks = available.filter((book) => selected.has(book.slug));
    const candidates = selected.size
      ? recipes.filter((recipe) => selectedBooks.some((book) => matchesCookbook(recipe, book)))
      : recipes;
    return candidates
      .map((r) => recommendation(r, profile, pantry, journal))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), "de"));
  }
  function planWeek(
    recipes,
    profile = {},
    pantry = [],
    journal = {},
    existing = [],
    start = new Date(),
  ) {
    const ranked = suggest(recipes, profile, pantry, journal);
    const bySlug = new Map(recipes.map((x) => [x.slug, x]));
    const used = new Map(),
      result = [];
    let previousIngredients = [];
    const day0 = new Date(start);
    day0.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(day0);
      d.setDate(day0.getDate() + i);
      const date = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
      if (existing.some((e) => e.date === date && e.entryType === "dinner")) continue;
      const candidates = ranked
        .map((x) => {
          const names = (bySlug.get(x.slug)?.recipeIngredient || []).map(ingredient);
          const overlap = previousIngredients.filter((name) =>
            names.some((other) => similarity(name, other)),
          ).length;
          const timesUsed = used.get(x.slug) || 0;
          return { ...x, planScore: x.score + Math.min(18, overlap * 5) - timesUsed * 90, overlap };
        })
        .sort((a, b) => b.planScore - a.planScore);
      const chosen = candidates[0];
      if (!chosen || (!chosen.id && !chosen.slug)) continue;
      used.set(chosen.slug, (used.get(chosen.slug) || 0) + 1);
      previousIngredients = (bySlug.get(chosen.slug)?.recipeIngredient || []).map(ingredient);
      result.push({
        date,
        meal_type: "dinner",
        recipe_id: chosen.id,
        slug: chosen.slug,
        name: chosen.name,
        reasons: chosen.overlap
          ? [...chosen.reasons, { key: "studioReasonSharedIngredients" }]
          : chosen.reasons,
        score: chosen.planScore,
      });
      // Optional leftover lunch: only if recipe explicitly makes >= 2x household size.
      if (
        (recipeServings(bySlug.get(chosen.slug)) || 0) >=
          Math.max(1, Number(profile.people) || 2) * 2 &&
        i < 6
      ) {
        const n = new Date(d);
        n.setDate(n.getDate() + 1);
        const next = [
          n.getFullYear(),
          String(n.getMonth() + 1).padStart(2, "0"),
          String(n.getDate()).padStart(2, "0"),
        ].join("-");
        if (
          !existing.some((e) => e.date === next && e.entryType === "lunch") &&
          !result.some((e) => e.date === next && e.meal_type === "lunch")
        )
          result.push({
            date: next,
            meal_type: "lunch",
            recipe_id: chosen.id,
            slug: chosen.slug,
            name: chosen.name,
            reasons: [{ key: "studioReasonTwoMeals" }],
            leftovers: true,
          });
      }
    }
    return result.sort(
      (a, b) => a.date.localeCompare(b.date) || a.meal_type.localeCompare(b.meal_type),
    );
  }
  // Aisle ids; the UI maps them to localized headings (studioAisle*).
  const category = (name) => {
    const s = clean(name);
    if (/milch|kaese|käse|joghurt|quark|sahne|butter/.test(s)) return "chilled";
    if (/brot|mehl|nudel|reis|hafer|linsen|bohnen|kichererbse/.test(s)) return "pantry";
    if (/gewurz|salz|pfeffer|ol|öl|essig|zucker/.test(s)) return "spices";
    if (/fleisch|wurst|fisch|tofu|tempeh/.test(s)) return "protein";
    return "produce";
  };
  function shoppingNeeds(recipes, pantry = [], profile = {}) {
    const combined = [];
    for (const recipe of recipes) {
      const factor = Math.max(
        0.1,
        Math.min(
          12,
          Number(profile.people || 2) /
            Math.max(1, recipeServings(recipe) || Number(profile.people) || 2),
        ),
      );
      for (const row of recipe?.recipeIngredient || []) {
        const ing = parseIngredient(row);
        if (!ing.label) continue;
        if (ing.quantity !== null) ing.quantity = Math.round(ing.quantity * factor * 100) / 100;
        const found = combined.find(
          (x) =>
            sameFood(x.name, ing.label) &&
            x.unit === ing.unit &&
            x.quantity !== null &&
            ing.quantity !== null,
        );
        if (found) {
          found.quantity += ing.quantity;
          found.recipeNames.push(recipe.name);
        } else
          combined.push({
            name: ing.label,
            quantity: ing.quantity,
            unit: ing.unit,
            category: category(ing.label),
            recipeNames: [recipe.name],
            uncertain: ing.estimated,
          });
      }
    }
    // Allocate stock exactly once across repeated ingredients and recipes.
    // Unknown/volume-incompatible measures stay on the list as uncertain.
    const today = new Date().toISOString().slice(0, 10),
      stock = new Map();
    for (const row of pantry) {
      if (!goodStock(row, today)) continue;
      const unit = unitInfo(row.unit);
      if (!["g", "ml", "stück"].includes(unit.unit)) continue;
      const key = identity(row.name) + "/" + unit.unit;
      if (!identity(row.name)) continue;
      const old = stock.get(key) || { amount: 0, staple: false };
      old.amount += Number(row.amount) * unit.factor;
      old.staple ||= row.staple === true;
      stock.set(key, old);
    }
    return combined
      .map((item) => {
        const s = stock.get(identity(item.name) + "/" + item.unit);
        const supported = ["g", "ml", "stück"].includes(item.unit);
        const have = s && supported ? (s.staple ? Infinity : s.amount) : 0;
        const needed =
          item.quantity === null || !supported
            ? null
            : Math.max(0, Math.round((item.quantity - have) * 100) / 100);
        if (s && !s.staple && needed !== null) s.amount = Math.max(0, s.amount - item.quantity);
        return {
          ...item,
          have,
          needed,
          inStock: needed === 0 && item.quantity !== null,
          uncertain: item.uncertain || item.quantity === null || !supported,
        };
      })
      .filter((x) => !x.inStock)
      .sort(
        (a, b) => a.category.localeCompare(b.category, "de") || a.name.localeCompare(b.name, "de"),
      );
  }
  function audit(recipe) {
    const problems = [];
    const ingredients = recipe.recipeIngredient || [],
      steps = recipe.recipeInstructions || [];
    if (!ingredients.length)
      problems.push({
        severity: "error",
        field: "ingredients",
        key: "studioAuditNoIngredients",
      });
    if (!steps.length)
      problems.push({
        severity: "error",
        field: "steps",
        key: "studioAuditNoSteps",
      });
    for (let i = 0; i < ingredients.length; i++) {
      const p = parseIngredient(ingredients[i]);
      if (p.quantity === null)
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditAmountUnclear",
          values: { item: p.raw },
        });
      if (p.quantity > 10000 && p.unit === "g")
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditAmountLarge",
          values: { item: p.raw },
        });
    }
    if (!recipeServings(recipe))
      problems.push({
        severity: "warning",
        field: "servings",
        key: "studioAuditServingsInvalid",
      });
    if (!recipe.totalTime && !recipe.prepTime)
      problems.push({ severity: "info", field: "time", key: "studioAuditTimeMissing" });
    const seen = new Set();
    for (let i = 0; i < ingredients.length; i++) {
      const p = parseIngredient(ingredients[i]);
      const key = clean(p.label);
      if (seen.has(key) && key.length > 2)
        problems.push({
          severity: "warning",
          field: "ingredients",
          index: i,
          key: "studioAuditDuplicate",
          values: { item: p.label },
        });
      seen.add(key);
    }
    return {
      name: recipe.name,
      problems,
      score: Math.max(
        0,
        100 -
          problems.reduce(
            (v, x) => v + (x.severity === "error" ? 30 : x.severity === "warning" ? 9 : 3),
            0,
          ),
      ),
    };
  }
  // Swap texts and the warning are translation keys; the UI resolves them per locale.
  const swaps = [
    ["sahne", "studioSwapCream"],
    ["butter", "studioSwapButter"],
    ["ei", "studioSwapEgg"],
    ["milch", "studioSwapMilk"],
    ["champignon", "studioSwapMushroom"],
    ["quark", "studioSwapQuark"],
    ["parmesan", "studioSwapParmesan"],
    ["mehl", "studioSwapFlour"],
    ["zucker", "studioSwapSugar"],
  ];
  function substitutions(ingredientName) {
    const v = clean(ingredientName);
    return swaps
      .filter(([k]) => v.includes(k))
      .map(([from, to]) => ({
        from,
        to,
        warning: "studioSwapWarning",
      }));
  }
  function safeHelperTasks(recipe) {
    const steps = recipe.recipeInstructions || [];
    const safe = /wasch|spul|spül|auf den tisch|servier|garnier|rühr|misch|sortier|dekorier/i,
      unsafe =
        /mess|schneid|hack|heiß|heiss|ofen|backofen|pfanne|koch|frittier|messer|flamme|topf|elektrisch|mixgerät/i;
    return steps
      .map((row, i) => ({ step: i, text: String(row.text || row) }))
      .filter((x) => safe.test(x.text) && !unsafe.test(x.text))
      .slice(0, 6)
      .map((x) => ({ ...x, requiresAdultApproval: true }));
  }
  return {
    clean,
    similarity,
    ingredient,
    scaleIngredient,
    parseIngredient,
    pantryCoverage,
    durationMinutes,
    formatTime,
    recipeServings,
    recommendation,
    suggest,
    planWeek,
    shoppingNeeds,
    audit,
    substitutions,
    safeHelperTasks,
    cookbookRule,
    supportedCookbooks,
    matchesCookbook,
    searchMatch,
    convertMeasurementQuery,
  };
})();
