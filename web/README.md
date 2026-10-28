# Mealie Atelier Web · private standalone recipe dashboard

Run the full Mealie Atelier kitchen UI on iPhone, tablet or a wall display **without Home Assistant**. This standalone companion shares the same visual components as the HACS cards, but uses a local, password-protected Node proxy to your own Mealie API.

![Mealie Atelier standalone UI (demo data)](assets/showcase-desktop.png)

## Docker quick start

```bash
cp .env.example .env
# Edit MEALIE_URL, MEALIE_API_TOKEN and ATELIER_PASSWORD (at least 12 characters) in .env
docker compose up -d --build
```

Open `http://127.0.0.1:3008` on the Docker host. Compose pins `PORT=3000` inside the container and publishes it on `127.0.0.1:${ATELIER_HOST_PORT:-3008}`, so a `PORT` line in `.env` cannot break the mapping. The image runs as the non-root `node` user, has a health check (`/api/health`, authenticated with your configured credentials), restarts unless stopped and is limited to 256 MB RAM, 1 CPU and 128 processes.

Optional **read-only** kiosk mode: add `ATELIER_READ_ONLY=true` to `.env` and restart. The server will reject all mutation commands, not just hide buttons.

The structured recipe editor (linked foods and units, quantities, servings preview) is disabled by default. Enable it with `ATELIER_STRUCTURED_EDITS=true`. A backup is saved to `ATELIER_DATA_DIR/recipe-backups/` before every change (newest 10 per recipe, newest 3 cover photos), and the version history in the editor can restore any of them. Cover and step photos are uploaded in chunks (JPEG, PNG or WebP, up to 10 MiB) and checked by file signature on the server.

Deprecated, kept as aliases for 0.10.x: the commands `ingredient_preview`, `ingredient_save`, `ingredient_catalog` and the route `/api/recipe-image/*`. Use the structured editor commands instead. `ATELIER_EXPERIMENTAL_INGREDIENTS` no longer has an effect; plain-text ingredient replacement was removed.

The included `compose.yaml` binds the application to `127.0.0.1` on the host and should not be published on public interfaces. To use from a different device, put a HTTPS reverse proxy with modern authentication in front, or use a trusted private network (e.g. Tailscale). **Do not expose the container directly to the Internet. Basic auth over HTTP is insecure on untrusted networks.**

Behind a reverse proxy every request arrives from the proxy address, so the sign-in throttle would treat all users as one client and a single attacker could lock everybody out. Set `ATELIER_TRUSTED_PROXIES` to the proxy address(es), e.g. `ATELIER_TRUSTED_PROXIES=172.18.0.0/16,::1`. Only when the socket peer is in that list the server reads `X-Forwarded-For`, walks it from the right and uses the first address that is not itself a trusted proxy. From any other peer the header is ignored, so it cannot be spoofed. Make sure your proxy overwrites or appends to `X-Forwarded-For` rather than passing a client-supplied value through unchecked.

## Node quick start

```bash
# Node.js 22 or later
cp .env.example .env
# Edit MEALIE_URL, MEALIE_API_TOKEN and ATELIER_PASSWORD in .env
npm start
```

`npm start` runs `node --env-file=.env server.mjs`, so `.env` is loaded for you (default port 3000). The server refuses to start without the required variables or with a password shorter than 12 characters.

## Configuration

All settings are environment variables (see `.env.example`).

