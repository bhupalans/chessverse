'use client';
import { useState, useMemo, useContext } from 'react';
import { cn } from '@/lib/utils';
import { type Chess, type Square as ChessJsSquare, type Color, Chess } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { ThemeContext } from '@/context/theme-context';

export function Chessboard({
  game,
  fen,
  onMove,
  isBotGame,
  gameStarted,
  isEngineLoading,
  playerColor
}: {
  game: Chess;
  fen: string;
  onMove: (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => boolean;
  isBotGame: boolean;
  gameStarted: boolean;
  isEngineLoading: boolean;
  playerColor: Color;
}) {
  const { theme, pieceSet } = useContext(ThemeContext);
  const PieceComponent = pieceSet.component;
  const [selectedSquare, setSelectedSquare] = useState<ChessJsSquare | null>(null);
  const { toast } = useToast();

  const board = useMemo(() => {
    const tempGame = new Chess(fen);
    return tempGame.board();
  }, [fen]);
  
  const handleSquareClick = (row: number, col: number) => {
    if (!gameStarted) {
      toast({
        title: 'Game Not Started',
        description: 'Click "Start Game" to begin the match.',
      });
      return;
    }
    
    let square: ChessJsSquare;
    if (playerColor === 'w') {
      square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row) as ChessJsSquare;
    } else {
      square = String.fromCharCode('a'.charCodeAt(0) + (7 - col)) + (row + 1) as ChessJsSquare;
    }


    if (game.isGameOver()) {
        toast({ title: 'Game Over' });
        return;
    }
    
    if (isEngineLoading) {
      toast({ title: 'Please wait', description: 'Chess engine is loading...' });
      return;
    }

    if(isBotGame && game.turn() !== playerColor){
        return;
    }

    if (selectedSquare) {
       const moveSuccessful = onMove({
        from: selectedSquare,
        to: square,
        promotion: 'q', // Always promote to queen for simplicity
      });
      // Deselect square whether move was successful or not
      setSelectedSquare(null);
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn() && piece.color === playerColor) {
        setSelectedSquare(square);
      }
    }
  };
  
  const validMovesForSelectedPiece = useMemo(() => {
    if (!selectedSquare) return new Set();
    const moves = game.moves({ square: selectedSquare, verbose: true });
    return new Set(moves.map(move => move.to));
  }, [selectedSquare, game, fen]);

  const boardToRender = playerColor === 'w' ? board : board.slice().reverse().map(row => row.slice().reverse());


  return (
    <div className={cn(
      "grid aspect-square w-full max-w-[calc(100vh-10rem)] grid-cols-8 grid-rows-8 rounded-lg overflow-hidden shadow-2xl",
      !gameStarted && "opacity-50 cursor-not-allowed"
    )}>
      {boardToRender.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          let squareName: ChessJsSquare;
           if (playerColor === 'w') {
            squareName = String.fromCharCode('a'.charCodeAt(0) + colIndex) + (8 - rowIndex) as ChessJsSquare;
          } else {
            squareName = String.fromCharCode('a'.charCodeAt(0) + (7-colIndex)) + (rowIndex + 1) as ChessJsSquare;
          }
          
          const pieceOnSquare = game.get(squareName);

          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;
          const isSelected = selectedSquare === squareName;
          const isPossibleMove = validMovesForSelectedPiece.has(squareName);

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex items-center justify-center',
                isLightSquare ? theme.lightSquare : theme.darkSquare
              )}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              <div
                className={cn(
                  'relative flex h-full w-full items-center justify-center transition-colors',
                  gameStarted && 'cursor-pointer',
                  isSelected && 'bg-yellow-500/50'
                )}
              >
                {pieceOnSquare && <PieceComponent type={pieceOnSquare.type} color={pieceOnSquare.color} />}
                {isPossibleMove && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1/3 w-1/3 rounded-full bg-yellow-500/50"></div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
