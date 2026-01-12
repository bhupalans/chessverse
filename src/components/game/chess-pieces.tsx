
'use client';
import { useState, useMemo } from 'react';
import { Chess, type Square as ChessJsSquare, type Color, type Piece } from 'chess.js';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Crown, Flag } from 'lucide-react';

const pieceSet = 'alpha';

export function ChessPieces({
  fen,
  onMove,
  playerColor,
  isGameOver,
  turn,
  gameStarted,
  isEngineLoading,
  winner,
  kingPositions,
  lastMove,
}: {
  fen: string;
  onMove: (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => boolean;
  playerColor: Color;
  isGameOver: boolean;
  turn: Color;
  gameStarted: boolean;
  isEngineLoading: boolean;
  winner: 'w' | 'b' | 'd' | null;
  kingPositions: { w: ChessJsSquare, b: ChessJsSquare } | null;
  lastMove: { from: ChessJsSquare, to: ChessJsSquare } | null;
}) {
  const { toast } = useToast();
  const [selectedSquare, setSelectedSquare] = useState<ChessJsSquare | null>(null);

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch(e) {
      console.error("Invalid FEN in ChessPieces", fen, e);
      return new Chess(); // Return a default board on error
    }
  }, [fen]);

  const board = useMemo(() => {
    const b = game.board();
    return playerColor === 'w' ? b : b.slice().reverse().map(row => row.slice().reverse());
  }, [game, playerColor]);

  const validMovesForSelectedPiece = useMemo(() => {
    if (!selectedSquare) return new Set();
    const moves = game.moves({ square: selectedSquare, verbose: true });
    return new Set(moves.map(move => move.to));
  }, [selectedSquare, game]);

  const getSquareFromEvent = (e: React.MouseEvent<HTMLDivElement>): ChessJsSquare => {
    const rect = e.currentTarget.getBoundingClientRect();
    const squareSize = rect.width / 8;
    const col = Math.floor((e.clientX - rect.left) / squareSize);
    const row = Math.floor((e.clientY - rect.top) / squareSize);

    if (playerColor === 'w') {
      return `${String.fromCharCode(97 + col)}${8 - row}` as ChessJsSquare;
    }
    return `${String.fromCharCode(97 + (7 - col))}${row + 1}` as ChessJsSquare;
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameStarted) {
      toast({
        title: 'Game Not Started',
        description: 'The game has not started yet.',
      });
      return;
    }
    if (isGameOver) {
      toast({ title: 'Game Over' });
      return;
    }
    if (isEngineLoading) {
      toast({ title: 'Please wait', description: 'Chess engine is loading...' });
      return;
    }
    if (turn !== playerColor) {
      toast({ title: "Not your turn", description: "Please wait for your opponent to move." });
      return;
    }

    const square = getSquareFromEvent(e);

    if (selectedSquare) {
      const isMoveSuccessful = onMove({
        from: selectedSquare,
        to: square,
        promotion: 'q', // Always promote to queen for simplicity
      });
      
      // Only clear selection if the move was successful or it was an attempt to move
      // If the click was on an empty square or opponent piece, the parent (onMove) handles it
      // if (!isMoveSuccessful) {
        // Maybe provide feedback about invalid move
      // }
      setSelectedSquare(null);

    } else {
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
      } else if (piece) {
        toast({ title: "Not your piece", description: "You can't move your opponent's pieces." });
      }
    }
  };

  const getPieceCode = (piece: Piece) => `${piece.color}${piece.type.toUpperCase()}`;

  const getSquareCoords = (square: ChessJsSquare) => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, ...
    const rank = parseInt(square.charAt(1), 10);
    
    if (playerColor === 'w') {
        return { row: 8 - rank, col: file };
    } else {
        return { row: rank - 1, col: 7 - file };
    }
  };

  return (
    <div 
      className={cn(
        "absolute inset-0", 
        !gameStarted && "opacity-70",
        (gameStarted && !isGameOver && turn === playerColor) && 'cursor-pointer'
      )}
      onClick={handleBoardClick}
    >
      <div className="relative w-full h-full">
        {/* Render highlight squares */}
        {selectedSquare && <div className="absolute w-[12.5%] h-[12.5%] bg-yellow-500/50" style={{ top: `${getSquareCoords(selectedSquare).row * 12.5}%`, left: `${getSquareCoords(selectedSquare).col * 12.5}%` }} />}
        {lastMove?.from && <div className="absolute w-[12.5%] h-[12.5%] bg-yellow-400/40" style={{ top: `${getSquareCoords(lastMove.from).row * 12.5}%`, left: `${getSquareCoords(lastMove.from).col * 12.5}%` }} />}
        {lastMove?.to && <div className="absolute w-[12.5%] h-[12.5%] bg-yellow-400/40" style={{ top: `${getSquareCoords(lastMove.to).row * 12.5}%`, left: `${getSquareCoords(lastMove.to).col * 12.5}%` }} />}
        
        {Array.from(validMovesForSelectedPiece).map((move) => {
            const { row, col } = getSquareCoords(move as ChessJsSquare);
            return <div key={move} className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center" style={{ top: `${row * 12.5}%`, left: `${col * 12.5}%` }}>
                <div className="h-1/3 w-1/3 rounded-full bg-yellow-500/50"></div>
            </div>
        })}
        
        {/* Render pieces */}
        {board.flat().filter(p => p !== null).map((piece) => {
          if (!piece) return null;
          const { row, col } = getSquareCoords(piece.square);
          
          const isWinningKingSquare = isGameOver && winner && winner !== 'd' && kingPositions && piece.type === 'k' && piece.color === winner;
          const isLosingKingSquare = isGameOver && winner && winner !== 'd' && kingPositions && piece.type === 'k' && piece.color !== winner;

          return (
            <div key={piece.square} className="absolute w-[12.5%] h-[12.5%]" style={{ top: `${row * 12.5}%`, left: `${col * 12.5}%` }}>
              <Image
                src={`/pieces/${pieceSet}/${getPieceCode(piece)}.svg`}
                alt={`${piece.color} ${piece.type}`}
                fill
                className="pointer-events-none"
                unoptimized
              />
              {isWinningKingSquare && (
                <Crown className="absolute w-6 h-6 text-green-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ top: '-4px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
              {isLosingKingSquare && (
                <Flag className="absolute w-5 h-5 text-red-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
