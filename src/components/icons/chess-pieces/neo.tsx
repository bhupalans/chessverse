import type { PieceColor, ChessPieceProps, PieceComponent } from "@/lib/types";

const pieceStyles = {
  w: { fill: "#FFFFFF", stroke: "#000000", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const },
  b: { fill: "#18181B", stroke: "#FFFFFF", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const },
};

const Pawns = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5 36c-2.21 0-4-1.79-4-4 0-1.5.8-2.8 2-3.5V19h4v9.5c1.2.7 2 2 2 3.5 0 2.21-1.79 4-4 4z" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M12 36V12h21v24H12z M14 14v10 M31 14v10 M12 12V9h21v3 M14 9h17" fill="none" />
    <path d="M12 36h21v3H12v-3z" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M 15,36 C 15,36 15,28 18,26 C 21,24 22.5,24 22.5,24 C 22.5,24 26,22 26,18 C 26,14 24,10 22,10 C 20,10 19.5,12 19.5,12 C 19.5,12 21.5,10.5 22,8 C 22.5,5.5 18,4 18,4 C 18,4 12,10 12,14 C 12,18 15,20 15,20 C 15,20 12,23 12,26 C 12,29 15,36 15,36 z" />
    <path d="M 22.5,24 C 22.5,24 24,28 27,28 C 30,28 30,36 30,36" fill="none"/>
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M15 36h15l-7.5-9z" />
    <path d="M22.5 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    <path d="M18 14l-3 14h15l-3-14" fill="none" />
    <path d="M22.5 28L15 14h15L22.5 28z" fill="none"/>
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M12 36h21v-3H12v3z M13.5 33l-1.5-12h22l-1.5 12h-19z" />
    <path d="M10 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM35 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill={pieceStyles[color].fill}/>
    <path d="M12 21h21" fill="none"/>
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M12 36h21v-3H12v3z M13.5 33l-1.5-12h22l-1.5 12h-19z M12 21h21" fill="none" />
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
