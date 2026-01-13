
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bot, PlusCircle, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Chess } from 'chess.js';

export function CreateGameDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleCreateBotGame = () => {
    setIsOpen(false);
    router.push(`/game/bot-game-${Date.now()}?play=bot`);
  };

  const handleCreatePlayerGame = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'You must be logged in to create a game.',
      });
      return;
    }

    try {
      const gamesCollection = collection(firestore, 'games');
      const newGame = new Chess();
      const newGameDoc = await addDoc(gamesCollection, {
        player1Id: user.uid,
        player1: {
          id: user.uid,
          username: user.displayName || 'Anonymous',
          avatarUrl: user.photoURL || '',
          eloRating: 1200, // Placeholder ELO
        },
        status: 'waiting',
        createdAt: serverTimestamp(),
        fen: newGame.fen(),
        turn: 'w',
        timeControl: {
          initial: 300000, // 5 minutes
          increment: 0,
        },
      });
      router.push(`/game/${newGameDoc.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create game. Please try again.',
      });
    }

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Game</DialogTitle>
          <DialogDescription>
            Choose your opponent. Play against the bot or wait for another player.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col"
            onClick={handleCreateBotGame}
          >
            <Bot className="h-8 w-8 mb-2" />
            Play vs Bot
          </Button>
           <Button
            variant="outline"
            className="h-24 flex-col"
            onClick={handleCreatePlayerGame}
            disabled={!user}
          >
            <UserIcon className="h-8 w-8 mb-2" />
            Play vs Player
          </Button>
        </div>
        {!user && <p className="text-center text-sm text-muted-foreground">Log in to play against another player.</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    