import type { Match, Player } from './types';

// ─── Per-match types ──────────────────────────────────────────────────────────

export interface MatchPlayerMvp {
  playerId: string;
  playerName: string;
  runs: number;
  wickets: number;
  catches: number;
  battingMvpPoints: number;
  bowlingMvpPoints: number;
  fieldingMvpPoints: number;
  totalMvpPoints: number;
}

// ─── Series-level types ───────────────────────────────────────────────────────

export interface SeriesMvpEntry {
  playerId: string;
  playerName: string;
  totalRuns: number;
  totalWickets: number;
  totalCatches: number;
  totalBattingMvpPoints: number;
  totalBowlingMvpPoints: number;
  totalFieldingMvpPoints: number;
  totalMvpPoints: number;
  isAbsconded: boolean;
  joinedAtMatchIndex: number;
}

export interface MvpAwards {
  seriesMvp?: SeriesMvpEntry;
  bestBatter?: SeriesMvpEntry;
  bestBowler?: SeriesMvpEntry;
  bestFielder?: SeriesMvpEntry;
  allRounder?: SeriesMvpEntry;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function matchWicketsMap(match: Match): Map<string, number> {
  const m = new Map<string, number>();
  for (const mp of match.players) {
    if (mp.dismissal?.bowlerId) {
      m.set(mp.dismissal.bowlerId, (m.get(mp.dismissal.bowlerId) ?? 0) + 1);
    }
  }
  return m;
}

function matchCatchesMap(match: Match): Map<string, number> {
  const m = new Map<string, number>();
  for (const mp of match.players) {
    if (mp.dismissal?.fielderId) {
      m.set(mp.dismissal.fielderId, (m.get(mp.dismissal.fielderId) ?? 0) + 1);
    }
  }
  return m;
}

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Compute per-player MVP points for a single match.
 * Proportional scoring: category_pts = (value / max_in_category) × 5
 * If category max is 0 → everyone gets 0 for that category.
 * Absconded players are excluded from the proportional max but still get entries (with 0s).
 */
export function computeMatchMvp(match: Match): MatchPlayerMvp[] {
  const wMap = matchWicketsMap(match);
  const cMap = matchCatchesMap(match);

  // Only non-absconded players set the proportional ceiling
  const active = match.players.filter(p => p.status !== 'absconded');

  const maxRuns    = active.length > 0 ? Math.max(0, ...active.map(p => p.score))               : 0;
  const maxWickets = active.length > 0 ? Math.max(0, ...active.map(p => wMap.get(p.id) ?? 0))   : 0;
  const maxCatches = active.length > 0 ? Math.max(0, ...active.map(p => cMap.get(p.id) ?? 0))   : 0;

  return match.players.map(mp => {
    const runs    = mp.score;
    const wickets = wMap.get(mp.id) ?? 0;
    const catches = cMap.get(mp.id) ?? 0;

    const battingMvpPoints  = maxRuns    > 0 ? r2((runs    / maxRuns)    * 5) : 0;
    const bowlingMvpPoints  = maxWickets > 0 ? r2((wickets / maxWickets) * 5) : 0;
    const fieldingMvpPoints = maxCatches > 0 ? r2((catches / maxCatches) * 5) : 0;
    const totalMvpPoints    = r2(battingMvpPoints + bowlingMvpPoints + fieldingMvpPoints);

    return {
      playerId: mp.id,
      playerName: mp.name,
      runs,
      wickets,
      catches,
      battingMvpPoints,
      bowlingMvpPoints,
      fieldingMvpPoints,
      totalMvpPoints,
    };
  });
}

/**
 * Aggregate series-level MVP totals for all tournament players.
 * Includes completed matches + optional active match (for live leaderboard).
 * Sorted: totalMvpPoints DESC → totalRuns → totalWickets → totalCatches → earlier join.
 */
export function computeSeriesMvp(
  matches: Match[],
  players: Player[],
  activeMatch?: Match | null,
): SeriesMvpEntry[] {
  const allMatches = [...matches, ...(activeMatch ? [activeMatch] : [])];

  // Initialise one entry per tournament player
  const entryMap = new Map<string, SeriesMvpEntry>();
  for (const p of players) {
    entryMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      totalRuns: 0,
      totalWickets: 0,
      totalCatches: 0,
      totalBattingMvpPoints: 0,
      totalBowlingMvpPoints: 0,
      totalFieldingMvpPoints: 0,
      totalMvpPoints: 0,
      isAbsconded: Boolean(p.seriesAbsconded),
      joinedAtMatchIndex: p.joinedAtMatchIndex ?? 0,
    });
  }

  for (const match of allMatches) {
    for (const mmv of computeMatchMvp(match)) {
      const e = entryMap.get(mmv.playerId);
      if (!e) continue;
      e.totalRuns             += mmv.runs;
      e.totalWickets          += mmv.wickets;
      e.totalCatches          += mmv.catches;
      e.totalBattingMvpPoints  = r2(e.totalBattingMvpPoints  + mmv.battingMvpPoints);
      e.totalBowlingMvpPoints  = r2(e.totalBowlingMvpPoints  + mmv.bowlingMvpPoints);
      e.totalFieldingMvpPoints = r2(e.totalFieldingMvpPoints + mmv.fieldingMvpPoints);
      e.totalMvpPoints         = r2(e.totalMvpPoints         + mmv.totalMvpPoints);
    }
  }

  return Array.from(entryMap.values()).sort((a, b) => {
    if (b.totalMvpPoints    !== a.totalMvpPoints)    return b.totalMvpPoints    - a.totalMvpPoints;
    if (b.totalRuns         !== a.totalRuns)         return b.totalRuns         - a.totalRuns;
    if (b.totalWickets      !== a.totalWickets)      return b.totalWickets      - a.totalWickets;
    if (b.totalCatches      !== a.totalCatches)      return b.totalCatches      - a.totalCatches;
    return a.joinedAtMatchIndex - b.joinedAtMatchIndex;
  });
}

