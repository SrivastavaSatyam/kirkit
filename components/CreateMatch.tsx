'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '@/lib/store';
import { Plus, X, UserPlus, Trophy, MapPin, Sword, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OrderShuffle from './OrderShuffle';
import OrderReveal from './OrderReveal';
import { DEFAULT_SQUAD_NAMES, defaultSquadAvatarUrl } from '@/lib/default-squad';
import { AvatarImg } from '@/components/AvatarImg';

export default function CreateMatch() {
  const { tournament, startTournament, startNewMatch } = useGame();
  const router = useRouter();

  const [showShuffle, setShowShuffle] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [pendingMatchData, setPendingMatchData] = useState<{name: string, location: string} | null>(null);

  // Tournament Creation State
  const [tournamentName, setTournamentName] = useState('KirKit Cup');
  const [players, setPlayers] = useState<string[]>(() => [...DEFAULT_SQUAD_NAMES]);
  const [newPlayer, setNewPlayer] = useState('');

  // Match Creation State
  const [matchName, setMatchName] = useState(`Battle #${(tournament?.matches.length || 0) + 1}`);
  const [location, setLocation] = useState('Sita-Ram Park');

  const addPlayer = () => {
    if (newPlayer.trim()) {
      setPlayers([...players, newPlayer.trim()]);
      setNewPlayer('');
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!tournament) {
      if (players.length < 2) return alert('Need at least 2 players!');
      startTournament(tournamentName, players);
    } else {
      if (tournament.matches.length === 0) {
        setPendingMatchData({ name: matchName, location });
        setShowShuffle(true);
      } else {
        setPendingMatchData({ name: matchName, location });
        setShowReveal(true);
      }
    }
  };

  const handleShuffleComplete = (orderedIds: string[], abscondedIds: string[]) => {
    if (!tournament || !pendingMatchData) return;

    // Single store path applies batting order + active match (avoids stale closure if reorder + start were split)
    startNewMatch(pendingMatchData.name, pendingMatchData.location, orderedIds, abscondedIds);
    router.push('/match/scoring');
  };

  const handleRevealComplete = (orderedIds: string[], abscondedIds: string[]) => {
    if (!tournament || !pendingMatchData) return;

    startNewMatch(pendingMatchData.name, pendingMatchData.location, orderedIds, abscondedIds);
    router.push('/match/scoring');
  };

  if (showShuffle && tournament) {
    return (
      <OrderShuffle
        entries={tournament.players.map((p) => ({ id: p.id, name: p.name }))}
        onComplete={handleShuffleComplete}
      />
    );
  }

  if (showReveal && tournament) {
    return (
      <OrderReveal 
        tournament={tournament} 
        onConfirm={handleRevealComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 pt-10 pb-32">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-space font-black text-white italic uppercase tracking-tighter">
            {tournament ? 'New Battle' : 'New Series'}
          </h1>
          <p className="text-neon-green font-mono text-[10px] uppercase tracking-widest mt-1">
            {tournament ? 'Add a match to series' : 'Setup your tournament'}
          </p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
           <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="space-y-8">
        {!tournament ? (
          <>
            <div className="rounded-2xl border border-neon-green/25 bg-neon-green/5 p-4">
              <p className="mb-3 text-center font-mono text-[10px] font-black uppercase tracking-widest text-neon-green">
                Default squad loaded
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {players.map((name, i) => (
                  <div
                    key={`${name}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 py-1.5 pl-1.5 pr-3"
                  >
                    <AvatarImg
                      src={defaultSquadAvatarUrl(name, i)}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full border border-white/10"
                    />
                    <span className="font-space text-xs font-bold">{name}</span>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-3 h-px max-w-xs bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <p className="mt-2 text-center font-mono text-[9px] text-gray-500">
                Reorder by removing &amp; re-adding, or add more players below — avatars pick up in scoring.
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Series Name</label>
              <div className="glass rounded-2xl p-4 border-white/5">
                <input 
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g. Weekend Warriors"
                  className="bg-transparent w-full text-xl font-space font-bold focus:outline-none placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">The Squad ({players.length})</label>
              <div className="space-y-3">
                <AnimatePresence>
                  {players.map((name, i) => (
                    <motion.div 
                      key={`${name}-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="glass rounded-2xl p-4 flex items-center justify-between border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gray-900">
                          <AvatarImg
                            src={defaultSquadAvatarUrl(name, i)}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute bottom-0 right-0 rounded-tl bg-black/80 px-1 font-mono text-[8px] font-bold text-neon-blue">
                            {i + 1}
                          </span>
                        </div>
                        <span className="font-space font-bold">{name}</span>
                      </div>
                      <button onClick={() => removePlayer(i)} className="text-gray-600 hover:text-neon-red">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="flex gap-2">
                  <div className="flex-1 glass rounded-2xl p-4 border-white/5">
                    <input 
                      value={newPlayer}
                      onChange={(e) => setNewPlayer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                      placeholder="Player name..."
                      className="bg-transparent w-full font-space font-medium focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={addPlayer}
                    className="w-14 bg-neon-blue rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                  >
                    <Plus className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-6">
               <div className="bg-neon-green/10 border border-neon-green/30 rounded-3xl p-6 mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center">
                     <Sword className="w-6 h-6 text-neon-green" />
                  </div>
                  <div>
                     <p className="text-[10px] font-mono text-neon-green uppercase font-black">Active Tournament</p>
                     <p className="text-xl font-space font-bold">{tournament.name}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Battle Title</label>
                  <div className="glass rounded-2xl p-4 border-white/5">
                    <input 
                      value={matchName}
                      onChange={(e) => setMatchName(e.target.value)}
                      placeholder="e.g. Round 2"
                      className="bg-transparent w-full text-xl font-space font-bold focus:outline-none"
                    />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Arena Location</label>
                  <div className="glass rounded-2xl p-4 border-white/5 flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-neon-green" />
                    <input 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Sita-Ram Park"
                      className="bg-transparent w-full font-space font-bold focus:outline-none"
                    />
                  </div>
               </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
        <motion.button 
          id="btn-start-battle"
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className={`w-full h-16 rounded-[24px] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border-t border-white/20 font-space font-black uppercase text-lg italic ${
            tournament ? 'bg-neon-blue text-black' : 'bg-neon-green text-black'
          }`}
        >
          {tournament ? 'Launch Match' : 'Create Series'} <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
