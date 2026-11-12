/** Servings scaler core: pure helpers first, then the card methods every surface calls. */

const SERVINGS_FACTOR_LADDER = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const SERVINGS_EPSILON = 1e-9;
const SERVINGS_KEEP_MODALS = [
  "recipe",
  "cook",
  "print",
  "recipe-to-list",
  "plan",
  "nutrition",
  "journal",
  "edit",
  "create-list",
];

/** The yield text without its leading number when that number is the yield quantity ("12 Muffins" gives "Muffins"). */
function yieldUnitText(recipe) {
  const text = String(recipe?.recipeYield ?? "").trim();
  const lead = text.match(/^(\d+(?:[.,]\d+)?)\s*/);
  if (lead && Number(lead[1].replace(",", ".")) === Number(recipe?.recipeYieldQuantity))
    return text.slice(lead[0].length).trim();
  return text;
}

/** Every value the stepper can reach, ascending. */
function servingsLadder(model) {
  if (model.mode === "factor") return SERVINGS_FACTOR_LADDER;
  const values = new Set([model.base, model.min]);
  for (let n = Math.ceil(model.min); n <= Math.floor(model.max); n += 1) values.add(n);
  return [...values].sort((a, b) => a - b);
}

/** Keeps a value inside the reachable range; values between two ladder steps stay as they are. */
function servingsClamp(model, value) {
  const ladder = servingsLadder(model);
  const number = Number(value);
  if (!Number.isFinite(number)) return model.base;
  return Math.min(ladder[ladder.length - 1], Math.max(ladder[0], number));
}

/**
 * A target and base with the same ratio and both at least 1, which is what the text scaler accepts
 * (it leaves a row alone when either value is below 1).
 */
function scaledPair(target, base) {
  const smallest = Math.min(target, base);
  const k = smallest < 1 ? 1 / smallest : 1;
  return [target * k, base * k];
}