| Variable                                                                         | Default   | Required | Purpose                                                                                                                                                          |
| -------------------------------------------------------------------------------- | --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MEALIE_URL`                                                                     | none      | yes      | Mealie server URL (http or https, no credentials or query).                                                                                                      |
| `MEALIE_API_TOKEN`                                                               | none      | yes      | Mealie API token; use a dedicated least-privilege token.                                                                                                         |
| `ATELIER_PASSWORD`                                                               | none      | no       | Shared Basic auth password (admin), at least 12 characters. Required when `ATELIER_USERS` is not set.                                                            |
| `ATELIER_USERNAME`                                                               | `atelier` | no       | Basic auth user name.                                                                                                                                            |
| `ATELIER_USERS`                                                                  | empty     | no       | Per-person accounts `username:role:hash;...` with roles `admin`, `writer`, `reader` (see below). Required when `ATELIER_PASSWORD` is not set.                    |
| `PORT`                                                                           | `3000`    | no       | Listen port. Compose forces `3000`; use `ATELIER_HOST_PORT` (default `3008`) for the published port.                                                             |
| `HOST`                                                                           | `0.0.0.0` | no       | Listen address.                                                                                                                                                  |
| `ATELIER_TRUSTED_PROXIES`                                                        | none      | no       | Comma-separated IPs and CIDRs (IPv4 and IPv6) of your reverse proxies. Only requests from these sockets may supply the client address through `X-Forwarded-For`. |
| `ATELIER_READ_ONLY`                                                              | `false`   | no       | `1`, `true` or `yes` rejects all writes on the server.                                                                                                           |
| `ATELIER_DATA_DIR`                                                               | `./data`  | no       | Persistent state directory. Compose and the image use `/app/data`.                                                                                               |
| `ATELIER_STRUCTURED_EDITS`                                                       | `false`   | no       | Structured ingredient editing (`true` to enable); only on a backed-up Mealie 3.x.                                                                                |
| `USDA_FDC_API_KEY`                                                               | empty     | no       | Enables USDA matching in the Nutrition Lab.                                                                                                                      |
| `OPENAI_API_KEY`                                                                 | empty     | no       | Enables opt-in AI suggestions, substitutes and recipe checks.                                                                                                    |
| `ATELIER_ALARM_CHANNEL`                                                          | `both`    | no       | Timer notification channel: `both`, `push` or `ha`.                                                                                                              |
| `ATELIER_VAPID_PUBLIC_KEY`, `ATELIER_VAPID_PRIVATE_KEY`, `ATELIER_VAPID_SUBJECT` | empty     | no       | Web Push for timers; all three together, subject is `mailto:` or `https://`.                                                                                     |
| `ATELIER_HA_URL`, `ATELIER_HA_TOKEN`, `ATELIER_HA_NOTIFY_SERVICE`                | empty     | no       | Home Assistant timer notifications; all three together, service like `notify.mobile_app_phone`.                                                                  |

### Per-person accounts

`ATELIER_USERS` is a semicolon-separated list of `username:role:hash` entries. Usernames match `[a-z0-9._-]{1,40}`. Create each hash on any machine with Node 22 or later; the password is read from stdin (never from the command line) and is not echoed in a terminal:

```bash
npm run hash-password
# or, non-interactively: printf '%s' 'a long passphrase' | node scripts/hash-password.mjs
```

The hash has the form `scrypt$<N>$<r>$<p>$<salt>$<key>` with a 32-byte key and N of at least 16384. Put the entries in `.env` inside single quotes, because the hash contains `$` characters:

```
ATELIER_USERS='anna:admin:scrypt$16384$8$1$...$...;ben:reader:scrypt$16384$8$1$...$...'
```

| Role     | May do                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------- |
| `admin`  | Everything: recipe create, edit, import, photos, nutrition save, ingredient editing.              |
| `writer` | Shopping lists, meal plans and kitchen state; no recipe edits, no family members or helper tasks. |
| `reader` | View only. Personal kitchen timers and the cooking journal still work.                            |

- `ATELIER_USERNAME` with `ATELIER_PASSWORD` keeps working unchanged and signs in as `admin`. You may use both; a name that appears in both is a startup error, as is any malformed entry (the message names the entry position, never the hash).
- `ATELIER_READ_ONLY` still wins: nobody can write, whatever the role.
- A refused write answers HTTP 403 with `code` `write_not_permitted` (reader) or `unauthorized` (writer on an admin action); the card hides the matching controls. A shopping edit queued offline by an account that lost its write role is dropped on the next sync, with a visible notice.
- Successful sign-ins are cached in memory for 10 minutes so each request does not run scrypt; failures are never cached and every one counts for the sign-in throttle described below.

Generate the Web Push keys with `npm run vapid` and paste the three printed lines into `.env`. Keep the private key stable, secret and backed up.

## Security

- Every response carries a Content-Security-Policy (same-origin only; the single inline module script of `index.html` is allowed by hash, no remote hosts), a Permissions-Policy, `Referrer-Policy: no-referrer` and `Cross-Origin-Opener-Policy: same-origin`.
- Per-person passwords are stored only as scrypt hashes (`ATELIER_USERS`), verified in constant time. Unknown user names cost the same scrypt run as known ones.
- Failed Basic auth attempts are counted per client address in memory. After 5 failures the address is locked out with HTTP 429 and `Retry-After`, doubling from 1 second up to 60 seconds; a correct sign-in clears the counter, a request with correct credentials is still let through while its address is locked out (wrong ones keep counting), and a restart resets all counters. The server logs a one-time warning when a private address sends `X-Forwarded-For` while `ATELIER_TRUSTED_PROXIES` is empty. IPv6 clients are counted by their /64 prefix. Behind a reverse proxy the server only sees the proxy address, so set `ATELIER_TRUSTED_PROXIES` (see below).
- The AI disclaimer and the language of AI answers follow the request language (`Accept-Language`), German or English.
- The service worker cache name is derived from the `version` in `package.json`, so each release invalidates the old offline shell.

