'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';
import type { User as UserType } from '@/lib/types';
import { Chess } from 'chess.js';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface InviteButtonProps {
    inviter: FirebaseUser | null;
    invitee: UserType;
}

export function InviteButton({ inviter, invitee }: InviteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!inviter) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'You must be logged in to invite a player.',
      });
      return;
    }

    setIsPending(true);

    try {
      const gamesCollection = collection(firestore, 'games');
      const newGame = new Chess();

      await addDoc(gamesCollection, {
        player1Id: inviter.uid,
        player2Id: invitee.id,
        player1: {
          id: inviter.uid,
          name: inviter.displayName,
          avatarUrl: inviter.photoURL || PlaceHolderImages[0].imageUrl,
          elo: 1200, // Placeholder
        },
        player2: {
          id: invitee.id,
          name: invitee.username,
          avatarUrl: invitee.avatarUrl || PlaceHolderImages[1].imageUrl,
          elo: invitee.eloRating,
        },
        status: 'invited',
        createdAt: serverTimestamp(),
        fen: newGame.fen(),
        turn: 'w',
      });

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

  return (
    <Button
      size="sm"
      onClick={handleInvite}
      disabled={isPending || !inviter}
    >
      {isPending ? 'Pending...' : 'Invite'}
    </Button>
  );
}
