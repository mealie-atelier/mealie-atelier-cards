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
  // The Kochinspo time choices; a saved limit between them (the default 40) selects the next one up.
  const DISCOVER_MINUTES = [20, 35, 50, 80];
  function discoverMinutes(value) {
    const minutes = Number(value) || 40;
    return DISCOVER_MINUTES.find((option) => option >= minutes) || DISCOVER_MINUTES.at(-1);
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
  // The unit is the same lowercase "min" in every language.
  function formatTime(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? `${value} min` : "";
    const text = String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
    return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text} min` : text;
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
  const UNICODE_FRACTIONS = {
    "½": [1, 2],
    "⅓": [1, 3],
    "⅔": [2, 3],
    "¼": [1, 4],
    "¾": [3, 4],
    "⅕": [1, 5],
    "⅖": [2, 5],
    "⅗": [3, 5],
    "⅘": [4, 5],
    "⅙": [1, 6],
    "⅚": [5, 6],
    "⅛": [1, 8],
    "⅜": [3, 8],
    "⅝": [5, 8],
    "⅞": [7, 8],
  };
  const GLYPH_BY_FRACTION = Object.fromEntries(
    Object.entries(UNICODE_FRACTIONS).map(([glyph, [n, d]]) => [`${n}/${d}`, glyph]),
  );
  /** Leading quantity of a row: mixed number, fraction, unicode fraction or decimal. */
  function leadingQuantity(raw) {
    const glyphs = Object.keys(UNICODE_FRACTIONS).join("");
    let m = raw.match(new RegExp(`^(\\s*)(\\d+)?\\s?([${glyphs}])(\\s+.*)?$`));
    if (m) {
      const [n, d] = UNICODE_FRACTIONS[m[3]];
      return { lead: m[1], value: Number(m[2] || 0) + n / d, style: "glyph", rest: m[4] || "" };
    }
    m = raw.match(/^(\s*)(\d+)\s+(\d+)\/(\d+)(\s+.*)?$/);
    if (m && Number(m[4]) > 0)
      return {
        lead: m[1],
        value: Number(m[2]) + Number(m[3]) / Number(m[4]),
        style: "fraction",
        rest: m[5] || "",
      };
    m = raw.match(/^(\s*)(\d+)\/(\d+)(\s+.*)?$/);
    if (m && Number(m[3]) > 0)
      return {
        lead: m[1],
        value: Number(m[2]) / Number(m[3]),
        style: "fraction",
        rest: m[4] || "",
      };
    // "1.000 g" and "1,500 g" group thousands: a dot or comma followed by exactly three digits.
    m = raw.match(/^(\s*)([1-9]\d{0,2}(?:[.,]\d{3})+)(\s+.*)?$/);
    if (m)
      return {
        lead: m[1],
        value: Number(m[2].replace(/[.,]/g, "")),
        style: "decimal",
        rest: m[3] || "",
      };
    // A unit may sit directly on the number ("200g Butter"); "2x" stays a pack count.
    m = raw.match(/^(\s*)(\d+(?:[.,]\d+)?)((?![x×])[a-zA-Zµ]+(?:\s+.*)?|\s+.*)?$/);
    if (m)
      return {
        lead: m[1],
        value: Number(m[2].replace(",", ".")),
        style: "decimal",
        rest: m[3] || "",
      };
    return null;
  }
  /** A fraction text like "2 1/4" when the value is a clean eighth/third, else null. */
  function formatFraction(value, glyph) {
    const whole = Math.floor(value + 1e-9);
    const frac = value - whole;
    if (frac < 0.01) return String(whole);
    for (const d of [2, 3, 4, 5, 6, 8]) {
      const n = Math.round(frac * d);
      if (n > 0 && n < d && Math.abs(frac - n / d) < 0.01) {
        // Reduce, so 2/4 reads as 1/2.
        const div = [8, 4, 2].find((x) => n % x === 0 && d % x === 0) || 1;
        const key = `${n / div}/${d / div}`;
        const part = glyph && GLYPH_BY_FRACTION[key] ? GLYPH_BY_FRACTION[key] : key;
        if (!whole) return part;
        return glyph && GLYPH_BY_FRACTION[key] ? `${whole}${part}` : `${whole} ${part}`;
      }
    }
    return null;
  }
  /** Scales every alternative of "2 Eier oder 1 Banane" on its own; a pack size in parentheses stays fixed. */
  function scaleIngredient(row, targetServings, baseServings, locale = "de") {
    const raw = typeof row === "string" ? row : ingredient(row);
    if (!raw) return raw;
    return raw
      .split(/(\s+(?:oder|or)\s+)/i)
      .map((part, i) => (i % 2 ? part : scaleLeading(part, targetServings, baseServings, locale)))
      .join("");
  }
  function scaleLeading(row, targetServings, baseServings, locale = "de") {
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
    const fmt = (n) =>
      n.toLocaleString(locale === "en" ? "en-US" : "de-DE", { maximumFractionDigits: 2 });
    // An exact small amount: two decimals, below 0.1 two significant digits so it never reads "0".
    const tiny = (n) =>
      n >= 0.1
        ? fmt(n)
        : n.toLocaleString(locale === "en" ? "en-US" : "de-DE", { maximumSignificantDigits: 2 });
    // The unit or noun right after the amount, without trailing punctuation ("Tassen," -> "Tassen").
    const unitWord = (rest) => (rest.match(/^\s*([^\s\d(,;:.!?)]+)/) || [])[1] || "";
    // Kitchen rounding: metric masses and volumes to sensible steps, everything else to quarters and thirds
    // (eighths below one). Small amounts are never pushed up: below the smallest step they stay exact.
    const kitchen = (value, unit, style) => {
      const u = unit.toLowerCase().replace(/\.$/, "");
      if (["g", "gramm", "gram", "grams", "ml", "milliliter"].includes(u)) {
        if (value < 1) return tiny(value);
        const step = value < 10 ? 0.5 : value < 250 ? 5 : 10;
        return fmt(Math.round(value / step) * step);
      }
      if (["kg", "l", "liter", "litre", "dl", "cl"].includes(u) && style === "decimal")
        return value < 1 ? tiny(value) : fmt(Math.round(value * 20) / 20);
      if (value >= 10) return fmt(Math.round(value));
      const whole = Math.floor(value);
      const grid = whole
        ? [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1]
        : [0, 0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];
      const frac = value - whole;
      const near = grid.reduce((x, y) => (Math.abs(y - frac) < Math.abs(x - frac) ? y : x));
      // Below one, an amount the grid would move by more than 15 % stays exact: as a fraction when the source
      // was one and it has a clean one (halved 1/3 cup is ⅙ cup), else as a decimal (0,3 TL / 4 is 0,08 TL).
      if (value < 1 && Math.abs(near - value) > 0.15 * value) {
        const exact = style === "decimal" ? null : formatFraction(value, true);
        return exact !== null && exact !== "0" ? exact : tiny(value);
      }
      const total = whole + near;
      if (total === 0) return tiny(value);
      const w = Math.floor(total + 1e-9);
      const f = total - w;
      if (f < 0.01) return fmt(w);
      const glyph = ["⅛", "¼", "⅓", "½", "⅔", "¾"][
        [0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75].findIndex((g) => Math.abs(f - g) < 0.01)
      ];
      return `${w || ""}${glyph}`;
    };
    const onGrid = (v) => {
      const f = v - Math.floor(v);
      return [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1].some((g) => Math.abs(f - g) < 0.005);
    };
    const NOUNS = {
      de: {
        tasse: ["Tasse", "Tassen"],
        tassen: ["Tasse", "Tassen"],
        prise: ["Prise", "Prisen"],
        prisen: ["Prise", "Prisen"],
        zehe: ["Zehe", "Zehen"],
        zehen: ["Zehe", "Zehen"],
        ei: ["Ei", "Eier"],
        eier: ["Ei", "Eier"],
        dose: ["Dose", "Dosen"],
        dosen: ["Dose", "Dosen"],
        scheibe: ["Scheibe", "Scheiben"],
        scheiben: ["Scheibe", "Scheiben"],
        zweig: ["Zweig", "Zweige"],
        zweige: ["Zweig", "Zweige"],
        zwiebel: ["Zwiebel", "Zwiebeln"],
        zwiebeln: ["Zwiebel", "Zwiebeln"],
        karotte: ["Karotte", "Karotten"],
        karotten: ["Karotte", "Karotten"],
        möhre: ["Möhre", "Möhren"],
        möhren: ["Möhre", "Möhren"],
        limette: ["Limette", "Limetten"],
        limetten: ["Limette", "Limetten"],
        zitrone: ["Zitrone", "Zitronen"],
        zitronen: ["Zitrone", "Zitronen"],
        filet: ["Filet", "Filets"],
        filets: ["Filet", "Filets"],
      },
      en: {
        cup: ["cup", "cups"],
        cups: ["cup", "cups"],
        pinch: ["pinch", "pinches"],
        pinches: ["pinch", "pinches"],
        clove: ["clove", "cloves"],
        cloves: ["clove", "cloves"],
        egg: ["egg", "eggs"],
        eggs: ["egg", "eggs"],
        can: ["can", "cans"],
        cans: ["can", "cans"],
        onion: ["onion", "onions"],
        onions: ["onion", "onions"],
        carrot: ["carrot", "carrots"],
        carrots: ["carrot", "carrots"],
        tablespoon: ["tablespoon", "tablespoons"],
        tablespoons: ["tablespoon", "tablespoons"],
        teaspoon: ["teaspoon", "teaspoons"],
        teaspoons: ["teaspoon", "teaspoons"],
        slice: ["slice", "slices"],
        slices: ["slice", "slices"],
        sprig: ["sprig", "sprigs"],
        sprigs: ["sprig", "sprigs"],
        rasher: ["rasher", "rashers"],
        rashers: ["rasher", "rashers"],
        piece: ["piece", "pieces"],
        pieces: ["piece", "pieces"],
        fillet: ["fillet", "fillets"],
        fillets: ["fillet", "fillets"],
      },
    };
    // German compounds ending in a counted noun (Knoblauchzehen, Hähnchenbrustfilets) agree on the last part.
    const COMPOUND_TAILS = ["zehe", "scheibe", "zweig", "zwiebel", "karotte", "limette", "filet"];
    // The number as the reader sees it ("1", "1¼", "1,5", "⅚"): agreement follows the shown amount, not the raw one.
    const GLYPHS = {
      "¼": 0.25,
      "½": 0.5,
      "¾": 0.75,
      "⅓": 1 / 3,
      "⅔": 2 / 3,
      "⅕": 0.2,
      "⅖": 0.4,
      "⅗": 0.6,
      "⅘": 0.8,
      "⅙": 1 / 6,
      "⅚": 5 / 6,
      "⅛": 0.125,
      "⅜": 0.375,
      "⅝": 0.625,
      "⅞": 0.875,
    };
    const shown = (text) => {
      const s = String(text).trim();
      const glyph = s.match(/^(\d*)\s*([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
      if (glyph) return Number(glyph[1] || 0) + GLYPHS[glyph[2]];
      const slash = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
      if (slash) return Number(slash[1] || 0) + Number(slash[2]) / Number(slash[3]);
      const n = Number(
        locale === "en" ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", "."),
      );
      return Number.isFinite(n) ? n : NaN;
    };
    // Singular up to 1, plural above, for the small table of common units; unknown words stay.
    const agree = (rest, amount) => {
      const word = unitWord(rest);
      const table = NOUNS[locale === "en" ? "en" : "de"] || {};
      const lower = word.toLowerCase();
      const plural = amount > 1 + 1e-9 ? 1 : 0;
      let prefix = "";
      let forms = table[lower];
      if (!forms && locale !== "en") {
        const tail = COMPOUND_TAILS.flatMap((t) => [t + "n", t + "s", t + "e", t]).find(
          (t) => lower.length >= t.length + 3 && lower.endsWith(t) && table[t],
        );
        if (tail) {
          forms = table[tail];
          prefix = word.slice(0, word.length - tail.length);
        }
      }
      if (!forms) return rest;
      const base = forms[plural];
      const next = prefix ? base.toLowerCase() : base;
      const keepCase =
        word.length > 1 && word === word.toUpperCase()
          ? prefix + next.toUpperCase()
          : prefix || word[0] === word[0].toLowerCase()
            ? prefix + next.toLowerCase()
            : next;
      return rest.replace(word, keepCase);
    };
    // A range such as "2-3", "2–3" or "1 bis 2" scales on both ends and keeps its separator.
    const range = raw.match(
      /^(\s*)(\d+(?:[.,]\d+)?)(\s*[-–]\s*|\s+(?:bis|to)\s+)(\d+(?:[.,]\d+)?)(\s+.*)$/,
    );
    if (range) {
      const low = Number(range[2].replace(",", ".")),
        high = Number(range[4].replace(",", "."));
      if (high >= low && !/^\s+[x×]\s*\d/i.test(range[5])) {
        const unit = unitWord(range[5]);
        const lowValue = (low * target) / base,
          highValue = (high * target) / base;
        let lo = kitchen(lowValue, unit, "decimal"),
          hi = kitchen(highValue, unit, "decimal");
        // Both ends in one notation: "0,17-0,33 TL", never "0,17-⅓ TL".
        const glyphEnd = (x) => /[¼½¾⅓⅔⅛⅙⅚⅕⅖⅗⅘⅜⅝⅞]/.test(x),
          decimalEnd = (x) => /\d[.,]\d/.test(x);
        if ((glyphEnd(lo) && decimalEnd(hi)) || (decimalEnd(lo) && glyphEnd(hi))) {
          lo = tiny(lowValue);
          hi = tiny(highValue);
        }
        return `${range[1]}${lo}${range[3]}${hi}${agree(range[5], shown(hi))}`;
      }
      return raw;
    }
    const q = leadingQuantity(raw);
    if (!q) return raw;
    // "1 x 400 g" is a pack count, not an amount: scaling it would give "1,5 x 400 g".
    if (/^\s+[x×]\s*\d/i.test(q.rest)) return raw;
    const amount = (q.value * target) / base;
    const unit = unitWord(q.rest);
    let scaled = null;
    // A source fraction off the quarter and third grid (fifths, sixths) keeps its exact value when it stays exact.
    if (q.style !== "decimal" && !onGrid(q.value)) scaled = formatFraction(amount, true);
    // An off-grid fraction that would read "0" goes through the kitchen rules instead.
    if (scaled === "0") scaled = null;
    if (scaled === null) scaled = kitchen(amount, unit, q.style);
    const seen = shown(scaled);
    return `${q.lead}${scaled}${agree(q.rest, Number.isFinite(seen) ? seen : amount)}`;
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
    if (["stück", "stuck", "stueck", "stk", "piece", "pieces"].includes(s))
      return { unit: "stück", factor: 1 };
    // English spoons read like EL and TL: a volume that is never converted to ml.
    if (["tbsp", "tablespoon", "tablespoons"].includes(s)) return { unit: "el", factor: 1 };
    if (["tsp", "teaspoon", "teaspoons"].includes(s)) return { unit: "tl", factor: 1 };
    if (["cup", "cups"].includes(s)) return { unit: "cup", factor: 1 };
    return { unit: s, factor: 1 };
  };
  // Unicode vulgar fractions as numeric values.
  const fractionChars = {
    "½": 0.5,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "¼": 0.25,
    "¾": 0.75,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
  };
  // One amount: "1 1/2", "1/3", "1½", "½", "1,5" or "2".
  const amountPattern = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*\\s?[${Object.keys(fractionChars).join("")}]|\\d+(?:[.,]\\d+)?)`;
  const ingredientAmount = new RegExp(
    `^(${amountPattern})(?:\\s*[-–]\\s*(${amountPattern}))?\\s*(kg|g|gramm|ml|l|stück|stueck|stk|el|tl|tbsp|tsp|tablespoons?|teaspoons?|cups?)?(?:\\s+|$)`,
    "i",
  );
  function amountValue(text) {
    const t = String(text).trim();
    const unicode = t.match(new RegExp(`^(\\d*)\\s?([${Object.keys(fractionChars).join("")}])$`));
    if (unicode) return Number(unicode[1] || 0) + fractionChars[unicode[2]];
    const mixed = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (mixed) {
      const den = Number(mixed[3]);
      return den ? Number(mixed[1] || 0) + Number(mixed[2]) / den : NaN;
    }
    return Number(t.replace(",", "."));
  }
  const superDigits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const subDigits = "₀₁₂₃₄₅₆₇₈₉";
  // "¹/₂", "¹⁄₂" and "2 ¹/₂" become "1/2" and "2 1/2" so one amount pattern covers every fraction form.
  function normalizeFractions(text) {
    const digit = (c) => {
      const i = superDigits.indexOf(c);
      return String(i >= 0 ? i : subDigits.indexOf(c));
    };
    return String(text).replace(
      new RegExp(`([${superDigits}${subDigits}]+)\\s?[/⁄]\\s?([${superDigits}${subDigits}]+)`, "g"),
      (_, n, d) => `${[...n].map(digit).join("")}/${[...d].map(digit).join("")}`,
    );
  }
  function parseIngredient(row) {
    const raw = typeof row === "string" ? row : ingredient(row);
    const normalized = normalizeFractions(raw).trim();
    const m = normalized.match(ingredientAmount);
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
        ? Math.round(amountValue(m[2] || m[1]) * source.factor * 1000) / 1000
        : // Rows without a linked food still carry a numeric quantity from Mealie.
          typeof row === "object" &&
            row !== null &&
            Number.isFinite(row.quantity) &&
            row.quantity > 0
          ? Math.round(row.quantity * source.factor * 1000) / 1000
          : null;
    const label = structured
      ? String(row.food.name).trim()
      : normalized
          .slice(m ? m[0].length : 0)
          .replace(/^[,;\s]+/, "")
          .trim() || raw;
    // Missing units, spoons and unknown units are never silently converted to g/ml.
    // Quantity without a unit means pieces, but is explicitly marked estimated (typed lines without a counted
    // food word, and linked foods whose row names no unit).
    const unit = !source.unit && quantity !== null ? "stück" : source.unit;
    return {
      label,
      raw,
      quantity,
      unit,
      estimated:
        !quantity ||
        !["g", "ml", "stück"].includes(unit) ||
        (unit === "stück" && (structured ? !source.unit : !m?.[3])) ||
        ["el", "tl"].includes(unit),
    };
  }
  const prepWords = new Set(
    "frisch frische frischer frischen fein gehackt gerieben gewurfelt geschnitten geschalt geschält reif reife roh bio klein kleine mittel groß grosse großen".split(
      " ",
    ),
  );
  // Same words as words(), but the egg is folded by hand before the suffix cut: "Ei" is shorter than the three
  // letters a word needs and "Eier" keeps its r, while "Eis" (ice cream) would be cut to "ei" and must stay apart.
  const identity = (name) =>
    clean(name)
      .split(" ")
      .filter((w) => w && !stop.has(w))
      .map((w) => {
        if (/^ei(?:er|ern)?$/.test(w)) return "ei";
        if (w.length <= 2) return "";
        const stem = w.replace(/(en|ern|e|n|s)$/, "");
        return stem === "ei" ? w : stem;
      })
      .filter((w) => w && !prepWords.has(w))
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
    // meat and fish stems match inside words, across every option of a line ("Gemüse- oder
    // Hühnerbrühe"). A plant marker only counts when it describes the product as written, not an
    // alternative after "oder" or "vegan:". "Vegetarisch" or "Protein" on cheese does not make it vegan. Look-alikes (Kürbisfleisch, Hühnereier,
    // Parmesanrinde, Steakpfeffer, Hirschhornsalz) are removed first.
    const main = rows
      .map(ingredient)
      .filter(Boolean)
      .map((text) =>
        clean(
          text.replace(
            /\s*[(,;]?\s*(?:\b(?:oder|or|alternativ\w*|ersatzweise|statt|instead)\b|\b(?:vegan|vegetarisch|vegetarian)\s*:).*$/i,
            "",
          ),
        ),
      );
    const plant =
      /\b(?:vegan\w*|vegetari\w*|veggie\w*|pflanzlich\w*|plant based|fleischfrei\w*|fleischlos\w*|fleischersatz|meatless|beyond|tofu\w*|seitan|tempeh|\w*protein)\b|\bsoja(?!\s?(?:sauce|sose|soße|sosse))\w*/;
    const veganMark =
      /\b(?:vegan\w*|pflanzlich\w*|plant based|beyond|tofu\w*|seitan|tempeh)\b|\bsoja(?!\s?(?:sauce|sose|soße|sosse))\w*/;
    const plantDairy =
      /\b(?:hafer|soja|mandel|kokos|kokosnuss|reis|cashew|erbsen|dinkel|pflanzen|hasel|haselnuss|hanf|lupinen|nuss|oat|almond|soy|coconut|rice|peanut|cocoa|nut)\s?(?:koch|schlag)?(?:milch|sahne|rahm|drink|joghurt|butter|cuisine|creme|cream|milk|yogurt)\b|\b(?:cashew|nuss|mandel)kase\b/g;
    const lookalike =
      /\w*(?:frucht|kurbis|mango|kokos|melonen?|avocado|papaya|ananas)fleisch\w*|\bfleischtomate\w*|\bkokos\w*|\w*(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\w*rinden?\b|\brinds? of\b|\b(?:lemon|lime|orange|citrus|zitronen|orangen|limetten|parmesan|cheese|melon|watermelon)\s+rinds?\b|\bauster\w*\s?(?:pilz|seitling)\w*|\boyster mushrooms?\b|\bmuschelnudel\w*|\bbeefsteak tomato\w*|\w*gewu(?:e)?rz(?:mischung|salz)?\b|\w+\s+gewu(?:e)?rz(?:mischung)?\b|\b(?:chicken|poultry|steak|beef)\s+(?:seasoning|spice|rub)\b|\bsteak(?:pfeffer|salz|sauce|sose|soße)\b|\bhirschhorn\w*|\blamb\s?s\s+lettuce\b|(?<=\b(?:cauliflower|celeriac|mushroom|portobello|cabbage|tofu|tuna|salmon|swordfish|sellerie|blumenkohl|kohl|kohlrabi|rotkohl|weisskohl|weißkohl|auberginen?|pilz|kurbis|thunfisch|lachs|in)\s)steaks?\b/g;
    const flesh = names
      .filter((name, index) => !plant.test(main[index]))
      .map((name) => name.replace(lookalike, " "));
    const dairy = names
      .filter((name, index) => !veganMark.test(main[index]))
      .map((name) => name.replace(plantDairy, " "));
    const eats = (pattern) => flesh.some((name) => pattern.test(name));
    const meat =
      /fleisch|wurst|schinken|speck|salami|chorizo|salsiccia|schwein|huhn|hahnchen|haehnchen|geflugel|gefluegel|truthahn|hirsch|kaninchen|kasseler|kotelett|gyros|wachtel|wildente|brisket|ground chuck|(?:nacken|minuten|filet|huft|rump)steak|\bhasen?\b|(?<!g|tama)rind|(?<!ge)hack(?!t|en\b|er\b)|(?<![fc])lamm|gans(?:e\w*)?\b|\b(?:kalb|pute|(?:barbarie|flug|peking)?ente|mett|leber|schnitzel|frikadelle|bacon|pancetta|guanciale|prosciutto|beef|pork|chicken|turkey|veal|duck|lamb(?!rusco)|venison|rabbit|goose(?!berr)|mutton|sausage|rumpsteak|huftsteak|roastbeef)|(?<!(?:crab|lobster|coconut)\s?)\bmeat|\b(?:ham|mince|steaks?)\b|\bgehacktes(?:$|\s+(?:halb|gemischt|vom|aus|rind|schwein))|\bwild(?:schwein|gulasch|ragout|ragu|braten|keule|fond)|\bwild(?:$|\s+(?:vom|aus|gewurfelt|oder|tiefgekuhlt))|\breh(?:\b|rucken|keule|gulasch|ragout|braten|medaillon)/;
    const seafood =
      /fisch|(?<!f)lachs(?!schinken)|forelle|kabeljau|garnele|shrimp|krabbe|muschel|sardine|sardelle|anchovi|anchov|matjes|hering|herring|calamar|oktopus|octopus|dorade|zander|scholle|hummer|languste|auster|scampi|meeresfrucht|makrele|karpfen|barsch|heilbutt|seezunge|krebs|pangasius|tilapia|worcester|fish|\b(?:kaviar|salmon|tuna|prawn|crab|lobster|mussel|clam|oyster|squid|scallop|mackerel|trout|halibut|haddock|pollock|seafood)|\b(?:raucher)?aal\b|\bcod\b/;
    const animal =
      /\w*(?:kase|kaese|milch|sahne|rahm|joghurt)\b|\b(feta|gouda|ricotta|mascarpone|pecorino|cheddar|emmentaler|gruyere|brie|camembert|halloumi|burrata|schmand|creme fraiche|ghee|butterschmalz|skyr|milch|joghurt|quark|sahne|rahm|butter|ei|eier|eigelb|honig|gelatine|molke|parmesan|mozzarella|cream|cheese|yogurt|milk|egg|eggs|honey)\b|(?:huhner|enten|wachtel|ganse)\s?ei(?:er)?\b|\beiernudel\w*|\beiwei(?:ss|ß)/;
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
    const kidTags = recipeTags(recipe).some((x) =>
      /\b(kind(er\w*)?|famil(y|ie|ien)\w*|mild)\b/.test(x),
    );
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
      unknown
        ? { key: "studioReasonAmountsUnclear", values: { count: unknown }, plural: true }
        : null,
      profile.kidFriendly && kidTags ? { key: "studioReasonFamilyFriendly" } : null,
      serves
        ? {
            key: "studioReasonServingsBase",
            values: { servings: serves, count: serves },
            plural: true,
          }
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
  // Stems on the diacritic-free text produced by clean(); never free substring matches.
  // aisleSuffixes catch the head of German compounds (Weizenmehl, Vollmilch, Sesamöl) and win over
  // word starts, so Weinessig is a spice and Weintrauben stay produce.
  const aisleStems = [
    [
      "chilled",
      /^(milch|kase|kaese|joghurt|yoghurt|quark|sahne|butter|feta|mozzarella|parmesan|mascarpone|ricotta|schmand|ei$|eier|frischkase|creme|(?:milk|cheese|yogurt|cream|cheddar)s?$|eggs?$)/,
    ],
    [
      "protein",
      /^(fleisch|wurst|fisch|tofu|tempeh|hahnchen|hanchen|huhn|hahn|rind|ochsen|schwein|hack$|hackfleisch|speck|schinken|lachs|thunfisch|garnele|lamm|pute|truthahn|salami|(?:chicken|beef|pork|bacon|lamb|turkey|sausage|salmon|tuna|shrimp|prawn|fish|steak|duck)s?$|ham$|mince$|pepperoni)/,
    ],
    [
      "pantry",
      /^(brot|sauerteig|mehl|nudel|pasta|reis|hafer|linsen|bohnen|kichererbse|wein$|rotwein|weisswein|bier|bruh|bouillon|(?:flour|bread|rice|pasta|penne|spaghetti|noodle|oat|oatmeal|lentil|chickpea|wine|beer|stock|broth|cracker|graham)s?$)/,
    ],
    [
      "spices",
      /^(gewurz|salz|pfeffer|ol$|olivenol|rapsol|sonnenblumenol|essig|zucker|paprikapulver|zimt|curry|oregano|thymian$|(?:salt|oil|vinegar|sugar|cinnamon|clove)s?$|thyme$|peppercorns?$)/,
    ],
  ];
  // Foods whose name starts like a spice or pantry stem but are something else (Zuckerschoten, Pfefferminze).
  const aisleExceptions = [
    [
      "produce",
      /^(zuckerschote|zuckererbse|zuckermais|zuckerruebe|zuckerrube|zuckerhut|pfefferminz|pfefferoni)/,
    ],
    ["pantry", /^(gewurzgurke|gewurzgurken)/],
  ];
  // "pepper" is a seasoning only next to one of these words or on its own; "red pepper" and
  // "jalapeno pepper" are vegetables. Garlic cloves are produce, "whole cloves" a spice.
  const pepperSeasoning =
    /^(black|white|ground|cracked|cayenne|lemon|freshly|salt|flakes?|pinch|powder)$/;
  const pepperSlot = /^peppers?$/;
  const cloveSlot = /^cloves?$/;
  const garlicWord = /^(garlic|knoblauch)/;
  const aisleSuffixes = [
    ["chilled", /(milch|sahne|kase|kaese|joghurt|quark|butter|milk|cheese|yogurt|cream)$/],
    ["protein", /(wurst|fleisch|fisch|schinken|speck|schwein|sausage|bacon)$/],
    [
      "pantry",
      /(mehl|brot|reis|nudeln|wein|bruhe|bruhe?(wurfel|pulver|paste)|fond|bouillon|flour|bread|rice|stock|broth|cracker)$/,
    ],
    ["spices", /(salz|zucker|essig|pfeffer|ol|salt|sugar|vinegar|(?<!f)oil)$/],
  ];
  const category = (name) => {
    const cleaned = clean(name);
    let tokens = cleaned.split(" ").filter(Boolean);
    // Sugar snap peas are a vegetable, not sugar.
    if (/\bsugar snap|\bsnap peas?\b/.test(cleaned)) return "produce";
    if (tokens.some((w) => pepperSlot.test(w)) && tokens.length > 1) {
      if (tokens.some((w) => pepperSeasoning.test(w))) return "spices";
      tokens = tokens.filter((w) => !pepperSlot.test(w));
    } else if (tokens.length === 1 && tokens[0] === "pepper") return "spices";
    if (tokens.some((w) => garlicWord.test(w))) tokens = tokens.filter((w) => !cloveSlot.test(w));
    for (const [aisle, exception] of aisleExceptions)
      if (tokens.some((w) => exception.test(w))) return aisle;
    for (const [aisle, suffix] of aisleSuffixes)
      if (tokens.some((w) => suffix.test(w))) return aisle;
    for (const [aisle, stem] of aisleStems) if (tokens.some((w) => stem.test(w))) return aisle;
    return "produce";
  };
  // Counting words that read as units ("1 Handvoll Basilikum"), singular and plural display forms.
  const countUnits = {
    handvoll: ["Handvoll", "Handvoll"],
    scheibe: ["Scheibe", "Scheiben"],
    scheiben: ["Scheibe", "Scheiben"],
    knolle: ["Knolle", "Knollen"],
    knollen: ["Knolle", "Knollen"],
    stange: ["Stange", "Stangen"],
    stangen: ["Stange", "Stangen"],
    zehe: ["Zehe", "Zehen"],
    zehen: ["Zehe", "Zehen"],
    bund: ["Bund", "Bund"],
    becher: ["Becher", "Becher"],
    glas: ["Glas", "Gläser"],
    gläser: ["Glas", "Gläser"],
    glaser: ["Glas", "Gläser"],
    zweig: ["Zweig", "Zweige"],
    zweige: ["Zweig", "Zweige"],
    dose: ["Dose", "Dosen"],
    dosen: ["Dose", "Dosen"],
    packung: ["Packung", "Packungen"],
    packungen: ["Packung", "Packungen"],
    kopf: ["Kopf", "Köpfe"],
    köpfe: ["Kopf", "Köpfe"],
    prise: ["Prise", "Prisen"],
    prisen: ["Prise", "Prisen"],
    handful: ["handful", "handfuls"],
    handfuls: ["handful", "handfuls"],
    pinch: ["pinch", "pinches"],
    pinches: ["pinch", "pinches"],
    clove: ["clove", "cloves"],
    cloves: ["clove", "cloves"],
    sprig: ["sprig", "sprigs"],
    sprigs: ["sprig", "sprigs"],
    slice: ["slice", "slices"],
    slices: ["slice", "slices"],
    rasher: ["rasher", "rashers"],
    rashers: ["rasher", "rashers"],
    piece: ["piece", "pieces"],
    pieces: ["piece", "pieces"],
    can: ["can", "cans"],
    cans: ["can", "cans"],
    head: ["head", "heads"],
    heads: ["head", "heads"],
    stalk: ["stalk", "stalks"],
    stalks: ["stalk", "stalks"],
    bunch: ["bunch", "bunches"],
    bunches: ["bunch", "bunches"],
  };
  // Words that only join a compound when they follow a food ("Joghurtbecher" stays one food label).
  const looseCountUnits = new Set(["becher", "glas", "gläser"]);
  // German foods counted in pieces: singular and plural display form. One row per food across recipes.
  const foodForms = Object.fromEntries(
    [
      ["Ei", "Eier", "Eiern"],
      ["Zwiebel", "Zwiebeln"],
      ["Karotte", "Karotten"],
      ["Möhre", "Möhren"],
      ["Zehe", "Zehen"],
      ["Limette", "Limetten"],
      ["Zitrone", "Zitronen"],
      ["Tomate", "Tomaten"],
      ["Kartoffel", "Kartoffeln"],
      ["Gurke", "Gurken"],
      ["Orange", "Orangen"],
      ["Banane", "Bananen"],
      ["Birne", "Birnen"],
      ["Apfel", "Äpfel"],
      ["Paprikaschote", "Paprikaschoten"],
    ].flatMap((pair) => pair.map((word) => [word.toLocaleLowerCase("de"), pair])),
  );
  // English tails of a label that name the counting word ("garlic cloves").
  const countTail = /^(.+?)\s+(cloves?|sprigs?|stalks?)$/i;
  // Only garlic cloves count as a unit; "whole cloves" are the spice.
  const garlicLabel = /(garlic|knoblauch)$/i;
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
        // Preparation notes after a comma are not part of the food ("Knoblauchzehen, fein gehackt").
        ing.label = ing.label.split(",")[0].trim() || ing.label;
        // A size word may precede the counting word ("small heads bok choy").
        const sized = ing.label.replace(/^(?:small|medium|large|big)\s+(?=\S+\s+\S)/i, "");
        const lead = sized.match(/^(\S+)\s+(.+)$/);
        const counted = lead && countUnits[lead[1].toLocaleLowerCase("de")];
        // "2 Stück Butter": the piece word is the unit, not part of the food.
        if (
          lead &&
          ing.quantity !== null &&
          ing.unit === "stück" &&
          /^st(?:ü|ue)cke?$/i.test(lead[1])
        ) {
          ing.label = lead[2].replace(/^(?:of|von)\s+/i, "");
          ing.estimated = false;
        }
        const tail = ing.label.match(countTail);
        if (
          counted &&
          ing.quantity !== null &&
          ing.unit === "stück" &&
          (!/^cloves?$/i.test(lead[1]) || garlicLabel.test(lead[2].replace(/^(?:of|von)\s+/i, "")))
        ) {
          ing.unit = counted[0].toLocaleLowerCase("de");
          ing.label = lead[2].replace(/^(?:of|von)\s+/i, "");
          ing.estimated = false;
        } else if (
          tail &&
          ing.quantity !== null &&
          ing.unit === "stück" &&
          (!/^cloves?$/i.test(tail[2]) || garlicLabel.test(tail[1]))
        ) {
          // "2 garlic cloves" and "1 clove garlic" merge into one row.
          ing.unit = countUnits[tail[2].toLowerCase()][0];
          ing.label = tail[1];
          ing.estimated = false;
        } else if (ing.quantity !== null && ing.unit === "stück" && !/\s/.test(ing.label)) {
          // "2 Knoblauchzehen" reads like "2 Zehen Knoblauch", so both merge into one row.
          const lower = ing.label.toLocaleLowerCase("de");
          const word = Object.keys(countUnits)
            .filter((key) => !looseCountUnits.has(key))
            .sort((a, b) => b.length - a.length)
            .find((key) => lower.length >= key.length + 3 && lower.endsWith(key));
          if (word) {
            ing.unit = countUnits[word][0].toLocaleLowerCase("de");
            ing.label = ing.label.slice(0, ing.label.length - word.length);
            ing.estimated = false;
          }
        }
        if (ing.quantity !== null) ing.quantity = Math.round(ing.quantity * factor * 100) / 100;
        const found = combined.find(
          (x) =>
            sameFood(x.name, ing.label) &&
            x.unit === ing.unit &&
            // Identical lines without an amount ("Salt and black pepper" x4) collapse to one row.
            (x.quantity === null) === (ing.quantity === null),
        );
        if (found) {
          if (ing.quantity !== null) found.quantity += ing.quantity;
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
        const counted = countUnits[item.unit];
        const supported = ["g", "ml", "stück"].includes(item.unit) || !!counted;
        const have = s && supported ? (s.staple ? Infinity : s.amount) : 0;
        let needed =
          item.quantity === null || !supported
            ? null
            : Math.max(0, Math.round((item.quantity - have) * 100) / 100);
        // Whole pieces cannot be bought in halves.
        if (needed !== null && (item.unit === "stück" || counted))
          needed = Math.ceil(needed - 1e-9);
        if (s && !s.staple && needed !== null) s.amount = Math.max(0, s.amount - item.quantity);
        // A food counted in pieces reads in the form that matches the amount ("1 Ei", "5 Eier").
        const forms = item.unit === "stück" ? foodForms[item.name.toLocaleLowerCase("de")] : null;
        const amount = needed ?? item.quantity;
        return {
          ...item,
          name: forms && amount !== null ? forms[amount === 1 ? 0 : 1] : item.name,
          unit: counted && needed !== null ? counted[needed === 1 ? 0 : 1] : item.unit,
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
  // Each entry: translation key plus the German and English words that name the ingredient.
  // An optional third list names words that must not match (butter is not buttermilk).
  // A word matches a whole token, or the start of a token when it has four or more letters.
  const swaps = [
    ["studioSwapCream", ["sahne", "cream"]],
    ["studioSwapButtermilk", ["buttermilch", "buttermilk"]],
    ["studioSwapButter", ["butter"], ["buttermilch", "buttermilk"]],
    ["studioSwapEgg", ["ei", "eier", "egg", "eggs", "eigelb", "eiweiss", "eiweiß"]],
    ["studioSwapMilk", ["milch", "milk"]],
    ["studioSwapMushroom", ["champignon", "champignons", "mushroom", "mushrooms"]],
    ["studioSwapQuark", ["quark"]],
    ["studioSwapParmesan", ["parmesan"]],
    ["studioSwapFlour", ["mehl", "flour"]],
    ["studioSwapSugar", ["zucker", "sugar"]],
  ];
  function substitutions(ingredientName) {
    const tokens = String(ingredientName ?? "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((original) => ({ original, word: clean(original) }));
    const result = [];
    for (const [to, names, except = []] of swaps) {
      const hit = tokens.find(
        (t) =>
          !except.some((x) => t.word.startsWith(x)) &&
          names.some((k) => t.word === k || (k.length >= 4 && t.word.startsWith(k))),
      );
      // "from" is the word the user typed, so the English UI never shows a German match key.
      if (hit) result.push({ from: hit.original, to, warning: "studioSwapWarning" });
    }
    return result;
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
    DISCOVER_MINUTES,
    discoverMinutes,
  };
})();
