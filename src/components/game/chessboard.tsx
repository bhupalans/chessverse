'use client';
import { useState, useMemo, useContext } from 'react';
import { cn } from '@/lib/utils';
import { type Chess, type Square as ChessJsSquare, type Color } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { ThemeContext } from '@/context/theme-context';
import { Chess as ChessGame } from 'chess.js';

export function Chessboard({
  fen,
  onMove,
  gameStarted,
  isEngineLoading,
  playerColor,
  isGameOver,
  turn,
}: {
  fen: string;
  onMove: (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => boolean;
  gameStarted: boolean;
  isEngineLoading: boolean;
  playerColor: Color;
  isGameOver: boolean;
  turn: Color;
}) {
  const { theme, pieceSet } = useContext(ThemeContext);
  const PieceComponent = pieceSet.component;
  const [selectedSquare, setSelectedSquare] = useState<ChessJsSquare | null>(null);
  const { toast } = useToast();

  const game = useMemo(() => new ChessGame(fen), [fen]);
  const board = useMemo(() => game.board(), [game]);
  
  const handleSquareClick = (row: number, col: number) => {
    if (!gameStarted && !isGameOver) {
      toast({
        title: 'Game Not Started',
        description: 'The game will begin when both players are ready.',
      });
      return;
    }
    
    let square: ChessJsSquare;
    if (playerColor === 'w') {
      square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row) as ChessJsSquare;
    } else {
      square = String.fromCharCode('a'.charCodeAt(0) + (7 - col)) + (row + 1) as ChessJsSquare;
    }


    if (isGameOver) {
        toast({ title: 'Game Over' });
        return;
    }
    
    if (isEngineLoading) {
      toast({ title: 'Please wait', description: 'Chess engine is loading...' });
      return;
    }

    if(turn !== playerColor){
        toast({ title: "Not your turn", description: "Please wait for your opponent to move."});
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
      if (piece && piece.color === turn && piece.color === playerColor) {
        setSelectedSquare(square);
      } else if (piece && piece.color !== playerColor) {
        toast({ title: "Wait for your turn", description: "You can't move your opponent's pieces." });
      }
    }
  };
  
  const validMovesForSelectedPiece = useMemo(() => {
    if (!selectedSquare) return new Set();
    const moves = game.moves({ square: selectedSquare, verbose: true });
    return new Set(moves.map(move => move.to));
  }, [selectedSquare, game]);

  const boardToRender = playerColor === 'w' ? board : board.slice().reverse().map(row => row.slice().reverse());

  const ranks = playerColor === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const files = playerColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  return (
    <div className={cn(
      "grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] aspect-square w-full max-w-lg rounded-lg overflow-hidden shadow-2xl",
    )}>
      <div className="flex flex-col text-xs font-bold text-muted-foreground pr-1">
        {ranks.map((rank) => (
          <div key={rank} className="flex-1 flex items-center justify-center">{rank}</div>
        ))}
      </div>
      
      <div className={cn("grid grid-cols-8 grid-rows-8", (isGameOver || !gameStarted) && "opacity-50")}>
        {boardToRender.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            let squareName: ChessJsSquare;
            if (playerColor === 'w') {
              squareName = String.fromCharCode('a'.charCodeAt(0) + colIndex) + (8 - rowIndex) as ChessJsSquare;
            } else {
              squareName = String.fromCharCode('a'.charCodeAt(0) + (7-colIndex)) + (rowIndex + 1) as ChessJsSquare;
            }
            
            const pieceOnSquare = piece;

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
                    (gameStarted && !isGameOver) && 'cursor-pointer',
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

      <div />
      <div className="flex text-xs font-bold text-muted-foreground pt-1">
        {files.map((file) => (
          <div key={file} className="flex-1 flex items-center justify-center">{file}</div>
        ))}
      </div>
    </div>
  );
}
