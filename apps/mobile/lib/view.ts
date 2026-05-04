import { useApp } from "./store";
import { acceptedMemberCount, type SpaceRow } from "../hooks/useSpaces";
import { useCurrentUserId } from "../hooks/useCurrentUserId";

export interface EffectiveView {
  /** Resolved sharedView flag passed to query helpers. */
  sharedView: boolean;
  /** When non-null, narrow accounts/transactions to this user's contributions to the active space. */
  restrictToOwnerId: string | null;
  /** Whether the toggle UI should render at all for the active space. */
  toggleVisible: boolean;
}

/**
 * Resolves the displayed-data rules for the active space.
 *
 * - Spaces with <2 accepted members: toggle hidden, show everything the user
 *   has (single-member spaces don't need a my/shared split).
 * - Multi-member spaces, raw flag = true: shared view (everyone's contributions).
 * - Multi-member spaces, raw flag = false: my view (current user's slice only).
 *
 * The raw `sharedView` flag in the persisted store is not reset when the
 * toggle is hidden; this hook normalizes it for the active space so stale
 * state from a previous space can't skew the rendered numbers.
 */
export function useEffectiveSharedView(activeSpace: SpaceRow | null | undefined): EffectiveView {
  const rawSharedView = useApp((s) => s.sharedView);
  const userId = useCurrentUserId();
  const toggleVisible = acceptedMemberCount(activeSpace) >= 2;

  if (!toggleVisible) {
    return { sharedView: false, restrictToOwnerId: null, toggleVisible: false };
  }
  if (rawSharedView) {
    return { sharedView: true, restrictToOwnerId: null, toggleVisible: true };
  }
  return { sharedView: false, restrictToOwnerId: userId, toggleVisible: true };
}
