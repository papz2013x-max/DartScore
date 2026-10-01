import React from 'react';
import { formatDartLabel, calculateDartScore } from '../utils/gameRules.js';

export default function PlayerCard({ player, isActive, turnDarts, turnScore }) {
  const darts = turnDarts || [];

  return (
    <div className={isActive ? 'card-active pulse-active' : 'card'}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="w-3 h-3 rounded-full bg-dart-accent animate-pulse"></span>
          )}
          <h3 className={`text-lg sm:text-xl font-bold ${isActive ? 'text-dart-accent' : 'text-dart-text'}`}>
            {player.name}
          </h3>
        </div>
        {!player.hasStarted && (
          <span className="text-xs bg-yellow-900/60 text-yellow-400 px-2 py-1 rounded-lg border border-yellow-700">
            NOT IN
          </span>
        )}
      </div>

      <div className={`text-center font-black leading-none mb-3 ${
        isActive
          ? 'text-dart-accent text-5xl sm:text-6xl md:text-7xl'
          : 'text-dart-text text-3xl sm:text-4xl md:text-5xl'
      }`}>
        {player.score}
      </div>

      <div className="grid grid-cols-4 gap-1 text-center text-xs">
        {[0, 1, 2].map(index => {
          const dart = darts[index];
          return (
            <div key={index} className="min-w-0">
              <div className="text-[10px] uppercase text-dart-muted">DART {index + 1}</div>
              <div className="font-bold text-dart-text truncate">
                {dart ? formatDartLabel(dart) : '-'}
              </div>
            </div>
          );
        })}
        <Stat label="TOTAL" value={turnDarts ? turnScore : '-'} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-dart-muted">{label}</div>
      <div className="font-bold text-dart-text">{value}</div>
    </div>
  );
}
