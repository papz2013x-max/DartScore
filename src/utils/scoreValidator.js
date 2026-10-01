import { DART_NUMBERS, SPECIAL_DARTS } from './constants.js';
import { isDouble, isTriple, calculateDartScore } from './gameRules.js';

export function validateDart(dart) {
  if (!dart) return { valid: false, reason: 'Invalid dart' };
  if (dart.type === SPECIAL_DARTS.MISS) return { valid: true };
  if (dart.type === SPECIAL_DARTS.OUTER_BULL) return { valid: true };
  if (dart.type === SPECIAL_DARTS.BULLSEYE) return { valid: true };

  if (!DART_NUMBERS.includes(dart.number)) {
    return { valid: false, reason: 'Invalid dart number' };
  }

  if (isTriple(dart) && (dart.number === 25 || dart.number === 50)) {
    return { valid: false, reason: 'Triple bull is not allowed' };
  }

  return { valid: true };
}

export function validateCheckout(remainingScore, finalDart, rules) {
  if (remainingScore !== calculateDartScore(finalDart)) {
    return { valid: false, reason: 'Score does not match' };
  }

  if (rules.doubleOut) {
    if (!isDouble(finalDart)) {
      return { valid: false, reason: 'Double required to checkout' };
    }
  }

  return { valid: true };
}

export function detectBust(player, dartsThrown, rules, isEndOfTurn = false) {
  const startScore = player.score;
  let runningScore = startScore;
  let hasStarted = player.hasStarted;

  for (let i = 0; i < dartsThrown.length; i++) {
    const dart = dartsThrown[i];
    const isLastDart = i === dartsThrown.length - 1;

    if (!hasStarted) {
      if (rules.doubleIn && isDouble(dart)) {
        hasStarted = true;
      } else if (!rules.doubleIn) {
        hasStarted = true;
      } else {
        continue;
      }
    }

    const dartScore = calculateDartScore(dart);
    runningScore -= dartScore;

    if (runningScore < 0) {
      return { bust: true, reason: 'Score below zero' };
    }

    if (runningScore === 0) {
      const checkout = validateCheckout(dartScore, dart, rules);
      if (!checkout.valid) {
        return { bust: true, reason: checkout.reason };
      }
      return { bust: false, win: true };
    }
  }

  if (rules.doubleOut && runningScore === 1 && isEndOfTurn) {
    return { bust: true, reason: 'Cannot finish on 1 with Double Out' };
  }

  return { bust: false, win: false };
}

export function canCheckout(remainingScore, rules) {
  if (remainingScore < 0) return false;
  if (remainingScore === 0) return false;
  if (rules.doubleOut && remainingScore === 1) return false;
  if (rules.doubleOut && remainingScore > 170) return false;
  if (!rules.doubleOut && remainingScore > 180) return false;
  return true;
}
