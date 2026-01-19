'use client';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Tournament, TournamentPlayer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { TournamentActions } from '@/components/admin/tournament-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, User } from 'lucide-react';

function TournamentDetailsClient() {
  const { id } = useParams();
  const tournamentId = Array.isArray(id) ? id[0] : id;
  const firestore = useFirestore();

  const tournamentRef = useMemoFirebase(() => {
    if (!firestore || !tournamentId) return null;
    return doc(firestore, 'tournaments', tournamentId);
  }, [firestore, tournamentId]);

  const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentRef);

  const playersQuery = useMemoFirebase(() => {
    if (!firestore || !tournamentId || !tournament) return null;
    
    const playersCollection = collection(firestore, 'tournaments', tournamentId, 'players');

    // For draft/published tournaments, show players by join order.
    // For all other states, show by score for standings.
    if (tournament.state === 'draft' || tournament.state === 'published') {
        return query(playersCollection, orderBy('joinedAt', 'asc'));
    }
    
    return query(playersCollection, orderBy('score', 'desc'));
  }, [firestore, tournamentId, tournament]);

  const { data: players, isLoading: arePlayersLoading } = useCollection<TournamentPlayer>(playersQuery);

  if (isTournamentLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!tournament) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Tournament not found</h2>
      </div>
    );
  }
  
  const isPreTournament = tournament.state === 'draft' || tournament.state === 'published';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{tournament.name}</CardTitle>
              <CardDescription>
                Created at: {tournament.createdAt ? format(tournament.createdAt.toDate(), 'PPpp') : 'N/A'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <Badge variant={tournament.state === 'live' ? 'destructive' : 'secondary'} className="text-lg">
                    {tournament.state}
                </Badge>
                <TournamentActions tournament={tournament} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Start Time</span>
                <span>{tournament.startTime ? format(tournament.startTime.toDate(), 'PPpp') : 'N/A'}</span>
            </div>
             <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Players</span>
                <span>{tournament.playerCount} / {tournament.maxPlayers}</span>
            </div>
            <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Duration</span>
                <span>{tournament.durationMinutes} minutes</span>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>
                {tournament.state === 'completed' || tournament.state === 'archived' ? 'Final Standings' : (isPreTournament ? 'Players Joined' : 'Current Standings')}
            </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="rounded-lg border">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            {isPreTournament ? (
                                <>
                                    <TableHead>Player</TableHead>
                                    <TableHead className="text-center">ELO</TableHead>
                                    <TableHead className="text-right">Joined At</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Player</TableHead>
                                    <TableHead className="text-center">ELO</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-center">Games</TableHead>
                                </>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {arePlayersLoading && Array.from({length: 5}).map((_, i) => (
                             <TableRow key={i}>
                                {isPreTournament ? (
                                    <>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-6 w-6 rounded-full" />
                                                <Skeleton className="h-5 w-32" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-40 ml-auto" /></TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-6 w-6 rounded-full" />
                                                <Skeleton className="h-5 w-32" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                    </>
                                )}
                             </TableRow>
                        ))}
                        {!arePlayersLoading && players?.map((player, index) => (
                            <TableRow key={player.id}>
                                {isPreTournament ? (
                                     <>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {player.username}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{player.eloRating}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {player.joinedAt ? format(player.joinedAt.toDate(), 'P p') : 'N/A'}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="font-bold text-center">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {player.username}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{player.eloRating}</TableCell>
                                        <TableCell className="text-center font-semibold">{player.score}</TableCell>
                                        <TableCell className="text-center">{player.gamesPlayed}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                         {!arePlayersLoading && players?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isPreTournament ? 3 : 5} className="text-center h-24">No players have joined yet.</TableCell>
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

export default function TournamentDetailPage() {
    return (
        <div className="container mx-auto py-8">
            <TournamentDetailsClient />
        </div>
    )
}
