import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HistoryGame, Player } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Kasparov',
    elo: 1600,
    avatarUrl: PlaceHolderImages.find(img => img.id === 'user1')?.imageUrl || '',
  },
  {
    id: '2',
    name: 'Carlsen',
    elo: 1550,
    avatarUrl: PlaceHolderImages.find(img => img.id === 'user2')?.imageUrl || '',
  },
  {
    id: '3',
    name: 'Fischer',
    elo: 1400,
    avatarUrl: PlaceHolderImages.find(img => img.id === 'user3')?.imageUrl || '',
  },
   {
    id: '4',
    name: 'Anand',
    elo: 1700,
    avatarUrl: PlaceHolderImages.find(img => img.id === 'user4')?.imageUrl || '',
  },
];

const mockHistory: HistoryGame[] = [
    { id: '1', opponent: mockPlayers[1], result: 'Win', date: '2023-10-27', eloChange: '+12' },
    { id: '2', opponent: mockPlayers[0], result: 'Loss', date: '2023-10-26', eloChange: '-10' },
    { id: '3', opponent: mockPlayers[2], result: 'Draw', date: '2023-10-25', eloChange: '+0' },
    { id: '4', opponent: mockPlayers[3], result: 'Win', date: '2023-10-24', eloChange: '+15' },
];

export default function HistoryPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Game History</CardTitle>
          <CardDescription>Review your past matches and analyze your performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">ELO Change</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockHistory.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={game.opponent.avatarUrl} alt="Avatar" />
                          <AvatarFallback>{game.opponent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{game.opponent.name}</div>
                          <div className="text-sm text-muted-foreground">ELO: {game.opponent.elo}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          game.result === 'Win' ? 'default' : game.result === 'Loss' ? 'destructive' : 'secondary'
                        }
                        className={game.result === 'Win' ? 'bg-green-600/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-600/20' : ''}
                      >
                        {game.result}
                      </Badge>
                    </TableCell>
                    <TableCell className={`hidden sm:table-cell text-center font-medium ${game.eloChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {game.eloChange}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{game.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
