'use client';

import { useEffect } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { Game } from '@/lib/types';

export function InvitationListener() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const invitationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'games'),
      where('player2Id', '==', user.uid),
      where('status', '==', 'invited')
    );
  }, [firestore, user]);

  const { data: invitations } = useCollection<Game>(invitationsQuery);

  useEffect(() => {
    if (invitations && invitations.length > 0) {
      invitations.forEach((invitation) => {
        const inviterName = invitation.player1?.name || 'Another player';
        
        toast({
          title: 'Game Invitation',
          description: `${inviterName} has invited you to a game.`,
          duration: Infinity,
          action: (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const gameRef = doc(firestore, 'games', invitation.id);
                    await updateDoc(gameRef, { status: 'inprogress' });
                    router.push(`/game/${invitation.id}`);
                  } catch (e) {
                     console.error("Failed to accept invitation", e)
                  }
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                     const gameRef = doc(firestore, 'games', invitation.id);
                     await deleteDoc(gameRef);
                  } catch(e) {
                      console.error("Failed to decline invitation", e)
                  }
                }}
              >
                Decline
              </Button>
            </div>
          ),
        });
      });
    }
  }, [invitations, firestore, router, toast]);

  return null; // This component does not render anything
}
