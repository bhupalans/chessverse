
export type ChessTheme = {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
};

export const CHESS_THEMES: ChessTheme[] = [
  {
    id: 'green',
    name: 'Green',
    lightSquare: 'bg-[#EAF0CE]',
    darkSquare: 'bg-[#7B9556]',
  },
  {
    id: 'walnut',
    name: 'Walnut',
    lightSquare: 'bg-[#F0D9B5]',
    darkSquare: 'bg-[#B58863]',
  },
  {
    id: 'icy-sea',
    name: 'Icy Sea',
    lightSquare: 'bg-[#C4D0E1]',
    darkSquare: 'bg-[#7888A1]',
  },
  {
    id: 'slate',
    name: 'Slate',
    lightSquare: 'bg-slate-300',
    darkSquare: 'bg-slate-500',
  },
    {
    id: 'classic',
    name: 'Classic',
    lightSquare: 'bg-secondary',
    darkSquare: 'bg-primary/20',
  },
];
