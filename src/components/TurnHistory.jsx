import React from 'react';
export default function TurnHistory({ players, history }) {
  if (!players?.length) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase text-dart-muted font-bold">Round Scoring</span>
        <span className="text-xs text-dart-muted">Completed rounds</span>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {players.map(player => {
          const playerRounds = (history || []).filter(entry => entry.playerId === player.id);
          return (
            <div key={player.id} className="bg-dart-card rounded-xl p-3 border border-dart-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-dart-text truncate">{player.name}</span>
                <span className="text-xs text-dart-muted">{playerRounds.length} rounds</span>
              </div>
              {playerRounds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {playerRounds.map((round, index) => (
                    <div key={`${player.id}-${index}`} className="min-w-[3.5rem] text-center">
                      <div className="text-[10px] uppercase text-dart-muted">R{index + 1}</div>
                      <div className={`font-black ${round.bust ? 'text-red-400' : 'text-dart-success'}`}>
                        {round.bust ? 'BUST' : round.score}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-dart-muted">No completed rounds</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
