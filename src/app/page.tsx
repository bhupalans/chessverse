import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnlineUsers } from '@/components/lobby/online-users';
import { CreateGameDialog } from '@/components/lobby/create-game-dialog';

export default function LobbyPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                Online Users
              </CardTitle>
              <CardDescription>
                Invite someone to a game of chess.
              </CardDescription>
            </div>
            <CreateGameDialog />
          </CardHeader>
          <CardContent>
            <OnlineUsers />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
