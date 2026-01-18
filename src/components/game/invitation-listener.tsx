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
  // ✅ Hooks are ALWAYS called in the same order
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const displayedToasts = useRef<Map<string, string>>(new Map());

  // ✅ Query exists ONLY when user exists
  const invitationsQuery = useMemoFirebase(() => {
    if (!user) return undefined;

    return query(
      collection(firestore, 'games'),
      where('player2Id', '==', user.uid),
      where('status', '==', 'invited')
    );
  }, [firestore, user?.uid]);

  // ✅ Safe: hook handles undefined by doing nothing
  const { data: invitations } = useCollection<Game>(invitationsQuery);

  useEffect(() => {
    if (!user || !invitations) return;

    const currentInvitationIds = new Set(invitations.map(inv => inv.id));

    displayedToasts.current.forEach((toastId, gameId) => {
      if (!currentInvitationIds.has(gameId)) {
        dismiss(toastId);
        displayedToasts.current.delete(gameId);
      }
    });

    invitations.forEach((invitation) => {
      if (displayedToasts.current.has(invitation.id)) return;

      const inviterName = invitation.player1?.username || 'Another player';

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
                const gameRef = doc(firestore, 'games', invitation.id);
                await updateDoc(gameRef, { status: 'inprogress' });
                router.push(`/game/${invitation.id}`);
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
                const gameRef = doc(firestore, 'games', invitation.id);
                await deleteDoc(gameRef);
              }}
            >
              Decline
            </Button>
          </div>
        ) as ToastActionElement,
        onClose: () => {
          displayedToasts.current.delete(invitation.id);
        }
      });

      if (toastId) {
        displayedToasts.current.set(invitation.id, toastId);
      }
    });
  }, [user, invitations, firestore, router, toast, dismiss]);

  return null;
}
