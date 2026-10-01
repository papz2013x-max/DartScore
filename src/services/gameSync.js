const API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

export async function saveRemoteGame(game) {
  try {
    await fetch(`${API_BASE}/games/${encodeURIComponent(game.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game }),
    });
  } catch (error) {
    console.error('Game database sync failed:', error);
  }
}

export async function fetchRemoteGameForMatch(matchId) {
  const response = await fetch(`${API_BASE}/games/match/${encodeURIComponent(matchId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Could not load the saved match game');
  const body = await response.json();
  return body.game || null;
}