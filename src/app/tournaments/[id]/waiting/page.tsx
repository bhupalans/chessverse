'use client';

import { Button } from "@/components/ui/button";
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TournamentPlayer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function TournamentWaitingRoom() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const tournamentId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const playerDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !tournamentId) return null;
    return doc(firestore, 'tournaments', tournamentId, 'players', user.uid);
  }, [firestore, user?.uid, tournamentId]);

  const { data: playerDoc, isLoading: isPlayerDocLoading } = useDoc<TournamentPlayer>(playerDocRef);

  useEffect(() => {
    if (playerDoc?.activeGameId) {
      router.push(`/game/${playerDoc.activeGameId}`);
    }
  }, [playerDoc, router]);

  if (isUserLoading || isPlayerDocLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!playerDoc && !isPlayerDocLoading) {
     return (
       <div className="flex h-full items-center justify-center p-4">
         <Card className="w-full max-w-md text-center">
           <CardHeader>
             <CardTitle>Not in Tournament</CardTitle>
             <CardDescription>
               You are not currently a participant in this tournament.
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Button onClick={() => router.push('/tournaments')}>Back to Tournaments</Button>
           </CardContent>
         </Card>
       </div>
     );
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Waiting for your next match...</CardTitle>
          <CardDescription>
            You have been returned to the tournament pool. Please wait while we find your next opponent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">You will be automatically redirected when your game is ready.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TournamentWaitingPage() {
    return (
        <div className="container mx-auto h-[calc(100vh-3.5rem)]">
            <TournamentWaitingRoom />
        </div>
    );
}
