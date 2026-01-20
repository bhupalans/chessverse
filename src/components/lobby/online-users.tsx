'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as UserType } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { InviteButton } from './invite-button';
import { Button } from '@/components/ui/button';

export function OnlineUsers() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(firestore, 'users'),
      where('onlineStatus', '==', 'online')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const usersData: UserType[] = [];
        querySnapshot.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() } as UserType);
        });

        // Filter out the current user if they are logged in
        const otherUsers = user
          ? usersData.filter((onlineUser) => onlineUser.id !== user.uid)
          : usersData;

        setOnlineUsers(otherUsers);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching online users:', error);
        setIsLoading(false);
        // Do not throw UI errors
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  const showLoadingState = isLoading || isUserLoading;

  if (!isUserLoading && !user) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="hidden sm:table-cell">ELO</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                Please log in to see online users.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="hidden sm:table-cell">ELO</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showLoadingState &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-9 w-24 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          {!showLoadingState && onlineUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                No other players are online right now.
              </TableCell>
            </TableRow>
          )}
          {!showLoadingState &&
            onlineUsers.map((otherUser) => (
              <TableRow key={otherUser.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={otherUser.avatarUrl} alt="Avatar" />
                      <AvatarFallback>{otherUser.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{otherUser.username}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{otherUser.eloRating || 1200}</TableCell>
                <TableCell className="text-right">
                  {otherUser.activeGameId ? (
                    <Button size="sm" disabled>In Game</Button>
                  ) : (
                    <InviteButton inviter={user} invitee={otherUser} />
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
