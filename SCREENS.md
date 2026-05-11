# Clear View Cash — Screens Map

A one-glance inventory of every screen in the app, what it's for, and how a user reaches it. Use this as a shared reference when triaging UX work.

The file is split into two halves: **Web** (Next.js, `apps/web`) and **Mobile** (Expo Router, `apps/mobile`). They share design language and many components but have separate route trees.

---

# Web (apps/web)

## App shape

Next.js App Router (apps/web). Mobile-first: every authenticated page renders inside a single `maxWidth: 480px` column centered on viewport. There is **no persistent bottom tab bar or sidebar** — navigation is header-driven (icon buttons, "see all" links per card) plus inline `<Link>` from list rows. Every route is wrapped by `ThemeProvider` (light/dark) and `OfflineBanner` from [apps/web/app/layout.tsx](apps/web/app/layout.tsx).

Modals and drawers (PremiumModal, NotificationsDrawer, QuickActionsMenu, CustomizeDashboardSheet, SpaceSwitcher, PaymentLinkSheet) overlay the current route rather than pushing a new one. Back navigation outside the error boundary relies on browser back; only [apps/web/app/error.tsx](apps/web/app/error.tsx) calls `router.back()` explicitly.

## Public / unauthenticated

| Route | Purpose | Reached from |
|---|---|---|
| `/` | Landing — hero + value prop + CTA to sign up / sign in | Direct |
| `/sign-in` | Email + password auth | Landing header, redirect on auth failure |
| `/sign-up` | Account creation | Landing CTA, sign-in footer |
| `/pricing` | Free / Pro / Household tier comparison | Landing nav, premium upsell links |
| `/privacy` | Legal policy | Landing footer |
| `/accept-invite` | Accept invite into a shared space | Deep link from email |
| `/billing/success` | Post-Stripe checkout confirmation | Stripe redirect |

## Authenticated core

| Route | Purpose | Reached from |
|---|---|---|
| `/dashboard` | Primary hub: effective cash, funding coverage, upcoming bills, 30-day forecast, recent activity, net worth | Default landing post-auth |
| `/accounts` | Funding accounts + linked credit cards + payment links + Plaid reconnect | Funding card "Manage" button |
| `/accounts/[id]` | Single account detail | Tap account row on `/accounts` |
| `/bills` | Bill tracker — calendar/list, grouped upcoming/overdue, autopay toggles | Dashboard "All bills" |
| `/bills/new` | Create a bill | "Add bill" on `/bills` |
| `/bills/[id]` | Bill detail (history, edit, delete) | Tap bill row on `/bills` |
| `/bills/[id]/edit` | Edit existing bill | Edit on `/bills/[id]` |
| `/income` | Income forecast — next paycheck hero + recurring + one-offs | Sidebar / Quick Actions |
| `/income/new` | Add income event | "Add income" on `/income` |
| `/income/[id]` | Income detail / edit | Tap income row |
| `/transactions` | Full ledger — date-grouped, filters, splits, share controls | Dashboard "See all" on Recent Activity |
| `/forecast` | 30-day cash flow projection + what-if scenarios | Dashboard "Expand" on forecast card |
| `/budgets` | Budget tracking | Sidebar / Quick Actions |
| `/goals` | Savings / debt goals list | Sidebar / Quick Actions |
| `/goals/[id]` | Single goal detail | Tap goal row |
| `/reports` | Reports hub | Sidebar / Quick Actions |
| `/reports/[kind]` | Specific report (cash flow, spending, etc.) | Choose on `/reports` |

## Settings tree

Reached via the gear icon in the dashboard header → `/settings`. The hub lists every row below.

| Route | Purpose |
|---|---|
| `/settings` | Profile avatar + email + tier; menu of all settings |
| `/settings/profile` | Name, email, photo |
| `/settings/account-share` | Invite & manage co-owners on shared spaces |
| `/settings/subscription` | Tier upgrade / downgrade (Free → Pro → Household) |
| `/settings/payment-links` | Manage Stripe payment links for credit cards |
| `/settings/connected` | Plaid-linked institutions list |
| `/settings/connected/[id]` | Reconnect / unlink a single Plaid item |
| `/settings/categories` | Custom category management |
| `/settings/spaces` | Manage shared spaces (rename, color, members) |
| `/settings/notifications` | Notification preference toggles |
| `/settings/security` | 2FA, session management |
| `/settings/privacy` | Data handling disclosures |
| `/settings/help` | FAQ, contact support |
| `/settings/about` | App version, legal links |
| `/settings/delete-account` | Account deletion flow (destructive) |

