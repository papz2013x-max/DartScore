import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { readFromStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { formatDartLabel, calculateDartScore } from '../utils/gameRules.js';

export default function GameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);

  useEffect(() => {
    const all = readFromStorage(STORAGE_KEYS.GAME_HISTORY, []);
    const found = all.find(g => g.id === id);
    setGame(found || null);
  }, [id]);

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/history" className="text-dart-muted hover:text-dart-text font-semibold mb-6 block">
            ← Back to History
          </Link>
          <div className="card text-center py-16">
            <div className="text-6xl mb-4 opacity-50">❓</div>
            <h2 className="text-xl font-bold text-dart-text mb-2">Game Not Found</h2>
            <Link to="/history" className="btn-primary inline-block mt-4">Back to History</Link>
          </div>
        </div>
      </div>
    );
  }

  const winner = game.players.find(p => p.id === game.winnerId);
  const playersById = Object.fromEntries(game.players.map(p => [p.id, p]));

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/history" className="text-dart-muted hover:text-dart-text font-semibold mb-5 block">
          ← Back to History
        </Link>

        <div className="card mb-5 border-dart-accent/40">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-sm bg-dart-accent/20 text-dart-accent px-3 py-1 rounded-lg font-bold">
                  {game.startingScore}
                </span>
                {game.rules?.doubleIn && (
                  <span className="text-xs bg-red-900/40 text-red-300 px-2.5 py-1 rounded-lg font-bold border border-red-700">
                    DOUBLE IN
                  </span>
                )}
                {game.rules?.doubleOut && (
                  <span className="text-xs bg-red-900/40 text-red-300 px-2.5 py-1 rounded-lg font-bold border border-red-700">
                    DOUBLE OUT
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-dart-text">
                {game.players.map(p => p.name).join(' vs ')}
              </h1>
              <div className="text-dart-muted text-sm mt-1">{formatDate(game.date)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-dart-muted uppercase">Winner</div>
              <div className="text-2xl font-black text-dart-accent">🏆 {winner?.name}</div>
              <div className="text-sm text-dart-muted">in {game.totalTurns} turns</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {game.players.map(p => (
              <div key={p.id} className={`rounded-xl p-4 border-2 ${
                p.id === game.winnerId ? 'bg-dart-accent/10 border-dart-accent' : 'bg-dart-card border-dart-border'
              }`}>
                <div className="text-sm font-bold text-dart-text mb-2 flex items-center gap-1">
                  {p.id === game.winnerId && <span>🏆</span>} {p.name}
                </div>
                <div className="text-3xl font-black text-dart-text mb-3">{p.finalScore}</div>
                <div className="space-y-1 text-xs">
                  <RowStat k="Darts" v={p.dartsThrown} />
                  <RowStat k="Points" v={p.totalPoints} />
                  <RowStat k="Hi Dart" v={p.highestDart} />
                  <RowStat k="Hi Turn" v={p.highestTurn} />
                  <RowStat k="3-Dart Avg" v={p.threeDartAverage.toFixed(1)} />
                  <RowStat k="Double %" v={p.doubleAttempts > 0 ? `${p.doublePercentage.toFixed(0)}% (${p.doubleHits}/${p.doubleAttempts})` : '—'} />
                  <RowStat k="180s" v={p.count180s} />
                  <RowStat k="140+" v={p.count140s} />
                  <RowStat k="Busts" v={p.busts} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-dart-text mb-4">Turn-by-Turn History</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {game.history && game.history.length > 0 ? (
              game.history.map((turn, idx) => {
                const player = playersById[turn.playerId];
                const isWinTurn = turn.win;
                const isBust = turn.bust;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 flex-wrap ${
                      isWinTurn
                        ? 'bg-dart-accent/15 border-dart-accent/60'
                        : isBust
                          ? 'bg-red-900/20 border-red-700/50'
                          : 'bg-dart-card border-dart-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs bg-dart-panel px-2 py-1 rounded-lg font-bold text-dart-muted">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-dart-text">{player?.name}</span>
                      {isBust && (
                        <span className="text-xs bg-red-700 text-red-100 px-2 py-0.5 rounded font-bold">BUST</span>
                      )}
                      {isWinTurn && (
                        <span className="text-xs bg-dart-accent text-white px-2 py-0.5 rounded font-bold">WIN 🏆</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {turn.turn.map((d, di) => (
                        <div
                          key={di}
                          className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${
                            d.type === 'MISS'
                              ? 'bg-slate-700 border-slate-600 text-slate-400'
                              : 'bg-dart-panel border-dart-border text-dart-text'
                          }`}
                        >
                          {formatDartLabel(d)}
                          <span className="text-xs text-dart-muted ml-1">
                            ({calculateDartScore(d)})
                          </span>
                        </div>
                      ))}
                      <span className={`text-xl font-black ml-2 min-w-[60px] text-right ${
                        isWinTurn ? 'text-dart-accent' : isBust ? 'text-red-400' : 'text-dart-success'
                      }`}>
                        {isBust ? '0' : `+${turn.score}`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-dart-muted text-center py-8">No turn history available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RowStat({ k, v }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-dart-muted">{k}</span>
      <span className="font-bold text-dart-text">{v}</span>
    </div>
  );
}
