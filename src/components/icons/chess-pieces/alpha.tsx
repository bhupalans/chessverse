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
    <path d="m 14,14 4,4 13,0 4,-4 -4,-2 -13,0 z M 14,34 l 0,-16 17,0 0,16 z M 11,38 l 23,0 M 11,14 l 3,0 M 31,14 l 3,0" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M 22.5,38 C 22.5,38 22.5,38 22.5,38 22.5,38 22.5,38 22.5,38 M 22.5,38 C 15.5,38 12,35.5 12,34 C 12,32.5 13,31 16,30 L 16,28 C 13,27 12,24 12,22 C 12,19 14.5,14 22.5,14 C 30.5,14 34,19 34,22 C 34,24 33,27 30,28 L 30,30 C 33,31 34,32.5 34,34 C 34,35.5 30.5,38 22.5,38 z M 12.5,24.5 L 14.5,24.5 L 14.5,22.5 L 12.5,22.5 z M 30.5,24.5 L 32.5,24.5 L 32.5,22.5 L 30.5,22.5 z" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M 22.5,38 C 18.5,38 15,34 15,34 L 30,34 C 30,34 26.5,38 22.5,38 z M 15,32 C 15,32 15,32 15,32 C 15,32 30,32 30,32 C 30,32 30,32 30,32 z M 22.5,10 C 22.5,10 22.5,10 22.5,10 C 20.5,10 19,11.5 19,13.5 C 19,15.5 22.5,16 22.5,18 C 22.5,20 19,20.5 19,22.5 C 19,24.5 20.5,26 22.5,26 C 24.5,26 26,24.5 26,22.5 C 26,20.5 22.5,20 22.5,18 C 22.5,16 26,15.5 26,13.5 C 26,11.5 24.5,10 22.5,10 z" />
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
