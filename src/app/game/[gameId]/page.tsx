
'use client';

import { ThemeProvider } from '@/context/theme-context';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Chess, type Square as ChessJsSquare, type Color, type Move } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { PlayerCard } from '@/components/game/player-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Flag, Play, Swords, Crown, Handshake } from 'lucide-react';
import { ThemeSelector } from '@/components/game/theme-selector';
import { useUser, useRealtimeDB, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User as UserType, Game as GameType, LastMove } from '@/lib/types';
import { Chessboard } from '@/components/game/chessboard';
import { ChessPieces } from '@/components/game/chess-pieces';
import { ref, onValue } from 'firebase/database';
import { doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';


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

  const realtimeDB = useRealtimeDB();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [liveGameState, setLiveGameState] = useState<{fen: string; turn: string; lastMove?: LastMove} | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(!isBotGame);

  const gameDocRef = useMemoFirebase(() => {
    if (isBotGame || !gameId || !firestore) return null;
    return doc(firestore, 'games', gameId);
  }, [firestore, gameId, isBotGame]);

  const { data: firestoreGame, isLoading: isFirestoreGameLoading } = useDoc<GameType>(gameDocRef);

  const [botGameFen, setBotGameFen] = useState(() => new Chess().fen());
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ winner: string, reason: string } | null>(null);
  const [winnerColor, setWinnerColor] = useState<'w' | 'b' | 'd' | null>(null);
  const [kingPositions, setKingPositions] = useState<{ w: ChessJsSquare, b: ChessJsSquare } | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);
  
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
    if (isBotGame || !realtimeDB || !gameId) return;

    setIsGameLoading(true);
    const gameRef = ref(realtimeDB, `liveGames/${gameId}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if(data.lastMove) {
            const newGame = new Chess(data.fen);
            if(newGame.inCheck()) playSound('check');
            else if(data.lastMove.captured) playSound('capture');
            else playSound('move');
            setLastMove(data.lastMove);
        } else {
            setLastMove(null);
        }
        setLiveGameState(data);
      } else if (!isFirestoreGameLoading && firestoreGame?.status !== 'inprogress') {
         setLiveGameState({ fen: new Chess().fen(), turn: 'w'});
      } else {
        toast({
          variant: 'destructive',
          title: 'Game not found',
          description: `Could not load live game with ID: ${gameId}`
        });
      }
      setIsGameLoading(false);
    }, (error) => {
      console.error("Realtime DB Error:", error);
      toast({
          variant: 'destructive',
          title: 'Error loading game',
          description: "There was a problem connecting to the database."
      });
      setIsGameLoading(false);
    });

    return () => unsubscribe();
  }, [realtimeDB, gameId, isBotGame, toast, firestoreGame, isFirestoreGameLoading, playSound]);

  const playerColor = useMemo<Color>(() => {
    if (isBotGame || !user || !firestoreGame) return 'w';
    return firestoreGame.player1Id === user.uid ? 'w' : 'b';
  }, [user, firestoreGame, isBotGame]);

  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  
  const gameFen = isBotGame ? botGameFen : liveGameState?.fen;
  
  const game = useMemo(() => {
    if (!gameFen) return new Chess();
    try {
      return new Chess(gameFen);
    } catch (e) {
      console.error("Invalid FEN string:", gameFen);
      return new Chess();
    }
  }, [gameFen]);
  
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

  const { whitePlayer, blackPlayer, isLoading: arePlayersLoading } = useMemo(() => {
    if (isBotGame) {
      const humanPlayer = { id: user?.uid || 'human', username: user?.displayName || 'You', eloRating: 1500, avatarUrl: user?.photoURL || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' };
      const botPlayer = { id: 'bot', username: 'Stockfish Bot', eloRating: 2000, avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '' };
      return { whitePlayer: humanPlayer, blackPlayer: botPlayer, isLoading: false };
    }
    if (isFirestoreGameLoading || !firestoreGame) {
      return { whitePlayer: null, blackPlayer: null, isLoading: true };
    }
    return { whitePlayer: firestoreGame.player1, blackPlayer: firestoreGame.player2, isLoading: false };
  }, [isBotGame, firestoreGame, isFirestoreGameLoading, user]);

  const handleGameOver = useCallback((reason: string, winner?: 'w' | 'b' | 'd') => {
      playSound('game-end');
      const winnerData = winner || (game.turn() === 'b' ? 'w' : 'b');
      setWinnerColor(winnerData);
      
      findKingPositions(game);

      let winnerName = 'draw';
      if (winnerData !== 'd') {
          if (isBotGame) {
              winnerName = winnerData === playerColor ? (user?.displayName || 'You') : 'Stockfish Bot';
          } else if (whitePlayer && blackPlayer) {
              if (winnerData === 'w') {
                  winnerName = whitePlayer.username;
              } else {
                  winnerName = blackPlayer.username;
              }
          }
      }
      if (!gameOverState) {
        setGameOverState({ winner: winnerName, reason });
      }
  }, [isBotGame, game, playerColor, playSound, user, findKingPositions, whitePlayer, blackPlayer, gameOverState]);
  
  useEffect(() => {
    if (!gameStarted && firestoreGame?.status === 'inprogress') {
      setGameStarted(true);
    }
  }, [firestoreGame, gameStarted]);


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
                const tempGame = new Chess(game.fen());
                if (bestMove && tempGame.turn() === opponentColor) {
                  const moveResult = tempGame.move(bestMove, { sloppy: true });

                  if (moveResult) {
                    if (tempGame.inCheck()) playSound('check');
                    else if (moveResult.flags.includes('c')) playSound('capture');
                    else playSound('move');
                    
                    setLastMove({ from: moveResult.from, to: moveResult.to, piece: moveResult.piece, color: moveResult.color, captured: moveResult.flags.includes('c') });
                    setBotGameFen(tempGame.fen());

                    if (tempGame.isGameOver()) {
                      if(tempGame.isCheckmate()){
                         handleGameOver('Checkmate!', tempGame.turn() === 'w' ? 'b' : 'w');
                      } else if (tempGame.isStalemate()) {
                         handleGameOver('Stalemate', 'd');
                      } else if (tempGame.isDraw()) {
                         handleGameOver('Draw', 'd');
                      } else {
                         handleGameOver('Game Over');
                      }
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
  }, [isBotGame, game, opponentColor, playSound, handleGameOver]);

  const finalGameOver = useMemo(() => !!gameOverState || game.isGameOver(), [gameOverState, game]);

  const makeMove = async (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    if (isBotGame) {
      // Logic for making a move in a bot game
      const tempGame = new Chess(gameFen);
      const moveResult = tempGame.move(move);

      if (moveResult) {
        if (tempGame.inCheck()) playSound('check');
        else if (moveResult.flags.includes('c')) playSound('capture');
        else playSound('move');
        
        setLastMove({ from: moveResult.from, to: moveResult.to, piece: moveResult.piece, color: moveResult.color, captured: moveResult.flags.includes('c') });
        setBotGameFen(tempGame.fen());
        
        if (tempGame.isGameOver()) {
           if(tempGame.isCheckmate()){
             handleGameOver('Checkmate!', tempGame.turn() === 'w' ? 'b' : 'w');
           } else if (tempGame.isStalemate()) {
             handleGameOver('Stalemate', 'd');
           } else if (tempGame.isDraw()) {
             handleGameOver('Draw', 'd');
           }
        } else {
          // Trigger bot move
          engine.current.postMessage(`position fen ${tempGame.fen()}`);
          engineGo();
        }
        return true;
      } else {
        playSound('illegal');
        toast({ title: 'Invalid move' });
        return false;
      }
    } else {
      // Logic for making a move in a player vs player game
      try {
        const functions = getFunctions();
        const submitMove = httpsCallable(functions, 'submitMove');
        await submitMove({ gameId, from: move.from, to: move.to, promotion: move.promotion });
        return true;
      } catch (error: any) {
        console.error('Error submitting move:', error);
        playSound('illegal');
        toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: error.message || 'The move is not allowed.',
        });
        return false;
      }
    }
  };

  const handleResign = () => {
    if (finalGameOver) return;
    const winnerId = opponentColor;
    const opponentName = isBotGame ? 'Stockfish Bot' : (playerColor === 'w' ? blackPlayer?.username : whitePlayer?.username) || 'Opponent';
    handleGameOver(`You have resigned. ${opponentName} wins.`, winnerId);
  };

  const handleOfferDraw = () => {
     if (finalGameOver) return;
     toast({
        title: 'Draw Offer',
        description: 'Draw offer functionality is not yet implemented.',
      });
  };

  const handleDrawResponse = (accept: boolean) => {
    toast({
      title: 'Draw Offer',
      description: 'Draw offer functionality is not yet implemented.',
    });
  };

  const handleStartGame = () => {
     if(isBotGame) {
       setGameStarted(true);
       setLastMove(null);
     }
  };

  const topPlayer = playerColor === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = playerColor === 'w' ? whitePlayer : blackPlayer;
  const currentTurn = game.turn();
  const drawOfferedToMe = false; // Placeholder

  if (isGameLoading || arePlayersLoading || !gameFen) {
    return <div className="flex h-full items-center justify-center">Loading game...</div>;
  }
   if (!liveGameState && !isBotGame) {
    return <div className="flex h-full items-center justify-center">Game not found.</div>;
  }

  return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">
           {topPlayer && (
            <PlayerCard 
              name={topPlayer.username} 
              elo={topPlayer.eloRating} 
              avatar={topPlayer.avatarUrl}
              isBot={isBotGame && topPlayer.id === 'bot'} 
              isTurn={gameStarted && currentTurn === opponentColor && !finalGameOver} 
              color={playerColor === 'w' ? 'Black' : 'White'}
            />
          )}
          <div className="relative">
            <Chessboard playerColor={playerColor}>
                <ChessPieces
                    fen={gameFen}
                    onMove={makeMove}
                    playerColor={playerColor}
                    isGameOver={finalGameOver}
                    turn={currentTurn}
                    gameStarted={gameStarted}
                    isEngineLoading={isEngineLoading}
                    winner={winnerColor}
                    kingPositions={kingPositions}
                    lastMove={lastMove}
                />
            </Chessboard>
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
             {!gameStarted && !isEngineLoading && isBotGame && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                     <Button onClick={handleStartGame} size="lg">
                         <Play className="mr-2 h-5 w-5" /> Play vs Bot
                     </Button>
                 </div>
             )}
             {isEngineLoading && isBotGame && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-white text-lg">Loading Engine...</div>
                </div>
             )}
             {!gameStarted && !isBotGame && firestoreGame?.status === 'waiting' &&(
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-white text-lg text-center p-4">
                        <p>Waiting for an opponent...</p>
                        <p className="text-sm text-muted-foreground mt-2">The game will start once someone joins.</p>
                    </div>
                </div>
             )}
          </div>
          {bottomPlayer && (
             <PlayerCard 
                name={bottomPlayer.username} 
                elo={bottomPlayer.eloRating} 
                avatar={bottomPlayer.avatarUrl}
                isBot={isBotGame && bottomPlayer.id === 'bot'}
                isTurn={gameStarted && currentTurn === playerColor && !finalGameOver} 
                color={playerColor === 'w' ? 'White' : 'Black'}
                drawOffered={drawOfferedToMe}
                onDrawResponse={handleDrawResponse}
              />
          )}
          <div className="p-4 flex items-center justify-between bg-card rounded-lg">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {gameStarted ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={finalGameOver}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={finalGameOver}>
                    <Swords className="mr-2 h-4 w-4" /> 
                    Offer Draw
                  </Button>
                </>
              ) : !isBotGame ? (
                 <div className="col-span-2 text-center text-muted-foreground">Waiting for opponent...</div>
              ) : (
                <div className="col-span-2 text-center text-muted-foreground">Ready to play vs Bot</div>
              )}
            </div>
             <div className="ml-2">
              <ThemeSelector />
            </div>
          </div>
        </div>
      </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <ThemeProvider>
        <GamePageContent />
      </ThemeProvider>
    </Suspense>
  );
}
