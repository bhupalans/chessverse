
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
  
  const isBotGame = useMemo(() => firestoreGame?.isBotGame || firestoreGame?.player2Id === 'BOT', [firestoreGame]);

  const player1DocRef = useMemoFirebase(() => {
    if (!firestore || !firestoreGame?.player1Id) return null;
    return doc(firestore, 'users', firestoreGame.player1Id);
  }, [firestore, firestoreGame?.player1Id]);
  
  const player2DocRef = useMemoFirebase(() => {
    if (!firestore || !firestoreGame?.player2Id || isBotGame) return null;
    return doc(firestore, 'users', firestoreGame.player2Id);
  }, [firestore, firestoreGame?.player2Id, isBotGame]);

  const { data: player1Profile, isLoading: isP1Loading } = useDoc<UserType>(player1DocRef);
  const { data: player2Profile, isLoading: isP2Loading } = useDoc<UserType>(player2DocRef);

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

  const [gameOverState, setGameOverState] = useState<{ winner: string, reason: string } | null>(null);
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
    if (finalGameOver || !liveGameState?.clocks || !firestoreGame) {
        if(firestoreGame?.timeControl && !liveGameState?.clocks) {
            setDisplayClocks({ white: firestoreGame.timeControl.initial / 1000, black: firestoreGame.timeControl.initial / 1000 });
        }
        else if (liveGameState?.clocks) {
            setDisplayClocks({ white: liveGameState.clocks.white, black: liveGameState.clocks.black });
        }
        return;
    }

    const interval = setInterval(() => {
        const { clocks } = liveGameState;
        if (!clocks || !firestoreGame.turn || !clocks.lastTick) return;

        const elapsed = (Date.now() - clocks.lastTick) / 1000;
        let newWhite = clocks.white;
        let newBlack = clocks.black;

        if (clocks.running === 'w') {
            newWhite = Math.max(0, clocks.white - elapsed);
        }
        
        if (clocks.running === 'b') {
            newBlack = Math.max(0, clocks.black - elapsed);
        }
        
        setDisplayClocks({ white: newWhite, black: newBlack });

    }, 250);

    return () => clearInterval(interval);
  }, [liveGameState, finalGameOver, firestoreGame]);

  const myColor = useMemo<'w' | 'b' | null>(() => {
    if (!user || !firestoreGame) return null;
    if (firestoreGame.player1Id === user.uid) {
      return firestoreGame.player1Color;
    }
    if (firestoreGame.player2Id === user.uid) {
      return firestoreGame.player2Color;
    }
    return null; // Is a spectator
  }, [user, firestoreGame]);

  const myTurn = useMemo(() => {
    if (!myColor || !firestoreGame) return false;
    return firestoreGame.turn === myColor;
  }, [myColor, firestoreGame]);
  
  const { whitePlayer, blackPlayer, arePlayersLoading } = useMemo(() => {
    if (isFirestoreGameLoading || !firestoreGame || isP1Loading) {
      return { whitePlayer: null, blackPlayer: null, arePlayersLoading: true };
    }
    
    // Handle bot game logic
    if (isBotGame) {
      if (firestoreGame.player1Color === 'b') {
        return { whitePlayer: firestoreGame.player2 as UserType, blackPlayer: player1Profile, arePlayersLoading: !player1Profile };
      }
      return { whitePlayer: player1Profile, blackPlayer: firestoreGame.player2 as UserType, arePlayersLoading: !player1Profile };
    }
    
    // Standard 2-player game logic
    if (isP2Loading) {
      return { whitePlayer: null, blackPlayer: null, arePlayersLoading: true };
    }

    const p1 = player1Profile;
    const p2 = player2Profile;

    if (!p1 || !p2) {
      return { whitePlayer: null, blackPlayer: null, arePlayersLoading: true };
    }

    if (firestoreGame.player1Color === 'b') {
      return { whitePlayer: p2, blackPlayer: p1, arePlayersLoading: false };
    }
    return { whitePlayer: p1, blackPlayer: p2, arePlayersLoading: false };
  }, [firestoreGame, isFirestoreGameLoading, player1Profile, player2Profile, isP1Loading, isP2Loading, isBotGame]);

  const handleGameOver = useCallback((reason: string, winnerId?: 'w' | 'b' | 'd') => {
      playSound('game-end');
      
      let winnerName = 'draw';
      if (winnerId !== 'd' && whitePlayer && blackPlayer) {
          winnerName = winnerId === 'w' ? whitePlayer.username : blackPlayer.username;
      }
      
      if (!gameOverState) {
        setGameOverState({ winner: winnerName, reason });
      }
  }, [playSound, whitePlayer, blackPlayer, gameOverState]);
  
  useEffect(() => {
    if (firestoreGame?.status === 'completed' && !gameOverState) {
      handleGameOver(firestoreGame.reason || 'Game Over', firestoreGame.winnerId);
    }
  }, [firestoreGame, gameOverState, handleGameOver]);

  const makeMove = async (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
      if (!myTurn) {
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
  
  const currentTurn = firestoreGame?.turn;
  const drawOfferedToMe = !firestoreGame?.isBotGame && firestoreGame?.drawOffer === opponentId;

  const topPlayerTime = displayClocks ? (topPlayer === whitePlayer ? displayClocks.white : displayClocks.black) : null;
  const bottomPlayerTime = displayClocks ? (bottomPlayer === whitePlayer ? displayClocks.white : displayClocks.black) : null;
  
  const topPlayerIsTurn = !finalGameOver && (
    (topPlayer === whitePlayer && currentTurn === 'w') || 
    (topPlayer === blackPlayer && currentTurn === 'b')
  );
  
  const bottomPlayerIsTurn = !finalGameOver && myTurn;


  if (isFirestoreGameLoading || arePlayersLoading || !gameFen) {
    return <div className="flex h-full items-center justify-center">Loading game...</div>;
  }
   if (!liveGameState || !firestoreGame) {
    return <div className="flex h-full items-center justify-center">Game not found.</div>;
  }

  const winnerColor = firestoreGame.winnerId;

  return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">
           {topPlayer && (
            <PlayerCard 
              player={topPlayer}
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
                    turn={firestoreGame.turn}
                    isEngineLoading={false}
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
             {!finalGameOver && firestoreGame?.status === 'waiting' && (
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
                player={bottomPlayer}
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
              {myColor ? (
                <>
                  <Button variant="outline" onClick={handleResign} disabled={finalGameOver}>
                    <Flag className="mr-2 h-4 w-4" /> Resign
                  </Button>
                  <Button variant="outline" onClick={handleOfferDraw} disabled={finalGameOver || firestoreGame?.isBotGame}>
                    <Swords className="mr-2 h-4 w-4" /> 
                    Offer Draw
                  </Button>
                </>
              ) : (
                <div className="col-span-2 text-center text-muted-foreground">Spectator Mode</div>
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
