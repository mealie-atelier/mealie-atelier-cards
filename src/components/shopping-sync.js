/** Smart Shopping Sync: status panel, setup wizard and review list for the Mealie Atelier Bridge. */
export const shoppingSyncMethods = {
  // Sync state lives on one object so closing the modals can drop it in a single place.
  _syncData() {
    if (!this._sync)
      this._sync = {
        state: null,
        raw: "",
        requested: false,
        loading: false,
        loadFailed: false,
        view: "status",
        busy: false,
        error: "",
        result: "",
        confirmDelete: "",
        review: null,
        setup: null,
      };
    return this._sync;
  },
  _syncEntry() {
    const entries = asArray(this._status?.entries);
    return entries.find((x) => x.entry_id === this._config.entry_id) || entries[0] || {};
  },
  _syncCaps() {
    const entry = this._syncEntry();
    const grants = entry.permissions || {};
    const native = this._providerActive === "home_assistant";
    return {
      supported: !native && entry.features?.shopping_sync === true,
      standalone: !native && entry.features?.shopping_sync === false,
      readOnly: entry.read_only === true,
      write: (grants.can_write ?? entry.can_write) === true,
      admin: (grants.can_admin ?? entry.can_manage) === true,
    };
  },
  _syncRules() {
    return asArray(this._syncData().state?.rules);
  },
  _syncIssues(rule) {
    const c = rule?.counts || {};
    return (
      (c.failed || 0) +
      (c.needs_reconciliation || 0) +
      (c.changed_after_send || 0) +
      (c.removed_after_send || 0)
    );
  },
  _syncIssueCount() {
    return this._syncRules().reduce((sum, rule) => sum + this._syncIssues(rule), 0);
  },
  _syncWaiting(rule) {
    const c = rule?.counts || {};
    return (c.pending || 0) + (c.sending || 0);
  },
  _syncEntryButton() {
    const caps = this._syncCaps();
    if (!caps.supported && !caps.standalone) return "";
    const issues = caps.supported ? this._syncIssueCount() : 0;
    const badge = issues
      ? `<span class="sync-badge">${icon("bolt", 12)} ${esc(this.t("syncBadgeIssues", { count: issues }))}</span>`
      : "";
    return `<button class="btn tiny sync-open" data-action="sync-open" aria-haspopup="dialog">${icon("cart", 14)} ${esc(this.t("syncOpen"))}${badge}</button>`;
  },
  _syncRelative(iso) {
    const at = Date.parse(iso);
    if (!Number.isFinite(at)) return "";
    const seconds = Math.round((at - Date.now()) / 1000);
    if (Math.abs(seconds) < 5) return this.t("syncJustNow");
    const format = new Intl.RelativeTimeFormat(this._locale, { numeric: "auto" });
    for (const [unit, size] of [
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ])
      if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    return format.format(seconds, "second");
  },
  // Friendly platform name for an integration domain id (never the raw snake_case id).
  _syncPlatformLabel(platform) {
    const id = String(platform || "").trim();
    if (!id) return "";
    const known = { bring: "Bring!", shopping_list: this.t("syncPlatformShoppingList") };
    if (known[id]) return known[id];
    const words = id.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  },
  // Destination name plus platform, dropping the platform when it only repeats the name.
  _syncDestinationLabel(name, platform) {
    const label = this._syncPlatformLabel(platform);
    const plain = (v) =>
      String(v)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "");
    if (!label || plain(label) === plain(name)) return String(name || "");
    return this.t("syncDestinationOption", { name, platform: label });
  },
  // Partial, failed and unclear results must never read as a success.
  _syncOutcomeText(outcome, counts = {}) {
    const keys = {
      sent: "syncOutcomeSent",
      partial: "syncOutcomePartial",
      failed: "syncOutcomeFailed",
      destination_unavailable: "syncOutcomeDestinationUnavailable",
      source_unavailable: "syncOutcomeSourceUnavailable",
      nothing_to_send: "syncOutcomeNothing",
      reconciled: "syncOutcomeReconciled",
    };
    if (outcome === "sent" && (counts.needs_reconciliation || 0) > 0)
      return this.t("syncOutcomePartial");
    return this.t(keys[outcome] || "syncOutcomeUnknown");
  },
  _syncOutcomeIcon(outcome, counts = {}) {
    const good = ["sent", "nothing_to_send", "reconciled"].includes(outcome);
    return good && !(counts.needs_reconciliation > 0) ? icon("check", 15) : icon("bolt", 15);
  },
  _syncResultText(result) {
    if (result?.queued) return this.t("syncRunQueued");
    return this.t("syncRunResult", {
      result: this._syncOutcomeText(result?.outcome, {
        needs_reconciliation: result?.needs_reconciliation,
      }),
      sent: result?.sent ?? 0,
      skipped: (result?.skipped_duplicates ?? 0) + (result?.merged ?? 0),
      failed: (result?.failed ?? 0) + (result?.needs_reconciliation ?? 0),
      left: result?.pending_left ?? 0,
    });
  },

  async _syncLoad({ quiet = false } = {}) {
    const sync = this._syncData();
    if (sync.loading) return;
    sync.loading = true;
    sync.requested = true;
    try {
      const state = await this._ws("sync_state");
      const raw = JSON.stringify(state || {});
      const changed = raw !== sync.raw || sync.loadFailed;
      sync.loading = false;
      sync.loadFailed = false;
      if (changed) {
        sync.raw = raw;
        sync.state = state;
        this._render();
      }
    } catch (err) {
      const repeated = sync.loadFailed;
      sync.loading = false;
      sync.loadFailed = true;
      if (!quiet) sync.error = this._errorText(err);
      if (!quiet || !repeated) this._render();
    }
  },

  // One timer at most: 10 s while the status modal is open, 60 s on the visible Shopping view.
  _syncPollInterval() {
    const caps = this._syncCaps();
    if (!caps.supported || !this.isConnected) return 0;
    if (this._modal === "sync") return 10000;
    if (!this._modal && this._view === "shopping" && this._syncRules().length) return 60000;
    return 0;
  },
  _syncPollSchedule() {
    const wanted = this._syncPollInterval();
    if (wanted === (this._syncPollMs || 0)) return;
    this._syncPollStop();
    if (!wanted) return;
    this._syncPollMs = wanted;
    this._syncTimer = setInterval(() => this._syncPollTick(), wanted);
  },
  _syncPollStop() {
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = null;
    this._syncPollMs = 0;
  },
  async _syncPollTick() {
    if (document.visibilityState !== "visible" || !this._syncPollMs) return;
    await this._syncLoad({ quiet: true });
  },
  // Runs after every render: loads the status lazily, keeps the timer in line and resets closed views.
  _syncAfterRender() {
    const sync = this._syncData();
    if (!["sync", "sync-setup"].includes(this._modal)) {
      sync.view = "status";
      sync.review = null;
      sync.confirmDelete = "";
    }
    if (this._modal !== "sync-setup") sync.setup = null;
    if (
      this._syncCaps().supported &&
      !sync.requested &&
      ["shopping", "dashboard"].includes(this._view)
    )
      this._syncLoad({ quiet: true });
    this._syncPollSchedule();
  },

  _syncModalHtml() {
    if (!["sync", "sync-setup", "sync-info"].includes(this._modal)) return "";
    const closing = `<button class="icon-btn modal-close" data-action="close-modal" title="${esc(this.t("close"))}" aria-label="${esc(this.t("close"))}">${icon("close")}</button>`;
    let content,
      size = "";
    if (this._modal === "sync-info") content = this._syncInfoHtml();
    else if (this._modal === "sync-setup") {
      size = "large";
      content = this._syncSetupHtml();
    } else content = this._syncSyncHtml();
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="sync-title">${closing}${content}</div></div>`;
  },
  _syncLead(title, text) {
    return `<div class="editor-lead"><div><div class="eyebrow">MEALIE ATELIER / ${esc(this.t("shopping").toUpperCase())}</div><h2 id="sync-title">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}</div><div class="editor-stamp">${icon("cart", 26)}</div></div>`;
  },
  _syncInfoHtml() {
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncTitle"))}<section class="editor-card"><p class="sync-explain" role="status">${icon("leaf", 16)} ${esc(this.t("syncStandaloneExplain"))}</p></section></div>`;
  },

  _syncSyncHtml() {
    const sync = this._syncData();
    const caps = this._syncCaps();
    if (sync.view === "review") return this._syncReviewHtml();
    const rules = this._syncRules();
    const audit = asArray(sync.state?.audit).slice(0, 20);
    const live = sync.result
      ? `<p class="sync-result">${sync.resultIcon || icon("check", 15)} ${esc(sync.result)}</p>`
      : "";
    const body = rules.length
      ? rules.map((rule) => this._syncRuleHtml(rule, caps)).join("")
      : `<section class="editor-card"><div class="notice">${icon("cart")} ${esc(sync.loadFailed ? this.t("syncLoadFailed") : sync.state ? this.t("syncNoRules") : this.t("loading"))}</div></section>`;
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncTitle"))}
      ${sync.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(sync.error)}</span></div>` : ""}
      <div class="sync-live" role="status" aria-live="polite">${live}</div>
      ${!caps.write ? `<p class="notice sync-needs-write" role="note">${icon("leaf", 16)} ${esc(this.t(caps.readOnly ? "syncReadOnly" : "syncNeedsWrite"))}</p>` : ""}
      ${body}
      ${caps.admin && rules.length < 5 ? `<div class="form-actions"><button class="btn primary" data-action="sync-setup-open" data-value="">${icon("plus", 14)} ${esc(this.t("syncAddRule"))}</button></div>` : ""}
      ${audit.length ? `<section class="editor-card sync-audit"><h3>${esc(this.t("syncAuditTitle"))}</h3><ul class="sync-list">${audit.map((a) => `<li>${this._syncOutcomeIcon(a.outcome)} ${esc(this.tp("syncAuditEntry", a.count ?? 0, { time: this._syncRelative(a.at), result: this._syncOutcomeText(a.outcome) }))}</li>`).join("")}</ul></section>` : ""}</div>`;
  },
  _syncRuleHtml(rule, caps) {
    const sync = this._syncData();
    const counts = rule.counts || {};
    const issues = this._syncIssues(rule);
    const destination = rule.destination || {};
    const destName = destination.name || rule.destination_entity_id;
    const mode = rule.mode === "move" ? "Move" : "Copy";
    const state = !rule.activated ? "NotActivated" : rule.paused ? "Paused" : "Active";
    const stateIcon = state === "Active" ? icon("check", 15) : icon("clock", 15);
    const last = rule.last_run;
    const open =
      this._syncWaiting(rule) + (counts.failed || 0) + (counts.needs_reconciliation || 0);
    const id = esc(rule.id);
    const write = (action, label, extra = "") =>
      `<button class="btn tiny ${extra}" data-action="${action}" data-value="${id}"${caps.write ? "" : ' aria-disabled="true"'}>${label}</button>`;
    const problems = [
      destination.available === false
        ? this.tp("syncErrorDestinationUnavailable", open, { destination: destName })
        : "",
      last?.outcome === "source_unavailable" ? this.t("syncErrorSourceUnavailable") : "",
    ].filter(Boolean);
    const actions = [
      !rule.activated && caps.admin
        ? `<button class="btn tiny primary" data-action="sync-setup-open" data-value="${id}">${icon("arrow", 14)} ${esc(this.t("syncFirstBatch"))}</button>`
        : "",
      rule.activated
        ? write("sync-run", `${icon("refresh", 14)} ${esc(this.t("syncRunNow"))}`)
        : "",
      rule.activated
        ? write(
            rule.paused ? "sync-resume" : "sync-pause",
            esc(this.t(rule.paused ? "syncResume" : "syncPause")),
          )
        : "",
      counts.failed > 0
        ? write("sync-retry", `${icon("refresh", 14)} ${esc(this.t("syncRetryFailed"))}`)
        : "",
      issues > 0 || this._syncWaiting(rule) > 0
        ? `<button class="btn tiny" data-action="sync-review" data-value="${id}">${esc(this.t("syncReview"))}</button>`
        : "",
      caps.admin
        ? `<button class="btn tiny" data-action="sync-setup-open" data-value="${id}">${icon("edit", 14)} ${esc(this.t("edit"))}</button>`
        : "",
      caps.admin
        ? `<button class="btn tiny" data-action="sync-delete" data-value="${id}">${esc(this.t("syncDelete"))}</button>`
        : "",
    ].join("");
    const confirm =
      sync.confirmDelete === rule.id
        ? `<div class="notice error" role="alert"><span>${esc(this.t("syncDeleteConfirm"))}</span><div class="form-actions"><button class="btn tiny" data-action="sync-delete-confirm" data-value="${id}">${esc(this.t("syncDelete"))}</button><button class="btn tiny" data-action="sync-delete-cancel">${esc(this.t("syncCancel"))}</button></div></div>`
        : "";
    return `<section class="editor-card sync-rule" aria-labelledby="sync-rule-${id}">
      <h3 id="sync-rule-${id}">${esc(rule.name)}</h3>
      <p class="sync-route">${esc(rule.source_list_name)} → ${esc(destName)}${destination.platform && this._syncDestinationLabel(destName, destination.platform) !== destName ? ` (${esc(this._syncPlatformLabel(destination.platform))})` : ""}</p>
      <p class="sync-mode">${esc(this.t(`syncMode${mode}`))}: ${esc(this.t(`syncMode${mode}Hint`))}</p>
      <p class="sync-state">${stateIcon} <strong>${esc(this.t(`syncState${state}`))}</strong> <span class="sync-count sync-muted">${esc(this._syncWaiting(rule) ? this.tp("syncPending", this._syncWaiting(rule)) : this.t("syncPendingNone"))}</span></p>
      <p class="sync-last">${last ? `${this._syncOutcomeIcon(last.outcome, counts)} ${esc(this.t("syncLastRun", { time: this._syncRelative(last.at), result: this._syncOutcomeText(last.outcome, counts) }))}` : esc(this.t("syncNeverRun"))}</p>
      ${problems.map((p) => `<p class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(p)}</span></p>`).join("")}
      ${counts.needs_reconciliation > 0 ? `<p class="notice" role="status">${icon("clock", 16)} <span>${esc(this.tp("syncReconcileHint", counts.needs_reconciliation))}</span></p>` : ""}
      ${issues > 0 ? `<p class="sync-issues">${icon("bolt", 15)} ${esc(this.t("syncBadgeIssues", { count: issues }))}</p>` : ""}
      ${confirm}
      <div class="form-actions sync-actions">${actions}</div></section>`;
  },

  _syncReviewHtml() {
    const sync = this._syncData();
    const caps = this._syncCaps();
    const review = sync.review || { records: [], loading: true };
    const problem = ["failed", "needs_reconciliation", "changed_after_send", "removed_after_send"];
    const waiting = ["pending", "sending"];
    const records = asArray(review.records);
    const group = (title, states) => {
      const rows = records.filter((r) => states.includes(r.state));
      if (!rows.length) return "";
      return `<section class="editor-card"><h3>${esc(title)}</h3><ul class="sync-list">${rows.map((r) => this._syncRecordHtml(r, review.ruleId, caps)).join("")}</ul></section>`;
    };
    const parts = [
      group(this.t("syncReviewProblems"), problem),
      group(this.t("syncOutboxTitle"), waiting),
    ].join("");
    return `<div class="modal-content sync-panel">${this._syncLead(this.t("syncReviewTitle"))}
      ${sync.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(sync.error)}</span></div>` : ""}
      ${!caps.write ? `<p class="notice sync-needs-write" role="note">${icon("leaf", 16)} ${esc(this.t(caps.readOnly ? "syncReadOnly" : "syncNeedsWrite"))}</p>` : ""}
      <div class="sync-live" role="status" aria-live="polite" aria-busy="${review.loading ? "true" : "false"}">${review.loading ? esc(this.t("loading")) : ""}</div>
      ${parts || (review.loading ? "" : `<section class="editor-card"><div class="notice">${icon("check", 16)} ${esc(this.t("syncReviewEmpty"))}</div></section>`)}
      <div class="form-actions"><button class="btn sync-back" data-action="sync-review-close">${icon("chevron", 14)} ${esc(this.t("syncReviewClose"))}</button></div></div>`;
  },
  _syncRecordHtml(record, ruleId, caps) {
    const resolvable = [
      "changed_after_send",
      "removed_after_send",
      "needs_reconciliation",
    ].includes(record.state);
    const key = esc(record.key);
    const error = record.last_error
      ? this.t(`syncLastError_${record.last_error}`) === `syncLastError_${record.last_error}`
        ? ""
        : this.t(`syncLastError_${record.last_error}`)
      : "";
    const button = (action, label) =>
      `<button class="btn tiny" data-action="${action}" data-value="${key}" data-rule="${esc(ruleId)}"${caps.write ? "" : ' aria-disabled="true"'}>${esc(label)}</button>`;
    return `<li class="sync-record"><div><strong>${esc(record.title)}</strong>${record.description ? ` <span class="sync-muted">${esc(record.description)}</span>` : ""}<br><span class="sync-record-state">${icon(["pending", "sending", "needs_reconciliation"].includes(record.state) ? "clock" : "bolt", 14)} ${esc(this.t(`syncRecordState_${record.state}`))}</span>${error ? ` <span class="sync-muted">${esc(error)}</span>` : ""}</div>${resolvable ? `<div class="sync-record-actions">${button("sync-dismiss", this.t("syncDismiss"))}${button("sync-resend", this.t("syncResend"))}</div>` : ""}</li>`;
  },

  _syncDraftRequest(draft) {
    const lists = asArray(this._data.shopping?.lists);
    const source = lists.find((l) => String(l.id) === draft.source_list_id);
    const destination = draft.destinations.find((e) => e.entity_id === draft.destination_entity_id);
    const name = String(draft.name || "").trim();
    return {
      name: (
        name || (destination ? `${source?.name || ""} → ${destination.name}` : source?.name || "")
      ).slice(0, 60),
      source_list_id: draft.source_list_id,
      destination_entity_id: draft.destination_entity_id,
      mode: draft.mode,
      triggers: { after_atelier_add: draft.after_atelier_add, watch: draft.watch },
      debounce_seconds: Number(draft.debounce_seconds),
      poll_interval_seconds: Number(draft.poll_minutes) * 60,
      duplicate_policy: draft.duplicate_policy,
    };
  },
  _syncDraftErrors(draft) {
    const errors = {};
    const whole = (value, min, max) =>
      /^\d+$/.test(String(value).trim()) && Number(value) >= min && Number(value) <= max;
    if (!whole(draft.debounce_seconds, 5, 600)) errors.debounce = { min: 5, max: 600 };
    if (!whole(draft.poll_minutes, 1, 60)) errors.poll = { min: 1, max: 60 };
    return errors;
  },
  async _syncSetupOpen(ruleId) {
    const sync = this._syncData();
    const rule = this._syncRules().find((r) => r.id === ruleId);
    const lists = asArray(this._data.shopping?.lists);
    const used = this._syncRules()
      .filter((r) => r.id !== ruleId)
      .map((r) => r.source_list_id);
    const free = lists.filter((l) => !used.includes(String(l.id)));
    sync.setup = {
      rule_id: rule?.id || "",
      expected_revision: rule?.revision,
      activated: rule?.activated === true,
      name: rule?.name || "",
      source_list_id: rule?.source_list_id || String(free[0]?.id || ""),
      destination_entity_id: rule?.destination_entity_id || "",
      mode: rule?.mode || "copy",
      after_atelier_add: rule ? rule.triggers?.after_atelier_add === true : true,
      watch: rule ? rule.triggers?.watch === true : false,
      debounce_seconds: rule?.debounce_seconds ?? 30,
      poll_minutes: Math.round((rule?.poll_interval_seconds ?? 120) / 60),
      duplicate_policy: rule?.duplicate_policy || "skip_exact",
      original: rule
        ? { source: rule.source_list_id, destination: rule.destination_entity_id }
        : null,
      resetConfirmed: false,
      free,
      destinations: [],
      destinationsLoaded: false,
      preview: null,
      previewBusy: false,
      previewSeq: 0,
      saving: false,
      error: "",
    };
    sync.error = "";
    this._modal = "sync-setup";
    this._render();
    try {
      const result = await this._ws("sync_destinations");
      if (sync.setup) sync.setup.destinations = asArray(result?.entities);
    } catch (err) {
      if (sync.setup) sync.setup.error = this._errorText(err);
    }
    if (sync.setup) sync.setup.destinationsLoaded = true;
    this._render();
  },
  _syncSetupHtml() {
    const d = this._syncData().setup;
    if (!d) return "";
    const lists = asArray(this._data.shopping?.lists);
    const sourceName = lists.find((l) => String(l.id) === d.source_list_id)?.name || "";
    const destination = d.destinations.find((e) => e.entity_id === d.destination_entity_id);
    const errors = this._syncDraftErrors(d);
    const changed =
      d.original &&
      (d.original.source !== d.source_list_id ||
        d.original.destination !== d.destination_entity_id);
    const ready = d.source_list_id && d.destination_entity_id && !Object.keys(errors).length;
    const blocked = !ready || (changed && !d.resetConfirmed) || d.saving;
    const lines = asArray(d.preview?.lines);
    const sendCount = lines.filter((l) => ["send", "merge"].includes(l.action)).length;
    const actionLabel = {
      send: "syncActionSend",
      skip_duplicate: "syncActionSkipDuplicate",
      merge: "syncActionMerge",
      skip_empty: "syncActionSkipEmpty",
    };
    const radio = (group, field, value, label, hint) =>
      `<label class="sync-radio-card"><input type="radio" name="sync-${group}" value="${value}" data-input="sync-${group}-${value}" ${d[field] === value ? "checked" : ""}><span><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
    const number = (field, key, labelKey, errorKey) =>
      `<label class="field"><span>${esc(this.t(labelKey))}</span><input type="text" inputmode="numeric" data-input="sync-${key}" value="${esc(d[field])}" ${errors[errorKey] ? `aria-invalid="true" aria-describedby="sync-${key}-error"` : ""}>${errors[errorKey] ? `<span id="sync-${key}-error" class="sync-field-error" role="alert">${esc(this.t("syncInvalidNumber", errors[errorKey]))}</span>` : ""}</label>`;
    const sourceOptions = d.free
      .map(
        (l) =>
          `<option value="${esc(l.id)}" ${String(l.id) === d.source_list_id ? "selected" : ""}>${esc(l.name)}</option>`,
      )
      .join("");
    const destinationOptions = d.destinations
      .map(
        (e) =>
          `<option value="${esc(e.entity_id)}" ${e.entity_id === d.destination_entity_id ? "selected" : ""}>${esc(this._syncDestinationLabel(e.name, e.platform))}</option>`,
      )
      .join("");
    const previewMarkup = d.previewBusy
      ? `<p>${esc(this.t("loading"))}</p>`
      : d.preview
        ? `${d.preview.sample?.title ? `<p class="sync-sample">${esc(this.t("syncPreviewSample", { title: d.preview.sample.title }))}</p>` : ""}${
            lines.length
              ? `<p>${esc(this.tp("syncPreviewTotal", d.preview.total_candidates ?? lines.length, { total: d.preview.total_candidates ?? lines.length, shown: lines.length }))}</p><ul class="sync-list">${lines.map((l) => `<li><strong>${esc(l.title)}</strong>${l.description ? ` <span class="sync-muted">${esc(l.description)}</span>` : ""}<br><span class="sync-record-state">${icon(l.action === "send" ? "arrow" : "clock", 14)} ${esc(this.t(actionLabel[l.action] || "syncActionSend"))}</span></li>`).join("")}</ul>`
              : `<div class="notice">${icon("check", 16)} ${esc(this.t("syncPreviewEmpty"))}</div>`
          }`
        : "";
    const confirmLabel = destination
      ? this.tp("syncConfirmSend", sendCount, {
          source: sourceName,
          destination: destination.name,
        })
      : this.t("syncConfirmSendNeutral");
    return `<div class="modal-content sync-panel atelier-editor">${this._syncLead(this.t(d.rule_id ? "syncEditRule" : "syncSetup"))}
      ${d.error ? `<div class="notice error" role="alert">${icon("bolt", 16)} <span>${esc(d.error)}</span></div>` : ""}
      <section class="editor-card"><div class="eyebrow">01 / ${esc(this.t("syncSource").toUpperCase())}</div>
        ${
          d.free.length
            ? `<label class="field"><span class="sync-sr">${esc(this.t("syncSource"))}</span><select data-input="sync-source" data-autofocus>${sourceOptions}</select></label>`
            : `<p class="notice" role="status">${icon("cart", 16)} ${esc(this.t(lists.length ? "errSyncSourceTaken" : "addListFirst"))}</p>`
        }
        <label class="field"><span>${esc(this.t("syncRuleName"))}</span><input data-input="sync-name" maxlength="60" value="${esc(d.name)}" placeholder="${esc(this._syncDraftRequest(d).name)}"></label></section>
      <section class="editor-card"><div class="eyebrow">02 / ${esc(this.t("syncDestination").toUpperCase())}</div>
        ${
          d.destinationsLoaded && !d.destinations.length
            ? `<p class="notice" role="status">${icon("leaf", 16)} ${esc(this.t("syncNoDestinations"))}</p>`
            : `<label class="field"><span class="sync-sr">${esc(this.t("syncDestination"))}</span><select data-input="sync-destination" ${d.destinationsLoaded ? "" : 'aria-busy="true"'}><option value="">${esc(this.t("selectList"))}</option>${destinationOptions}</select></label>`
        }
        <p class="sync-capability" role="status" aria-live="polite">${destination ? `${icon(destination.supports?.description ? "check" : "close", 15)} ${esc(this.t("syncSupportsNotes", { answer: this.t(destination.supports?.description ? "syncYes" : "syncNo") }))}` : ""}</p></section>
      <section class="editor-card"><div class="eyebrow">03 / ${esc(this.t("syncStepMode").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend class="sync-sr">${esc(this.t("syncStepMode"))}</legend>${radio("mode", "mode", "copy", this.t("syncModeCopy"), this.t("syncModeCopyHint"))}${radio("mode", "mode", "move", this.t("syncModeMove"), this.t("syncModeMoveHint"))}</fieldset></section>
      <section class="editor-card"><div class="eyebrow">04 / ${esc(this.t("syncStepWhen").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend class="sync-sr">${esc(this.t("syncStepWhen"))}</legend>
        <label class="editor-check"><input type="checkbox" data-input="sync-after-add" ${d.after_atelier_add ? "checked" : ""}> ${esc(this.t("syncTriggerAfterAdd"))}</label>
        <label class="editor-check"><input type="checkbox" data-input="sync-watch" ${d.watch ? "checked" : ""}> ${esc(this.t("syncTriggerWatch"))}</label>
        <p class="editor-sub">${esc(this.tp("syncTriggerWatchHint", Number(d.poll_minutes) || 2, { interval: Number(d.poll_minutes) || 2 }))}</p></fieldset>
        <div class="editor-columns">${number("debounce_seconds", "debounce", "syncDebounce", "debounce")}${number("poll_minutes", "poll", "syncPollMinutes", "poll")}</div></section>
      <section class="editor-card"><div class="eyebrow">05 / ${esc(this.t("syncDuplicates").toUpperCase())}</div>
        <fieldset class="sync-fieldset"><legend class="sync-sr">${esc(this.t("syncDuplicates"))}</legend>${radio("duplicates", "duplicate_policy", "skip_exact", this.t("syncDuplicateSkipExact"))}${radio("duplicates", "duplicate_policy", "skip_exact_merge_same_unit", this.t("syncDuplicateMerge"))}${radio("duplicates", "duplicate_policy", "none", this.t("syncDuplicateNone"))}</fieldset></section>
      <section class="editor-card"><div class="eyebrow">06 / ${esc(this.t("syncPreview").toUpperCase())}</div>
        <div class="form-actions"><button class="btn" data-action="sync-preview"${ready ? "" : " disabled"}>${icon("search", 14)} ${esc(this.t("syncPreviewRun"))}</button></div>
        <div class="sync-preview" role="status" aria-live="polite" aria-busy="${d.previewBusy ? "true" : "false"}">${previewMarkup}</div></section>
      <section class="editor-card"><div class="eyebrow">07 / ${esc(this.t("syncStepConfirm").toUpperCase())}</div>
        ${changed ? `<label class="editor-check"><input type="checkbox" data-input="sync-reset" ${d.resetConfirmed ? "checked" : ""}> ${esc(this.t("syncResetConfirm"))}</label>` : ""}
        <div class="form-actions">${
          d.activated
            ? `<button class="btn primary" data-action="sync-save" data-value="changes"${blocked ? " disabled" : ""}>${icon("check", 14)} ${esc(this.t("syncSaveChanges"))}</button>`
            : `<button class="btn primary" data-action="sync-save" data-value="send"${blocked || !d.preview ? " disabled" : ""}>${icon("arrow", 14)} ${esc(confirmLabel)}</button><button class="btn" data-action="sync-save" data-value="only"${blocked ? " disabled" : ""}>${esc(this.t("syncSaveOnly"))}</button>`
        }<button class="btn ghost" data-action="sync-setup-cancel">${esc(this.t("syncCancel"))}</button></div></section></div>`;
  },

  // Returns true when the click belonged to the sync workflow.
  async _syncHandleClick(el) {
    const action = el.dataset.action;
    const value = el.dataset.value || "";
    const sync = this._syncData();
    const caps = this._syncCaps();
    if (action === "sync-open") {
      if (!caps.supported && !caps.standalone) return true;
      sync.error = "";
      sync.result = "";
      this._modal = caps.supported ? "sync" : "sync-info";
      this._render();
      if (caps.supported) await this._syncLoad();
      return true;
    }
    if (action === "sync-setup-open") {
      if (caps.supported && caps.admin) await this._syncSetupOpen(value);
      return true;
    }
    if (action === "sync-setup-cancel") {
      sync.setup = null;
      this._modal = "sync";
      this._render();
      return true;
    }
    if (action === "sync-preview") {
      await this._syncPreview();
      return true;
    }
    if (action === "sync-save") {
      if (caps.admin) await this._syncSave(value);
      return true;
    }
    if (action === "sync-review-close") {
      sync.view = "status";
      sync.review = null;
      this._render();
      return true;
    }
    if (action === "sync-delete") {
      if (caps.admin) {
        sync.confirmDelete = value;
        this._render();
      }
      return true;
    }
    if (action === "sync-delete-cancel") {
      sync.confirmDelete = "";
      this._render();
      return true;
    }
    if (action === "sync-delete-confirm") {
      sync.confirmDelete = "";
      if (caps.admin)
        await this._syncCommand("sync_rule_delete", { rule_id: value }, { reload: true });
      return true;
    }
    if (action === "sync-review") {
      await this._syncReviewOpen(value);
      return true;
    }
    if (["sync-dismiss", "sync-resend"].includes(action)) {
      if (!caps.write) return true;
      await this._syncResolve(
        el.dataset.rule || "",
        value,
        action === "sync-dismiss" ? "dismiss" : "resend",
      );
      return true;
    }
    if (["sync-run", "sync-pause", "sync-resume", "sync-retry"].includes(action)) {
      if (!caps.write) return true;
      const command = action.replace("sync-", "sync_");
      await this._syncCommand(
        command,
        { rule_id: value },
        { reload: true, show: action === "sync-run" || action === "sync-retry" },
      );
      return true;
    }
    return false;
  },
  // One guarded Bridge call; failures surface as an alert, never as a success text.
  async _syncCommand(type, payload, { reload = false, show = false } = {}) {
    const sync = this._syncData();
    if (sync.busy) return null;
    sync.busy = true;
    sync.error = "";
    let result = null;
    try {
      result = await this._ws(type, payload);
      if (show) {
        sync.result = this._syncResultText(result);
        sync.resultIcon = result?.queued
          ? icon("clock", 15)
          : this._syncOutcomeIcon(result?.outcome, {
              needs_reconciliation: result?.needs_reconciliation,
            });
      } else sync.result = "";
    } catch (err) {
      sync.error = this._errorText(err);
      sync.result = "";
      this._syncRefetchStatus(err);
    }
    sync.busy = false;
    if (reload) {
      sync.loading = false;
      try {
        sync.state = await this._ws("sync_state");
        sync.raw = JSON.stringify(sync.state || {});
      } catch (err) {
        sync.error = sync.error || this._errorText(err);
      }
    }
    this._render();
    return result;
  },
  // After a permission error the cached grants are stale: ask for the status once.
  _syncRefetchStatus(err) {
    if (!["write_not_permitted", "unauthorized"].includes(err?.code)) return;
    this._ws("status")
      .then((status) => {
        this._status = status;
        this._render();
      })
      .catch(() => {});
  },
  async _syncReviewOpen(ruleId) {
    const sync = this._syncData();
    sync.view = "review";
    sync.error = "";
    sync.review = { ruleId, records: [], loading: true };
    this._render();
    try {
      const result = await this._ws("sync_records", {
        rule_id: ruleId,
        states: [
          "failed",
          "needs_reconciliation",
          "changed_after_send",
          "removed_after_send",
          "pending",
          "sending",
        ],
        limit: 200,
      });
      if (sync.review?.ruleId === ruleId)
        sync.review = { ruleId, records: asArray(result?.records), loading: false };
    } catch (err) {
      sync.error = this._errorText(err);
      if (sync.review) sync.review.loading = false;
    }
    this._render();
  },
  async _syncResolve(ruleId, recordKey, action) {
    const sync = this._syncData();
    if (!ruleId || sync.busy) return;
    sync.busy = true;
    sync.error = "";
    try {
      await this._ws("sync_resolve", { rule_id: ruleId, record_key: recordKey, action });
    } catch (err) {
      sync.error = this._errorText(err);
      this._syncRefetchStatus(err);
    }
    sync.busy = false;
    await this._syncReviewOpen(ruleId);
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
      this._render();
    } catch {
      /* The review list is already fresh; the next poll refreshes the status. */
    }
  },
  async _syncPreview() {
    const d = this._syncData().setup;
    if (!d || d.previewBusy) return;
    if (Object.keys(this._syncDraftErrors(d)).length) {
      this._render();
      return;
    }
    d.previewBusy = true;
    d.error = "";
    const seq = ++d.previewSeq;
    this._render();
    try {
      const preview = await this._ws("sync_preview", { rule: this._syncDraftRequest(d) });
      if (seq === d.previewSeq) d.preview = preview;
    } catch (err) {
      if (seq === d.previewSeq) d.error = this._errorText(err);
    }
    if (seq === d.previewSeq) d.previewBusy = false;
    this._render();
  },
  // Save the rule first; only the explicit "send" path asks the Bridge to send the first batch.
  async _syncSave(kind) {
    const sync = this._syncData();
    const d = sync.setup;
    if (!d || d.saving) return;
    const changed =
      d.original &&
      (d.original.source !== d.source_list_id ||
        d.original.destination !== d.destination_entity_id);
    if (Object.keys(this._syncDraftErrors(d)).length) {
      d.error = this.t("syncFixNumbers");
      this._render();
      return;
    }
    if (
      !d.source_list_id ||
      !d.destination_entity_id ||
      (changed && !d.resetConfirmed) ||
      (kind === "send" && !d.preview)
    )
      return;
    d.saving = true;
    d.error = "";
    this._render();
    let rule;
    try {
      const saved = await this._ws("sync_rule_save", {
        rule: this._syncDraftRequest(d),
        ...(d.rule_id ? { rule_id: d.rule_id, expected_revision: d.expected_revision } : {}),
        ...(changed ? { reset_records: true } : {}),
      });
      rule = saved?.rule;
    } catch (err) {
      d.saving = false;
      d.error = this._errorText(err);
      this._syncRefetchStatus(err);
      this._render();
      return;
    }
    sync.setup = null;
    sync.error = "";
    sync.result = "";
    if (this._modal === "sync-setup") this._modal = "sync";
    if (kind === "send" && rule?.id) {
      try {
        const result = await this._ws("sync_run", { rule_id: rule.id, confirm_first_batch: true });
        sync.result = this._syncResultText(result);
      } catch (err) {
        sync.error = this._errorText(err);
        this._syncRefetchStatus(err);
      }
    }
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
    } catch (err) {
      sync.error = sync.error || this._errorText(err);
    }
    this._render();
  },
  // Re-render so inline errors and disabled buttons follow the typing, then put the caret back.
  _syncRenderKeepFocus(el) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    this._render();
    const field = this.shadowRoot?.querySelector?.(`[data-input="${el.dataset?.input}"]`);
    if (field && typeof start === "number" && field.setSelectionRange) {
      try {
        field.setSelectionRange(start, end);
      } catch {
        /* Not a text-like field; focus alone is enough. */
      }
    }
  },
  // Returns true when the input belonged to the sync setup form.
  _syncHandleInput(el) {
    const type = el.dataset?.input || "";
    const d = this._syncData().setup;
    if (!type.startsWith("sync-") || !d) return false;
    const staleAndRender = () => {
      d.preview = null;
      d.previewSeq++;
      d.previewBusy = false;
      this._render();
    };
    if (type === "sync-source") {
      d.source_list_id = String(el.value);
      staleAndRender();
    } else if (type === "sync-destination") {
      d.destination_entity_id = String(el.value);
      staleAndRender();
    } else if (type.startsWith("sync-mode-")) {
      d.mode = el.value === "move" ? "move" : "copy";
      this._render();
    } else if (type.startsWith("sync-duplicates-")) {
      d.duplicate_policy = String(el.value);
      staleAndRender();
    } else if (type === "sync-after-add") {
      d.after_atelier_add = Boolean(el.checked);
    } else if (type === "sync-watch") {
      d.watch = Boolean(el.checked);
    } else if (type === "sync-reset") {
      d.resetConfirmed = Boolean(el.checked);
      this._render();
    } else if (type === "sync-name") {
      d.name = String(el.value).slice(0, 60);
    } else if (type === "sync-debounce") {
      d.debounce_seconds = String(el.value).trim();
      this._syncRenderKeepFocus(el);
    } else if (type === "sync-poll") {
      d.poll_minutes = String(el.value).trim();
      this._syncRenderKeepFocus(el);
    }
    return true;
  },
};
