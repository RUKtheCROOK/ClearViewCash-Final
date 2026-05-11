# FRICTION.md — Mobile Navigation audit

An honest pass on where mobile navigation feels awkward, slow, or inconsistent. Findings are tagged by severity:

- **S1** — Blocks or noticeably slows a primary flow. Fix first.
- **S2** — Real friction users will feel, even if they finish the task.
- **S3** — Polish & consistency drift. Cumulative effect on "feels uneven."

The target vibe (trustworthy, calm, modern — confidence of a banking app, warmth of a wellness app) is the lens used throughout. Nothing here recommends a rewrite of working screens; each item is scoped to nav-level polish or a single primitive.

---

## Status — what's already moved (as of this pass)

The nav-level items below are partly addressed on the current branch — captured here so the doc doesn't lie about reality. Findings remain in place for history; the implementation is in [(tabs)/_layout.tsx](apps/mobile/app/(tabs)/_layout.tsx).

- **#1 Tab-bar consolidation** — bar is now **5 tabs** (Home / Accounts / Activity / Plan / You). Bills, Income, Budgets, Goals, Forecast, Reports moved behind a new **Plan hub** ([(tabs)/plan.tsx](apps/mobile/app/(tabs)/plan.tsx)).
- **#5 Settings reachable from tab bar** — new **You** tab routes straight to `/settings` ([(tabs)/you.tsx](apps/mobile/app/(tabs)/you.tsx) + tabPress intercept).
- **#6 Detail stacks dismissing the tab bar** — `income` and `reports` are now nested inside `(tabs)/` ([(tabs)/income/_layout.tsx](apps/mobile/app/(tabs)/income/_layout.tsx), [(tabs)/reports/_layout.tsx](apps/mobile/app/(tabs)/reports/_layout.tsx)), so the bar persists while inside them. `settings` is still root-level by design.
- **#11 Sub-44pt tab cells** — bar height is now `68` with `fontSize: 11.5` label; five cells at ~78pt wide each clear the accessibility floor.
- **#7 Long-press affordance** — [TxRow.tsx](apps/mobile/components/activity/TxRow.tsx) now renders a trailing `•••` button that fires the same action menu as long-press. Hidden gesture is no longer the only path.

Items #2 (add-transaction parity), #3 (gem dual-role), #4 (header weight), #8–#10 (sheet/header primitives), #12–#16 (gating, hero check, onboarding, deep links, loading/empty) are still open.

---

# Reports — focused audit (2026-05-11)

