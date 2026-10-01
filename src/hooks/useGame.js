import { useState, useEffect, useCallback, useRef } from 'react';
import {
  STORAGE_KEYS,
  DEFAULT_RULES,
  DEFAULT_STARTING_SCORE,
  GAME_STATUS,
  MAX_DARTS_PER_TURN,
  SPECIAL_DARTS,
  GAME_CONTEXT,
} from '../utils/constants.js';
import {
  generateId,
  calculateDartScore,
  calculateTurnScore,
  isDouble,
  createPlayer,
  switchPlayer,
  calculateThreeDartAverage,
  calculateDoublePercentage,
  count180s,
  count140s,
} from '../utils/gameRules.js';
import {
  validateDart,
  detectBust,
  validateCheckout,
  canCheckout,
} from '../utils/scoreValidator.js';
import {
  readFromStorage,
  writeToStorage,
  removeFromStorage,
  readFromSessionStorage,
  writeToSessionStorage,
  removeFromSessionStorage,
} from '../hooks/useLocalStorage.js'; // No-ops now - all data saved to database
import { saveRemoteGame } from '../services/gameSync.js';

function createInitialGameState(playerNames, startingScore, rules, gameContext = GAME_CONTEXT.STANDALONE, contextData = null) {
  const players = playerNames.map(name => createPlayer(name, startingScore));
  const firstScore = players[0].score;
  return {
    id: generateId(),
    status: GAME_STATUS.ACTIVE,
    startingScore,
    rules: { ...DEFAULT_RULES, ...rules },
    currentPlayerIndex: 0,
    currentTurn: {
      startScore: firstScore,
      darts: [],
    },
    players,
    history: [],
    winnerId: null,
    createdAt: Date.now(),
    completedAt: null,
    gameContext,
    contextData,
  };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function useGame(initialPlayers, startingScore = DEFAULT_STARTING_SCORE, rules = DEFAULT_RULES, gameContext = GAME_CONTEXT.STANDALONE, contextData = null) {
  const [game, setGame] = useState(() => {
    // All data comes from database now - no sessionStorage fallback
    if (initialPlayers && initialPlayers.length > 0) {
      return createInitialGameState(initialPlayers, startingScore, rules, gameContext, contextData);
    }
    return null;
  });

  const historyRef = useRef([]);
  const contextRef = useRef({ gameContext, contextData });

  useEffect(() => {
    contextRef.current = { gameContext, contextData };
  }, [gameContext, contextData]);
  useEffect(() => {
    if (game) {
      // Save to database only - no sessionStorage
      saveRemoteGame(game);
    }
  }, [game]);

  const startNewGame = useCallback((playerNames, sScore = DEFAULT_STARTING_SCORE, gameRules = DEFAULT_RULES, gContext = GAME_CONTEXT.STANDALONE, ctxData = null) => {
    historyRef.current = [];
    const newGame = createInitialGameState(playerNames, sScore, gameRules, gContext, ctxData);
    setGame(newGame);
    return newGame;
  }, []);

  const loadGame = useCallback((savedGame) => {
    historyRef.current = [];
    setGame(savedGame);
  }, []);

  const pushHistory = useCallback((prevState) => {
    historyRef.current.push(clone(prevState));
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
  }, []);

  const undoLastDart = useCallback(() => {
    if (historyRef.current.length === 0) return false;
    const prev = historyRef.current.pop();
    setGame(prev);
    return true;
  }, []);

  const processDart = useCallback((dart) => {
    let result = { success: false, bust: false, win: false, reason: null };

    setGame(prevGame => {
      if (!prevGame || prevGame.status !== GAME_STATUS.ACTIVE) {
        result.reason = 'No active game';
        return prevGame;
      }
      if (prevGame.currentTurn.darts.length >= MAX_DARTS_PER_TURN) {
        result.reason = 'Turn complete';
        return prevGame;
      }

      const validation = validateDart(dart);
      if (!validation.valid) {
        result.reason = validation.reason;
        return prevGame;
      }

      pushHistory(prevGame);
      const newGame = clone(prevGame);
      const playerIdx = newGame.currentPlayerIndex;
      const player = newGame.players[playerIdx];
      const turnDarts = [...newGame.currentTurn.darts, dart];
      const startScore = newGame.currentTurn.startScore;

      const dartScore = calculateDartScore(dart);
      const isDoubleDart = isDouble(dart);
      const isMiss = dart.type === SPECIAL_DARTS.MISS;

      const bustCheck = simulateTurn(startScore, newGame.currentTurn.darts, dart, player.hasStarted, newGame.rules);

      if (bustCheck.bust) {
        player.busts += 1;
        newGame.currentTurn.darts = [];
        if (newGame.rules.doubleOut) {
          const finisherDart = dart;
          if (bustCheck.reason === 'Double required to checkout' || bustCheck.reason === 'Score does not match') {
            if (isDoubleDart || (player.hasStarted && newGame.rules.doubleOut)) {
              player.doubleAttempts += 1;
            }
          }
        }
        result.bust = true;
        result.reason = bustCheck.reason;
        newGame.players[playerIdx] = player;
        const nextIdx = switchPlayer(playerIdx, newGame.players.length);
        newGame.currentPlayerIndex = nextIdx;
        newGame.currentTurn = {
          startScore: newGame.players[nextIdx].score,
          darts: [],
        };
        newGame.history.push({
          playerId: player.id,
          turn: turnDarts,
          score: 0,
          bust: true,
          timestamp: Date.now(),
        });
        return newGame;
      }

      if (bustCheck.win) {
        let sc = startScore;
        let started = player.hasStarted;
        for (const d of newGame.currentTurn.darts) {
          if (!started) {
            if (newGame.rules.doubleIn && isDouble(d)) started = true;
            else if (!newGame.rules.doubleIn) started = true;
            else continue;
          }
          sc -= calculateDartScore(d);
        }
        const beforeFinal = sc;
        player.hasStarted = true;
        if (newGame.rules.doubleIn && !started) {
          if (isDouble(dart)) started = true;
        } else {
          started = true;
        }
        player.score = beforeFinal - dartScore;
        player.dartsThrown += 1;
        player.totalPoints += dartScore;
        if (dartScore > player.highestDart) player.highestDart = dartScore;

        if (isDoubleDart) {
          player.doubleAttempts += 1;
          player.doubleHits += 1;
        } else if (!isMiss && newGame.rules.doubleOut && beforeFinal <= 170) {
        }

        const turnTotal = calculateTurnScore(turnDarts);
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;

        const turnStats = { score: turnTotal, darts: turnDarts.length };
        player.turnsHistory.push(turnStats);

        newGame.status = GAME_STATUS.COMPLETED;
        newGame.winnerId = player.id;
        newGame.completedAt = Date.now();
        newGame.currentTurn.darts = turnDarts;
        newGame.players[playerIdx] = player;
        newGame.history.push({
          playerId: player.id,
          turn: turnDarts,
          score: turnTotal,
          bust: false,
          win: true,
          timestamp: Date.now(),
        });
        if (!newGame.gameContext || newGame.gameContext === GAME_CONTEXT.STANDALONE) {
          saveToHistory(newGame);
        }
        result.win = true;
        result.success = true;
        return newGame;
      }

      let started = player.hasStarted;
      if (!started) {
        if (newGame.rules.doubleIn) {
          if (isDoubleDart) {
            started = true;
          } else {
            newGame.currentTurn.darts = turnDarts;
            player.dartsThrown += 1;
            if (isDoubleDart) {
              player.doubleAttempts += 1;
              player.doubleHits += 1;
            }
            newGame.players[playerIdx] = player;
            result.success = true;
            if (turnDarts.length >= MAX_DARTS_PER_TURN) {
              const nextIdx = switchPlayer(playerIdx, newGame.players.length);
              newGame.currentPlayerIndex = nextIdx;
              newGame.currentTurn = {
                startScore: newGame.players[nextIdx].score,
                darts: [],
              };
              newGame.history.push({
                playerId: player.id,
                turn: turnDarts,
                score: 0,
                bust: false,
                timestamp: Date.now(),
              });
            }
            return newGame;
          }
        } else {
          started = true;
        }
      }

      player.hasStarted = true;
      player.score -= dartScore;
      player.dartsThrown += 1;
      player.totalPoints += dartScore;
      if (dartScore > player.highestDart) player.highestDart = dartScore;

      if (isDoubleDart) {
        player.doubleAttempts += 1;
        player.doubleHits += 1;
      } else if (!isMiss && canCheckout(player.score + dartScore, newGame.rules)) {
        if (newGame.rules.doubleOut) {
        }
      }

      newGame.currentTurn.darts = turnDarts;
      newGame.players[playerIdx] = player;
      result.success = true;

      if (turnDarts.length >= MAX_DARTS_PER_TURN) {
        const turnTotal = calculateTurnScore(turnDarts);
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;
        player.turnsHistory.push({ score: turnTotal, darts: turnDarts.length });
        newGame.players[playerIdx] = player;

        const nextIdx = switchPlayer(playerIdx, newGame.players.length);
        newGame.currentPlayerIndex = nextIdx;
        newGame.currentTurn = {
          startScore: newGame.players[nextIdx].score,
          darts: [],
        };
        newGame.history.push({
          playerId: player.id,
          turn: turnDarts,
          score: turnTotal,
          bust: false,
          timestamp: Date.now(),
        });
      }

      return newGame;
    });

    return result;
  }, [pushHistory]);

  const endTurn = useCallback(() => {
    let turnedEnded = false;
    let wasBust = false;
    let bustReason = '';
    setGame(prevGame => {
      if (!prevGame || prevGame.status !== GAME_STATUS.ACTIVE) return prevGame;
      if (prevGame.currentTurn.darts.length === 0) return prevGame;
      pushHistory(prevGame);
      const newGame = clone(prevGame);
      const playerIdx = newGame.currentPlayerIndex;
      const player = newGame.players[playerIdx];
      const turnTotal = calculateTurnScore(newGame.currentTurn.darts);
      const bustCheck = detectBust(player, newGame.currentTurn.darts, newGame.rules, true);
      if (bustCheck.bust) {
        player.busts += 1;
        player.score = newGame.currentTurn.startScore;
        wasBust = true;
        bustReason = bustCheck.reason || '';
        newGame.history.push({
          playerId: player.id,
          turn: [...newGame.currentTurn.darts],
          score: 0,
          bust: true,
          timestamp: Date.now(),
        });
      } else {
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;
        player.turnsHistory.push({
          score: turnTotal,
          darts: newGame.currentTurn.darts.length,
        });
        newGame.history.push({
          playerId: player.id,
          turn: [...newGame.currentTurn.darts],
          score: turnTotal,
          bust: false,
          timestamp: Date.now(),
        });
      }
      newGame.players[playerIdx] = player;
      const nextIdx = switchPlayer(playerIdx, newGame.players.length);
      newGame.currentPlayerIndex = nextIdx;
      newGame.currentTurn = {
        startScore: newGame.players[nextIdx].score,
        darts: [],
      };
      turnedEnded = true;
      return newGame;
    });
    return { ended: turnedEnded, bust: wasBust, reason: bustReason };
  }, [pushHistory]);

  const pauseGame = useCallback(() => {
    setGame(prev => {
      if (!prev || prev.status !== GAME_STATUS.ACTIVE) return prev;
      const pausedGame = { ...prev, status: GAME_STATUS.PAUSED };
      saveRemoteGame(pausedGame);
      return pausedGame;
    });
  }, []);

  const resumeGame = useCallback(() => {
    setGame(prev => {
      if (!prev || prev.status !== GAME_STATUS.PAUSED) return prev;
      const activeGame = { ...prev, status: GAME_STATUS.ACTIVE };
      saveRemoteGame(activeGame);
      return activeGame;
    });
  }, []);

  const restartGame = useCallback(() => {
    if (!game) return null;
    const names = game.players.map(p => p.name);
    historyRef.current = [];
    const fresh = createInitialGameState(
      names,
      game.startingScore,
      game.rules,
      game.gameContext || GAME_CONTEXT.STANDALONE,
      game.contextData || null
    );
    setGame(fresh);
    return fresh;
  }, [game]);

  const clearActiveGame = useCallback(() => {
    historyRef.current = [];
    setGame(null);
  }, []);

  const getCurrentPlayer = useCallback(() => {
    if (!game) return null;
    return game.players[game.currentPlayerIndex];
  }, [game]);

  const getDartsLeftInTurn = useCallback(() => {
    if (!game) return MAX_DARTS_PER_TURN;
    return MAX_DARTS_PER_TURN - game.currentTurn.darts.length;
  }, [game]);

  const getCurrentTurnScore = useCallback(() => {
    if (!game) return 0;
    return calculateTurnScore(game.currentTurn.darts);
  }, [game]);

  const canUndo = useCallback(() => {
    return historyRef.current.length > 0;
  }, []);

  return {
    game,
    startNewGame,
    loadGame,
    processDart,
    undoLastDart,
    endTurn,
    pauseGame,
    resumeGame,
    restartGame,
    clearActiveGame,
    getCurrentPlayer,
    getDartsLeftInTurn,
    getCurrentTurnScore,
    canUndo,
    calculateThreeDartAverage,
    calculateDoublePercentage,
    count180s,
    count140s,
  };
}

function simulateTurn(startScore, existingDarts, newDart, hasStarted, rules) {
  let score = startScore;
  let started = hasStarted;
  const allDarts = [...existingDarts, newDart];
  const isEndOfTurn = allDarts.length >= MAX_DARTS_PER_TURN;

  for (let i = 0; i < allDarts.length; i++) {
    const d = allDarts[i];

    if (!started) {
      if (rules.doubleIn) {
        if (isDouble(d)) {
          started = true;
        } else {
          continue;
        }
      } else {
        started = true;
      }
    }

    const ds = calculateDartScore(d);
    score -= ds;

    if (score < 0) {
      return { bust: true, win: false, reason: 'Score below zero' };
    }

    if (score === 0) {
      const finalDartScore = calculateDartScore(d);
      if (rules.doubleOut) {
        if (!isDouble(d)) {
          return { bust: true, win: false, reason: 'Double required to checkout' };
        }
      }
      return { bust: false, win: true };
    }
  }

  if (rules.doubleOut && score === 1 && isEndOfTurn) {
    return { bust: true, win: false, reason: 'Cannot finish on 1 with Double Out' };
  }

  return { bust: false, win: false };
}

function saveToHistory(completedGame) {
  try {
    const existing = readFromStorage(STORAGE_KEYS.GAME_HISTORY, []);
    const summary = {
      id: completedGame.id,
      date: completedGame.completedAt || Date.now(),
      startingScore: completedGame.startingScore,
      rules: completedGame.rules,
      players: completedGame.players.map(p => ({
        id: p.id,
        name: p.name,
        finalScore: p.score,
        dartsThrown: p.dartsThrown,
        totalPoints: p.totalPoints,
        highestDart: p.highestDart,
        highestTurn: p.highestTurn,
        busts: p.busts,
        doubleAttempts: p.doubleAttempts,
        doubleHits: p.doubleHits,
        threeDartAverage: calculateThreeDartAverage(p),
        doublePercentage: calculateDoublePercentage(p),
        count180s: count180s(p),
        count140s: count140s(p),
      })),
      winnerId: completedGame.winnerId,
      winnerName: completedGame.players.find(p => p.id === completedGame.winnerId)?.name || '',
      totalTurns: completedGame.history.length,
      history: completedGame.history,
    };
    const updated = [summary, ...existing];
    writeToStorage(STORAGE_KEYS.GAME_HISTORY, updated);
  } catch (err) {
    console.error('Error saving game history:', err);
  }
}
