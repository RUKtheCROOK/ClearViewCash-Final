import { useMemo, useState } from "react";
import { createPaymentLink } from "@cvc/api-client";
import { accountDisplayName } from "@cvc/domain";
import { supabase } from "../../../lib/supabase";

export interface DraftAccount {
  id: string;
  name: string;
  display_name?: string | null;
  mask: string | null;
  current_balance: number | null;
}

export interface DraftCard {
  id: string;
  name: string;
  display_name?: string | null;
  mask: string | null;
  current_balance: number | null;
}

export type Scope = "single" | "cross";

export interface PaymentLinkDraftState {
  card: DraftCard | null;
  funderIds: string[];
  /** funderId → percentage (0–100). Always sums to 100 when committed. */
  splits: Record<string, number>;
  scope: Scope;
}

interface UsePaymentLinkDraftArgs {
  cards: DraftCard[];
  funders: DraftAccount[];
}

export function usePaymentLinkDraft({ cards, funders }: UsePaymentLinkDraftArgs) {
  const initial: PaymentLinkDraftState = useMemo(
    () => ({
      card: cards.length === 1 ? cards[0]! : null,
      funderIds: [],
      splits: {},
      scope: "single",
    }),
    [cards],
  );

  const [state, setState] = useState<PaymentLinkDraftState>(initial);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setState(initial);
    setError(null);
  }

  function setCard(card: DraftCard | null) {
    setState((s) => ({
      ...s,
      card,
      funderIds: [],
      splits: {},
    }));
  }

  function toggleFunder(id: string) {
    setState((s) => {
      const isSelected = s.funderIds.includes(id);
      const nextIds = isSelected
        ? s.funderIds.filter((x) => x !== id)
        : [...s.funderIds, id];
      const nextSplits = evenSplit(nextIds);
      return { ...s, funderIds: nextIds, splits: nextSplits };
    });
  }

  function setSplit(id: string, value: number) {
    setState((s) => {
      const others = s.funderIds.filter((x) => x !== id);
      if (others.length === 0) return { ...s, splits: { [id]: 100 } };
      const v = clamp(value, 0, 100);
      const remainder = 100 - v;
      const otherTotal = others.reduce((sum, oid) => sum + (s.splits[oid] ?? 0), 0);
      const next: Record<string, number> = { [id]: v };
      if (otherTotal > 0) {
        for (const oid of others) {
          next[oid] = Math.round(((s.splits[oid] ?? 0) / otherTotal) * remainder);
        }
      } else {
        const each = Math.floor(remainder / others.length);
        for (const oid of others) next[oid] = each;
      }
      // Reconcile rounding so total is 100.
      const total = Object.values(next).reduce((a, b) => a + b, 0);
      if (total !== 100 && others.length > 0) {
        const lastId = others[others.length - 1]!;
        next[lastId] = (next[lastId] ?? 0) + (100 - total);
      }
      return { ...s, splits: next };
    });
  }

  function evenSplitNow() {
    setState((s) => ({ ...s, splits: evenSplit(s.funderIds) }));
  }

  function setScope(scope: Scope) {
    setState((s) => ({ ...s, scope }));
  }

  async function commit(): Promise<boolean> {
    if (!state.card) {
      setError("Pick a card first.");
      return false;
    }
    if (state.funderIds.length === 0) {
      setError("Pick at least one funding account.");
      return false;
    }
    const splitTotal = state.funderIds.reduce(
      (sum, id) => sum + (state.splits[id] ?? 0),
      0,
    );
    if (splitTotal !== 100) {
      setError(`Splits must total 100% (currently ${splitTotal}%).`);
      return false;
    }
    setCommitting(true);
    setError(null);
    try {
      // Create one payment_link per funder, all pointing at the chosen card.
      for (const funderId of state.funderIds) {
        const funder = funders.find((f) => f.id === funderId);
        if (!funder) continue;
        const card = state.card;
        await createPaymentLink(supabase, {
          funding_account_id: funderId,
          name: `${accountDisplayName(funder)} → ${accountDisplayName(card)}`,
          cross_space: state.scope === "cross",
          cards: [{ card_account_id: card.id, split_pct: state.splits[funderId] ?? 0 }],
        });
      }
      return true;
    } catch (e) {
      setError((e as Error).message ?? "Could not save link.");
      return false;
    } finally {
      setCommitting(false);
    }
  }

  return {
    state,
    setCard,
    toggleFunder,
    setSplit,
    evenSplitNow,
    setScope,
    commit,
    committing,
    error,
    reset,
  };
}

function evenSplit(ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};
  const each = Math.floor(100 / ids.length);
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = each;
  // remainder cent goes to first
  const total = each * ids.length;
  if (total !== 100 && ids.length > 0) {
    out[ids[0]!] = each + (100 - total);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
