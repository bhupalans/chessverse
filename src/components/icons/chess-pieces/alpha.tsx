
import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#18181B", strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const },
  b: { fill: "#18181B", stroke: "#E4E4E7", strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 22.5,33.5 C 20.291,33.5 18.5,31.709 18.5,29.5 C 18.5,27.291 20.291,25.5 22.5,25.5 C 24.709,25.5 26.5,27.291 26.5,29.5 C 26.5,31.709 24.709,33.5 22.5,33.5 Z M 22.5,26.5 L 22.5,19.5" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 14,34 L 14,14 L 31,14 L 31,34 L 14,34 Z M 11,38 L 34,38 L 34,34 L 11,34 L 11,38 Z M 11,14 L 11,10 L 34,10 L 34,14 L 11,14 Z M 14,10 L 14,14 L 17,14 L 17,10 L 14,10 Z M 21,10 L 21,14 L 24,14 L 24,10 L 21,10 Z M 28,10 L 28,14 L 31,14 L 31,10 L 28,10 Z" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 22,10 C 10.5,11.5 14,23.5 14,23.5 C 14,23.5 14,30.5 17.5,30.5 C 21,30.5 24.5,29.5 24.5,29.5 C 24.5,29.5 27.5,29 27.5,26 C 27.5,23 24.5,21 24.5,21 C 24.5,21 28.5,16 28.5,13.5 C 28.5,11 25,10 22,10 Z M 18.5,24.5 C 18.5,24.5 18,27.5 20.5,27.5 C 23,27.5 23,24.5 23,24.5" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 22.5,38 C 19.5,38 15,31 15,31 L 30,31 C 30,31 25.5,38 22.5,38 Z M 22.5,31 C 22.5,31 22.5,33.5 22.5,33.5 C 22.5,33.5 22.5,31 22.5,31 Z M 15,29 C 15,29 18.5,21 22.5,12 C 26.5,21 30,29 30,29 L 15,29 Z M 22.5,26 C 24.5,26 26.5,24.5 26.5,22.5 C 26.5,20.5 24.5,19 22.5,19 C 20.5,19 18.5,20.5 18.5,22.5 C 18.5,24.5 20.5,26 22.5,26 Z" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 12,12 L 33,12 L 33,9 L 12,9 L 12,12 Z M 12,12 L 12,14 L 33,14 L 33,12 M 13.5,14 L 13.5,20.5 L 16.5,20.5 L 16.5,14 M 21,14 L 21,20.5 L 24,20.5 L 24,14 M 28.5,14 L 28.5,20.5 L 31.5,20.5 L 31.5,14 M 12,20.5 L 33,20.5 L 33,22.5 C 33,22.5 33,28 30.5,30.5 C 28,33 17,33 14.5,30.5 C 12,28 12,22.5 12,22.5 L 12,20.5 Z M 12,33.5 L 33,33.5 L 33,38 L 12,38 L 12,33.5 Z" />
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 22.5,11.5 L 22.5,6 M 20,8 L 25,8 M 12.5,38 L 32.5,38 L 32.5,36 L 12.5,36 L 12.5,38 Z M 12.5,36 C 12.5,36 12.5,31 12.5,31 C 12.5,24.5 16,24.5 16,24.5 C 16,24.5 16,28.5 22.5,28.5 C 29,28.5 29,24.5 29,24.5 C 29,24.5 32.5,24.5 32.5,31 C 32.5,31 32.5,36 32.5,36 L 12.5,36 Z M 16,24.5 L 29,24.5 L 29,14.5 L 16,14.5 L 16,24.5 Z M 16,14.5 L 29,14.5" />
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
