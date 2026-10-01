import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MAX_PLAYERS, MIN_PLAYERS, DEFAULT_STARTING_SCORE, DEFAULT_RULES } from '../utils/constants.js';

const DEFAULT_NAMES = ['Player 1', 'Player 2', '', '', '', '', '', ''];

export default function NewGame() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(DEFAULT_NAMES);
  const [startingScore, setStartingScore] = useState(DEFAULT_STARTING_SCORE);
  const [doubleIn, setDoubleIn] = useState(DEFAULT_RULES.doubleIn);
  const [doubleOut, setDoubleOut] = useState(DEFAULT_RULES.doubleOut);

  const updateName = (idx, value) => {
    const copy = [...playerNames];
    copy[idx] = value;
    setPlayerNames(copy);
  };

  const canStart = () => {
    const names = playerNames.slice(0, playerCount).map(n => n.trim());
    return names.every(n => n.length > 0);
  };

  const startGame = () => {
    if (!canStart()) return;
    const names = playerNames.slice(0, playerCount).map(n => n.trim());
    const config = {
      players: names,
      startingScore,
      rules: { doubleIn, doubleOut },
    };
    // All data persists to database - no sessionStorage needed
    navigate('/game', { state: config });
  };

  const scoreOptions = [
    { val: 101, label: '101' },
    { val: 301, label: '301' },
    { val: 501, label: '501' },
    { val: 701, label: '701' },
    { val: 1001, label: '1001' },
  ];

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-dart-muted hover:text-dart-text flex items-center gap-2">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-dart-text">New Game</h1>
          <div className="w-16"></div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="label">Players ({playerCount})</div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  disabled={n < MIN_PLAYERS || n > MAX_PLAYERS}
                  className={`w-12 h-12 rounded-xl font-bold border-2 transition-all active:scale-95 ${
                    playerCount === n
                      ? 'bg-dart-accent text-white border-dart-accent shadow-lg'
                      : 'bg-dart-card text-dart-text border-dart-border hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-dart-accent/20 text-dart-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
                    P{i + 1}
                  </span>
                  <input
                    type="text"
                    className="input"
                    placeholder={`Player ${i + 1} Name`}
                    value={playerNames[i]}
                    onChange={e => updateName(i, e.target.value)}
                    maxLength={20}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="label">Starting Score</div>
            <div className="grid grid-cols-5 gap-2">
              {scoreOptions.map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setStartingScore(opt.val)}
                  className={`py-3 rounded-xl font-bold text-lg border-2 transition-all active:scale-95 ${
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

          <div className="card">
            <div className="label">Game Rules</div>
            <div className="space-y-3">
              <Toggle
                label="Double In"
                description="Players must hit a double to start scoring"
                checked={doubleIn}
                onChange={setDoubleIn}
              />
              <Toggle
                label="Double Out"
                description="Final dart must be a double to win"
                checked={doubleOut}
                onChange={setDoubleOut}
              />
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={!canStart()}
            className="w-full btn-primary py-5 text-xl shadow-2xl"
          >
            🚀 START GAME
          </button>
        </div>
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
