
'use client';
import { useContext } from 'react';
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
import { Flag, Swords, Timer, Settings } from 'lucide-react';
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
import { ThemeContext } from '@/context/theme-context';


const mockMoves = [
  { number: 1, white: 'e4', black: 'e5' },
  { number: 2, white: 'Nf3', black: 'Nc6' },
  { number: 3, white: 'Bb5', black: 'a6' },
  { number: 4, white: 'Ba4', black: 'Nf6' },
  { number: 5, white: 'O-O', black: 'Be7' },
];

const PlayerCard = ({
  name,
  elo,
  avatar,
  isTurn,
}: {
  name: string;
  elo: number;
  avatar: string;
  isTurn?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={avatar} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold">{name}</p>
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
  const { theme, setTheme } = useContext(ThemeContext);

  const handleThemeChange = (themeId: string) => {
    const selectedTheme = CHESS_THEMES.find((t) => t.id === themeId);
    if (selectedTheme) {
      setTheme(selectedTheme);
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function GameInfoPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 space-y-4">
        <PlayerCard name="Opponent" elo={1550} avatar={PlaceHolderImages[1].imageUrl} />
        <PlayerCard name="You" elo={1500} avatar={PlaceHolderImages[0].imageUrl} isTurn />
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="w-1/3 text-center">#</TableHead>
              <TableHead className="w-1/3 text-center">White</TableHead>
              <TableHead className="w-1/3 text-center">Black</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockMoves.map((move) => (
              <TableRow key={move.number}>
                <TableCell className="text-center text-muted-foreground">{move.number}</TableCell>
                <TableCell className="text-center font-medium">{move.white}</TableCell>
                <TableCell className="text-center font-medium">{move.black}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Separator />

      <div className="p-4 flex items-center justify-between">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Button variant="outline">
            <Flag className="mr-2 h-4 w-4" /> Resign
          </Button>
          <Button variant="outline">
            <Swords className="mr-2 h-4 w-4" /> Offer Draw
          </Button>
        </div>
         <div className="ml-2">
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