A polish pass over the Reports flow only: [(tabs)/reports/index.tsx](apps/mobile/app/(tabs)/reports/index.tsx) (hub), [(tabs)/reports/[kind].tsx](apps/mobile/app/(tabs)/reports/[kind].tsx) (detail), and [components/reports/*](apps/mobile/components/reports/). Severity tags as above (S1 blocks · S2 friction · S3 polish). Items prefixed `R` so they don't collide with the nav-level numbering further down.

## S1 — Blocks the flow

### R1. The "More" button on the report detail header is a ghost
[[kind].tsx:356-368](apps/mobile/app/(tabs)/reports/[kind].tsx#L356-L368)

A 36pt circular Pressable with three-dot `MoreIcon` ([reportGlyphs.tsx:100-108](apps/mobile/components/reports/reportGlyphs.tsx#L100-L108)) sits beside the working Back and Share buttons. It has **no `onPress`**. Users tap and get silent failure — visually identical to a broken app, exactly the "trust hit" the calm/banking vibe target can't afford.

**Direction.** Either wire it to a real menu (Pin / Save as preset / About this report) or delete the button entirely so the header collapses to Back + Share.

### R2. Detail loading is a 13pt grey `Loading…` string
[[kind].tsx:431-443](apps/mobile/app/(tabs)/reports/[kind].tsx#L431-L443)

During the async fetch the body collapses to a small grey `Loading…` left-aligned in a card. When data arrives, the page snaps to a full dashboard — chart, insight banner, MoM compare, table. For first paint of Category / Cash Flow / Net Worth at any nontrivial date range, this is a hard visual jump with no layout reservation.

**Direction.** Skeleton scaffold shaped like the destination: donut ring outline for Category, bar-pair outline for Cash Flow, area-curve outline for Net Worth. Reserves height so nothing reflows.

### R3. The hub has no loading state at all
[(tabs)/reports/index.tsx:54-126](apps/mobile/app/(tabs)/reports/index.tsx#L54-L126)

Preview data is fetched async with no `loading` flag. The Pinned cards render with empty `previewCash` / `previewSlices` / `previewNetWorth`, which `CashflowMini` / `DonutMini` / `WideFeaturedCard` handle by drawing an `EmptyChartBox` with **"No flow yet" / "No spend yet" / "No history yet"** ([MiniCharts.tsx:18,62,101,118-131](apps/mobile/components/reports/MiniCharts.tsx#L118-L131)). So **fresh load looks like a permanently empty account**, then data pops in. A new user's first impression of Reports is "this isn't working."

**Direction.** Same skeleton primitive as R2, or a faded shimmer over the chart slot until the first response settles.

---

## S2 — Real friction

### R4. Pinned cards show a star you can't tap, in a section called "Pinned"
- [FeaturedCard.tsx:44-48](apps/mobile/components/reports/FeaturedCard.tsx#L44-L48) — `StarIcon` is `position: absolute` top-right.
- [WideFeaturedCard.tsx:89](apps/mobile/components/reports/WideFeaturedCard.tsx#L89) — same icon, inline at the title row.

Neither component accepts an `onStarPress` prop; `starred` is a static boolean on the `REPORTS` constant ([reportGlyphs.tsx:183-189](apps/mobile/components/reports/reportGlyphs.tsx#L183-L189)). The section header at [index.tsx:222-223](apps/mobile/app/(tabs)/reports/index.tsx#L222-L223) reads **"Pinned"** with a count `"3 reports"` — language that strongly implies "I pinned these / I can unpin." A user taps the star, nothing happens, they conclude the star is decorative — but they also learn the section's name is a lie.

**Direction.** Lowest-churn: rename **"Pinned" → "Featured"** and drop the star icon. Higher-churn (only if pin/unpin is a feature the owner wants): make the star a real toggle and persist via the saved-exports store or a new pref.

### R5. Star placement drifts between the two pinned card sizes
Absolute top-right on FeaturedCard, inline-trailing on WideFeaturedCard ([FeaturedCard.tsx:44-48](apps/mobile/components/reports/FeaturedCard.tsx#L44-L48), [WideFeaturedCard.tsx:63-90](apps/mobile/components/reports/WideFeaturedCard.tsx#L63-L90)). Side-by-side the two small cards feel coherent; the wide card directly below feels visually off-axis. Resolves naturally if R4 takes the rename-and-drop route.

### R6. `SOON` rows in "All reports" still navigate
[ReportRow.tsx:32-44](apps/mobile/components/reports/ReportRow.tsx#L32-L44)

`<Pressable onPress={onPress}>` has no `disabled={comingSoon}` and no opacity reduction. Tapping Income Sources or Account Activity (the two `available: false` reports at [reportGlyphs.tsx:187-188](apps/mobile/components/reports/reportGlyphs.tsx#L187-L188)) routes into the detail screen, which then renders `ComingSoonDetail` ([[kind].tsx:869-927](apps/mobile/app/(tabs)/reports/[kind].tsx#L869-L927)). It doesn't crash — it dead-ends.

**Direction.** Either (a) `disabled={comingSoon}` + `opacity: 0.55` on the row and let the badge do the work, or (b) keep the navigation and make `ComingSoonDetail` itself useful (one-line preview of what the report will show + "Notify me when it ships" CTA backed by the existing notification prefs).

### R7. `SpaceFilterPill` silently does nothing on a solo-space account
[QuickFilters.tsx:148](apps/mobile/components/reports/QuickFilters.tsx#L148)

`onPress={() => spaces.length > 1 && setOpen(true)}`. The pill still renders with the chevron, the border, the full pressable styling — but for the most common case (one space) tapping is a no-op. No disabled state, no different cursor/feel.

**Direction.** Below `spaces.length > 1`, render the pill as a non-pressable info row: drop the chevron, drop the pressable styling, keep the dot + name as a passive label so the filter strip still feels balanced next to the date pill.

### R8. Saved-export rows look tappable but aren't
[SavedExports.tsx:48-90](apps/mobile/components/reports/SavedExports.tsx#L48-L90)

Each row is a `<View>` (not `<Pressable>`) with `ShareIcon` + `ChevRightIcon` at the trailing edge. Both icons read as standard "tap to act on this row" affordances. Nothing happens on tap. This is the obvious place to re-share or re-export an old report and it's the only one in the screen that's inert.

**Direction.** Wrap the row in `<Pressable>` and wire `onPress` to re-open the system share sheet against the saved URI (the export already lives on disk per [savedExportsStore.ts](apps/mobile/components/reports/savedExportsStore.ts)). If the URI is no longer valid (cache cleared, user deleted), fall back to re-generate by reopening that report at its saved range and format.

### R9. Footer "Back to reports" duplicates the header back arrow and competes with "Export"
[[kind].tsx:461-497](apps/mobile/app/(tabs)/reports/[kind].tsx#L461-L497)

Two 50pt buttons, equal width, equal weight (one filled, one outlined). The header already owns back-nav via the chevron at [[kind].tsx:303-316](apps/mobile/app/(tabs)/reports/[kind].tsx#L303-L316). Two ways to do the same thing, and the footer pair dilutes the visual claim of Export — the only verb that's unique to this page.

**Direction.** Drop the footer back button. Promote Export to full-width primary. If the user wants a real secondary slot later, "Save as preset" is the natural candidate.

### R10. Net-worth methodology footnote is buried below the footer
[[kind].tsx:499-513](apps/mobile/app/(tabs)/reports/[kind].tsx#L499-L513)

Rendered for `net_worth` only, *after* the Export/Back buttons — i.e. below the natural fold/finger. The disclosure ("Historical balances are reconstructed by walking transactions backward… off-platform transfers, fees, and interest accruals are not reflected") is trust-critical: a household-finance user comparing the chart against their own records needs this *before* they think the data is wrong.

**Direction.** Move directly under the AreaChart card, above the MoMCompare row — anchored to the thing it's describing.

---

## S3 — Polish & consistency drift

### R11. `fmtMoneyShort` doesn't actually abbreviate
[Num.tsx:21-24](apps/mobile/components/reports/Num.tsx#L21-L24)

`fmtMoneyShort` truncates cents — `$1,234,567.89 → "$1,234,568"` — but doesn't K/M-suffix anything. The name implies it does. Used in tight spots: FeaturedCard meta, WideFeaturedCard 22pt hero, MoMCompare cells, donut center label, AreaChart hero, BarChart hero. For values ≥ $10K the cards visibly tighten; for ≥ $1M they squeeze.

**Direction.** Add a real `fmtMoneyAbbrev` (`$1.2M`, `$12K`, `$846`) and swap it in at the three or four callsites that actually clip — leave the rest untouched.

### R12. Hub title and detail title don't feel like the same page
- Hub: 28pt page title, no eyebrow ([index.tsx:166-187](apps/mobile/app/(tabs)/reports/index.tsx#L166-L187)).
- Detail: 17pt title with a 9.5pt `{CATEGORY} REPORT` eyebrow ([[kind].tsx:317-340](apps/mobile/app/(tabs)/reports/[kind].tsx#L317-L340)).

Defensible individually (hub is a landing, detail is squeezed by the Back/Share/More cluster), but the eyebrow+small-title combo doesn't appear elsewhere in Reports or, from a brief look, elsewhere on mobile. The page reads as a different design system once you drill in.

**Direction.** 20–22pt detail title without the category eyebrow. Calmer, closer to a banking app's "this is one thing" treatment.

### R13. Granularity chips disappear silently on Category reports
[[kind].tsx:393-425](apps/mobile/app/(tabs)/reports/[kind].tsx#L393-L425)

The Day / Week / Month chip strip renders only when `meta.kind !== "category"`. On Category the slot just collapses — the chart shifts up ~46pt, and there's no signal to the user that Category is a single-period view by design. New users will infer "the granularity selector is broken on this report" before they infer "Category doesn't have one."

**Direction.** Hold the slot. On Category, render a thin one-line meta-row in the same spot: e.g. `"Single period · tap a slice to drill in"`. Layout stays put across report types.

### R14. Filters + granularity push the chart below the fold on small phones
Header ~58pt + DateRangePill/SpaceFilterPill row ~70pt + granularity chips ~46pt + chart card padding ~18pt = chart starts roughly **190pt** down. On iPhone SE / Mini (568pt content height), the chart's center value is below first paint.

**Direction.** Collapse range + space into a single compact chip row (~44pt). Move granularity inline on the chart card's header strip. Saves ~70pt; lifts the hero into the fold.

### R15. Empty-state copy drifts across the three full charts
[DonutChart.tsx], [BarChart.tsx], [AreaChart.tsx] each have their own empty-state Text rendering. The hub minis share `EmptyChartBox` in [MiniCharts.tsx:118-131](apps/mobile/components/reports/MiniCharts.tsx#L118-L131); the detail charts don't reuse it.

**Direction.** Promote `EmptyChartBox` to a shared `EmptyChart` primitive that all five chart components consume. One source of truth for copy tone, type sizes, and tinted background.

### R16. Same report shows different meta on hub card vs hub row
[index.tsx:234,246](apps/mobile/app/(tabs)/reports/index.tsx#L234-L246) and [index.tsx:317-332](apps/mobile/app/(tabs)/reports/index.tsx#L317-L332):

- Cash Flow card says `"Monthly · 6 mo"`, the row in "All reports" says `"Monthly · 12 mo"`.
- Net Worth card has no meta line, the row says `"Year to date"`.
- Income row says `"YTD"`; Account Activity row says `"This month"`.

These strings are written in two places with no shared source. "YTD" vs "Year to date" on the same screen is the giveaway.

**Direction.** One `defaultMetaLabel(kind)` helper alongside `REPORTS` in [reportGlyphs.tsx](apps/mobile/components/reports/reportGlyphs.tsx). Both the FeaturedCard `meta` prop and the ReportRow `meta` prop pull from it.

---

## Working well — preserve in the polish pass

- **Donut drill-down with two-way row binding.** Tap a slice in [DonutChart.tsx](apps/mobile/components/reports/DonutChart.tsx) → other slices dim, [CategoryDataTable.tsx](apps/mobile/components/reports/CategoryDataTable.tsx) row at the same `focusedId` gets `palette.sunken` background. Tap the row, the chart focuses back. Clean, intuitive, hard to design — easy to break with a careless refactor.
- **InsightBanner** ([[kind].tsx:604-617](apps/mobile/app/(tabs)/reports/[kind].tsx#L604-L617)) period-over-period nudge for the largest mover. The warmth-via-helpfulness this vibe target is asking for, and the only place Reports actually feels like a finance *coach* rather than a data viewer.
- **ReportIcon hue system** ([reportGlyphs.tsx:218-250](apps/mobile/components/reports/reportGlyphs.tsx#L218-L250)) — tinted disc + tinted glyph from a single hue value, coherent across hub Pinned, hub list, and detail eyebrow. The cleanest visual primitive in the folder.

---

## Suggested order for the next pass (recommendation, not a decision)

1. **R1** (delete or wire More), **R8** (saved-export rows tappable), **R6** (`SOON` disabled) — three small `onPress` / `disabled` fixes that remove three trust hits.
2. **R2 + R3** — single skeleton primitive serves both hub and detail. Largest perceived-quality win for the smallest code surface.
3. **R4 / R5** as a pair — rename "Pinned" → "Featured", drop the star, alignment becomes moot.
4. **R9 + R10** — footer cleanup + footnote relocation on the detail page. Both are one-block edits to [[kind].tsx](apps/mobile/app/(tabs)/reports/[kind].tsx).
5. **R7** — solo-space pill goes passive.
6. **R16** — meta source-of-truth helper (~5 lines).
7. **R11–R15** — polish bundle, pick up as time allows.

Every item is scoped to a single component or a single screen block. Nothing here proposes rewriting a working screen.

---

## S1 — Blocking / hurts core flow

### 1. The 9-tab bottom bar is overcrowded
[(tabs)/_layout.tsx:14-24](apps/mobile/app/(tabs)/_layout.tsx#L14-L24) · [(tabs)/_layout.tsx:45-48](apps/mobile/app/(tabs)/_layout.tsx#L45-L48)

Nine fixed tabs on a ~390pt-wide phone gives each tab roughly **43pt of horizontal real estate**. The label is set to **`fontSize: 10`** — below iOS's effective minimum (11pt) and well under Material's 12sp. Combined with a 60pt bar height (≈48–52pt visible after safe-area insets), each cell is **below Apple's 44×44pt accessibility minimum**.

Concrete consequences:
- Labels are not comfortably legible at default Dynamic Type, and become unreadable at larger settings.
- Users can't recall positions across 9 cells, so every visit becomes a *read* operation rather than a *recognize* one.
- Two of the nine (Forecast, Reports) are **Pro-gated** — a free user pays the cognitive cost of two tabs that just show an upsell.
- The bar competes visually with screen content, undercutting the "calm" target.

Apple HIG caps tab bars at 5; Material recommends 3–5. Peer finance apps (Monarch, Copilot, YNAB) ship with 4–5.

**Direction (not yet implemented).** Likely consolidation: ~5 primary tabs — for example **Home / Accounts / Activity / Plan / You** — with Income, Budgets, Goals, Forecast, Reports surfaced inside their natural home (Plan hub, or as Dashboard modules that link to detail). Owner decides which differentiators must stay at the bar.

### 2. "Add transaction" is hidden behind the gem icon
[SpaceHeader.tsx:91-104](apps/mobile/components/SpaceHeader.tsx#L91-L104) · [SpaceHeader.tsx:216-224](apps/mobile/components/SpaceHeader.tsx#L216-L224)

Add-transaction is one of the most frequent verbs in any finance app. Today it lives behind **gem icon → QuickActionsMenu → "Add transaction"** — a 3-tap path, behind an icon most users read as "premium" not "create." Meanwhile Bills, Income, Budgets, and Goals each have a screen-header **"+"** that adds new records in **1 tap**.

So the same conceptual verb has two different UX patterns depending on the tab, and the most-used one is the slowest.

**Direction.** Either (a) add a plain **"+"** to the Activity screen header to mirror its siblings, or (b) introduce a single context-aware primary action (FAB or center-tab "+") usable on every tab.

---

## S2 — Real friction

### 3. The gem icon does two different things
[SpaceHeader.tsx:47-50](apps/mobile/components/SpaceHeader.tsx#L47-L50)

The same icon is **"upgrade"** for free users and **"quick actions menu"** for paid users. There is no signal the meaning changed after upgrade. Free users will tap and get an upsell; paid users tap and get a menu. Same affordance, different model.

**Direction.** Split the role. Keep gem = upgrade (and let it disappear once paid), give quick-actions a dedicated affordance (FAB / "+") that always means the same thing.

### 4. The top header is doing too much
[SpaceHeader.tsx:52-158](apps/mobile/components/SpaceHeader.tsx#L52-L158)

The sticky header packs **space pill + 3 right-side icon buttons** (gem, bell, gear) and on Dashboard/Forecast adds a 44px hero number, a sub-row of metadata, and a divider. On a phone that's **~130–180pt of chrome before screen content**.

The 3-button cluster sits at `gap: 4` ([SpaceHeader.tsx:90](apps/mobile/components/SpaceHeader.tsx#L90)) — tighter than the 8pt minimum recommended for adjacent tap targets. Mis-taps between gem/bell/gear are likely.

**Direction.** Move the gear out of the header (see #5), keep bell, repurpose gem as the single primary action. Render hero only on Dashboard — currently it renders on Forecast too ([SpaceHeader.tsx:45](apps/mobile/components/SpaceHeader.tsx#L45)).

### 5. Settings is unreachable from the tab bar
The only path to Settings is the gear icon ([SpaceHeader.tsx:144-156](apps/mobile/components/SpaceHeader.tsx#L144-L156)) — the smallest of three buttons crammed in the top-right cluster. There is no "You" or "Me" tab, which is the conventional location across iOS Settings, banking apps, and household apps.

**Direction.** A dedicated **"You" tab** (profile + subscription + spaces + settings) simultaneously fixes the gear-discoverability problem and recaptures the tab slot lost when consolidating the bar.

### 6. Detail screens (Income, Reports, Settings) live outside the tab group
[app/_layout.tsx:15-17](apps/mobile/app/_layout.tsx#L15-L17)

`income`, `reports`, and `settings` are root-level siblings of `(tabs)`. Entering any of them **dismisses the bottom tab bar**. The user loses tab orientation, loses one-tap lateral nav (e.g. Activity → Income detail → Activity), and depends on the custom back button to return.

This is most painful for Settings, which users enter frequently for notifications, profile, and space switching.

**Direction.** Nest `income/[id]` and `reports/[kind]` inside their owning tabs as stacks so the tab bar persists. Settings is debatable — keeping it modal/full-screen may be intentional for focus.

### 7. Hidden gesture — long-press to edit transactions
[components/TransactionLongPressMenu.tsx](apps/mobile/components/TransactionLongPressMenu.tsx)

The long-press menu has no visual affordance — no chevron, no "•••" trailing button, no swipe-hint state. iOS users may discover it; Android users typically won't.

**Direction.** Add a trailing "•••" / swipe-to-action with a first-encounter hint. Long-press can remain as a power-user accelerator.

---

## S3 — Polish & consistency drift

### 8. Sheet headers drift across screens
Every sheet (BillEditSheet, IncomeEditSheet, GoalEditSheet, BudgetEditSheet, TransactionEditSheet, WhatIfSheet, PaymentLinkSheet, ExportSheet, CustomizeDashboardSheet, AddIncomeWizard) ships its own header — close-button shape and position, title alignment, save-button placement and label all drift subtly. No shared `SheetHeader` primitive despite a shared icon set and theme.

**Direction.** Add `<SheetHeader title close save />` to `@cvc/ui`. One PR unifies the surface.

### 9. Sheets snap open/close with no animation
The codebase depends on `react-native-reanimated`, but sheets toggle visibility with plain `visible` booleans (e.g. [SpaceHeader.tsx:206-216](apps/mobile/components/SpaceHeader.tsx#L206-L216)). For the calm/wellness vibe the difference between a snap and a 220ms spring is material. No drag-to-dismiss handle either.

**Direction.** A shared `<BottomSheet />` built on Reanimated, with consistent spring-in / ease-out and a drag handle.

### 10. Per-screen header rows reinvent layout
Each tab's content header has the same conceptual job — page title, primary action, view toggle — but draws itself differently. The **"My View / Shared View" toggle** in particular sits in different positions across Dashboard, Accounts, and Goals, defeating muscle memory.

**Direction.** A shared `<TabPageHeader title rightAction toggle />` primitive. Locks the toggle to one location everywhere.

### 11. Tab-bar tap targets are sub-44pt
[(tabs)/_layout.tsx:37-44](apps/mobile/app/(tabs)/_layout.tsx#L37-L44)

`height: 60`, `paddingBottom: 8`, `paddingTop: 4`. With safe-area insets the visible bar is ~48–52pt. Each of 9 cells is ~43pt wide. The cell area is below 44×44pt.

Resolved as a side-effect of fix #1; called out separately so the accessibility issue is visible if the tab-count change is deferred.

### 12. Premium gating destinations are bare upsell cards
Forecast and Reports are no longer top-level tabs (resolved by the 5-tab consolidation — they live in the Plan hub now). But the destinations themselves still render a single-paragraph `<Card>` with no preview chart and no CTA button. Free users tap a Plan row that sells the value, then land on text that doesn't deliver. Detailed in the Forecast page audit below (F3).

**Direction.** Render gated destinations in "preview mode" — same layout, mock data, soft overlay, primary CTA wired to [PremiumModal](apps/mobile/components/PremiumModal.tsx).

### 13. ~~Hero may duplicate between SpaceHeader and Dashboard~~ ✅ Resolved
SpaceHeader now gates its hero on `pathname === "/dashboard"` ([SpaceHeader.tsx:44](apps/mobile/components/SpaceHeader.tsx#L44)) — it no longer renders on Forecast (or anywhere else). Verify the in-page Dashboard hero doesn't restate the same number; that's the only remaining concern.

### 14. Onboarding lands on a dense Dashboard
The 3-slide Tour ends with a hand-off to a fully-populated Dashboard. A first-time user — especially pre-Plaid sync — sees a wall of zeroed modules. No guided "first action" (add your first bill, set a goal) to soften the cliff.

**Direction.** A lightweight empty-state CTA strip on Dashboard for fresh accounts.

### 15. Deep-link landing does not preserve user intent
[app/accept-invite.tsx](apps/mobile/app/accept-invite.tsx) is root-level. After accepting an invite, where does the user go — Dashboard? Spaces settings? Worth verifying the redirect targets *the new space's Dashboard*, since that's the most likely intent of someone who just joined a household.

### 16. Loading and empty states are inconsistent
No shared `<Skeleton />` or `<EmptyState />` on mobile. Each tab handles loading differently — opacity fade, text placeholder, nothing at all. Per-screen friction is small but the cumulative effect is "this app feels uneven," which directly undermines the trustworthy/calm vibe.

**Direction.** Two small primitives in `@cvc/ui` and a search-and-replace pass.

---

## Goals page

A focused audit of [(tabs)/goals/index.tsx](apps/mobile/app/(tabs)/goals/index.tsx) and its surrounding components. Same severity scale (S1 / S2 / S3) as above. Goals is one of the screens where the "wellness warmth" half of the target vibe has the most to gain — it's the page where the user names hopes and watches progress.

**Status:** 17 of 20 items fully resolved this pass. G3, G4, G16 are partially resolved — each is unblocked once the corresponding shared primitive (native date picker dep, `<Skeleton />`, `<BottomSheet />`) lands from the nav-level backlog.

### S1 — Blocking / hurts core flow

#### ~~G1. No way to add money to a goal~~ ✅ Resolved
Mobile now has [AddMoneySheet.tsx](apps/mobile/components/AddMoneySheet.tsx) opened from the new goal detail screen ([(tabs)/goals/[id].tsx](apps/mobile/app/(tabs)/goals/[id].tsx)). Amount + optional note + date (with Today/Yesterday quick-pick). Save calls `createTransaction` ([mutations.ts:300-335](packages/api-client/src/mutations.ts#L300-L335)) with the correct sign (`+` for save, `-` for payoff) tied to the linked account. Disabled-state CTA shows when no linked account, with a one-tap path back to Edit. Success haptic on save.

#### ~~G2. Tapping a goal opens an edit form, not a detail view~~ ✅ Resolved
`goals.tsx` is now a stack: [(tabs)/goals/_layout.tsx](apps/mobile/app/(tabs)/goals/_layout.tsx) + [index.tsx](apps/mobile/app/(tabs)/goals/index.tsx) + [[id].tsx](apps/mobile/app/(tabs)/goals/[id].tsx). Card tap pushes to detail (`router.push({ pathname: "/goals/[id]", params: { id } })`). The detail screen renders a 196pt progress arc with the goal glyph at center, a stats strip (saved / target date / monthly), a projection pill, primary Add Money / Log Payment CTA, recent contributions list (last 6, sign-filtered), share-with chips, and an Edit shortcut in the header. Read-only shared goals show a banner explaining the state.

#### ⚠ G3. Target date is a free-form "YYYY-MM-DD" text input — *partial*
Mobile still uses a `TextInput` (no `@react-native-community/datetimepicker` dep installed yet). What landed: numeric keyboard, on-blur ISO validation with inline field error, and quick-pick chips (3 mo / 6 mo / 1 yr / 2 yr) in both [GoalEditSheet.tsx](apps/mobile/components/GoalEditSheet.tsx) and [AddMoneySheet.tsx](apps/mobile/components/AddMoneySheet.tsx) (Today / Yesterday). One-tap selection covers the common case; the native picker is a clean follow-up dep add.

### S2 — Real friction

#### ⚠ G4. Loading shows the empty state, not a skeleton — *partial*
The flash is gone — `loaded` boolean in [goals/index.tsx](apps/mobile/app/(tabs)/goals/index.tsx) gates the body so the empty pitch never renders for users with data. Stays as "partial" because the audit's stronger spec was *card-shaped skeletons during load*; that wants the shared `<Skeleton />` primitive from nav-audit #16, not a one-off here.

#### ~~G5. Two redundant "create" affordances~~ ✅ Resolved
Empty-state button is gone; the card pitch now ends with "Tap **+** above to start your first." Header FAB is the single primary create action. The dashed `AddGoalCard` below the list is kept (different scroll position, different role).

#### ~~G6. Backdrop-tap silently discards typed input~~ ✅ Resolved
`GoalEditSheet` compares current form state to an initial-snapshot ref. Backdrop tap, hardware back, and the X button all route through `attemptClose`, which fires `Alert.alert("Discard changes?", …)` when the form is dirty. Clean close also after a successful save (snapshot updates).

#### ~~G7. Validation is bottom-of-sheet only, on submit~~ ✅ Resolved
Per-field `validateName` / `validateTarget` / `validateApr` / `validateTargetDate` run on blur; errors render inline under each `Field`. The submit-time error line remains for server failures.

#### ~~G8. Space-pill cycles silently with no menu~~ ✅ Resolved
Header pill on Goals now opens [SpaceSwitcherSheet](apps/mobile/components/SpaceSwitcherSheet.tsx) — same primitive used everywhere else.

#### ~~G9. Sharing UX takes three taps and lives in a surprising place~~ ✅ Resolved
The below-card `ShareControls` UI is deleted from the list. Sharing now lives in two more discoverable places: a `ShareField` chips row inside `GoalEditSheet` when editing an owned goal, and a "Share with" section on the goal detail screen. Both haptic on tap.

#### ~~G10. Card border-radius drifts within the screen~~ ✅ Resolved
Standardized on 14px: `GoalCard` ([GoalCard.tsx:58](apps/mobile/components/goals/GoalCard.tsx#L58)), empty card, error banner — all 14. Matches the sheet's input shells.

### S3 — Polish & consistency drift

#### ~~G11. JustReachedBanner only celebrates one goal~~ ✅ Resolved
`reachedCards` (plural, `.filter` not `.find`) stacks one banner per `done` goal. Banner "View" pushes to the detail screen instead of opening the edit form.

#### ~~G12. Hero status-pill copy is functional, not warm~~ ✅ Resolved
"Needs a plan" → **"Set the pace"** in [StatusPill.tsx](apps/mobile/components/goals/StatusPill.tsx).

#### ~~G13. Aggregate strip doesn't persist on scroll~~ ✅ Resolved
Header gains a recap line under the title: `"5 goals · $4.2k saved · $250/mo"` once data loads ([goals/index.tsx](apps/mobile/app/(tabs)/goals/index.tsx)). Sticky `AggregateStrip` was the alternative; the header line carries the same anchor with less chrome.

#### ~~G14. No haptics on key moments~~ ✅ Resolved
`expo-haptics` installed at `~14.0.0`. `selectionAsync` on FAB tap, share toggles, date quick-picks, contribution date chips, and card navigation. `notificationAsync(Success)` on goal save and contribution save. `notificationAsync(Warning)` on delete.

#### ~~G15. FAB is flat against the page~~ ✅ Resolved
FAB now ships a soft brand-tinted shadow (iOS `shadowOpacity: 0.18`, Android `elevation: 3`). The detail screen's primary CTA mirrors the same elevation for consistency.

#### ⚠ G16. Sheet uses RN `Modal` slide; no drag handle, no spring — *partial*
Both `GoalEditSheet` and `AddMoneySheet` now render a drag-handle bar at the top edge (matching `SpaceSwitcherSheet`'s pattern). They still use the platform `Modal` slide animation and don't support swipe-to-dismiss — that's tied to the shared `<BottomSheet />` primitive from nav-audit #9.

#### ~~G17. Empty-state copy is warm; field-label copy is clinical~~ ✅ Resolved
All sheet field labels are sentence case: "Name", "Target", "Target date", "Link a savings account", "Starting balance", "APR %", "Target balance", "Payoff by", "Share with", "Amount", "Date", "Note". "STEP 1 OF 2" → "Step 1 of 2". "COMMON STARTS" → "Common starts". `Field` component drops the monospace caps style entirely.

#### ~~G18. APR is silently optional on payoff goals~~ ✅ Resolved
APR field now shows the hint *"Add APR for an accurate payoff projection."* whenever the field is empty.

#### ~~G19. Card progress-bar color doesn't match the status pill~~ ✅ Resolved
`statusTone(palette, status)` exported from [StatusPill.tsx](apps/mobile/components/goals/StatusPill.tsx) is the single source of truth. `GoalCard` consumes it for the pill, the progress bar, and the projection pill — all three match for any given status.

#### ~~G20. "by Jul 2025 · 2 wk early" row has no hierarchy~~ ✅ Resolved
Date demoted to 11pt / `ink4`. Projection moved into a tinted pill on the right (background from `statusTone`, foreground from `statusTone`, fontMedium 11.5pt). Date is now reference; projection is the headline.

---

## Suggested ordering for the next pass

This is **a recommendation, not a decision** — final priorities belong to the owner.

1. **S1: tab-bar consolidation (#1) + "+" parity (#2)** — biggest perceived win, foundational for everything else (frees a slot, sets the FAB pattern).
2. **S2: header simplification (#4) + "You" tab (#5) + gem split (#3)** — done together once #1 lands.
3. **S2: nest detail stacks (#6)** — small router refactor, big context win.
4. **S2: long-press affordance (#7)** — one component touch.
5. **S3: SheetHeader (#8) → BottomSheet (#9) → TabPageHeader (#10)** — three small primitives, large consistency dividend.
6. **S3: gating UX (#12), hero check (#13), empty/loading primitives (#16), onboarding cliff (#14), deep-link redirect (#15)** — pick up in any order.

Quality over churn: every item is scoped to a single primitive or a single router file. None require rewriting a working screen.

---

# Accounts page — deep dive

A pass scoped to the Accounts tab and the screens reachable in 1–2 taps from it: [(tabs)/accounts.tsx](apps/mobile/app/(tabs)/accounts.tsx), [AccountsTitleBlock.tsx](apps/mobile/components/accounts/AccountsTitleBlock.tsx), [AccountCard.tsx](apps/mobile/components/accounts/AccountCard.tsx), [SectionHead.tsx](apps/mobile/components/accounts/SectionHead.tsx), [EmptyLinksCallout.tsx](apps/mobile/components/accounts/EmptyLinksCallout.tsx), [PaymentLinkSheet.tsx](apps/mobile/components/accounts/PaymentLinkSheet.tsx), [settings/account/[id].tsx](apps/mobile/app/settings/account/[id].tsx), [settings/account-share.tsx](apps/mobile/app/settings/account-share.tsx).

Everything here works. The audit looks for missing affordances, awkward transitions, and small consistency drift on this single surface. Severity ladder is the same (`S1` / `S2` / `S3`); items are tagged `AC#` so they don't collide with the nav or Activity numbering.

## S1 — Blocking / hurts core flow

### AC1. Account detail lives in the Settings stack — tapping a row dismisses the tab bar
[(tabs)/accounts.tsx:261-262](apps/mobile/app/(tabs)/accounts.tsx#L261-L262)

Every account tap routes to `/settings/account/[id]`. Per nav-audit #6, root-level `settings/` dismisses the bottom tab bar. So the most common verb on this screen — "see one account" — drops the user out of the Accounts tab entirely, loses lateral nav, and forces a custom-back-button return.

On Accounts, tapping a row *is* the primary action. The pattern affects every reconnect drill-down and every "Activity → Account → back to Activity" hop. The cost compounds with use, which is why this is S1 on this surface even though #6 was S2 broadly.

**Direction.** Mirror the detail page at `(tabs)/accounts/[id].tsx` (Expo Router nested stack) so the tab bar persists. Keep the settings copy as a deep-link alias, or remove it. Same router refactor as #6 — but for Accounts specifically it unlocks one-tap lateral nav back to the list.

### AC2. Sync errors are not surfaced page-level — only buried per-card
[(tabs)/accounts.tsx:200-202](apps/mobile/app/(tabs)/accounts.tsx#L200-L202) · [AccountCard.tsx:179-188](apps/mobile/components/accounts/AccountCard.tsx#L179-L188) · [AccountCard.tsx:257-279](apps/mobile/components/accounts/AccountCard.tsx#L257-L279)

The error indicator is a **10.5pt uppercase "RECONNECT"** label in the top-right of an individual card. The "Reconnect bank" CTA only renders **inside** the affected card.

If a user has 6 accounts and one Plaid item broke overnight, balances on the affected accounts are stale — but the page doesn't say so. The user scans summary totals at [AccountsTitleBlock.tsx:82-102](apps/mobile/components/accounts/AccountsTitleBlock.tsx#L82-L102) ("$X total cash") with no indication that one institution hasn't synced. For a banking-grade vibe, **silently stale totals is the failure mode that breaks trust the fastest**.

**Direction.** When any item is in error, show a single inline banner at the top of the list ("1 institution needs reconnecting — Wells Fargo"). One tap triggers `reconnect()` for that item — same call as today at [(tabs)/accounts.tsx:271-308](apps/mobile/app/(tabs)/accounts.tsx#L271-L308). The per-card chip can stay as the secondary signal.

## S2 — Real friction

### AC3. "Add bank" vs. "Link account" — same header, two different verbs for adjacent concepts
[AccountsTitleBlock.tsx:45-80](apps/mobile/components/accounts/AccountsTitleBlock.tsx#L45-L80)

Two buttons sit next to each other:
- A 36×36 circular **"+"** (`onAddBank` → opens Plaid)
- A brand-filled pill **"Link account"** (`onLinkAccount` → opens `PaymentLinkSheet`)

"Add bank" creates a Plaid connection. "Link account" creates a payment-link mapping between a card and a funder. The labels invert the user's likely mental model — most users would assume "Link account" is the Plaid step (linking a bank account, like every other bank app). The branded pill — the *louder* affordance — is the rarer, more advanced action.

**Direction.** Rename to match the verb hierarchy. Suggestion: keep the "+" for Plaid (most common, fast), demote the pill to a less-prominent secondary action labelled **"Pay a card from cash"** or **"Link card to funding"** — language that names the outcome, not the data model. The pill should not outweigh the primary action visually.

### AC4. Empty state is one line of muted text — undermines the trust-building moment
[(tabs)/accounts.tsx:374-382](apps/mobile/app/(tabs)/accounts.tsx#L374-L382)

A single muted `<Text>`: *"No accounts yet. Tap + Add bank to connect one."* Peer tabs (Income, Budgets) ship dedicated `EmptyState` components with illustration, quick-start cards, and primary + secondary CTA. Accounts gets one sentence. A first-time user who has cleared onboarding lands here on day 2 with nothing to look at, and the screen reads as broken.

The shared-view empty case is worse: *"Nothing shared into this space yet. Open an account to share it."* — no button to switch to "My View", no link to the account list. The user is told what they don't have, not given a path.

**Direction.** Either (a) port the `EmptyState` pattern from [apps/mobile/components/income/EmptyState.tsx](apps/mobile/components/income/EmptyState.tsx) into Accounts with a "Link your first account" CTA, or (b) extract a shared `<EmptyState />` primitive (nav-audit #16) and adopt it here. For the shared-view variant, add a "Switch to My View" pressable that calls `useApp.getState().toggleView()`.

### AC5. Effective Available appears on cards without a label, definition, or affordance to learn
[(tabs)/accounts.tsx:252-253](apps/mobile/app/(tabs)/accounts.tsx#L252-L253) · [AccountCard.tsx:244-254](apps/mobile/components/accounts/AccountCard.tsx#L244-L254)

`effectiveAvailableCents` renders inside a sunken row labelled simply **"Effective available"**. The number only shows when it differs from raw balance, which means the user encounters it abruptly when they happen to have a payment link set up. There is no info-tap, no tooltip, no definition.

This is one of the app's named *core differentiators* (SCREENS.md "Core differentiators" #1). It deserves a real moment of explanation. Today it appears as an unexplained second number on some cards — exactly the kind of detail that erodes the calm/trustworthy vibe because it reads as inconsistent.

**Direction.** Make the "Effective available" label tappable (small `i` icon, or whole row pressable) that opens a one-paragraph explainer sheet. Same explainer can be reused on the Dashboard hero, the Funding card, and Forecast — single source of truth for one of the app's headline concepts.

### AC6. "Funding coverage" lives on Dashboard but Accounts is the only place to act on it
[(tabs)/accounts.tsx:384-392](apps/mobile/app/(tabs)/accounts.tsx#L384-L392)

The Funding Coverage card on Dashboard is read-only — no CTA pointing to Accounts. A user who sees "Card balance not covered" has no obvious next step; they must remember the Accounts tab exists, switch to it, find the credit card, tap "Link account", and pick funders.

Meanwhile `EmptyLinksCallout` renders only when **no** payment links exist at all. As soon as one card is linked, the callout disappears for everyone — including users whose *other* cards are uncovered.

**Direction.** Two small surgeries:
- Add a "Manage in Accounts" trailing chevron to the Dashboard funding card. One file edit.
- Replace the all-or-nothing callout logic with per-card status. When a credit card has no payment link, show a thin "Not linked — Set up coverage" affordance on *that* card. Less prominent than the dashed callout, but visible on every uncovered card instead of vanishing after the first link.

### AC7. Sharing an account is 4 taps away and dismisses the tab bar

Sharing path: Accounts tab → tap card → settings stack opens (tab bar gone) → scroll to Sharing → tap "Manage sharing" → land on [settings/account-share.tsx](apps/mobile/app/settings/account-share.tsx) → custom-back twice to return.

Sharing is one of the app's named differentiators (SCREENS.md "Core differentiators" #2). 4 taps + lost orientation + custom-back-return is too much for a headline feature.

**Direction.** When AC1 lands (account detail nested in Accounts stack), this drops to 3 taps with tab bar intact — already a meaningful win. Optionally add a long-press / swipe-trailing "Share" action on the account row for the 1-tap path.

### AC8. Pull-to-refresh is missing on a screen whose entire value is "is this up to date?"
[(tabs)/accounts.tsx:101-152](apps/mobile/app/(tabs)/accounts.tsx#L101-L152)

The page loads on mount and reloads only when `reloadCount` bumps (reconnect, link saved). No pull-to-refresh, no sync button. If a user just paid a credit card from another app and wants to see the balance move, they must background the app and reopen it.

Low-cost fix that aligns the screen with user expectation on every other finance app.

**Direction.** Wrap the `ScrollView` in a `RefreshControl` that bumps `reloadCount`. On refresh, also kick off a Plaid sync for connected items (same edge function endpoint used by reconnect).

## S3 — Polish & consistency drift

### AC9. Header pattern drifts from every other tab
[AccountsTitleBlock.tsx](apps/mobile/components/accounts/AccountsTitleBlock.tsx)

`AccountsTitleBlock` is bespoke: 30pt title, two-button row *below* the title, summary metadata row beneath that, wash background with bottom edge. Sibling tabs:
- Bills ([(tabs)/bills.tsx:256-275](apps/mobile/app/(tabs)/bills.tsx#L256-L275)) — inline `<View>`, title left, 38×38 circular "+" right.
- Goals ([(tabs)/goals.tsx:212-291](apps/mobile/app/(tabs)/goals.tsx#L212-L291)) — same pattern, with the My/Shared pill toggle inline in the header row.
- Activity ([(tabs)/transactions.tsx:306-331](apps/mobile/app/(tabs)/transactions.tsx#L306-L331)) — inline `<View>`, search icon right.

Accounts is the only tab whose header is taller, whose primary actions sit *below* the title, and whose summary metadata is in the chrome rather than the page body. The already-noted `TabPageHeader` gap (nav-audit #10) hits hardest here.

**Direction.** Either (a) defer to #10's shared `<TabPageHeader />` primitive when it lands, or (b) flatten `AccountsTitleBlock` now: title row + right-side actions, summary metadata moved to a slim row underneath, drop the wash background.

### AC10. Scope toggle position drifts within the Accounts page itself, and across tabs
[(tabs)/accounts.tsx:341-361](apps/mobile/app/(tabs)/accounts.tsx#L341-L361) · [(tabs)/goals.tsx:249-272](apps/mobile/app/(tabs)/goals.tsx#L249-L272)

Goals puts the My/Shared toggle inside the header row, beside the "+". Accounts puts it in its own dedicated row 14pt below the title block. Same control, two locations, two paddings. Already inside nav-audit #10; called out separately because Accounts is the most visible example.

### AC11. Section headers are a fourth variant of the same idea

[SectionHead.tsx](apps/mobile/components/accounts/SectionHead.tsx) (Accounts), `GroupHeader.tsx` (Bills — with a coloured dot), `DateGroupHeader.tsx` (Activity — transparent), `GroupLabel` (Budgets). All do the same job (uppercase eyebrow + optional caption/total), at different paddings, with different decoration. No shared primitive.

**Direction.** Single `<SectionHead eyebrow caption trailingAmount? />` in `@cvc/ui`. Lift to all four tabs. One PR, large consistency dividend. (Part of #10's family.)

### AC12. PaymentLinkSheet has no drag handle and no close affordance
[(tabs)/accounts.tsx:397-417](apps/mobile/app/(tabs)/accounts.tsx#L397-L417)

The 4-step wizard (card → funders → splits → scope) is the most multi-step sheet in the app. Per nav-audit #9 it snaps rather than animates. Dismissing it mid-flow requires the in-sheet back button or tapping the overlay. With no drag-down handle, users on step 3 who change their mind have no quick exit.

**Direction.** Adopt the shared `<BottomSheet />` (#9) with a drag handle and an explicit "Cancel" affordance in the sheet header (#8). Until those land, add an "X" close button to the wizard header.

### AC13. Step 4 ("Cross-space") of the payment-link wizard is unexplained

The scope step asks for a boolean — this space only, or cross-space — without explaining what cross-space means or who sees the link if enabled. For a household-finance app where mistaken sharing is a real fear, an unlabelled toggle on a sharing question is the wrong default.

**Direction.** Add one line of helper text per option. ("This space only — link is visible to members of *Family*." / "Cross-space — link applies wherever this card appears in any of your spaces.") Match the language already used in [settings/account-share.tsx](apps/mobile/app/settings/account-share.tsx).

### AC14. Color picker is a hex text input
[settings/account/[id].tsx](apps/mobile/app/settings/account/[id].tsx)

The customize-card form accepts a freeform hex string for account color. Placeholder hints `#0EA5E9`. Most users do not know hex. The 40×40 swatch preview helps, but a non-technical user is asked to invent a colour by typing it.

**Direction.** Replace with a small swatch row (8–10 brand-aligned options) + an "Other…" affordance that opens a colour picker. Reuses the `palette` tokens already in [packages/ui](packages/ui).

### AC15. EmptyLinksCallout is heavyweight but only fires on a narrow condition
[EmptyLinksCallout.tsx](apps/mobile/components/accounts/EmptyLinksCallout.tsx)

A dashed-border card with brand icon, two paragraphs, and two CTAs — but it only renders when `cardCandidates.length > 0 && funderCandidates.length > 0 && !hasAnyLinks`. The moment one link exists, it disappears forever, even if 5 other cards are uncovered. Lots of visual weight for a sometimes-only nudge.

**Direction.** Either down-rank to a lighter weight (subtitle + small button, no dashed card) and keep it visible until coverage is meaningful, or lift the per-card "Set up coverage" affordance from AC6 and delete this callout entirely. Don't ship both.

## Suggested ordering for the Accounts polish pass

This is a recommendation, not a decision — owner picks.

1. **AC2** (sync banner) — trust-critical and a half-day of work; do first.
2. **AC1** (nest detail in Accounts stack) — small router refactor; unlocks AC7.
3. **AC3** (verb labels) + **AC5** (Effective Available explainer) — pure copy + one info sheet.
4. **AC4** (empty state) — port the Income/Budgets pattern.
5. **AC8** (pull-to-refresh) — tiny diff, big UX win.
6. **AC6** (Dashboard → Accounts link + per-card coverage hint) — replaces AC15.
7. **AC9–AC12** — consume the shared primitives (`TabPageHeader`, `SectionHead`, `BottomSheet`) as they ship in the nav pass.
8. **AC13** (cross-space helper text) + **AC14** (swatch picker) — owner-flavour copy + tiny form change.

Quality over churn: every Accounts-page item is scoped to one file or one component. None require rewriting the screen.

---

# Activity page — deep dive

A pass scoped to the Transactions tab and its supporting parts: [(tabs)/transactions.tsx](apps/mobile/app/(tabs)/transactions.tsx), [components/activity/TxRow.tsx](apps/mobile/components/activity/TxRow.tsx), [FilterChipRail.tsx](apps/mobile/components/activity/FilterChipRail.tsx), [ExpandedFilters.tsx](apps/mobile/components/activity/ExpandedFilters.tsx), [DateGroup.tsx](apps/mobile/components/activity/DateGroup.tsx), [TransactionDetailSheet.tsx](apps/mobile/components/TransactionDetailSheet.tsx), [TransactionsChartSection.tsx](apps/mobile/components/TransactionsChartSection.tsx).

Everything here works. The audit looks for missing affordances, awkward transitions, and small consistency drift on this single surface. Findings use the same severity ladder (`S1` / `S2` / `S3`) and are tagged `A#` so they don't collide with the nav-audit numbering above.

## S1 — Blocking / hurts core flow

### A1. No "Add transaction" affordance on the page
[transactions.tsx:298-388](apps/mobile/app/(tabs)/transactions.tsx#L298-L388)

The Activity tab is the natural home for the most-frequent verb in any finance app, but the screen header has **no "+" button** — neither inline in the title row nor as a FAB. The only path is gem → QuickActionsMenu → "Add transaction" in [SpaceHeader.tsx](apps/mobile/components/SpaceHeader.tsx). Bills, Income, Budgets, and Goals each ship an inline "+" — Activity is the outlier. Same conceptual point as nav-audit #2, but anchored to this surface.

**Direction.** Add a plain "+" next to the "Activity" H1 — or commit to the FAB pattern across all list tabs.

### A2. Empty state flashes during the initial fetch
[transactions.tsx:77-86](apps/mobile/app/(tabs)/transactions.tsx#L77-L86) · [transactions.tsx:396-403](apps/mobile/app/(tabs)/transactions.tsx#L396-L403)

`txns` initializes as `[]`. `getTransactionsForView` runs inside `useEffect`, so on first paint **the empty branch renders** — "No transactions match your filters." — until the network round-trip completes. There is no `isLoading` flag, skeleton, or spinner. On a slow network this reads as "the app has nothing to show me," directly undermining the trustworthy/banking vibe.

**Direction.** A `loading` state on first fetch (and on filter changes that trigger a refetch). Either a `<TxRow.Skeleton />` × 6 shimmer or a centered subtle "Loading transactions…" — pick one and use it everywhere.

### A3. No pull-to-refresh
[transactions.tsx:299](apps/mobile/app/(tabs)/transactions.tsx#L299)

The list is a `ScrollView` with no `RefreshControl`. The user has no manual way to force a refresh — they rely on the focus-driven `reloadCount` cycle or a full app restart. Table-stakes in any list-based finance app, and especially expected after manually marking a transaction recurring or hiding it.

**Direction.** Add `<RefreshControl />` (or migrate to `FlatList`/`SectionList` per A6 and add it there). Bumping `reloadCount` is the one-line refresh handler.

## S2 — Real friction

### A4. The "All" chip doesn't mean "all"
[transactions.tsx:57](apps/mobile/app/(tabs)/transactions.tsx#L57) · [transactions.tsx:190-196](apps/mobile/app/(tabs)/transactions.tsx#L190-L196)

Default `dateRange` is `"30d"`. The rail's "All" chip becomes "active" when every other filter is at default — but the list is still date-clamped to 30 days. There is no visible "Last 30 days" indicator. A user who taps "All" expecting their full history sees the same view and concludes the chip is broken.

**Direction.** Either rename the chip ("Reset filters"), include a small "Last 30 days" date pill next to the H1, or default `dateRange` to `"all"` so the label is honest.

### A5. The empty state is generic
[transactions.tsx:396-403](apps/mobile/app/(tabs)/transactions.tsx#L396-L403)

Same string — "No transactions match your filters" — covers three distinct cases:
1. Fresh user with no Plaid connection (zero transactions ever exist).
2. Real account with data, but filters exclude everything.
3. Shared view with nothing shared in (covered slightly differently, but still a filter framing).

A first-time user with no bank linked deserves "Link a bank to see transactions" with a CTA into onboarding, not a message that implies their filters are at fault.

**Direction.** Branch the empty state: `txns.length === 0 && activeFilterCount === 0` → onboarding nudge; otherwise → "Adjust filters" / "Reset filters" with a tap-target.

### A6. ScrollView renders all 200 rows up front
[transactions.tsx:82](apps/mobile/app/(tabs)/transactions.tsx#L82) · [transactions.tsx:299-469](apps/mobile/app/(tabs)/transactions.tsx#L299-L469)

`getTransactionsForView` caps at `200`. The screen renders them in a `ScrollView`, not a `FlatList` or `SectionList` — so every row mounts at once, and every filter toggle re-renders the entire tree. Noticeable hitch on mid-tier Android, especially on filter chip taps. The chart section above also re-renders on every filter change.

**Direction.** Migrate to `SectionList` keyed by `group.key`, with `keyExtractor`, `getItemLayout`, and stable `renderItem`. Falls naturally into the same pattern Bills already uses.

### A7. The 200-row truncation is silent
[transactions.tsx:82](apps/mobile/app/(tabs)/transactions.tsx#L82)

There is no "showing the most recent 200" banner and no "load older" button. Users with longer histories silently lose visibility once they slip past the limit — and the "All time" date range doesn't actually mean "all transactions," it means "all transactions within the most recent 200."

**Direction.** Either page (offset cursor + footer "Show older") or surface a footer note when `txns.length === 200`.

### A8. Search has no inline clear (×) button
[transactions.tsx:333-360](apps/mobile/app/(tabs)/transactions.tsx#L333-L360)

Once the user types, the only way to empty the field is the keyboard backspace or the native keyboard X. Every search-with-filter screen on iOS / Android puts a small × on the trailing edge of the input. Without it, switching between two search terms is two-handed and slow.

**Direction.** Render an `<I.x />` Pressable on the right when `search.length > 0` that calls `setSearch("")`. ~6 lines.

### A9. Active-filter count is computed but never shown
[transactions.tsx:181-188](apps/mobile/app/(tabs)/transactions.tsx#L181-L188)

`activeFilterCount` is calculated and used only to drive chip color states. Nothing visible tells the user "you have 3 filters on" — they have to remember what they tapped. Compounds A4, because the user can't easily tell whether the list they see is filtered or default.

**Direction.** Surface the count on the "More"/"Filters" chip as a small numeric badge, mirroring the count on the Pending chip. One JSX block.

### A10. No per-filter remove (×) in the chip rail or expanded panel
[ExpandedFilters.tsx:155-187](apps/mobile/components/activity/ExpandedFilters.tsx#L155-L187)

The expanded panel has a "Reset" button that nukes everything. A user who wants to drop "Food" but keep "Last 30 days + Checking account" has to toggle-back-off the one they don't want. Common pattern: an active chip shows a small × the user can tap; expanded-panel groups show an "all" reset per group.

**Direction.** Add a Reset-section-only control next to each `FilterGroup` label, or render active chips in the rail with an inline ×.

## S3 — Polish & consistency drift

### A11. Pending state has three competing indicators
[TxRow.tsx:41-64](apps/mobile/components/activity/TxRow.tsx#L41-L64) · [TxRow.tsx:75-82](apps/mobile/components/activity/TxRow.tsx#L75-L82) · [TxRow.tsx:130-144](apps/mobile/components/activity/TxRow.tsx#L130-L144)

Pending rows render with **all three** of: italic merchant name, an uppercase "PENDING" pill in the metadata row, and a 2pt-wide stitched stripe at `left: 4` in `palette.ink4`. The stripe is too subtle to read at a glance, and the italic + pill already carry the signal. Three indicators for one state feels noisy.

**Direction.** Keep the pill (most legible) and italic; drop the stripe — or strengthen the stripe (3pt, on-brand ink2) and drop the pill. The current half-measure on the stripe reads as a rendering bug.

### A12. Sticky header is heavy and the H1 duplicates the tab label
[transactions.tsx:305-388](apps/mobile/app/(tabs)/transactions.tsx#L305-L388) · [transactions.tsx:306-317](apps/mobile/app/(tabs)/transactions.tsx#L306-L317)

The sticky block is: 28pt H1 + sub-label + search bar + chip rail + (optionally) the entire `ExpandedFilters` panel. On a 5.4" phone with `ExpandedFilters` open, the actual transactions can land below the fold. The 28pt "Activity" title duplicates the bottom-tab label the user just tapped to get here — banking apps typically drop the page title or shrink it to 17pt when tab name = page name.

**Direction.** Drop the H1 (or downsize to 17pt left-aligned), keep the sub-label as a small "view" indicator near the chip rail. Frees ~36pt vertically.

### A13. "Apply · N results" doesn't apply anything
[ExpandedFilters.tsx:155-170](apps/mobile/components/activity/ExpandedFilters.tsx#L155-L170)

Filters update live as the user toggles chips — the button only collapses the panel. The "Apply" label implies a commit step that isn't happening. Users may hesitate to toggle, expecting an explicit submit.

**Direction.** Rename to "Done" or "Show N results." Same handler.

### A14. The "More" chip label changes width when active
[transactions.tsx:210-216](apps/mobile/app/(tabs)/transactions.tsx#L210-L216)

`"More"` ↔ `"Hide filters"` is a >2× width swing, which causes the chip-rail to jitter on toggle. Small but noticeable, and reads as unfinished.

**Direction.** Keep a fixed label (e.g. "Filters") and rotate a chevron 180° to indicate open state.

### A15. `DateGroupHeader` says "1 txn" — never pluralized
[DateGroup.tsx:36-40](apps/mobile/components/activity/DateGroup.tsx#L36-L40)

`{count} txn` reads "1 txn", "5 txn", "12 txn" — never pluralized, and "txn" as an abbreviation feels engineery rather than calm. Inconsistent with "results" used in the Apply button below.

**Direction.** "1 transaction" / "5 transactions" — or, given the column width, just drop the noun and show the count alone.

### A16. No running balance / "Available" reference on the page
[transactions.tsx:298-469](apps/mobile/app/(tabs)/transactions.tsx#L298-L469)

A user scanning charges naturally wants to know "after this one cleared, what's left?" Effective Available Cash is one of the app's **core differentiators** per [SCREENS.md](SCREENS.md) — but it lives only on Home and Forecast, not on the screen where it's most actionable. The user has to leave Activity and come back.

**Direction.** A compact strip under the H1 / sub-label: "Cleared $X · Pending $Y · Available $Z" — read-only, three numbers, no chrome. Reinforces the differentiator without adding navigation.

### A17. Chart section sits between sticky filters and the list with no collapse
[transactions.tsx:390-394](apps/mobile/app/(tabs)/transactions.tsx#L390-L394) · [TransactionsChartSection.tsx](apps/mobile/components/TransactionsChartSection.tsx)

`TransactionsChartSection` renders for non-starter tiers whenever `filtered.length > 0`. It pushes the first transaction below the fold every time, with no collapse toggle or remember-the-state setting. Users in "review my charges" mode have to scroll past it on every visit.

**Direction.** Either a small collapse handle (persisted in `useApp` store) or move the chart to the very top of the Reports detail and link to it from a slim summary strip on Activity.

### A18. Long-press at 350ms competes with scroll
[TxRow.tsx:28](apps/mobile/components/activity/TxRow.tsx#L28)

`delayLongPress={350}` is on the aggressive side — users who pause briefly while scrolling can trigger the LongPressMenu by accident. The trailing `•••` is the explicit affordance, so long-press is redundant; 500ms is safer, or remove the gesture entirely on the row and keep it only on the `•••`.

**Direction.** Bump to 500ms, or `onLongPress` only on the `•••` button hit-area.

### A19. No haptics on filter toggles, chip selection, or row tap
[FilterChipRail.tsx:36-50](apps/mobile/components/activity/FilterChipRail.tsx#L36-L50) · [TxRow.tsx:24-39](apps/mobile/components/activity/TxRow.tsx#L24-L39)

`expo-haptics` isn't called anywhere on this screen. For the banking-confidence + wellness-warmth vibe, a soft `Haptics.selectionAsync()` on chip toggle and a light `impactAsync(Light)` on row tap is the cheapest "this feels premium" win in the app.

**Direction.** Wrap chip `onPress` and row `onTap`/`onLongPress` with the appropriate haptic call. ~10 lines, all in `transactions.tsx`.

## Suggested ordering for the Activity polish pass

This is a recommendation, not a decision — owner picks.

1. **A1 + A2 + A3** — the three S1 items, each tiny, all noticeable. Cover the most-glaring "feels broken on first launch" gaps in one PR.
2. **A4 + A9 + A8 + A10** — bundle the filter-clarity cleanup. Small surface, big legibility win.
3. **A6** — `SectionList` migration. One file, real perf payoff, opens the door for A3's `RefreshControl` and A7's load-more footer in the same component.
4. **A5 + A7** — real empty / truncation states.
5. **A11–A19** — polish; do together or piecemeal. A16 (running balance strip) and A19 (haptics) move the trust-and-warmth needle the most for their cost.

Quality over churn: every Activity-page item is scoped to one file or one component. None require rewriting the screen.

---

# Settings page — deep dive

The Settings stack is functionally complete (15 screens) and uses a small atoms file ([components/settings/SettingsAtoms.tsx](apps/mobile/components/settings/SettingsAtoms.tsx)) for `Row`, `Group`, `SectionLabel`, `Toggle`, `ToggleRow`, `PageHeader`, `Channel`, `ProChip`, and `IconDisc`. The atoms are good — they're just not used consistently, and a handful of friction points slip through where the atoms don't cover the case.

Severity tags follow the convention above (S1 / S2 / S3). Each item cites a path:line and gives a one-line *Direction* — these are pointers for the next pass, not implementations.

## S1 — Blocking / hurts core flow

### S1-1. Sign-out has no confirmation
[settings/index.tsx:209-225](apps/mobile/app/settings/index.tsx#L209-L225)

A single tap on a red-text button signs the user out and `router.replace`s to `/(auth)/sign-in`. There is no `Alert`, no second-step state, and no toast on the way out. For a banking-vibe app, sign-out should require a confirm. The pattern already exists one screen over — [security.tsx:69-92](apps/mobile/app/settings/security.tsx#L69-L92) uses an `Alert.alert` with a destructive button for "Disable two-factor auth," which is a less consequential action.

**Direction.** Add a one-button `Alert.alert("Sign out?", ...)` confirmation. Match the destructive-button pattern from `security.tsx`.

### S1-2. 2FA enrollment shows the raw `otpauth://` URI as selectable text — no QR code
[security.tsx:141-147](apps/mobile/app/settings/security.tsx#L141-L147)

The user is told "Scan in your authenticator" but rendered an 80+ character URI in a monospace block. There is no QR. On the same device they're enrolling on, scanning is impossible — the only path is copy-paste of the embedded secret into a separate authenticator app, which is brittle and error-prone. This breaks the strongest security recommendation the app makes, *while* the screen is also promoting 2FA as the recommended action.

**Direction.** Render a QR with `react-native-qrcode-svg` (or equivalent) above the URI block; keep the URI as a selectable fallback and add a "Copy secret" button beside it.

### S1-3. The "You" tab is a bare redirect that dismisses its own tab bar
[(tabs)/you.tsx:3](apps/mobile/app/(tabs)/you.tsx#L3)

`you.tsx` is `<Redirect href="/settings" />`. The tab also intercepts `tabPress` in [(tabs)/_layout.tsx:61-67](apps/mobile/app/(tabs)/_layout.tsx#L61-L67) to push `/settings` directly. Because Settings is a root-level stack (outside `(tabs)`), entering it dismisses the bottom tab bar. The user taps "You," loses the tab bar in the same animation frame, and the back affordance is `router.back()` to the *previous* tab — never "back to You." Tapping a tab and instantly losing the tab bar feels broken.

**Direction.** Either (a) make `you.tsx` a real screen — profile preview + tier chip + sign-out + "Open settings →" — that keeps the tab bar; Settings stays a push from there. Or (b) nest the `settings/` stack inside `(tabs)/you/` so the tab bar persists through the drill-down. Option (a) is lighter and recoups the "You" slot's purpose.

---

## S2 — Real friction

### S2-4. Settings forms silently discard unsaved changes on back
[account/[id].tsx](apps/mobile/app/settings/account/[id].tsx) · [profile.tsx:90-126](apps/mobile/app/settings/profile.tsx#L90-L126) · [spaces.tsx](apps/mobile/app/settings/spaces.tsx) rename / color modals

Editing display name, account color/icon, or space rename and then tapping back (or the modal's Cancel button) silently drops the changes. No dirty-state diff, no "Discard changes?" prompt. Banking apps treat data entry as a commitment; a calm warning is part of the trust signal.

**Direction.** A shared `useDirtyGuard()` hook in [components/settings/](apps/mobile/components/settings/) that tracks `isDirty` and intercepts `router.back()` + modal Cancel with a one-line `Alert.alert("Discard changes?", ...)`. One hook, three screens.

### S2-5. Sign-out button looks like a benign secondary action
[settings/index.tsx:208-225](apps/mobile/app/settings/index.tsx#L208-L225)

The button uses `palette.surface` + `palette.line` border — exactly the same chrome as the inert profile card and 2FA promo above. The only destructive signal is `palette.neg` on the text. At a glance it reads as "More options." The danger isn't communicated until the user actually parses the word.

**Direction.** Add a left-aligned `signOut` icon disc tinted `palette.negTint`, or swap the border to a low-opacity red. Don't go fully red-filled — that would clash with the calm vibe.

### S2-6. The promoted 2FA card is duplicated verbatim across two screens
[settings/index.tsx:126-166](apps/mobile/app/settings/index.tsx#L126-L166) and [security.tsx:100-127](apps/mobile/app/settings/security.tsx#L100-L127)

Same `warnTint` container, same hard-coded oklch border expression, same shield icon disc, same copy structure. Any tone change has to be made twice. The atoms file already hosts the pattern's siblings (`Row`, `Group`); this one snuck out.

**Direction.** Extract `<PromotedCard glyph title body onPress? />` into [SettingsAtoms.tsx](apps/mobile/components/settings/SettingsAtoms.tsx). Both call sites collapse to four lines.

### S2-7. Connected-detail account selection uses a one-off checkbox style
[connected/[id].tsx:124-163](apps/mobile/app/settings/connected/[id].tsx#L124-L163)

Custom 22×22 filled/unfilled boxes with inline check glyphs. Everywhere else in the app a binary state on a row is a `Toggle` (right side, pill shape, [SettingsAtoms.tsx:52-87](apps/mobile/components/settings/SettingsAtoms.tsx#L52-L87)). Two patterns for "is this row on?" trains the user twice, and the checkbox style breaks the rhythm of every other Settings list.

**Direction.** Either add a `CheckRow` atom (a `Row` variant whose `right` slot is a circular check), or convert the select-accounts list to multi-select using the existing `Toggle`. Either way, one binary-state primitive in Settings.

### S2-8. Profile card on the hub is a hand-rolled row
[settings/index.tsx:78-123](apps/mobile/app/settings/index.tsx#L78-L123) vs [SettingsAtoms.tsx:147-211](apps/mobile/components/settings/SettingsAtoms.tsx#L147-L211)

Padding `14`, avatar `56` with hard-coded `oklch(85% 0.060 30)` background and matching `oklch(30% ...)` text, manual chevron. The canonical `<Row>` uses `paddingHorizontal: 18, paddingVertical: 12` and an `IconDisc`. The drift is visible — vertical rhythm jumps between the profile card and the ACCOUNT group right below it.

**Direction.** Promote this to a `<ProfileRow>` atom that internally renders a larger avatar but inherits the Row's padding and chevron behavior. Or parameterize `Row` with `size?: "default" | "lg"`.

### S2-9. Subscription row buries renewal context
[settings/index.tsx:181](apps/mobile/app/settings/index.tsx#L181)

`value={tierLabel(tier)}` shows `"Pro · $9.99/mo"` — informative, but a user who's worried about being charged wants "Renews May 28" or "Manage billing →." The current label is a status, not a next step, and the row's chevron implies a destination but the value implies "you're here."

**Direction.** Append a renewal date (or "Manage") to the row's `sub` when tier is paid. Keep "Free" as-is.

### S2-10. Sign-out and account-deletion drop the user with no transition
[settings/index.tsx:62-63](apps/mobile/app/settings/index.tsx#L62-L63) and [delete-account.tsx:33-34](apps/mobile/app/settings/delete-account.tsx#L33-L34)

`router.replace("/(auth)/sign-in")` is instant. No fade, no toast, no "Signed out." For two of the most consequential actions in the app, the lack of acknowledgment reads as if something went wrong.

**Direction.** A brief toast (or one-frame `Alert`) before `replace`, or replace the instant transition with a `push` to a tiny "Signed out" interstitial that auto-dismisses after 600ms.

---

## S3 — Polish & consistency drift

### S3-11. Hard-coded oklch expressions outside the palette
[settings/index.tsx:99](apps/mobile/app/settings/index.tsx#L99) · [index.tsx:104](apps/mobile/app/settings/index.tsx#L104) · [index.tsx:136](apps/mobile/app/settings/index.tsx#L136) · [security.tsx:108](apps/mobile/app/settings/security.tsx#L108)

The hub avatar uses `"oklch(85% 0.060 30)"` / `"oklch(30% 0.060 30)"` directly. The warn-card border uses `mode === "dark" ? "oklch(40% 0.080 65)" : "oklch(88% 0.040 65)"` — and that exact expression is *repeated* in two files. Dark-mode handling is bolted on inline rather than encoded in the palette.

**Direction.** Add `palette.warnLine`, `palette.profileTint`, `palette.profileInk` (light/dark variants in the palette factory). Replace the literals.

### S3-12. Hub vs sub-screen header offset drifts
[settings/index.tsx:73](apps/mobile/app/settings/index.tsx#L73) vs [SettingsAtoms.tsx:268-307](apps/mobile/components/settings/SettingsAtoms.tsx#L268-L307)

The hub adds `paddingTop: 50` on the ScrollView before its `PageHeader`; every sub-screen uses the default (the `PageHeader` itself adds `paddingTop: 14`). Result: title height drift on entry to a sub-screen — the title visibly hops up the screen as you drill in.

**Direction.** Bake `paddingTop` into `PageHeader` (with a `compact?` flag for sub-screens if needed) or remove the 50 from the hub.

### S3-13. Settings sheets are raw `Modal`s with no shared chrome
[profile.tsx:90](apps/mobile/app/settings/profile.tsx#L90) (rename) · [spaces.tsx:661-787](apps/mobile/app/settings/spaces.tsx#L661-L787) (create / rename / color / invite)

Each modal defines its own header row, its own Cancel/Save shape (height varies 40–48, radius 10–12), its own fade animation. Confirms the unresolved #8 in the main audit: still no shared `SheetHeader` primitive.

**Direction.** Add `<SheetHeader title close save />` to `@cvc/ui`. Five sheets in Settings collapse to one shape; sheets elsewhere in the app benefit too.

### S3-14. Spacing magic numbers — 14 and 18
[Row paddingHorizontal: 18, paddingVertical: 12](apps/mobile/components/settings/SettingsAtoms.tsx#L167-L168) vs profile card `padding: 14` and PageHeader `paddingHorizontal: 16, paddingTop: 14`

Neither 14 nor 18 maps to the 4pt grid in `space` tokens (s4=16, s5=20). The atoms have one convention; the hub's hand-rolled rows pick a different one. Pick one and tokenize.

**Direction.** A single pass that swaps literal paddings for `space.s4` / `space.s3` and updates the token doc. Cheap, removes the worst micro-drift in the stack.

### S3-15. Loading is plain "Loading…" text inside rows
[settings/index.tsx:68](apps/mobile/app/settings/index.tsx#L68) · [security.tsx:131-132](apps/mobile/app/settings/security.tsx#L131-L132) · [connected/index.tsx](apps/mobile/app/settings/connected/index.tsx)

Each row shows raw text while async fetches resolve. Echoes the broader #16 in the main audit; Settings is the worst offender because it shows three of them on the hub alone (2FA status, Plaid count, biometrics availability).

**Direction.** A minimal `<RowSkeleton />` next to `Row` in [SettingsAtoms.tsx](apps/mobile/components/settings/SettingsAtoms.tsx) — three skeleton bars matching glyph / title / sub. One primitive, three call sites.

---

## Suggested ordering for the Settings polish pass

This is a recommendation, not a decision — owner picks.

1. **S1-1 + S1-2** — sign-out confirm and 2FA QR. Each is a short PR; together they're the biggest perceived-trust win.
2. **S1-3** — pick a direction for the "You" tab. Both options are small router changes.
3. **S2-4** — `useDirtyGuard()` hook. One hook, three forms.
4. **S2-6 + S2-8 + S2-7** — three new atoms (`PromotedCard`, `ProfileRow`, `CheckRow`). Eliminates the vast majority of the drift.
5. **S2-5 + S2-9 + S2-10** — copy and style polish. Pick up in any order.
6. **S3-11 → S3-15** — bundle into a single "Settings tokens + skeleton" PR.

Quality over churn: every Settings-page item is scoped to a single primitive, a single screen, or a token swap. None require rewriting a working screen.

---

# Income page — deep dive

Focused audit of the Income tab: [(tabs)/income/index.tsx](apps/mobile/app/(tabs)/income/index.tsx), [(tabs)/income/[id].tsx](apps/mobile/app/(tabs)/income/[id].tsx), [components/AddIncomeWizard.tsx](apps/mobile/components/AddIncomeWizard.tsx), [components/IncomeEditSheet.tsx](apps/mobile/components/IncomeEditSheet.tsx), and the income subcomponents under [components/income/](apps/mobile/components/income/).

The Income flow is in good shape already: clear hero → month strip → YTD card → variability chart, recurring vs. one-time separation, a smart recurring-detection banner that **is** dismissible and persists via AsyncStorage ([RecurringSuggestionsBanner.tsx:15](apps/mobile/components/RecurringSuggestionsBanner.tsx#L15)). This pass is drift and edge polish, not redesign. Findings use `S1 / S2 / S3` and are tagged `IN#` to avoid collisions with prior numbering.

> Stale-data flag for the nav audit (not part of this pass): item #1 above says "9-tab bottom bar." [(tabs)/_layout.tsx:14-20](apps/mobile/app/(tabs)/_layout.tsx#L14-L20) is now 5 tabs — Home · Accounts · Activity · Plan · You — with 6 routes hidden behind Plan. The consolidation #1 recommends has effectively shipped.

## S1 — Blocking / hurts core flow

### IN1. False affordance — the third "Active / Paused" pill looks like a button
[income/[id].tsx:349-361](apps/mobile/app/(tabs)/income/[id].tsx#L349-L361)

Three tinted buttons of identical weight (Edit · Pause · Active); the third is wired to `onPress={() => undefined}`. Users will tap expecting *something* and get nothing.

**Direction.** Demote to a non-pressable status badge with different visual weight, or wire to a real action.

### IN2. Empty-state "Skip" button does nothing
[income/index.tsx:209](apps/mobile/app/(tabs)/income/index.tsx#L209) · [EmptyState.tsx:175-187](apps/mobile/components/income/EmptyState.tsx#L175-L187)

Labeled "Skip — I'll add later" but `onSkip = () => undefined`. The user is already on the Income tab; nothing to skip *to*.

**Direction.** Drop the button entirely, or wire to `router.back()`.

### IN3. "Mark received" is 4–5 taps deep
[income/[id].tsx:486-497](apps/mobile/app/(tabs)/income/[id].tsx#L486-L497) · [IncomeRow.tsx](apps/mobile/components/income/IncomeRow.tsx) (no inline action)

The single most-frequent verb in the feature. Today: row → wait → Edit → scroll → toggle → save. For a biweekly paycheck that's 26× / year.

**Direction.** One-tap "Mark received" on recurring rows at/past `next_due_at` — hero CTA, row-trailing button, or "•••" menu.

## S2 — Real friction

### IN4. The Income tab rolls its own header — drops the space pill and stacks two title bars
[income/index.tsx:166-206](apps/mobile/app/(tabs)/income/index.tsx#L166-L206) · cf. [SpaceHeader.tsx](apps/mobile/components/SpaceHeader.tsx)

`SpaceHeader` is rendered by [(tabs)/_layout.tsx:29](apps/mobile/app/(tabs)/_layout.tsx#L29), so the in-screen 28pt "Income" title + circular brand FAB sit *below* SpaceHeader — two horizontal chrome bars stacked. The page loses the space pill / bell / "+" cluster used everywhere else. The 38×38 brand-colored FAB is also the only such element in the app.

**Direction.** Delete the in-screen title + FAB. Move "add income" into SpaceHeader's "+" cluster or QuickActionsMenu — see open question #2.

### IN5. One-time entries inherit the recurring detail layout
[income/[id].tsx:259-348](apps/mobile/app/(tabs)/income/[id].tsx#L259-L348)

For a one-off refund the page still shows "Next expected" framing and a Pause/Resume action that's meaningless. The variability slot sits empty.

**Direction.** Branch on `cadence === "once"`: drop Pause/Resume, replace the action bar with Edit · Delete, hide variability.

### IN6. Pluralization bugs in the countdown text
[income/[id].tsx:282](apps/mobile/app/(tabs)/income/[id].tsx#L282)

`${daysUntil} days` reads "1 days," "-1 days late," "1 days late." [IncomeRow.tsx:33-43](apps/mobile/components/income/IncomeRow.tsx#L33-L43) already handles this with "today / tomorrow / Nd overdue." Copy that.

### IN7. `paddingTop: 50` — hard-coded safe-area in three places
[income/[id].tsx:117](apps/mobile/app/(tabs)/income/[id].tsx#L117) · [income/[id].tsx:221](apps/mobile/app/(tabs)/income/[id].tsx#L221) · [AddIncomeWizard.tsx:240](apps/mobile/components/AddIncomeWizard.tsx#L240)

`SafeAreaProvider` is mounted; use `useSafeAreaInsets().top`.

### IN8. No pull-to-refresh on the Income list
[income/index.tsx:165](apps/mobile/app/(tabs)/income/index.tsx#L165)

`ScrollView` with no `refreshControl`. Same finding as Activity A3. Add `<RefreshControl />` wired to the existing `reload()` callback.

### IN9. Date entry is a plain YYYY-MM-DD `TextInput`
[AddIncomeWizard.tsx:884-902](apps/mobile/components/AddIncomeWizard.tsx#L884-L902) · same pattern in IncomeEditSheet

Non-technical users mis-type, hit "Date must be YYYY-MM-DD," and bail. Use `@react-native-community/datetimepicker` — one primitive in two places.

### IN10. "Custom" cadence has no configurator
[AddIncomeWizard.tsx:55](apps/mobile/components/AddIncomeWizard.tsx#L55)

Selecting "Custom…" leaves `cadence = "custom"` with no UI to define the pattern. Either ship the configurator or remove the row.

## S3 — Polish & consistency drift

### IN11. Three small-icon-in-row styles in one feature
`IncomeIcon` on rows ([IncomeRow.tsx:76](apps/mobile/components/income/IncomeRow.tsx#L76)), a bespoke 30×30 r8 posTint chip in the deposits list ([income/[id].tsx:425-438](apps/mobile/app/(tabs)/income/[id].tsx#L425-L438)), and `IncomeIcon` at yet a different size in EmptyState. Standardize.

### IN12. Three date formats in one feature
List rows use "today / next Wed"; detail hero uses "~Jan 14" with an unexplained tilde; deposits list uses "Jan 14, 2026." Two formats max: relative for future-facing, absolute for past events. Drop the tilde.

### IN13. Hard-coded paddings instead of theme spacing
`14, 18, 24` literals throughout the Income files instead of `theme.space.s3 / s4 / s5 / s6`.

### IN14. Back-button chevron is a hand-rolled inline SVG `<Path>` in three places
[income/[id].tsx:131-134](apps/mobile/app/(tabs)/income/[id].tsx#L131-L134) · [income/[id].tsx:231-233](apps/mobile/app/(tabs)/income/[id].tsx#L231-L233) · [AddIncomeWizard.tsx:246-253](apps/mobile/components/AddIncomeWizard.tsx#L246-L253)

`@cvc/ui/icons` has no `chevL` today. Add one and migrate the three callsites.

### IN15. Title typography drifts from the shared scale
Index title 28pt/-0.6 (lands on h2 by accident); detail hero 22pt/-0.3 (between h2 and h3). Shared scale: h1=34, h2=28, h3=20.

### IN16. Recurring / one-time lists are full-bleed top-and-bottom-bordered strips
[income/index.tsx:270-327](apps/mobile/app/(tabs)/income/index.tsx#L270-L327) — different visual family from the rest of the app's padded surface cards.

### IN17. Delete confirmation uses native `Alert.alert`
[income/[id].tsx:171-189](apps/mobile/app/(tabs)/income/[id].tsx#L171-L189) — breaks the modal-sheet pattern used everywhere else.

### IN18. Delete button buried below the deposits list
[income/[id].tsx:459-483](apps/mobile/app/(tabs)/income/[id].tsx#L459-L483) — far from where deletion is contemplated. Move into IncomeEditSheet's footer or beside Edit.

### IN19. Detail loading state is plain text "Loading…"
[income/[id].tsx:135](apps/mobile/app/(tabs)/income/[id].tsx#L135) — feels unfinished.

### IN20. IncomeRow / OneTimeRow didn't get the new `I.more` long-press affordance
TxRow gained "•••" in commit `0c810b8`. Income rows didn't. Also a natural home for IN3.

### IN21. The Income tab is hidden behind Plan
[(tabs)/_layout.tsx:22](apps/mobile/app/(tabs)/_layout.tsx#L22) — 2 taps from anywhere else. Differentiator argument is strong; cost is one tab slot. See open question #1.

## Anti-list — do NOT change

- The hero / month-strip / YTD card layout.
- `NextPaycheckHero`.
- Empty-state quick-start cards.
- Variability chart on the detail screen.
- AddIncomeWizard's 3-step structure.
- The recurring detection banner.

## Open questions for the owner

1. Should Income become a top-level tab? (IN21)
2. Should "+" in SpaceHeader become context-aware? (IN4)
3. One-time entries: branched layout in `[id].tsx` or separate route? (IN5)
4. Mark-received affordance: hero CTA, row-trailing button, or "•••" menu? (IN3, IN20)

## Suggested ordering for the Income polish pass

1. **IN1 + IN2** — both S1, both trivial. Single PR.
2. **IN6 + IN7 + IN8 + IN14** — mechanical, ship together.
3. **IN3** — depends on open-question #4.
4. **IN4** — depends on open-question #2.
5. **IN5** — depends on open-question #3.
6. **IN9** — date picker primitive in two places.
7. **IN11–IN16, IN17–IN19** — consistency sweep, 2–3 small PRs.
8. **IN10 + IN20** — product decision first.

Quality over churn: every Income-page item is scoped to one file or one component. None require rewriting a working screen.

---

# Budgets page — deep dive

A pass scoped to the Budgets surface and its supporting parts: [(tabs)/budgets.tsx](apps/mobile/app/(tabs)/budgets.tsx), [BudgetEditSheet.tsx](apps/mobile/components/BudgetEditSheet.tsx), [budgets/CategoryRow.tsx](apps/mobile/components/budgets/CategoryRow.tsx), [budgets/EmptyState.tsx](apps/mobile/components/budgets/EmptyState.tsx), [budgets/SummaryCard.tsx](apps/mobile/components/budgets/SummaryCard.tsx), [budgets/SuggestedBanner.tsx](apps/mobile/components/budgets/SuggestedBanner.tsx), [budgets/ModeToggle.tsx](apps/mobile/components/budgets/ModeToggle.tsx), [budgets/ProgressBar.tsx](apps/mobile/components/budgets/ProgressBar.tsx).

Budgets is reached via the Plan hub ([(tabs)/plan.tsx](apps/mobile/app/(tabs)/plan.tsx)). It's a hidden route inside `(tabs)/` so the tab bar persists; the global `SpaceHeader` sits above the in-page header row. Everything here works. The audit looks for missing affordances, awkward transitions, and small consistency drift on this single surface. Findings use the same severity ladder (`S1` / `S2` / `S3`) and are tagged `B#` so they don't collide with the nav-audit (#), Accounts (AC#), Activity (A#), or Settings (S1-#) numbering above.

## S1 — Blocking / hurts core flow

### B1. Empty state flashes during the initial fetch
[budgets.tsx:50-103](apps/mobile/app/(tabs)/budgets.tsx#L50-L103) · [budgets.tsx:255-256](apps/mobile/app/(tabs)/budgets.tsx#L255-L256)

`budgets` initializes as `[]`. `load()` runs in `useEffect`, so on first paint **the EmptyState renders** — "Set a calm budget for what matters," three quick-start tiles, and a 52pt "Add a budget" CTA — until the round-trip completes. A user with twelve existing budgets sees the zero-state for ~100–500ms before their list pops in. Same root cause as A2 on Activity; more visually jarring here because the wrong state is a full-page hero rather than a small empty caption.

**Direction.** Gate the EmptyState on a real `hasLoaded` flag, not on `budgets.length === 0`. Render nothing (or a skeleton — see B2) until the first response settles.

### B2. No loading state for the five-query fetch
[budgets.tsx:71-99](apps/mobile/app/(tabs)/budgets.tsx#L71-L99)

`load()` chains five awaits — budgets, categories, transactions (60-day window), income events, income receipts (90-day). While they're in flight there's no spinner, skeleton, or any indication anything is happening. On a slow network the screen sits in the EmptyState (B1) while four round-trips are still pending. Compounds the trust hit.

**Direction.** A `<CategoryRow.Skeleton />`-style placeholder × 4 underneath the summary card while the first fetch is in flight. Pairs naturally with the shared loading primitive proposed at nav-audit #16, A2, and S3-15.

### B3. No pull-to-refresh
[budgets.tsx:211](apps/mobile/app/(tabs)/budgets.tsx#L211)

The `ScrollView` has no `RefreshControl`. If the user just categorized a transaction in Activity, the budget rollup here won't reflect it until the screen unmounts and remounts. Table-stakes on any list-based finance screen, and especially expected here since the numbers are derived from transactions the user just touched. Mirrors A3 and AC8.

**Direction.** `<RefreshControl />` whose handler calls `load()`. One file, ~6 lines.

---

## S2 — Real friction

### B4. "Edit categories →" is mislabeled and redundant
[budgets.tsx:400-413](apps/mobile/app/(tabs)/budgets.tsx#L400-L413)

The text link below the last row reads **"Edit categories →"** but its `onPress` is `openCreate()` — the same action as the (+) in the header. Two CTAs, identical behaviour, but the bottom one promises a different verb (manage categories, presumably). A user looking for "where do I rename my categories?" taps it and lands in a new-budget sheet instead.

**Direction.** Either drop the link (the header (+) is enough) or wire it to a real category-management screen and rename to "Manage categories."

### B5. Delete is buried *and* unconfirmed
[CategoryRow.tsx:39](apps/mobile/components/budgets/CategoryRow.tsx#L39) · [BudgetEditSheet.tsx:156-169](apps/mobile/components/BudgetEditSheet.tsx#L156-L169) · [BudgetEditSheet.tsx:524-548](apps/mobile/components/BudgetEditSheet.tsx#L524-L548)

To delete a budget: tap row → wait for slide-up modal → scroll to bottom → tap "Remove this category." Four taps + an animation for a destructive action with **no confirmation step** — `remove()` calls `deleteBudget` immediately. Months of rollover history vanish in a single tap with no undo affordance. Same destructive-without-confirm pattern S1-1 flagged for Sign Out.

**Direction.** Either (a) add swipe-to-delete on the row with a confirmation toast / undo, or (b) keep the path inside the sheet but require a confirm dialog. The destructive button itself is fine — what's missing is reversibility.

### B6. MonthSelector renders but the page never navigates months
[budgets.tsx:63-67](apps/mobile/app/(tabs)/budgets.tsx#L63-L67) · [budgets.tsx:117-121](apps/mobile/app/(tabs)/budgets.tsx#L117-L121) · [budgets.tsx:288](apps/mobile/app/(tabs)/budgets.tsx#L288)

`<MonthSelector palette monthIdx={monthIdx} year={year} />` is rendered in monthly mode, but `monthIdx` and `year` come from `today.getUTCMonth()` / `getUTCFullYear()` — not state. The window the rest of the screen computes (`monthIso` → `eomIso`, line 117–121) is locked to "current month." Even if MonthSelector exposes prev/next chevrons, the page can't follow them. A control that looks navigable but isn't is worse than no control at all — users tap, nothing happens, and they don't trust the next thing they tap.

**Direction.** Either hoist `monthIdx`/`year` into `useState` and recompute the window when the selector changes, or replace the selector with a plain month label until pickable months are wired up.

### B7. CategoryRow has no chevron / tap affordance
[CategoryRow.tsx:30-117](apps/mobile/components/budgets/CategoryRow.tsx#L30-L117)

Rows look like info cards: icon, name, spent/limit, progress bar. Nothing on the right edge signals "this is a button." The app's two established list-row patterns disagree on the cue — [PlanRow](apps/mobile/app/(tabs)/plan.tsx#L188) uses a trailing `›`, [TxRow](apps/mobile/components/activity/TxRow.tsx) uses a trailing `•••` action button — but Budgets ships neither. Users may treat rows as read-only.

**Direction.** A trailing `›` chevron after the spent/limit column (cheap), or a `•••` if the row deserves a quick-action menu (edit / delete / pause).

### B8. SuggestedBanner has no dismiss
[SuggestedBanner.tsx:20-75](apps/mobile/components/budgets/SuggestedBanner.tsx#L20-L75)

The banner offers "Add" as the only interaction. There's no `×`, no "Not now," no swipe-to-dismiss. If the user doesn't want to budget the suggested category, the banner persists every visit until their spend pattern shifts or they give in. The intended vibe is "gentle nudge"; the actual feel is "this banner is following me." For "calm and trustworthy," the user has to be able to say no.

**Direction.** Add a trailing `×` that writes "dismissed: <category>" to `useApp` store (or a row in Supabase) so the same suggestion doesn't reappear next month.

### B9. BudgetEditSheet form order: Rollover sits above Period
[BudgetEditSheet.tsx:401-467](apps/mobile/components/BudgetEditSheet.tsx#L401-L467)

The Settings card renders **Rollover first**, **Period second**. But Period determines whether Rollover is even legal — picking `paycheck` force-disables Rollover with `opacity: 0.5` and a sentence of explanation ([line 408, 417–418](apps/mobile/components/BudgetEditSheet.tsx#L408)). The user can configure Rollover, switch to Paycheck, and silently lose that setting. Form ordering should follow the legality dependency: the field that gates other fields comes first.

**Direction.** Swap the order: Period, then Rollover (which renders enabled or disabled based on Period). Removes the silent-reset case entirely. Pairs with S2-4's broader case for not silently dropping user state.

### B10. BudgetEditSheet's Save button is under-weighted
[BudgetEditSheet.tsx:216-231](apps/mobile/components/BudgetEditSheet.tsx#L216-L231)

The Save pill is ~28pt tall, 12.5pt text, jammed top-right next to a 36pt close button. Compare to the page's other primary CTAs: EmptyState "Add a budget" is **52pt** ([EmptyState.tsx:134](apps/mobile/components/budgets/EmptyState.tsx#L134)); the destructive "Remove this category" inside the same sheet is **48pt** ([BudgetEditSheet.tsx:530](apps/mobile/components/BudgetEditSheet.tsx#L530)). The most important affirmative action on the screen looks like a secondary control — and is physically smaller than the destructive option.

**Direction.** Either (a) keep the top-right pill but match peer sheets' weight (44pt+, brand-on text), or (b) move Save to a sticky bottom button (52pt, full-width) the way EmptyState's primary works.

### B11. BudgetEditSheet uses native Modal, not a gesture-dismissible sheet
[BudgetEditSheet.tsx:172-185](apps/mobile/components/BudgetEditSheet.tsx#L172-L185)

`<Modal animationType="slide">` with a tappable backdrop. No drag handle on top, no swipe-down-to-dismiss, no spring physics. Snap open, snap closed. Same divergence flagged at nav-audit #9, AC12, and S3-13 — `react-native-reanimated` is already a dep, the codebase just hasn't unified the sheet primitive yet. Inconsistent with the "warm, modern" target.

**Direction.** Migrate to the shared `<BottomSheet />` / `<SheetHeader />` primitives once #9 and #8 land. No standalone fix needed here.

---

## S3 — Polish & consistency drift

### B12. Raw fontSize values throughout — bypasses Text variants
[budgets.tsx:227](apps/mobile/app/(tabs)/budgets.tsx#L227) · [CategoryRow.tsx:59,88,92,97,104,107](apps/mobile/components/budgets/CategoryRow.tsx#L59) · [SummaryCard.tsx:34,43,46,93](apps/mobile/components/budgets/SummaryCard.tsx#L34) · [BudgetEditSheet.tsx:212,227,332,349,359](apps/mobile/components/BudgetEditSheet.tsx#L212)

Half-px sizes — `14.5`, `13.5`, `12.5`, `11.5`, `10.5`, `9.5` — appear throughout. None are in the canonical type scale ([packages/ui/src/theme.ts](packages/ui/src/theme.ts): cap 11, micro 12, small 13, body 15, lead 17, h3 20, h2 28). The `Text` component from `@cvc/ui` with variants exists; Budgets bypasses it for raw `<Text style={{ fontSize: ... }}>`. Each occurrence is tiny; cumulatively the page reads as hand-pixeled rather than systemic. Same family as S3-14.

**Direction.** A pass that swaps the half-px sizes to the nearest variant. No visible change at body sizes; restores design-system integrity.

### B13. The plus icon is inlined as raw SVG — three times
[budgets.tsx:249-251](apps/mobile/app/(tabs)/budgets.tsx#L249-L251) · [EmptyState.tsx:154-159](apps/mobile/components/budgets/EmptyState.tsx#L154-L159)

The same `<Svg><Path d="M12 5v14M5 12h14"/></Svg>` appears in the header (+), in the EmptyState primary CTA, and once more for the per-tile trailing icon. `I.plus` exists in the icon registry. Three copies of the same path, three opportunities to drift on stroke weight or color.

**Direction.** Replace with `<I.plus color={...} size={18} />` in all three call sites.

### B14. Mode toggle labels are grammatically asymmetric
[ModeToggle.tsx:29-37](apps/mobile/components/budgets/ModeToggle.tsx#L29-L37)

`"Monthly"` (adjective) vs `"By Paycheck"` (prepositional phrase). Pick one form. Tiny but the inconsistency is the kind of thing the "calm/banking" frame picks up on.

**Direction.** `"Monthly"` / `"Paycheck"` reads cleaner and matches `PERIOD_LABEL_PICKER` inside BudgetEditSheet ([line 30-34](apps/mobile/components/BudgetEditSheet.tsx#L30-L34)).

### B15. Period casing drift inside BudgetEditSheet
[BudgetEditSheet.tsx:24-34](apps/mobile/components/BudgetEditSheet.tsx#L24-L34)

`PERIOD_LABEL_LIMIT` is uppercase + hyphen — `"PER-PAYCHECK LIMIT"`. `PERIOD_LABEL_PICKER` is title case + space — `"Per Paycheck"`. Two conventions for the same word, ~10 lines apart. Visible to the user when they look at the limit label and the period picker on the same screen.

**Direction.** Pick one: `"Per Paycheck"` everywhere, or `"PER PAYCHECK"` everywhere (drop the hyphen — it doesn't survive the title-case version anyway).

### B16. Dead `<TextInput>` with `display: "none"`
[BudgetEditSheet.tsx:267-284](apps/mobile/components/BudgetEditSheet.tsx#L267-L284)

A hidden text input still lives in the sheet — likely a leftover from before `CategoryPicker` was introduced. Doesn't render, but signals "in-progress" to anyone reading the file and adds 18 lines of noise.

**Direction.** Delete the block.

### B17. Empty-state quick-start tiles share visual language with budget rows
[EmptyState.tsx:84-127](apps/mobile/components/budgets/EmptyState.tsx#L84-L127) · [CategoryRow.tsx:30-117](apps/mobile/components/budgets/CategoryRow.tsx#L30-L117)

`QUICK_STARTS` renders rows of `BudgetCategoryIcon + name + sub + trailing icon` — almost the same shape as `CategoryRow`. A first-time user could mistake them for existing budgets. The trailing `+` (vs no chevron on `CategoryRow`) is the only differentiator, and the tiles render against the same `palette.surface` card background.

**Direction.** Push the quick-starts visually further from a list-row pattern — dashed border, smaller scale, or an outline-button treatment. Make it obvious these are choices, not state.

### B18. Footer caption with space context is bottom-anchored and tiny
[budgets.tsx:415-429](apps/mobile/app/(tabs)/budgets.tsx#L415-L429)

`{monthLabel} {year} · {spaceName}` sits at **11pt** at the very bottom of the list. This is the only on-screen reminder of *which space the user is looking at* (the global `SpaceHeader` pill is the switcher, not the context label). Buried at the bottom means it's invisible unless the user scrolls past every budget row.

**Direction.** Promote a "Personal · September 2026" sub-label under the H1, matching the pattern Plan tab already uses ([plan.tsx:53-62](apps/mobile/app/(tabs)/plan.tsx#L53-L62)). Same string, useful position.

### B19. No error state for failed data loads
[budgets.tsx:71-99](apps/mobile/app/(tabs)/budgets.tsx#L71-L99)

`load()` has no `try/catch`. If any of the five queries throws — network blip, RLS denial, expired session — the screen renders whatever state was last set (often the EmptyState from B1). No toast, no retry CTA, no signal that something went wrong. The user concludes "I have no budgets" when actually the server failed. Same gap as AC2 on Accounts.

**Direction.** Wrap `load()` in try/catch, surface a slim retry banner above the summary card when the fetch fails.

### B20. ProgressBar's "over" tail is subtle and color-only
[ProgressBar.tsx:6-11](apps/mobile/components/budgets/ProgressBar.tsx#L6-L11) · [ProgressBar.tsx:58-70](apps/mobile/components/budgets/ProgressBar.tsx#L58-L70)

The source comment promises *"a soft hatched tail past the limit so the over portion reads as a zone rather than a blaring red bar."* The implementation renders the tail as a solid `palette.warnTint` block — no hatching. The distinction between `near` and `over` collapses to color hue (gold vs warn-orange), which is borderline for color-blind users (≈8% of male users). The category-row copy carries the textual signal ("$X over budget"), but the bar itself doesn't.

**Direction.** Either implement the hatched pattern the comment promises (an SVG `<Pattern>`), or add a tiny notch at the 100% mark so the limit boundary is visible regardless of color discrimination.

### B21. SuggestedBanner CTA breaks brand color discipline
[SuggestedBanner.tsx:58-71](apps/mobile/components/budgets/SuggestedBanner.tsx#L58-L71)

The "Add" button uses `palette.info` (blue) on an `palette.infoTint` background. Every other primary action on the page uses `palette.brand` (teal). The banner's blue is internally consistent with its info-styled surface, but visually it competes with the (+) header button for "what's the primary action to tap." Two different blues for "go" weakens the brand pattern.

**Direction.** Either keep the banner blue but downgrade the "Add" pill to a ghost / outline so the brand (+) remains the dominant action, or switch the banner CTA to brand.

### B22. No celebration / positive reinforcement when under budget
[budgets.tsx:371-398](apps/mobile/app/(tabs)/budgets.tsx#L371-L398)

The "On track" section renders the count and rows — same treatment as "Needs attention" and "Close to limit," differing only in hue. There's no "$48 under budget this week — nice" line, no streak count, no historical comparison ("Down 12% from last month"). The vibe target is **wellness app warmth**, but the reward system is bone-dry. Doing well is invisible; doing poorly gets a red callout. The asymmetry tilts toward scolding.

**Direction.** A small `<UnderBudgetCelebration />` strip when `okRows.length > 0 && overRows.length === 0`, surfacing one warm sentence. Scope: ~30 lines, contained component.

### B23. Header "+" button is 38×38pt — below the 44pt accessibility minimum
[budgets.tsx:239-240](apps/mobile/app/(tabs)/budgets.tsx#L239-L240)

Explicit `width: 38, height: 38`. Apple HIG requires 44×44pt for interactive targets. The compact size keeps the (+) feeling light and modern, but mis-taps will happen — especially with one-handed reach.

**Direction.** Either bump to 44×44 (visually heavier) or keep 38×38 visible and add `hitSlop={6}` for an effective 50×50 target.

### B24. No haptics on row tap, mode toggle, save, or delete
[CategoryRow.tsx:39-49](apps/mobile/components/budgets/CategoryRow.tsx#L39-L49) · [ModeToggle.tsx:56-67](apps/mobile/components/budgets/ModeToggle.tsx#L56-L67) · [BudgetEditSheet.tsx:217-227](apps/mobile/components/BudgetEditSheet.tsx#L217-L227)

Same gap flagged at A19. `expo-haptics` isn't called anywhere on Budgets. For the "banking confidence + wellness warmth" target, `Haptics.selectionAsync()` on mode toggle, light `impactAsync(Light)` on row tap, `notificationAsync(Success)` on save, and `notificationAsync(Warning)` on delete is the cheapest "feels premium" win.

**Direction.** Wrap the four onPress handlers — or bundle with A19 as a single haptics pass across all interactive surfaces.

---

## Suggested ordering for the Budgets polish pass

This is a recommendation, not a decision — owner picks.

1. **B1 + B2 + B3** — the three S1 items. The empty-state flash (B1) is the most user-visible "this app feels half-cooked" moment on the screen; gate it on a real loaded flag at the same time you add the skeleton (B2) and pull-to-refresh (B3). One PR.
2. **B6 + B4 + B16** — the three "looks done, isn't" items. Wire MonthSelector or remove it (B6), fix or remove the mislabeled bottom CTA (B4), delete the dead TextInput (B16). All small, all immediate trust wins.
3. **B5 + B9 + B10** — the BudgetEditSheet polish trio. Confirmation-or-undo on delete (B5), Period-before-Rollover (B9), Save button weight (B10). Same file.
4. **B7 + B8** — affordance fixes (chevron on rows, dismiss on banner). Two components, two small JSX additions.
5. **B19** — error state on `load()`. Defensive but cheap.
6. **B17 + B18 + B22** — concept-level polish (empty-state visual separation, space-context promotion, under-budget warmth). Less mechanical, but where the "calm and modern" vibe gets cashed in.
7. **B12 + B13 + B14 + B15 + B20 + B21 + B23 + B24** — token discipline and small polish. Pick up piecemeal or as one cleanup PR.

B11 waits for the shared `<BottomSheet />` / `<SheetHeader />` primitives from nav-audit #8 and #9.

Quality over churn: every Budgets-page item is scoped to one file or one component. None require rewriting the screen.

---

# Forecast page — deep dive

Scoped strictly to [(tabs)/forecast.tsx](apps/mobile/app/(tabs)/forecast.tsx) and its supporting components ([ForecastLineChart](apps/mobile/components/ForecastLineChart.tsx), [StatCards](apps/mobile/components/StatCards.tsx), [LowBalanceBanner](apps/mobile/components/LowBalanceBanner.tsx), [EventsList](apps/mobile/components/EventsList.tsx), [WhatIfSheet](apps/mobile/components/WhatIfSheet.tsx), [RangeTabs](apps/mobile/components/RangeTabs.tsx)). Same severity scale as above. Items numbered F1–F16 to avoid colliding with the mobile-nav findings. Cross-references to FRICTION.md #12 (gating destinations) and #9 (sheet animation) appear inline.

## S1 — Blocking / hurts core flow

### F1. Hero & stat numbers ignore the active what-if scenario
[(tabs)/forecast.tsx:138-149](apps/mobile/app/(tabs)/forecast.tsx#L138-L149) · [(tabs)/forecast.tsx:181](apps/mobile/app/(tabs)/forecast.tsx#L181) · [(tabs)/forecast.tsx:296-305](apps/mobile/app/(tabs)/forecast.tsx#L296-L305)

`todayBalance`, `endBalance`, `lowestDay`, and `net30d` all derive from baseline `result`. The chart, however, renders `displayResult = scenarioResult ?? result`. When a user adds a what-if expense and the sheet closes, the chart line shifts but **every number on the page stays at baseline**. The only place scenario impact shows up is `impactText` inside the sheet — which the user just dismissed by saving.

This breaks the page's most important promise: "what-if shows you the impact." Hero says everything's fine, chart implies something changed, stat cards say it didn't. Three signals, three different stories.

**Direction.** Either (a) drive hero/stats from `displayResult` and add a tiny "vs baseline" delta line ("$X lower than baseline"), or (b) keep the numbers as baseline but render an obvious "Scenario active · −$X" pill above the hero.

### F2. No "scenario active" affordance and no in-page way to clear
[(tabs)/forecast.tsx:329-349](apps/mobile/app/(tabs)/forecast.tsx#L329-L349)

After a what-if is saved, the only signals it exists are: (1) the chart line shape (only legible to people who memorized the baseline), and (2) `brandTint` highlighted rows in EventsList ([EventsList.tsx:158-159](apps/mobile/components/EventsList.tsx#L158-L159)) which may sit far down a 30D/90D/1Y scroll. There's no header chip, no count badge on the What-if pill, no global "scenario active" indicator.

To clear scenarios the user must re-open WhatIfSheet (top-right pill, easy to miss) and tap **Discard**, which lives next to **Save scenario** in a sheet whose primary verb reads "add an expense." Dangerous-adjacent muscle memory.

**Direction.** A small pill below the hero — `🧪 1 what-if active · Clear` — that both signals state and offers 1-tap clearing. The What-if pill in the hero should also show a count badge when mutations exist.

## S2 — Real friction

### F3. Pro-gating destination is a single-line card with no CTA and no preview
[(tabs)/forecast.tsx:190-203](apps/mobile/app/(tabs)/forecast.tsx#L190-L203)

A free user taps Plan → "Forecast · 30/90-day cash flow and what-if scenarios" (which sells the value), arrives at the page, and sees a centered Card with one paragraph and zero buttons. No preview chart. No "See an example" toggle. No "Start trial" / "Upgrade" Pressable. Just text and an implicit assumption that the user knows where to go.

The Plan row teases value the destination doesn't deliver on. (Same root issue as FRICTION.md #12.)

**Direction.** Render the page in "preview mode" — same hero/chart/stats with mock data, a soft overlay, and a primary CTA: "Start your Pro trial" wired to [PremiumModal](apps/mobile/components/PremiumModal.tsx).

### F4. Chart tap-to-select gives a guide line but no value readout
[ForecastLineChart.tsx:152-159](apps/mobile/components/ForecastLineChart.tsx#L152-L159) · [ForecastLineChart.tsx:281-303](apps/mobile/components/ForecastLineChart.tsx#L281-L303)

Tapping the chart sets `selectedDayIndex`, drawing a dotted vertical guide and a hollow circle on the line. But: no value tooltip, no date label, no callout. The user knows they tapped *something* but not what they tapped. To read the value they have to open What-if (which then displays "Add expense on Wed Jun 4 · …").

The chart is a primary surface for the page's core verb (project + read). It should answer "what's my balance on day X" without a sheet.

**Direction.** Add a small floating callout near the selected point: date + projected balance + on-floor/below-floor pip. Reuse the existing low-balance callout pattern ([ForecastLineChart.tsx:328-364](apps/mobile/components/ForecastLineChart.tsx#L328-L364)) for visual consistency.

### F5. What-if entry is small, off-axis, and uses an unfamiliar icon
[(tabs)/forecast.tsx:236-256](apps/mobile/app/(tabs)/forecast.tsx#L236-L256)

What-if is one of the named differentiators in [SCREENS.md](SCREENS.md). Today's affordance is a **32pt outlined pill in the top-right of the hero** with a flask icon (`I.flask`). Visually it reads as secondary chrome — the chart and stat cards dominate the eye. The flask glyph is unfamiliar; users connect a beaker to chemistry, not finance scenarios.

**Direction.** Either (a) make the pill larger and brand-colored (filled, not outlined) so it earns its keep, or (b) move it to anchor below the chart as a full-width primary CTA on first paint, then dock to the hero on scroll.

### F6. No loading or error state
[(tabs)/forecast.tsx:51-124](apps/mobile/app/(tabs)/forecast.tsx#L51-L124)

Initial render before the async fetch resolves: `result` is null → hero shows `$0.00 · projected · 30 days from now`, chart card is empty ([ForecastLineChart.tsx:36-49](apps/mobile/components/ForecastLineChart.tsx#L36-L49)), stat cards read `$0 / $0 / +$0`. On a slow connection this looks like "you have no money and nothing scheduled" — exactly the wrong feeling for a finance app trying to build trust.

There's also no error path: if any of the 6 parallel Supabase queries fails, the page silently never updates. No retry, no toast.

**Direction.** Two small additions: (1) skeleton bars in place of the hero number and stat values until first `result` lands, (2) a banner-style retry on caught error from the fetch IIFE. Folds into FRICTION.md #16 once the shared `<Skeleton />` primitive lands.

### F7. Threshold is hardcoded; banner's "Adjust threshold" button is a dead affordance
[(tabs)/forecast.tsx:24](apps/mobile/app/(tabs)/forecast.tsx#L24) · [LowBalanceBanner.tsx:66-96](apps/mobile/components/LowBalanceBanner.tsx#L66-L96)

`THRESHOLD_CENTS = 50_000` is hardcoded at module top. Both Pressables in `LowBalanceBanner` (the brand-colored "Transfer $X" and the outlined "Adjust threshold") have **no onPress handler** — they look tappable, do nothing. Users tapping a primary CTA on a warning banner and getting nothing is a trust hit.

**Direction.** Either remove the buttons until the actions are wired, or wire them — "Adjust threshold" → small inline editor (number input + Save), "Transfer" → router push to `/accounts` with intent. At minimum, removing dead Pressables today is a 2-line change.

## S3 — Polish & consistency drift

### F8. "Floor" vs "Threshold" terminology drifts inside one screen
LowBalanceBanner: "Below your floor on …" + "your $500 threshold" ([LowBalanceBanner.tsx:46-54](apps/mobile/components/LowBalanceBanner.tsx#L46-L54)) · Chart pill: "Threshold · $500" ([ForecastLineChart.tsx:213](apps/mobile/components/ForecastLineChart.tsx#L213)) · StatCards sub: "below floor" ([StatCards.tsx:38](apps/mobile/components/StatCards.tsx#L38)) · WhatIf impact: "above your floor" ([(tabs)/forecast.tsx:161](apps/mobile/app/(tabs)/forecast.tsx#L161)).

Two terms, one concept. Pick one — **floor** is warmer (wellness) and shorter; **threshold** is more precise (banking). Either works; consistency matters more than the choice.

### F9. EventsList silently returns null on empty
[EventsList.tsx:71](apps/mobile/components/EventsList.tsx#L71)

A fresh user with no bills/income added sees: chart with a flat line, stat cards at $0, then nothing below. The forecast is most powerful when there's something to forecast — and the empty cliff is invisible. No "Add a bill to see it here" hint, no link to `/bills/new`.

**Direction.** Render an empty-state row in EventsList when `events.length === 0` with two ghost CTAs: "Add a bill" and "Add income" linking to their respective new-record flows.

### F10. Event rows don't link to source bill/income
[EventsList.tsx:148-268](apps/mobile/components/EventsList.tsx#L148-L268)

EventRow is a static `<View>`, not a Pressable. To edit a forecasted bill the user has to navigate Plan → Bills → find row → tap. A row-tap → bill detail jump would be 1 tap from the most natural place (the row showing the dollar amount that's bothering them).

**Direction.** Wrap `<EventRow>` body in `<Pressable>` and route to `/bills/[refId]` or `/income/[refId]` based on `e.kind`. Long-press could open the WhatIfSheet pre-populated with the row's date/amount as a delete/shift scenario.

### F11. Chart legend doesn't update when a scenario is active
[ForecastLineChart.tsx:366-397](apps/mobile/components/ForecastLineChart.tsx#L366-L397)

When `compareDays` is set the chart renders **two lines**: dashed ghost (baseline) + solid brand (scenario). The legend underneath still says only "Today / Projected / Event" — no key for the ghost line. Users see two lines, one labeled, one mystery.

**Direction.** Conditionally render a fourth legend item ("Baseline" with a dashed swatch) when `compareDays` is non-null.

### F12. WhatIfSheet has only `addBill`; data shape supports more
[WhatIfSheet.tsx:71-94](apps/mobile/components/WhatIfSheet.tsx#L71-L94) · [(tabs)/forecast.tsx:165-172](apps/mobile/app/(tabs)/forecast.tsx#L165-L172)

`WhatIfMutation` (per the page's `whatIfRefIds` handling) supports both `addBill` and `addIncome`. The sheet only ever produces `addBill`. The "Add expense on … " title and a category picker biased to expenses lock the user into one verb. Asking "what if I get $500 more this month?" is impossible.

**Direction.** Add a binary segmented control at the top of the sheet — "Add expense / Add income" — and route the produced mutation accordingly.

### F13. Chart visual density at 90D/1Y exceeds what it can render legibly
[RangeTabs.tsx:4](apps/mobile/components/RangeTabs.tsx#L4) · [ForecastLineChart.tsx:110-118](apps/mobile/components/ForecastLineChart.tsx#L110-L118)

7D / 30D / 90D / **1Y** are all daily-granularity. At 365 points across ~358pt of chart width, every event diamond sits ~1pt apart — they overlap into a smear. Tap targeting becomes lottery (`Math.round(ratio * (count - 1))` at 1Y means each pixel is ~1 day).

**Direction.** Either drop 1Y from RangeTabs, or down-sample to weekly aggregates beyond 30D inside `forecast()` (`@cvc/domain`). Keep daily for 7D/30D where the markers can breathe.

### F14. "Tap a different day on the chart to change the date" hint is hidden until the sheet is already open
[WhatIfSheet.tsx:168-170](apps/mobile/components/WhatIfSheet.tsx#L168-L170)

The instruction that the chart drives the what-if date appears *inside* the sheet, after the user opened it. First-encounter discovery is sequenced wrong: the user opens What-if from the pill, doesn't realize they should have tapped a day first, sees the hint, dismisses, taps a day, re-opens. That's a 4-step intro for a 1-step interaction.

**Direction.** Show a one-time coachmark on first chart paint: "Tap any day to plan around it." Pair with F4's value readout so the affordance pays off immediately.

### F15. Hero `endBalance` is also the rightmost data point on the chart
[(tabs)/forecast.tsx:259-274](apps/mobile/app/(tabs)/forecast.tsx#L259-L274)

The hero number says "$X projected · 30 days from now." The chart's last point is the same number. It's a small redundancy, but cumulatively contributes to the ~216pt of chrome before users see anything actionable. Worth considering whether the hero should instead surface **today's** effective available (matching Dashboard's hero), with the chart's right-edge value living only on the chart.

**Direction.** Either (a) hero = today's balance with `endBalance` shown only as the chart's rightmost label, or (b) keep `endBalance` but add a small "today $X" subline so both numbers anchor.

### F16. WhatIfSheet's drag handle is decorative
[WhatIfSheet.tsx:97](apps/mobile/components/WhatIfSheet.tsx#L97) · [WhatIfSheet.tsx:124-133](apps/mobile/components/WhatIfSheet.tsx#L124-L133)

Backdrop tap dismisses (good). The visible 36×5 grab handle at the top suggests drag-to-dismiss — but no PanGestureHandler is wired up. Users will try to drag and the sheet won't move. Rolls into FRICTION.md #9 (sheets need a shared BottomSheet primitive); calling it out here so the Forecast pass at least removes the broken affordance until that primitive lands.

## Suggested ordering for the Forecast polish pass

This is a recommendation, not a decision — owner picks.

1. **F1 + F2** — scenario fidelity. Biggest perceived win. Without this, what-if feels broken.
2. **F7** (remove dead Pressables) + **F11** (legend) — trivial trust wins.
3. **F4** (chart value readout) + **F14** (coachmark) — pair these; both serve the same flow.
4. **F3** (Pro-gating preview) — touches PremiumModal flow but high-leverage for conversion.
5. **F6** (loading/error) + **F9** (empty state) — the "this app feels finished" pass.
6. **F8** (floor/threshold) + **F10** (event row links) + **F12** (income what-ifs) + **F15** (hero anchor) — polish round.
7. **F5** (what-if affordance) + **F13** (1Y density) — needs design judgment, not pure polish.
8. **F16** — rolls into FRICTION.md #9 BottomSheet primitive work.

Quality over churn: every Forecast-page item is scoped to one component or one prop. None require rewriting the screen.

---

# Bills page — deep dive

A focused audit of [(tabs)/bills.tsx](apps/mobile/app/(tabs)/bills.tsx), [BillDetailSheet.tsx](apps/mobile/components/BillDetailSheet.tsx), [BillEditSheet.tsx](apps/mobile/components/BillEditSheet.tsx), [BillsCalendar.tsx](apps/mobile/components/BillsCalendar.tsx), and the supporting [components/bills/](apps/mobile/components/bills/) parts. Same severity scale (S1 / S2 / S3) as above. Findings are prefixed `B*` so they don't collide with other page audits.

**Differentiators that must stay prominent (do not friction-audit away):**

- Autopay tracking + per-bill toggle.
- Calendar view with hue-coded dots (autopay / manual / overdue).
- Recurring-charge detection banner.
- Payment-history sparkline + recent-payments table.
- Smart reminders (3-days-before / on-due / mute).
- Bucket grouping (Overdue / This Week / Later / Paid).
- Upcoming strip (next 7 / 30 days).
- Auto-assigned bill icon + hue per merchant.

## S1 — Blocking / hurts core flow

### BL1. "Mark paid" hardcodes today's date
[(tabs)/bills.tsx](apps/mobile/app/(tabs)/bills.tsx) — `recordBillPayment({ paid_at: today })` from both the row inline action and the detail sheet quick action.

There is no path to backdate from the inline action. To log Monday's payment on Wednesday the user must open detail → edit, then re-derive the date manually. Most users will accept the wrong date and the payment-history sparkline degrades silently. Pay history is one of the bill features users come back for; this quietly poisons it.

**Direction.** Tap = stamp today (current behavior). Long-press / `•••` opens a small date sheet with quick chips ("yesterday", "2 days ago", "pick a date"). Mirror the long-press affordance pattern from nav-audit #7 / Activity A18.

### BL2. No bulk "mark paid"
Each row is one tap + a refresh. Pay-day Friday with five autopay confirmations to clear is five separate taps + five spinners.

**Direction.** Long-press to enter select mode → "Mark all paid" footer button. Same select-mode shape that would suit transactions.

### BL3. Add Bill due-date is a raw text input
[BillEditSheet.tsx](apps/mobile/components/BillEditSheet.tsx) — Step 2 due-date field expects `YYYY-MM-DD` typed manually.

No date picker, no inline format help, no on-blur validation — the error fires on Continue. This is the single biggest form friction on the page; an everyday user typing `5/4` or `May 4` gets a generic error. Mirrors Goals G3 and Income IN9 — same fix, same primitive.

**Direction.** Native date picker (`@react-native-community/datetimepicker`, used elsewhere in the app — verify). Keep ISO storage in the backend.

## S2 — Real friction

### BL4. Editing a bill skips Step 1
[BillEditSheet.tsx:97](apps/mobile/components/BillEditSheet.tsx#L97)

In edit mode the wizard starts on Step 2, so the payee can't be changed from the wizard at all. To rename a bill the user must delete and re-add — losing payment history.

**Direction.** Either let Step 1 be reachable when editing, or expose a Name field on Step 2 in edit mode.

### BL5. "Edit" inside detail sheet is a dismiss-then-present
The detail sheet collapses, then the edit sheet pops up. Scroll position is lost on return; "back to detail" is impossible. Same hop pattern occurs in `TransactionDetailSheet → TransactionEditSheet`, so it's a repeating cost across the app.

**Direction.** Stacked sheet (`presentation: 'pageSheet'` inside the existing sheet) or in-sheet view swap. Belongs in the same pass as the shared `<BottomSheet />` primitive proposed under nav-audit #9.

### BL6. Mark-paid → list reload is a hard re-fetch
[(tabs)/bills.tsx](apps/mobile/app/(tabs)/bills.tsx) — `setReloadCount(c => c + 1)` after the API call.

The row briefly snaps; on slow networks the user sees the action, then the spinner, then the new state. Same pattern for the autopay toggle in detail.

**Direction.** Optimistic update + reconcile on success (revert on error). Same shape as the Activity row-update pattern.

### BL7. No skeleton on initial bills load
The header and Upcoming strip render with empty data, then snap in once the fetch completes. Inconsistent with the rest of the app's loading treatments — compounds nav-audit #16, Goals G4, Activity A2, and Settings S3-15.

**Direction.** Skeleton row stack matching the bucket shape, gated to first-load only. Reuse whatever skeleton primitive arrives from the cross-app cleanup.

### BL8. Empty state is the weakest in the Plan hub
[(tabs)/bills.tsx:412-425](apps/mobile/app/(tabs)/bills.tsx#L412-L425) — "No bills yet. Tap + to add one, or wait for us to detect repeat charges." in a plain surface card.

Compare to [components/income/EmptyState.tsx](apps/mobile/components/income/EmptyState.tsx): illustration, hero text, quick-start cards, info banner, primary CTA. The first-run impression of Bills is the weakest of the Plan-hub destinations.

**Direction.** Reuse the income empty-state shape: small illustration + 2–3 quick-start cards (e.g. "Rent · Monthly", "Utilities · Monthly", "Subscription · Yearly") + an info banner inviting recurring detection.

### BL9. Error state is one line of red text with no retry
[(tabs)/bills.tsx:336-338](apps/mobile/app/(tabs)/bills.tsx#L336-L338)

If the API fails, the user is stuck on a stale list with no obvious recovery — no retry button, no copy explaining the situation.

**Direction.** Inline error card with a retry button; preserve the last-good list below it.

### BL10. No-accounts state in BillEditSheet has no link out
Step 2 shows a dashed box with a sentence pointing to the Accounts tab, but no link. The user has to remember the path.

**Direction.** Make it a button: "Link an account →" that pushes to `/(tabs)/accounts`.

### BL11. Reminder defaults disagree with the detail sheet
- Edit sheet defaults: "1 day before" = ON, "on due date" = OFF.
- Detail sheet copy: "3 days before" / "on due date" / "mute all."

The "1 vs. 3 days" mismatch will confuse anyone who notices.

**Direction.** Pick one window (3 days before is the more common default in this category) and align both surfaces.

### BL12. Autopay defaults to ON in create mode
Most bills are *not* autopay; defaulting it ON quietly creates wrong data because users skim Step 3.

**Direction.** Default autopay OFF; require explicit opt-in.

### BL13. Cadence subtitle goes stale if the user backtracks
Step 3 monthly subtitle reads "On the 15th" based on Step 2's date. If the user goes back and changes the date, the subtitle does not re-render until the user re-selects the cadence.

**Direction.** Re-derive cadence subtitles from current form state on every render.

## S3 — Polish & consistency drift

### BL14. Card radius drift
Tokens define `r4: 16` as the standard surface radius, but [Card.tsx](packages/ui/src/Card.tsx) still uses `radius.md: 10`. The Upcoming strip and bill rows live on 16pt surfaces; the surrounding container is 10pt. Reads as a half-pixel mismatch.

**Direction.** Migrate `Card` to `r4`. Project-wide change; Bills is one of the most visible affected surfaces.

### BL15. Press-state opacity varies 0.85–0.9
Across `BillRow`, the wizard's payee/account/cadence cards, and the quick-action buttons in detail. Mirrors the broader inconsistency under nav-audit #10.

**Direction.** Standardize on 0.85.

### BL16. "X DAYS LATE" badge uses `warn` (orange) instead of `neg` (red)
[components/bills/BillRow.tsx](apps/mobile/components/bills/BillRow.tsx)

Overdue is the highest-stress state on this page. Reading as a soft warning underplays it; the rest of the app reserves `neg` for risk states.

**Direction.** Recolor the overdue badge to `palette.neg` with the existing tint background, keep size unchanged.

### BL17. Calendar dates with bills don't look distinctly tappable
[components/BillsCalendar.tsx](apps/mobile/components/BillsCalendar.tsx)

Days with dots are highlighted only by the dots; the cell background doesn't change. New users will read the calendar as a display, not a control.

**Direction.** Subtle press state on dot-bearing days, or a thin underline ring under the day number.

### BL18. Calendar has no swipe-to-change-month
Only the chevron buttons advance months. A calendar invites swipe.

**Direction.** Horizontal pan gesture on the grid. Keep chevrons for discoverability.

### BL19. Numeric font fallback can mismatch within the same screen
`Money` falls back to system if `fonts.num` is undefined; `TxNum` requires `fonts.numMedium`. On a single bill row, the row amount and the upcoming-strip total can render in slightly different glyphs depending on font load order.

**Direction.** Single numeric font hook used by both primitives; render the loading-state placeholder with `tabular-nums` so geometry doesn't shift on swap.

### BL20. Recurring suggestions banner has no preview of what it found
[components/RecurringSuggestionsBanner.tsx](apps/mobile/components/RecurringSuggestionsBanner.tsx)

Says "we noticed repeating charges" but you have to open it to see what.

**Direction.** Show one example merchant + amount inline ("Looks like Spotify $10.99 · monthly. Add as bill?"). Tapping the preview opens the full suggestions sheet.

### BL21. Detail sheet sparkline buried below the fold
[BillDetailSheet.tsx:410-428](apps/mobile/components/BillDetailSheet.tsx#L410-L428)

The highest-signal trend visual ("is this bill creeping up?") sits below quick actions, payment-history table, and reminders. Most users will never scroll to it.

**Direction.** Promote a small inline sparkline (12–16pt tall) next to the hero amount. Keep the full chart lower as the deep view.

### BL22. Delete sits at the bottom of a long scroll
[BillDetailSheet.tsx:565-586](apps/mobile/components/BillDetailSheet.tsx#L565-L586)

Hard to reach intentionally; users who *do* want to delete have to scroll past notes, reminders, and history.

**Direction.** Move delete into a `•••` overflow in the sheet header. Less visually prominent (good — it's destructive) but more findable.

### BL23. Step transitions in BillEditSheet are not animated
Step 1 → Step 2 swaps content instantly. Reanimated is already a dependency; mirror nav-audit #9 by adding a 200ms slide that reinforces the step-bar fill.

### BL24. Payee picker only searches the canned popular list
[BillEditSheet.tsx](apps/mobile/components/BillEditSheet.tsx) — search filters the built-in `POPULAR_PAYEES` only.

A user who pays the same dentist every quarter has to type "Dr. Patel" from scratch each time.

**Direction.** Search should fall back to existing bill names + recent merchants from transactions before showing canned popular options.

### BL25. Upcoming strip shows count split, not dollar split
[components/bills/UpcomingStrip.tsx](apps/mobile/components/bills/UpcomingStrip.tsx) — "N bills · M on autopay" gives the count split but not the more actionable dollar split.

The most useful read is "of $520 due, $320 will pay itself and $200 needs me."

**Direction.** Add a sub-line: "$X autopay · $Y manual."

## Working well — preserve in the polish pass

- **Bucket grouping** (Overdue / This Week / Later / Paid) is excellent — clear, scannable, urgency-first.
- **Upcoming strip** is a strong glanceable summary and matches the brand voice.
- **Calendar view** is genuinely useful for visual learners and rare in this category of app.
- **Recurring-charge detection banner** is a real differentiator — keep it visible.
- Tonally, the page is calm and confident. The polish gaps above are about smoothing what's already on the right track.

## Suggested ordering for the Bills polish pass

This is a recommendation, not a decision — owner picks.

1. **BL1 + BL2 + BL3** — the three S1 items. Together they fix the two primary verbs (mark paid, add bill). Each is small.
2. **BL4 + BL11 + BL12 + BL13 + BL10** — bundle the form / state cleanup. Small surface, real correctness wins (especially BL12 default-OFF autopay).
3. **BL6 + BL7 + BL9 + BL8 + BL5** — list / sheet ergonomics. Optimistic mark-paid (BL6) and the better empty state (BL8) move felt quality the most.
4. **BL14 + BL15 + BL16 + BL19** — cross-app polish. Benefits non-Bills screens too; pair with the same items in other audits.
5. **BL17 – BL25** — calendar / detail polish. Pick up in any order. BL21 (promoted sparkline) and BL22 (delete in overflow) are the strongest calm-and-confident wins.

Quality over churn: every Bills-page item is scoped to one file or one component. None require rewriting the screen.
