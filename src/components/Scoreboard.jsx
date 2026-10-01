import React from 'react';
import PlayerCard from './PlayerCard.jsx';
import { calculateTurnScore } from '../utils/gameRules.js';

export default function Scoreboard({ game }) {
  if (!game || !game.players) return null;

  const activeIdx = game.currentPlayerIndex;
  const turnScore = calculateTurnScore(game.currentTurn.darts);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {game.players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={idx === activeIdx}
            turnDarts={idx === activeIdx ? game.currentTurn.darts : null}
            turnScore={idx === activeIdx ? turnScore : 0}
          />
        ))}
      </div>
    </div>
  );
}
