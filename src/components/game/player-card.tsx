
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, Timer, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const formatTime = (timeInMilliseconds: number | null | undefined): string => {
  if (timeInMilliseconds === null || typeof timeInMilliseconds === 'undefined' || timeInMilliseconds < 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(timeInMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


export const PlayerCard = ({
  name,
  elo,
  avatar,
  isTurn,
  isBot = false,
  color,
  time,
  drawOffered,
  onDrawResponse,
}: {
  name: string;
  elo: number;
  avatar?: string;
  isTurn?: boolean;
  isBot?: boolean;
  color?: 'White' | 'Black';
  time?: number | null;
  drawOffered?: boolean;
  onDrawResponse?: (accept: boolean) => void;
}) => {
  const formattedTime = useMemo(() => formatTime(time), [time]);
  

  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg bg-card text-card-foreground", isTurn && "bg-primary/10")}>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatar} />
          <AvatarFallback>{name ? name.charAt(0) : '?'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{name}</p>
            {color && <span className="text-xs font-medium text-muted-foreground">({color})</span>}
            {isBot && <Bot className="h-4 w-4 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground">ELO: {elo}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {drawOffered && onDrawResponse && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-sm text-amber-500">
              <Handshake className="h-4 w-4" />
              <span>Draw Offer</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="h-7 bg-green-600/20 text-green-700 hover:bg-green-600/30" onClick={() => onDrawResponse(true)}>Accept</Button>
              <Button size="sm" variant="secondary" className="h-7 bg-red-600/20 text-red-700 hover:bg-red-600/30" onClick={() => onDrawResponse(false)}>Decline</Button>
            </div>
          </div>
        )}

        {typeof time === 'number' ? (
          <div className={cn("flex items-center gap-2 rounded-md p-2 font-mono text-xl", isTurn ? "bg-background/80" : "bg-transparent")}>
            <Timer className={cn("h-6 w-6", isTurn ? "text-primary" : "text-muted-foreground")} />
            <span className={cn(isTurn ? "text-foreground" : "text-muted-foreground", time < 10000 && time > 0 && "text-destructive font-bold")}>{formattedTime}</span>
          </div>
        ) : firestoreGame?.timeControl ? (
           <div className={cn("flex items-center gap-2 rounded-md p-2 font-mono text-xl", isTurn ? "bg-background/80" : "bg-transparent")}>
            <Timer className={cn("h-6 w-6", isTurn ? "text-primary" : "text-muted-foreground")} />
            <span className={cn(isTurn ? "text-foreground" : "text-muted-foreground")}>{formatTime(firestoreGame.timeControl.initial)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
