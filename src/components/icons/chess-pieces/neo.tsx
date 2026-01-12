
import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#000000", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const },
  b: { fill: "#262421", stroke: "#000000", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5 36c-2.21 0-4-1.79-4-4 0-1.5.8-2.8 2-3.5V19h4v9.5c1.2.7 2 2 2 3.5 0 2.21-1.79 4-4 4z" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
    <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
        <path d="M12 36V12h21v24H12zM14 14V9h17v5" fill="none" />
        <path d="M14 9h17v5H14V9z" strokeDasharray="17 5 17 5" strokeDashoffset="-5" />
        <path d="M12 39h21v-3H12v3z" />
    </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 22,10 C 32.5,10.5 34,18 34,22 C 34,24 33,29.5 28,31 L 28.5,33.5 L 30,33 C 30,33 32.5,33.5 32.5,35 C 32.5,36.5 31,36 31,36 C 29.5,36 22.5,36 22.5,36 C 22.5,36 19.5,36 18,36 C 16.5,36 15,36.5 15,35 C 15,33.5 17.5,33 17.5,33 C 17.5,33 19,33.5 19,33.5 L 19.5,31 C 14.5,29.5 13.5,24 13.5,22 C 13.5,18 15,10.5 22,10 z" />
    <path d="M 25,18 C 25,18 26,17.5 26,19 C 26,20.5 25,20.5 25,20.5 C 25,20.5 23.5,20 23.5,19 C 23.5,18 25,18 25,18 z" fill={pieceStyles[color].stroke} />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M15 39h15v-3H15v3z M22.5,9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    <path d="M18 14l-3 14h15l-3-14" fill="none" />
    <path d="M15 14h15l-7.5 14L15 14z" />
    <path d="M20.5 18.5L24.5 18.5" fill="none" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
    <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
        <path d="M12 39h21v-3H12v3z M13.5 36l-1.5-12h22l-1.5 12h-19z" />
        <path d="M10 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM28.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM35 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        <path d="M12 24h21" fill="none"/>
    </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M12 39h21v-3H12v3z M13.5 36l-1.5-12h22l-1.5 12h-19z M12 24h21" fill="none" />
    <path d="M22.5 6v10m-5-5h10" fill="none" />
  </svg>
);

export const NeoChessPieces: PieceComponent = ({ type, color }: ChessPieceProps) => {
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
