import express from 'express';
import path from 'path';
import { initDb, db, wipeAndReinitDb } from './src/lib/db.js';
import { searchGames, getGameById, getGamesByIds, matchExternalGames } from './src/lib/igdb.js';
import fs from 'fs-extra';
import axios from 'axios';
import { stringify } from 'csv-stringify/sync';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Check IGDB Credentials
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  const hasIgdbCreds = !!(clientId && clientSecret);

  // IGDB Website Type IDs
  const SHOP_CATEGORIES_WEB: Record<number, string> = {
    10: 'Apple',
    11: 'Apple',
    12: 'Google Play',
    13: 'Steam',
    15: 'Itch.io',
    16: 'Epic Games',
    17: 'GOG'
  };

  const getDynamicDefaults = () => {
    const rawStatuses = db.prepare(`
      SELECT s.id, s.label, s.sort_order,
        (SELECT json_group_array(category_id) FROM status_category_map WHERE status_id = s.id) as categories
      FROM game_statuses s
      ORDER BY s.sort_order ASC
    `).all() as any[];

    const allStatuses = rawStatuses.map(s => ({
      ...s,
      categories: JSON.parse(s.categories || '[]')
    }));

    const playthroughStatuses = db.prepare(`SELECT id, label FROM playthrough_statuses ORDER BY sort_order ASC`).all() as any[];
    
    // Prioritize categories as they define behavior
    const backlog = allStatuses.find(s => s.categories.includes('backlog') && !s.categories.includes('played')) ||
                    allStatuses.find(s => s.id?.toLowerCase() === 'backlog') ||
                    allStatuses.find(s => s.label?.toLowerCase() === 'backlog') ||
                    allStatuses.find(s => s.categories.includes('backlog')) || 
                    allStatuses[0];
                    
    const played = allStatuses.find(s => s.categories.includes('played')) ||
                   allStatuses.find(s => s.id?.toLowerCase() === 'completed') ||
                   allStatuses.find(s => s.label?.toLowerCase() === 'completed') ||
                   allStatuses[0];

    const discarded = allStatuses.find(s => s.categories.includes('discarded')) ||
                      allStatuses.find(s => s.id?.toLowerCase() === 'discarded') ||
                      allStatuses.find(s => s.label?.toLowerCase().includes('discarded')) ||
                      played;
                      
    const playthroughDefault = playthroughStatuses.find(s => s.label?.toLowerCase().includes('finish')) ||
                               playthroughStatuses.find(s => s.id?.toLowerCase() === 'finished') ||
                               playthroughStatuses[0];

    return {
      backlog: backlog?.id || 'Backlog',
      played: played?.id || 'Completed',
      discarded: discarded?.id || 'Discarded',
      playthrough: playthroughDefault?.id || 'finished'
    };
  };

  const getShops = (externalGames: any[] = [], websites: any[] = []) => {
    const shopsMap = new Map<string, string>();

    // Try external_games first
    externalGames.forEach(eg => {
      let name = '';
      if (eg.external_game_source && typeof eg.external_game_source === 'object') {
        name = eg.external_game_source.name;
        if (name === 'Epic Games Store') {
          name = 'Epic Games';
        }
      }

      if (name) {
        let url = eg.url;
        // Construct URLs if missing but uid exists
        if (!url && eg.uid) {
          if (name === 'Steam') {
             url = `https://store.steampowered.com/app/${eg.uid}`;
          } else if (name === 'GOG') {
             url = `https://www.gog.com/game/${eg.uid}`;
          } else if (name === 'Amazon') {
             url = `https://www.amazon.com/dp/${eg.uid}`;
          }
        }
        if (url && !shopsMap.has(name)) {
          shopsMap.set(name, url);
        }
      }
    });

    // Supplement with websites (sometimes stores are only here)
    websites.forEach(w => {
      const typeId = w.type || w.category;
      const name = SHOP_CATEGORIES_WEB[typeId];
      if (name && w.url && !shopsMap.has(name)) {
        shopsMap.set(name, w.url);
      }
    });

    return Array.from(shopsMap.entries()).map(([name, url]) => ({
      name,
      url
    }));
  };

  // IGDB Game Status IDs
  const IGDB_GAME_STATUSES: Record<number, string> = {
    0: 'released',
    2: 'alpha',
    3: 'beta',
    4: 'early access',
    5: 'offline',
    6: 'cancelled',
    7: 'rumored',
    8: 'delisted'
  };

  const getReleaseStatus = (status: number | undefined) => {
    if (status === undefined || status === null) return null;
    return IGDB_GAME_STATUSES[status] || null;
  };

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Custom css overrides server endpoint
  app.get('/custom.css', (req, res) => {
    const customCssPath = path.join(process.cwd(), 'data', 'custom.css');
    res.setHeader('Content-Type', 'text/css');
    if (fs.existsSync(customCssPath)) {
      res.sendFile(customCssPath);
    } else {
      res.send('/* custom.css does not exist yet */');
    }
  });
  
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toISOString().split('T')[0];
  };

  // API Routes
  app.get('/api/config-status', (req, res) => {
    res.json({ hasIgdbCreds });
  });

  const gogImportProgress = {
    active: false,
    status: '',
    logs: [] as string[],
    current: 0,
    total: 0
  };

  app.get('/api/import/gog/progress', (req, res) => {
    res.json(gogImportProgress);
  });

  const csvAnalysisProgress = {
    active: false,
    status: '',
    current: 0,
    total: 0
  };

  app.get('/api/import/csv/analyze-progress', (req, res) => {
    res.json(csvAnalysisProgress);
  });

  const csvImportProgress = {
    active: false,
    status: '',
    logs: [] as string[],
    current: 0,
    total: 0
  };

  app.get('/api/import/csv/execute-progress', (req, res) => {
    res.json(csvImportProgress);
  });

  // Initialize DB
  initDb();

  // API Routes
  app.get('/api/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const queryStr = q as string;
      
      // If the query is a positive integer, assume it's an IGDB ID
      if (/^\d+$/.test(queryStr)) {
        const id = parseInt(queryStr, 10);
        if (id > 0) {
          const results = await getGameById(id);
          return res.json(results);
        }
      }

      const results = await searchGames(queryStr);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/games', (req, res) => {
    try {
      const games = db.prepare(`
        SELECT 
          g.*, 
          (SELECT AVG(rating) FROM playthroughs WHERE igdb_id = g.igdb_id AND rating IS NOT NULL) as game_rating,
          (SELECT json_group_array(category_id) FROM status_category_map WHERE status_id = g.game_status) as categories,
          (
            SELECT json_group_array(
              json_object(
                'uuid', p.uuid,
                'igdb_id', p.igdb_id,
                'date', p.date,
                'status_label', ps.label,
                'status_color', ps.color,
                'playthrough_status', p.playthrough_status,
                'platform', p.platform,
                'rating', p.rating,
                'time_played_minutes', p.time_played_minutes,
                'version', p.version,
                'comment', p.comment
              )
            )
            FROM playthroughs p
            LEFT JOIN playthrough_statuses ps ON p.playthrough_status = ps.id
            WHERE p.igdb_id = g.igdb_id
            ORDER BY p.date DESC
          ) as playthrough_info
        FROM games g
      `).all();
      
      const parseJSON = (str: string, fallback: any) => {
        try {
          return str ? JSON.parse(str) : fallback;
        } catch {
          return fallback;
        }
      };

      const enrichedGames = games.map((g: any) => ({
        ...g,
        platforms: parseJSON(g.platforms, []),
        websites: parseJSON(g.websites, []),
        shops: parseJSON(g.shops, []),
        genres: parseJSON(g.genres, []),
        themes: parseJSON(g.themes, []),
        developers: parseJSON(g.developers, []),
        publishers: parseJSON(g.publishers, []),
        categories: parseJSON(g.categories, []),
        playthrough_info: parseJSON(g.playthrough_info, [])
      }));
      
      res.json(enrichedGames);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const insertGameData = (gameData: any, status: string, igdb_id: number, gameComment?: string, owned_vaults?: string) => {
    const platforms = (gameData.platforms?.map((p: any) => {
      const name = p.name;
      return name;
    }) || [])
      .sort((a, b) => a === 'PC (Microsoft Windows)' ? -1 : b === 'PC (Microsoft Windows)' ? 1 : a.localeCompare(b));

    db.prepare(`
      INSERT OR REPLACE INTO games (igdb_id, name, platforms, game_status, release_date, release_status, slug, summary, image_id, websites, shops, genres, themes, developers, publishers, comment, owned_vaults)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      igdb_id,
      gameData.name,
      JSON.stringify(platforms),
      status,
      formatDate(gameData.first_release_date),
      getReleaseStatus(gameData.status),
      gameData.slug,
      gameData.summary,
      gameData.cover?.image_id || null,
      JSON.stringify(gameData.websites || []),
      JSON.stringify(getShops(gameData.external_games || [], gameData.websites || [])),
      JSON.stringify(gameData.genres?.map((g: any) => g.name) || []),
      JSON.stringify(gameData.themes?.map((t: any) => t.name) || []),
      JSON.stringify(gameData.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company?.name) || []),
      JSON.stringify(gameData.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company?.name) || []),
      gameComment || null,
      owned_vaults || null
    );
  };

  const downloadImageWithFallback = async (baseUrl: string, destPath: string) => {
    const urlsToTry = [
      baseUrl.replace('t_thumb', 't_1080p'),
      baseUrl.replace('t_thumb', 't_cover_big'),
      baseUrl
    ];
    
    const uniqueUrls = urlsToTry.filter((v, i, a) => a.indexOf(v) === i);
    
    for (const coverUrl of uniqueUrls) {
      try {
        const response = await axios({
          url: 'https:' + coverUrl,
          method: 'GET',
          responseType: 'stream',
          timeout: 10000 // 10s timeout to prevent infinite hangs
        });
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          response.data.on('error', (err: any) => {
            writer.destroy();
            reject(err);
          });
          writer.on('finish', () => resolve());
          writer.on('error', (err: any) => reject(err));
        });
        return; // Success
      } catch (err: any) {
        // Safe cleanup of any partial/corrupted cover file
        try {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
        } catch (_) {}
        if (coverUrl === uniqueUrls[uniqueUrls.length - 1]) {
           console.error("All fallback cover URLs failed for", baseUrl, err?.message);
        }
      }
    }
  };

  const downloadCover = async (gameData: any, igdb_id: number) => {
    if (gameData.cover?.url) {
      const coverPath = path.join(process.cwd(), 'data', 'covers', `${igdb_id}.jpg`);
      if (!fs.existsSync(coverPath)) {
        await downloadImageWithFallback(gameData.cover.url, coverPath);
      }
    }
  };

  app.post('/api/games', async (req, res) => {
    try {
      const { igdb_id, status, status_id, playthrough } = req.body;
      const finalStatus = status || status_id;
      
      // Check if exists
      const existing = db.prepare('SELECT igdb_id FROM games WHERE igdb_id = ?').get(igdb_id);
      if (existing) return res.status(400).json({ error: 'Game already in database' });

      // Constraint: Non-Played -> Played must have playthrough
      const targetCats = db.prepare('SELECT category_id FROM status_category_map WHERE status_id = ?').all(finalStatus) as any[];
      const isPlayedTarget = targetCats.some(c => c.category_id === 'played');
      
      if (isPlayedTarget && !playthrough) {
        return res.status(400).json({ error: 'Cannot move to Played category without logging a rite simultaneously.' });
      }

      const [gameData] = await getGameById(igdb_id);
      if (!gameData) return res.status(404).json({ error: 'Game not found on IGDB' });

      await downloadCover(gameData, igdb_id);

      const transaction = db.transaction(() => {
        insertGameData(gameData, finalStatus, igdb_id);

        if (playthrough) {
          db.prepare(`
            INSERT INTO playthroughs (igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            igdb_id,
            playthrough.date,
            playthrough.platform,
            playthrough.status_id || null,
            playthrough.time_played_minutes || null,
            playthrough.rating !== undefined ? playthrough.rating : null,
            playthrough.version || null,
            playthrough.comment || null
          );
        }
        checkDatabaseConsistency();
      });

      transaction();

      res.status(201).json({ message: 'Game added' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  const determineGogGameStatus = (item: any) => {
    const igdb_id = parseInt(item.igdb_id);
    const existing = isNaN(igdb_id) ? null : db.prepare('SELECT igdb_id, game_status FROM games WHERE igdb_id = ?').get(igdb_id) as any;
    const existsInDb = !!existing;
    const hasPlaythroughInDb = existsInDb ? (db.prepare('SELECT 1 FROM playthroughs WHERE igdb_id = ? LIMIT 1').get(igdb_id) ? true : false) : false;

    const wrapResult = (resObj: any) => {
      return {
        ...resObj,
        existsInDb,
        hasPlaythroughInDb
      };
    };

    const rawStatuses = db.prepare(`
      SELECT s.id, s.label, s.sort_order,
        (SELECT json_group_array(category_id) FROM status_category_map WHERE status_id = s.id) as categories
      FROM game_statuses s
      ORDER BY s.sort_order ASC
    `).all() as any[];

    const allStatuses = rawStatuses.map(s => ({
      ...s,
      categories: JSON.parse(s.categories || '[]')
    }));

    const statusToCategories = allStatuses.reduce((acc, row) => {
      acc[row.id] = row.categories;
      return acc;
    }, {} as Record<string, string[]>);

    const defaults = getDynamicDefaults();

    // Resolve playtime and date last played
    const playtime = Number(item.playtimeMinutes) || 0;
    let lastPlayedDate = item.lastPlayedDate || null;
    
    if (playtime > 0 && !lastPlayedDate) {
      if (!hasPlaythroughInDb) {
        // Assume "today" as date last played
        lastPlayedDate = new Date().toISOString().split('T')[0];
      } else {
        // Keep the existing date last played unchanged
        const pts = db.prepare('SELECT date FROM playthroughs WHERE igdb_id = ? ORDER BY date DESC, uuid DESC').all(igdb_id) as any[];
        lastPlayedDate = pts.length > 0 ? pts[0].date : new Date().toISOString().split('T')[0];
      }
    }

    const hasPTFromImport = playtime > 0 || !!lastPlayedDate;

    // Rule 1.1: Tag Check
    let matchedStatusByTag: any = null;
    if (Array.isArray(item.tags)) {
      for (const rawTag of item.tags) {
        const tagName = (rawTag || '').trim().toLowerCase();
        if (!tagName) continue;
        const match = allStatuses.find(s => (s.label || '').trim().toLowerCase() === tagName);
        if (match) {
          matchedStatusByTag = match;
          break;
        }
      }
    }

    if (matchedStatusByTag) {
      const targetStatusId = matchedStatusByTag.id;
      const isTargetPlayed = matchedStatusByTag.categories?.includes('played');

      const hasPTInDb = existsInDb ? (db.prepare('SELECT 1 FROM playthroughs WHERE igdb_id = ? LIMIT 1').get(igdb_id) ? true : false) : false;
      const isNewPlaythrough = item.conflictResolution === 'new_playthrough';
      const hasOverallPT = hasPTInDb || hasPTFromImport || isNewPlaythrough;

      if (hasOverallPT && !isTargetPlayed) {
        return wrapResult({ statusId: null, needsUserInteraction: true, conflictType: 'needs_played', lastPlayedDate });
      } else if (!hasOverallPT && isTargetPlayed) {
        return wrapResult({ statusId: null, needsUserInteraction: true, conflictType: 'needs_unplayed', lastPlayedDate });
      } else {
        return wrapResult({ statusId: targetStatusId, needsUserInteraction: false, conflictType: null, lastPlayedDate });
      }
    }

    // Rule 2: If the game does not have a tag that defines its new status
    if (!existsInDb) {
      // Brand-new game
      if (!hasPTFromImport) {
        // Rule 2.b.1: quiet fallback to backlog
        const fallbackStatus = defaults.backlog;
        return wrapResult({ statusId: fallbackStatus, needsUserInteraction: false, conflictType: null, lastPlayedDate });
      } else {
        // Rule 2.b.2: always user interaction for played brand-new games
        return wrapResult({ statusId: null, needsUserInteraction: true, conflictType: 'needs_played', lastPlayedDate });
      }
    } else {
      // Already exists in the database
      const wouldBePlayed = hasPTFromImport;

      if (!wouldBePlayed) {
        // Rule 2.c.2: keep existing status, don't overwrite
        return wrapResult({ statusId: existing.game_status, needsUserInteraction: false, conflictType: null, lastPlayedDate });
      } else {
        // Rule 2.c.3: check whether existing is played or non-played category
        const existingStatusId = existing.game_status;
        const existingStatusCategories = statusToCategories[existingStatusId] || [];
        const isExistingPlayed = existingStatusCategories.includes('played');

        if (isExistingPlayed) {
          // Rule 2.c.3.1: keep existing status, don't overwrite
          return wrapResult({ statusId: existingStatusId, needsUserInteraction: false, conflictType: null, lastPlayedDate });
        } else {
          // Rule 2.c.3.2: send to user interaction
          return wrapResult({ statusId: null, needsUserInteraction: true, conflictType: 'needs_played', lastPlayedDate });
        }
      }
    }
  };

  app.post('/api/import/gog/diff', async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

      // Clean staging table
      db.prepare('DELETE FROM gog_import_stage').run();

      const insertStageStmt = db.prepare(`
        INSERT INTO gog_import_stage (release_key, playtime_minutes, last_played_date, igdb_id)
        VALUES (?, ?, ?, NULL)
      `);

      for (const item of items) {
        if (item.stores && Array.isArray(item.stores)) {
          for (const s of item.stores) {
            insertStageStmt.run(s.releaseKey, s.playtimeMinutes || 0, s.lastPlayedDate || null);
          }
        } else if (item.releaseKey) {
          insertStageStmt.run(item.releaseKey, item.playtimeMinutes || 0, item.lastPlayedDate || null);
        }
      }

      const histCount = (db.prepare('SELECT COUNT(*) as count FROM gog_import_reference').get() as any).count;
      if (histCount === 0) {
        return res.json({
          hasReference: false,
          newItems: items,
          conflictItems: [],
          duplicateCount: 0
        });
      }

      const refs = db.prepare('SELECT release_key, playtime_minutes, last_played_date, igdb_id FROM gog_import_reference').all() as any[];

      const newItems: any[] = [];
      const conflictItems: any[] = [];
      let duplicateCount = 0;

      for (const item of items) {
        const storeKeys = item.stores ? item.stores.map((st: any) => st.releaseKey) : [item.releaseKey];
        const matchedRefs = refs.filter(r => storeKeys.includes(r.release_key));

        if (matchedRefs.length > 0) {
          // Compute consolidated reference playtime
          let refPlaytimeSum = 0;
          let anyRefPlaytime = false;
          matchedRefs.forEach(r => {
            if (r.playtime_minutes !== null && r.playtime_minutes !== undefined) {
              anyRefPlaytime = true;
              refPlaytimeSum += Number(r.playtime_minutes);
            }
          });
          const consolidatedRefPlaytime = anyRefPlaytime ? refPlaytimeSum : 0;

          // Compute consolidated reference last_played_date (latest date)
          let consolidatedRefDate: string | null = null;
          matchedRefs.forEach(r => {
            if (r.last_played_date) {
              const d = r.last_played_date.trim();
              if (d && (!consolidatedRefDate || d > consolidatedRefDate)) {
                consolidatedRefDate = d;
              }
            }
          });

          // Find the igdb_id linked to any matched reference
          const igdb_id = matchedRefs.find(r => r.igdb_id)?.igdb_id || null;

          const normRefPlaytime = consolidatedRefPlaytime;
          const normItemPlaytime = Number(item.playtimeMinutes) || 0;
          const isPlaytimeSame = normRefPlaytime === normItemPlaytime;

          const normRefDate = consolidatedRefDate || null;
          const normItemDate = (item.lastPlayedDate || '').trim() || null;
          const isDateSame = normRefDate === normItemDate;

          const bothZero = normRefPlaytime === 0 && normItemPlaytime === 0;

          if ((isPlaytimeSame && isDateSame) || bothZero) {
            duplicateCount++;
          } else {
            let gameName = item.title;
            let localStatusId = item.pre_selected_status_id || null;
            let hasPlaythroughs = false;
            if (igdb_id) {
              const gameRow = db.prepare('SELECT name, game_status FROM games WHERE igdb_id = ?').get(igdb_id) as any;
              if (gameRow) {
                gameName = gameRow.name;
                localStatusId = gameRow.game_status;
              }
              const ptCount = db.prepare('SELECT COUNT(*) as count FROM playthroughs WHERE igdb_id = ?').get(igdb_id) as any;
              hasPlaythroughs = ptCount && ptCount.count > 0;
            }
            conflictItems.push({
              ...item,
              igdb_id,
              title: gameName,
              igdb_name: gameName,
              localStatusId,
              hasPlaythroughs,
              lastImportedPlaytime: consolidatedRefPlaytime,
              lastImportedDate: consolidatedRefDate
            });
          }
        } else {
          newItems.push(item);
        }
      }

      res.json({
        hasReference: true,
        newItems,
        conflictItems,
        duplicateCount
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import/gog/cancel', async (req, res) => {
    try {
      db.prepare('DELETE FROM gog_import_stage').run();
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import/gog/match', async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

      const providerToIgdb: Record<string, number> = {
        'steam': 1,
        'gog': 5,
        'epic': 26
      };

      // Gather all search target identifiers across items
      const externalIds: { uid: string, category: number }[] = [];
      items.forEach(it => {
        if (it.matchUids && Array.isArray(it.matchUids)) {
          it.matchUids.forEach((mu: any) => {
            externalIds.push({ uid: String(mu.uid), category: Number(mu.category) });
          });
        } else {
          const category = providerToIgdb[it.provider] || 0;
          if (category !== 0) {
            externalIds.push({ uid: String(it.externalId), category });
          }
        }
      });

      const providerToStoreName: Record<string, string> = {
        'steam': 'Steam',
        'gog': 'GOG',
        'epic': 'Epic Games Store'
      };

      const matchedResults = await matchExternalGames(externalIds);
      
      const resultsMap = new Map<string, any>(); 
      matchedResults.forEach((m: any) => {
        if (m.game) {
          const storeName = m.external_game_source && typeof m.external_game_source === 'object' ? m.external_game_source.name : null;
          if (storeName) {
            resultsMap.set(`${m.uid}::${storeName}`, m.game);
          }
        }
      });

      const matchedItems = items.map(item => {
        const candidates: any[] = [];
        if (item.matchUids && Array.isArray(item.matchUids)) {
          item.matchUids.forEach((mu: any) => {
            const sourceMap: Record<number, string> = {
              1: 'Steam',
              5: 'GOG',
              13: 'Epic Games Store',
              26: 'Epic Games Store'
            };
            const storeName = sourceMap[mu.category];
            const found = resultsMap.get(`${mu.uid}::${storeName}`);
            if (found && found.id) {
              candidates.push(found);
            }
          });
        } else {
          const storeName = providerToStoreName[item.provider];
          const found = resultsMap.get(`${item.externalId}::${storeName}`);
          if (found && found.id) {
            candidates.push(found);
          }
        }

        if (candidates.length > 0) {
          // Take lowest resolved ID
          candidates.sort((a, b) => a.id - b.id);
          const bestMatch = candidates[0];
          return {
            ...item,
            igdb_id: bestMatch.id,
            igdb_name: bestMatch.name || null
          };
        } else {
          return {
            ...item,
            igdb_id: null,
            igdb_name: null
          };
        }
      });

      res.json({ items: matchedItems });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import/gog/analyze', async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

      // Identify which games to fetch from IGDB
      const missingIds = items.filter(it => it.igdb_id && !db.prepare('SELECT igdb_id FROM games WHERE igdb_id = ?').get(it.igdb_id)).map(it => it.igdb_id);
      const uniqueMissingIds = Array.from(new Set(missingIds)) as number[];
      
      const gamesData = uniqueMissingIds.length > 0 ? await getGamesByIds(uniqueMissingIds) : [];
      const metadataMap = new Map();
      gamesData.forEach((g: any) => metadataMap.set(g.id, g));


      const itemsNeedingStatus = [];
      const platformConflicts = [];
      const playthroughUpdates = [];

      for (const item of items) {
        if (!item.igdb_id) continue;

        if (item.conflictResolution === 'discard') {
          continue;
        }

        const gameRow = db.prepare('SELECT platforms, name FROM games WHERE igdb_id = ?').get(item.igdb_id) as any;
        const resObj = determineGogGameStatus(item);
        if (resObj.lastPlayedDate) {
          item.lastPlayedDate = resObj.lastPlayedDate;
        }

        if (resObj.needsUserInteraction) {
          itemsNeedingStatus.push({ 
            ...item, 
            conflictType: resObj.conflictType, 
            igdb_name: gameRow?.name || metadataMap.get(item.igdb_id)?.name || item.title,
            existsInDb: resObj.existsInDb,
            hasPlaythroughInDb: resObj.hasPlaythroughInDb
          });
        }

        // Playthrough silent updates check and loading existing playthrough list
        const last_played_date_final = item.lastPlayedDate || resObj.lastPlayedDate;
        let pts: any[] = [];
        if (resObj.existsInDb) {
          pts = db.prepare('SELECT uuid, date, platform, time_played_minutes FROM playthroughs WHERE igdb_id = ? ORDER BY date DESC, uuid DESC').all(item.igdb_id) as any[];
        }

        if (resObj.existsInDb && last_played_date_final && item.conflictResolution !== 'new_playthrough') {
          if (pts.length > 0) {
            const old_date = pts[0].date;
            const old_playtime = pts[0].time_played_minutes || 0;
            let new_playtime = 0;
            if (pts.length === 1) {
              new_playtime = item.playtimeMinutes !== undefined ? item.playtimeMinutes : pts[0].time_played_minutes;
            } else {
              const otherPtsSum = pts.slice(1).reduce((sum, pt) => sum + (pt.time_played_minutes || 0), 0);
              new_playtime = Math.max(0, (item.playtimeMinutes || 0) - otherPtsSum);
            }
            const new_date = last_played_date_final;

            if (old_date !== new_date || old_playtime !== new_playtime) {
              playthroughUpdates.push({
                game_id: item.igdb_id,
                game_name: gameRow?.name || metadataMap.get(item.igdb_id)?.name || item.title,
                old_date,
                new_date,
                old_playtime,
                new_playtime,
                playthrough_id: pts[0].uuid
              });
            }
          }
        }

        // Platform validation
        if (last_played_date_final) {
           const isCreated = item.conflictResolution === 'new_playthrough' || pts.length === 0;
           let allowed: string[] = [];
           if (gameRow) {
               allowed = JSON.parse(gameRow.platforms || '[]');
           } else {
               const meta = metadataMap.get(item.igdb_id);
               if (meta) {
                  allowed = (meta.platforms?.map((p: any) => p.name) || []);
               }
           }
           
           if (isCreated) {
              if (!allowed.includes('PC (Microsoft Windows)')) {
                  platformConflicts.push({
                     igdb_id: item.igdb_id,
                     gameName: gameRow?.name || metadataMap.get(item.igdb_id)?.name || item.title,
                     csv_platform: 'PC (Microsoft Windows)',
                     allowed_platforms: allowed.length > 0 ? allowed : ['Unknown']
                   });
              }
           } else {
              const existingPlatform = pts[0]?.platform || '';
              if (existingPlatform && !allowed.includes(existingPlatform)) {
                  platformConflicts.push({
                     igdb_id: item.igdb_id,
                     gameName: gameRow?.name || metadataMap.get(item.igdb_id)?.name || item.title,
                     csv_platform: existingPlatform,
                     allowed_platforms: allowed.length > 0 ? allowed : ['Unknown']
                  });
              }
           }
        }
      }

      const gameStatuses = db.prepare(`
        SELECT s.*, (SELECT json_group_array(category_id) FROM status_category_map WHERE status_id = s.id) as categories
        FROM game_statuses s
        ORDER BY s.sort_order ASC
      `).all().map((s: any) => ({ ...s, categories: JSON.parse(s.categories) }));

      res.json({ itemsNeedingStatus, platformConflicts, playthroughUpdates, metadata: Array.from(metadataMap.entries()), gameStatuses });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import/gog/execute', async (req, res) => {
    try {
      const { items, platformMappings, discardedPlaythroughUpdates } = req.body;
      if (!items || !Array.isArray(items)) {
        gogImportProgress.active = false;
        gogImportProgress.status = 'Error';
        gogImportProgress.logs = ['Invalid items structure received.'];
        return res.status(400).json({ error: 'Invalid items' });
      }

      gogImportProgress.active = true;
      gogImportProgress.status = 'Initializing...';
      gogImportProgress.logs = ['Commencing manifestation...'];
      gogImportProgress.current = 0;
      gogImportProgress.total = items.length;

      // Identify which games to fetch from IGDB
      gogImportProgress.status = 'Consulting IGDB Oracle...';
      const missingIds = items.filter(it => it.igdb_id && !db.prepare('SELECT igdb_id FROM games WHERE igdb_id = ?').get(it.igdb_id)).map(it => it.igdb_id);
      const uniqueMissingIds = Array.from(new Set(missingIds)) as number[];
      
      if (uniqueMissingIds.length > 0) {
        gogImportProgress.logs.push(`Identifying ${uniqueMissingIds.length} missing titles on IGDB...`);
      }
      const gamesData = uniqueMissingIds.length > 0 ? await getGamesByIds(uniqueMissingIds) : [];
      const gamesDataMap = new Map();
      gamesData.forEach((g: any) => gamesDataMap.set(g.id, g));

      if (uniqueMissingIds.length > 0) {
        gogImportProgress.logs.push(`Retrieved metadata for missing titles.`);
      }

      let coverIdx = 1;
      for (const gd of gamesData) {
         gogImportProgress.status = `Downloading Covers (${coverIdx}/${gamesData.length})`;
         gogImportProgress.logs.push(`Retrieving cover art for "${gd.name}" (${coverIdx}/${gamesData.length})...`);
         await downloadCover(gd, gd.id);
         coverIdx++;
      }

      const defaults = getDynamicDefaults();

      gogImportProgress.status = 'Manifesting records...';
      gogImportProgress.logs.push(`Processing database transactions for ${items.length} titles...`);

      let processed = 0;
      db.transaction(() => {
        db.pragma('defer_foreign_keys = ON');
        
        try {
          for (const item of items) {
            processed++;
            gogImportProgress.current = processed;
            const itemTitle = item.igdb_name || item.title || 'Unknown Title';
            gogImportProgress.status = `Manifesting: ${itemTitle} (${processed}/${items.length})`;
            gogImportProgress.logs.push(`[${processed}/${items.length}] Transacting details for "${itemTitle}"`);

            const igdb_id = parseInt(item.igdb_id);
            if (isNaN(igdb_id)) {
              if (item.stores && Array.isArray(item.stores)) {
                for (const store of item.stores) {
                  db.prepare(`
                    INSERT OR REPLACE INTO gog_import_reference (release_key, playtime_minutes, last_played_date, igdb_id)
                    VALUES (?, ?, ?, NULL)
                  `).run(store.releaseKey, store.playtimeMinutes ?? null, store.lastPlayedDate ?? null);
                }
              } else if (item.releaseKey) {
                db.prepare(`
                   INSERT OR REPLACE INTO gog_import_reference (release_key, playtime_minutes, last_played_date, igdb_id)
                   VALUES (?, ?, ?, NULL)
                `).run(item.releaseKey, item.playtimeMinutes || 0, item.lastPlayedDate || null);
              }
              continue;
            }

            // Save to gog_import_reference on success for all linked store copies
            if (item.stores && Array.isArray(item.stores)) {
              for (const store of item.stores) {
                db.prepare(`
                  INSERT OR REPLACE INTO gog_import_reference (release_key, playtime_minutes, last_played_date, igdb_id)
                  VALUES (?, ?, ?, ?)
                `).run(store.releaseKey, store.playtimeMinutes ?? null, store.lastPlayedDate ?? null, igdb_id);
              }
            } else if (item.releaseKey) {
              db.prepare(`
                INSERT OR REPLACE INTO gog_import_reference (release_key, playtime_minutes, last_played_date, igdb_id)
                VALUES (?, ?, ?, ?)
              `).run(item.releaseKey, item.playtimeMinutes || 0, item.lastPlayedDate || null, igdb_id);
            }

            // If the user chose to discard imported updates, keep the existing game & playthrough untouched
            const exists = db.prepare('SELECT igdb_id, owned_vaults, game_status FROM games WHERE igdb_id = ?').get(igdb_id) as any;

            let vaultsSet = new Set<string>();
            if (exists && exists.owned_vaults) {
              exists.owned_vaults.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => vaultsSet.add(s));
            }

            if (item.ownedStores && Array.isArray(item.ownedStores)) {
              item.ownedStores.forEach((st: string) => {
                const formatted = st.toLowerCase() === 'steam' ? 'Steam' : st.toLowerCase() === 'gog' ? 'GOG' : st.toLowerCase() === 'epic' ? 'Epic' : st;
                vaultsSet.add(formatted);
              });
            } else if (item.provider) {
              const formatted = item.provider.toLowerCase() === 'steam' ? 'Steam' : item.provider.toLowerCase() === 'gog' ? 'GOG' : item.provider.toLowerCase() === 'epic' ? 'Epic' : item.provider;
              vaultsSet.add(formatted);
            }

            const finalVaultsStr = Array.from(vaultsSet).join(', ') || null;

            if (item.conflictResolution === 'discard') {
              if (exists) {
                db.prepare('UPDATE games SET owned_vaults = ? WHERE igdb_id = ?').run(finalVaultsStr, igdb_id);
              }
              continue;
            }

            const resStatus = determineGogGameStatus(item);
            const last_played_date_final = item.lastPlayedDate || resStatus.lastPlayedDate;

            let status_id = item.selected_status_id;
            if (!status_id && item.conflictResolution === 'new_playthrough' && item.conflictStatusId) {
              status_id = item.conflictStatusId;
            }
            if (!status_id) {
              status_id = resStatus.statusId;
            }
            if (!status_id) {
              status_id = exists ? exists.game_status : (last_played_date_final ? defaults.played : defaults.backlog);
            }

            if (!exists) {
                const gd = gamesDataMap.get(igdb_id);
                if (gd) {
                   insertGameData(gd, status_id, igdb_id, '', finalVaultsStr);
                }
            } else {
                db.prepare('UPDATE games SET game_status = ?, owned_vaults = ? WHERE igdb_id = ?').run(status_id, finalVaultsStr, igdb_id);
            }

            if (last_played_date_final) {
               const platform = platformMappings?.[igdb_id] || 'PC (Microsoft Windows)';
               // Order by date DESC, then by uuid DESC to get the absolute latest if dates match
               const pts = db.prepare('SELECT uuid, date, time_played_minutes FROM playthroughs WHERE igdb_id = ? ORDER BY date DESC, uuid DESC').all(igdb_id) as any[];
               
               const isDiscarded = pts.length > 0 && item.conflictResolution !== 'new_playthrough' && discardedPlaythroughUpdates && Array.isArray(discardedPlaythroughUpdates) && (
                 discardedPlaythroughUpdates.includes(igdb_id) ||
                 discardedPlaythroughUpdates.includes(String(igdb_id)) ||
                 discardedPlaythroughUpdates.includes(pts[0].uuid) ||
                 discardedPlaythroughUpdates.includes(String(pts[0].uuid))
               );

               if (isDiscarded) {
                 // User chose to discard updating this existing playthrough
               } else if (item.conflictResolution === 'new_playthrough' || pts.length === 0) {
                 db.prepare(`
                   INSERT INTO playthroughs (igdb_id, date, platform, time_played_minutes)
                   VALUES (?, ?, ?, ?)
                 `).run(igdb_id, last_played_date_final, platform, item.playtimeMinutes || 0);
               } else if (pts.length === 1) {
                 const newPlaytime = item.playtimeMinutes !== undefined ? item.playtimeMinutes : pts[0].time_played_minutes;
                 db.prepare(`
                   UPDATE playthroughs SET date = ?, time_played_minutes = ? WHERE uuid = ?
                 `).run(last_played_date_final, newPlaytime, pts[0].uuid);
               } else {
                 const latestPt = pts[0];
                 const otherPtsSum = pts.slice(1).reduce((sum, pt) => sum + (pt.time_played_minutes || 0), 0);
                 const newPlaytime = Math.max(0, (item.playtimeMinutes || 0) - otherPtsSum);
                 
                 db.prepare(`
                   UPDATE playthroughs SET date = ?, time_played_minutes = ? WHERE uuid = ?
                 `).run(last_played_date_final, newPlaytime, latestPt.uuid);
               }
            }
          }
          checkDatabaseConsistency();
          db.prepare('DELETE FROM gog_import_stage').run();
        } finally {
          db.pragma('defer_foreign_keys = OFF');
        }
      })();

      gogImportProgress.active = false;
      gogImportProgress.status = 'Import Complete.';
      gogImportProgress.logs.push('Ritual completed successfully. All records matched and stored.');

      res.json({ success: true, message: 'GOG Import successful' });
    } catch (error: any) {
      gogImportProgress.active = false;
      gogImportProgress.status = 'Error';
      gogImportProgress.logs.push(`FATAL ERROR: ${error.message}`);
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  const checkDatabaseConsistency = () => {
    // 1. Any game with at least one playthrough must have a status in the "played" category.
    const gamesWithPtNotPlayed = db.prepare(`
      SELECT g.igdb_id, g.name, g.game_status
      FROM games g
      JOIN playthroughs p ON g.igdb_id = p.igdb_id
      WHERE NOT EXISTS (
        SELECT 1 FROM status_category_map m
        WHERE m.status_id = g.game_status AND m.category_id = 'played'
      )
      GROUP BY g.igdb_id
    `).all() as any[];

    if (gamesWithPtNotPlayed.length > 0) {
      const g = gamesWithPtNotPlayed[0];
      throw new Error(`CONSTRAINT VIOLATION: Game "${g.name}" (ID ${g.igdb_id}) must have a status in the "played" category because it has logged ritual records.`);
    }

    // 2. Every game with a status in the "played" category must have at least one playthrough.
    const playedGamesWithNoPt = db.prepare(`
      SELECT g.igdb_id, g.name, g.game_status
      FROM games g
      JOIN status_category_map m ON g.game_status = m.status_id
      LEFT JOIN playthroughs p ON g.igdb_id = p.igdb_id
      WHERE m.category_id = 'played' AND p.uuid IS NULL
      GROUP BY g.igdb_id
    `).all() as any[];

    if (playedGamesWithNoPt.length > 0) {
      const g = playedGamesWithNoPt[0];
      throw new Error(`CONSTRAINT VIOLATION: Game "${g.name}" (ID ${g.igdb_id}) is in the "played" category (Status: "${g.game_status}") and must have at least one ritual record.`);
    }

    // 3. Playthrough platforms must be taken from the allowed platforms of the game
    const playthroughsWithInvalidPlatforms = db.prepare(`
      SELECT p.uuid as playthrough_id, p.platform, g.name, g.platforms
      FROM playthroughs p
      JOIN games g ON p.igdb_id = g.igdb_id
    `).all() as any[];

    for (const p of playthroughsWithInvalidPlatforms) {
      try {
        const allowed = JSON.parse(p.platforms || '[]');
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(p.platform)) {
          throw new Error(`CONSTRAINT VIOLATION: Ritual record ID ${p.playthrough_id} for "${p.name}" lists platform "${p.platform}" which is not supported by the game. Approved vessels: ${allowed.join(', ')}.`);
        }
      } catch (e: any) {
        if (e.message.startsWith('CONSTRAINT VIOLATION:')) {
          throw e;
        }
      }
    }

    // 4. is_positive column validation for game_statuses:
    // Any status in 'played' category MUST be set to either 0 or 1.
    // Any status NOT in 'played' category MUST be set to NULL.
    const statusesForConsistencyCheck = db.prepare(`
      SELECT s.id, s.label, s.is_positive,
             EXISTS(SELECT 1 FROM status_category_map m WHERE m.status_id = s.id AND m.category_id = 'played') as is_played
      FROM game_statuses s
    `).all() as any[];

    for (const s of statusesForConsistencyCheck) {
      if (s.is_played) {
        if (s.is_positive !== 0 && s.is_positive !== 1) {
          throw new Error(`CONSTRAINT VIOLATION: Status "${s.label}" belongs to the "played" category, so its experience flag must be set to either positive or negative.`);
        }
      } else {
        if (s.is_positive !== null && s.is_positive !== undefined) {
          throw new Error(`CONSTRAINT VIOLATION: Status "${s.label}" is not in the "played" category, so its experience flag must be NULL.`);
        }
      }
    }
  };

  const analyzeImportData = async (games: any[], playthroughs: any[]) => {
    csvAnalysisProgress.active = true;
    csvAnalysisProgress.status = 'Commencing analysis of the imported scrolls...';
    csvAnalysisProgress.current = 0;
    csvAnalysisProgress.total = (games?.length || 0) + (playthroughs?.length || 0);

    try {
      // Compile prepared statements ONCE outside of any loops to eliminate SQLite compilation overhead
      const stmtGetGame = db.prepare('SELECT game_status, comment, name, owned_vaults FROM games WHERE igdb_id = ?');
      const stmtGetGameName = db.prepare('SELECT name FROM games WHERE igdb_id = ?');
      const stmtGetPlaythroughs = db.prepare('SELECT uuid, date, platform, comment FROM playthroughs WHERE igdb_id = ?');
      const stmtGameExists = db.prepare('SELECT 1 FROM games WHERE igdb_id = ?');
      const stmtHasPlaythrough = db.prepare('SELECT uuid FROM playthroughs WHERE igdb_id = ? LIMIT 1');

      const allStatusCategories = db.prepare('SELECT status_id, category_id FROM status_category_map').all() as any[];
      const statusToCategories = allStatusCategories.reduce((acc, row) => {
        if (!acc[row.status_id]) acc[row.status_id] = [];
        acc[row.status_id].push(row.category_id);
        return acc;
      }, {} as Record<string, string[]>);

      const gamesToImport: any[] = [];
      const gamesToUpdate: any[] = [];
      const igdbIdsToFetch = new Set<number>();

      const totalGames = games?.length || 0;
      let processedGames = 0;

      for (const game of (games || [])) {
        processedGames++;
        if (processedGames % 50 === 0 || processedGames === totalGames) {
          csvAnalysisProgress.status = `Comparing scrolls with the Archives: matching game ${processedGames}/${totalGames}...`;
          csvAnalysisProgress.current = processedGames;
        }

        const igdb_id = parseInt(game.igdb_id);
        if (isNaN(igdb_id)) {
          gamesToImport.push(game);
          continue;
        }

        const existing = stmtGetGame.get(igdb_id) as any;
        if (existing) {
          let finalComment = existing.comment || '';
          const importComment = game.comment || '';
          if (importComment) {
            if (finalComment) {
              if (!finalComment.split('; ').includes(importComment)) {
                finalComment = finalComment + "; " + importComment;
              }
            } else {
              finalComment = importComment;
            }
          }

          let finalStatusId = game.status || game.status_id;
          const dbIsPlayed = statusToCategories[existing.game_status]?.includes('played');
          const importIsPlayed = statusToCategories[finalStatusId]?.includes('played');

          if (dbIsPlayed && !importIsPlayed) {
            finalStatusId = existing.game_status;
          }

          // Merge owned_vaults
          const vaultsSet = new Set<string>();
          if (existing.owned_vaults) {
            existing.owned_vaults.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => vaultsSet.add(s));
          }
          if (game.owned_vaults) {
            game.owned_vaults.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => vaultsSet.add(s));
          }
          const finalVaultsStr = Array.from(vaultsSet).join(', ') || null;

          if (
            finalStatusId !== existing.game_status || 
            finalComment !== (existing.comment || '') || 
            finalVaultsStr !== (existing.owned_vaults || null)
          ) {
            gamesToUpdate.push({ 
              igdb_id, 
              status: finalStatusId, 
              comment: finalComment, 
              owned_vaults: finalVaultsStr, 
              name: existing.name 
            });
          }
        } else {
          gamesToImport.push(game);
          igdbIdsToFetch.add(igdb_id);
        }
      }

      const ptConflicts: any[] = [];
      const ptsToAdd: any[] = [];
      
      const ptsByGame = (playthroughs || []).reduce((acc: any, pt: any) => {
        const id = pt.igdb_id;
        if (!acc[id]) acc[id] = [];
        acc[id].push(pt);
        return acc;
      }, {});

      const pkList = Object.keys(ptsByGame);
      const totalKeys = pkList.length;
      let processedKeys = 0;

      for (const igdb_id_str of pkList) {
        processedKeys++;
        if (processedKeys % 20 === 0 || processedKeys === totalKeys) {
          csvAnalysisProgress.status = `Aligning ritual chronicles: matching game ${processedKeys}/${totalKeys}...`;
          csvAnalysisProgress.current = totalGames + processedKeys;
        }

        const igdb_id = parseInt(igdb_id_str);
        const csvPTs = ptsByGame[igdb_id_str];
        if (isNaN(igdb_id)) {
          ptsToAdd.push(...csvPTs);
          continue;
        }
        
        const existingGame = stmtGetGameName.get(igdb_id) as any;
        const dbPTs = stmtGetPlaythroughs.all(igdb_id) as any[];
        const gameName = existingGame?.name || csvPTs[0]?.gameName || `Game ${igdb_id}`;

        if (dbPTs.length === 0) {
          ptsToAdd.push(...csvPTs);
          igdbIdsToFetch.add(igdb_id);
        } else {
          // Find playthroughs that overlap in date OR are entirely new
          if (csvPTs.length > 0) {
            ptConflicts.push({ 
              igdb_id, 
              gameName, 
              db_pts: dbPTs, 
              import_pts: csvPTs 
            });
            igdbIdsToFetch.add(igdb_id);
          }
        }
      }

      csvAnalysisProgress.status = 'Consulting IGDB Oracle to expand unknown references...';
      const metadataMap = new Map();
      if (igdbIdsToFetch.size > 0) {
        const idsToFetchArr = Array.from(igdbIdsToFetch);
        const gamesData = await getGamesByIds(idsToFetchArr);
        for (const gd of gamesData) {
          metadataMap.set(gd.id, gd);
        }
      }

      const _gamesToImport: any[] = [];
      const unmappedGamesSet = new Map();

      for (const game of gamesToImport) {
        const parsedId = parseInt(game.igdb_id);
        if (isNaN(parsedId) || !metadataMap.has(parsedId)) {
          if (!unmappedGamesSet.has(game.igdb_id)) {
            unmappedGamesSet.set(game.igdb_id, { original_igdb_id: game.igdb_id, name: game.name || `ID: ${game.igdb_id}` });
          }
        } else {
          _gamesToImport.push(game);
        }
      }

      const _ptsToAdd: any[] = [];
      for (const pt of ptsToAdd) {
        const igdb_id = parseInt(pt.igdb_id);
        if (isNaN(igdb_id)) {
          if (!unmappedGamesSet.has(pt.igdb_id)) {
            unmappedGamesSet.set(pt.igdb_id, { original_igdb_id: pt.igdb_id, name: pt.gameName || pt.name || `ID: ${pt.igdb_id}` });
          }
          continue;
        }

        const gameExists = stmtGameExists.get(igdb_id);
        if (gameExists || metadataMap.has(igdb_id)) {
          _ptsToAdd.push(pt);
        } else {
          if (!unmappedGamesSet.has(pt.igdb_id)) {
            unmappedGamesSet.set(pt.igdb_id, { original_igdb_id: pt.igdb_id, name: pt.gameName || pt.name || `ID: ${igdb_id}` });
          }
        }
      }

      csvAnalysisProgress.status = 'Verifying platform alignments...';
      const platformConflicts: any[] = [];
      const checkPlatform = (igdb_id: number, platform: string, gameName: string, comment?: string) => {
        const meta = metadataMap.get(igdb_id);
        if (!meta) return;
        const allowed = meta.platforms?.map((p: any) => p.name) || [];

        if (!allowed.includes(platform || 'Unknown')) {
          platformConflicts.push({
            igdb_id,
            gameName,
            csv_platform: platform,
            comment: comment || null,
            allowed_platforms: allowed.length > 0 ? allowed : ['Unknown']
          });
        }
      };

      for (const pt of _ptsToAdd) {
        const id = parseInt(pt.igdb_id);
        const name = metadataMap.get(id)?.name || pt.gameName || `Game ${id}`;
        checkPlatform(id, pt.platform, name, pt.comment);
      }
      for (const conf of ptConflicts) {
        for (const pt of conf.import_pts) {
          checkPlatform(conf.igdb_id, pt.platform, conf.gameName, pt.comment);
        }
      }

      csvAnalysisProgress.status = 'Weighing the state of your status maps...';
      const statusConflicts: any[] = [];
      for (const game of (games || [])) {
        const igdb_id = parseInt(game.igdb_id);
        if (!igdb_id) continue;

        const existing = stmtGetGame.get(igdb_id) as any;
        const incomingStatus = game.status || game.status_id;
        const finalStatusId = existing ? 
          (statusToCategories[existing.game_status]?.includes('played') && !statusToCategories[incomingStatus]?.includes('played') ? existing.game_status : incomingStatus) :
          incomingStatus;

        const isPlayed = statusToCategories[finalStatusId]?.includes('played');
        const hasPTsInCSV = ptsByGame[igdb_id] && ptsByGame[igdb_id].length > 0;
        const hasPTsInDB = existing ? (stmtHasPlaythrough.get(igdb_id) ? true : false) : false;
        const totalPTs = hasPTsInCSV || hasPTsInDB;

        if (isPlayed && !totalPTs) {
          statusConflicts.push({
            igdb_id,
            name: existing?.name || game.name,
            type: 'no_pts_for_played',
            status: finalStatusId
          });
        } else if (!isPlayed && hasPTsInCSV) {
          statusConflicts.push({
            igdb_id,
            name: existing?.name || game.name,
            type: 'pts_for_unplayed',
            status: finalStatusId
          });
        }
      }

      const _statusConflicts: any[] = [];
      for (const conf of statusConflicts) {
        if (!unmappedGamesSet.has(String(conf.igdb_id))) {
          _statusConflicts.push(conf);
        }
      }

      const _ptConflicts: any[] = [];
      for (const conf of ptConflicts) {
        if (!unmappedGamesSet.has(String(conf.igdb_id))) {
          _ptConflicts.push(conf);
        }
      }

      csvAnalysisProgress.status = 'Decipher complete.';
      return {
        gamesToImport: _gamesToImport,
        gamesToUpdate,
        ptConflicts: _ptConflicts,
        ptsToAdd: _ptsToAdd,
        platformConflicts,
        statusConflicts: _statusConflicts,
        unmappedGames: Array.from(unmappedGamesSet.values()),
        metadata: Array.from(metadataMap.entries())
      };
    } finally {
      csvAnalysisProgress.active = false;
    }
  };

  app.post('/api/import/analyze', async (req, res) => {
    try {
      const { games, playthroughs } = req.body;
      const results = await analyzeImportData(games, playthroughs);
      res.json(results);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import/execute', async (req, res) => {
    try {
      const { gamesToImport, gamesToUpdate, ptsToAdd, ptConflicts, ptResolutions, platformMappings, statusOverrides } = req.body;
      
      const igdbIds = gamesToImport.map((g: any) => parseInt(g.igdb_id));
      const metadataMap = new Map<number, any>();
      
      csvImportProgress.active = true;
      csvImportProgress.status = 'Initializing...';
      csvImportProgress.logs = ['Commencing manifestation...'];
      csvImportProgress.current = 0;
      csvImportProgress.total = gamesToImport.length + gamesToUpdate.length;

      if (igdbIds.length > 0) {
        csvImportProgress.status = 'Consulting IGDB Oracle...';
        csvImportProgress.logs.push(`Retrieving metadata for ${igdbIds.length} missing titles from IGDB...`);
        const gamesData = await getGamesByIds(igdbIds);
        
        let coverIdx = 1;
        for (const gd of gamesData) {
          metadataMap.set(gd.id, gd);
          csvImportProgress.status = `Downloading Covers (${coverIdx}/${gamesData.length})`;
          csvImportProgress.logs.push(`Retrieving cover art for "${gd.name}" (${coverIdx}/${gamesData.length})...`);
          await downloadCover(gd, gd.id);
          coverIdx++;
        }
      }

      const defaults = getDynamicDefaults();
      const normalizePlatform = (platform: string, igdb_id: number) => {
        const mapped = platformMappings?.[`${igdb_id}::${platform}`];
        return mapped || platform;
      };

      csvImportProgress.status = 'Manifesting records...';
      csvImportProgress.logs.push(`Processing database transactions for ${gamesToImport.length} imports and ${gamesToUpdate.length} updates...`);

      const batchTransaction = db.transaction(() => {
        db.pragma('defer_foreign_keys = ON');
        
        try {
          let processed = 0;
          // 1. Insert new games
          for (const item of gamesToImport) {
            processed++;
            csvImportProgress.current = processed;
            const igdb_id = parseInt(item.igdb_id);
            const gameData = metadataMap.get(igdb_id);
            if (gameData) {
              const status_id = statusOverrides?.[igdb_id] || item.status || item.status_id || defaults.backlog;
              csvImportProgress.status = `Manifesting: ${gameData.name} (${processed}/${csvImportProgress.total})`;
              csvImportProgress.logs.push(`[${processed}/${csvImportProgress.total}] Transacting details for "${gameData.name}"`);
              insertGameData(gameData, status_id, igdb_id, item.comment, item.owned_vaults);
            }
          }

          // 2. Update existing games (Status/Comment merges)
          for (const item of gamesToUpdate) {
            processed++;
            csvImportProgress.current = processed;
            const status_id = statusOverrides?.[item.igdb_id] || item.status || item.status_id;
            const gameName = item.name || 'Existing Game';
            csvImportProgress.status = `Updating: ${gameName} (${processed}/${csvImportProgress.total})`;
            csvImportProgress.logs.push(`[${processed}/${csvImportProgress.total}] Updating details for "${gameName}"`);
            db.prepare('UPDATE games SET game_status = ?, comment = ?, owned_vaults = ? WHERE igdb_id = ?')
              .run(status_id, item.comment, item.owned_vaults || null, item.igdb_id);
          }

          // 3. Process ptsToAdd
          for (const pt of ptsToAdd) {
             const igdb_id = parseInt(pt.igdb_id);
             const platform = normalizePlatform(pt.platform, igdb_id);
             
             const existingPT = db.prepare('SELECT uuid as id, comment, time_played_minutes FROM playthroughs WHERE igdb_id = ? AND date = ?').get(igdb_id, pt.date) as any;
             if (existingPT) {
               let finalComment = existingPT.comment || '';
               if (pt.comment) {
                 if (finalComment) {
                   if (!finalComment.split('; ').includes(pt.comment)) {
                     finalComment = finalComment + "; " + pt.comment;
                   }
                 } else {
                   finalComment = pt.comment;
                 }
               }
               let finalPlaytime = existingPT.time_played_minutes || null;
               if (pt.time_played_minutes) {
                 finalPlaytime = (finalPlaytime || 0) + pt.time_played_minutes;
               }
               db.prepare('UPDATE playthroughs SET comment = ?, time_played_minutes = ? WHERE uuid = ?').run(finalComment, finalPlaytime, existingPT.id);
             } else {
               db.prepare(`
                 INSERT INTO playthroughs (igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               `).run(igdb_id, pt.date, platform, pt.status_id || pt.playthrough_status || null, pt.time_played_minutes || null, pt.rating !== undefined ? pt.rating : null, pt.version || null, pt.comment || null);
             }
          }

          // 4. Process ptConflicts
          for (const conf of ptConflicts) {
             const resolution = ptResolutions?.[conf.igdb_id]; // 'keep' | 'overwrite' | 'merge'
             const igdb_id = conf.igdb_id;

             if (resolution === 'overwrite') {
               db.prepare('DELETE FROM playthroughs WHERE igdb_id = ?').run(igdb_id);
               for (const pt of conf.import_pts) {
                 const platform = normalizePlatform(pt.platform, igdb_id);
                 db.prepare(`
                   INSERT INTO playthroughs (igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 `).run(igdb_id, pt.date, platform, pt.status_id || pt.playthrough_status || null, pt.time_played_minutes || null, pt.rating !== undefined ? pt.rating : null, pt.version || null, pt.comment || null);
               }
             } else if (resolution === 'merge') {
               for (const pt of conf.import_pts) {
                 const platform = normalizePlatform(pt.platform, igdb_id);
                 const existingPT = db.prepare('SELECT uuid as id, comment, time_played_minutes FROM playthroughs WHERE igdb_id = ? AND date = ?').get(igdb_id, pt.date) as any;
                 
                 if (existingPT) {
                   let finalComment = existingPT.comment || '';
                   if (pt.comment) {
                     if (finalComment) {
                       if (!finalComment.split('; ').includes(pt.comment)) {
                         finalComment = finalComment + "; " + pt.comment;
                       }
                     } else {
                       finalComment = pt.comment;
                     }
                   }
                   let finalPlaytime = existingPT.time_played_minutes || null;
                   if (pt.time_played_minutes) {
                     finalPlaytime = (finalPlaytime || 0) + pt.time_played_minutes;
                   }
                   db.prepare('UPDATE playthroughs SET comment = ?, time_played_minutes = ? WHERE uuid = ?').run(finalComment, finalPlaytime, existingPT.id);
                 } else {
                   db.prepare(`
                     INSERT INTO playthroughs (igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   `).run(igdb_id, pt.date, platform, pt.status_id || pt.playthrough_status || null, pt.time_played_minutes || null, pt.rating !== undefined ? pt.rating : null, pt.version || null, pt.comment || null);
                 }
               }
             }
             // 'keep' does nothing (we already skipped identical dates in analyze)
          }
          checkDatabaseConsistency();
        } finally {
          db.pragma('defer_foreign_keys = OFF');
        }
      });

      batchTransaction();
      
      csvImportProgress.active = false;
      csvImportProgress.status = 'Import Complete.';
      csvImportProgress.logs.push('Ritual completed successfully.');

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      csvImportProgress.active = false;
      csvImportProgress.status = 'Error';
      csvImportProgress.logs.push(`FATAL ERROR: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/import/csv', async (req, res) => {
    res.status(410).json({ error: 'Use /api/import/analyze and /api/import/execute instead.' });
  });

  app.post('/api/games/:id/refresh', async (req, res) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) return res.status(400).json({ error: 'Invalid ID' });
      const [gameData] = await getGameById(parsedId);
      if (!gameData) return res.status(404).json({ error: 'Game not found on IGDB' });

      // Refresh Cover
      if (gameData.cover?.url) {
        const coverPath = path.join(process.cwd(), 'data', 'covers', `${id}.jpg`);
        await downloadImageWithFallback(gameData.cover.url, coverPath);
      }

      const platforms = (gameData.platforms?.map((p: any) => {
        const name = p.name;
        return name;
      }) || [])
        .sort((a, b) => a === 'PC (Microsoft Windows)' ? -1 : b === 'PC (Microsoft Windows)' ? 1 : a.localeCompare(b));

      // Check for platform conflicts
      const existingPts = db.prepare('SELECT uuid as playthrough_id, platform as old_platform FROM playthroughs WHERE igdb_id = ?').all(parsedId);
      const invalidPts = existingPts.filter((pt: any) => !platforms.includes(pt.old_platform) && pt.old_platform !== '');
      
      const platform_mappings = req.body.platform_mappings || {};

      const unmappedConflicts = invalidPts.filter((pt: any) => {
        const mappedTo = platform_mappings[pt.playthrough_id];
        return !mappedTo || !platforms.includes(mappedTo);
      });

      if (unmappedConflicts.length > 0) {
        return res.status(200).json({
          has_conflicts: true,
          platformConflicts: unmappedConflicts,
          platforms: platforms // The new valid platforms
        });
      }

      db.transaction(() => {
        for (const pt of invalidPts as any[]) {
          const newPlatform = platform_mappings[pt.playthrough_id];
          if (newPlatform) {
            db.prepare('UPDATE playthroughs SET platform = ? WHERE uuid = ?').run(newPlatform, pt.playthrough_id);
          }
        }

        db.prepare(`
          UPDATE games 
          SET name = ?, platforms = ?, release_date = ?, release_status = ?, slug = ?, summary = ?, websites = ?, shops = ?, image_id = ?, genres = ?, themes = ?, developers = ?, publishers = ?, last_updated = CURRENT_TIMESTAMP
          WHERE igdb_id = ?
        `).run(
          gameData.name,
          JSON.stringify(platforms),
          formatDate(gameData.first_release_date),
          getReleaseStatus(gameData.status),
          gameData.slug,
          gameData.summary,
          JSON.stringify(gameData.websites || []),
          JSON.stringify(getShops(gameData.external_games || [], gameData.websites || [])),
          gameData.cover?.image_id || null,
          JSON.stringify(gameData.genres?.map((g: any) => g.name) || []),
          JSON.stringify(gameData.themes?.map((t: any) => t.name) || []),
          JSON.stringify(gameData.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company?.name) || []),
          JSON.stringify(gameData.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company?.name) || []),
          id
        );
      })();

      res.json({ message: 'Metadata refreshed' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Bulk Refresh Endpoints
  app.post('/api/admin/refresh-dates', async (req, res) => {
    try {
      const now = new Date().toISOString().split('T')[0];
      const targets = db.prepare(`
        SELECT g.igdb_id, g.name, g.image_id
        FROM games g
        JOIN status_category_map m ON g.game_status = m.status_id
        WHERE m.category_id = 'wishlist' OR g.release_date > ?
      `).all(now) as any[];

      if (targets.length === 0) {
        return res.json({ message: `Refreshed metadata for 0 games` });
      }

      const gamesData = await getGamesByIds(targets.map(t => t.igdb_id));
      const gamesDataMap = new Map(gamesData.map((g: any) => [g.id, g]));

      let count = 0;
      for (const t of targets) {
        const gameData = gamesDataMap.get(t.igdb_id);
        if (gameData) {
          // Refresh Cover if it changed
          if (gameData.cover?.image_id && gameData.cover.image_id !== t.image_id) {
            const coverPath = path.join(process.cwd(), 'data', 'covers', `${t.igdb_id}.jpg`);
            await downloadImageWithFallback(gameData.cover.url, coverPath);
          }

          const platforms = (gameData.platforms?.map((p: any) => {
            const name = p.name;
            return name;
          }) || [])
            .sort((a, b) => a === 'PC (Microsoft Windows)' ? -1 : b === 'PC (Microsoft Windows)' ? 1 : a.localeCompare(b));

          db.prepare(`
            UPDATE games 
            SET name = ?, platforms = ?, release_date = ?, release_status = ?, slug = ?, summary = ?, websites = ?, shops = ?, image_id = ?, genres = ?, themes = ?, developers = ?, publishers = ?, last_updated = CURRENT_TIMESTAMP
            WHERE igdb_id = ?
          `).run(
            gameData.name,
            JSON.stringify(platforms),
            formatDate(gameData.first_release_date),
            getReleaseStatus(gameData.status),
            gameData.slug,
            gameData.summary,
            JSON.stringify(gameData.websites || []),
            JSON.stringify(getShops(gameData.external_games || [], gameData.websites || [])),
            gameData.cover?.image_id || null,
            JSON.stringify(gameData.genres?.map((g: any) => g.name) || []),
            JSON.stringify(gameData.themes?.map((t: any) => t.name) || []),
            JSON.stringify(gameData.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company?.name) || []),
            JSON.stringify(gameData.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company?.name) || []),
            t.igdb_id
          );
          count++;
        }
      }
      res.json({ message: `Refreshed all metadata for ${count} wishlist and future games` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/refresh-covers', async (req, res) => {
    try {
      const games = db.prepare('SELECT igdb_id, image_id FROM games').all() as any[];
      if (games.length === 0) {
        return res.json({ message: `Refreshed 0 covers` });
      }

      const gamesData = await getGamesByIds(games.map(g => g.igdb_id));
      const gamesDataMap = new Map(gamesData.map((g: any) => [g.id, g]));

      let count = 0;
      for (const g of games) {
        const gameData = gamesDataMap.get(g.igdb_id);
        if (gameData && gameData.cover?.image_id) {
          if (gameData.cover.image_id !== g.image_id || !fs.existsSync(path.join(process.cwd(), 'data', 'covers', `${g.igdb_id}.jpg`))) {
            const coverPath = path.join(process.cwd(), 'data', 'covers', `${g.igdb_id}.jpg`);
            await downloadImageWithFallback(gameData.cover.url, coverPath);
            db.prepare('UPDATE games SET image_id = ?, last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(gameData.cover.image_id, g.igdb_id);
            count++;
          }
        }
      }
      res.json({ message: `Refreshed ${count} covers` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/refresh-all', async (req, res) => {
    try {
      const games = db.prepare('SELECT igdb_id, image_id FROM games').all() as any[];
      if (games.length === 0) {
        return res.json({ message: `Refreshed all metadata for 0 games` });
      }

      const gamesData = await getGamesByIds(games.map(g => g.igdb_id));
      const gamesDataMap = new Map(gamesData.map((g: any) => [g.id, g]));

      let count = 0;
      for (const g of games) {
        const gameData = gamesDataMap.get(g.igdb_id);
        if (gameData) {
          // Refresh Cover if it changed
          if (gameData.cover?.image_id && gameData.cover.image_id !== g.image_id) {
            const coverPath = path.join(process.cwd(), 'data', 'covers', `${g.igdb_id}.jpg`);
            await downloadImageWithFallback(gameData.cover.url, coverPath);
          }

          const platforms = (gameData.platforms?.map((p: any) => {
            const name = p.name;
            return name;
          }) || [])
            .sort((a, b) => a === 'PC (Microsoft Windows)' ? -1 : b === 'PC (Microsoft Windows)' ? 1 : a.localeCompare(b));

          db.prepare(`
            UPDATE games 
            SET name = ?, platforms = ?, release_date = ?, release_status = ?, slug = ?, summary = ?, websites = ?, shops = ?, image_id = ?, genres = ?, themes = ?, developers = ?, publishers = ?, last_updated = CURRENT_TIMESTAMP
            WHERE igdb_id = ?
          `).run(
            gameData.name,
            JSON.stringify(platforms),
            formatDate(gameData.first_release_date),
            getReleaseStatus(gameData.status),
            gameData.slug,
            gameData.summary,
            JSON.stringify(gameData.websites || []),
            JSON.stringify(getShops(gameData.external_games || [], gameData.websites || [])),
            gameData.cover?.image_id || null,
            JSON.stringify(gameData.genres?.map((g: any) => g.name) || []),
            JSON.stringify(gameData.themes?.map((t: any) => t.name) || []),
            JSON.stringify(gameData.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company?.name) || []),
            JSON.stringify(gameData.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company?.name) || []),
            g.igdb_id
          );
          count++;
        }
      }
      res.json({ message: `Refreshed all metadata for ${count} games` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/wipe-db', (req, res) => {
    try {
      wipeAndReinitDb();
      res.json({ message: 'Database wiped and re-initialized successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/check-consistency', (req, res) => {
    try {
      const issues: string[] = [];

      // Check 1: A game that is NOT in the played category MUST have NO playthroughs.
      const gamesWithPtNotPlayed = db.prepare(`
        SELECT g.igdb_id, g.name, g.game_status
        FROM games g
        JOIN playthroughs p ON g.igdb_id = p.igdb_id
        WHERE NOT EXISTS (
          SELECT 1 FROM status_category_map m
          WHERE m.status_id = g.game_status AND m.category_id = 'played'
        )
        GROUP BY g.igdb_id
      `).all() as any[];

      for (const game of gamesWithPtNotPlayed) {
        issues.push(`Game "${game.name}" (ID ${game.igdb_id}) has playthrough(s) but its status ("${game.game_status}") does not belong to the "played" category.`);
      }

      // Check 2: Every game in the played category (one that has a status that puts it there) MUST have at least one playthrough.
      const playedGamesWithNoPt = db.prepare(`
        SELECT g.igdb_id, g.name, g.game_status
        FROM games g
        WHERE EXISTS (
          SELECT 1 FROM status_category_map m
          WHERE m.status_id = g.game_status AND m.category_id = 'played'
        )
        AND NOT EXISTS (
          SELECT 1 FROM playthroughs p
          WHERE p.igdb_id = g.igdb_id
        )
      `).all() as any[];

      for (const game of playedGamesWithNoPt) {
        issues.push(`Game "${game.name}" (ID ${game.igdb_id}) is in the "played" category (Status: "${game.game_status}") but has no playthrough records.`);
      }

      // Check 3: Check is_positive consistency
      const statusesForConsistency = db.prepare(`
        SELECT s.id, s.label, s.is_positive,
               EXISTS(SELECT 1 FROM status_category_map m WHERE m.status_id = s.id AND m.category_id = 'played') as is_played
        FROM game_statuses s
      `).all() as any[];

      for (const s of statusesForConsistency) {
        if (s.is_played) {
          if (s.is_positive !== 0 && s.is_positive !== 1) {
            issues.push(`Status "${s.label}" belongs to the "played" category, but has no valid experience rating (must be positive or negative).`);
          }
        } else {
          if (s.is_positive !== null && s.is_positive !== undefined) {
            issues.push(`Status "${s.label}" does not belong to the "played" category, but has its experience flag set to "${s.is_positive === 1 ? 'positive' : 'negative'}" instead of NULL.`);
          }
        }
      }

      res.json({ success: true, issues });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/games/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM games WHERE igdb_id = ?').run(id);
      const coverPath = path.join(process.cwd(), 'data', 'covers', `${id}.jpg`);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
      res.json({ message: 'Game deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve covers
  app.use('/covers', express.static(path.join(process.cwd(), 'data', 'covers')));

  // Playthroughs
  app.get('/api/games/:id/playthroughs', (req, res) => {
    try {
      const playthroughs = db.prepare('SELECT uuid, igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment FROM playthroughs WHERE igdb_id = ?').all(req.params.id);
      res.json(playthroughs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/stats', (req, res) => {
    try {
      const totalGames = db.prepare('SELECT COUNT(*) as count FROM games').get() as any;
      const totalPlaythroughs = db.prepare('SELECT COUNT(*) as count FROM playthroughs').get() as any;
      
      const categoryCounts = db.prepare(`
        SELECT m.category_id as category, COUNT(g.igdb_id) as count 
        FROM status_category_map m
        LEFT JOIN games g ON m.status_id = g.game_status
        GROUP BY m.category_id
      `).all();

      const completionStats = db.prepare(`
        SELECT gs.label, gs.color, COUNT(p.uuid) as count
        FROM game_statuses gs
        JOIN status_category_map m ON gs.id = m.status_id
        LEFT JOIN games g ON g.game_status = gs.id
        LEFT JOIN playthroughs p ON p.igdb_id = g.igdb_id
        WHERE m.category_id = 'played'
        GROUP BY gs.id
        ORDER BY gs.sort_order ASC
      `).all();

      const platformStats = db.prepare(`
        SELECT platform as label, COUNT(*) as count
        FROM playthroughs
        GROUP BY platform
        ORDER BY count DESC
      `).all();

      const platformStatsPositive = db.prepare(`
        SELECT p.platform as label, COUNT(*) as count
        FROM playthroughs p
        JOIN games g ON p.igdb_id = g.igdb_id
        JOIN game_statuses gs ON g.game_status = gs.id
        WHERE gs.is_positive = 1
        GROUP BY p.platform
        ORDER BY count DESC
      `).all();

      const requestedYears = parseInt(req.query.years as string, 10);
      const numYears = !isNaN(requestedYears) && requestedYears > 0 ? requestedYears : 7;
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: numYears }, (_, i) => currentYear - i);
      
      const yearlyStats = years.map((year, index) => {
        const isOldest = index === years.length - 1;
        const operator = isOldest ? '<=' : '=';
        const yearLabel = isOldest ? `${year} and before` : year.toString();
        
        const statuses = db.prepare(`
          SELECT gs.label, gs.color, COUNT(p.uuid) as count
          FROM game_statuses gs
          JOIN status_category_map m ON gs.id = m.status_id
          LEFT JOIN games g ON g.game_status = gs.id
          LEFT JOIN playthroughs p ON p.igdb_id = g.igdb_id AND strftime('%Y', p.date) ${operator} ?
          WHERE m.category_id = 'played'
          GROUP BY gs.id
          ORDER BY gs.sort_order ASC
        `).all(year.toString());
        return { year: yearLabel, statuses };
      });

      // Aggregating Genres and Themes using SQLite's JSON functions
      // This is much more efficient than fetching all games and processing in JS
      let genreStats = [];
      let themeStats = [];
      let genreStatsPositive = [];
      let themeStatsPositive = [];
      
      try {
        genreStats = db.prepare(`
          SELECT j.value as label, COUNT(*) as count
          FROM games, json_each(games.genres) j
          WHERE games.genres IS NOT NULL AND games.genres != 'null'
          GROUP BY label
          ORDER BY count DESC
          LIMIT 10
        `).all();
      } catch (e) {
        console.warn('SQLite json_each not supported for genres, falling back to JS aggregation');
        // Fallback handled below if still empty
      }

      try {
        themeStats = db.prepare(`
          SELECT j.value as label, COUNT(*) as count
          FROM games, json_each(games.themes) j
          WHERE games.themes IS NOT NULL AND games.themes != 'null'
          GROUP BY label
          ORDER BY count DESC
          LIMIT 10
        `).all();
      } catch (e) {
        console.warn('SQLite json_each not supported for themes, falling back to JS aggregation');
      }

      try {
        genreStatsPositive = db.prepare(`
          SELECT j.value as label, COUNT(*) as count
          FROM games g, game_statuses gs, json_each(g.genres) j
          WHERE g.game_status = gs.id AND gs.is_positive = 1 AND g.genres IS NOT NULL AND g.genres != 'null'
          GROUP BY j.value
          ORDER BY count DESC
          LIMIT 10
        `).all();
      } catch (e) {
        console.warn('SQLite json_each not supported for positive genres, falling back to JS aggregation');
      }

      try {
        themeStatsPositive = db.prepare(`
          SELECT j.value as label, COUNT(*) as count
          FROM games g, game_statuses gs, json_each(g.themes) j
          WHERE g.game_status = gs.id AND gs.is_positive = 1 AND g.themes IS NOT NULL AND g.themes != 'null'
          GROUP BY j.value
          ORDER BY count DESC
          LIMIT 10
        `).all();
      } catch (e) {
        console.warn('SQLite json_each not supported for positive themes, falling back to JS aggregation');
      }

      // Fallback to JS aggregation if SQLite json_each failed or returned no results despite data existence
      if (genreStats.length === 0 || themeStats.length === 0 || genreStatsPositive.length === 0 || themeStatsPositive.length === 0) {
        const allGames = db.prepare(`
          SELECT g.genres, g.themes, gs.is_positive
          FROM games g
          LEFT JOIN game_statuses gs ON g.game_status = gs.id
        `).all() as any[];
        const genreMap = new Map<string, number>();
        const themeMap = new Map<string, number>();
        const genrePositiveMap = new Map<string, number>();
        const themePositiveMap = new Map<string, number>();

        allGames.forEach(game => {
          const isPositive = game.is_positive === 1;

          if (typeof game.genres === 'string' && game.genres !== 'null') {
            try {
              const genres = JSON.parse(game.genres);
              if (Array.isArray(genres)) {
                genres.forEach((g: any) => {
                  const name = typeof g === 'string' ? g : g.name;
                  if (name) {
                    genreMap.set(name, (genreMap.get(name) || 0) + 1);
                    if (isPositive) {
                      genrePositiveMap.set(name, (genrePositiveMap.get(name) || 0) + 1);
                    }
                  }
                });
              }
            } catch (e) {}
          }
          if (typeof game.themes === 'string' && game.themes !== 'null') {
            try {
              const themes = JSON.parse(game.themes);
              if (Array.isArray(themes)) {
                themes.forEach((t: any) => {
                  const name = typeof t === 'string' ? t : t.name;
                  if (name) {
                    themeMap.set(name, (themeMap.get(name) || 0) + 1);
                    if (isPositive) {
                      themePositiveMap.set(name, (themePositiveMap.get(name) || 0) + 1);
                    }
                  }
                });
              }
            } catch (e) {}
          }
        });

        if (genreStats.length === 0) {
          genreStats = Array.from(genreMap.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }
        if (themeStats.length === 0) {
          themeStats = Array.from(themeMap.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }
        if (genreStatsPositive.length === 0) {
          genreStatsPositive = Array.from(genrePositiveMap.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }
        if (themeStatsPositive.length === 0) {
          themeStatsPositive = Array.from(themePositiveMap.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }
      }

      res.json({
        totals: { 
          games: totalGames?.count || 0, 
          playthroughs: totalPlaythroughs?.count || 0 
        },
        categories: categoryCounts || [],
        completion: completionStats || [],
        platformStats: platformStats || [],
        platformStatsPositive: platformStatsPositive || [],
        yearlyStats: yearlyStats || [],
        genreStats: genreStats,
        themeStats: themeStats,
        genreStatsPositive: genreStatsPositive,
        themeStatsPositive: themeStatsPositive
      });
    } catch (error: any) {
      console.error('Stats error:', error);
      res.status(500).json({ 
        totals: { games: 0, playthroughs: 0 },
        categories: [],
        completion: [],
        platformStats: [],
        yearlyStats: [],
        genreStats: [],
        themeStats: [],
        error: error.message 
      });
    }
  });

  app.get('/api/statuses', (req, res) => {
    try {
      const gStatuses = db.prepare(`
        SELECT s.*, (SELECT json_group_array(category_id) FROM status_category_map WHERE status_id = s.id) as categories
        FROM game_statuses s
        ORDER BY s.sort_order ASC
      `).all();

      const pStatuses = db.prepare('SELECT * FROM playthrough_statuses ORDER BY sort_order ASC').all() as any[];
      
      const nullSortOrderSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('playthrough_status_null_sort_order') as any;
      const nullSortOrder = parseInt(nullSortOrderSetting?.value || '99');

      pStatuses.push({
        id: '__null__',
        label: 'Not Set',
        color: null,
        sort_order: nullSortOrder
      });

      pStatuses.sort((a, b) => a.sort_order - b.sort_order);

      res.json({
        game: gStatuses.map((s: any) => ({ ...s, categories: JSON.parse(s.categories) })),
        playthrough: pStatuses
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/statuses/game', (req, res) => {
    try {
      const { id, label, categories, color, sort_order, is_positive } = req.body;
      const transaction = db.transaction(() => {
        const isPlayedMap = Array.isArray(categories) && categories.includes('played');
        const finalIsPositive = isPlayedMap ? (is_positive !== undefined && is_positive !== null ? (is_positive ? 1 : 0) : 1) : null;

        db.prepare(`
          INSERT INTO game_statuses (id, label, color, sort_order, is_positive) 
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            color = excluded.color,
            sort_order = excluded.sort_order,
            is_positive = excluded.is_positive
        `).run(id, label, color, sort_order !== undefined ? sort_order : 99, finalIsPositive);
        
        if (categories) {
          db.prepare('DELETE FROM status_category_map WHERE status_id = ?').run(id);
          const insertMap = db.prepare('INSERT INTO status_category_map (status_id, category_id) VALUES (?, ?)');
          categories.forEach((cat: string) => insertMap.run(id, cat));
        }
        checkDatabaseConsistency();
      });
      transaction();
      res.json({ message: 'Game status updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/statuses/game/reorder', (req, res) => {
    try {
      const { orders } = req.body; // { id: order }
      const transaction = db.transaction(() => {
        const stmt = db.prepare('UPDATE game_statuses SET sort_order = ? WHERE id = ?');
        for (const [id, order] of Object.entries(orders)) {
          stmt.run(order, id);
        }
      });
      transaction();
      res.json({ message: 'Order updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/statuses/game/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { target_id } = req.query;
      
      const count = db.prepare('SELECT COUNT(*) as count FROM games WHERE game_status = ?').get(id) as any;
      if (count.count > 0 && !target_id) {
        return res.status(400).json({ 
          error: 'In use', 
          count: count.count, 
          message: `This status is currently tied to ${count.count} archives. Select a replacement status to proceed.` 
        });
      }
      
      const transaction = db.transaction(() => {
        if (count.count > 0 && target_id) {
          db.prepare('UPDATE games SET game_status = ? WHERE game_status = ?').run(target_id, id);
        }
        db.prepare('DELETE FROM game_statuses WHERE id = ?').run(id);
        checkDatabaseConsistency();
      });
      transaction();
      res.json({ message: 'Game status deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/statuses/playthrough', (req, res) => {
    try {
      const { id, label, color, sort_order } = req.body;
      if (id === '__null__') {
        return res.status(400).json({ error: 'Cannot modify "Not Set" manifestation directly.' });
      }
      db.prepare(`
        INSERT INTO playthrough_statuses (id, label, color, sort_order) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label,
          color = excluded.color,
          sort_order = excluded.sort_order
      `).run(id, label, color, sort_order !== undefined ? sort_order : 99);
      res.json({ message: 'Playthrough status updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/statuses/playthrough/reorder', (req, res) => {
    try {
      const { orders } = req.body;
      const transaction = db.transaction(() => {
        const stmt = db.prepare('UPDATE playthrough_statuses SET sort_order = ? WHERE id = ?');
        const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        for (const [id, order] of Object.entries(orders)) {
          if (id === '__null__') {
            updateSetting.run('playthrough_status_null_sort_order', order.toString());
          } else {
            stmt.run(order, id);
          }
        }
      });
      transaction();
      res.json({ message: 'Order updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/statuses/playthrough/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { target_id } = req.query;

      if (id === '__null__') {
        return res.status(400).json({ error: 'Cannot purge the "Not Set" manifestation.' });
      }

      const count = db.prepare('SELECT COUNT(*) as count FROM playthroughs WHERE playthrough_status = ?').get(id) as any;
      if (count.count > 0) {
        if (!target_id) {
          return res.status(400).json({ 
            error: 'In use', 
            count: count.count, 
            message: `This status is currently tied to ${count.count} ritual records. Select a replacement status to proceed.` 
          });
        }
        db.prepare('UPDATE playthroughs SET playthrough_status = ? WHERE playthrough_status = ?').run(target_id, id);
      }
      
      db.prepare('DELETE FROM playthrough_statuses WHERE id = ?').run(id);
      res.json({ message: 'Playthrough status deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/games/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, status_id, comment, owned_vaults, purge_rites } = req.body;
      const finalStatus = status || status_id;

      db.transaction(() => {
        if (purge_rites) {
          db.prepare('DELETE FROM playthroughs WHERE igdb_id = ?').run(id);
        }
        db.prepare('UPDATE games SET game_status = ?, comment = ?, owned_vaults = ?, last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(finalStatus, comment, owned_vaults, id);
        checkDatabaseConsistency();
      })();

      res.json({ message: 'Game updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

   app.post('/api/playthroughs', (req, res) => {
    try {
      const { igdb_id, game_id, date, platform, status_id, time_played_minutes, rating, version, comment, game_status, game_status_id } = req.body;
      const finalIgdbId = igdb_id || game_id;
      const finalGameStatus = game_status || game_status_id;
      
      const transaction = db.transaction(() => {
        // Constraint: Platform check
        const game = db.prepare('SELECT platforms FROM games WHERE igdb_id = ?').get(finalIgdbId) as any;
        if (!game) throw new Error('Game not found');
        
        const platforms = JSON.parse(game.platforms);
        if (!platforms.includes(platform)) {
          throw new Error(`Platform ${platform} not supported by this game.`);
        }

        // Update game status if provided, otherwise check if needs forced move to Played
        if (finalGameStatus) {
          db.prepare('UPDATE games SET game_status = ?, last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(finalGameStatus, finalIgdbId);
        } else {
          const currentStatus = db.prepare(`
            SELECT game_status FROM games WHERE igdb_id = ?
          `).get(finalIgdbId) as any;
          
          const cats = db.prepare('SELECT category_id FROM status_category_map WHERE status_id = ?').all(currentStatus.game_status) as any[];
          if (!cats.some(c => c.category_id === 'played')) {
             db.prepare('UPDATE games SET game_status = "Completed", last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(finalIgdbId);
          }
        }

        db.prepare(`
          INSERT INTO playthroughs (igdb_id, date, platform, playthrough_status, time_played_minutes, rating, version, comment)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          finalIgdbId, 
          date, 
          platform, 
          status_id || null, 
          time_played_minutes || null, 
          rating !== undefined ? rating : null, 
          version || null, 
          comment || null
        );
        checkDatabaseConsistency();
      });

      transaction();
      res.status(201).json({ message: 'Playthrough logged' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/playthroughs/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { target_status, target_status_id } = req.query;
      const finalTargetStatus = target_status || target_status_id;

      const p = db.prepare('SELECT igdb_id FROM playthroughs WHERE uuid = ?').get(id) as any;
      if (!p) return res.status(404).json({ error: 'Ritual record not found' });
      
      const transaction = db.transaction(() => {
        // If target_status is provided, update the game status first
        if (finalTargetStatus) {
          db.prepare('UPDATE games SET game_status = ?, last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(finalTargetStatus, p.igdb_id);
        }

        db.prepare('DELETE FROM playthroughs WHERE uuid = ?').run(id);

        checkDatabaseConsistency();
      });

      transaction();

      res.json({ 
        message: 'Playthrough deleted', 
        igdb_id: p.igdb_id 
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/playthroughs/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { date, platform, status_id, time_played_minutes, rating, version, comment, game_status, game_status_id } = req.body;
      const finalGameStatus = game_status || game_status_id;
      
      const p = db.prepare('SELECT igdb_id FROM playthroughs WHERE uuid = ?').get(id) as any;
      if (!p) return res.status(404).json({ error: 'Ritual record not found' });

      // Constraint check: Playthrough platform must be in game's supported platforms
      const game = db.prepare('SELECT platforms FROM games WHERE igdb_id = ?').get(p.igdb_id) as any;
      if (game) {
        const platforms = JSON.parse(game.platforms);
        if (Array.isArray(platforms) && platforms.length > 0 && !platforms.includes(platform)) {
          return res.status(400).json({ error: `Platform ${platform} not supported by this game.` });
        }
      }

      db.transaction(() => {
        const stmt = db.prepare(`
          UPDATE playthroughs 
          SET date = ?, platform = ?, playthrough_status = ?, time_played_minutes = ?, rating = ?, version = ?, comment = ?
          WHERE uuid = ?
        `);
        stmt.run(date, platform, status_id, time_played_minutes, rating, version, comment, id);

        if (finalGameStatus) {
          db.prepare('UPDATE games SET game_status = ?, last_updated = CURRENT_TIMESTAMP WHERE igdb_id = ?').run(finalGameStatus, p.igdb_id);
        }

        checkDatabaseConsistency();
      })();

      res.json({ message: 'Playthrough updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/export/games', (req, res) => {
    try {
      const games = db.prepare(`
        SELECT 
          g.igdb_id,
          g.game_status,
          g.comment,
          g.owned_vaults,
          g.last_updated
        FROM games g
      `).all();

      const csv = stringify(games, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=slaanesh_games.csv');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/export/playthroughs', (req, res) => {
    try {
      const playthroughs = db.prepare(`
        SELECT 
          p.uuid,
          p.igdb_id,
          p.date,
          p.platform,
          p.playthrough_status,
          p.time_played_minutes,
          p.rating,
          p.version,
          p.comment
        FROM playthroughs p
      `).all();

      const csv = stringify(playthroughs, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=slaanesh_playthroughs.csv');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const formatted = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(formatted);
  });

  app.post('/api/settings', (req, res) => {
    const changes = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateMany = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, value);
      }
    });
    updateMany(changes);
    res.json({ message: 'Settings updated' });
  });

  // Vite
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  }).on('error', (err: any) => {
    console.error('SERVER LISTEN ERROR:', err);
  });
}

startServer().catch(err => {
  console.error('FATAL SERVER START ERROR:', err);
  process.exit(1);
});
