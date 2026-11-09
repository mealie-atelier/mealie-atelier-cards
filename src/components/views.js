const BOOK_SEARCH_MIN = 16;
// Keep in step with the max-width container query of the cookbook sheet in recipe-picker.css.
const BOOK_SHEET_MAX_WIDTH = 520;

/** Render the primary card views from normalized provider state. */
export const viewMethods = {
  /** Recipe photo markup, empty when the card option show_images is off (every view honours it). */
  _photo(recipe, cls = "", eager = false) {
    return this._design.show_images !== false ? recipeImage(recipe, cls, eager) : "";
  },
  /** The connection error banner is up: it is the one error state, so views skip their own load-failed box. */
  _loadErrorShown() {
    return Boolean(this._error);
  },
  _hero() {
    const today = dateYmd(new Date());
    const planned = this._plannedMeals();
    const entry =
      planned.find((e) => e.date === today && e.entryType === "dinner") ||
      planned.find((e) => e.date === today);
    const title = entry ? mealName(entry) : this.t("headline");
    const name = entry?.recipe?.name;
    const img = this._photo(entry?.recipe || {}, "hero-food", true);
    const emptyLibrary = this._libraryEmpty();
    return `<section class="hero">${img}<div class="hero-copy"><div class="eyebrow">${esc(this.t("tonight"))}</div><h2>${esc(title)}</h2><p>${esc(entry ? this.t("featured") : emptyLibrary ? this.t("uiEmptyLibraryHero") : this.t("uiHeroSub"))}</p>
      ${emptyLibrary && !entry ? "" : `<button class="btn primary" data-action="${name ? "open-recipe" : "nav"}" data-value="${name ? esc(entry.recipe.slug) : "mealplan"}">${icon(name ? "book" : "plus", 15)} ${esc(this.t(name ? "viewRecipe" : "planNow"))} ${icon("arrow", 14)}</button>`}</div>
      ${img ? "" : `<div class="hero-art" aria-hidden="true"><div class="plate"></div></div>`}</section>`;
  },
  /** A loaded, unfiltered library without a single recipe (first run). */
  _libraryEmpty() {
    const recipes = this._data.recipes;
    return Boolean(
      recipes &&
        !this._loadFailed &&
        !this._query &&
        (recipes.total ?? asArray(recipes.items).length) === 0 &&
        !asArray(recipes.items).length,
    );
  },
  _stats() {
    const total = this._data.recipes?.total ?? asArray(this._data.recipes?.items).length;
    const items = asArray(this._data.shopping?.items);
    const active = this._activeList
      ? items.filter((i) => String(i.shoppingListId) === this._activeList)
      : items;
    const open = active.filter((i) => !i.checked).length;
    const scheduled = this._plannedMeals().length;
    const failedParts = this._failedParts || new Set();
    return `<div class="statline">${this._stat(this._loadFailed === true || failedParts.has("recipes") ? "—" : (total ?? "—"), this.t("count"), "book", "recipes")}${this._stat(failedParts.has("mealplan") ? "—" : scheduled, this.t("nextMeal"), "calendar", "mealplan")}${this._stat(failedParts.has("shopping") ? "—" : open, this.t("openItemsLabel"), "cart", "shopping")}</div>`;
  },
  /** The chosen cookbook's recipes from the full catalog, or null while the list is unfiltered. */
  _bookFilterList() {
    const book = (this._studioCookbooks || []).find((b) => b.slug === this._cookbookFilter);
    if (!book || !this._fullCatalog?.length) return null;
    const query = String(this._query || "")
      .trim()
      .toLowerCase();
    return this._fullCatalog.filter(
      (r) =>
        AtelierStudio.matchesCookbook(r, book) &&
        (!query ||
          String(r.name || "")
            .toLowerCase()
            .includes(query)),
    );
  },
  /** "All" plus the cookbooks, narrowed by the panel search when it has a query. */
  _bookItems() {
    const query = String(this._bookQuery || "")
      .trim()
      .toLowerCase();
    const books = (this._studioCookbooks || []).filter(
      (b) =>
        !query ||
        String(b.name || "")
          .toLowerCase()
          .includes(query),
    );
    return query ? books : [{ slug: "", name: this.t("recipeBookFilterAll") }, ...books];
  },
  _bookOptionsMarkup() {
    return this._bookItems()
      .map((b, i) => {
        const chosen = b.slug === (this._cookbookFilter || "");
        return `<li role="option" class="book-option" id="book-opt-${i}" aria-selected="${chosen}" data-action="book-pick" data-value="${esc(b.slug)}" ${i === this._bookActive ? "data-active" : ""}><span class="book-name">${esc(b.name)}</span>${chosen ? icon("check", 16) : ""}</li>`;
      })
      .join("");
  },
  _bookFilterField() {
    if (!this._studioCookbooks) this._studioLoadCookbooks();
    const books = this._studioCookbooks || [];
    if (!books.length) return "";
    const current = books.find((b) => b.slug === this._cookbookFilter);
    const value = current ? current.name : this.t("recipeBookFilterAll");
    const open = Boolean(this._bookOpen);
    const searchable = books.length >= BOOK_SEARCH_MIN;
    const items = this._bookItems();
    const active = items[this._bookActive]
      ? `aria-activedescendant="book-opt-${this._bookActive}"`
      : "";
    const panel = open
      ? `<div class="book-sheet"><div class="book-panel">${
          searchable
            ? `<input type="search" class="book-search" role="combobox" aria-expanded="true" aria-controls="book-list" aria-autocomplete="list" ${active} data-input="book-search" aria-label="${esc(this.t("recipeBookFilterSearch"))}" placeholder="${esc(this.t("recipeBookFilterSearch"))}" autocomplete="off" spellcheck="false" value="${esc(this._bookQuery)}">`
            : ""
        }<ul class="book-list" id="book-list" role="listbox" aria-labelledby="book-label" ${searchable ? "" : `tabindex="-1" data-input="book-list" ${active}`}>${this._bookOptionsMarkup()}</ul><p class="book-empty" ${items.length ? "hidden" : ""}>${esc(this.t("recipeBookFilterNone"))}</p></div></div>`
      : "";
    return `<div class="field recipe-book-filter"><span id="book-label">${esc(this.t("recipeBookFilter"))}</span><button type="button" class="book-trigger" data-action="book-toggle" aria-haspopup="listbox" aria-expanded="${open}" aria-controls="book-list" aria-labelledby="book-label book-value"><span class="book-value" id="book-value">${esc(value)}</span>${icon("chevron", 16)}</button>${panel}</div>`;
  },
  _bookSetOpen(open, focus = open ? "panel" : "trigger") {
    this._bookOpen = open;
    this._bookQuery = "";
    this._bookActive = open
      ? Math.max(
          this._bookItems().findIndex((b) => b.slug === this._cookbookFilter),
          0,
        )
      : 0;
    this._bookFocus = focus;
    this._render();
  },
  _bookPick(slug) {
    this._bookOpen = false;
    this._bookFocus = "trigger";
    this._setCookbookFilter(slug);
  },
  /** Repaint the rows and the active descendant in place, so typing never rebuilds the card. */
  _bookPaint() {
    const root = this.shadowRoot;
    const list = root.querySelector?.("#book-list");
    if (!list) return;
    const items = this._bookItems();
    list.innerHTML = this._bookOptionsMarkup();
    const empty = root.querySelector(".book-empty");
    if (empty) empty.hidden = items.length > 0;
    const holder = root.querySelector('[data-input="book-search"], [data-input="book-list"]');
    if (items[this._bookActive])
      holder?.setAttribute("aria-activedescendant", `book-opt-${this._bookActive}`);
    else holder?.removeAttribute("aria-activedescendant");
    list.querySelector("[data-active]")?.scrollIntoView?.({ block: "nearest" });
  },
  /** Keyboard for the cookbook filter; true when the key was consumed. */
  _bookKeydown(event) {
    if (!event.target?.closest?.(".recipe-book-filter")) return false;
    const key = event.key;
    if (!this._bookOpen) {
      if (key !== "ArrowDown" && key !== "ArrowUp") return false;
      event.preventDefault();
      this._bookSetOpen(true);
      return true;
    }
    const items = this._bookItems();
    if (key === "Escape") {
      event.preventDefault();
      this._bookSetOpen(false);
      return true;
    }
    if (key === "Tab") {
      this._bookSetOpen(false, "");
      return false;
    }
    const moves = {
      ArrowDown: this._bookActive + 1,
      ArrowUp: this._bookActive - 1,
      Home: 0,
      End: items.length - 1,
    };
    if (key in moves) {
      event.preventDefault();
      this._bookActive = Math.max(0, Math.min(items.length - 1, moves[key]));
      this._bookPaint();
      return true;
    }
    const space = key === " " && event.target.dataset?.input !== "book-search";
    if (key === "Enter" || space) {
      event.preventDefault();
      if (items[this._bookActive]) this._bookPick(items[this._bookActive].slug);
      return true;
    }
    return false;
  },
  /** Runs after every card render: raises the sheet on a narrow card and puts focus where it belongs. */
  _bookAfterRender() {
    const root = this.shadowRoot;
    const sheet = root.querySelector?.(".book-sheet");
    if (sheet && (this.getBoundingClientRect?.().width ?? Infinity) <= BOOK_SHEET_MAX_WIDTH)
      this._raiseModal(sheet);
    const want = this._bookFocus;
    this._bookFocus = "";
    if (want)
      this._focusAfterRender(() =>
        root.querySelector(
          want === "panel"
            ? '[data-input="book-search"], [data-input="book-list"]'
            : '[data-action="book-toggle"]',
        ),
      );
  },
  _setCookbookFilter(slug) {
    this._cookbookFilter = slug;
    this._page = 1;
    // Filtering must cover every recipe, not the loaded page, so the full catalog comes first.
    (slug && !this._fullCatalog?.length ? this._studioCatalog() : Promise.resolve()).then(() =>
      this._render(),
    );
  },
  _recipeTools() {
    return `<div class="recipe-tools"><label class="search">${icon("search", 17)}<input type="search" data-input="search" aria-label="${esc(this.t("search"))}" autocomplete="off" placeholder="${esc(this.t("search"))}" value="${esc(this._query)}"></label>${this._bookFilterField()}${this._permissions.can_manage && !this._loadFailed && !this._failedParts?.has("recipes") ? `<button class="btn tiny" data-action="create-form">${icon("plus", 14)} ${esc(this.t("create"))}</button>` : ""}</div>`;
  },
  _recipes(limit = 24) {
    const recipes = asArray(this._data.recipes?.items);
    const bookList = limit === 24 ? this._bookFilterList() : null;
    const localPage = this._providerActive === "home_assistant" && limit === 24;
    const list = bookList
      ? bookList.slice((this._page - 1) * limit, this._page * limit)
      : localPage
        ? recipes.slice((this._page - 1) * limit, this._page * limit)
        : recipes.slice(0, limit);
    const ratio =
      { portrait: "4/5", square: "1/1", landscape: "4/3" }[this._design.photo_ratio] || "4/5";
    return `<div class="recipe-grid ${limit < 24 ? "is-featured" : ""}" style="--at-cols:${Math.min(4, Math.max(1, Number(this._design.columns) || 3))};--at-tile-ratio:${ratio}">${list
      .map((recipe, idx) => {
        const category =
          recipe.recipeCategory?.[0]?.name || recipe.recipeCategory?.[0] || this.t("featured");
        const image = this._design.show_images !== false;
        const photo = this._photo(recipe);
        const time = AtelierStudio.formatTime(recipe.totalTime, this._language);
        const timeLabel = time || this.t("uiMealieRecipeFallback");
        return `<button class="recipe-tile" data-tile data-action="open-recipe" data-value="${esc(recipe.slug)}" aria-label="${esc(recipe.name)}"><div class="tile-image tint${idx % 4}">${photo}<div class="photo-index">ATELIER / ${String(idx + 1).padStart(2, "0")}</div>${image ? `<div class="placeholder" aria-hidden="true"><span>${esc(recipe.name)}</span></div>` : ""}</div><div class="tile-body"><small>${esc(category)}</small><h3>${esc(recipe.name)}</h3><div class="tile-meta">${icon(time ? "clock" : "book", 13)}${esc(timeLabel)}</div><span class="tile-open">${icon("arrow", 13)}</span></div></button>`;
      })
      .join(
        "",
      )}</div>${this._providerActive === "home_assistant" ? `<p class="provider-note" role="status">${this.t("uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity")}</p>${this._providerTruncated ? `<p class="provider-note" role="status">${esc(this.t("uiProviderResultsTruncated", { limit: NATIVE_RESULT_LIMIT }))}</p>` : ""}` : ""}${!list.length && !this._loadErrorShown() && (this._loadFailed || this._failedParts?.has("recipes")) ? `<div class="notice load-failed" role="status">${icon("book")} ${esc(this.t("offline"))}</div>` : ""}${!list.length && !this._loadFailed ? `<div class="notice">${icon("book")} ${esc(this._libraryEmpty() ? this.t("uiEmptyLibrary") : this._query ? this.t("uiNoSearchResults", { query: this._query }) : this.t("noRecipes"))}</div>` : ""}`;
  },
  _pagination() {
    const bookList = this._bookFilterList();
    const page = bookList
      ? { page: this._page, total: bookList.length, per_page: 24 }
      : this._data.recipes || {};
    const p = Number(page.page || this._page);
    const total = Number(page.total || 0);
    const size = Number(page.per_page || page.perPage || 24);
    const last = Math.max(1, Math.ceil(total / Math.max(size, 1)));
    if (last <= 1) return "";
    return `<div class="pager"><button class="btn tiny" data-action="page" data-value="${p - 1}" ${p <= 1 ? "disabled" : ""}>${esc(this.t("back"))}</button><span>${p} / ${last}</span><button class="btn tiny" data-action="page" data-value="${p + 1}" ${p >= last ? "disabled" : ""}>${esc(this.t("next"))}</button></div>`;
  },
  /** Loaded meal plan entries limited to the configured entry types (all when none are set). */
  _plannedMeals() {
    return AtelierWeek.filterEntries(asArray(this._data.mealplan), this._config.entry_types);
  },
  /** Mealie entry types in display order; the plan dialog offers all of them. */
  _mealTypes() {
    return ["breakfast", "lunch", "dinner", "side", "snack", "dessert", "drink"];
  },
  _mealTypeLabel(type) {
    const key = {
      breakfast: "breakfast",
      lunch: "lunch",
      dinner: "dinner",
      side: "printDocSide",
      snack: "printDocSnack",
      dessert: "printDocDessert",
      drink: "printDocDrink",
    }[type];
    return key ? this.t(key) : type || "";
  },
  /** Stable sort by meal type (breakfast first); unknown types go last in API order. */
  _sortMeals(list) {
    const order = this._mealTypes();
    const rank = (m) => {
      const i = order.indexOf(m.entryType);
      return i < 0 ? order.length : i;
    };
    return list
      .map((m, i) => [m, i])
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
      .map((x) => x[0]);
  },
  /** On swipeable (narrow) week strips, bring today's column into view. */
  _revealToday() {
    const grid = this.shadowRoot?.querySelector(".week-grid");
    const day = grid?.querySelector(".day.today");
    if (!grid || !day || grid.scrollWidth <= grid.clientWidth) return;
    const g = grid.getBoundingClientRect(),
      d = day.getBoundingClientRect();
    if (d.left >= g.left && d.right <= g.right) return;
    grid.scrollLeft += d.left - g.left;
    // The browser clamps at the maximum scroll, which can cut a day card in half.
    // Align to that card's edge instead, so every visible card starts whole.
    const cut = [...(grid.querySelectorAll?.(".day") || [])].find((el) => {
      const r = el.getBoundingClientRect();
      return r.left < g.left - 1 && r.right > g.left + 1;
    });
    if (cut) grid.scrollLeft += cut.getBoundingClientRect().left - g.left;
  },
  /** The full app shows three weeks below each other, a card configured to a range shows that range. */
  _planRows() {
    return this._config.mode === "dashboard" && this._config.week_days === 7 ? 3 : 1;
  },
  _planDayCount() {
    return this._config.week_days * this._planRows();
  },
  /** "November 2026", or both months when the visible range crosses into the next one. */
  _planMonthLabel() {
    const end = addDays(this._weekStart, this._planDayCount() - 1);
    const year = { month: "long", year: "numeric" };
    if (end.getMonth() === this._weekStart.getMonth())
      return dayString(this._locale, this._weekStart, year);
    const sameYear = end.getFullYear() === this._weekStart.getFullYear();
    return `${dayString(this._locale, this._weekStart, sameYear ? { month: "long" } : year)} – ${dayString(this._locale, end, year)}`;
  },
  _planShowsCurrentWeek() {
    return (
      dateYmd(this._weekStart) ===
      dateYmd(AtelierWeek.rangeStart(new Date(), this._config.week_start))
    );
  },
  _dayRange(start, days) {
    const date = { day: "numeric", month: "short" };
    return `${dayString(this._locale, start, date)} – ${dayString(this._locale, addDays(start, days - 1), date)}`;
  },
  /** Names a row after the current or next week when it is one, otherwise only its dates carry it. */
  _weekRowName(start) {
    const current = AtelierWeek.rangeStart(new Date(), this._config.week_start);
    if (dateYmd(start) === dateYmd(current)) return this.t("weekRowThis");
    if (dateYmd(start) === dateYmd(addDays(current, 7))) return this.t("weekRowNext");
    return "";
  },
  _weekStack() {
    const rows = this._planRows();
    if (rows === 1) return this._week();
    const days = this._config.week_days;
    return `<div class="week-stack">${Array.from({ length: rows }, (_, row) => {
      const start = addDays(this._weekStart, row * days);
      const name = this._weekRowName(start);
      const dates = this._dayRange(start, days);
      return `<section class="week-row" aria-label="${esc(name ? `${name}, ${dates}` : dates)}"><h3 class="week-row-title">${name ? `<span>${esc(name)}</span>` : ""}<small>${esc(dates)}</small></h3>${this._week(start, row === 0)}</section>`;
    }).join("")}</div>`;
  },
  _week(start = this._weekStart, withNotice = true) {
    const all = this._plannedMeals();
    const days = this._config.week_days;
    const today = dateYmd(new Date());
    const mealplanFailed = this._failedParts?.has("mealplan") === true;
    const movable = this._planMovable();
    return `${withNotice && mealplanFailed && !this._loadErrorShown() ? `<div class="notice load-failed" role="status">${icon("calendar")} ${esc(this.t("offline"))}</div>` : ""}<div class="week-grid${days === 7 ? "" : " week-grid-custom"}">${Array.from(
      { length: days },
      (_, i) => {
        const day = addDays(start, i),
          ymd = dateYmd(day),
          todays = this._sortMeals(all.filter((m) => m.date === ymd));
        return `<div class="day ${ymd === today ? "today" : ""}" data-date="${ymd}"><div class="day-head"><span>${esc(dayString(this._locale, day, { weekday: "short" }))}</span><b class="at-numeral">${day.getDate()}</b></div>
      ${todays
        .map((meal) => {
          const photo = this._photo(meal.recipe || {});
          const synced =
            meal.id !== undefined && meal.id !== null && !String(meal.id).startsWith("pending-");
          const label = mealName(meal) || this._mealTypeLabel(meal.entryType);
          const remove =
            this._permissions.can_write && synced
              ? `<button class="day-meal-remove" data-action="remove-meal" data-value="${esc(meal.id)}" aria-label="${esc(this.t("removeMeal", { name: label, mealType: this._mealTypeLabel(meal.entryType) }))}">${icon("close", 14)}</button>`
              : "";
          return `<div class="day-entry"${synced ? ` data-entry-id="${esc(meal.id)}"` : ""} data-date="${esc(ymd)}"${synced && movable ? " data-movable" : ""}><button class="day-meal${photo ? " has-photo" : ""}"${meal.recipe?.slug ? " data-tile" : ""} data-action="day-meal" data-value="${esc(meal.recipe?.slug || "")}" data-date="${esc(ymd)}" title="${esc(mealName(meal))}">${photo ? `<span class="day-meal-photo">${photo}</span>` : ""}<small>${esc(this._mealTypeLabel(meal.entryType))}</small><span class="day-meal-name">${esc(mealName(meal))}</span></button>${remove}</div>`;
        })
        .join("")}
      ${todays.length === 0 && !this._failedParts?.has("mealplan") ? `<div class="day-empty">${esc(this.t("noPlan"))}</div>` : ""}${this._permissions.can_write && !mealplanFailed ? `<button class="day-add" data-action="plan-form" data-value="${ymd}" aria-label="${esc(this.t("planNow"))}">${icon("plus", 16)}</button>` : ""}</div>`;
      },
    ).join("")}</div>`;
  },
  /** Item text without the quantity Mealie already folds into `display`; a unitless quantity of 1 shows no "1 " prefix. */
  _shoppingLabel(item) {
    const text = String(item.display || item.note || item.food?.name || this.t("itemFallback"));
    // Only the "1 " Mealie folds into `display` is dropped; typed note text keeps its number.
    const folded = item.display && item.display !== item.note;
    return folded && Number(item.quantity) === 1 && !item.unit
      ? text.replace(/^1(?:[.,]0+)?\s+/, "")
      : text;
  },
  /** Rows that exist only on this device (waiting add or unsent save) cannot be edited yet. */
  _shoppingRowBusy(item) {
    return /^(pending|local)-/.test(String(item.id));
  },
  _shoppingRow(item) {
    const label = this._shoppingLabel(item);
    const id = String(item.id);
    const editable = this._permissions.can_write && !this._shoppingRowBusy(item);
    const actions = editable
      ? `<span class="shopping-actions"><button class="icon-btn shopping-action" type="button" data-action="shopping-edit-form" data-id="${esc(id)}" title="${esc(this.t("shoppingEditItem", { item: label }))}" aria-label="${esc(this.t("shoppingEditItem", { item: label }))}">${icon("edit", 16)}</button><button class="icon-btn shopping-action shopping-delete" type="button" data-action="shopping-delete" data-id="${esc(id)}" title="${esc(this.t("shoppingDeleteItem", { item: label }))}" aria-label="${esc(this.t("shoppingDeleteItem", { item: label }))}">${icon("trash", 16)}</button></span>`
      : "";
    return `<div class="shopping-row ${item.checked ? "checked" : ""}"><button class="check-ui" data-action="shopping-toggle" data-id="${esc(item.id)}" data-checked="${item.checked ? "true" : "false"}" role="checkbox" aria-checked="${item.checked ? "true" : "false"}" ${!this._canTickShopping || this._shoppingRowBusy(item) ? 'disabled aria-disabled="true"' : ""} aria-label="${esc(id.startsWith("local-") ? this.t("offlineWaiting") : id.startsWith("pending-") ? this.t("uiSaving") : this.t(item.checked ? "uiMarkShoppingOpen" : "uiMarkShoppingComplete", { item: label }))}">${icon("check", 14)}</button><span class="shopping-name">${esc(label)}</span><span class="shopping-qty">${esc(item.offlineWaiting ? this.t("offlineWaiting") : "")}</span>${actions}</div>`;
  },
  /** Starting values of the edit form. A free-text item has no food: its name is its note. */
  _shoppingEditFields(item) {
    const freeText = !item.food;
    const quantity = Number(item.quantity);
    return {
      freeText,
      name: String(item.food?.name || item.note || item.display || "").trim(),
      note: freeText ? "" : String(item.note || ""),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
    };
  },
  /** Only the fields the user changed, or null when nothing changed. */
  _shoppingEditChanges(item, values) {
    const from = this._shoppingEditFields(item);
    const changes = {};
    const name = tidy(values.name);
    const note = "note" in values ? tidy(values.note) : from.note.trim();
    if (name && name !== from.name) {
      // A rename turns the item into a free text item (as the Bridge does), so a note on a food
      // item is folded into the new name instead of being sent as a second, conflicting change.
      changes.name = from.freeText ? name : [name, note].filter(Boolean).join(" ");
    } else if (!from.freeText && note !== from.note.trim()) changes.note = note;
    const raw = String(values.quantity ?? "").trim();
    if (raw !== "") {
      const quantity = Number(raw);
      if (
        Number.isFinite(quantity) &&
        quantity >= 0 &&
        quantity <= 100000 &&
        quantity !== from.quantity
      )
        changes.quantity = quantity;
    }
    return Object.keys(changes).length ? changes : null;
  },
  /**
   * The item as Mealie shows it after an edit. Mealie rebuilds `display` (quantity, unit, name, note)
   * itself, so the label is derived here the same way and a quantity or note edit is visible at once.
   */
  _shoppingEditLocal(item, changes) {
    const { name: renamed, ...rest } = changes;
    // A rename makes the item a free text item: its name is its note and the food link is gone.
    const merged =
      renamed === undefined
        ? { ...item, ...rest }
        : { ...item, ...rest, note: renamed, food: null };
    const quantity = Number(merged.quantity);
    const unit = String(merged.unit?.name || merged.unit?.abbreviation || "").trim();
    const name = merged.food
      ? String(merged.food.name || "").trim()
      : String(merged.note || "").trim();
    const note = merged.food ? String(merged.note || "").trim() : "";
    const display = [quantity > 0 ? String(quantity) : "", unit, name, note]
      .filter(Boolean)
      .join(" ");
    const local = { ...rest, display: display || merged.display };
    if (renamed !== undefined) Object.assign(local, { note: renamed, food: null, isFood: false });
    return local;
  },
  /** Open items first, grouped by Mealie label (unlabelled last); ticked items sink to the bottom. */
  _shoppingRows(items) {
    const open = items.filter((i) => !i.checked);
    const done = items.filter((i) => i.checked);
    const groups = new Map();
    for (const item of open) {
      const name = String(item.label?.name || "");
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    // The API gives items no label position, so groups sort by name for a stable order.
    const named = [...groups.keys()]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, this._locale || undefined, { sensitivity: "base" }));
    const labelled = named.length > 0;
    const section = (name, list) =>
      `${name ? `<div class="shopping-group-title">${esc(name)}</div>` : ""}${list.map((i) => this._shoppingRow(i)).join("")}`;
    const parts = named.map((n) => section(n, groups.get(n)));
    if (groups.has(""))
      parts.push(section(labelled ? this.t("shoppingOther") : "", groups.get("")));
    if (done.length) parts.push(section(open.length ? this.t("shoppingTicked") : "", done));
    return parts.join("");
  },
  /** Ticked items that exist on the server; unsent local rows are left alone. */
  _shoppingClearable(items) {
    return items.filter((i) => i.checked && !this._shoppingRowBusy(i)).length;
  },
  _shopping() {
    const lists = asArray(this._data.shopping?.lists);
    const all = this._offlineItems(asArray(this._data.shopping?.items));
    const selected = this._activeList || String(lists[0]?.id || "");
    const filtered = all.filter((i) => String(i.shoppingListId) === selected);
    const done = filtered.filter((i) => i.checked).length;
    if (!lists.length && !filtered.length && this._failedParts?.has("shopping")) {
      if (this._loadErrorShown()) return "";
      return `<div class="shopping-card"><div class="notice load-failed" role="status">${icon("cart")} ${esc(this.t("offline"))}</div></div>`;
    }
    return `<div class="shopping-card"><div class="toolbar shopping-toolbar">${this._syncEntryButton()}${this._permissions.can_write ? `<button class="btn tiny" data-action="create-list-form">${icon("plus", 14)} ${esc(this.t("createList"))}</button>` : ""}${this._permissions.can_write && lists.length && this._shoppingClearable(filtered) ? `<button class="btn tiny" data-action="shopping-clear-form">${icon("trash", 14)} ${esc(this.t("shoppingClearTicked"))}</button>` : ""}</div>${lists.length ? `<div class="shopping-list-filter"><select data-input="shopping-list" aria-label="${esc(this.t("label"))}">${lists.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === selected ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select><span class="pill">${done}/${filtered.length} ${esc(this.t("progress"))}</span></div>` : ""}
      ${this._offlineBar()}<div class="shopping-list">${this._shoppingRows(filtered)}
      ${!filtered.length && !this._failedParts?.has("shopping") ? `<div class="notice">${icon("cart")} ${esc(lists.length ? this.t("noShopping") : this.t("addListFirst"))}</div>` : ""}</div>
      ${lists.length && this._permissions.can_write ? `<form class="shopping-form" data-form="shopping-add"><input name="note" required maxlength="250" placeholder="${esc(this.t("addItem"))}" aria-label="${esc(this.t("addItem"))}"><button class="btn primary" type="submit">${icon("plus", 14)} ${esc(this.t("add"))}</button></form>` : ""}</div>`;
  },
  _today() {
    const today = dateYmd(new Date());
    const meals = this._plannedMeals().filter((m) => m.date === today);
    const lists = asArray(this._data.shopping?.lists);
    const selected = this._activeList || String(lists[0]?.id || "");
    const open = this._offlineItems(asArray(this._data.shopping?.items)).filter(
      (x) => String(x.shoppingListId) === selected && !x.checked,
    );
    const shopFailed = this._failedParts?.has("shopping") === true;
    return `${this._intro(this.t("todayIntro"), this.t("todaySub"), esc(dayString(this._locale, new Date(), { weekday: "long", day: "numeric", month: "long" })).toUpperCase())}
    <div class="today-board"><div class="today-panel"><div class="eyebrow">${esc(this.t("plannedForToday"))}</div><h3>${esc(this.t("tonight"))}</h3>
    ${meals.length ? meals.map((meal) => `<div class="today-meal">${this._photo(meal.recipe || {}, "", true) ? `<div class="meal-photo">${this._photo(meal.recipe || {}, "", true)}</div>` : `<div class="meal-badge">${icon("utensils", 22)}</div>`}<div class="meal-details"><small>${esc(this._mealTypeLabel(meal.entryType))}</small><strong>${esc(mealName(meal))}</strong></div>${meal.recipe?.slug ? `<button class="btn tiny icon-only" data-tile data-action="open-recipe" data-value="${esc(meal.recipe.slug)}" aria-label="${esc(this.t("viewRecipe") + ": " + mealName(meal))}">${icon("arrow", 14)}</button>` : ""}</div>`).join("") : this._failedParts?.has("mealplan") ? "" : `<div class="notice">${icon("spark", 16)} ${esc(this.t("noPlan"))}</div>`}
    <div class="form-actions">${this._permissions.can_write ? `<button class="btn primary" data-action="plan-form" data-value="${today}">${icon("plus", 14)} ${esc(this.t("planNow"))}</button>` : ""}</div></div>
    <div class="today-panel"><div class="eyebrow">${esc(lists.find((l) => String(l.id) === selected)?.name || this.t("shopping"))}</div><h3>${shopFailed ? "—" : esc(this.tp("openItems", open.length))}</h3>
    ${
      shopFailed
        ? `<div class="notice load-failed" role="status">${icon("cart", 16)} ${esc(this.t("offline"))}</div>`
        : open.length
          ? open
              .slice(0, 6)
              .map(
                (x) =>
                  `<div class="mini-shopping"><button class="check-ui" data-action="shopping-toggle" data-id="${esc(x.id)}" data-checked="false" role="checkbox" aria-checked="false" aria-label="${esc(String(x.id).startsWith("local-") ? this.t("offlineWaiting") : String(x.id).startsWith("pending-") ? this.t("uiSaving") : this.t("uiMarkComplete") + this._shoppingLabel(x))}" ${!this._canTickShopping || /^(pending|local)-/.test(String(x.id)) ? 'disabled aria-disabled="true"' : ""}>${icon("check", 14)}</button><span class="mini-shopping-name">${esc(this._shoppingLabel(x))}</span></div>`,
              )
              .join("")
          : this._failedParts?.has("shopping")
            ? ""
            : `<div class="notice">${icon("check", 16)} ${esc(this.t("noShopping"))}</div>`
    }
    <div class="form-actions"><button class="btn" data-action="nav" data-value="shopping">${esc(this.t("toShopping"))} ${icon("arrow", 14)}</button></div></div></div>`;
  },
  _manage() {
    if (!this._permissions.can_manage)
      return this._permissions.can_write
        ? `<div class="notice">${esc(this.t("adminOnlyHint"))}</div>`
        : ""; // the global read-only banner already explains the missing write access
    return `<div class="manage-grid"><div class="manage-card"><div class="stat-icon">${icon("plus", 21)}</div><h3>${esc(this.t("create"))}</h3><p>${esc(this.t("recipeTip"))}</p><button class="btn primary" data-action="create-form">${icon("plus", 14)} ${esc(this.t("create"))}</button></div>
    <div class="manage-card"><div class="stat-icon">${icon("external", 21)}</div><h3>${esc(this.t("import"))}</h3><p>${esc(this.t("importTip"))}</p><button class="btn" data-action="import-form">${icon("arrow", 14)} ${esc(this.t("import"))}</button></div></div>
    <div class="section"><div class="heading"><div><h2>${esc(this.t("saveNote"))}</h2><p>${esc(this.t("uiManageBasicsHint"))}</p></div></div>${this._recipes(12)}</div>`;
  },
  _body() {
    if (this._busy && !this._data.recipes)
      return `<div class="skeleton" role="status" aria-label="${esc(this.t("loading"))}"><div class="eyebrow">${esc(this.t("loading"))}</div><div class="skeleton-hero"></div><div class="skeleton-row"><div class="skeleton-tile"></div><div class="skeleton-tile"></div><div class="skeleton-tile"></div></div></div>`;
    const view = this._view;
    if (view === "dashboard")
      return `${this._intro(this.t("greeting"), this.t("greetingSub"), this.t("eyebrow"))}${this._hero()}${this._stats()}
      <section class="section"><div class="heading"><div><h2>${esc(this.t("collections"))}</h2>${this._libraryEmpty() ? "" : `<p>${esc(this.t("recipesSub"))}</p>`}</div><button class="btn plain" data-action="nav" data-value="recipes">${esc(this.t("all"))} ${icon("arrow", 14)}</button></div>${this._recipes(6)}</section>
      <section class="section"><div class="heading"><div><h2>${esc(this.t("week"))}</h2></div><button class="btn plain" data-action="nav" data-value="mealplan">${esc(this.t("mealplan"))} ${icon("arrow", 14)}</button></div>${this._week()}</section>
      <section class="section"><div class="heading"><h2>${esc(this.t("list"))}</h2><button class="btn plain" data-action="nav" data-value="shopping">${esc(this.t("shopping"))} ${icon("arrow", 14)}</button></div>${this._shopping()}</section>`;
    if (view === "today") return this._today();
    if (view === "recipes")
      return `${this._intro(this.t("collections"), this.t("recipesSub"), this.t("eyebrow"))}${this._recipeTools()}${this._recipes()}${this._pagination()}`;
    if (view === "mealplan")
      return `${this._intro(this.t("week"), this.t("mealplanSub"), this.t("eyebrow"))}<div class="heading"><div><h2>${esc(this._planMonthLabel())}</h2><p>${esc(this._dayRange(this._weekStart, this._planDayCount()))}</p></div><div class="toolbar"><button class="btn tiny" data-action="week-prev">${esc(this.t("back"))}</button><button class="btn tiny" data-action="week-today"${this._planShowsCurrentWeek() ? " disabled" : ""}>${esc(this.t("today"))}</button><button class="btn tiny" data-action="week-next">${esc(this.t("next"))}</button></div></div>${this._planMovable() ? `<p class="plan-move-hint">${esc(this.t(globalThis.matchMedia?.("(hover: none)")?.matches ? "planMoveHintTouch" : "planMoveHint"))}</p>` : ""}${this._config.week_days === 7 ? `<p class="week-swipe-hint">${this.t("uiSwipeToBrowseAllSevenDays")}</p>` : ""}${this._weekStack()}`;
    if (view === "shopping")
      return `${this._intro(this.t("list"), this.t("shoppingSub"), this.t("eyebrow"))}${this._shopping()}`;
    return `${this._intro(this.t("admin"), this.t("manageSub"), this.t("eyebrow"))}${this._manage()}`;
  },
};
