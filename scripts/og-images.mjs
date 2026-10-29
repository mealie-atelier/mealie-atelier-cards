// Renders the 1200x630 Open Graph images at build time with a headless Chromium (DevTools protocol,
// no npm dependency). Finished images are cached by a hash of their HTML and inputs, so a rebuild
// without design changes does not start a browser.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const maxBytes = 300 * 1024;

export function findChrome() {
  const candidates = [process.env.CHROME_BIN];
  for (const dir of [
    join(process.env.HOME ?? "", "Library/Caches/ms-playwright"),
    join(process.env.HOME ?? "", ".cache/ms-playwright"),
  ]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir).sort().reverse()) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      for (const sub of readdirSync(join(dir, entry))) {
        candidates.push(join(dir, entry, sub, "chrome-headless-shell"));
      }
    }
  }
  return candidates.find((path) => path && existsSync(path));
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const baseCss = (fontUrl) => `
@font-face { font-family: "Bricolage"; src: url("${fontUrl}"); font-weight: 200 800; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; overflow: hidden; }
body { font-family: "Bricolage", "Helvetica Neue", Arial, sans-serif; position: relative; color: #f4efe3; }
.lockup { display: flex; align-items: center; gap: 16px; }
.lockup img { width: 64px; height: 64px; display: block; }
.lockup b { font-size: 34px; font-weight: 700; letter-spacing: -0.01em; }
`;

// job: { kind: "landing", locale, tagline, sub, chips, shots: [phoneA, phoneB], mark, font }
export function landingHtml(job) {
  return `<!doctype html><html lang="${job.locale}"><meta charset="utf-8"><style>${baseCss(job.font)}
body { background: #0c120f; }
.glow { position: absolute; inset: 0; background:
  radial-gradient(620px 520px at 88% 30%, rgba(143,201,166,.20), transparent 70%),
  radial-gradient(520px 420px at 4% 108%, rgba(184,83,46,.22), transparent 70%); }
.copy { position: absolute; left: 72px; top: 64px; width: 600px; height: 502px; display: flex; flex-direction: column; }
h1 { margin-top: 150px; font-size: 68px; line-height: 1.04; font-weight: 700; letter-spacing: -0.025em; color: #f7f1e4; }
h1 em { font-style: normal; color: #8fc9a6; }
.sub { margin-top: 22px; font-size: 27px; line-height: 1.35; color: #b7c4ba; font-weight: 400; max-width: 540px; text-wrap: balance; }
.chips { margin-top: auto; display: flex; gap: 10px; }
.chips span { font-size: 20px; font-weight: 600; padding: 9px 18px; border-radius: 999px; border: 1.5px solid rgba(143,201,166,.38); color: #cfe6d8; background: rgba(143,201,166,.08); }
.phone { position: absolute; width: 292px; border-radius: 34px; overflow: hidden; border: 2px solid rgba(255,255,255,.14);
  box-shadow: 0 40px 80px rgba(0,0,0,.6), 0 0 0 7px #1a231d, 0 0 0 8px rgba(255,255,255,.1); }
.phone img { display: block; width: 100%; height: auto; }
.a { left: 706px; top: 78px; transform: rotate(4deg); }
.b { left: 934px; top: 128px; transform: rotate(4deg); }
.lockup { position: absolute; left: 72px; top: 60px; gap: 20px; }
.lockup img { width: 92px; height: 92px; filter: drop-shadow(0 10px 24px rgba(0,0,0,.5)); }
.lockup b { font-size: 44px; }
</style><body><div class="glow"></div>
<div class="lockup"><img src="${job.mark}" alt=""><b>Mealie Atelier</b></div>
<div class="copy">
<h1>${job.tagline}</h1><p class="sub">${escapeHtml(job.sub)}</p>
<div class="chips">${job.chips.map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</div></div>
<div class="phone a"><img src="${job.shots[0]}" alt=""></div>
<div class="phone b"><img src="${job.shots[1]}" alt=""></div>
</body></html>`;
}

