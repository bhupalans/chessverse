'use client';
import { useState, useMemo, useContext } from 'react';
import { cn } from '@/lib/utils';
import type { ChessBoardState, Piece, Square } from '@/lib/types';
import { Chess, type Piece as ChessJsPiece, type Square as ChessJsSquare } from 'chess.js';
import { ChessPieceComponent } from '@/components/icons/chess-pieces';
import { useToast } from '@/hooks/use-toast';
import { ThemeContext } from '@/context/theme-context';

const initialBoard: ChessBoardState = [
  // This can be simplified as chess.js will manage the board state
  ...Array(8).fill(Array(8).fill(null))
];

export function Chessboard({ gameId }: { gameId: string }) {
  const { theme } = useContext(ThemeContext);
  // chess.js instance will be the source of truth for game logic
  const game = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<ChessJsSquare | null>(null);
  const { toast } = useToast();

  const getPieceFromChessJs = (piece: ChessJsPiece | null): Piece | null => {
    if (!piece) return null;
    return {
      type: piece.type,
      color: piece.color,
      square: { 
        row: 8 - parseInt(piece.square.charAt(1)), 
        col: piece.square.charCodeAt(0) - 'a'.charCodeAt(0) 
      }
    };
  };

  const handleSquareClick = (row: number, col: number) => {
    const square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);

    if (selectedSquare) {
      try {
        const move = game.move({
          from: selectedSquare,
          to: square as ChessJsSquare,
          promotion: 'q' // Always promote to queen for simplicity
        });

        if (move) {
          // In a real app, this would write to Firestore
          console.log('Move made:', move.san);
          console.log('New FEN:', game.fen());

          setBoard(game.board());
          // TODO: Save move to Firestore
          // const gameRef = doc(db, 'games', gameId);
          // await updateDoc(gameRef, { fen: game.fen(), turn: game.turn(), lastMove: move.san });
          // const movesRef = collection(gameRef, 'moves');
          // await addDoc(movesRef, { san: move.san, fen: game.fen(), timestamp: serverTimestamp() });

        } else {
           toast({
            variant: 'destructive',
            title: 'Invalid Move',
            description: 'You cannot move the piece to that square.',
          });
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: e.message || 'The move is not allowed.',
        });
      } finally {
        setSelectedSquare(null);
      }
    } else {
      const piece = game.get(square as ChessJsSquare);
      // For demo, let's say it's always white's turn
      if (piece && piece.color === 'w' && game.turn() === 'w') {
        setSelectedSquare(square as ChessJsSquare);
      } else if (game.turn() !== 'w') {
        toast({
          title: 'Not Your Turn',
          description: 'It is currently black`s turn to move.',
        });
      }
    }
  };
  
  const validMovesForSelectedPiece = useMemo(() => {
    if (!selectedSquare) return new Set();
    const moves = game.moves({ square: selectedSquare, verbose: true });
    return new Set(moves.map(move => move.to));
  }, [selectedSquare, game]);


  return (
    <div className="grid aspect-square w-full max-w-[calc(100vh-10rem)] grid-cols-8 grid-rows-8 rounded-lg overflow-hidden shadow-2xl">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const square = String.fromCharCode('a'.charCodeAt(0) + colIndex) + (8 - rowIndex);
          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;
          const isSelected = selectedSquare === square;
          const isPossibleMove = validMovesForSelectedPiece.has(square);

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
                  'relative flex h-full w-full cursor-pointer items-center justify-center transition-colors',
                  isSelected && 'bg-yellow-500/50'
                )}
              >
                {piece && <ChessPieceComponent type={piece.type} color={piece.color} />}
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
