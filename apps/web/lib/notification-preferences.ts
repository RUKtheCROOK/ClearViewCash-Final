"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getMyNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@cvc/api-client";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const row = await getMyNotificationPreferences(supabase);
      setPrefs(row);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<Omit<NotificationPreferences, "user_id" | "updated_at">>) => {
      setPrefs((cur) => (cur ? { ...cur, ...patch } : cur));
      try {
        const row = await updateNotificationPreferences(supabase, patch);
        setPrefs(row as NotificationPreferences);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        await refresh();
      }
    },
    [refresh],
  );

  return {
    prefs,
    defaults: DEFAULT_NOTIFICATION_PREFERENCES,
    loading,
    error,
    update,
    refresh,
  };
}
