import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#18181B", strokeWidth: 1.5 },
  b: { fill: "#18181B", stroke: "#E4E4E7", strokeWidth: 1.5 },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5 9c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 6c-4.418 0-8 3.582-8 8v5h16v-5c0-4.418-3.582-8-8-8z" strokeLinejoin="round" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M9 39h27v-3H9v3zM12 36V12h21v24H12zM14 9h17v3H14V9z" strokeLinejoin="round" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22 10c10.5 1 16.5 8 16 29H15.5c0-11 2.5-15.5 10.5-20.5 0 2 1 4.5 2.5 4.5 2.5 0 2.5-2.5 2.5-4.5 0-2-.5-2.5-1.5-4-.5-1-1-2.5-3-2.5z" strokeLinejoin="round" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M9 36h27v3H9v-3zM22.5 9c-2.5 0-5 1.5-5 4s2.5 4 5 4 5-1.5 5-4-2.5-4-5-4zM12.5 20l4.5-2.5 5.5 10.5 5.5-10.5 4.5 2.5V33H12.5V20z" strokeLinejoin="round" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M8 12l3 21h23l3-21-5 1.5-2-3-5 2-3-4-3 4-5-2-2 3z" strokeLinejoin="round" />
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5 11.63l2-4v-3h-4v3l2 4zm0 0l-3.5 16h7l-3.5-16zm-10.5 15.37l3 11h15l3-11zM12 39h21v-3H12v3z" strokeLinejoin="round" />
  </svg>
);

export const ModernChessPieces: PieceComponent = ({ type, color }: ChessPieceProps) => {
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
