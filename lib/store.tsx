'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Match, Player, BallRecord, Tournament } from './types';
import { processBall, undoLastBall } from './game-logic';
import { newPlayerAvatarUrl } from './default-squad';

/** Coerce stats from localStorage / older saves so totals never become NaN */
function n(x: unknown, fallback = 0): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : fallback;
}

function normalizePlayer(p: Player): Player {
  const amn = p.abscondedAtMatchNumber;
  const abscondedAtMatchNumber =
    amn != null && Number.isFinite(Number(amn)) ? Math.max(1, Math.floor(Number(amn))) : undefined;
  return {
    ...p,
    avatar: typeof p.avatar === 'string' && p.avatar.length > 0 ? p.avatar : undefined,
    score: n(p.score),
    ballsFaced: n(p.ballsFaced),
    fours: n(p.fours),
    sixes: n(p.sixes),
    cumulativeRuns: n(p.cumulativeRuns),
    totalMatches: n(p.totalMatches),
    totalSixes: n(p.totalSixes),
    totalFours: n(p.totalFours),
    joinedAtMatchIndex: n(p.joinedAtMatchIndex),
    seriesAbsconded: Boolean(p.seriesAbsconded),
    abscondedAtMatchNumber,
  };
}

function normalizeTournament(raw: Tournament): Tournament {
  return {
    ...raw,
    players: (raw.players ?? []).map(normalizePlayer),
    matches: (raw.matches ?? []).map((m) => ({
      ...m,
      players: (m.players ?? []).map(normalizePlayer),
    })),
    isClosed: Boolean(raw.isClosed),
  };
}

function normalizeMatch(raw: Match): Match {
  return {
    ...raw,
    players: (raw.players ?? []).map(normalizePlayer),
  };
}

/** Apply a batting order to the roster (same rules as reorderPlayers). */
function orderPlayersByIds(players: Player[], orderedIds: string[]): Player[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const ordered = orderedIds.map((id) => playerMap.get(id)).filter((p): p is Player => p !== undefined);
  const missing = players.filter((p) => !orderedIds.includes(p.id));
  return [...ordered, ...missing];
}

