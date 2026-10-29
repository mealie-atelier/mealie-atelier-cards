/** Render the primary card views from normalized provider state. */
export const viewMethods = {
  _hero() {
    const today = dateYmd(new Date());
    const entry =
      asArray(this._data.mealplan).find((e) => e.date === today && e.entryType === "dinner") ||
      asArray(this._data.mealplan).find((e) => e.date === today);
    const title = entry ? mealName(entry) : this.t("headline");
    const name = entry?.recipe?.name;
    const img = recipeImage(entry?.recipe || {}, "hero-food");
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
    const scheduled = asArray(this._data.mealplan).length;
    const failed = this._loadFailed === true;
    return `<div class="statline">${this._stat(failed ? "—" : (total ?? "—"), this.t("count"), "book", "recipes")}${this._stat(failed ? "—" : scheduled, this.t("nextMeal"), "calendar", "mealplan")}${this._stat(failed ? "—" : open, this.t("openItemsLabel"), "cart", "shopping")}</div>`;
  },
  _recipeTools() {
    return `<div class="recipe-tools"><label class="search">${icon("search", 17)}<input type="search" data-input="search" aria-label="${esc(this.t("search"))}" autocomplete="off" placeholder="${esc(this.t("search"))}" value="${esc(this._query)}"></label>${this._permissions.can_manage ? `<button class="btn tiny" data-action="create-form">${icon("plus", 14)} ${esc(this.t("create"))}</button>` : ""}</div>`;
  },
  _recipes(limit = 24) {
    const recipes = asArray(this._data.recipes?.items);
    const localPage = this._providerActive === "home_assistant" && limit === 24;
    const list = localPage
      ? recipes.slice((this._page - 1) * limit, this._page * limit)
      : recipes.slice(0, limit);
    const ratio =
      { portrait: "4/5", square: "1/1", landscape: "4/3" }[this._design.photo_ratio] || "4/5";
    return `<div class="recipe-grid ${limit < 24 ? "is-featured" : ""}" style="--at-cols:${Math.min(4, Math.max(1, Number(this._design.columns) || 3))};--at-tile-ratio:${ratio}">${list
      .map((recipe, idx) => {
        const category =
          recipe.recipeCategory?.[0]?.name || recipe.recipeCategory?.[0] || this.t("featured");
        const image = this._design.show_images !== false;
        const timeLabel =
          AtelierStudio.formatTime(recipe.totalTime, this._language) ||
          this.t("uiMealieRecipeFallback");
        return `<button class="recipe-tile" data-action="open-recipe" data-value="${esc(recipe.slug)}" aria-label="${esc(recipe.name)}"><div class="tile-image tint${idx % 4}">${image ? recipeImage(recipe) : ""}<div class="photo-index">ATELIER / ${String(idx + 1).padStart(2, "0")}</div><div class="placeholder">${esc(recipe.name)}</div></div><div class="tile-body"><small>${esc(category)}</small><h3>${esc(recipe.name)}</h3><div class="tile-meta">${icon("clock", 13)}${esc(timeLabel)}</div><span class="tile-open">${icon("arrow", 13)}</span></div></button>`;
      })
      .join(
        "",
      )}</div>${this._providerActive === "home_assistant" ? `<p class="provider-note" role="status">${this.t("uiUpTo500MatchesThroughHomeAssistantPhotosAndAtelierWriteFeaturesStayDisabledForSecurity")}</p>${this._providerTruncated ? `<p class="provider-note" role="status">${esc(this.t("uiProviderResultsTruncated", { limit: NATIVE_RESULT_LIMIT }))}</p>` : ""}` : ""}${!list.length && !this._loadFailed ? `<div class="notice">${icon("book")} ${esc(this.t(this._libraryEmpty() ? "uiEmptyLibrary" : "noRecipes"))}</div>` : ""}`;
  },
  _pagination() {
    const page = this._data.recipes || {};
    const p = Number(page.page || this._page);
    const total = Number(page.total || 0);
    const size = Number(page.per_page || page.perPage || 24);
    const last = Math.max(1, Math.ceil(total / Math.max(size, 1)));
    if (last <= 1) return "";
    return `<div class="pager"><button class="btn tiny" data-action="page" data-value="${p - 1}" ${p <= 1 ? "disabled" : ""}>${esc(this.t("back"))}</button><span>${p} / ${last}</span><button class="btn tiny" data-action="page" data-value="${p + 1}" ${p >= last ? "disabled" : ""}>${esc(this.t("next"))}</button></div>`;
  },
  _week() {
    const all = asArray(this._data.mealplan);
    const today = dateYmd(new Date());
    return `<div class="week-grid">${Array.from({ length: 7 }, (_, i) => {
      const day = addDays(this._weekStart, i),
        ymd = dateYmd(day),
        todays = all.filter((m) => m.date === ymd);
      return `<div class="day ${ymd === today ? "today" : ""}"><div class="day-head"><span>${esc(dayString(this._locale, day, { weekday: "short" }))}</span><b>${day.getDate()}</b></div>
      ${todays
        .slice(0, 3)
        .map((meal) => {
          const photo = recipeImage(meal.recipe || {});
          return `<button class="day-meal${photo ? " has-photo" : ""}" data-action="day-meal" data-value="${esc(meal.recipe?.slug || "")}" title="${esc(mealName(meal))}">${photo ? `<span class="day-meal-photo">${photo}</span>` : ""}<small>${esc(this.t(meal.entryType) || meal.entryType || "")}</small><span class="day-meal-name">${esc(mealName(meal))}</span></button>`;
        })
        .join("")}
      ${todays.length === 0 ? `<div class="day-empty">${esc(this.t("noPlan"))}</div>` : ""}${this._permissions.can_write ? `<button class="day-add" data-action="plan-form" data-value="${ymd}" aria-label="${esc(this.t("planNow"))}">${icon("plus", 16)}</button>` : ""}</div>`;
    }).join("")}</div>`;
  },
  _shopping() {
    const lists = asArray(this._data.shopping?.lists);
    const all = this._offlineItems(asArray(this._data.shopping?.items));
    const selected = this._activeList || String(lists[0]?.id || "");
    const filtered = all.filter((i) => String(i.shoppingListId) === selected);
    const done = filtered.filter((i) => i.checked).length;
    return `<div class="shopping-card"><div class="toolbar shopping-toolbar"><button class="btn tiny" data-action="print-list">${icon("print", 14)} ${this.t("uiPrintPDF")}</button>${this._syncEntryButton()}${this._permissions.can_write ? `<button class="btn tiny" data-action="create-list-form">${icon("plus", 14)} ${esc(this.t("createList"))}</button>` : ""}</div>${lists.length ? `<div class="shopping-list-filter"><select data-input="shopping-list" aria-label="${esc(this.t("label"))}">${lists.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === selected ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select><span class="pill">${done}/${filtered.length} ${esc(this.t("progress"))}</span></div>` : ""}
      ${this._offlineBar()}<div class="shopping-list">${filtered.map((item) => `<div class="shopping-row ${item.checked ? "checked" : ""}"><button class="check-ui" data-action="shopping-toggle" data-id="${esc(item.id)}" data-checked="${item.checked ? "true" : "false"}" role="checkbox" aria-checked="${item.checked ? "true" : "false"}" ${!this._permissions.can_write || /^(pending|local)-/.test(String(item.id)) ? 'disabled aria-disabled="true"' : ""} aria-label="${esc(String(item.id).startsWith("local-") ? this.t("offlineWaiting") : String(item.id).startsWith("pending-") ? this.t("uiSaving") : this.t(item.checked ? "uiMarkShoppingOpen" : "uiMarkShoppingComplete", { item: item.display || item.note || item.food?.name || this.t("itemFallback") }))}">${icon("check", 14)}</button><span class="shopping-name">${esc(item.display || item.note || item.food?.name || this.t("itemFallback"))}</span><span class="shopping-qty">${esc(item.offlineWaiting ? this.t("offlineWaiting") : item.quantity && item.quantity !== 1 ? item.quantity : "")}</span></div>`).join("")}
      ${!filtered.length ? `<div class="notice">${icon("cart")} ${esc(lists.length ? this.t("noShopping") : this.t("addListFirst"))}</div>` : ""}</div>
      ${lists.length && this._permissions.can_write ? `<form class="shopping-form" data-form="shopping-add"><input name="note" required maxlength="250" placeholder="${esc(this.t("addItem"))}" aria-label="${esc(this.t("addItem"))}"><button class="btn primary" type="submit">${icon("plus", 14)} ${esc(this.t("add"))}</button></form>` : ""}</div>`;
  },
  _today() {
    const today = dateYmd(new Date());
    const meals = asArray(this._data.mealplan).filter((m) => m.date === today);
    const lists = asArray(this._data.shopping?.lists);
    const selected = this._activeList || String(lists[0]?.id || "");
    const open = this._offlineItems(asArray(this._data.shopping?.items)).filter(
      (x) => String(x.shoppingListId) === selected && !x.checked,
    );
    return `${this._intro(this.t("todayIntro"), this.t("todaySub"), esc(dayString(this._locale, new Date(), { weekday: "long", day: "numeric", month: "long" })).toUpperCase())}
    <div class="today-board"><div class="today-panel"><div class="eyebrow">${esc(this.t("plannedForToday"))}</div><h3>${esc(this.t("tonight"))}</h3>
    ${meals.length ? meals.map((meal) => `<div class="today-meal">${recipeImage(meal.recipe || {}) ? `<div class="meal-photo">${recipeImage(meal.recipe || {})}</div>` : `<div class="meal-badge">${icon("utensils", 22)}</div>`}<div class="meal-details"><small>${esc(this.t(meal.entryType) || meal.entryType)}</small><strong>${esc(mealName(meal))}</strong></div>${meal.recipe?.slug ? `<button class="btn tiny icon-only" data-action="open-recipe" data-value="${esc(meal.recipe.slug)}" aria-label="${esc(this.t("viewRecipe") + ": " + mealName(meal))}">${icon("arrow", 14)}</button>` : ""}</div>`).join("") : `<div class="notice">${icon("spark", 16)} ${esc(this.t("noPlan"))}</div>`}
    <div class="form-actions">${this._permissions.can_write ? `<button class="btn primary" data-action="plan-form" data-value="${today}">${icon("plus", 14)} ${esc(this.t("planNow"))}</button>` : ""}</div></div>
    <div class="today-panel"><div class="eyebrow">${esc(lists.find((l) => String(l.id) === selected)?.name || this.t("shopping"))}</div><h3>${esc(this.tp("openItems", open.length))}</h3>
    ${
      open.length
        ? open
            .slice(0, 6)
            .map(
              (x) =>
                `<div class="mini-shopping"><span>${icon("cart", 15)}</span><button data-action="shopping-toggle" data-id="${esc(x.id)}" data-checked="false" aria-label="${esc(String(x.id).startsWith("local-") ? this.t("offlineWaiting") : String(x.id).startsWith("pending-") ? this.t("uiSaving") : this.t("uiMarkComplete") + (x.display || x.note || x.food?.name || this.t("itemFallback")))}" ${!this._permissions.can_write || /^(pending|local)-/.test(String(x.id)) ? 'disabled aria-disabled="true"' : ""}>${esc(x.display || x.note || x.food?.name || "")}</button></div>`,
            )
            .join("")
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
      <section class="section"><div class="heading"><div><h2>${esc(this.t("collections"))}</h2><p>${esc(this.t("recipesSub"))}</p></div><button class="btn plain" data-action="nav" data-value="recipes">${esc(this.t("all"))} ${icon("arrow", 14)}</button></div>${this._recipes(6)}</section>
      <section class="section"><div class="heading"><div><h2>${esc(this.t("week"))}</h2></div><button class="btn plain" data-action="nav" data-value="mealplan">${esc(this.t("mealplan"))} ${icon("arrow", 14)}</button></div>${this._week()}</section>
      <section class="section"><div class="heading"><h2>${esc(this.t("list"))}</h2><button class="btn plain icon-only" data-action="nav" data-value="shopping" aria-label="${esc(this.t("toShopping"))}" title="${esc(this.t("toShopping"))}">${icon("arrow", 14)}</button></div>${this._shopping()}</section>`;
    if (view === "today") return this._today();
    if (view === "recipes")
      return `${this._intro(this.t("collections"), this.t("recipesSub"), this.t("eyebrow"))}${this._recipeTools()}${this._recipes()}${this._pagination()}`;
    if (view === "mealplan")
      return `${this._intro(this.t("week"), this.t("mealplanSub"), this.t("eyebrow"))}<div class="heading"><div><h2>${esc(dayString(this._locale, this._weekStart, { month: "long", year: "numeric" }))}</h2><p>${esc(dayString(this._locale, this._weekStart, { day: "numeric", month: "short" }))} – ${esc(dayString(this._locale, addDays(this._weekStart, 6), { day: "numeric", month: "short" }))}</p></div><div class="toolbar"><button class="btn tiny" data-action="print-week">${icon("print", 13)} ${this.t("uiPrint")}</button><button class="btn tiny" data-action="week-prev">${esc(this.t("back"))}</button><button class="btn tiny" data-action="week-today">${esc(this.t("today"))}</button><button class="btn tiny" data-action="week-next">${esc(this.t("next"))}</button></div></div><p class="week-swipe-hint">${this.t("uiSwipeToBrowseAllSevenDays")}</p>${this._week()}`;
    if (view === "shopping")
      return `${this._intro(this.t("list"), this.t("shoppingSub"), this.t("eyebrow"))}${this._shopping()}`;
    return `${this._intro(this.t("admin"), this.t("manageSub"), this.t("eyebrow"))}${this._manage()}`;
  },
};
