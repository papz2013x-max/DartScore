import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  claimTournamentMatch,
  findTournamentByNameAndPassword,
  hashTournamentPassword,
  initializeDatabase,
  joinTournamentByCode,
  loadGameRecordByMatch,
  listTournamentRecords,
  loadTournamentRecord,
  migrateLegacyTournaments,
  releaseTournamentMatch,
  saveGameRecord,
  saveTournamentRecord,
  setTournamentMatchStatus,
} from './db.mjs';

const port = Number(process.env.PORT || 8787);
const clients = new Map();
const distDirectory = resolve('dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveFrontend(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(404);
    response.end();
    return;
  }
  if (!existsSync(distDirectory)) return sendJson(response, 503, { error: 'Frontend build is missing' });

  let requestedPath;
  try {
    requestedPath = resolve(distDirectory, `.${decodeURIComponent(pathname)}`);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  if (requestedPath !== distDirectory && !requestedPath.startsWith(`${distDirectory}${sep}`)) {
    response.writeHead(403);
    response.end();
    return;
  }

  const hasFile = existsSync(requestedPath) && statSync(requestedPath).isFile();
  const filePath = hasFile ? requestedPath : extname(pathname) ? null : join(distDirectory, 'index.html');
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404);
    response.end();
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(filePath).pipe(response);
}

function createCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

function broadcast(code, tournament) {
  const safeTournament = sanitizeTournament(tournament);
  for (const round of safeTournament.rounds || []) for (const match of round.matches || []) delete match.lockPin;
  const payload = `event: tournament\ndata: ${JSON.stringify(safeTournament)}\n\n`;
  for (const response of clients.get(code) || []) response.write(payload);
}

function sanitizeTournament(tournament) {
  const safeTournament = JSON.parse(JSON.stringify(tournament));
  for (const round of safeTournament.rounds || []) for (const match of round.matches || []) delete match.lockPin;
  return safeTournament;
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function getTournamentRoute(pathname) {
  return pathname.match(/^\/api\/tournaments\/([^/]+)(?:\/(events|claim|status))?$/);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Client-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
      response.end();
      return;
    }

    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return serveFrontend(request, response, url.pathname);
    }

    if (request.method === 'POST' && url.pathname === '/api/tournaments') {
      const { tournament, accessPassword = '' } = await readBody(request);
      if (!tournament?.id || !tournament?.rounds) return sendJson(response, 400, { error: 'A valid tournament is required' });
      let code = createCode();
      while (await loadTournamentRecord(code)) code = createCode();
      await saveTournamentRecord(code, tournament, hashTournamentPassword(accessPassword));
      return sendJson(response, 201, { code, tournament });
    }

    if (request.method === 'GET' && url.pathname === '/api/tournaments') {
      return sendJson(response, 200, { tournaments: await listTournamentRecords() });
    }

    if (request.method === 'POST' && url.pathname === '/api/tournaments/join') {
      const { code, name, password = '' } = await readBody(request);
      if (!code && !name?.trim()) return sendJson(response, 400, { error: 'Tournament selection is required' });
      const result = code
        ? await joinTournamentByCode(code, password)
        : await findTournamentByNameAndPassword(name, password);
      if (!result) return sendJson(response, 404, { error: 'Tournament name or password is incorrect' });
      return sendJson(response, 200, result);
    }

    const gameRoute = url.pathname.match(/^\/api\/games\/([^/]+)$/);
    const matchGameRoute = url.pathname.match(/^\/api\/games\/match\/([^/]+)$/);
    if (matchGameRoute && request.method === 'GET') {
      const game = await loadGameRecordByMatch(decodeURIComponent(matchGameRoute[1]));
      return game ? sendJson(response, 200, { game }) : sendJson(response, 404, { error: 'Game not found' });
    }

    if (gameRoute && request.method === 'PUT') {
      const { game } = await readBody(request);
      if (!game?.id || !game?.players) return sendJson(response, 400, { error: 'A valid game is required' });
      await saveGameRecord(game);
      return sendJson(response, 200, { game });
    }

    const route = url.pathname.match(/^\/api\/tournaments\/([^/]+)(?:\/(events|claim|status))?$/);
    if (!route) {
      console.log(`404 Not Found: ${request.method} ${url.pathname}`);
      return sendJson(response, 404, { error: 'Not found' });
    }
    const code = route[1].toUpperCase();
    const tournament = await loadTournamentRecord(code);
    if (!tournament) return sendJson(response, 404, { error: 'Tournament not found' });

    if (request.method === 'GET' && route[2] === 'events') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      response.write(`event: tournament\ndata: ${JSON.stringify(sanitizeTournament(tournament))}\n\n`);
      const listeners = clients.get(code) || new Set();
      listeners.add(response);
      clients.set(code, listeners);
      request.on('close', () => { listeners.delete(response); if (!listeners.size) clients.delete(code); });
      return;
    }

    if (route[2] === 'claim') {
      const clientId = request.headers['x-client-id'];
      const body = request.method === 'POST' ? await readBody(request) : { matchId: url.searchParams.get('matchId') };
      const result = request.method === 'POST'
        ? await claimTournamentMatch(code, body.matchId, clientId, body.pin)
        : { tournament: await releaseTournamentMatch(code, body.matchId, clientId) };
      if (result.error) return sendJson(response, result.status, { error: result.error });
      broadcast(code, result.tournament);
      return sendJson(response, 200, { tournament: result.tournament, lockPin: result.lockPin });
    }

    if (request.method === 'POST' && route[2] === 'status') {
      const clientId = request.headers['x-client-id'];
      const { matchId, status, generatePin } = await readBody(request);
      const result = await setTournamentMatchStatus(code, matchId, clientId, status, generatePin);
      if (result.error) return sendJson(response, result.status, { error: result.error });
      broadcast(code, result.tournament);
      return sendJson(response, 200, { tournament: result.tournament, lockPin: result.lockPin });
    }

    if (request.method === 'GET') return sendJson(response, 200, { code, tournament: sanitizeTournament(tournament) });
    if (request.method === 'PUT') {
      const { tournament: updated } = await readBody(request);
      if (!updated?.id || !updated?.rounds) return sendJson(response, 400, { error: 'A valid tournament is required' });
      await saveTournamentRecord(code, updated);
      broadcast(code, updated);
      return sendJson(response, 200, { code, tournament: updated });
    }
    return sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Sync service error:', error);
    return sendJson(response, 500, { error: 'Database or server error' });
  }
});

async function start() {
  await initializeDatabase();
  const legacyFile = join(process.cwd(), 'server', 'data', 'tournaments.json');
  if (existsSync(legacyFile)) {
    try {
      await migrateLegacyTournaments(JSON.parse(readFileSync(legacyFile, 'utf8')));
    } catch (error) {
      console.error('Legacy migration failed:', error);
    }
  }
  server.once('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.log(`DartScore sync service is already running on port ${port}`);
      process.exit(0);
    }
    throw error;
  });
  server.listen(port, () => console.log(`DartScore sync service listening on http://localhost:${port} (MySQL)`));
}

start().catch(error => {
  console.error('Could not start sync service:', error);
  process.exitCode = 1;
});
