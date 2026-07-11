'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Crown, Zap, TrendingUp, TrendingDown, Minus,
  AlertCircle, ChevronDown, ChevronUp, ChevronLeft,
  Gift, Info, Target, Star,
} from 'lucide-react';
import { useGame } from '@/lib/store';
import { liveScoreMapFromMatch, sortedByMvpWorstFirst, sortedByMvpBestFirst, totalSeriesRuns, treatActivePlayers } from '@/lib/standings';
import { computeSeriesMvp } from '@/lib/mvp';
import { battleScoresForPlayer, trendLastVsPriorAvg } from '@/lib/match-history';
import { shouldShowLateEntryPill } from '@/lib/late-entry';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Leaderboard() {
  const { tournament, activeMatch } = useGame();
  const router = useRouter();
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // ── MVP-based rankings (primary sort) ──────────────────────────────────────
  const mvpEntries = useMemo(() => {
    if (!tournament) return [];
    return computeSeriesMvp(tournament.matches, tournament.players, activeMatch);
  }, [tournament, activeMatch]);

  // Map playerId → mvp entry for O(1) lookup
  const mvpById = useMemo(
    () => new Map(mvpEntries.map(e => [e.playerId, e])),
    [mvpEntries],
  );

  // Points-only map for standings/treat sorting helpers
  const mvpPointsById = useMemo(
    () => new Map(mvpEntries.map(e => [e.playerId, e.totalMvpPoints])),
    [mvpEntries],
  );

  // ── Build the enriched display list (MVP order) ────────────────────────────
  const sortedPlayersWithLive = useMemo(() => {
    if (!tournament) return [];

    const liveMap = liveScoreMapFromMatch(activeMatch);

    // mvpEntries already sorted by totalMvpPoints DESC; map back to Player
    const playerById = new Map(tournament.players.map(p => [p.id, p]));

    return mvpEntries.map((mvpEntry) => {
      const player = playerById.get(mvpEntry.playerId);
      if (!player) return null;

      const matchPlayer = activeMatch?.players.find(p => p.id === player.id);
      const liveSixes = matchPlayer != null ? (Number.isFinite(Number(matchPlayer.sixes)) ? Number(matchPlayer.sixes) : 0) : 0;
      const liveFours = matchPlayer != null ? (Number.isFinite(Number(matchPlayer.fours)) ? Number(matchPlayer.fours) : 0) : 0;

      const totalMatches     = Number.isFinite(Number(player.totalMatches))  ? Number(player.totalMatches)  : 0;
      const safeTotalSixes   = Number.isFinite(Number(player.totalSixes))    ? Number(player.totalSixes)    : 0;
      const safeTotalFours   = Number.isFinite(Number(player.totalFours))    ? Number(player.totalFours)    : 0;

      const displayRuns    = totalSeriesRuns(player, liveMap?.get(player.id));
      const displayMatches = totalMatches + (activeMatch ? 1 : 0);
      const battleScores   = battleScoresForPlayer(player.id, tournament.matches, activeMatch ?? null);
      const battleTrend    = trendLastVsPriorAvg(battleScores);
      const showLatePill   = shouldShowLateEntryPill(player.joinedAtMatchIndex, activeMatch, player.id, totalMatches);

      const isExcludedFromTreat =
        Boolean(player.seriesAbsconded) || matchPlayer?.status === 'absconded';

      return {
        ...player,
        // MVP stats
        totalMvpPoints:         mvpEntry.totalMvpPoints,
        totalBattingMvpPoints:  mvpEntry.totalBattingMvpPoints,
        totalBowlingMvpPoints:  mvpEntry.totalBowlingMvpPoints,
        totalFieldingMvpPoints: mvpEntry.totalFieldingMvpPoints,
        totalWickets:           mvpEntry.totalWickets,
        totalCatches:           mvpEntry.totalCatches,
        // Runs (for treat standings & secondary display)
        displayRuns,
        displayMatches,
        displaySixes:  safeTotalSixes + liveSixes,
        displayFours:  safeTotalFours + liveFours,
        isCurrentlyBatting: matchPlayer?.status === 'batting',
        isExcludedFromTreat,
        battleTrend,
        showLatePill,
        missedMatches: player.joinedAtMatchIndex,
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [tournament, activeMatch, mvpEntries]);

  // ── Treat zone: MVP-based (lowest MVP = danger) ────────────────────────────
  const treatPlayers = useMemo(
    () => sortedPlayersWithLive.filter(p => !p.isExcludedFromTreat),
    [sortedPlayersWithLive],
  );

  // Active Player objects for standings helpers
  const treatActiveSortedByMvp = useMemo(() => {
    if (!tournament) return [];
    const active = treatActivePlayers(tournament.players.filter(p =>
      !sortedPlayersWithLive.find(sp => sp.id === p.id)?.isExcludedFromTreat
    ));
    return sortedByMvpWorstFirst(active, mvpPointsById);
  }, [tournament, sortedPlayersWithLive, mvpPointsById]);

  const treatDangerPlayerId = treatActiveSortedByMvp.length > 1
    ? treatActiveSortedByMvp[0]?.id
    : undefined;

  // ── MVP-based treat standings (safest → most danger, for the section) ─────
  const treatStandingsByMvp = useMemo(() => {
    if (!tournament) return [];
    const active = treatActivePlayers(tournament.players.filter(p =>
      !sortedPlayersWithLive.find(sp => sp.id === p.id)?.isExcludedFromTreat
    ));
    return sortedByMvpBestFirst(active, mvpPointsById);
  }, [tournament, sortedPlayersWithLive, mvpPointsById]);

  return (
    <div className="min-h-screen bg-black px-6 pt-12 pb-32">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 glass rounded-xl flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-space font-black text-white italic uppercase tracking-tighter">Hall of Fame</h1>
          <p className="text-neon-green font-mono text-[8px] uppercase tracking-widest mt-1">
            {tournament?.name ?? 'KirKit standings'} · MVP Ranked
          </p>
        </div>
        <Link href="/mvp">
          <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
            <Star className="w-4 h-4 text-neon-yellow" />
          </div>
        </Link>
      </div>

      {/* ── MVP Rankings ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {sortedPlayersWithLive.length === 0 || (tournament && tournament.matches.length === 0 && !activeMatch) ? (
          <div className="text-center py-20 opacity-30">
            <Trophy className="w-12 h-12 mx-auto mb-4" />
            <p className="font-space uppercase text-sm">No matches played yet</p>
            <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Play a match to see rankings</p>
          </div>
        ) : (
          sortedPlayersWithLive.map((player, index) => {
            const isFirst          = index === 0;
            const isExcludedTreat  = player.isExcludedFromTreat;
            const isDanger         = !isExcludedTreat && player.id === treatDangerPlayerId;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group flex flex-col gap-2 sm:gap-3 rounded-[32px] overflow-hidden transition-all duration-300 ${
                  expandedPlayer === player.id ? 'glass p-6 ring-1 ring-white/10' : 'glass-dark p-4 border border-white/5'
                } ${isFirst && !isExcludedTreat ? 'ring-2 ring-neon-yellow/30' : ''} ${isDanger ? 'ring-2 ring-neon-red/30 shadow-[0_0_20px_rgba(255,49,49,0.1)]' : ''} ${isExcludedTreat ? 'opacity-[0.42] grayscale border-white/[0.03]' : ''}`}
              >
                {/* Status row */}
                {isExcludedTreat ? (
                  <div className="flex w-full min-w-0 flex-col gap-1 border-b border-white/5 pb-2">
                    <span className="inline-flex w-fit text-[7px] font-mono font-black uppercase bg-gray-600/30 text-gray-300 px-2 py-0.5 rounded-full">
                      ABSCONDED
                    </span>
                    <p className="text-[9px] font-mono font-semibold uppercase text-gray-500">
                      Excluded from Treat competition
                    </p>
                  </div>
                ) : isDanger ? (
                  <div className="flex w-full items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[7px] font-mono bg-neon-red/20 text-neon-red px-2 py-0.5 rounded-full uppercase font-black">
                      ⚠ Treat Zone
                    </span>
                    <Gift className="h-4 w-4 text-neon-red animate-pulse" />
                  </div>
                ) : isFirst && !isExcludedTreat ? (
                  <div className="flex w-full items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[7px] font-mono bg-neon-yellow/20 text-neon-yellow px-2 py-0.5 rounded-full uppercase font-black">
                      🏆 Elite Zone
                    </span>
                    <Crown className="h-4 w-4 text-neon-yellow animate-pulse" />
                  </div>
                ) : null}

                {/* Main row */}
                <div
                  className="flex w-full min-w-0 cursor-pointer flex-row items-center gap-2 sm:gap-4"
                  onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                    {/* Rank badge */}
                    <div className={`h-11 w-11 shrink-0 rounded-2xl text-lg font-space font-black flex items-center justify-center sm:h-12 sm:w-12 sm:text-xl ${
                      isExcludedTreat
                        ? 'bg-white/5 text-white/25'
                        : isFirst
                          ? 'bg-neon-yellow text-black'
                          : index === 1
                            ? 'bg-gray-300 text-black'
                            : index === 2
                              ? 'bg-orange-400 text-black'
                              : isDanger
                                ? 'bg-neon-red text-white shadow-[0_0_10px_rgba(255,49,49,0.5)]'
                                : 'bg-white/5 text-white/50'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Name + stats */}
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className={`min-w-0 truncate font-space text-base font-bold sm:text-lg ${isExcludedTreat ? 'text-white/50' : ''}`}>
                          {player.name}
                        </h3>
                        {isDanger && (
                          <span className="shrink-0 text-[8px] font-mono text-neon-red uppercase font-black px-2 py-0.5 bg-neon-red/10 rounded-full">
                            Treat Sponsor
                          </span>
                        )}
                        {player.isCurrentlyBatting && (
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-blue animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-mono text-gray-500 uppercase">{player.displayMatches} Battles</p>
                          {player.showLatePill && (
                            <span className="text-[7px] font-mono text-neon-blue uppercase">Late Entry</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-gray-400">
                            {player.displayRuns}R · {player.totalWickets}W · {player.totalCatches}C
                          </span>
                          {player.battleTrend === 'up'   && <TrendingUp   className="w-3 h-3 text-neon-green shrink-0" />}
                          {player.battleTrend === 'down' && <TrendingDown  className="w-3 h-3 text-neon-red shrink-0" />}
                          {player.battleTrend === 'flat' && <Minus         className="w-3 h-3 text-gray-600 shrink-0" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MVP points (primary metric) */}
                  <div className="ml-auto flex shrink-0 flex-row items-center gap-2">
                    <div className="text-right">
                      <p className={`text-2xl font-space font-black leading-none tabular-nums ${isFirst ? 'text-neon-yellow' : 'text-white'}`}>
                        {player.totalMvpPoints.toFixed(2)}
                      </p>
                      <p className="mt-0.5 text-[8px] font-mono uppercase text-gray-500">MVP pts</p>
                    </div>
                    <div className="flex shrink-0 items-center self-center">
                      {expandedPlayer === player.id
                        ? <ChevronUp   className="h-4 w-4 text-gray-600" />
                        : <ChevronDown className="h-4 w-4 text-gray-600" />}
                    </div>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                <AnimatePresence>
                  {expandedPlayer === player.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                        {/* MVP breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-neon-green/5 border border-neon-green/20 rounded-2xl text-center">
                            <Zap className="w-3 h-3 text-neon-green mx-auto mb-1" />
                            <p className="text-[8px] font-mono text-gray-500 uppercase">Batting</p>
                            <p className="font-space font-black text-sm text-neon-green">
                              {player.totalBattingMvpPoints.toFixed(2)}
                            </p>
                          </div>
                          <div className="p-3 bg-neon-red/5 border border-neon-red/20 rounded-2xl text-center">
                            <Target className="w-3 h-3 text-neon-red mx-auto mb-1" />
                            <p className="text-[8px] font-mono text-gray-500 uppercase">Bowling</p>
                            <p className="font-space font-black text-sm text-neon-red">
                              {player.totalBowlingMvpPoints.toFixed(2)}
                            </p>
                          </div>
                          <div className="p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-2xl text-center">
                            <Star className="w-3 h-3 text-neon-blue mx-auto mb-1" />
                            <p className="text-[8px] font-mono text-gray-500 uppercase">Fielding</p>
                            <p className="font-space font-black text-sm text-neon-blue">
                              {player.totalFieldingMvpPoints.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Raw stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-white/5 rounded-2xl">
                            <p className="text-[10px] font-mono text-gray-500 uppercase mb-2">Batting</p>
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-lg font-space font-black">{player.displayRuns}</p>
                                <p className="text-[8px] font-mono text-gray-500">Runs</p>
                              </div>
                              <div className="w-px h-8 bg-white/10" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-space font-bold text-sm">4s: {player.displayFours}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-space font-bold text-sm">6s: {player.displaySixes}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl">
                            <p className="text-[10px] font-mono text-gray-500 uppercase mb-2">Field</p>
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-lg font-space font-black text-neon-yellow">{player.totalWickets}</p>
                                <p className="text-[8px] font-mono text-gray-500">Wickets</p>
                              </div>
                              <div className="w-px h-8 bg-white/10" />
                              <div>
                                <p className="text-lg font-space font-black text-neon-blue">{player.totalCatches}</p>
                                <p className="text-[8px] font-mono text-gray-500">Catches</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Form */}
                        <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Batting Form</p>
                            <p className="font-space font-bold">
                              {player.displayMatches > 0 ? (player.displayRuns / player.displayMatches).toFixed(1) : '0'} Avg
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">MVP / Match</p>
                            <p className="font-space font-bold text-neon-yellow">
                              {player.displayMatches > 0 ? (player.totalMvpPoints / player.displayMatches).toFixed(2) : '0.00'}
                            </p>
                          </div>
                        </div>

                        {player.missedMatches > 0 && (
                          <div className="p-4 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl flex items-center gap-3">
                            <Info className="w-4 h-4 text-neon-blue" />
                            <p className="text-[10px] font-mono text-gray-300">
                              Joined after Match {player.missedMatches}. {player.missedMatches} past matches counted as 0.
                            </p>
                          </div>
                        )}

                        {isExcludedTreat && (
                          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                            <p className="text-gray-500 font-mono text-[8px] uppercase font-black mb-1">ABSCONDED</p>
                            <p className="text-[10px] text-gray-500 italic leading-tight">
                              Excluded from Treat competition — visible for overall ranking only.
                            </p>
                          </div>
                        )}

                        {/* Treat zone survival info (MVP-based) */}
                        {!isExcludedTreat && isDanger && treatActiveSortedByMvp.length >= 2 && (
                          <div className="p-4 rounded-2xl bg-neon-red/10 border border-neon-red/20 text-center">
                            <AlertCircle className="w-4 h-4 text-neon-red mx-auto mb-2" />
                            <p className="text-neon-red font-mono text-[10px] uppercase font-black mb-1">Treat Danger</p>
                            <p className="text-[10px] text-white/50 italic leading-tight">
                              {(() => {
                                const nextAbove = treatActiveSortedByMvp[1];
                                const myMvp = mvpPointsById.get(player.id) ?? 0;
                                const theirMvp = mvpPointsById.get(nextAbove?.id ?? '') ?? 0;
                                const gap = (theirMvp - myMvp).toFixed(2);
                                return `Gap to ${nextAbove?.name ?? '—'}: ${gap} MVP pts. Perform better to escape.`;
                              })()}
                            </p>
                          </div>
                        )}

                        {!isExcludedTreat && !isDanger && treatActiveSortedByMvp.length > 1 && (
                          <div className="p-4 bg-neon-green/10 border border-neon-green/20 rounded-2xl text-center">
                            <p className="text-neon-green font-mono text-[8px] uppercase font-black mb-1">Treat Safe Zone</p>
                            <p className="text-[10px] text-white/50 italic leading-tight">
                              {(() => {
                                const danger = treatActiveSortedByMvp[0];
                                const myMvp = mvpPointsById.get(player.id) ?? 0;
                                const dangerMvp = mvpPointsById.get(danger?.id ?? '') ?? 0;
                                return `Safe by ${(myMvp - dangerMvp).toFixed(2)} MVP pts over ${danger?.name ?? '—'}`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Treat Standings (MVP-based) ──────────────────────────────────────── */}
      {treatStandingsByMvp.length > 0 && (tournament?.matches.length ?? 0) + (activeMatch ? 1 : 0) > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-neon-red" />
            <p className="text-sm font-mono text-neon-red uppercase tracking-widest font-black">
              💀 Treat Standings
            </p>
            <span className="text-[8px] font-mono text-gray-600 ml-auto uppercase">MVP pts</span>
          </div>
          <div className="glass-dark rounded-[28px] overflow-hidden border border-neon-red/10">
            {treatStandingsByMvp.map((player, idx) => {
              const isBottom = idx === treatStandingsByMvp.length - 1;
              const pts = mvpPointsById.get(player.id) ?? 0;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-5 py-3 ${
                    idx < treatStandingsByMvp.length - 1 ? 'border-b border-white/5' : ''
                  } ${isBottom ? 'bg-neon-red/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-sm font-mono font-bold ${isBottom ? 'text-neon-red' : 'text-gray-600'}`}>
                      {idx + 1}
                    </span>
                    <p className={`font-space font-bold text-sm ${isBottom ? 'text-neon-red' : 'text-white'}`}>
                      {player.name}
                    </p>
                    {isBottom && (
                      <span className="text-[7px] font-mono bg-neon-red/20 text-neon-red px-1.5 py-0.5 rounded-full uppercase font-black">
                        ⚠ Danger
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-space font-black ${isBottom ? 'text-neon-red' : 'text-white'}`}>
                      {pts.toFixed(2)}
                    </p>
                    <p className="text-[8px] font-mono text-gray-600 uppercase">MVP pts</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] font-mono text-gray-600 mt-2 px-1">
            Treat Sponsor determined by lowest MVP points among active players.
          </p>
        </div>
      )}

      {!tournament && (
        <div className="mt-12">
          <Link href="/match/create">
            <button className="w-full py-4 glass rounded-2xl font-space font-black uppercase text-sm border-dashed border-white/10 text-gray-500">
              Start New Series to track stats
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
