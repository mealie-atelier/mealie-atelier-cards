/**
 * Small client for the unofficial Bring! shopping list API. It sends the same headers as the
 * python bring-api library that Home Assistant's Bring integration uses and needs no dependency.
 */
import { randomUUID } from "node:crypto";

// Public application key that every Bring client ships (it identifies the app, not a user).
const DEFAULT_API_KEY = "cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp";
const DEFAULT_BASE = "https://api.getbring.com/rest";
const TIMEOUT_MS = 20000;
// A token counts as expired a little early so a request never starts with a dying token.
const EXPIRY_MARGIN_S = 60;
const RETRY_STATUSES = new Set([502, 503, 504]);
const CHANGE_DEFAULTS = { accuracy: "0.0", altitude: "0.0", latitude: "0.0", longitude: "0.0" };

/** Base of all Bring errors. `code` is stable and safe to show or log. */
export class BringError extends Error {
  constructor(message, code = "bring_error", extra = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    Object.assign(this, extra);
  }
}
/** Wrong credentials or an expired session that cannot be renewed. Nothing was changed. */
export class BringAuthError extends BringError {
  constructor(message = "Bring! refused the credentials") {
    super(message, "bring_auth");
  }
}
/** HTTP 429. Nothing was changed; `retryAfterSeconds` may be 0 when Bring gave no hint. */
export class BringRateLimitError extends BringError {
  constructor(retryAfterSeconds = 0) {
    super("Bring! is rate limiting requests", "bring_rate_limit", { retryAfterSeconds });
  }
}
/** The request may or may not have reached Bring (timeout, connection failure, 5xx). */
export class BringNetworkError extends BringError {
  constructor(message = "Bring! is unreachable") {
    super(message, "bring_network");
  }
}
/** Bring answered with a client error other than auth or rate limit. Nothing was changed. */
export class BringRequestError extends BringError {
  constructor(status) {
    super(`Bring! answered HTTP ${status}`, "bring_error", { status });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** "familie.beispiel@example.com" becomes "f•••@example.com": enough to recognise the account. */
export function maskEmail(email) {
  const value = String(email || "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return "";
  return `${value.slice(0, 1)}•••${value.slice(at)}`;
}

export function bringBase(env = process.env) {
  return String(env.BRING_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
}

export class BringClient {
  /**
   * @param {{ email: string, password: string, base?: string, apiKey?: string, now?: () => number,
   *   retryDelayMs?: number, fetchImpl?: typeof fetch,
   *   onSession?: ((session: object | null) => unknown) | null }} options
   */
  constructor({
    email,
    password,
    base = bringBase(),
    apiKey = process.env.BRING_API_KEY || DEFAULT_API_KEY,
    now = () => Date.now(),
    retryDelayMs = 1500,
    fetchImpl = (...args) => fetch(...args),
    onSession = null,
  }) {
    this.email = email;
    this.password = password;
    this.base = base;
    this.apiKey = apiKey;
    this.now = now;
    this.retryDelayMs = retryDelayMs;
    this.fetchImpl = fetchImpl;
    this.onSession = onSession;
    this.session = null;
    this.signIn = null;
    this.authFailed = false;
  }

  /** True when the account could be reached: a stored session or credentials for a login. */
  get configured() {
    return !!this.session || this.hasCredentials;
  }

  get hasCredentials() {
    return !!this.email && !!this.password;
  }

  /** The masked e-mail address of the connected account, or an empty text. */
  get account() {
    return this.session?.account || maskEmail(this.email);
  }

  /** The full e-mail address of the connected account (only the server and its administrators see it). */
  get accountEmail() {
    return this.session?.email || this.email || "";
  }

  /** The list Bring! uses by default for this account (`bring:<uuid>`), or an empty text. */
  get defaultList() {
    return this.session?.defaultList ? `bring:${this.session.defaultList}` : "";
  }

  /** `connected`, `reauth` (the session died and cannot be renewed) or `disconnected`. */
  get state() {
    if (!this.configured) return "disconnected";
    return this.authFailed ? "reauth" : "connected";
  }

  /** Tells the owner of the session store about a new or removed session; never throws. */
  async publish() {
    try {
      await this.onSession?.(this.session ? { ...this.session } : null);
    } catch {
      // A failed save must not break a call that already succeeded.
    }
  }

  /** Takes over a stored session (tokens only; no password is involved). */
  restore(session) {
    this.session = session ? { ...session } : null;
    this.authFailed = false;
  }

  /**
   * Signs in once with the given credentials and keeps only the tokens. The password is used for
   * this single login and is not kept. The previous session stays untouched when the login fails.
   */
  async connect(email, password) {
    const probe = new BringClient({
      email,
      password,
      base: this.base,
      apiKey: this.apiKey,
      now: this.now,
      retryDelayMs: this.retryDelayMs,
      fetchImpl: this.fetchImpl,
    });
    await probe.login();
    this.email = "";
    this.password = "";
    this.restore({ ...probe.session, account: maskEmail(email), email: String(email).trim() });
    await this.publish();
  }

  /** Forgets the session and any credentials held in memory. */
  async disconnect() {
    this.email = "";
    this.password = "";
    this.session = null;
    this.signIn = null;
    this.authFailed = false;
    await this.publish();
  }

  headers(extra = {}) {
    const session = this.session;
    return {
      Authorization: session ? `${session.tokenType} ${session.accessToken}` : "Bearer",
      "X-BRING-API-KEY": this.apiKey,
      "X-BRING-CLIENT": "android",
      "X-BRING-APPLICATION": "bring",
      "X-BRING-COUNTRY": session?.country || "DE",
      "X-BRING-USER-UUID": session?.uuid || "",
      "X-BRING-PUBLIC-USER-UUID": session?.publicUuid || "",
      ...extra,
    };
  }

  /** One HTTP exchange. Maps transport failures and statuses to typed errors. */
  async exchange(method, path, { form, json, headers } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await this.fetchImpl(this.base + path, {
        method,
        headers: {
          ...headers,
          ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          ...(json ? { "Content-Type": "application/json" } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : json ? JSON.stringify(json) : undefined,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch {
      throw new BringNetworkError();
    } finally {
      clearTimeout(timer);
    }
    return response;
  }

  async readJson(response) {
    const text = await response.text().catch(() => "");
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new BringNetworkError("Bring! answered with an unreadable body");
    }
  }

  async login() {
    const response = await this.exchange("POST", "/v2/bringauth", {
      form: { email: this.email, password: this.password },
    });
    if (response.status === 401 || response.status === 400) throw new BringAuthError();
    if (response.status === 429) throw rateLimit(response);
    if (response.status >= 500) throw new BringNetworkError();
    if (response.status >= 300) throw new BringRequestError(response.status);
    const data = await this.readJson(response);
    if (!data?.uuid || !data.access_token || !data.refresh_token)
      throw new BringNetworkError("Bring! answered with an unexpected login response");
    this.session = {
      uuid: data.uuid,
      publicUuid: data.publicUuid || "",
      tokenType: data.token_type || "Bearer",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: this.now() + Number(data.expires_in || 0) * 1000,
      country: "DE",
      defaultList: typeof data.bringListUUID === "string" ? data.bringListUUID : "",
    };
    // The account's country is a header detail; a failure here never blocks the sign-in.
    try {
      const account = await this.exchange("GET", `/v2/bringusers/${this.session.uuid}`, {
        headers: this.headers(),
      });
      const country =
        account.status < 300 ? (await this.readJson(account))?.userLocale?.country : "";
      if (typeof country === "string" && /^[A-Za-z]{2}$/.test(country))
        this.session.country = country.toUpperCase();
    } catch {
      // Keep the default country.
    }
    this.authFailed = false;
    await this.publish();
    return { uuid: this.session.uuid };
  }

  async refresh() {
    const token = this.session?.refreshToken;
    if (!token) throw new BringAuthError("Login required");
    const response = await this.exchange("POST", "/v2/bringauth/token", {
      headers: this.headers(),
      form: { grant_type: "refresh_token", refresh_token: token },
    });
    if (response.status === 401 || response.status === 400) throw new BringAuthError();
    if (response.status === 429) throw rateLimit(response);
    if (response.status >= 500) throw new BringNetworkError();
    if (response.status >= 300) throw new BringRequestError(response.status);
    const data = await this.readJson(response);
    if (!data?.access_token)
      throw new BringNetworkError("Bring! answered with an unexpected token response");
    Object.assign(this.session, {
      tokenType: data.token_type || this.session.tokenType,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || token,
      expiresAt: this.now() + Number(data.expires_in || 0) * 1000,
    });
    this.authFailed = false;
    await this.publish();
  }

  /** Makes sure a usable access token exists: login first, refresh when expired, login again if refresh fails. */
  ensureSession() {
    if (this.signIn) return this.signIn;
    const expired = !this.session || this.session.expiresAt - EXPIRY_MARGIN_S * 1000 <= this.now();
    if (!expired) return Promise.resolve();
    if (!this.configured) return Promise.reject(new BringAuthError("No Bring! account connected"));
    this.signIn = (async () => {
      try {
        if (this.session?.refreshToken) {
          try {
            await this.refresh();
            return;
          } catch (error) {
            if (!(error instanceof BringAuthError)) throw error;
            // Without a password in memory the stored tokens are all there is: reconnect.
            if (!this.hasCredentials) throw this.failAuth(error);
          }
        }
        if (!this.hasCredentials) throw this.failAuth(new BringAuthError("Login required"));
        await this.login().catch((error) => {
          throw error instanceof BringAuthError ? this.failAuth(error) : error;
        });
      } finally {
        this.signIn = null;
      }
    })();
    return this.signIn;
  }

  failAuth(error) {
    this.authFailed = true;
    return error;
  }

  /** Authenticated call. Retries once after a 401 (fresh token) and once after a gateway error. */
  async request(method, path, { json } = {}, retried = false) {
    await this.ensureSession();
    const response = await this.exchange(method, path, { json, headers: this.headers() });
    if (response.status === 401) {
      if (retried) throw this.failAuth(new BringAuthError());
      if (this.session) this.session.expiresAt = 0;
      return this.request(method, path, { json }, true);
    }
    if (response.status === 429) throw rateLimit(response);
    if (RETRY_STATUSES.has(response.status) && !retried) {
      await sleep(this.retryDelayMs);
      return this.request(method, path, { json }, true);
    }
    if (response.status >= 500) throw new BringNetworkError();
    if (response.status >= 300) throw new BringRequestError(response.status);
    if (response.status === 204) return null;
    return this.readJson(response);
  }

  /** Lists of the account as `[{ uuid, name }]`. */
  async lists() {
    await this.ensureSession();
    const data = await this.request("GET", `/bringusers/${this.session.uuid}/lists`);
    return (Array.isArray(data?.lists) ? data.lists : [])
      .filter((row) => row && typeof row.listUuid === "string")
      .map((row) => ({ uuid: row.listUuid, name: String(row.name || "") }));
  }

  /** Items of a list: `purchase` (open) and `recently` (completed), each `[{ uuid, name, spec }]`. */
  async items(listUuid) {
    const data = await this.request("GET", `/v2/bringlists/${encodeURIComponent(listUuid)}`);
    const rows = (rows) =>
      (Array.isArray(rows) ? rows : [])
        .filter((row) => row && typeof row.itemId === "string")
        .map((row) => ({
          uuid: typeof row.uuid === "string" ? row.uuid : "",
          name: row.itemId,
          spec: typeof row.specification === "string" ? row.specification : "",
        }));
    return { purchase: rows(data?.items?.purchase), recently: rows(data?.items?.recently) };
  }

  change(listUuid, operation, { name, spec = "", uuid = randomUUID() }) {
    return this.request("PUT", `/v2/bringlists/${encodeURIComponent(listUuid)}/items`, {
      json: {
        changes: [{ ...CHANGE_DEFAULTS, itemId: name, spec, uuid, operation }],
        sender: "",
      },
    });
  }
  /** Puts an item on the list to buy (the caller picks `uuid` to find it again later). */
  addItem(listUuid, item) {
    return this.change(listUuid, "TO_PURCHASE", item);
  }
  /** Moves an item to the recently used section. */
  completeItem(listUuid, item) {
    return this.change(listUuid, "TO_RECENTLY", item);
  }
  /** Removes an item from the list completely. */
  removeItem(listUuid, item) {
    return this.change(listUuid, "REMOVE", item);
  }
}

function rateLimit(response) {
  const seconds = Number(response.headers?.get?.("retry-after"));
  return new BringRateLimitError(Number.isFinite(seconds) && seconds > 0 ? seconds : 0);
}
