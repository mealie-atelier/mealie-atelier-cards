/** Bring! connection of the web app: guided dialog, account card and the one-step sign-in again. */
const BW_STEPS = ["Login", "Bring", "Mealie", "Preview", "Release"];
export const bringWizardMethods = {
  // Only an administrator may connect, and never while the app is read-only.
  _bwCanConnect() {
    const caps = this._syncCaps();
    return caps.bringSetup && caps.admin && !caps.readOnly;
  },
  _bwData() {
    return this._syncData().wizard;
  },
  // `rule` opens the wizard on the list step to give an existing rule another Bring! list.
  _bwOpen({ rule = null } = {}) {
    const sync = this._syncData();
    const caps = this._syncCaps();
    if (!caps.bringSetup) return;
    if (!this._bwCanConnect()) {
      this._modal = "sync-info";
      this._render();
      return;
    }
    const connected = caps.bringState === "connected";
    sync.error = "";
    sync.bring.error = "";
    sync.bring.confirm = false;
    sync.wizard = {
      step: connected ? 2 : 1,
      fixRule: rule
        ? {
            id: rule.id,
            name: rule.name,
            revision: rule.revision,
            activated: rule.activated === true,
          }
        : null,
      lists: [],
      listsState: "idle",
      listsError: "",
      bringList: "",
      mealieList: "",
      free: [],
      more: false,
      mode: "copy",
      afterAdd: true,
      skipDuplicates: true,
      merge: false,
      debounce: "30",
      debounceError: false,
      preview: null,
      previewBusy: false,
      previewError: "",
      previewSeq: 0,
      saving: false,
      error: "",
      ruleId: "",
      done: null,
    };
    this._bwPickMealie();
    this._modal = "sync-wizard";
    this._render();
    if (connected) this._bwLoadLists();
  },
  // The deleted Bring! list is replaced in place: the rule, its triggers and its history stay.
  _bwPickList(ruleId) {
    const rule = this._syncRules().find((r) => r.id === ruleId);
    if (!rule || !this._bwCanConnect() || this._syncCaps().bringState !== "connected") return;
    this._bwOpen({ rule });
  },
  async _bwSaveList() {
    const sync = this._syncData();
    const w = sync.wizard;
    const fix = w?.fixRule;
    const rule = this._syncRules().find((r) => r.id === fix?.id);
    if (!fix || !rule || !w.bringList || w.saving) return;
    w.saving = true;
    w.error = "";
    this._render();
    try {
      const toName = this._bwBringName(w);
      const draft = this._syncDraftRequest({
        // The old name points at the deleted list, so the route is named again.
        name: `${rule.source_list_name || ""} → ${toName}`.slice(0, 60),
        source_list_id: rule.source_list_id,
        destination_entity_id: w.bringList,
        destinations: w.lists,
        mode: rule.mode,
        after_atelier_add: rule.triggers?.after_atelier_add === true,
        watch: rule.triggers?.watch === true,
        debounce_seconds: rule.debounce_seconds ?? 30,
        poll_minutes: Math.round((rule.poll_interval_seconds ?? 120) / 60),
        duplicate_policy: rule.duplicate_policy || "skip_exact",
      });
      await this._ws("sync_rule_save", {
        rule: draft,
        rule_id: rule.id,
        expected_revision: rule.revision,
        reset_records: true,
        keep_activated: rule.activated === true,
      });
      // A rule the user released before sends right away; one that never was waits for its release.
      let result = null;
      let runError = null;
      if (rule.activated) {
        try {
          result = await this._ws("sync_run", { rule_id: rule.id });
        } catch (err) {
          runError = err;
        }
      }
      // The rule is saved either way, so the dialog closes; a failed run is told on the status screen.
      sync.error = runError ? this._errorText(runError) : "";
      sync.result = "";
      sync.wizard = null;
      this._modal = "sync";
      if (runError) this._syncRefetchStatus(runError);
      else if (!rule.activated) this._flash(this.t("bwPickHeld", { list: toName }));
      else if (this._syncResultNotable(result)) this._syncShowResult(result);
      else this._flash(this.t("bwPickSaved", { list: toName }));
    } catch (err) {
      w.error = this._errorText(err);
      this._syncRefetchStatus(err);
      w.saving = false;
      this._render();
      return;
    }
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
    } catch (err) {
      sync.error = this._errorText(err);
    }
    this._render();
  },
  // The Mealie list shown in the app is the natural first choice; lists that already have a rule are taken.
  _bwPickMealie() {
    const w = this._bwData();
    const used = this._syncRules().map((rule) => rule.source_list_id);
    w.free = asArray(this._data.shopping?.lists).filter((l) => !used.includes(String(l.id)));
    const active = w.free.find((l) => String(l.id) === String(this._activeList));
    w.mealieList = String((active || w.free[0])?.id || "");
  },
  async _bwLoadLists() {
    const w = this._bwData();
    if (!w || w.listsState === "loading") return;
    w.listsState = "loading";
    w.listsError = "";
    this._render();
    try {
      const result = await this._ws("sync_destinations");
      if (this._bwData() !== w) return;
      w.lists = asArray(result?.entities).filter((e) => e.platform === "bring");
      const usual = this._syncCaps().bringDefault;
      w.bringList = (w.lists.find((e) => e.entity_id === usual) || w.lists[0])?.entity_id || "";
      w.listsState = "ready";
    } catch (err) {
      if (this._bwData() !== w) return;
      w.listsState = "error";
      w.listsError = this._errorText(err);
      this._syncRefetchStatus(err);
    }
    this._render();
    this._bwFocus();
  },
  // Moves focus to the new step so keyboard and screen reader users start at its heading.
  _bwFocus() {
    this._focusAfterRender(
      () =>
        this.shadowRoot?.querySelector?.(".bw-panel [data-autofocus]") ||
        this.shadowRoot?.querySelector?.(".bw-panel [data-bw-heading]"),
    );
  },
  _bwGo(step) {
    const w = this._bwData();
    if (!w) return;
    w.step = step;
    w.error = "";
    this._render();
    this._bwFocus();
    if (step === 2 && w.listsState === "idle") this._bwLoadLists();
    if (step === 4) this._bwPreview();
  },
  _bwStepName(index) {
    return this.t(`bwStep${BW_STEPS[index]}`);
  },
  _bwDraft() {
    const w = this._bwData();
    return {
      name: "",
      source_list_id: w.mealieList,
      destination_entity_id: w.bringList,
      destinations: w.lists,
      mode: w.mode,
      after_atelier_add: w.afterAdd,
      watch: false,
      debounce_seconds: w.debounce,
      poll_minutes: 2,
      duplicate_policy: !w.skipDuplicates
        ? "none"
        : w.merge
          ? "skip_exact_merge_same_unit"
          : "skip_exact",
    };
  },
  _bwBringName(w = this._bwData()) {
    const list = w.lists.find((e) => e.entity_id === w.bringList);
    return list ? this._syncDestinationName(list.name, list.platform) : "";
  },
  _bwMealieName(w = this._bwData()) {
    return w.free.find((l) => String(l.id) === w.mealieList)?.name || "";
  },
  async _bwPreview() {
    const w = this._bwData();
    if (!w) return;
    const seq = ++w.previewSeq;
    w.previewBusy = true;
    w.previewError = "";
    w.preview = null;
    this._render();
    try {
      const preview = await this._ws("sync_preview", {
        rule: this._syncDraftRequest(this._bwDraft()),
      });
      if (seq === w.previewSeq) w.preview = preview;
    } catch (err) {
      if (seq === w.previewSeq) w.previewError = this._errorText(err);
    }
    if (seq === w.previewSeq) {
      w.previewBusy = false;
      this._render();
    }
  },
  _bwSendCount() {
    const w = this._bwData();
    return asArray(w?.preview?.lines).filter((l) => ["send", "merge"].includes(l.action)).length;
  },
  async _bwFinish(kind) {
    const sync = this._syncData();
    const w = sync.wizard;
    if (!w || w.saving) return;
    w.saving = true;
    w.error = "";
    this._render();
    try {
      if (!w.ruleId) {
        const saved = await this._ws("sync_rule_save", {
          rule: this._syncDraftRequest(this._bwDraft()),
        });
        w.ruleId = saved?.rule?.id || "";
      }
      if (kind === "send" && w.ruleId) {
        const result = await this._ws("sync_run", {
          rule_id: w.ruleId,
          confirm_first_batch: true,
        });
        const good =
          ["sent", "nothing_to_send"].includes(result?.outcome) || result?.queued === true;
        w.done = {
          ok: good && !(result?.needs_reconciliation > 0),
          sent: result?.sent ?? 0,
          text: this._syncResultText(result),
          icon: this._syncResultIcon(result),
        };
      } else w.done = { ok: true, text: "", icon: icon("check", 15), savedOnly: true };
    } catch (err) {
      w.error = this._errorText(err);
      this._syncRefetchStatus(err);
    }
    try {
      sync.state = await this._ws("sync_state");
      sync.raw = JSON.stringify(sync.state || {});
    } catch {
      /* The next poll refreshes the status. */
    }
    w.saving = false;
    this._render();
    this._bwFocus();
  },
  _bwOpenStatus() {
    const sync = this._syncData();
    const done = sync.wizard?.done;
    // A clean delivery needs no line; the rule card shows it. Problems stay visible.
    sync.result = done && !done.ok ? done.text : "";
    sync.resultIcon = done?.icon || "";
    sync.resultQuiet = false;
    sync.error = "";
    sync.wizard = null;
    this._modal = "sync";
    this._render();
  },

  // ---- markup -------------------------------------------------------------------------------
  _bwProgressHtml(w) {
    const total = BW_STEPS.length;
    const current = w.done ? total : w.step;
    const items = BW_STEPS.map((_, index) => {
      const number = index + 1;
      const state =
        number < current || (w.done && number === total)
          ? "done"
          : number === current
            ? "current"
            : "todo";
      return `<li class="bw-step is-${state}"${state === "current" ? ' aria-current="step"' : ""}><span class="bw-dot" aria-hidden="true">${state === "done" ? icon("check", 13) : number}</span><span class="bw-step-name">${esc(this._bwStepName(index))}</span></li>`;
    }).join("");
    // The done screen has its own heading, so the stepline would only say "all set" twice.
    const line = w.done
      ? ""
      : `<p class="bw-stepline" role="status" aria-live="polite">${esc(this.t("bwStepOf", { step: current, total, name: this._bwStepName(current - 1) }))}</p>`;
    return `<nav class="bw-progress" aria-label="${esc(this.t("bwProgress"))}"><ol class="bw-steps">${items}</ol>${line}</nav>`;
  },
  _bwHeading(title, text) {
    return `<header class="bw-head"><h3 class="bw-title" tabindex="-1" data-bw-heading>${esc(title)}</h3>${text ? `<p class="bw-text">${esc(text)}</p>` : ""}</header>`;
  },
  _bwError(text, retryAction = "") {
    if (!text) return "";
    return `<div class="notice error bw-error" role="alert">${icon("bolt", 16)} <span>${esc(text)}</span>${retryAction ? `<button type="button" class="btn tiny" data-action="${retryAction}">${icon("refresh", 14)} ${esc(this.t("bwRetry"))}</button>` : ""}</div>`;
  },
  // Banner above the sign-in form. A passing Bring! problem offers a retry that keeps the password.
  _bwLoginErrorHtml() {
    const bring = this._syncData().bring;
    if (!bring.error) return "";
    const retry =
      bring.errorKind === "transient" && bring.password
        ? `<button type="button" class="btn tiny" data-action="sync-bw-login-retry"${bring.busy ? " disabled" : ""}>${icon("refresh", 14)} ${esc(this.t("bwRetry"))}</button>`
        : "";
    return `<div id="bw-login-error" class="notice error bw-error" role="alert">${icon("bolt", 16)} <span>${esc(bring.error)}</span>${retry}</div>`;
  },
  // `other` keeps Back in the footer on the list step: it returns to the sign-in for another account.
  _bwNav({ back, other = false, next, nextLabel, nextDisabled = false, nextIcon = "arrow" }) {
    const first = back
      ? `<button type="button" class="btn ghost" data-action="sync-bw-back">${icon("chevron", 14)} ${esc(this.t("bwBack"))}</button>`
      : other
        ? `<button type="button" class="btn ghost" data-action="sync-bw-back">${icon("chevron", 14)} ${esc(this.t("bwOtherAccount"))}</button>`
        : `<button type="button" class="btn ghost" data-action="close-modal">${esc(this.t("syncCancel"))}</button>`;
    return `<div class="form-actions bw-nav">${first}${next ? `<button type="button" class="btn primary" data-action="${next}"${nextDisabled ? " disabled" : ""}>${esc(nextLabel || this.t("bwNext"))} ${icon(nextIcon, 14)}</button>` : ""}</div>`;
  },
  // E-mail and password form: the wizard's first step and the one-step sign-in again.
  _bwLoginFormHtml({ again = false } = {}) {
    const bring = this._syncData().bring;
    const busy = bring.busy;
    const eye = icon(bring.reveal ? "eye-off" : "eye", 16);
    // The address is known after a lapse, so signing in again is just the password and Enter.
    const email = bring.email || (again ? this._syncCaps().bringEmail : "");
    // Signing in again keeps the account: the address is shown, not editable.
    const locked = again && Boolean(email);
    // Only a refused e-mail or password marks the fields; a Bring! outage is the banner's business.
    const invalid = bring.error && bring.errorKind === "credentials" ? ' aria-invalid="true"' : "";
    const described = bring.error ? ' aria-describedby="bw-login-error"' : "";
    return `<form class="bw-form" data-form="bring-login" novalidate>
      <label class="field"><span>${esc(this.t("syncBringEmail"))}</span><input type="email" name="username" data-input="sync-bring-email" value="${esc(email)}" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" required${email ? "" : " data-autofocus"}${busy || locked ? " readonly" : ""}${invalid}${described}></label>
      <label class="field"><span>${esc(this.t("syncBringPassword"))}</span><span class="bw-password"><input type="${bring.reveal ? "text" : "password"}" name="password" data-input="sync-bring-password" value="${esc(bring.password)}" autocomplete="current-password" autocapitalize="none" spellcheck="false" maxlength="256" required${email ? " data-autofocus" : ""}${busy ? " readonly" : ""}${invalid}${described}><button type="button" class="icon-btn bw-reveal" data-action="sync-bw-reveal" aria-pressed="${bring.reveal ? "true" : "false"}" title="${esc(this.t(bring.reveal ? "bwHidePassword" : "bwShowPassword"))}" aria-label="${esc(this.t(bring.reveal ? "bwHidePassword" : "bwShowPassword"))}">${eye}</button></span></label>
      <p class="bw-privacy">${icon("leaf", 15)} <span>${esc(this.t("bwPrivacy"))}</span></p>
      <div class="form-actions bw-nav">${again ? "" : `<button type="button" class="btn ghost" data-action="close-modal">${esc(this.t("syncCancel"))}</button>`}<button type="submit" class="btn primary"${busy ? ' disabled aria-busy="true"' : ""}>${busy ? esc(this.t("bwSigningIn")) : `${esc(this.t(again ? "bwReauthButton" : "bwSignIn"))} ${icon("arrow", 14)}`}</button></div></form>`;
  },
  _bwStepLoginHtml() {
    const bring = this._syncData().bring;
    return `${this._bwHeading(this.t("bwLoginTitle"), this.t("bwLoginText"))}${this._bwLoginErrorHtml()}${this._bwLoginFormHtml()}`;
  },
  _bwRadio(name, value, checked, label, hint, badge = "") {
    return `<label class="sync-radio-card bw-choice"><input type="radio" name="bw-${name}" value="${esc(value)}" data-input="sync-bw-${name}" ${checked ? "checked" : ""}><span><strong>${esc(label)}</strong>${badge ? `<span class="bw-badge">${esc(badge)}</span>` : ""}${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
  },
  _bwStepBringHtml(w) {
    const account = this._syncCaps().bringAccount;
    let body;
    if (w.listsState === "loading" || w.listsState === "idle")
      body = `<div class="notice bw-loading" role="status" aria-busy="true"><span class="bw-spinner" aria-hidden="true"></span> ${esc(this.t("bwListsLoading"))}</div>`;
    else if (w.listsState === "error") body = this._bwError(w.listsError, "sync-bw-reload");
    else if (!w.lists.length)
      body = `<div class="notice" role="status">${icon("cart", 16)} <span>${esc(this.t("bwNoBringLists"))}</span><button type="button" class="btn tiny" data-action="sync-bw-reload">${icon("refresh", 14)} ${esc(this.t("bwRetry"))}</button></div>`;
    else {
      const usual = this._syncCaps().bringDefault;
      body = `<fieldset class="sync-fieldset bw-choices"><legend class="sync-sr">${esc(this.t("bwBringTitle"))}</legend>${w.lists.map((e) => this._bwRadio("bring", e.entity_id, e.entity_id === w.bringList, this._syncDestinationName(e.name, e.platform), "", e.entity_id === usual ? this.t("bwUsualList") : "")).join("")}</fieldset>`;
    }
    const ready = w.listsState === "ready" && w.bringList;
    const fix = w.fixRule;
    const heading = fix
      ? this._bwHeading(
          this.t("bwPickTitle"),
          this.t(fix.activated ? "bwPickText" : "bwPickTextHeld", { rule: fix.name }),
        )
      : this._bwHeading(this.t("bwBringTitle"), this.t("bwBringText"));
    return `${heading}${account && !fix ? `<p class="bw-account-line">${icon("check", 15)} ${esc(this.t("bwConnectedAs", { account }))}</p>` : ""}${body}${fix && w.error ? this._bwError(w.error) : ""}${this._bwNav({ next: fix ? "sync-bw-save-list" : "sync-bw-next", nextLabel: fix ? this.t(fix.activated ? "bwPickSaveSend" : "bwPickSave") : "", nextIcon: fix ? "check" : "arrow", nextDisabled: !ready || w.saving, back: false, other: !fix })}`;
  },
  _bwStepMealieHtml(w) {
    const entry = this._syncEntry();
    let body;
    if (!w.free.length) {
      const any = asArray(this._data.shopping?.lists).length;
      const unreachable = entry.connected === false;
      body = `<div class="notice ${unreachable ? "error" : ""}" role="${unreachable ? "alert" : "status"}">${icon(unreachable ? "bolt" : "cart", 16)} <span>${esc(this.t(unreachable ? "errMealieError" : any ? "bwMealieTaken" : "bwMealieNone"))}</span></div>`;
    } else if (w.free.length <= 5)
      body = `<fieldset class="sync-fieldset bw-choices"><legend class="sync-sr">${esc(this.t("bwSourceLabel"))}</legend>${w.free.map((l) => this._bwRadio("mealie", String(l.id), String(l.id) === w.mealieList, l.name, "")).join("")}</fieldset>`;
    else
      body = `<label class="field"><span>${esc(this.t("bwSourceLabel"))}</span><select data-input="sync-bw-mealie-select">${w.free.map((l) => `<option value="${esc(l.id)}" ${String(l.id) === w.mealieList ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>`;
    const check = (key, checked, label, hint = "") =>
      `<label class="editor-check bw-check"><input type="checkbox" data-input="sync-bw-${key}" ${checked ? "checked" : ""}><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
    const more = `<div class="bw-more"><button type="button" class="bw-more-toggle" data-action="sync-bw-more" aria-expanded="${w.more ? "true" : "false"}" aria-controls="bw-more-panel">${esc(this.t("bwMore"))} <span class="bw-chevron" aria-hidden="true">${icon("chevron", 14)}</span></button>${
      w.more
        ? `<div id="bw-more-panel" class="bw-more-panel"><fieldset class="sync-fieldset"><legend>${esc(this.t("syncStepMode"))}</legend>${this._bwRadio("mode", "copy", w.mode === "copy", this.t("syncModeCopy"), this.t("syncModeCopyHint"))}${this._bwRadio("mode", "move", w.mode === "move", this.t("syncModeMove"), this._syncBringT("syncModeMoveHint"))}</fieldset>${w.skipDuplicates ? check("merge", w.merge, this.t("syncDuplicateMerge")) : ""}<label class="field"><span>${esc(this.t("syncDebounce"))}</span><input type="text" inputmode="numeric" data-input="sync-bw-debounce" value="${esc(w.debounce)}"${w.debounceError ? ` aria-invalid="true" aria-describedby="bw-debounce-error"` : ""}>${w.debounceError ? `<span id="bw-debounce-error" class="sync-field-error" role="alert">${esc(this.t("syncInvalidNumber", { min: 5, max: 600 }))}</span>` : ""}</label></div>`
        : ""
    }</div>`;
    return `${this._bwHeading(this.t("bwMealieTitle"), this.t("bwMealieText"))}${body}${w.free.length ? `<div class="bw-defaults">${check("after-add", w.afterAdd, this.t("bwAfterAdd"), this.t("bwAfterAddHint"))}${check("skip-duplicates", w.skipDuplicates, this.t("bwSkipDuplicates"), this.t("bwSkipDuplicatesHint"))}</div>${more}` : ""}${this._bwNav({ back: true, next: "sync-bw-next", nextDisabled: !w.mealieList })}`;
  },
  _bwStepPreviewHtml(w) {
    const lines = asArray(w.preview?.lines);
    const actionLabel = {
      send: "syncActionSend",
      skip_duplicate: "syncActionSkipDuplicate",
      merge: "syncActionMerge",
      skip_empty: "syncActionSkipEmpty",
    };
    let body = "";
    if (w.previewBusy)
      body = `<div class="notice bw-loading" role="status" aria-busy="true"><span class="bw-spinner" aria-hidden="true"></span> ${esc(this.t("bwPreviewLoading"))}</div>`;
    else if (w.previewError) body = this._bwError(w.previewError, "sync-bw-preview");
    else if (w.preview && !lines.length)
      body = `<div class="notice" role="status">${icon("check", 16)} <span>${esc(this.t("bwPreviewEmpty", { list: this._bwMealieName(w) }))}</span></div>`;
    else if (w.preview) {
      const send = this._bwSendCount();
      const total = w.preview.total_candidates ?? lines.length;
      const skip = lines.length - send;
      const note = [
        skip > 0 ? this.tp("bwPreviewSummary", skip) : "",
        total > lines.length ? this.t("bwPreviewMore", { shown: lines.length, total }) : "",
      ]
        .filter(Boolean)
        .join(" ");
      // Only rows that differ from the rest carry a badge: "Senden" on every row says nothing.
      body = `${note ? `<p class="bw-summary" role="status">${esc(note)}</p>` : ""}<ul class="sync-list bw-lines">${lines.map((l) => this._bwLineHtml(l, actionLabel)).join("")}</ul>`;
    }
    const ready = w.preview && !w.previewBusy && !w.previewError;
    const list = this._bwBringName(w);
    const count = this._bwSendCount();
    const text =
      w.preview && !w.previewBusy && !w.previewError
        ? count
          ? this.tp("bwPreviewText", count, { list })
          : this.t("bwPreviewTextNone", { list })
        : this.t("bwPreviewTextBase", { list });
    return `${this._bwHeading(this.t("bwPreviewTitle"), text)}${body}${this._bwNav({ back: true, next: "sync-bw-next", nextDisabled: !ready })}`;
  },
  // Bring! titles read "Milch (2)" or "Mehl (500 g)": an amount above one reads "2 × Milch", a lone one is dropped.
  _bwLineParts(line) {
    const match = /^(.*?) \((.+)\)$/.exec(String(line.title || ""));
    const name = match ? match[1] : String(line.title || "");
    const detail = match ? match[2] : "";
    const amount = /^\d+(?:[.,]\d+)?$/.test(detail) ? Number(detail.replace(",", ".")) : null;
    if (amount === null)
      return { name, note: [detail, line.description].filter(Boolean).join(", ") };
    return { name: amount > 1 ? `${detail} × ${name}` : name, note: line.description || "" };
  },
  _bwLineHtml(line, actionLabel) {
    const { name, note } = this._bwLineParts(line);
    const state =
      line.action === "send"
        ? ""
        : `<span class="bw-line-state">${icon("clock", 13)} ${esc(this.t(actionLabel[line.action] || "syncActionSend"))}</span>`;
    return `<li class="bw-line is-${esc(line.action)}"><span class="bw-line-main"><strong>${esc(name)}</strong>${note ? ` <span class="sync-muted">${esc(note)}</span>` : ""}</span>${state}</li>`;
  },
  _bwStepReleaseHtml(w) {
    const count = this._bwSendCount();
    const row = (label, value) =>
      `<div class="bw-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
    const duplicates = !w.skipDuplicates
      ? this.t("syncDuplicateNone")
      : w.merge
        ? this.t("syncDuplicateMerge")
        : this.t("syncDuplicateSkipExact");
    const sendLabel = count ? this.tp("bwSend", count, { count }) : this.t("bwFinish");
    const again = w.ruleId && w.error;
    return `${this._bwHeading(this.t("bwReleaseTitle"), this.t(count ? "bwReleaseText" : "bwReleaseNone"))}
      <dl class="bw-facts">${row(this.t("bwFactRoute"), `${this._bwMealieName(w)} → ${this._bwBringName(w)}`)}${row(this.t("bwFactMode"), this.t(w.mode === "move" ? "syncModeMove" : "syncModeCopy"))}${row(this.t("bwFactAuto"), this.t(w.afterAdd ? "bwAutoOn" : "bwAutoOff"))}${row(this.t("syncDuplicates"), duplicates)}</dl>
      ${w.error ? this._bwError(`${w.error}${w.ruleId ? ` ${this.t("bwSavedNotSent")}` : ""}`) : ""}
      <div class="form-actions bw-nav"><button type="button" class="btn ghost" data-action="sync-bw-back"${w.saving ? " disabled" : ""}>${icon("chevron", 14)} ${esc(this.t("bwBack"))}</button>${count && !w.ruleId ? `<button type="button" class="btn" data-action="sync-bw-save"${w.saving ? " disabled" : ""}>${esc(this.t("bwSaveOnly"))}</button>` : ""}<button type="button" class="btn primary" data-action="sync-bw-send"${w.saving ? ' disabled aria-busy="true"' : ""}>${w.saving ? esc(this.t("bwSending")) : `${icon("check", 14)} ${esc(again ? this.t("bwSendAgain") : sendLabel)}`}</button></div>`;
  },
  _bwStepDoneHtml(w) {
    const done = w.done;
    const title = done.ok ? this.t("bwDoneTitle") : this.t("bwDoneAttention");
    const list = this._bwBringName(w);
    const text = !done.ok
      ? this.t("bwDoneAttentionText")
      : done.sent > 0
        ? this.tp("bwDoneText", done.sent, { list })
        : this.t(w.afterAdd && !done.savedOnly ? "bwDoneAuto" : "bwDoneSaved", { list });
    return `<div class="bw-done ${done.ok ? "is-ok" : "is-warn"}"><span class="bw-done-icon" aria-hidden="true">${icon(done.ok ? "check" : "bolt", 28)}</span>${this._bwHeading(title, text)}${done.text && !done.ok ? `<p class="sync-result" role="status">${done.icon || ""} ${esc(done.text)}</p>` : ""}</div>
      <div class="form-actions bw-nav"><button type="button" class="btn ghost" data-action="close-modal">${esc(this.t("close"))}</button><button type="button" class="btn primary" data-action="sync-bw-status">${icon("cart", 14)} ${esc(this.t("bwOpenSync"))}</button></div>`;
  },
  _bwHtml() {
    const w = this._bwData();
    if (!w) return "";
    const body = w.done
      ? this._bwStepDoneHtml(w)
      : [
          null,
          this._bwStepLoginHtml(),
          this._bwStepBringHtml(w),
          this._bwStepMealieHtml(w),
          this._bwStepPreviewHtml(w),
          this._bwStepReleaseHtml(w),
        ][w.step];
    const fix = Boolean(w.fixRule) && !w.done;
    return `<div class="modal-content sync-panel bw-wizard">${this._syncLead(this.t(fix ? "syncTitle" : "bwTitle"))}${fix ? "" : this._bwProgressHtml(w)}<section class="editor-card bw-panel" aria-busy="${w.saving || w.previewBusy || this._syncData().bring.busy ? "true" : "false"}">${body}</section></div>`;
  },

  // ---- account card (connected state and sign in again) -------------------------------------
  _bwAccountHtml(caps) {
    if (!caps.bringSetup) return "";
    const sync = this._syncData();
    const bring = sync.bring;
    const connected = caps.bringState === "connected";
    const reauth = caps.bringState === "reauth";
    if (!connected && !reauth) return "";
    const editable = this._bwCanConnect();
    const rules = this._syncRules();
    // Only a run that went well counts as a delivery; a failed run must not say "just now".
    // A later failed run does not undo an earlier delivery, so the history counts as well.
    const healthy = ["sent", "nothing_to_send", "reconciled"];
    const lastRun = [
      ...rules
        .filter((rule) => healthy.includes(rule.last_run?.outcome))
        .map((rule) => rule.last_run),
      ...asArray(sync.state?.audit).filter((entry) => healthy.includes(entry.outcome)),
    ]
      .map((entry) => entry.at)
      .filter(Boolean)
      .sort()
      .at(-1);
    // The account is only "connected" while nothing it delivers to is broken.
    const listGone = rules.some((rule) => this._syncBringGone(rule, caps));
    const attention =
      connected &&
      (listGone || rules.some((rule) => rule.last_run && !healthy.includes(rule.last_run.outcome)));
    const stateKey = reauth
      ? "bwStateReauth"
      : listGone
        ? "bwStateListGone"
        : attention
          ? "bwStateAttention"
          : "bwStateConnected";
    // The list and what waits are on the rule card; the account only says who and when. The sign-in
    // form shows the address itself while signing in again.
    const facts = reauth
      ? []
      : [
          caps.bringAccount ? [this.t("bwFactAccount"), caps.bringAccount] : null,
          rules.length
            ? [this.t("bwFactLast"), lastRun ? this._syncRelative(lastRun) : this.t("bwNoDelivery")]
            : null,
        ].filter(Boolean);
    const list = facts.length
      ? `<dl class="bw-facts">${facts.map(([label, value]) => `<div class="bw-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`
      : "";
    let action = "";
    if (reauth && editable)
      action = `<p class="bw-text">${esc(this.t("bwReauthText"))}</p>${this._bwLoginErrorHtml()}${this._bwLoginFormHtml({ again: true })}`;
    else if (!editable)
      action = `<p class="sync-muted" role="note">${esc(this.t(caps.readOnly ? "syncReadOnly" : "syncBringAdminOnly"))}</p>`;
    else if (bring.confirm)
      action = `<div class="notice bw-confirm" role="alert"><span>${esc(this.t("syncBringDisconnectConfirm"))}</span></div><div class="form-actions bw-nav"><button class="btn ghost" data-action="sync-bring-disconnect-cancel">${esc(this.t("syncCancel"))}</button><button class="btn danger" data-action="sync-bring-disconnect"${bring.busy ? " disabled" : ""}>${esc(this.t("syncBringDisconnectYes"))}</button></div>`;
    else
      action = `${bring.error ? `<div class="notice error bw-error" role="alert">${icon("bolt", 16)} <span>${esc(bring.error)}</span></div>` : ""}<div class="form-actions"><button class="btn" data-action="sync-bring-disconnect-ask">${esc(this.t("syncBringDisconnect"))}</button></div>`;
    const warn = reauth || attention;
    return `<section class="editor-card bw-account is-${warn ? "warn" : "ok"}" aria-labelledby="bw-account-title"><div class="bw-account-head"><h3 id="bw-account-title">${esc(this.t("syncBringTitle"))}</h3><span class="bw-pill">${icon(warn ? "bolt" : "check", 13)} ${esc(this.t(stateKey))}</span></div>${list}${action}</section>`;
  },

  // ---- events -------------------------------------------------------------------------------
  async _bwClick(el) {
    const action = el.dataset.action;
    const w = this._bwData();
    if (action === "sync-bw-open") {
      this._bwOpen();
      return true;
    }
    if (action === "sync-bw-reveal") {
      const bring = this._syncData().bring;
      bring.reveal = !bring.reveal;
      this._render();
      return true;
    }
    if (action === "sync-bw-login-retry") {
      await this._syncBringConnect();
      return true;
    }
    if (action === "sync-bw-pick-list") {
      this._bwPickList(el.dataset.value || "");
      return true;
    }
    if (!w || this._modal !== "sync-wizard") return true;
    if (action === "sync-bw-save-list") await this._bwSaveList();
    else if (action === "sync-bw-back") {
      if (!w.saving && w.step > 2) this._bwGo(w.step - 1);
      else if (!w.saving && w.step === 2 && !w.fixRule) this._bwGo(1);
    } else if (action === "sync-bw-next") {
      if (w.step === 2 && w.bringList) this._bwGo(3);
      else if (w.step === 3) {
        if (!/^\d+$/.test(w.debounce) || w.debounce < 5 || w.debounce > 600) {
          w.debounceError = true;
          w.more = true;
          this._render();
        } else if (w.mealieList) {
          w.debounceError = false;
          this._bwGo(4);
        }
      } else if (w.step === 4 && w.preview && !w.previewBusy && !w.previewError) this._bwGo(5);
    } else if (action === "sync-bw-more") {
      w.more = !w.more;
      this._render();
      // The panel opens below the fold of a short dialog: bring it into view and start at its first control.
      if (w.more)
        this._focusAfterRender(() => {
          const panel = this.shadowRoot?.querySelector?.("#bw-more-panel");
          panel?.scrollIntoView?.({ block: "nearest" });
          return panel?.querySelector("input");
        });
    } else if (action === "sync-bw-reload") {
      w.listsState = "idle";
      await this._bwLoadLists();
    } else if (action === "sync-bw-preview") await this._bwPreview();
    else if (action === "sync-bw-send") await this._bwFinish("send");
    else if (action === "sync-bw-save") await this._bwFinish("save");
    else if (action === "sync-bw-status") this._bwOpenStatus();
    return true;
  },
  // Returns true when the input belonged to the Bring! wizard.
  _bwHandleInput(el) {
    const type = el.dataset?.input || "";
    if (!type.startsWith("sync-bw-")) return false;
    const w = this._bwData();
    if (!w) return true;
    if (type === "sync-bw-bring") w.bringList = String(el.value);
    else if (type === "sync-bw-mealie" || type === "sync-bw-mealie-select")
      w.mealieList = String(el.value);
    else if (type === "sync-bw-mode") w.mode = el.value === "move" ? "move" : "copy";
    else if (type === "sync-bw-after-add") w.afterAdd = Boolean(el.checked);
    else if (type === "sync-bw-skip-duplicates") {
      w.skipDuplicates = Boolean(el.checked);
      this._render();
    } else if (type === "sync-bw-merge") w.merge = Boolean(el.checked);
    else if (type === "sync-bw-debounce") {
      w.debounce = String(el.value).trim();
      w.debounceError = false;
    }
    return true;
  },
};
