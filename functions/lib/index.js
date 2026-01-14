"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGameAction = exports.initializeLiveGame = exports.submitMove = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const chess_js_1 = require("chess.js");
admin.initializeApp();
const db = admin.database();
const firestore = admin.firestore();
// --- Bot Logic ---
function getBotMove(game, difficulty) {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0)
        return null;
    if (difficulty === 'medium') {
        const capturingMoves = legalMoves.filter(m => m.flags.includes('c'));
        if (capturingMoves.length > 0) {
            return capturingMoves[Math.floor(Math.random() * capturingMoves.length)].san;
        }
    }
    // Default to random move for 'easy' or if no captures for 'medium'
    return legalMoves[Math.floor(Math.random() * legalMoves.length)].san;
}
async function handleBotMove(gameId, firestoreGameRef, firestoreGameData) {
    const gameRef = db.ref(`/liveGames/${gameId}`);
    const snapshot = await gameRef.once('value');
    const gameData = snapshot.val();
    if (!gameData)
        return; // Should not happen
    const game = new chess_js_1.Chess(gameData.fen);
    const botMoveSan = getBotMove(game, firestoreGameData.botDifficulty || 'medium');
    if (botMoveSan === null)
        return; // No legal moves for bot
    const botMove = game.move(botMoveSan);
    let sound = 'move';
    if (game.inCheck()) {
        sound = 'check';
    }
    else if (botMove.flags.includes('c')) {
        sound = 'capture';
    }
    else if (botMove.flags.includes('k') || botMove.flags.includes('q')) {
        sound = 'castle';
    }
    else if (botMove.flags.includes('p')) {
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
    const updates = {
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
            await firestoreGameRef.update({
                status: 'completed',
                winnerId: firestoreGameData.player1Color,
                reason: 'timeout',
            });
            return;
        }
        updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
        updates[`clocks/${botColorName}`] = botTimeRemaining + increment;
        updates['clocks/running'] = newTurn;
    }
    await firestoreGameRef.update({ turn: newTurn });
    await gameRef.update(updates);
    if (game.isGameOver()) {
        let reason = 'Game Over';
        let winnerId = newTurn === 'w' ? 'b' : 'w';
        if (game.isCheckmate()) {
            reason = 'Checkmate';
        }
        else if (game.isStalemate()) {
            reason = 'Stalemate';
            winnerId = 'd';
        }
        else if (game.isDraw()) {
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
exports.submitMove = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { gameId, from, to, promotion } = data;
    if (!gameId || !from || !to) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "gameId", "from", and "to" arguments.');
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
        const playerColor = context.auth.uid === firestoreGameData.player1Id ? firestoreGameData.player1Color : firestoreGameData.player2Color;
        const game = new chess_js_1.Chess(gameData.fen);
        if (game.turn() !== playerColor || firestoreGameData.turn !== playerColor) {
            throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }
        if (gameData.clocks && firestoreGameData.timeControl) {
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
        const move = game.move({ from, to, promotion });
        if (move === null) {
            throw new functions.https.HttpsError('invalid-argument', 'Illegal move.');
        }
        let sound = 'move';
        if (game.inCheck()) {
            sound = 'check';
        }
        else if (move.flags.includes('c')) {
            sound = 'capture';
        }
        else if (move.flags.includes('k') || move.flags.includes('q')) {
            sound = 'castle';
        }
        else if (move.flags.includes('p')) {
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
        const updates = {
            fen: newFen,
            turn: newTurn,
            lastMove: lastMove
        };
        if (gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000;
            const playerWhoMoved = playerColor === 'w' ? 'white' : 'black';
            const increment = firestoreGameData.timeControl.increment / 1000 || 0;
            let newTime = gameData.clocks[playerWhoMoved] - elapsed + increment;
            if (newTime < 0)
                newTime = 0;
            updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
            updates[`clocks/${playerWhoMoved}`] = newTime;
            updates['clocks/running'] = newTurn;
        }
        await firestoreGameRef.update({ turn: newTurn });
        await gameRef.update(updates);
        if (game.isGameOver()) {
            let reason = 'Game Over';
            let winnerId = newTurn === 'w' ? 'b' : 'w';
            if (game.isCheckmate()) {
                reason = 'Checkmate';
            }
            else if (game.isStalemate()) {
                reason = 'Stalemate';
                winnerId = 'd';
            }
            else if (game.isDraw()) {
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
        else if (isBotGame && newTurn !== playerColor) {
            // It's the bot's turn now.
            // Use a timeout to make the bot's move feel more natural
            setTimeout(() => {
                handleBotMove(gameId, firestoreGameRef, firestoreGameData).catch(err => {
                    console.error("Error in handleBotMove:", err);
                });
            }, 1000);
        }
        return { status: 'success', fen: newFen, turn: newTurn, lastMove };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error processing move:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while processing the move.');
    }
});
exports.initializeLiveGame = functions.firestore
    .document('/games/{gameId}')
    .onWrite(async (change, context) => {
    const gameId = context.params.gameId;
    const afterData = change.after.data();
    const beforeData = change.before.data();
    console.log(`initializeLiveGame fired for game: ${gameId}`);
    if (!afterData || afterData.status !== 'inprogress') {
        return null;
    }
    if ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) === 'inprogress') {
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
    const liveGameState = {
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
        console.log(`Clocks initialized for game ${gameId}: ${initialSeconds}s + ${incrementSeconds}s`);
    }
    console.log(`Initializing live game at /liveGames/${gameId}`);
    await liveGameRef.update(liveGameState);
    console.log(`Live game created for game ${gameId}`);
    return null;
});
exports.handleGameAction = functions.https.onCall(async (data, context) => {
    var _a;
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
        const gameData = gameDoc.data();
        if (gameData.status === 'completed') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is already completed.');
        }
        if (gameData.isBotGame) {
            throw new functions.https.HttpsError('failed-precondition', 'Game actions are not allowed in bot games.');
        }
        const playerColor = uid === gameData.player1Id ? gameData.player1Color : gameData.player2Color;
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
                }
                else {
                    throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                }
            case 'abort':
                const liveGameSnapshot = await db.ref(`/liveGames/${gameId}`).once('value');
                const liveGame = new chess_js_1.Chess((_a = liveGameSnapshot.val()) === null || _a === void 0 ? void 0 : _a.fen);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error handling game action:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
//# sourceMappingURL=index.js.map