# CryptoVault

A responsive crypto index-vault investment simulator, built with React, TypeScript, and Vite. The finished static website is in **`dist/`**, alongside the complete source and `package-lock.json`.

## Run and rebuild

Use Node.js 20.19+ or a current Node.js 22/24 release. The following workflow installs dependencies outside the repository:

```sh
mkdir -p /tmp/cryptovault-dev
cp package.json package-lock.json /tmp/cryptovault-dev/
npm ci --prefix /tmp/cryptovault-dev
npm run dev -- --toolchain /tmp/cryptovault-dev
```

Open the URL printed by Vite. To check and build:

```sh
npm run typecheck -- --toolchain /tmp/cryptovault-dev
npm test -- --toolchain /tmp/cryptovault-dev
npm run build -- --toolchain /tmp/cryptovault-dev
npm run preview -- --toolchain /tmp/cryptovault-dev
```

`scripts/tooling.mjs` also supports standard local installations when no `--toolchain` argument is supplied. It configures Vite with **`base: './'`**, disables environment-file loading, and resolves the selected dependency directory. No secrets or backend are required. Keep dependency directories and package caches out of the submission.

## What works

- Homepage, searchable/sortable vault exploration, Official and Community filters, risk filters, and dedicated vault pages.
- Six seeded example vaults with compositions, example returns, popularity counts, and period controls.
- A $10,000 initial demo cash balance, investments from $1, proportional allocations, deposits, partial/full withdrawals, and transaction confirmations.
- Portfolio holdings, cost basis, realized/unrealized profit or loss, account-value history, and rising/falling market scenarios.
- CSV export of all simulated transactions and a confirmed demo reset.
- Community vault creation with unique names, two or more distinct assets, positive percentages, and a required 100% total.
- Local admin mode for creating, editing, archiving, and restoring official vaults. Archived vaults reject new investments while retaining withdrawals.
- Persistent local state, same-origin tab synchronization, and visible recovery when stored data is corrupt or unavailable.

Routes use hashes (`#/explore`, `#/portfolio`, `#/create`, `#/admin`, `#/vault/blue-chip`), so static hosts need no fallback rewrites. Assets, the variable Inter font, favicon, and 1200 × 630 share image are bundled locally. A `/preview/` subpath was explicitly tested.

## Simulation boundaries

Everything is virtual. There are no payments, wallet connections, real trades, accounts, market APIs, or fees. Example returns and investor counts are fixed illustrations; they do not describe real markets. New investments buy demo shares at the current simulated NAV, independently of example historical returns.

Rising-market monthly rates are BTC 2.5%, ETH 4%, SOL 6.5%, LINK 5%, AVAX 7%, and UNI 8%. Falling-market rates are those rates multiplied by −1.25. Each vault’s scenario rate is allocation-weighted. These are deterministic teaching scenarios, not predictions. Cash does not earn returns. The account chart includes cash and contributions, so deposits can change its value without creating profit.

Money is stored in integer cents; share quantities are fractional. Rounding remainders are assigned to the final asset so a transaction’s allocation always equals its amount. A full withdrawal can close a holding below $1. The model is for demonstration, not financial accounting infrastructure.

Community publishing is **only in the current browser**, not a shared network. Admin mode is a **local demonstration without authentication**, not a security boundary. Clearing browser storage clears the demo. Concurrent tabs use last-write-wins storage; this is not a transactional backend. A production investment platform would need authenticated shared services and financial integrations outside this MVP.

## Validation

Actual checks completed on the production export:

| Check | Result |
| --- | --- |
| Production build | Passed |
| TypeScript strict typecheck | Passed |
| Model tests | 12 passed |
| Chromium interaction checks | 16 passed, 0 failed |
| Automated accessibility | 0 violations on six routes and the investment dialog, for the selected WCAG A/AA rules |
| Responsive overflow | Passed on six routes at 320, 390, 768, 1024, 1440px |
| Pinned taste@1 probe | 16/16 passed |
| 390px first screen | Product, primary action, and featured vault visible |
| Native WebKit/Safari | Not performed: WebKit could not launch with the available browser runtime |

Browser tests are in `tests/browser.mjs`; they serve `dist/` at a subpath and close their server/browser on completion. Optional test tooling stays outside the repository:

```sh
npm install --prefix /tmp/cryptovault-browser-tools playwright@1.58.2 @axe-core/playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/cryptovault-test-browsers \
  node /tmp/cryptovault-browser-tools/node_modules/playwright/cli.js install chromium webkit
PLAYWRIGHT_BROWSERS_PATH=/tmp/cryptovault-test-browsers \
  node tests/browser.mjs /tmp/cryptovault-browser-tools
```

The pinned design probe was run with an explicitly supplied Playwright module and browser directory:

```sh
IMD_PLAYWRIGHT=/tmp/cryptovault-toolchain/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/cryptovault-browsers \
  node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

The `.imd/reads` reference inputs are removed from the submitted repository; the command documents the actual assignment check, rather than a script guaranteed to remain available after delivery. Compact results and final screenshots are retained in `artifacts/`. Scratch output is disposable and is not required to build.

No physical-device, screen-reader, Firefox, native browser zoom, or native Safari verification is claimed. The text enlargement check changes the root font to 200%; it is distinct from native zoom. Automated scans are not a comprehensive accessibility certification. See `artifacts/validation.md` for coverage, reproduced findings, repairs, and remaining limits. `DESIGN.md` documents the final design tokens and components.

## Static hosting

Upload **the contents of `dist/`** to a static host. `index.html` must be at the site root (or the intended subpath). Do not upload source, tests, or dependency trees as the website. The export is also suitable for the assignment’s static publisher.

The deployment result, including any public URL and provider limitations, is recorded in `artifacts/deployment.md`. A local preview URL is not a public deployment.

## Assets and attribution

The share image is an original code-rendered composition; its generator is `scripts/render-share.mjs`. To regenerate it with the optional browser toolchain, run `node scripts/render-share.mjs /tmp/cryptovault-browser-tools` with the browser directory configured as above, then rebuild.

Inter is distributed under the SIL Open Font License in `public/fonts/LICENSE.txt`. Interface icons are inline SVG paths in `src/components.tsx`. Design-reference attribution and notices are retained in `docs/licenses/design-guidance.txt` and `DESIGN.md`.
