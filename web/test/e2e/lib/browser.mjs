// Playwright helpers. The browser is always closed by the caller's `after` hook (finally semantics).
import { chromium } from "playwright";
import { ACCOUNTS, VIEWPORTS, basicHeader } from "./config.mjs";

export const launch = () => chromium.launch({ headless: true });

/** A signed-in browser context. `who` is a key of ACCOUNTS; `locale` is the browser language. */
export function openContext(
  browser,
  { who = "shared", locale = "de-DE", viewport = "desktop", ...rest } = {},
) {
  const account = ACCOUNTS[who];
  return browser.newContext({
    locale,
    viewport: VIEWPORTS[viewport],
    // Skips the card's slide and fade animations, so clicks never land on a moving element.
    reducedMotion: "reduce",
    ...(account
      ? { httpCredentials: { username: account.name, password: account.password, send: "always" } }
      : {}),
    ...rest,
  });
}

/**
 * The defined "ready" state of the card: two animation frames (so a click has been handled and its
 * request started), no bridge or image request in flight, and two more frames (so the response has
 * been rendered). The card replaces its whole subtree on every render, so a test must only type into
 * a form or click a control once the page is settled; filling earlier loses the value to a re-render.
 */
export async function settle(page) {
  const frames = () =>
    page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
  await frames();
  await page.waitForFunction(() => window.__atelierInflight === 0, null, { timeout: 20000 });
  await frames();
}

/**
 * Types into a search field whose query the card sends after a debounce, and waits for the answer to
 * that exact query. Without this, the late response re-renders the card and wipes whatever a test
 * typed into a dialog it opened in the meantime.
 */
export async function searchFor(page, locator, text) {
  const answered = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/bridge") &&
      (response.request().postData() || "").includes(`"${text}"`),
  );
  await locator.fill(text);
  await answered;
  await settle(page);
}

/** Opens the app and waits until the card has rendered its navigation and loaded its data. */
export async function openApp(context, url, { clock = false } = {}) {
  const page = await context.newPage();
  // A faked clock lets a test fast-forward kitchen timers instead of waiting minutes.
  if (clock) await page.clock.install();
  // Counts requests to the app's own API in flight, which is what settle() waits on.
  await page.addInitScript(() => {
    window.__atelierInflight = 0;
    const realFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const target = String(args[0]?.url || args[0]);
      if (!/\/api\//.test(target)) return realFetch(...args);
      window.__atelierInflight += 1;
      return realFetch(...args).finally(() => {
        window.__atelierInflight -= 1;
      });
    };
  });
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.problems = problems;
  await page.goto(url + "/");
  await page.locator('[data-action="nav"]').first().waitFor({ timeout: 20000 });
  // The shell calls setConfig after the first paint, which resets the view; the seeded recipe tiles
  // appear only once the app has booted and loaded its data.
  await page.locator(".recipe-tile").first().waitFor({ timeout: 20000 });
  await settle(page);
  return page;
}

export const nav = (page, label) => page.locator('[data-action="nav"]', { hasText: label }).first();

/** Switches the view: one click, then waits until its nav button is active and the page is settled. */
export async function gotoView(page, label) {
  await nav(page, label).click();
  await page.waitForFunction(
    (text) =>
      [
        ...document
          .querySelector("mealie-atelier-card")
          .shadowRoot.querySelectorAll('[data-action="nav"].active'),
      ].some((el) => el.textContent.trim() === text),
    label,
    { timeout: 10000 },
  );
  await settle(page);
}

/** Opens the editor of the named recipe (German UI, administrator) and waits until it is ready. */
export async function openRecipeEditor(context, url, name) {
  const page = await openApp(context, url);
  await gotoView(page, "Rezepte");
  await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
  await searchFor(page, page.locator('input[type="search"]'), name);
  await page.locator(".recipe-tile", { hasText: name }).first().click();
  await settle(page);
  await page.locator('[data-action="edit-form"]').click();
  await page.locator("h2", { hasText: "Rezept bearbeiten" }).waitFor();
  // The editor re-renders once the full recipe has loaded; only then does typing stick.
  await settle(page);
  return page;
}

export { basicHeader };

/** POST a bridge command with Basic credentials; returns { status, body, headers }. */
export async function bridge(url, account, message, headers = {}) {
  const response = await fetch(url + "/api/bridge", {
    method: "POST",
    headers: {
      authorization: basicHeader(account),
      "content-type": "application/json",
      "x-atelier-request": "1",
      ...headers,
    },
    body: JSON.stringify(message),
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

export const mutate = (url, account, action, payload, headers) =>
  bridge(url, account, { type: "mealie_atelier/mutate", action, payload }, headers);
export const command = (url, account, name, extra = {}, headers) =>
  bridge(url, account, { type: `mealie_atelier/${name}`, ...extra }, headers);

/** Ends the household's shared cooking session, so one test never opens another one's replace dialog. */
export async function endCookingSession(url, account) {
  const { body } = await command(url, account, "studio_state");
  const session = body?.family?.session;
  if (!session) return;
  await command(url, account, "studio_update", {
    action: "session_end",
    payload: { session_id: session.id },
  });
}
