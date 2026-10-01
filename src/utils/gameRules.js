import { SPECIAL_SCORES, SPECIAL_DARTS, MAX_DARTS_PER_TURN } from './constants.js';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function calculateDartScore(dart) {
  if (!dart) return 0;
  if (dart.type === SPECIAL_DARTS.MISS) return 0;
  if (dart.type === SPECIAL_DARTS.OUTER_BULL) return SPECIAL_SCORES.OUTER_BULL;
  if (dart.type === SPECIAL_DARTS.BULLSEYE) return SPECIAL_SCORES.BULLSEYE;

  const num = dart.number || 0;
  const mult = dart.multiplier || 1;
  return num * mult;
}

export function isDouble(dart) {
  if (!dart) return false;
  if (dart.type === SPECIAL_DARTS.BULLSEYE) return true;
  if (dart.type === SPECIAL_DARTS.OUTER_BULL) return false;
  if (dart.type === SPECIAL_DARTS.MISS) return false;
  return dart.multiplier === 2;
}

export function isTriple(dart) {
  if (!dart) return false;
  if (dart.type === SPECIAL_DARTS.BULLSEYE || dart.type === SPECIAL_DARTS.OUTER_BULL || dart.type === SPECIAL_DARTS.MISS) {
    return false;
  }
  return dart.multiplier === 3;
}

export function isBullseye(dart) {
  return dart && dart.type === SPECIAL_DARTS.BULLSEYE;
}

export function formatDartLabel(dart) {
  if (!dart) return '-';
  if (dart.type === SPECIAL_DARTS.MISS) return 'MISS';
  if (dart.type === SPECIAL_DARTS.OUTER_BULL) return '25';
  if (dart.type === SPECIAL_DARTS.BULLSEYE) return 'BULL';
  const multPrefix = dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : '';
  return `${multPrefix}${dart.number}`;
}

export function createPlayer(name, startingScore) {
  return {
    id: generateId(),
    name: name || 'Player',
    score: startingScore,
    hasStarted: false,
    dartsThrown: 0,
    totalPoints: 0,
    highestDart: 0,
    highestTurn: 0,
    busts: 0,
    doubleAttempts: 0,
    doubleHits: 0,
    turnsHistory: [],
  };
}

export function calculateTurnScore(darts) {
  return darts.reduce((sum, d) => sum + calculateDartScore(d), 0);
}

export function calculateThreeDartAverage(player) {
  if (!player || player.dartsThrown === 0) return 0;
  return (player.totalPoints / player.dartsThrown) * 3;
}

export function calculateDoublePercentage(player) {
  if (!player || player.doubleAttempts === 0) return 0;
  return (player.doubleHits / player.doubleAttempts) * 100;
}

export function count180s(player) {
  if (!player || !player.turnsHistory) return 0;
  return player.turnsHistory.filter(turn => turn.score === 180).length;
}

export function count140s(player) {
  if (!player || !player.turnsHistory) return 0;
  return player.turnsHistory.filter(turn => turn.score >= 140 && turn.score < 180).length;
}

export function switchPlayer(currentIndex, playerCount) {
  return (currentIndex + 1) % playerCount;
}

export function getTurnNumber(game) {
  if (!game || !game.players) return 0;
  const totalDarts = game.players.reduce((sum, p) => sum + p.dartsThrown, 0);
  return Math.floor(totalDarts / MAX_DARTS_PER_TURN) + 1;
}
