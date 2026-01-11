
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Handshake } from 'lucide-react';
import { ClassicChessPieces } from '../icons/chess-pieces/classic';

interface GameOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  winnerName: string;
  reason: string;
}

export function GameOverDialog({ isOpen, onClose, winnerName, reason }: GameOverDialogProps) {
  const isDraw = winnerName === 'draw';
  
  // Determine winner color. 'You' corresponds to the human player vs the bot.
  // In a bot game, the human is always white.
  const winnerColor = winnerName.toLowerCase().includes('white') || winnerName === 'You' ? 'w' : 'b';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Game Over</DialogTitle>
          <DialogDescription>{reason}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          {isDraw ? (
            <Handshake className="w-24 h-24 text-muted-foreground" />
          ) : (
             <div className="relative">
                <Crown className="w-16 h-16 text-yellow-400 absolute -top-8 -left-4 -rotate-12" />
                <div className="w-24 h-24">
                   <ClassicChessPieces type="k" color={winnerColor} />
                </div>
            </div>
          )}
          <p className="text-xl font-semibold">
            {isDraw ? "It's a Draw!" : `${winnerName} Wins!`}
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={onClose}>
            Back to Lobby
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
