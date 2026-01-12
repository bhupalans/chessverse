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
exports.initializeLiveGame = exports.submitMove = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const chess_js_1 = require("chess.js");
admin.initializeApp();
const db = admin.database();
//const firestore = admin.firestore();
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
    try {
        const snapshot = await gameRef.once('value');
        const gameData = snapshot.val();
        if (!gameData) {
            throw new functions.https.HttpsError('not-found', 'Game not found.');
        }
        const game = new chess_js_1.Chess(gameData.fen);
        // TODO: Add logic to verify that the player making the move is the correct one based on `context.auth.uid`
        if (game.turn() !== gameData.turn) {
            throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
        }
        const move = game.move({ from, to, promotion });
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
    console.log(`Initializing live game at /liveGames/${gameId}`);
    return liveGameRef.set({
        fen: startingFen,
        turn: 'w'
    });
});
//# sourceMappingURL=index.js.map