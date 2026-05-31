import { calculatePlayerStats, type Match, type Player, type Tournament } from './types';

/** Treat / danger zone / sponsor: only players not series-absconded */
export function isTreatEligible(p: Player): boolean {
  return !p.seriesAbsconded;
}

export function treatActivePlayers(players: Player[]): Player[] {
  return players.filter(isTreatEligible);
}

function nn(x: number | undefined): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** Series total runs = persisted cumulative + optional current match score */
export function totalSeriesRuns(player: Player, liveMatchScore?: number): number {
  const c = Number(player.cumulativeRuns);
  const cum = Number.isFinite(c) ? c : 0;
  if (liveMatchScore === undefined) return cum;
  const l = Number(liveMatchScore);
  return cum + (Number.isFinite(l) ? l : 0);
}

export function liveScoreMapFromMatch(activeMatch: Match | null | undefined): Map<string, number> | undefined {
  if (!activeMatch?.players?.length) return undefined;
  const m = new Map<string, number>();
  for (const p of activeMatch.players) {
    m.set(p.id, calculatePlayerStats(p.history).score);
  }
  return m;
}

/**
 * Party / danger ordering: lowest series total first.
 * Tie-break: name (case-insensitive), then id — same order as Hall of Fame bottom row.
 */
export function comparePartyWorstFirst(a: Player, b: Player, live?: Map<string, number>): number {
  const ta = totalSeriesRuns(a, live?.get(a.id));
  const tb = totalSeriesRuns(b, live?.get(b.id));
  if (ta !== tb) return ta - tb;
  const cmpName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (cmpName !== 0) return cmpName;
  return a.id.localeCompare(b.id);
}

/** Hall of Fame: highest total first (inverse tie-break of worst-first so lists are consistent) */
export function comparePartyBestFirst(a: Player, b: Player, live?: Map<string, number>): number {
  const ta = totalSeriesRuns(a, live?.get(a.id));
  const tb = totalSeriesRuns(b, live?.get(b.id));
  if (ta !== tb) return tb - ta;
  const cmpName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (cmpName !== 0) return -cmpName;
  return b.id.localeCompare(a.id);
}

export function sortedByPartyWorstFirst(players: Player[], live?: Map<string, number>): Player[] {
  return [...players].sort((a, b) => comparePartyWorstFirst(a, b, live));
}

export function sortedByPartyBestFirst(players: Player[], live?: Map<string, number>): Player[] {
  return [...players].sort((a, b) => comparePartyBestFirst(a, b, live));
}

/**
 * Among everyone tied for lowest series total (optionally including live innings),
 * pick the party-line player: **last in `orderMatch.players` batting queue** wins the tie
 * (they had the final chance in that battle to move off the bottom). If nobody in that lineup,
 * fall back to **latest series join** (`joinedAtMatchIndex`), then stable worst-first order.
 */
export function resolvePartyBottomPlayer(
  players: Player[],
  live: Map<string, number> | undefined,
  orderMatch: Match | null | undefined,
): Player | undefined {
  if (!players.length) return undefined;
  const runs = (p: Player) => totalSeriesRuns(p, live?.get(p.id));
  const minR = Math.min(...players.map(runs));
  const tied = players.filter((p) => runs(p) === minR);
  if (tied.length === 1) return tied[0];

  if (orderMatch?.players?.length) {
    const inMatch = tied
      .map((p) => ({
        p,
        idx: orderMatch.players.findIndex((mp) => mp.id === p.id),
      }))
      .filter((x) => x.idx >= 0);
    if (inMatch.length > 0) {
      const maxIdx = Math.max(...inMatch.map((x) => x.idx));
      const atMax = inMatch.filter((x) => x.idx === maxIdx).map((x) => x.p);
      if (atMax.length === 1) return atMax[0];
      return sortedByPartyWorstFirst(atMax, live)[0];
    }
  }

  const [first] = [...tied].sort((a, b) => {
    const j = nn(b.joinedAtMatchIndex) - nn(a.joinedAtMatchIndex);
    if (j !== 0) return j;
    return comparePartyWorstFirst(a, b, live);
  });
  return first;
}

/** Lowest-series **active** (non–series-absconded) player — Treat sponsor tie-break uses latest match queue. */
export function partySponsorPlayer(tournament: Tournament): Player | undefined {
  const active = treatActivePlayers(tournament.players);
  if (!active.length) return undefined;
  const lastMatch =
    tournament.matches.length > 0 ? tournament.matches[tournament.matches.length - 1] : undefined;
  return resolvePartyBottomPlayer(active, undefined, lastMatch ?? null);
}

export function partyDangerPlayer(
  players: Player[],
  live?: Map<string, number>,
  orderMatch?: Match | null,
): Player | undefined {
  const active = treatActivePlayers(players);
  if (!active.length) return undefined;
  return resolvePartyBottomPlayer(active, live, orderMatch ?? null);
}

// ── MVP-based Treat helpers ───────────────────────────────────────────────────

/** Sort active players by MVP points ascending (lowest MVP = treat danger first) */
export function sortedByMvpWorstFirst(players: Player[], mvpById: Map<string, number>): Player[] {
  return [...players].sort((a, b) => {
    const ma = mvpById.get(a.id) ?? 0;
    const mb = mvpById.get(b.id) ?? 0;
    if (ma !== mb) return ma - mb;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/** Sort active players by MVP points descending (highest MVP = safest first) */
export function sortedByMvpBestFirst(players: Player[], mvpById: Map<string, number>): Player[] {
  return [...players].sort((a, b) => {
    const ma = mvpById.get(a.id) ?? 0;
    const mb = mvpById.get(b.id) ?? 0;
    if (ma !== mb) return mb - ma;
    return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
  });
}

/** Lowest-MVP active (non-absconded) player — the Treat danger player */
export function partyDangerByMvp(
  players: Player[],
  mvpById: Map<string, number>,
): Player | undefined {
  const active = treatActivePlayers(players);
  if (!active.length) return undefined;
  return sortedByMvpWorstFirst(active, mvpById)[0];
}

/** Lowest-MVP active player — the Treat sponsor at series end */
export function partySponsorByMvp(
  tournament: Tournament,
  mvpById: Map<string, number>,
): Player | undefined {
  const active = treatActivePlayers(tournament.players);
  if (!active.length) return undefined;
  return sortedByMvpWorstFirst(active, mvpById)[0];
}
