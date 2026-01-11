'use client';

import { Chessboard } from '@/components/game/chessboard';
import { GameInfoPanel } from '@/components/game/game-info-panel';
import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GamePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const playMode = searchParams.get('play');
  const isBotGame = playMode === 'bot';

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
          <Chessboard gameId={gameId} isBotGame={isBotGame} />
        </div>
        <div className="w-full shrink-0 border-l bg-card lg:w-[350px] lg:h-auto">
          <GameInfoPanel isBotGame={isBotGame} />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GamePageContent />
    </Suspense>
  );
}
