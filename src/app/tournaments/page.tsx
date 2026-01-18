'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Tournament as TournamentType, TimeControl } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

// Helper function to format time control
const formatTimeControl = (timeControl: TimeControl): string => {
  if (!timeControl) return 'Unknown';
  const initialMinutes = Math.floor(timeControl.initial / 60000);
  const incrementSeconds = Math.floor(timeControl.increment / 1000);
  
  if (initialMinutes === 1 && incrementSeconds === 0) return '1+0 Bullet';
  if (initialMinutes === 3 && incrementSeconds === 0) return '3+0 Blitz';
  if (initialMinutes === 5 && incrementSeconds === 0) return '5+0 Blitz';
  if (initialMinutes === 10 && incrementSeconds === 5) return '10+5 Rapid';
  return `${initialMinutes}+${incrementSeconds}`;
};

function TournamentCard({ tournament }: { tournament: TournamentType }) {
  const getStatusBadge = () => {
    const state = tournament.state;
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    let text: string = state.charAt(0).toUpperCase() + state.slice(1);

    if (state === 'live') {
      variant = 'destructive';
      text = 'Live';
    } else if (state === 'published') {
      variant = 'default';
      text = 'Open';
    }

    return <Badge variant={variant}>{text}</Badge>;
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{tournament.name}</CardTitle>
            <CardDescription className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {formatTimeControl(tournament.timeControl)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {tournament.playerCount} / {tournament.maxPlayers}
              </span>
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Starts:{' '}
          <span className="font-semibold text-foreground">
            {format(tournament.startTime.toDate(), 'MMM d, h:mm a')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TournamentsPage() {
  const firestore = useFirestore();

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'tournaments'),
      where('state', 'in', ['published', 'live']),
      orderBy('startTime', 'asc')
    );
  }, [firestore]);

  const { data: tournaments, isLoading } = useCollection<TournamentType>(tournamentsQuery);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
        <p className="text-muted-foreground">Join a tournament and test your skills.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && tournaments && tournaments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}

      {!isLoading && (!tournaments || tournaments.length === 0) && (
        <div className="flex flex-col items-center justify-center text-center rounded-lg border border-dashed p-12">
          <h3 className="text-xl font-semibold">No Tournaments Available</h3>
          <p className="text-muted-foreground mt-2">
            Check back later! New tournaments are scheduled regularly.
          </p>
        </div>
      )}
    </div>
  );
}
