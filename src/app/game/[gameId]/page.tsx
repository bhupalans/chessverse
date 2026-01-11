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
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { Game as GameType } from '@/lib/types';
import { doc } from 'firebase/firestore';


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

  const firestore = useFirestore();
  const { user } = useUser();
  const gameRef = useMemoFirebase(() => firestore && gameId ? doc(firestore, 'games', gameId) : null, [firestore, gameId]);
  const { data: gameData, isLoading: isGameLoading } = useDoc<GameType>(gameRef);

  const localGame = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState(localGame.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);
  
  const playerColor = useMemo(() => {
    if (!gameData || !user) return 'w';
    return gameData.player1Id === user.uid ? 'w' : 'b';
  }, [gameData, user]);

  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  useEffect(() => {
    if (gameData?.fen) {
      localGame.load(gameData.fen);
      setFen(localGame.fen());
      setHistory(localGame.history({ verbose: true }).map(move => move.san));
    }
     if (gameData?.status === 'inprogress') {
      setGameStarted(true);
    }
  }, [gameData, localGame]);

  const engineGo = useCallback(() => {
    if (engine.current) {
      engine.current.postMessage('go depth 15');
    }
  }, []);

  useEffect(() => {
    if (isBotGame) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/16.0.0/stockfish.umd.js';
      script.async = true;
      script.onload = () => {
        if (window.Stockfish) {
            const sf = new (window.Stockfish as any)();
            engine.current = sf;
            sf.addEventListener('message', (e: any) => {
              if (e.data?.startsWith('bestmove')) {
                const bestMove = e.data.split(' ')[1];
                if (bestMove && localGame.turn() === opponentColor) {
                  localGame.move(bestMove, { sloppy: true });
                  setFen(localGame.fen());
                  setHistory(localGame.history({ verbose: true }).map(move => move.san));
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
        if (engine.current) {
          engine.current.postMessage('quit');
        }
      };
    }
  }, [isBotGame, localGame, opponentColor]);

  const isGameOver = useMemo(() => gameData?.status === 'completed' || localGame.isGameOver(), [gameData, localGame]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    try {
      if (isGameOver || localGame.turn() !== playerColor) return false;
      const result = localGame.move(move);
      if (result) {
        const newFen = localGame.fen();
        const newHistory = localGame.history({ verbose: true }).map(move => move.san);
        setFen(newFen);
        setHistory(newHistory);
        
        let newStatus = gameData?.status;
        if (localGame.isGameOver()) {
          newStatus = 'completed';
          handleGameOver(localGame.isCheckmate() ? 'Checkmate!' : 'Game Over');
        }
        
        if (!isBotGame && gameRef) {
          updateDocumentNonBlocking(gameRef, { fen: newFen, turn: localGame.turn(), moves: newHistory, status: newStatus });
        }

        if (isBotGame && !localGame.isGameOver() && engine.current) {
          engine.current.postMessage(`position fen ${localGame.fen()}`);
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
    toast({
      title: 'Game Over',
      description: message,
    });
  };

  const handleResign = () => {
    if (gameRef) {
      updateDocumentNonBlocking(gameRef, { status: 'completed', winner: opponentColor });
    }
    handleGameOver(`You have resigned. ${isBotGame ? 'The bot' : gameData?.player2?.name} wins.`);
  };

  const handleOfferDraw = () => {
    if(gameRef){
      updateDocumentNonBlocking(gameRef, { status: 'completed', winner: 'd' }); // 'd' for draw
    }
    handleGameOver('Draw by agreement.');
  };


  const handleStartGame = () => {
     if(isBotGame) {
       setGameStarted(true);
     }
  };

  // Define players based on game type
  const botPlayer = { name: 'Stockfish Bot', elo: 2000, avatar: PlaceHolderImages[1].imageUrl, isBot: true };
  
  const p1 = isBotGame ? { name: 'You', elo: 1500, avatar: PlaceHolderImages[0].imageUrl } : (gameData?.player1 || { name: 'Player 1', elo: 1200, avatar: PlaceHolderImages[0].imageUrl });
  const p2 = isBotGame ? botPlayer : (gameData?.player2 || { name: 'Player 2', elo: 1200, avatar: PlaceHolderImages[1].imageUrl });

  const whitePlayer = gameData?.player1Id === user?.uid || playerColor === 'w' ? p1 : p2;
  const blackPlayer = gameData?.player1Id === user?.uid || playerColor === 'w' ? p2 : p1;
  
  const topPlayer = playerColor === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = playerColor === 'w' ? whitePlayer : blackPlayer;
  const finalGameOver = isGameOver || localGame.isGameOver();
  const currentTurn = gameData?.turn || localGame.turn();

  if (isGameLoading) {
    return <div className="flex h-full items-center justify-center">Loading game...</div>;
  }

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">
          <PlayerCard 
            name={topPlayer.name} 
            elo={topPlayer.elo} 
            avatar={topPlayer.avatarUrl || PlaceHolderImages[1].imageUrl}
            isBot={isBotGame && topPlayer === botPlayer} 
            isTurn={gameStarted && currentTurn === opponentColor && !finalGameOver} 
            color={playerColor === 'w' ? 'Black' : 'White'}
          />
          <Chessboard 
            fen={fen}
            onMove={makeMove}
            gameStarted={gameStarted}
            isEngineLoading={isEngineLoading}
            playerColor={playerColor}
            isGameOver={finalGameOver}
            turn={currentTurn}
          />
           <PlayerCard 
            name={bottomPlayer.name} 
            elo={bottomPlayer.elo} 
            avatar={bottomPlayer.avatarUrl || PlaceHolderImages[0].imageUrl}
            isTurn={gameStarted && currentTurn === playerColor && !finalGameOver} 
            color={playerColor === 'w' ? 'White' : 'Black'}
          />

          <div className="p-4 flex items-center justify-between bg-card rounded-lg">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {gameStarted ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={finalGameOver}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={finalGameOver}>
                    <Swords className="mr-2 h-4 w-4" /> Offer Draw
                  </Button>
                </>
              ) : isBotGame ? (
                <Button onClick={handleStartGame} className="col-span-2" disabled={isEngineLoading}>
                  <Play className="mr-2 h-4 w-4" /> 
                  {isEngineLoading ? 'Loading Engine...' : 'Start Game'}
                </Button>
              ) : (
                 <div className="col-span-2 text-center text-muted-foreground">Waiting for players...</div>
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
