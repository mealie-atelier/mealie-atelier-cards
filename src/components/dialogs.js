/** Render modal workflows and their accessible dialog content. */
export const dialogMethods = {
  _modalHtml() {
    if (!this._modal) return "";
    const closing = `<button class="icon-btn modal-close" data-action="close-modal" title="${esc(this.t("close"))}" aria-label="${esc(this.t("close"))}">${icon("close")}</button>`;
    let content = "",
      size = "";
    if (this._modal === "command") {
      size = "command";
      const permitted = MODES.filter((m) =>
        this._providerActive === "home_assistant"
          ? m === "recipes"
          : m !== "manage" || this._permissions.can_manage,
      );
      const navIcons = {
        dashboard: "home",
        today: "sun",
        discover: "spark",
        recipes: "book",
        mealplan: "calendar",
        pantry: "leaf",
        shopping: "cart",
        family: "utensils",
        cookbook: "print",
        manage: "gear",
      };
      content = `<div class="command-content"><div class="command-heading"><span class="eyebrow">ATELIER</span>${this.t("uiFindYourNextFavorite")}</div>
      <label class="command-search">${icon("search", 19)}<input data-input="command-search" type="search" placeholder="${this.t("uiSearchRecipesIngredientsOrViews")}" autocomplete="off" aria-label="${this.t("uiSearchRecipesIngredientsAndQuickActions")}"></label>
      <div class="command-hint" data-command-hint>${this.t("uiSearchYourRecipesIncludingByIngredient")} <span class="command-example">${this.t("uiSearchConversionExample")}</span></div>
      <div class="command-shortcuts"><div class="command-section">${this.t("uiYOURKITCHEN")}</div><div class="command-list" role="group" aria-label="${this.t("uiNavigation")}">
      ${permitted.map((m) => `<button class="command-item" type="button" data-action="nav" data-value="${m}">${icon(navIcons[m], 18)}<span>${esc(this.t(m))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>`).join("")}
      ${this._permissions.can_manage ? `<button class="command-item" type="button" data-action="create-form">${icon("plus", 18)}<span>${esc(this.t("create"))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button>` : ""}
      <button class="command-item" type="button" data-action="refresh">${icon("refresh", 18)}<span>${esc(this.t("refresh"))}</span><span class="command-arrow">${icon("arrow", 15)}</span></button></div>
      <div class="command-empty">${this.t("uiNoMatchingViewsOrActions")}</div></div>
      <div class="command-live" data-command-live aria-live="polite" aria-busy="false"></div>
      <div class="command-footer"><span>↑ ↓ ${this.t("uiSelect")} · ↵ ${this.t("uiOpen")}</span><span>Esc ${this.t("uiClose")}</span></div></div>`;
    }
    if (this._modal === "nutrition" && this._nutrition) {
      size = "large";
      content = this._nutritionMarkup();
    }
    if (this._modal === "journal" && this._detail) {
      size = "large";
      content = this._journalMarkup();
    }
    if (this._modal === "loading")
      content = `<div class="modal-content skeleton">${esc(this.t("loading"))}</div>`;
    if (this._modal === "recipe" && this._detail) {
      const recipe = this._detail,
        ingredients = asArray(recipe.recipeIngredient),
        steps = asArray(recipe.recipeInstructions);
      const discoverTarget =
        this._discoverResults && this._discoverSelected === recipe.slug
          ? Number(this._discoverDraft?.people) || 0
          : 0;
      const servingBase = AtelierStudio.recipeServings(recipe);
      const servingWord = this.tp("uiServing", discoverTarget);
      const yieldText =
        recipe.recipeYieldQuantity && recipe.recipeYield
          ? `${recipe.recipeYieldQuantity} ${recipe.recipeYield}`
          : recipe.recipeYield;
      const baseYield =
        Number(recipe.recipeServings) > 0
          ? `${recipe.recipeServings} ${this.tp("uiServing", Number(recipe.recipeServings))}`
          : yieldText;
      const scaledYield =
        discoverTarget && servingBase ? `${discoverTarget} ${servingWord}` : baseYield || "—";
      const scaleNote =
        discoverTarget && servingBase && discoverTarget !== servingBase
          ? `<p class="studio-serving-note">${this.t("uiScaleServingsNote", { target: discoverTarget, base: servingBase })}</p>`
          : "";
      const img = recipeImage(recipe);
      const stepRows = steps
        .map((step, i) => {
          const section = typeof step === "object" && step ? String(step.title || "") : "";
          const summary = typeof step === "object" && step ? String(step.summary || "") : "";
          const previous = steps[i - 1],
            previousSection =
              typeof previous === "object" && previous ? String(previous.title || "") : "";
          const sectionHeading =
            section && section !== previousSection
              ? `<h4 class="step-section">${esc(section)}</h4>`
              : "";
          const photos = instructionImages(step)
            .map(
              (src) =>
                `<img class="step-photo" src="${esc(src)}" alt="${this.t("uiRecipeStepImageAlt", { step: i + 1 })}" loading="lazy" decoding="async">`,
            )
            .join("");
          return `<div class="recipe-step-row" role="listitem">${sectionHeading}<button class="step ${this._checkedSteps.has(i) ? "active" : ""}" type="button" data-action="step-check" data-value="${i}" aria-pressed="${this._checkedSteps.has(i)}"><span class="step-number">${String(i + 1).padStart(2, "0")}</span><span class="step-copy">${summary ? `<strong class="step-summary">${esc(summary)}</strong>` : ""}<span class="step-text">${esc(instructionText(step))}</span>${photos ? `<span class="step-photos">${photos}</span>` : ""}</span></button></div>`;
        })
        .join("");
      size = "large";
      content = `<div class="modal-hero">${img || icon("utensils", 78)}</div><div class="modal-content"><div class="eyebrow">${esc(this.t("featured"))}</div><h2 class="recipe-title">${esc(recipe.name)}</h2><p class="description">${esc(recipe.description)}</p>
        <div class="recipe-meta"><span class="pill">${icon("clock", 12)} ${esc(AtelierStudio.formatTime(recipe.totalTime, this._language) || "—")}</span><span class="pill">${icon("utensils", 12)} ${esc(scaledYield)}</span></div>
        <div class="toolbar recipe-actions"><button class="btn primary" data-action="cook-start" ${!steps.length ? "disabled" : ""}>${icon("utensils", 16)} ${esc(this.t("cookStart"))}</button>${this._providerActive === "home_assistant" ? "" : `<button class="btn" data-action="nutrition-open">${icon("leaf", 16)} ${esc(this.t("nutrition"))}</button>`}<button class="btn" data-action="journal-open">${icon("book", 16)} ${esc(this.t("journal"))}</button><button class="btn" data-action="print-recipe">${icon("print", 16)} ${this.t("uiPrintPDF")}</button>${this._permissions.can_write ? `<button class="btn" data-action="plan-form" data-value="${dateYmd(new Date())}">${icon("calendar", 16)} ${esc(this.t("addToPlan"))}</button><button class="btn" data-action="recipe-to-list-form">${icon("cart", 16)} ${esc(this.t("shoppingFromRecipe"))}</button>` : ""}${this._permissions.can_manage ? `<button class="btn" data-action="edit-form">${icon("edit", 16)} ${esc(this.t("edit"))}</button>` : ""}</div>
        ${this._journal[recipe.slug]?.note ? `<div class="journal-hint"><span>${esc(this.t("journalNote"))}</span><strong>${esc(this._journal[recipe.slug].note)}</strong></div>` : ""}
        ${
          recipe.nutrition && Object.values(recipe.nutrition).some(Boolean)
            ? `<div class="nutri-current"><span>${esc(this.t("nutrition"))} · Mealie</span>${[
                ["calories", "kcal"],
                ["proteinContent", this.t("uiProtein")],
                ["carbohydrateContent", this.t("uiCarbs")],
                ["fatContent", this.t("uiFat")],
              ]
                .filter(([k]) => recipe.nutrition[k])
                .map(([k, label]) => `<strong>${esc(label)} ${esc(recipe.nutrition[k])}</strong>`)
                .join("")}</div>`
            : ""
        }
        <div class="detail-cols"><div><h3>${esc(this.t("ingredients"))}</h3>${scaleNote}${ingredients.length ? ingredients.map((ing, i) => `<label class="ingredient"><input type="checkbox" data-input="ingredient" data-index="${i}" ${this._checkedIngredients.has(i) ? "checked" : ""}><span>${esc(discoverTarget && servingBase ? AtelierStudio.scaleIngredient(ing, discoverTarget, servingBase) : ingredientName(ing))}</span></label>`).join("") : "—"}</div>
        <div class="detail-instructions"><h3>${esc(this.t("instructions"))}</h3>${steps.length ? `<div class="recipe-steps" role="list">${stepRows}</div>` : "—"}</div></div></div>`;
    }
    if (this._modal === "cook" && this._detail) {
      const steps = asArray(this._detail.recipeInstructions),
        n = steps.length,
        idx = Math.min(this._cookIndex, Math.max(n - 1, 0));
      const current = steps[idx] || {},
        stepTitle = typeof current === "object" && current ? String(current.title || "") : "";
      const stepSummary =
        typeof current === "object" && current ? String(current.summary || "") : "";
      const stepBody = instructionText(current || this.t("done"));
      const stepPhoto = instructionImages(current)[0];
      const cookServings = AtelierStudio.recipeServings(this._detail);
      const cookYield =
        Number(this._detail.recipeServings) > 0
          ? `${cookServings} ${this.tp("uiServing", cookServings)}`
          : this._detail.recipeYieldQuantity && this._detail.recipeYield
            ? `${this._detail.recipeYieldQuantity} ${this._detail.recipeYield}`
            : this._detail.recipeYield || "";
      size = "large";
      content = `<div class="cook-layout"><div class="cook-visual">${recipeImage(this._detail, "cook-visual-image")}<div class="cook-brand">${esc(this._detail.name)}</div></div>
        <div class="cook-content"><div class="cook-topline"><span>${esc(this.t("cooking"))}</span><span>${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}</span></div>
        <div class="cook-track" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${idx + 1}"><div class="cook-fill" style="width:${((idx + 1) / Math.max(1, n)) * 100}%"></div></div>
        ${AtelierWakeLock.supported() ? `<label class="cook-wake"><input type="checkbox" data-input="keep-awake" ${this._design.keep_awake !== false ? "checked" : ""}> ${esc(this.t("uiKeepScreenAwake"))}</label>` : ""}
        <div class="cook-stage" data-swipe-hint="${esc(this.t("cookSwipeHint"))}">${stepTitle ? `<p class="cook-step-section">${esc(stepTitle)}</p>` : ""}<h2>${esc(stepSummary || stepBody)}</h2>${stepSummary ? `<p class="cook-step-detail">${esc(stepBody)}</p>` : ""}${stepPhoto ? `<figure class="cook-step-figure"><img class="cook-step-photo" src="${esc(stepPhoto)}" alt="${esc(`${this._detail.name} · ${this.t("uiStep")} ${idx + 1}`)}" decoding="async"></figure>` : ""}<p class="muted">${esc(cookYield)}</p></div>
        <div class="cook-controls"><section class="cook-utility" aria-label="${this.t("uiKitchenTimers")}">
          <header class="cook-timer-header"><span class="cook-timer-mark" aria-hidden="true">${icon("clock", 16)}</span><div><span class="cook-timer-kicker">${this.t("uiATELIERKITCHENTIMER")}</span><strong>${this.t("uiKeepEverythingInRhythm")}</strong></div><span class="cook-timer-count">${this._timers.filter((timer) => !timer.done).length} ${this.t("uiactive")}</span></header>
          <div class="cook-timers" aria-live="off">${
            this._timers.length
              ? this._timers
                  .map((timer) => {
                    const now = Date.now(),
                      remaining = timer.done
                        ? 0
                        : Math.max(0, Math.ceil((timer.deadline - now) / 1000));
                    const duration = Number(timer.durationMs) || 0,
                      progress =
                        timer.startedAt && duration
                          ? Math.min(100, Math.max(0, ((now - timer.startedAt) / duration) * 100))
                          : null;
                    const remainingText = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
                    const context = timer.stepIndex ? `${this.t("uiStep")} ${timer.stepIndex}` : "";
                    const timeLabel = `${timer.label} · ${this.t("uitimeRemaining")}`;
                    const durationLabel = duration
                      ? `${Math.round(duration / 60000)} ${this.t("uiminutes")}`
                      : this.t("uiActiveTimer");
                    return `<article class="cook-timer-card ${timer.done ? "is-done" : ""} ${progress === null ? "is-progress-unknown" : ""}" data-cook-timer="${esc(timer.id)}"><span class="cook-timer-dial" data-timer-ring style="--timer-progress:${progress === null ? 0 : progress.toFixed(2)}%"><span><time role="timer" data-timer-remaining="${esc(timer.id)}" aria-label="${esc(timeLabel)}">${remainingText}</time></span></span><span class="cook-timer-copy"><span class="cook-timer-status">${timer.done ? this.t("uiREADY") : this.t("uiRUNNING")}</span><strong>${esc(timer.label)}</strong><small>${durationLabel}${context ? ` · ${esc(context)}` : ""}</small></span><button class="icon-btn" data-action="timer-remove" data-value="${esc(timer.id)}" aria-label="${esc(this.t("timerRemove"))}">${icon("close", 16)}</button></article>`;
                  })
                  .join("")
              : `<div class="cook-timers-empty"><span aria-hidden="true">${icon("spark", 15)}</span><span>${this.t("uiNoTimerRunningYetSetOneToKeepEverythingInRhythm")}</span></div>`
          }</div>
          <div class="cook-timer-compose"><div class="cook-timer-presets" role="group" aria-label="${this.t("uiQuickTimerPresets")}">${[5, 10, 15].map((minutes) => `<button type="button" data-action="timer-preset" data-value="${minutes}">${minutes} ${this.t("uimin")}</button>`).join("")}</div><div class="cook-timer-fields"><label><span>${this.t("uiMinutes")}</span><input type="number" data-timer-minutes min="1" max="180" value="10" inputmode="numeric" aria-label="${this.t("uiTimerDurationInMinutes")}"></label><label><span>${this.t("uiLabelOptional")}</span><input type="text" data-timer-label maxlength="40" placeholder="${this.t("uieGOven")}"></label><button class="btn primary cook-timer-start" data-action="timer-start">${icon("clock", 16)} ${this.t("uiStartTimer")}</button></div></div>
        </section>
        ${this._journal[this._detail.slug]?.note ? `<div class="cook-note">${icon("book", 14)} ${esc(this._journal[this._detail.slug].note)}</div>` : ""}
        <div class="cook-actions"><button class="btn" data-action="cook-back" ${idx <= 0 ? "disabled" : ""}>${icon("chevron", 15)} ${esc(this.t("back"))}</button><button class="btn primary" data-action="${idx >= n - 1 ? "cook-finish" : "cook-next"}">${esc(this.t(idx >= n - 1 ? "done" : "next"))} ${icon("arrow", 15)}</button></div>
        <p class="cook-footnote">${this.t("uiOneStepAtATimeYouCanAlwaysReturnToTheFullRecipe")}</p></div>
        </div></div>`;
    }
    if (this._modal === "plan") {
      const d = this._planDay || dateYmd(new Date());
      const all = asArray(this._data.mealplan).filter((m) => m.date === d);
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogWeeklyMenu")}</div><h2>${esc(this.t("planNow"))}</h2><p>${this.t("uiPlanMealsQuicklyWithoutClutter")}</p></div><div class="editor-stamp">${icon("calendar", 26)}</div></div>
        <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogYourMenu")}</div><form class="editor-form" data-form="plan">
          <div class="editor-columns"><label class="field"><span>${esc(this.t("day"))}</span><input type="date" name="date" value="${esc(d)}" required></label>
          <label class="field"><span>${esc(this.t("mealType"))}</span><select name="meal_type"><option value="dinner">${esc(this.t("dinner"))}</option><option value="lunch">${esc(this.t("lunch"))}</option><option value="breakfast">${esc(this.t("breakfast"))}</option></select></label></div>
          ${this._pickerMarkup()}
          <div class="form-actions"><button class="btn primary" type="submit" data-picker="submit" ${!this._picker?.selected ? "disabled" : ""}>${icon("plus", 14)} ${esc(this.t("addToPlan"))}</button></div>
        </form></section>
        ${all.length ? `<section class="editor-card"><div class="eyebrow">02 / ${this.t("dialogPlanned")}</div><h3>${esc(this.t("nextMeal"))}</h3>${all.map((e) => `<div class="shopping-row"><div class="shopping-name">${esc(mealName(e))}</div><button class="btn tiny" data-action="remove-meal" data-value="${esc(e.id)}" ${String(e.id).startsWith("pending-") ? 'disabled aria-disabled="true"' : ""} aria-label="${esc(String(e.id).startsWith("pending-") ? this.t("uiSaving") : this.t("close"))}">${icon("close", 14)}</button></div>`).join("")}</section>` : ""}</div>`;
    }
    if (this._modal === "create")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogNewRecipe")}</div><h2>${esc(this.t("create"))}</h2><p>${this.t("uiStartWithARecipeTitleAddDetailsAfterCreating")}</p></div><div class="editor-stamp">${icon("plus", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogRecipeTitle")}</div><form class="editor-form" data-form="create"><label class="field"><span>${esc(this.t("name"))} *</span><input name="name" required maxlength="120" data-autofocus placeholder="${this.t("uieGLemonPastaWithSpinach")}"></label><div class="form-actions"><button type="submit" class="btn primary">${icon("plus", 14)} ${esc(this.t("create"))}</button></div></form></section></div>`;
    if (this._modal === "import")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("importKicker"))}</div><h2>${esc(this.t("import"))}</h2><p>${this.t("uiPasteARecipeLinkMealieHandlesImportingIt")}</p></div><div class="editor-stamp">${icon("external", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogSource")}</div><form class="editor-form" data-form="import"><label class="field"><span>${esc(this.t("url"))}</span><input type="url" name="url" required maxlength="2000" placeholder="https://…"></label><p class="editor-sub">${esc(this.t("importTip"))}</p><div class="form-actions"><button type="submit" class="btn primary">${icon("arrow", 14)} ${esc(this.t("import"))}</button></div></form></section></div>`;
    if (this._modal === "edit" && this._detail) {
      const rec = this._detail;
      const instructions = asArray(rec.recipeInstructions);
      size = "large";
      content = `<div class="modal-content atelier-editor">
        <div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${this.t("dialogRecipeStudio")}</div><h2>${this.t("uiEditRecipe")}</h2><p class="editor-context">${esc(rec.name)}</p>
        <p>${this.t("uiDetailsIngredientsAndInstructionsInOneClearWorkflow")}</p></div>
        <div class="editor-stamp">${icon("edit", 28)}</div></div>
        <form data-form="edit" class="editor-form">
        ${this._editorPhotoSection()}
        <section class="editor-card"><div class="eyebrow">01 / ${this.t("dialogBasics")}</div><h3>${esc(this.t("name"))} & ${esc(this.t("description"))}</h3><p class="editor-sub">${this.t("uiYourRecipeTitleSummaryAndServingSize")}</p>
          <label class="field"><span>${esc(this.t("name"))} *</span><input name="name" required maxlength="120" value="${esc(rec.name)}" placeholder="${esc(this.t("name"))}"></label>
          <div class="editor-columns"><label class="field"><span>${esc(this.t("description"))}</span><textarea name="description" rows="3" maxlength="2000" placeholder="${this.t("uiWhatMakesThisSpecial")}">${esc(rec.description)}</textarea></label>
          <label class="field"><span>${esc(this.t("servingsNumber"))}</span><input type="number" min="1" max="100" step="1" name="servings" value="${Math.max(1, Number(rec.recipeServings) || 2)}" required><span>${this.t("uiShownInRecipesAndPrint")}</span></label></div></section>
        ${this._editorIngredientsSection()}
        <section class="editor-card"><div class="eyebrow">03 / ${this.t("dialogStepByStep")}</div><h3>${esc(this.t("instructions"))}</h3>
          <p class="editor-sub">${this.t("uiEditAddAndReorderStepsReplacementMustBeExplicitlyEnabled")}</p>
          <label class="editor-check"><input type="checkbox" name="replace_instructions"> ${this.t("uiReplaceCookingInstructions")}</label>
          <div class="editor-steps" data-steps-editor>${(instructions.length ? instructions : [{ text: "" }]).map((step, i) => this._stepEditRow(instructionText(step), i, step?.id || "")).join("")}</div>
          <button type="button" class="editor-add-step" data-action="step-add">+ ${this.t("uiAddAStep")}</button>
          <p class="editing-hint">${this.t("uiStepsAreReplacedOnSaveIfTheCheckboxIsSelected")}</p></section>
        ${this._editorHistorySection()}
        <section class="editor-card editor-card--steps"><div class="editor-footer"><small>${this.t("uiChangesAreSentToMealieOnlyWhenYouSave")}</small>
          <button type="submit" class="btn primary">${icon("check", 14)} ${esc(this.t("save"))}</button></div></section>
        </form></div>`;
    }
    if (this._modal === "create-list")
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shoppingKicker"))}</div><h2>${esc(this.t("createList"))}</h2><p>${this.t("uiGiveYourShoppingListAName")}</p></div><div class="editor-stamp">${icon("cart", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${esc(this.t("listName"))}</div><form class="editor-form" data-form="create-list"><label class="field"><span>${esc(this.t("listName"))} *</span><input name="name" maxlength="100" required data-autofocus placeholder="${this.t("uieGWeeklyGroceries")}"></label><div class="form-actions"><button type="submit" class="btn primary">${icon("plus", 14)} ${esc(this.t("createList"))}</button></div></form></section></div>`;
    if (this._modal === "recipe-to-list" && this._detail) {
      const lists = asArray(this._data.shopping?.lists);
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shoppingKicker"))}</div><h2>${esc(this.t("shoppingFromRecipe"))}</h2><p>${esc(this.t("addFromRecipeTip"))}</p></div><div class="editor-stamp">${icon("cart", 27)}</div></div>
      <section class="editor-card"><div class="eyebrow">01 / ${this.t("shopping")}</div><form class="editor-form" data-form="recipe-to-list">
      ${lists.length ? `<label class="field"><span>${esc(this.t("selectList"))}</span><select name="list_id" required>${lists.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === this._activeList ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>` : `<p class="notice">${esc(this.t("addListFirst"))}</p>`}
      <div class="form-actions"><button type="button" class="btn" data-action="create-list-form">${icon("plus", 14)} ${esc(this.t("createList"))}</button>${lists.length ? `<button type="submit" class="btn primary">${icon("cart", 14)} ${esc(this.t("shoppingAddRecipe"))}</button>` : ""}</div></form></section></div>`;
    }
    if (this._modal === "print") {
      const d = this._design;
      const name =
        this._printKind === "recipe"
          ? this._detail?.name
          : this._printKind === "shopping"
            ? this.t("shopping")
            : this.t("mealplan");
      const paperIngredients =
        this._printKind === "recipe"
          ? asArray(this._detail?.recipeIngredient).map(ingredientName)
          : this._printKind === "shopping"
            ? asArray(this._data.shopping?.items)
                .filter((x) => String(x.shoppingListId) === String(this._activeList))
                .map((x) => x.display || x.note || x.food?.name || "")
            : Array.from({ length: 7 }, (_, i) =>
                dayString(this._locale, addDays(this._weekStart, i), {
                  weekday: "short",
                  day: "numeric",
                }),
              );
      const paperMethod =
        this._printKind === "recipe"
          ? asArray(this._detail?.recipeInstructions).map(instructionText)
          : this._printKind === "shopping"
            ? ["", ""]
            : asArray(this._data.mealplan).map(mealName);
      size = "large";
      content = `<div class="modal-content"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / PRINT STUDIO</div>
      <h2>${esc(this.t("uiPrintHeroTitle"))}</h2><p>${esc(this.t("uiPrintHeroDescription"))}</p></div><div class="editor-stamp">${icon("print", 27)}</div></div>
      <div class="print-setup"><div><div class="eyebrow">01 / ${esc(this.t("uiPrintStyle"))}</div>
      ${[
        ["editorial", this.t("uiPrintEditorial"), this.t("uiPrintEditorialDescription")],
        ["compact", this.t("uiPrintCompact"), this.t("uiPrintCompactDescription")],
        ["minimal", this.t("uiPrintInkSaver"), this.t("uiPrintInkSaverDescription")],
      ]
        .map(
          ([v, title, description]) =>
            `<button type="button" data-action="print-style" data-value="${v}" aria-pressed="${d.print_style === v ? "true" : "false"}" class="print-option ${d.print_style === v ? "active" : ""}"><div class="print-symbol">${v === "editorial" ? "Aa" : v === "compact" ? "≡" : "○"}</div><div><strong>${esc(title)}</strong><span>${esc(description)}</span></div></button>`,
        )
        .join("")}
      <div class="eyebrow print-detail-heading">02 / ${esc(this.t("uiPrintDetails"))}</div>
      ${this._printKind === "recipe" ? `<label class="editor-check"><input type="checkbox" data-input="print-image" ${d.print_image ? "checked" : ""}> ${esc(this.t("uiPrintIncludePhoto"))}</label>` : ""}
      ${this._printKind === "recipe" ? `<label class="editor-check"><input type="checkbox" data-input="print-nutrition" ${d.print_nutrition === true ? "checked" : ""}> ${esc(this.t("uiPrintIncludeNutrition"))}</label>` : ""}
      ${this._printKind === "shopping" ? `<label class="editor-check"><input type="checkbox" data-input="print-completed" ${d.print_completed ? "checked" : ""}> ${esc(this.t("uiPrintIncludeCompleted"))}</label>` : ""}
      ${this._printKind !== "mealplan" ? `<label class="editor-check"><input type="checkbox" data-input="print-checkboxes" ${d.print_checkboxes !== false ? "checked" : ""}> ${esc(this.t("uiPrintIncludeCheckboxes"))}</label>` : ""}
      <label class="editor-check"><input type="checkbox" data-input="print-notes" ${d.print_notes !== false ? "checked" : ""}> ${esc(this.t("uiPrintIncludeNotes"))}</label>
      <button class="btn primary print-submit" type="button" data-action="print-now">${icon("print", 17)} ${esc(this.t("uiPrintOpenPreview"))}</button>
      <p class="print-guide">${esc(this.t("uiPrintGuide"))}</p></div>
      <div><div class="eyebrow">${esc(this.t("uiPrintPaperPreview"))}</div><div class="print-paper ${this._printKind === "mealplan" ? "landscape" : ""}"><div class="paper-kicker">MEALIE / ATELIER</div>
        <h3>${esc(name || this.t("uiYourRecipe"))}</h3><p>${esc(this.t("uiPrintPreviewDescription"))}</p><div class="paper-line"></div><div class="paper-cols">
          <div class="paper-col"><div class="paper-label">${esc(this.t("uiPrintIngredientsItems"))}</div>${
            paperIngredients
              .slice(0, 7)
              .map((x) => `<div class="paper-preview-row">${esc(x)}</div>`)
              .join("") || '<div class="paper-preview-row">–</div>'
          }</div>
          <div class="paper-col"><div class="paper-label">${esc(this.t("uiPrintPreparationNotes"))}</div>${
            paperMethod
              .slice(0, 5)
              .map(
                (x, i) =>
                  `<div class="paper-preview-row"><b>${i + 1}.</b> ${esc(String(x).slice(0, 110))}</div>`,
              )
              .join("") || '<div class="paper-preview-row">–</div>'
          }</div></div>
          <div class="paper-foot">${esc(this.t("uiPrintDesignedForPaper"))}</div></div></div></div></div>`;
    }
    if (this._modal === "settings") {
      const d = this._design;
      const theme = d.theme === "light" ? "light" : "dark";
      content = `<div class="modal-content"><div class="eyebrow">ATELIER DESIGN SYSTEM</div><h2 class="settings-title">${esc(this.t("settings"))}</h2>
        <div class="settings-group"><h3>${esc(this.t("theme"))}</h3><div class="range"><button class="btn ${theme === "dark" ? "primary" : ""}" data-action="design" data-field="theme" data-value="dark" aria-pressed="${theme === "dark" ? "true" : "false"}">${icon("moon", 14)} ${esc(this.t("dark"))}</button><button class="btn ${theme === "light" ? "primary" : ""}" data-action="design" data-field="theme" data-value="light" aria-pressed="${theme === "light" ? "true" : "false"}">${icon("sun", 14)} ${esc(this.t("light"))}</button></div></div>
        <div class="settings-group"><h3>${esc(this.t("accent"))}</h3><div class="swatches">${COLORS.map((color) => `<button class="swatch ${d.accent === color ? "chosen" : ""}" style="background:${color}" data-action="design" data-field="accent" data-value="${color}" title="${color}" aria-label="Accent color ${color}" aria-pressed="${d.accent === color ? "true" : "false"}"></button>`).join("")}</div></div>
        <div class="settings-group"><h3>${esc(this.t("density"))}</h3><div class="range"><button class="btn ${d.density === "compact" ? "primary" : ""}" data-action="design" data-field="density" data-value="compact" aria-pressed="${d.density === "compact" ? "true" : "false"}">${esc(this.t("compact"))}</button><button class="btn ${d.density === "comfortable" ? "primary" : ""}" data-action="design" data-field="density" data-value="comfortable" aria-pressed="${d.density === "comfortable" ? "true" : "false"}">${esc(this.t("comfortable"))}</button></div></div>
        <div class="settings-group"><label class="field"><span>${esc(this.t("columns"))}</span><select data-input="columns"><option value="2" ${Number(d.columns) === 2 ? "selected" : ""}>2</option><option value="3" ${Number(d.columns) === 3 ? "selected" : ""}>3</option><option value="4" ${Number(d.columns) === 4 ? "selected" : ""}>4</option></select></label></div>
        <div class="settings-group"><label class="field"><span>${esc(this.t("language"))}</span><select data-input="language" aria-label="${esc(this.t("language"))}"><option value="auto" ${(d.language || "auto") === "auto" ? "selected" : ""}>${esc(this.t("languageAuto"))}</option>${Object.keys(
          LABELS,
        )
          .map(
            (locale) =>
              `<option value="${esc(locale)}" ${d.language === locale ? "selected" : ""}>${esc(LABELS[locale].languageName || locale)}</option>`,
          )
          .join("")}</select></label></div>
        <div class="settings-group"><h3>${this.t("uiMotionTransitions")}</h3><p class="settings-hint">${this.t("uiThoughtfulMotionThatHelpsNavigationYourReducedMotionDeviceSettingAlwaysTakesPriority")}</p><div class="range">${[
          ["expressive", this.t("uiExpressive")],
          ["balanced", this.t("uiSubtle")],
          ["off", this.t("uiOff")],
        ]
          .map(
            ([v, label]) =>
              `<button class="btn ${d.motion === v ? "primary" : ""}" data-action="design" data-field="motion" data-value="${v}" aria-pressed="${d.motion === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><h3>${this.t("uiPhotoCrop")}</h3><div class="range">${[
          ["portrait", this.t("uiTall")],
          ["square", this.t("uiSquare")],
          ["landscape", this.t("uiWide")],
        ]
          .map(
            ([v, label]) =>
              `<button class="btn ${d.photo_ratio === v ? "primary" : ""}" data-action="design" data-field="photo_ratio" data-value="${v}" aria-pressed="${d.photo_ratio === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><h3>${this.t("uiCornerStyle")}</h3><div class="range">${[
          ["large", this.t("uiRound")],
          ["small", this.t("uiSoft")],
          ["square", this.t("uiSquareEckig")],
        ]
          .map(
            ([v, label]) =>
              `<button class="btn ${d.radius === v ? "primary" : ""}" data-action="design" data-field="radius" data-value="${v}" aria-pressed="${d.radius === v ? "true" : "false"}">${label}</button>`,
          )
          .join("")}</div></div>
        <div class="settings-group"><label class="field"><span><input type="checkbox" data-input="show-images" ${d.show_images !== false ? "checked" : ""}> ${esc(this.t("pictures"))}</span></label></div>
        <div class="settings-group"><h3>PRINT STUDIO</h3><p class="settings-hint">${this.t("uiSeparateA4LayoutsForRecipesShoppingAndYourWeeklyPlan")}</p><button class="btn" data-action="print-settings">${icon("print", 14)} ${this.t("uiOpenPrintSettings")}</button></div>
        <div class="settings-group support-group"><h3>${this.t("uiEnjoyingTheAtelier")}</h3><p class="settings-hint">${this.t("uiIfItMakesYourKitchenRoutineBetterYouCanOptionallySupportItsDevelopmentOnKoFi")}</p><a class="btn support-link" href="https://ko-fi.com/allesautomatisch" target="_blank" rel="noopener noreferrer">${icon("spark", 14)} ${this.t("uiSayThanksOnKoFi")} <span aria-hidden="true">↗</span></a></div>
        <p class="settings-hint">${esc(this.t("configured"))}</p><div class="form-actions"><button class="btn" data-action="reset-design">${esc(this.t("resetDesign"))}</button></div><div class="form-actions"><button class="btn primary" data-action="close-modal">${esc(this.t("done"))}</button></div></div>`;
    }
    const dialogTitles = {
      command: this.t("uiQuickActions"),
      nutrition: this.t("nutrition"),
      journal: this.t("journal"),
      recipe: this._detail?.name || this.t("recipes"),
      cook: this.t("cooking"),
      plan: this.t("mealplan"),
      create: this.t("create"),
      import: this.t("import"),
      edit: this.t("edit"),
      "create-list": this.t("createList"),
      "recipe-to-list": this.t("shoppingFromRecipe"),
      print: this.t("uiPrintStudioSettings"),
      settings: this.t("settings"),
    };
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(dialogTitles[this._modal] || this.t("settings"))}">${closing}${content}</div></div>`;
  },
};
