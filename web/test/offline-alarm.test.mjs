import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  randomUUID,
  createECDH,
  createHmac,
  createDecipheriv,
  createPublicKey,
  verify,
} from "node:crypto";
import { OfflineLedger } from "../offline-ledger.mjs";
import { AlarmStore } from "../alarm-store.mjs";
import {
  encryptPush,
  vapidAuth,
  vapidPublicPrivate,
  safePushEndpoint,
  validateSubscription,
} from "../web-push.mjs";
import { sendHomeAssistantAlarm, createDelivery } from "../alarm-delivery.mjs";
const temp = async (fn) => {
  const dir = await mkdtemp(join(tmpdir(), "atelier-v094-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
const operation = (action, payload) => ({ id: randomUUID(), action, payload });

test("offline toggle: durable idempotence, safe replay after restart and no double mutation", () =>
  temp(async (dir) => {
    let checked = false,
      writes = 0;
    const make = () =>
      new OfflineLedger({
        dir,
        readItem: async () => ({ id: "one", checked }),
        mutate: async (_, payload) => {
          writes++;
          checked = payload.checked;
          return { checked };
        },
      });
    const op = operation("shopping_toggle", {
      item_id: "one",
      expected_checked: false,
      checked: true,
    });
    const first = await make().process(op);
    assert.equal(first.ok, true);
    assert.equal(checked, true);
    const replay = await make().process(op);
    assert.equal(replay.replayed, true);
    assert.equal(writes, 1);
  }));
test("two devices: conflict is visible; last writer does not silently overwrite newer state", () =>
  temp(async (dir) => {
    let checked = false,
      writes = 0;
    const ledger = new OfflineLedger({
      dir,
      readItem: async () => ({ checked }),
      mutate: async (_, p) => {
        writes++;
        checked = p.checked;
      },
    });
    const a = operation("shopping_toggle", {
      item_id: "one",
      expected_checked: false,
      checked: true,
    });
    await ledger.process(a);
    checked = false; // another device or Mealie changed it again
    const b = operation("shopping_toggle", {
      item_id: "one",
      expected_checked: true,
      checked: true,
    });
    await assert.rejects(ledger.process(b), { status: 409 });
    assert.equal(writes, 1);
  }));
test("offline add: duplicate requests handled idempotently; uncertain upstream cannot be blindly replayed", () =>
  temp(async (dir) => {
    let additions = 0;
    const op = operation("shopping_add", { list_id: "list-a", note: "Milch" });
    const ledger = new OfflineLedger({
      dir,
      readItem: async () => ({}),
      mutate: async () => {
        additions++;
        return { id: "new" };
      },
    });
    await ledger.process(op);
    await ledger.process(op);
    assert.equal(additions, 1);
    const uncertainOp = operation("shopping_add", { list_id: "list-a", note: "Brot" });
    const errorLedger = new OfflineLedger({
      dir,
      readItem: async () => ({}),
      mutate: async () => {
        additions++;
        throw Error("network lost");
      },
    });
    await assert.rejects(errorLedger.process(uncertainOp), /network lost/);
    await assert.rejects(errorLedger.process(uncertainOp), { status: 409 });
    assert.equal(additions, 2);
  }));
test("read-only ledger and wrong payloads fail closed", () =>
  temp(async (dir) => {
    const ledger = new OfflineLedger({
      dir,
      readOnly: true,
      readItem: async () => ({ checked: false }),
      mutate: async () => {
        throw Error("must not mutate");
      },
    });
    await assert.rejects(
      ledger.process(
        operation("shopping_toggle", { item_id: "one", expected_checked: false, checked: true }),
      ),
      { status: 403 },
    );
    await assert.rejects(
      ledger.process(operation("shopping_add", { list_id: "bad/path", note: "x" })),
      { status: 400 },
    );
  }));
test("alarm is durable after browser closes, restarts and dispatches only once", () =>
  temp(async (dir) => {
    let now = 10_000_000,
      deliveries = 0;
    const make = () =>
      new AlarmStore({
        dir,
        clock: () => now,
        deliver: async () => {
          deliveries++;
          return { accepted: true, channels: [{ channel: "webpush", accepted: true }] };
        },
      });
    const a = make(),
      id = randomUUID();
    await a.create({ id, label: "Noodles", deadline: now + 60_000, locale: "en" });
    assert.equal((await a.list()).alarms[0].locale, "en");
    now += 30_000;
    await a.tick();
    assert.equal(deliveries, 0);
    const b = make();
    now += 31_000;
    await b.tick();
    await b.tick();
    assert.equal(deliveries, 1);
    assert.equal((await b.list()).alarms[0].status, "sent");
    assert.equal((await b.cancel(id)).status, "sent", "cancelling a dispatched timer succeeds");
    await assert.rejects(b.cancel(randomUUID()), { status: 404, atelierCode: "timer_not_found" });
  }));
test("offline companion UI uses shared locale resources for all visible shell copy", () => {
  const source = readFileSync(new URL("../public/offline-client.js", import.meta.url), "utf8");
  const start = source.indexOf("export function attachOfflineUi");
  const ui = source.slice(start);
  const locales = ["de", "en"].map((locale) =>
    JSON.parse(readFileSync(new URL(`../../src/i18n/${locale}.json`, import.meta.url), "utf8")),
  );
  assert.match(ui, /const t = \(key, values\) => card\?\.t\?\./);
  for (const key of [
    "offlinePanelLabel",
    "offlineSyncTimers",
    "offlineShopping",
    "offlineStorageNote",
    "offlineEnable",
    "offlineBackgroundTimers",
    "offlineEnableConfirmTitle",
    "offlineDeleteConfirmTitle",
    "offlineNoAlarmChannel",
  ])
    assert.match(
      ui,
      new RegExp(`t\\([\"']${key}[\"']`),
      `${key} must use the shared locale resolver`,
    );
  for (const key of [
    "offlineNoSnapshot",
    "offlineNotEnabled",
    "offlineListNeedsRefresh",
    "offlineRequiresConnection",
    "offlineItemNotEditable",
    "offlineInvalidItem",
    "offlinePushKeysMissing",
    "offlinePushRequiresHttps",
    "offlinePushPermissionDenied",
    "offlineAlarmRequiresServer",
    "offlineUnexpectedError",
  ])
    for (const resource of locales) assert.ok(key in resource, `${key} must be translated`);
  assert.doesNotMatch(
    ui,
    /Synchronisierung &amp; Küchentimer|Offline-Einkauf ist ausgeschaltet|Hintergrund-Timer/,
  );
  assert.match(source, /offlineError\("offlineNoSnapshot"\)/);
  assert.match(source, /localizedError\(e\)/);
  assert.match(
    source,
    /localizedError\(\{ code: offline\.lastError \}\)/,
    "server error codes such as mealie_error must not render as raw keys",
  );
  assert.doesNotMatch(source, /t\(offline\.lastError\)/);
  assert.doesNotMatch(
    source,
    /Noch keine Offline-Kopie|Einkaufsliste muss zuerst online geladen werden|Benachrichtigungen wurden nicht erlaubt/,
  );
});
test("alarm retry on delivery failure and cancellation before deadline", () =>
  temp(async (dir) => {
    let now = 20_000_000,
      fail = true,
      calls = 0;
    const store = new AlarmStore({
      dir,
      clock: () => now,
      deliver: async () => {
        calls++;
        return fail
          ? { accepted: false, channels: [], error: "unavailable" }
          : { accepted: true, channels: [{ channel: "ha" }] };
      },
    });
    const id = randomUUID();
    await store.create({ id, label: "Brot", deadline: now + 1000 });
    now += 2000;
    await store.tick();
    assert.equal((await store.list()).alarms[0].status, "retry");
    fail = false;
    now += 5000;
    await store.tick();
    assert.equal(calls, 2);
    assert.equal((await store.list()).alarms[0].status, "sent");
    const other = randomUUID();
    await store.create({ id: other, label: "Ofen", deadline: now + 2000 });
    await store.cancel(other);
    now += 3000;
    await store.tick();
    assert.equal(calls, 2);
  }));
test("timers belong to their owner: list and cancel are limited to owner and admins", () =>
  temp(async (dir) => {
    const now = 30_000_000;
    const store = new AlarmStore({ dir, clock: () => now, deliver: async () => ({}) });
    const mine = randomUUID(),
      theirs = randomUUID();
    await store.create({ id: mine, label: "Mine", deadline: now + 60_000 }, "rea");
    await store.create({ id: theirs, label: "Theirs", deadline: now + 60_000 }, "ada");
    const reader = { name: "rea", admin: false },
      admin = { name: "ada", admin: true };
    assert.deepEqual(
      (await store.list(reader)).alarms.map((a) => a.id),
      [mine],
    );
    assert.equal((await store.list(admin)).alarms.length, 2);
    await assert.rejects(store.cancel(theirs, reader), {
      status: 403,
      atelierCode: "timer_not_permitted",
    });
    assert.equal((await store.cancel(mine, reader)).status, "cancelled");
    assert.equal((await store.cancel(theirs, admin)).status, "cancelled");
  }));
test("Web Push encryption decrypts under RFC8291 and VAPID JWT verifies under RFC8292", () => {
  const receiver = createECDH("prime256v1");
  receiver.generateKeys();
  const auth = Buffer.alloc(16, 7),
    subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/local-fixture",
      keys: {
        p256dh: receiver.getPublicKey().toString("base64url"),
        auth: auth.toString("base64url"),
      },
    };
  const payload = { title: "Timer", body: "Fertig", id: "fixture" };
  const sender = createECDH("prime256v1");
  sender.generateKeys();
  const salt = Buffer.alloc(16, 1);
  const encrypted = encryptPush(subscription, payload, {
    salt,
    privateKey: sender.getPrivateKey(),
  });
  assert.equal(encrypted.readUInt32BE(16), 4096);
  assert.equal(encrypted[20], 65);
  const senderPub = encrypted.subarray(21, 86);
  const shared = receiver.computeSecret(senderPub);
  const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    receiver.getPublicKey(),
    senderPub,
  ]);
  const ikm = hmac(hmac(auth, shared), Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const expand = (s, n) => hmac(prk, Buffer.from(s + "\0\x01")).subarray(0, n);
  const data = encrypted.subarray(86),
    decipher = createDecipheriv(
      "aes-128-gcm",
      expand("Content-Encoding: aes128gcm", 16),
      expand("Content-Encoding: nonce", 12),
    );
  decipher.setAuthTag(data.subarray(data.length - 16));
  const plaintext = Buffer.concat([decipher.update(data.subarray(0, -16)), decipher.final()]);
  assert.equal(plaintext.at(-1), 2);
  assert.deepEqual(JSON.parse(plaintext.subarray(0, -1)), payload);
  const vapidPair = createECDH("prime256v1");
  vapidPair.generateKeys();
  const config = vapidPublicPrivate({
    ATELIER_VAPID_PUBLIC_KEY: vapidPair.getPublicKey().toString("base64url"),
    ATELIER_VAPID_PRIVATE_KEY: vapidPair.getPrivateKey().toString("base64url"),
    ATELIER_VAPID_SUBJECT: "mailto:dev@example.net",
  });
  const header = vapidAuth(subscription.endpoint, config),
    token = header.match(/t=([^,]+),/)[1],
    parts = token.split(".");
  assert.equal(JSON.parse(Buffer.from(parts[1], "base64url")).aud, "https://fcm.googleapis.com");
  const pub = createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: config.publicKey.subarray(1, 33).toString("base64url"),
      y: config.publicKey.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  assert.equal(
    verify(
      "sha256",
      Buffer.from(parts[0] + "." + parts[1]),
      { key: pub, dsaEncoding: "ieee-p1363" },
      Buffer.from(parts[2], "base64url"),
    ),
    true,
  );
  assert.throws(() => safePushEndpoint("https://127.0.0.1/notify"), { status: 400 });
  assert.deepEqual(validateSubscription(subscription), subscription);
});
test("Home Assistant notify endpoint uses bearer auth and expected service", async () => {
  let captured;
  const r = await sendHomeAssistantAlarm(
    { id: randomUUID(), label: "Cake", locale: "en" },
    { url: "http://127.0.0.1:8123", token: "fake-token", service: "notify.mobile_app_test" },
    {
      fetchImpl: async (url, opts) => {
        captured = { url, opts };
        return { ok: true, status: 200 };
      },
    },
  );
  assert.equal(r.accepted, true);
  assert.equal(captured.url, "http://127.0.0.1:8123/api/services/notify/mobile_app_test");
  assert.equal(captured.opts.headers.Authorization, "Bearer fake-token");
  assert.match(captured.opts.body, /Cake is ready!/);
  const englishMessage = JSON.parse(captured.opts.body);
  assert.match(englishMessage.title, /Kitchen timer/);
});

test("shell CSS and service worker cache are in the offline allowlist", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../public/shell.css", import.meta.url), "utf8");
  const installCss = await readFile(new URL("../public/pwa-install.css", import.meta.url), "utf8");
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(css, /\.a-connectivity-details/);
  assert.match(css, /\.a-connectivity-group/);
  assert.match(css, /a-summary:focus-visible/);
  assert.match(installCss, /pwa-install-dialog/);
  assert.match(html, /href="\/shell\.css(?:\?[^\"]*)?"/);
  assert.match(html, /href="\/pwa-install\.css(?:\?[^\"]*)?"/);
  assert.match(sw, /\/shell\.css/);
  assert.match(sw, /\/pwa-install\.css/);
  assert.match(sw, /\/pwa-install\.js/);
  assert.doesNotMatch(html, /Catch cooking timer clicks before the old browser-only timer handler/);
});

