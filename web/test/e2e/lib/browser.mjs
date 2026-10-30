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

/** Opens the app and waits until the card has rendered its navigation. */
export async function openApp(context, url, { clock = false } = {}) {
  const page = await context.newPage();
  // A faked clock lets a test fast-forward kitchen timers instead of waiting minutes.
  if (clock) await page.clock.install();
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
  return page;
}

export const nav = (page, label) => page.locator('[data-action="nav"]', { hasText: label }).first();

/** Switches the view and waits until its nav button is the active one (a re-render can eat a click). */
export async function gotoView(page, label) {
  const button = nav(page, label);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await button.click();
    try {
      await page.waitForFunction(
        (text) =>
          [
            ...document
              .querySelector("mealie-atelier-card")
              .shadowRoot.querySelectorAll('[data-action="nav"].active'),
          ].some((el) => el.textContent.trim() === text),
        label,
        { timeout: 2500 },
      );
      return;
    } catch {}
  }
  throw new Error(`could not switch to the view "${label}"`);
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
