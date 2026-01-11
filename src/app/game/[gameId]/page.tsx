'use client';

import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, type Square as ChessJsSquare, type Color } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { PlayerCard } from '@/components/game/player-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Flag, Play, Swords } from 'lucide-react';
import { ThemeSelector } from '@/components/game/theme-selector';

const Chessboard = dynamic(
  () => import('@/components/game/chessboard').then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => <div className="w-full max-w-lg aspect-square bg-muted/50 rounded-lg flex items-center justify-center">Loading Board...</div>
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
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const opponentColor = playerColor === 'w' ? 'b' : 'w';

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
        if (window.Stockfish) {
            const sf = new (window.Stockfish as any)();
            engine.current = sf;
            sf.addEventListener('message', (e: any) => {
              if (e.data?.startsWith('bestmove')) {
                const bestMove = e.data.split(' ')[1];
                if (bestMove && game.turn() === opponentColor) {
                  game.move(bestMove, { sloppy: true });
                  setFen(game.fen());
                  setHistory(game.history({ verbose: true }).map(move => move.san));
                }
              }
              if (e.data === 'uciok') {
                setIsEngineLoading(false);
              }
            });
            sf.postMessage('uci');
        }
      };
      document.body.appendChild(script);

      return () => {
        if(document.body.contains(script)){
          document.body.removeChild(script);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotGame]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    try {
      if (game.isGameOver() || game.turn() !== playerColor) return false;
      const result = game.move(move);
      if (result) {
        setFen(game.fen());
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
  
  const handleGameOver = (message: string) => {
    game.move('e8=Q'); // Arbitrary invalid move to trigger game over state in chess.js
    toast({
      title: 'Game Over',
      description: message,
    });
  };

  const handleResign = () => {
    handleGameOver('You have resigned. The bot wins.');
  };

  const handleOfferDraw = () => {
    handleGameOver('Draw by agreement.');
  };


  const handleStartGame = () => {
    setGameStarted(true);
  };
  
  const whitePlayer = { name: 'You', elo: 1500, avatar: PlaceHolderImages[0].imageUrl };
  const blackPlayer = { name: 'Stockfish Bot', elo: 2000, avatar: PlaceHolderImages[1].imageUrl, isBot: isBotGame };
  
  const topPlayer = playerColor === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = playerColor === 'w' ? whitePlayer : blackPlayer;

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">
          <PlayerCard 
            name={topPlayer.name} 
            elo={topPlayer.elo} 
            avatar={topPlayer.avatar} 
            isBot={topPlayer.isBot} 
            isTurn={gameStarted && game.turn() === opponentColor} 
            color={playerColor === 'w' ? 'Black' : 'White'}
          />
          <Chessboard 
            game={game}
            fen={fen}
            onMove={makeMove}
            isBotGame={isBotGame} 
            gameStarted={gameStarted}
            isEngineLoading={isEngineLoading}
            playerColor={playerColor}
          />
           <PlayerCard 
            name={bottomPlayer.name} 
            elo={bottomPlayer.elo} 
            avatar={bottomPlayer.avatar} 
            isTurn={gameStarted && game.turn() === playerColor} 
            color={playerColor === 'w' ? 'White' : 'Black'}
          />

          <div className="p-4 flex items-center justify-between bg-card rounded-lg">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {gameStarted ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={game.isGameOver()}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={game.isGameOver()}>
                    <Swords className="mr-2 h-4 w-4" /> Offer Draw
                  </Button>
                </>
              ) : (
                <Button onClick={handleStartGame} className="col-span-2" disabled={isBotGame && isEngineLoading}>
                  <Play className="mr-2 h-4 w-4" /> 
                  {isBotGame && isEngineLoading ? 'Loading Engine...' : 'Start Game'}
                </Button>
              )}
            </div>
             <div className="ml-2">
              <ThemeSelector />
            </div>
          </div>
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
