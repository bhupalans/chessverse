
'use client';

import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, type Square as ChessJsSquare, type Color, type Move } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { PlayerCard } from '@/components/game/player-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Flag, Play, Swords } from 'lucide-react';
import { ThemeSelector } from '@/components/game/theme-selector';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { Game as GameType } from '@/lib/types';
import { doc, type DocumentData } from 'firebase/firestore';


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
  const [fen, setFen] = useState('start');
  const [gameStarted, setGameStarted] = useState(false);
  
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);
  
  const playerColor = useMemo<Color>(() => {
    if (!gameData || !user) return 'w';
    if (isBotGame) return 'w'; // Human is always white against the bot
    return gameData.player1Id === user.uid ? 'w' : 'b';
  }, [gameData, user, isBotGame]);

  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  // Sound playing utility
  const playSound = useCallback((sound: 'move' | 'capture' | 'check' | 'game-end' | 'illegal') => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.play().catch(e => console.error(`Failed to play ${sound}.mp3`, e));
      } catch (e) {
        console.error("Could not play sound", e)
      }
    }
  }, []);

  useEffect(() => {
    if (gameData?.fen) {
      localGame.load(gameData.fen);
      setFen(localGame.fen());
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
                  const moveResult = localGame.move(bestMove, { sloppy: true });
                  if (moveResult) {
                    if (moveResult.flags.includes('c')) playSound('capture');
                    else playSound('move');
                    if (localGame.inCheck()) playSound('check');
                  }
                  setFen(localGame.fen());
                  if (localGame.isGameOver()) {
                    handleGameOver(localGame.isCheckmate() ? 'Checkmate!' : 'Game Over');
                  }
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
  }, [isBotGame, localGame, opponentColor, playSound]);

  const isGameOver = useMemo(() => gameData?.status === 'completed' || localGame.isGameOver(), [gameData, localGame]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    const currentTurn = gameData?.turn || localGame.turn();
    if (isGameOver || currentTurn !== playerColor) return false;

    try {
      const tempGame = new Chess(localGame.fen());
      const result = tempGame.move(move);
      
      if (result) {
        if (result.flags.includes('c')) playSound('capture');
        else playSound('move');
        if (tempGame.inCheck()) playSound('check');

        const newFen = tempGame.fen();
        
        const updatePayload: Partial<GameType> & DocumentData = {
            fen: newFen,
            turn: tempGame.turn(),
            moves: [...(gameData?.moves || []), result.san]
        };

        if (tempGame.isGameOver()) {
          updatePayload.status = 'completed';
          if (tempGame.isCheckmate()) {
             updatePayload.winner = localGame.turn() === 'b' ? 'w' : 'b';
          } else {
            updatePayload.winner = 'd'; // Draw
          }
          handleGameOver(tempGame.isCheckmate() ? 'Checkmate!' : 'Game Over');
        }
        
        if (!isBotGame && gameRef) {
          updateDocumentNonBlocking(gameRef, updatePayload);
        } else if (isBotGame) {
           localGame.load(newFen);
           setFen(newFen);
           if (!tempGame.isGameOver() && engine.current) {
             engine.current.postMessage(`position fen ${newFen}`);
             setTimeout(engineGo, 200);
           }
        }
        return true;

      } else {
        playSound('illegal');
        toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: 'You cannot move the piece to that square.',
        });
        return false;
      }
    } catch (e: any) {
       playSound('illegal');
       toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: e.message || 'The move is not allowed.',
        });
       return false;
    }
  };
  
  const handleGameOver = (message: string) => {
    playSound('game-end');
    toast({
      title: 'Game Over',
      description: message,
    });
  };

  const handleResign = () => {
    if (isGameOver) return;
    if (!isBotGame && gameRef) {
      updateDocumentNonBlocking(gameRef, { status: 'completed', winner: opponentColor });
    }
    const opponentName = isBotGame ? 'The bot' : gameData?.player1Id === user?.uid ? gameData?.player2?.name : gameData?.player1?.name;
    handleGameOver(`You have resigned. ${opponentName} wins.`);
  };

  const handleOfferDraw = () => {
    if (isGameOver || !!gameData?.drawOffer) return;
    if (!isBotGame && gameRef) {
      updateDocumentNonBlocking(gameRef, { drawOffer: playerColor });
      toast({
        title: 'Draw Offer Sent',
        description: 'Your opponent has been offered a draw.',
      });
    }
  };

  const handleDrawResponse = (accept: boolean) => {
    if (!isBotGame && gameRef) {
      if (accept) {
        updateDocumentNonBlocking(gameRef, { status: 'completed', winner: 'd', drawOffer: null });
        handleGameOver('Game drawn by agreement.');
      } else {
        updateDocumentNonBlocking(gameRef, { drawOffer: null });
        toast({
          title: 'Draw Offer Declined',
          description: 'The game continues.',
        });
      }
    }
  };


  const handleStartGame = () => {
     if(isBotGame) {
       setGameStarted(true);
       setFen(localGame.fen());
     }
  };

  const botPlayer = { id: 'bot', name: 'Stockfish Bot', elo: 2000, avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' };
  const humanPlayer = { id: user?.uid || 'human', name: user?.displayName || 'You', elo: 1500, avatarUrl: user?.photoURL || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' };
  
  const p1 = isBotGame ? humanPlayer : (gameData?.player1 || { id: 'p1', name: 'Player 1', elo: 1200, avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' });
  const p2 = isBotGame ? botPlayer : (gameData?.player2 || { id: 'p2', name: 'Player 2', elo: 1200, avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' });

  const whitePlayer = p1;
  const blackPlayer = p2;
  
  const topPlayer = playerColor === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = playerColor === 'w' ? whitePlayer : blackPlayer;
  const finalGameOver = isGameOver || localGame.isGameOver();
  const currentTurn = gameData?.turn || localGame.turn();
  const drawOfferedToMe = gameData?.drawOffer === opponentColor;

  if (isGameLoading) {
    return <div className="flex h-full items-center justify-center">Loading game...</div>;
  }
   if (!gameData && !isBotGame) {
    return <div className="flex h-full items-center justify-center">Game not found.</div>;
  }

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">
          <PlayerCard 
            name={topPlayer.name} 
            elo={topPlayer.elo} 
            avatar={topPlayer.avatarUrl}
            isBot={isBotGame && topPlayer.id === 'bot'} 
            isTurn={gameStarted && currentTurn === opponentColor && !finalGameOver} 
            color={'Black'}
          />
          <Chessboard 
            fen={fen === 'start' && gameData?.fen ? gameData.fen : fen}
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
            avatar={bottomPlayer.avatarUrl}
            isBot={isBotGame && bottomPlayer.id === 'bot'}
            isTurn={gameStarted && currentTurn === playerColor && !finalGameOver} 
            color={'White'}
            drawOffered={drawOfferedToMe}
            onDrawResponse={handleDrawResponse}
          />

          <div className="p-4 flex items-center justify-between bg-card rounded-lg">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {gameStarted ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={finalGameOver}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={finalGameOver || !!gameData?.drawOffer}>
                    <Swords className="mr-2 h-4 w-4" /> 
                    {gameData?.drawOffer === playerColor ? 'Offered' : 'Offer Draw'}
                  </Button>
                </>
              ) : isBotGame ? (
                <Button onClick={handleStartGame} className="col-span-2" disabled={isEngineLoading}>
                  <Play className="mr-2 h-4 w-4" /> 
                  {isEngineLoading ? 'Loading Engine...' : 'Start Game'}
                </Button>
              ) : (
                 <div className="col-span-2 text-center text-muted-foreground">Waiting for players to join...</div>
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
