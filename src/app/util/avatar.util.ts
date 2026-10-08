/**
 * Shared avatar utilities — used by ChatSessionsComponent and PendingApprovalsComponent.
 * Both components delegate here; no local copies remain (CS-01 / PENDING-AVATAR).
 */

/**
 * Returns up to 2 initials from a display name or phone number.
 * Falls back to '?' for empty or undefined input.
 */
export function getInitials(name: string | undefined): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Returns a deterministic background colour derived from a name hash.
 * Uses iZinga brand palette; falls back to the muted-grey token value (#6c757d).
 */
export function getAvatarColor(name: string | undefined): string {
  const colours = ['#be833d', '#00a9a1', '#D66247', '#1083A5', '#127672', '#8e6bbf', '#c45b8a'];
  if (!name || !name.trim()) return '#6c757d';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colours[Math.abs(hash) % colours.length];
}
