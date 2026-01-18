'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { AdminTournamentsTable } from '@/components/admin/tournaments-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Tournament } from '@/lib/types';

export default function AdminTournamentsPage() {
  const firestore = useFirestore();
  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tournaments'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: tournaments, isLoading } = useCollection<Tournament>(tournamentsQuery);
  
  return (
    <div className="container mx-auto py-8">
       <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Tournaments</CardTitle>
              <CardDescription>Manage all scheduled, active, and completed tournaments.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/admin/tournaments/new">
                <PlusCircle className="mr-2" />
                Create Tournament
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AdminTournamentsTable tournaments={tournaments} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
