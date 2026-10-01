import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { MATCH_STATUS, TOURNAMENT_STATUS, MATCH_FORMAT_LABELS, TOURNAMENT_FORMAT_LABELS, TOURNAMENT_FORMAT, BRACKET_TYPE } from '../utils/constants.js';
import { loadTournament } from '../utils/tournament.js';
import { getSyncClientId } from '../services/tournamentSync.js';

export default function TournamentBracket({ readOnly = false, tournamentData = null, onBack = null }) {
  const navigate = useNavigate();
  const {
    tournament: liveTournament,
    startMatch,
    clearTournament,
    forfeitMatch,
    hasActiveTournament,
    setTournament,
  } = useTournamentContext();

  const [triedLoad, setTriedLoad] = useState(false);
  const [loadError, setLoadError] = useState('');

  const tournament = readOnly ? tournamentData : liveTournament;

  useEffect(() => {
    if (readOnly || tournament) { 
      setTriedLoad(true); 
      return; 
    }
    // Tournament should be in state from useTournament hook
    // If not found, try to load from database (but this requires the code)
    // For now, just wait and redirect if not available
    const t = setTimeout(() => setTriedLoad(true), 150);
    return () => clearTimeout(t);
  }, [readOnly, tournament]);

  useEffect(() => {
    if (readOnly) return;
    if (!triedLoad) return;
    if (tournament) return;
    navigate('/', { replace: true });
  }, [tournament, navigate, readOnly, triedLoad]);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-dart-bg flex items-center justify-center text-dart-muted">
        Loading tournament...
      </div>
    );
  }

  const [matchError, setMatchError] = useState('');

  const handleStartMatch = async (match) => {
    if (readOnly) return;
    if (match.status === MATCH_STATUS.COMPLETED) return;
    if (!match.player1 || !match.player2) return;
    setMatchError('');
    let pin = '';
    if (match.status === MATCH_STATUS.PAUSED && match.claimedBy && match.claimedBy !== getSyncClientId()) {
      pin = window.prompt('Enter the PIN from the paused scoring board:') || '';
      if (!pin) return;
    }
    const ctx = await startMatch(match.id, pin);
    if (ctx) {
      const config = {
        players: [ctx.player1.name, ctx.player2.name],
        startingScore: ctx.startingScore,
        rules: ctx.rules,
        tournamentMatch: {
          ...ctx,
          player1Id: ctx.player1.id,
          player2Id: ctx.player2.id,
        },
      };
      // All data persists to database - no sessionStorage needed
      navigate('/game', { state: config });
    } else {
      setMatchError('This match is being scored on another board.');
    }
  };

  const handleForfeit = (match, winnerId, winnerName) => {
    if (readOnly) return;
    if (!confirm(`Forfeit match to ${winnerName}?`)) return;
    forfeitMatch(match.id, winnerId);
  };

  const handleAbandon = () => {
    if (!confirm('Abandon this tournament? All progress will be lost.')) return;
    clearTournament();
    navigate('/');
  };

  const BackButton = () => (
    onBack
      ? <button onClick={onBack} className="text-dart-muted hover:text-dart-text font-semibold">← Back</button>
      : <Link to="/" className="text-dart-muted hover:text-dart-text font-semibold">← Back</Link>
  );

  const isDoubleElimination = tournament.format === TOURNAMENT_FORMAT.DOUBLE_ELIMINATION;
  const winnersRounds = tournament.rounds.filter(r => r.bracketType === BRACKET_TYPE.WINNERS);
  const losersRounds = tournament.rounds.filter(r => r.bracketType === BRACKET_TYPE.LOSERS);
  const grandFinalRound = tournament.rounds.find(r => r.bracketType === BRACKET_TYPE.GRAND_FINAL);

  const renderBracketSection = (rounds, sectionLabel, sectionAccent) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-6 w-1.5 rounded-full ${sectionAccent}`} />
        <h2 className="text-sm sm:text-lg font-black text-white">{sectionLabel}</h2>
        <div className="h-px flex-1 bg-dart-border/40 ml-2"></div>
      </div>
      <div className="overflow-x-auto pb-3 -mx-3 sm:-mx-5 px-3 sm:px-5">
        <div className="flex items-stretch gap-3 sm:gap-5 min-w-max">
          {rounds.map((round, rIdx) => (
            <div key={round.id} className="flex flex-col justify-around min-w-[220px] sm:min-w-[260px]">
              <div className="text-center mb-3">
                <div className="text-[10px] sm:text-xs uppercase text-dart-muted font-bold tracking-wider">
                  Round {rIdx + 1}
                </div>
                <div className={`text-sm sm:text-base font-black ${round.bracketType === BRACKET_TYPE.LOSERS ? 'text-orange-300' : 'text-white'}`}>
                  {round.name}
                </div>
              </div>
              <div
                className="flex flex-col justify-around flex-1 gap-3"
                style={{
                  paddingTop: rIdx > 0 ? `${(Math.pow(2, rIdx) - 1) * 40}px` : 0,
                  paddingBottom: rIdx > 0 ? `${(Math.pow(2, rIdx) - 1) * 40}px` : 0,
                }}
              >
                {round.matches.map((match) => (
                  <div key={match.id} className="relative">
                    <MatchCard
                      match={match}
                      onStart={() => handleStartMatch(match)}
                      onForfeit={!readOnly ? handleForfeit : null}
                      isReadOnly={readOnly}
                      bracketType={round.bracketType}
                        clientId={getSyncClientId()}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChampionBox = (paddingRoundsLength) => (
    <div className="flex flex-col justify-around min-w-[180px] sm:min-w-[220px]">
      <div className="text-center mb-3">
        <div className="text-[10px] sm:text-xs uppercase text-dart-muted font-bold tracking-wider">
          Result
        </div>
        <div className="text-sm sm:text-base font-black text-dart-accent">
          🏆 CHAMPION
        </div>
      </div>
      <div
        className="flex flex-col justify-around flex-1"
        style={{
          paddingTop: paddingRoundsLength > 0
            ? `${(Math.pow(2, paddingRoundsLength - 1) - 1) * 40}px`
            : 0,
          paddingBottom: paddingRoundsLength > 0
            ? `${(Math.pow(2, paddingRoundsLength - 1) - 1) * 40}px`
            : 0,
        }}
      >
        <div className="card border-2 border-dart-accent bg-gradient-to-br from-dart-accent/15 to-transparent flex items-center justify-center min-h-[140px]">
          {tournament.champion ? (
            <div className="text-center">
              <div className="text-4xl mb-1">🏆</div>
              <div className="text-xl sm:text-2xl font-black text-dart-accent">
                {tournament.champion.name}
              </div>
            </div>
          ) : (
            <div className="text-center text-dart-muted">
              <div className="text-3xl mb-1 opacity-40">🏆</div>
              <div className="font-bold opacity-60">TBD</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSingleElimination = () => (
    <div className="overflow-x-auto pb-4 -mx-3 sm:-mx-5 px-3 sm:px-5">
      <div className="flex items-stretch gap-3 sm:gap-5 min-w-max">
        {tournament.rounds.map((round, rIdx) => (
          <div key={round.id} className="flex flex-col justify-around min-w-[220px] sm:min-w-[260px]">
            <div className="text-center mb-3">
              <div className="text-[10px] sm:text-xs uppercase text-dart-muted font-bold tracking-wider">
                Round {rIdx + 1}
              </div>
              <div className="text-sm sm:text-base font-black text-white">
                {round.name}
              </div>
            </div>
            <div
              className="flex flex-col justify-around flex-1 gap-3"
              style={{
                paddingTop: rIdx > 0 ? `${(Math.pow(2, rIdx) - 1) * 40}px` : 0,
                paddingBottom: rIdx > 0 ? `${(Math.pow(2, rIdx) - 1) * 40}px` : 0,
              }}
            >
              {round.matches.map((match) => (
                <div key={match.id} className="relative">
                  <MatchCard
                    match={match}
                    onStart={() => handleStartMatch(match)}
                    onForfeit={!readOnly ? handleForfeit : null}
                    isReadOnly={readOnly}
                    bracketType={round.bracketType}
                    clientId={getSyncClientId()}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {renderChampionBox(tournament.rounds.length)}
      </div>
    </div>
  );

  const renderDoubleElimination = () => (
    <div>
      {renderBracketSection(winnersRounds, '🏆 Winners Bracket', 'bg-dart-accent')}
      {renderBracketSection(losersRounds, '💀 Losers Bracket', 'bg-orange-500')}
      {grandFinalRound && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-1.5 rounded-full bg-yellow-400" />
            <h2 className="text-sm sm:text-lg font-black text-white">⭐ Grand Final</h2>
            <div className="h-px flex-1 bg-dart-border/40 ml-2"></div>
          </div>
          <div className="overflow-x-auto pb-3 -mx-3 sm:-mx-5 px-3 sm:px-5">
            <div className="flex items-stretch gap-3 sm:gap-5 min-w-max justify-center">
              <div className="flex flex-col justify-around min-w-[280px] sm:min-w-[340px]">
                <div className="text-center mb-3">
                  <div className="text-[10px] sm:text-xs uppercase text-yellow-400/80 font-bold tracking-wider">
                    Winner Takes All
                  </div>
                  <div className="text-sm sm:text-base font-black text-yellow-300">
                    {grandFinalRound.name}
                  </div>
                </div>
                <div
                  className="flex flex-col justify-around flex-1 gap-3"
                >
                  {grandFinalRound.matches.map((match) => (
                    <div key={match.id} className="relative">
                      <MatchCard
                        match={match}
                        onStart={() => handleStartMatch(match)}
                        onForfeit={!readOnly ? handleForfeit : null}
                        isReadOnly={readOnly}
                        bracketType={grandFinalRound.bracketType}
                        clientId={getSyncClientId()}
                        highlight={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-3xl text-dart-muted font-black">→</div>
              </div>
              <div className="flex flex-col justify-around min-w-[180px] sm:min-w-[220px]">
                <div className="text-center mb-3">
                  <div className="text-[10px] sm:text-xs uppercase text-dart-muted font-bold tracking-wider">
                    Tournament Champion
                  </div>
                  <div className="text-sm sm:text-base font-black text-dart-accent">
                    🏆 CHAMPION
                  </div>
                </div>
                <div className="flex flex-col justify-around flex-1">
                  <div className="card border-2 border-dart-accent bg-gradient-to-br from-dart-accent/15 to-transparent flex items-center justify-center min-h-[170px]">
                    {tournament.champion ? (
                      <div className="text-center">
                        <div className="text-4xl mb-1">🏆</div>
                        <div className="text-xl sm:text-2xl font-black text-dart-accent">
                          {tournament.champion.name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-dart-muted">
                        <div className="text-3xl mb-1 opacity-40">🏆</div>
                        <div className="font-bold opacity-60">TBD</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-dart-bg p-3 sm:p-5">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <BackButton />
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-dart-text truncate">
              🏆 {tournament.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
              <span className="bg-dart-card px-2.5 py-0.5 rounded-lg border border-dart-border">
                {tournament.players.length} Players
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg border font-bold ${
                isDoubleElimination
                  ? 'bg-orange-900/40 text-orange-300 border-orange-700'
                  : 'bg-dart-card text-dart-text border-dart-border'
              }`}>
                {TOURNAMENT_FORMAT_LABELS[tournament.format]}
              </span>
              <span className="bg-dart-card px-2.5 py-0.5 rounded-lg border border-dart-border">
                {MATCH_FORMAT_LABELS[tournament.matchFormat]}
              </span>
              <span className="bg-dart-accent/20 text-dart-accent px-2.5 py-0.5 rounded-lg font-bold">
                {tournament.startingScore}
              </span>
              {tournament.rules?.doubleIn && (
                <span className="bg-red-900/40 text-red-300 px-2.5 py-0.5 rounded-lg border border-red-700 text-[10px] sm:text-xs font-bold">D-IN</span>
              )}
              {tournament.rules?.doubleOut && (
                <span className="bg-red-900/40 text-red-300 px-2.5 py-0.5 rounded-lg border border-red-700 text-[10px] sm:text-xs font-bold">D-OUT</span>
              )}
            </div>
          </div>
          {!readOnly && (
            <button
              onClick={handleAbandon}
              className="text-dart-danger hover:text-red-400 font-semibold text-sm"
            >
              Abandon
            </button>
          )}
          {readOnly && <div className="w-16"></div>}
        </div>

        {matchError && <div className="mb-4 card border-dart-danger/60 text-dart-danger">{matchError}</div>}

        {tournament.champion && tournament.status === TOURNAMENT_STATUS.COMPLETED && (
          <div className="card mb-6 border-2 border-dart-accent bg-gradient-to-br from-dart-accent/15 to-dart-accent/5 text-center">
            <div className="text-5xl sm:text-6xl mb-2">🏆</div>
            <div className="text-xs uppercase text-dart-muted font-bold mb-1">Tournament Champion</div>
            <div className="text-3xl sm:text-4xl font-black text-dart-accent">{tournament.champion.name}</div>
          </div>
        )}

        {isDoubleElimination ? renderDoubleElimination() : renderSingleElimination()}

        {!readOnly && !hasActiveTournament && !tournament.champion && (
          <div className="mt-6 flex justify-center">
            <Link to="/new-tournament" className="btn-primary">
              + Start New Tournament
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, onStart, onForfeit, isReadOnly, bracketType, clientId, highlight = false }) {
  const { player1, player2, player1Legs, player2Legs, status, matchNumber } = match;

  const p1IsWinner = status === MATCH_STATUS.COMPLETED && match.winner?.id === player1?.id;
  const p2IsWinner = status === MATCH_STATUS.COMPLETED && match.winner?.id === player2?.id;

  const statusLabel = {
    [MATCH_STATUS.UPCOMING]: 'Upcoming',
    [MATCH_STATUS.IN_PROGRESS]: 'In Progress',
    [MATCH_STATUS.PAUSED]: 'Game Paused',
    [MATCH_STATUS.COMPLETED]: 'Completed',
  }[status] || status;

  const isLosersBracket = bracketType === BRACKET_TYPE.LOSERS;
  const isGrandFinal = bracketType === BRACKET_TYPE.GRAND_FINAL;

  const statusColor = {
    [MATCH_STATUS.UPCOMING]: 'bg-slate-700 text-slate-300 border-slate-600',
    [MATCH_STATUS.IN_PROGRESS]: isGrandFinal
      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 pulse-active'
      : isLosersBracket
      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 pulse-active'
      : 'bg-dart-accent/20 text-dart-accent border-dart-accent/40 pulse-active',
    [MATCH_STATUS.PAUSED]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    [MATCH_STATUS.COMPLETED]: 'bg-dart-success/20 text-dart-success border-dart-success/40',
  }[status] || '';

  const isClaimedByOtherBoard = match.claimedBy && match.claimedBy !== clientId;
  const claimExpired = isClaimedByOtherBoard && status === MATCH_STATUS.IN_PROGRESS
    && match.claimedAt && Date.now() - match.claimedAt >= 2 * 60 * 1000;
  const canStart = !isReadOnly && (!isClaimedByOtherBoard || claimExpired) && status !== MATCH_STATUS.COMPLETED && player1 && player2;
  const canEnterPausedRoom = !isReadOnly && isClaimedByOtherBoard && status === MATCH_STATUS.PAUSED && player1 && player2;

  let borderOverride = '';
  if (highlight && status !== MATCH_STATUS.COMPLETED) {
    borderOverride = 'border-yellow-400/60 ring-2 ring-yellow-400/20 bg-yellow-400/5';
  } else if (isLosersBracket && status !== MATCH_STATUS.COMPLETED && !isGrandFinal) {
    borderOverride = canStart
      ? 'hover:border-orange-400/50 hover:bg-orange-400/5'
      : '';
  }

  const cardClass = `card transition-all cursor-pointer p-3 sm:p-4 ${borderOverride || (
    status === MATCH_STATUS.COMPLETED
      ? 'border-dart-success/40 bg-dart-success/5'
      : status === MATCH_STATUS.IN_PROGRESS
      ? 'border-dart-accent/60 ring-2 ring-dart-accent/20 bg-dart-accent/5'
      : status === MATCH_STATUS.PAUSED
      ? 'border-yellow-400/60 bg-yellow-400/5'
      : canStart
      ? 'hover:border-dart-accent/50 hover:bg-dart-accent/5'
      : 'opacity-80'
  )}`;

  return (
    <div
      className={cardClass}
      onClick={canStart || canEnterPausedRoom ? onStart : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
          isLosersBracket ? 'text-orange-400/80' : isGrandFinal ? 'text-yellow-400/80' : 'text-dart-muted'
        }`}>
          Match #{matchNumber}
          {isLosersBracket && !isGrandFinal && ' • LB'}
          {isGrandFinal && ` • GF${match.gfGameNumber || ''}`}
        </span>
        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <PlayerRow
        player={player1}
        legs={player1Legs}
        isWinner={p1IsWinner}
        isCurrentTurn={status === MATCH_STATUS.IN_PROGRESS && !p2IsWinner}
        bracketType={bracketType}
      />
      <div className="flex items-center justify-center my-1 text-dart-muted">
        <div className="h-px flex-1 bg-dart-border/40 mx-2"></div>
        <span className="text-[10px]">VS</span>
        <div className="h-px flex-1 bg-dart-border/40 mx-2"></div>
      </div>
      <PlayerRow
        player={player2}
        legs={player2Legs}
        isWinner={p2IsWinner}
        isCurrentTurn={status === MATCH_STATUS.IN_PROGRESS && !p1IsWinner}
        bracketType={bracketType}
      />

      {status === MATCH_STATUS.COMPLETED && match.winner && (
        <div className="mt-2 pt-2 border-t border-dart-border/40 text-center">
          <span className="text-[10px] sm:text-xs text-dart-success font-bold">
            ✓ Winner: {match.winner.name}
          </span>
        </div>
      )}

      {isGrandFinal && match.gfGameNumber === 2 && status !== MATCH_STATUS.COMPLETED && (
        <div className="mt-2 text-center text-[10px] sm:text-xs text-yellow-300 font-bold">
          Reset Game • Required only if LBC wins Game 1
        </div>
      )}

      {canStart && (
        <div className="mt-2 pt-2 border-t border-dart-border/40">
          {onForfeit && player1 && player2 && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={(e) => { e.stopPropagation(); onForfeit(match, player1.id, player1.name); }}
                className="flex-1 text-[10px] py-1 px-2 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60 font-bold"
              >
                F: {player1.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onForfeit(match, player2.id, player2.name); }}
                className="flex-1 text-[10px] py-1 px-2 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60 font-bold"
              >
                F: {player2.name}
              </button>
            </div>
          )}
          <div className={`text-[10px] sm:text-xs text-center font-bold ${
            status === MATCH_STATUS.IN_PROGRESS
              ? isGrandFinal ? 'text-yellow-400' : isLosersBracket ? 'text-orange-400' : 'text-dart-accent'
              : 'text-dart-muted'
          }`}>
            {status === MATCH_STATUS.IN_PROGRESS
              ? claimExpired ? '▶ Reclaim Match' : '▶ Resume Match'
              : '▶ Click to Start'}
          </div>
        </div>
      )}

      {isClaimedByOtherBoard && status === MATCH_STATUS.IN_PROGRESS && (
        <div className="mt-2 pt-2 border-t border-dart-border/40 text-center text-[10px] sm:text-xs text-yellow-300 font-bold">
          {claimExpired ? 'Previous scorer disconnected. Click to reclaim.' : 'Room occupied. Reclaim available after 2 minutes.'}
        </div>
      )}

      {status === MATCH_STATUS.PAUSED && (
        <div className="mt-2 pt-2 border-t border-dart-border/40 text-center text-[10px] sm:text-xs text-yellow-300 font-bold">
          Game Paused{isClaimedByOtherBoard ? ' • PIN required to enter' : ''}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, legs, isWinner, isCurrentTurn, bracketType }) {
  const isLosersBracket = bracketType === BRACKET_TYPE.LOSERS;
  const isGrandFinal = bracketType === BRACKET_TYPE.GRAND_FINAL;

  if (!player) {
    return (
      <div className="flex items-center justify-between py-2 px-2 rounded-lg bg-dart-card/40">
        <span className="text-dart-muted font-bold italic text-sm">TBD</span>
        <span className="text-dart-muted font-black text-lg">—</span>
      </div>
    );
  }

  const currentTurnBg = isGrandFinal
    ? 'bg-yellow-400/10 border border-yellow-400/30'
    : isLosersBracket
    ? 'bg-orange-400/10 border border-orange-400/30'
    : 'bg-dart-accent/10 border border-dart-accent/30';

  return (
    <div className={`flex items-center justify-between py-2 px-2 rounded-lg transition-all ${
      isWinner
        ? 'bg-dart-success/15 border border-dart-success/30'
        : isCurrentTurn
        ? currentTurnBg
        : 'bg-dart-card/40'
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isWinner && <span className="text-dart-success text-sm">✓</span>}
        <span className={`font-bold truncate text-sm sm:text-base ${
          isWinner ? 'text-dart-success' : 'text-dart-text'
        }`}>
          {player.name}
        </span>
      </div>
      <span className={`font-black text-lg sm:text-xl ml-2 flex-shrink-0 ${
        isWinner ? 'text-dart-success' : 'text-dart-text'
      }`}>
        {legs}
      </span>
    </div>
  );
}
