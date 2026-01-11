'use client';

import { GameInfoPanel } from '@/components/game/game-info-panel';
import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';

const Chessboard = dynamic(
  () => import('@/components/game/chessboard').then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => <div className="w-full max-w-[calc(100vh-10rem)] aspect-square bg-muted/50 rounded-lg flex items-center justify-center">Loading Board...</div>
  }
);


function GamePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const playMode = searchParams.get('play');
  const isBotGame = playMode === 'bot';
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
          <Chessboard gameId={gameId} isBotGame={isBotGame} gameStarted={gameStarted} />
        </div>
        <div className="w-full shrink-0 border-l bg-card lg:w-[350px] lg:h-auto">
          <GameInfoPanel isBotGame={isBotGame} onStartGame={handleStartGame} gameStarted={gameStarted} />
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
