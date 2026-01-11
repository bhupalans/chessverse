'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChessBoardState, Piece, Square } from '@/lib/types';
import { initialBoard, getValidMoves } from '@/lib/chess-logic';
import { ChessPieceComponent } from '@/components/icons/chess-pieces';
import { useToast } from '@/hooks/use-toast';

export function Chessboard({ gameId }: { gameId: string }) {
  const [board, setBoard] = useState<ChessBoardState>(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const { toast } = useToast();

  const handleSquareClick = (row: number, col: number) => {
    const clickedPiece = board[row][col];

    if (selectedPiece) {
      const isMoveValid = validMoves.some(
        (move) => move.row === row && move.col === col
      );
      if (isMoveValid) {
        movePiece(selectedPiece, { row, col });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Move',
          description: 'You cannot move the piece to that square.',
        });
        setSelectedPiece(null);
        setValidMoves([]);
      }
    } else if (clickedPiece) {
      // For demo purposes, only white pieces can be moved
      if (clickedPiece.color === 'w') {
        setSelectedPiece(clickedPiece);
        setValidMoves(getValidMoves(clickedPiece, board));
      } else {
        toast({
          title: 'Not Your Turn',
          description: 'It is currently white`s turn to move.',
        });
      }
    }
  };

  const movePiece = (piece: Piece, to: Square) => {
    const newBoard = board.map((r) => [...r]);
    if (piece) {
      const from = piece.square;
      newBoard[from.row][from.col] = null;
      newBoard[to.row][to.col] = { ...piece, square: to };
      setBoard(newBoard);
    }
    setSelectedPiece(null);
    setValidMoves([]);
  };

  return (
    <div className="grid aspect-square w-full max-w-[calc(100vh-10rem)] grid-cols-8 grid-rows-8 rounded-lg overflow-hidden shadow-2xl">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isLightSquare = (rowIndex + colIndex) % 2 !== 0;
          const isSelected =
            selectedPiece?.square.row === rowIndex &&
            selectedPiece?.square.col === colIndex;
          const isPossibleMove = validMoves.some(
            (move) => move.row === rowIndex && move.col === colIndex
          );

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex items-center justify-center',
                isLightSquare ? 'bg-secondary' : 'bg-primary/20'
              )}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              <div
                className={cn(
                  'relative flex h-full w-full cursor-pointer items-center justify-center transition-colors',
                  isSelected && 'bg-accent/50'
                )}
              >
                {piece && <ChessPieceComponent type={piece.type} color={piece.color} />}
                {isPossibleMove && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1/3 w-1/3 rounded-full bg-accent/50"></div>
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
