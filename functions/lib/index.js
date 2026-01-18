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
exports.grantAdminClaim = exports.onTournamentStateChange = exports.autoTransitionTournaments = exports.leaveTournament = exports.joinTournament = exports.archiveTournament = exports.lockTournamentEarly = exports.publishTournament = exports.createTournament = exports.handlePlayerDisconnect = exports.handleGameAction = exports.onGameWrite = exports.submitMove = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const chess_js_1 = require("chess.js");
admin.initializeApp();
const db = admin.database();
const firestore = admin.firestore();
// --- TOURNAMENT STATE MACHINE ---
const VALID_TRANSITIONS = new Map([
    ['draft', ['published']],
    ['published', ['locked']],
    ['locked', ['live']],
    ['live', ['completed']],
    ['completed', ['archived']],
    ['archived', []]
]);
function validateTournamentStateTransition(currentState, requestedState) {
    const allowedStates = VALID_TRANSITIONS.get(currentState);
    if (!allowedStates || !allowedStates.includes(requestedState)) {
        throw new functions.https.HttpsError('failed-precondition', `Invalid state transition from ${currentState} to ${requestedState}.`);
    }
}
// --- ELO Calculation ---
async function calculateAndApplyElo(transaction, gameRef, gameData, winnerId) {
    if (gameData.isBotGame || gameData.reason === 'abort') {
        return;
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
        const player1 = player1Doc.data();
        const player2 = player2Doc.data();
        const elo1 = player1.eloRating || 1200;
        const elo2 = player2.eloRating || 1200;
        let score1, score2;
        const player1IsWinner = (player1Color === 'w' && winnerId === 'w') || (player1Color === 'b' && winnerId === 'b');
        const player2IsWinner = (player1Color === 'w' && winnerId === 'b') || (player1Color === 'b' && winnerId === 'w');
        if (winnerId === 'd') {
            score1 = 0.5;
            score2 = 0.5;
        }
        else if (player1IsWinner) {
            score1 = 1;
            score2 = 0;
        }
        else if (player2IsWinner) {
            score1 = 0;
            score2 = 1;
        }
        else {
            console.error(`Could not determine winner for game ${gameRef.id}. winnerId: ${winnerId}, player1Color: ${player1Color}`);
            return;
        }
        const expectedScore1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
        const expectedScore2 = 1 / (1 + Math.pow(10, (elo1 - elo2) / 400));
        const newElo1 = Math.round(elo1 + kFactor * (score1 - expectedScore1));
        const newElo2 = Math.round(elo2 + kFactor * (score2 - expectedScore2));
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
        const whiteEloBefore = player1Color === 'w' ? elo1 : elo2;
        const blackEloBefore = player1Color === 'w' ? elo2 : elo1;
        const whiteEloAfter = player1Color === 'w' ? newElo1 : newElo2;
        const blackEloAfter = player1Color === 'w' ? newElo2 : newElo1;
        transaction.update(gameRef, {
            whiteEloBefore,
            blackEloBefore,
            whiteEloAfter,
            blackEloAfter,
            eloProcessed: true,
        });
        console.log(`ELO updated for game ${gameRef.id}. P1: ${elo1} -> ${newElo1}, P2: ${elo2} -> ${newElo2}`);
    }
    catch (error) {
        console.error(`Failed to update ELO for game ${gameRef.id}:`, error);
    }
}
// --- Bot Logic ---
async function handleBotMove(gameId, firestoreGameRef, firestoreGameData) {
    const gameRef = db.ref(`/liveGames/${gameId}`);
    const snapshot = await gameRef.once('value');
    const gameData = snapshot.val();
    if (!gameData)
        return;
    const game = new chess_js_1.Chess(gameData.fen);
    const botMoveSan = getBotMove(game, firestoreGameData.botDifficulty || 'medium');
    if (botMoveSan === null)
        return;
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
    const firestoreUpdates = { turn: newTurn };
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
        firestoreUpdates.status = 'completed';
        firestoreUpdates.winnerId = winnerId;
        firestoreUpdates.reason = reason;
        firestoreUpdates.fen = newFen;
        firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
        await firestoreGameRef.update(firestoreUpdates);
    }
    else {
        await firestoreGameRef.update(firestoreUpdates);
    }
    await gameRef.update(updates);
}
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
    return legalMoves[Math.floor(Math.random() * legalMoves.length)].san;
}
// --- TOURNAMENT LOGIC ---
async function pairAndCreateMatches(tournamentId) {
    var _a;
    console.log(`Starting pairing for tournament: ${tournamentId}`);
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    const tournamentData = tournamentDoc.data();
    if (tournamentData.state !== 'live') {
        console.log(`Tournament ${tournamentId} is not in 'live' state. Halting pairing.`);
        return;
    }
    const playersRef = firestore.collection(`tournaments/${tournamentId}/players`);
    const playersSnapshot = await playersRef.where('activeGameId', '==', null).orderBy('score', 'desc').get();
    if (playersSnapshot.empty) {
        console.log(`No available players to pair in tournament ${tournamentId}.`);
        return;
    }
    const availablePlayers = playersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    const pairings = [];
    const pairedIds = new Set();
    for (const player of availablePlayers) {
        if (pairedIds.has(player.id))
            continue;
        let bestMatch = null;
        for (const opponent of availablePlayers) {
            if (player.id === opponent.id || pairedIds.has(opponent.id))
                continue;
            if ((_a = player.hasPlayedAgainst) === null || _a === void 0 ? void 0 : _a.includes(opponent.id))
                continue;
            bestMatch = opponent; // Simple pairing: first available opponent
            break;
        }
        if (bestMatch) {
            pairings.push([player, bestMatch]);
            pairedIds.add(player.id);
            pairedIds.add(bestMatch.id);
        }
    }
    if (pairedIds.size < availablePlayers.length) {
        const unpairedPlayer = availablePlayers.find(p => !pairedIds.has(p.id));
        if (unpairedPlayer) {
            console.log(`Player ${unpairedPlayer.username} gets a bye.`);
            await playersRef.doc(unpairedPlayer.id).update({
                score: admin.firestore.FieldValue.increment(1),
                gamesPlayed: admin.firestore.FieldValue.increment(1)
            });
        }
    }
    if (pairings.length === 0) {
        console.log(`No valid pairings found for tournament ${tournamentId}.`);
        return;
    }
    const batch = firestore.batch();
    for (const [player1, player2] of pairings) {
        const gameRef = firestore.collection('games').doc();
        const colors = Math.random() < 0.5 ? ['w', 'b'] : ['b', 'w'];
        const whitePlayer = colors[0] === 'w' ? player1 : player2;
        batch.set(gameRef, {
            player1Id: player1.id,
            player2Id: player2.id,
            player1: { id: player1.id, username: player1.username, eloRating: player1.eloRating },
            player2: { id: player2.id, username: player2.username, eloRating: player2.eloRating },
            player1Color: player1.id === whitePlayer.id ? 'w' : 'b',
            player2Color: player2.id === whitePlayer.id ? 'w' : 'b',
            status: 'inprogress',
            turn: 'w',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            timeControl: tournamentData.timeControl,
            isTournamentGame: true,
            tournamentId: tournamentId,
        });
        const player1Ref = playersRef.doc(player1.id);
        const player2Ref = playersRef.doc(player2.id);
        batch.update(player1Ref, { activeGameId: gameRef.id, hasPlayedAgainst: admin.firestore.FieldValue.arrayUnion(player2.id) });
        batch.update(player2Ref, { activeGameId: gameRef.id, hasPlayedAgainst: admin.firestore.FieldValue.arrayUnion(player1.id) });
        console.log(`Paired ${player1.username} vs ${player2.username} in game ${gameRef.id}`);
    }
    await batch.commit();
}
async function finalizeTournamentResults(tournamentId) {
    console.log(`Finalizing results for tournament ${tournamentId}`);
    const playersSnapshot = await firestore.collection(`tournaments/${tournamentId}/players`)
        .orderBy('score', 'desc')
        .get();
    const finalStandings = playersSnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
            rank: index + 1,
            uid: doc.id,
            username: data.username,
            score: data.score,
            gamesPlayed: data.gamesPlayed,
            eloRating: data.eloRating,
        };
    });
    await firestore.collection('tournaments').doc(tournamentId).update({
        finalStandings: finalStandings,
    });
    console.log(`Tournament ${tournamentId} has been finalized.`);
}
// --- HTTP & DB TRIGGERS ---
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
        return await firestore.runTransaction(async (transaction) => {
            var _a;
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
            const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
            if (!uid)
                throw new functions.https.HttpsError("unauthenticated", "Not logged in");
            const myColor = uid === firestoreGameData.player1Id ? firestoreGameData.player1Color : firestoreGameData.player2Color;
            const game = new chess_js_1.Chess(gameData.fen);
            if (game.turn() !== myColor || firestoreGameData.turn !== myColor) {
                throw new functions.https.HttpsError('failed-precondition', 'It is not your turn.');
            }
            const firestoreUpdates = {};
            const liveGameUpdates = {};
            if (gameData.clocks && firestoreGameData.timeControl) {
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
            liveGameUpdates.fen = newFen;
            liveGameUpdates.turn = newTurn;
            liveGameUpdates.lastMove = { from: move.from, to: move.to, piece: move.piece, color: move.color, captured: move.flags.includes('c'), sound: sound };
            if (gameData.clocks && firestoreGameData.timeControl) {
                liveGameUpdates['clocks/lastTick'] = admin.database.ServerValue.TIMESTAMP;
                liveGameUpdates['clocks/running'] = newTurn;
            }
            firestoreUpdates.turn = newTurn;
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
                firestoreUpdates.status = 'completed';
                firestoreUpdates.winnerId = winnerId;
                firestoreUpdates.reason = reason;
                firestoreUpdates.fen = newFen;
                firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                await calculateAndApplyElo(transaction, firestoreGameRef, firestoreGameData, winnerId);
            }
            transaction.update(firestoreGameRef, firestoreUpdates);
            await gameRef.update(liveGameUpdates);
            if (!game.isGameOver() && isBotGame && newTurn !== myColor) {
                setTimeout(() => {
                    firestoreGameRef.get().then(doc => {
                        if (doc.exists) {
                            handleBotMove(gameId, firestoreGameRef, doc.data()).catch(err => {
                                console.error("Error in handleBotMove:", err);
                            });
                        }
                    });
                }, 1000);
            }
            return { status: 'success', fen: newFen, turn: newTurn };
        });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error processing move:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while processing the move.');
    }
});
exports.onGameWrite = functions.firestore
    .document('/games/{gameId}')
    .onWrite(async (change, context) => {
    const gameId = context.params.gameId;
    const afterData = change.after.data();
    const beforeData = change.before.data();
    // --- Game Initialization ---
    if (afterData && afterData.status === 'inprogress' && (beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) !== 'inprogress') {
        const liveGameRef = db.ref(`liveGames/${gameId}`);
        const snapshot = await liveGameRef.once('value');
        if (!snapshot.exists()) {
            const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const liveGameState = { fen: startingFen, turn: 'w' };
            const timeControl = afterData.timeControl || { initial: 300000, increment: 0 };
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
            }
            await liveGameRef.set(liveGameState);
            console.log(`Live game created for game ${gameId}`);
        }
    }
    // --- Game Deletion/Cleanup ---
    if (!afterData) {
        await db.ref(`liveGames/${gameId}`).remove();
        console.log(`Live game removed for deleted game ${gameId}`);
        return null;
    }
    // --- Tournament Game Completion ---
    if ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) === 'inprogress' &&
        (afterData === null || afterData === void 0 ? void 0 : afterData.status) === 'completed' &&
        afterData.isTournamentGame) {
        console.log(`Tournament game ${gameId} completed.`);
        const { tournamentId, player1Id, player2Id, winnerId, player1Color } = afterData;
        if (!tournamentId)
            return null;
        const tournamentDoc = await firestore.doc(`tournaments/${tournamentId}`).get();
        if (!tournamentDoc.exists || tournamentDoc.data().state !== 'live') {
            console.log(`Tournament ${tournamentId} is not live. No scores will be updated.`);
            return null;
        }
        const player1Won = (player1Color === 'w' && winnerId === 'w') ||
            (player1Color === 'b' && winnerId === 'b');
        const player2Won = (player1Color === 'w' && winnerId === 'b') ||
            (player1Color === 'b' && winnerId === 'w');
        let p1score = 0;
        let p2score = 0;
        if (winnerId === 'd') {
            p1score = 0.5;
            p2score = 0.5;
        }
        else if (player1Won) {
            p1score = 1;
        }
        else if (player2Won) {
            p2score = 1;
        }
        const p1Ref = firestore.doc(`tournaments/${tournamentId}/players/${player1Id}`);
        const p2Ref = firestore.doc(`tournaments/${tournamentId}/players/${player2Id}`);
        await firestore.batch()
            .update(p1Ref, {
            score: admin.firestore.FieldValue.increment(p1score),
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            activeGameId: null
        })
            .update(p2Ref, {
            score: admin.firestore.FieldValue.increment(p2score),
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            activeGameId: null
        })
            .commit();
        console.log(`Scores updated for tournament ${tournamentId}. Triggering re-pairing.`);
        await pairAndCreateMatches(tournamentId);
    }
    return null;
});
exports.handleGameAction = functions.https.onCall(async (data, context) => {
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
            const gameData = gameDoc.data();
            if (gameData.status === 'completed') {
                throw new functions.https.HttpsError('failed-precondition', 'Game is already completed.');
            }
            if (gameData.isBotGame && ['draw', 'decline-draw', 'abort'].includes(action)) {
                throw new functions.https.HttpsError('failed-precondition', 'This action is not allowed in bot games.');
            }
            const isPlayer1 = uid === gameData.player1Id;
            const isPlayer2 = uid === gameData.player2Id;
            if (!isPlayer1 && !isPlayer2) {
                throw new functions.https.HttpsError('permission-denied', 'You are not a player in this game.');
            }
            const opponentId = isPlayer1 ? gameData.player2Id : gameData.player1Id;
            const myColor = isPlayer1 ? gameData.player1Color : gameData.player2Color;
            const opponentColor = myColor === 'w' ? 'b' : 'w';
            const firestoreUpdates = {};
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
                        firestoreUpdates.lastDrawAction = { type: 'accepted', by: uid, at: admin.firestore.FieldValue.serverTimestamp() };
                        await calculateAndApplyElo(transaction, gameRef, gameData, 'd');
                        transaction.update(gameRef, firestoreUpdates);
                        return { status: 'success' };
                    }
                    else if (currentDrawOffer === uid) {
                        throw new functions.https.HttpsError('failed-precondition', 'You have already offered a draw.');
                    }
                    else { // Offer draw
                        transaction.update(gameRef, { drawOffer: uid });
                        return { status: 'success' };
                    }
                case 'decline-draw':
                    if (gameData.drawOffer === opponentId) {
                        transaction.update(gameRef, { drawOffer: null, lastDrawAction: { type: 'declined', by: uid, at: admin.firestore.FieldValue.serverTimestamp() } });
                        return { status: 'success' };
                    }
                    else {
                        throw new functions.https.HttpsError('failed-precondition', 'No draw offer to decline.');
                    }
                case 'abort':
                    if (gameData.status === 'inprogress') {
                        throw new functions.https.HttpsError('failed-precondition', 'Cannot abort a game that is in progress.');
                    }
                    firestoreUpdates.status = 'completed';
                    firestoreUpdates.winnerId = 'd';
                    firestoreUpdates.reason = 'abort';
                    firestoreUpdates.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    transaction.update(gameRef, firestoreUpdates);
                    return { status: 'success' };
                default:
                    throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
            }
        });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error handling game action:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
