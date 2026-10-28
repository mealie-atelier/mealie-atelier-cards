# Release handoff — 0.9.5 developer preview

The source baseline is imported into the existing public repositories; existing Git history remains intact. This handoff describes the verified local source state and concrete external release gates. It does not claim a stable package release.

## Product repositories

- [Cards, standalone Web app/PWA, and demo](https://github.com/mealie-atelier/mealie-atelier-cards) — root card package, `web/`, and `demo/`; separate CI jobs and release boundaries.
- [Bridge integration](https://github.com/mealie-atelier/mealie-atelier-bridge) — optional Home Assistant integration, its tests, and HACS package metadata.
- [Organization profile and brand assets](https://github.com/mealie-atelier/.github) — shared profile/community information and brand source.

## Verified locally on 2026-10-28

- Cards: 60 tests pass; build, syntax check, and generated-bundle equality pass.
- Web: 35 tests pass; server and card-bundle syntax checks pass.
- Bridge: 26 tests pass; Ruff lint/format and Python compilation pass.
- Demo: generates 2 language entry points and 20 SEO recipe pages from 10 fictional bilingual recipes.
- UI evidence: German/English views and dialogs plus the neutral Light matrix cover nine emulated geometries, including four iPhone Duo poses and a narrow embedded-card host. Physical hardware and live HA acceptance remain open.

## Do before stable release

1. Review the pushed GitHub Actions runs. HACS and Hassfest must pass on the exact final commits.
2. Complete the live Home Assistant + disposable Mealie first-run, read-only, write, image, pagination, and recovery checks listed in [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md).
3. Complete physical iPhone Duo/Safari, HA embedded-card, accessibility, and printer checks. Do not treat emulated screenshots as hardware acceptance.
4. Build and publish the standalone Web app, fictional-data demo, Cards, and Bridge separately only after their relevant release gates pass. The Web app and demo must not require Home Assistant.
5. Confirm the exact alles-automatisch.de docs/demo route and hosting/deploy workflow. Generate canonical/sitemap metadata with that real URL, then verify the deployed pages in both languages.
6. Publish DE/EN guides and showcase with actual package links, limitations, and update/rollback instructions. Do not claim Bring shopping sync: it is specified but not implemented.
7. Create a fresh release ZIP only from the verified, published source revision; include a manifest, checksum, installation steps, and remaining work. Exclude credentials, personal data, caches, and QA-only browser profiles.

## Repeat local verification

From the Cards repository root:

```sh
npm run build
npm test
npm run check
node --test web/test/*.test.mjs
npm run build:demo
```

From the Bridge repository root:

```sh
python -m pip install aiohttp pytest ruff
pytest -q
ruff check custom_components tests
ruff format --check custom_components tests
python -m compileall -q custom_components/mealie_atelier
```

Do not run the optional live read-only smoke test against a household account. Use disposable data and explicitly supplied credentials.
