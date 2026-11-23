import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads key=value pairs from .env.local / .env strictly on the Node.js server side.
 * Never exposed to Vite's client bundle.
 */
export function loadServerEnv(rootDir) {
  const env = { ...process.env };
  const candidates = ['.env', '.env.local'];

  for (const filename of candidates) {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) env[key] = value;
    }
  }
  return env;
}

// In-memory Twitch OAuth2 token cache for IGDB
let igdbTokenCache = {
  accessToken: null,
  expiresAt: 0,
};

// Lightweight per-source rate limiter (IGDB max 4 req/s; SteamGridDB conservative 5 req/s)
const rateWindows = {
  igdb: [],
  steamgriddb: [],
};

function checkRateLimit(source, maxPerSecond = 4) {
  const now = Date.now();
  const list = rateWindows[source].filter((ts) => now - ts < 1000);
  rateWindows[source] = list;
  if (list.length >= maxPerSecond) {
    return false;
  }
  list.push(now);
  return true;
}

function normalizeGameTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleMatchScore(query, title) {
  const q = normalizeGameTitle(query);
  const t = normalizeGameTitle(title);
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.startsWith(q) || q.startsWith(t)) return 0.92;
  const qTokens = new Set(q.split(' '));
  const tTokens = new Set(t.split(' '));
  const overlap = [...qTokens].filter((token) => tTokens.has(token)).length;
  const tokenScore = overlap / Math.max(qTokens.size, tTokens.size);
  const compactQ = q.replace(/ /g, '');
  const compactT = t.replace(/ /g, '');
  const containment = compactQ.includes(compactT) || compactT.includes(compactQ) ? 0.85 : 0;
  return Math.max(tokenScore, containment);
}

