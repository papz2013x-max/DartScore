import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GAME_STATUS, TOURNAMENT_STATUS, MATCH_FORMAT_LABELS } from '../utils/constants.js';
import { loadTournament, loadActiveTournamentMatch } from '../utils/tournament.js';

export default function Home() {
  const [activeGame, setActiveGame] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeMatchContext, setActiveMatchContext] = useState(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [tournamentHistoryCount, setTournamentHistoryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // All active data comes from database now
    const t = loadTournament();
    if (t && (t.status === TOURNAMENT_STATUS.ACTIVE)) {
      setActiveTournament(t);
    }
    const ctx = loadActiveTournamentMatch();
    if (ctx) {
      setActiveMatchContext(ctx);
    }
  }, []);

  const resumeGame = () => {
    navigate('/game');
  };

  const resumeTournament = () => {
    if (activeMatchContext) {
      const config = {
        players: [activeMatchContext.player1.name, activeMatchContext.player2.name],
        startingScore: activeMatchContext.startingScore,
        rules: activeMatchContext.rules,
        tournamentMatch: {
          ...activeMatchContext,
          player1Id: activeMatchContext.player1.id,
          player2Id: activeMatchContext.player2.id,
        },
      };
      // All data persists to database - no sessionStorage needed
      navigate('/game', { state: config });
    } else {
      navigate('/tournament');
    }
  };

  return (
    <div className="min-h-screen bg-dart-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block bg-gradient-to-br from-dart-accent to-red-600 text-6xl font-black px-8 py-4 rounded-3xl mb-4 shadow-2xl">
            🎯
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-2 tracking-tight">
            Dart<span className="text-dart-accent">Score</span>
          </h1>
          <p className="text-dart-muted text-lg">Professional Darts Scoring</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {activeGame && !(activeMatchContext) && (
            <button
              onClick={resumeGame}
              className="w-full btn bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 py-5 text-lg shadow-2xl pop-in"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-black">▶ RESUME GAME</span>
                <span className="text-sm font-normal opacity-80">
                  {activeGame.players.map(p => p.name).join(' vs ')} · {activeGame.startingScore}
                </span>
              </div>
            </button>
          )}

          {activeTournament && (
            <button
              onClick={resumeTournament}
              className="w-full btn bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 py-5 text-lg shadow-2xl pop-in"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-black">
                  {activeMatchContext ? '▶ RESUME MATCH' : '🏆 RESUME TOURNAMENT'}
                </span>
                <span className="text-sm font-normal opacity-90">
                  {activeTournament.name} · {activeTournament.players.length} Players
                  {activeMatchContext && (
                    <>
                      {' · '}
                      {activeMatchContext.player1.name} vs {activeMatchContext.player2.name}
                    </>
                  )}
                </span>
              </div>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              to="/new-game"
              className="btn-primary py-5 text-center shadow-xl"
            >
              <span className="text-lg font-black">+ NEW GAME</span>
            </Link>
            <Link
              to="/new-tournament"
              className="btn bg-gradient-to-r from-dart-accent2 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 py-5 text-center shadow-xl active:scale-95 transition-all"
            >
              <span className="text-lg font-black">🏆 TOURNAMENT</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              to="/history"
              className="btn-secondary py-5 text-center"
            >
              <span className="font-bold">📜 GAME HISTORY</span>
              {historyCount > 0 && (
                <span className="ml-2 bg-dart-accent/20 text-dart-accent px-2.5 py-0.5 rounded-full text-sm">
                  {historyCount}
                </span>
              )}
            </Link>

            <Link
              to="/tournament-history"
              className="btn-secondary py-5 text-center"
            >
              <span className="font-bold">🏆 TOURNAMENTS</span>
              {tournamentHistoryCount > 0 && (
                <span className="ml-2 bg-dart-accent/20 text-dart-accent px-2.5 py-0.5 rounded-full text-sm">
                  {tournamentHistoryCount}
                </span>
              )}
            </Link>
          </div>

          <Link
            to="/settings"
            className="block w-full btn-secondary py-5 text-lg text-center"
          >
            <span className="font-bold">⚙️ SETTINGS</span>
          </Link>
        </div>

        <div className="mt-10 text-center text-dart-muted text-sm">
          <p>Supports 1–8 players · Tournaments 4/8/16 · Double In/Out</p>
          <p className="mt-1 text-xs opacity-60">Works offline · Data saved locally</p>
        </div>
      </div>
    </div>
  );
}
