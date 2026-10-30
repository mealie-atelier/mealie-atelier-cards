import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const locale = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));
const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("setConfig rejects an unknown mode, theme and non-positive columns with a clear message", () => {
  const card = makeCard(loadCards());
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", mode: "bogus" }),
    /Invalid option mode: 'bogus'\. Allowed: dashboard, .*recipes/,
  );
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", theme: "purple" }),
    /Invalid option theme: 'purple'\. Allowed: auto, light, dark/,
  );
  for (const columns of [-3, 0, 1.5, "abc"])
    assert.throws(
      () => card.setConfig({ type: "custom:mealie-atelier-card", columns }),
      /Invalid option columns/,
    );
  card.setConfig({
    type: "custom:mealie-atelier-card",
    mode: "recipes",
    theme: "dark",
    columns: 4,
  });
  assert.equal(card._view, "recipes");
});

const journalCard = (entry) => {
  const card = makeCard(loadCards());
  card._data = { recipes: [] };
  card._journal = { soup: entry };
  card._detail = { slug: "soup", name: "Soup", recipeInstructions: [{ text: "Stir" }] };
  card._modal = "recipe";
  return card;
};

test("the recipe dialog shows the saved rating and favorite mark, not only the note", () => {
  const card = journalCard({ note: "", rating: 4, favorite: true });
  const html = card._modalHtml();
  assert.match(html, /class="journal-rating"[^>]*>★★★★ 4\/5/);
  assert.match(html, /class="journal-favorite">Favorite recipe/);
  const plain = journalCard({ note: "", rating: 0, favorite: false });
  assert.doesNotMatch(plain._modalHtml(), /journal-hint/);
  for (const lang of ["de", "en"]) assert.ok(locale(lang).journalFavoriteChip);
});

test("every cooking tool button carries an icon", () => {
  const line = source("studio-ui.js")
    .split("\n")
    .find((l) => l.includes('class="studio-cook-tools"'));
  const buttons = [
    ...line.matchAll(/<button class="btn" data-action="studio-[^"]+">([^<]*(?:<[^b][^>]*>)?)/g),
  ];
  assert.ok(buttons.length >= 3);
  for (const [, inner] of buttons) assert.match(inner, /^\$\{icon\(/);
});

test("the closed version history toggle differs from the section heading", () => {
  assert.match(source("components/recipe-editor.js"), /"editorHistoryHide" : "editorHistoryShow"/);
  for (const lang of ["de", "en"]) {
    const l = locale(lang);
    assert.ok(l.editorHistoryShow);
    assert.notEqual(l.editorHistoryShow, l.editorHistory);
  }
});

test("an invalid timer duration is explained inside the cooking dialog", async () => {
  const card = makeCard(loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } }));
  card._render = () => {};
  card._flash = () => {};
  const input = {
    value: "0",
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    removeAttribute(k) {
      delete this.attrs[k];
    },
    focus() {},
  };
  card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
  const button = { dataset: { action: "timer-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._timerError, "Enter a whole number of minutes from 1 to 180.");
  card._detail = { slug: "soup", name: "Soup", recipeInstructions: [{ text: "Stir" }] };
  card._modal = "cook";
  const html = card._modalHtml();
  assert.match(
    html,
    /<p class="cook-timer-error" role="alert" id="cook-timer-err">Enter a whole number/,
  );
  assert.match(
    html,
    /data-timer-minutes[^>]*aria-invalid="true" aria-describedby="cook-timer-err"/,
  );
  card._clearTimerError();
  assert.equal(card._timerError, "");
});

test("the web app system check does not list a Bridge", async () => {
  const asked = [];
  const run = async (host) => {
    const card = makeCard(loadCards(), {
      hass: {
        language: "en",
        atelierOfflineHost: host,
        callWS: async () => ({}),
      },
    });
    card._render = () => {};
    card._flash = () => {};
    card._ws = async (type) => {
      asked.push(type);
      return {};
    };
    await card._studioDiagnostics();
    return card._diagnostics.map((r) => r.name);
  };
  const web = await run(true);
  assert.ok(!web.some((name) => /Bridge/.test(name)));
  assert.equal(web[0], "Mealie connection");
  assert.equal((await run(false))[0], "Mealie Atelier Bridge");
});

test("a failed load does not claim there is no shopping list or nothing planned", () => {
  const card = makeCard(loadCards());
  card._weekStart = new Date(2030, 0, 1);
  card._data = {
    recipes: { total: 0, items: [] },
    mealplan: [],
    shopping: { items: [], lists: [] },
  };
  assert.match(card._week(), /day-empty/);
  assert.match(card._shopping(), /Create your first shopping list/);
  assert.match(card._today(), /class="notice"/);
  card._failedParts = new Set(["mealplan", "shopping"]);
  card._loadFailed = true;
  assert.doesNotMatch(card._week(), /day-empty|Nothing planned/);
  assert.doesNotMatch(card._shopping(), /Create your first shopping list|class="notice"/);
  assert.doesNotMatch(card._today(), /Nothing planned|class="notice"/);
});

function findChrome() {
  const candidates = [process.env.CHROME_BIN];
  for (const dir of [".cache/ms-playwright", "Library/Caches/ms-playwright"]) {
    const root = join(process.env.HOME ?? "", dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root).sort().reverse()) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      for (const sub of readdirSync(join(root, entry)))
        candidates.push(join(root, entry, sub, "chrome-headless-shell"));
    }
  }
  return candidates.find((path) => path && existsSync(path));
}

test("the tablet week strip keeps long meal names whole instead of splitting words", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const bundle = new URL("../dist/mealie-atelier-cards.js", import.meta.url).pathname;
  const dir = mkdtempSync(join(tmpdir(), "atelier-week-"));
  try {
    writeFileSync(
      join(dir, "h.html"),
      `<!doctype html><meta charset="utf-8"><body style="margin:0"><pre id="out">pending</pre><script src="file://${bundle}"></script><script>
(async () => {
  const card = document.createElement("mealie-atelier-card");
  card.setConfig({ type: "custom:mealie-atelier-card" });
  document.body.append(card);
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  card._hass = { language: "de", callWS: async () => ({}) };
  const day = (n) => { const d = new Date(card._weekStart); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  card._data = { recipes: { total: 1, items: [] }, shopping: { items: [], lists: [] },
    mealplan: ["Hähnchensalat mit Parmesan", "Kartoffelsuppe", "Pfannkuchen"].map((title, i) => ({ id: "m" + i, date: day(i), entryType: "dinner", title })) };
  card._render();
  await new Promise((r) => setTimeout(r, 1000));
  const words = [];
  for (const el of card.shadowRoot.querySelectorAll(".day-meal-name")) {
    const range = document.createRange();
    const node = el.firstChild;
    let line = "", top = null;
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const y = Math.round(range.getBoundingClientRect().top);
      if (top !== null && y !== top && /\\S/.test(node.data[i - 1] || "") && /\\S/.test(node.data[i])) words.push(node.data);
      top = y;
    }
  }
  document.getElementById("out").textContent = JSON.stringify(words);
})();
</script>`,
    );
    const dom = execFileSync(
      chrome,
      [
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--virtual-time-budget=8000",
        "--window-size=820,1180",
        "--dump-dom",
        `file://${join(dir, "h.html")}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000 },
    );
    const out = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replaceAll("&quot;", '"');
    assert.deepEqual(JSON.parse(out), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
