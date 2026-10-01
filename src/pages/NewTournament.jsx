import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SUPPORTED_PLAYER_COUNTS,
  DEFAULT_STARTING_SCORE,
  DEFAULT_RULES,
  MATCH_FORMAT,
  MATCH_FORMAT_LABELS,
  TOURNAMENT_FORMAT,
  TOURNAMENT_FORMAT_LABELS,
} from '../utils/constants.js';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { joinTournamentByCode, listTournaments } from '../services/tournamentSync.js';

export default function NewTournament() {
  const navigate = useNavigate();
  const { createTournament, hasActiveTournament, syncError, setTournament } = useTournamentContext();

  const [tournamentName, setTournamentName] = useState('DartScore Championship');
  const [playerCount, setPlayerCount] = useState(8);
  const [playerNames, setPlayerNames] = useState(
    Array.from({ length: 16 }, (_, i) => (i < 2 ? `Player ${i + 1}` : ''))
  );
  const [startingScore, setStartingScore] = useState(DEFAULT_STARTING_SCORE);
  const [matchFormat, setMatchFormat] = useState(MATCH_FORMAT.BEST_OF_3);
  const [eliminationFormat, setEliminationFormat] = useState(TOURNAMENT_FORMAT.SINGLE_ELIMINATION);
  const [doubleIn, setDoubleIn] = useState(DEFAULT_RULES.doubleIn);
  const [doubleOut, setDoubleOut] = useState(DEFAULT_RULES.doubleOut);
  const [accessPassword, setAccessPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const result = await listTournaments();
      setTournaments(result.tournaments || []);
    } catch (error) {
      setJoinError(error.message);
    } finally {
      setLoadingTournaments(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const updateName = (idx, value) => {
    const copy = [...playerNames];
    copy[idx] = value;
    setPlayerNames(copy);
  };

  const handlePlayerCountChange = (n) => {
    setPlayerCount(n);
    const copy = [...playerNames];
    for (let i = 0; i < n; i++) {
      if (!copy[i]) copy[i] = '';
    }
    setPlayerNames(copy);
  };

  const canStart = () => {
    if (!tournamentName.trim()) return false;
    const names = playerNames.slice(0, playerCount).map(n => n.trim());
    return names.every(n => n.length > 0);
  };

  const [creating, setCreating] = useState(false);

  const startTournament = async () => {
    if (!canStart()) return;
    setCreating(true);
    const names = playerNames.slice(0, playerCount).map(n => n.trim());
    const t = await createTournament(names, {
      name: tournamentName.trim(),
      startingScore,
      rules: { doubleIn, doubleOut },
      matchFormat,
      format: eliminationFormat,
      accessPassword: accessPassword.trim(),
    });
    if (t) {
      setShowCreate(false);
      navigate('/tournament');
    }
    setCreating(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!selectedTournament) return;
    setJoining(true);
    setJoinError('');
    try {
      const result = await joinTournamentByCode(selectedTournament.code, joinPassword);
      if (!result?.tournament) throw new Error('Tournament could not be loaded');
      setTournament({ ...result.tournament, syncCode: result.code });
      navigate('/tournament');
    } catch (error) {
      setJoinError(error.message);
    } finally {
      setJoining(false);
    }
  };

  const scoreOptions = [
    { val: 101, label: '101' },
    { val: 301, label: '301' },
    { val: 501, label: '501' },
    { val: 701, label: '701' },
    { val: 1001, label: '1001' },
  ];

  const matchFormatOptions = [
    { val: MATCH_FORMAT.BEST_OF_1, label: 'Best of 1', sub: 'First to 1 leg' },
    { val: MATCH_FORMAT.BEST_OF_3, label: 'Best of 3', sub: 'First to 2 legs' },
    { val: MATCH_FORMAT.BEST_OF_5, label: 'Best of 5', sub: 'First to 3 legs' },
  ];

  const eliminationOptions = [
    { val: TOURNAMENT_FORMAT.SINGLE_ELIMINATION, label: TOURNAMENT_FORMAT_LABELS[TOURNAMENT_FORMAT.SINGLE_ELIMINATION], sub: 'One loss and you\'re out' },
    { val: TOURNAMENT_FORMAT.DOUBLE_ELIMINATION, label: TOURNAMENT_FORMAT_LABELS[TOURNAMENT_FORMAT.DOUBLE_ELIMINATION], sub: 'Loser\'s bracket + Grand Final' },
  ];

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-dart-muted hover:text-dart-text flex items-center gap-2">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-dart-text">🏆 New Tournament</h1>
          <div className="w-16"></div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label mb-1">Tournament Lobby</div>
            <p className="text-sm text-dart-muted">Select a tournament to enter the bracket.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
            + Create Tournament
          </button>
        </div>

        {hasActiveTournament && (
          <div className="card mb-5 border-dart-accent/50 bg-dart-accent/5">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <div className="font-bold text-dart-accent">Active Tournament in Progress</div>
                <div className="text-sm text-dart-muted">Starting a new tournament will replace the current view.</div>
              </div>
            </div>
          </div>
        )}

        {joinError && <div className="card mb-5 border-dart-danger/60 text-dart-danger">{joinError}</div>}

        {loadingTournaments ? (
          <div className="card text-center py-16 text-dart-muted">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4 opacity-60">🏆</div>
            <h2 className="text-xl font-bold text-dart-text mb-2">No active tournaments</h2>
            <p className="text-dart-muted mb-5">Create the first tournament to get started.</p>
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">Create Tournament</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {tournaments.map(tournament => (
              <button
                key={tournament.code}
                type="button"
                onClick={() => { setSelectedTournament(tournament); setJoinPassword(''); setJoinError(''); }}
                className="card text-left hover:border-dart-accent/60 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-dart-text truncate">{tournament.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-dart-muted">
                    <span>{tournament.playerCount} players</span>
                    <span>•</span>
                    <span>{tournament.startingScore}</span>
                    <span>•</span>
                    <span>{tournament.matchFormat?.replaceAll('_', ' ')}</span>
                  </div>
                </div>
                <span className="text-dart-accent font-bold flex-shrink-0">
                  {tournament.hasPassword ? '🔒 Enter' : 'Enter'} →
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedTournament && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <form onSubmit={handleJoin} className="card w-full max-w-md shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="label mb-1">Enter Tournament</div>
                  <h2 className="text-2xl font-black text-dart-text">{selectedTournament.name}</h2>
                </div>
                <button type="button" onClick={() => setSelectedTournament(null)} className="text-dart-muted text-xl">×</button>
              </div>
              <input
                className="input mb-4"
                type="password"
                placeholder={selectedTournament.hasPassword ? 'Tournament password' : 'Password (optional)'}
                value={joinPassword}
                onChange={event => setJoinPassword(event.target.value)}
                autoFocus
              />
              {joinError && <div className="text-sm text-dart-danger mb-3">{joinError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedTournament(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={joining} className="btn-primary flex-1">{joining ? 'Entering...' : 'Enter Tournament'}</button>
              </div>
            </form>
          </div>
        )}

        {showCreate && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-5xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] bg-dart-bg border border-dart-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 border-b border-dart-border flex-shrink-0">
          <div>
            <div className="label mb-0.5">Tournament Setup</div>
            <h2 className="text-xl sm:text-2xl font-black text-dart-text">Create Tournament</h2>
          </div>
          <button type="button" onClick={() => setShowCreate(false)} className="text-dart-muted hover:text-dart-text text-2xl leading-none p-2" aria-label="Close create tournament dialog">×</button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {syncError && (
            <div className="card lg:col-span-2 border-dart-danger/60 text-dart-danger">
              {syncError}
            </div>
          )}
          <div className="card p-4">
            <div className="label">Tournament Name</div>
            <input
              type="text"
              className="input text-lg"
              placeholder="Enter tournament name"
              value={tournamentName}
              onChange={e => setTournamentName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="card p-4">
            <div className="label">Tournament Password (Optional)</div>
            <input
              type="password"
              className="input"
              placeholder="Leave blank to allow anyone with the name to join"
              value={accessPassword}
              onChange={event => setAccessPassword(event.target.value)}
              maxLength={100}
              aria-label="Optional tournament password"
            />
            <p className="text-xs text-dart-muted mt-2">
              Players need this password to enter the shared tournament.
            </p>
          </div>

          <div className="card lg:col-span-2 p-4">
            <div className="label">Number of Players ({playerCount})</div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {SUPPORTED_PLAYER_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => handlePlayerCountChange(n)}
                    className={`px-4 h-10 rounded-xl font-bold border-2 transition-all active:scale-95 ${
                    playerCount === n
                      ? 'bg-dart-accent text-white border-dart-accent shadow-lg'
                      : 'bg-dart-card text-dart-text border-dart-border hover:bg-slate-600'
                  }`}
                >
                  {n} Players
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-dart-accent/20 text-dart-accent flex items-center justify-center font-bold text-xs flex-shrink-0">
                    P{i + 1}
                  </span>
                  <input
                    type="text"
                    className="input"
                    placeholder={`Player ${i + 1} Name`}
                    value={playerNames[i] || ''}
                    onChange={e => updateName(i, e.target.value)}
                    maxLength={20}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
              <div className="label">Starting Score</div>
              <div className="grid grid-cols-5 gap-2">
                {scoreOptions.map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setStartingScore(opt.val)}
                    className={`py-2 rounded-xl font-bold text-base border-2 transition-all active:scale-95 ${
                      startingScore === opt.val
                        ? 'bg-dart-accent text-white border-dart-accent'
                        : 'bg-dart-card text-dart-text border-dart-border hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          <div className="card p-4">
              <div className="label">Match Format</div>
              <div className="space-y-2">
                {matchFormatOptions.map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setMatchFormat(opt.val)}
                    className={`w-full p-3 rounded-xl text-left border-2 transition-all active:scale-[0.99] ${
                      matchFormat === opt.val
                        ? 'bg-dart-accent/10 border-dart-accent/50'
                        : 'bg-dart-card border-dart-border hover:bg-slate-600/60'
                    }`}
                  >
                    <div className={`font-bold ${matchFormat === opt.val ? 'text-dart-accent' : 'text-dart-text'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-dart-muted mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          <div className="card p-4">
            <div className="label">Elimination Type</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eliminationOptions.map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setEliminationFormat(opt.val)}
                  className={`w-full p-3 rounded-xl text-left border-2 transition-all active:scale-[0.99] ${
                    eliminationFormat === opt.val
                      ? 'bg-dart-accent/10 border-dart-accent/50'
                      : 'bg-dart-card border-dart-border hover:bg-slate-600/60'
                  }`}
                >
                  <div className={`font-bold ${eliminationFormat === opt.val ? 'text-dart-accent' : 'text-dart-text'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-dart-muted mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="label">Game Rules</div>
            <div className="space-y-2">
              <Toggle
                label="Double In"
                description="Players must hit a double to start scoring"
                checked={doubleIn}
                onChange={setDoubleIn}
              />
              <Toggle
                label="Double Out"
                description="Final dart must be a double to win a leg"
                checked={doubleOut}
                onChange={setDoubleOut}
              />
            </div>
          </div>

          <button
            onClick={startTournament}
            disabled={!canStart() || creating}
            className="w-full btn-primary py-3.5 text-lg shadow-2xl lg:col-span-2"
          >
            {creating ? 'Publishing Tournament...' : '🏆 GENERATE BRACKET'}
          </button>
        </div>
      </div>
      </div>
      </div>
      )}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.99] ${
        checked
          ? 'bg-dart-accent/10 border-dart-accent/50'
          : 'bg-dart-card border-dart-border hover:bg-slate-600/60'
      }`}
    >
      <div className="text-left">
        <div className={`font-bold ${checked ? 'text-dart-accent' : 'text-dart-text'}`}>{label}</div>
        <div className="text-xs text-dart-muted mt-0.5">{description}</div>
      </div>
      <div className={`w-14 h-8 rounded-full relative transition-all ${
        checked ? 'bg-dart-accent' : 'bg-slate-600'
      }`}>
        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
          checked ? 'left-7' : 'left-1'
        }`} />
      </div>
    </button>
  );
}
