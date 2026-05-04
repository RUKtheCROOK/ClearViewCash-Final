export interface SpaceMember {
  user_id: string | null;
  role?: "owner" | "member";
  accepted_at: string | null;
}

export interface SpaceWithMembers {
  id: string;
  members?: SpaceMember[];
}

/**
 * Number of accepted members in a space (the owner is always one).
 * Pending invitees are excluded — they shouldn't unlock multi-member UI
 * until they actually join.
 */
export function acceptedMemberCount(space: SpaceWithMembers | null | undefined): number {
  if (!space?.members) return space ? 1 : 0;
  return space.members.filter((m) => m.user_id && m.accepted_at).length;
}

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
 */
export function effectiveSharedView(
  activeSpace: SpaceWithMembers | null | undefined,
  rawSharedView: boolean,
  currentUserId: string | null,
): EffectiveView {
  const toggleVisible = acceptedMemberCount(activeSpace) >= 2;
  if (!toggleVisible) {
    return { sharedView: false, restrictToOwnerId: null, toggleVisible: false };
  }
  if (rawSharedView) {
    return { sharedView: true, restrictToOwnerId: null, toggleVisible: true };
  }
  return { sharedView: false, restrictToOwnerId: currentUserId, toggleVisible: true };
}
