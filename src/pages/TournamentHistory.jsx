import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTournamentHistory } from '../hooks/useTournament.js';
import { MATCH_FORMAT_LABELS } from '../utils/constants.js';

export default function TournamentHistory() {
  const navigate = useNavigate();
  const { history, deleteTournament, clearAll } = useTournamentHistory();

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this tournament from history?')) return;
    deleteTournament(id);
  };

  const handleClearAll = () => {
    if (!confirm('Delete ALL tournament history? This cannot be undone.')) return;
    clearAll();
  };

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link to="/" className="text-dart-muted hover:text-dart-text font-semibold">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-dart-text">🏆 Tournament History</h1>
          {history.length > 0 && (
            <button onClick={handleClearAll} className="text-dart-danger hover:text-red-400 font-semibold text-sm">
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4 opacity-50">🏆</div>
            <h2 className="text-xl font-bold text-dart-text mb-2">No Tournaments Yet</h2>
            <p className="text-dart-muted mb-6">Completed tournaments will appear here.</p>
            <Link to="/new-tournament" className="btn-primary inline-block">
              Start First Tournament
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(t => {
              const champion = t.champion;
              return (
                <div
                  key={t.id}
                  className="card hover:border-dart-accent/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tournament-history/${t.id}`)}
                >
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-dart-accent/20 text-dart-accent px-2 py-1 rounded-lg font-bold">
                          {t.numPlayers} Players
                        </span>
                        <span className="text-xs bg-dart-info/20 text-dart-info px-2 py-1 rounded-lg font-bold">
                          {MATCH_FORMAT_LABELS[t.matchFormat]}
                        </span>
                        <span className="text-xs bg-dart-accent/20 text-dart-accent px-2 py-1 rounded-lg font-bold">
                          {t.startingScore}
                        </span>
                        {t.rules?.doubleIn && (
                          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded-lg font-bold border border-red-700">
                            D-IN
                          </span>
                        )}
                        {t.rules?.doubleOut && (
                          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded-lg font-bold border border-red-700">
                            D-OUT
                          </span>
                        )}
                        <span className="text-xs text-dart-muted">{formatDate(t.date)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-dart-text mt-2">
                        🏆 {t.name}
                      </h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-dart-muted uppercase">Champion</div>
                      <div className="text-xl font-black text-dart-accent">🏆 {champion?.name || '—'}</div>
                      <div className="text-xs text-dart-muted">
                        {t.rounds?.length || 0} rounds
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <div className="text-xs text-dart-muted flex items-center gap-1 flex-wrap">
                      <span>Players:</span>
                      {t.players?.map((p, i) => (
                        <span key={p.id} className="inline-flex items-center">
                          <span className={champion?.id === p.id ? 'text-dart-accent font-bold' : 'text-dart-text'}>
                            {p.name}
                          </span>
                          {i < (t.players?.length || 0) - 1 && <span className="text-dart-muted mx-1">,</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/tournament-history/${t.id}`); }}
                      className="btn-info text-sm py-2 px-4"
                    >
                      View Bracket
                    </button>
                    <button
                      onClick={(e) => handleDelete(t.id, e)}
                      className="btn-danger text-sm py-2 px-4"
                    >
                      Delete
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
