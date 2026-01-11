
'use client';

import { Chessboard } from '@/components/game/chessboard';
import { GameInfoPanel } from '@/components/game/game-info-panel';
import { ThemeProvider } from '@/context/theme-context';

export default function GamePage({ params }: { params: { gameId: string } }) {
  return (
    <ThemeProvider>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
          <Chessboard gameId={params.gameId} />
        </div>
        <div className="w-full shrink-0 border-l bg-card lg:w-[350px] lg:h-auto">
          <GameInfoPanel />
        </div>
      </div>
    </ThemeProvider>
  );
}
