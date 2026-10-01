import mysql from 'mysql2/promise';

const tables = [
  'tournament_matches',
  'tournament_players',
  'tournaments',
  'games',
];
const confirmed = process.argv.includes('--confirm');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@dmin12345',
  database: process.env.DB_NAME || 'dartscore_db',
  charset: 'utf8mb4',
});

try {
  const counts = {};
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = rows[0].count;
  }

  console.log('DartScore database cleanup');
  for (const [table, count] of Object.entries(counts)) console.log(`  ${table}: ${count} row(s)`);

  if (!confirmed) {
    console.log('\nDry run only. Add --confirm to delete these rows.');
    process.exitCode = 0;
  } else {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) await pool.query(`TRUNCATE TABLE ${table}`);
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\nAll DartScore application data was deleted. Database tables were preserved.');
  }
} catch (error) {
  console.error(`Database cleanup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
