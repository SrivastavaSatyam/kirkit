'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '@/lib/store';
import { partySponsorPlayer, sortedByPartyBestFirst } from '@/lib/standings';
import { useRouter } from 'next/navigation';
import { Trophy, Zap, Flame, Crown, Home, Medal, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import AppShell from '@/components/AppShell';
import { avatarImgSrc } from '@/lib/default-squad';
import { AvatarImg } from '@/components/AvatarImg';

export default function SeriesResults() {
  const { tournament, resetTournament, gameHydrated } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!gameHydrated) return;
    if (!tournament) {
      router.push('/dashboard');
      return;
    }
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F3FF', '#39FF14', '#FFD700'],
    });
  }, [gameHydrated, tournament, router]);

  const stats = useMemo(() => {
    if (!tournament) return null;
    
    const players = sortedByPartyBestFirst(tournament.players);
    const winner = players[0];
    const partySponsor = partySponsorPlayer(tournament) ?? players[players.length - 1];
    
    const maxSixes = Math.max(...players.map(p => p.totalSixes));
    const sixerKing = players.find(p => p.totalSixes === maxSixes && maxSixes > 0);
    
    const maxFours = Math.max(...players.map(p => p.totalFours));
    const boundaryMachine = players.find(p => p.totalFours === maxFours && maxFours > 0);

    const escapeArtist = players.find(p => p.id !== partySponsor.id && p.cumulativeRuns < partySponsor.cumulativeRuns + 10);

    return { players, winner, partySponsor, sixerKing, boundaryMachine, escapeArtist };
  }, [tournament]);

  if (!tournament || !stats) return null;

  return (
    <AppShell>
      <div className="min-h-screen bg-black text-white p-6 pb-32 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,243,255,0.1)_0%,transparent_70%)] pointer-events-none" />

      <div className="text-center mb-10 pt-8 relative z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-20 h-20 bg-neon-yellow rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_50px_rgba(255,215,0,0.3)]"
        >
          <Trophy className="w-10 h-10 text-black" />
        </motion.div>
        <h1 className="text-4xl font-space font-black italic uppercase tracking-tighter mb-2">KirKit — Series Results</h1>
        <p className="text-neon-blue font-mono text-[10px] uppercase tracking-[0.4em]">{tournament.name}</p>
      </div>

      {/* Winner Spotlight */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-[40px] p-8 text-center border-neon-yellow/30 bg-neon-yellow/5 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Crown className="w-20 h-20 text-neon-yellow" />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] font-mono bg-neon-yellow text-black px-3 py-1 rounded-full font-black uppercase mb-4 inline-block">Treat Trophy — MVP</span>
          <div className="w-24 h-24 rounded-3xl bg-gray-900 border-4 border-neon-yellow mx-auto mb-4 overflow-hidden">
             <AvatarImg
               src={avatarImgSrc(stats.winner)}
               alt="avatar"
               width={96}
               height={96}
               className="h-full w-full object-cover"
             />
          </div>
          <h2 className="text-4xl font-space font-black italic uppercase mb-2">{stats.winner.name}</h2>
          <div className="flex justify-center gap-6">
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Total Runs</p>
              <p className="text-2xl font-space font-black text-neon-yellow">{stats.winner.cumulativeRuns}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Matches</p>
              <p className="text-2xl font-space font-black text-neon-yellow">{stats.winner.totalMatches}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Official Treat Sponsor */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-dark rounded-[32px] p-6 border-neon-red/20 mb-8 border"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-neon-red/10 border border-neon-red/30 flex items-center justify-center overflow-hidden">
             <AvatarImg
               src={avatarImgSrc(stats.partySponsor)}
               alt="avatar"
               width={64}
               height={64}
               className="h-full w-full object-cover grayscale opacity-50"
             />
          </div>
          <div className="flex-1">
            <span className="text-[8px] font-mono bg-neon-red/20 text-neon-red px-2 py-0.5 rounded-full font-black uppercase tracking-wide">🏆 Official Treat Sponsor</span>
            <h3 className="text-xl font-space font-bold mt-1">{stats.partySponsor.name}</h3>
            <p className="text-xs text-gray-500">Total Runs: {stats.partySponsor.cumulativeRuns}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl">😭</span>
            <p className="text-[8px] font-mono text-neon-red font-black uppercase">Treat Donor</p>
          </div>
        </div>
      </motion.div>

      {/* Special Awards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {stats.sixerKing && (
          <div className="glass rounded-[24px] p-4 border-neon-blue/20">
            <Flame className="w-5 h-5 text-neon-blue mb-2" />
            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Sixer King</p>
            <p className="font-space font-bold truncate text-sm">{stats.sixerKing.name}</p>
            <p className="text-[10px] font-space font-black text-neon-blue">{stats.sixerKing.totalSixes} Sixes</p>
          </div>
        )}
        {stats.boundaryMachine && (
          <div className="glass rounded-[24px] p-4 border-neon-green/20">
            <Zap className="w-5 h-5 text-neon-green mb-2" />
            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Four leader</p>
            <p className="font-space font-bold truncate text-sm">{stats.boundaryMachine.name}</p>
            <p className="text-[10px] font-space font-black text-neon-green">{stats.boundaryMachine.totalFours} Fours</p>
          </div>
        )}
        {stats.escapeArtist && (
          <div className="glass rounded-[24px] p-4 border-neon-yellow/20 col-span-2">
            <div className="flex items-center gap-3">
              <Medal className="w-5 h-5 text-neon-yellow" />
              <div>
                <p className="text-[8px] font-mono text-gray-500 uppercase">Clutch Escape Artist</p>
                <p className="font-space font-bold text-sm">{stats.escapeArtist.name}</p>
              </div>
              <div className="ml-auto text-[10px] font-space font-black text-neon-yellow px-2 py-1 bg-neon-yellow/10 rounded-full">
                🔥 Narrow Escape
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 italic font-mono">
              &quot;🔥 {stats.escapeArtist.name} climbed out of the Treat Zone!&quot;
            </p>
          </div>
        )}
      </div>

      <div className="bg-neon-blue/10 border border-neon-blue/30 rounded-2xl p-4 mb-8 text-center italic text-xs font-mono text-neon-blue">
        &quot;🏏 {stats.winner.name} dominated today&apos;s series — {stats.partySponsor.name} is the current Treat Sponsor.&quot;
      </div>

      {/* Final Standings List */}
      <div className="space-y-3 mb-12">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-widest ml-1 mb-4">Final Standings</h3>
        {stats.players.map((player, idx) => (
          <div key={player.id} className="glass-dark rounded-2xl p-4 flex items-center justify-between border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-gray-600 w-4">{idx + 1}</span>
              <div className="w-10 h-10 rounded-xl bg-gray-900 border border-white/5 overflow-hidden">
                 <AvatarImg
                   src={avatarImgSrc(player)}
                   alt="avatar"
                   width={40}
                   height={40}
                   className="h-full w-full object-cover"
                 />
              </div>
              <div>
                <p className="font-space font-bold">{player.name}</p>
                <p className="text-[10px] font-mono text-gray-500">{player.totalMatches} Matches Played</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-space font-black">{player.cumulativeRuns}</p>
              <p className="text-[8px] font-mono text-gray-600 uppercase">Total Runs</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 glass-dark rounded-t-[40px] border-t border-white/10 z-50">
        <div className="flex gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-5 glass rounded-2xl font-space font-black uppercase text-sm italic flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => {
              if (confirm('Start new series? This will clear current stats.')) {
                resetTournament();
                router.push('/dashboard');
              }
            }}
            className="flex-1 py-5 bg-white text-black rounded-2xl font-space font-black uppercase text-sm italic flex items-center justify-center gap-2"
          >
            New Series <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
