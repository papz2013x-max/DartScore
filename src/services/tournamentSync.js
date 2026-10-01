const API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';
let syncClientId;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Tournament sync request failed');
  return body;
}

export function publishTournament(tournament, accessPassword = '') {
  return request('/tournaments', {
    method: 'POST',
    body: JSON.stringify({ tournament, accessPassword }),
  });
}

export function joinTournament(name, password = '') {
  return request('/tournaments/join', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
}

export function listTournaments() {
  return request('/tournaments');
}

export function joinTournamentByCode(code, password = '') {
  return request('/tournaments/join', {
    method: 'POST',
    body: JSON.stringify({ code, password }),
  });
}

export function updateRemoteTournament(code, tournament) {
  return request(`/tournaments/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify({ tournament }),
  });
}

export function fetchRemoteTournament(code) {
  return request(`/tournaments/${encodeURIComponent(code)}`);
}

export function subscribeToTournament(code, onUpdate, onError) {
  const events = new EventSource(`${API_BASE}/tournaments/${encodeURIComponent(code)}/events`);
  events.addEventListener('tournament', event => {
    try { onUpdate(JSON.parse(event.data)); } catch { onError?.(new Error('Invalid tournament update')); }
  });
  events.onerror = () => onError?.(new Error('Tournament sync connection lost'));
  return () => events.close();
}

export function getSyncClientId() {
  // Keep one identity for this browser tab without using browser storage.
  if (syncClientId) return syncClientId;
  try {
    syncClientId = crypto.randomUUID();
  } catch {
    syncClientId = 'temporary-client-' + Math.random().toString(36).substr(2, 9);
  }
  return syncClientId;
}

export function claimMatch(code, matchId, pin = '') {
  const clientId = getSyncClientId();
  return request(`/tournaments/${encodeURIComponent(code)}/claim`, {
    method: 'POST',
    headers: { 'X-Client-Id': clientId },
    body: JSON.stringify({ matchId, clientId, pin }),
  });
}

export function setMatchStatus(code, matchId, status, generatePin = false) {
  return request(`/tournaments/${encodeURIComponent(code)}/status`, {
    method: 'POST',
    headers: { 'X-Client-Id': getSyncClientId() },
    body: JSON.stringify({ matchId, status, generatePin }),
  });
}

export function releaseMatch(code, matchId) {
  return request(`/tournaments/${encodeURIComponent(code)}/claim?matchId=${encodeURIComponent(matchId)}`, {
    method: 'DELETE',
    headers: { 'X-Client-Id': getSyncClientId() },
  });
}