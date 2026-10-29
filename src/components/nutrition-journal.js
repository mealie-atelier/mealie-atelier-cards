/** Render nutrition matching, calculation review, and device-local cooking notes. */
export const nutritionJournalMethods = {
  _nutritionEntries() {
    return this._nutrition.rows.map((row) => ({
      index: row.index,
      grams: Number(row.grams),
      fdc_id: Number(row.selected?.id),
    }));
  },
  _nutritionMarkup() {
    const n = this._nutrition;
    if (!n) return "";
    const matched = n.rows.filter((x) => x.selected && Number(x.grams) > 0).length;
    const nutrients = [
      ["calories", this.t("uiCalories"), "kcal"],
      ["protein", this.t("uiProtein"), "g"],
      ["carbohydrate", this.t("uiCarbohydrates"), "g"],
      ["fat", this.t("uiFat"), "g"],
    ];
    const existing = Boolean(
      n.preview.existing && Object.values(n.preview.existing).some((v) => v !== null && v !== ""),
    );
    const report = n.report;
    return `<div class="modal-content nutrition-studio"><div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("nutritionKicker"))}</div><h2>${esc(this.t("nutriTitle"))}</h2><p>${this.t("uiNutrientValuesComeFromFoodDataNotAIGuessesReviewAllWeightsAndMatches")}</p></div><div class="editor-stamp">${icon("leaf", 27)}</div></div>
      <div class="nutri-header"><div class="nutri-eyebrow">${esc(n.preview.name || "")}</div><strong>${matched} / ${n.rows.length}</strong><span>${this.t("uiFoodsMatched")} · ${esc(n.preview.servings || "—")} ${esc(this.tp("uiServing", Number(n.preview.servings) || 0))}</span></div>
      ${!n.preview.fdc_enabled ? `<div class="nutri-alert">${this.t(this._isWebApp ? "uiUSDAAPIKeyNotConfiguredAddItInIntegrationSettingsOrEnv" : "nutriUsdaKeyMissingHa")}</div>` : ""}
      ${existing ? `<div class="nutri-alert">${this.t("uiThisRecipeAlreadyHasNutritionDataExplicitApprovalIsRequiredToReplaceIt")}</div>` : ""}
      <div class="nutri-tools"><button class="btn" data-action="nutri-ai" ${!n.preview.ai_enabled || n.busy ? "disabled" : ""}>${icon("spark", 16)} ${esc(this.t("nutriAi"))}</button><span>${n.preview.ai_enabled ? this.t("uiSendsIngredientTextToAIProviderNoInventedMacros") : this.t("uiOptionalConfigureAIAPIKey")}</span></div>
      <div class="nutri-table"><div class="eyebrow">01 / ${this.t("uiREVIEWINGREDIENTS")}</div>
      ${n.rows
        .map(
          (
            row,
            i,
          ) => `<div class="nutri-row"><div class="nutri-row-head"><span class="nutri-number">${String(i + 1).padStart(2, "0")}</span><strong>${esc(row.text)}</strong><span class="nutri-state ${row.selected ? "matched" : ""}">${row.selected ? "✓ USDA" : this.t("uiNotMatched")}</span></div>
        <div class="nutri-row-fields"><label><span>${esc(this.t("nutriGrams"))}</span><input type="number" min="0.01" max="50000" step="0.1" data-nutri-grams="${i}" value="${row.grams ?? ""}" placeholder="${esc(this.t("nutriGramsPlaceholder"))}" aria-label="${esc(this.t("nutriGrams"))} ${i + 1}"></label>
        <label class="nutri-query"><span>${this.t("uiFoodSearchQuery")}</span><input data-nutri-query="${i}" maxlength="100" value="${esc(row.query)}" aria-label="${this.t("uiFindFood")} ${i + 1}"></label>
        <button class="btn tiny" data-action="nutri-search" data-index="${i}" ${!n.preview.fdc_enabled || n.busy ? "disabled" : ""}>${icon("search", 14)} ${esc(this.t("nutriSearch"))}</button></div>
        ${row.selected ? `<div class="nutri-source">✓ ${esc(row.selected.name)} <small>USDA FDC #${esc(row.selected.id)} · ${esc(row.selected.data_type || "")}</small></div>` : ""}
        ${n.active === i ? `<div class="nutri-choices">${n.choices.length ? n.choices.map((choice) => `<button data-action="nutri-select" data-index="${i}" data-value="${esc(choice.id)}"><strong>${esc(choice.name)}</strong><small>${esc(choice.data_type || "")} · ${Number(choice.per_100g.calories).toFixed(0)} kcal/100 g</small></button>`).join("") : `<p>${this.t("uiNoCompleteNutritionEntriesFoundTryAnotherQuery")}</p>`}</div>` : ""}</div>`,
        )
        .join("")}</div>
      <div class="nutri-result"><div class="eyebrow">02 / ${esc(this.t("nutriResult")).toUpperCase()}</div><div class="nutri-stats">${nutrients.map(([key, label, unit]) => `<div class="nutri-stat"><span>${esc(label)}</span><strong>${report && report.per_portion[key] != null ? esc(report.per_portion[key]) : "—"}</strong><small>${esc(unit)}</small></div>`).join("")}</div>
      <p class="nutri-subnote">${this.t("uiBasedOnSelectedUSDAEntriesPer100gCookingYieldsAndMissingNutrientsAffectAccuracyValuesAreEstimates")}</p>
      ${
        report
          ? `<div class="nutri-provenance"><strong>${this.t("uiSourcesCoverage")}</strong> ${Object.entries(
              report.coverage || {},
            )
              .slice(0, 4)
              .map(([k, v]) => `${esc(k)} ${esc(v)}`)
              .join(
                " · ",
              )} ${report.ingredients.map((row) => `<a href="${esc(row.source_url)}" target="_blank" rel="noopener noreferrer">FDC ${esc(row.fdc_id)}</a>`).join(" ")}</div>`
          : ""
      }
      ${existing ? `<label class="editor-check"><input type="checkbox" data-nutri-replace ${n.replaceExisting ? "checked" : ""}> ${this.t("uiExplicitlyReplaceExistingNutritionValues")}</label>` : ""}
      ${n.notice ? `<div class="nutri-alert" role="status">${esc(n.notice)}</div>` : ""}
      <div class="nutri-actions"><button class="btn" data-action="nutri-back">${esc(this.t("back"))}</button><button class="btn" data-action="nutri-calc" ${matched !== n.rows.length || !n.rows.length || !n.preview.fdc_enabled || n.busy ? "disabled" : ""}>${icon("refresh", 15)} ${esc(this.t("nutriEstimate"))}</button>${this._permissions.can_manage ? `<button class="btn primary" data-action="nutri-save" ${!report || n.busy || (existing && !n.replaceExisting) ? "disabled" : ""}>${icon("check", 15)} ${esc(this.t("nutriSave"))}</button>` : ""}</div></div></div>`;
  },
  _journalMarkup() {
    const slug = this._detail?.slug,
      note = this._journal[slug] || {};
    return `<div class="modal-content journal-studio"><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("journalKicker"))}</div><h2>${esc(this.t("journal"))}</h2><p class="muted">${this.t("uiYourPersonalCookingNotesStoredOnlyOnThisDeviceNotSyncedToMealie")}</p>
    <form data-form="journal" class="editor-form"><section class="editor-card"><label class="field"><span>${this.t("uiHowDidItTurnOut")}</span><select name="rating">${[0, 1, 2, 3, 4, 5].map((i) => `<option value="${i}" ${Number(note.rating || 0) === i ? "selected" : ""}>${i ? `${"★".repeat(i)} ${i}/5` : this.t("uiNotRated")}</option>`).join("")}</select></label><label class="field"><span>${esc(this.t("journalNote"))}</span><textarea name="note" maxlength="800" rows="5" placeholder="${this.t("uiNextTimeReduceTheSalt")}">${esc(note.note || "")}</textarea></label><label class="editor-check"><input type="checkbox" name="favorite" ${note.favorite === true ? "checked" : ""}> ${esc(this.t("uiRememberAsFavoriteRecipe"))}</label><div class="form-actions"><button type="button" class="btn" data-action="close-modal">${esc(this.t("back"))}</button><button class="btn primary" type="submit">${esc(this.t("journalSave"))}</button></div></section></form></div>`;
  },
};
