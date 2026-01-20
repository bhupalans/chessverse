'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnlineUsers } from '@/components/lobby/online-users';
import { CreateGameDialog } from '@/components/lobby/create-game-dialog';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, limit, orderBy, getDoc } from 'firebase/firestore';
import type { User as UserType, Tournament as TournamentType } from '@/lib/types';
import { UserActivityStrip } from '@/components/lobby/UserActivityStrip';
import { TournamentCard } from '@/components/lobby/TournamentCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function LobbyPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [currentUserData, setCurrentUserData] = useState<UserType | null>(null);
    const [activeTournament, setActiveTournament] = useState<TournamentType | null>(null);
    const [isPlayerInTournament, setIsPlayerInTournament] = useState(false);
    
    const [isTournamentLoading, setIsTournamentLoading] = useState(true);

    // Effect for current user data (activeGameId, etc.)
    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setCurrentUserData({ id: doc.id, ...doc.data() } as UserType);
            }
        }, (error) => {
            console.error("Error fetching user data:", error);
            // Don't throw UI errors
        });

        return () => unsubscribe();
    }, [user, firestore]);

    // Effect for tournament data (live/published)
    useEffect(() => {
        if (!firestore) return;
        setIsTournamentLoading(true);

        const fetchTournamentData = async () => {
            try {
                const q = query(
                    collection(firestore, 'tournaments'), 
                    where('state', 'in', ['live', 'published']), 
                    orderBy('startTime', 'asc'), 
                    limit(1)
                );
                
                const tournamentSnapshot = await getDocs(q);

                if (!tournamentSnapshot.empty) {
                    const tournamentData = { id: tournamentSnapshot.docs[0].id, ...tournamentSnapshot.docs[0].data() } as TournamentType;
                    setActiveTournament(tournamentData);
                    
                    // Check if the current user is a player in this tournament
                    if (user && tournamentData.state !== 'completed' && tournamentData.state !== 'archived') {
                        const playerDocRef = doc(firestore, 'tournaments', tournamentData.id, 'players', user.uid);
                        const playerDocSnap = await getDoc(playerDocRef);
                        setIsPlayerInTournament(playerDocSnap.exists());
                    } else {
                        setIsPlayerInTournament(false);
                    }
                } else {
                    setActiveTournament(null);
                    setIsPlayerInTournament(false);
                }
            } catch (error) {
                console.error("Error fetching tournament data:", error);
                setActiveTournament(null);
                setIsPlayerInTournament(false);
            } finally {
                setIsTournamentLoading(false);
            }
        };

        fetchTournamentData();
    }, [user, firestore]);
    
    const isLoading = isUserLoading || (user && !currentUserData) || isTournamentLoading;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {isLoading && user ? (
                <Skeleton className="h-14 w-full" />
            ) : user && (
                <UserActivityStrip 
                    activeGameId={currentUserData?.activeGameId} 
                    isPlayerInTournament={isPlayerInTournament} 
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold">
                                    Players Online
                                </CardTitle>
                                <CardDescription>
                                    Challenge another player to a live chess match.
                                </CardDescription>
                            </div>
                            <CreateGameDialog />
                        </CardHeader>
                        <CardContent>
                            <OnlineUsers />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 flex flex-col">
                    {isLoading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : (
                        <TournamentCard tournament={activeTournament} />
                    )}
                </div>
            </div>
        </div>
    );
}
