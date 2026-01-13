
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';

admin.initializeApp();

const db = admin.database();
const firestore = admin.firestore();


// --- Bot Logic ---
function getBotMove(game: Chess, difficulty: string): string | null {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    if (difficulty === 'medium') {
        const capturingMoves = legalMoves.filter(m => m.flags.includes('c'));
        if (capturingMoves.length > 0) {
            return capturingMoves[Math.floor(Math.random() * capturingMoves.length)].san;
        }
    }
    
    // Default to random move for 'easy' or if no captures for 'medium'
    return legalMoves[Math.floor(Math.random() * legalMoves.length)].san;
}

async function handleBotMove(gameId: string, firestoreGameRef: admin.firestore.DocumentReference, firestoreGameData: admin.firestore.DocumentData) {
    const gameRef = db.ref(`/liveGames/${gameId}`);
    const snapshot = await gameRef.once('value');
    const gameData = snapshot.val();
    
    if (!gameData) return; // Should not happen

    const game = new Chess(gameData.fen);
    
    const botMoveSan = getBotMove(game, firestoreGameData.botDifficulty || 'medium');
    if (botMoveSan === null) return; // No legal moves for bot
    
    const botMove = game.move(botMoveSan);
    
    let sound: 'move' | 'capture' | 'check' | 'castle' | 'promotion' = 'move';
    if (game.inCheck()) {
        sound = 'check';
    } else if (botMove.flags.includes('c')) {
        sound = 'capture';
    } else if (botMove.flags.includes('k') || botMove.flags.includes('q')) {
        sound = 'castle';
    } else if (botMove.flags.includes('p')) {
        sound = 'promotion';
    }

    const newFen = game.fen();
    const newTurn = game.turn();
    const lastMove = {
        from: botMove.from,
        to: botMove.to,
        piece: botMove.piece,
        color: botMove.color,
        captured: botMove.flags.includes('c'),
        sound: sound,
    };

    const updates: any = {
        fen: newFen,
        turn: newTurn,
        lastMove: lastMove
    };

    if (gameData.clocks && firestoreGameData.timeControl) {
        const now = Date.now();
        const lastTick = gameData.clocks.lastTick;
        const elapsed = (now - lastTick) / 1000;
        
        const botColorName = firestoreGameData.player1Color === 'w' ? 'black' : 'white';
        const increment = firestoreGameData.timeControl.increment / 1000 || 0;
        
        const botTimeRemaining = gameData.clocks[botColorName] - elapsed;
        
        if (botTimeRemaining <= 0) {
            await firestoreGameRef.update({
                status: 'completed',
                winnerId: game.turn(), // Human wins
                reason: 'timeout',
            });
            return;
        }

        updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
        updates[`clocks/${botColorName}`] = botTimeRemaining + increment;
        updates['clocks/running'] = newTurn;
    }

    await gameRef.update(updates);

    if (game.isGameOver()) {
        let reason = 'Game Over';
        let winnerId: 'w' | 'b' | 'd' = newTurn === 'w' ? 'b' : 'w'; 
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
            fen: newFen,
        });
    }
}


export const submitMove = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated for non-bot games
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

        const isBotGame = firestoreGameData.isBotGame === true;
        const playerColor = isBotGame 
            ? firestoreGameData.player1Color
            : (context.auth.uid === firestoreGameData.player1Id ? firestoreGameData.player1Color || 'w' : (firestoreGameData.player1Color === 'w' ? 'b' : 'w'));

        const game = new Chess(gameData.fen);
        
        if (game.turn() !== playerColor) {
             throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }

        if(gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000;
            const playerTime = playerColor === 'w' ? gameData.clocks.white : gameData.clocks.black;
            
            if (playerTime - elapsed <= 0) {
                 await firestoreGameRef.update({
                    status: 'completed',
                    winnerId: playerColor === 'w' ? 'b' : 'w', 
                    reason: 'timeout',
                });
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
        } else if (move.flags.includes('c')) {
            sound = 'capture';
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
            sound = 'castle';
        } else if (move.flags.includes('p')) {
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
        
        if(gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000;
            
            const playerWhoMoved = game.turn() === 'b' ? 'white' : 'black';
            const increment = firestoreGameData.timeControl.increment / 1000 || 0;
            
            let newTime = gameData.clocks[playerWhoMoved] - elapsed + increment;
            if (newTime < 0) newTime = 0;
            
            updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
            updates[`clocks/${playerWhoMoved}`] = newTime;
            updates['clocks/running'] = newTurn;
        }

        await gameRef.update(updates);
        
        if (game.isGameOver()) {
            let reason = 'Game Over';
            let winnerId: 'w' | 'b' | 'd' = newTurn === 'w' ? 'b' : 'w';
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
                fen: newFen,
            });
        } else if (isBotGame && newTurn !== playerColor) {
            // It's the bot's turn now.
            // Use a timeout to make the bot's move feel more natural
            setTimeout(() => {
                handleBotMove(gameId, firestoreGameRef, firestoreGameData).catch(err => {
                    console.error("Error in handleBotMove:", err);
                });
            }, 1000); 
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

        if (!afterData || afterData.status !== 'inprogress') {
            return null;
        }
        
        if (beforeData?.status === 'inprogress') {
            console.log(`Game ${gameId} is already in progress. Skipping initialization.`);
            return null;
        }

        const liveGameRef = db.ref(`liveGames/${gameId}`);
        const snapshot = await liveGameRef.once('value');
        const existing = snapshot.val();
        
        if (existing && existing.clocks) {
            console.log(`Game ${gameId} already has clocks. Skipping.`);
            return null;
        }
        
        
        const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        const liveGameState: any = {
            fen: startingFen,
            turn: 'w'
        };

        const timeControl = afterData.timeControl || { initial: 300000, increment: 0 };
        console.log(`timeControl for game ${gameId}:`, timeControl);

        if (typeof timeControl.initial === 'number') {
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
        console.log(`Live game created for game ${gameId}`);
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

        if (gameData.isBotGame) {
             throw new functions.https.HttpsError('failed-precondition', 'Game actions are not allowed in bot games.');
        }

        const playerColor = uid === gameData.player1Id ? firestoreGameData.player1Color || 'w' : (firestoreGameData.player1Color === 'w' ? 'b' : 'w');
        const opponentId = uid === gameData.player1Id ? gameData.player2Id : gameData.player1Id;
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
                if (currentDrawOffer === opponentId) {
                    return gameRef.update({
                        status: 'completed',
                        winnerId: 'd',
                        reason: 'draw',
                        drawOffer: null,
                        lastDrawAction: {
                            type: 'accepted',
                            by: uid,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } 
                else if (currentDrawOffer === uid) {
                    throw new functions.https.HttpsError('failed-precondition', 'You have already offered a draw.');
                }
                else {
                    return gameRef.update({
                        drawOffer: uid
                    });
                }
            
            case 'decline-draw':
                if (gameData.drawOffer === opponentId) {
                    return gameRef.update({
                        drawOffer: null,
                        lastDrawAction: {
                            type: 'declined',
                            by: uid,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } else {
                    throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                }

            case 'abort':
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
