import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import NewGame from './pages/NewGame.jsx';
import Game from './pages/Game.jsx';
import GameHistory from './pages/GameHistory.jsx';
import GameDetails from './pages/GameDetails.jsx';
import Settings from './pages/Settings.jsx';
import NewTournament from './pages/NewTournament.jsx';
import TournamentBracket from './pages/TournamentBracket.jsx';
import TournamentHistory from './pages/TournamentHistory.jsx';
import TournamentDetails from './pages/TournamentDetails.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-dart-bg">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-game" element={<NewGame />} />
        <Route path="/game" element={<Game />} />
        <Route path="/history" element={<GameHistory />} />
        <Route path="/history/:id" element={<GameDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/new-tournament" element={<NewTournament />} />
        <Route path="/tournament" element={<TournamentBracket />} />
        <Route path="/tournament-history" element={<TournamentHistory />} />
        <Route path="/tournament-history/:id" element={<TournamentDetails />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-dart-bg flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-7xl mb-4">🎯</div>
        <h1 className="text-4xl font-black text-dart-text mb-2">404</h1>
        <p className="text-dart-muted mb-6">That page doesn't exist.</p>
        <a href="/" className="btn-primary inline-block">Go Home</a>
      </div>
    </div>
  );
}
