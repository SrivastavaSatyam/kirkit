'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Target, ChevronLeft, ChevronDown, ChevronUp,
  Star, Zap, Crown,
} from 'lucide-react';
import { useGame } from '@/lib/store';
import { computeSeriesMvp, computeMvpAwards, SeriesMvpEntry } from '@/lib/mvp';
import { useRouter } from 'next/navigation';
import { AvatarImg } from '@/components/AvatarImg';
import { avatarImgSrc } from '@/lib/default-squad';

// ─── Award card ───────────────────────────────────────────────────────────────

function AwardCard({
  emoji,
  label,
  player,
  accent,
  stat,
}: {
  emoji: string;
  label: string;
  player: SeriesMvpEntry | undefined;
  accent: string;
  stat?: string;
}) {
  if (!player) return null;
  return (
    <div className={`glass rounded-[24px] p-4 border ${accent}`}>
      <p className="text-lg mb-1">{emoji}</p>
      <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-space font-bold text-sm truncate">{player.playerName}</p>
      {stat && <p className="text-[10px] font-mono text-gray-400 mt-0.5">{stat}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MvpLeaderboard() {
  const { tournament, activeMatch } = useGame();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const seriesEntries = useMemo(() => {
    if (!tournament) return [];
    return computeSeriesMvp(tournament.matches, tournament.players, activeMatch);
  }, [tournament, activeMatch]);

  const awards = useMemo(() => computeMvpAwards(seriesEntries), [seriesEntries]);

  const hasAnyData = seriesEntries.some(
    p => p.totalRuns > 0 || p.totalWickets > 0 || p.totalCatches > 0,
  );
  const matchCount = (tournament?.matches.length ?? 0) + (activeMatch ? 1 : 0);

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
          <h1 className="text-3xl font-space font-black text-white italic uppercase tracking-tighter">
            Series MVP
          </h1>
          <p className="text-neon-yellow font-mono text-[8px] uppercase tracking-widest mt-1">
            {tournament?.name ?? 'KirKit'} · {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {!tournament || !hasAnyData ? (
        <div className="text-center py-24 opacity-30">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-neon-yellow" />
          <p className="font-space uppercase text-sm">No match data yet</p>
          <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Play a match to generate MVP stats</p>
        </div>
      ) : (
        <>
          {/* ── Series MVP hero ── */}
          {awards.seriesMvp && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass rounded-[40px] p-8 text-center border border-neon-yellow/30 bg-neon-yellow/5 mb-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Crown className="w-24 h-24 text-neon-yellow" />
              </div>
              <span className="text-[9px] font-mono bg-neon-yellow text-black px-3 py-1 rounded-full font-black uppercase mb-4 inline-block">
                🏆 Series MVP
              </span>
              <div className="w-20 h-20 rounded-3xl bg-gray-900 border-4 border-neon-yellow mx-auto my-4 overflow-hidden">
                <AvatarImg
                  src={avatarImgSrc({ name: awards.seriesMvp.playerName })}
                  alt="avatar"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <h2 className="text-3xl font-space font-black italic uppercase tracking-tighter mb-1">
                {awards.seriesMvp.playerName}
              </h2>
              <p className="text-3xl font-space font-black text-neon-yellow mb-4">
                {awards.seriesMvp.totalMvpPoints.toFixed(2)}
                <span className="text-sm font-mono text-neon-yellow/60 ml-1">MVP pts</span>
              </p>
              <div className="flex justify-center gap-6 text-center">
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Runs</p>
                  <p className="font-space font-black text-lg">{awards.seriesMvp.totalRuns}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Wickets</p>
                  <p className="font-space font-black text-lg">{awards.seriesMvp.totalWickets}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Catches</p>
                  <p className="font-space font-black text-lg">{awards.seriesMvp.totalCatches}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Awards grid ── */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <AwardCard
              emoji="🏏"
              label="Best Batter"
              player={awards.bestBatter}
              accent="border-neon-green/20"
              stat={awards.bestBatter ? `${awards.bestBatter.totalRuns} Runs` : undefined}
            />
            <AwardCard
              emoji="🎯"
              label="Best Bowler"
              player={awards.bestBowler}
              accent="border-neon-red/20"
              stat={awards.bestBowler ? `${awards.bestBowler.totalWickets} Wickets` : undefined}
            />
            <AwardCard
              emoji="🧤"
              label="Best Fielder"
              player={awards.bestFielder}
              accent="border-neon-blue/20"
              stat={awards.bestFielder ? `${awards.bestFielder.totalCatches} Catches` : undefined}
            />
            <AwardCard
              emoji="🔥"
              label="All Rounder"
              player={awards.allRounder}
              accent="border-neon-yellow/20"
              stat={awards.allRounder ? `${awards.allRounder.totalMvpPoints.toFixed(2)} pts` : undefined}
            />
          </div>

          {/* ── Full ranked list ── */}
          <div className="mb-4">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">
              Full Rankings
            </p>
            <div className="space-y-3">
              {seriesEntries.map((player, idx) => {
                const isTop = idx === 0;
                const expanded = expandedId === player.playerId;

                return (
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`glass-dark rounded-[28px] overflow-hidden border transition-all duration-200 ${
                      isTop ? 'border-neon-yellow/30' : 'border-white/5'
                    } ${player.isAbsconded ? 'opacity-50 grayscale' : ''}`}
                  >
                    {/* Row */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : player.playerId)}
                    >
                      {/* Rank badge */}
                      <div
                        className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-space font-black text-sm ${
                          isTop
                            ? 'bg-neon-yellow text-black'
                            : idx === 1
                              ? 'bg-gray-300 text-black'
                              : idx === 2
                                ? 'bg-orange-400 text-black'
                                : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-white/10">
                        <AvatarImg
                          src={avatarImgSrc({ name: player.playerName })}
                          alt="avatar"
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Name + sub-stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-space font-bold truncate">{player.playerName}</p>
                          {player.isAbsconded && (
                            <span className="text-[7px] font-mono bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full uppercase font-black shrink-0">
                              Absconded
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-gray-500 mt-0.5">
                          {player.totalRuns}R · {player.totalWickets}W · {player.totalCatches}C
                        </p>
                      </div>

                      {/* MVP points */}
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-space font-black tabular-nums ${isTop ? 'text-neon-yellow' : 'text-white'}`}>
                          {player.totalMvpPoints.toFixed(2)}
                        </p>
                        <p className="text-[8px] font-mono text-gray-500 uppercase">MVP pts</p>
                      </div>

                      <div className="shrink-0 text-gray-600">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded breakdown */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-5 pt-1 border-t border-white/5 space-y-4">
                            {/* Point breakdown */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-neon-green/5 border border-neon-green/20 rounded-2xl p-3 text-center">
                                <Zap className="w-3 h-3 text-neon-green mx-auto mb-1" />
                                <p className="text-[8px] font-mono text-gray-500 uppercase">Batting</p>
                                <p className="font-space font-black text-sm text-neon-green">
                                  {player.totalBattingMvpPoints.toFixed(2)}
                                </p>
                                <p className="text-[8px] font-mono text-gray-600">{player.totalRuns} runs</p>
                              </div>
                              <div className="bg-neon-red/5 border border-neon-red/20 rounded-2xl p-3 text-center">
                                <Target className="w-3 h-3 text-neon-red mx-auto mb-1" />
                                <p className="text-[8px] font-mono text-gray-500 uppercase">Bowling</p>
                                <p className="font-space font-black text-sm text-neon-red">
                                  {player.totalBowlingMvpPoints.toFixed(2)}
                                </p>
                                <p className="text-[8px] font-mono text-gray-600">{player.totalWickets}W</p>
                              </div>
                              <div className="bg-neon-blue/5 border border-neon-blue/20 rounded-2xl p-3 text-center">
                                <Star className="w-3 h-3 text-neon-blue mx-auto mb-1" />
                                <p className="text-[8px] font-mono text-gray-500 uppercase">Fielding</p>
                                <p className="font-space font-black text-sm text-neon-blue">
                                  {player.totalFieldingMvpPoints.toFixed(2)}
                                </p>
                                <p className="text-[8px] font-mono text-gray-600">{player.totalCatches}C</p>
                              </div>
                            </div>

                            {/* Total bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                                <span>MVP Breakdown</span>
                                <span>{player.totalMvpPoints.toFixed(2)} / 15.00 max per match</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                                {player.totalBattingMvpPoints > 0 && (
                                  <div
                                    className="h-full bg-neon-green"
                                    style={{
                                      width: `${Math.min(100, (player.totalBattingMvpPoints / Math.max(player.totalMvpPoints, 0.01)) * 100)}%`,
                                    }}
                                  />
                                )}
                                {player.totalBowlingMvpPoints > 0 && (
                                  <div
                                    className="h-full bg-neon-red"
                                    style={{
                                      width: `${Math.min(100, (player.totalBowlingMvpPoints / Math.max(player.totalMvpPoints, 0.01)) * 100)}%`,
                                    }}
                                  />
                                )}
                                {player.totalFieldingMvpPoints > 0 && (
                                  <div
                                    className="h-full bg-neon-blue"
                                    style={{
                                      width: `${Math.min(100, (player.totalFieldingMvpPoints / Math.max(player.totalMvpPoints, 0.01)) * 100)}%`,
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex gap-3 text-[7px] font-mono">
                                <span className="text-neon-green">■ Batting</span>
                                <span className="text-neon-red">■ Bowling</span>
                                <span className="text-neon-blue">■ Fielding</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-white/5 rounded-2xl">
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-2">How MVP Points Work</p>
            <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
              Each match: up to 5 pts batting + 5 pts bowling + 5 pts fielding = 15 max.
              Points are proportional — the best performer per category scores 5.00.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
