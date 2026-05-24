'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, ArrowRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/store';
import { DEFAULT_SQUAD_NAMES } from '@/lib/default-squad';

export default function Welcome() {
  const router = useRouter();
  const { tournament, startTournament } = useGame();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => setMotionReady(true));
  }, []);

  const handleQuickStart = () => {
    if (!tournament) {
      startTournament('KirKit Cup', [...DEFAULT_SQUAD_NAMES]);
      router.push('/dashboard');
      return;
    }
    router.push('/match/create');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black p-6">
      {/* Background Animated Elements */}
      <motion.div
        initial={false}
        animate={
          motionReady
            ? {
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.15, 0.1],
                rotate: [0, 5, 0],
              }
            : { scale: 1, opacity: 0.1, rotate: 0 }
        }
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-neon-green blur-[100px]"
      />
      <motion.div
        initial={false}
        animate={
          motionReady
            ? {
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.2, 0.1],
                rotate: [0, -5, 0],
              }
            : { scale: 1, opacity: 0.1, rotate: 0 }
        }
        transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-neon-blue blur-[100px]"
      />

      {/* Main Content */}
      <div className="z-10 w-full max-w-sm space-y-8 text-center">
        <motion.div
          initial={false}
          animate={motionReady ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-2"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border-2 border-neon-green bg-neon-green/20 shadow-[0_0_40px_rgba(57,255,20,0.3)]">
            <Trophy className="h-10 w-10 text-neon-green" />
          </div>
          <h1 className="font-space text-5xl font-black uppercase italic leading-tight tracking-tighter text-white">
            Kir<span className="text-neon-green">Kit</span>
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gray-500">
            The Ultimate Cric-Party App
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={motionReady ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="flex w-full flex-col gap-3"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuickStart}
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-white py-5 font-space text-lg font-black uppercase text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
          >
            <Zap className="h-5 w-5 fill-current text-neon-green" />
            Quick Start Series
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>

        <motion.div
          initial={false}
          animate={motionReady ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="flex justify-center gap-6 pt-4"
        >
          <div className="text-center">
            <div className="font-space text-xl font-bold">12</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-gray-500">Balls Max</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="font-space text-xl font-bold">4 or 6</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-gray-500">Score Zone</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="font-space text-xl font-bold">Treat</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-gray-500">Stakes</div>
          </div>
        </motion.div>
      </div>

      {/* Floating Animated Badges */}
      <motion.div
        initial={false}
        animate={motionReady ? { y: [0, -10, 0] } : { y: 0 }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute left-10 top-24 rotate-[-15deg] rounded-2xl border border-neon-blue/20 p-4 glass"
      >
        <Star className="h-6 w-6 fill-neon-blue text-neon-blue" />
      </motion.div>
      <motion.div
        initial={false}
        animate={motionReady ? { y: [0, 10, 0] } : { y: 0 }}
        transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
        className="absolute bottom-40 right-10 rotate-[15deg] rounded-2xl border border-neon-yellow/20 p-4 glass"
      >
        <Trophy className="h-6 w-6 text-neon-yellow" />
      </motion.div>
    </div>
  );
}
