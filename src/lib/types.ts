

export type Player = {
  id: string;
  username: string;
  avatarUrl?: string;
  eloRating: number;
};

export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  eloRating: number;
  onlineStatus: 'online' | 'offline';
  completedGames: number;
};

export type GameStatus = 'invited' | 'waiting' | 'inprogress' | 'completed';

export type LastMove = {
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  captured: boolean;
  sound?: 'move' | 'capture' | 'check' | 'castle' | 'promotion';
};

export type LastDrawAction = {
    type: 'accepted' | 'declined';
    by: 'w' | 'b';
    at: any; // Firestore Timestamp
}

export type TimeControl = {
    initial: number; // in seconds
    increment: number; // in seconds
}

export type Game = {
  id:string;
  player1Id?: string;
  player2Id?: string;
  player1?: Player;
  player2?: Player;
  status: GameStatus;
  eloGain?: number;
  fen: string;
  turn: 'w' | 'b';
  moves: string[];
  lastMove?: LastMove;
  winnerId?: 'w' | 'b' | 'd'; // d for draw
  drawOffer?: 'w' | 'b' | null;
  lastDrawAction?: LastDrawAction;
  reason?: 'checkmate' | 'resign' | 'draw' | 'stalemate';
  timeControl?: TimeControl;
};

export type HistoryGame = {
  id: string;
  opponent: Player;
  result: 'Win' | 'Loss' | 'Draw';
  date: string;
  eloChange: string;
};

export type LiveClock = {
    white: number;
    black: number;
    running: 'w' | 'b';
    lastTick: number; // Timestamp
}

export type LiveGame = {
    fen: string;
    turn: 'w' | 'b';
    lastMove?: LastMove;
    clocks?: LiveClock;
}

    