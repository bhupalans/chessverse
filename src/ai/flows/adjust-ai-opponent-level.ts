// AdjustAIOpponentLevel story
'use server';
/**
 * @fileOverview An AI opponent level adjustment agent.
 *
 * - adjustAIOpponentLevel - A function that adjusts the AI opponent's difficulty level.
 * - AdjustAIOpponentLevelInput - The input type for the adjustAIOpponentLevel function.
 * - AdjustAIOpponentLevelOutput - The return type for the adjustAIOpponentLevel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustAIOpponentLevelInputSchema = z.object({
  completedGames: z.number().describe('The number of completed games the player has played.'),
});
export type AdjustAIOpponentLevelInput = z.infer<typeof AdjustAIOpponentLevelInputSchema>;

const AdjustAIOpponentLevelOutputSchema = z.object({
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).describe('The recommended difficulty level for the AI opponent based on the player\'s game history.'),
  reason: z.string().describe('The reasoning behind the difficulty level recommendation.'),
});
export type AdjustAIOpponentLevelOutput = z.infer<typeof AdjustAIOpponentLevelOutputSchema>;

export async function adjustAIOpponentLevel(input: AdjustAIOpponentLevelInput): Promise<AdjustAIOpponentLevelOutput> {
  return adjustAIOpponentLevelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustAIOpponentLevelPrompt',
  input: {schema: AdjustAIOpponentLevelInputSchema},
  output: {schema: AdjustAIOpponentLevelOutputSchema},
  prompt: `You are an AI that adjusts the difficulty level of a chess AI opponent based on the player's game history.

  Based on the number of completed games, recommend a difficulty level (Beginner, Intermediate, or Advanced) and provide a brief explanation for your recommendation.

  Number of Completed Games: {{{completedGames}}}

  Consider these factors:
  - Beginner: 0-10 completed games. The AI should make simple moves and avoid complex strategies.
  - Intermediate: 11-50 completed games. The AI should play a more balanced game, using basic strategies and tactics.
  - Advanced: 51+ completed games. The AI should play a challenging game, employing advanced strategies and tactics.

  Respond with the difficulty level and a brief reason for the recommendation.

  {{#json}}
  { 
    "difficultyLevel": "Difficulty Level",
    "reason": "Reason for the recommendation"
  }
  {{/json}}`,
});

const adjustAIOpponentLevelFlow = ai.defineFlow(
  {
    name: 'adjustAIOpponentLevelFlow',
    inputSchema: AdjustAIOpponentLevelInputSchema,
    outputSchema: AdjustAIOpponentLevelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
