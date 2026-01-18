'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Tournament, TimeControl } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const formatTimeControl = (tc: TimeControl) => {
    if (!tc) return 'N/A';
    const initialMinutes = Math.floor(tc.initial / 60000);
    const incrementSeconds = tc.increment / 1000;
    return `${initialMinutes}+${incrementSeconds}`;
};

export default function TournamentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tournaments'), orderBy('startTime', 'asc'));
  }, [firestore]);

  const { data: allTournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);

  const visibleTournaments = useMemo(() => {
    return allTournaments?.filter(t => t.state === 'published' || t.state === 'live') || [];
  }, [allTournaments]);

  const handleJoinTournament = async (tournamentId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to join a tournament.',
      });
      return;
    }
    setJoiningId(tournamentId);
    try {
      const functions = getFunctions();
      const joinTournament = httpsCallable(functions, 'joinTournament');
      await joinTournament({ tournamentId });
      toast({
        title: 'Successfully Joined!',
        description: 'You have been registered for the tournament.',
      });
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Join',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setJoiningId(null);
    }
  };
  
  const renderTournamentCard = (tournament: Tournament) => {
    const isJoining = joiningId === tournament.id;
    const canJoin = tournament.state === 'published' && tournament.playerCount < tournament.maxPlayers;

    return (
        <Card key={tournament.id} className="flex flex-col">
          <CardHeader>
             <div className="flex justify-between items-start">
              <CardTitle>{tournament.name}</CardTitle>
              <Badge variant={tournament.state === 'live' ? 'destructive' : 'default'}>
                {tournament.state.charAt(0).toUpperCase() + tournament.state.slice(1)}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1 text-sm">
                {formatTimeControl(tournament.timeControl)} Blitz
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
             <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              <span>{format(tournament.startTime.toDate(), 'MMM d, h:mm a')}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="mr-2 h-4 w-4" />
              <span>{tournament.playerCount} / {tournament.maxPlayers} players</span>
            </div>
          </CardContent>
          <CardFooter>
            {canJoin && (
              <Button 
                className="w-full"
                onClick={() => handleJoinTournament(tournament.id)}
                disabled={isJoining}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isJoining ? 'Joining...' : 'Join Tournament'}
              </Button>
            )}
             {tournament.state === 'live' && (
              <Button className="w-full" variant="secondary" disabled>
                Live Now
              </Button>
            )}
          </CardFooter>
        </Card>
    );
  }

  const renderSkeletonCard = (key: number) => (
    <Card key={key} className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center">
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center">
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
         <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
         <p className="text-muted-foreground">Join an upcoming arena tournament.</p>
      </div>
      
      {areTournamentsLoading && (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))}
        </div>
      )}

      {!areTournamentsLoading && visibleTournaments.length === 0 && (
         <div className="text-center py-16 border border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No Tournaments Available</h2>
          <p className="text-muted-foreground mt-2">Check back soon for new tournaments.</p>
        </div>
      )}
      
      {!areTournamentsLoading && visibleTournaments.length > 0 && (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleTournaments.map(renderTournamentCard)}
        </div>
      )}
    </div>
  );
}
