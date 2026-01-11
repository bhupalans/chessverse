'use client';

import { useEffect, useRef } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { Game } from '@/lib/types';
import type { ToastActionElement } from '@/components/ui/toast';

export function InvitationListener() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const displayedToasts = useRef<Map<string, string>>(new Map());

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
    const currentInvitationIds = new Set(invitations?.map(inv => inv.id) || []);

    // Dismiss toasts for invitations that are no longer active
    displayedToasts.current.forEach((toastId, gameId) => {
      if (!currentInvitationIds.has(gameId)) {
        dismiss(toastId);
        displayedToasts.current.delete(gameId);
      }
    });

    if (invitations && invitations.length > 0) {
      invitations.forEach((invitation) => {
        // Only show a toast if one for this game isn't already displayed
        if (!displayedToasts.current.has(invitation.id)) {
          const inviterName = invitation.player1?.name || 'Another player';
          
          const { id: toastId, dismiss: dismissToast } = toast({
            title: 'Game Invitation',
            description: `${inviterName} has invited you to a game.`,
            duration: Infinity,
            action: (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    dismissToast();
                    displayedToasts.current.delete(invitation.id);
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
                    dismissToast();
                    displayedToasts.current.delete(invitation.id);
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
            ) as ToastActionElement,
            onClose: () => {
              displayedToasts.current.delete(invitation.id);
            },
            onDismiss: () => {
              displayedToasts.current.delete(invitation.id);
            }
          });

          if(toastId) {
            displayedToasts.current.set(invitation.id, toastId);
          }
        }
      });
    }
  }, [invitations, firestore, router, toast, dismiss]);

  return null; // This component does not render anything
}
