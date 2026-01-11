import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AvailableGames } from '@/components/lobby/available-games';
import { CreateGameDialog } from '@/components/lobby/create-game-dialog';

export default function LobbyPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="w-full">
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
            <CreateGameDialog />
          </CardHeader>
          <CardContent>
            <AvailableGames />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
