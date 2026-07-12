import axios from 'axios';

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set');
  }

  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
  
  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Cache but expire 1 min early
  return accessToken;
}

export async function queryIGDB(endpoint: string, query: string, retries = 3): Promise<any> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID;

  try {
    const response = await axios.post(`https://api.igdb.com/v4/${endpoint}`, query, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    return response.data;
  } catch (err: any) {
    if (err.response && err.response.status === 429 && retries > 0) {
      console.warn('IGDB rate limit hit. Waiting 1 second before retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return queryIGDB(endpoint, query, retries - 1);
    }
    throw err;
  }
}

export async function searchGames(name: string) {
  return queryIGDB('games', `
    search "${name}";
    fields name, first_release_date, status, platforms.name, genres.name, themes.name, cover.url, cover.image_id, slug, summary, websites.url, websites.type, websites.category, external_games.external_game_source.name, external_games.url, external_games.uid, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
    limit 20;
  `);
}

export async function getGameById(id: number) {
  return queryIGDB('games', `
    fields name, first_release_date, status, platforms.name, genres.name, themes.name, cover.url, cover.image_id, slug, summary, websites.url, websites.type, websites.category, external_games.external_game_source.name, external_games.url, external_games.uid, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
    where id = ${id};
  `);
}

export async function getGamesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const results: any[] = [];
  const batchSize = 100; // IGDB recommends small reasonable limits, but 100 works for IN queries.
  
  for (let i = 0; i < ids.length; i += batchSize) {
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 250)); // Short pause between batches
    }
    const batch = ids.slice(i, i + batchSize);
    const filter = `id = (${batch.join(',')})`;
    const batchResults = await queryIGDB('games', `
      fields name, first_release_date, status, platforms.name, genres.name, themes.name, cover.url, cover.image_id, slug, summary, websites.url, websites.type, websites.category, external_games.external_game_source.name, external_games.url, external_games.uid, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where ${filter};
      limit 500;
    `);
    results.push(...batchResults);
  }
  return results;
}

export async function matchExternalGames(externalIds: { uid: string, category: number }[]) {
  if (externalIds.length === 0) return [];
  
  const results: any[] = [];
  const batchSize = 50;
  
  const categoryToSourceName: Record<number, string> = {
    1: 'Steam',
    5: 'GOG',
    13: 'Epic Games Store',
    26: 'Epic Games Store'
  };
  
  for (let i = 0; i < externalIds.length; i += batchSize) {
    const batch = externalIds.slice(i, i + batchSize);
    const filter = batch.map(ext => {
      const sourceName = categoryToSourceName[ext.category] || '';
      return `(uid = "${ext.uid}" & external_game_source.name = "${sourceName}")`;
    }).join(' | ');
    
    const batchResults = await queryIGDB('external_games', `
      fields game.id, game.name, uid, external_game_source.name;
      where ${filter};
      limit 500;
    `);
    results.push(...batchResults);
  }
  
  return results;
}
