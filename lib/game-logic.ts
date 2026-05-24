import { BallRecord, Player, calculatePlayerStats, MAX_LEGAL_BALLS } from './types';

export function processBall(player: Player, type: BallRecord['type']): Player {
  if (player.status !== 'batting' || player.isOut || player.ballsFaced >= MAX_LEGAL_BALLS) {
    return player;
  }

  let runs = 0;
  let isLegal = true;
  let isOut = false;

  switch (type) {
    case '4':
      runs = 4;
      break;
    case '6':
      runs = 6;
      break;
    case 'WIDE':
    case 'NO_BALL':
      runs = 1;
      isLegal = false;
      break;
    case 'OUT':
      isOut = true;
      break;
    case 'DOT':
      runs = 0;
      break;
  }

  const newBall: BallRecord = {
    type,
    runs,
    isLegal,
    timestamp: Date.now()
  };

  const newHistory = [...player.history, newBall];
  const stats = calculatePlayerStats(newHistory);

  let status: Player['status'] = player.status;
  if (stats.isOut || stats.ballsFaced >= MAX_LEGAL_BALLS) {
    status = 'completed';
  }

  return {
    ...player,
    ...stats,
    history: newHistory,
    status
  };
}

export function undoLastBall(player: Player): Player {
  if (player.history.length === 0) return player;
  
  const newHistory = player.history.slice(0, -1);
  const stats = calculatePlayerStats(newHistory);
  
  return {
    ...player,
    ...stats,
    history: newHistory,
    status: 'batting' // If we undo, they are batting again
  };
}
