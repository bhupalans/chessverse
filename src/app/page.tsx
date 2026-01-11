import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AvailableGames } from '@/components/lobby/available-games';
import { CreateGameDialog } from '@/components/lobby/create-game-dialog';
import { AiOpponentCard } from '@/components/lobby/ai-opponent-card';

export default function LobbyPage() {
  const completedGames = 5; // Mock data for demonstration

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col-reverse items-start gap-8 lg:flex-row">
        <div className="w-full lg:flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  Game Lobby
                </CardTitle>
                <CardDescription>
                  Join an existing game or create a new one to start playing.
                </CardDescription>
              </div>
              <CreateGameDialog completedGames={completedGames} />
            </CardHeader>
            <CardContent>
              <AvailableGames />
            </CardContent>
          </Card>
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <AiOpponentCard completedGames={completedGames} />
        </aside>
      </div>
    </div>
  );
}
