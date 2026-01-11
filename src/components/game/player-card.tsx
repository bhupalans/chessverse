'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, Timer, Handshake, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PlayerCard = ({
  name,
  elo,
  avatar,
  isTurn,
  isBot = false,
  color,
  drawOffered,
  onDrawResponse,
}: {
  name: string;
  elo: number;
  avatar: string;
  isTurn?: boolean;
  isBot?: boolean;
  color?: 'White' | 'Black';
  drawOffered?: boolean;
  onDrawResponse?: (accept: boolean) => void;
}) => (
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
    {isTurn && !drawOffered &&(
      <div className="flex items-center gap-2 text-primary">
        <Timer className="h-5 w-5" />
        <span className="font-bold">Thinking...</span>
      </div>
    )}
     {drawOffered && onDrawResponse && (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-amber-500">
           <Handshake className="h-4 w-4" />
           <span>Draw Offer</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="bg-green-600/20 text-green-700 hover:bg-green-600/30" onClick={() => onDrawResponse(true)}>Accept</Button>
          <Button size="sm" variant="secondary" className="bg-red-600/20 text-red-700 hover:bg-red-600/30" onClick={() => onDrawResponse(false)}>Decline</Button>
        </div>
      </div>
    )}
  </div>
);
