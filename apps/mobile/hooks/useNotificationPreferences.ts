import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getMyNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";

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
      // Optimistic
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
