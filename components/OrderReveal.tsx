'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament } from '@/lib/types';
import { ChevronUp, ChevronDown, Minus, Flame, AlertTriangle, Zap, Sword } from 'lucide-react';

interface OrderRevealProps {
  tournament: Tournament;
  onConfirm: (orderedIds: string[], abscondedIds: string[]) => void;
}

export default function OrderReveal({ tournament, onConfirm }: OrderRevealProps) {
  const [abscondedById, setAbscondedById] = useState<Record<string, boolean>>({});
  const lastMatch = tournament.matches[tournament.matches.length - 1];

  const toggleAbsconded = (id: string) => {
    setAbscondedById((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  
  const newsOrderData = useMemo(() => {
    if (!lastMatch) return [];

    // 1. Sort players based on rules:
    // - Previous match score DESC
    // - If tied: Previous match batting order ASC
    // - New players: After everyone with higher scores, join order priority
    
    const sorted = [...tournament.players].sort((a, b) => {
      const pAId = lastMatch.players.findIndex(p => p.id === a.id);
      const pBId = lastMatch.players.findIndex(p => p.id === b.id);
      
      const scoreA = pAId !== -1 ? lastMatch.players[pAId].score : 0;
      const scoreB = pBId !== -1 ? lastMatch.players[pBId].score : 0;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // Tie breaker: Earlier batter in previous match gets priority
      // If both were in previous match
      if (pAId !== -1 && pBId !== -1) {
        return pAId - pBId;
      }

      // If one is new, new one goes after
      if (pAId === -1 && pBId !== -1) return 1;
      if (pAId !== -1 && pBId === -1) return -1;

      // Both new: Use join order (tournament.players index)
      return tournament.players.findIndex(p => p.id === a.id) - tournament.players.findIndex(p => p.id === b.id);
    });

    return sorted.map((player, newIndex) => {
      const prevIndex = lastMatch.players.findIndex(p => p.id === player.id);
      const prevScore = prevIndex !== -1 ? lastMatch.players[prevIndex].score : 0;
      
      let movement = 0;
      if (prevIndex !== -1) {
        movement = prevIndex - newIndex;
      } else {
        // New players essentially start at the "bottom" and move up if they have 0
        // But for simplicity, we'll say 0 movement or relative to list length
        movement = 0; 
      }

      return {
        ...player,
        prevScore,
        movement,
        newIndex,
        isNew: prevIndex === -1
      };
    });
  }, [tournament, lastMatch]);

  const isAbsconded = (id: string) => Boolean(abscondedById[id]);
  const effectiveOpenerIndex = useMemo(
    () => newsOrderData.findIndex((d) => !abscondedById[d.id]),
    [newsOrderData, abscondedById]
  );
  const playingCount = useMemo(
    () => newsOrderData.filter((d) => !abscondedById[d.id]).length,
    [newsOrderData, abscondedById]
  );
  const canConfirm = playingCount > 0;

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-4 shrink-0 text-center sm:mb-6"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-blue/30 bg-neon-blue/20 shadow-[0_0_30px_rgba(0,243,255,0.2)] sm:mb-4 sm:h-16 sm:w-16">
            <Sword className="h-7 w-7 text-neon-blue sm:h-8 sm:w-8" />
          </div>
          <h2 className="font-space text-2xl font-black uppercase italic tracking-tighter text-white sm:text-3xl">
            Next Match Order
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Generated from previous match performance
          </p>
          <p className="mx-auto mt-2 max-w-sm font-mono text-[9px] uppercase tracking-widest text-gray-600 sm:mt-3">
            Tag absconders before play — if the opener is out, the next playing batter opens.
          </p>
        </motion.div>

        <div className="mx-auto w-full max-w-md flex-1 min-h-0 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain py-1">
          <AnimatePresence mode="popLayout">
            {newsOrderData.map((data, i) => {
            const abs = isAbsconded(data.id);
            const isOpenerSlot = i === effectiveOpenerIndex && effectiveOpenerIndex >= 0;
            return (
            <motion.div
              key={data.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', damping: 20, stiffness: 100 }}
              className={`relative glass rounded-2xl p-4 flex items-center gap-4 border-t border-white/10 ${
                abs ? 'opacity-50 grayscale' : ''
              } ${
                isOpenerSlot ? 'bg-neon-yellow/5 border-neon-yellow/20 shadow-[0_0_20px_rgba(255,215,0,0.05)]' :
                i === newsOrderData.length - 1 ? 'bg-neon-red/5 border-neon-red/20' : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center w-10">
                <span className={`text-xl font-space font-black tracking-tighter ${isOpenerSlot ? 'text-neon-yellow' : 'text-white'}`}>
                  {i + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  {data.movement > 0 ? (
                    <ChevronUp className="w-3 h-3 text-neon-green" />
                  ) : data.movement < 0 ? (
                    <ChevronDown className="w-3 h-3 text-neon-red" />
                  ) : (
                    <Minus className="w-3 h-3 text-gray-600" />
                  )}
                  {data.movement !== 0 && (
                    <span className={`text-[8px] font-mono font-bold ${data.movement > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {Math.abs(data.movement)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-space font-black uppercase text-sm tracking-tight">{data.name}</h3>
                  {isOpenerSlot && !abs && <Flame className="w-3 h-3 text-neon-yellow animate-pulse" />}
                  {i === newsOrderData.length - 1 && <AlertTriangle className="w-3 h-3 text-neon-red" />}
                  {data.isNew && (
                    <span className="text-[6px] font-mono bg-neon-blue/20 text-neon-blue px-1.5 py-0.5 rounded-full uppercase tracking-tighter">New Entry</span>
                  )}
                  {abs && (
                    <span className="text-[6px] font-mono bg-neon-red/20 text-neon-red px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Absconded</span>
                  )}
                </div>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                  Prev Match: {data.prevScore} runs
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAbsconded(data.id)}
                  className={`text-[8px] font-mono uppercase font-black px-2.5 py-1.5 rounded-full border transition-colors ${
                    abs
                      ? 'border-neon-red/40 text-neon-red bg-neon-red/15'
                      : 'border-neon-green/40 text-neon-green bg-neon-green/10'
                  }`}
                >
                  {abs ? 'Out — absconded' : 'In — playing'}
                </button>
                {isOpenerSlot && !abs ? (
                   <span className="text-[8px] font-mono text-neon-yellow uppercase font-black px-2 py-1 bg-neon-yellow/10 rounded-full border border-neon-yellow/20">Opens</span>
                ) : i === newsOrderData.length - 1 ? (
                   <span className="text-[8px] font-mono text-neon-red uppercase font-black px-2 py-1 bg-neon-red/10 rounded-full border border-neon-red/20">Finisher</span>
                ) : (
                   <Zap className="w-4 h-4 text-white/10" />
                )}
              </div>

              {isOpenerSlot && !abs && (
                <div className="absolute inset-0 bg-neon-yellow/5 rounded-2xl pointer-events-none animate-pulse" />
              )}
            </motion.div>
            );
          })}
          </AnimatePresence>
        </div>

        <div className="relative z-40 mt-auto w-full shrink-0 border-t border-white/10 bg-gradient-to-t from-black via-black/98 to-black pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-4 sm:pb-6">
          <div className="mx-auto w-full max-w-md">
            <motion.button
              whileHover={{ scale: canConfirm ? 1.02 : 1 }}
              whileTap={{ scale: canConfirm ? 0.98 : 1 }}
              disabled={!canConfirm}
              onClick={() => {
                if (!canConfirm) return;
                const absIds = newsOrderData.filter((d) => isAbsconded(d.id)).map((d) => d.id);
                onConfirm(
                  newsOrderData.map((d) => d.id),
                  absIds
                );
              }}
              className={`flex w-full items-center justify-center gap-3 rounded-3xl py-4 font-space text-sm font-black uppercase italic sm:py-5 sm:text-base ${
                canConfirm
                  ? 'bg-neon-blue text-black shadow-[0_20px_50px_rgba(0,243,255,0.3)]'
                  : 'cursor-not-allowed bg-gray-800 text-gray-500'
              }`}
            >
              Confirm Order & Play <Zap className="h-5 w-5 fill-current" />
            </motion.button>
            {!canConfirm && (
              <p className="mt-2 text-center font-mono text-[10px] text-neon-red">
                At least one player must be marked In.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
