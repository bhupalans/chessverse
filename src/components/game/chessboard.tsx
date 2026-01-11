'use client';
import { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Chess, type Piece as ChessJsPiece, type Square as ChessJsSquare } from 'chess.js';
import { useToast } from '@/hooks/use-toast';
import { ThemeContext } from '@/context/theme-context';

declare global {
  interface Window {
    stockfish: any;
  }
}

export function Chessboard({ gameId, isBotGame }: { gameId: string, isBotGame: boolean }) {
  const { theme, pieceSet } = useContext(ThemeContext);
  const PieceComponent = pieceSet.component;
  const game = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<ChessJsSquare | null>(null);
  const { toast } = useToast();
  const engine = useRef<any>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(isBotGame);

  const engineGo = useCallback(() => {
    if (engine.current) {
      engine.current.postMessage('go depth 15');
    }
  }, []);

  useEffect(() => {
    if (isBotGame) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/stockfish@15.0.0/src/stockfish.js';
      script.async = true;
      script.onload = () => {
        const sf = window.stockfish();
        engine.current = sf;
        sf.addEventListener('message', (e: any) => {
          if (e.data?.startsWith('bestmove')) {
            const bestMove = e.data.split(' ')[1];
            if (bestMove) {
              game.move(bestMove, { sloppy: true });
              setBoard(game.board());
            }
          }
        });
        sf.postMessage('uci');
        setIsEngineLoading(false);
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [isBotGame, game, engineGo]);

  const makeMove = (move: { from: ChessJsSquare, to: ChessJsSquare, promotion?: string }) => {
    try {
      const result = game.move(move);
      if (result) {
        setBoard(game.board());
        if (isBotGame && !game.isGameOver() && engine.current) {
          engine.current.postMessage(`position fen ${game.fen()}`);
          setTimeout(engineGo, 200);
        }
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
  };

  const handleSquareClick = (row: number, col: number) => {
    const square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row) as ChessJsSquare;

    if (game.isGameOver()) {
        toast({ title: 'Game Over' });
        return;
    }
    
    if (isEngineLoading) {
      toast({ title: 'Please wait', description: 'Chess engine is loading...' });
      return;
    }

    if(isBotGame && game.turn() === 'b'){
        return;
    }

    if (selectedSquare) {
       makeMove({
        from: selectedSquare,
        to: square,
        promotion: 'q', // Always promote to queen for simplicity
      });
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
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
                {piece && <PieceComponent type={piece.type} color={piece.color} />}
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
