# CryptoVault design system

## Overview

CryptoVault is a browser-local crypto investment simulator. Its visual idea is a quiet portfolio workspace: a near-black canvas, warm neutral panels, precise charts, and one lime action color. The landing page introduces the product alongside a usable featured vault; task pages prioritize controls and account information.

The implementation is in `src/styles.css`, `src/components.tsx`, and `src/App.tsx`. The reference direction was premium, minimalist fintech; the sidebar, restrained surfaces, and chart-led layouts are implementation choices.

## Colors

`src/styles.css:8` defines the neutral primitives and the semantic aliases used throughout the interface. Colors use sRGB hex values.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--bg` | `#101210` | Page background |
| `--surface` | `#151815` | Sidebar, cards, dialogs |
| `--surface-raised` | `#1b1f1a` | Secondary controls and notices |
| `--hover` | `#232822` | Hover and selected neutral surfaces |
| `--border` | `#32382f` | Structural separators and input borders |
| `--text` | `#f0f2ec` | Primary text |
| `--muted` | `#a4aca0` | Descriptions and supporting labels |
| `--accent`, `--focus` | `#c5f277` | Primary buttons, brand, keyboard focus |
| `--accent-hover` | `#b3e45f` | Primary hover and press |
| `--on-accent` | `#18210f` | Text on primary buttons |
| `--positive` | `#8ad9ad` | Positive returns, accompanied by signs/arrows |
| `--negative` | `#f3a3a3` | Negative returns and errors |

Asset colors are defined in `ASSETS` in `src/model.ts`. Orange identifies BTC, periwinkle ETH, violet SOL, blue LINK, coral AVAX, and pink UNI. Allocation lists always include asset names and percentages, so color is supplementary.

Rendered measurements: muted text on the page is **8.05:1**; muted text on a panel is **7.66:1**; primary button text on lime is **12.94:1**. These pairs were measured from browser-computed colors. Other checked text passed the probe and automated accessibility scan; this does not certify every possible color combination.

## Typography

Inter is self-hosted in `public/fonts/inter-latin.woff2`, with Arial and sans-serif fallbacks. It is a variable font, declared for weights 100–900; the application uses **400 and 600**. The font license is beside the font. Browser font loading was checked.

The six-size scale is `--text-xs` 12px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 20px, `--text-xl` 32px, and `--text-display` 56px, all expressed in rem at the 16px default root size. The display size belongs to the desktop homepage headline; it becomes 32px below 1240px. Task-page titles use 32px, section headings 20px, and labels 12–14px. Mobile inputs remain at least 16px.

Body line height is 1.5; descriptions use 1.6–1.8 where appropriate. Heading line height is 1.2, with the display headline at 1.08. Display tracking is −0.06em, page titles −0.04em, and smaller headings −0.025em or −0.015em. Headings balance their lines; prose uses pretty wrapping. Monetary values use tabular numerals. Critical values are allowed to wrap instead of being ellipsized. The featured vault title, card links, holding links, transaction names, and confirmation paragraphs use `overflow-wrap: anywhere` so the full accepted 50-character name stays readable, including an unbroken name.

## Layout

Spacing uses recurring 4, 8, 12, 16, 20, 24, 28, 32, and 42px steps. Inline gutters are shared across the top bar, main content, and footer. Directional spacing uses logical CSS properties.

- Desktop: a 228px sidebar and a main container up to 1440px wide, with 42px inline padding. The homepage pairs copy and a chart; vault cards form three columns.
- At 1240px: the sidebar becomes 208px, gutters 28px, the headline becomes 32px, and dense form layouts simplify.
- At 1000px: the sidebar becomes 190px, hero content stacks, vault cards use two columns, and detail/creator layouts use one column. The homepage shows two featured cards at intermediate widths; the full catalog remains in Explore.
- At 720px: the sidebar is replaced by a labeled menu control. The menu appears in normal flow. Main gutters are 20px, portfolio statistics use two columns, and headings/actions wrap. The top bar can grow when text is enlarged.
- At 550px: vault cards use one column. At 359px: gutters are 16px and small-screen forms stack further.

