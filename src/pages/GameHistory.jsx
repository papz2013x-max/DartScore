import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function GameHistory() {
  // All game history comes from the database - no local storage
  const [games, setGames] = useState([]);

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link to="/" className="text-dart-muted hover:text-dart-text font-semibold">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-dart-text">Game History</h1>
        </div>

        {games.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4 opacity-50">📜</div>
            <h2 className="text-xl font-bold text-dart-text mb-2">No Games Yet</h2>
            <p className="text-dart-muted mb-6">Completed games will appear here.</p>
            <Link to="/new-game" className="btn-primary inline-block">
              Start First Game
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map(g => {
              const winner = g.players.find(p => p.id === g.winnerId);
              return (
                <div key={g.id} className="card hover:border-dart-accent/40 transition-colors">
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-dart-accent/20 text-dart-accent px-2 py-1 rounded-lg font-bold">
                          {g.startingScore}
                        </span>
                        {g.rules?.doubleIn && (
                          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded-lg font-bold border border-red-700">
                            D-IN
                          </span>
                        )}
                        {g.rules?.doubleOut && (
                          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded-lg font-bold border border-red-700">
                            D-OUT
                          </span>
                        )}
                        <span className="text-xs text-dart-muted">{formatDate(g.date)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-dart-text mt-2">
                        {g.players.map(p => p.name).join(' vs ')}
                      </h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-dart-muted uppercase">Winner</div>
                      <div className="text-xl font-black text-dart-accent">🏆 {winner?.name}</div>
                      <div className="text-xs text-dart-muted">
                        {g.totalTurns} turns
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {g.players.slice(0, 4).map(p => (
                      <div key={p.id} className={`rounded-lg px-3 py-2 border ${
                        p.id === g.winnerId
                          ? 'bg-dart-accent/10 border-dart-accent/40'
                          : 'bg-dart-card border-dart-border'
                      }`}>
                        <div className="text-xs font-semibold text-dart-text truncate">{p.name}</div>
                        <div className="text-lg font-black text-dart-text">{p.finalScore}</div>
                        <div className="text-[10px] text-dart-muted">Avg {p.threeDartAverage.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button className="btn-info text-sm py-2 px-4 opacity-50 cursor-not-allowed">
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
