'use client';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, query, orderBy, getDoc, getDocs } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Tournament, TournamentPlayer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function TournamentResultsClient() {
  const { id } = useParams();
  const tournamentId = Array.isArray(id) ? id[0] : id;
  const firestore = useFirestore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!firestore || !tournamentId) {
      setIsLoading(false);
      return;
    };

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tournamentRef = doc(firestore, 'tournaments', tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
          setError("Tournament results are unavailable.");
          setTournament(null);
          setPlayers(null);
          setIsLoading(false);
          return;
        }

        const tournamentData = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
        setTournament(tournamentData);
        
        const playersCollection = collection(firestore, 'tournaments', tournamentId, 'players');
        const playersQuery = query(playersCollection, orderBy('score', 'desc'));
        const playersSnap = await getDocs(playersQuery);
        
        const playersData = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TournamentPlayer);
        setPlayers(playersData);

      } catch (err) {
        console.error("Error fetching tournament results:", err);
        setError("Tournament results are unavailable.");
        setTournament(null);
        setPlayers(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [firestore, tournamentId]);


  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
     return (
       <div className="text-center">
         <h2 className="text-xl font-semibold">{error}</h2>
         <Button asChild className="mt-4">
             <Link href="/tournaments">Back to Tournaments</Link>
         </Button>
       </div>
     );
  }

  if (!tournament) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">Tournament not found</h2>
        <Button asChild className="mt-4">
            <Link href="/tournaments">Back to Tournaments</Link>
        </Button>
      </div>
    );
  }
  
  const isCompleted = tournament.state === 'completed' || tournament.state === 'archived';

  if (!isCompleted && !isLoading) {
      return (
           <div className="text-center">
                <h2 className="text-xl font-semibold">Tournament Results Not Available</h2>
                <p className="text-muted-foreground mt-2">The results will be available once the tournament is complete.</p>
                <Button asChild className="mt-4">
                    <Link href="/tournaments">Back to Tournaments</Link>
                </Button>
            </div>
      )
  }

  const winner = players && players.length > 0 ? players[0] : null;
  const runnerUp = players && players.length > 1 ? players[1] : null;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{tournament.name}</CardTitle>
              <CardDescription>
                Final Results
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isCompleted && (winner || runnerUp) && (
              <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-3">
                {winner && (
                  <div className="flex items-center text-lg font-semibold">
                    <span className="text-2xl mr-3">🏆</span>
                    <span>Winner: {winner.username}</span>
                    <span className="text-muted-foreground ml-auto text-base font-normal">Score: {winner.score}</span>
                  </div>
                )}
                {runnerUp && (
                  <div className="flex items-center text-md font-medium text-foreground/90">
                     <span className="text-xl mr-3">🥈</span>
                     <span>Runner-up: {runnerUp.username}</span>
                     <span className="text-muted-foreground ml-auto text-sm font-normal">Score: {runnerUp.score}</span>
                  </div>
                )}
              </div>
            )}
             <div className="rounded-lg border">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-center">ELO</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">Games</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 10}).map((_, i) => (
                             <TableRow key={i}>
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
                             </TableRow>
                        ))}
                        {!isLoading && players?.map((player, index) => (
                            <TableRow key={player.id}>
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
                            </TableRow>
                        ))}
                         {!isLoading && players?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No players participated in this tournament.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
             </div>
             <div className="mt-6 text-center">
                 <Button asChild variant="outline">
                    <Link href="/tournaments">Back to Tournaments</Link>
                 </Button>
             </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function TournamentResultsPage() {
    return (
        <div className="container mx-auto py-8">
            <TournamentResultsClient />
        </div>
    )
}
