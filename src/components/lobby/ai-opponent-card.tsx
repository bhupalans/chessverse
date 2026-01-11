'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { adjustAIOpponentLevel, AdjustAIOpponentLevelOutput } from '@/ai/flows/adjust-ai-opponent-level';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function AiOpponentCard({ completedGames }: { completedGames: number }) {
  const [isPending, startTransition] = useTransition();
  const [recommendation, setRecommendation] = useState<AdjustAIOpponentLevelOutput | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const result = await adjustAIOpponentLevel({ completedGames });
      setRecommendation(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedGames]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold">AI Coach</CardTitle>
            <CardDescription>Recommended opponent level.</CardDescription>
          </div>
          <BrainCircuit className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : recommendation ? (
          <div className="space-y-3">
            <Badge 
              variant={
                recommendation.difficultyLevel === 'Advanced' ? 'destructive' : 
                recommendation.difficultyLevel === 'Intermediate' ? 'default' : 'secondary'
              }
              className="text-lg"
            >
              {recommendation.difficultyLevel}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {recommendation.reason}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Could not get a recommendation.</p>
        )}
      </CardContent>
    </Card>
  );
}
