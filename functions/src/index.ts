
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Chess, Move } from 'chess.js';

admin.initializeApp();

const db = admin.database();
const firestore = admin.firestore();


// --- ELO Calculation ---
async function calculateAndApplyElo(
    transaction: admin.firestore.Transaction,
    gameRef: admin.firestore.DocumentReference,
    gameData: admin.firestore.DocumentData,
    winnerId: 'w' | 'b' | 'd'
) {
    // 1. Skip ELO for bot games or aborted games
    if (gameData.isBotGame || gameData.reason === 'abort') {
        return; // Do not calculate ELO for bot games or aborted games
    }

    const { player1Id, player2Id, player1Color } = gameData;
    if (!player1Id || !player2Id) {
        console.log(`Skipping ELO for game ${gameRef.id}: missing player IDs.`);
        return;
    }

    const kFactor = 32;
    const player1Ref = firestore.collection('users').doc(player1Id);
    const player2Ref = firestore.collection('users').doc(player2Id);

    try {
        const [player1Doc, player2Doc] = await Promise.all([transaction.get(player1Ref), transaction.get(player2Ref)]);

        if (!player1Doc.exists || !player2Doc.exists) {
            console.error(`ELO Update failed for game ${gameRef.id}: One or both players not found.`);
            return;
        }

        const player1 = player1Doc.data()!;
        const player2 = player2Doc.data()!;

        // 2. Default missing ELO fields
        const elo1 = player1.eloRating || 1200;
        const elo2 = player2.eloRating || 1200;

        // 3. Determine scores
        let score1, score2;
        const player1IsWinner = (player1Color === 'w' && winnerId === 'w') || (player1Color === 'b' && winnerId === 'b');
        const player2IsWinner = (player1Color === 'w' && winnerId === 'b') || (player1Color === 'b' && winnerId === 'w');

        if (winnerId === 'd') { // Draw
            score1 = 0.5;
            score2 = 0.5;
        } else if (player1IsWinner) { // Player 1 won
            score1 = 1;
            score2 = 0;
        } else if (player2IsWinner) { // Player 2 won
            score1 = 0;
            score2 = 1;
        } else {
            console.error(`Could not determine winner for game ${gameRef.id}. winnerId: ${winnerId}, player1Color: ${player1Color}`);
            return;
        }

        // 4. Compute ELO
        const expectedScore1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
        const expectedScore2 = 1 / (1 + Math.pow(10, (elo1 - elo2) / 400));
        
        const newElo1 = Math.round(elo1 + kFactor * (score1 - expectedScore1));
        const newElo2 = Math.round(elo2 + kFactor * (score2 - expectedScore2));

        // 5. Update users atomically
        transaction.update(player1Ref, {
            eloRating: newElo1,
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            wins: score1 === 1 ? admin.firestore.FieldValue.increment(1) : player1.wins || 0,
            losses: score1 === 0 ? admin.firestore.FieldValue.increment(1) : player1.losses || 0,
            draws: score1 === 0.5 ? admin.firestore.FieldValue.increment(1) : player1.draws || 0,
        });

        transaction.update(player2Ref, {
            eloRating: newElo2,
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            wins: score2 === 1 ? admin.firestore.FieldValue.increment(1) : player2.wins || 0,
            losses: score2 === 0 ? admin.firestore.FieldValue.increment(1) : player2.losses || 0,
            draws: score2 === 0.5 ? admin.firestore.FieldValue.increment(1) : player2.draws || 0,
        });
        
        // 6. Write ELO snapshot to game
        const whiteEloBefore = player1Color === 'w' ? elo1 : elo2;
        const blackEloBefore = player1Color === 'w' ? elo2 : elo1;
        const whiteEloAfter  = player1Color === 'w' ? newElo1 : newElo2;
        const blackEloAfter  = player1Color === 'w' ? newElo2 : newElo1;
        
        // This update is now part of the transaction, so we pass the transaction object to `update`.
        transaction.update(gameRef, {
          whiteEloBefore,
          blackEloBefore,
          whiteEloAfter,
          blackEloAfter,
          eloProcessed: true,
        });
        
        
        console.log(`ELO updated for game ${gameRef.id}. P1: ${elo1} -> ${newElo1}, P2: ${elo2} -> ${newElo2}`);

    } catch (error) {
        console.error(`Failed to update ELO for game ${gameRef.id}:`, error);
        // Don't re-throw, as we don't want to fail the entire game-ending transaction.
    }
}


