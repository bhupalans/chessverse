
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
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
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
    by: string; // user.uid
    at: any; // Firestore Timestamp
}

export type TimeControl = {
    initial: number; // in milliseconds
    increment: number; // in milliseconds
}

export type Game = {
  id:string;
  player1Id: string;
  player2Id: string;
  player1: Player;
  player2: Player;
  player1Color: 'w' | 'b';
  player2Color: 'w' | 'b';
  isBotGame?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  status: GameStatus;
  eloProcessed?: boolean;
  turn: 'w' | 'b';
  moves?: string[];
  lastMove?: LastMove;
  winnerId?: 'w' | 'b' | 'd'; // d for draw
  drawOffer?: string | null; // user.uid
  lastDrawAction?: LastDrawAction;
  reason?: 'checkmate' | 'resign' | 'draw' | 'stalemate' | 'timeout' | 'abort';
  timeControl: TimeControl;
  createdAt: any; // Firestore Timestamp
  completedAt?: any; // Firestore Timestamp
  whiteEloBefore?: number;
  blackEloBefore?: number;
  whiteEloAfter?: number;
  blackEloAfter?: number;
  isTournamentGame?: boolean;
  tournamentId?: string;
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
    increment: number; // seconds
}

export type LiveGame = {
    fen: string;
    turn: 'w' | 'b';
    lastMove?: LastMove;
    clocks?: LiveClock;
}

export type Tournament = {
  id: string;
  name: string;
  timeControl: TimeControl;
  entryFee: number;
  startsAt: any; // Firestore Timestamp
  endsAt: any; // Firestore Timestamp
  status: 'scheduled' | 'running' | 'completed';
  createdAt: any; // Firestore Timestamp
  finalStandings?: any[];
};

export type TournamentPlayer = {
  uid: string;
  username: string;
  eloRating: number;
  score: number;
  gamesPlayed: number;
  activeGameId: string | null;
  joinedAt: any; // Firestore Timestamp
};