exports.handlePlayerDisconnect = functions.database
    .ref('/presence/{uid}')
    .onWrite(async (change, context) => {
    var _a, _b, _c;
    const { uid } = context.params;
    const beforeData = change.before.val();
    const afterData = change.after.val();
    if ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.state) === 'ingame' && (afterData === null || afterData === void 0 ? void 0 : afterData.state) === 'offline') {
        const gameId = beforeData.gameId;
        if (!gameId)
            return null;
        const gameDoc = await firestore.collection('games').doc(gameId).get();
        if (!gameDoc.exists || ((_a = gameDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'inprogress' || ((_b = gameDoc.data()) === null || _b === void 0 ? void 0 : _b.isBotGame)) {
            return null;
        }
        const gracePeriod = 30000;
        await new Promise(resolve => setTimeout(resolve, gracePeriod));
        const currentPresenceSnap = await admin.database().ref(`/presence/${uid}`).once('value');
        if (((_c = currentPresenceSnap.val()) === null || _c === void 0 ? void 0 : _c.state) !== 'offline')
            return null;
        console.log(`Player ${uid} abandoned game ${gameId}.`);
        const gameRef = firestore.collection('games').doc(gameId);
        try {
            await firestore.runTransaction(async (transaction) => {
                const freshGameDoc = await transaction.get(gameRef);
                if (!freshGameDoc.exists)
                    return;
                const gameData = freshGameDoc.data();
                if (gameData.status !== 'inprogress')
                    return;
                const disconnectedPlayerIsP1 = uid === gameData.player1Id;
                const opponentId = disconnectedPlayerIsP1
                    ? gameData.player2Id
                    : gameData.player1Id;
                const winnerColor = disconnectedPlayerIsP1
                    ? gameData.player2Color
                    : gameData.player1Color;
                if (!winnerColor)
                    return;
                const updates = {
                    status: 'completed',
                    winnerId: winnerColor,
                    reason: 'abandoned',
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await calculateAndApplyElo(transaction, gameRef, gameData, winnerColor);
                transaction.update(gameRef, updates);
                // Tournament handling
                if (gameData.isTournamentGame && gameData.tournamentId) {
                    const tournamentId = gameData.tournamentId;
                    const winnerPlayerId = opponentId;
                    const loserPlayerId = uid;
                    const winnerRef = firestore.doc(`tournaments/${tournamentId}/players/${winnerPlayerId}`);
                    const loserRef = firestore.doc(`tournaments/${tournamentId}/players/${loserPlayerId}`);
                    transaction.update(winnerRef, {
                        score: admin.firestore.FieldValue.increment(1),
                        gamesPlayed: admin.firestore.FieldValue.increment(1),
                        activeGameId: null
                    });
                    transaction.update(loserRef, {
                        gamesPlayed: admin.firestore.FieldValue.increment(1),
                        activeGameId: null
                    });
                }
                if (opponentId) {
                    const opponentPresenceRef = admin.database().ref(`/presence/${opponentId}`);
                    opponentPresenceRef.once('value').then(snap => {
                        if (snap.exists() && snap.val().gameId === gameId) {
                            opponentPresenceRef.update({ state: 'online', gameId: null });
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error(`Failed to process abandonment for game ${gameId}:`, error);
        }
    }
    return null;
});
// --- TOURNAMENT ADMIN ACTIONS (CALLABLE) ---
exports.createTournament = functions.https.onCall(async (data, context) => {
    // Assuming admin check is done via a custom claim or other mechanism
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin access required.');
    }
    const { name, timeControl, startTime, durationMinutes, maxPlayers } = data;
    // Add validation for inputs
    if (!name || !timeControl || !startTime || !durationMinutes || !maxPlayers) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required tournament data.');
    }
    const newTournamentRef = firestore.collection('tournaments').doc();
    await newTournamentRef.set({
        name,
        timeControl,
        startTime: admin.firestore.Timestamp.fromMillis(startTime),
        durationMinutes,
        maxPlayers,
        playerCount: 0,
        entryFee: 0, // Defaulting to 0 as per prompt
        state: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { tournamentId: newTournamentRef.id };
});
exports.publishTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin access required.');
    }
    const { tournamentId } = data;
    if (!tournamentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Tournament ID is required.');
    }
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    if (!tournamentDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Tournament not found.');
    }
    const tournament = tournamentDoc.data();
    validateTournamentStateTransition(tournament.state, 'published');
    await tournamentRef.update({ state: 'published' });
    return { success: true };
});
exports.lockTournamentEarly = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin access required.');
    }
    const { tournamentId } = data;
    if (!tournamentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Tournament ID is required.');
    }
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    if (!tournamentDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Tournament not found.');
    }
    const tournament = tournamentDoc.data();
    validateTournamentStateTransition(tournament.state, 'locked');
    await tournamentRef.update({ state: 'locked' });
    return { success: true };
});
exports.archiveTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin access required.');
    }
    const { tournamentId } = data;
    if (!tournamentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Tournament ID is required.');
    }
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    if (!tournamentDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Tournament not found.');
    }
    const tournament = tournamentDoc.data();
    validateTournamentStateTransition(tournament.state, 'archived');
    await tournamentRef.update({ state: 'archived' });
    return { success: true };
});
exports.joinTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to join a tournament.');
    }
    const { tournamentId } = data;
    if (!tournamentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Tournament ID is required.');
    }
    const { uid } = context.auth;
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const playerRef = tournamentRef.collection('players').doc(uid);
    const userRef = firestore.collection('users').doc(uid);
    try {
        await firestore.runTransaction(async (transaction) => {
            const [tournamentDoc, playerDoc, userDoc] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(playerRef),
                transaction.get(userRef)
            ]);
            if (!tournamentDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Tournament not found.');
            }
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User profile not found. Cannot join tournament.');
            }
            const tournament = tournamentDoc.data();
            if (tournament.state !== 'published') {
                throw new functions.https.HttpsError('failed-precondition', `Tournament is not open for registration. Current state: ${tournament.state}.`);
            }
            if (playerDoc.exists) {
                throw new functions.https.HttpsError('already-exists', 'You have already joined this tournament.');
            }
            if (tournament.playerCount >= tournament.maxPlayers) {
                throw new functions.https.HttpsError('failed-precondition', 'Tournament is full.');
            }
            const userProfile = userDoc.data();
            transaction.set(playerRef, {
                uid: uid,
                username: userProfile.username || 'Anonymous',
                eloRating: userProfile.eloRating || 1200,
                score: 0,
                gamesPlayed: 0,
                activeGameId: null,
                joinedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            transaction.update(tournamentRef, {
                playerCount: admin.firestore.FieldValue.increment(1)
            });
        });
        return { success: true, message: 'Successfully joined tournament.' };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error joining tournament:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while joining the tournament.');
    }
});
exports.leaveTournament = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to leave a tournament.');
    }
    const { tournamentId } = data;
    if (!tournamentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Tournament ID is required.');
    }
    const { uid } = context.auth;
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const playerRef = tournamentRef.collection('players').doc(uid);
    try {
        await firestore.runTransaction(async (transaction) => {
            const [tournamentDoc, playerDoc] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(playerRef)
            ]);
            if (!tournamentDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Tournament not found.');
            }
            if (!playerDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'You are not registered for this tournament.');
            }
            const tournament = tournamentDoc.data();
            if (tournament.state !== 'published') {
                throw new functions.https.HttpsError('failed-precondition', `Cannot leave a tournament that is not open for registration. Current state: ${tournament.state}.`);
            }
            transaction.delete(playerRef);
            transaction.update(tournamentRef, {
                playerCount: admin.firestore.FieldValue.increment(-1)
            });
        });
        return { success: true, message: 'Successfully left tournament.' };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error leaving tournament:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while leaving the tournament.');
    }
});
// --- AUTOMATIC TOURNAMENT STATE TRANSITIONS ---
exports.autoTransitionTournaments = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const batch = firestore.batch();
    // published -> locked
    const publishedQuery = firestore.collection('tournaments')
        .where('state', '==', 'published')
        .where('startTime', '<=', now);
    const publishedSnapshot = await publishedQuery.get();
    publishedSnapshot.docs.forEach(doc => {
        console.log(`Locking tournament ${doc.id} as start time has passed.`);
        batch.update(doc.ref, { state: 'locked' });
    });
    // live -> completed
    const liveQuery = firestore.collection('tournaments').where('state', '==', 'live');
    const liveSnapshot = await liveQuery.get();
    liveSnapshot.docs.forEach(doc => {
        const t = doc.data();
        if (t.liveSince) {
            const endTime = t.liveSince.toMillis() + (t.durationMinutes * 60 * 1000);
            if (now.toMillis() >= endTime) {
                console.log(`Completing tournament ${doc.id} as its duration has ended.`);
                batch.update(doc.ref, { state: 'completed' });
            }
        }
    });
    // completed -> archived (after 10 minutes)
    const tenMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - (10 * 60 * 1000));
    const completedQuery = firestore.collection('tournaments')
        .where('state', '==', 'completed')
        .where('liveSince', '<=', tenMinutesAgo); // liveSince can approximate completion time for this
    const completedSnapshot = await completedQuery.get();
    completedSnapshot.docs.forEach(doc => {
        console.log(`Archiving tournament ${doc.id}.`);
        batch.update(doc.ref, { state: 'archived' });
    });
    return batch.commit();
});
exports.onTournamentStateChange = functions.firestore
    .document('/tournaments/{tournamentId}')
    .onUpdate(async (change, context) => {
    const tournamentId = context.params.tournamentId;
    const before = change.before.data();
    const after = change.after.data();
    // published -> locked -> live (immediate transition)
    if (before.state === 'published' && after.state === 'locked') {
        // Immediately transition to live after locking
        console.log(`Tournament ${tournamentId} is locked. Transitioning to live.`);
        await change.after.ref.update({
            state: 'live',
            liveSince: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    // locked -> live (Tournament actually starts here)
    if (before.state === 'locked' && after.state === 'live') {
        console.log(`Tournament ${tournamentId} is now live. Initiating pairings.`);
        await pairAndCreateMatches(tournamentId);
    }
    // live -> completed (Finalize results)
    if (before.state === 'live' && after.state === 'completed') {
        console.log(`Tournament ${tournamentId} has completed. Finalizing results.`);
        await finalizeTournamentResults(tournamentId);
    }
});
/**
 * TEMPORARY UTILITY FUNCTION
 * This function is for initial setup only to grant the first admin role.
 * It should be DELETED from production environments after the initial admin user is set up.
 * Security Note: This function allows a user to make themselves an admin, or an existing admin to grant claims.
 */
exports.grantAdminClaim = functions.https.onCall(async (data, context) => {
    // 1. Check if the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "uid" argument.');
    }
    // 2. Security Check: Only allow a user to make themselves an admin, or an existing admin to make another user an admin.
    const isSelfGrant = context.auth.uid === uid;
    const isExistingAdmin = context.auth.token.admin === true;
    if (!isSelfGrant && !isExistingAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to grant admin claims.');
    }
    try {
        // 3. Set the custom claim.
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log(`Successfully granted admin claim to user: ${uid}`);
        // 4. Return success.
        return { success: true, message: `Admin claim granted to user ${uid}. Please log out and log back in for it to take effect.` };
    }
    catch (error) {
        console.error('Error setting custom claim:', error);
        throw new functions.https.HttpsError('internal', 'An internal error occurred while setting the custom claim.');
    }
});
//# sourceMappingURL=index.js.map