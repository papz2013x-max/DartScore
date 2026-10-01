import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@dmin12345',
  database: process.env.DB_NAME || 'dartscore_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

export async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS tournaments (
    share_code VARCHAR(6) PRIMARY KEY, tournament_id VARCHAR(64) NOT NULL, name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL, format VARCHAR(64) NOT NULL, match_format VARCHAR(32) NOT NULL,
    starting_score INT NOT NULL, rules JSON NOT NULL, access_password VARCHAR(128) NULL, tournament_data JSON NOT NULL,
    created_at BIGINT NULL, updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try {
    await pool.query('ALTER TABLE tournaments ADD COLUMN access_password VARCHAR(128) NULL');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS tournament_players (
    share_code VARCHAR(6) NOT NULL, player_id VARCHAR(64) NOT NULL, name VARCHAR(255) NOT NULL,
    player_data JSON NOT NULL, PRIMARY KEY (share_code, player_id),
    FOREIGN KEY (share_code) REFERENCES tournaments(share_code) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tournament_matches (
    share_code VARCHAR(6) NOT NULL, match_id VARCHAR(64) NOT NULL, match_number INT NOT NULL,
    status VARCHAR(32) NOT NULL, player1_id VARCHAR(64) NULL, player2_id VARCHAR(64) NULL,
    player1_legs INT NOT NULL, player2_legs INT NOT NULL, claimed_by VARCHAR(255) NULL,
    match_data JSON NOT NULL, PRIMARY KEY (share_code, match_id),
    FOREIGN KEY (share_code) REFERENCES tournaments(share_code) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS games (
    game_id VARCHAR(64) PRIMARY KEY, status VARCHAR(32) NOT NULL, game_context VARCHAR(32) NOT NULL,
    starting_score INT NOT NULL, rules JSON NOT NULL, players JSON NOT NULL, game_data JSON NOT NULL,
    created_at BIGINT NULL, updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export function hashTournamentPassword(password = '') {
  return password ? createHash('sha256').update(password).digest('hex') : null;
}

export async function saveGameRecord(game) {
  await pool.execute(`INSERT INTO games
    (game_id, status, game_context, starting_score, rules, players, game_data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status=VALUES(status), game_context=VALUES(game_context), starting_score=VALUES(starting_score),
    rules=VALUES(rules), players=VALUES(players), game_data=VALUES(game_data), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
    [game.id, game.status || '', game.gameContext || '', game.startingScore || 0, JSON.stringify(game.rules || {}),
      JSON.stringify(game.players || []), JSON.stringify(game), game.createdAt || null, Date.now()]);
}

export async function loadGameRecordByMatch(matchId) {
  const [rows] = await pool.execute(
    `SELECT game_data FROM games
     WHERE JSON_UNQUOTE(JSON_EXTRACT(game_data, '$.contextData.matchId')) = ?
       AND status IN ('active', 'paused')
     ORDER BY updated_at DESC LIMIT 1`,
    [matchId]
  );
  if (!rows[0]) return null;
  return typeof rows[0].game_data === 'string' ? JSON.parse(rows[0].game_data) : rows[0].game_data;
}

export async function saveTournamentRecord(code, tournament, accessPasswordHash = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO tournaments
      (share_code, tournament_id, name, status, format, match_format, starting_score, rules, access_password, tournament_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE tournament_id=VALUES(tournament_id), name=VALUES(name), status=VALUES(status),
      format=VALUES(format), match_format=VALUES(match_format), starting_score=VALUES(starting_score),
      rules=VALUES(rules), access_password=COALESCE(VALUES(access_password), access_password), tournament_data=VALUES(tournament_data), created_at=VALUES(created_at), updated_at=VALUES(updated_at)` ,
      [code, tournament.id, tournament.name || '', tournament.status || '', tournament.format || '', tournament.matchFormat || '',
        tournament.startingScore || 0, JSON.stringify(tournament.rules || {}), accessPasswordHash, JSON.stringify(tournament), tournament.createdAt || null, Date.now()]);
    await connection.execute('DELETE FROM tournament_players WHERE share_code = ?', [code]);
    for (const player of tournament.players || []) {
      await connection.execute('INSERT INTO tournament_players (share_code, player_id, name, player_data) VALUES (?, ?, ?, ?)',
        [code, player.id, player.name || '', JSON.stringify(player)]);
    }
    await connection.execute('DELETE FROM tournament_matches WHERE share_code = ?', [code]);
    for (const round of tournament.rounds || []) for (const match of round.matches || []) {
      await connection.execute(`INSERT INTO tournament_matches
        (share_code, match_id, match_number, status, player1_id, player2_id, player1_legs, player2_legs, claimed_by, match_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, match.id, match.matchNumber || 0, match.status || '', match.player1?.id || null, match.player2?.id || null,
          match.player1Legs || 0, match.player2Legs || 0, match.claimedBy || null, JSON.stringify(match)]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function findTournamentByNameAndPassword(name, password = '') {
  const passwordHash = hashTournamentPassword(password);
  const [rows] = await pool.execute(
    `SELECT share_code, tournament_data FROM tournaments
     WHERE LOWER(name) = LOWER(?) AND access_password <=> ?
     ORDER BY updated_at DESC LIMIT 1`,
    [name.trim(), passwordHash]
  );
  if (!rows[0]) return null;
  const tournament = typeof rows[0].tournament_data === 'string'
    ? JSON.parse(rows[0].tournament_data)
    : rows[0].tournament_data;
  return { code: rows[0].share_code, tournament };
}

export async function listTournamentRecords() {
  const [rows] = await pool.execute(
    `SELECT share_code, tournament_id, name, status, format, match_format,
            starting_score, access_password, tournament_data, updated_at
     FROM tournaments
     WHERE status = 'active'
     ORDER BY updated_at DESC`
  );
  return rows.map(row => {
    const tournament = typeof row.tournament_data === 'string'
      ? JSON.parse(row.tournament_data)
      : row.tournament_data;
    return {
      code: row.share_code,
      id: row.tournament_id,
      name: row.name,
      status: row.status,
      format: row.format,
      matchFormat: row.match_format,
      startingScore: row.starting_score,
      playerCount: tournament?.players?.length || 0,
      hasPassword: Boolean(row.access_password),
      updatedAt: row.updated_at,
    };
  });
}

export async function joinTournamentByCode(code, password = '') {
  const passwordHash = hashTournamentPassword(password);
  const [rows] = await pool.execute(
    `SELECT share_code, tournament_data FROM tournaments
     WHERE share_code = ? AND access_password <=> ?`,
    [code.toUpperCase(), passwordHash]
  );
  if (!rows[0]) return null;
  const tournament = typeof rows[0].tournament_data === 'string'
    ? JSON.parse(rows[0].tournament_data)
    : rows[0].tournament_data;
  return { code: rows[0].share_code, tournament };
}

export async function loadTournamentRecord(code) {
  const [rows] = await pool.execute('SELECT tournament_data FROM tournaments WHERE share_code = ?', [code]);
  if (!rows[0]) return null;
  return typeof rows[0].tournament_data === 'string' ? JSON.parse(rows[0].tournament_data) : rows[0].tournament_data;
}

function findMatch(tournament, matchId) {
  return tournament?.rounds?.flatMap(round => round.matches || []).find(match => match.id === matchId);
}

function createLockPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const CLAIM_LEASE_MS = 2 * 60 * 1000;

export async function claimTournamentMatch(code, matchId, clientId, pin = '') {
  const existingTournament = await loadTournamentRecord(code);
  const existingMatch = findMatch(existingTournament, matchId);
  if (!existingMatch) return { error: 'Match not found', status: 404 };
  if (existingMatch.status === 'paused' && existingMatch.claimedBy && existingMatch.claimedBy !== clientId && existingMatch.lockPin !== pin) {
    return { error: 'A valid PIN is required to enter this paused game', status: 403 };
  }
  const now = Date.now();
  const staleClaimBefore = now - CLAIM_LEASE_MS;
  const [result] = await pool.execute(`UPDATE tournament_matches SET claimed_by = ?,
    status = CASE WHEN status = 'paused' THEN 'in_progress' ELSE status END,
    match_data = JSON_SET(JSON_SET(JSON_REMOVE(match_data, '$.lockPin'), '$.claimedBy', ?), '$.claimedAt', ?)
    WHERE share_code = ? AND match_id = ? AND (
      claimed_by IS NULL OR claimed_by = ? OR
      (status = 'paused' AND JSON_UNQUOTE(JSON_EXTRACT(match_data, '$.lockPin')) = ?) OR
      (status = 'in_progress' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(match_data, '$.claimedAt')) AS UNSIGNED) < ?)
    )`,
    [clientId, clientId, now, code, matchId, clientId, pin, staleClaimBefore]);
  if (!result.affectedRows) {
    const tournament = await loadTournamentRecord(code);
    return findMatch(tournament, matchId)
      ? { error: 'This match is being scored on another board', status: 409 }
      : { error: 'Match not found', status: 404 };
  }
  const tournament = await loadTournamentRecord(code);
  const match = findMatch(tournament, matchId);
  match.claimedBy = clientId;
  if (match.status === 'paused') {
    match.status = 'in_progress';
    delete match.lockPin;
  }
  match.claimedAt = Date.now();
  await saveTournamentRecord(code, tournament);
  return { tournament, lockPin: match.lockPin };
}

export async function setTournamentMatchStatus(code, matchId, clientId, status, generatePin = false) {
  const tournament = await loadTournamentRecord(code);
  const match = findMatch(tournament, matchId);
  if (!match) return { error: 'Match not found', status: 404 };
  if (match.claimedBy !== clientId) return { error: 'This match is owned by another board', status: 409 };
  match.status = status;
  if (status === 'paused') {
    if (generatePin) match.lockPin = createLockPin();
  } else {
    delete match.lockPin;
  }
  await saveTournamentRecord(code, tournament);
  return { tournament, lockPin: match.lockPin };
}

export async function releaseTournamentMatch(code, matchId, clientId) {
  await pool.execute(`UPDATE tournament_matches SET claimed_by = NULL,
    match_data = JSON_REMOVE(JSON_REMOVE(match_data, '$.claimedBy'), '$.claimedAt')
    WHERE share_code = ? AND match_id = ? AND claimed_by = ?`, [code, matchId, clientId]);
  const tournament = await loadTournamentRecord(code);
  const match = findMatch(tournament, matchId);
  if (match) { delete match.claimedBy; delete match.claimedAt; await saveTournamentRecord(code, tournament); }
  return tournament;
}

export async function migrateLegacyTournaments(records) {
  for (const [code, record] of Object.entries(records || {})) {
    if (!(await loadTournamentRecord(code))) await saveTournamentRecord(code, record.tournament);
  }
}
