'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface UserActivityStripProps {
    activeGameId?: string | null;
    isPlayerInTournament: boolean;
}

export function UserActivityStrip({ activeGameId, isPlayerInTournament }: UserActivityStripProps) {
    const router = useRouter();

    if (activeGameId) {
        return (
            <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                <p className="font-medium text-primary">You have an active game.</p>
                <Button onClick={() => router.push(`/game/${activeGameId}`)}>Resume Game</Button>
            </div>
        );
    }

    if (isPlayerInTournament) {
        return (
            <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                <p className="font-medium text-primary">You're participating in an arena tournament.</p>
                <Button onClick={() => router.push('/tournaments')}>Go to Tournament</Button>
            </div>
        );
    }
    
    // Idle state
    return (
        <div className="p-4 bg-secondary rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">You're ready to play. Challenge a player or start a new game!</p>
        </div>
    );
}
