'use client';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Tournament } from '@/lib/types';
import { MoreHorizontal, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TournamentActions({ tournament }: { tournament: Tournament }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const callFunction = async (functionName: string, confirmation: string) => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      const func = httpsCallable(functions, functionName);
      await func({ tournamentId: tournament.id });
      toast({
        title: 'Success',
        description: confirmation,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      const deleteTournament = httpsCallable(functions, 'deleteTournament');
      await deleteTournament({ tournamentId: tournament.id });
      toast({
        title: 'Tournament Deleted',
        description: `'${tournament.name}' has been successfully deleted.`,
      });
    } catch (error: any) {
      console.error('Delete error', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete tournament',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderActions = () => {
    switch (tournament.state) {
      case 'draft':
        return (
          <>
            <DropdownMenuItem
              onClick={() => callFunction('publishTournament', 'Tournament has been published.')}
              disabled={isLoading}
            >
              Publish
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                  disabled={isLoading}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the draft tournament "{tournament.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={handleDeleteTournament}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      case 'published':
        return (
          <DropdownMenuItem
            onClick={() => callFunction('lockTournamentEarly', 'Tournament has been locked.')}
            disabled={isLoading}
          >
            Lock Early
          </DropdownMenuItem>
        );
      case 'completed':
        return (
          <DropdownMenuItem
             onClick={() => callFunction('archiveTournament', 'Tournament has been archived.')}
            disabled={isLoading}
          >
            Archive
          </DropdownMenuItem>
        );
      default:
        return <DropdownMenuItem disabled>No actions available</DropdownMenuItem>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{renderActions()}</DropdownMenuContent>
    </DropdownMenu>
  );
}