## System routes

| Route | Purpose | Reached from |
|---|---|---|
| `/error` | Global render-failure boundary — digest code + retry/back | Automatic on page crash ([apps/web/app/error.tsx](apps/web/app/error.tsx)) |
| `/not-found` | 404 — cloud illustration, link home | Automatic on invalid URL ([apps/web/app/not-found.tsx](apps/web/app/not-found.tsx)) |

## Dev-only

Hidden in production. Useful when polishing state coverage.

| Route | Purpose |
|---|---|
| `/dev/states` | Gallery of 17 prebuilt empty / error / edge / permission state screens (categorized) |
| `/dev/states/[id]` | Individual preview |

## Key shared overlays (not routes)

These are mounted from the dashboard header and float above any route:

- **SpaceSwitcher** — pill in dashboard header; modal lists all spaces with member count + balance.
- **NotificationsDrawer** — bell icon; full list, polled every 60s for unread badge.
- **QuickActionsMenu** — gem icon (Pro users); shortcuts to Add transaction, Add income, Premium hub, Theme toggle.
- **PremiumModal** — gem icon (Free users); upsell sheet.
- **CustomizeDashboardSheet** — bottom of dashboard "Customize dashboard" button; reorder/hide modules.
- **PaymentLinkSheet** — opened from Funding card / `/accounts`; manage Stripe payment links.
- **OfflineBanner** — global, fixed; appears when `navigator.onLine` is false, shows last-online timestamp.

---

# Mobile (apps/mobile)

## App shape

Expo Router (file-based, React Native + RN Web). Root layout → [app/_layout.tsx](apps/mobile/app/_layout.tsx) — `GestureHandlerRootView` + `SafeAreaProvider` + a headless `Stack` declaring four route groups: `(auth)`, `(onboarding)`, `(tabs)`, and `settings`. (Income and Reports moved into `(tabs)/` as nested stacks — see below.)

