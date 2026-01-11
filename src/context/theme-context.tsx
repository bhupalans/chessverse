
'use client';

import React, { createContext, useState, ReactNode } from 'react';
import { CHESS_THEMES, type ChessTheme } from '@/lib/chess-themes';

interface ThemeContextType {
  theme: ChessTheme;
  setTheme: (theme: ChessTheme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: CHESS_THEMES[0],
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ChessTheme>(CHESS_THEMES[0]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
