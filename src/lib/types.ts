
import type { FunctionComponent } from "react";

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
  id: string;
  player1Id?: string;
  player2Id?: string;
  player1?: Player;
  player2?: Player;
  status: GameStatus;
  eloGain?: number;
  fen: string;
  turn: 'w' | 'b';
  moves: string[];
  winner?: 'w' | 'b' | 'd'; // d for draw
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

    
