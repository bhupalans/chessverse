'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tournament } from '@/lib/types';
import { format } from 'date-fns';
import { TournamentActions } from './tournament-actions';
import { useRouter } from 'next/navigation';

export function AdminTournamentsTable({
  tournaments,
  isLoading,
}: {
  tournaments: Tournament[] | null;
  isLoading: boolean;
}) {
  const router = useRouter();

  const handleRowClick = (tournamentId: string) => {
    router.push(`/admin/tournaments/${tournamentId}`);
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Players</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))}
          {!isLoading &&
            tournaments?.map((t) => (
              <TableRow
                key={t.id}
                onClick={() => handleRowClick(t.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <Badge variant={t.state === 'live' ? 'destructive' : 'secondary'}>
                    {t.state}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(t.startTime.toDate(), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell>
                  {t.playerCount} / {t.maxPlayers}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <TournamentActions tournament={t} />
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && tournaments?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No tournaments found.</TableCell>
                </TableRow>
            )}
        </TableBody>
      </Table>
    </div>
  );
}
