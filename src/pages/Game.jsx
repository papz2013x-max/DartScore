import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../hooks/useGame.js';
import { STORAGE_KEYS, GAME_STATUS, MAX_DARTS_PER_TURN, GAME_CONTEXT, MATCH_FORMAT_LABELS } from '../utils/constants.js';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import DartInput from '../components/DartInput.jsx';
import TurnHistory from '../components/TurnHistory.jsx';
import CheckoutSuggestion from '../components/CheckoutSuggestion.jsx';
import GameControls from '../components/GameControls.jsx';
import { getTurnNumber } from '../utils/gameRules.js';

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const [bustMsg, setBustMsg] = useState('');
  const [showWin, setShowWin] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [tournamentMatchCtx, setTournamentMatchCtx] = useState(null);

  const { recordLegWinner, clearActiveMatchContext, pauseActiveMatch, resumeActiveMatch, leavePausedMatch } = useTournamentContext();

  const {
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
  } = useGame();

  useEffect(() => {
    if (navState && navState.tournamentMatch) {
      setTournamentMatchCtx(navState.tournamentMatch);
      if (navState.tournamentMatch.gameState) {
        loadGame({
          ...navState.tournamentMatch.gameState,
          status: GAME_STATUS.ACTIVE,
          contextData: navState.tournamentMatch,
        });
      } else {
        startNewGame(
          navState.players,
          navState.startingScore || 501,
          navState.rules || {},
          GAME_CONTEXT.TOURNAMENT_LEG,
          navState.tournamentMatch
        );
      }
      navigate('.', { replace: true, state: null });
      return;
    }

    if (navState && navState.players && Array.isArray(navState.players) && navState.players.length > 0) {
      setTournamentMatchCtx(null);
      startNewGame(navState.players, navState.startingScore || 501, navState.rules || {});
      navigate('.', { replace: true, state: null });
      return;
    }

    if (!game) {
      // All data now comes from database only
      navigate('/');
    } else if (game.gameContext === GAME_CONTEXT.TOURNAMENT_LEG && game.contextData) {
      setTournamentMatchCtx(prev => prev || game.contextData);
    }
  }, [game, navigate, navState, startNewGame, loadGame]);

  useEffect(() => {
    if (game && game.status === GAME_STATUS.COMPLETED) {
      setShowWin(true);
    }
  }, [game]);

  const handleThrow = useCallback((dart) => {
    const res = processDart(dart);
    if (res.bust) {
      setBustMsg(`BUST! ${res.reason || ''}`);
      setShakeKey(k => k + 1);
      setTimeout(() => setBustMsg(''), 2500);
    }
  }, [processDart]);

  const currentPlayer = getCurrentPlayer();
  const dartsLeft = getDartsLeftInTurn();
  const turnScore = getCurrentTurnScore();
  const isPaused = game?.status === GAME_STATUS.PAUSED;
  const currentDartIdx = game ? MAX_DARTS_PER_TURN - dartsLeft : 0;
  const turnNumber = game ? getTurnNumber(game) : 0;
  const disabled = !game || game.status !== GAME_STATUS.ACTIVE || isPaused;
  const winner = game?.status === GAME_STATUS.COMPLETED
    ? game.players.find(p => p.id === game.winnerId)
    : null;

  const isTournamentMode = tournamentMatchCtx != null;

  const goHome = () => {
    clearActiveGame();
    if (isTournamentMode) {
      navigate('/tournament');
    } else {
      navigate('/');
    }
  };

  const onRestart = () => {
    if (!confirm('Restart this leg? All progress for this leg will be lost.')) return;
    restartGame();
    setShowWin(false);
    setBustMsg('');
  };

  const onPause = async () => {
    if (isPaused) {
      resumeGame();
      if (isTournamentMode) await resumeActiveMatch();
    } else {
      pauseGame();
      if (isTournamentMode) await pauseActiveMatch();
    }
  };

  const handleLeavePausedRoom = async () => {
    if (!isTournamentMode) {
      clearActiveGame();
      navigate('/');
      return;
    }
    try {
      const result = await leavePausedMatch();
      clearActiveGame();
      if (result?.lockPin) {
        window.alert(`Room PIN: ${result.lockPin}\nGive this PIN to the next scorer.`);
      }
      navigate('/tournament');
    } catch (error) {
      setBustMsg(error.message);
    }
  };

  const handleEndTurn = useCallback(() => {
    const result = endTurn();
    if (result && result.bust) {
      setBustMsg(`BUST! ${result.reason || ''}`);
      setShakeKey(k => k + 1);
      setTimeout(() => setBustMsg(''), 2500);
    }
    return result;
  }, [endTurn]);

  const handleNextLeg = () => {
    if (!winner || !tournamentMatchCtx) return;

    const winnerId = tournamentMatchCtx.player1.name === winner.name
      ? tournamentMatchCtx.player1Id
      : tournamentMatchCtx.player2Id;

    const updated = recordLegWinner(winnerId);
    setShowWin(false);
    clearActiveGame();

    if (!updated) {
      navigate('/tournament');
      return;
    }

    const loc = findMatchLoc(updated, tournamentMatchCtx.matchId);
    const match = loc?.match;

    if (match && match.status !== 'completed') {
      const newCtx = {
        ...tournamentMatchCtx,
        player1Legs: match.player1Legs,
        player2Legs: match.player2Legs,
      };
      setTournamentMatchCtx(newCtx);
      // All data persists to database - no sessionStorage needed
      startNewGame(
        [tournamentMatchCtx.player1.name, tournamentMatchCtx.player2.name],
        tournamentMatchCtx.startingScore,
        tournamentMatchCtx.rules,
        GAME_CONTEXT.TOURNAMENT_LEG,
        newCtx
      );
    } else {
      clearActiveMatchContext();
      navigate('/tournament');
    }
  };

  const handleReturnToBracket = () => {
    if (!winner || !tournamentMatchCtx) {
      navigate('/tournament');
      return;
    }
    const winnerId = tournamentMatchCtx.player1.name === winner.name
      ? tournamentMatchCtx.player1Id
      : tournamentMatchCtx.player2Id;
    recordLegWinner(winnerId);
    clearActiveMatchContext();
    clearActiveGame();
    navigate('/tournament');
  };

  const handleForfeitToBracket = () => {
    if (!confirm('Return to bracket without recording this leg?')) return;
    if (isTournamentMode) {
      clearActiveMatchContext();
      clearActiveGame();
      navigate('/tournament');
    } else {
      goHome();
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-dart-bg flex items-center justify-center text-dart-muted">
        Loading game...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dart-bg p-3 sm:p-5">
      {showWin && winner && (
        isTournamentMode ? (
          <TournamentWinModal
            winner={winner}
            onHome={goHome}
            onRestart={onRestart}
            game={game}
            matchCtx={tournamentMatchCtx}
            onNextLeg={handleNextLeg}
            onReturnToBracket={handleReturnToBracket}
          />
        ) : (
          <WinModal winner={winner} onHome={goHome} onRestart={onRestart} game={game} />
        )
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <button onClick={handleForfeitToBracket} className="text-dart-muted hover:text-dart-text font-semibold">
            ← {isTournamentMode ? 'Bracket' : 'Home'}
          </button>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="bg-dart-card px-3 py-1 rounded-lg border border-dart-border">
              <span className="text-dart-muted">Turn</span> <span className="font-bold text-dart-text">#{turnNumber}</span>
            </span>
            <span className="bg-dart-card px-3 py-1 rounded-lg border border-dart-border">
              <span className="font-bold text-dart-accent">{game.startingScore}</span>
            </span>
            {game.rules.doubleIn && (
              <span className="bg-red-900/40 text-red-300 px-3 py-1 rounded-lg border border-red-700 text-xs font-bold">
                D-IN
              </span>
            )}
            {game.rules.doubleOut && (
              <span className="bg-red-900/40 text-red-300 px-3 py-1 rounded-lg border border-red-700 text-xs font-bold">
                D-OUT
              </span>
            )}
          </div>
        </div>

        {isTournamentMode && tournamentMatchCtx && (
          <div className="card mb-4 border-dart-accent/50 bg-dart-accent/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase text-dart-muted font-bold tracking-wider">
                  Tournament · {tournamentMatchCtx.roundName}
                </div>
                <div className="text-xs sm:text-sm font-bold text-dart-muted mt-0.5">
                  {MATCH_FORMAT_LABELS[tournamentMatchCtx.matchFormat]} (First to {tournamentMatchCtx.legsRequired})
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6">
                <PlayerScoreMini
                  name={tournamentMatchCtx.player1.name}
                  legs={tournamentMatchCtx.player1Legs}
                  required={tournamentMatchCtx.legsRequired}
                  isCurrent={game.players[0]?.id === game.winnerId ? false : currentPlayer?.name === tournamentMatchCtx.player1.name}
                />
                <div className="text-dart-muted font-black text-xl">—</div>
                <PlayerScoreMini
                  name={tournamentMatchCtx.player2.name}
                  legs={tournamentMatchCtx.player2Legs}
                  required={tournamentMatchCtx.legsRequired}
                  isCurrent={game.players[1]?.id === game.winnerId ? false : currentPlayer?.name === tournamentMatchCtx.player2.name}
                />
              </div>
              <div className="bg-dart-card px-3 py-1 rounded-lg border border-dart-border">
                <span className="text-[10px] text-dart-muted uppercase mr-1">Leg</span>
                <span className="font-bold text-dart-accent">
                  {(tournamentMatchCtx.player1Legs + tournamentMatchCtx.player2Legs) + 1}
                </span>
              </div>
            </div>
          </div>
        )}

        {bustMsg && (
          <div key={shakeKey} className="mb-4 shake">
            <div className="bg-red-900/70 border-2 border-red-500 text-red-100 px-5 py-3 rounded-xl font-bold text-center text-lg shadow-xl">
              💥 {bustMsg}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs uppercase text-dart-muted font-bold mb-3">Scoreboard</div>
          <Scoreboard game={game} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-5">
          <div className="lg:col-span-2 card">
            <div className="text-xs uppercase text-dart-muted font-bold mb-3 flex items-center justify-between">
              <span>Dart Board</span>
              <span className="text-dart-accent">{dartsLeft} left</span>
            </div>
            <DartInput onThrow={handleThrow} disabled={disabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {/* <div key={`score-${shakeKey}`} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase text-dart-muted font-bold">Now Throwing</span>
                <span className="text-xs uppercase text-dart-muted font-bold">
                  Score: <span className="text-dart-success">+{turnScore}</span>
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl sm:text-3xl font-black text-dart-accent">{currentPlayer?.name}</h2>
                {!currentPlayer?.hasStarted && game.rules.doubleIn && (
                  <span className="bg-yellow-900/60 text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold border border-yellow-700">
                    ⚠ MUST HIT DOUBLE TO START
                  </span>
                )}
              </div>
              <div className="text-center py-2 sm:py-4">
                <div className="text-[5rem] sm:text-[8rem] md:text-[10rem] font-black leading-none text-white tracking-tighter">
                  {currentPlayer?.score}
                </div>
              </div>
            </div> */}

            <CheckoutSuggestion
              remainingScore={currentPlayer?.score}
              rules={game.rules}
              dartsLeft={dartsLeft}
            />
            <TurnHistory players={game.players} history={game.history} />
          </div>
        </div>

        <div className="mb-5">
          <GameControls
            onUndo={undoLastDart}
            onEndTurn={handleEndTurn}
            onPause={onPause}
            onRestart={onRestart}
            onHome={handleForfeitToBracket}
            canUndo={canUndo()}
            isPaused={isPaused}
            canEndTurn={!disabled && game.currentTurn.darts.length > 0}
          />
        </div>

        {isPaused && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 p-4">
            <div className="card max-w-md w-full text-center pop-in">
              <div className="text-6xl mb-4">⏸</div>
              <h2 className="text-3xl font-black text-white mb-2">Game Paused</h2>
              <p className="text-dart-muted mb-6">
                {isTournamentMode ? 'Take a break. Your match is saved.' : 'Take a break. Your game is saved.'}
              </p>
              <div className="flex gap-3">
                <button onClick={onPause} className="btn-primary flex-1 py-4">▶ Resume</button>
                <button onClick={handleLeavePausedRoom} className="btn-secondary flex-1 py-4">
                  {isTournamentMode ? '↩ Leave Room' : '🏠 Home'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function findMatchLoc(tournament, matchId) {
  if (!tournament?.rounds) return null;
  for (let r = 0; r < tournament.rounds.length; r++) {
    for (let m = 0; m < tournament.rounds[r].matches.length; m++) {
      if (tournament.rounds[r].matches[m].id === matchId) {
        return { roundIndex: r, matchIndex: m, match: tournament.rounds[r].matches[m] };
      }
    }
  }
  return null;
}

function PlayerScoreMini({ name, legs, required, isCurrent }) {
  const won = legs >= required;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${
      won ? 'bg-dart-success/15 border border-dart-success/40' :
      isCurrent ? 'bg-dart-accent/10 border border-dart-accent/30 pulse-active' : ''
    }`}>
      <span className={`font-bold truncate max-w-[100px] sm:max-w-none text-sm sm:text-base ${
        won ? 'text-dart-success' : isCurrent ? 'text-dart-accent' : 'text-dart-text'
      }`}>
        {name}
      </span>
      <span className={`font-black text-lg sm:text-xl ${
        won ? 'text-dart-success' : 'text-dart-text'
      }`}>
        {legs}
      </span>
    </div>
  );
}

function WinModal({ winner, onHome, onRestart, game }) {
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full text-center pop-in border-2 border-dart-accent shadow-2xl">
        <div className="text-7xl mb-2">🏆</div>
        <h2 className="text-4xl font-black text-dart-accent mb-1">WINNER!</h2>
        <h3 className="text-3xl font-bold text-white mb-6">{winner.name}</h3>

        <div className="bg-dart-card rounded-xl p-4 mb-6 border border-dart-border text-left">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <WinStat label="Darts Thrown" value={winner.dartsThrown} />
            <WinStat label="Total Points" value={winner.totalPoints} />
            <WinStat label="Highest Turn" value={winner.highestTurn} />
            <WinStat label="Highest Dart" value={winner.highestDart} />
            <WinStat label="3-Dart Avg" value={((winner.totalPoints / Math.max(1, winner.dartsThrown)) * 3).toFixed(1)} />
            <WinStat label="Double %" value={winner.doubleAttempts > 0 ? Math.round((winner.doubleHits / winner.doubleAttempts) * 100) + '%' : '—'} />
            <WinStat label="Busts" value={winner.busts} />
            <WinStat label="Turns" value={game.history.filter(h => h.playerId === winner.id).length} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onRestart} className="btn-primary py-4">
            🔁 Rematch
          </button>
          <button onClick={onHome} className="btn-secondary py-4">
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentWinModal({ winner, onHome, onRestart, game, matchCtx, onNextLeg, onReturnToBracket }) {
  if (!matchCtx) return null;

  const winnerId = matchCtx.player1.name === winner.name ? matchCtx.player1Id : matchCtx.player2Id;
  const newP1Legs = matchCtx.player1Id === winnerId ? matchCtx.player1Legs + 1 : matchCtx.player1Legs;
  const newP2Legs = matchCtx.player2Id === winnerId ? matchCtx.player2Legs + 1 : matchCtx.player2Legs;

  const matchWon = newP1Legs >= matchCtx.legsRequired || newP2Legs >= matchCtx.legsRequired;
  const matchWinner = matchWon
    ? (newP1Legs >= matchCtx.legsRequired ? matchCtx.player1 : matchCtx.player2)
    : null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card max-w-lg w-full text-center pop-in border-2 border-dart-accent shadow-2xl my-4">
        {matchWon ? (
          <div className="text-5xl sm:text-6xl mb-2">🎯🏆</div>
        ) : (
          <div className="text-6xl mb-2">🎯</div>
        )}
        <h2 className={`text-3xl sm:text-4xl font-black mb-1 ${matchWon ? 'text-dart-success' : 'text-dart-accent'}`}>
          {matchWon ? 'MATCH WON!' : 'LEG WON!'}
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">{winner.name}</h3>

        <div className="bg-dart-card rounded-xl p-3 mb-4 border border-dart-border">
          <div className="text-xs uppercase text-dart-muted font-bold mb-2 tracking-wider">Match Score</div>
          <div className="flex items-center justify-around">
            <div className={`text-center ${matchCtx.player1Id === winnerId ? (matchWon ? 'text-dart-success' : 'text-dart-accent') : ''}`}>
              <div className="font-bold truncate max-w-[120px]">{matchCtx.player1.name}</div>
              <div className="text-3xl sm:text-4xl font-black">{newP1Legs}</div>
              {matchWon && matchCtx.player1Id === winnerId && <div className="text-xs text-dart-success font-bold">✓ Winner</div>}
            </div>
            <div className="text-dart-muted text-2xl font-black">—</div>
            <div className={`text-center ${matchCtx.player2Id === winnerId ? (matchWon ? 'text-dart-success' : 'text-dart-accent') : ''}`}>
              <div className="font-bold truncate max-w-[120px]">{matchCtx.player2.name}</div>
              <div className="text-3xl sm:text-4xl font-black">{newP2Legs}</div>
              {matchWon && matchCtx.player2Id === winnerId && <div className="text-xs text-dart-success font-bold">✓ Winner</div>}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-dart-muted">
            {MATCH_FORMAT_LABELS[matchCtx.matchFormat]} · {matchCtx.roundName}
          </div>
        </div>

        <div className="bg-dart-card rounded-xl p-4 mb-6 border border-dart-border text-left">
          <div className="text-xs uppercase text-dart-muted font-bold mb-2">Leg Stats · {winner.name}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <WinStat label="Darts" value={winner.dartsThrown} />
            <WinStat label="Points" value={winner.totalPoints} />
            <WinStat label="Best Turn" value={winner.highestTurn} />
            <WinStat label="3-Dart Avg" value={((winner.totalPoints / Math.max(1, winner.dartsThrown)) * 3).toFixed(1)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {matchWon ? (
            <>
              <button onClick={onReturnToBracket} className="btn-primary py-4 col-span-2">
                🏆 Back to Bracket
              </button>
            </>
          ) : (
            <>
              <button onClick={onNextLeg} className="btn-primary py-4">
                ▶ Next Leg
              </button>
              <button onClick={onReturnToBracket} className="btn-secondary py-4">
                ↩ Bracket
              </button>
            </>
          )}
          {!matchWon && (
            <button onClick={onRestart} className="btn-secondary py-4 col-span-2 text-sm opacity-80">
              🔁 Replay This Leg
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WinStat({ label, value }) {
  return (
    <div className="bg-dart-panel/70 rounded-lg p-2.5 border border-dart-border/50">
      <div className="text-[10px] uppercase text-dart-muted">{label}</div>
      <div className="font-bold text-dart-text text-lg">{value}</div>
    </div>
  );
}
