# Release and deployment

The browser editor, release files, and download counters are separate. Cloudflare Workers serves `site-dist/`, R2 stores versioned artifacts, and D1 stores aggregate download counts. The desktop editor has no telemetry or network dependency. Desktop updates currently require downloading a newer release.

## Private settings

Copy `.env.release.example` to `.env.release.local`. This ignored file holds deployment identity and runtime settings; it is never packaged or uploaded as a site asset. Keep signing certificates in Keychain and notarization credentials in a `notarytool` Keychain profile. Store a profile using Apple's interactive `xcrun notarytool store-credentials lemma-notary` flow; never put passwords into tracked scripts or CI logs.

Select an existing Developer ID Application certificate, not an Apple Development or ad hoc identity. Set `LEMMA_SIGN_IDENTITY` to its SHA-1 and `LEMMA_NOTARY_PROFILE` to the Keychain profile. Alternatively, set `LEMMA_NOTARY_ENV_FILE` to an ignored, private file containing `APPLE_ID`, `APPLE_TEAM_ID`, and `APPLE_APP_PASSWORD`; leave the profile unset. Those values are loaded only for the notarization subprocess and are never added to frontend build variables or logs. This supports release sessions where Keychain profile storage requires interactive access. Packaging preserves the existing bundle identifier and notebook location so upgrades retain saved work.

## First deployment

Install the pinned toolchain with `npm ci`. Authenticate the intended Cloudflare account using Wrangler, then create an R2 bucket named `lemma-releases` and a D1 database named `lemma-downloads`. Save the returned account/database IDs in private settings. If using an installed account wrapper, configure `LEMMA_WRANGLER_WRAPPER` and `LEMMA_CLOUDFLARE_PROFILE` explicitly.

```sh
npm run cloudflare:configure
npm run cloudflare:migrate
npm run cloudflare:deploy
npm run cloudflare:stats-secret
```

The generated `.wrangler/lemma.json` is private. The committed `cloudflare/wrangler.example.json` contains only reusable examples. `LEMMA_DOMAIN` attaches the apex and www custom domains, redirecting www to the apex so saved pages use one browser storage origin. Existing parking A/CNAME records must be removed before attachment; preserve unrelated MX/TXT records and keep a private rollback copy. Configure the registrar with the nameservers assigned to the Cloudflare zone and wait for activation and TLS issuance.

The website's source link is configured with `VITE_REPOSITORY_URL`. Download buttons appear after a valid release is published. The same-origin `/api/releases` manifest supplies version, architecture, minimum system, size, checksum, and release notes. GitHub Releases remains a fallback for older deployments.

## Mac release

Review changes, run checks, and commit them first. Bump `package.json` and its lockfile for each new release; never replace a published version.

```sh
npm run release:mac
```

This command:

1. Requires a clean checkout, valid signing configuration, and working Keychain notarization credentials.
2. Runs the complete tests and production desktop build.
3. Signs all Electron components using Developer ID, hardened runtime, and the minimal JIT entitlement.
4. Notarizes the app, staples and validates its ticket, verifies its code signature, and assesses it with Gatekeeper.
5. Builds a DMG with an Applications shortcut, signs and notarizes it, staples its ticket, and assesses the DMG.
6. Writes `release/<version>/` containing the DMG, SHA256SUMS, manifest, release notes, notarization receipts, and source provenance. Output and receipts stay ignored.

An Apple rejection stops the process. Inspect the submission with `notarytool log`; no rejected or ad hoc build is eligible for publishing. The regular `package:mac` command remains an explicitly unnotarized development preview. It never replaces the signed release output.

## Publish

Review `release/<version>/notes.md` for public accuracy and privacy. The current publisher marks releases as previews. Run:

```sh
npm run release:prepare
npm run release:promote
```

Alternatively `npm run release:publish` performs both phases. Preparation validates checksums and accepted notarization receipts, creates a GitHub draft pointing to the recorded source commit, uploads immutable versioned R2 artifacts, verifies the complete downloaded bytes, and uploads GitHub assets. Promotion publishes the verified draft and updates R2's latest manifest last. The website never advertises a half-uploaded release. Failed preparation leaves a draft; inspect it before retrying. Do not overwrite artifacts for a version that has already been published.

Promotion records the previous manifest locally. To roll back, restore that previous manifest to `releases/latest.json` with Wrangler, verify `/api/releases`, and retain the newer version's immutable files. The website rollback changes future downloads; it does not modify installed apps. Cloudflare Worker deployments can be rolled back with Wrangler's deployment controls.

## Download dashboard

Open `/stats.html` and enter `LEMMA_STATS_TOKEN`. The token is kept in memory, sent only as an Authorization header, and never saved to browser storage. `/api/stats?days=30` requires the same bearer token. Rotate it using `cloudflare:stats-secret`.

Counters store only UTC day, release version, platform, entry point, event type, and count. No IP address, user agent, location, screen size, cookies, equations, or page contents are stored in D1. The click endpoint accepts only a small same-origin JSON payload with three validated fields. Provider operational processing is separate from this application database; Worker request logging is disabled in configuration.

A click is a button activation. A request is a successful full GET or a range beginning at byte zero; HEAD, resumed nonzero ranges, conditional 304 responses, obvious crawlers, and prefetch requests do not increment it. These are aggregate events, not unique people, completed downloads, or installations. Direct GitHub release-asset downloads have separate GitHub counters and are not part of the Cloudflare totals. Failed counter writes do not prevent downloads. Release verification requests authenticated with the dashboard token are excluded. Public counters may include repeated requests and cannot be treated as fraud-proof attribution.

## Verification

The optional manual GitHub workflow targets a trusted self-hosted macOS ARM64 runner with the `lemma-release` label. Register it only on the designated development host. It does not execute on hosted runners or automatically run untrusted fork pull requests. Local release commands remain usable without a runner.

```sh
npm test
npm run build
npm run site:build
npm audit --audit-level=high
```

Tests cover actual SQLite aggregation, manifest validation, streaming responses, ranges, origin/body restrictions, and dashboard authorization in addition to editor reliability. Before public distribution, verify the installed app on a clean supported Mac, including a browser-downloaded/quarantined copy, document opening, saving, and PDF export. Windows packages remain portable previews until signing/installer work and native Windows checks are complete.
