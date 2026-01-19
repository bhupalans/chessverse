'use client';

import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function HistoryPage() {
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();

  // Memoize the query to prevent re-renders, but only when user and firestore are available.
  const gamesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;

    // Fetch all completed games. Filtering for the user will happen on the client.
    return query(
      collection(firestore, 'games'),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: games, isLoading: areGamesLoading } = useCollection<Game>(gamesQuery);

  const myGames = useMemo(() => {
    if (!games || !user) return [];
    return games.filter(g => g.player1?.id === user.uid || g.player2?.id === user.uid);
  }, [games, user]);

  const isLoading = isUserLoading || areGamesLoading;

  if (!isUserLoading && !user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Game History</CardTitle>
            <CardDescription>Review your past matches and analyze your performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-12">
              Please sign in to view your game history.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderGameRow = (game: Game) => {
    if (!user) return null;

    const isPlayer1 = game.player1.id === user.uid;
    const opponent = isPlayer1 ? game.player2 : game.player1;
    const myColor = isPlayer1 ? game.player1Color : game.player2Color;
    const myEloBefore = myColor === 'w' ? game.whiteEloBefore : game.blackEloBefore;
    const myEloAfter = myColor === 'w' ? game.whiteEloAfter : game.blackEloAfter;

    let result: 'Win' | 'Loss' | 'Draw' = 'Draw';
    let resultVariant: 'default' | 'destructive' | 'secondary' = 'secondary';
    
    if (game.winnerId && game.winnerId !== 'd') {
      if (game.winnerId === myColor) {
        result = 'Win';
        resultVariant = 'default';
      } else {
        result = 'Loss';
        resultVariant = 'destructive';
      }
    }

    const eloChange = (myEloAfter && myEloBefore) ? myEloAfter - myEloBefore : 0;
    const eloChangeFormatted = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;

    return (
      <TableRow key={game.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={opponent?.avatarUrl || PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl} />
              <AvatarFallback>
                {opponent?.username?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{opponent?.username ?? 'Unknown'}</div>
              <div className="text-sm text-muted-foreground">ELO {opponent?.eloRating ?? '—'}</div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={resultVariant}>
            {result}
          </Badge>
        </TableCell>
        <TableCell className={cn(
          "text-center font-medium",
          eloChange > 0 && "text-green-500",
          eloChange < 0 && "text-destructive"
        )}>
          {game.eloProcessed ? eloChangeFormatted : 'N/A'}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {game.completedAt
            ? format(new Date(game.completedAt.seconds * 1000), 'MMM d, yyyy')
            : '—'}
        </TableCell>
      </TableRow>
    );
  };
  
  const renderSkeletonRow = (key: number) => (
    <TableRow key={`skeleton-${key}`}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
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
                
                {!isLoading && myGames.length > 0 && myGames.map(renderGameRow)}

                {!isLoading && myGames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      You have no completed games yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
