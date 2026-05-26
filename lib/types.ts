
export interface BallRecord {
  type: '4' | '6' | 'WIDE' | 'NO_BALL' | 'OUT' | 'DOT' | 'UNDO';
  runs: number;
  isLegal: boolean;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  nickname?: string;
  // Current Match Stats
  score: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  history: BallRecord[];
  status: 'pending' | 'batting' | 'completed' | 'absconded';
  // Cumulative Tournament Stats
  cumulativeRuns: number;
  totalMatches: number;
  totalSixes: number;
  totalFours: number;
  joinedAtMatchIndex: number; // 0 if joined from start
  /** Persisted on tournament roster: excluded from Treat / active danger until manually cleared */
  seriesAbsconded?: boolean;
  /** 1-based series match number when marked absconded (for results copy) */
  abscondedAtMatchNumber?: number;
}

export interface Match {
  id: string;
  name: string;
  date: string;
  location: string;
  players: Player[];
  currentBatterIndex: number;
  isFinished: boolean;
  winnerId?: string;
  partySponsorId?: string;
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[]; // These players persist across matches
  matches: Match[];
  isClosed: boolean;
}

export const MAX_LEGAL_BALLS = 12;

export function calculatePlayerStats(history: BallRecord[]) {
  return history.reduce(
    (acc, ball) => {
      acc.score += ball.runs;
      if (ball.isLegal) acc.ballsFaced += 1;
      if (ball.type === '4') acc.fours += 1;
      if (ball.type === '6') acc.sixes += 1;
      if (ball.type === 'OUT') acc.isOut = true;
      return acc;
    },
    { score: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }
  );
}
