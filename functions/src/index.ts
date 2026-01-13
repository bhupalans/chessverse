
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Chess, Move } from 'chess.js';

admin.initializeApp();

const db = admin.database();
const firestore = admin.firestore();

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
    const firestoreGameRef = firestore.collection('games').doc(gameId);

    try {
        const [snapshot, firestoreGameDoc] = await Promise.all([
            gameRef.once('value'),
            firestoreGameRef.get()
        ]);
        
        const gameData = snapshot.val();
        const firestoreGameData = firestoreGameDoc.data();

        if (!gameData || !firestoreGameData) {
            throw new functions.https.HttpsError('not-found', 'Game not found.');
        }
        
        const playerColor = context.auth.uid === firestoreGameData.player1Id ? 'w' : 'b';

        const game = new Chess(gameData.fen);
        
        if (game.turn() !== playerColor) {
             throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }

        // --- Timeout Check ---
        if(gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000;
            const playerTime = playerColor === 'w' ? gameData.clocks.white : gameData.clocks.black;
            
            if (playerTime - elapsed <= 0) {
                 await firestoreGameRef.update({
                    status: 'completed',
                    winnerId: playerColor === 'w' ? 'b' : 'w', // Opponent wins
                    reason: 'timeout',
                });
                // No need to update RTDB as game is over
                return { status: 'timeout' };
            }
        }

        const move: Move | null = game.move({ from, to, promotion });

        if (move === null) {
            throw new functions.https.HttpsError('invalid-argument', 'Illegal move.');
        }
        
        let sound: 'move' | 'capture' | 'check' | 'castle' | 'promotion' = 'move';
        if (game.inCheck()) {
            sound = 'check';
        } else if (move.flags.includes('c')) { // 'c' for capture
            sound = 'capture';
        } else if (move.flags.includes('k') || move.flags.includes('q')) { // Castling
            sound = 'castle';
        } else if (move.flags.includes('p')) { // Promotion
            sound = 'promotion';
        }

        const newFen = game.fen();
        const newTurn = game.turn();

        const lastMove = {
            from: move.from,
            to: move.to,
            piece: move.piece,
            color: move.color,
            captured: move.flags.includes('c'),
            sound: sound,
        };

        const updates: any = {
            fen: newFen,
            turn: newTurn,
            lastMove: lastMove
        };
        
        // Clock updates
        if(gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000; // in seconds
            
            const playerWhoMoved = game.turn() === 'b' ? 'white' : 'black'; // The player who just moved
            const playerToUpdate = game.turn() === 'b' ? 'white' : 'black';
            const increment = gameData.clocks.increment || 0;
            
            let newTime = gameData.clocks[playerWhoMoved] - elapsed + increment;
            if (newTime < 0) newTime = 0;
            
            updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
            updates[`clocks/${playerWhoMoved}`] = newTime;
            updates['clocks/running'] = newTurn; // The next player's clock is now running
        }


        await gameRef.update(updates);
        
        if (game.isGameOver()) {
            let reason = 'Game Over';
            let winnerId: 'w' | 'b' | 'd' = newTurn === 'w' ? 'b' : 'w'; // The loser is the one whose turn it would be
            if(game.isCheckmate()) {
                reason = 'Checkmate';
            } else if (game.isStalemate()) {
                reason = 'Stalemate';
                winnerId = 'd';
            } else if (game.isDraw()) {
                reason = 'Draw';
                winnerId = 'd';
            }
            
            await firestoreGameRef.update({
                status: 'completed',
                winnerId: winnerId,
                reason: reason,
                fen: newFen, // Store final FEN
            });
        }

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
        const beforeData = change.before.data();

        console.log(`initializeLiveGame fired for game: ${gameId}`);

        // If the game is deleted, or not in progress, do nothing
        if (!afterData || afterData.status !== 'inprogress') {
            return null;
        }
        
        // Only initialize if the status *just* changed to 'inprogress'
        if (beforeData?.status === 'inprogress') {
            console.log(`Game ${gameId} is already in progress. Skipping initialization.`);
            return null;
        }

        const liveGameRef = db.ref(`liveGames/${gameId}`);
        const snapshot = await liveGameRef.once('value');

        const existing = snapshot.val();
        
        // Only skip if clocks already exist
        if (existing && existing.clocks) {
            console.log(`Game ${gameId} already has clocks. Skipping.`);
            return null;
        }
        
        
        const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        const liveGameState: any = {
            fen: startingFen,
            turn: 'w'
        };

        // Initialize clocks if time control is set
        const timeControl = afterData.timeControl;
        console.log(`timeControl for game ${gameId}:`, timeControl);
        if (timeControl && typeof timeControl.initial === 'number') {
            const initialSeconds = Math.floor(timeControl.initial / 1000);
            const incrementSeconds = Math.floor((timeControl.increment || 0) / 1000);

            liveGameState.clocks = {
                white: initialSeconds,
                black: initialSeconds,
                running: 'w',
                lastTick: admin.database.ServerValue.TIMESTAMP,
                increment: incrementSeconds
            };

            console.log(
              `Clocks initialized for game ${gameId}: ${initialSeconds}s + ${incrementSeconds}s`
            );
        }


        console.log(`Initializing live game at /liveGames/${gameId}`);
        await liveGameRef.update(liveGameState);
        console.log(`Clocks written for game ${gameId}`);
        return null;
    });

export const handleGameAction = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { gameId, action } = data;
    const uid = context.auth.uid;

    if (!gameId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing gameId or action.');
    }

    const gameRef = firestore.collection('games').doc(gameId);

    try {
        const gameDoc = await gameRef.get();
        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found.');
        }

        const gameData = gameDoc.data()!;
        
        if (gameData.status === 'completed') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is already completed.');
        }

        const playerColor = uid === gameData.player1Id ? 'w' : 'b';
        const opponentColor = playerColor === 'w' ? 'b' : 'w';

        switch (action) {
            case 'resign':
                return gameRef.update({
                    status: 'completed',
                    winnerId: opponentColor,
                    reason: 'resign'
                });
            
            case 'draw':
                const currentDrawOffer = gameData.drawOffer;
                // If opponent offered a draw, accept it.
                if (currentDrawOffer === opponentColor) {
                    return gameRef.update({
                        status: 'completed',
                        winnerId: 'd',
                        reason: 'draw',
                        drawOffer: null,
                        lastDrawAction: {
                            type: 'accepted',
                            by: playerColor,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } 
                // If player already offered a draw, do nothing.
                else if (currentDrawOffer === playerColor) {
                    throw new functions.https.HttpsError('failed-precondition', 'You have already offered a draw.');
                }
                // Otherwise, offer a draw.
                else {
                    return gameRef.update({
                        drawOffer: playerColor
                    });
                }
            
            case 'decline-draw':
                if (gameData.drawOffer === opponentColor) {
                    return gameRef.update({
                        drawOffer: null,
                        lastDrawAction: {
                            type: 'declined',
                            by: playerColor,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } else {
                    throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                }

            case 'abort':
                 // Logic for aborting a game (e.g., if less than 2 moves per side)
                const liveGameSnapshot = await db.ref(`/liveGames/${gameId}`).once('value');
                const liveGame = new Chess(liveGameSnapshot.val()?.fen);
                
                if (liveGame.history().length > 4) { // 2 full moves
                    throw new functions.https.HttpsError('failed-precondition', 'Cannot abort game after several moves.');
                }
                return gameRef.update({
                    status: 'completed',
                    winnerId: 'd', // Aborted games are a draw
                    reason: 'abort'
                });

            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
        }
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error handling game action:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
