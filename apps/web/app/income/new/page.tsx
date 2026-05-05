"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import type { IncomeSourceType } from "@cvc/types";
import { getAccountsForView, getMySpaces } from "@cvc/api-client";
import { AddIncomeWizard } from "../_components/AddIncomeWizard";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

interface Space {
  id: string;
  name: string;
  tint: string;
}

const VALID_TYPES: IncomeSourceType[] = ["paycheck", "freelance", "rental", "investment", "one_time"];

export default function NewIncomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const seedRaw = params.get("type");
  const seed = VALID_TYPES.includes(seedRaw as IncomeSourceType) ? (seedRaw as IncomeSourceType) : undefined;

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setOwnerUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase).then((rows) => {
      const list = rows as unknown as Space[];
      const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
      const found = stored ? list.find((s) => s.id === stored) : null;
      setActiveSpaceId(found ? found.id : list[0]?.id ?? null);
    });
  }, [signedIn]);

  useEffect(() => {
    if (!activeSpaceId) return;
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView: false }).then((rows) => {
      setAccounts(
        (rows as Array<AccountLite>).map((a) => ({
          id: a.id, name: a.name, display_name: a.display_name, mask: a.mask,
        })),
      );
    });
  }, [activeSpaceId]);

  if (!authReady) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    router.replace("/sign-in");
    return null;
  }

  return (
    <AddIncomeWizard
      supabase={supabase}
      spaceId={activeSpaceId}
      ownerUserId={ownerUserId}
      accounts={accounts}
      initialSourceType={seed}
      onCancel={() => router.push("/income")}
      onSaved={() => router.push("/income")}
    />
  );
}
