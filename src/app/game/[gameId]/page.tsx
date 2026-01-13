
'use client';

import { ThemeProvider } from '@/context/theme-context';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { Chess, type Square as ChessJsSquare, type Color } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { PlayerCard } from '@/components/game/player-card';
import { Button } from '@/components/ui/button';
import { Flag, Swords, Crown, Handshake } from 'lucide-react';
import { ThemeSelector } from '@/components/game/theme-selector';
import { useUser, useRealtimeDB, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User as UserType, Game as GameType, LastMove, LiveGame } from '@/lib/types';
import { Chessboard } from '@/components/game/chessboard';
import { ChessPieces } from '@/components/game/chess-pieces';
import { ref, onValue } from 'firebase/database';
import { doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

function GamePageContent() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const realtimeDB = useRealtimeDB();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [liveGameState, setLiveGameState] = useState<LiveGame | null>(null);
  const [displayClocks, setDisplayClocks] = useState<{ white: number; black: number } | null>(null);
  const [previousFen, setPreviousFen] = useState<string | null>(null);
  
  const gameDocRef = useMemoFirebase(() => {
    if (!gameId || !firestore) return null;
    return doc(firestore, 'games', gameId);
  }, [firestore, gameId]);

  const { data: firestoreGame, isLoading: isFirestoreGameLoading } = useDoc<GameType>(gameDocRef);
  
  const gameFen = liveGameState?.fen;
  
  const game = useMemo(() => {
    if (!gameFen) return new Chess();
    try {
      return new Chess(gameFen);
    } catch (e) {
      console.error("Invalid FEN string:", gameFen);
      return new Chess();
    }
  }, [gameFen]);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ winner: string, reason: string } | null>(null);
  const [winnerColor, setWinnerColor] = useState<'w' | 'b' | 'd' | null>(null);
  const [kingPositions, setKingPositions] = useState<{ w: ChessJsSquare, b: ChessJsSquare } | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  
  const { toast } = useToast();
  
  const finalGameOver = useMemo(() => !!gameOverState || game.isGameOver() || firestoreGame?.status === 'completed', [gameOverState, game, firestoreGame]);
  
  const playSound = useCallback((sound: 'move' | 'capture' | 'check' | 'game-end' | 'illegal' | 'castle' | 'promotion') => {
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
    if (!realtimeDB || !gameId) return;

    const gameRef = ref(realtimeDB, `liveGames/${gameId}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLiveGameState(data);
      } else if (!isFirestoreGameLoading && firestoreGame?.status !== 'inprogress') {
         setLiveGameState({ fen: new Chess().fen(), turn: 'w'});
         setDisplayClocks(null);
      }
    }, (error) => {
      console.error("Realtime DB Error:", error);
      toast({
          variant: 'destructive',
          title: 'Error loading game',
          description: "There was a problem connecting to the database."
      });
    });

    return () => unsubscribe();
  }, [realtimeDB, gameId, toast, firestoreGame, isFirestoreGameLoading]);

  // Sound playing effect
  useEffect(() => {
    if (liveGameState?.fen && liveGameState.fen !== previousFen) {
      if (previousFen !== null) { // Don't play sound on initial load
          const soundToPlay = liveGameState.lastMove?.sound || 'move';
          playSound(soundToPlay);
      }
      setPreviousFen(liveGameState.fen);
      if(liveGameState.lastMove) {
        setLastMove(liveGameState.lastMove);
      }
    }
  }, [liveGameState, previousFen, playSound]);


  useEffect(() => {
    if (finalGameOver || !liveGameState?.clocks) {
        if (liveGameState?.clocks) {
            setDisplayClocks({ white: liveGameState.clocks.white, black: liveGameState.clocks.black });
        }
        return;
    }

    const interval = setInterval(() => {
        const { clocks } = liveGameState;
        if (!clocks || !clocks.running || !clocks.lastTick) return;

        const elapsed = (Date.now() - clocks.lastTick) / 1000;
        let newWhite = clocks.white;
        let newBlack = clocks.black;

        if (clocks.running === 'w') {
            newWhite = Math.max(0, clocks.white - elapsed);
        } else {
             newWhite = clocks.white
        }
        
        if (clocks.running === 'b') {
            newBlack = Math.max(0, clocks.black - elapsed);
        } else {
            newBlack = clocks.black
        }
        
        setDisplayClocks({ white: newWhite, black: newBlack });

    }, 250);

    return () => clearInterval(interval);
  }, [liveGameState, finalGameOver]);

  const myColor = useMemo<'w' | 'b' | null>(() => {
    if (!user || !firestoreGame) return null; // Spectator by default
    if (firestoreGame.player1Id === user.uid) {
      return firestoreGame.player1Color || 'w';
    }
    if (firestoreGame.player2Id === user.uid) {
      return (firestoreGame.player1Color || 'w') === 'w' ? 'b' : 'w';
    }
    return null; // Is a spectator
  }, [user, firestoreGame]);
  
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
    if (isFirestoreGameLoading || !firestoreGame) {
      return { whitePlayer: null, blackPlayer: null, isLoading: true };
    }
    const p1 = firestoreGame.player1;
    const p2 = firestoreGame.player2;

    if (firestoreGame.player1Color === 'b') {
        return { whitePlayer: p2, blackPlayer: p1, isLoading: false };
    }
    return { whitePlayer: p1, blackPlayer: p2, isLoading: false };
  }, [firestoreGame, isFirestoreGameLoading]);

  const handleGameOver = useCallback((reason: string, winner?: 'w' | 'b' | 'd') => {
      playSound('game-end');
      const winnerData = winner || (game.turn() === 'b' ? 'w' : 'b');
      setWinnerColor(winnerData);
      
      findKingPositions(game);

      let winnerName = 'draw';
      if (winnerData !== 'd') {
          if (whitePlayer && blackPlayer) {
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
  }, [game, playSound, findKingPositions, whitePlayer, blackPlayer, gameOverState]);
  
  useEffect(() => {
    if (firestoreGame?.status === 'completed' && !gameOverState) {
      handleGameOver(firestoreGame.reason || 'Game Over', firestoreGame.winnerId);
    }
  }, [firestoreGame, gameOverState, handleGameOver]);

  useEffect(() => {
    if (!gameStarted && firestoreGame?.status === 'inprogress') {
      setGameStarted(true);
    }
  }, [firestoreGame, gameStarted]);

  const makeMove = async (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
      if (!myColor || myColor !== game.turn()) {
        toast({
          variant: 'destructive',
          title: "Not your turn",
          description: "Please wait for your opponent to move.",
        });
        return false;
      }
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
  };
  
  const handleGameAction = async (action: 'resign' | 'draw' | 'abort' | 'decline-draw') => {
    if (finalGameOver || !gameId) return;

    try {
      const functions = getFunctions();
      const handleAction = httpsCallable(functions, 'handleGameAction');
      await handleAction({ gameId, action });

      if (action === 'resign') {
        toast({ title: 'You have resigned.' });
      } else if (action === 'draw') {
        const opponentId = firestoreGame?.player1Id === user?.uid ? firestoreGame?.player2Id : firestoreGame?.player1Id;
        const drawOfferedByOpponent = firestoreGame?.drawOffer === opponentId;
        if(drawOfferedByOpponent) {
             toast({ title: 'Draw accepted!' });
        } else {
             toast({ title: 'Draw offer sent.' });
        }
      }
    } catch (error: any) {
      console.error(`Error with action ${action}:`, error);
      toast({
        variant: 'destructive',
        title: `Action Failed: ${action}`,
        description: error.message || 'Could not perform the requested action.',
      });
    }
  };


  const handleResign = () => {
       handleGameAction('resign');
  };

  const handleOfferDraw = () => {
     if(firestoreGame?.isBotGame) {
        toast({ title: 'Draw Offer', description: 'Cannot offer draw to bot.' });
     } else {
        handleGameAction('draw');
     }
  };

  const handleDrawResponse = (accept: boolean) => {
    if (accept) {
      handleGameAction('draw');
    } else {
       handleGameAction('decline-draw');
    }
  };

  const opponentId = firestoreGame?.player1Id === user?.uid ? firestoreGame?.player2Id : firestoreGame?.player1Id;

  const boardOrientation = myColor === 'b' ? 'black' : 'white';

  const topPlayer = boardOrientation === 'white' ? blackPlayer : whitePlayer;
  const bottomPlayer = boardOrientation === 'white' ? whitePlayer : blackPlayer;
  
  const currentTurn = game.turn();
  const drawOfferedToMe = !firestoreGame?.isBotGame && firestoreGame?.drawOffer === opponentId;

  const topPlayerTime = displayClocks ? (topPlayer === whitePlayer ? displayClocks.white : displayClocks.black) : null;
  const bottomPlayerTime = displayClocks ? (bottomPlayer === whitePlayer ? displayClocks.white : displayClocks.black) : null;
  
  const topPlayerIsTurn = gameStarted && !finalGameOver && (
    (topPlayer === whitePlayer && currentTurn === 'w') || 
    (topPlayer === blackPlayer && currentTurn === 'b')
  );
  
  const bottomPlayerIsTurn = gameStarted && !finalGameOver && (
    (bottomPlayer === whitePlayer && currentTurn === 'w') || 
    (bottomPlayer === blackPlayer && currentTurn === 'b')
  );


  if (isFirestoreGameLoading || arePlayersLoading || !gameFen) {
    return <div className="flex h-full items-center justify-center">Loading game...</div>;
  }
   if (!liveGameState) {
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
              isBot={topPlayer.id === 'BOT'}
              isTurn={topPlayerIsTurn} 
              color={topPlayer === whitePlayer ? 'White' : 'Black'}
              time={topPlayerTime}
              firestoreGame={firestoreGame}
            />
          )}
          <div className="relative">
            <Chessboard orientation={boardOrientation}>
                <ChessPieces
                    fen={gameFen}
                    onMove={makeMove}
                    playerColor={myColor}
                    isGameOver={finalGameOver}
                    turn={currentTurn}
                    gameStarted={gameStarted}
                    isEngineLoading={false}
                    winner={winnerColor}
                    kingPositions={kingPositions}
                    lastMove={lastMove}
                    orientation={boardOrientation}
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
             {!gameStarted && firestoreGame?.status === 'waiting' && (
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
                isBot={bottomPlayer.id === 'BOT'}
                isTurn={bottomPlayerIsTurn} 
                color={bottomPlayer === whitePlayer ? 'White' : 'Black'}
                drawOffered={drawOfferedToMe}
                onDrawResponse={handleDrawResponse}
                time={bottomPlayerTime}
                firestoreGame={firestoreGame}
              />
          )}
          <div className="p-4 flex items-center justify-between bg-card rounded-lg">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {gameStarted && myColor ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={finalGameOver}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={finalGameOver || firestoreGame?.isBotGame}>
                    <Swords className="mr-2 h-4 w-4" /> 
                    Offer Draw
                  </Button>
                </>
              ) : gameStarted && !myColor ? (
                <div className="col-span-2 text-center text-muted-foreground">Spectator Mode</div>
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

    