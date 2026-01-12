
export type Player = {
  id: string;
  username: string;
  avatarUrl?: string;
  eloRating: number;
};

export type User = {
  id: string;
  username: string;
  avatarUrl?: string;
  eloRating: number;
  onlineStatus: 'online' | 'offline';
};

export type GameStatus = 'invited' | 'waiting' | 'inprogress' | 'completed';

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
  winnerId?: 'w' | 'b' | 'd'; // d for draw
  drawOffer?: 'w' | 'b' | null;
  reason?: 'checkmate' | 'resign' | 'draw' | 'stalemate';
};

export type HistoryGame = {
  id: string;
  opponent: Player;
  result: 'Win' | 'Loss' | 'Draw';
  date: string;
  eloChange: string;
};
