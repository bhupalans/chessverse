'use client';

import React, { createContext, useState, ReactNode } from 'react';
import { CHESS_THEMES, type ChessTheme } from '@/lib/chess-themes';
import { PIECE_SETS, type PieceSet } from '@/lib/piece-sets';

interface ThemeContextType {
  theme: ChessTheme;
  setTheme: (theme: ChessTheme) => void;
  pieceSet: PieceSet;
  setPieceSet: (pieceSet: PieceSet) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: CHESS_THEMES[0],
  setTheme: () => {},
  pieceSet: PIECE_SETS[0],
  setPieceSet: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ChessTheme>(CHESS_THEMES[0]);
  const [pieceSet, setPieceSet] = useState<PieceSet>(PIECE_SETS[0]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, pieceSet, setPieceSet }}>
      {children}
    </ThemeContext.Provider>
  );
};