test("timer limits count only active timers and cap each account at 20", () =>
  temp(async (dir) => {
    const now = 10_000_000;
    const store = new AlarmStore({ dir, clock: () => now, deliver: async () => ({}) });
    const timer = (owner) =>
      store.create({ id: randomUUID(), label: "Tea", deadline: now + 60_000 }, owner);
    for (let i = 0; i < 20; i++) await timer("ada");
    await assert.rejects(timer("ada"), { status: 429 }, "the 21st active timer of one account");
    await timer("wim");
    const repeat = randomUUID();
    await store.create({ id: repeat, label: "Tea", deadline: now + 60_000 }, "wim");
    const again = await store.create({ id: repeat, label: "Tea", deadline: now + 60_000 }, "wim");
    assert.equal(again.id, repeat, "a retried create stays idempotent");
    const data = JSON.parse(readFileSync(join(dir, "alarms.json"), "utf8"));
    for (const alarm of data.alarms) alarm.status = "sent";
    data.alarms.push(
      ...Array.from({ length: 300 }, () => ({ ...data.alarms[0], id: randomUUID() })),
    );
    await writeFile(join(dir, "alarms.json"), JSON.stringify(data));
    await timer("ada");
  }));

test("conflict counts use the singular form for exactly one conflict", async () => {
  globalThis.self ??= globalThis;
  const channel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const { formatConflictCount } = await import("../public/offline-client.js");
  globalThis.BroadcastChannel = channel;
  const t = (key, values) => (values ? `${key}:${values.count}` : key);
  assert.equal(formatConflictCount(t, 0), "");
  assert.equal(formatConflictCount(t, 1), "offlineConflictOne");
  assert.equal(formatConflictCount(t, 3), "offlineConflictCount:3");
});

