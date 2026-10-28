/** Manage print settings and open user-configured print output. */
export const printActionMethods = {
  _openPrint(kind) {
    this._printKind = kind;
    this._modal = "print";
    this._render();
  },
  _print() {
    const kind = this._printKind;
    if (kind === "recipe" && !this._detail) return;
    const all = asArray(this._data.shopping?.lists);
    if (kind === "shopping" && !all.length) {
      this._error = this.t("addListFirst");
      this._render();
      return;
    }
    const popup = window.open("", "_blank");
    if (!popup) {
      this._error = this.t("uiAllowPopupsToOpenThePrintPreview");
      this._render();
      return;
    }
    const html = buildPrintDocument(kind, {
      recipe: this._detail,
      shopping: this._data.shopping,
      mealplan: this._data.mealplan,
      activeList: this._activeList || String(all[0]?.id || ""),
      weekStart: this._weekStart,
      locale: this._locale,
      settings: this._design,
      translate: (key, values) => this.t(key, values),
    });
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.document.getElementById("print-now")?.addEventListener("click", () => popup.print());
    popup.document.getElementById("close-print")?.addEventListener("click", () => popup.close());
    popup.focus();
  },
};