// --- Bot Logic ---
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
        
        const botColorName = firestoreGameData.player2Color === 'w' ? 'white' : 'black';
        const increment = firestoreGameData.timeControl.increment / 1000 || 0;
        
        const botTimeRemaining = gameData.clocks[botColorName] - elapsed;
        
        if (botTimeRemaining <= 0) {
            const winnerId = firestoreGameData.player1Color;
            await firestore.runTransaction(async (transaction) => {
                transaction.update(firestoreGameRef, {
                    status: 'completed',
                    winnerId: winnerId,
                    reason: 'timeout',
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            return;
        }

        updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
        updates[`clocks/${botColorName}`] = botTimeRemaining + increment;
        updates['clocks/running'] = newTurn;
    }
    
    const firestoreUpdates: any = { turn: newTurn };

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
        
        firestoreUpdates.status = 'completed';
        firestoreUpdates.winnerId = winnerId;
        firestoreUpdates.reason = reason;
        firestoreUpdates.fen = newFen;
        firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();

        await firestoreGameRef.update(firestoreUpdates);

    } else {
         await firestoreGameRef.update(firestoreUpdates);
    }
    
    await gameRef.update(updates);
}

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


export const submitMove = functions.https.onCall(async (data, context) => {
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
        return await firestore.runTransaction(async (transaction) => {
            const [snapshot, firestoreGameDoc] = await Promise.all([
                gameRef.once('value'),
                transaction.get(firestoreGameRef)
            ]);
            
            const gameData = snapshot.val();
            const firestoreGameData = firestoreGameDoc.data();

            if (!gameData || !firestoreGameData) {
                throw new functions.https.HttpsError('not-found', 'Game not found.');
            }
             if (firestoreGameData.status === 'completed') {
                throw new functions.https.HttpsError('failed-precondition', 'Game is already completed.');
            }

            const isBotGame = firestoreGameData.isBotGame === true;
            
            const uid = context.auth?.uid;
            if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not logged in");

            const myColor = uid === firestoreGameData.player1Id
                ? firestoreGameData.player1Color 
                : firestoreGameData.player2Color;
            
            const game = new Chess(gameData.fen);
            
            if (game.turn() !== myColor || firestoreGameData.turn !== myColor) {
                 throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
            }
            
            const firestoreUpdates: any = {};
            const liveGameUpdates: any = {};

            if(gameData.clocks && firestoreGameData.timeControl) {
                const now = Date.now();
                const lastTick = gameData.clocks.lastTick;
                const elapsed = (now - lastTick) / 1000;
                const playerColorName = myColor === 'w' ? 'white' : 'black';
                const playerTime = gameData.clocks[playerColorName];
                const newTime = playerTime - elapsed;
                
                if (newTime <= 0) {
                    const winnerId = myColor === 'w' ? 'b' : 'w';
                    firestoreUpdates.status = 'completed';
                    firestoreUpdates.winnerId = winnerId;
                    firestoreUpdates.reason = 'timeout';
                    firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    await calculateAndApplyElo(transaction, firestoreGameRef, firestoreGameData, winnerId);
                    transaction.update(firestoreGameRef, firestoreUpdates);
                    return { status: 'timeout' };
                }
                 const increment = firestoreGameData.timeControl.increment / 1000 || 0;
                 liveGameUpdates[`clocks/${playerColorName}`] = newTime + increment;
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

            liveGameUpdates.fen = newFen;
            liveGameUpdates.turn = newTurn;
            liveGameUpdates.lastMove = {
                from: move.from,
                to: move.to,
                piece: move.piece,
                color: move.color,
                captured: move.flags.includes('c'),
                sound: sound,
            };
            
            if(gameData.clocks && firestoreGameData.timeControl) {
                liveGameUpdates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
                liveGameUpdates['clocks/running'] = newTurn;
            }

            firestoreUpdates.turn = newTurn;
            
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
                
                firestoreUpdates.status = 'completed';
                firestoreUpdates.winnerId = winnerId;
                firestoreUpdates.reason = reason;
                firestoreUpdates.fen = newFen;
                firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                
                await calculateAndApplyElo(transaction, firestoreGameRef, firestoreGameData, winnerId);
            }
            
            transaction.update(firestoreGameRef, firestoreUpdates);
            
            // This is outside the transaction but it's for the live game state, which is okay.
            // Using a transaction for RTDB is more complex and not required here.
            await gameRef.update(liveGameUpdates);

            if (!game.isGameOver() && isBotGame && newTurn !== myColor) {
                // It's the bot's turn now.
                // Use a timeout to make the bot's move feel more natural
                setTimeout(() => {
                    firestoreGameRef.get().then(doc => {
                        if (doc.exists) {
                            handleBotMove(gameId, firestoreGameRef, doc.data()!).catch(err => {
                                console.error("Error in handleBotMove:", err);
                            });
                        }
                    });
                }, 1000); 
            }
            return { status: 'success', fen: newFen, turn: newTurn };
        });

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
            // Clean up RTDB if game is deleted or completed from a non-inprogress state
             if (!afterData) {
                await db.ref(`liveGames/${gameId}`).remove();
                console.log(`Live game removed for deleted game ${gameId}`);
            }
            return null;
        }
        
        if (beforeData?.status === 'inprogress') {
            console.log(`Game ${gameId} is already in progress. Skipping initialization.`);
            return null;
        }

        const liveGameRef = db.ref(`liveGames/${gameId}`);
        const snapshot = await liveGameRef.once('value');
        const existing = snapshot.val();
        
        if (existing) { // If there's any data, assume it's initialized
            console.log(`Game ${gameId} already has data in Realtime DB. Skipping.`);
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
        await liveGameRef.set(liveGameState); // Use set instead of update for initialization
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
        return await firestore.runTransaction(async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Game not found.');
            }

            const gameData = gameDoc.data()!;
            
            if (gameData.status === 'completed') {
                throw new functions.https.HttpsError('failed-precondition', 'Game is already completed.');
            }

            if (gameData.isBotGame && ['draw', 'decline-draw', 'abort'].includes(action)) {
                 throw new functions.https.HttpsError('failed-precondition', 'This action is not allowed in bot games.');
            }
            
            const isPlayer1 = uid === gameData.player1Id;
            const isPlayer2 = uid === gameData.player2Id;
            
            if(!isPlayer1 && !isPlayer2) {
                 throw new functions.https.HttpsError('permission-denied', 'You are not a player in this game.');
            }

            const opponentId = isPlayer1 ? gameData.player2Id : gameData.player1Id;
            const myColor = isPlayer1 ? gameData.player1Color : gameData.player2Color;
            const opponentColor = myColor === 'w' ? 'b' : 'w';
            
            const firestoreUpdates: any = {};

            switch (action) {
                case 'resign':
                    firestoreUpdates.status = 'completed';
                    firestoreUpdates.winnerId = opponentColor;
                    firestoreUpdates.reason = 'resign';
                    firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    await calculateAndApplyElo(transaction, gameRef, gameData, opponentColor);
                    transaction.update(gameRef, firestoreUpdates);
                    return { status: 'success' };
                
                case 'draw':
                    const currentDrawOffer = gameData.drawOffer;
                    if (currentDrawOffer === opponentId) { // Accept draw
                         firestoreUpdates.status = 'completed';
                         firestoreUpdates.winnerId = 'd';
                         firestoreUpdates.reason = 'draw';
                         firestoreUpdates.drawOffer = null;
                         firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                         firestoreUpdates.lastDrawAction = {
                            type: 'accepted',
                            by: uid,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        };
                        await calculateAndApplyElo(transaction, gameRef, gameData, 'd');
                        transaction.update(gameRef, firestoreUpdates);
                        return { status: 'success' };

                    } else if (currentDrawOffer === uid) {
                        throw new functions.https.HttpsError('failed-precondition', 'You have already offered a draw.');
                    } else { // Offer draw
                        transaction.update(gameRef, { drawOffer: uid });
                        return { status: 'success' };
                    }
                
                case 'decline-draw':
                    if (gameData.drawOffer === opponentId) {
                        transaction.update(gameRef, {
                            drawOffer: null,
                            lastDrawAction: {
                                type: 'declined',
                                by: uid,
                                at: admin.firestore.FieldValue.serverTimestamp()
                            }
                        });
                        return { status: 'success' };
                    } else {
                        throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                    }

                case 'abort':
                    // Can only abort if game has not started
                    if (gameData.status === 'inprogress') {
                         throw new functions.https.HttpsError('failed-precondition', 'Cannot abort a game that is in progress.');
                    }
                    firestoreUpdates.status = 'completed';
                    firestoreUpdates.winnerId = 'd'; // No winner
                    firestoreUpdates.reason = 'abort';
                    firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    // Do not apply ELO for aborted games
                    transaction.update(gameRef, firestoreUpdates);
                    return { status: 'success' };


                default:
                    throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
            }
        });
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error handling game action:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
