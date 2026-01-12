
'use client';

import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, type Square as ChessJsSquare, type Color, type Move, type Piece } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { PlayerCard } from '@/components/game/player-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Flag, Play, Swords, Crown, Handshake } from 'lucide-react';
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
  const router = useRouter();
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
  const [gameOverState, setGameOverState] = useState<{ winner: string, reason: string } | null>(null);
  const [winnerColor, setWinnerColor] = useState<'w' | 'b' | 'd' | null>(null);
  const [kingPositions, setKingPositions] = useState<{ w: ChessJsSquare, b: ChessJsSquare } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: ChessJsSquare; to: ChessJsSquare } | null>(null);
  
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
  
  const findKingPositions = useCallback((gameInstance: Chess) => {
    let w: ChessJsSquare | null = null;
    let b: ChessJsSquare | null = null;
    gameInstance.board().forEach((row) => {
        row.forEach((piece) => {
            if (piece && piece.type === 'k') {
                if (piece.color === 'w') w = piece.square;
                else b = piece.square;
            }
        });
    });
    if (w && b) {
      setKingPositions({ w, b });
    }
  }, []);


  const handleGameOver = useCallback((reason: string, winner?: 'w' | 'b' | 'd') => {
      playSound('game-end');
      const winnerData = winner || (localGame.turn() === 'b' ? 'w' : 'b');
      setWinnerColor(winnerData);
      findKingPositions(localGame);

      let winnerName = 'draw';
      if (winnerData !== 'd') {
          if (isBotGame) {
              winnerName = winnerData === playerColor ? (user?.displayName || 'You') : 'Stockfish Bot';
          } else if (gameData) {
              if (winnerData === 'w') {
                  winnerName = gameData.player1?.username || 'Player 1';
              } else {
                  winnerName = gameData.player2?.username || 'Player 2';
              }
          }
      }
      setGameOverState({ winner: winnerName, reason });
  }, [isBotGame, gameData, localGame, playerColor, playSound, user, findKingPositions]);

  useEffect(() => {
    if (gameData?.fen) {
      if(localGame.fen() !== gameData.fen) {
        const oldFen = localGame.fen();
        localGame.load(gameData.fen);
        setFen(localGame.fen());
        
        const history = localGame.history({ verbose: true });
        if(history.length > 0) {
            const lastHistoryMove = history[history.length - 1];
            setLastMove({ from: lastHistoryMove.from, to: lastHistoryMove.to });
        }
      }
    }
    if (gameData?.status === 'inprogress') {
      setGameStarted(true);
    }
    if (gameData?.status === 'completed' && gameData.winner && !gameOverState) {
        let reason = 'Checkmate!';
        if (gameData.reason === 'draw') reason = 'Draw by agreement';
        else if(gameData.reason === 'resign') reason = 'Resignation';
        else if(gameData.reason === 'stalemate') reason = 'Stalemate';
        handleGameOver(reason, gameData.winner);
    }
  }, [gameData, localGame, handleGameOver, gameOverState]);

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
                    setLastMove({ from: moveResult.from, to: moveResult.to });
                  }
                  setFen(localGame.fen());
                  if (localGame.isGameOver()) {
                    if(localGame.isCheckmate()){
                       handleGameOver('Checkmate!');
                    } else if (localGame.isStalemate()) {
                       handleGameOver('Stalemate', 'd');
                    } else if (localGame.isDraw()) {
                       handleGameOver('Draw', 'd');
                    } else {
                       handleGameOver('Game Over');
                    }
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
  }, [isBotGame, localGame, opponentColor, playSound, handleGameOver]);

  const finalGameOver = useMemo(() => !!gameOverState || gameData?.status === 'completed' || localGame.isGameOver(), [gameOverState, gameData, localGame]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    const currentTurn = gameData?.turn || localGame.turn();
    if (finalGameOver || currentTurn !== playerColor) return false;

    try {
      const tempGame = new Chess(localGame.fen());
      const result = tempGame.move(move);
      
      if (result) {
        if (result.flags.includes('c')) playSound('capture');
        else playSound('move');
        if (tempGame.inCheck()) playSound('check');

        const newFen = tempGame.fen();
        setLastMove({ from: result.from, to: result.to });
        
        const updatePayload: Partial<GameType> & DocumentData = {
            fen: newFen,
            turn: tempGame.turn(),
            moves: [...(gameData?.moves || []), result.san]
        };

        if (tempGame.isGameOver()) {
          updatePayload.status = 'completed';
          let reason: GameType['reason'] = 'checkmate';
          let winner: GameType['winner'] = localGame.turn() === 'b' ? 'w' : 'b';

          if (tempGame.isCheckmate()) {
            reason = 'checkmate';
            winner = tempGame.turn() === 'w' ? 'b' : 'w';
          } else if (tempGame.isStalemate()){
            reason = 'stalemate';
            winner = 'd';
          } else if (tempGame.isDraw()) {
            reason = 'draw';
            winner = 'd';
          }
          
          updatePayload.winner = winner;
          updatePayload.reason = reason;
          handleGameOver(reason!, winner);
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

  const handleResign = () => {
    if (finalGameOver) return;
    const winner = opponentColor;
    if (!isBotGame && gameRef) {
      updateDocumentNonBlocking(gameRef, { status: 'completed', winner: winner, reason: 'resign' });
    }
    const opponentName = isBotGame ? 'Stockfish Bot' : gameData?.player1Id === user?.uid ? gameData?.player2?.username : gameData?.player1?.username;
    handleGameOver(`You have resigned. ${opponentName} wins.`, winner);
  };

  const handleOfferDraw = () => {
    if (finalGameOver || !!gameData?.drawOffer) return;
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
        updateDocumentNonBlocking(gameRef, { status: 'completed', winner: 'd', reason: 'draw', drawOffer: null });
        handleGameOver('Game drawn by agreement.', 'd');
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
  
  const botPlayer = { id: 'bot', username: 'Stockfish Bot', eloRating: 2000, avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' };
  const humanPlayer = { id: user?.uid || 'human', username: user?.displayName || 'You', eloRating: 1500, avatarUrl: user?.photoURL || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' };
  
  let whitePlayer, blackPlayer;

  if (isBotGame) {
    whitePlayer = humanPlayer;
    blackPlayer = botPlayer;
  } else if (gameData?.player1 && gameData?.player2) {
    if (gameData.player1.id === gameData.player1Id) {
      whitePlayer = gameData.player1;
      blackPlayer = gameData.player2;
    } else {
      whitePlayer = gameData.player2;
      blackPlayer = gameData.player1;
    }
  } else {
     whitePlayer = gameData?.player1 || { id: 'p1', username: 'Player 1', eloRating: 1200, avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' };
     blackPlayer = gameData?.player2 || { id: 'p2', username: 'Waiting...', eloRating: 1200, avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' };
  }

  const topPlayer = playerColor === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = playerColor === 'w' ? whitePlayer : blackPlayer;
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
            name={topPlayer.username} 
            elo={topPlayer.eloRating} 
            avatar={topPlayer.avatarUrl}
            isBot={isBotGame && topPlayer.id === 'bot'} 
            isTurn={gameStarted && currentTurn === opponentColor && !finalGameOver} 
            color={'Black'}
          />
          <div className="relative">
            <Chessboard 
              fen={fen === 'start' && gameData?.fen ? gameData.fen : fen}
              onMove={makeMove}
              gameStarted={gameStarted}
              isEngineLoading={isEngineLoading}
              playerColor={playerColor}
              isGameOver={finalGameOver}
              turn={currentTurn}
              winner={winnerColor}
              kingPositions={kingPositions}
              lastMove={lastMove}
            />
            {gameOverState && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
                <div className="text-center text-white p-8 rounded-lg">
                    {winnerColor === 'd' ? (
                       <Handshake className="w-24 h-24 text-amber-400 mx-auto" />
                    ) : (
                       <Crown className="w-24 h-24 text-yellow-400 mx-auto" />
                    )}
                    <h2 className="text-3xl font-bold mt-4">Game Over</h2>
                    <p className="text-lg mt-1">{gameOverState.reason}</p>
                    <p className="text-2xl font-semibold mt-4">
                      {winnerColor === 'd' ? "It's a Draw!" : `${gameOverState.winner} Wins!`}
                    </p>
                    <Button 
                      className="mt-6" 
                      onClick={() => router.push('/')}>
                      Back to Lobby
                    </Button>
                </div>
              </div>
            )}
          </div>
           <PlayerCard 
            name={bottomPlayer.username} 
            elo={bottomPlayer.eloRating} 
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
                  {isEngineLoading ? 'Loading Engine...' : 'Play vs Bot'}
                </Button>
              ) : (
                 <div className="col-span-2 text-center text-muted-foreground">Waiting for opponent...</div>
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

    