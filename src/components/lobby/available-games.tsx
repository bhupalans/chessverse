import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Game, Player } from '@/lib/types';
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
];

const mockGames: Game[] = [
  {
    id: 'game1',
    players: [mockPlayers[0]],
    status: 'waiting',
    eloGain: 10,
  },
  {
    id: 'game2',
    players: [mockPlayers[1]],
    status: 'waiting',
    eloGain: 12,
  },
  {
    id: 'game3',
    players: [mockPlayers[2]],
    status: 'waiting',
    eloGain: 8,
  },
];

export function AvailableGames() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="hidden sm:table-cell">ELO</TableHead>
            <TableHead className="hidden md:table-cell">Reward</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockGames.map((game) => (
            <TableRow key={game.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={game.players[0]?.avatarUrl} alt="Avatar" />
                    <AvatarFallback>{game.players[0]?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{game.players[0]?.name}</div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{game.players[0]?.elo}</TableCell>
              <TableCell className="hidden md:table-cell">+{game.eloGain} ELO</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm">
                  <Link href={`/game/${game.id}`}>Join Game</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
