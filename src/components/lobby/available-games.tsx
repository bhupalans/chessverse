'use client';

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
import type { Game } from '@/lib/types';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';

export function AvailableGames() {
  const firestore = useFirestore();
  const { user } = useUser();

  const gamesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'games'), where('status', '==', 'waiting'));
  }, [firestore]);

  const { data: games, isLoading } = useCollection<Game>(gamesQuery);

  const availableGames = games?.filter(game => game.player1Id !== user?.uid);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="hidden sm:table-cell">ELO</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-9 w-24 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          )}
          {!isLoading && availableGames && availableGames.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                No available games. Why not create one?
              </TableCell>
            </TableRow>
          )}
          {!isLoading && availableGames?.map((game) => (
            <TableRow key={game.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={game.player1?.avatarUrl} alt="Avatar" />
                    <AvatarFallback>{game.player1?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{game.player1?.name}</div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{game.player1?.elo || 1200}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" disabled={!user}>
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
