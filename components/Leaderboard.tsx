'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Crown, Zap, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, Gift, Info } from 'lucide-react';
import { useGame } from '@/lib/store';
import { comparePartyBestFirst, liveScoreMapFromMatch, totalSeriesRuns } from '@/lib/standings';
import { battleScoresForPlayer, trendLastVsPriorAvg } from '@/lib/match-history';
import { shouldShowLateEntryPill } from '@/lib/late-entry';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Leaderboard() {
  const { tournament, activeMatch } = useGame();
  const router = useRouter();
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const sortedPlayersWithLive = useMemo(() => {
    if (!tournament) return [];

    const liveMap = liveScoreMapFromMatch(activeMatch);

    const sorted = [...tournament.players].sort((a, b) => comparePartyBestFirst(a, b, liveMap));

    return sorted.map((player) => {
      const matchPlayer = activeMatch?.players.find((p) => p.id === player.id);
      const liveSixesRaw = matchPlayer != null ? Number(matchPlayer.sixes) : 0;
      const liveFoursRaw = matchPlayer != null ? Number(matchPlayer.fours) : 0;
      const liveSixes = Number.isFinite(liveSixesRaw) ? liveSixesRaw : 0;
      const liveFours = Number.isFinite(liveFoursRaw) ? liveFoursRaw : 0;
      const totalMatches = Number(player.totalMatches);
      const totalSixes = Number(player.totalSixes);
      const totalFours = Number(player.totalFours);
      const safeTotalMatches = Number.isFinite(totalMatches) ? totalMatches : 0;
      const safeTotalSixes = Number.isFinite(totalSixes) ? totalSixes : 0;
      const safeTotalFours = Number.isFinite(totalFours) ? totalFours : 0;

      const displayRuns = totalSeriesRuns(player, liveMap?.get(player.id));
      const displayMatches = safeTotalMatches + (activeMatch ? 1 : 0);
      const battleScores = battleScoresForPlayer(player.id, tournament.matches, activeMatch ?? null);
      const battleTrend = trendLastVsPriorAvg(battleScores);
      const runsPerBattle = displayMatches > 0 ? displayRuns / displayMatches : 0;
      const showLatePill = shouldShowLateEntryPill(
        player.joinedAtMatchIndex,
        activeMatch,
        player.id,
        safeTotalMatches
      );

      return {
        ...player,
        displayRuns,
        displayMatches,
        displaySixes: safeTotalSixes + liveSixes,
        displayFours: safeTotalFours + liveFours,
        isCurrentlyBatting: matchPlayer?.status === 'batting',
        isAbscondedInMatch: matchPlayer?.status === 'absconded',
        runsPerBattle,
        battleTrend,
        showLatePill,
      };
    });
  }, [tournament, activeMatch]);

  return (
    <div className="min-h-screen bg-black px-6 pt-12 pb-32">
      <div className="mb-10 flex items-center justify-between">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
           <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-space font-black text-white italic uppercase tracking-tighter">Hall of Fame</h1>
          <p className="text-neon-green font-mono text-[8px] uppercase tracking-widest mt-1">
            {tournament?.name || 'KirKit standings'}
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {sortedPlayersWithLive.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <Trophy className="w-12 h-12 mx-auto mb-4" />
            <p className="font-space uppercase text-sm">No KirKit series yet</p>
          </div>
        ) : (
          sortedPlayersWithLive.map((player, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedPlayersWithLive.length - 1;
            const isDanger = isLast && sortedPlayersWithLive.length > 1;
            const missedMatches = player.joinedAtMatchIndex;
            const showLatePill = player.showLatePill;
            
            const isAbscondedInMatch = player.isAbscondedInMatch;

            return (
              <motion.div 
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative rounded-[32px] overflow-hidden transition-all duration-300 ${
                  expandedPlayer === player.id ? 'glass p-6 ring-1 ring-white/10' : 'glass-dark p-4 border border-white/5'
                } ${isFirst ? 'ring-2 ring-neon-yellow/30' : ''} ${isDanger ? 'ring-2 ring-neon-red/30 shadow-[0_0_20px_rgba(255,49,49,0.1)]' : ''} ${isAbscondedInMatch ? 'opacity-50' : ''}`}
              >
                {isFirst && (
                  <div className="absolute top-2 right-4 flex gap-2">
                    <span className="text-[7px] font-mono bg-neon-yellow/20 text-neon-yellow px-2 py-0.5 rounded-full uppercase font-black">Elite Zone</span>
                    <Crown className="w-4 h-4 text-neon-yellow animate-pulse" />
                  </div>
                )}
                {isAbscondedInMatch && (
                  <div className="absolute top-2 right-4 flex gap-2">
                    <span className="text-[7px] font-mono bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full uppercase font-black">ABSCONDED</span>
                  </div>
                )}
                {isDanger && !isAbscondedInMatch && (
                  <div className="absolute top-2 right-4 flex gap-2">
                    <span className="text-[7px] font-mono bg-neon-red/20 text-neon-red px-2 py-0.5 rounded-full uppercase font-black shrink-0">Treat Zone</span>
                    <Gift className="w-4 h-4 text-neon-red animate-pulse" />
                  </div>
                )}

                <div 
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-space font-black text-xl shadow-inner ${
                    isFirst ? 'bg-neon-yellow text-black' : 
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-400 text-black' :
                    isDanger ? 'bg-neon-red text-white shadow-[0_0_10px_rgba(255,49,49,0.5)]' : 'bg-white/5 text-white/50'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <h3 className="text-lg font-space font-bold truncate max-w-[120px]">{player.name}</h3>
                       {isDanger && <span className="text-[8px] font-mono text-neon-red uppercase font-black px-2 py-0.5 bg-neon-red/10 rounded-full">Treat Sponsor</span>}
                       {player.isCurrentlyBatting && <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-mono text-gray-500 uppercase">{player.displayMatches} Battles</p>
                        {showLatePill && (
                          <span className="text-[7px] font-mono text-neon-blue uppercase">Late Entry</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-gray-400">
                          {player.displayMatches > 0 ? `${player.runsPerBattle.toFixed(1)} R/battle` : '— R/battle'}
                        </span>
                        {player.battleTrend === 'up' && (
                          <span className="inline-flex" title="Last battle above prior average">
                            <TrendingUp className="w-3.5 h-3.5 text-neon-green shrink-0" />
                          </span>
                        )}
                        {player.battleTrend === 'down' && (
                          <span className="inline-flex" title="Last battle below prior average">
                            <TrendingDown className="w-3.5 h-3.5 text-neon-red shrink-0" />
                          </span>
                        )}
                        {player.battleTrend === 'flat' && (
                          <span className="inline-flex" title="In line with prior average">
                            <Minus className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-2xl font-space font-black leading-none ${isFirst ? 'text-neon-yellow' : 'text-white'}`}>
                      {player.displayRuns}
                    </p>
                    <p className="text-[8px] font-mono text-gray-500 uppercase mt-0.5">
                       {activeMatch ? 'Live' : 'Total'}
                    </p>
                  </div>

                  <div className="ml-2">
                    {expandedPlayer === player.id ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedPlayer === player.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl">
                            <p className="text-[10px] font-mono text-gray-500 uppercase mb-2">4s &amp; 6s</p>
                            <div className="flex items-center gap-4">
                               <div className="flex items-center gap-1.5">
                                  < Zap className="w-3 h-3 text-neon-green" />
                                  <span className="font-space font-bold text-sm">4s: {player.displayFours}</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-3 h-3 text-neon-blue" />
                                  <span className="font-space font-bold text-sm">6s: {player.displaySixes}</span>
                               </div>
                            </div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl text-center">
                             <p className="text-[10px] font-mono text-gray-500 uppercase mb-2">Form</p>
                             <p className="font-space font-bold text-sm">
                               {player.displayMatches > 0 ? (player.displayRuns / player.displayMatches).toFixed(1) : '0'} Avg
                             </p>
                          </div>
                        </div>

                        {missedMatches > 0 && (
                          <div className="p-4 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl flex items-center gap-3">
                             <Info className="w-4 h-4 text-neon-blue" />
                             <p className="text-[10px] font-mono text-gray-300">
                               Joined after Match {missedMatches}. {missedMatches} past matches counted as 0 runs.
                             </p>
                          </div>
                        )}

                        {!isDanger && !isFirst && (
                          <div className="p-4 bg-neon-green/10 border border-neon-green/20 rounded-2xl text-center">
                             <p className="text-neon-green font-mono text-[8px] uppercase font-black mb-1">Safe Zone</p>
                             <p className="text-[10px] text-white/50 italic leading-tight">
                               Currently safe. Gap to Treat Zone: {player.displayRuns - sortedPlayersWithLive[sortedPlayersWithLive.length-1].displayRuns} runs.
                             </p>
                          </div>
                        )}
                        
                        {isDanger && (
                          <div className="p-4 rounded-2xl bg-neon-red/10 border border-neon-red/20 text-center">
                             <AlertCircle className="w-4 h-4 text-neon-red mx-auto mb-2" />
                             <p className="text-neon-red font-mono text-[10px] uppercase font-black mb-1">Treat survival</p>
                             <p className="text-[10px] text-white/50 italic leading-tight">
                               Gap to {sortedPlayersWithLive[sortedPlayersWithLive.length-2].name}: {sortedPlayersWithLive[sortedPlayersWithLive.length-2].displayRuns - player.displayRuns} runs. Needs {sortedPlayersWithLive[sortedPlayersWithLive.length-2].displayRuns - player.displayRuns + 1} to escape the Treat Zone!
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
