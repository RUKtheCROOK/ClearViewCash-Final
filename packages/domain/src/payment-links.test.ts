import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { allocatePaymentLinks, effectiveAvailableBalances } from "./payment-links";
import type { PaymentLink } from "@cvc/types";

const checking = "11111111-1111-1111-1111-111111111111";
const savings = "22222222-2222-2222-2222-222222222222";
const cardA = "33333333-3333-3333-3333-333333333333";
const cardB = "44444444-4444-4444-4444-444444444444";

describe("allocatePaymentLinks", () => {
  it("single funder covers single card", () => {
    const links: PaymentLink[] = [
      {
        id: "l1",
        owner_user_id: "u1",
        funding_account_id: checking,
        name: "main",
        cards: [{ payment_link_id: "l1", card_account_id: cardA, split_pct: 100 }],
      } as PaymentLink,
    ];
    const allocs = allocatePaymentLinks(links, [
      { account_id: checking, current_balance: 500_00 },
      { account_id: cardA, current_balance: 120_00 },
    ]);
    expect(allocs).toEqual([{ funding_account_id: checking, card_account_id: cardA, reserved_cents: 120_00 }]);
  });

  it("two funders split a card 60/40 with conservation", () => {
    const links: PaymentLink[] = [
      {
        id: "l1",
        owner_user_id: "u1",
        funding_account_id: checking,
        name: "primary",
        cards: [{ payment_link_id: "l1", card_account_id: cardA, split_pct: 60 }],
      } as PaymentLink,
      {
        id: "l2",
        owner_user_id: "u1",
        funding_account_id: savings,
        name: "secondary",
        cards: [{ payment_link_id: "l2", card_account_id: cardA, split_pct: 40 }],
      } as PaymentLink,
    ];
    const allocs = allocatePaymentLinks(links, [
      { account_id: checking, current_balance: 1000_00 },
      { account_id: savings, current_balance: 500_00 },
      { account_id: cardA, current_balance: 100_00 },
    ]);
    const total = allocs.reduce((s, a) => s + a.reserved_cents, 0);
    expect(total).toBe(100_00);
    const checkingShare = allocs.find((a) => a.funding_account_id === checking)!.reserved_cents;
    expect(checkingShare).toBe(60_00);
  });

  it("ignores zero-balance cards", () => {
    const links: PaymentLink[] = [
      {
        id: "l1",
        owner_user_id: "u1",
        funding_account_id: checking,
        name: "main",
        cards: [
          { payment_link_id: "l1", card_account_id: cardA, split_pct: 100 },
          { payment_link_id: "l1", card_account_id: cardB, split_pct: 100 },
        ],
      } as PaymentLink,
    ];
    const allocs = allocatePaymentLinks(links, [
      { account_id: checking, current_balance: 1000_00 },
      { account_id: cardA, current_balance: 0 },
      { account_id: cardB, current_balance: 250_00 },
    ]);
    expect(allocs.length).toBe(1);
    expect(allocs[0]?.card_account_id).toBe(cardB);
  });

  it("effective_available subtracts all reservations", () => {
    const links: PaymentLink[] = [
      {
        id: "l1",
        owner_user_id: "u1",
        funding_account_id: checking,
        name: "main",
        cards: [
          { payment_link_id: "l1", card_account_id: cardA, split_pct: 100 },
          { payment_link_id: "l1", card_account_id: cardB, split_pct: 100 },
        ],
      } as PaymentLink,
    ];
    const eff = effectiveAvailableBalances(links, [
      { account_id: checking, current_balance: 1000_00 },
      { account_id: cardA, current_balance: 200_00 },
      { account_id: cardB, current_balance: 300_00 },
    ]);
    expect(eff.get(checking)).toBe(500_00);
  });
});

describe("payment-links property tests", () => {
  it("conservation: sum of allocations per card equals card balance", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 4 }),
        (cardCents, splits) => {
          const totalPct = splits.reduce((s, p) => s + p, 0);
          const links: PaymentLink[] = splits.map((pct, i) => ({
            id: `l${i}`,
            owner_user_id: "u1",
            funding_account_id: `f${i}-1111-1111-1111-111111111111`,
            name: `f${i}`,
            cards: [{ payment_link_id: `l${i}`, card_account_id: cardA, split_pct: pct }],
          })) as PaymentLink[];
          const balances = [
            { account_id: cardA, current_balance: cardCents },
            ...splits.map((_, i) => ({
              account_id: `f${i}-1111-1111-1111-111111111111`,
              current_balance: 10_000_00,
            })),
          ];
          const allocs = allocatePaymentLinks(links, balances);
          if (cardCents === 0 || totalPct === 0) {
            expect(allocs.length).toBe(0);
          } else {
            const sum = allocs.reduce((s, a) => s + a.reserved_cents, 0);
            expect(sum).toBe(cardCents);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
