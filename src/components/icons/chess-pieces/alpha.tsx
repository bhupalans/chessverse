import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#18181B", strokeWidth: 1.5 },
  b: { fill: "#18181B", stroke: "#E4E4E7", strokeWidth: 1.5 },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="m 22.5,33.5 c -2.21,0 -4,-1.79 -4,-4 0,-1.474 .804,-2.755 2,-3.465 V 19 h 4 v 7.035 c 1.196,.71 2,1.991 2,3.465 0,2.21 -1.79,4 -4,4 z" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="m 14,14 h 17 v 4 h -17 z M 14,34 v -16 h 17 v 16 z M 11,38 h 23 M 11,14 v -3 h 23 v 3" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="m 22,10 c 10.5,1 16.5,8 16,29 H 15.5 c 0,-11 2.5,-15.5 10.5,-20.5 0,2 1,4.5 2.5,4.5 2.5,0 2.5,-2.5 2.5,-4.5 0,-2 -0.5,-2.5 -1.5,-4 -0.5,-1 -1,-2.5 -3,-2.5 z" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="m 22.5,38 c -4,0 -7,-3 -7,-3 l 14,0 c 0,0 -3,3 -7,3 z m 0,-2 c 2,0 4,-2 4,-2 l -8,0 c 0,0 2,2 4,2 z M 18,12 l 3,3.5 L 18,23 l 5.5,0 3,-3.5 3,3.5 L 27,12 l -3,-3.5 z" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="m 12,12 3,22 15,0 3,-22 M 12,12 9,9 12,12 15,9 18,12 22.5,9 27,12 30,9 33,12 36,9 33,12 M 12,38 l 21,0" />
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M 22.5,38 22.5,38 22.5,38 M 22.5,38 C 15.5,38 12,35.5 12,34 C 12,32.5 13,31 16,30 L 16,28 C 13,27 12,24 12,22 C 12,19 14.5,14 22.5,14 C 30.5,14 34,19 34,22 C 34,24 33,27 30,28 L 30,30 C 33,31 34,32.5 34,34 C 34,35.5 30.5,38 22.5,38 z M 20.5,8 L 24.5,8 L 24.5,12 L 20.5,12 z M 20.5,10 L 24.5,10" />
  </svg>
);

export const AlphaChessPieces: PieceComponent = ({ type, color }: ChessPieceProps) => {
  switch (type) {
    case 'p': return <Pawns color={color} />;
    case 'r': return <Rooks color={color} />;
    case 'n': return <Knights color={color} />;
    case 'b': return <Bishops color={color} />;
    case 'q': return <Queens color={color} />;
    case 'k': return <Kings color={color} />;
    default: return null;
  }
};
