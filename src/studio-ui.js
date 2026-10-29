/* Add kitchen workflows to the card while routing remote calls through the shared bridge client. */
const _atOriginalBody = MealieAtelierCard.prototype._body;
const _atOriginalRefresh = MealieAtelierCard.prototype._refresh;
const _atOriginalClick = MealieAtelierCard.prototype._handleClick;
const _atOriginalSubmit = MealieAtelierCard.prototype._handleSubmit;
const _atOriginalModal = MealieAtelierCard.prototype._modalHtml;
const _atOriginalOpenRecipe = MealieAtelierCard.prototype._openRecipe;
const _atOriginalTick = MealieAtelierCard.prototype._tickTimers;
const _atOriginalConnected = MealieAtelierCard.prototype.connectedCallback;
const _atOriginalDisconnected = MealieAtelierCard.prototype.disconnectedCallback;
const atDate = (d, locale = "en-US") => {
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ""
    : x.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};
const atQty = (n, locale = "en-US") =>
  n == null ? "?" : Number(n).toLocaleString(locale, { maximumFractionDigits: 1 });
const atInitially = () => ({
  revision: 0,
  profile: { people: 2, maxMinutes: 40, diets: [], exclude: [], quietHours: false },
  pantry: [],
  journal: {},
  family: { members: [], session: null },
});
// Core results carry translation keys; resolve them in the active locale.
const atMessage = (t, item) => t(item.key, item.values);
const atAisleKeys = {
  chilled: "studioAisleChilled",
  pantry: "studioAislePantry",
  spices: "studioAisleSpices",
  protein: "studioAisleProtein",
  produce: "studioAisleProduce",
};
function atGroup(rows) {
  return [...new Set(rows.map((x) => x.category))].map((k) => ({
    category: k,
    rows: rows.filter((x) => x.category === k),
  }));
}
Object.assign(MealieAtelierCard.prototype, {
  async _studioRefresh({ silent = false } = {}) {
    try {
      const v = await this._ws("studio_state");
      if (v && Number.isInteger(v.revision)) {
        const prev = this._studio?.revision;
        this._studio = v;
        this._journal = v.journal || {};
        if (
          this._modal === "cook" &&
          this._detail &&
          v.family?.session?.slug === this._detail.slug
        ) {
          const steps = asArray(this._detail.recipeInstructions);
          this._cookIndex = Math.min(
            Math.max(0, Number(v.family.session.step) || 0),
            Math.max(0, steps.length - 1),
          );
        }
        if (
          !silent ||
          (prev !== v.revision &&
            !this.shadowRoot.activeElement?.matches?.("input,textarea,select"))
        )
          this._render();
      }
    } catch (error) {
      this._studioError = error?.message || this.t("studioConnectionFailed");
      if (!silent) this._render();
    }
  },
  async _studioWrite(action, payload) {
    // The personal journal needs no write grant; only a read-only kitchen blocks it.
    const allowed = action === "journal_set" ? this._canJournal : this._permissions.can_write;
    if (!allowed) {
      this._error = this._noWriteGrant ? this.t("uiNoWriteGrant") : this.t("readOnlyHint");
      this._render();
      return false;
    }
    try {
      const next = await this._ws("studio_update", {
        action,
        payload,
        expected_revision: this._studio?.revision ?? 0,
      });
      this._studio = next;
      this._journal = next.journal || {};
      this._studioError = next.alarmWarnings?.join("; ") || "";
      this._render();
      return true;
    } catch (error) {
      this._studioError = error?.code
        ? this._errorText(error)
        : error?.message || this.t("studioSaveFailed");
      await this._studioRefresh();
      await this._recoverPermissions(error);
      return false;
    }
  },
  async _studioCatalog() {
    if (this._fullCatalog?.length) return this._fullCatalog;
    if (this._catalogLoading) return [];
    this._catalogLoading = true;
    this._catalogProgress = { loaded: 0, total: null };
    this._catalogLimited = false;
    this._render();
    try {
      const metadataRequest = this._ws("metadata").catch(() => null);
      const all = [];
      const pageSize = 60;
      const maxRecipes = 600;
      for (let page = 1; page <= Math.ceil(maxRecipes / pageSize); page++) {
        const data = await this._ws("recipes", { page, per_page: 60, search: "" });
        const items = asArray(data?.items);
        const total = Number(data?.total);
        if (Number.isFinite(total) && total >= 0) {
          this._catalogProgress.total = total;
          this._catalogTotal = total;
        }
        all.push(...items);
        this._catalogProgress.loaded = all.length;
        this._render();
        if (
          items.length < pageSize ||
          all.length >= maxRecipes ||
          (Number.isFinite(total) && all.length >= total)
        )
          break;
      }
      const metadata = await metadataRequest;
      this._studioCookbooks = AtelierStudio.supportedCookbooks(asArray(metadata?.cookbooks));
      const next = Array.from(new Map(all.map((x) => [x.slug, x])).values()).filter((x) => x.slug);
      const full = [];
      const batchSize = 8;
      for (let i = 0; i < next.length; i += batchSize) {
        const resolved = await Promise.allSettled(
          next.slice(i, i + batchSize).map((r) => this._ws("recipe", { slug: r.slug })),
        );
        resolved.forEach((v, j) => {
          if (v.status === "fulfilled") full.push(v.value);
          else full.push(next[i + j]);
        });
        this._catalogProgress.details = full.length;
        this._render();
      }
      this._fullCatalog = full;
      this._catalogLimited =
        this._catalogProgress.total !== null
          ? this._catalogProgress.total > all.length
          : all.length >= maxRecipes;
      this._studioError = "";
    } catch (error) {
      this._studioError = error?.message || this.t("studioAnalysisFailed");
    } finally {
      this._catalogLoading = false;
      this._catalogProgress = null;
      this._render();
    }
    return this._fullCatalog || [];
  },
  /** Bring the Kochinspo wizard back into view only when its top has scrolled out above. */
  _revealDiscover() {
    requestAnimationFrame(() => {
      const layout = this.shadowRoot.querySelector(".studio-discover-layout");
      // 72px clears Home Assistant's sticky header; a wizard still below it is left where it is.
      if (layout && layout.getBoundingClientRect().top < 72)
        layout.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  },
  _studioSuggestions() {
    return AtelierStudio.suggest(
      this._fullCatalog || asArray(this._data.recipes?.items),
      this._studio.profile,
      this._studio.pantry,
      this._studio.journal,
      this._studioCookbooks || [],
    );
  },
  _studioShell(title, lead, content, kicker = this.t("studioKicker")) {
    const progress = this._catalogProgress;
    const progressText = progress
      ? progress.details
        ? this.t("studioCatalogDetails", { loaded: progress.details, total: progress.loaded })
        : progress.total
          ? this.t("studioCatalogLoading", { loaded: progress.loaded, total: progress.total })
          : this.t("studioCatalogLoadingCount", { loaded: progress.loaded })
      : "";
    const limitCopy = `${this.t("studioCatalogLimit")}${this._catalogTotal ? ` ${this.t("studioCatalogTotal", { total: this._catalogTotal })}` : ""}`;
    return `${AtelierUI.pageHeader({ title, description: lead, kicker })}${this._studioError ? `<div class="studio-warning" role="status">${esc(this._studioError)}</div>` : ""}${this._catalogLoading ? `<div class="studio-warning" role="status" aria-live="polite">${esc(progressText || this.t("studioDetailsLoading"))}</div>` : ""}${this._catalogLimited ? `<p class="studio-muted">${esc(limitCopy)}</p>` : ""}${content}`;
  },
  _atelierDialog({
    title,
    body = "",
    kind = "confirm",
    confirmLabel = "",
    initialValue = "",
  } = {}) {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "at-premium-dialog";
      dlg.setAttribute("aria-labelledby", "at-dialog-title");
      dlg.setAttribute("aria-describedby", "at-dialog-description");
      const copy = String(body).slice(0, 2400);
      const input =
        kind === "prompt"
          ? `<label class="at-prompt-label">${esc(this.t("studioDialogPromptLabel"))}<input type="text" class="at-prompt-input" maxlength="160" value="${esc(initialValue)}" placeholder="${esc(this.t("studioDialogPromptPlaceholder"))}" required></label>`
          : "";
      dlg.innerHTML = `<form method="dialog" class="at-dialog-panel"><span class="eyebrow">${esc(this.t("studioDialogLabel"))}</span><h2 id="at-dialog-title">${esc(title || this.t("studioConfirm"))}</h2><p id="at-dialog-description">${esc(copy).replace(/\n/g, "<br>")}</p>${input}<div class="at-dialog-actions">${kind === "info" ? "" : `<button class="btn" type="submit" value="cancel" formnovalidate>${esc(this.t("studioCancel"))}</button>`}<button class="btn primary" type="submit" value="confirm">${esc(kind === "info" ? this.t("studioClose") : confirmLabel || this.t("studioConfirm"))}</button></div></form>`;
      const previous = this.shadowRoot.activeElement;
      const surface = this.shadowRoot.querySelector(".atelier");
      if (surface) {
        const current = getComputedStyle(surface);
        for (const token of [
          "--at-ink",
          "--at-sub",
          "--at-accent",
          "--at-accent-ink",
          "--at-line",
          "--at-surface",
          "--at-panel",
          "--at-panel2",
        ]) {
          const value = current.getPropertyValue(token);
          if (value) dlg.style.setProperty(token, value);
        }
      }
      this.shadowRoot.appendChild(dlg);
      dlg.addEventListener(
        "close",
        () => {
          const result = dlg.returnValue === "confirm";
          const value =
            kind === "prompt" && result ? dlg.querySelector("input")?.value.trim() || "" : result;
          dlg.remove();
          if (previous?.isConnected) previous.focus?.({ preventScroll: true });
          resolve(value);
        },
        { once: true },
      );
      try {
        dlg.showModal();
        if (input) dlg.querySelector("input")?.focus();
        else dlg.querySelector(".btn.primary")?.focus();
      } catch {
        dlg.remove();
        resolve(kind === "prompt" ? "" : false);
      }
    });
  },
  _studioDiagnosticsPanel() {
    const p = this._permissions || {},
      records = this._diagnostics || [];
    const display = records
      .map(
        (r) =>
          `<div class="studio-diagnostic-row"><span>${esc(r.name)}</span><span class="studio-diagnostic-status ${r.ok ? "ok" : "fail"}">${r.ok ? this.t("studioDiagnosticsReachable") : this.t("studioDiagnosticsCheck")}</span><small>${esc(r.detail || "")}</small></div>`,
      )
      .join("");
    return `<section class="studio-panel studio-diagnostics" aria-labelledby="atelier-system-title">
      ${AtelierUI.sectionHeading({ id: "atelier-system-title", kicker: this.t("studioDiagnosticsKicker"), title: this.t("studioDiagnosticsTitle"), description: this.t("studioDiagnosticsDescription") })}
      <div class="studio-actions"><button class="btn primary" data-action="studio-check-health" ${this._diagnosticsBusy ? "disabled" : ""}>${icon("refresh", 14)} ${this._diagnosticsBusy ? this.t("studioDiagnosticsRunning") : this.t("studioDiagnosticsCheck")}</button><button class="btn" data-action="studio-export">${icon("book", 14)} ${this.t("studioDiagnosticsExport")}</button></div>
      <div class="studio-diagnostic-grid" role="status" aria-live="polite">${display || `<p class="studio-muted">${esc(this.t("studioDiagnosticsEmpty"))}</p>`}</div>
      <p class="studio-muted">Status: ${p.can_manage ? this.t("studioDiagnosticsAdmin") : p.can_write ? this.t("studioDiagnosticsEdit") : this.t("studioDiagnosticsReadOnly")} · ${this.t("version")} ${esc(this._status?.version || "—")} · ${this.t("studioDiagnosticsBackup")}</p>
    </section>`;
  },
  async _studioDiagnostics() {
    if (this._diagnosticsBusy) return;
    this._diagnosticsBusy = true;
    this._diagnostics = [];
    this._render();
    const checks = [
      [this.t("studioBridge"), "status", {}],
      [this.t("recipes"), "recipes", { page: 1, per_page: 1, search: "" }],
      [this.t("shopping"), "shopping", {}],
      [
        this.t("mealplan"),
        "mealplan",
        { start: dateYmd(new Date()), end: dateYmd(addDays(new Date(), 6)) },
      ],
      [this.t("studioStorage"), "studio_state", {}],
    ];
    const results = [];
    for (const [name, type, args] of checks) {
      try {
        const result = await this._ws(type, args);
        const valid = result !== undefined && result !== null;
        results.push({
          name,
          ok: valid,
          detail: valid ? this.t("studioDiagnosticsReachable") : this.t("studioDiagnosticsNoData"),
        });
      } catch (error) {
        results.push({
          name,
          ok: false,
          detail: String(error?.message || error || this.t("studioDiagnosticsError")).slice(0, 140),
        });
      }
    }
    this._diagnostics = results;
    this._diagnosticsBusy = false;
    this._render();
    this._flash(
      results.every((x) => x.ok)
        ? this.t("studioDiagnosticsPassed")
        : this.t("studioDiagnosticsFailed", { count: results.filter((x) => !x.ok).length }),
    );
  },
  _studioExport() {
    try {
      const state = structuredClone(this._studio || {});
      const snapshot = {
        format: "mealie-atelier-studio-snapshot",
        schema: 1,
        exported_at: new Date().toISOString(),
        note: this.t("studioExportNote"),
        state,
      };
      const data = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const address = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = address;
      link.download = `mealie-atelier-profil-${dateYmd(new Date())}.json`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(address), 1000);
      this._flash(this.t("studioExportDownloaded"));
    } catch (error) {
      this._flash(this.t("studioExportFailed", { error: String(error?.message || error) }));
    }
  },
  _studioOverview() {
    const h = new Date().getHours();
    const morning = h < 11,
      evening = h >= 17;
    const greeting = morning
      ? this.t("studioDailyMorning")
      : evening
        ? this.t("studioDailyEvening")
        : this.t("studioDailyAnytime");
    const soon = this._studio.pantry.filter(
      (p) => p.expires && (Date.parse(p.expires + "T12:00:00Z") - Date.now()) / 86400000 < 4,
    ).length;
    return `<section class="studio-daily ds-surface"><div><span class="eyebrow">${this.t("studioDailyEyebrow")} · ${morning ? this.t("studioDailyMorningLabel") : evening ? this.t("studioDailyEveningLabel") : this.t("studioDailyOverviewLabel")}</span><h2>${esc(greeting)}</h2><p>${soon ? this.t(soon === 1 ? "studioDailyExpiringOne" : "studioDailyExpiring", { count: soon }) : this.t("studioDailyDiscover")}</p></div><div class="studio-daily-actions"><button class="btn primary" data-action="nav" data-value="discover">${icon("spark", 15)} ${this.t("discover")}</button><button class="btn" data-action="nav" data-value="pantry">${icon("cart", 15)} ${this.t("studioDailyPantry")}</button></div></section>`;
  },
  _studioDiscover() {
    const p = this._studio.profile || {};
    const d =
      this._discoverDraft ||
      (this._discoverDraft = {
        step: 0,
        mealStyle:
          p.mealStyle ||
          (p.diets?.includes("vegan")
            ? "vegan"
            : p.diets?.includes("vegetarian")
              ? "vegetarian"
              : "any"),
        cookbooks: [...(p.cookbooks || [])],
        kidFriendly: p.kidFriendly === true,
        people: Number(p.people) || 2,
        maxMinutes: Number(p.maxMinutes) || 40,
        usePantry: p.usePantry !== false,
        exclude: [...(p.exclude || [])],
      });
    const choices = [
      ["any", this.t("studioDiscoverAny")],
      ["vegetarian", this.t("studioDiscoverVegetarian")],
      ["vegan", this.t("studioDiscoverVegan")],
      ["meat", this.t("studioDiscoverMeat")],
      ["fish", this.t("studioDiscoverFish")],
    ];
    const cookbooks = this._studioCookbooks || [];
    const ingredients = [
      ["Pilze", this.t("ingredientMushrooms")],
      ["Oliven", this.t("ingredientOlives")],
      ["Koriander", this.t("ingredientCilantro")],
      ["Paprika", this.t("ingredientBellPepper")],
      ["Schärfe", this.t("ingredientHeat")],
    ];
    const selected = this._discoverResults
      ? this._discoverCandidates ||
        AtelierStudio.suggest(
          this._fullCatalog || [],
          { ...d, diets: [] },
          this._studio.pantry,
          this._studio.journal,
        )
      : [];
    const hero = selected.find((x) => x.slug === this._discoverSelected) || selected[0];
    const heroBooks = hero
      ? cookbooks
          .filter(
            (book) =>
              d.cookbooks.includes(book.slug) && AtelierStudio.matchesCookbook(hero.recipe, book),
          )
          .map((book) => book.name)
      : [];
    const alternatives = selected.filter((x) => x.slug !== hero?.slug).slice(0, 3);
    const upcoming = this._weekProposal || [];
    const step = Math.max(0, Math.min(3, Number(d.step) || 0));
    const stepName = [
      this.t("studioDiscoverStep0"),
      this.t("studioDiscoverStep1"),
      this.t("studioDiscoverStep2"),
      this.t("studioDiscoverStep3"),
    ][step];
    const isSelected = (key, value) =>
      key === "cookbooks" && value === "all"
        ? !d.cookbooks.length
        : Array.isArray(d[key])
          ? d[key].includes(value)
          : d[key] === value;
    const selectedClass = (key, value) => (isSelected(key, value) ? " is-selected" : "");
    const chip = (key, value, label) =>
      `<button class="studio-choice${selectedClass(key, value)}" type="button" data-action="studio-discover-choice" data-key="${key}" data-value="${value}" aria-pressed="${isSelected(key, value)}">${label}</button>`;
    const lead = this.t("studioDiscoverLead");
    const flow = `<div class="studio-discover-layout ${this._discoverResults ? "has-results" : ""}">
      ${
        !this._discoverResults
          ? `${AtelierUI.surfaceStart()}<div class="studio-discover-top"><span class="eyebrow">${this.t("studioDiscoverCompass")}</span><span class="studio-discover-stepcount">0${step + 1} <i>/</i> 04</span></div><div class="studio-discover-progress" role="progressbar" aria-label="${this.t("studioDiscoverStepProgress", { step: step + 1 })}" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${step + 1}"><span style="--discover-progress:${((step + 1) / 4) * 100}%"></span></div>
      <div class="studio-discover-prompt"><h2>${stepName}</h2><p>${[this.t("studioDiscoverQuestion0"), this.t("studioDiscoverQuestion1"), this.t("studioDiscoverQuestion2"), this.t("studioDiscoverQuestion3")][step]}</p></div>
      ${step === 0 ? `<div class="studio-choice-grid" role="group" aria-label="${this.t("studioDiscoverDiet")}">${choices.map(([value, label]) => chip("mealStyle", value, label)).join("")}</div><p class="studio-muted studio-discover-note">${this.t("studioDiscoverDietHint")}</p>` : ""}
      ${step === 1 ? `<div class="studio-discover-label-block"><span class="studio-discover-label">${this.t("studioDiscoverCookbooks")}</span><small>${this.t("studioDiscoverCookbooksHint")}</small></div><div class="studio-choice-grid studio-cookbook-choices" role="group" aria-label="${this.t("studioDiscoverCookbooksAria")}">${chip("cookbooks", "all", this.t("studioDiscoverAllRecipes"))}${cookbooks.map((book) => chip("cookbooks", book.slug, esc(book.name))).join("")}</div>${!cookbooks.length ? `<p class="studio-muted studio-discover-note">${this.t("studioDiscoverNoCookbooks")}</p>` : ""}` : ""}
      ${
        step === 2
          ? `<div class="studio-discover-household"><div class="studio-discover-counter"><div><span class="studio-discover-label">${this.t("studioDiscoverPeople")}</span><small>${this.t("studioDiscoverPeopleHint")}</small></div><div class="studio-counter"><button type="button" data-action="studio-discover-choice" data-key="people" data-value="-1" aria-label="${this.t("studioDiscoverOneLess")}">−</button><output aria-live="polite">${d.people}</output><button type="button" data-action="studio-discover-choice" data-key="people" data-value="1" aria-label="${this.t("studioDiscoverOneMore")}">+</button></div></div><div class="studio-discover-counter"><div><span class="studio-discover-label">${this.t("studioDiscoverKidFriendly")}</span><small>${this.t("studioDiscoverMild")}</small></div><div class="studio-choice-grid studio-choice-grid--compact">${chip("kidFriendly", false, this.t("studioDiscoverAnyPreference"))}${chip("kidFriendly", true, this.t("studioDiscoverWithKids"))}</div></div></div><div class="studio-choice-grid studio-time-choices" role="group" aria-label="${this.t("studioDiscoverTime")}">${[
              [20, "20 min"],
              [35, "35 min"],
              [50, "50 min"],
              [80, this.t("studioDiscoverRelaxed")],
            ]
              .map(([value, label]) => chip("maxMinutes", value, label))
              .join("")}</div>`
          : ""
      }
      ${step === 3 ? `<div class="studio-discover-preferences"><div class="studio-choice-grid studio-choice-grid--compact" role="group" aria-label="${this.t("studioDiscoverPantry")}">${chip("usePantry", true, this.t("studioDiscoverUsePantry"))}${chip("usePantry", false, this.t("studioDiscoverNoPreference"))}</div><div class="studio-discover-label-block"><span class="studio-discover-label">${this.t("studioDiscoverExclude")}</span><small>${this.t("studioDiscoverOptional")}</small></div><div class="studio-choice-grid studio-choice-grid--compact studio-exclude-choices">${ingredients.map(([value, label]) => chip("exclude", value, value === "Schärfe" ? "🌶️ " + label : label)).join("")}</div></div><p class="studio-muted studio-discover-note">${this.t("studioDiscoverIngredientHint")}</p>` : ""}
      <div class="studio-discover-actions">${step > 0 ? `<button class="btn" data-action="studio-discover-back">${this.t("studioDiscoverBack")}</button>` : ""}<button class="btn primary" data-action="studio-discover-next" ${this._catalogLoading ? "disabled" : ""}>${step < 3 ? this.t("studioDiscoverNext") : this.t("studioDiscoverFind")} ${icon(step < 3 ? "arrow" : "spark", 15)}</button></div></section>`
          : `${AtelierUI.surfaceStart()}<div class="studio-discover-result-head"><div><span class="eyebrow">${this.t("studioDiscoverResult")}</span><h2>${this.t("studioDiscoverResultTitle")}</h2></div><button class="btn tiny" data-action="studio-discover-edit">${icon("edit", 14)} ${this.t("studioDiscoverEdit")}</button></div>
      ${
        hero
          ? `<article class="studio-discover-hero"><div class="studio-discover-hero-photo">${recipeImage(hero.recipe)}<span class="studio-discover-photo-label">${hero.timeLabel || this.t("studioDiscoverTimeOpen")} <i>·</i> ${hero.people} ${hero.people === 1 ? this.t("studioDiscoverPerson") : this.t("studioDiscoverPeoplePlural")}</span></div><div class="studio-discover-hero-copy"><span class="studio-discover-match">${icon("spark", 13)} ${heroBooks.length ? this.t("studioDiscoverFromCookbooks") : this.t("studioDiscoverFromRecipes")}</span><h3>${esc(hero.name)}</h3>${heroBooks.length ? `<p class="studio-discover-book-match">${heroBooks.map(esc).join(" · ")}</p>` : ""}<div class="studio-discover-meta"><span>${icon("clock", 14)} ${esc(hero.timeLabel || this.t("studioDiscoverTimeOpen"))}</span><span>${icon("utensils", 14)} ${hero.servings ? this.t("studioDiscoverRecipeBase", { servings: hero.servings }) : this.t("studioDiscoverForPeople", { people: hero.people })}</span></div><p>${esc(
              hero.reasons
                .slice(0, 3)
                .map((r) => this.t(r.key, r.values))
                .join(" · ") || this.t("studioDiscoverGoodIdea"),
            )}</p><div class="studio-discover-hero-actions"><button class="btn primary" data-action="open-recipe" data-value="${esc(hero.slug)}">${this.t("studioDiscoverOpenRecipe")} ${icon("arrow", 15)}</button>${selected.length > 1 ? `<button class="btn" data-action="studio-discover-next-idea">${this.t("studioDiscoverAnother")} ${icon("refresh", 14)}</button>` : ""}</div></div></article>
      ${alternatives.length ? `<div class="studio-discover-alternatives"><div class="studio-discover-alt-heading"><span class="eyebrow">${this.t("studioDiscoverAlsoGood")}</span><small>${this.t("studioDiscoverMoreIdeas", { count: alternatives.length })}</small></div><div class="studio-discover-alt-grid">${alternatives.map((x) => `<button class="studio-discover-alt" data-action="studio-discover-pick" data-value="${esc(x.slug)}"><span class="studio-discover-alt-photo">${recipeImage(x.recipe)}</span><span class="studio-discover-alt-copy"><strong>${esc(x.name)}</strong><small>${esc(x.timeLabel || this.t("studioDiscoverTimeOpen"))}${x.servings ? ` · ${x.servings} ${this.t("servings")}` : ""}</small></span>${icon("chevron", 15)}</button>`).join("")}</div></div>` : ""}</article>`
          : `<div class="studio-discover-empty"><span>✦</span><h3>${this.t("studioDiscoverEmptyTitle")}</h3><p>${this.t("studioDiscoverEmpty")}</p><button class="btn" data-action="studio-discover-edit">${this.t("studioDiscoverAdjust")}</button><button class="btn" data-action="studio-analyze" ${this._catalogLoading ? "disabled" : ""}>${icon("refresh", 14)} ${this.t("studioDiscoverReload")}</button></div>`
      }</section>`
      }
      </div>`;
    const planner = this._discoverResults
      ? `${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioPlanKicker")}</span><h2>${this.t("studioPlanTitle")}</h2><p>${this.t("studioPlanDescription")}</p></div>
      <div class="studio-actions"><button class="btn primary" data-action="studio-plan-preview" ${this._catalogLoading ? "disabled" : ""}>${icon("spark", 15)} ${this.t("studioPlanPreview")}</button>${upcoming.length && this._permissions.can_write ? `<button class="btn" data-action="studio-plan-commit">${icon("check", 15)} ${this.t("studioPlanCommit")}</button>` : ""}</div>
      ${upcoming.length ? `<div class="studio-plan-list">${upcoming.map((x) => `<div class="studio-plan-row"><span><strong>${esc(atDate(x.date, this._locale))}</strong> <small>${x.meal_type === "lunch" ? this.t("studioLunch") : this.t("studioDinner")}</small></span><div><b>${esc(x.leftovers ? this.t("studioLeftoversName", { name: x.name }) : x.name)}</b><p>${esc(x.reasons.map((r) => this.t(r.key, r.values)).join(" · "))}</p></div></div>`).join("")}</div><p class="studio-muted">${this.t("studioPlanOnlyMissing")}</p>` : `<p class="studio-muted">${this.t("studioPlanCreatePreview")}</p>`}</section>`
      : "";
    return this._studioShell(this.t("studioDiscoverTitle"), lead, `${flow}${planner}`);
  },
  _studioPantry() {
    const p = this._studio.pantry || [],
      needs = this._grocery || [];
    return this._studioShell(
      this.t("studioPantryTitle"),
      this.t("studioPantryLead"),
      `
      <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioPantryKicker")}</span><h2>${this.t("studioPantryQuestion")}</h2></div>
      ${
        !this._permissions.can_write
          ? ""
          : `<form class="studio-form" data-form="studio-pantry"><div class="studio-formline"><label>${this.t("studioIngredient")}<input name="name" required maxlength="120" placeholder="${this.t("ingredientTomatoes")}"></label><label>${this.t("studioAmount")}<input type="number" name="amount" min="0" max="100000" step="0.1" required></label></div>
      <div class="studio-formline"><label>${this.t("studioUnit")}<select name="unit"><option value="g">${this.t("studioGrams")}</option><option value="ml">${this.t("studioMilliliters")}</option><option value="stück">${this.t("studioPieces")}</option></select></label><label>${this.t("studioBestBefore")}<input type="date" name="expires"></label></div>
      <label class="studio-inline"><input type="checkbox" name="staple"><span>${this.t("studioStaple")}</span></label>
      <button class="btn primary" type="submit">${icon("plus", 15)} ${this.t("studioAdd")}</button></form>`
      }
      <div class="studio-pantry-list">${p.map((x) => `<div class="studio-pantry-row"><div><strong>${esc(x.name)}</strong><small>${esc(atQty(x.amount, this._locale))} ${esc(x.unit)} ${x.staple ? "· " + this.t("studioStapleLabel") : ""} ${x.expires ? "· " + this.t("studioUntil", { date: atDate(x.expires, this._locale) }) : ""}</small></div>${this._permissions.can_write ? `<div><button class="btn tiny" data-action="studio-pantry-edit" data-id="${esc(x.id)}">${this.t("edit")}</button><button class="icon-btn" data-action="studio-pantry-delete" data-id="${esc(x.id)}" aria-label="${this.t("studioRemove")}">${icon("close", 14)}</button></div>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("studioPantryEmpty")}</p>`}</div></section>
      ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("studioGroceryKicker")}</span><h2>${this.t("studioGroceryTitle")}</h2><p>${this.t("studioGroceryDescription")}</p></div>
      <div class="studio-actions"><button class="btn primary" data-action="studio-grocery-build">${icon("refresh", 14)} ${this.t("studioGroceryCalculate")}</button>${needs.length && this._permissions.can_write ? `<button class="btn" data-action="studio-grocery-send">${icon("cart", 14)} ${this.t("studioGrocerySend")}</button>` : ""}</div>
      ${
        needs.length
          ? atGroup(needs)
              .map(
                (g) =>
                  `<div class="studio-group"><h3>${esc(this.t(atAisleKeys[g.category] || "studioAisleProduce"))}</h3>${g.rows.map((x) => `<div class="studio-grocery-line"><span>${esc(x.name)}</span><strong>${x.needed == null ? this.t("studioQuantityCheck") : esc(atQty(x.needed, this._locale)) + " " + esc(x.unit)}${x.uncertain ? " ⚠" : ""}</strong></div>`).join("")}</div>`,
              )
              .join("")
          : `<p class="studio-muted">${this.t("studioGroceryPreview")}</p>`
      }
      <p class="studio-muted">${this.t("studioUnclearUnits")}</p></section></div>`,
    );
  },
  _studioFamily() {
    const family = this._studio.family || { members: [], session: null },
      session = family.session;
    const people = family.members || [];
    const kid = Boolean(this._kidView);
    return this._studioShell(
      this.t("familyTitle"),
      this.t("familyLead"),
      `
     <div class="studio-actions"><button class="btn ${kid ? "primary" : ""}" data-action="studio-kid-toggle">${kid ? this.t("familyAdultMode") : this.t("familyHelperMode")}</button><button class="btn" data-action="studio-sync">${icon("refresh", 14)} ${this.t("familySync")}</button></div>
     <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("familyTeam")}</span><h2>${this.t("familyWhoHelps")}</h2></div>
     ${!kid && this._permissions.can_manage ? `<form data-form="studio-member" class="studio-form"><label>${this.t("familyName")}<input name="name" required maxlength="60" placeholder="${this.t("familyName")}"></label><label class="studio-inline"><input type="checkbox" name="child"><span>${this.t("familyChild")}</span></label><button class="btn" type="submit">${icon("plus", 14)} ${this.t("familyAddMember")}</button></form>` : ""}
     <div class="studio-member-list">${people.map((x) => `<div class="studio-member"><span>${icon("utensils", 17)} ${esc(x.name)} ${x.child ? `<small>${this.t("familyHelper")}</small>` : ""}</span>${!kid && this._permissions.can_manage ? `<button class="icon-btn" data-action="studio-member-remove" data-id="${esc(x.id)}" aria-label="${this.t("familyRemoveMember")}">${icon("close", 14)}</button>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("familyNoMembers")}</p>`}</div></section>
     ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("familySession")}</span><h2>${esc(session?.name || this.t("familyNoSession"))}</h2></div>
     ${
       session
         ? `<p class="studio-step-badge">${this.t("familyStep", { step: session.step + 1, date: atDate(session.started, this._locale) })}</p><div class="studio-actions">${!kid && this._permissions.can_write ? `<button class="btn" data-action="studio-session-prev" ${session.step <= 0 ? "disabled" : ""}>${this.t("familyBack")}</button><button class="btn primary" data-action="studio-session-next">${this.t("familyNext")}</button><button class="btn" data-action="studio-session-end">${this.t("familyEnd")}</button>` : ""}<button class="btn" data-action="studio-session-open">${this.t("familyOpenCook")}</button></div>
     <h3>${this.t("familyTimers")}</h3><div>${session.timers.map((x) => `<div class="studio-timer-row"><span>${esc(x.name)}</span><b data-shared-timer="${esc(x.id)}">${esc(Math.max(0, Math.ceil((x.deadline - Date.now()) / 60000)))} ${this.t("studioMinutesShort")}</b>${!kid && this._permissions.can_write ? `<button class="icon-btn" data-action="studio-timer-remove" data-id="${esc(x.id)}" aria-label="${this.t("studioRemove")}">${icon("close", 14)}</button>` : ""}</div>`).join("") || `<p class="studio-muted">${this.t("familyNoTimers")}</p>`}</div>
     ${!kid && this._permissions.can_write ? `<form class="studio-form studio-formline" data-form="studio-timer"><label>${this.t("familyTimerName")}<input name="name" value="${this.t("studioOven")}" maxlength="70" required></label><label>${this.t("familyMinutes")}<input type="number" name="minutes" value="10" min="1" max="240" required></label><button class="btn" type="submit">${this.t("familySetTimer")}</button></form>` : ""}
     <h3>${this.t("familyTasks")}</h3>${session.tasks.map((t) => `<div class="studio-task"><button type="button" class="studio-check ${t.done ? "done" : ""}" role="checkbox" aria-checked="${t.done ? "true" : "false"}" aria-label="${esc(this.t(t.done ? "familyMarkOpen" : "familyMarkDone", { task: t.text }))}" data-action="studio-task-done" data-id="${esc(t.id)}" ${this._permissions.can_write ? "" : 'disabled aria-disabled="true"'}>${icon("check", 16)}</button><span>${esc(t.text)}</span><small>${esc(people.find((x) => x.id === t.memberId)?.name || "")}</small></div>`).join("") || `<p class="studio-muted">${this.t("familyNoTasks")}</p>`}
     ${!kid && this._permissions.can_manage && people.length ? `<form class="studio-form" data-form="studio-task"><label>${this.t("familyTask")}<input name="text" maxlength="300" required placeholder="${this.t("familyTaskPlaceholder")}"></label><label>${this.t("familyAssign")}<select name="memberId">${people.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label class="studio-inline"><input type="checkbox" name="adultApproved"><span>${this.t("familyApproval")}</span></label><button class="btn" type="submit">${this.t("familyAssignTask")}</button></form>` : ""}
     <p class="studio-muted">${this.t("familySafety")}</p>`
         : `<p class="studio-muted">${this.t("familyStartHint")}</p><button class="btn primary" data-action="nav" data-value="recipes">${this.t("familyBrowse")}</button>`
     }</section></div>`,
    );
  },
  _studioCookbook() {
    const candidates = this._fullCatalog || asArray(this._data.recipes?.items),
      selected = this._bookSelected || new Set();
    return this._studioShell(
      this.t("cookbookTitle"),
      this.t("cookbookLead"),
      `
      <div class="studio-grid studio-grid-main ds-grid ds-grid--split">${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("cookbookSelectKicker")}</span><h2>${this.t("cookbookCollection")}</h2></div>
      <div class="studio-actions"><button class="btn" data-action="studio-analyze">${icon("refresh", 14)} ${this.t("cookbookLoad")}</button><button class="btn" data-action="studio-book-all">${this.t("cookbookSelectAll")}</button><button class="btn" data-action="studio-book-clear">${this.t("cookbookClear")}</button></div>
      <div class="studio-book-list">${
        candidates
          .slice(0, 120)
          .map(
            (r) =>
              `<label class="studio-book-row"><input type="checkbox" data-book="${esc(r.slug)}" ${selected.has(r.slug) ? "checked" : ""}><span>${esc(r.name)}</span></label>`,
          )
          .join("") ||
        AtelierUI.empty({ title: this.t("cookbookEmpty"), description: this.t("cookbookLoadHint") })
      }</div></section>
      ${AtelierUI.surfaceStart()}<div class="studio-head ds-surface-header"><span class="eyebrow">${this.t("cookbookBookKicker")}</span><h2>${this.t("cookbookSelected", { count: selected.size })}</h2></div>
      <form class="studio-form" data-form="studio-book"><label>${this.t("cookbookTitleLabel")}<input name="title" maxlength="100" value="${this.t("cookbookTitleDefault")}" required></label><label>${this.t("cookbookSubtitleLabel")}<input name="subtitle" maxlength="160" value="${this.t("cookbookSubtitleDefault")}"></label>
      <label class="studio-inline"><input type="checkbox" name="photos"> ${this.t("cookbookPhotos")}</label>
      <button class="btn primary" type="submit" ${!selected.size ? "disabled" : ""}>${icon("print", 15)} ${this.t("cookbookPrint")}</button></form>
      <p class="studio-muted">${this.t("cookbookPrintHint")}</p></section></div>`,
    );
  },
  async _studioGenerateShopping() {
    if (!this._fullCatalog?.length) await this._studioCatalog();
    const bySlug = new Map((this._fullCatalog || []).map((x) => [x.slug, x]));
    const dates = asArray(this._data.mealplan);
    const recipes = [];
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
      const r = bySlug.get(e.recipe?.slug) || e.recipe;
      if (!r?.recipeIngredient?.length) continue;
      // A matching next-day lunch with >=2 household portions may be leftovers.
      // Do not double-purchase ingredients for that likely leftover serving.
      const prev = new Date(e.date + "T12:00:00");
      prev.setDate(prev.getDate() - 1);
      const prevDate = dateYmd(prev);
      const likelyLeftover =
        e.entryType === "lunch" &&
        Number(r.recipeServings) >= Number(this._studio.profile.people || 2) * 2 &&
        sorted.some(
          (x) => x.date === prevDate && x.entryType === "dinner" && x.recipe?.slug === r.slug,
        );
      if (!likelyLeftover) recipes.push(r);
    }
    this._grocery = AtelierStudio.shoppingNeeds(recipes, this._studio.pantry, this._studio.profile);
    this._view = "pantry";
    this._render();
    if (!recipes.length) this._flash(this.t("studioNoPlannedIngredients"));
  },
  async _studioCommitWeek() {
    if (!this._weekProposal?.length || !this._permissions.can_write) return;
    if (
      !(await this._atelierDialog({
        title: this.t("studioWeekConfirmTitle"),
        body: this.t("studioWeekConfirmBody", { count: this._weekProposal.length }),
        confirmLabel: this.t("studioWeekConfirmAction"),
      }))
    )
      return;
    const proposed = this._weekProposal.slice();
    let success = 0,
      refused = null,
      failed = [];
    for (const entry of proposed) {
      try {
        await this._ws("mutate", {
          action: "mealplan_add",
          payload: { date: entry.date, meal_type: entry.meal_type, recipe_id: entry.recipe_id },
        });
        success++;
      } catch (error) {
        failed.push(`${entry.date}: ${this._errorText(error)}`);
        refused ||= error;
      }
    }
    await this._recoverPermissions(refused);
    this._weekProposal = failed.length
      ? proposed.filter((x) => failed.some((f) => f.startsWith(x.date + ":")))
      : [];
    await this._loadMealplan();
    this._flash(
      `${this.t("studioWeekSuccess", { count: success })}${failed.length ? " " + this.t("studioWeekFailure", { errors: failed.join("; ") }) : ""}`,
    );
  },
  async _studioSendGroceries() {
    const items = this._grocery || [];
    if (!items.length) return;
    const list = this._activeList || String(this._data.shopping?.lists?.[0]?.id || "");
    if (!list) {
      this._flash(this.t("studioCreateShoppingListFirst"));
      return;
    }
    if (
      !(await this._atelierDialog({
        title: this.t("studioShoppingTransferTitle"),
        body: this.t("studioShoppingTransferBody", { count: items.length }),
        confirmLabel: this.t("studioShoppingTransferConfirm"),
      }))
    )
      return;
    let count = 0,
      refused = null;
    const errors = [];
    for (const item of items) {
      const note =
        `${item.needed ?? "?"} ${item.unit || ""} ${item.name}${item.uncertain ? " (" + this.t("studioShoppingUncertain") + ")" : ""}`
          .trim()
          .slice(0, 250);
      try {
        await this._ws("mutate", { action: "shopping_add", payload: { list_id: list, note } });
        count++;
      } catch (err) {
        errors.push(item.name);
        refused ||= err;
      }
    }
    await this._recoverPermissions(refused);
    await this._loadShopping();
    this._flash(
      `${this.t("studioShoppingSuccess", { count })}${errors.length ? " " + this.t("studioShoppingFailure", { items: errors.join(", ") }) : ""}`,
    );
  },
  async _studioPrintBook({ title, subtitle, photos }) {
    const popup = window.open("", "_blank");
    if (!popup) {
      this._flash(this.t("studioPopupBlocked"));
      return;
    }
    popup.document.write(
      `<!doctype html><title>${esc(this.t("printDocumentTitle"))}</title><p>${esc(this.t("printPreparing"))}</p>`,
    );
    const chosen = [...(this._bookSelected || [])];
    const from = this._fullCatalog || [];
    const results = [],
      skipped = [];
    for (const slug of chosen.slice(0, 120)) {
      let recipe = from.find((x) => x.slug === slug);
      if (!recipe?.recipeInstructions) {
        try {
          recipe = await this._ws("recipe", { slug });
        } catch {
          // Keep processing the remaining recipes and report the skipped ones afterwards.
          skipped.push(recipe?.name || slug);
          recipe = null;
        }
      }
      if (recipe) results.push(recipe);
    }
    if (skipped.length)
      this._flash(
        this.t("studioRecipeFetchFailed", { count: skipped.length, names: skipped.join(", ") }),
        "error",
      );
    const toc = results
      .map((r, i) => `<li><span>${esc(r.name)}</span><b>${i + 1}</b></li>`)
      .join("");
    const chapters = results
      .map(
        (r, i) =>
          `<article class="chapter"><span class="eyebrow">${esc(this.t("printRecipe", { number: String(i + 1).padStart(2, "0"), total: results.length }))}</span><h2>${esc(r.name)}</h2>${photos && imageOk(r.imageUrl) ? `<img class="chapter-image" src="${esc(imageOk(r.imageUrl))}" alt="">` : ""}<div class="meta">${r.recipe?.totalTime ? esc(AtelierStudio.formatTime(r.recipe.totalTime, this._language)) + " · " : ""}${esc(AtelierStudio.recipeServings(r) ? this.t("printServings", { count: AtelierStudio.recipeServings(r) }) : r.recipeYieldQuantity && r.recipeYield ? `${r.recipeYieldQuantity} ${r.recipeYield}` : "—")}</div><div class="cols"><section><h3>${this.t("printIngredients")}</h3>${asArray(
            r.recipeIngredient,
          )
            .map(
              (x) => `<div class="ingredient">□ &nbsp; ${esc(AtelierStudio.ingredient(x))}</div>`,
            )
            .join("")}</section><section><h3>${this.t("printPreparation")}</h3>${asArray(
            r.recipeInstructions,
          )
            .map(
              (x, j) =>
                `<p class="method"><b>${String(j + 1).padStart(2, "0")}</b>${esc(instructionText(x))}</p>`,
            )
            .join("")}</section></div></article>`,
      )
      .join("");
    const html = `<!doctype html><html lang="${esc(this._locale || "en")}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#e9ece9;color:#26382f;font:12px/1.7 Arial,sans-serif}.toolbar{position:sticky;top:0;background:#1b3025;padding:14px;text-align:center;color:#fff}.toolbar button{padding:12px 23px;border:0;border-radius:9px;background:#adcfb7;font-weight:700;cursor:pointer}.page,.chapter{width:210mm;min-height:297mm;background:#fff;margin:20px auto;padding:19mm 18mm;box-shadow:0 7px 30px #0002}.cover{display:flex;flex-direction:column;justify-content:space-between;background:#203c2c;color:#fff}.cover .kicker{letter-spacing:4px;color:#b0d0b6;font-size:12px}.cover h1{font:normal 68px/1.05 Georgia,serif;max-width:130mm}.cover .subtitle{font-size:17px;color:#d3e2d3}.toc h2,.chapter h2{font:normal 38px/1.15 Georgia,serif;margin:15px 0 28px}.toc li{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #d8e2d9;gap:10px}.toc ul{padding:0;list-style:none}.eyebrow,h3{letter-spacing:2px;font-size:10px;font-weight:800;color:#618772}.chapter-image{width:100%;max-height:80mm;object-fit:cover;display:block;margin:10mm 0}.meta{color:#758578;margin-bottom:26px}.cols{display:grid;grid-template-columns:37% 1fr;gap:28px}.ingredient{padding:7px 0;border-bottom:1px solid #e2e9e3;break-inside:avoid}.method{display:grid;grid-template-columns:23px 1fr;gap:10px;break-inside:avoid;margin:0 0 18px}.method b{font:normal 22px Georgia,serif;color:#7da48a}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}.toolbar{display:none}.page,.chapter{box-shadow:none;margin:0;break-after:page;page-break-after:always;width:auto;min-height:297mm}.chapter:last-child{break-after:auto}.cover{background:#fff!important;color:#203c2c!important;border:1mm solid #203c2c}.cover .kicker{color:#486d55!important}.cover .subtitle,.cover small{color:#304339!important}}
      </style></head><body><nav class="toolbar"><button onclick="window.print()">${this.t("printSavePdf")}</button></nav><section class="page cover"><div class="kicker">MEALIE ATELIER · ${this.t("printCollection")}</div><div><h1>${esc(title)}</h1><p class="subtitle">${esc(subtitle)}</p></div><small>${this.t("printMadeWithLove")}</small></section><section class="page toc"><div class="eyebrow">${this.t("printContents")}</div><h2>${this.t("printRecipes")}</h2><ul>${toc}</ul></section>${chapters}</body></html>`;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  },
});
MealieAtelierCard.prototype._refresh = async function () {
  await _atOriginalRefresh.call(this);
  await this._studioRefresh();
  try {
    const payload = await this._ws("alarms");
    const remote = (payload?.alarms || []).filter((x) =>
      ["scheduled", "retry", "sending"].includes(x.status),
    );
    const local = this._timers.filter((x) => !x.serverArmed);
    const previous = new Map(this._timers.map((timer) => [String(timer.id), timer]));
    this._timers = [
      ...local,
      ...remote.map((x) => ({
        ...previous.get(String(x.id)),
        id: x.id,
        label: x.label,
        deadline: x.deadline,
        done: false,
        serverArmed: true,
      })),
    ];
    this._persistTimers();
  } catch {} // Older companion/HA versions keep local timers; never pretend they are server-armed.
};
MealieAtelierCard.prototype._body = function () {
  if (this._providerActive === "home_assistant" && this._view !== "recipes")
    return `<section class="ds-surface"><span class="eyebrow">HOME ASSISTANT MEALIE</span><h2>${this.t("providerTitle")}</h2><p>${this.t("providerDescription")}</p><button class="btn primary" type="button" data-action="nav" data-value="recipes">${this.t("providerBrowse")}</button></section>`;
  if (!this._studio) this._studio = atInitially();
  if (this._view === "discover") return this._studioDiscover();
  if (this._view === "pantry") return this._studioPantry();
  if (this._view === "family") return this._studioFamily();
  if (this._view === "cookbook") return this._studioCookbook();
  const base = _atOriginalBody.call(this);
  return this._view === "dashboard"
    ? this._studioOverview() + base
    : this._view === "manage"
      ? base + this._studioDiagnosticsPanel()
      : base;
};
MealieAtelierCard.prototype._openRecipe = async function (slug) {
  this._aiAudit = null;
  this._aiSwap = null;
  await _atOriginalOpenRecipe.call(this, slug);
  if (this._detail?.slug) {
    this._catalogDetail = this._detail;
  }
};
MealieAtelierCard.prototype._modalHtml = function () {
  let html = _atOriginalModal.call(this);
  if (this._modal === "cook" && this._detail) {
    const session = this._studio?.family?.session;
    const connected = session?.slug === this._detail.slug;
    const voice = `<div class="studio-cook-tools"><button class="btn" data-action="studio-read-step">${icon("book", 14)} ${this.t("studioReadStepLabel")}</button><button class="btn" data-action="studio-voice-command">${icon("spark", 14)} ${this.t("studioVoiceCommandLabel")}</button><button class="btn" data-action="studio-replacement">${this.t("studioReplacementLabel")}</button>${this._hass?.callService && /^scene\.[a-z0-9_]+$/i.test(this._config.cooking_scene || "") ? `<button class="btn" data-action="studio-ha-scene">${icon("sun", 14)} ${this.t("studioCookingLight")}</button>` : ""}${this._hass?.callService && /^media_player\.[a-z0-9_]+$/i.test(this._config.cooking_media_player || "") ? `<button class="btn" data-action="studio-ha-quiet">${icon("volume", 14)} ${this.t("studioLowerMusic")}</button>` : ""}${this._hass?.callService && /^tts\.[a-z0-9_]+$/i.test(this._config.cooking_tts_engine || "") && /^media_player\.[a-z0-9_]+$/i.test(this._config.cooking_media_player || "") ? `<button class="btn" data-action="studio-ha-tts">${icon("volume", 14)} ${this.t("studioSpeakerLabel")}</button>` : ""}${connected ? `<span class="studio-shared-note">● ${this.t("studioSharedFamily")}</span>` : ""}</div>${this._aiSwap ? `<div class="studio-swap">${esc(this._aiSwap)}</div>` : ""}`;
    html = html.replace('<div class="cook-utility">', '<div class="cook-utility">' + voice);
    if (connected && session.timers.length) {
      html = html.replace(
        '<div class="cook-timers">',
        `<div class="cook-timers">${session.timers.map((x) => `<div class="cook-timer"><span>${esc(x.name)} · ${this.t("studioSharedTimer")}</span><strong data-shared-timer="${esc(x.id)}">${Math.max(0, Math.ceil((x.deadline - Date.now()) / 60000))} ${this.t("studioMinutesShort")}</strong></div>`).join("")}`,
      );
    }
  }
  if (this._modal === "journal" && this._detail)
    html = html.replace(this.t("studioJournalLocal"), this.t("studioJournalShared"));
  if (this._modal === "recipe" && this._detail) {
    const audit = AtelierStudio.audit(this._detail);
    html = html.replace(
      '<div class="detail-cols">',
      `<div class="studio-audit"><strong>${this.t("studioRecipeAuditTitle", { score: audit.score })}</strong><span>${
        audit.problems.length
          ? audit.problems
              .map((x) => esc(atMessage(this.t.bind(this), x)))
              .slice(0, 3)
              .join(" · ")
          : this.t("studioRecipeAuditNone")
      }</span><button class="btn tiny" data-action="studio-recipe-audit">${this.t("studioRecipeAuditAll")}</button>${this._providerActive === "home_assistant" ? "" : `<button class="btn tiny" data-action="studio-ai-audit">${icon("spark", 13)} ${this.t("studioAICheck")}</button>`}</div>${this._aiAudit ? `<div class="studio-audit-details"><strong>${this.t("studioAiSuggestionTitle")}</strong>${this._aiAudit.issues.map((x) => `<p><b>${esc(x.issue)}</b> – ${esc(x.suggestion)}</p>`).join("")}<small>${esc(this._aiAudit.disclaimer)}</small></div>` : ""}<div class="detail-cols">`,
    );
  }
  return html;
};
MealieAtelierCard.prototype._tickTimers = function () {
  _atOriginalTick.call(this);
  for (const span of this.shadowRoot.querySelectorAll("[data-shared-timer]")) {
    const timer = this._studio?.family?.session?.timers.find(
      (x) => x.id === span.dataset.sharedTimer,
    );
    if (timer) {
      const sec = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
      span.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    }
  }
};
MealieAtelierCard.prototype.connectedCallback = function () {
  _atOriginalConnected.call(this);
  this._studioPoll = setInterval(() => {
    if (["family", "discover", "pantry"].includes(this._view) || this._modal === "cook")
      this._studioRefresh({ silent: true });
  }, 12000);
};
MealieAtelierCard.prototype.disconnectedCallback = function () {
  _atOriginalDisconnected.call(this);
  if (this._studioPoll) clearInterval(this._studioPoll);
};
MealieAtelierCard.prototype._handleClick = async function (event) {
  const el = event.target?.closest?.("[data-action]");
  const action = el?.dataset?.action;
  if (action?.startsWith("studio-")) {
    event.preventDefault();
    const value = el.dataset.value || "",
      session = this._studio?.family?.session;
    if (action === "studio-discover-choice") {
      const draft = this._discoverDraft;
      if (!draft) return;
      const key = el.dataset.key;
      if (key === "people")
        draft.people = Math.max(1, Math.min(20, Number(draft.people || 2) + Number(value)));
      else if (key === "maxMinutes") draft.maxMinutes = Number(value);
      else if (key === "kidFriendly" || key === "usePantry") draft[key] = value === "true";
      else if (key === "exclude") {
        draft.exclude = draft.exclude.includes(value)
          ? draft.exclude.filter((x) => x !== value)
          : [...draft.exclude, value];
      } else if (key === "cookbooks")
        draft.cookbooks =
          value === "all"
            ? []
            : draft.cookbooks.includes(value)
              ? draft.cookbooks.filter((x) => x !== value)
              : [...draft.cookbooks, value];
      else if (key === "mealStyle") draft.mealStyle = value;
      this._render();
      return;
    }
    if (action === "studio-discover-back") {
      this._discoverDraft.step = Math.max(0, this._discoverDraft.step - 1);
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-edit") {
      this._discoverResults = false;
      this._discoverDraft.step = 0;
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-next") {
      if (this._discoverDraft.step < 3) {
        this._discoverDraft.step++;
        this._render();
        this._revealDiscover();
        return;
      }
      const d = this._discoverDraft,
        style = d.mealStyle || "any";
      const profile = {
        people: d.people,
        maxMinutes: d.maxMinutes,
        mealStyle: style,
        kidFriendly: d.kidFriendly,
        usePantry: d.usePantry,
        diets: style === "vegan" ? ["vegan"] : style === "vegetarian" ? ["vegetarian"] : [],
        exclude: d.exclude,
        cookbooks: d.cookbooks,
      };
      if (!this._fullCatalog?.length) await this._studioCatalog();
      if (this._permissions.can_write) await this._studioWrite("profile_set", profile);
      this._discoverCandidates = AtelierStudio.suggest(
        this._fullCatalog || asArray(this._data.recipes?.items),
        profile,
        this._studio.pantry,
        this._studio.journal,
        this._studioCookbooks || [],
      );
      this._discoverSelected = this._discoverCandidates[0]?.slug || "";
      this._discoverResults = true;
      this._render();
      this._revealDiscover();
      return;
    }
    if (action === "studio-discover-pick") {
      this._discoverSelected = value;
      this._render();
      return;
    }
    if (action === "studio-discover-next-idea") {
      const rows = this._discoverCandidates || [],
        index = rows.findIndex((x) => x.slug === this._discoverSelected);
      if (rows.length) this._discoverSelected = rows[(index + 1) % rows.length].slug;
      this._render();
      return;
    }
    if (action === "studio-check-health") {
      await this._studioDiagnostics();
      return;
    }
    if (action === "studio-export") {
      this._studioExport();
      return;
    }
    if (action === "studio-analyze") {
      this._fullCatalog = null;
      await this._studioCatalog();
      return;
    }
    if (action === "studio-plan-preview") {
      if (!this._fullCatalog?.length) await this._studioCatalog();
      this._weekProposal = AtelierStudio.planWeek(
        this._fullCatalog || [],
        this._studio.profile,
        this._studio.pantry,
        this._studio.journal,
        this._data.mealplan || [],
        this._weekStart,
      );
      this._render();
      return;
    }
    if (action === "studio-plan-commit") {
      await this._studioCommitWeek();
      return;
    }
    if (action === "studio-grocery-build") {
      await this._studioGenerateShopping();
      return;
    }
    if (action === "studio-grocery-send") {
      await this._studioSendGroceries();
      return;
    }
    if (action === "studio-sync") {
      await this._studioRefresh();
      return;
    }
    if (action === "studio-kid-toggle") {
      this._kidView = !this._kidView;
      this._render();
      return;
    }
    if (action === "studio-pantry-delete") {
      if (
        await this._atelierDialog({
          title: this.t("studioDeletePantryTitle"),
          body: this.t("studioDeletePantryBody"),
          confirmLabel: this.t("studioRemove"),
        })
      )
        await this._studioWrite("pantry_delete", { id: el.dataset.id });
      return;
    }
    if (action === "studio-pantry-edit") {
      const v = this._studio.pantry.find((x) => x.id === el.dataset.id);
      if (!v) return;
      const form = this.shadowRoot.querySelector('[data-form="studio-pantry"]');
      if (form) {
        form.elements.name.value = v.name;
        form.elements.amount.value = v.amount;
        form.elements.unit.value = v.unit;
        form.elements.expires.value = v.expires || "";
        form.elements.staple.checked = v.staple === true;
        form.dataset.rowId = v.id;
        form.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      return;
    }
    if (action === "studio-member-remove") {
      if (
        await this._atelierDialog({
          title: this.t("familyRemoveConfirmTitle"),
          body: this.t("familyRemoveConfirmBody"),
          confirmLabel: this.t("familyRemoveMember"),
        })
      )
        await this._studioWrite("family_member", { id: el.dataset.id, remove: true });
      return;
    }
    if (action === "studio-session-prev" || action === "studio-session-next") {
      if (session)
        await this._studioWrite("session_step", {
          session_id: session.id,
          step: Math.max(0, session.step + (action.endsWith("next") ? 1 : -1)),
        });
      return;
    }
    if (action === "studio-session-end") {
      if (
        session &&
        (await this._atelierDialog({
          title: this.t("familyEndConfirmTitle"),
          body: this.t("familyEndConfirmBody"),
          confirmLabel: this.t("familyEnd"),
        }))
      )
        await this._studioWrite("session_end", { session_id: session.id });
      return;
    }
    if (action === "studio-session-open") {
      if (session) {
        await this._openRecipe(session.slug);
        this._cookIndex = session.step;
        this._modal = "cook";
        this._render();
      }
      return;
    }
    if (action === "studio-timer-remove") {
      if (session)
        await this._studioWrite("session_timer", {
          session_id: session.id,
          id: el.dataset.id,
          remove: true,
        });
      return;
    }
    if (action === "studio-task-done") {
      const task = session?.tasks?.find((x) => x.id === el.dataset.id);
      if (task)
        await this._studioWrite("session_task", {
          session_id: session.id,
          id: task.id,
          done: !task.done,
        });
      return;
    }
    if (action === "studio-book-all") {
      this._bookSelected = new Set(
        (this._fullCatalog || asArray(this._data.recipes?.items)).slice(0, 120).map((x) => x.slug),
      );
      this._render();
      return;
    }
    if (action === "studio-book-clear") {
      this._bookSelected = new Set();
      this._render();
      return;
    }
    if (["studio-ha-scene", "studio-ha-quiet", "studio-ha-tts"].includes(action)) {
      if (!this._hass?.callService) {
        this._flash(this.t("studioOnlyHomeAssistant"));
        return;
      }
      const config = this._config || {};
      const scene = String(config.cooking_scene || ""),
        player = String(config.cooking_media_player || ""),
        engine = String(config.cooking_tts_engine || "");
      const valid = (entity, domain) =>
        new RegExp("^" + domain + "\\.[a-z0-9_]+$", "i").test(entity);
      try {
        if (action === "studio-ha-scene" && valid(scene, "scene"))
          await this._hass.callService("scene", "turn_on", { entity_id: scene });
        else if (action === "studio-ha-quiet" && valid(player, "media_player"))
          await this._hass.callService("media_player", "volume_set", {
            entity_id: player,
            volume_level: Math.max(0, Math.min(1, Number(config.cooking_volume) || 0.18)),
          });
        else if (
          action === "studio-ha-tts" &&
          valid(engine, "tts") &&
          valid(player, "media_player")
        ) {
          const step = instructionText(asArray(this._detail?.recipeInstructions)[this._cookIndex]);
          if (!step) throw Error(this.t("studioNoStep"));
          await this._hass.callService("tts", "speak", {
            entity_id: engine,
            media_player_entity_id: player,
            message: step.slice(0, 1200),
            cache: false,
          });
        } else throw Error(this.t("studioDeviceInvalid"));
        this._flash(this.t("studioConfirmAvailable"));
      } catch (error) {
        this._flash(
          this.t("studioActionFailed", {
            error: error?.message || this.t("studioDiagnosticsError"),
          }),
        );
      }
      return;
    }
    if (action === "studio-read-step") {
      if (!this._detail) return;
      const step = instructionText(asArray(this._detail.recipeInstructions)[this._cookIndex]);
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(step);
        utterance.lang = this.t(this._locale === "de" ? "studioSpeechDe" : "studioSpeechEn");
        utterance.rate = 0.91;
        speechSynthesis.speak(utterance);
      } else this._flash(this.t("studioReadUnsupported"));
      return;
    }
    if (action === "studio-voice-command") {
      const API = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!API) {
        this._flash(this.t("studioVoiceUnsupported"));
        return;
      }
      const isGerman = this._locale === "de";
      const recognizer = new API();
      recognizer.lang = this.t(isGerman ? "studioSpeechDe" : "studioSpeechEn");
      recognizer.interimResults = false;
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (e) => {
        const speech = String(e.results?.[0]?.[0]?.transcript || "").toLocaleLowerCase(
          this._locale || "en",
        );
        if (isGerman ? /weiter|nächster/.test(speech) : /next|forward|continue/.test(speech))
          this._cookIndex = Math.min(
            asArray(this._detail?.recipeInstructions).length - 1,
            this._cookIndex + 1,
          );
        else if (isGerman ? /zurück/.test(speech) : /back|previous/.test(speech))
          this._cookIndex = Math.max(0, this._cookIndex - 1);
        else if (isGerman ? /vorlesen|lesen/.test(speech) : /read|read aloud/.test(speech)) {
          const b = this.shadowRoot.querySelector('[data-action="studio-read-step"]');
          b?.click();
        } else if (/wie viel|wieviel|wie viele|how much|how many/.test(speech)) {
          const rows = asArray(this._detail?.recipeIngredient);
          const ask = AtelierStudio.clean(
            speech.replace(
              /wie viel|wieviel|wie viele|brauche ich|ist|an|how much|how many|do i need|need/g,
              "",
            ),
          );
          const matched = rows.find((row) =>
            AtelierStudio.similarity(AtelierStudio.ingredient(row), ask),
          );
          const answer = matched
            ? AtelierStudio.ingredient(matched)
            : this.t("studioIngredientNoMatch");
          this._flash(answer);
          if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(answer);
            u.lang = this.t(isGerman ? "studioSpeechDe" : "studioSpeechEn");
            speechSynthesis.speak(u);
          }
        } else this._flash(this.t("studioVoiceUnknown", { command: speech }));
        this._render();
      };
      recognizer.onerror = () => this._flash(this.t("studioMicrophoneError"));
      try {
        recognizer.start();
      } catch {
        this._flash(this.t("studioSpeechStartFailed"));
      }
      return;
    }
    if (action === "studio-replacement") {
      if (!this._detail) return;
      const raw = await this._atelierDialog({
        title: this.t("studioReplaceTitle"),
        body: this.t("studioReplaceBody"),
        kind: "prompt",
        confirmLabel: this.t("studioShowAlternatives"),
      });
      if (!raw) return;
      const found = AtelierStudio.substitutions(raw);
      let output = found
        .map((x) => `${x.from}: ${this.t(x.to)} (${this.t(x.warning)})`)
        .join(" · ");
      if (!output) {
        try {
          const answer = await this._ws("studio_substitute", {
            ingredient: raw.slice(0, 160),
            recipe: this._detail.name.slice(0, 200),
          });
          output =
            answer.alternatives.map((x) => `${x.name}: ${x.adjustment}`).join(" · ") +
            " · " +
            answer.warning;
        } catch (error) {
          output = this.t("studioSubstituteError", { error: error?.message || "" });
        }
      }
      this._aiSwap = output;
      this._render();
      return;
    }
    if (action === "studio-ai-audit") {
      if (!this._detail) return;
      if (
        !(await this._atelierDialog({
          title: this.t("studioAiAuditTitle"),
          body: this.t("studioAiAuditBody"),
          confirmLabel: this.t("studioAiConsent"),
        }))
      )
        return;
      this._flash(this.t("studioAiStarting"));
      try {
        const result = await this._ws("studio_ai_audit", { slug: this._detail.slug });
        this._aiAudit = result;
        this._render();
      } catch (error) {
        this._flash(this.t("studioAiUnavailable", { error: error.message || "" }));
      }
      return;
    }
    if (action === "studio-recipe-audit") {
      if (!this._detail) return;
      const r = AtelierStudio.audit(this._detail);
      await this._atelierDialog({
        kind: "info",
        title: this.t("studioAuditTitle", { score: r.score }),
        body:
          (r.problems.map((x) => "• " + atMessage(this.t.bind(this), x)).join("\n") ||
            this.t("studioAuditNone")) +
          "\n\n" +
          this.t("studioAuditDisclaimer"),
      });
      return;
    }
    return;
  }
  if (action === "cook-start" && this._detail) {
    const slug = this._detail.slug,
      name = this._detail.name;
    const active = this._studio?.family?.session;
    const existed = active?.slug === slug;
    // Starting a different recipe must never destroy shared tasks/timers silently.
    const replace = Boolean(
      active &&
        !existed &&
        this._permissions.can_write &&
        (await this._atelierDialog({
          title: this.t("studioSessionReplaceTitle"),
          body: this.t("studioSessionReplaceBody", { name: active.name }),
          confirmLabel: this.t("studioSessionReplaceConfirm"),
        })),
    );
    await _atOriginalClick.call(this, event);
    if (this._permissions.can_write && !existed && (!active || replace))
      await this._studioWrite("session_start", { slug, name, replace_existing: replace });
    return;
  }
  if ((action === "cook-next" || action === "cook-back") && this._detail) {
    const session = this._studio?.family?.session,
      slug = this._detail.slug,
      steps = this._detail.recipeInstructions || [];
    await _atOriginalClick.call(this, event);
    if (session?.slug === slug && this._permissions.can_write)
      await this._studioWrite("session_step", {
        session_id: session.id,
        step: Math.max(0, Math.min(steps.length - 1, this._cookIndex)),
      });
    return;
  }
  if (action === "cook-finish" && this._detail) {
    const slug = this._detail.slug,
      previous = this._studio?.journal?.[slug] || {};
    await _atOriginalClick.call(this, event);
    if (this._canJournal)
      await this._studioWrite("journal_set", {
        slug,
        note: previous.note || "",
        rating: previous.rating || 0,
        favorite: previous.favorite || false,
        cooked: true,
      });
    return;
  }
  return _atOriginalClick.call(this, event);
};
MealieAtelierCard.prototype._handleSubmit = async function (event) {
  const form = event.target?.closest?.("[data-form]");
  const type = form?.dataset?.form;
  if (type?.startsWith("studio-")) {
    event.preventDefault();
    if (!this._studio) return;
    const values = Object.fromEntries(new FormData(form).entries());
    let ok = false;
    if (type === "studio-profile")
      ok = await this._studioWrite("profile_set", {
        people: Number(values.people),
        maxMinutes: Number(values.maxMinutes),
        diets: values.diet ? [values.diet] : [],
        exclude: String(values.exclude || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 30),
      });
    if (type === "studio-pantry")
      ok = await this._studioWrite("pantry_put", {
        id: form.dataset.rowId || undefined,
        name: values.name,
        amount: Number(values.amount),
        unit: values.unit,
        expires: values.expires || "",
        staple: values.staple === "on",
      });
    if (type === "studio-member")
      ok = await this._studioWrite("family_member", {
        name: values.name,
        child: values.child === "on",
      });
    if (type === "studio-task") {
      const member = this._studio.family.members.find((x) => x.id === values.memberId);
      if (member?.child && !values.adultApproved) {
        this._flash(this.t("studioAdultApprovalRequired"));
        return;
      }
      ok = await this._studioWrite("session_task", {
        session_id: this._studio.family.session?.id,
        text: values.text,
        memberId: values.memberId,
        adultApproved: values.adultApproved === "on",
      });
    }
    if (type === "studio-timer")
      ok = await this._studioWrite("session_timer", {
        session_id: this._studio.family.session?.id,
        name: values.name,
        minutes: Number(values.minutes),
      });
    if (type === "studio-book") {
      await this._studioPrintBook({
        title: String(values.title || this.t("cookbookTitleDefaultPrint")).slice(0, 100),
        subtitle: String(values.subtitle || "").slice(0, 160),
        photos: values.photos === "on",
      });
      return;
    }
    if (ok) {
      this._flash(this.t("studioSaved"));
    }
    return;
  }
  if (type === "journal" && this._detail) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const previous = this._studio?.journal?.[this._detail.slug] || {};
    const ok = await this._studioWrite("journal_set", {
      slug: this._detail.slug,
      rating: Number(values.rating) || 0,
      note: String(values.note || "").slice(0, 1200),
      favorite: values.favorite === "on",
      cooked: false,
    });
    if (ok) {
      this._modal = "recipe";
      this._flash(this.t("studioJournalSavedToast"));
    }
    return;
  }
  return _atOriginalSubmit.call(this, event);
};
const _atOriginalInput = MealieAtelierCard.prototype._handleInput;
MealieAtelierCard.prototype._handleInput = function (event) {
  if (event.target?.hasAttribute("data-book")) {
    if (!this._bookSelected) this._bookSelected = new Set();
    if (event.target.checked) this._bookSelected.add(event.target.dataset.book);
    else this._bookSelected.delete(event.target.dataset.book);
    const count = this.shadowRoot.querySelector("[data-book-selected-count]");
    if (this._view === "cookbook" && count) count.textContent = String(this._bookSelected.size);
    const submit = this.shadowRoot.querySelector('[data-form="studio-book"] button[type="submit"]');
    if (submit) submit.disabled = !this._bookSelected.size;
    return;
  }
  return _atOriginalInput.call(this, event);
};
