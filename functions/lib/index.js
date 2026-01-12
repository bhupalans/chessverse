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
exports.submitMove = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
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
        const playerColor = context.auth.uid === firestoreGameData.player1Id ? 'w' : 'b';
        const game = new chess_js_1.Chess(gameData.fen);
        if (game.turn() !== playerColor) {
            throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }
        const move = game.move({ from, to, promotion });
        if (move === null) {
            throw new functions.https.HttpsError('invalid-argument', 'Illegal move.');
        }
        let sound = 'move';
        if (game.inCheck()) {
            sound = 'check';
        }
        else if (move.flags.includes('c')) { // 'c' for capture
            sound = 'capture';
        }
        else if (move.flags.includes('k') || move.flags.includes('q')) { // Castling
            sound = 'castle';
        }
        else if (move.flags.includes('p')) { // Promotion
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
        // Clock updates
        if (gameData.clocks && firestoreGameData.timeControl) {
            const now = Date.now();
            const lastTick = gameData.clocks.lastTick;
            const elapsed = (now - lastTick) / 1000; // in seconds
            const playerToUpdate = game.turn() === 'w' ? 'black' : 'white';
            const increment = firestoreGameData.timeControl.increment || 0;
            let newTime = gameData.clocks[playerToUpdate] - elapsed + increment;
            if (newTime < 0)
                newTime = 0;
            updates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
            updates[`clocks/${playerToUpdate}`] = newTime;
        }
        await gameRef.update(updates);
        if (game.isGameOver()) {
            let reason = 'Game Over';
            let winnerId = newTurn === 'w' ? 'b' : 'w'; // The loser is the one whose turn it would be
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
                fen: newFen, // Store final FEN
            });
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
    // If the document was deleted or status is not 'inprogress', do nothing.
    if (!afterData || afterData.status !== 'inprogress') {
        return null;
    }
    const beforeData = change.before.data();
    // Only initialize if the status just changed to 'inprogress' or if it's a new 'inprogress' game
    if ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) === 'inprogress') {
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
    const liveGameState = {
        fen: startingFen,
        turn: 'w'
    };
    if (afterData.timeControl) {
        liveGameState.clocks = {
            white: afterData.timeControl.initial,
            black: afterData.timeControl.initial,
            lastTick: admin.database.ServerValue.TIMESTAMP
        };
    }
    console.log(`Initializing live game at /liveGames/${gameId}`);
    return liveGameRef.set(liveGameState);
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
                }
                else {
                    throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                }
            case 'abort':
                // Logic for aborting a game (e.g., if less than 2 moves per side)
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