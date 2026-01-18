'use client';
import { TournamentForm } from '@/components/admin/tournament-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { TournamentFormValues } from '@/components/admin/tournament-form';

export default function NewTournamentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateTournament = async (data: TournamentFormValues) => {
    try {
      const functions = getFunctions();
      const createTournament = httpsCallable(functions, 'createTournament');
      
      const payload = {
        ...data,
        startTime: new Date(data.startTime).getTime(),
        durationMinutes: Number(data.durationMinutes),
        maxPlayers: Number(data.maxPlayers),
      };

      await createTournament(payload);

      toast({
        title: 'Tournament Created',
        description: `${data.name} has been successfully created as a draft.`,
      });
      router.push('/admin/tournaments');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to create tournament',
        description: error.message,
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Tournament</CardTitle>
          <CardDescription>
            Define the parameters for a new tournament. It will be created in 'draft' state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TournamentForm onSubmit={handleCreateTournament} />
        </CardContent>
      </Card>
    </div>
  );
}
