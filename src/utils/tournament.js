import {
  TOURNAMENT_STATUS,
  MATCH_STATUS,
  TOURNAMENT_FORMAT,
  MATCH_FORMAT,
  SUPPORTED_PLAYER_COUNTS,
  BRACKET_TYPE,
} from './constants.js';
import { generateId, createPlayer } from './gameRules.js';

export function createTournamentPlayer(name) {
  const base = createPlayer(name, 0);
  return {
    id: base.id,
    name: base.name,
  };
}

export function shufflePlayers(players) {
  const arr = [...players];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getMatchFormatWinRequirement(matchFormat) {
  switch (matchFormat) {
    case MATCH_FORMAT.BEST_OF_1: return 1;
    case MATCH_FORMAT.BEST_OF_3: return 2;
    case MATCH_FORMAT.BEST_OF_5: return 3;
    default: return 1;
  }
}

export function getTournamentRoundName(roundIndex, totalRounds, bracketType = BRACKET_TYPE.WINNERS, numPlayers = 4) {
  const winnersNames = [
    'Final',
    'Semifinals',
    'Quarterfinals',
    'Round of 16',
    'Round of 32',
    'Round of 64',
  ];

  if (bracketType === BRACKET_TYPE.GRAND_FINAL) {
    return 'Grand Final';
  }

  if (bracketType === BRACKET_TYPE.LOSERS) {
    const k = Math.log2(numPlayers);
    const totalLBRounds = 2 * k - 2;
    if (roundIndex === totalLBRounds - 1) return 'Losers Final';
    return `Losers Round ${roundIndex + 1}`;
  }

  const fromFinal = totalRounds - 1 - roundIndex;
  if (fromFinal < winnersNames.length) return winnersNames[fromFinal];
  return `Round ${roundIndex + 1}`;
}

export function createMatch(player1 = null, player2 = null, matchNumber = 1) {
  return {
    id: generateId(),
    matchNumber,
    player1,
    player2,
    player1Legs: 0,
    player2Legs: 0,
    status: MATCH_STATUS.UPCOMING,
    winner: null,
    legs: [],
    startedAt: null,
    completedAt: null,
    winnerAdvancesTo: null,
    loserAdvancesTo: null,
  };
}

export function determineNumRounds(numPlayers, format = TOURNAMENT_FORMAT.SINGLE_ELIMINATION) {
  const k = Math.log2(numPlayers);
  if (format === TOURNAMENT_FORMAT.SINGLE_ELIMINATION) {
    return k;
  }
  return 2 * k - 1;
}

function createMatchesForRound(shuffledPlayers, matchCount, startingMatchNumber, roundIndex, totalRounds, bracketType = BRACKET_TYPE.WINNERS) {
  const matches = [];
  const isFirstRound = roundIndex === 0 && bracketType === BRACKET_TYPE.WINNERS;

  for (let i = 0; i < matchCount; i++) {
    let p1 = null;
    let p2 = null;

    if (isFirstRound) {
      p1 = shuffledPlayers[i * 2] || null;
      p2 = shuffledPlayers[i * 2 + 1] || null;
    }

    const match = createMatch(p1, p2, startingMatchNumber + i);
    match.bracketType = bracketType;

    if (isFirstRound && p1 && p2) {
      match.status = MATCH_STATUS.UPCOMING;
    } else if (!isFirstRound) {
      match.player1 = null;
      match.player2 = null;
      match.status = MATCH_STATUS.UPCOMING;
    }

    matches.push(match);
  }
  return matches;
}

function buildSingleEliminationRounds(shuffled, numPlayers, totalRounds) {
  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = numPlayers / Math.pow(2, r + 1);
    const roundMatches = createMatchesForRound(
      shuffled,
      matchesInRound,
      matchCounter,
      r,
      totalRounds,
      BRACKET_TYPE.WINNERS
    );
    matchCounter += matchesInRound;

    rounds.push({
      id: generateId(),
      name: getTournamentRoundName(r, totalRounds, BRACKET_TYPE.WINNERS, numPlayers),
      roundIndex: r,
      bracketType: BRACKET_TYPE.WINNERS,
      matches: roundMatches,
    });
  }

  for (let r = 0; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].matches.length; m++) {
      const match = rounds[r].matches[m];
      if (r < rounds.length - 1) {
        const nextRoundIndex = r + 1;
        const nextMatchIndex = Math.floor(m / 2);
        const isFirstSlot = m % 2 === 0;
        match.winnerAdvancesTo = {
          roundIndex: nextRoundIndex,
          matchIndex: nextMatchIndex,
          slot: isFirstSlot ? 'player1' : 'player2',
        };
      }
      match.loserAdvancesTo = null;
    }
  }

  return { rounds, nextMatchNumber: matchCounter };
}

