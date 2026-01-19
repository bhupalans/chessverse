'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Game, Player } from '@/lib/types';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Helper functions defined at the top
  const renderSkeletonRow = (key: number) => (
    <TableRow key={`skeleton-${key}`}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-6 w-16 mx-auto" />
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-4 w-12 mx-auto" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-24 ml-auto" />
      </TableCell>
    </TableRow>
  );

  const renderGameRow = (game: Game) => {
    if (!user) return null;

    const isPlayer1 = game.player1.id === user.uid;
    const opponent = isPlayer1 ? game.player2 : game.player1;
    const myColor = isPlayer1 ? game.player1Color : game.player2Color;

    let result: 'Win' | 'Loss' | 'Draw' = 'Draw';
    if (game.winnerId && game.winnerId !== 'd') {
      const iAmWinner = (myColor === 'w' && game.winnerId === 'w') || (myColor === 'b' && game.winnerId === 'b');
      result = iAmWinner ? 'Win' : 'Loss';
    }

    let eloChange = 0;
    if(typeof game.whiteEloAfter === 'number' && typeof game.whiteEloBefore === 'number' && typeof game.blackEloAfter === 'number' && typeof game.blackEloBefore === 'number') {
        eloChange = myColor === 'w' ? game.whiteEloAfter - game.whiteEloBefore : game.blackEloAfter - game.blackEloBefore;
    }

    return (
      <TableRow key={game.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{opponent?.username?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{opponent?.username ?? 'Unknown'}</div>
              <div className="text-sm text-muted-foreground">ELO {opponent?.eloRating ?? '—'}</div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant={
              result === 'Win'
                ? 'default'
                : result === 'Loss'
                ? 'destructive'
                : 'secondary'
            }
            className={result === 'Win' ? 'bg-green-600/80' : ''}
          >
            {result}
          </Badge>
        </TableCell>
        <TableCell className={`text-center font-medium ${eloChange > 0 ? 'text-green-500' : eloChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {eloChange > 0 ? `+${eloChange}` : eloChange}
        </TableCell>
        <TableCell className="text-right text-sm text-muted-foreground">
          {game.completedAt
            ? format(new Date(game.completedAt.seconds * 1000), 'MMM d, yyyy')
            : '—'}
        </TableCell>
      </TableRow>
    );
  };

  const gamesAsPlayer1Query = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'games'),
      where('status', '==', 'completed'),
      where('player1Id', '==', user.uid),
      orderBy('completedAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const gamesAsPlayer2Query = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'games'),
      where('status', '==', 'completed'),
      where('player2Id', '==', user.uid),
      orderBy('completedAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: gamesAsPlayer1, isLoading: isP1Loading } = useCollection<Game>(gamesAsPlayer1Query);
  const { data: gamesAsPlayer2, isLoading: isP2Loading } = useCollection<Game>(gamesAsPlayer2Query);

  const mergedGames = useMemo(() => {
    const allGames = [...(gamesAsPlayer1 || []), ...(gamesAsPlayer2 || [])];
    const uniqueGames = Array.from(new Map(allGames.map(game => [game.id, game])).values());
    return uniqueGames.sort((a, b) => b.completedAt.seconds - a.completedAt.seconds);
  }, [gamesAsPlayer1, gamesAsPlayer2]);

  if (isUserLoading) {
    return (
      <div className="container mx-auto p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Game History</CardTitle>
            <CardDescription>Review your past matches and analyze your performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opponent</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-center">ELO Change</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8 text-center text-muted-foreground">
        Please sign in to view your game history.
      </div>
    );
  }

  const isLoading = isP1Loading || isP2Loading;

  return (
    <div className="container mx-auto p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Game History</CardTitle>
          <CardDescription>Review your past matches and analyze your performance.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="text-center">ELO Change</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))}
                {!isLoading && mergedGames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      No completed games yet.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && mergedGames.map(renderGameRow)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
