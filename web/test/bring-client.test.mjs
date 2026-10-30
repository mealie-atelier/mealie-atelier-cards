import test from "node:test";
import assert from "node:assert/strict";
import {
  BringAuthError,
  BringClient,
  BringNetworkError,
  BringRateLimitError,
  BringRequestError,
  bringBase,
} from "../bring-client.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

async function setup(options = {}, client = {}) {
  const fake = await startFakeBring(options);
  const bring = new BringClient({
    email: FAKE_EMAIL,
    password: FAKE_PASSWORD,
    base: fake.base,
    apiKey: FAKE_API_KEY,
    retryDelayMs: 0,
    ...client,
  });
  return { fake, bring };
}

test("login posts the form, then lists send the library headers and the user", async () => {
  const { fake, bring } = await setup();
  try {
    const lists = await bring.lists();
    assert.deepEqual(
      lists.map((row) => row.name),
      ["Einkauf", "Party"],
    );
    const login = fake.state.calls.find((call) => call.path === "/v2/bringauth");
    assert.equal(login.headers["content-type"], "application/x-www-form-urlencoded");
    assert.deepEqual(Object.fromEntries(new URLSearchParams(login.raw)), {
      email: FAKE_EMAIL,
      password: FAKE_PASSWORD,
    });
    const read = fake.state.calls.find((call) => call.path.endsWith("/lists"));
    assert.match(read.headers.authorization, /^Bearer .{8,}/);
    assert.equal(read.headers["x-bring-client"], "android");
    assert.equal(read.headers["x-bring-application"], "bring");
    assert.equal(read.headers["x-bring-user-uuid"], fake.state.uuid);
    // The account's country comes from the user profile.
    assert.equal(read.headers["x-bring-country"], "CH");
  } finally {
    fake.close();
  }
});

test("default headers match the python bring-api library", () => {
  const headers = new BringClient({ email: "a", password: "b" }).headers();
  assert.equal(headers["X-BRING-API-KEY"], "cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp");
  assert.equal(headers["X-BRING-COUNTRY"], "DE");
  assert.equal(headers.Authorization, "Bearer");
});

test("the base URL is overridable through BRING_API_BASE", () => {
  assert.equal(bringBase({}), "https://api.getbring.com/rest");
  assert.equal(
    bringBase({ BRING_API_BASE: "http://127.0.0.1:1/rest/" }),
    "http://127.0.0.1:1/rest",
  );
});

test("wrong credentials raise BringAuthError", async () => {
  const { fake, bring } = await setup({}, { password: "wrong" });
  try {
    await assert.rejects(bring.lists(), (error) => error instanceof BringAuthError);
    await assert.rejects(bring.lists(), (error) => error.code === "bring_auth");
  } finally {
    fake.close();
  }
});

test("an account without credentials is an auth error and never calls Bring", async () => {
  const { fake, bring } = await setup({}, { email: "", password: "" });
  try {
    await assert.rejects(bring.lists(), BringAuthError);
    assert.equal(fake.state.calls.length, 0);
  } finally {
    fake.close();
  }
});

test("an expired token is refreshed without a second login", async () => {
  let clock = 1_000_000;
  const { fake, bring } = await setup({ expiresIn: 600 }, { now: () => clock });
  try {
    await bring.lists();
    assert.equal(fake.state.logins, 1);
    clock += 601_000;
    await bring.lists();
    assert.equal(fake.state.logins, 1);
    assert.equal(fake.state.refreshes, 1);
  } finally {
    fake.close();
  }
});

test("a token the server no longer accepts is renewed once and the call repeats", async () => {
  const { fake, bring } = await setup();
  try {
    await bring.lists();
    fake.state.expireAccessTokens();
    assert.equal((await bring.lists()).length, 2);
    assert.equal(fake.state.refreshes, 1);
  } finally {
    fake.close();
  }
});

test("a dead refresh token falls back to a fresh login", async () => {
  const { fake, bring } = await setup();
  try {
    await bring.lists();
    fake.state.expireAccessTokens();
    fake.state.refresh.clear();
    assert.equal((await bring.lists()).length, 2);
    assert.equal(fake.state.logins, 2);
  } finally {
    fake.close();
  }
});

test("rate limiting is a typed error with the retry hint", async () => {
  const { fake, bring } = await setup();
  try {
    await bring.lists();
    fake.state.failures.list.push("ratelimit");
    fake.state.expireAccessTokens();
    await assert.rejects(
      bring.lists(),
      (error) => error instanceof BringRateLimitError && error.retryAfterSeconds === 7,
    );
  } finally {
    fake.close();
  }
});

test("an unreachable server is a network error", async () => {
  const { fake, bring } = await setup();
  fake.close();
  await assert.rejects(bring.lists(), (error) => error instanceof BringNetworkError);
});

test("a gateway error is retried once, then reported as a network error", async () => {
  const { fake, bring } = await setup();
  try {
    fake.state.failures.list.push(503, 503);
    await assert.rejects(bring.lists(), BringNetworkError);
    fake.state.failures.list.push(502);
    assert.equal((await bring.lists()).length, 2);
  } finally {
    fake.close();
  }
});

test("other client errors are typed and carry the status", async () => {
  const { fake, bring } = await setup();
  try {
    fake.state.failures.list.push(404);
    await assert.rejects(
      bring.lists(),
      (error) => error instanceof BringRequestError && error.status === 404,
    );
  } finally {
    fake.close();
  }
});

test("items can be added with a specification, read back and completed", async () => {
  const { fake, bring } = await setup();
  try {
    const [list] = await bring.lists();
    await bring.addItem(list.uuid, {
      name: "Kartoffeln",
      spec: "300 g, festkochend",
      uuid: "11111111-1111-4111-8111-111111111111",
    });
    const put = fake.state.puts().at(-1);
    const change = JSON.parse(put.raw).changes[0];
    assert.equal(change.operation, "TO_PURCHASE");
    assert.equal(change.itemId, "Kartoffeln");
    assert.equal(change.spec, "300 g, festkochend");
    assert.equal(change.uuid, "11111111-1111-4111-8111-111111111111");
    const { purchase, recently } = await bring.items(list.uuid);
    assert.deepEqual(purchase, [
      {
        uuid: "11111111-1111-4111-8111-111111111111",
        name: "Kartoffeln",
        spec: "300 g, festkochend",
      },
    ]);
    assert.deepEqual(recently, []);
    await bring.completeItem(list.uuid, { name: "Kartoffeln" });
    const after = await bring.items(list.uuid);
    assert.equal(after.purchase.length, 0);
    assert.equal(after.recently.length, 1);
    await bring.removeItem(list.uuid, { name: "Kartoffeln" });
    assert.equal(JSON.parse(fake.state.puts().at(-1).raw).changes[0].operation, "REMOVE");
  } finally {
    fake.close();
  }
});
