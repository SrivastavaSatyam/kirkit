import { computeSeriesMvp } from './mvp';
import type { Match, Tournament } from './types';
import { calculatePlayerStats, MAX_LEGAL_BALLS } from './types';
import { treatActivePlayers } from './standings';

// ─── Output shape ─────────────────────────────────────────────────────────────

export type BatterMode =
  | 'leading'    // rank #1 — already at the top
  | 'chasing'    // rank #2…(n-1) — chasing the leader
  | 'danger';    // rank #n (last) — treat danger zone, chasing rank n-1

export interface EscapeTargetResult {
  show: true;
  mode: BatterMode;
  currentRank: number;
  totalPlayers: number;
  currentPlayerName: string;
  /** Null only for 'leading' mode */
  targetPlayerName: string | null;
  targetRank: number | null;
  escapeRunTarget: number;
  currentInningsRuns: number;
  remainingRuns: number;
  ballsRemaining: number;
  /** True when target already reached (either #1 reached for chasing, or escaped danger) */
  isSafe: boolean;
  isClutchMode: boolean;
  /** For 'danger' mode once safe: the next player to chase up the ladder */
  nextLadderTarget: { name: string; rank: number; runsNeeded: number } | null;
}

// ─── Main computation ─────────────────────────────────────────────────────────

export function computeEscapeTarget(
  tournament: Tournament | null,
  activeMatch: Match | null | undefined,
  isLastBatter: boolean,
): EscapeTargetResult | null {
  if (!tournament || !activeMatch) return null;

  const currentPlayer = activeMatch.players[activeMatch.currentBatterIndex];
  if (!currentPlayer) return null;
  if (currentPlayer.status === 'absconded') return null;

  const tournamentPlayer = tournament.players.find(p => p.id === currentPlayer.id);
  if (!tournamentPlayer || tournamentPlayer.seriesAbsconded) return null;
  if (!treatActivePlayers(tournament.players).some(p => p.id === currentPlayer.id)) return null;

  // Base MVP: completed matches only — keeps targets stable during innings
  const baseMvpEntries = computeSeriesMvp(tournament.matches, tournament.players);

  // Active (non-absconded) players, sorted best → worst (index 0 = rank 1)
  const activeMvp = baseMvpEntries.filter(e => {
    const p = tournament.players.find(pl => pl.id === e.playerId);
    return p && !p.seriesAbsconded;
  });

  if (activeMvp.length < 1) return null;

  const currentIdx = activeMvp.findIndex(e => e.playerId === currentPlayer.id);
  if (currentIdx === -1) return null;

  const currentEntry     = activeMvp[currentIdx];
  const currentInningsRuns = calculatePlayerStats(currentPlayer.history).score;
  const ballsRemaining   = Math.max(0, MAX_LEGAL_BALLS - currentPlayer.ballsFaced);

  // PointsPerRun: 5 / highest score in this match (live, includes all batters)
  const matchScores       = activeMatch.players.map(p => calculatePlayerStats(p.history).score);
  const highestRunsInMatch = Math.max(...matchScores, 0);
  const pointsPerRun      = highestRunsInMatch > 0 ? 5.0 / highestRunsInMatch : 0.1;

  const totalPlayers = activeMvp.length;

  // ── Rank #1 — already leading ─────────────────────────────────────────────
  if (currentIdx === 0) {
    return {
      show: true,
      mode: 'leading',
      currentRank: 1,
      totalPlayers,
      currentPlayerName: currentEntry.playerName,
      targetPlayerName: null,
      targetRank: null,
      escapeRunTarget: 0,
      currentInningsRuns,
      remainingRuns: 0,
      ballsRemaining,
      isSafe: true,
      isClutchMode: isLastBatter,
      nextLadderTarget: null,
    };
  }

  // ── Last rank — treat danger zone ─────────────────────────────────────────
  if (currentIdx === totalPlayers - 1) {
    const targetEntry  = activeMvp[currentIdx - 1]; // rank directly above
    const mvpGap       = Math.max(0.01, targetEntry.totalMvpPoints - currentEntry.totalMvpPoints);
    const escapeRunTarget = Math.ceil(mvpGap / pointsPerRun);
    const remainingRuns   = Math.max(0, escapeRunTarget - currentInningsRuns);
    const isSafe          = currentInningsRuns >= escapeRunTarget;

    // Ladder: once they've escaped, show next target
    let nextLadderTarget: EscapeTargetResult['nextLadderTarget'] = null;
    if (isSafe && currentIdx >= 2) {
      const ladderEntry = activeMvp[currentIdx - 2];
      if (ladderEntry) {
        const ladderGap     = Math.max(0.01, ladderEntry.totalMvpPoints - currentEntry.totalMvpPoints);
        const ladderTarget  = Math.ceil(ladderGap / pointsPerRun);
        nextLadderTarget = {
          name:      ladderEntry.playerName,
          rank:      currentIdx - 1,
          runsNeeded: Math.max(0, ladderTarget - currentInningsRuns),
        };
      }
    }

    return {
      show: true,
      mode: 'danger',
      currentRank: currentIdx + 1,
      totalPlayers,
      currentPlayerName: currentEntry.playerName,
      targetPlayerName:  targetEntry.playerName,
      targetRank:        currentIdx,       // 1-indexed
      escapeRunTarget,
      currentInningsRuns,
      remainingRuns,
      ballsRemaining,
      isSafe,
      isClutchMode: isLastBatter,
      nextLadderTarget,
    };
  }

  // ── Middle ranks — chasing the leader ─────────────────────────────────────
  const leaderEntry  = activeMvp[0]; // rank #1
  const mvpGap       = Math.max(0.01, leaderEntry.totalMvpPoints - currentEntry.totalMvpPoints);
  const escapeRunTarget = Math.ceil(mvpGap / pointsPerRun);
  const remainingRuns   = Math.max(0, escapeRunTarget - currentInningsRuns);
  const isSafe          = currentInningsRuns >= escapeRunTarget;

  return {
    show: true,
    mode: 'chasing',
    currentRank: currentIdx + 1,
    totalPlayers,
    currentPlayerName:  currentEntry.playerName,
    targetPlayerName:   leaderEntry.playerName,
    targetRank:         1,
    escapeRunTarget,
    currentInningsRuns,
    remainingRuns,
    ballsRemaining,
    isSafe,
    isClutchMode: isLastBatter,
    nextLadderTarget: null,
  };
}
