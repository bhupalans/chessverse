'use client';
import { useContext, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Flag, Swords, Timer, Settings, Bot, Play } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHESS_THEMES } from '@/lib/chess-themes';
import { PIECE_SETS } from '@/lib/piece-sets';
import { ThemeContext } from '@/context/theme-context';

const PlayerCard = ({
  name,
  elo,
  avatar,
  isTurn,
  isBot = false,
}: {
  name: string;
  elo: number;
  avatar: string;
  isTurn?: boolean;
  isBot?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={avatar} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{name}</p>
          {isBot && <Bot className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">ELO: {elo}</p>
      </div>
    </div>
    {isTurn && (
      <div className="flex items-center gap-2 text-primary">
        <Timer className="h-5 w-5" />
        <span className="font-bold">04:30</span>
      </div>
    )}
  </div>
);

function ThemeSelector() {
  const { theme, setTheme, pieceSet, setPieceSet } = useContext(ThemeContext);

  const handleThemeChange = (themeId: string) => {
    const selectedTheme = CHESS_THEMES.find((t) => t.id === themeId);
    if (selectedTheme) {
      setTheme(selectedTheme);
    }
  };

  const handlePieceSetChange = (pieceSetId: string) => {
    const selectedPieceSet = PIECE_SETS.find((p) => p.id === pieceSetId);
    if (selectedPieceSet) {
      setPieceSet(selectedPieceSet);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Board Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme.id}
          onValueChange={handleThemeChange}
        >
          {CHESS_THEMES.map((themeOption) => (
            <DropdownMenuRadioItem key={themeOption.id} value={themeOption.id}>
              {themeOption.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Piece Style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={pieceSet.id}
          onValueChange={handlePieceSetChange}
        >
          {PIECE_SETS.map((pieceOption) => (
            <DropdownMenuRadioItem key={pieceOption.id} value={pieceOption.id}>
              {pieceOption.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GameInfoPanel({ 
  isBotGame, 
  onStartGame, 
  gameStarted,
  moves 
}: { 
  isBotGame: boolean, 
  onStartGame: () => void, 
  gameStarted: boolean,
  moves: string[]
}) {
  const opponentName = isBotGame ? 'Stockfish Bot' : 'Opponent';
  const opponentElo = isBotGame ? 2000 : 1550;
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs of [white, black]
  const movePairs: [string, string?][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 space-y-4">
        <PlayerCard name={opponentName} elo={opponentElo} avatar={PlaceHolderImages[1].imageUrl} isBot={isBotGame} />
        <PlayerCard name="You" elo={1500} avatar={PlaceHolderImages[0].imageUrl} isTurn={gameStarted} />
      </div>

      <Separator />

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="w-1/3 text-center">#</TableHead>
              <TableHead className="w-1/3 text-center">White</TableHead>
              <TableHead className="w-1/3 text-center">Black</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movePairs.map((pair, index) => (
              <TableRow key={index}>
                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="text-center font-medium">{pair[0]}</TableCell>
                <TableCell className="text-center font-medium">{pair[1] || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Separator />

      <div className="p-4 flex items-center justify-between">
        <div className="grid grid-cols-2 gap-2 flex-1">
          {gameStarted ? (
            <>
              <Button variant="outline">
                <Flag className="mr-2 h-4 w-4" /> Resign
              </Button>
              <Button variant="outline">
                <Swords className="mr-2 h-4 w-4" /> Offer Draw
              </Button>
            </>
          ) : (
            <Button onClick={onStartGame} className="col-span-2">
              <Play className="mr-2 h-4 w-4" /> Start Game
            </Button>
          )}
        </div>
         <div className="ml-2">
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
