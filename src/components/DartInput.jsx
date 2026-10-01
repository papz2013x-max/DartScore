import React, { useState } from 'react';
import { DART_NUMBERS, MULTIPLIERS, SPECIAL_DARTS, SPECIAL_SCORES } from '../utils/constants.js';

export default function DartInput({ onThrow, disabled }) {
  const [multiplier, setMultiplier] = useState(MULTIPLIERS.SINGLE);

  const handleNumber = (n) => {
    if (disabled) return;
    const mult = multiplier === MULTIPLIERS.SINGLE ? 1 : multiplier === MULTIPLIERS.DOUBLE ? 2 : 3;
    onThrow({
      type: 'NUMBER',
      number: n,
      multiplier: mult,
    });
    setMultiplier(MULTIPLIERS.SINGLE);
  };

  const handleSpecial = (type) => {
    if (disabled) return;
    onThrow({ type });
    setMultiplier(MULTIPLIERS.SINGLE);
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MultiplierButton
          active={multiplier === MULTIPLIERS.SINGLE}
          onClick={() => setMultiplier(MULTIPLIERS.SINGLE)}
          disabled={disabled}
          label="SINGLE"
          colorClass="bg-slate-500"
        />
        <MultiplierButton
          active={multiplier === MULTIPLIERS.DOUBLE}
          onClick={() => setMultiplier(MULTIPLIERS.DOUBLE)}
          disabled={disabled}
          label="DOUBLE"
          colorClass="bg-red-500"
        />
        <MultiplierButton
          active={multiplier === MULTIPLIERS.TRIPLE}
          onClick={() => setMultiplier(MULTIPLIERS.TRIPLE)}
          disabled={disabled}
          label="TRIPLE"
          colorClass="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {DART_NUMBERS.map(n => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => handleNumber(n)}
            className="h-14 sm:h-18 lg:h-18 rounded-xl bg-dart-card text-dart-text font-bold text-lg sm:text-xl border border-dart-border hover:bg-slate-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          disabled={disabled}
          onClick={() => handleSpecial(SPECIAL_DARTS.MISS)}
          className="py-4 rounded-xl bg-slate-700 text-dart-muted font-bold border border-dart-border hover:bg-slate-600 active:scale-95 transition-all disabled:opacity-40"
        >
          MISS
        </button>
        <button
          disabled={disabled}
          onClick={() => handleSpecial(SPECIAL_DARTS.OUTER_BULL)}
          className="py-4 rounded-xl bg-green-800 text-white font-bold border border-green-600 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40"
        >
          25
        </button>
        <button
          disabled={disabled}
          onClick={() => handleSpecial(SPECIAL_DARTS.BULLSEYE)}
          className="py-4 rounded-xl bg-red-700 text-white font-bold border border-red-500 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-40"
        >
          50
        </button>
      </div>
    </div>
  );
}

function MultiplierButton({ active, onClick, disabled, label, colorClass }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`py-3 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 border-2 disabled:opacity-40 ${
        active
          ? `${colorClass} text-white border-white shadow-lg scale-[1.02]`
          : 'bg-dart-card text-dart-muted border-dart-border hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );
}