## Third-party hosts

The browser only talks to this server. The server contacts, only when configured and triggered: your Mealie instance (`MEALIE_URL`), `api.nal.usda.gov` (USDA lookups, `USDA_FDC_API_KEY`), `api.openai.com` (AI features, `OPENAI_API_KEY`), your Home Assistant (`ATELIER_HA_URL`) and the Web Push endpoint of each subscribed browser. USDA result links point to `fdc.nal.usda.gov`. The web app does not load recipes or photos from Unsplash or any other third-party host.

## Tests

```bash
npm test
```

These tests boot a mock Mealie API and test authorization, recipe listing and editing, shopping writes, read-only enforcement, image proxy and path hardening. They are not full compatibility tests against a real Mealie installation.

The opt-in live read-only smoke check in `test/live-readonly-smoke.mjs` requires `MEALIE_ATELIER_TEST_READONLY=1`, `MEALIE_URL` and `MEALIE_API_TOKEN`. Run it only against a dedicated test instance with a read-only token; do not include secrets in logs or archives.

## Notes

- No npm packages; just Node 22 built-in server and fetch.
- User credentials and Mealie tokens remain on the server. Never bake `.env` into your Docker image or expose it in Git.
- Use the **Install app** control at the bottom of the page for platform-specific instructions. Chromium can open its native install prompt; on iPhone/iPad, open the site in Safari and use **Share → Add to Home Screen → Open as Web App → Add**. The app includes dedicated Chromium and Apple home-screen icons. Serve it from a trusted HTTPS origin (or localhost for development). The service worker does not cache private API data or recipe photos.
- This is not a HACS-installable integration. The bridge and cards are separate optional HA packages.
- Currently supports one Mealie token/household per web server; all logins use its Mealie permissions, narrowed by their `ATELIER_USERS` role.

**License:** MIT. Unofficial Mealie companion.

## Printing recipes and plans (v0.3)

Recipe detail, shopping lists and planner now open the same **Print Studio** as the Home Assistant cards. The print document is generated in the browser; you can print or choose Save as PDF. No Mealie token is embedded into the print document. Images, if explicitly enabled, use the server-side authenticated image proxy.

## Nutrition Lab (v0.5 beta)

Put `USDA_FDC_API_KEY=...` in your private `.env` to enable USDA food matching and per-serving nutrition calculations. To **optionally** use AI to suggest USDA English search terms, provide your own `OPENAI_API_KEY=...`. Both keys remain on the web backend. **Only an explicit click** sends ingredient text to OpenAI; nutritional values are not taken from the language model.

Opening the Nutrition Lab fetches recipe data, then lets you confirm each USDA match and actual gram weight. Save to Mealie requires a fresh recipe hash, server-side recalculation, and explicit replacement consent for any existing nutrition. `ATELIER_READ_ONLY=true` rejects writes on the server. Recipes and nutrient values differ in Mealie releases: please test with a backed-up test instance first. The browser-only Cooking Cockpit timers/journal are not multi-device-synced.

**Privacy:** USDA lookup sends your ingredient search query to USDA; AI name suggestions send ingredient text to OpenAI on demand. The app does not store AI input in an application database; the provider's privacy rules still apply. Do not post public API keys in issues or screenshots.

## Kitchen Intelligence: persisted state (v0.6)

`ATELIER_DATA_DIR=/app/data` is the persistent JSON store for profile, pantry, cooking journal, family members and cooking sessions. The Docker Compose configuration includes a named volume `atelier_data`, which survives container recreation. Protect this volume and back it up together with Mealie. Atomic writes and monotonic revision numbers prevent stale clients from silently overwriting newer state.

A standalone server has **one shared user account**; it does not distinguish family members through logins. If you need per-user recipe journals, use Home Assistant with individual accounts. The child helper view is not an authorization barrier. There is no off-device push notification guarantee for countdown timers. AI quality checks and ingredient substitutes are opt-in and require your private `OPENAI_API_KEY`.

Run the automated tests with `npm test`. They cover private-state persistence, server restart, stale-revision rejection, read-only, protected Mealie proxy endpoints and ingredient checks using fake services. USDA/OpenAI live calls remain unverified.

## Support

If Mealie Atelier helps your kitchen, you can optionally [say thanks on Ko-fi](https://ko-fi.com/allesautomatisch). It is voluntary and never gates a feature.
