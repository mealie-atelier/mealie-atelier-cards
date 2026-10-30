/**
 * Structured recipe editor: ingredient rows with food and unit search, servings preview, version history
 * with restore, and cover and step photo uploads. Every section repaints only its own container so
 * unsaved edits in the rest of the dialog (name, description, steps) survive.
 */
const EDITOR_FRACTIONS = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};
const EDITOR_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const EDITOR_KIND_KEYS = {
  ingredients: "editorKindIngredients",
  basics: "editorKindBasics",
  instructions: "editorKindInstructions",
  image: "editorKindImage",
  step_image: "editorKindStepImage",
  restore: "editorKindRestore",
};
const EDITOR_UPLOAD_MAX = 10 * 1024 * 1024;
const EDITOR_UPLOAD_CHUNK = 256 * 1024;

export const recipeEditorMethods = {
  /* ---------- pure helpers ---------- */
  /** Parse "1,5", "1.5", "1 1/2", "½", "1½". Empty input is a valid "no quantity". */
  _editorParseQuantity(input) {
    let text = String(input ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!text) return { ok: true, value: null };
    text = text.replace(
      /(\d)?\s?([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g,
      (match, digit, glyph) => `${digit ? `${digit} ` : ""}${EDITOR_FRACTIONS[glyph]}`,
    );
    let value = NaN;
    let m;
    if (/^\d+(?:[.,]\d+)?$/.test(text)) value = Number(text.replace(",", "."));
    else if ((m = text.match(/^(\d+) (\d+)\/(\d+)$/)) && Number(m[3]) > 0)
      value = Number(m[1]) + Number(m[2]) / Number(m[3]);
    else if ((m = text.match(/^(\d+)\/(\d+)$/)) && Number(m[2]) > 0)
      value = Number(m[1]) / Number(m[2]);
    if (!Number.isFinite(value) || value < 0 || value > 1000000) return { ok: false, value: null };
    return { ok: true, value: Math.round(value * 1000000) / 1000000 };
  },
  _editorFormatQuantity(value) {
    if (value === null || value === undefined) return "";
    const text = String(Math.round(Number(value) * 10000) / 10000);
    return this._language === "de" ? text.replace(".", ",") : text;
  },
  _editorSniff(head) {
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
    if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => head[i] === byte))
      return "image/png";
    const tag = (from, to) => String.fromCharCode(...Array.from(head.slice(from, to)));
    if (head.length >= 12 && tag(0, 4) === "RIFF" && tag(8, 12) === "WEBP") return "image/webp";
    return "";
  },
  _editorBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  },
  _editorFileName(url) {
    const last = String(url || "")
      .split("?")[0]
      .split("/")
      .pop();
    try {
      const name = decodeURIComponent(last);
      return EDITOR_FILE_NAME.test(name) ? name : "";
    } catch {
      return "";
    }
  },
  _editorTime(iso, short = false) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(
      this._locale,
      short ? { hour: "2-digit", minute: "2-digit" } : { dateStyle: "medium", timeStyle: "short" },
    ).format(date);
  },
  _editorCoded(code, message = "") {
    return Object.assign(new Error(message || code), { code });
  },

  /* ---------- state ---------- */
  _editorBlank(slug) {
    return {
      slug,
      loading: false,
      loadError: "",
      error: "",
      notice: "",
      recipeId: "",
      hash: "",
      servings: 1,
      preview: 1,
      rows: [],
      base: [],
      counter: 0,
      summaryOpen: false,
      saving: false,
      conflict: false,
      combo: null,
      comboSeq: 0,
      comboTimer: null,
      history: { open: false, loading: false, items: null, error: "", confirm: "" },
      lastBackup: null,
      photoConfirm: false,
      stepConfirm: null,
      upload: null,
      pick: null,
    };
  },
  _editorOpen() {
    clearTimeout(this._ed?.comboTimer);
    this._ed = this._editorBlank(this._detail?.slug || "");
    if (this._permissions.can_edit_ingredients) this._editorLoad();
  },
  _editorRowFromServer(row) {
    return {
      key: this._ed.counter++,
      reference_id: row.reference_id || null,
      quantityText: this._editorFormatQuantity(row.quantity),
      quantityError: false,
      textError: false,
      unit: row.unit || null,
      unitText: row.unit?.name || "",
      food: row.food || null,
      foodText: row.food?.name || "",
      note: row.note || "",
      original_text: row.original_text || "",
      title: row.title || "",
    };
  },
  _editorSignature(row) {
    return JSON.stringify([
      this._editorParseQuantity(row.quantityText).value,
      row.unit?.id || null,
      row.food?.id || null,
      row.note,
    ]);
  },
  async _editorLoad() {
    const state = this._ed;
    if (!state) return;
    state.loading = true;
    state.loadError = "";
    this._editorPaintIngredients();
    try {
      const preview = await this._ws("ingredients_get", { slug: state.slug });
      if (this._ed !== state) return;
      state.recipeId = preview.recipe_id || "";
      state.hash = preview.expected_hash;
      state.servings = Number(preview.servings) >= 1 ? Number(preview.servings) : 1;
      state.preview = state.servings;
      state.rows = asArray(preview.rows).map((row) => this._editorRowFromServer(row));
      state.base = state.rows.map((row) => ({
        id: row.reference_id,
        signature: this._editorSignature(row),
      }));
      state.summaryOpen = false;
      state.conflict = false;
      state.combo = null;
    } catch (error) {
      if (this._ed !== state) return;
      state.loadError = this._errorText(error);
    }
    state.loading = false;
    this._editorPaintIngredients();
  },
  /** Rows in the shape of the `ingredients_save` request, or the index of the first invalid row. */
  _editorRequestRows() {
    const rows = [];
    let invalid = -1;
    this._ed.rows.forEach((row, index) => {
      const quantity = this._editorParseQuantity(row.quantityText);
      row.quantityError = !quantity.ok;
      row.textError = !row.food && !row.note.trim() && !row.original_text.trim();
      if ((row.quantityError || row.textError) && invalid < 0) invalid = index;
      rows.push({
        reference_id: row.reference_id || null,
        quantity: quantity.value,
        unit_id: row.unit?.id || null,
        food_id: row.food?.id || null,
        note: row.note,
        original_text: row.original_text,
        ...(row.title ? { title: row.title } : {}),
      });
    });
    return { rows, invalid };
  },
  /** Counts of changed, added and removed rows against what the server sent. */
  _editorDiff() {
    const state = this._ed;
    const known = new Map(state.base.map((entry, rank) => [entry.id, { ...entry, rank }]));
    let changed = 0;
    let added = 0;
    let kept = 0;
    const seen = new Set();
    for (const row of state.rows) {
      const old = row.reference_id ? known.get(row.reference_id) : null;
      if (!old) {
        added++;
        continue;
      }
      seen.add(row.reference_id);
      if (old.signature !== this._editorSignature(row)) changed++;
      kept++;
    }
    const order = state.rows.filter((row) => seen.has(row.reference_id));
    const ranks = order.map((row) => known.get(row.reference_id).rank);
    const moved = ranks.some((rank, i) => i > 0 && rank < ranks[i - 1]);
    if (moved && changed === 0) changed = kept ? 1 : 0;
    return { changed, added, removed: state.base.length - seen.size };
  },
  /** Scaled quantity text for the read-only servings preview; never part of the request. */
  _editorScaled(row) {
    const state = this._ed;
    const value = this._editorParseQuantity(row.quantityText).value;
    if (value === null || !(state.servings >= 1) || state.preview === state.servings) return "";
    return AtelierStudio.scaleIngredient(`${value} x`, state.preview, state.servings).replace(
      /\s+x$/,
      "",
    );
  },

  /* ---------- markup ---------- */
  _editorPhotoSection() {
    return `<section class="editor-card ed-card"><div class="eyebrow">00 / ${esc(this.t("editorPhoto"))}</div><h3>${esc(this.t("editorPhoto"))}</h3>
      <div data-editor-photo>${this._editorPhotoHtml()}</div>
      <input type="file" hidden tabindex="-1" data-ed-file accept="image/jpeg,image/png,image/webp"></section>`;
  },
  _editorPhotoHtml() {
    const state = this._ed;
    const image = recipeImage(this._detail, "ed-cover");
    const busy = Boolean(state?.upload);
    const limit = Math.round(
      (this._permissions.limits.upload_max_bytes || EDITOR_UPLOAD_MAX) / 1048576,
    );
    return `<div class="ed-photo">${image ? `<div class="ed-cover-frame">${image}</div>` : `<p class="editing-hint">${esc(this.t("editorPhotoNone"))}</p>`}
      <div class="ed-actions"><button type="button" class="btn" data-action="ed-photo-pick" ${busy ? "disabled" : ""}>${icon("edit", 15)} ${esc(this.t("editorPhotoReplace"))}</button>${
        image
          ? `<button type="button" class="btn" data-action="ed-photo-remove-ask" ${busy ? "disabled" : ""}>${icon("close", 15)} ${esc(this.t("editorPhotoRemove"))}</button>`
          : ""
      }</div>
      <p class="editor-sub">${esc(this.t("editorPhotoHint", { size: limit }))}</p>
      ${
        state?.photoConfirm
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorPhotoRemove"))}"><p>${esc(this.t("editorPhotoRemoveConfirm"))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-photo-remove-do">${esc(this.t("editorPhotoRemoveNow"))}</button><button type="button" class="btn" data-action="ed-photo-remove-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : ""
      }
      ${state?.upload?.target === "cover" ? this._editorProgressHtml() : ""}</div>`;
  },
  _editorProgressHtml() {
    const percent = this._ed?.upload?.percent || 0;
    return `<div class="ed-progress" data-ed-progress><div class="ed-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${esc(this.t("editorUploadProgress", { percent }))}"><span class="ed-progress-bar"></span></div><span class="ed-progress-text" aria-hidden="true">${percent}%</span><button type="button" class="btn tiny" data-action="ed-upload-cancel">${esc(this.t("editorUploadCancel"))}</button></div>`;
  },
  _editorIngredientsSection() {
    const readonly = asArray(this._detail?.recipeIngredient).map(ingredientName);
    return `<section class="editor-card ed-card"><div class="eyebrow">02 / ${esc(this.t("ingredients"))}</div><h3>${esc(this.t("ingredients"))}</h3>
      <div data-editor-ingredients>${
        this._permissions.can_edit_ingredients
          ? this._editorIngredientsHtml()
          : `<div class="editor-readonly">${readonly.length ? readonly.map((x) => `<span>• ${esc(x)}</span>`).join("") : "<span>—</span>"}</div><p class="editing-hint">${esc(this.t("editorIngredientsLocked"))}</p>`
      }</div></section>`;
  },
  _editorIngredientsHtml() {
    const state = this._ed;
    if (!state || state.loading)
      return `<p class="editor-sub" role="status">${esc(this.t("editorLoading"))}</p>`;
    if (state.loadError)
      return `<div class="notice error" role="alert"><span>${esc(state.loadError)}</span><button type="button" class="btn tiny" data-action="ed-retry">${esc(this.t("retry"))}</button></div>`;
    const diff = this._editorDiff();
    return `<div class="ed-toolbar"><label class="ed-servings"><span data-ed-servings-label>${esc(this.tp("editorServingsPreview", state.preview))}</span>
        <input type="number" inputmode="numeric" min="1" max="100" step="1" value="${state.preview}" data-ed-input="servings" aria-label="${esc(this.tp("editorServingsPreview", state.preview))}"></label>
        <button type="button" class="btn tiny" data-action="ed-servings-reset">${esc(this.t("editorServingsReset"))}</button>
        <span class="editor-sub" data-ed-servings-note ${state.preview === state.servings ? "hidden" : ""}>${esc(this.t("editorServingsNote"))}</span></div>
      <div class="ed-rows" role="list">${state.rows.map((row, i) => this._editorRowHtml(row, i)).join("")}</div>
      <button type="button" class="editor-add-step" data-action="ed-add">+ ${esc(this.t("editorAddIngredient"))}</button>
      <p class="ed-live" role="status" aria-live="polite" data-ed-live>${esc(state.notice)}</p>
      ${state.error ? `<div class="notice error" role="alert"><span>${esc(state.error)}</span></div>` : ""}
      ${
        state.conflict
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorReload"))}"><p>${esc(this.t("editorReloadChanged"))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-reload">${esc(this.t("editorReload"))}</button></div></div>`
          : ""
      }
      ${
        state.summaryOpen
          ? `<div class="ed-confirm" role="group" aria-label="${esc(this.t("editorConfirmSave"))}"><p>${esc(this.t("editorSaveSummary", diff))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-save" ${state.saving ? "disabled" : ""}>${icon("check", 14)} ${esc(this.t("editorConfirmSave"))}</button><button type="button" class="btn" data-action="ed-review-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : `<div class="ed-actions"><button type="button" class="btn primary" data-action="ed-review">${icon("check", 14)} ${esc(this.t("editorSaveIngredients"))}</button></div>`
      }`;
  },
  _editorRowHtml(row, i) {
    const n = i + 1;
    const label = (key) => esc(`${this.t(key)} · ${this.t("editorRow", { row: n })}`);
    const last = this._ed.rows.length - 1;
    const scaled = this._editorScaled(row);
    const invalid = row.quantityError || row.textError;
    return `<div class="ed-row" role="listitem" data-ed-row="${i}">
      <span class="ed-num" aria-hidden="true">${n}</span>
      <div class="ed-fields">
        <label class="ed-cell ed-qty"><span>${esc(this.t("editorQuantity"))}</span>
          <input data-ed-input="quantity" data-ed-row="${i}" inputmode="decimal" autocomplete="off" maxlength="14" value="${esc(row.quantityText)}" aria-label="${label("editorQuantity")}" aria-invalid="${row.quantityError}" aria-describedby="ed-error-${i}"></label>
        ${this._editorComboHtml("unit", row, i, label("editorUnit"))}
        ${this._editorComboHtml("food", row, i, label("editorFood"))}
        <label class="ed-cell ed-note"><span>${esc(this.t("editorNote"))}</span>
          <input data-ed-input="note" data-ed-row="${i}" maxlength="300" autocomplete="off" value="${esc(row.note)}" aria-label="${label("editorNote")}"></label>
      </div>
      ${row.original_text ? `<p class="ed-original"><span>${esc(this.t("editorOriginal"))}:</span> ${esc(row.original_text)}</p>` : ""}
      <p class="ed-scaled" data-ed-scaled="${i}" ${scaled ? "" : "hidden"}><span>${esc(this.t("editorScaled"))}:</span> <strong>${esc(scaled)}</strong></p>
      <div class="ed-row-actions">
        <button type="button" class="btn tiny ed-icon" data-action="ed-up" data-ed-row="${i}" aria-label="${esc(this.t("editorMoveUp", { row: n }))}" title="${esc(this.t("editorMoveUp", { row: n }))}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn tiny ed-icon" data-action="ed-down" data-ed-row="${i}" aria-label="${esc(this.t("editorMoveDown", { row: n }))}" title="${esc(this.t("editorMoveDown", { row: n }))}" ${i === last ? "disabled" : ""}>↓</button>
        <button type="button" class="btn tiny ed-icon" data-action="ed-remove" data-ed-row="${i}" aria-label="${esc(this.t("editorRemoveRow", { row: n }))}" title="${esc(this.t("editorRemoveRow", { row: n }))}" ${this._ed.rows.length <= 1 ? "disabled" : ""}>×</button>
      </div>
      <p class="ed-error" id="ed-error-${i}" data-ed-error="${i}" role="alert" ${invalid ? "" : "hidden"}>${esc(row.quantityError ? this.t("editorQuantityInvalid") : row.textError ? this.t("editorRowNeedsText") : "")}</p>
    </div>`;
  },
  _editorComboHtml(field, row, i, label) {
    return `<div class="ed-cell ed-combo" data-ed-combo="${field}" data-ed-row="${i}"><span>${esc(this.t(field === "unit" ? "editorUnit" : "editorFood"))}</span>
      ${this._editorComboMarkup({
        id: `ed-${field}-${i}`,
        label,
        value: row[`${field}Text`],
        attrs: `data-ed-input="${field}" data-ed-row="${i}"`,
        listClass: "ed-list",
        listId: `ed-list-${field}-${i}`,
      })}</div>`;
  },
  _editorComboOptions() {
    const combo = this._ed?.combo;
    if (!combo) return [];
    const options = combo.items.map((item) => ({ type: "item", item }));
    if (combo.canCreate) options.push({ type: "create" });
    return options;
  },
  _editorOptionsHtml() {
    const combo = this._ed.combo;
    const options = this._editorComboOptions();
    const rows = options.map((option, j) => {
      const active = j === combo.active;
      const text =
        option.type === "create"
          ? this.t("editorCreateOption", { text: combo.text })
          : `${option.item.name}${combo.field === "unit" && option.item.abbreviation ? ` (${option.item.abbreviation})` : ""}`;
      return `<li role="option" tabindex="-1" class="ed-option${active ? " is-active" : ""}" id="ed-opt-${combo.field}-${combo.row}-${j}" aria-selected="${active}" data-action="ed-pick" data-value="${j}">${esc(text)}</li>`;
    });
    if (combo.loading)
      rows.push(
        `<li role="presentation" class="ed-option-note">${esc(this.t("editorComboSearching"))}</li>`,
      );
    else if (!options.length)
      rows.push(
        `<li role="presentation" class="ed-option-note">${esc(this.t("editorComboEmpty"))}</li>`,
      );
    return rows.join("");
  },
  _editorHistorySection() {
    return `<section class="editor-card ed-card"><div class="eyebrow">04 / ${esc(this.t("editorHistory"))}</div><h3>${esc(this.t("editorHistory"))}</h3>
      <div data-editor-history>${this._editorHistoryHtml()}</div></section>`;
  },
  _editorHistoryHtml() {
    const history = this._ed?.history;
    if (!history) return "";
    const undo = this._ed.lastBackup
      ? `<button type="button" class="btn" data-action="ed-undo">${icon("refresh", 15)} ${esc(this.t("editorUndo"))}</button>`
      : "";
    const toggle = `<button type="button" class="btn" data-action="ed-history" aria-expanded="${history.open}">${icon("book", 15)} ${esc(this.t(history.open ? "editorHistoryHide" : "editorHistory"))}</button>`;
    let list = "";
    if (history.open) {
      if (history.loading)
        list = `<p class="editor-sub" role="status">${esc(this.t("editorHistoryLoading"))}</p>`;
      else if (history.error)
        list = `<div class="notice error" role="alert"><span>${esc(history.error)}</span></div>`;
      else if (!asArray(history.items).length)
        list = `<p class="editor-sub">${esc(this.t("editorHistoryEmpty"))}</p>`;
      else
        list = `<ul class="ed-history">${history.items
          .map((item) => {
            const time = this._editorTime(item.created_at);
            const confirm =
              history.confirm === item.backup_id
                ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorRestoreNow"))}"><p>${esc(this.t("editorRestoreConfirm", { time }))}</p><div class="ed-actions"><button type="button" class="btn primary" data-action="ed-restore-do" data-value="${esc(item.backup_id)}">${esc(this.t("editorRestoreNow"))}</button><button type="button" class="btn" data-action="ed-restore-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
                : "";
            return `<li class="ed-history-item"><div class="ed-history-copy"><strong>${esc(time)}</strong><span>${esc(item.user_name || "")} · ${esc(this.t(EDITOR_KIND_KEYS[item.kind] || "editorKindBasics"))}</span><small>${esc(item.summary || "")}</small></div><button type="button" class="btn tiny" data-action="ed-restore-ask" data-value="${esc(item.backup_id)}" aria-label="${esc(`${this.t("editorRestore")} · ${time}`)}">${esc(this.t("editorRestore"))}</button>${confirm}</li>`;
          })
          .join("")}</ul>`;
    }
    return `<div class="ed-actions">${toggle}${undo}</div>${list}`;
  },
  /** Photo controls inside one step row of the steps editor. */
  _editorStepPhotos(id) {
    if (!this._permissions.can_admin) return "";
    return `<div class="ed-step-photos" data-ed-step-photos="${esc(id)}">${this._editorStepPhotosInner(id)}</div>`;
  },
  _editorStepPhotosInner(id) {
    if (!id) return `<p class="editor-sub">${esc(this.t("editorStepPhotoSaveFirst"))}</p>`;
    const steps = asArray(this._detail?.recipeInstructions);
    const index = steps.findIndex((step) => step?.id === id);
    const n = index + 1;
    const state = this._ed;
    const busy = Boolean(state?.upload);
    const photos = instructionImages(steps[index])
      .map((src) => ({ src, file: this._editorFileName(src) }))
      .filter((photo) => photo.file);
    const thumbs = photos
      .map((photo) => {
        const asking = state?.stepConfirm?.id === id && state.stepConfirm.file === photo.file;
        const actions = asking
          ? `<div class="ed-confirm" role="alertdialog" aria-label="${esc(this.t("editorStepPhotoRemove"))}"><p>${esc(this.t("editorStepPhotoKeptInMealie"))}</p><div class="ed-actions"><button type="button" class="btn tiny primary" data-action="ed-step-remove-do" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}">${esc(this.t("editorStepPhotoRemove"))}</button><button type="button" class="btn tiny" data-action="ed-step-remove-cancel">${esc(this.t("editorCancel"))}</button></div></div>`
          : `<div class="ed-actions"><button type="button" class="btn tiny" data-action="ed-step-pick" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}" aria-label="${esc(`${this.t("editorStepPhotoReplace")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>${esc(this.t("editorStepPhotoReplace"))}</button><button type="button" class="btn tiny" data-action="ed-step-remove-ask" data-value="${esc(id)}" data-ed-file-name="${esc(photo.file)}" aria-label="${esc(`${this.t("editorStepPhotoRemove")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>${esc(this.t("editorStepPhotoRemove"))}</button></div>`;
        return `<figure class="ed-thumb"><img src="${esc(photo.src)}" alt="${esc(this.t("editorStepPhotoAlt", { step: n }))}" loading="lazy" decoding="async"><figcaption>${actions}</figcaption></figure>`;
      })
      .join("");
    return `${thumbs ? `<div class="ed-thumbs">${thumbs}</div>` : ""}<div class="ed-actions"><button type="button" class="btn tiny" data-action="ed-step-pick" data-value="${esc(id)}" aria-label="${esc(`${this.t("editorStepPhotoAdd")} · ${this.t("editorStepPhotoAlt", { step: n })}`)}" ${busy ? "disabled" : ""}>+ ${esc(this.t("editorStepPhotoAdd"))}</button></div>${state?.upload?.target === id ? this._editorProgressHtml() : ""}`;
  },

  /* ---------- painting ---------- */
  _editorPaint(selector, html, focusSelector = "") {
    const target = this.shadowRoot.querySelector(selector);
    if (!target) return false;
    target.innerHTML = html;
    if (focusSelector) this.shadowRoot.querySelector(focusSelector)?.focus?.();
    return true;
  },
  _editorPaintIngredients(focusSelector = "") {
    if (this._modal !== "edit") return;
    this._editorPaint("[data-editor-ingredients]", this._editorIngredientsHtml(), focusSelector);
  },
  _editorPaintPhoto() {
    this._editorPaint("[data-editor-photo]", this._editorPhotoHtml());
  },
  _editorPaintHistory(focusSelector = "") {
    this._editorPaint("[data-editor-history]", this._editorHistoryHtml(), focusSelector);
  },
  _editorPaintSteps() {
    for (const box of this.shadowRoot.querySelectorAll("[data-ed-step-photos]")) {
      const id = box.dataset.edStepPhotos;
      if (id) box.innerHTML = this._editorStepPhotosInner(id);
    }
  },
  _editorPaintCombo() {
    const combo = this._ed?.combo;
    for (const box of this.shadowRoot.querySelectorAll("[data-ed-combo]")) {
      const open = Boolean(
        combo && combo.field === box.dataset.edCombo && String(combo.row) === box.dataset.edRow,
      );
      this._editorComboPaint({
        root: box,
        open,
        html: open ? this._editorOptionsHtml() : "",
        active: open ? combo.active : -1,
        optionPrefix: open ? `ed-opt-${combo.field}-${combo.row}-` : "",
      });
    }
  },
  _editorPaintProgress() {
    const upload = this._ed?.upload;
    const bar = this.shadowRoot.querySelector("[data-ed-progress]");
    if (!upload) return;
    if (!bar) {
      if (upload.target === "cover") this._editorPaintPhoto();
      else this._editorPaintSteps();
    }
    const fresh = this.shadowRoot.querySelector("[data-ed-progress]");
    if (!fresh) return;
    const track = fresh.querySelector("[role=progressbar]");
    track.setAttribute("aria-valuenow", String(upload.percent));
    track.setAttribute("aria-label", this.t("editorUploadProgress", { percent: upload.percent }));
    track
      .querySelector(".ed-progress-bar")
      .style.setProperty("--ed-progress", `${upload.percent}%`);
    fresh.querySelector(".ed-progress-text").textContent = `${upload.percent}%`;
  },
  _editorAnnounce(text) {
    if (this._ed) this._ed.notice = text;
    const live = this.shadowRoot.querySelector("[data-ed-live]");
    if (live) live.textContent = text;
  },
  /** Toast without a full render, so unsaved edits in the dialog stay untouched. */
  _editorToast(text, kind = "status") {
    this._toast = String(text || "").slice(0, 500);
    this._toastKind = kind;
    const root = this.shadowRoot.querySelector(".atelier");
    if (root) {
      root.querySelector(".toast")?.remove();
      const template = document.createElement("template");
      template.innerHTML = `<div class="toast${kind === "error" ? " toast-error" : ""}" role="${kind === "error" ? "alert" : "status"}" aria-live="${kind === "error" ? "assertive" : "polite"}">${icon(kind === "error" ? "bolt" : "check", 15)} ${esc(this._toast)}</div>`;
      root.appendChild(template.content.firstElementChild);
    }
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(
      () => {
        this._toast = "";
        this.shadowRoot.querySelector(".toast")?.remove();
      },
      kind === "error" ? 6500 : 3800,
    );
  },

  /* ---------- events ---------- */
  /** Returns true when the key press belonged to the editor. */
  _editorKeyDown(event) {
    const field = event.target?.dataset?.edInput;
    if (!field || !this._ed) return false;
    if (event.key === "Enter") {
      event.preventDefault();
      if (this._ed.combo && this._ed.combo.active >= 0) this._editorChoose(this._ed.combo.active);
      return true;
    }
    if (field !== "unit" && field !== "food") return false;
    const combo = this._ed.combo;
    const row = Number(event.target.dataset.edRow);
    const mine = Boolean(combo && combo.field === field && combo.row === row);
    if (!mine) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
      event.preventDefault();
      this._editorComboOpen(field, row, event.target.value);
      return true;
    }
    const nav = {
      id: `ed-${field}-${row}`,
      open: true,
      active: combo.active,
      items: this._editorComboOptions(),
      hasMore: false,
      loading: combo.loading,
    };
    const handled = this._comboboxKeydown(event, nav);
    if (nav.open) combo.active = nav.active;
    else this._ed.combo = null;
    this._editorPaintCombo();
    return handled;
  },
  _editorInput(event) {
    const el = event.target;
    const field = el?.dataset?.edInput;
    const state = this._ed;
    if (!field || !state) return false;
    const i = Number(el.dataset.edRow);
    const row = state.rows[i];
    if (field === "servings") {
      state.preview = Math.max(1, Math.min(100, Math.round(Number(el.value)) || state.servings));
      this._editorUpdateScaled();
      return true;
    }
    if (!row) return true;
    if (field === "quantity") {
      row.quantityText = el.value;
      row.quantityError = !this._editorParseQuantity(el.value).ok;
      const error = this.shadowRoot.querySelector(`[data-ed-error="${i}"]`);
      el.setAttribute("aria-invalid", String(row.quantityError));
      if (error) {
        error.hidden = !row.quantityError && !row.textError;
        error.textContent = row.quantityError ? this.t("editorQuantityInvalid") : "";
      }
      this._editorUpdateScaled();
    } else if (field === "note") {
      row.note = el.value;
    } else if (field === "unit" || field === "food") {
      row[`${field}Text`] = el.value;
      if (!el.value.trim()) row[field] = null;
      clearTimeout(state.comboTimer);
      state.comboTimer = setTimeout(() => this._editorComboOpen(field, i, el.value), 250);
    }
    return true;
  },
  _editorUpdateScaled() {
    const state = this._ed;
    state.rows.forEach((row, i) => {
      const box = this.shadowRoot.querySelector(`[data-ed-scaled="${i}"]`);
      if (!box) return;
      const scaled = this._editorScaled(row);
      box.hidden = !scaled;
      const strong = box.querySelector("strong");
      if (strong) strong.textContent = scaled;
    });
    const note = this.shadowRoot.querySelector("[data-ed-servings-note]");
    if (note) note.hidden = state.preview === state.servings;
    const label = this.tp("editorServingsPreview", state.preview);
    const text = this.shadowRoot.querySelector("[data-ed-servings-label]");
    if (text) text.textContent = label;
    this.shadowRoot.querySelector('[data-ed-input="servings"]')?.setAttribute("aria-label", label);
  },
  /** Fired for `change` and `focusout`: reconcile combobox text and close lists that lost focus. */
  _editorFocusEvent(event) {
    const state = this._ed;
    const el = event.target;
    if (!state || this._modal !== "edit") return;
    if (event.type === "change" && el?.matches?.("[data-ed-file]")) {
      const file = el.files?.[0];
      el.value = "";
      if (file) this._editorUploadFlow(file);
      return;
    }
    if (
      event.type === "change" &&
      el?.dataset?.edInput &&
      ["unit", "food"].includes(el.dataset.edInput)
    ) {
      const field = el.dataset.edInput;
      const row = state.rows[Number(el.dataset.edRow)];
      if (row && el.value !== (row[field]?.name || "")) {
        row[`${field}Text`] = row[field]?.name || "";
        el.value = row[`${field}Text`];
      }
      return;
    }
    if (event.type === "focusout" && state.combo) {
      const box = el?.closest?.("[data-ed-combo]");
      const next = event.relatedTarget;
      if (box && !box.contains?.(next)) {
        clearTimeout(state.comboTimer);
        state.combo = null;
        this._editorPaintCombo();
      }
    }
  },
  async _editorClick(el) {
    const action = el.dataset.action;
    const state = this._ed;
    if (!state) return;
    const i = Number(el.dataset.edRow);
    const rows = state.rows;
    const focusRow = (selector) => this._editorPaintIngredients(selector);
    if (action !== "ed-pick" && state.combo) {
      state.combo = null;
      this._editorPaintCombo();
    }
    switch (action) {
      case "ed-retry":
        await this._editorLoad();
        break;
      case "ed-add":
        if (rows.length >= 100) break;
        rows.push(
          this._editorRowFromServer({ reference_id: null, quantity: null, unit: null, food: null }),
        );
        state.summaryOpen = false;
        focusRow(`[data-ed-input="quantity"][data-ed-row="${rows.length - 1}"]`);
        break;
      case "ed-up":
      case "ed-down": {
        const to = action === "ed-up" ? i - 1 : i + 1;
        if (!rows[i] || !rows[to]) break;
        [rows[i], rows[to]] = [rows[to], rows[i]];
        state.summaryOpen = false;
        // Keep the focus on the same direction unless that button is now disabled at the edge.
        const edge = action === "ed-up" ? to === 0 : to === rows.length - 1;
        const keep = edge ? (action === "ed-up" ? "ed-down" : "ed-up") : action;
        focusRow(`[data-action="${keep}"][data-ed-row="${to}"]`);
        break;
      }
      case "ed-remove":
        if (rows.length <= 1 || !rows[i]) break;
        rows.splice(i, 1);
        state.summaryOpen = false;
        focusRow(`[data-action="ed-remove"][data-ed-row="${Math.min(i, rows.length - 1)}"]`);
        break;
      case "ed-pick":
        await this._editorChoose(Number(el.dataset.value));
        break;
      case "ed-servings-reset":
        state.preview = state.servings;
        focusRow('[data-ed-input="servings"]');
        break;
      case "ed-review": {
        const { invalid } = this._editorRequestRows();
        state.error = "";
        if (invalid >= 0) {
          focusRow(
            `[data-ed-input="${rows[invalid].quantityError ? "quantity" : "note"}"][data-ed-row="${invalid}"]`,
          );
          break;
        }
        const diff = this._editorDiff();
        if (!diff.changed && !diff.added && !diff.removed) {
          this._editorAnnounce(this.t("editorNoChanges"));
          break;
        }
        state.summaryOpen = true;
        focusRow('[data-action="ed-save"]');
        break;
      }
      case "ed-review-cancel":
        state.summaryOpen = false;
        focusRow('[data-action="ed-review"]');
        break;
      case "ed-save":
        await this._editorSave();
        break;
      case "ed-reload":
        await this._editorReloadFresh();
        break;
      case "ed-history":
        await this._editorToggleHistory();
        break;
      case "ed-undo":
        await this._editorUndoAsk();
        break;
      case "ed-restore-ask":
        state.history.confirm = el.dataset.value || "";
        this._editorPaintHistory('[data-action="ed-restore-do"]');
        break;
      case "ed-restore-cancel":
        state.history.confirm = "";
        this._editorPaintHistory('[data-action="ed-history"]');
        break;
      case "ed-restore-do":
        await this._editorRestore(el.dataset.value || "");
        break;
      case "ed-photo-pick":
      case "ed-step-pick":
        this._editorPick(
          action === "ed-photo-pick"
            ? { target: "cover" }
            : { target: el.dataset.value, replace: el.dataset.edFileName || "" },
        );
        break;
      case "ed-photo-remove-ask":
        state.photoConfirm = true;
        this._editorPaint(
          "[data-editor-photo]",
          this._editorPhotoHtml(),
          '[data-action="ed-photo-remove-do"]',
        );
        break;
      case "ed-photo-remove-cancel":
        state.photoConfirm = false;
        this._editorPaint(
          "[data-editor-photo]",
          this._editorPhotoHtml(),
          '[data-action="ed-photo-remove-ask"]',
        );
        break;
      case "ed-photo-remove-do":
        await this._editorCoverRemove();
        break;
      case "ed-step-remove-ask":
        state.stepConfirm = { id: el.dataset.value || "", file: el.dataset.edFileName || "" };
        this._editorPaintSteps();
        this.shadowRoot.querySelector('[data-action="ed-step-remove-do"]')?.focus?.();
        break;
      case "ed-step-remove-cancel":
        state.stepConfirm = null;
        this._editorPaintSteps();
        break;
      case "ed-step-remove-do":
        await this._editorStepRemove(el.dataset.value || "", el.dataset.edFileName || "");
        break;
      case "ed-upload-cancel":
        if (state.upload) state.upload.cancelled = true;
        break;
    }
  },

  /* ---------- comboboxes ---------- */
  _editorComboOpen(field, row, text) {
    const state = this._ed;
    if (!state || this._modal !== "edit") return;
    const query = String(text || "").trim();
    state.combo = {
      field,
      row,
      text: query,
      items: [],
      active: -1,
      loading: true,
      canCreate: false,
    };
    const seq = ++state.comboSeq;
    this._editorPaintCombo();
    this._ws(field === "unit" ? "units" : "foods", { search: query, per_page: 8 })
      .then((result) => {
        const combo = state.combo;
        if (this._ed !== state || seq !== state.comboSeq || !combo) return;
        combo.items = asArray(result?.items);
        combo.loading = false;
        const exact = combo.items.some(
          (item) => String(item.name).toLowerCase() === query.toLowerCase(),
        );
        combo.canCreate = Boolean(query) && !exact && this._permissions.can_admin;
        this._editorPaintCombo();
      })
      .catch((error) => {
        if (this._ed !== state || seq !== state.comboSeq) return;
        state.combo = null;
        state.error = this._errorText(error);
        this._editorPaintCombo();
        this._editorPaintIngredients();
      });
  },
  async _editorChoose(index) {
    const state = this._ed;
    const combo = state?.combo;
    const option = this._editorComboOptions()[index];
    const row = combo ? state.rows[combo.row] : null;
    if (!option || !row) return;
    const { field } = combo;
    let item = option.item;
    let existing = false;
    if (option.type === "create") {
      try {
        const made = await this._ws(field === "unit" ? "unit_create" : "food_create", {
          name: combo.text,
        });
        item = { id: made.id, name: made.name, abbreviation: made.abbreviation || "" };
        existing = made.existing === true;
      } catch (error) {
        state.combo = null;
        state.error = this._errorText(error);
        this._editorPaintCombo();
        this._editorPaintIngredients();
        return;
      }
    }
    row[field] =
      field === "unit"
        ? { id: item.id, name: item.name, abbreviation: item.abbreviation || "" }
        : { id: item.id, name: item.name };
    row[`${field}Text`] = item.name;
    row.textError = false;
    state.combo = null;
    state.error = "";
    const input = this.shadowRoot.querySelector(
      `[data-ed-input="${field}"][data-ed-row="${state.rows.indexOf(row)}"]`,
    );
    if (input) {
      input.value = item.name;
      input.focus?.();
    }
    this._editorPaintCombo();
    if (existing) this._editorAnnounce(this.t("editorCreatedExisting"));
  },

  /* ---------- ingredient save ---------- */
  async _editorSave() {
    const state = this._ed;
    if (!state || state.saving) return;
    const { rows, invalid } = this._editorRequestRows();
    if (invalid >= 0) {
      state.summaryOpen = false;
      this._editorPaintIngredients();
      return;
    }
    state.saving = true;
    state.error = "";
    this._editorPaintIngredients();
    try {
      const result = await this._ws("ingredients_save", {
        slug: state.slug,
        expected_hash: state.hash,
        rows,
      });
      if (result?.recipe) this._detail = result.recipe;
      this._data.recipes = null;
      state.lastBackup = { id: result?.backup_id || "" };
      state.saving = false;
      await this._editorLoad();
      this._editorRefreshHistory();
      this._editorToast(
        this.t("editorSavedWithBackup", { time: this._editorTime(new Date().toISOString(), true) }),
      );
    } catch (error) {
      state.saving = false;
      state.summaryOpen = false;
      if (error?.code === "recipe_changed") state.conflict = true;
      else state.error = this._errorText(error);
      this._editorPaintIngredients();
    }
  },
  async _editorReloadFresh() {
    const state = this._ed;
    try {
      this._detail = await this._ws("recipe", { slug: state.slug });
    } catch {}
    await this._editorLoad();
    this._editorPaintPhoto();
    this._editorPaintSteps();
  },

  /* ---------- history and restore ---------- */
  async _editorToggleHistory() {
    const history = this._ed.history;
    history.open = !history.open;
    history.confirm = "";
    if (history.open) await this._editorLoadHistory();
    else this._editorPaintHistory('[data-action="ed-history"]');
  },
  async _editorLoadHistory() {
    const state = this._ed;
    const history = state.history;
    history.loading = true;
    history.error = "";
    this._editorPaintHistory();
    try {
      history.items = asArray((await this._ws("recipe_backups", { slug: state.slug }))?.backups);
    } catch (error) {
      history.error = this._errorText(error);
    }
    history.loading = false;
    this._editorPaintHistory();
  },
  /** A change just created a backup: reload the list when it is open, otherwise drop the stale copy. */
  _editorRefreshHistory() {
    const history = this._ed.history;
    history.confirm = "";
    if (history.open) this._editorLoadHistory();
    else {
      history.items = null;
      this._editorPaintHistory();
    }
  },
  async _editorUndoAsk() {
    const state = this._ed;
    const history = state.history;
    history.open = true;
    await this._editorLoadHistory();
    const id = state.lastBackup?.id;
    if (id && asArray(history.items).some((item) => item.backup_id === id)) {
      history.confirm = id;
      this._editorPaintHistory('[data-action="ed-restore-do"]');
    }
  },
  async _editorRestore(backupId) {
    const state = this._ed;
    if (!backupId || state.history.busy) return;
    state.history.busy = true;
    try {
      const result = await this._ws("recipe_restore", { slug: state.slug, backup_id: backupId });
      const slug = state.slug;
      if (result?.recipe) this._detail = result.recipe;
      this._data.recipes = null;
      this._editorOpen();
      this._ed.slug = slug;
      this._ed.lastBackup = { id: result?.backup_id || "" };
      this._render();
      this._editorToast(
        this.t("editorRestoredWithBackup", {
          time: this._editorTime(new Date().toISOString(), true),
        }),
      );
    } catch (error) {
      state.history.busy = false;
      state.history.confirm = "";
      state.history.error = this._errorText(error);
      this._editorPaintHistory();
    }
  },

  /* ---------- photos ---------- */
  _editorPick(target) {
    const state = this._ed;
    if (!state || state.upload) return;
    state.pick = target;
    const input = this.shadowRoot.querySelector("[data-ed-file]");
    input?.click?.();
  },
  _editorUploadMessage(error) {
    const limits = this._permissions.limits;
    const size = Math.round((limits.upload_max_bytes || EDITOR_UPLOAD_MAX) / 1048576);
    switch (error?.code) {
      case "client_too_large":
        return this.t("editorUploadTooLarge", { size });
      case "client_wrong_type":
        return this.t("editorUploadWrongType");
      case "client_cancelled":
        return this.t("editorUploadCancelled");
      case "client_insecure":
        return this.t("editorUploadNeedsSecure");
      default:
        return this._errorText(error);
    }
  },
  /** Check the file, hash it and send it in sequential chunks. Resolves with the upload id. */
  async _editorSendFile(file, purpose) {
    const state = this._ed;
    const limits = this._permissions.limits;
    const max = Number(limits.upload_max_bytes) || EDITOR_UPLOAD_MAX;
    if (!(file.size <= max)) throw this._editorCoded("client_too_large");
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const mime = this._editorSniff(head);
    if (!mime || file.size < 100) throw this._editorCoded("client_wrong_type");
    if (!globalThis.crypto?.subtle) throw this._editorCoded("client_insecure");
    const data = await file.arrayBuffer();
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", data));
    const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const begun = await this._ws("upload_begin", {
      slug: state.slug,
      purpose,
      size: file.size,
      mime,
      sha256,
    });
    const step = Math.max(
      1,
      Math.min(
        Number(begun.chunk_bytes) || EDITOR_UPLOAD_CHUNK,
        Number(limits.upload_chunk_bytes) || EDITOR_UPLOAD_CHUNK,
      ),
    );
    const count = Math.ceil(file.size / step);
    for (let index = 0; index < count; index++) {
      if (state.upload?.cancelled) throw this._editorCoded("client_cancelled");
      const payload = {
        upload_id: begun.upload_id,
        index,
        data: this._editorBase64(new Uint8Array(data.slice(index * step, (index + 1) * step))),
      };
      try {
        await this._ws("upload_chunk", payload);
      } catch (error) {
        if (error?.code === "upload_expired" || state.upload?.cancelled) throw error;
        await this._ws("upload_chunk", payload); // one retry per chunk
      }
      if (state.upload) {
        state.upload.percent = Math.round(((index + 1) / count) * 100);
        this._editorPaintProgress();
      }
    }
    // A cancel that arrives while the last chunk is in flight must stop before the target command.
    if (state.upload?.cancelled) throw this._editorCoded("client_cancelled");
    return begun.upload_id;
  },
  /** Upload, then run `command(uploadId)`. An expired session restarts from the beginning once. */
  async _editorWithUpload(file, purpose, command) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await command(await this._editorSendFile(file, purpose));
      } catch (error) {
        if (error?.code !== "upload_expired" || attempt > 0 || this._ed?.upload?.cancelled)
          throw error;
        if (this._ed.upload) this._ed.upload.percent = 0;
      }
    }
  },
  async _editorUploadFlow(file) {
    const state = this._ed;
    const pick = state?.pick;
    if (!state || !pick || state.upload) return;
    state.pick = null;
    const cover = pick.target === "cover";
    const steps = asArray(this._detail?.recipeInstructions);
    const index = cover ? -1 : steps.findIndex((step) => step?.id === pick.target);
    if (!cover && index < 0) return;
    state.upload = { target: cover ? "cover" : pick.target, percent: 0, cancelled: false };
    if (cover) this._editorPaintPhoto();
    else this._editorPaintSteps();
    this._editorPaintProgress();
    try {
      const result = await this._editorWithUpload(file, cover ? "cover" : "step", (uploadId) =>
        cover
          ? this._ws("recipe_image_set", {
              slug: state.slug,
              upload_id: uploadId,
              expected_image: String(this._detail?.image ?? ""),
            })
          : this._ws("step_image_add", {
              slug: state.slug,
              step_index: index,
              step_id: steps[index].id,
              upload_id: uploadId,
              ...(pick.replace ? { replace_file_name: pick.replace } : {}),
            }),
      );
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.upload = null;
      this._editorPaintPhoto();
      this._editorPaintSteps();
      this._editorToast(
        this._editorUploadMessage(error),
        error?.code === "client_cancelled" ? "status" : "error",
      );
      if (error?.code === "recipe_changed") await this._editorReloadFresh();
    }
  },
  /**
   * Mealie gives every step a new id each time the steps are written, so after a photo change the
   * step rows of the open editor are pointed at the new ids (matched by their old id), or the photo
   * controls of that step would find nothing and stay empty.
   */
  _editorFollowStepIds(before) {
    const after = asArray(this._detail?.recipeInstructions);
    for (const row of this.shadowRoot.querySelectorAll("[data-editor-step]")) {
      const index = before.indexOf(row.dataset.stepId);
      const next = index < 0 ? "" : after[index]?.id;
      if (!next || next === row.dataset.stepId) continue;
      row.dataset.stepId = next;
      const box = row.querySelector("[data-ed-step-photos]");
      if (box) box.dataset.edStepPhotos = next;
    }
  },
  _editorAfterPhoto(result, state) {
    const before = asArray(this._detail?.recipeInstructions).map((step) => step?.id);
    if (result?.recipe) this._detail = result.recipe;
    this._editorFollowStepIds(before);
    this._data.recipes = null;
    state.upload = null;
    state.photoConfirm = false;
    state.stepConfirm = null;
    state.lastBackup = { id: result?.backup_id || "" };
    this._editorPaintPhoto();
    this._editorPaintSteps();
    this._editorRefreshHistory();
    this._editorToast(
      this.t("editorSavedWithBackup", { time: this._editorTime(new Date().toISOString(), true) }),
    );
  },
  async _editorCoverRemove() {
    const state = this._ed;
    try {
      const result = await this._ws("recipe_image_delete", {
        slug: state.slug,
        expected_image: String(this._detail?.image ?? ""),
      });
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.photoConfirm = false;
      this._editorPaintPhoto();
      this._editorToast(this._errorText(error), "error");
      if (error?.code === "recipe_changed") await this._editorReloadFresh();
    }
  },
  async _editorStepRemove(id, file) {
    const state = this._ed;
    const steps = asArray(this._detail?.recipeInstructions);
    const index = steps.findIndex((step) => step?.id === id);
    if (index < 0 || !file) return;
    try {
      const result = await this._ws("step_image_remove", {
        slug: state.slug,
        step_index: index,
        step_id: id,
        file_name: file,
      });
      this._editorAfterPhoto(result, state);
    } catch (error) {
      state.stepConfirm = null;
      this._editorPaintSteps();
      this._editorToast(this._errorText(error), "error");
      if (error?.code === "step_not_found") await this._editorReloadFresh();
    }
  },

  // Editor rows render their options on demand inside the grid, so markup and painting are the
  // editor's own; the keyboard model is the shared one from the recipe picker (contract D.2).
  /** Combobox input plus its listbox. `attrs` is appended to the input, ids derive from `id`. */
  _editorComboMarkup({
    id,
    label,
    value = "",
    placeholder = "",
    attrs = "",
    listClass = "",
    listId,
  }) {
    const list = listId || `${id}-list`;
    return `<input role="combobox" id="${esc(id)}" aria-autocomplete="list" aria-expanded="false" aria-haspopup="listbox" aria-controls="${esc(list)}" ${attrs} autocomplete="off" maxlength="120" value="${esc(value)}" ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} aria-label="${esc(label)}">
      <ul${listClass ? ` class="${esc(listClass)}"` : ""} role="listbox" id="${esc(list)}" hidden aria-label="${esc(label)}"></ul>`;
  },
  /** Paints one combobox: `state = {root, open, html, active, optionPrefix}`. */
  _editorComboPaint(state) {
    const input = state.root.querySelector("input");
    const list = state.root.querySelector("ul");
    list.hidden = !state.open;
    list.innerHTML = state.open ? state.html : "";
    input.setAttribute("aria-expanded", String(state.open));
    if (state.open && state.active >= 0) {
      input.setAttribute("aria-activedescendant", `${state.optionPrefix}${state.active}`);
      list.querySelector(".is-active")?.scrollIntoView?.({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  },
};
