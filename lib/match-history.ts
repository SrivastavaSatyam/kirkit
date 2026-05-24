import type { Match } from './types';
import { calculatePlayerStats } from './types';

/** Runs in each completed match + current live innings (if any), in order */
export function battleScoresForPlayer(
  playerId: string,
  completedMatches: Match[],
  activeMatch: Match | null | undefined
): number[] {
  const out: number[] = [];
  for (const m of completedMatches) {
    const mp = m.players.find((p) => p.id === playerId);
    out.push(mp ? Number(mp.score) || 0 : 0);
  }
  if (activeMatch) {
    const mp = activeMatch.players.find((p) => p.id === playerId);
    out.push(mp ? calculatePlayerStats(mp.history).score : 0);
  }
  return out;
}

/** Compare last battle to average of all prior battles (same player). */
export function trendLastVsPriorAvg(scores: number[]): 'up' | 'down' | 'flat' {
  if (scores.length < 2) return 'flat';
  const last = scores[scores.length - 1];
  const prior = scores.slice(0, -1);
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  if (last > avg) return 'up';
  if (last < avg) return 'down';
  return 'flat';
}