Grid children that contain controls use `min-width: 0`. Text containers inside `.row` and direct holding-grid children also use `min-width: 0` so long vault names can shrink and wrap. The sidebar can scroll on short windows. Allocations wrap under text enlargement. Responsive overflow checks passed on six routes at 320, 390, 768, 1024, and 1440px. Revision checks also verified 50 uppercase W characters in community and official vaults at 320, 390, and 1440px, including both transaction dialog states. The homepage was also checked with 200% CSS text enlargement. This was not a browser-native zoom test.

## Elevation & Depth

The interface uses tonal separation and 1px borders, without card shadows. Cards are not nested inside other cards. A native modal dialog uses a translucent black backdrop with 4px blur; this is the only strong elevation treatment. Toasts sit at stacking level 20, above page chrome; dialogs use the browser top layer.

## Shapes

`--radius` is 14px for panels and vault cards. `--control-radius` is 8px for buttons and inputs. Native dialogs have a 20px radius, badges 5px, and vault marks 13px or 16px. Coins and avatars are circular. Allocation bars use short rounded segments and contain no text.

## Components

Reusable components live in `src/components.tsx`:

- `Icon`, `Logo`, `VaultIcon`, `Coin`, and `CoinStack` provide one consistent SVG/asset vocabulary. Decorative icons are hidden from assistive technology. Coin stacks have an image role and a descriptive allocation label.
- `VaultCard` links its title to a dedicated hash route and shows a labeled example return, chart, asset composition, and risk category. Hover changes only the border color.
- `Chart` renders a local SVG line/area graph with a textual accessible summary. `values` displays account history; `value` creates explicitly illustrative vault history. Flat series are centered. No market-data request is made.
- `AllocationBar` is a labeled graphic; `AllocationList` supplies names, symbols, and percentage values. `Return` includes a signed value and directional icon.
- `Stat` provides a label/value/detail hierarchy. `Empty` supplies a named state, explanation, and recovery action.
- `Modal` uses native `dialog.showModal()`, an accessible title, explicit Tab cycling, Escape dismissal, initial focus, and trigger focus restoration. Transaction success focuses the updated dialog heading.

Patterns in `src/App.tsx` include:

- `.button.primary` for the principal action, `.secondary` for alternatives, `.ghost` for low-emphasis actions, and `.danger` for resetting local data. Buttons have at least 44px height. Icon buttons have accessible names.
- `.field`, native labels, inputs, selects, and textareas. Creator name errors appear immediately below the name input; allocation errors appear immediately above the allocation editor. One conditional `#creator-error` retains `role="alert"` and the fields' `aria-describedby` relationships. Failed submission focuses the relevant input on the next animation frame, after the error changes the layout. The preview contains the submit action and no detached error message.
- Vault category buttons expose `aria-pressed`; period controls do the same. Navigation uses real hash links and `aria-current`.
- Local transaction dialogs move from editable form to success. Operations are synchronous, so there is no fabricated loading state. Disabled withdrawals and simulations explain prerequisites in surrounding text.
- The creator supports numeric and slider allocations, adding/removing assets, equal splitting, a live total, and an allocation preview.

Focus uses a 2px lime outline with 4px offset. The primary action’s visible keyboard ring was inspected at 390px. Forced-color styles retain system focus colors. Hover treatments apply only on hover-capable devices. Transitions name individual properties and last 150ms; press scaling uses 0.96. Motion runs only under `prefers-reduced-motion: no-preference`.

## Do’s and don’ts

- Start a new task page with `.page-heading`, then reuse `.panel`, `.section-heading`, and the existing field/button patterns.
- Name the task in the heading: Explore uses “Explore crypto vaults,” the community creator uses “Create a crypto vault,” and the portfolio uses “Your demo portfolio.” Their supporting lines explain comparison, 100% allocations, and virtual holdings respectively.
- Reuse the six-size scale and semantic color tokens. Keep a single main action visually prominent.
- Keep demo labels adjacent to balances, returns, and transaction confirmations. Preserve the browser-local publishing/admin explanation.
- Use actual anchors for routes and actual buttons for actions. Keep all money and allocation validation in `src/model.ts`.
- Do not introduce live-data claims, real payment actions, additional fonts, card shadows, or decorative motion without a product need.

Design guidance: Jakub Krehel’s Better Interface, MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus’s Impeccable, Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. This document describes the implemented CryptoVault system; combined license notices are in `docs/licenses/design-guidance.txt`.