/**
 * Derive the five end-of-series MVP awards from a sorted series entry list.
 * All-Rounder: player with contributions in all 3 categories (falls back to 2, then any).
 */
export function computeMvpAwards(entries: SeriesMvpEntry[]): MvpAwards {
  if (entries.length === 0) return {};

  const active = entries.filter(
    p => p.totalRuns > 0 || p.totalWickets > 0 || p.totalCatches > 0,
  );
  if (active.length === 0) return {};

  const seriesMvp = entries[0]; // already sorted

  const bestBatter = [...active].sort((a, b) =>
    b.totalRuns !== a.totalRuns ? b.totalRuns - a.totalRuns : b.totalMvpPoints - a.totalMvpPoints,
  )[0];

  const withWickets = active.filter(p => p.totalWickets > 0);
  const bestBowler = withWickets.length > 0
    ? [...withWickets].sort((a, b) =>
        b.totalWickets !== a.totalWickets ? b.totalWickets - a.totalWickets : b.totalMvpPoints - a.totalMvpPoints,
      )[0]
    : undefined;

  const withCatches = active.filter(p => p.totalCatches > 0);
  const bestFielder = withCatches.length > 0
    ? [...withCatches].sort((a, b) =>
        b.totalCatches !== a.totalCatches ? b.totalCatches - a.totalCatches : b.totalMvpPoints - a.totalMvpPoints,
      )[0]
    : undefined;

  const allThree = active.filter(p => p.totalRuns > 0 && p.totalWickets > 0 && p.totalCatches > 0);
  const twoPlus  = active.filter(
    p => [p.totalRuns > 0, p.totalWickets > 0, p.totalCatches > 0].filter(Boolean).length >= 2,
  );
  const pool = allThree.length > 0 ? allThree : twoPlus.length > 0 ? twoPlus : active;
  const allRounder = [...pool].sort((a, b) => b.totalMvpPoints - a.totalMvpPoints)[0];

  return { seriesMvp, bestBatter, bestBowler, bestFielder, allRounder };
}
