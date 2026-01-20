'use client';

import { Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Game } from '@/lib/types';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { user, firestore, isUserLoading } = useFirebase();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  /* --------------------------------------------------
     FETCH (NO useCollection – NO RULE ISSUES)
  -------------------------------------------------- */
  useEffect(() => {
    if (!firestore || !user) return;

    let mounted = true;

    async function loadGames() {
      setLoading(true);

      const q = query(
        collection(firestore, 'games'),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc')
      );

      const snap = await getDocs(q);

      if (!mounted) return;

      const allGames = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as Game)
        .filter(
          g =>
            g.player1Id === user.uid ||
            g.player2Id === user.uid
        );

      setGames(allGames);
      setLoading(false);
    }

    loadGames();
    return () => {
      mounted = false;
    };
  }, [firestore, user]);

  /* --------------------------------------------------
     PAGINATION
  -------------------------------------------------- */
  const totalPages = Math.ceil(games.length / PAGE_SIZE);

  const pagedGames = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return games.slice(start, start + PAGE_SIZE);
  }, [games, page]);

  /* --------------------------------------------------
     SUMMARY
  -------------------------------------------------- */
  const summary = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let eloDelta = 0;

    games.forEach(g => {
      const isP1 = g.player1Id === user?.uid;
      const myColor = isP1 ? g.player1Color : g.player2Color;

      if (
        typeof g.whiteEloBefore === 'number' &&
        typeof g.whiteEloAfter === 'number' &&
        typeof g.blackEloBefore === 'number' &&
        typeof g.blackEloAfter === 'number'
      ) {
        eloDelta +=
          myColor === 'w'
            ? g.whiteEloAfter - g.whiteEloBefore
            : g.blackEloAfter - g.blackEloBefore;
      }

      if (g.winnerId && g.winnerId !== 'd') {
        const win =
          (myColor === 'w' && g.winnerId === 'w') ||
          (myColor === 'b' && g.winnerId === 'b');
        win ? wins++ : losses++;
      }
    });

    return {
      games: games.length,
      wins,
      losses,
      eloDelta,
    };
  }, [games, user]);

  /* --------------------------------------------------
     STATES
  -------------------------------------------------- */
  if (isUserLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <CenteredCard
        title="Game History"
        text="Please sign in to view your game history."
      />
    );
  }

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Game History</CardTitle>
          <CardDescription>
            Review your completed matches
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* SUMMARY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Stat label="Games" value={summary.games} />
            <Stat label="Wins" value={summary.wins} />
            <Stat label="Losses" value={summary.losses} />
            <Stat label="ELO Δ" value={summary.eloDelta} />
          </div>

          {/* TABLE */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="text-center">ELO</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}

                {!loading &&
                  pagedGames.map(game => (
                    <GameRow key={game.id} game={game} userId={user.uid} />
                  ))}

                {!loading && pagedGames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No completed games yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================================================
   COMPONENTS
====================================================== */

function GameRow({ game, userId }: { game: Game; userId: string }) {
  const isP1 = game.player1Id === userId;
  const opponent = isP1 ? game.player2 : game.player1;
  const myColor = isP1 ? game.player1Color : game.player2Color;

  let result: 'Win' | 'Loss' | 'Draw' = 'Draw';

  if (game.winnerId && game.winnerId !== 'd') {
    const win =
      (myColor === 'w' && game.winnerId === 'w') ||
      (myColor === 'b' && game.winnerId === 'b');
    result = win ? 'Win' : 'Loss';
  }

  let elo = 0;
  if (
    typeof game.whiteEloBefore === 'number' &&
    typeof game.whiteEloAfter === 'number' &&
    typeof game.blackEloBefore === 'number' &&
    typeof game.blackEloAfter === 'number'
  ) {
    elo =
      myColor === 'w'
        ? game.whiteEloAfter - game.whiteEloBefore
        : game.blackEloAfter - game.blackEloBefore;
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {opponent?.username?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div>
  <div className="flex items-center gap-2 font-medium">
    {Boolean(game.tournamentId || game.isTournamentGame) && (
      <Trophy
        className="h-4 w-4 text-amber-400"
        title="Tournament game"
      />
    )}
    <span>{opponent?.username}</span>
  </div>
  <div className="text-sm text-muted-foreground">
    ELO {opponent?.eloRating ?? '—'}
  </div>
</div>

        </div>
      </TableCell>

      <TableCell className="text-center">
        <Badge
          variant={
            result === 'Win'
              ? 'default'
              : result === 'Loss'
              ? 'destructive'
              : 'secondary'
          }
        >
          {result}
        </Badge>
      </TableCell>

      <TableCell
        className={`text-center font-medium ${
          elo > 0 ? 'text-green-500' : elo < 0 ? 'text-red-500' : ''
        }`}
      >
        {elo > 0 ? `+${elo}` : elo}
      </TableCell>

      <TableCell className="text-right text-muted-foreground">
        {game.completedAt
          ? format(
              new Date(game.completedAt.seconds * 1000),
              'MMM d, yyyy'
            )
          : '—'}
      </TableCell>
    </TableRow>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-8 w-32" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
    </TableRow>
  );
}

function PageSkeleton() {
  return (
    <div className="container mx-auto p-8">
      <Skeleton className="h-10 w-48 mb-4" />
      <Skeleton className="h-6 w-64 mb-8" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function CenteredCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          {text}
        </CardContent>
      </Card>
    </div>
  );
}
