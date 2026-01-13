
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { TimeControl } from '@/lib/types';


const timeControlPresets: { name: string; value: TimeControl }[] = [
  { name: 'Bullet (1+0)', value: { initial: 60000, increment: 0 } },
  { name: 'Blitz (5+0)', value: { initial: 300000, increment: 0 } },
  { name: 'Rapid (10+5)', value: { initial: 600000, increment: 5000 } },
];

export function CreateGameDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(timeControlPresets[1].value);
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
        timeControl: selectedTimeControl,
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
            Choose your opponent and time control.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
           <div className="space-y-3">
              <Label>Time Control</Label>
              <RadioGroup
                defaultValue={JSON.stringify(selectedTimeControl)}
                onValueChange={(value) => setSelectedTimeControl(JSON.parse(value))}
              >
                {timeControlPresets.map((preset) => (
                  <div key={preset.name} className="flex items-center space-x-2">
                    <RadioGroupItem value={JSON.stringify(preset.value)} id={preset.name} />
                    <Label htmlFor={preset.name}>{preset.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
           <div className="grid grid-cols-2 gap-4">
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
        </div>
        {!user && <p className="text-center text-sm text-muted-foreground">Log in to play against another player.</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    