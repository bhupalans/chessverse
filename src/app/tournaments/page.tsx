'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Loader2, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import type { Tournament, TimeControl, TournamentPlayer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

const formatTimeControl = (tc: TimeControl) => {
    if (!tc) return 'N/A';
    const initialMinutes = Math.floor(tc.initial / 60000);
    const incrementSeconds = tc.increment / 1000;
    return `${initialMinutes}+${incrementSeconds}`;
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const playerDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'tournaments', tournament.id, 'players', user.uid);
  }, [firestore, user, tournament.id]);

  const { data: playerDoc, isLoading: isPlayerLoading } = useDoc<TournamentPlayer>(playerDocRef);
  
  useEffect(() => {
    if (playerDoc?.activeGameId) {
        toast({
            title: 'Game Ready!',
            description: 'You are being redirected to your tournament game.',
        });
        router.push(`/game/${playerDoc.activeGameId}`);
    }
  }, [playerDoc, router, toast]);

  const hasJoined = !!playerDoc;

  const handleJoinTournament = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to join a tournament.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      const functions = getFunctions();
      const joinTournament = httpsCallable(functions, 'joinTournament');
      await joinTournament({ tournamentId: tournament.id });
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
      setIsProcessing(false);
    }
  };

  const isFull = tournament.playerCount >= tournament.maxPlayers;

  const renderFooter = () => {
    if (tournament.state === 'completed' || tournament.state === 'archived') {
      return (
        <Button className="w-full" onClick={() => router.push(`/tournaments/${tournament.id}/results`)}>
          <Trophy className="mr-2 h-4 w-4" />
          View Results
        </Button>
      );
    }

    if (isPlayerLoading) {
      return (
        <Button className="w-full" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </Button>
      );
    }
    
    if (hasJoined) {
        if (playerDoc?.activeGameId) {
            return (
                <Button className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining game...
                </Button>
            );
        }
      return (
        <Button className="w-full" variant="outline" disabled>Joined</Button>
      );
    }

    if (tournament.state === 'published') {
      if (isFull) {
        return (
          <Button className="w-full" disabled>Tournament Full</Button>
        );
      }
      return (
        <Button
          className="w-full"
          onClick={handleJoinTournament}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessing ? 'Joining...' : 'Join Tournament'}
        </Button>
      );
    }

    if (tournament.state === 'live') {
      // If user hasn't joined a live tournament, don't show any action
      return null;
    }
    
    return null;
  };

  const badgeText = tournament.state === 'completed' || tournament.state === 'archived'
    ? 'Archived'
    : tournament.state.charAt(0).toUpperCase() + tournament.state.slice(1);

  const badgeVariant = tournament.state === 'live' 
    ? 'destructive' 
    : (tournament.state === 'completed' || tournament.state === 'archived' ? 'secondary' : 'default');

  return (
    <Card className="flex flex-col">
      <CardHeader>
         <div className="flex justify-between items-start">
          <CardTitle>{tournament.name}</CardTitle>
          <Badge variant={badgeVariant}>
            {badgeText}
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
        {renderFooter()}
      </CardFooter>
    </Card>
  );
}


export default function TournamentsPage() {
  const firestore = useFirestore();

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tournaments'), orderBy('startTime', 'desc'));
  }, [firestore]);

  const { data: allTournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);

  const visibleTournaments = useMemo(() => {
    return allTournaments?.filter(t => t.state !== 'draft') || [];
  }, [allTournaments]);
  
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
         <p className="text-muted-foreground">Join an upcoming arena tournament or view past results.</p>
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
            {visibleTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
        </div>
      )}
    </div>
  );
}
