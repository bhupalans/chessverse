
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

const getWinPercentage = (user: UserType): string => {
    const { gamesPlayed, wins } = user;
    if (gamesPlayed === 0) return '0%';
    return `${Math.round((wins / gamesPlayed) * 100)}%`;
};

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { user: currentUser, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users'),
      orderBy('eloRating', 'desc'),
      limit(100)
    );
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserType>(usersQuery);

  const getRankIndicator = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Crown className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Crown className="h-5 w-5 text-orange-400" />;
    return <span className="font-medium text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Leaderboard</CardTitle>
          <CardDescription>Top 100 players by ELO rating.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">ELO</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Games</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Record (W-L-D)</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Win %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || isUserLoading) &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="hidden sm:table-cell text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="hidden md:table-cell text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                       <TableCell className="hidden lg:table-cell text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    </TableRow>
                  ))}
                {!isLoading && !isUserLoading && users?.map((user, index) => (
                  <TableRow key={user.id} className={cn(user.id === currentUser?.uid && 'bg-primary/10')}>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center h-full">
                         {getRankIndicator(index + 1)}
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatarUrl || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl} alt="Avatar" />
                          <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{user.eloRating || 1200}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center">{user.gamesPlayed || 0}</TableCell>
                    <TableCell className="hidden md:table-cell text-center text-muted-foreground">
                      {user.wins || 0} - {user.losses || 0} - {user.draws || 0}
                    </TableCell>
                     <TableCell className="hidden lg:table-cell text-center">{getWinPercentage(user)}</TableCell>
                  </TableRow>
                ))}
                 {!isLoading && !isUserLoading && users?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No players found. Play some games to appear on the leaderboard!
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
