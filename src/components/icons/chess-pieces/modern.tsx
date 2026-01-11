
import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#18181B", strokeWidth: 1.5 },
  b: { fill: "#18181B", stroke: "#E4E4E7", strokeWidth: 1.5 },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22.5 36c-2.21 0-4-1.79-4-4 0-1.474.804-2.755 2-3.465V19h4v9.535c1.196.71 2 1.991 2 3.465 0 2.21-1.79 4-4 4z" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM14 32V14h17v18H14zM14 14h-2v-4h21v4h-2V14zM12 10V9h21v1H12z" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M 22,10 C 32.5,10.5 34,18 34,22 C 34,24 33,29.5 28,31 L 28.5,33.5 L 30,33 C 30,33 32.5,33.5 32.5,35 C 32.5,36.5 31,36 31,36 C 29.5,36 22.5,36 22.5,36 C 22.5,36 19.5,36 18,36 C 16.5,36 15,36.5 15,35 C 15,33.5 17.5,33 17.5,33 C 17.5,33 19,33.5 19,33.5 L 19.5,31 C 14.5,29.5 13.5,24 13.5,22 C 13.5,18 15,10.5 22,10 z M 25,18 C 25,18 26,17.5 26,19 C 26,20.5 25,20.5 25,20.5 C 25,20.5 23.5,20 23.5,19 C 23.5,18 25,18 25,18 z" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M9 36h27v3H9v-3z M19.5 36h6v-3h-6v3z M22.5 33c-3.866 0-7-3.134-7-7 0-3.314 2.686-6 6-6h2c3.314 0 6 2.686 6 6 0 3.866-3.134 7-7 7h-1zM22.5 9.5c-1.38 0-2.5 1.12-2.5 2.5 0 .815.392 1.536 1 1.975V15h3v-1.025c.608-.439 1-1.16 1-1.975 0-1.38-1.12-2.5-2.5-2.5z" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM37 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 39h27v-3H9v3zM12.5 36l-3-22h26l-3 22h-20zM12.5 14l-3 1h26l-3-1h-20z" />
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]} strokeLinejoin="round" strokeLinecap="round">
    <path d="M22.5 11.63V6M20 8h5M9 39h27v-3H9v3zM12.5 36l-3-22h26l-3 22h-20zM12.5 14l-3 1h26l-3-1h-20z" />
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

    