"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { getMySpaces } from "@cvc/api-client";
import { AddBillWizard } from "../_components/AddBillWizard";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function NewBillPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/sign-in");
        return;
      }
      setOwnerUserId(data.session.user.id);
      const spaces = await getMySpaces(supabase);
      const list = spaces as Array<{ id: string }>;
      const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
      const found = stored ? list.find((s) => s.id === stored) : null;
      setSpaceId(found ? found.id : list[0]?.id ?? null);
      setAuthReady(true);
    })();
  }, [router]);

  if (!authReady) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  if (!spaceId || !ownerUserId) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-2)" }}>Pick a space before adding a bill.</p>
      </main>
    );
  }

  return (
    <AddBillWizard
      client={supabase}
      spaceId={spaceId}
      ownerUserId={ownerUserId}
      onCancel={() => router.push("/bills")}
      onDone={(id) => router.push(`/bills/${id}`)}
    />
  );
}
