import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Chess, Move } from 'chess.js';

admin.initializeApp();

const db = admin.database();
//const firestore = admin.firestore();

export const submitMove = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    const { gameId, from, to, promotion } = data;

    if (!gameId || !from || !to) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with "gameId", "from", and "to" arguments.'
        );
    }

    const gameRef = db.ref(`/liveGames/${gameId}`);

    try {
        const snapshot = await gameRef.once('value');
        const gameData = snapshot.val();

        if (!gameData) {
            throw new functions.https.HttpsError('not-found', 'Game not found.');
        }

        const game = new Chess(gameData.fen);
        
        // TODO: Add logic to verify that the player making the move is the correct one based on `context.auth.uid`

        if (game.turn() !== gameData.turn) {
             throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }

        const move: Move | null = game.move({ from, to, promotion });

        if (move === null) {
            throw new functions.https.HttpsError('invalid-argument', 'Illegal move.');
        }

        const newFen = game.fen();
        const newTurn = game.turn();

        const lastMove = {
            from: move.from,
            to: move.to,
            piece: move.piece,
            color: move.color,
            captured: move.flags.includes('c'),
        };

        await gameRef.update({ fen: newFen, turn: newTurn, lastMove });

        return { status: 'success', fen: newFen, turn: newTurn, lastMove };
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error processing move:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while processing the move.');
    }
});


export const initializeLiveGame = functions.firestore
    .document('/games/{gameId}')
    .onWrite(async (change, context) => {
        const gameId = context.params.gameId;
        const afterData = change.after.data();

        // If the document was deleted or status is not 'inprogress', do nothing.
        if (!afterData || afterData.status !== 'inprogress') {
            return null;
        }
        
        const beforeData = change.before.data();
        
        // Only initialize if the status just changed to 'inprogress' or if it's a new 'inprogress' game
        if (beforeData?.status === 'inprogress') {
            return null;
        }

        const liveGameRef = db.ref(`liveGames/${gameId}`);
        const snapshot = await liveGameRef.once('value');

        // Only create if it doesn't already exist to prevent overwriting ongoing games
        if (snapshot.exists()) {
            console.log(`Live game at /liveGames/${gameId} already exists. Skipping initialization.`);
            return null;
        }
        
        const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        console.log(`Initializing live game at /liveGames/${gameId}`);
        return liveGameRef.set({
            fen: startingFen,
            turn: 'w'
        });
    });