export const servingsMethods = {
  /** The scale model of a recipe (mode, base, bounds, ingredient facts), or null without a recipe. */
  _servingsModel(recipe = this._detail) {
    if (!recipe) return null;
    const rows = asArray(recipe.recipeIngredient);
    const fromServings = AtelierStudio.recipeServings(recipe);
    const quantity = Number(recipe.recipeYieldQuantity);
    let mode = "factor",
      base = 1;
    if (typeof fromServings === "number") {
      mode = "servings";
      base = fromServings;
    } else if (quantity > 0) {
      mode = "yield";
      base = quantity;
    }
    const model = {
      mode,
      base,
      unit: mode === "yield" ? yieldUnitText(recipe) : "",
      hasIngredients: rows.length > 0,
      rowsAsWritten: rows.filter((row) => !(Number(row?.quantity) > 0) && ingredientName(row))
        .length,
      min: base < 1 ? base : 1,
      max: Math.max(base, Math.min(200, Math.max(20, Math.ceil(base * 10)))),
    };
    if (mode === "factor") {
      model.min = SERVINGS_FACTOR_LADDER[0];
      model.max = SERVINGS_FACTOR_LADDER[SERVINGS_FACTOR_LADDER.length - 1];
    }
    return model;
  },
  /** The amount the recipe is scaled to: the user's choice, else the session, the Discover count or the base. */
  _servingsTarget(recipe = this._detail) {
    const model = this._servingsModel(recipe);
    if (!model) return null;
    if (this._servings && this._servings.slug === recipe.slug) return this._servings.value;
    const session = this._studio?.family?.session;
    const sessionAmount = Number(session?.servings),
      sessionBase = Number(session?.servingsBase);
    if (session?.slug === recipe.slug && sessionAmount > 0 && sessionBase > 0)
      return servingsClamp(model, Number(((model.base * sessionAmount) / sessionBase).toFixed(6)));
    if (
      model.mode === "servings" &&
      this._discoverResults &&
      this._discoverSelected === recipe.slug &&
      Number(this._discoverDraft?.people) > 0
    )
      return servingsClamp(model, Number(this._discoverDraft.people));
    return model.base;
  },
  _servingsFactor(recipe = this._detail) {
    const model = this._servingsModel(recipe);
    return model ? this._servingsTarget(recipe) / model.base : 1;
  },
  _servingsScaled() {
    return Math.abs(this._servingsFactor() - 1) > SERVINGS_EPSILON;
  },
  /** The row text at the current amount; the written text when nothing is scaled. */
  _servingsRow(row, recipe = this._detail) {
    const model = this._servingsModel(recipe);
    if (!model || !this._servingsScaled()) return ingredientName(row);
    const [target, base] = scaledPair(this._servingsTarget(recipe), model.base);
    return AtelierStudio.scaleIngredient(row, target, base, this._language === "de" ? "de" : "en");
  },
  /** Display text of an amount: "4 Portionen", "24 Muffins" or "×1,5". */
  _servingsAmount(value, recipe = this._detail) {
    const model = this._servingsModel(recipe);
    if (!model) return "";
    const amount = value ?? this._servingsTarget(recipe);
    if (model.mode === "factor")
      return this.t("scalerFactorValue", { factor: this._localeNumber(Number(amount.toFixed(2))) });
    const unit = model.mode === "servings" ? this.tp("uiServing", amount) : model.unit;
    return [this._localeNumber(amount), unit].filter(Boolean).join(" ");
  },
  _servingsBaseAmount(recipe = this._detail) {
    const model = this._servingsModel(recipe);
    return model && model.mode !== "factor" ? this._servingsAmount(model.base, recipe) : "";
  },
  _servingsNoteHtml() {
    const model = this._servingsModel();
    if (!model || !this._servingsScaled()) return "";
    const target = this._servingsTarget();
    let text;
    if (model.mode === "factor")
      text = this.t("scalerNoteFactor", {
        factor: this._localeNumber(Number(this._servingsFactor().toFixed(2))),
      });
    else {
      const unitOf = (n) => (model.mode === "servings" ? this.tp("uiServing", n) : model.unit);
      text = this.t("uiScaleServingsNote", {
        target: this._localeNumber(target),
        base: this._localeNumber(model.base),
        targetUnit: unitOf(target),
        baseUnit: unitOf(model.base),
      });
    }
    return `<p class="studio-serving-note">${esc(text)}</p>`;
  },
  _servingsStepperHtml() {
    const model = this._servingsModel();
    if (!model || !model.hasIngredients) return "";
    const target = this._servingsTarget(),
      scaled = this._servingsScaled(),
      ladder = servingsLadder(model),
      factorMode = model.mode === "factor",
      servingsMode = model.mode === "servings";
    const label = this.t(
      servingsMode ? "servings" : factorMode ? "scalerFactorLabel" : "scalerYieldLabel",
    );
    const group = this.t(servingsMode ? "scalerGroupServings" : "scalerGroupAmount");
    const atLow = !ladder.some((n) => n < target - SERVINGS_EPSILON),
      atHigh = !ladder.some((n) => n > target + SERVINGS_EPSILON);
    const button = (direction, name, disabled, glyph) =>
      `<button type="button" data-action="servings-step" data-value="${direction}" aria-label="${esc(name)}" aria-describedby="atelier-servings-value"${disabled ? ' aria-disabled="true"' : ""}>${glyph}</button>`;
    const shown = factorMode
      ? esc(this._servingsAmount(target))
      : esc(this._localeNumber(target)) +
        (servingsMode || model.unit
          ? `<span class="servings-unit"> ${esc(servingsMode ? this.tp("uiServing", target) : model.unit)}</span>`
          : "");
    const people = Number(this._studio?.profile?.people);
    const actions = [];
    if (
      servingsMode &&
      Number.isInteger(people) &&
      people >= 1 &&
      people <= 20 &&
      Math.abs(people - target) > SERVINGS_EPSILON &&
      people >= model.min &&
      people <= model.max
    )
      actions.push(
        `<button type="button" class="text-action" data-action="servings-set" data-value="${people}">${esc(this.tp("scalerHousehold", people))}</button>`,
      );
    if (scaled)
      actions.push(
        `<button type="button" class="text-action" data-action="servings-set" data-value="${model.base}">${esc(this.t("scalerReset"))}</button>`,
      );
    return `<div class="servings-control" role="group" aria-label="${esc(group)}">
<div class="servings-copy"><span class="servings-label" id="atelier-servings-label">${esc(label)}</span>${scaled && !factorMode ? `<small class="servings-base">${esc(this.t("scalerBase", { amount: this._servingsBaseAmount() }))}</small>` : ""}</div>
<div class="studio-counter servings-counter">${button(-1, this.t(servingsMode ? "scalerFewerServing" : "scalerLess"), atLow, "−")}<output id="atelier-servings-value" aria-live="polite" aria-atomic="true">${shown}</output>${button(1, this.t(servingsMode ? "scalerMoreServing" : "scalerMore"), atHigh, "+")}</div>
${actions.length ? `<p class="servings-actions">${actions.join("")}</p>` : ""}</div>`;
  },
  /** Forget the amount unless the same recipe is only reloaded inside one of its own dialogs. */
  _servingsOnOpen(slug, previousModal) {
    if (!(slug === this._servings?.slug && SERVINGS_KEEP_MODALS.includes(previousModal)))
      this._servings = null;
  },
  _servingsSet(value, { source = "local", notify = true } = {}) {
    const recipe = this._detail,
      model = this._servingsModel(recipe);
    if (!model) return;
    const before = this._servingsTarget(recipe),
      next = servingsClamp(model, value);
    const seen = this._servings?.slug === recipe.slug ? this._servings.sessionSeen : undefined;
    this._servings = { slug: recipe.slug, value: next, source, sessionSeen: seen };
    if (notify && Math.abs(next - before) > SERVINGS_EPSILON) this._servingsDidChange?.(next);
    this._render();
  },
  _servingsStep(direction) {
    const model = this._servingsModel();
    if (!model) return;
    const current = this._servingsTarget(),
      ladder = servingsLadder(model);
    const next =
      direction > 0
        ? ladder.find((n) => n > current + SERVINGS_EPSILON)
        : ladder.findLast((n) => n < current - SERVINGS_EPSILON);
    if (next !== undefined) this._servingsSet(next);
  },
  /** Adopts the family session's amount for the open recipe. Returns true when it changed (caller renders). */
  _servingsFollowSession(session) {
    const recipe = this._detail,
      model = this._servingsModel(recipe);
    const amount = Number(session?.servings),
      sessionBase = Number(session?.servingsBase);
    if (
      !model ||
      !session ||
      session.slug !== recipe.slug ||
      !(amount > 0) ||
      !(sessionBase > 0) ||
      this._servingsWritePending === true
    )
      return false;
    const seen = this._servings?.slug === recipe.slug ? this._servings.sessionSeen : undefined;
    if (seen && seen[0] === amount && seen[1] === sessionBase) return false;
    this._servings = {
      slug: recipe.slug,
      value: servingsClamp(model, Number(((model.base * amount) / sessionBase).toFixed(6))),
      source: "session",
      sessionSeen: [amount, sessionBase],
    };
    return true;
  },
  _servingsSessionFields() {
    const model = this._servingsModel();
    if (!model || this._permissions.features?.session_servings !== true) return {};
    return {
      servings: Number(this._servingsTarget().toFixed(6)),
      servings_base: model.base,
    };
  },
  _servingsListPayload() {
    if (!this._servingsScaled() || this._permissions.features?.recipe_scale !== true) return {};
    return { scale: Number(this._servingsFactor().toFixed(6)) };
  },
  /** The recipe-to-list explanation: what is added, and what goes on the list as written. */
  _servingsListNoteHtml() {
    const model = this._servingsModel();
    if (!model || !this._servingsScaled()) return "";
    const line = (text) => `<p class="servings-list-note">${esc(text)}</p>`;
    const factor = this._localeNumber(Number(this._servingsFactor().toFixed(2)));
    if (this._permissions.features?.recipe_scale !== true)
      return line(
        model.mode === "factor"
          ? this.t("shoppingScaleUnsupportedFactor")
          : this.t("shoppingScaleUnsupported", { amount: this._servingsBaseAmount() }),
      );
    return (
      line(
        model.mode === "factor"
          ? this.t("shoppingAddsFactor", { factor })
          : this.t("shoppingAddsFor", { amount: this._servingsAmount() }),
      ) + (model.rowsAsWritten > 0 ? line(this.tp("shoppingAsWritten", model.rowsAsWritten)) : "")
    );
  },
  _servingsPrintContext() {
    const model = this._servingsModel();
    if (!model || !this._servingsScaled()) return null;
    return {
      mode: model.mode,
      amount: this._servingsAmount(),
      base: this._servingsBaseAmount(),
      row: (row) => this._servingsRow(row),
    };
  },
};
