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
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { InviteButton } from './invite-button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function OnlineUsers() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    // Only create the query if the user is logged in and firestore is available.
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('onlineStatus', '==', 'online'));
  }, [firestore, user]);

  const { data: onlineUsers, isLoading } = useCollection<UserType>(usersQuery);

  const otherUsers = onlineUsers?.filter(onlineUser => onlineUser.id !== user?.uid);

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
          {(isLoading || isUserLoading) && (
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
            ))
          )}
          {!isLoading && !isUserLoading && otherUsers && otherUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                No other players are online right now.
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isUserLoading && otherUsers?.map((otherUser) => (
            <TableRow key={otherUser.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={otherUser.avatarUrl || PlaceHolderImages[0].imageUrl} alt="Avatar" />
                    <AvatarFallback>{otherUser.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{otherUser.username}</div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{otherUser.eloRating || 1200}</TableCell>
              <TableCell className="text-right">
                <InviteButton
                  inviter={user}
                  invitee={otherUser}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
