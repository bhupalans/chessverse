import type { FunctionComponent } from "react";

export type Player = {
  id: string;
  name: string;
  avatarUrl: string;
  elo: number;
};

export type GameStatus = 'waiting' | 'inprogress' | 'completed';

export type Game = {
  id: string;
  player1Id?: string;
  player2Id?: string;
  player1?: Player;
  player2?: Player;
  players: [Player, Player?]; // Keep for compatibility if used elsewhere
  status: GameStatus;
  eloGain?: number;
};

export type HistoryGame = {
  id: string;
  opponent: Player;
  result: 'Win' | 'Loss' | 'Draw';
  date: string;
  eloChange: string;
};

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type Square = {
  row: number;
  col: number;
};
export type Piece = {
  type: PieceType;
  color: PieceColor;
  square: Square;
};
export type ChessBoardState = (Piece | null)[][];

export interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export type PieceComponent = FunctionComponent<ChessPieceProps>;
