'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '@/lib/store';
import {
  liveScoreMapFromMatch,
  sortedByPartyBestFirst,
  sortedByPartyWorstFirst,
  totalSeriesRuns,
} from '@/lib/standings';
import { MAX_LEGAL_BALLS, calculatePlayerStats, type Match, type Tournament } from '@/lib/types';
import { Trophy, Undo, ChevronRight, ChevronLeft, Zap, Target, AlertCircle, TrendingDown, Flame, UserPlus, Settings, X, Plus, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { shouldShowLateEntryPill } from '@/lib/late-entry';
import { avatarImgSrc } from '@/lib/default-squad';
import { AvatarImg } from '@/components/AvatarImg';

type BattingQueueStripProps = {
  activeMatch: Match;
  tournament: Tournament | null;
  prevScoreById: Record<string, number>;
  maxRankBoostById: Record<string, number>;
};

function BattingQueueStrip({ activeMatch, tournament, prevScoreById, maxRankBoostById }: BattingQueueStripProps) {
  const [trendExpandedId, setTrendExpandedId] = useState<string | null>(null);

  return (
    <div className="px-4 sm:px-6 py-1.5 shrink-0 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/40">
      <div className="flex items-center gap-3 min-w-max">
        {activeMatch.players.map((p, idx) => {
          const prevRuns = prevScoreById[p.id] ?? 0;
          const inningsRuns = calculatePlayerStats(p.history).score;
          const tp = tournament?.players.find((t) => t.id === p.id);
          const seriesTotal = totalSeriesRuns(tp ?? p, inningsRuns);
          const rankBoost = maxRankBoostById[p.id] ?? 0;
          const expanded = trendExpandedId === p.id;

          return (
            <motion.button
              layout
              type="button"
              key={p.id}
              initial={false}
              onClick={() => setTrendExpandedId((id) => (id === p.id ? null : p.id))}
              aria-pressed={expanded}
              aria-label={
                expanded
                  ? `${p.name}, ${seriesTotal} series total runs, tap for previous match`
                  : `${p.name}, ${prevRuns} runs last match, tap for series total`
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 text-left cursor-pointer select-none active:scale-[0.98] ${
                p.status === 'batting'
                  ? 'bg-neon-blue/20 border-neon-blue text-neon-blue ring-2 ring-neon-blue/20 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                  : p.status === 'completed'
                    ? 'bg-gray-900/50 border-white/5 text-gray-500 opacity-50'
                    : p.status === 'absconded'
                      ? 'bg-neon-red/10 border-neon-red/20 text-neon-red/50 opacity-40 grayscale'
                      : 'glass border-white/10 text-white/70'
              } ${expanded ? 'ring-1 ring-neon-yellow/40 border-neon-yellow/30' : ''}`}
            >
              <div className="flex flex-col items-center justify-center leading-none min-w-[14px]">
                <span className="text-[7px] font-space font-black opacity-50">{idx + 1}</span>
                {rankBoost > 0 && (
                  <span
                    className="text-[6px] font-mono font-bold text-neon-green"
                    title="Series rank vs match start (peak this match)"
                  >
                    ↑{rankBoost}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-space font-bold whitespace-nowrap">{p.name}</span>
                  {rankBoost > 0 ? (
                    <span className="text-[9px]">🔥</span>
                  ) : (
                    <span className="text-[9px] opacity-40">⚡</span>
                  )}
                </div>
                {expanded ? (
                  <span className="text-[6px] font-mono text-neon-yellow uppercase tracking-tighter">
                    Total: {seriesTotal}R
                  </span>
                ) : (
                  <span className="text-[6px] font-mono text-gray-500 uppercase tracking-tighter">Prev: {prevRuns}R</span>
                )}
              </div>
              {p.status === 'batting' && (
                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveScoring() {
  const {
    gameHydrated,
    tournament,
    activeMatch,
    recordBall,
    undoBall,
    nextBatter,
    closeMatch,
    discardActiveMatch,
    addPlayerToSeries,
    togglePlayerAbsconded,
    endSeries,
  } = useGame();
  const router = useRouter();
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [showEndSeriesConfirm, setShowEndSeriesConfirm] = useState(false);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNickname, setNewPlayerNickname] = useState('');
  const [showNextBatterOverlay, setShowNextBatterOverlay] = useState<{name: string, runsNeeded?: number} | null>(null);
  const [showHalfOver, setShowHalfOver] = useState(false);
  /** Peak rank improvement (match-start → now); never decreases during this match */
  const [maxRankBoostById, setMaxRankBoostById] = useState<Record<string, number>>({});
  const startRanksRef = useRef<{ matchId: string; ranks: Record<string, number> }>({
    matchId: '',
    ranks: {},
  });
  const halfOverGateRef = useRef(false);
  const halfOverBatterRef = useRef<string | null>(null);
  /** After a 4 or 6 on the 6th legal ball, wait for celebration overlay to clear before half-over UI. */
  const halfOverAfterCelebrationMsRef = useRef(0);

  useEffect(() => {
    if (!gameHydrated) return;
    if (!activeMatch) router.push('/dashboard');
  }, [gameHydrated, activeMatch, router]);

  const handleNextBatter = () => {
    if (!activeMatch) return;
    const nextIndex = activeMatch.players.findIndex((p, i) => i > activeMatch.currentBatterIndex && p.status === 'pending');
    const nextP = nextIndex !== -1 ? activeMatch.players[nextIndex] : activeMatch.players.find(p => p.status === 'pending');
    
    if (nextP) {
      setShowNextBatterOverlay({ name: nextP.name });
      setTimeout(() => {
        nextBatter();
        setShowNextBatterOverlay(null);
      }, 2500);
    }
  };

  const survivalData = useMemo(() => {
    if (!tournament || !activeMatch) return null;

    const currentPlayer = activeMatch.players[activeMatch.currentBatterIndex];
    if (!currentPlayer) return null;

    const liveMap = liveScoreMapFromMatch(activeMatch);
    const sortedPlayers = sortedByPartyWorstFirst(tournament.players, liveMap);
    const lowestPlayer = sortedPlayers[0];
    const tpCurrent = tournament.players.find((p) => p.id === currentPlayer.id);
    const totalCumulative = totalSeriesRuns(tpCurrent ?? currentPlayer, liveMap?.get(currentPlayer.id));

    const seriesTotal = (p: (typeof tournament.players)[number]) =>
      totalSeriesRuns(p, liveMap?.get(p.id));
    const minRuns = seriesTotal(lowestPlayer);
    /** Party danger = tied for lowest series total (must go strictly above min to leave the bottom tier). */
    const isCurrentLast = totalCumulative === minRuns;

    if (sortedPlayers.length < 2) {
      return {
        isCurrentLast: sortedPlayers.length === 1 && isCurrentLast,
        runsNeeded: 0,
        safeTarget: 0,
        totalCumulative,
        lowestName: lowestPlayer.name,
      };
    }

    const countAtMinimum = sortedPlayers.filter((p) => seriesTotal(p) === minRuns).length;
    const tiedForMinimum = countAtMinimum >= 2;

    let safeTarget = 0;
    let runsNeeded = 0;

    if (isCurrentLast) {
      if (tiedForMinimum) {
        safeTarget = minRuns + 1;
        runsNeeded = Math.max(0, safeTarget - totalCumulative);
      } else {
        const nextPlayer = sortedPlayers[1];
        safeTarget = seriesTotal(nextPlayer) + 1;
        runsNeeded = Math.max(0, safeTarget - totalCumulative);
      }
    }

    return {
      isCurrentLast,
      runsNeeded,
      safeTarget,
      totalCumulative,
      lowestName: lowestPlayer.name,
    };
  }, [tournament, activeMatch]);

  const prevScoreById = useMemo(() => {
    if (!tournament?.matches?.length) return {};
    const lastMatch = tournament.matches[tournament.matches.length - 1];
    const m: Record<string, number> = {};
    for (const lp of lastMatch.players) {
      const s = Number(lp.score);
      m[lp.id] = Number.isFinite(s) ? s : 0;
    }
    return m;
  }, [tournament]);

  useEffect(() => {
    if (!tournament || !activeMatch) return;

    const liveMap = liveScoreMapFromMatch(activeMatch);
    if (!liveMap) return;

    const ids = new Set(activeMatch.players.map((p) => p.id));
    const inMatchTournament = tournament.players.filter((tp) => ids.has(tp.id));
    const sortedNow = sortedByPartyBestFirst(inMatchTournament, liveMap);
    const curRank: Record<string, number> = {};
    sortedNow.forEach((p, i) => {
      curRank[p.id] = i + 1;
    });

    if (startRanksRef.current.matchId !== activeMatch.id) {
      const zeroLive = new Map(activeMatch.players.map((ap) => [ap.id, 0]));
      const atStart = sortedByPartyBestFirst(inMatchTournament, zeroLive);
      const ranks: Record<string, number> = {};
      atStart.forEach((p, i) => {
        ranks[p.id] = i + 1;
      });
      startRanksRef.current = { matchId: activeMatch.id, ranks };

      const initial: Record<string, number> = {};
      for (const p of activeMatch.players) {
        const start = ranks[p.id] ?? curRank[p.id];
        const raw = start - curRank[p.id];
        initial[p.id] = Math.max(0, raw);
      }
      setMaxRankBoostById(initial);
      return;
    }

    setMaxRankBoostById((prev) => {
      const next = { ...prev };
      for (const p of activeMatch.players) {
        const start = startRanksRef.current.ranks[p.id] ?? curRank[p.id];
        const raw = start - curRank[p.id];
        next[p.id] = Math.max(prev[p.id] ?? 0, raw);
      }
      return next;
    });
  }, [tournament, activeMatch]);

  useEffect(() => {
    if (!activeMatch) return;
    const cp = activeMatch.players[activeMatch.currentBatterIndex];
    if (!cp) return;
    if (cp.id !== halfOverBatterRef.current) {
      halfOverBatterRef.current = cp.id;
      halfOverGateRef.current = false;
    }
    const bf = cp.ballsFaced;
    if (bf < 6) halfOverGateRef.current = false;
    if (bf === 6 && cp.status === 'batting' && !halfOverGateRef.current) {
      halfOverGateRef.current = true;
      const delayMs = halfOverAfterCelebrationMsRef.current;
      halfOverAfterCelebrationMsRef.current = 0;

      let hideHalfOverTimer: number | undefined;
      const showHalfOverTimer = window.setTimeout(() => {
        setShowHalfOver(true);
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#FFD700', '#39FF14', '#00F3FF'],
        });
        hideHalfOverTimer = window.setTimeout(() => setShowHalfOver(false), 2600);
      }, delayMs);

      return () => {
        window.clearTimeout(showHalfOverTimer);
        if (hideHalfOverTimer !== undefined) window.clearTimeout(hideHalfOverTimer);
      };
    }
  }, [activeMatch]);

  const matchIsPristine = useMemo(() => {
    if (!activeMatch) return false;
    return activeMatch.players.every((p) => p.history.length === 0);
  }, [activeMatch]);

  const handleLeaveMatch = useCallback(() => {
    if (activeMatch && activeMatch.players.every((p) => p.history.length === 0)) {
      discardActiveMatch();
    }
    router.push('/dashboard');
  }, [activeMatch, discardActiveMatch, router]);

  if (!activeMatch) return null;

  const currentPlayer = activeMatch.players[activeMatch.currentBatterIndex];
  const isBatterDone = currentPlayer?.status === 'completed';

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayerToSeries(newPlayerName.trim(), newPlayerNickname.trim());
      setNewPlayerName('');
      setNewPlayerNickname('');
      setShowAddPlayer(false);
    }
  };

  const handleScore = (type: '4' | '6' | 'WIDE' | 'NO_BALL' | 'OUT' | 'DOT') => {
    if (isBatterDone || !activeMatch) return;
    const striker = activeMatch.players[activeMatch.currentBatterIndex];
    if (!striker) return;

    let celebrationClearMs = 1500;

    if (type === '6') {
      const sixOnSixthLegal = striker.ballsFaced === 5;

      setShowCelebration('SIXER!');
      if (sixOnSixthLegal) {
        celebrationClearMs = 2600;
        confetti({
          particleCount: 90,
          spread: 65,
          origin: { y: 0.55 },
          colors: ['#71717a', '#a855f7', '#eab308', '#52525b'],
        });
        confetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.62 },
          colors: ['#00F3FF', '#39FF14'],
        });
      } else {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00F3FF', '#39FF14'],
        });
      }
    } else if (type === '4') {
      setShowCelebration('FOUR!');
    } else if (type === 'OUT') {
      setShowCelebration('OUT!');
    }

    if ((type === '6' || type === '4') && striker.ballsFaced === 5) {
      halfOverAfterCelebrationMsRef.current = celebrationClearMs + 250;
    } else {
      halfOverAfterCelebrationMsRef.current = 0;
    }

    recordBall(type);
    window.setTimeout(() => setShowCelebration(null), celebrationClearMs);
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(57,255,20,0.1)_0%,transparent_60%)]" />

      {/* Top Header */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-black/85 px-3 py-2.5 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleLeaveMatch}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass active:scale-95 text-white/75"
            aria-label={matchIsPristine ? 'Leave and cancel match' : 'Back to dashboard'}
            title={matchIsPristine ? 'No balls yet — exit drops this match (not counted)' : 'Back to dashboard'}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl glass sm:h-10 sm:w-10">
            <Target className="h-4 w-4 text-neon-blue sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[10px] font-mono uppercase tracking-widest text-gray-400 sm:text-xs">{activeMatch.name}</h2>
            <p className="truncate text-xs font-space font-bold text-neon-green sm:text-sm">{activeMatch.location}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={undoBall}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass active:scale-90 text-white/50"
          aria-label="Undo last ball"
        >
          <Undo className="h-5 w-5" />
        </button>
      </header>

      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <AnimatePresence>
        {survivalData && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-4 pb-2 sm:px-6"
          >
            <div className={`rounded-xl p-3 flex items-center justify-between border ${
              survivalData.isCurrentLast 
                ? 'bg-neon-red/10 border-neon-red/30 shadow-[0_0_15px_rgba(255,49,49,0.2)]' 
                : 'bg-neon-green/10 border-neon-green/30'
            }`}>
              <div className="flex items-center gap-2">
                {survivalData.isCurrentLast ? (
                  <TrendingDown className="w-4 h-4 text-neon-red animate-pulse" />
                ) : (
                  <Flame className="w-4 h-4 text-neon-green animate-bounce" />
                )}
                <div>
                   <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                     {survivalData.isCurrentLast ? 'Treat Danger Zone' : 'Survival Status'}
                   </p>
                   <p className="text-xs font-space font-bold">
                     {survivalData.isCurrentLast 
                       ? `Need ${survivalData.runsNeeded} to survive` 
                       : 'Currently Safe 🔥'}
                   </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-gray-500 uppercase">Cumulative</p>
                <p className="text-sm font-space font-bold">{survivalData.totalCumulative}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BattingQueueStrip
        key={activeMatch.id}
        activeMatch={activeMatch}
        tournament={tournament}
        prevScoreById={prevScoreById}
        maxRankBoostById={maxRankBoostById}
      />

      {/* Main Score Area */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-3 pt-2 sm:px-6">
        <motion.div 
          key={currentPlayer.score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative text-center w-full max-w-[min(100vw-2rem,28rem)]"
        >
          <div className="text-[clamp(3.25rem,16vw,6.25rem)] font-space font-black leading-none mb-3 sm:mb-4 select-none tabular-nums">
            {currentPlayer.score}
          </div>
        </motion.div>

        {/* Player Info Card */}
        <div className="w-full glass-dark rounded-[28px] border-t border-white/10 p-4 sm:rounded-[32px] sm:p-6">
          <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-neon-green bg-gray-800 sm:h-14 sm:w-14">
               <AvatarImg
                 src={avatarImgSrc(currentPlayer)}
                 alt="avatar"
                 width={56}
                 height={56}
                 className="h-full w-full object-cover"
               />
            </div>
            <div className="flex-1">
              <h3 className="truncate text-lg font-space font-bold sm:text-xl">{currentPlayer.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500">strike rate:</span>
                <span className="text-sm font-space font-bold text-neon-blue">
                  {currentPlayer.ballsFaced > 0 ? ((currentPlayer.score / currentPlayer.ballsFaced) * 100).toFixed(0) : '0'}%
                </span>
              </div>
            </div>
            <div className="text-right">
               <div className="font-space font-black text-2xl">
                 {currentPlayer.ballsFaced}<span className="text-gray-600 text-sm ml-1">/ {MAX_LEGAL_BALLS}</span>
               </div>
               <p className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Balls</p>
            </div>
          </div>

          <div className="flex justify-between items-center gap-1.5">
            {Array.from({ length: MAX_LEGAL_BALLS }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 flex-1 rounded-full ${
                  i < currentPlayer.ballsFaced 
                    ? 'bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.5)]' 
                    : 'bg-white/10'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Action Area — fixed dock so score strip never blocks scoring */}
      <div className="relative z-40 shrink-0 border-t border-white/10 bg-gradient-to-t from-black via-black/98 to-black px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] sm:px-6 sm:pb-6 sm:pt-4">
        <AnimatePresence>
          {isBatterDone ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="glass rounded-[32px] p-6 text-center border-neon-yellow/30 relative">
                <AlertCircle className="w-8 h-8 text-neon-yellow mx-auto mb-3" />
                <h4 className="text-xl font-space font-bold mb-1">Innings Over!</h4>
                <p className="text-sm text-gray-400 mb-6">Total Match Score: {currentPlayer.score}</p>
                
                {/* Dynamic Action Panel */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button 
                    onClick={() => setShowAddPlayer(true)}
                    className="py-4 glass rounded-2xl text-[10px] font-space font-black uppercase tracking-tighter flex items-center justify-center gap-2 border-white/5 active:scale-95 transition-transform text-neon-blue"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Player
                  </button>
                  <button 
                    onClick={() => setShowManagePlayers(true)}
                    className="py-4 glass rounded-2xl text-[10px] font-space font-black uppercase tracking-tighter flex items-center justify-center gap-2 border-white/5 active:scale-95 transition-transform text-neon-green"
                  >
                    <Settings className="w-3.5 h-3.5" /> Manage SQD
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeMatch.players.some(p => p.status === 'pending') ? (
                    <button 
                      onClick={handleNextBatter}
                      className="col-span-2 py-5 bg-neon-green text-black rounded-2xl text-sm font-space font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(57,255,20,0.3)] animate-pulse"
                    >
                      Next Batter <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          closeMatch();
                          router.push('/dashboard');
                        }}
                        className="py-5 bg-neon-blue text-black rounded-2xl text-[11px] font-space font-black uppercase italic flex items-center justify-center gap-2"
                      >
                         Finish Match <ChevronRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          closeMatch();
                          setShowEndSeriesConfirm(true);
                        }}
                        className="py-5 glass rounded-2xl text-[11px] font-space font-black uppercase italic border-neon-red/30 text-neon-red flex items-center justify-center gap-2"
                      >
                        End Series <Flame className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push('/leaderboard')}
                        className="col-span-2 py-4 glass rounded-2xl text-[11px] font-space font-bold border-white/5 text-gray-500 uppercase tracking-widest"
                      >
                        View Leaderboard
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid min-h-[10.5rem] grid-cols-2 gap-3 sm:min-h-[12.5rem] sm:gap-4">
              <div className="grid grid-rows-2 gap-4">
                 <motion.button 
                   id="score-btn-4"
                   whileTap={{ scale: 0.95 }}
                   onClick={() => handleScore('4')}
                   className="glass-dark rounded-[24px] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden"
                 >
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Zap className="w-8 h-8 text-neon-green" />
                   </div>
                   <span className="text-4xl font-space font-extrabold text-neon-green">+4</span>
                 </motion.button>
                 <div className="grid grid-cols-3 gap-2">
                    <button id="score-btn-dot" onClick={() => handleScore('DOT')} className="glass rounded-xl flex items-center justify-center font-mono text-[8px] uppercase border-white/5 active:bg-white/10">Dot</button>
                    <button id="score-btn-wide" onClick={() => handleScore('WIDE')} className="glass rounded-xl flex items-center justify-center font-mono text-[8px] uppercase border-white/5 active:bg-white/10">Wide</button>
                    <button id="score-btn-nb" onClick={() => handleScore('NO_BALL')} className="glass rounded-xl flex items-center justify-center font-mono text-[8px] uppercase border-white/5 active:bg-white/10">NB</button>
                 </div>
              </div>

              <div className="grid grid-rows-2 gap-4">
                <motion.button 
                   id="score-btn-6"
                   whileTap={{ scale: 0.95 }}
                   onClick={() => handleScore('6')}
                   className="bg-neon-blue rounded-[24px] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                 >
                   <span className="text-4xl font-space font-extrabold text-black">+6</span>
                 </motion.button>
                 <button 
                   id="score-btn-out"
                   onClick={() => handleScore('OUT')}
                   className="bg-neon-red/10 border border-neon-red/30 rounded-xl flex items-center justify-center font-space font-black uppercase text-neon-red active:bg-neon-red/20"
                 >
                   Out
                 </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
          >
            <div
              className={`text-5xl sm:text-6xl font-space font-black uppercase tracking-tighter italic text-center px-6 ${
                showCelebration === 'OUT!'
                  ? 'text-neon-red'
                  : showCelebration === 'SIXER!'
                    ? 'text-neon-blue'
                    : 'text-neon-green'
              } [text-shadow:0_0_40px_rgba(255,255,255,0.35)]`}
            >
              {showCelebration}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHalfOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[55] flex flex-col items-center justify-center pointer-events-none bg-black/50 backdrop-blur-[2px]"
          >
            <div className="text-center px-8">
              <p className="text-[10px] font-mono text-neon-yellow uppercase tracking-[0.35em] mb-3">Over complete</p>
              <p className="text-5xl font-space font-black italic uppercase text-white tracking-tighter mb-2">6 balls</p>
              <p className="text-sm font-mono text-gray-400">Second wind — balls 7–12</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Next Batter Transition Overlay */}
      <AnimatePresence>
        {showNextBatterOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <span className="text-neon-blue font-mono text-xs uppercase tracking-[0.3em] font-black">NEXT BATTER</span>
                <div className="w-24 h-24 rounded-3xl bg-gray-900 border-2 border-neon-blue flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                   <AvatarImg
                     src={avatarImgSrc({ name: showNextBatterOverlay.name })}
                     alt="avatar"
                     width={96}
                     height={96}
                     className="h-full w-full object-cover"
                   />
                </div>
              </div>
              
              <div>
                <h2 className="text-5xl font-space font-black italic uppercase tracking-tighter text-white mb-2">
                   {showNextBatterOverlay.name}
                </h2>
                <p className="text-neon-green font-space font-bold animate-pulse">🔥 Incoming Powerhouse</p>
              </div>

              <div className="w-12 h-1 bg-neon-blue/20 rounded-full mx-auto overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="w-full h-full bg-neon-blue"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Series Confirmation */}
      <AnimatePresence>
        {showEndSeriesConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-8 rounded-[40px] w-full max-w-xs border-neon-red/30 text-center"
            >
              <div className="w-16 h-16 bg-neon-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Flame className="w-8 h-8 text-neon-red animate-pulse" />
              </div>
              <h2 className="text-2xl font-space font-black italic uppercase tracking-tighter mb-2 text-white">END SERIES?</h2>
              <p className="text-gray-400 text-sm mb-8">This will finalize all match records and crown the Treat Sponsor.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    endSeries();
                    router.push('/results');
                  }}
                  className="w-full py-4 bg-neon-red text-white rounded-2xl font-space font-black uppercase text-sm italic shadow-[0_10px_20px_rgba(255,49,49,0.3)]"
                >
                  Confirm End Series
                </button>
                <button 
                  onClick={() => setShowEndSeriesConfirm(false)}
                  className="w-full py-4 glass text-gray-500 rounded-2xl font-space font-black uppercase text-sm italic"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Player Modal */}
      <AnimatePresence>
        {showAddPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass p-8 rounded-[40px] w-full max-w-sm border-neon-blue/30 relative"
            >
              <button 
                onClick={() => setShowAddPlayer(false)}
                className="absolute top-6 right-6 w-8 h-8 glass rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
              
              <div className="mb-8">
                <h2 className="text-2xl font-space font-black italic uppercase tracking-tighter">New Entry</h2>
                <p className="text-neon-blue font-mono text-[8px] uppercase tracking-widest mt-1">Late add — joins this match order</p>
              </div>

              <div className="space-y-6">
                <div className="bg-neon-blue/5 border border-neon-blue/20 rounded-2xl p-4 flex items-center gap-3">
                   <Info className="w-4 h-4 text-neon-blue shrink-0" />
                   <p className="text-[10px] text-gray-400 font-mono leading-tight">
                     Previous matches will be counted as 0 runs for this player.
                   </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Player Name</label>
                  <div className="glass rounded-2xl p-4 border-white/5">
                    <input 
                      autoFocus
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="e.g. Rohit"
                      className="bg-transparent w-full font-space font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Nickname (Optional)</label>
                  <div className="glass rounded-2xl p-4 border-white/5">
                    <input 
                      value={newPlayerNickname}
                      onChange={(e) => setNewPlayerNickname(e.target.value)}
                      placeholder="e.g. Hitman"
                      className="bg-transparent w-full font-space font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim()}
                  className="w-full py-5 bg-neon-blue text-black rounded-2xl shadow-[0_10px_20px_rgba(0,243,255,0.2)] font-space font-black uppercase text-sm italic flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Confirm Entry <Plus className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Players Modal */}
      <AnimatePresence>
        {showManagePlayers && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass p-8 rounded-t-[40px] w-full max-w-md border-t border-neon-green/30 h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h2 className="text-2xl font-space font-black italic uppercase tracking-tighter">Manage Squad</h2>
                  <p className="text-neon-green font-mono text-[8px] uppercase tracking-widest mt-1">Live status control</p>
                </div>
                <button 
                  onClick={() => setShowManagePlayers(false)}
                  className="w-10 h-10 glass rounded-xl flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pb-20 pr-1">
                {activeMatch.players.map((player) => {
                  const isCurrent = player.id === currentPlayer?.id;
                  const canToggle = player.status === 'pending' || player.status === 'absconded';
                  const tp = tournament?.players.find((t) => t.id === player.id);
                  const showLatePill = shouldShowLateEntryPill(
                    player.joinedAtMatchIndex,
                    activeMatch,
                    player.id,
                    Number(tp?.totalMatches) || 0
                  );

                  return (
                    <div 
                      key={player.id}
                      className={`glass rounded-[24px] p-4 flex items-center justify-between border-white/5 ${
                        player.status === 'absconded' ? 'opacity-40 grayscale pointer-events-none' : ''
                      } ${isCurrent ? 'ring-1 ring-neon-blue/50 bg-neon-blue/5' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center overflow-hidden`}>
                            <AvatarImg
                              src={avatarImgSrc(player)}
                              alt="avatar"
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {isCurrent && <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-blue rounded-full border-2 border-black animate-pulse" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-space font-bold">{player.name}</h4>
                             {showLatePill && <span className="text-[7px] font-mono bg-neon-blue/20 text-neon-blue px-1.5 py-0.5 rounded-full uppercase font-black">Late Entry</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full font-black ${
                               player.status === 'batting' ? 'bg-neon-blue text-black' :
                               player.status === 'completed' ? 'bg-neon-green text-black' :
                               player.status === 'absconded' ? 'bg-neon-red text-white' : 'bg-gray-800 text-gray-500'
                             }`}>
                               {player.status === 'absconded' ? 'ABSCONDED' : player.status}
                             </span>
                             <span className="text-[10px] font-space font-bold text-gray-500">{player.score} Runs</span>
                          </div>
                        </div>
                      </div>

                      {canToggle && (
                        <button 
                          onClick={() => togglePlayerAbsconded(player.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            player.status === 'absconded' 
                              ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' 
                              : 'bg-neon-red/10 text-neon-red border border-neon-red/30'
                          } pointer-events-auto active:scale-90`}
                          title={player.status === 'absconded' ? 'Unmark Absconded' : 'Mark Absconded'}
                        >
                          {player.status === 'absconded' ? <Plus className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 glass-dark rounded-t-[40px] border-t border-white/5 shrink-0 z-10">
                 <button 
                  onClick={() => setShowManagePlayers(false)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-space font-black uppercase text-sm italic"
                 >
                   Done
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