function buildDoubleEliminationRounds(shuffled, numPlayers) {
  const k = Math.log2(numPlayers);
  const totalWBRounds = k;
  const totalLBRounds = 2 * k - 2;

  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < totalWBRounds; r++) {
    const matchesInRound = numPlayers / Math.pow(2, r + 1);
    const roundMatches = createMatchesForRound(
      shuffled,
      matchesInRound,
      matchCounter,
      r,
      totalWBRounds,
      BRACKET_TYPE.WINNERS
    );
    matchCounter += matchesInRound;

    rounds.push({
      id: generateId(),
      name: getTournamentRoundName(r, totalWBRounds, BRACKET_TYPE.WINNERS, numPlayers),
      roundIndex: rounds.length,
      bracketType: BRACKET_TYPE.WINNERS,
      matches: roundMatches,
    });
  }

  const wbRoundGlobalIndex = rounds.map((rd, idx) =>
    rd.bracketType === BRACKET_TYPE.WINNERS ? idx : -1
  ).filter(i => i >= 0);

  const lbMatchCounts = [];
  for (let lbR = 0; lbR < totalLBRounds; lbR++) {
    let count;
    if (lbR === 0) {
      count = numPlayers / 4;
    } else if (lbR % 2 === 1) {
      const wbLosersFrom = (lbR + 1) / 2;
      count = numPlayers / Math.pow(2, wbLosersFrom + 1);
    } else {
      count = lbMatchCounts[lbR - 1] / 2;
    }
    lbMatchCounts.push(count);
  }

  const lbRoundGlobalIndex = [];
  for (let lbR = 0; lbR < totalLBRounds; lbR++) {
    const count = lbMatchCounts[lbR];
    const roundMatches = createMatchesForRound(
      shuffled,
      count,
      matchCounter,
      lbR,
      totalLBRounds,
      BRACKET_TYPE.LOSERS
    );
    matchCounter += count;

    const globalIdx = rounds.length;
    lbRoundGlobalIndex.push(globalIdx);

    rounds.push({
      id: generateId(),
      name: getTournamentRoundName(lbR, totalLBRounds, BRACKET_TYPE.LOSERS, numPlayers),
      roundIndex: globalIdx,
      bracketType: BRACKET_TYPE.LOSERS,
      matches: roundMatches,
    });
  }

  const gf1 = createMatch(null, null, matchCounter);
  gf1.bracketType = BRACKET_TYPE.GRAND_FINAL;
  gf1.winnerAdvancesTo = null;
  gf1.loserAdvancesTo = null;
  gf1.gfGameNumber = 1;

  const gf2 = createMatch(null, null, matchCounter + 1);
  gf2.bracketType = BRACKET_TYPE.GRAND_FINAL;
  gf2.winnerAdvancesTo = null;
  gf2.loserAdvancesTo = null;
  gf2.gfGameNumber = 2;
  gf2.status = MATCH_STATUS.UPCOMING;

  const gfGlobalIndex = rounds.length;
  rounds.push({
    id: generateId(),
    name: getTournamentRoundName(0, 1, BRACKET_TYPE.GRAND_FINAL, numPlayers),
    roundIndex: gfGlobalIndex,
    bracketType: BRACKET_TYPE.GRAND_FINAL,
    matches: [gf1, gf2],
  });
  matchCounter += 2;

  for (let wbR = 0; wbR < wbRoundGlobalIndex.length; wbR++) {
    const globalR = wbRoundGlobalIndex[wbR];
    const round = rounds[globalR];
    const isLastWB = wbR === wbRoundGlobalIndex.length - 1;

    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];

      if (!isLastWB) {
        const nextWBR = wbRoundGlobalIndex[wbR + 1];
        const nextMatchIndex = Math.floor(m / 2);
        const isFirstSlot = m % 2 === 0;
        match.winnerAdvancesTo = {
          roundIndex: nextWBR,
          matchIndex: nextMatchIndex,
          slot: isFirstSlot ? 'player1' : 'player2',
        };
      } else {
        match.winnerAdvancesTo = {
          roundIndex: gfGlobalIndex,
          matchIndex: 0,
          slot: 'player1',
        };
      }

      if (wbR === 0) {
        const lbRoundIdx = lbRoundGlobalIndex[0];
        const lbMatchIdx = Math.floor(m / 2);
        const lbSlot = m % 2 === 0 ? 'player1' : 'player2';
        match.loserAdvancesTo = {
          roundIndex: lbRoundIdx,
          matchIndex: lbMatchIdx,
          slot: lbSlot,
        };
      } else if (!isLastWB) {
        const targetLBRound = 2 * wbR - 1;
        const lbRoundIdx = lbRoundGlobalIndex[targetLBRound];
        const lbMatchIdx = m;
        match.loserAdvancesTo = {
          roundIndex: lbRoundIdx,
          matchIndex: lbMatchIdx,
          slot: 'player2',
        };
      } else {
        const lastLBR = totalLBRounds - 1;
        const lbRoundIdx = lbRoundGlobalIndex[lastLBR];
        match.loserAdvancesTo = {
          roundIndex: lbRoundIdx,
          matchIndex: 0,
          slot: 'player2',
        };
      }
    }
  }

  for (let lbR = 0; lbR < lbRoundGlobalIndex.length; lbR++) {
    const globalR = lbRoundGlobalIndex[lbR];
    const round = rounds[globalR];
    const isLastLB = lbR === lbRoundGlobalIndex.length - 1;

    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      match.loserAdvancesTo = null;

      if (!isLastLB) {
        if (lbR % 2 === 0) {
          const nextLBR = lbR + 1;
          const nextGlobal = lbRoundGlobalIndex[nextLBR];
          match.winnerAdvancesTo = {
            roundIndex: nextGlobal,
            matchIndex: m,
            slot: lbR === 0 ? 'player1' : 'player1',
          };
        } else {
          const nextLBR = lbR + 1;
          const nextGlobal = lbRoundGlobalIndex[nextLBR];
          const nextMatchIdx = Math.floor(m / 2);
          const slot = m % 2 === 0 ? 'player1' : 'player2';
          match.winnerAdvancesTo = {
            roundIndex: nextGlobal,
            matchIndex: nextMatchIdx,
            slot: slot,
          };
        }
      } else {
        match.winnerAdvancesTo = {
          roundIndex: gfGlobalIndex,
          matchIndex: 0,
          slot: 'player2',
        };
      }
    }
  }

  return { rounds, nextMatchNumber: matchCounter };
}

