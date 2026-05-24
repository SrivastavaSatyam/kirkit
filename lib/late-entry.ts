import type { Match } from './types';

/**
 * "Late entry" pill only while they have not yet faced a ball in the series
 * after joining (pending in live match with empty history, and no completed matches yet).
 */
export function shouldShowLateEntryPill(
  joinedAtMatchIndex: number,
  activeMatch: Match | null | undefined,
  playerId: string,
  totalMatches: number
): boolean {
  if (joinedAtMatchIndex <= 0) return false;
  if (totalMatches > 0) return false;
  if (!activeMatch) return true;
  const mp = activeMatch.players.find((p) => p.id === playerId);
  if (!mp) return true;
  if (mp.status !== 'pending') return false;
  return mp.history.length === 0;
}
