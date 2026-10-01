import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadTournamentFromHistory } from '../utils/tournament.js';
import TournamentBracket from './TournamentBracket.jsx';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    const t = loadTournamentFromHistory(id);
    setTournament(t);
  }, [id]);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-dart-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4 opacity-50">🔍</div>
        <h1 className="text-3xl font-black text-dart-text mb-2">Tournament Not Found</h1>
        <p className="text-dart-muted mb-6">This tournament may have been deleted.</p>
        <button onClick={() => navigate('/tournament-history')} className="btn-primary">
          ← Back to History
        </button>
      </div>
    );
  }

  return (
    <TournamentBracket
      readOnly={true}
      tournamentData={tournament}
      onBack={() => navigate('/tournament-history')}
    />
  );
}
