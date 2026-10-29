const COLOR_NAMES = {
  "#9dcbb2": "editorColorSage",
  "#e5ad92": "editorColorApricot",
  "#a8bdef": "editorColorPeriwinkle",
  "#d3adcd": "editorColorLilac",
  "#d6c07d": "editorColorHoney",
};
// Home Assistant visual card editor; the first-run path stays short and skippable.
class MealieAtelierEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { ...DEFAULTS };
    this._entries = [];
    this._nativeEntries = [];
    this._entriesState = "loading";
    this._requested = false;
    this._step = 0;
    this._wizardMode = true;
    this._boundChange = this._handleChange.bind(this);
    this._boundClick = this._handleClick.bind(this);
  }
  setConfig(config) {
    // A focused card type without mode starts in its own view, as the card does.
    const tag = String(config?.type || "").replace(/^custom:/, "");
    const mode = customElements.get(tag)?.getStubConfig?.().mode;
    this._config = { ...DEFAULTS, ...(mode ? { mode } : {}), ...config };
    if (this._config._setup_complete === true) this._wizardMode = false;
    this._render();
  }
  set hass(hass) {
    if (this._hass === hass) return;
    const priorLanguage = this._hass?.language;
    this._hass = hass;
    if (this._requested) {
      if (priorLanguage !== hass?.language) this._render();
      return;
    }
    this._requested = true;
    this._entriesState = "loading";
    hass
      .callWS({ type: "mealie_atelier/status" })
      .then((result) => {
        this._entries = asArray(result?.entries);
        this._entriesState = "ready";
        if (this._entries.length === 1 && !this._config.entry_id) {
          this._config = { ...this._config, entry_id: this._entries[0].entry_id };
          this._emitConfig();
        }
        this._detectNativeEntries();
        if (!this._entries.length && this._nativeEntries.length) this._entriesState = "native";
        this._render();
      })
      .catch(() => {
        this._entries = [];
        this._detectNativeEntries();
        this._entriesState = this._nativeEntries.length ? "native" : "error";
        this._render();
      });
  }
  connectedCallback() {
    this._render();
    this.shadowRoot.addEventListener("change", this._boundChange);
    this.shadowRoot.addEventListener("click", this._boundClick);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("change", this._boundChange);
    this.shadowRoot.removeEventListener("click", this._boundClick);
  }
  _locale() {
    return resolveLanguage("auto", this._hass?.language, navigator.language);
  }
  _tr(key) {
    return translateLabel(this._locale(), key);
  }
  _detectNativeEntries() {
    const entities = Object.values(this._hass?.entities || {}).filter(
      (entity) => entity?.platform === "mealie" && entity.config_entry_id,
    );
    const ids = [...new Set(entities.map((entity) => entity.config_entry_id))];
    this._nativeEntries = ids.map((id, index) => ({
      entry_id: id,
      name: entities.find((entity) => entity.config_entry_id === id)?.name || `Mealie ${index + 1}`,
    }));
    if (ids.length === 1 && !this._config.mealie_entry_id)
      this._config = { ...this._config, mealie_entry_id: ids[0] };
    if (ids.length && !this._entries.length && this._config.provider === "auto")
      this._config = {
        ...this._config,
        provider: "home_assistant",
        mode: this._config.mode === "dashboard" ? "recipes" : this._config.mode,
      };
  }
  _choose(key, options) {
    const c = this._config;
    const stored = c[key];
    // A stored value outside the presets stays selected (and saved) as an extra, labelled option.
    const unknown =
      stored !== undefined &&
      stored !== null &&
      stored !== "" &&
      !options.some(([value]) => String(value) === String(stored));
    const all = unknown
      ? [
          [stored, translateLabel(this._locale(), "editorCustomValue", { value: stored })],
          ...options,
        ]
      : options;
    return `<select id="atelier-${key}" data-key="${key}">${all.map(([value, label, disabled]) => `<option value="${esc(value)}" ${String(c[key]) === String(value) ? "selected" : ""} ${disabled ? "disabled" : ""}>${esc(label)}</option>`).join("")}</select>`;
  }
  _emitConfig() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: { ...this._config } },
        bubbles: true,
        composed: true,
      }),
    );
  }
  _handleChange(event) {
    const key = event.target.dataset.key;
    if (!key) return;
    let value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (key === "columns") value = Number(value) || 3;
    this._config = { ...this._config, [key]: value };
    this._emitConfig();
    if (key === "mode" || key === "provider") {
      this._render();
      this.shadowRoot.querySelector(`#atelier-${key}`)?.focus({ preventScroll: true });
    }
  }
  _handleClick(event) {
    const action = event.target.closest?.("[data-editor-action]")?.dataset.editorAction;
    if (!action) return;
    event.preventDefault();
    if (action === "step-next") {
      this._step = Math.min(2, this._step + 1);
      this._render();
      this.shadowRoot.querySelector(".setup-step-title")?.focus({ preventScroll: true });
      return;
    }
    if (action === "step-back") {
      this._step = Math.max(0, this._step - 1);
      this._render();
      this.shadowRoot.querySelector(".setup-step-title")?.focus({ preventScroll: true });
      return;
    }
    if (action === "preset") {
      const preset = event.target.closest("[data-preset]")?.dataset.preset;
      if (!preset) return;
      this._config = {
        ...this._config,
        ...(preset === "light"
          ? { theme: "light", accent: "#e5ad92", density: "comfortable", motion: "balanced" }
          : { theme: "dark", accent: "#9dcbb2", density: "comfortable", motion: "balanced" }),
      };
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "finish" || action === "skip") {
      this._config = { ...this._config, _setup_complete: true };
      this._wizardMode = false;
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "restart") {
      this._step = 0;
      this._config = { ...this._config, _setup_complete: false };
      this._wizardMode = true;
      this._emitConfig();
      this._render();
      return;
    }
    if (action === "retry") {
      if (!this._hass) return;
      this._entriesState = "loading";
      this._render();
      this._hass
        .callWS({ type: "mealie_atelier/status" })
        .then((result) => {
          this._entries = asArray(result?.entries);
          this._entriesState = "ready";
          if (this._entries.length === 1 && !this._config.entry_id) {
            this._config = { ...this._config, entry_id: this._entries[0].entry_id };
            this._emitConfig();
          }
          this._detectNativeEntries();
          if (!this._entries.length && this._nativeEntries.length) this._entriesState = "native";
          this._render();
        })
        .catch(() => {
          this._entries = [];
          this._detectNativeEntries();
          this._entriesState = this._nativeEntries.length ? "native" : "error";
          this._render();
        });
    }
  }
  _wizardMarkup() {
    const c = this._config,
      tr = (key) => this._tr(key),
      choose = (key, options) => this._choose(key, options);
    const steps = [tr("editorConnectKitchen"), tr("editorChooseYourStart"), tr("editorSetTheMood")];
    const progress = `<ol class="setup-progress" aria-label="${tr("editorSetupProgress")}">${steps.map((label, index) => `<li class="${index === this._step ? "current" : index < this._step ? "complete" : ""}" ${index === this._step ? 'aria-current="step"' : ""}><span>${index < this._step ? "✓" : `0${index + 1}`}</span><small>${label}</small></li>`).join("")}</ol>`;
    const account =
      this._entriesState === "loading"
        ? `<div class="setup-state"><span class="setup-spinner" aria-hidden="true"></span><span>${tr("editorCheckingHomeAssistantConnections")}</span></div>`
        : this._entriesState === "error"
          ? `<div class="setup-callout"><strong>${tr("editorCouldNotCheckYourConnections")}</strong><span>${tr("editorCheckThatMealieAtelierBridgeIsInstalledAndHomeAssistantIsOnline")}</span><div class="setup-callout-actions"><button class="editor-link-button" data-editor-action="retry">${tr("editorTryAgain")}</button><a class="setup-link" href="/config/integrations">${tr("editorOpenHomeAssistantIntegrations")} <span aria-hidden="true">↗</span></a></div></div>`
          : this._entriesState === "native"
            ? `<div class="provider-card"><div class="provider-card-head"><span class="provider-mark" aria-hidden="true">M</span><div><strong>${tr("editorHomeAssistantMealieFound")}</strong><small>${tr("editorDirectConnectionReadOnlyRecipes")}</small></div><span class="provider-badge">${tr("editorREADY")}</span></div><p>${tr("editorRecipeSearchAndCookingWorkWithoutAtelierBridgeProtectedPhotosEditingShoppingAndPlanningStayOptionalBridgeFeatures")}</p><div class="group"><label for="atelier-mealie_entry_id">${tr("editorMealieInstance")}</label>${choose(
                "mealie_entry_id",
                this._nativeEntries.map((entry) => [entry.entry_id, entry.name || entry.entry_id]),
              )}</div></div>`
            : this._entries.length
              ? `<div class="group"><label for="atelier-entry_id">${tr("editorYourMealieConnection")}</label>${choose("entry_id", [["", tr("editorChooseAConnectedKitchen")], ...this._entries.map((entry) => [entry.entry_id, entry.name || entry.title || entry.entry_id])])}<p class="hint">${tr("editorYourAPITokenStaysSafelyInsideTheHomeAssistantIntegration")}</p></div>`
              : `<div class="setup-callout"><strong>${tr("editorConnectMealieOnceInHomeAssistant")}</strong><span>${tr("editorAddMealieAtelierBridgeForTheFullStudioOrUseHomeAssistantSBuiltInMealieIntegrationForAReadOnlyRecipeCardCredentialsAreEnteredSecurelyInHomeAssistantNeverInThisCard")}</span><div class="setup-callout-actions"><a class="setup-link" href="/config/integrations">${tr("editorOpenHomeAssistantIntegrations")} <span aria-hidden="true">↗</span></a><button class="editor-link-button" data-editor-action="retry">${tr("editorIConnectedMealieCheckAgain")}</button></div></div>`;
    const assurance = this._entries.length
      ? `${tr("editorConnectedSecurely")} <span>·</span> ${tr("editorNoCredentialsInDashboardCards")}`
      : tr("editorYourCredentialsBelongInTheSecureIntegrationNeverInThisCard");
    const startLabels = {
      dashboard: tr("editorACompleteKitchenOverview"),
      today: tr("editorTodaySMealsAndKitchenTasks"),
      discover: tr("editorPersonalRecipeInspiration"),
      recipes: tr("editorYourCompleteRecipeCollection"),
      mealplan: tr("editorTheWeeklyMealPlan"),
      pantry: tr("editorIngredientsYouAlreadyHave"),
      shopping: tr("editorYourShoppingList"),
      family: tr("editorCookingTogetherAsAFamily"),
      cookbook: tr("editorYourSavedCookbooks"),
      manage: tr("editorRecipeAndKitchenTools"),
    };
    const activeTitle = tr(
      {
        dashboard: "editorPreviewDashboard",
        today: "editorPreviewToday",
        discover: "editorPreviewDiscover",
        recipes: "editorPreviewRecipes",
        mealplan: "editorPreviewMealplan",
        pantry: "editorPreviewPantry",
        shopping: "editorPreviewShopping",
        family: "editorPreviewFamily",
        cookbook: "editorPreviewCookbook",
        manage: "editorPreviewManage",
      }[c.mode] || "editorPreviewDashboard",
    );
    let panel = "";
    if (this._step === 0)
      panel = `<div class="setup-kicker">${tr("editorSTEP1CONNECTION")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorBringYourKitchenTogether")}</h2><p class="setup-description">${tr("editorAtelierReadsRecipesFromTheMealieConnectionAlreadyConfiguredInHomeAssistant")}</p>${account}<div class="setup-assurance">${assurance}</div>`;
    if (this._step === 1)
      panel = `<div class="setup-kicker">${tr("editorSTEP2YOURKITCHEN")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorWhatShouldOpenFirst")}</h2><p class="setup-description">${tr("editorPickAStartingPointEveryOtherViewStaysOneTapAway")}</p><div class="group"><label for="atelier-mode">${tr("editorStartIn")}</label>${choose(
        "mode",
        MODES.map((mode) => [mode, this._tr(mode)]),
      )}</div><div class="setup-live-preview"><div class="setup-preview-art" aria-hidden="true"><span></span><i></i><b></b></div><div><small>${tr("editorYOURATELIEROPENSTO")}</small><strong>${esc(activeTitle)}</strong><span>${esc(startLabels[c.mode] || startLabels.dashboard)}</span></div></div>`;
    if (this._step === 2)
      panel = `<div class="setup-kicker">${tr("editorSTEP3THEFEEL")}</div><h2 class="setup-step-title" tabindex="-1">${tr("editorMakeItFeelLikeYourKitchen")}</h2><p class="setup-description">${tr("editorChooseALookNowYouCanFineTuneEveryDetailLater")}</p><div class="setup-presets" role="group" aria-label="${tr("editorChooseAnAppearance")}">
      <button class="setup-preset ${c.theme === "dark" ? "selected" : ""}" type="button" data-editor-action="preset" data-preset="dark" aria-pressed="${c.theme === "dark"}"><span class="preset-art preset-dark"><i></i><b></b><em></em></span><strong>${tr("editorEveningStudio")}</strong><small>${tr("editorDeepGreenWarmLightEditorial")}</small></button>
      <button class="setup-preset ${c.theme === "light" ? "selected" : ""}" type="button" data-editor-action="preset" data-preset="light" aria-pressed="${c.theme === "light"}"><span class="preset-art preset-light"><i></i><b></b><em></em></span><strong>${tr("editorDaylightKitchen")}</strong><small>${tr("editorFreshSurfacesOpenAndBright")}</small></button>
      </div><p class="setup-reassure">${tr("editorYourRecipesAndMealieDataAreNeverChangedByTheseChoices")}</p>`;
    return `<div class="editor setup-editor"><header class="setup-header"><div><div class="setup-brand">MEALIE ATELIER <span>STUDIO</span></div><h1>${tr("editorAKitchenThatFeelsLikeYours")}</h1><p>${tr("editorThreeSmallChoicesYourKitchenReady")}</p></div><button class="setup-skip" type="button" data-editor-action="skip">${tr("editorSetUpLater")}</button></header>${progress}<section class="setup-panel" aria-live="polite">${panel}<nav class="setup-actions" aria-label="${tr("editorSetupNavigation")}">${this._step > 0 ? `<button class="editor-secondary" type="button" data-editor-action="step-back">${tr("editorBack")}</button>` : "<span></span>"}${this._step < 2 ? `<button class="editor-primary" type="button" data-editor-action="step-next">${tr("editorContinue")} <span aria-hidden="true">→</span></button>` : `<button class="editor-primary" type="button" data-editor-action="finish">${tr("editorCreateMyKitchen")} <span aria-hidden="true">→</span></button>`}</nav></section><p class="setup-footer">${tr("editorACalmStartTheAdvancedSettingsAreHereWheneverYouNeedThem")}</p></div>`;
  }
  _settingsMarkup() {
    const c = this._config,
      tr = (key) => this._tr(key),
      choose = (key, options) => this._choose(key, options);
    return `<div class="editor"><div class="settings-top"><div><div class="title">Mealie Atelier <span class="title-accent">Studio</span></div><p class="hint">${tr("editorConfigureYourCardVisuallySettingsAreSavedWithYourHomeAssistantDashboard")}</p></div><button class="editor-secondary" type="button" data-editor-action="restart">${tr("editorRunSetupWizard")}</button></div><div class="setup-success"><span aria-hidden="true">✓</span><div><strong>${tr("editorYourKitchenIsReady")}</strong><small>${esc(this._tr(c.mode))} · ${tr(c.theme === "light" ? "editorDaylightKitchen" : "editorEveningStudio")}</small></div></div>
    <div class="section-head"><span>01</span><div><strong>${tr("editorBasics")}</strong><p>${tr("editorChooseContentAndTheConnectedMealieInstance")}</p></div></div>
    <div class="group"><label for="atelier-mode">${tr("editorMode")}</label>${choose(
      "mode",
      MODES.map((value) => [value, this._tr(value)]),
    )}</div>
    <div class="group"><label for="atelier-entry_id">${tr("editorMealieAccount")}</label>${choose("entry_id", [["", tr("editorFirstConnectedAccount")], ...this._entries.map((entry) => [entry.entry_id, entry.name || entry.title || entry.entry_id])])}</div>
    <div class="group"><label for="atelier-provider">${tr("editorDataConnection")}</label>${choose(
      "provider",
      [
        ["auto", tr("editorAutomaticAtelierFirst")],
        ["atelier", tr("editorAtelierBridgeFullFeatures")],
        ["home_assistant", tr("editorHomeAssistantMealieReadOnly"), !this._nativeEntries.length],
      ],
    )}<p class="hint">${tr("editorTheBuiltInOptionNeedsNoAtelierServerOrCardTokenRecipeSearchAndCookingAreReadOnlyTheBridgeAddsImagesAndKitchenTools")}</p>${this._nativeEntries.length ? "" : `<p class="hint" id="atelier-provider-native-hint">${tr("editorNoBuiltInMealieIntegrationFound")}</p>`}</div>
    ${
      this._nativeEntries.length
        ? `<div class="group"><label for="atelier-mealie_entry_id">${tr("editorBuiltInMealieInstance")}</label>${choose(
            "mealie_entry_id",
            this._nativeEntries.map((entry) => [entry.entry_id, entry.name || entry.entry_id]),
          )}</div>`
        : ""
    }
    <div class="group"><label for="atelier-language">${tr("editorLanguage")}</label>${choose("language", [["auto", tr("editorAutomatic")], ...Object.keys(LABELS).map((locale) => [locale, LABELS[locale].languageName || locale])])}</div>
    <div class="section-head"><span>02</span><div><strong>${tr("editorLookFeel")}</strong><p>${tr("editorTypographyMotionAndTheVisualRhythmOfYourCards")}</p></div></div><div class="group"><label for="atelier-theme">${tr("editorTheme")}</label>${choose(
      "theme",
      [
        ["dark", tr("editorDark")],
        ["light", tr("editorLight")],
      ],
    )}</div>
    <div class="group"><label for="atelier-density">${tr("editorDensity")}</label>${choose(
      "density",
      [
        ["comfortable", tr("editorComfortable")],
        ["compact", tr("editorCompact")],
      ],
    )}</div>
    <div class="group"><label for="atelier-motion">${tr("editorMotionTransitions")}</label>${choose(
      "motion",
      [
        ["expressive", tr("editorExpressive")],
        ["balanced", tr("editorSubtle")],
        ["off", tr("editorOff")],
      ],
    )}<p class="hint">${tr("editorYourReducedMotionSystemPreferenceAlwaysTakesPriority")}</p></div>
    <div class="group"><label for="atelier-columns">${tr("editorColumns")}</label>${choose(
      "columns",
      [
        [2, "2"],
        [3, "3"],
        [4, "4"],
      ],
    )}</div><div class="group"><label for="atelier-accent">${tr("editorAccent")}</label><div class="accent-pick"><span class="accent-dot" aria-hidden="true" style="background:${esc(c.accent)}"></span>${choose(
      "accent",
      COLORS.map((value) => [value, tr(COLOR_NAMES[value])]),
    )}</div></div>
    <div class="group"><label for="atelier-radius">${tr("editorCornerStyle")}</label>${choose(
      "radius",
      [
        ["large", tr("editorRounded")],
        ["small", tr("editorSoft")],
        ["square", tr("editorSquareEckig")],
      ],
    )}</div><div class="group"><label for="atelier-photo_ratio">${tr("editorFoodPhotographyCrop")}</label>${choose(
      "photo_ratio",
      [
        ["portrait", tr("editorPortraitEditorial")],
        ["square", tr("editorSquareQuadrat")],
        ["landscape", tr("editorWide")],
      ],
    )}</div>
    <label class="line"><input type="checkbox" data-key="show_images" ${c.show_images !== false ? "checked" : ""}> ${tr("editorShowRecipeImages")}</label>
    <details class="editor-advanced"><summary>${tr("editorOptionalPrintAndKitchenSettings")}</summary><div class="section-head"><span>03</span><div><strong>${tr("editorPrintStudio")}</strong><p>${tr("editorPremiumA4LayoutsForRecipesAndLists")}</p></div></div><div class="group"><label for="atelier-print_style">${tr("editorPrintTemplate")}</label>${choose(
      "print_style",
      [
        ["editorial", "Editorial"],
        ["compact", tr("editorCompact")],
        ["minimal", tr("editorInkSaver")],
      ],
    )}</div>
    <label class="line"><input type="checkbox" data-key="print_image" ${c.print_image === true ? "checked" : ""}> ${tr("editorPrintRecipePhotosWhenAvailable")}</label><label class="line"><input type="checkbox" data-key="print_checkboxes" ${c.print_checkboxes !== false ? "checked" : ""}> ${tr("editorPrintCheckboxes")}</label><label class="line"><input type="checkbox" data-key="print_completed" ${c.print_completed === true ? "checked" : ""}> ${tr("editorPrintCompletedItems")}</label><label class="line"><input type="checkbox" data-key="print_nutrition" ${c.print_nutrition === true ? "checked" : ""}> ${tr("editorPrintStoredNutritionValues")}</label><label class="line"><input type="checkbox" data-key="print_notes" ${c.print_notes !== false ? "checked" : ""}> ${tr("editorPrintHandwritingSpace")}</label>
    <div class="section-head"><span>04</span><div><strong>${tr("editorKitchenTablet")}</strong><p>${tr("editorOptionalHomeAssistantActionsNothingTriggersAutomatically")}</p></div></div><label class="line"><input type="checkbox" data-key="kiosk_mode" ${c.kiosk_mode === true ? "checked" : ""}> ${tr("editorUseEnlargedTabletLayout")}</label>
    <div class="group"><label for="atelier-cooking_scene">${tr("editorOptionalKitchenSceneHA")}</label><input id="atelier-cooking_scene" data-key="cooking_scene" value="${esc(c.cooking_scene || "")}" placeholder="scene.kueche_kochen"><p class="hint">${tr("editorOnlyTriggeredWhenYouTapTheCookingCockpitButton")}</p></div><div class="group"><label for="atelier-cooking_media_player">${tr("editorOptionalMediaPlayerHA")}</label><input id="atelier-cooking_media_player" data-key="cooking_media_player" value="${esc(c.cooking_media_player || "")}" placeholder="media_player.kueche"></div>
    <div class="group"><label for="atelier-cooking_volume">${tr("editorCookingVolume")}</label>${choose(
      "cooking_volume",
      [
        [0.1, "10 %"],
        [0.18, "18 %"],
        [0.3, "30 %"],
        [0.5, "50 %"],
      ],
    )}</div><div class="group"><label for="atelier-cooking_tts_engine">${tr("editorOptionalTTSEngineHA")}</label><input id="atelier-cooking_tts_engine" data-key="cooking_tts_engine" value="${esc(c.cooking_tts_engine || "")}" placeholder="tts.piper"><p class="hint">${tr("editorUseAHomeAssistantEntityAllOptionalDeviceActionsAreDisabledByDefault")}</p></div></details>
    <p class="hint editor-footer">${tr("editorDashboardModeContainsTheCompleteKitchenDeviceSpecificChangesAreAvailableHereInTheDesignStudio")}</p></div>`;
  }
  _render() {
    if (!this.isConnected) return;
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLE}</style>${this._wizardMode ? this._wizardMarkup() : this._settingsMarkup()}`;
  }
}
