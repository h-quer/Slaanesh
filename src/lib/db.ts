import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const DB_PATH = './data/slaanesh.db';
const COVERS_DIR = './data/covers';

// Ensure data directory exists
fs.ensureDirSync('./data');
fs.ensureDirSync(COVERS_DIR);

export let db: any;

try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
} catch (err: any) {
  console.warn('Database initialization error encountered:', err);
  if (err.code === 'SQLITE_CORRUPT' || String(err).includes('malformed') || String(err).includes('disk image')) {
    console.warn('Corruption detected. Re-creating a fresh database...');
    try {
      if (db && typeof db.close === 'function') {
        try { db.close(); } catch (_) {}
      }
    } catch (closeErr) {}
    try {
      fs.removeSync(DB_PATH);
    } catch (e) {}
    try {
      fs.removeSync(`${DB_PATH}-shm`);
    } catch (e) {}
    try {
      fs.removeSync(`${DB_PATH}-wal`);
    } catch (e) {}
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  } else {
    throw err;
  }
}

export function initDb() {
  // Check if we need to reset the schema (old version without genres/themes or using status_id or old column names)
  try {
    const gameCols = db.prepare("PRAGMA table_info(games)").all() as any[];
    const playthroughCols = db.prepare("PRAGMA table_info(playthroughs)").all() as any[];
    if (gameCols.length > 0 && (
      !gameCols.some(c => c.name === 'genres') || 
      !gameCols.some(c => c.name === 'developers') || 
      !gameCols.some(c => c.name === 'owned_vaults') ||
      !gameCols.some(c => c.name === 'game_status') ||
      gameCols.some(c => c.name === 'status_id') ||
      gameCols.some(c => c.name === 'status') ||
      gameCols.some(c => c.name === 'release_dates') ||
      (playthroughCols.length > 0 && (
        !playthroughCols.some(c => c.name === 'uuid') ||
        !playthroughCols.some(c => c.name === 'igdb_id') ||
        !playthroughCols.some(c => c.name === 'playthrough_status')
      ))
    )) {
      console.log('Outdated schema detected. Dropping old tables to re-initialize...');
      db.exec(`
        PRAGMA foreign_keys = OFF;
        DROP TABLE IF EXISTS playthroughs;
        DROP TABLE IF EXISTS games;
        DROP TABLE IF EXISTS status_category_map;
        DROP TABLE IF EXISTS game_statuses;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS playthrough_statuses;
        DROP TABLE IF EXISTS system_config;
        DROP TABLE IF EXISTS settings;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    // If games table doesn't exist yet, that's fine
  }

  // Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY
    )
  `);
  
  const categories = ['playing', 'played', 'backlog', 'wishlist'];
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id) VALUES (?)');
  categories.forEach(c => insertCat.run(c));

  // Game Statuses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_statuses (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT DEFAULT NULL,
      sort_order INTEGER DEFAULT 0,
      is_positive INTEGER DEFAULT NULL
    )
  `);

  // Migrate is_positive column if not exists
  try {
    const tableInfo = db.prepare("PRAGMA table_info(game_statuses)").all() as any[];
    if (!tableInfo.some(c => c.name === 'is_positive')) {
      db.exec("ALTER TABLE game_statuses ADD COLUMN is_positive INTEGER DEFAULT NULL");
      db.prepare("UPDATE game_statuses SET is_positive = 1 WHERE id IN ('Completed', 'Mastered', 'Re-playing', 'Play Again')").run();
      db.prepare("UPDATE game_statuses SET is_positive = 0 WHERE id = 'Discarded'").run();
    }
  } catch (e) {
    console.error("Migration error adding 'is_positive' column:", e);
  }

  // Mapping Statuses to Categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_category_map (
      status_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (status_id, category_id),
      FOREIGN KEY (status_id) REFERENCES game_statuses(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Playthrough Statuses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS playthrough_statuses (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT DEFAULT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // Games Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      igdb_id INTEGER PRIMARY KEY CHECK(igdb_id > 0),
      name TEXT NOT NULL,
      platforms TEXT NOT NULL,
      game_status TEXT NOT NULL,
      release_date TEXT,
      release_status TEXT,
      slug TEXT,
      summary TEXT,
      image_id TEXT,
      websites TEXT,
      shops TEXT,
      genres TEXT,
      themes TEXT,
      developers TEXT,
      publishers TEXT,
      owned_vaults TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      comment TEXT,
      FOREIGN KEY (game_status) REFERENCES game_statuses(id)
    )
  `);

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Playthroughs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS playthroughs (
      uuid INTEGER PRIMARY KEY AUTOINCREMENT,
      igdb_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      platform TEXT NOT NULL,
      playthrough_status TEXT,
      time_played_minutes INTEGER,
      rating INTEGER CHECK(rating >= 0 AND rating <= 100),
      version TEXT,
      comment TEXT,
      FOREIGN KEY (igdb_id) REFERENCES games(igdb_id) ON DELETE CASCADE,
      FOREIGN KEY (playthrough_status) REFERENCES playthrough_statuses(id)
    )
  `);

  // Indexes for relational performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_playthroughs_igdb_id ON playthroughs(igdb_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_playthroughs_playthrough_status ON playthroughs(playthrough_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_games_game_status ON games(game_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_status_category_map_status_id ON status_category_map(status_id)`);

  // GOG Import Tracking Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS gog_import_reference (
      release_key TEXT PRIMARY KEY,
      playtime_minutes INTEGER,
      last_played_date TEXT,
      igdb_id INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS gog_import_stage (
      release_key TEXT PRIMARY KEY,
      playtime_minutes INTEGER,
      last_played_date TEXT,
      igdb_id INTEGER
    )
  `);

  // Cleanup old system_config table and triggers if they exist
  db.exec(`
    DROP TABLE IF EXISTS system_config;
    DROP TRIGGER IF EXISTS enforce_played_category_on_insert;
    DROP TRIGGER IF EXISTS enforce_played_category_on_status_change;
    DROP TRIGGER IF EXISTS enforce_played_category_on_delete;
  `);

  // Seed default statuses if empty
  const statusCount = db.prepare('SELECT COUNT(*) as count FROM game_statuses').get() as any;
  if (statusCount.count === 0) {
    const insertStatus = db.prepare('INSERT INTO game_statuses (id, label, color, sort_order, is_positive) VALUES (?, ?, ?, ?, ?)');
    const insertMap = db.prepare('INSERT INTO status_category_map (status_id, category_id) VALUES (?, ?)');
    
    const defaults = [
      { id: 'Playing', label: 'Playing', cats: ['playing'], color: null, order: 0, is_positive: null },
      { id: 'On Hold', label: 'On Hold', cats: ['playing'], color: '#f97316', order: 1, is_positive: null },
      { id: 'Completed', label: 'Completed', cats: ['played'], color: '#22c55e', order: 2, is_positive: 1 },
      { id: 'Mastered', label: 'Mastered', cats: ['played'], color: '#c5a059', order: 3, is_positive: 1 },
      { id: 'Discarded', label: 'Discarded', cats: ['played'], color: '#ef4444', order: 4, is_positive: 0 },
      { id: 'Re-playing', label: 'Re-playing', cats: ['playing', 'played'], color: '#e0128b', order: 5, is_positive: 1 },
      { id: 'Backlog', label: 'Backlog', cats: ['backlog'], color: null, order: 6, is_positive: null },
      { id: 'Waiting', label: 'Waiting', cats: ['backlog'], color: '#f97316', order: 7, is_positive: null },
      { id: 'Play Again', label: 'Play Again', cats: ['played', 'backlog'], color: '#3b82f6', order: 8, is_positive: 1 },
      { id: 'Wishlist', label: 'Wishlist', cats: ['wishlist'], color: null, order: 9, is_positive: null }
    ];
   
    defaults.forEach(d => {
      insertStatus.run(d.id, d.label, d.color, d.order, d.is_positive);
      d.cats.forEach(c => insertMap.run(d.id, c));
    });
   
    const insertPStatus = db.prepare('INSERT INTO playthrough_statuses (id, label, color, sort_order) VALUES (?, ?, ?, ?)');
    insertPStatus.run('finished', 'Finished', '#22c55e', 0);
    insertPStatus.run('aborted', 'Aborted', '#ef4444', 1);
  }

  // Seed default UI settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as any;
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('playthrough_status_null_sort_order', '-1');
    insertSetting.run('ui_view_mode_playing', 'card');
    insertSetting.run('ui_view_mode_played', 'list');
    insertSetting.run('ui_view_mode_backlog', 'card');
    insertSetting.run('ui_view_mode_wishlist', 'list');
    insertSetting.run('ui_search_enabled_playing', 'true');
    insertSetting.run('ui_search_enabled_played', 'true');
    insertSetting.run('ui_search_enabled_backlog', 'true');
    insertSetting.run('ui_search_enabled_wishlist', 'true');

    // New Category-Specific Visibility Defaults
    const settingsToSeed = [
      // Playing
      { tab: 'playing', cols: ['game_status', 'game_platforms', 'game_comment'] },
      // Played
      { tab: 'played', cols: ['game_status', 'p_date', 'p_platform', 'game_comment', 'p_comment'] },
      // Backlog
      { tab: 'backlog', cols: ['game_status', 'game_platforms', 'game_comment'] },
      // Wishlist
      { tab: 'wishlist', cols: ['game_status', 'game_release_date', 'game_release_status', 'game_platforms', 'game_comment'] }
    ];

    const allPossibleCols = [
      'game_status', 'game_platforms', 'game_shops', 'game_owned_vaults', 'game_comment', 'game_release_date', 'game_release_status', 'game_rating',
      'game_genres', 'game_themes',
      'p_date', 'p_platform', 'p_status', 'p_rating', 'p_time', 'p_comment'
    ];

    settingsToSeed.forEach(s => {
      ['card', 'table'].forEach(view => {
        allPossibleCols.forEach(col => {
          let value = s.cols.includes(col) ? 'true' : 'false';
          
          if (view === 'table' && s.tab === 'played') {
            if (col === 'p_status') value = 'with_status';
            else if (col === 'p_comment') value = 'with_game_comment';
            else if (['p_version', 'p_rating', 'p_time', 'game_rating'].includes(col)) value = 'with_comment';
          }
          
          insertSetting.run(`ui_show_${view}_${s.tab}_${col}`, value);
        });
      });
    });

    // Column Visibility Settings (Legacy/Global defaults)
    const defaultCols = [
      'game_status', 'game_platforms', 'game_comment', 'game_release_date', 'game_release_status', 'game_shops', 'game_owned_vaults',
      'p_date', 'p_platform', 'p_comment'
    ];
    
    // Enabled by default
    defaultCols.forEach(col => {
      insertSetting.run(`ui_show_card_${col}`, 'true');
      insertSetting.run(`ui_show_table_${col}`, 'true');
    });

    // Disabled by default
    ['p_status', 'p_rating', 'p_time', 'game_rating', 'game_genres', 'game_themes'].forEach(col => {
      insertSetting.run(`ui_show_card_${col}`, 'false');
      insertSetting.run(`ui_show_table_${col}`, 'false');
    });

    // Seed Editor Visibility Settings
    const uiSettings = [
      'ui_editor_show_summary', 'ui_editor_show_genres', 'ui_editor_show_themes', 
      'ui_editor_show_platforms', 'ui_editor_show_release_date', 'ui_editor_show_release_status',
      'ui_editor_show_developers', 'ui_editor_show_publishers',
      'ui_editor_show_websites', 'ui_editor_show_shops', 'ui_editor_show_owned_vaults',
      'ui_show_stats_genres', 'ui_show_stats_themes'
    ];
    uiSettings.forEach(field => {
      insertSetting.run(field, 'true');
    });
  }
}

// Ensure database is fully initialized immediately on import to prevent "no such table" errors
initDb();

export function wipeAndReinitDb() {
  db.transaction(() => {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS playthroughs;
      DROP TABLE IF EXISTS games;
      DROP TABLE IF EXISTS status_category_map;
      DROP TABLE IF EXISTS game_statuses;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS playthrough_statuses;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS gog_import_reference;
      DROP TABLE IF EXISTS gog_import_stage;
      PRAGMA foreign_keys = ON;
    `);
  })();

  try {
    db.exec('VACUUM');
  } catch (e) {
    console.warn("VACUUM failed:", e);
  }

  try {
    fs.emptyDirSync(COVERS_DIR);
  } catch (e) {
    console.warn("Could not empty covers directory:", e);
  }

  initDb();
}


