'use client';

import { useState, useTransition } from 'react';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateAiChessOpponent } from '@/ai/flows/generate-ai-chess-opponent';
import { Loader2, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameType = 'human' | 'ai';
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export function CreateGameDialog({ completedGames }: { completedGames: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameType, setGameType] = useState<GameType>('human');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [suggestedDifficulty, setSuggestedDifficulty] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleGameTypeChange = (value: GameType) => {
    setGameType(value);
    if (value === 'ai' && !suggestedDifficulty) {
      startTransition(async () => {
        const result = await generateAiChessOpponent({ completedGames });
        setSuggestedDifficulty(result.opponentLevel);
        setDifficulty(result.opponentLevel as Difficulty);
      });
    }
  };

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
            Choose your opponent and start a new match.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <Label>Opponent</Label>
            <RadioGroup
              defaultValue="human"
              onValueChange={(value: string) => handleGameTypeChange(value as GameType)}
              className="flex gap-4"
            >
              <Label
                htmlFor="human"
                className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="human" id="human" className="sr-only" />
                Human
              </Label>
              <Label
                htmlFor="ai"
                className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="ai" id="ai" className="sr-only" />
                AI
              </Label>
            </RadioGroup>
          </div>
          {gameType === 'ai' && (
            <div className="grid gap-4">
              <Label>AI Difficulty</Label>
              {isPending ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2">Suggesting difficulty...</span>
                </div>
              ) : (
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value: string) => setDifficulty(value as Difficulty)}
                  className="grid grid-cols-3 gap-4"
                >
                  {(['Beginner', 'Intermediate', 'Advanced'] as Difficulty[]).map(level => (
                    <div key={level}>
                      <RadioGroupItem value={level} id={level.toLowerCase()} className="peer sr-only" />
                      <Label
                        htmlFor={level.toLowerCase()}
                        className="relative flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        {level}
                        {suggestedDifficulty === level && (
                          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                            Rec.
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGame}>Start Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
