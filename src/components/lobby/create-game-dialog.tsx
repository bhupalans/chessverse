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
import { Bot, PlusCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateGameDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreateGame = (isBotGame: boolean) => {
    const gameId = `game-${Math.random().toString(36).substr(2, 9)}`;
    const url = isBotGame ? `/game/${gameId}?play=bot` : `/game/${gameId}`;
    router.push(url);
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
            onClick={() => handleCreateGame(true)}
          >
            <Bot className="h-8 w-8 mb-2" />
            Play vs Bot
          </Button>
           <Button
            variant="outline"
            className="h-24 flex-col"
            onClick={() => handleCreateGame(false)}
          >
            <User className="h-8 w-8 mb-2" />
            Play vs Player
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