interface GameContextType {
  /** True after localStorage has been read on the client (SSR + first paint always false). */
  gameHydrated: boolean;
  tournament: Tournament | null;
  activeMatch: Match | null;
  startTournament: (name: string, playerNames: string[]) => void;
  startNewMatch: (name: string, location: string, battingOrderIds?: string[], abscondedIds?: string[]) => void;
  reorderPlayers: (playerIds: string[]) => void;
  recordBall: (type: BallRecord['type']) => void;
  undoBall: () => void;
  nextBatter: () => void;
  closeMatch: () => void;
  /** Drop in-progress match without recording it (no stats / match count). */
  discardActiveMatch: () => void;
  resetTournament: () => void;
  addPlayerToSeries: (name: string, nickname?: string) => void;
  togglePlayerAbsconded: (playerId: string) => void;
  endSeries: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  /** Avoid SSR/client markup mismatch and accidental persist wipes before restore. */
  const [gameHydrated, setGameHydrated] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const tSaved = localStorage.getItem('boundary_league_tournament');
        if (tSaved) {
          const parsed = JSON.parse(tSaved) as Tournament;
          if (parsed && Array.isArray(parsed.players)) {
            setTournament(normalizeTournament(parsed));
          }
        }
        const mSaved = localStorage.getItem('boundary_league_active_match');
        if (mSaved) {
          const parsed = JSON.parse(mSaved) as Match;
          if (parsed && Array.isArray(parsed.players)) {
            setActiveMatch(normalizeMatch(parsed));
          }
        }
      } catch (e) {
        console.error('Failed to restore game state from localStorage', e);
      } finally {
        if (!cancelled) setGameHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameHydrated) return;
    if (tournament) {
      localStorage.setItem('boundary_league_tournament', JSON.stringify(tournament));
    }
  }, [tournament, gameHydrated]);

  useEffect(() => {
    if (!gameHydrated) return;
    if (activeMatch) {
      localStorage.setItem('boundary_league_active_match', JSON.stringify(activeMatch));
    } else {
      localStorage.removeItem('boundary_league_active_match');
    }
  }, [activeMatch, gameHydrated]);

  const startTournament = (name: string, playerNames: string[]) => {
    const players: Player[] = playerNames.map((n, i) => ({
      id: `p-${Date.now()}-${i}`,
      name: n,
      avatar: newPlayerAvatarUrl(n, i),
      score: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      history: [],
      status: 'pending',
      cumulativeRuns: 0,
      totalMatches: 0,
      totalSixes: 0,
      totalFours: 0,
      joinedAtMatchIndex: 0
    }));

    setTournament({
      id: `t-${Date.now()}`,
      name,
      players,
      matches: [],
      isClosed: false
    });
    setActiveMatch(null);
  };

  const startNewMatch = (name: string, location: string, battingOrderIds?: string[], abscondedIds?: string[]) => {
    let mergedRoster: Player[] = [];

    setTournament((prev) => {
      if (!prev) return prev;
      const base = battingOrderIds?.length
        ? orderPlayersByIds(prev.players, battingOrderIds)
        : [...prev.players];
      const orderSet = new Set(abscondedIds ?? []);
      const nextMatchNum = prev.matches.length + 1;
      mergedRoster = base.map((p) => {
        const wasSeries = Boolean(p.seriesAbsconded);
        /** Order screen passes full absconded set; marking In clears series absconded. */
        const nowAbs = orderSet.has(p.id);
        const abscondedAtMatchNumber = !nowAbs
          ? undefined
          : wasSeries && p.abscondedAtMatchNumber != null
            ? p.abscondedAtMatchNumber
            : nextMatchNum;
        return { ...p, seriesAbsconded: nowAbs, abscondedAtMatchNumber };
      });
      return { ...prev, players: mergedRoster };
    });

    if (mergedRoster.length === 0) return;

    const playingCount = mergedRoster.filter((p) => !p.seriesAbsconded).length;
    if (playingCount === 0) return;

    const firstBatterIndex = mergedRoster.findIndex((p) => !p.seriesAbsconded);

    const players: Player[] = mergedRoster.map((p, i) => ({
      ...p,
      score: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      history: [],
      status: p.seriesAbsconded ? ('absconded' as const) : i === firstBatterIndex ? ('batting' as const) : ('pending' as const),
    }));

    setActiveMatch({
      id: `m-${Date.now()}`,
      name,
      date: new Date().toISOString(),
      location,
      players,
      currentBatterIndex: firstBatterIndex,
      isFinished: false,
    });
  };

  const reorderPlayers = (playerIds: string[]) => {
    setTournament(prev => {
      if (!prev) return prev;
      
      // Create a map for quick lookup
      const playerMap = new Map(prev.players.map(p => [p.id, p]));
      
      // Build new order from IDs
      const newOrder = playerIds
        .map(id => playerMap.get(id))
        .filter((p): p is Player => p !== undefined);
        
      // If some players were missing from the ID list, append them at the end
      const missingPlayers = prev.players.filter(p => !playerIds.includes(p.id));
      
      return { 
        ...prev, 
        players: [...newOrder, ...missingPlayers] 
      };
    });
  };

  const addPlayerToSeries = (name: string, nickname?: string) => {
    if (!tournament) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      nickname,
      avatar: newPlayerAvatarUrl(name, Date.now()),
      score: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      history: [],
      status: 'pending',
      cumulativeRuns: 0,
      totalMatches: 0, // Previous matches counted as 0 runs
      totalSixes: 0,
      totalFours: 0,
      joinedAtMatchIndex: tournament.matches.length,
      seriesAbsconded: false,
    };

    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: [...prev.players, newPlayer]
      };
    });

    if (activeMatch) {
      setActiveMatch(prev => {
        if (!prev) return prev;
        // Ensure we don't add the same player twice to the active match
        if (prev.players.some(p => p.id === newPlayer.id)) return prev;
        
        return {
          ...prev,
          players: [...prev.players, { ...newPlayer }],
          isFinished: false
        };
      });
    }
  };

  const togglePlayerAbsconded = (playerId: string) => {
    let nextSeriesAbsconded: boolean | undefined;

    setActiveMatch((prev) => {
      if (!prev) return prev;
      const newPlayers = prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const newStatus: Player['status'] = p.status === 'absconded' ? 'pending' : 'absconded';
        nextSeriesAbsconded = newStatus === 'absconded';
        return { ...p, status: newStatus };
      });

      const allDone = newPlayers.every((p) => p.status === 'completed' || p.status === 'absconded');
      const isFinished = allDone;

      let playersOut = newPlayers;
      let currentBatterIndex = prev.currentBatterIndex;

      /** If the match can continue but nobody is on strike, open the first pending slot (e.g. un-abscond after match was "finished"). */
      if (!allDone && !playersOut.some((p) => p.status === 'batting')) {
        const firstPendingIdx = playersOut.findIndex((p) => p.status === 'pending');
        if (firstPendingIdx !== -1) {
          playersOut = playersOut.map((p, i) =>
            i === firstPendingIdx ? { ...p, status: 'batting' as const } : p,
          );
          currentBatterIndex = firstPendingIdx;
        }
      }

      return { ...prev, players: playersOut, currentBatterIndex, isFinished };
    });

    setTournament((prev) => {
      if (!prev || nextSeriesAbsconded === undefined) return prev;
      const matchNum = prev.matches.length + 1;
      return {
        ...prev,
        players: prev.players.map((tp) => {
          if (tp.id !== playerId) return tp;
          return {
            ...tp,
            seriesAbsconded: nextSeriesAbsconded,
            abscondedAtMatchNumber: nextSeriesAbsconded ? tp.abscondedAtMatchNumber ?? matchNum : undefined,
          };
        }),
      };
    });
  };

  const recordBall = (type: BallRecord['type']) => {
    setActiveMatch(prev => {
      if (!prev || prev.isFinished) return prev;

      const currentPlayer = prev.players[prev.currentBatterIndex];
      if (currentPlayer.status !== 'batting') return prev;

      const updatedPlayer = processBall(currentPlayer, type);
      const newPlayers = [...prev.players];
      newPlayers[prev.currentBatterIndex] = updatedPlayer;

      let isFinished = false;
      if (updatedPlayer.status === 'completed') {
        const allDone = newPlayers.every(p => p.status === 'completed' || p.status === 'absconded');
        if (allDone) isFinished = true;
      }

      return { ...prev, players: newPlayers, isFinished };
    });
  };

  const closeMatch = () => {
    if (!activeMatch || !tournament) return;

    const matchToClose = activeMatch;

    setTournament(prevTournament => {
      if (!prevTournament) return null;

      // Idempotency check: Don't add the same match twice
      if (prevTournament.matches.some(m => m.id === matchToClose.id)) {
        return prevTournament;
      }

      // Update cumulative stats + persist series absconded from match sheet
      const closingMatchNum = prevTournament.matches.length + 1;
      const updatedTournamentPlayers = prevTournament.players.map((tp) => {
        const matchPlayer = matchToClose.players.find((mp) => mp.id === tp.id);
        if (matchPlayer) {
          const seriesAbsconded = Boolean(tp.seriesAbsconded) || matchPlayer.status === 'absconded';
          const abscondedAtMatchNumber = !seriesAbsconded
            ? undefined
            : tp.abscondedAtMatchNumber ?? closingMatchNum;
          return {
            ...tp,
            cumulativeRuns: n(tp.cumulativeRuns) + n(matchPlayer.score),
            totalMatches: n(tp.totalMatches) + 1,
            totalSixes: n(tp.totalSixes) + n(matchPlayer.sixes),
            totalFours: n(tp.totalFours) + n(matchPlayer.fours),
            seriesAbsconded,
            abscondedAtMatchNumber,
          };
        }
        return tp;
      });

      return {
        ...prevTournament,
        players: updatedTournamentPlayers,
        matches: [...prevTournament.matches, matchToClose]
      };
    });

    setActiveMatch(null);
  };

  const discardActiveMatch = () => {
    setActiveMatch(null);
  };

  const undoBall = () => {
    setActiveMatch(prev => {
      if (!prev || prev.currentBatterIndex === -1) return prev;
      const currentPlayer = prev.players[prev.currentBatterIndex];
      const updatedPlayer = undoLastBall(currentPlayer);
      const newPlayers = [...prev.players];
      newPlayers[prev.currentBatterIndex] = updatedPlayer;
      return { ...prev, players: newPlayers, isFinished: false };
    });
  };

  const nextBatter = () => {
    setActiveMatch(prev => {
      if (!prev) return prev;
      // Find next pending player (not absconded, not completed)
      const nextIndex = prev.players.findIndex((p, i) => i > prev.currentBatterIndex && p.status === 'pending');
      
      if (nextIndex !== -1) {
        const newPlayers = prev.players.map((p, i) => {
          if (i === nextIndex) return { ...p, status: 'batting' as const };
          return p;
        });
        return { ...prev, players: newPlayers, currentBatterIndex: nextIndex };
      }
      
      // If no next batter, check if anyone earlier was unmarked and is now pending
      const retryIndex = prev.players.findIndex((p) => p.status === 'pending');
      if (retryIndex !== -1) {
        const newPlayers = prev.players.map((p, i) => {
          if (i === retryIndex) return { ...p, status: 'batting' as const };
          return p;
        });
        return { ...prev, players: newPlayers, currentBatterIndex: retryIndex };
      }

      return prev;
    });
  };

  const resetTournament = () => {
    setTournament(null);
    setActiveMatch(null);
    localStorage.removeItem('boundary_league_tournament');
    localStorage.removeItem('boundary_league_active_match');
  };

  const endSeries = () => {
    setTournament(prev => {
      if (!prev) return prev;
      return { ...prev, isClosed: true };
    });
    setActiveMatch(null);
  };

  return (
    <GameContext.Provider value={{ 
      gameHydrated,
      tournament, 
      activeMatch, 
      startTournament, 
      startNewMatch, 
      recordBall, 
      undoBall, 
      nextBatter, 
      closeMatch, 
      discardActiveMatch,
      resetTournament,
      reorderPlayers,
      addPlayerToSeries,
      togglePlayerAbsconded,
      endSeries
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