// job: { kind: "recipe", locale, title, kicker, photo, mark, font }
export function recipeHtml(job) {
  const size = job.title.length > 44 ? 62 : job.title.length > 30 ? 70 : 78;
  return `<!doctype html><html lang="${job.locale}"><meta charset="utf-8"><style>${baseCss(job.font)}
body { background: #14201a; }
.photo { position: absolute; inset: 0; background: url("${job.photo}") center / cover no-repeat; }
.scrim { position: absolute; inset: 0; background:
  linear-gradient(to top, rgba(10,16,12,.92) 0%, rgba(10,16,12,.74) 28%, rgba(10,16,12,0) 62%),
  linear-gradient(to bottom, rgba(10,16,12,.55) 0%, rgba(10,16,12,0) 26%); }
.lockup { position: absolute; left: 64px; top: 52px; text-shadow: 0 2px 14px rgba(0,0,0,.5); }
.lockup img { filter: drop-shadow(0 4px 12px rgba(0,0,0,.45)); }
.text { position: absolute; left: 64px; right: 120px; bottom: 58px; }
.kicker { display: inline-flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #f0c9a8; }
.kicker i { width: 12px; height: 12px; border-radius: 50%; background: #d9693e; display: block; }
h1 { margin-top: 16px; font-size: ${size}px; line-height: 1.05; font-weight: 700; letter-spacing: -0.025em; color: #fffaf0; text-shadow: 0 3px 24px rgba(0,0,0,.45); text-wrap: balance; }
</style><body><div class="photo"></div><div class="scrim"></div>
<div class="lockup"><img src="${job.mark}" alt=""><b>Mealie Atelier</b></div>
<div class="text"><span class="kicker"><i></i>${escapeHtml(job.kicker)}</span><h1>${escapeHtml(job.title)}</h1></div>
</body></html>`;
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.next = 1;
    this.pending = new Map();
    this.waiters = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        this.waiters = this.waiters.filter((waiter) => {
          if (waiter.method !== message.method || waiter.sessionId !== message.sessionId)
            return true;
          waiter.resolve(message.params);
          return false;
        });
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.next++;
    this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  once(method, sessionId) {
    return new Promise((resolve) => this.waiters.push({ method, sessionId, resolve }));
  }
}

async function launch(chrome) {
  const child = spawn(
    chrome,
    ["--headless", "--no-sandbox", "--hide-scrollbars", "--remote-debugging-port=0", "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const endpoint = await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(() => reject(new Error(`Chromium did not start: ${log}`)), 20000);
    child.stderr.on("data", (chunk) => {
      log += chunk;
      const match = /ws:\/\/\S+/.exec(log);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.on("error", reject);
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return { child, socket, cdp: new Cdp(socket) };
}

async function shoot(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  try {
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: OG_WIDTH, height: OG_HEIGHT, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );
    const loaded = cdp.once("Page.loadEventFired", sessionId);
    await cdp.send("Page.navigate", { url }, sessionId);
    await loaded;
    const ready = await cdp.send(
      "Runtime.evaluate",
      {
        awaitPromise: true,
        returnByValue: true,
        expression: `(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
          const bg = getComputedStyle(document.querySelector(".photo") || document.body).backgroundImage;
          if (bg.startsWith("url")) {
            const src = bg.slice(5, -2);
            const probe = new Image();
            probe.src = src;
            await probe.decode();
          }
          return document.fonts.check('700 40px "Bricolage"');
        })()`,
      },
      sessionId,
    );
    if (ready.result?.value !== true) throw new Error(`OG template font did not load: ${url}`);
    const shot = await cdp.send(
      "Page.captureScreenshot",
      { format: "jpeg", quality: 84, optimizeForSpeed: false },
      sessionId,
    );
    return Buffer.from(shot.data, "base64");
  } finally {
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

// jobs: [{ output, html, inputs: [absolute file paths that feed the html] }]
// `fileUrl` maps an absolute path to the URL the template uses, so templates stay path agnostic.
export async function renderOgImages(jobs, cacheDir) {
  await mkdir(cacheDir, { recursive: true });
  const missing = [];
  const results = new Map();
  for (const job of jobs) {
    const hash = createHash("sha256").update(job.html);
    for (const input of job.inputs) hash.update(await readFile(input));
    const key = hash.digest("hex").slice(0, 24);
    const cached = join(cacheDir, `${key}.jpg`);
    job.cached = cached;
    if (existsSync(cached)) results.set(job.output, await readFile(cached));
    else missing.push(job);
  }
  if (missing.length > 0) {
    const chrome = findChrome();
    if (!chrome) {
      throw new Error(
        `Chromium is needed to render ${missing.length} Open Graph image(s). Set CHROME_BIN or install the Playwright Chromium headless shell.`,
      );
    }
    const { child, socket, cdp } = await launch(chrome);
    try {
      for (const job of missing) {
        const page = join(cacheDir, `${job.cached.split("/").pop()}.html`);
        await writeFile(page, job.html);
        const bytes = await shoot(cdp, `file://${page}`);
        if (bytes.length > maxBytes) {
          throw new Error(
            `${job.output} is ${bytes.length} bytes, over the ${maxBytes} byte budget`,
          );
        }
        await writeFile(job.cached, bytes);
        results.set(job.output, bytes);
      }
    } finally {
      socket.close();
      child.kill();
    }
  }
  return results;
}
