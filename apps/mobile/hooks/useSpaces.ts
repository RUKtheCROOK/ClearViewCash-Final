import { useEffect, useState } from "react";
import { getMySpaces } from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/store";

export interface SpaceRow {
  id: string;
  name: string;
  tint: string;
  kind: "personal" | "shared";
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [active, setActive]);

  return { spaces, loading, activeSpace: spaces.find((s) => s.id === active) };
}
