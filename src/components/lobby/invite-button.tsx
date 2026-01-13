
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';
import type { Game, User as UserType, TimeControl } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface InviteButtonProps {
    inviter: FirebaseUser | null;
    invitee: UserType;
}

const timeControlPresets: { name: string; value: TimeControl }[] = [
  { name: 'Bullet (1+0)', value: { initial: 60000, increment: 0 } },
  { name: 'Blitz (5+0)', value: { initial: 300000, increment: 0 } },
  { name: 'Rapid (10+5)', value: { initial: 600000, increment: 5000 } },
];


export function InviteButton({ inviter, invitee }: InviteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(timeControlPresets[1].value);

  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const gameRef = useMemoFirebase(() => {
    if (!firestore || !gameId) return null;
    return doc(firestore, 'games', gameId);
  }, [firestore, gameId]);


  useEffect(() => {
    if (!gameRef) return;

    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const game = doc.data() as Game;
        if (game.status === 'inprogress') {
          router.push(`/game/${doc.id}`);
        } else if (game.status !== 'invited') {
          // Game was declined or aborted
          setIsPending(false);
          setGameId(null);
        }
      } else {
        // Game document deleted (declined)
        setIsPending(false);
        setGameId(null);
      }
    });

    return () => unsubscribe();
  }, [gameRef, router]);

  const handleInvite = async () => {
    if (!inviter) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'You must be logged in to invite a player.',
      });
      return;
    }

    setIsPopoverOpen(false);
    setIsPending(true);

    try {
      const gamesCollection = collection(firestore, 'games');

      const newGameDoc = await addDoc(gamesCollection, {
        player1Id: inviter.uid,
        player2Id: invitee.id,
        player1Color: 'w',
        player2Color: 'b',
        player1: {
          id: inviter.uid,
          username: inviter.displayName,
          avatarUrl: inviter.photoURL || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl,
          eloRating: 1200, // Placeholder
        },
        player2: {
          id: invitee.id,
          username: invitee.username,
          avatarUrl: invitee.avatarUrl || PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl,
          eloRating: invitee.eloRating,
        },
        status: 'invited',
        createdAt: serverTimestamp(),
        turn: 'w',
        timeControl: selectedTimeControl,
      });
      
      setGameId(newGameDoc.id);

      toast({
        title: 'Invitation Sent',
        description: `Your invitation to ${invitee.username} has been sent.`,
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send invitation. Please try again.',
      });
      setIsPending(false);
    }
  };

  if (isPending) {
    return <Button size="sm" disabled>Pending...</Button>
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          disabled={!inviter}
        >
          Invite
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Select Time Control</h4>
            <p className="text-sm text-muted-foreground">
              Choose the time format for this game.
            </p>
          </div>
           <RadioGroup
              defaultValue={JSON.stringify(selectedTimeControl)}
              onValueChange={(value) => setSelectedTimeControl(JSON.parse(value))}
            >
              {timeControlPresets.map((preset) => (
                <div key={preset.name} className="flex items-center space-x-2">
                  <RadioGroupItem value={JSON.stringify(preset.value)} id={`invite-${preset.name}`} />
                  <Label htmlFor={`invite-${preset.name}`}>{preset.name}</Label>
                </div>
              ))}
            </RadioGroup>
          <Button onClick={handleInvite}>Send Invite</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