async function alarmClientWith(bridge) {
  globalThis.self ??= globalThis;
  const channel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const { AtelierAlarmClient } = await import("../public/offline-client.js");
  globalThis.BroadcastChannel = channel;
  globalThis.self.AtelierOfflineCore.bridge = bridge;
  const client = new AtelierAlarmClient();
  client.alarms = [{ id: "t1", status: "scheduled" }];
  return client;
}

test("stopping a timer that already fired or vanished counts as success and refreshes the list", async () => {
  for (const code of ["timer_dispatched", "timer_not_found"]) {
    const calls = [];
    const client = await alarmClientWith(async (path) => {
      calls.push(path);
      if (path.endsWith("alarm_cancel")) throw Object.assign(new Error("x"), { code });
      return { alarms: [{ id: "t1", status: "sent" }] };
    });
    let changed = 0;
    client.onChange = () => changed++;
    await client.cancel("t1");
    assert.deepEqual(calls, ["mealie_atelier/alarm_cancel", "mealie_atelier/alarms"], code);
    assert.equal(client.alarms[0].status, "sent", code);
    assert.ok(changed > 0);
  }
});

test("stopping a timer rethrows other errors such as timer_not_permitted", async () => {
  const client = await alarmClientWith(async () => {
    throw Object.assign(new Error("x"), { code: "timer_not_permitted" });
  });
  await assert.rejects(client.cancel("t1"), { code: "timer_not_permitted" });
});

test("the connectivity panel maps Bridge error codes to their err texts", async () => {
  globalThis.self ??= globalThis;
  const channel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const { localizeOfflineError } = await import("../public/offline-client.js");
  globalThis.BroadcastChannel = channel;
  for (const language of ["de", "en"]) {
    const strings = JSON.parse(
      readFileSync(new URL(`../../src/i18n/${language}.json`, import.meta.url), "utf8"),
    );
    const card = { t: (key) => strings[key] ?? key };
    assert.equal(
      localizeOfflineError(card, { code: "timer_not_permitted" }),
      strings.errTimerNotPermitted,
    );
    assert.equal(
      localizeOfflineError(card, { code: "offlineNoSnapshot" }),
      strings.offlineNoSnapshot,
    );
    assert.equal(
      localizeOfflineError(card, { code: "unknown_code", message: "raw" }),
      strings.offlineUnexpectedError,
    );
  }
});