export function generateBracket(playerNames, config = {}) {
  const {
    name = 'DartScore Championship',
    startingScore = 501,
    rules = { doubleIn: false, doubleOut: true },
    matchFormat = MATCH_FORMAT.BEST_OF_3,
    format = TOURNAMENT_FORMAT.SINGLE_ELIMINATION,
  } = config;

  const numPlayers = playerNames.length;
  if (!SUPPORTED_PLAYER_COUNTS.includes(numPlayers)) {
    throw new Error(`Unsupported player count: ${numPlayers}. Supported: ${SUPPORTED_PLAYER_COUNTS.join(', ')}`);
  }

  const players = playerNames.map(name => createTournamentPlayer(name));
  const shuffled = shufflePlayers(players);

  let rounds;
  if (format === TOURNAMENT_FORMAT.DOUBLE_ELIMINATION) {
    const result = buildDoubleEliminationRounds(shuffled, numPlayers);
    rounds = result.rounds;
  } else {
    const totalRounds = determineNumRounds(numPlayers, format);
    const result = buildSingleEliminationRounds(shuffled, numPlayers, totalRounds);
    rounds = result.rounds;
  }

  return {
    id: generateId(),
    name,
    status: TOURNAMENT_STATUS.ACTIVE,
    format,
    matchFormat,
    startingScore,
    rules,
    players: shuffled,
    rounds,
    champion: null,
    createdAt: Date.now(),
    completedAt: null,
  };
}

