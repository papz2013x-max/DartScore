import React from 'react';
import { getCheckoutSuggestion, getAllCheckoutSuggestions } from '../utils/checkoutCalculator.js';

export default function CheckoutSuggestion({ remainingScore, rules, dartsLeft }) {
  if (!remainingScore || remainingScore <= 0) return null;

  const suggestions = getAllCheckoutSuggestions(remainingScore, rules, dartsLeft);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="card">
        <div className="text-xs uppercase text-dart-muted font-bold mb-2">Checkout Suggestion</div>
        <div className="text-sm text-dart-muted">No checkout available for {remainingScore}</div>
      </div>
    );
  }

  return (
    <div className="card border-dart-accent/30">
      <div className="text-xs uppercase text-dart-muted font-bold mb-3 flex items-center justify-between">
        <span>Checkout Suggestion</span>
        <span className="text-dart-accent">{remainingScore} left</span>
      </div>
      <div className="space-y-2">
        {suggestions.map((combo, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 ${idx === 0 ? '' : 'opacity-70'}`}
          >
            {idx === 0 && <span className="text-xs bg-dart-accent text-white px-2 py-0.5 rounded">BEST</span>}
            <div className="flex gap-2 flex-wrap flex-1">
              {combo.map((d, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                    i === combo.length - 1 && rules.doubleOut
                      ? 'bg-red-900/40 border-red-600 text-red-300'
                      : 'bg-dart-card border-dart-border text-dart-text'
                  }`}
                >
                  {d.label}
                  <span className="text-xs text-dart-muted ml-1">({d.score})</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
