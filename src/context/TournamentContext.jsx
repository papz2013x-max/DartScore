import React, { createContext, useContext } from 'react';
import { useTournament } from '../hooks/useTournament.js';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const tournamentState = useTournament();

  return (
    <TournamentContext.Provider value={tournamentState}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournamentContext must be used within a TournamentProvider');
  }
  return context;
}