function findMatchByIndex(tournament, roundIndex, matchIndex) {
  if (!tournament?.rounds?.[roundIndex]?.matches?.[matchIndex]) return null;
  return tournament.rounds[roundIndex].matches[matchIndex];
}

export function updateMatchScore(tournament, roundIndex, matchIndex, legWinnerId) {
  const newTournament = JSON.parse(JSON.stringify(tournament));
  const match = findMatchByIndex(newTournament, roundIndex, matchIndex);
  if (!match) return tournament;
  if (match.status === MATCH_STATUS.COMPLETED) return tournament;

  if (match.status === MATCH_STATUS.UPCOMING) {
    match.status = MATCH_STATUS.IN_PROGRESS;
    match.startedAt = Date.now();
  }

  if (match.player1 && match.player1.id === legWinnerId) {
    match.player1Legs += 1;
  } else if (match.player2 && match.player2.id === legWinnerId) {
    match.player2Legs += 1;
  } else {
    return tournament;
  }

  const required = getMatchFormatWinRequirement(newTournament.matchFormat);
  if (match.player1Legs >= required || match.player2Legs >= required) {
    match.status = MATCH_STATUS.COMPLETED;
    match.completedAt = Date.now();
    match.winner = match.player1Legs >= required ? match.player1 : match.player2;
    const loser = match.player1Legs >= required ? match.player2 : match.player1;
    return advanceWinnerAndLoser(newTournament, roundIndex, matchIndex, match.winner, loser);
  }

  return newTournament;
}

export function determineMatchWinner(match) {
  if (!match || match.status !== MATCH_STATUS.COMPLETED) return null;
  return match.winner;
}

function placePlayerIntoMatch(tournament, target, player) {
  if (!target || !player) return;
  const targetMatch = findMatchByIndex(tournament, target.roundIndex, target.matchIndex);
  if (!targetMatch) return;

  if (target.slot === 'player1') {
    targetMatch.player1 = player;
  } else {
    targetMatch.player2 = player;
  }

  if (targetMatch.player1 && targetMatch.player2) {
    targetMatch.status = MATCH_STATUS.UPCOMING;
  }
}

export function advanceWinner(tournament, roundIndex, matchIndex) {
  const newTournament = JSON.parse(JSON.stringify(tournament));
  const currentMatch = findMatchByIndex(newTournament, roundIndex, matchIndex);
  if (!currentMatch) return tournament;

  const winner = currentMatch.winner;
  if (!winner) return tournament;

  const round = newTournament.rounds[roundIndex];
  const isGrandFinal = round && round.bracketType === BRACKET_TYPE.GRAND_FINAL;
  const isFinalRound = roundIndex === newTournament.rounds.length - 1;

  if (isGrandFinal || isFinalRound) {
    newTournament.champion = winner;
    newTournament.status = TOURNAMENT_STATUS.COMPLETED;
    newTournament.completedAt = Date.now();
    saveToTournamentHistory(newTournament);
    removeActiveTournament();
    return newTournament;
  }

  const nextRoundIndex = roundIndex + 1;
  const nextRound = newTournament.rounds[nextRoundIndex];
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound?.matches?.[nextMatchIndex];

  if (!nextMatch) return tournament;

  const isFirstSlot = matchIndex % 2 === 0;
  if (isFirstSlot) {
    nextMatch.player1 = winner;
  } else {
    nextMatch.player2 = winner;
  }

  if (nextMatch.player1 && nextMatch.player2) {
    nextMatch.status = MATCH_STATUS.UPCOMING;
  }

  return newTournament;
}

