'use client';

import { GameInfoPanel } from '@/components/game/game-info-panel';
import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, type Square as ChessJsSquare } from 'chess.js';
import { useToast } from '@/hooks/use-toast';

const Chessboard = dynamic(
  () => import('@/components/game/chessboard').then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => <div className="w-full max-w-[calc(100vh-10rem)] aspect-square bg-muted/50 rounded-lg flex items-center justify-center">Loading Board...</div>
  }
);

declare global {
  interface Window {
    Stockfish: any;
  }
}

function GamePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const playMode = searchParams.get('play');
  const isBotGame = playMode === 'bot';
  
  const game = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(game.board());
  const [history, setHistory] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);

  const engineGo = useCallback(() => {
    if (engine.current) {
      engine.current.postMessage('go depth 15');
    }
  }, []);

  useEffect(() => {
    if (isBotGame) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/16.0.0/stockfish.js';
      script.async = true;
      script.onload = () => {
        const sf = window.Stockfish();
        engine.current = sf;
        sf.addEventListener('message', (e: any) => {
          if (e.data?.startsWith('bestmove')) {
            const bestMove = e.data.split(' ')[1];
            if (bestMove) {
              game.move(bestMove, { sloppy: true });
              setBoard([...game.board()]);
              setHistory(game.history({ verbose: true }).map(move => move.san));
            }
          }
        });
        sf.postMessage('uci');
        setIsEngineLoading(false);
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [isBotGame, game, engineGo]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    try {
      const result = game.move(move);
      if (result) {
        setBoard([...game.board()]);
        setHistory(game.history({ verbose: true }).map(move => move.san));

        if (isBotGame && !game.isGameOver() && engine.current) {
          engine.current.postMessage(`position fen ${game.fen()}`);
          setTimeout(engineGo, 200);
        }
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: 'You cannot move the piece to that square.',
        });
        return false;
      }
    } catch (e: any) {
       toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: e.message || 'The move is not allowed.',
        });
       return false;
    }
  };

  const handleStartGame = () => {
    setGameStarted(true);
  };

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
          <Chessboard 
            game={game}
            board={board}
            onMove={makeMove}
            isBotGame={isBotGame} 
            gameStarted={gameStarted}
            isEngineLoading={isEngineLoading}
          />
        </div>
        <div className="w-full shrink-0 border-l bg-card lg:w-[350px] lg:h-auto">
          <GameInfoPanel 
            isBotGame={isBotGame} 
            onStartGame={handleStartGame} 
            gameStarted={gameStarted}
            moves={history}
          />
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
