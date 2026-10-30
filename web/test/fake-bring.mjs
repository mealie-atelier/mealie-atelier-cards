/** Test fixture only: a local stand-in for the Bring! REST API with failure injection. */
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";

export const FAKE_EMAIL = "cook@example.test";
export const FAKE_PASSWORD = "fixture-bring-password";
export const FAKE_API_KEY = "fixture-api-key";

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};

/**
 * Starts the fake. `state.failures.add` is a queue consumed by the next add calls:
 * `drop-after-store` (stores the item, then cuts the connection), `drop-before-store`,
 * `reject` (HTTP 400), `ratelimit` (HTTP 429), `auth` (HTTP 401 that no refresh can fix).
 */
export async function startFakeBring({ expiresIn = 3600 } = {}) {
  const state = {
    uuid: randomUUID(),
    lists: [
      { listUuid: randomUUID(), name: "Einkauf", theme: "default" },
      { listUuid: randomUUID(), name: "Party", theme: "default" },
    ],
    items: new Map(),
    access: new Set(),
    refresh: new Set(),
    calls: [],
    logins: 0,
    refreshes: 0,
    failures: { add: [], list: [] },
    blocked: false,
    rejectLogin: false,
    expiresIn,
    expireAccessTokens() {
      state.access.clear();
    },
    open(listUuid) {
      return state.bucket(listUuid).purchase;
    },
    bucket(listUuid) {
      if (!state.items.has(listUuid)) state.items.set(listUuid, { purchase: [], recently: [] });
      return state.items.get(listUuid);
    },
    puts() {
      return state.calls.filter((call) => call.method === "PUT");
    },
  };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const call = { method: req.method, path: url.pathname, headers: req.headers, raw };
    state.calls.push(call);
    if (state.blocked) return req.socket.destroy();
    if (req.method === "POST" && url.pathname === "/v2/bringauth") {
      const form = new URLSearchParams(raw);
      if (
        state.rejectLogin ||
        form.get("email") !== FAKE_EMAIL ||
        form.get("password") !== FAKE_PASSWORD
      )
        return json(res, 401, { message: "bad credentials" });
      state.logins += 1;
      const access = randomUUID();
      const refresh = randomUUID();
      state.access.add(access);
      state.refresh.add(refresh);
      return json(res, 200, {
        uuid: state.uuid,
        publicUuid: randomUUID(),
        bringListUUID: state.lists[0].listUuid,
        access_token: access,
        refresh_token: refresh,
        token_type: "Bearer",
        expires_in: state.expiresIn,
      });
    }
    if (req.method === "POST" && url.pathname === "/v2/bringauth/token") {
      const form = new URLSearchParams(raw);
      if (
        form.get("grant_type") !== "refresh_token" ||
        !state.refresh.has(form.get("refresh_token"))
      )
        return json(res, 401, { message: "bad refresh token" });
      state.refreshes += 1;
      const access = randomUUID();
      state.access.add(access);
      return json(res, 200, {
        access_token: access,
        refresh_token: form.get("refresh_token"),
        token_type: "Bearer",
        expires_in: state.expiresIn,
      });
    }
    const bearer = String(req.headers.authorization || "").replace(/^Bearer /, "");
    if (!state.access.has(bearer) || req.headers["x-bring-api-key"] !== FAKE_API_KEY)
      return json(res, 401, { message: "unauthorized" });
    if (url.pathname === `/v2/bringusers/${state.uuid}`)
      return json(res, 200, { userLocale: { language: "de", country: "CH" } });
    if (url.pathname === `/bringusers/${state.uuid}/lists`) {
      if (state.failures.list.length) {
        const failure = state.failures.list.shift();
        if (failure === "ratelimit") return json(res, 429, {}, { "Retry-After": "7" });
        return json(res, Number(failure) || 500, {});
      }
      return json(res, 200, { lists: state.lists });
    }
    const list = url.pathname.match(/^\/v2\/bringlists\/([^/]+)(\/items)?$/);
    if (list && state.lists.some((row) => row.listUuid === list[1])) {
      const bucket = state.bucket(list[1]);
      if (req.method === "GET" && !list[2])
        return json(res, 200, {
          uuid: list[1],
          status: "REGISTERED",
          items: {
            purchase: bucket.purchase.map((row) => ({
              uuid: row.uuid,
              itemId: row.itemId,
              specification: row.spec,
              attributes: [],
            })),
            recently: bucket.recently.map((row) => ({
              uuid: row.uuid,
              itemId: row.itemId,
              specification: row.spec,
              attributes: [],
            })),
          },
        });
      if (req.method === "PUT" && list[2]) {
        const body = JSON.parse(raw);
        const change = body.changes[0];
        if (change.operation === "TO_PURCHASE") {
          const failure = state.failures.add.shift();
          if (failure === "drop-before-store") return req.socket.destroy();
          if (failure === "reject") return json(res, 400, { message: "rejected" });
          if (failure === "ratelimit") return json(res, 429, {}, { "Retry-After": "3" });
          if (failure === "auth") {
            state.access.clear();
            state.refresh.clear();
            return json(res, 401, { message: "unauthorized" });
          }
          // Like Bring!, one entry per name: adding it again replaces its detail text.
          bucket.purchase = bucket.purchase.filter(
            (row) => row.itemId.toLowerCase() !== change.itemId.toLowerCase(),
          );
          bucket.purchase.push({ uuid: change.uuid, itemId: change.itemId, spec: change.spec });
          if (failure === "drop-after-store") return req.socket.destroy();
        } else {
          const [gone] = bucket.purchase.filter((row) => row.itemId === change.itemId);
          bucket.purchase = bucket.purchase.filter((row) => row.itemId !== change.itemId);
          if (change.operation === "TO_RECENTLY" && gone) bucket.recently.push(gone);
        }
        res.writeHead(204);
        return res.end();
      }
    }
    return json(res, 404, {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    state,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => {
      server.closeAllConnections?.();
      server.close();
    },
  };
}
