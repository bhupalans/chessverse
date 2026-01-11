import type { PieceColor, PieceType } from "@/lib/types";

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#18181B", strokeWidth: 1.5 },
  b: { fill: "#18181B", stroke: "#E4E4E7", strokeWidth: 1.5 },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5,9C19.74,9,17.5,11.24,17.5,14C17.5,16.05,18.7,17.8,20.42,18.66C16.41,20.44,14,24.34,14,29L31,29C31,24.34,28.59,20.44,24.58,18.66C26.3,17.8,27.5,16.05,27.5,14C27.5,11.24,25.26,9,22.5,9Z" stroke-linejoin="round"/>
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M9,39H36V36H9V39ZM12.5,33V12.5h20V33h-20ZM12.5,9.5l3-3h14l3,3h-20Z" stroke-linejoin="round"/>
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="m 22,10 c 10.5,1 16.5,8 16,29 H 15.5 c 0,-11 2.5,-15.5 10.5,-20.5 0,2 1,4.5 2.5,4.5 2.5,0 2.5,-2.5 2.5,-4.5 0,-2 -0.5,-2.5 -1.5,-4 -0.5,-1 -1,-2.5 -3,-2.5 z" stroke-linejoin="round"/>
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M9,36h27v3H9v-3z M22.5,9c-2.5,0-5,1.5-5,4s2.5,4,5,4s5-1.5,5-4S25,9,22.5,9z M12.5,20l4.5-2.5l5.5,10.5l5.5-10.5l4.5,2.5V33H12.5V20z" stroke-linejoin="round"/>
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="m 8,12 3,21 h 23 l 3,-21 -5,1.5 -2,-3 -5,2 -3,-4 -3,4 -5,-2 -2,3 z" stroke-linejoin="round"/>
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="m 22.5,11.63 2,-4 v -3 h -4 v 3 l 2,4 z m 0,0 -3.5,16 h 7 l -3.5,-16 z m -10.5,15.37 3,11 h 15 l 3,-11 z M 12,39 h 21 v -3 H 12 v 3 z" stroke-linejoin="round"/>
  </svg>
);

export const ChessPieceComponent = ({ type, color }: ChessPieceProps) => {
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
