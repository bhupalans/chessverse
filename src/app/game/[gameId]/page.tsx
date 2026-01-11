'use client';

import { Chessboard } from '@/components/game/chessboard';
import { GameInfoPanel } from '@/components/game/game-info-panel';
import { ThemeProvider } from '@/context/theme-context';
import { useParams } from 'next/navigation';

export default function GamePage() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
          <Chessboard gameId={gameId} />
        </div>
        <div className="w-full shrink-0 border-l bg-card lg:w-[350px] lg:h-auto">
          <GameInfoPanel />
        </div>
      </div>
    </ThemeProvider>
  );
}
