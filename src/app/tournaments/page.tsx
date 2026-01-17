'use client';

import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, DocumentData } from 'firebase/firestore';
import type { Tournament as TournamentType, TournamentPlayer, TimeControl } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, Gamepad2, Hourglass, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to format time control
const formatTimeControl = (timeControl: TimeControl): string => {
  const initialMinutes = timeControl.initial / 60000;
  const incrementSeconds = timeControl.increment / 1000;
  if (initialMinutes === 1 && incrementSeconds === 0) return 'Bullet (1+0)';
  if (initialMinutes === 3 && incrementSeconds === 0) return 'Blitz (3+0)';
  if (initialMinutes === 5 && incrementSeconds === 0) return 'Blitz (5+0)';
  if (initialMinutes === 10 && incrementSeconds === 5) return 'Rapid (10+5)';
  return `${initialMinutes}+${incrementSeconds}`;
};

function TournamentCard({ tournament }: { tournament: TournamentType }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const playersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tournaments', tournament.id, 'players');
  }, [firestore, tournament.id]);

  const { data: players, isLoading: arePlayersLoading } = useCollection<TournamentPlayer>(playersQuery);

  const playerCount = players?.length || 0;
  const currentUserPlayerData = players?.find(p => p.id === user?.uid);

  const handleCardClick = () => {
    if (currentUserPlayerData?.activeGameId) {
      router.push(`/game/${currentUserPlayerData.activeGameId}`);
    }
    // For now, no action if not in a game, as per instructions.
  };

  const getStatusBadge = () => {
    if (!currentUserPlayerData) {
      return null; // or a "Join" button in the future
    }
    if (currentUserPlayerData.activeGameId) {
      return <Badge variant="default" className="bg-green-600/80"><Gamepad2 className="mr-1 h-3 w-3" />In Game</Badge>;
    }
    if (tournament.status === 'running') {
        return <Badge variant="secondary"><Hourglass className="mr-1 h-3 w-3" />Waiting</Badge>;
    }
    if (tournament.status === 'completed') {
        return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
    }
    return null;
  };
  
  return (
    <Card
      onClick={handleCardClick}
      className={cn("transition-all hover:shadow-md", currentUserPlayerData?.activeGameId && "cursor-pointer hover:border-primary")}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle>{tournament.name}</CardTitle>
                 <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTimeControl(tournament.timeControl)}</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {arePlayersLoading ? '...' : playerCount} Players</span>
                 </CardDescription>
            </div>
            {getStatusBadge()}
        </div>
      </CardHeader>
      {currentUserPlayerData && (
         <CardContent>
            <div className="text-sm text-muted-foreground">
                Your Progress: <span className="font-bold text-foreground">{currentUserPlayerData.score} Points ({currentUserPlayerData.gamesPlayed} Games)</span>
            </div>
         </CardContent>
      )}
    </Card>
  );
}


export default function TournamentsPage() {
  const firestore = useFirestore();

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'tournaments'),
      where('status', '==', 'running')
    );
  }, [firestore]);

  const { data: tournaments, isLoading } = useCollection<TournamentType>(tournamentsQuery);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Active Tournaments</h1>
            <p className="text-muted-foreground">Join the fray or see where you stand.</p>
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
                    <Skeleton className="h-4 w-1/4" />
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
            <h3 className="text-xl font-semibold">No Active Tournaments</h3>
            <p className="text-muted-foreground mt-2">Check back later! New tournaments are scheduled regularly.</p>
        </div>
      )}
    </div>
  );
}
