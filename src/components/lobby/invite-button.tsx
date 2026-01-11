'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';
import type { Game, User as UserType } from '@/lib/types';
import { Chess } from 'chess.js';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';

interface InviteButtonProps {
    inviter: FirebaseUser | null;
    invitee: UserType;
}

export function InviteButton({ inviter, invitee }: InviteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
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
        }
        // Could also handle 'declined' status here
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

    setIsPending(true);

    try {
      const gamesCollection = collection(firestore, 'games');
      const newGame = new Chess();

      const newGameDoc = await addDoc(gamesCollection, {
        player1Id: inviter.uid,
        player2Id: invitee.id,
        player1: {
          id: inviter.uid,
          name: inviter.displayName,
          avatarUrl: inviter.photoURL || PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl,
          elo: 1200, // Placeholder
        },
        player2: {
          id: invitee.id,
          name: invitee.username,
          avatarUrl: invitee.avatarUrl || PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl,
          elo: invitee.eloRating,
        },
        status: 'invited',
        createdAt: serverTimestamp(),
        fen: newGame.fen(),
        turn: 'w',
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
