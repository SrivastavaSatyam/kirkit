'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trophy, History, Zap, AlertTriangle, Play, Users } from 'lucide-react';
import Link from 'next/link';
import { useGame } from '@/lib/store';
import { liveScoreMapFromMatch, partyDangerPlayer, totalSeriesRuns } from '@/lib/standings';
import { avatarImgSrc } from '@/lib/default-squad';
import { AvatarImg } from '@/components/AvatarImg';

export default function Dashboard() {
  const { tournament, activeMatch, resetTournament } = useGame();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => setMotionReady(true));
  }, []);

  const liveMap = useMemo(() => liveScoreMapFromMatch(activeMatch), [activeMatch]);

  const lineupMatch = activeMatch ?? tournament?.matches.at(-1) ?? null;

  const dangerPlayer = useMemo(
    () => (tournament ? partyDangerPlayer(tournament.players, liveMap, lineupMatch) : undefined),
    [tournament, liveMap, lineupMatch]
  );

  const dangerDisplayTotal = useMemo(() => {
    if (!dangerPlayer) return 0;
    return totalSeriesRuns(dangerPlayer, liveMap?.get(dangerPlayer.id));
  }, [dangerPlayer, liveMap]);

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Top Banner */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000')] bg-cover bg-center opacity-40 grayscale" />
        
        <div className="absolute bottom-10 left-6 right-6 z-20">
          <motion.div
            initial={false}
            animate={motionReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="text-4xl font-space font-black text-white leading-none uppercase italic tracking-tighter">
              {tournament ? tournament.name : 'KirKit'}
            </h1>
            <p className="text-neon-green font-mono text-xs uppercase mt-2 tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 fill-current" /> 
              {tournament ? `${tournament.matches.length} Matches in Series` : 'Your gully cricket arcade'}
            </p>
          </motion.div>
        </div>
      </div>

      {!tournament ? (
        <div className="px-6 -mt-10 relative z-30">
          <Link href="/match/create">
             <motion.button 
               whileTap={{ scale: 0.95 }}
               className="w-full h-24 bg-neon-green rounded-[32px] shadow-[0_20px_40px_rgba(57,255,20,0.2)] flex items-center justify-between px-8 border-t border-white/20"
             >
                <div className="text-left text-black">
                   <p className="font-mono text-[10px] uppercase font-bold opacity-60">Season 1</p>
                   <p className="font-space font-black text-xl italic uppercase">Start Series</p>
                </div>
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                   <Plus className="w-6 h-6 text-neon-green" />
                </div>
             </motion.button>
          </Link>
          
          <div className="mt-8 space-y-4">
             <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-2">Legendary Records</p>
             <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-3xl p-6 border-white/5">
                   <Trophy className="w-8 h-8 text-neon-yellow mb-3" />
                   <p className="text-xs text-gray-500 font-mono">MVP</p>
                   <p className="font-space font-bold">Satyam</p>
                </div>
                <div className="glass rounded-3xl p-6 border-neon-red/10">
                   <AlertTriangle className="w-8 h-8 text-neon-red mb-3" />
                   <p className="text-xs text-gray-500 font-mono">Treat watch</p>
                   <p className="font-space font-bold">Pranjal</p>
                </div>
             </div>
          </div>
        </div>
      ) : tournament.isClosed ? (
        <div className="px-6 -mt-10 relative z-30 space-y-6">
          <Link href="/results">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="w-full py-8 bg-neon-yellow rounded-[40px] shadow-[0_20px_60px_rgba(255,215,0,0.3)] flex flex-col items-center justify-center text-black font-space font-black uppercase text-xl italic border-t border-white/30"
            >
               <Trophy className="w-10 h-10 mb-2" />
               View Final Results
            </motion.button>
          </Link>
          
          <button 
            onClick={() => {
              if (confirm('Permanently reset this tournament?')) resetTournament();
            }}
            className="w-full py-4 glass text-neon-red rounded-2xl font-mono text-[10px] uppercase font-black tracking-widest"
          >
            Reset Tournament Data
          </button>
        </div>
      ) : (
        <div className="px-6 space-y-6 -mt-10 relative z-30">
           {/* Active Match or Start New */}
           {activeMatch ? (
             <Link href="/match/scoring">
               <motion.div 
                 whileTap={{ scale: 0.98 }}
                 className="bg-neon-blue rounded-[32px] p-6 shadow-[0_0_30px_rgba(0,243,255,0.2)]"
               >
                  <p className="text-black/60 font-mono text-[10px] uppercase font-bold mb-1">Live Battle</p>
                  <div className="flex items-center justify-between">
                     <div>
                        <p className="text-black font-space font-black text-2xl uppercase italic">{activeMatch.name}</p>
                        <p className="text-black/60 text-[10px] font-mono">{activeMatch.location}</p>
                     </div>
                     <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center animate-pulse">
                        <Play className="w-6 h-6 text-neon-blue fill-current ml-1" />
                     </div>
                  </div>
               </motion.div>
             </Link>
           ) : (
             <Link href="/match/create">
               <motion.button 
                 whileTap={{ scale: 0.95 }}
                 className="w-full py-6 bg-neon-green rounded-[32px] shadow-[0_20px_40px_rgba(57,255,20,0.2)] flex items-center justify-center gap-4 text-black font-space font-black uppercase text-xl"
               >
                  <Plus className="w-6 h-6" /> Play Next
               </motion.button>
             </Link>
           )}

           {/* Treat Danger Zone Widget */}
           {dangerPlayer && (
             <motion.div 
               initial={false}
               animate={motionReady ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
               transition={{ duration: 0.35 }}
               className="bg-neon-red/10 border border-neon-red/30 rounded-[32px] p-6 relative overflow-hidden"
             >
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-neon-red/20 blur-2xl rounded-full" />
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-neon-red animate-pulse" />
                      <span className="text-neon-red font-mono text-[10px] uppercase tracking-widest font-black">Treat Danger Zone</span>
                   </div>
                   <span className="text-white/40 text-[10px] font-mono">Bottom 1</span>
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                   <div className="w-16 h-16 rounded-2xl bg-gray-900 border-2 border-neon-red overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(255,49,49,0.3)]">
                     <AvatarImg
                       src={avatarImgSrc(dangerPlayer)}
                       alt=""
                       width={64}
                       height={64}
                       className="h-full w-full object-cover"
                     />
                   </div>
                   <div className="flex-1">
                      <p className="text-2xl font-space font-black text-white uppercase italic">{dangerPlayer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={false}
                              animate={motionReady ? { width: '100%' } : { width: 0 }}
                              transition={{ duration: 0.6 }}
                              className="h-full bg-neon-red shadow-[0_0_8px_rgba(255,49,49,0.5)]"
                            />
                         </div>
                         <span className="text-xs font-mono text-neon-red font-bold">{dangerDisplayTotal} Tot</span>
                      </div>
                   </div>
                </div>
                <p className="mt-4 text-[10px] text-gray-500 font-mono italic">
                  &quot;{dangerPlayer.name} is closest to sponsoring tonight&apos;s Treat.&quot;
                </p>
             </motion.div>
           )}

           {/* Tournament Stats Cards */}
           <div className="grid grid-cols-2 gap-4">
              <Link href="/leaderboard" className="block">
                <div className="glass rounded-[32px] p-6 border-white/5 h-full relative overflow-hidden">
                   <Trophy className="w-6 h-6 text-neon-yellow mb-3" />
                   <p className="text-[10px] text-gray-400 font-mono uppercase">Tournament</p>
                   <p className="font-space font-bold mt-1">Standings</p>
                   <div className="absolute -bottom-2 -right-2 opacity-5 scale-150">
                      <Users className="w-12 h-12" />
                   </div>
                </div>
              </Link>
              <button 
                onClick={() => {
                  if (confirm('Permanently reset all tournament data and matches? This cannot be undone.')) {
                    resetTournament();
                  }
                }} 
                className="block text-left w-full h-full"
              >
                <div className="glass rounded-[32px] p-6 border-white/5 h-full opacity-60 hover:opacity-100 transition-opacity">
                   <History className="w-6 h-6 text-gray-400 mb-3" />
                   <p className="text-[10px] text-gray-400 font-mono uppercase">End Series</p>
                   <p className="font-space font-bold mt-1 text-neon-red">Reset All</p>
                </div>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
