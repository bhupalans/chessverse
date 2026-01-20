
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy } from 'lucide-react';
import type { Tournament } from '@/lib/types';


const INTERMISSION_DURATION = 30; // seconds

export default function TournamentIntermissionPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const tournamentId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

    const tournamentDocRef = useMemoFirebase(() => {
        if (!firestore || !tournamentId) return null;
        return doc(firestore, 'tournaments', tournamentId);
    }, [firestore, tournamentId]);

    const { data: tournament, isLoading: isTournamentLoading } = useDoc<Tournament>(tournamentDocRef);

    const [countdown, setCountdown] = useState(INTERMISSION_DURATION);
    const [status, setStatus] = useState<'countdown' | 'checking' | 'waiting' | 'completed'>('countdown');

    // Effect to react to tournament completion
    useEffect(() => {
        if (tournament?.state === 'completed' || tournament?.state === 'archived') {
            setStatus('completed');
        }
    }, [tournament]);

    // Countdown effect
    useEffect(() => {
        if (status !== 'countdown') return;

        if (countdown <= 0) {
            setStatus('checking');
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, status]);

    // Check for game effect (polling)
    useEffect(() => {
        if (status !== 'checking' && status !== 'waiting') return;
        
        let pollInterval: NodeJS.Timeout | undefined;

        const checkForGame = async () => {
            if (!user || !firestore || !tournamentId) return;

            const playerDocRef = doc(firestore, 'tournaments', tournamentId, 'players', user.uid);
            try {
                const playerDocSnap = await getDoc(playerDocRef);
                if (playerDocSnap.exists()) {
                    const playerData = playerDocSnap.data();
                    if (playerData.activeGameId) {
                        router.push(`/game/${playerData.activeGameId}`);
                        if (pollInterval) clearInterval(pollInterval);
                        return; // Stop polling
                    }
                }
                // If no active game, set to waiting (if not already)
                if (status !== 'waiting') {
                    setStatus('waiting');
                }
            } catch (error) {
                console.error("Error checking for next game:", error);
                // Handle error, maybe show a message and a retry button
            }
        };

        if (status === 'checking') {
            checkForGame(); // Initial check
        }
        
        if (status === 'waiting') {
            // After initial check fails, start polling
             pollInterval = setInterval(checkForGame, 5000);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [status, user, firestore, tournamentId, router]);


    const renderContent = () => {
        if (isUserLoading || isTournamentLoading) {
             return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
        }
        
        switch (status) {
            case 'countdown':
                return (
                    <>
                        <CardHeader>
                            <CardTitle>Game Finished</CardTitle>
                            <CardDescription>Preparing your next opponent...</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center py-8">
                            <div className="text-sm text-muted-foreground">Next round in</div>
                            <div className="text-6xl font-bold tabular-nums">{countdown}</div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="secondary" className="w-full" onClick={() => router.push('/tournaments')}>
                                Leave Tournament
                            </Button>
                        </CardFooter>
                    </>
                );
            case 'checking':
            case 'waiting':
                return (
                     <>
                        <CardHeader>
                            <CardTitle>Waiting for Opponent</CardTitle>
                            <CardDescription>We're finding your next match. You'll be redirected shortly.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-8">
                           <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                        </CardContent>
                        <CardFooter>
                             <Button variant="secondary" className="w-full" onClick={() => router.push('/tournaments')}>
                                Leave Tournament
                            </Button>
                        </CardFooter>
                    </>
                );
            case 'completed':
                 return (
                    <>
                        <CardHeader>
                            <CardTitle>Tournament Over</CardTitle>
                            <CardDescription>The tournament has finished. Thanks for playing!</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-8">
                           <Trophy className="h-12 w-12 text-amber-400" />
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => router.push('/tournaments')}>
                                Back to Tournaments
                            </Button>
                        </CardFooter>
                    </>
                );
        }
    };
    
    return (
        <div className="container mx-auto h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
             <Card className="w-full max-w-md text-center">
                {renderContent()}
            </Card>
        </div>
    )
}
