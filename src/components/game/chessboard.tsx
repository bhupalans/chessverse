'use client';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import { type Color } from 'chess.js';
import { ThemeContext } from '@/context/theme-context';

export function Chessboard({
  playerColor,
  children,
}: {
  playerColor: Color;
  children: React.ReactNode;
}) {
  const { theme } = useContext(ThemeContext);

  const ranks = playerColor === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const files = playerColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const squares = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const isLightSquare = (i + j) % 2 !== 0;
      squares.push(
        <div
          key={`${i}-${j}`}
          className={cn(
            'flex items-center justify-center',
            isLightSquare ? theme.lightSquare : theme.darkSquare
          )}
        />
      );
    }
  }

  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] aspect-square w-full max-w-lg rounded-lg overflow-hidden shadow-2xl">
      <div className="flex flex-col text-xs font-bold text-muted-foreground pr-1">
        {ranks.map((rank) => (
          <div key={rank} className="flex-1 flex items-center justify-center">{rank}</div>
        ))}
      </div>
      
      <div className="relative">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {squares}
        </div>
        {/* Pieces will be rendered here as children */}
        {children}
      </div>

      <div />
      <div className="flex text-xs font-bold text-muted-foreground pt-1">
        {files.map((file) => (
          <div key={file} className="flex-1 flex items-center justify-center">{file}</div>
        ))}
      </div>
    </div>
  );
}