async function getIgdbAccessToken(clientId, clientSecret, forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    igdbTokenCache.accessToken &&
    igdbTokenCache.expiresAt - now > 60_000
  ) {
    return igdbTokenCache.accessToken;
  }

  const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('grant_type', 'client_credentials');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twitch OAuth failed (${res.status}): ${detail.slice(0, 160)}`);
  }

  const data = await res.json();
  if (!data?.access_token) {
    throw new Error('Twitch OAuth response missing access_token');
  }

  igdbTokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return igdbTokenCache.accessToken;
}

const IGDB_CATEGORY_LABELS = {
  0: 'Main Game',
  1: 'DLC / Add-on',
  2: 'Expansion',
  3: 'Bundle',
  4: 'Standalone Expansion',
  8: 'Remake',
  9: 'Remaster',
  10: 'Expanded Game',
  11: 'Port',
};

function mapIgdbPlatform(names) {
  const joined = names.join(' ').toLowerCase();
  const matches = [];
  if (joined.includes('pc') || joined.includes('windows') || joined.includes('mac') || joined.includes('linux')) {
    matches.push('PC');
  }
  if (joined.includes('playstation')) matches.push('PlayStation');
  if (joined.includes('xbox')) matches.push('Xbox');
  if (joined.includes('nintendo') || joined.includes('switch') || joined.includes('wii') || joined.includes('gamecube')) {
    matches.push('Nintendo');
  }
  return matches;
}

async function searchIgdb(query, env) {
  const clientId = (env.IGDB_CLIENT_ID || '').trim();
  const clientSecret = (env.IGDB_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return {
      source: 'igdb',
      available: false,
      reason: !clientId
        ? 'IGDB_CLIENT_ID is not configured on the local proxy.'
        : 'IGDB_CLIENT_SECRET is missing in .env.local (required by Twitch OAuth2 for IGDB).',
      results: [],
    };
  }

  if (!checkRateLimit('igdb', 4)) {
    return {
      source: 'igdb',
      available: true,
      rateLimited: true,
      reason: 'IGDB rate limit reached (4 req/s). Try again in a moment.',
      results: [],
    };
  }

  const sanitized = query.replace(/["\\;]/g, ' ').trim();
  const body = [
    `search "${sanitized}";`,
    'fields name,first_release_date,category,platforms.name,genres.name,involved_companies.developer,involved_companies.company.name,cover.image_id;',
    'where cover != null;',
    'limit 16;',
  ].join('\n');

  const execute = async (forceRefresh) => {
    const token = await getIgdbAccessToken(clientId, clientSecret, forceRefresh);
    return fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body,
      signal: AbortSignal.timeout(9000),
    });
  };

  let res = await execute(false);
  if (res.status === 401) {
    res = await execute(true);
  }
  if (res.status === 429) {
    return {
      source: 'igdb',
      available: true,
      rateLimited: true,
      reason: 'IGDB temporarily rate-limited the request.',
      results: [],
    };
  }
  if (!res.ok) {
    throw new Error(`IGDB request failed (${res.status})`);
  }

  const games = await res.json();
  const results = (Array.isArray(games) ? games : [])
    .filter((g) => g?.cover?.image_id)
    .map((g) => ({ game: g, score: titleMatchScore(query, g.name) }))
    .filter(({ score }) => score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .map(({ game: g }) => {
      const platformNames = Array.isArray(g.platforms)
        ? g.platforms.map((p) => p?.name).filter(Boolean)
        : [];
      const genreNames = Array.isArray(g.genres)
        ? g.genres.map((gn) => gn?.name).filter(Boolean)
        : [];
      const devEntry = Array.isArray(g.involved_companies)
        ? g.involved_companies.find((ic) => ic?.developer && ic?.company?.name) ||
          g.involved_companies.find((ic) => ic?.company?.name)
        : null;
      const releaseYear = g.first_release_date
        ? String(new Date(g.first_release_date * 1000).getUTCFullYear())
        : '';

      const imageId = g.cover.image_id;
      return {
        id: `igdb-${g.id}`,
        externalId: String(g.id),
        source: 'igdb',
        title: g.name,
        releaseYear,
        editionLabel: IGDB_CATEGORY_LABELS[g.category] || '',
        platforms: platformNames.slice(0, 5),
        platformFamilies: mapIgdbPlatform(platformNames),
        genre: genreNames[0] || '',
        developer: devEntry?.company?.name || '',
        thumbUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`,
        coverUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`,
      };
    });

  return {
    source: 'igdb',
    available: true,
    results,
  };
}

async function searchSteamGridDb(query, env) {
  const apiKey = (env.STEAMGRIDDB_API_KEY || '').trim();
  if (!apiKey) {
    return {
      source: 'steamgriddb',
      available: false,
      reason: 'STEAMGRIDDB_API_KEY is not configured on the local proxy.',
      results: [],
    };
  }

  if (!checkRateLimit('steamgriddb', 5)) {
    return {
      source: 'steamgriddb',
      available: true,
      rateLimited: true,
      reason: 'SteamGridDB rate limit reached. Try again in a moment.',
      results: [],
    };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  const searchRes = await fetch(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`,
    { headers, signal: AbortSignal.timeout(8000) },
  );

  if (searchRes.status === 429) {
    return {
      source: 'steamgriddb',
      available: true,
      rateLimited: true,
      reason: 'SteamGridDB temporarily rate-limited the request.',
      results: [],
    };
  }
  if (!searchRes.ok) {
    throw new Error(`SteamGridDB search failed (${searchRes.status})`);
  }

  const searchPayload = await searchRes.json();
  const candidates = Array.isArray(searchPayload?.data)
    ? searchPayload.data
        .map((game) => ({ game, score: titleMatchScore(query, game.name) }))
        .filter(({ score }) => score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    : [];

  if (candidates.length === 0) {
    return { source: 'steamgriddb', available: true, results: [] };
  }

  // Fetch portrait 600x900 grids for top matching games in parallel (bounded to 8)
  const settled = await Promise.allSettled(
    candidates.map(async ({ game }) => {
      const gridRes = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${game.id}?dimensions=600x900&types=static&limit=4`,
        { headers, signal: AbortSignal.timeout(8000) },
      );
      if (!gridRes.ok) return null;
      const gridData = await gridRes.json();
      const grids = Array.isArray(gridData?.data) ? gridData.data : [];
      if (grids.length === 0) return null;

      const releaseYear = game.release_date
        ? String(new Date(game.release_date * 1000).getUTCFullYear())
        : '';

      const platforms = Array.isArray(game.types)
        ? game.types.map((t) => String(t).toUpperCase())
        : [];

      return {
        id: `sgdb-${game.id}`,
        externalId: String(game.id),
        source: 'steamgriddb',
        title: game.name,
        releaseYear,
        editionLabel: grids.length > 1 ? `${grids.length} artworks` : '',
        platforms,
        platformFamilies: [],
        genre: '',
        developer: '',
        thumbUrl: grids[0].thumb || grids[0].url,
        coverUrl: grids[0].url,
        alternateCovers: grids.map((gr) => ({
          id: String(gr.id),
          thumbUrl: gr.thumb || gr.url,
          coverUrl: gr.url,
          style: gr.style || 'alternate',
        })),
      };
    }),
  );

  const results = settled
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);

  return {
    source: 'steamgriddb',
    available: true,
    results,
  };
}

const ALLOWED_IMAGE_HOSTS = new Set([
  'images.igdb.com',
  'cdn2.steamgriddb.com',
  'cdn.steamgriddb.com',
]);

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function createCoverApiMiddleware(rootDir) {
  return async function coverApiHandler(req, res, next) {
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api/covers')) {
      if (typeof next === 'function') return next();
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const parsed = new URL(rawUrl, 'http://localhost');
    const pathname = parsed.pathname;
    const env = loadServerEnv(rootDir);

    try {
      // 1. Source availability status (never exposes secrets)
      if (pathname === '/api/covers/status') {
        const igdbHasId = Boolean((env.IGDB_CLIENT_ID || '').trim());
        const igdbHasSecret = Boolean((env.IGDB_CLIENT_SECRET || '').trim());
        const sgdbHasKey = Boolean((env.STEAMGRIDDB_API_KEY || '').trim());

        return sendJson(res, 200, {
          igdb: {
            configured: igdbHasId && igdbHasSecret,
            hasClientId: igdbHasId,
            hasClientSecret: igdbHasSecret,
            reason:
              igdbHasId && !igdbHasSecret
                ? 'Add IGDB_CLIENT_SECRET in .env.local to enable IGDB.'
                : !igdbHasId
                  ? 'IGDB credentials not configured.'
                  : null,
          },
          steamgriddb: {
            configured: sgdbHasKey,
            reason: sgdbHasKey ? null : 'STEAMGRIDDB_API_KEY not configured.',
          },
        });
      }

      // 2. Multi-source game & cover search
      if (pathname === '/api/covers/search') {
        const query = (parsed.searchParams.get('q') || '').trim();
        const preferred = (parsed.searchParams.get('source') || 'auto').toLowerCase();

        if (query.length < 2) {
          return sendJson(res, 400, {
            error: 'Please enter at least 2 characters to search.',
          });
        }

        if (preferred === 'igdb') {
          const igdb = await searchIgdb(query, env);
          return sendJson(res, 200, {
            query,
            activeSource: 'igdb',
            fallbackUsed: false,
            notice: igdb.reason || null,
            results: igdb.results,
          });
        }

        if (preferred === 'steamgriddb') {
          const sgdb = await searchSteamGridDb(query, env);
          return sendJson(res, 200, {
            query,
            activeSource: 'steamgriddb',
            fallbackUsed: false,
            notice: sgdb.reason || null,
            results: sgdb.results,
          });
        }

        // Auto mode: IGDB primary, automatic graceful fallback to SteamGridDB
        let igdbNotice = null;
        try {
          const igdb = await searchIgdb(query, env);
          if (igdb.available && !igdb.rateLimited && igdb.results.length > 0) {
            return sendJson(res, 200, {
              query,
              activeSource: 'igdb',
              fallbackUsed: false,
              notice: null,
              results: igdb.results,
            });
          }
          igdbNotice = igdb.reason || null;
        } catch (err) {
          igdbNotice = err instanceof Error ? err.message : 'IGDB temporarily unavailable.';
        }

        // Fallback to SteamGridDB
        const sgdb = await searchSteamGridDb(query, env);
        return sendJson(res, 200, {
          query,
          activeSource: 'steamgriddb',
          fallbackUsed: true,
          notice: igdbNotice || sgdb.reason || null,
          results: sgdb.results,
        });
      }

      // 3. Allowlisted image download proxy (for local offline saving in IndexedDB)
      if (pathname === '/api/covers/image') {
        const target = parsed.searchParams.get('url') || '';
        let targetUrl;
        try {
          targetUrl = new URL(target);
        } catch {
          return sendJson(res, 400, { error: 'Invalid image URL.' });
        }

        if (
          targetUrl.protocol !== 'https:' ||
          !ALLOWED_IMAGE_HOSTS.has(targetUrl.hostname)
        ) {
          return sendJson(res, 403, { error: 'Image host is not allowlisted.' });
        }

        const upstream = await fetch(targetUrl, {
          signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) {
          return sendJson(res, 502, { error: `Upstream image error (${upstream.status}).` });
        }

        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        const arrayBuf = await upstream.arrayBuffer();
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(Buffer.from(arrayBuf));
        return;
      }

      return sendJson(res, 404, { error: 'Unknown cover API endpoint.' });
    } catch (err) {
      return sendJson(res, 502, {
        error: err instanceof Error ? err.message : 'Cover proxy request failed.',
      });
    }
  };
}
