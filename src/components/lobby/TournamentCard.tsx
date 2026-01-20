'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { Tournament as TournamentType } from '@/lib/types';

interface TournamentCardProps {
    tournament: TournamentType | null;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
    const router = useRouter();

    if (!tournament) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="text-muted-foreground" />
                        No Active Arenas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">There are no tournaments running right now. Check back soon for the next one!</p>
                </CardContent>
            </Card>
        );
    }

    const { state, name, playerCount, maxPlayers, startTime } = tournament;

    if (state === 'live') {
        return (
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trophy /> Arena Live
                    </CardTitle>
                    <CardDescription className="text-lg font-semibold">{name}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{playerCount} / {maxPlayers} players</span>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/tournaments')}>Go to Arena</Button>
                </CardFooter>
            </Card>
        );
    }

    if (state === 'published') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="text-muted-foreground" />
                        Upcoming Arena
                    </CardTitle>
                    <CardDescription className="text-lg font-semibold">{name}</CardDescription>
                </CardHeader>
                <CardContent>
                     <p className="text-muted-foreground">Starts at {format(startTime.toDate(), 'p')}</p>
                </CardContent>
                <CardFooter>
                    <Button variant="secondary" className="w-full" onClick={() => router.push('/tournaments')}>View Tournaments</Button>
                </CardFooter>
            </Card>
        );
    }

    // Should not render for other states based on the parent query
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-muted-foreground" />
            No Active Arenas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            There are no tournaments running right now. Check back soon for the
            next one!
          </p>
        </CardContent>
      </Card>
    );
}
