import { DART_NUMBERS, SPECIAL_DARTS } from './constants.js';

const ALL_DARTS = [];

DART_NUMBERS.forEach(n => {
  ALL_DARTS.push({ number: n, multiplier: 1, score: n, label: `S${n}`, type: 'NUMBER' });
  ALL_DARTS.push({ number: n, multiplier: 2, score: n * 2, label: `D${n}`, type: 'NUMBER' });
  ALL_DARTS.push({ number: n, multiplier: 3, score: n * 3, label: `T${n}`, type: 'NUMBER' });
});
ALL_DARTS.push({ type: SPECIAL_DARTS.OUTER_BULL, score: 25, label: '25', number: 25, multiplier: 1 });
ALL_DARTS.push({ type: SPECIAL_DARTS.BULLSEYE, score: 50, label: 'BULL', number: 50, multiplier: 2 });

const FINISH_DARTS_DOUBLE_OUT = ALL_DARTS.filter(d => {
  if (d.type === SPECIAL_DARTS.BULLSEYE) return true;
  if (d.type === 'NUMBER' && d.multiplier === 2) return true;
  return false;
});

function isDouble(dart) {
  if (dart.type === SPECIAL_DARTS.BULLSEYE) return true;
  if (dart.type === 'NUMBER' && dart.multiplier === 2) return true;
  return false;
}

function find1DartCheckout(score, doubleOut) {
  const candidates = doubleOut ? FINISH_DARTS_DOUBLE_OUT : ALL_DARTS;
  for (const d of candidates) {
    if (d.score === score) {
      return [{ ...d }];
    }
  }
  return null;
}

function find2DartCheckout(score, doubleOut) {
  for (const f1 of ALL_DARTS) {
    const remaining = score - f1.score;
    if (remaining <= 0) continue;
    const finishers = doubleOut ? FINISH_DARTS_DOUBLE_OUT : ALL_DARTS;
    for (const f2 of finishers) {
      if (f2.score === remaining) {
        return [{ ...f1 }, { ...f2 }];
      }
    }
  }
  return null;
}

function find3DartCheckout(score, doubleOut) {
  for (const f1 of ALL_DARTS) {
    if (f1.score >= score) continue;
    for (const f2 of ALL_DARTS) {
      const sofar = f1.score + f2.score;
      if (sofar >= score) continue;
      const remaining = score - sofar;
      const finishers = doubleOut ? FINISH_DARTS_DOUBLE_OUT : ALL_DARTS;
      for (const f3 of finishers) {
        if (f3.score === remaining) {
          return [{ ...f1 }, { ...f2 }, { ...f3 }];
        }
      }
    }
  }
  return null;
}

function prioritize(checkouts) {
  return checkouts.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    const scoreA = a.reduce((s, d) => s + d.score, 0);
    const scoreB = b.reduce((s, d) => s + d.score, 0);
    if (scoreA !== scoreB) return 0;
    const highSingleA = Math.max(...a.map(d => d.score));
    const highSingleB = Math.max(...b.map(d => d.score));
    return highSingleB - highSingleA;
  });
}

export function getCheckoutSuggestion(remainingScore, rules, dartsLeft = 3) {
  if (remainingScore <= 0) return [];

  const doubleOut = !!rules.doubleOut;

  if (doubleOut && remainingScore === 1) return [];
  if (doubleOut && remainingScore > 170) return [];
  if (!doubleOut && remainingScore > 180) return [];

  const results = [];

  if (dartsLeft >= 1) {
    const r1 = find1DartCheckout(remainingScore, doubleOut);
    if (r1) results.push(r1);
  }
  if (dartsLeft >= 2) {
    const r2 = find2DartCheckout(remainingScore, doubleOut);
    if (r2) results.push(r2);
  }
  if (dartsLeft >= 3) {
    const r3 = find3DartCheckout(remainingScore, doubleOut);
    if (r3) results.push(r3);
  }

  if (results.length === 0) return [];

  const sorted = prioritize(results);
  return sorted[0];
}

export function getAllCheckoutSuggestions(remainingScore, rules, dartsLeft = 3) {
  if (remainingScore <= 0) return [];

  const doubleOut = !!rules.doubleOut;

  if (doubleOut && remainingScore === 1) return [];
  if (doubleOut && remainingScore > 170) return [];
  if (!doubleOut && remainingScore > 180) return [];

  const results = [];

  if (dartsLeft >= 1) {
    const r1 = find1DartCheckout(remainingScore, doubleOut);
    if (r1) results.push(r1);
  }
  if (dartsLeft >= 2) {
    const r2 = find2DartCheckout(remainingScore, doubleOut);
    if (r2) results.push(r2);
  }
  if (dartsLeft >= 3) {
    const r3 = find3DartCheckout(remainingScore, doubleOut);
    if (r3) results.push(r3);
  }

  return prioritize(results).slice(0, 3);
}
