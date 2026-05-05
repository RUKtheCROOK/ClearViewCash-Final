"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { AddBillWizard, type InitialBill } from "../../_components/AddBillWizard";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function EditBillPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const billId = params?.id ?? "";
  const [authReady, setAuthReady] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [initial, setInitial] = useState<InitialBill | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/sign-in");
        return;
      }
      setOwnerUserId(data.session.user.id);
      const { data: row } = await supabase.from("bills").select("*").eq("id", billId).single();
      if (row) {
        setSpaceId(row.space_id);
        setInitial({
          id: row.id,
          name: row.name,
          amount: row.amount,
          next_due_at: row.next_due_at,
          cadence: row.cadence,
          autopay: row.autopay,
          category: row.category,
          payee_hue: (row as { payee_hue: number | null }).payee_hue,
          payee_glyph: (row as { payee_glyph: string | null }).payee_glyph,
          notes: (row as { notes: string | null }).notes,
          linked_account_id: row.linked_account_id,
        });
      }
      setAuthReady(true);
    })();
  }, [router, billId]);

  if (!authReady || !initial || !spaceId || !ownerUserId) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <AddBillWizard
      client={supabase}
      spaceId={spaceId}
      ownerUserId={ownerUserId}
      initial={initial}
      onCancel={() => router.push(`/bills/${billId}`)}
      onDone={(id) => router.push(`/bills/${id}`)}
    />
  );
}
