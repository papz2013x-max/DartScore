import React from 'react';

export default function GameControls({
  onUndo,
  onEndTurn,
  onPause,
  onRestart,
  onHome,
  canUndo,
  isPaused,
  canEndTurn,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="btn-secondary text-sm py-2.5 sm:py-3"
      >
        ↶ Undo
      </button>
      <button
        onClick={onEndTurn}
        disabled={!canEndTurn}
        className="btn-info text-sm py-2.5 sm:py-3"
      >
        End Turn
      </button>
      <button
        onClick={onPause}
        className="btn-secondary text-sm py-2.5 sm:py-3"
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>
      <button
        onClick={onRestart}
        className="btn-secondary text-sm py-2.5 sm:py-3"
      >
        ⟳ Restart
      </button>
      <button
        onClick={onHome}
        className="btn-secondary text-sm py-2.5 sm:py-3 col-span-2 sm:col-span-1"
      >
        🏠 Home
      </button>
    </div>
  );
}
