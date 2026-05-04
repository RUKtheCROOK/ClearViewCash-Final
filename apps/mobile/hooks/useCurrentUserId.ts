import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Returns the auth user's id, or null while loading / signed out.
 * Subscribes to auth state changes so the value tracks sign-in/out.
 */
export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then((res) => {
      if (!cancelled) setUserId(res.data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
