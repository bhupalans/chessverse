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
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateGameDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreateGame = () => {
    // Mock game creation and redirect
    const gameId = `game-${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/game/${gameId}`);
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
            Create a new game and wait for another player to join.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            A new game will be created in the lobby. Once another player joins, the match will begin.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGame}>Create Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
