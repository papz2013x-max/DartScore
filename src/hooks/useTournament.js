import { useState, useEffect, useCallback } from 'react';
import {
  generateBracket,
  updateMatchScore,
  saveTournament,
  loadTournament,
  removeActiveTournament,
  saveActiveTournamentMatch,
  loadActiveTournamentMatch,
  findMatchLocation,
  deleteTournamentFromHistory,
  clearAllTournamentHistory as clearAllHistory,
  loadTournamentHistory,
  getMatchFormatWinRequirement,
  advanceWinnerAndLoser,
} from '../utils/tournament.js';
import { TOURNAMENT_STATUS, MATCH_STATUS } from '../utils/constants.js';
import { claimMatch, fetchRemoteTournament, joinTournament as joinRemoteTournament, publishTournament, releaseMatch, setMatchStatus, subscribeToTournament, updateRemoteTournament } from '../services/tournamentSync.js';
import { fetchRemoteGameForMatch } from '../services/gameSync.js';

export function useTournament() {
  const [tournament, setTournament] = useState(() => loadTournament());
  const [activeMatchContext, setActiveMatchContext] = useState(() => loadActiveTournamentMatch());
  const [syncError, setSyncError] = useState('');

  const syncRemote = useCallback((nextTournament) => {
    if (!nextTournament) return;
    const code = nextTournament.syncCode;
    if (code) updateRemoteTournament(code, nextTournament).catch(error => console.error('Tournament sync failed:', error));
  }, []);

  useEffect(() => {
    const code = tournament?.syncCode;
    if (!code) return undefined;
    let active = true;
    fetchRemoteTournament(code)
      .then(({ tournament: remote }) => { if (active) setTournament({ ...remote, syncCode: code }); })
      .catch(error => console.error('Tournament load failed:', error));
    const unsubscribe = subscribeToTournament(
      code,
      remote => { if (active) setTournament({ ...remote, syncCode: code }); },
      error => console.error('Tournament realtime sync failed:', error)
    );
    return () => { active = false; unsubscribe(); };
  }, [tournament?.syncCode]);

  useEffect(() => {
    if (tournament) {
      saveTournament(tournament);
    }
  }, [tournament]);

  useEffect(() => {
    if (activeMatchContext) {
      saveActiveTournamentMatch(activeMatchContext);
    }
  }, [activeMatchContext]);

  const createTournament = useCallback(async (playerNames, config = {}) => {
    const t = generateBracket(playerNames, config);
    saveTournament(t);
    // All data persists to database - no sessionStorage needed
    setTournament(t);
    setActiveMatchContext(null);
    setSyncError('');
    try {
      const { code, tournament: remote } = await publishTournament(t, config.accessPassword || '');
      const sharedTournament = { ...remote, syncCode: code };
      saveTournament(sharedTournament);
      setTournament(sharedTournament);
      return sharedTournament;
    } catch (error) {
      setSyncError('Could not publish tournament. Start the sync server and try again.');
      console.error('Tournament publish failed:', error);
      return null;
    }
  }, []);

  const joinTournament = useCallback(async (name, password = '') => {
    const { code, tournament: remote } = await joinRemoteTournament(name.trim(), password);
    const joined = { ...remote, syncCode: code };
    saveTournament(joined);
    setTournament(joined);
    setActiveMatchContext(null);
    return joined;
  }, []);

  const clearTournament = useCallback(() => {
    setTournament(null);
    setActiveMatchContext(null);
    removeActiveTournament();
  }, []);

  const startMatch = useCallback(async (matchId, pin = '') => {
    if (!tournament) return null;
    const loc = findMatchLocation(tournament, matchId);
    if (!loc) return null;
    const { match, roundIndex, matchIndex, round } = loc;

    if (match.status === MATCH_STATUS.COMPLETED) return null;
    if (!match.player1 || !match.player2) return null;

    let claimedTournament = tournament;
    let claimResult = null;
    if (tournament.syncCode) {
      try {
        claimResult = await claimMatch(tournament.syncCode, matchId, pin);
        claimedTournament = { ...claimResult.tournament, syncCode: tournament.syncCode };
        setTournament(claimedTournament);
      } catch (error) {
        console.error('Match claim failed:', error);
        return null;
      }
    }

    const newT = JSON.parse(JSON.stringify(claimedTournament));
    const m = newT.rounds[roundIndex].matches[matchIndex];
    if (m.status === MATCH_STATUS.UPCOMING || m.status === MATCH_STATUS.PAUSED) {
      m.status = MATCH_STATUS.IN_PROGRESS;
      m.startedAt = Date.now();
    }
    saveTournament(newT);
    if (!tournament.syncCode) syncRemote(newT);
    setTournament(newT);

    const ctx = {
      tournamentId: claimedTournament.id,
      matchId,
      roundIndex,
      matchIndex,
      roundName: round.name,
      player1: match.player1,
      player2: match.player2,
      player1Legs: m.player1Legs,
      player2Legs: m.player2Legs,
      lockPin: claimResult?.lockPin || m.lockPin,
      matchFormat: claimedTournament.matchFormat,
      startingScore: claimedTournament.startingScore,
      rules: claimedTournament.rules,
      legsRequired: getMatchFormatWinRequirement(claimedTournament.matchFormat),
    };
    if (match.status === MATCH_STATUS.PAUSED || match.claimedBy) {
      ctx.gameState = await fetchRemoteGameForMatch(matchId);
    }
    saveActiveTournamentMatch(ctx);
    setActiveMatchContext(ctx);
    return ctx;
  }, [tournament, syncRemote]);

  const setActiveMatchStatus = useCallback(async (status, generatePin = false) => {
    if (!tournament?.syncCode || !activeMatchContext?.matchId) return null;
    const result = await setMatchStatus(tournament.syncCode, activeMatchContext.matchId, status, generatePin);
    const updated = { ...result.tournament, syncCode: tournament.syncCode };
    saveTournament(updated);
    setTournament(updated);
    if (result.lockPin) {
      setActiveMatchContext(context => context ? { ...context, lockPin: result.lockPin } : context);
    }
    return result;
  }, [tournament, activeMatchContext]);

  const leavePausedMatch = useCallback(async () => {
    if (!tournament?.syncCode || !activeMatchContext?.matchId) return null;
    const result = await setActiveMatchStatus(MATCH_STATUS.PAUSED, true);
    setActiveMatchContext(null);
    // All data persists to database - no sessionStorage needed
    return result;
  }, [tournament, activeMatchContext, setActiveMatchStatus]);

  const recordLegWinner = useCallback((legWinnerId, legGameData = null) => {
    if (!tournament || !activeMatchContext) return null;
    const { roundIndex, matchIndex } = activeMatchContext;
    const newT = updateMatchScore(tournament, roundIndex, matchIndex, legWinnerId);
    saveTournament(newT);
    syncRemote(newT);
    setTournament(newT);

    const loc = findMatchLocation(newT, activeMatchContext.matchId);
    const updatedMatch = loc?.match;

    if (updatedMatch && updatedMatch.status !== MATCH_STATUS.COMPLETED) {
      const newCtx = {
        ...activeMatchContext,
        player1Legs: updatedMatch.player1Legs,
        player2Legs: updatedMatch.player2Legs,
      };
      saveActiveTournamentMatch(newCtx);
      setActiveMatchContext(newCtx);
    } else {
      if (tournament.syncCode) releaseMatch(tournament.syncCode, activeMatchContext.matchId).catch(error => console.error('Match release failed:', error));
      // All data persists to database - no sessionStorage needed
      setActiveMatchContext(null);
    }
    return newT;
  }, [tournament, activeMatchContext, syncRemote]);

  const forfeitMatch = useCallback((matchId, winnerId) => {
    if (!tournament) return null;
    const loc = findMatchLocation(tournament, matchId);
    if (!loc) return tournament;
    const { roundIndex, matchIndex } = loc;
    const required = getMatchFormatWinRequirement(tournament.matchFormat);

    let newT = JSON.parse(JSON.stringify(tournament));
    const m = newT.rounds[roundIndex].matches[matchIndex];
    if (m.status === MATCH_STATUS.COMPLETED) return tournament;

    let winner = null;
    let loser = null;
    if (m.player1 && m.player1.id === winnerId) {
      m.player1Legs = required;
      winner = m.player1;
      loser = m.player2;
    } else if (m.player2 && m.player2.id === winnerId) {
      m.player2Legs = required;
      winner = m.player2;
      loser = m.player1;
    } else {
      return tournament;
    }

    m.status = MATCH_STATUS.COMPLETED;
    m.completedAt = Date.now();
    m.winner = winner;

    const finalT = advanceWinnerAndLoser(newT, roundIndex, matchIndex, winner, loser);
    delete finalT.rounds[roundIndex].matches[matchIndex].claimedBy;
    delete finalT.rounds[roundIndex].matches[matchIndex].claimedAt;
    saveTournament(finalT);
    syncRemote(finalT);
    setTournament(finalT);

    if (activeMatchContext && activeMatchContext.matchId === matchId) {
      if (tournament.syncCode) releaseMatch(tournament.syncCode, matchId).catch(error => console.error('Match release failed:', error));
      setActiveMatchContext(null);
      // All data persists to database - no sessionStorage needed
    }
    return finalT;
  }, [tournament, activeMatchContext]);

  const clearActiveMatchContext = useCallback(() => {
    const activeMatch = activeMatchContext?.matchId && findMatchLocation(tournament, activeMatchContext.matchId)?.match;
    if (tournament?.syncCode && activeMatchContext?.matchId && activeMatch?.status !== MATCH_STATUS.PAUSED) {
      releaseMatch(tournament.syncCode, activeMatchContext.matchId).catch(error => console.error('Match release failed:', error));
    }
    setActiveMatchContext(null);
    // All data persists to database - no sessionStorage needed
  }, [tournament, activeMatchContext]);

  const loadActiveTournament = useCallback(() => {
    const t = loadTournament();
    setTournament(t);
    const ctx = loadActiveTournamentMatch();
    setActiveMatchContext(ctx);
    return t;
  }, []);

  const hasActiveTournament = tournament && tournament.status === TOURNAMENT_STATUS.ACTIVE;

  return {
    tournament,
    syncError,
    setTournament,
    activeMatchContext,
    hasActiveTournament,
    createTournament,
    joinTournament,
    clearTournament,
    startMatch,
    recordLegWinner,
    forfeitMatch,
    clearActiveMatchContext,
    pauseActiveMatch: () => setActiveMatchStatus(MATCH_STATUS.PAUSED),
    resumeActiveMatch: () => setActiveMatchStatus(MATCH_STATUS.IN_PROGRESS),
    leavePausedMatch,
    loadActiveTournament,
  };
}

export function useTournamentHistory() {
  const [history, setHistory] = useState(() => loadTournamentHistory());

  const refresh = useCallback(() => {
    setHistory(loadTournamentHistory());
  }, []);

  const deleteTournament = useCallback((id) => {
    deleteTournamentFromHistory(id);
    setHistory(loadTournamentHistory());
  }, []);

  const clearAll = useCallback(() => {
    clearAllHistory();
    setHistory([]);
  }, []);

  return {
    history,
    refresh,
    deleteTournament,
    clearAll,
  };
}