export function advanceWinnerAndLoser(tournament, roundIndex, matchIndex, winner, loser) {
  const newTournament = JSON.parse(JSON.stringify(tournament));
  const currentMatch = findMatchByIndex(newTournament, roundIndex, matchIndex);
  if (!currentMatch) return tournament;

  const round = newTournament.rounds[roundIndex];
  const isGrandFinal = round && round.bracketType === BRACKET_TYPE.GRAND_FINAL;

  if (isGrandFinal) {
    if (currentMatch.gfGameNumber === 1 && winner.id === currentMatch.player2?.id) {
      const resetMatch = round.matches.find(match => match.gfGameNumber === 2);
      if (resetMatch) {
        resetMatch.player1 = currentMatch.player1;
        resetMatch.player2 = currentMatch.player2;
        resetMatch.status = MATCH_STATUS.UPCOMING;
      }
      return newTournament;
    }

    newTournament.champion = winner;
    newTournament.status = TOURNAMENT_STATUS.COMPLETED;
    newTournament.completedAt = Date.now();
    saveToTournamentHistory(newTournament);
    removeActiveTournament();
    return newTournament;
  }

  const winnerDest = currentMatch.winnerAdvancesTo;
  const loserDest = currentMatch.loserAdvancesTo;

  if (winnerDest) {
    placePlayerIntoMatch(newTournament, winnerDest, winner);
    const wm = findMatchByIndex(newTournament, winnerDest.roundIndex, winnerDest.matchIndex);
    if (wm && wm.bracketType === BRACKET_TYPE.GRAND_FINAL) {
      if (wm.player1 && wm.player2) {
        wm.status = MATCH_STATUS.UPCOMING;
      }
    }
  } else if (roundIndex === newTournament.rounds.length - 1) {
    newTournament.champion = winner;
    newTournament.status = TOURNAMENT_STATUS.COMPLETED;
    newTournament.completedAt = Date.now();
    saveToTournamentHistory(newTournament);
    removeActiveTournament();
  }

  if (loserDest) {
    placePlayerIntoMatch(newTournament, loserDest, loser);
  }

  return newTournament;
}

export function determineTournamentWinner(tournament) {
  if (!tournament || tournament.status !== TOURNAMENT_STATUS.COMPLETED) return null;
  return tournament.champion;
}

export function findMatchLocation(tournament, matchId) {
  if (!tournament?.rounds) return null;
  for (let r = 0; r < tournament.rounds.length; r++) {
    const round = tournament.rounds[r];
    for (let m = 0; m < round.matches.length; m++) {
      if (round.matches[m].id === matchId) {
        return { roundIndex: r, matchIndex: m, match: round.matches[m], round };
      }
    }
  }
  return null;
}

export function saveTournament(tournament) {
  // All tournament data is persisted to database - no sessionStorage
  return true;
}

export function loadTournament() {
  // All tournament data comes from database - no sessionStorage fallback
  return null;
}

export function removeActiveTournament() {
  // Database handles removal - no sessionStorage needed
  return true;
}

export function saveActiveTournamentMatch(matchContext) {
  // All match context is persisted to database - no sessionStorage
  return true;
}

export function loadActiveTournamentMatch() {
  // All match context comes from database - no sessionStorage fallback
  return null;
}

export function saveToTournamentHistory(tournament) {
  // All tournament history is saved to database - no localStorage
  return true;
}

export function loadTournamentHistory() {
  // All tournament history comes from database - no localStorage fallback
  return [];
}

export function deleteTournamentFromHistory(tournamentId) {
  // Database handles deletion - no localStorage
  return true;
}

export function clearAllTournamentHistory() {
  // Database handles clearing - no localStorage
  return true;
}

export function loadTournamentFromHistory(tournamentId) {
  // All tournaments come from database - no localStorage
  return null;
}