Persistent chrome inside `(tabs)`:
- **Bottom tab bar** with **5 fixed tabs** ([(tabs)/_layout.tsx](apps/mobile/app/(tabs)/_layout.tsx), `height: 68`, label `fontSize: 11.5`): Home, Accounts, Activity, Plan, You. Bills, Income, Forecast, Budgets, Goals, Reports are routes inside `(tabs)/` but **hidden from the tab bar** ([(tabs)/_layout.tsx:22](apps/mobile/app/(tabs)/_layout.tsx#L22)) — they're reached via the Plan hub.
- **Sticky top header** → [components/SpaceHeader.tsx](apps/mobile/components/SpaceHeader.tsx). Space pill (left) and three icon buttons (right): gem / quick-actions, bell + unread badge, gear → `/settings`. Dashboard & Forecast also render an Effective Available Cash hero block below the row.

Income and Reports detail screens now live **inside** `(tabs)/` as nested stacks ([(tabs)/income/_layout.tsx](apps/mobile/app/(tabs)/income/_layout.tsx), [(tabs)/reports/_layout.tsx](apps/mobile/app/(tabs)/reports/_layout.tsx)) — the tab bar **persists** while inside them. The `settings` stack still sits at the root level and dismisses the tab bar while active.

## Entry & gating

- **Root gate** → [app/index.tsx](apps/mobile/app/index.tsx). Auth check on app open; routes to `(tabs)/dashboard` (signed-in) or `(auth)/sign-in` (signed-out).

## Auth — `(auth)/`

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Sign In | [(auth)/sign-in.tsx](apps/mobile/app/(auth)/sign-in.tsx) | Email/password login | Root gate when unauthenticated |
| Sign Up | [(auth)/sign-up.tsx](apps/mobile/app/(auth)/sign-up.tsx) | New account + initial space name | "Create account" link on Sign In |

## Onboarding — `(onboarding)/`

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Verify | [(onboarding)/verify.tsx](apps/mobile/app/(onboarding)/verify.tsx) | Email verification + optional 2FA | Auto after Sign Up |
| Link Bank | [(onboarding)/link-bank.tsx](apps/mobile/app/(onboarding)/link-bank.tsx) | Plaid connection | Verify → Continue / Skip |
| Tour | [(onboarding)/tour.tsx](apps/mobile/app/(onboarding)/tour.tsx) | 3-slide intro: Effective Cash, Spaces, Forecast | Successful Plaid link |

## Main tabs — `(tabs)/`

| Tab | Path | Purpose |
|---|---|---|
| Home | [(tabs)/dashboard.tsx](apps/mobile/app/(tabs)/dashboard.tsx) | Effective Available hero, upcoming bills, forecast sparkline, recent activity, net worth, customizable modules |
| Accounts | [(tabs)/accounts.tsx](apps/mobile/app/(tabs)/accounts.tsx) | Accounts grouped by type, sync status, payment-link entry |
| Activity | [(tabs)/transactions.tsx](apps/mobile/app/(tabs)/transactions.tsx) | Transactions with search & filters; tap → detail sheet; long-press / "•••" → action menu |
| Plan | [(tabs)/plan.tsx](apps/mobile/app/(tabs)/plan.tsx) | Hub for Bills / Income / Budgets / Goals (Everyday) and Forecast / Reports (Pro). Each row links to the corresponding hidden route. |
| You | [(tabs)/you.tsx](apps/mobile/app/(tabs)/you.tsx) | Thin redirect to `/settings` — the tab also intercepts `tabPress` in [(tabs)/_layout.tsx:61-67](apps/mobile/app/(tabs)/_layout.tsx#L61-L67) to push `/settings` immediately. |

## Hub destinations (reached via Plan tab)

These are still routes inside `(tabs)/` but hidden from the tab bar via `HIDDEN_ROUTES` in [(tabs)/_layout.tsx:22](apps/mobile/app/(tabs)/_layout.tsx#L22). They render full-screen inside the tab group so the tab bar persists.

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Bills | [(tabs)/bills.tsx](apps/mobile/app/(tabs)/bills.tsx) | Bills in list or calendar view; mark paid; recurring suggestions | Plan → Bills |
| Income | [(tabs)/income/index.tsx](apps/mobile/app/(tabs)/income/index.tsx) | Recurring / one-time income; next paycheck hero; variability chart | Plan → Income |
| Budgets | [(tabs)/budgets.tsx](apps/mobile/app/(tabs)/budgets.tsx) | Category budgets, monthly or paycheck cycle, rollover | Plan → Budgets |
| Goals | [(tabs)/goals.tsx](apps/mobile/app/(tabs)/goals.tsx) | Savings / paydown goals; shareable across spaces | Plan → Goals |
| Forecast | [(tabs)/forecast.tsx](apps/mobile/app/(tabs)/forecast.tsx) | 30/90-day projection + what-if scenarios (Pro-gated) | Plan → Forecast |
| Reports | [(tabs)/reports/index.tsx](apps/mobile/app/(tabs)/reports/index.tsx) | Pre-built reports; CSV / PDF export (Pro-gated) | Plan → Reports |

## Detail stacks — nested inside their tab group

These nest as stacks inside `(tabs)/` so the tab bar **stays visible** while the user drills in.

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Income detail | [(tabs)/income/[id].tsx](apps/mobile/app/(tabs)/income/[id].tsx) | One income source; deposits; pause/edit | Tap row in Income |
| Report detail | [(tabs)/reports/[kind].tsx](apps/mobile/app/(tabs)/reports/[kind].tsx) | Single report; range + granularity; export | Tap card in Reports |

## Settings — `settings/`

Separate stack at the root level. Tab bar hides while inside.

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Settings home | [settings/index.tsx](apps/mobile/app/settings/index.tsx) | Hub: profile, tier badge, links | Gear icon in SpaceHeader |
| Profile | [settings/profile.tsx](apps/mobile/app/settings/profile.tsx) | Display name, email, password reset | Settings row |
| Spaces & Members | [settings/spaces.tsx](apps/mobile/app/settings/spaces.tsx) | Spaces, invites, permissions | Settings row |
| Notifications | [settings/notifications.tsx](apps/mobile/app/settings/notifications.tsx) | Notification preferences | Settings row |
| Security | [settings/security.tsx](apps/mobile/app/settings/security.tsx) | 2FA, biometric, linked devices | Settings row |
| Payment Links | [settings/payment-links.tsx](apps/mobile/app/settings/payment-links.tsx) | Map credit → checking with splits | Settings row + Dashboard funding module |
| Account share | [settings/account-share.tsx](apps/mobile/app/settings/account-share.tsx) | Which spaces see this account | From Accounts tab |
| Connected services | [settings/connected/index.tsx](apps/mobile/app/settings/connected/index.tsx) | Plaid items list | Settings row |
| Connected detail | [settings/connected/[id].tsx](apps/mobile/app/settings/connected/[id].tsx) | One Plaid institution; reconnect / disconnect | Tap institution |
| Subscription | [settings/subscription.tsx](apps/mobile/app/settings/subscription.tsx) | Plan + Stripe billing | Settings row |
| Privacy & Data | [settings/privacy/index.tsx](apps/mobile/app/settings/privacy/index.tsx) | Retention, export, delete | Settings row |
| Delete account | [settings/delete-account.tsx](apps/mobile/app/settings/delete-account.tsx) | Final confirmation flow | From Privacy |
| Help | [settings/help/index.tsx](apps/mobile/app/settings/help/index.tsx) | FAQ, contact, feedback | Settings row |
| About | [settings/about/index.tsx](apps/mobile/app/settings/about/index.tsx) | Version, terms, privacy policy | Settings row |

## Standalone

| Screen | Path | Purpose | Reached via |
|---|---|---|---|
| Accept Invite | [accept-invite.tsx](apps/mobile/app/accept-invite.tsx) | Claim space invite | Deep link with token, or manual paste |

## Mobile sheets, modals, drawers

Not routes but flow-critical. All custom overlays — no shared sheet primitive.

- Transactions: [TransactionDetailSheet](apps/mobile/components/TransactionDetailSheet.tsx) (opens on row tap; nests [TransactionEditSheet](apps/mobile/components/TransactionEditSheet.tsx) for full-edit), [TransactionLongPressMenu](apps/mobile/components/TransactionLongPressMenu.tsx) (long-press or "•••"), [TransactionSplitEditor](apps/mobile/components/TransactionSplitEditor.tsx)
- Bills: [BillEditSheet](apps/mobile/components/BillEditSheet.tsx), [BillDetailSheet](apps/mobile/components/BillDetailSheet.tsx)
- Income: [IncomeEditSheet](apps/mobile/components/IncomeEditSheet.tsx), [AddIncomeWizard](apps/mobile/components/AddIncomeWizard.tsx)
- Goals / Budgets: [GoalEditSheet](apps/mobile/components/GoalEditSheet.tsx), [BudgetEditSheet](apps/mobile/components/BudgetEditSheet.tsx)
- Dashboard / Forecast: [CustomizeDashboardSheet](apps/mobile/components/CustomizeDashboardSheet.tsx), [WhatIfSheet](apps/mobile/components/WhatIfSheet.tsx)
- Accounts: [PaymentLinkSheet](apps/mobile/components/accounts/PaymentLinkSheet.tsx)
- Reports: [ExportSheet](apps/mobile/components/reports/ExportSheet.tsx)
- Global: [SpaceSwitcherSheet](apps/mobile/components/SpaceSwitcherSheet.tsx), [NotificationsDrawer](apps/mobile/components/NotificationsDrawer.tsx), [PremiumModal](apps/mobile/components/PremiumModal.tsx), [QuickActionsMenu](apps/mobile/components/QuickActionsMenu.tsx)

## Core differentiators (must stay prominent on mobile)

1. **Effective Available Cash** — cash minus linked card debt. Hero on Dashboard & Forecast.
2. **Spaces + "My View / Shared View"** — fine-grained household sharing.
3. **Cash-flow Forecast** with what-if scenarios.
4. **Payment Links / Funding Coverage** — map which checking pays which card.
5. **Pay-cycle awareness** in Budgets.

Any navigation change must keep these one or two taps away from Home.
