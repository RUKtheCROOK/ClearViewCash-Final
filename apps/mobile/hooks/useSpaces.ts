import { useCallback, useEffect, useState } from "react";
import { getMySpaces } from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/store";

export interface SpaceMember {
  user_id: string | null;
  role: "owner" | "member";
  accepted_at: string | null;
}

export interface SpaceRow {
  id: string;
  name: string;
  tint: string;
  owner_user_id: string;
  members?: SpaceMember[];
}

/**
 * Number of accepted members in a space (the owner is always one).
 * Pending invitees are excluded — they shouldn't unlock multi-member UI
 * until they actually join.
 */
export function acceptedMemberCount(space: SpaceRow | null | undefined): number {
  if (!space?.members) return space ? 1 : 0;
  return space.members.filter((m) => m.user_id && m.accepted_at).length;
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const setActive = useApp((s) => s.setActiveSpace);
  const active = useApp((s) => s.activeSpaceId);

  useEffect(() => {
    let cancelled = false;
    getMySpaces(supabase)
      .then((rows) => {
        if (cancelled) return;
        const list = rows as SpaceRow[];
        setSpaces(list);
        const stillExists = active && list.some((s) => s.id === active);
        if (!stillExists && list[0]) setActive(list[0].id);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active, setActive, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return { spaces, loading, activeSpace: spaces.find((s) => s.id === active), refresh };
}
