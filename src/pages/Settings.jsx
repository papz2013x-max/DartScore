import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    hapticEnabled: true,
    theme: 'dark',
  });

  const toggle = (k) => setSettings(s => ({ ...s, [k]: !s[k] }));

  return (
    <div className="min-h-screen bg-dart-bg p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-dart-muted hover:text-dart-text font-semibold">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-dart-text">Settings</h1>
          <div className="w-16"></div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="label">Preferences</div>
            <div className="space-y-3">
              <SettingToggle
                label="Sound Effects"
                description="Play sounds on dart throw and events"
                checked={settings.soundEnabled}
                onChange={() => toggle('soundEnabled')}
              />
              <SettingToggle
                label="Haptic Feedback"
                description="Vibrate on mobile devices when possible"
                checked={settings.hapticEnabled}
                onChange={() => toggle('hapticEnabled')}
              />
              <SettingToggle
                label="Dark Theme"
                description="Always use dark mode"
                checked={settings.theme === 'dark'}
                onChange={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
              />
            </div>
          </div>

          <div className="card text-center">
            <div className="text-3xl font-black text-dart-accent mb-1">DartScore</div>
            <div className="text-sm text-dart-muted">Version 1.0.0</div>
            <div className="text-xs text-dart-muted/70 mt-2">
              Built with React · Vite · Tailwind CSS
            </div>
            <div className="mt-3 text-xs text-dart-muted/60">
              All data is stored in the database. No browser storage used.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.99] ${
        checked
          ? 'bg-dart-accent/10 border-dart-accent/40'
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

function StorageRow({ label, value, actionLabel, onAction, actionDisabled, highlighted }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-bold text-dart-text">{label}</div>
        <div className={`text-xs ${highlighted ? 'text-dart-accent' : 'text-dart-muted'}`}>{value}</div>
      </div>
      <button
        onClick={onAction}
        disabled={actionDisabled}
        className="btn-danger text-xs py-2 px-4"
      >
        {actionLabel}
      </button>
    </div>
  );
}
