/** Searchable, paginated recipe picker (ARIA combobox) for the meal plan dialog. */
const PICKER_ID = "recipe-picker";
const PICKER_PAGE_SIZE = 20;
const PICKER_DEBOUNCE_MS = 250;
const PICKER_JUMP = 10;
const PICKER_MAX_FILTERS = 10;

export const recipePickerMethods = {
  /** Generic combobox markup (input, listbox panel, live region); reusable by other dialogs. */
  _comboboxMarkup({
    id,
    label,
    value = "",
    placeholder = "",
    inputKey = id,
    open = false,
    activeId = "",
    list = "",
    status = "",
    live = "",
    busy = false,
    action = "",
    autofocus = false,
  }) {
    return `<div class="combobox" data-combobox-root="${esc(id)}">
      <label class="field"><span id="${esc(id)}-label">${esc(label)}</span>
      <input type="text" class="combobox-input" role="combobox" aria-autocomplete="list" aria-expanded="${open}" aria-controls="${esc(id)}-list" ${activeId ? `aria-activedescendant="${esc(activeId)}"` : ""} autocomplete="off" spellcheck="false" maxlength="100" ${autofocus ? "data-autofocus" : ""} ${action ? `data-action="${esc(action)}"` : ""} data-input="${esc(inputKey)}" data-combobox="${esc(id)}" placeholder="${esc(placeholder)}" value="${esc(value)}"></label>
      <div class="picker-panel" data-combobox-panel="${esc(id)}" ${open ? "" : "hidden"}>
        <ul class="picker-list" role="listbox" id="${esc(id)}-list" aria-labelledby="${esc(id)}-label" aria-busy="${busy}" data-combobox-list="${esc(id)}">${list}</ul>
        <div class="picker-state" data-combobox-state="${esc(id)}">${status}</div>
      </div>
      <div class="picker-vh" aria-live="polite" data-combobox-live="${esc(id)}">${esc(live)}</div>
    </div>`;
  },
  /** Sync aria state and option highlighting from `state` ({id, open, active, items}). */
  _comboboxPaint(state) {
    const root = this.shadowRoot;
    const input = root.querySelector(`[data-combobox="${state.id}"]`);
    const panel = root.querySelector(`[data-combobox-panel="${state.id}"]`);
    const list = root.querySelector(`[data-combobox-list="${state.id}"]`);
    const valid = state.open && state.active >= 0 && state.active < state.items.length;
    input?.setAttribute("aria-expanded", String(Boolean(state.open)));
    if (valid) input?.setAttribute("aria-activedescendant", `${state.id}-opt-${state.active}`);
    else input?.removeAttribute("aria-activedescendant");
    panel?.toggleAttribute("hidden", !state.open);
    if (!list) return;
    [...list.querySelectorAll('[role="option"]')].forEach((option, i) => {
      const on = valid && i === state.active;
      option.setAttribute("aria-selected", String(on));
      option.toggleAttribute("data-active", on);
      if (on) option.scrollIntoView?.({ block: "nearest" });
    });
  },
  /**
   * Keyboard model of the combobox. `state` carries {id, open, active, items, hasMore, loading}
   * plus callbacks {onSelect(index), onMore()}. Returns true when the event was consumed.
   */
  _comboboxKeydown(event, state) {
    const last = state.items.length - 1;
    const go = (index) => {
      if (last < 0) return false;
      state.open = true;
      state.active = Math.max(0, Math.min(last, index));
      event.preventDefault();
      this._comboboxPaint(state);
      return true;
    };
    const more = () => {
      if (state.hasMore && !state.loading) state.onMore?.();
    };
    switch (event.key) {
      case "ArrowDown":
        if (!state.open) {
          state.open = true;
          return go(Math.max(0, state.active));
        }
        if (state.active >= last) {
          event.preventDefault();
          more();
          return true;
        }
        return go(state.active + 1);
      case "ArrowUp":
        return go(state.open ? state.active - 1 : Math.max(0, state.active));
      case "Home":
        return state.open && last >= 0 ? go(0) : false;
      case "End":
        return state.open && last >= 0 ? go(last) : false;
      case "PageDown":
        if (!state.open || last < 0) return false;
        if (state.active >= last) {
          event.preventDefault();
          more();
          return true;
        }
        return go(state.active + PICKER_JUMP);
      case "PageUp":
        return state.open && last >= 0 ? go(state.active - PICKER_JUMP) : false;
      case "Enter":
        if (!state.open) return false;
        event.preventDefault();
        if (state.active >= 0 && state.active <= last) state.onSelect?.(state.active);
        return true;
      case "Escape":
        if (!state.open) return false;
        event.preventDefault();
        state.open = false;
        this._comboboxPaint(state);
        return true;
      case "Tab":
        if (state.open) {
          state.open = false;
          this._comboboxPaint(state);
        }
        return false;
      default:
        return false;
    }
  },

  _pickerFiltersActive(s = this._picker) {
    return Boolean(
      s && (s.filters.categories.length || s.filters.tags.length || s.filters.favorites),
    );
  },
  _pickerSync() {
    if (this._modal === "plan") this._pickerStart();
    else if (this._picker) this._pickerStop();
  },
  _pickerStart() {
    this._pickerStop();
    const detail = this._detail;
    const pinned = detail?.id
      ? {
          id: String(detail.id),
          name: detail.name || "",
          slug: detail.slug || "",
          totalTime: detail.totalTime || "",
          imageUrl: detail.imageUrl || "",
        }
      : null;
    const s = {
      id: PICKER_ID,
      native: this._providerActive === "home_assistant",
      open: true,
      active: -1,
      items: [],
      page: 0,
      totalPages: 0,
      total: 0,
      hasMore: false,
      loading: true,
      error: "",
      retryReset: true,
      advance: false,
      seq: 0,
      timer: null,
      observer: null,
      query: "",
      pinned,
      selected: pinned ? { id: pinned.id, name: pinned.name } : null,
      filters: { categories: [], tags: [], favorites: false, order: "name" },
      panels: { category: false, tag: false },
      meta: null,
      nativeAll: null,
      onSelect: (index) => this._pickerSelect(index),
      onMore: () => {
        this._picker.advance = true;
        this._pickerLoad(false);
      },
    };
    this._picker = s;
    this._pickerLoad(true);
    if (!s.native)
      this._ws("metadata")
        .then((meta) => {
          if (this._picker !== s) return;
          s.meta = { categories: asArray(meta?.categories), tags: asArray(meta?.tags) };
          const region = this.shadowRoot.querySelector('[data-picker="filters"]');
          if (region) region.innerHTML = this._pickerFiltersMarkup(s);
        })
        .catch(() => {});
  },
  _pickerStop() {
    const s = this._picker;
    if (!s) return;
    clearTimeout(s.timer);
    s.observer?.disconnect();
    s.seq++;
    this._picker = null;
  },
  /** Recipe chosen most recently, so the optimistic meal plan row can show its name. */
  _pickerChosen(id) {
    const item = this._pickerLastChosen;
    return item && String(item.id) === String(id) ? item : undefined;
  },

  async _pickerFetch(s, page) {
    if (s.native) {
      if (page === 1 || !s.nativeAll) {
        const data = await this._ws("recipes", { search: s.query });
        s.nativeAll = asArray(data?.items);
      }
      const start = (page - 1) * PICKER_PAGE_SIZE;
      return {
        items: s.nativeAll.slice(start, start + PICKER_PAGE_SIZE),
        page,
        per_page: PICKER_PAGE_SIZE,
        total: s.nativeAll.length,
        total_pages: Math.max(1, Math.ceil(s.nativeAll.length / PICKER_PAGE_SIZE)),
      };
    }
    const payload = { page, per_page: PICKER_PAGE_SIZE, search: s.query };
    if (s.filters.categories.length) payload.categories = [...s.filters.categories];
    if (s.filters.tags.length) payload.tags = [...s.filters.tags];
    if (s.filters.favorites) payload.favorites_only = true;
    if (s.filters.order !== "name") payload.order = s.filters.order;
    return this._ws("recipes", payload);
  },
  async _pickerLoad(reset) {
    const s = this._picker;
    if (!s) return;
    if (!reset && (s.loading || !s.hasMore)) return;
    clearTimeout(s.timer);
    const seq = ++s.seq;
    const before = s.items.length;
    s.loading = true;
    s.error = "";
    s.retryReset = reset;
    if (reset) {
      s.items = [];
      s.active = -1;
      s.page = 0;
      s.hasMore = false;
    }
    this._pickerPaint();
    try {
      const page = reset ? 1 : s.page + 1;
      const data = await this._pickerFetch(s, page);
      if (this._picker !== s || seq !== s.seq) return;
      const incoming = asArray(data?.items);
      const known = new Set(reset ? [] : s.items.map((x) => String(x.id)));
      const fresh = incoming.filter((x) => !known.has(String(x.id)));
      let items = reset ? fresh : s.items.concat(fresh);
      if (reset && s.pinned && !s.query && !this._pickerFiltersActive(s))
        items = [s.pinned, ...items.filter((x) => String(x.id) !== s.pinned.id)];
      s.items = items;
      s.total = Number(data?.total) >= 0 ? Number(data.total) : items.length;
      s.page = Number(data?.page) || page;
      const perPage = Number(data?.per_page) || PICKER_PAGE_SIZE;
      const pages = Number(data?.total_pages) || Math.ceil(s.total / perPage) || 1;
      s.hasMore = s.page < pages && incoming.length > 0;
      if (reset && s.selected) s.active = items.findIndex((x) => String(x.id) === s.selected.id);
      if (!reset && s.advance && items.length > before) s.active = before;
    } catch (err) {
      if (this._picker !== s || seq !== s.seq) return;
      s.error = this._errorText(err);
    }
    s.advance = false;
    s.loading = false;
    this._pickerPaint();
  },

  _pickerRowsMarkup(s) {
    const rows = s.items.map((r, i) => {
      const chosen = s.selected && String(r.id) === s.selected.id;
      const on = s.open && i === s.active;
      return `<li role="option" class="picker-option" id="${s.id}-opt-${i}" aria-selected="${on}" data-action="picker-pick" data-value="${i}" ${on ? "data-active" : ""} ${chosen ? "data-chosen" : ""}><span class="picker-thumb" aria-hidden="true">${recipeImage(r)}</span><span class="picker-name">${esc(r.name)}</span><span class="picker-time">${esc(AtelierStudio.formatTime(r.totalTime, this._language))}</span></li>`;
    });
    if (s.loading) {
      const skeletons = s.items.length ? 1 : 3;
      for (let i = 0; i < skeletons; i++)
        rows.push('<li role="presentation" class="picker-skeleton" aria-hidden="true"></li>');
    }
    if (s.hasMore && !s.error)
      rows.push('<li role="presentation" class="picker-sentinel" data-picker="sentinel"></li>');
    return rows.join("");
  },
  _pickerStateMarkup(s) {
    if (s.error)
      return `<p class="picker-note is-error" role="alert">${esc(this.t("pickerError", { error: s.error }))}</p><button class="btn tiny" type="button" data-action="picker-retry">${esc(this.t("pickerRetry"))}</button>`;
    if (s.loading) return `<p class="picker-note">${esc(this.t("pickerLoading"))}</p>`;
    if (!s.items.length) {
      const active = this._pickerFiltersActive(s);
      const text = s.query ? this.t("pickerEmpty", { query: s.query }) : this.t("pickerNoneFound");
      return `<p class="picker-note" role="status">${esc(text)}</p>${active ? `<button class="btn tiny" type="button" data-action="picker-clear">${esc(this.t("pickerClearFilters"))}</button>` : ""}`;
    }
    if (s.hasMore)
      return `<button class="btn tiny" type="button" data-action="picker-more">${esc(this.t("pickerLoadMore"))}</button>`;
    return `<p class="picker-note" role="note">${esc(this.t("pickerEnd"))}</p>`;
  },
  _pickerLiveText(s) {
    if (s.error) return this.t("pickerError", { error: s.error });
    if (s.loading) return this.t("pickerLoading");
    if (!s.items.length)
      return s.query ? this.t("pickerEmpty", { query: s.query }) : this.t("pickerNoneFound");
    return this.t("pickerCount", {
      shown: s.items.length,
      total: Math.max(s.total, s.items.length),
    });
  },
  /** Repaint list, state area and live region without touching the focused input. */
  _pickerPaint() {
    const s = this._picker;
    if (!s) return;
    const root = this.shadowRoot;
    const list = root.querySelector(`[data-combobox-list="${s.id}"]`);
    if (list) {
      list.innerHTML = this._pickerRowsMarkup(s);
      list.setAttribute("aria-busy", String(s.loading));
    }
    const state = root.querySelector(`[data-combobox-state="${s.id}"]`);
    if (state) state.innerHTML = this._pickerStateMarkup(s);
    const live = root.querySelector(`[data-combobox-live="${s.id}"]`);
    if (live) live.textContent = this._pickerLiveText(s);
    const submit = root.querySelector('[data-picker="submit"]');
    if (submit) submit.disabled = !s.selected;
    this._comboboxPaint(s);
    this._pickerObserve(s);
  },
  _pickerObserve(s) {
    s.observer?.disconnect();
    s.observer = null;
    if (typeof IntersectionObserver === "undefined" || !s.hasMore || s.loading || s.error) return;
    const sentinel = this.shadowRoot.querySelector('[data-picker="sentinel"]');
    if (!sentinel) return;
    const panel = this.shadowRoot.querySelector(`[data-combobox-panel="${s.id}"]`);
    s.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this._pickerLoad(false);
      },
      { root: panel || null },
    );
    s.observer.observe(sentinel);
  },
  _pickerSelect(index) {
    const s = this._picker;
    const item = s?.items[index];
    if (!item) return;
    s.selected = { id: String(item.id), name: item.name || "" };
    this._pickerLastChosen = item;
    s.open = false;
    s.active = index;
    const root = this.shadowRoot;
    const input = root.querySelector(`[data-combobox="${s.id}"]`);
    if (input) input.value = s.selected.name;
    const hidden = root.querySelector('[data-picker="value"]');
    if (hidden) hidden.value = s.selected.id;
    this._pickerPaint();
    input?.focus?.({ preventScroll: true });
  },

  _pickerFilterGroup(s, key, label, entries) {
    const picked = key === "category" ? s.filters.categories : s.filters.tags;
    const panelId = `${s.id}-${key}-panel`;
    const open = s.panels[key];
    return `<div class="picker-filter"><button class="btn tiny picker-disclosure" type="button" data-action="picker-toggle" data-value="${key}" aria-expanded="${open}" aria-controls="${panelId}"><span>${esc(label)}</span><span data-picker-count="${key}">${picked.length ? `(${picked.length})` : ""}</span></button>
      <div class="picker-options" id="${panelId}" role="group" aria-label="${esc(label)}" ${open ? "" : "hidden"}>${entries.map((e) => `<label><input type="checkbox" data-input="picker-${key}" value="${esc(e.slug)}" ${picked.includes(e.slug) ? "checked" : ""}> <span>${esc(e.name || e.slug)}</span></label>`).join("")}</div></div>`;
  },
  _pickerFiltersMarkup(s) {
    if (s.native) return "";
    const usable = (list) => asArray(list).filter((e) => e?.slug);
    const groups = [];
    if (usable(s.meta?.categories).length)
      groups.push(
        this._pickerFilterGroup(s, "category", this.t("pickerCategory"), usable(s.meta.categories)),
      );
    if (usable(s.meta?.tags).length)
      groups.push(this._pickerFilterGroup(s, "tag", this.t("pickerTag"), usable(s.meta.tags)));
    return `<div class="picker-filter-row">${groups.join("")}
      <label class="field"><span>${esc(this.t("pickerSort"))}</span><select data-input="picker-order"><option value="name" ${s.filters.order === "name" ? "selected" : ""}>${esc(this.t("pickerSortName"))}</option><option value="recent" ${s.filters.order === "recent" ? "selected" : ""}>${esc(this.t("pickerSortRecent"))}</option></select></label></div>
      <label class="editor-check"><input type="checkbox" data-input="picker-favorites" aria-describedby="${s.id}-fav-hint" ${s.filters.favorites ? "checked" : ""}> ${esc(this.t("pickerFavorites"))}</label><small class="picker-hint" id="${s.id}-fav-hint">${esc(this.t("pickerFavoritesHint"))}</small>`;
  },
  /** Markup of the whole picker; called from the plan dialog. */
  _pickerMarkup() {
    const s = this._picker;
    if (!s) return "";
    return `<div class="picker" data-picker="root">
      <div class="picker-filters" data-picker="filters">${this._pickerFiltersMarkup(s)}</div>
      ${this._comboboxMarkup({ id: s.id, label: this.t("pickerLabel"), value: s.selected?.name || s.query || "", action: "picker-open", autofocus: true, placeholder: this.t("pickerPlaceholder"), inputKey: "picker-search", open: s.open, activeId: s.open && s.active >= 0 && s.active < s.items.length ? `${s.id}-opt-${s.active}` : "", list: this._pickerRowsMarkup(s), status: this._pickerStateMarkup(s), live: this._pickerLiveText(s), busy: s.loading })}
      <input type="hidden" name="recipe_id" data-picker="value" value="${esc(s.selected?.id || "")}">
    </div>`;
  },

  /** Hook for the card keydown handler; true when the picker consumed the key. */
  _pickerKeydown(event) {
    const s = this._picker;
    if (this._modal !== "plan" || !s) return false;
    if (event.target?.dataset?.input !== "picker-search") return false;
    return this._comboboxKeydown(event, s);
  },
  _pickerClick(action, value) {
    const s = this._picker;
    if (!s) return;
    const input = this.shadowRoot.querySelector(`[data-combobox="${s.id}"]`);
    switch (action) {
      case "picker-open":
        if (!s.open) {
          s.open = true;
          this._comboboxPaint(s);
        }
        break;
      case "picker-pick":
        this._pickerSelect(Number(value));
        break;
      case "picker-more":
        s.advance = true;
        this._pickerLoad(false);
        input?.focus?.({ preventScroll: true });
        break;
      case "picker-retry":
        this._pickerLoad(s.retryReset);
        input?.focus?.({ preventScroll: true });
        break;
      case "picker-clear": {
        s.filters = { categories: [], tags: [], favorites: false, order: "name" };
        const region = this.shadowRoot.querySelector('[data-picker="filters"]');
        if (region) region.innerHTML = this._pickerFiltersMarkup(s);
        this._pickerLoad(true);
        break;
      }
      case "picker-toggle": {
        if (!(value in s.panels)) break;
        s.panels[value] = !s.panels[value];
        const root = this.shadowRoot;
        root
          .querySelector(`[data-action="picker-toggle"][data-value="${value}"]`)
          ?.setAttribute("aria-expanded", String(s.panels[value]));
        root.querySelector(`#${s.id}-${value}-panel`)?.toggleAttribute("hidden", !s.panels[value]);
        break;
      }
    }
  },
  _pickerInput(el, type) {
    const s = this._picker;
    if (!s) return;
    if (type === "picker-search") {
      s.query = String(el.value || "")
        .slice(0, 100)
        .trim();
      s.selected = null;
      const hidden = this.shadowRoot.querySelector('[data-picker="value"]');
      if (hidden) hidden.value = "";
      s.open = true;
      s.seq++;
      clearTimeout(s.timer);
      s.items = [];
      s.active = -1;
      s.hasMore = false;
      s.loading = true;
      s.error = "";
      this._pickerPaint();
      s.timer = setTimeout(() => this._pickerLoad(true), PICKER_DEBOUNCE_MS);
      return;
    }
    if (type === "picker-category" || type === "picker-tag") {
      const list = type === "picker-category" ? s.filters.categories : s.filters.tags;
      const slug = String(el.value || "");
      const at = list.indexOf(slug);
      if (el.checked && at < 0) {
        if (list.length >= PICKER_MAX_FILTERS) {
          el.checked = false;
          return;
        }
        list.push(slug);
      } else if (!el.checked && at >= 0) list.splice(at, 1);
      const key = type === "picker-category" ? "category" : "tag";
      const count = this.shadowRoot.querySelector(`[data-picker-count="${key}"]`);
      if (count) count.textContent = list.length ? `(${list.length})` : "";
    } else if (type === "picker-favorites") s.filters.favorites = Boolean(el.checked);
    else if (type === "picker-order") s.filters.order = el.value === "recent" ? "recent" : "name";
    else return;
    this._pickerLoad(true);
  },
};
