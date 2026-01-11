import type { ChessBoardState, Piece, Square } from './types';

export const initialBoard: ChessBoardState = [
  // Black pieces
  [
    { type: 'r', color: 'b', square: { row: 0, col: 0 } },
    { type: 'n', color: 'b', square: { row: 0, col: 1 } },
    { type: 'b', color: 'b', square: { row: 0, col: 2 } },
    { type: 'q', color: 'b', square: { row: 0, col: 3 } },
    { type: 'k', color: 'b', square: { row: 0, col: 4 } },
    { type: 'b', color: 'b', square: { row: 0, col: 5 } },
    { type: 'n', color: 'b', square: { row: 0, col: 6 } },
    { type: 'r', color: 'b', square: { row: 0, col: 7 } },
  ],
  Array(8)
    .fill(null)
    .map((_, col) => ({ type: 'p', color: 'b', square: { row: 1, col } })),
  // Empty squares
  ...Array(4).fill(Array(8).fill(null)),
  // White pieces
  Array(8)
    .fill(null)
    .map((_, col) => ({ type: 'p', color: 'w', square: { row: 6, col } })),
  [
    { type: 'r', color: 'w', square: { row: 7, col: 0 } },
    { type: 'n', color: 'w', square: { row: 7, col: 1 } },
    { type: 'b', color: 'w', square: { row: 7, col: 2 } },
    { type: 'q', color: 'w', square: { row: 7, col: 3 } },
    { type: 'k', color: 'w', square: { row: 7, col: 4 } },
    { type: 'b', color: 'w', square: { row: 7, col: 5 } },
    { type: 'n', color: 'w', square: { row: 7, col: 6 } },
    { type: 'r', color: 'w', square: { row: 7, col: 7 } },
  ],
];

// This is a simplified move validation for demonstration purposes.
// A real implementation would use a library like chess.js.
export function getValidMoves(
  piece: Piece,
  board: ChessBoardState
): Square[] {
  const moves: Square[] = [];
  if (!piece) return moves;

  const { row, col } = piece.square;

  if (piece.type === 'p') {
    if (piece.color === 'w') {
      // Move forward
      if (row > 0 && !board[row - 1][col]) {
        moves.push({ row: row - 1, col });
      }
      // Initial two-square move
      if (row === 6 && !board[row - 1][col] && !board[row - 2][col]) {
        moves.push({ row: row - 2, col });
      }
    } else {
      // Black pawn
      if (row < 7 && !board[row + 1][col]) {
        moves.push({ row: row + 1, col });
      }
      if (row === 1 && !board[row + 1][col] && !board[row + 2][col]) {
        moves.push({ row: row + 2, col });
      }
    }
  }

  // Simplified knight moves
  if (piece.type === 'n') {
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for(const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if(newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const destinationPiece = board[newRow][newCol];
            if(!destinationPiece || destinationPiece.color !== piece.color) {
                moves.push({row: newRow, col: newCol});
            }
        }
    }
  }

  return moves;
}
