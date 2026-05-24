'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Crown, ChevronRight, Dices, UserPlus, Plus } from 'lucide-react';
import { useGame } from '@/lib/store';

export type ShuffleEntry = { id: string; name: string };

interface OrderShuffleProps {
  entries: ShuffleEntry[];
  onComplete: (orderedIds: string[], abscondedIds: string[]) => void;
}

/** Fisher–Yates shuffle (unbiased); returns a new array */
function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function OrderShuffle({ entries, onComplete }: OrderShuffleProps) {
  const { addPlayerToSeries } = useGame();
  const [newPlayerName, setNewPlayerName] = useState('');

  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const labelById = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e.name])) as Record<string, string>,
    [entries]
  );

  const [phase, setPhase] = useState<'preview' | 'shuffling' | 'revealed'>('preview');
  /** Order during shuffle + reveal; preview always uses `ids` to avoid sync effects */
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  /** Frozen order from the randomizer; new players after reveal are appended via `revealedFullOrder` (derived). */
  const [lockedShuffleOrder, setLockedShuffleOrder] = useState<string[] | null>(null);
  const [abscondedById, setAbscondedById] = useState<Record<string, boolean>>({});

  const toggleAbsconded = useCallback((id: string) => {
    setAbscondedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isAbsconded = useCallback((id: string) => Boolean(abscondedById[id]), [abscondedById]);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastShuffleAtRef = useRef(0);
  const mountedRef = useRef(true);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopLoop();
    };
  }, [stopLoop]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    addPlayerToSeries(name);
    setNewPlayerName('');
  };

  /** Full batting order in reveal: locked shuffle + any roster ids that joined after the shuffle (tail). */
  const revealedFullOrder = useMemo(() => {
    if (!lockedShuffleOrder?.length) return null;
    const inLocked = new Set(lockedShuffleOrder);
    const tail = ids.filter((id) => !inLocked.has(id));
    return [...lockedShuffleOrder, ...tail];
  }, [lockedShuffleOrder, ids]);

  const rowIds = useMemo(() => {
    if (phase === 'preview') return ids;
    if (phase === 'shuffling') return displayOrder.length > 0 ? displayOrder : ids;
    if (phase === 'revealed' && revealedFullOrder) return revealedFullOrder;
    return displayOrder.length > 0 ? displayOrder : ids;
  }, [phase, ids, displayOrder, revealedFullOrder]);

  const effectiveOpenerIndex = useMemo(() => {
    if (phase !== 'revealed' || !revealedFullOrder?.length) return -1;
    return revealedFullOrder.findIndex((id) => !abscondedById[id]);
  }, [phase, revealedFullOrder, abscondedById]);

  const playingCount = useMemo(() => {
    const list = phase === 'revealed' && revealedFullOrder?.length ? revealedFullOrder : rowIds;
    return list.filter((id) => !abscondedById[id]).length;
  }, [phase, revealedFullOrder, rowIds, abscondedById]);

  const canStart = playingCount > 0;

  const startShuffle = () => {
    if (phase !== 'preview' || ids.length === 0) return;

    if (ids.length === 1) {
      const single = [...ids];
      setDisplayOrder(single);
      setLockedShuffleOrder(single);
      setAbscondedById({});
      setPhase('revealed');
      return;
    }

    stopLoop();
    setLockedShuffleOrder(null);
    setAbscondedById({});
    setDisplayOrder(shuffleCopy(ids));
    setPhase('shuffling');
    const DURATION_MS = 2800;
    startTimeRef.current = performance.now();
    lastShuffleAtRef.current = 0;

    const loop = (now: number) => {
      if (!mountedRef.current) return;

      const elapsed = now - startTimeRef.current;

      if (elapsed >= DURATION_MS) {
        stopLoop();
        const randomized = shuffleCopy(ids);
        setDisplayOrder(randomized);
        setLockedShuffleOrder(randomized);
        setPhase('revealed');
        return;
      }

      const progress = elapsed / DURATION_MS;
      // Start fast, slow down (stable easing — no overlapping timers)
      const minInterval = 40 + progress * progress * 220;

      if (lastShuffleAtRef.current === 0 || now - lastShuffleAtRef.current >= minInterval) {
        lastShuffleAtRef.current = now;
        setDisplayOrder(shuffleCopy(ids));
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,243,255,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4 shrink-0 text-center sm:mb-6">
          <h2 className="mb-2 font-space text-3xl font-black uppercase italic tracking-tighter sm:text-4xl">
            {phase === 'preview' ? 'Squad Ready' : phase === 'shuffling' ? 'Shuffling...' : 'Battle Order Set'}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon-blue">
            {phase === 'preview' && 'Add anyone missing, then randomize — late adds after shuffle slot in at the end'}
            {phase === 'shuffling' && 'Random draft in progress'}
            {phase === 'revealed' && 'Mark no-shows, then start — next In opens if #1 is out'}
          </p>
        </div>

      {(phase === 'preview' || phase === 'revealed') && (
        <div className="mb-3 w-full max-w-sm shrink-0 self-center glass-dark rounded-2xl border border-white/10 p-4 sm:mb-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-neon-blue shrink-0" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Add squad member</span>
          </div>
          <div className="flex gap-2">
            <input
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder="Player name"
              className="flex-1 bg-white/5 rounded-xl px-3 py-2.5 text-sm font-space font-bold placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-neon-blue/40"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              disabled={!newPlayerName.trim()}
              className="shrink-0 w-12 h-12 rounded-xl bg-neon-blue text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              aria-label="Add player"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {phase === 'preview' && (
            <p className="text-[9px] font-mono text-gray-500 mt-2 leading-snug">
              They&apos;ll be included when you randomize order.
            </p>
          )}
          {phase === 'revealed' && (
            <p className="text-[9px] font-mono text-gray-500 mt-2 leading-snug">
              Joins at the end of this order (no re-shuffle).
            </p>
          )}
        </div>
      )}

      {/* Stable rows: key=id only (no AnimatePresence / layout during rapid updates) */}
      <div
        className={`relative w-full max-w-sm flex-1 min-h-0 space-y-3 self-center overflow-y-auto overflow-x-hidden overscroll-contain py-1 transition-opacity duration-300 ${
          phase === 'shuffling' ? 'opacity-95' : 'opacity-100'
        }`}
      >
        {rowIds.map((id, index) => {
          const abs = isAbsconded(id);
          const isOpenerRow =
            phase === 'revealed' && revealedFullOrder && effectiveOpenerIndex >= 0 && index === effectiveOpenerIndex;
          return (
          <div
            key={id}
            className={`p-5 rounded-[24px] border border-white/5 flex items-center justify-between transition-colors duration-300 ${
              abs ? 'opacity-50 grayscale' : ''
            } ${
              phase === 'revealed'
                ? isOpenerRow
                  ? 'bg-neon-yellow text-black ring-4 ring-neon-yellow/20'
                  : 'glass'
                : 'glass-dark'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-space font-black ${
                  phase === 'revealed' && isOpenerRow ? 'bg-black text-neon-yellow' : 'bg-white/5 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span className="font-space font-bold text-lg truncate">{labelById[id] ?? '?'}</span>
              {abs && (
                <span className="text-[7px] font-mono uppercase text-neon-red shrink-0">Absconded</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {phase === 'revealed' && (
                <button
                  type="button"
                  onClick={() => toggleAbsconded(id)}
                  className={`text-[8px] font-mono uppercase font-black px-2 py-1.5 rounded-full border ${
                    abs
                      ? 'border-neon-red/50 text-neon-red bg-neon-red/15'
                      : 'border-neon-green/50 text-neon-green bg-neon-green/15'
                  }`}
                >
                  {abs ? 'Out' : 'In'}
                </button>
              )}
              {phase === 'revealed' && isOpenerRow && !abs && <Crown className="w-5 h-5 text-black animate-bounce shrink-0" />}
            </div>
          </div>
          );
        })}
      </div>

        {phase !== 'shuffling' && (
          <div className="relative z-40 mt-auto w-full shrink-0 border-t border-white/10 bg-gradient-to-t from-black via-black/98 to-black pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-4 sm:pb-6">
            <div className="mx-auto w-full max-w-sm">
              {phase === 'preview' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={startShuffle}
                  className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-neon-green py-5 font-space text-base font-black uppercase italic text-black shadow-[0_10px_40px_rgba(57,255,20,0.3)] sm:py-6 sm:text-lg"
                >
                  <Dices className="w-6 h-6" /> Randomize Order
                </motion.button>
              )}

              {phase === 'revealed' && revealedFullOrder && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: canStart ? 0.95 : 1 }}
                  type="button"
                  disabled={!canStart}
                  onClick={() => {
                    if (!canStart || !revealedFullOrder) return;
                    const absIds = revealedFullOrder.filter((fid) => isAbsconded(fid));
                    onComplete(revealedFullOrder, absIds);
                  }}
                  className={`flex w-full items-center justify-center gap-3 rounded-[24px] py-5 font-space text-base font-black uppercase italic shadow-[0_10px_40px_rgba(0,243,255,0.3)] sm:py-6 sm:text-lg ${
                    canStart ? 'bg-neon-blue text-black' : 'cursor-not-allowed bg-gray-800 text-gray-500'
                  }`}
                >
                  Start Match <ChevronRight className="w-6 h-6" />
                </motion.button>
              )}
              {phase === 'revealed' && revealedFullOrder && !canStart && (
                <p className="mt-2 text-center font-mono text-[10px] text-neon-red">At least one player must be In.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {phase === 'shuffling' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center sm:bottom-32">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full"
          />
        </div>
      )}
    </div>
  );
}
