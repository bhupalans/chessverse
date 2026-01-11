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
    <path d="M22.5,9C19.74,9,17.5,11.24,17.5,14C17.5,16.05,18.7,17.8,20.42,18.66C16.41,20.44,14,24.34,14,29L31,29C31,24.34,28.59,20.44,24.58,18.66C26.3,17.8,27.5,16.05,27.5,14C27.5,11.24,25.26,9,22.5,9Z" />
  </svg>
);

const Rooks = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M9,39H36V36H9V39ZM12,33H33V12H12V33ZM9,9H12V12H9V9ZM15,9H18V12H15V9ZM21,9H24V12H21V9ZM27,9H30V12H27V9ZM33,9H36V12H33V9Z" />
  </svg>
);

const Knights = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22,10C19.67,10,18,11.54,18,13.8V20.5C18,21.9,16.9,23,15.5,23C13.83,23,13,21.73,13,20C13,19.2,13.2,18.5,13.5,17.8L12.1,17.1C10.5,20.4,10.2,25.2,13.5,28C15.6,29.8,18.4,30,20.5,28.5L22,30L23.5,28.5C25.6,30,28.4,29.8,30.5,28C33.8,25.2,33.5,20.4,31.9,17.1L30.5,17.8C30.8,18.5,31,19.2,31,20C31,21.73,30.17,23,28.5,23C27.1,23,26,21.9,26,20.5V13.8C26,11.54,24.33,10,22,10Z" />
  </svg>
);

const Bishops = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5,9L16,12L22.5,25L29,12L22.5,9ZM22.5,26L17,27L14.75,32L22.5,30L30.25,32L28,27L22.5,26Z" />
  </svg>
);

const Queens = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M8,12L14,35L31,35L37,12L32,13L30,11L25,13L22.5,10L20,13L15,11L13,13L8,12Z" />
  </svg>
);

const Kings = ({ color }: { color: PieceColor }) => (
  <svg viewBox="0 0 45 45" style={pieceStyles[color]}>
    <path d="M22.5,11.63L20.5,15.63L24.5,15.63L22.5,11.63M22.5,8L19,17L26,17L22.5,8M12,19L15,35L30,35L33,19H12Z" />
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
