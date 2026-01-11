import type { PieceComponent } from './types';
import { ClassicChessPieces } from '@/components/icons/chess-pieces/classic';
import { ModernChessPieces } from '@/components/icons/chess-pieces/modern';
import { AlphaChessPieces } from '@/components/icons/chess-pieces/alpha';

export type PieceSet = {
  id: string;
  name: string;
  component: PieceComponent;
};

export const PIECE_SETS: PieceSet[] = [
  {
    id: 'classic',
    name: 'Classic',
    component: ClassicChessPieces,
  },
  {
    id: 'modern',
    name: 'Modern',
    component: ModernChessPieces,
  },
  {
    id: 'alpha',
    name: 'Alpha',
    component: AlphaChessPieces,
  },
];
