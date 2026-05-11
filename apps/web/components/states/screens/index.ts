/**
 * State screens — three classes:
 *  - Drop-in:        replace existing empty/error UI 1:1
 *                    (EmptyAccounts, EmptyTransactions, EmptyBills, EmptyBudgets, EmptyGoals, FailedToLoad)
 *  - Inline:         compose into existing pages (banners + sub-cards)
 *                    (PlaidReconnect, SyncFailedPartial, PendingStuck, OfflineCached,
 *                     PartnerInvitePending, PartnerNoData, NotifPermissionDeclined, BioDeclined)
 *  - Page variants:  conditional render swaps of existing pages
 *                    (ManyAccounts, TinyBalance, BigBalance)
 */

import type { ComponentType } from "react";

import { EmptyAccounts } from "./EmptyAccounts";
import { EmptyTransactions } from "./EmptyTransactions";
import { EmptyBills } from "./EmptyBills";
import { EmptyBudgets } from "./EmptyBudgets";
import { EmptyGoals } from "./EmptyGoals";
import { PlaidReconnect } from "./PlaidReconnect";
import { SyncFailedPartial } from "./SyncFailedPartial";
import { OfflineCached } from "./OfflineCached";
import { FailedToLoad } from "./FailedToLoad";
import { TinyBalance } from "./TinyBalance";
import { BigBalance } from "./BigBalance";
import { ManyAccounts } from "./ManyAccounts";
import { PartnerInvitePending } from "./PartnerInvitePending";
import { PendingStuck } from "./PendingStuck";
import { NotifPermissionDeclined } from "./NotifPermissionDeclined";
import { BioDeclined } from "./BioDeclined";
import { PartnerNoData } from "./PartnerNoData";

export {
  EmptyAccounts,
  EmptyTransactions,
  EmptyBills,
  EmptyBudgets,
  EmptyGoals,
  PlaidReconnect,
  SyncFailedPartial,
  OfflineCached,
  FailedToLoad,
  TinyBalance,
  BigBalance,
  ManyAccounts,
  PartnerInvitePending,
  PendingStuck,
  NotifPermissionDeclined,
  BioDeclined,
  PartnerNoData,
};

export type StateCategory = "empty" | "error" | "edge" | "permission";

export interface StateEntry {
  id: string;
  name: string;
  category: StateCategory;
  Component: ComponentType<Record<string, never>>;
}

export const STATE_ENTRIES: StateEntry[] = [
  { id: "empty-accounts", name: "EmptyAccounts", category: "empty", Component: EmptyAccounts as ComponentType },
  { id: "empty-transactions", name: "EmptyTransactions", category: "empty", Component: EmptyTransactions as ComponentType },
  { id: "empty-bills", name: "EmptyBills", category: "empty", Component: EmptyBills as ComponentType },
  { id: "empty-budgets", name: "EmptyBudgets", category: "empty", Component: EmptyBudgets as ComponentType },
  { id: "empty-goals", name: "EmptyGoals", category: "empty", Component: EmptyGoals as ComponentType },
  { id: "plaid-reconnect", name: "PlaidReconnect", category: "error", Component: PlaidReconnect as ComponentType },
  { id: "sync-failed-partial", name: "SyncFailedPartial", category: "error", Component: SyncFailedPartial as ComponentType },
  { id: "offline-cached", name: "OfflineCached", category: "error", Component: OfflineCached as ComponentType },
  { id: "failed-to-load", name: "FailedToLoad", category: "error", Component: FailedToLoad as ComponentType },
  { id: "tiny-balance", name: "TinyBalance", category: "edge", Component: TinyBalance as ComponentType },
  { id: "big-balance", name: "BigBalance", category: "edge", Component: BigBalance as ComponentType },
  { id: "many-accounts", name: "ManyAccounts", category: "edge", Component: ManyAccounts as ComponentType },
  { id: "partner-invite-pending", name: "PartnerInvitePending", category: "edge", Component: PartnerInvitePending as ComponentType },
  { id: "pending-stuck", name: "PendingStuck", category: "edge", Component: PendingStuck as ComponentType },
  { id: "notif-permission-declined", name: "NotifPermissionDeclined", category: "permission", Component: NotifPermissionDeclined as ComponentType },
  { id: "bio-declined", name: "BioDeclined", category: "permission", Component: BioDeclined as ComponentType },
  { id: "partner-no-data", name: "PartnerNoData", category: "permission", Component: PartnerNoData as ComponentType },
];

export function findStateEntry(id: string): StateEntry | undefined {
  return STATE_ENTRIES.find((e) => e.id === id);
}
