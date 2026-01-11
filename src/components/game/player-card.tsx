'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PlayerCard = ({
  name,
  elo,
  avatar,
  isTurn,
  isBot = false,
  color,
}: {
  name: string;
  elo: number;
  avatar: string;
  isTurn?: boolean;
  isBot?: boolean;
  color?: 'White' | 'Black';
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
    {isTurn && (
      <div className="flex items-center gap-2 text-primary">
        <Timer className="h-5 w-5" />
        <span className="font-bold">Thinking...</span>
      </div>
    )}
  </div>
);
