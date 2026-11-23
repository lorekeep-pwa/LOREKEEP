/**
 * LOREKEEP Cover API — Cloudflare Worker (Free Tier, zero external dependencies)
 *
 * Secrets (configured via `wrangler secret put`, NEVER exposed to the PWA):
 * - IGDB_CLIENT_ID
 * - IGDB_CLIENT_SECRET
 * - STEAMGRIDDB_API_KEY (optional fallback & alternative artworks)
 *
 * Public env vars (optional, in wrangler.toml):
 * - ALLOWED_ORIGIN (e.g. "https://lorekeep.pages.dev" or "*" during setup)
 */

interface WorkerEnv {
  IGDB_CLIENT_ID?: string;
  IGDB_CLIENT_SECRET?: string;
  STEAMGRIDDB_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
}

// Per-isolate Twitch OAuth2 token cache (auto-refreshes before expiry or on 401)
let igdbTokenCache: { accessToken: string | null; expiresAt: number } = {
  accessToken: null,
  expiresAt: 0,
};

// Lightweight per-isolate sliding-window rate limiter
const rateWindows: Record<'igdb' | 'steamgriddb', number[]> = {
  igdb: [],
  steamgriddb: [],
};

function checkRateLimit(source: 'igdb' | 'steamgriddb', maxPerSecond: number): boolean {
  const now = Date.now();
  const recent = rateWindows[source].filter((ts) => now - ts < 1000);
  rateWindows[source] = recent;
  if (recent.length >= maxPerSecond) return false;
  recent.push(now);
  return true;
}

function normalizeGameTitle(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleMatchScore(query: string, title: string): number {
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

const IGDB_CATEGORY_LABELS: Record<number, string> = {
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

const ALLOWED_IMAGE_HOSTS = new Set([
  'images.igdb.com',
  'cdn2.steamgriddb.com',
  'cdn.steamgriddb.com',
]);

function mapPlatformFamilies(names: string[]): string[] {
  const joined = names.join(' ').toLowerCase();
  const families: string[] = [];
  if (joined.includes('pc') || joined.includes('windows') || joined.includes('mac') || joined.includes('linux')) {
    families.push('PC');
  }
  if (joined.includes('playstation')) families.push('PlayStation');
  if (joined.includes('xbox')) families.push('Xbox');
  if (joined.includes('nintendo') || joined.includes('switch') || joined.includes('wii') || joined.includes('gamecube')) {
    families.push('Nintendo');
  }
  return families;
}

function corsHeaders(request: Request, env: WorkerEnv): Record<string, string> {
  const configured = (env.ALLOWED_ORIGIN || '*').trim();
  const reqOrigin = request.headers.get('Origin') || '';

  let allowOrigin = '*';
  if (configured !== '*') {
    const allowedList = configured
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    allowOrigin = allowedList.includes(reqOrigin) ? reqOrigin : allowedList[0] || '*';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...(allowOrigin !== '*' ? { Vary: 'Origin' } : {}),
  };
}

function jsonResponse(
  request: Request,
  env: WorkerEnv,
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

async function getIgdbAccessToken(
  clientId: string,
  clientSecret: string,
  forceRefresh = false,
): Promise<string> {
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

  const res = await fetch(tokenUrl.toString(), {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Twitch OAuth failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data?.access_token) {
    throw new Error('Twitch OAuth response missing access_token');
  }

  const accessToken = data.access_token;
  igdbTokenCache = {
    accessToken,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return accessToken;
}

interface IgdbRawGame {
  id: number;
  name: string;
  first_release_date?: number;
  category?: number;
  platforms?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
  involved_companies?: Array<{ developer?: boolean; company?: { name?: string } }>;
  cover?: { image_id?: string };
}

async function searchIgdb(query: string, env: WorkerEnv) {
  const clientId = (env.IGDB_CLIENT_ID || '').trim();
  const clientSecret = (env.IGDB_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return {
      source: 'igdb' as const,
      available: false,
      rateLimited: false,
      reason: !clientId
        ? 'IGDB_CLIENT_ID secret is not set in Cloudflare Workers.'
        : 'IGDB_CLIENT_SECRET secret is not set in Cloudflare Workers.',
      results: [],
    };
  }

  if (!checkRateLimit('igdb', 4)) {
    return {
      source: 'igdb' as const,
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

  const execute = async (forceRefresh: boolean) => {
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
      source: 'igdb' as const,
      available: true,
      rateLimited: true,
      reason: 'IGDB temporarily rate-limited the request.',
      results: [],
    };
  }
  if (!res.ok) {
    throw new Error(`IGDB request failed (${res.status})`);
  }

  const games = (await res.json()) as IgdbRawGame[];
  const results = (Array.isArray(games) ? games : [])
    .filter((g) => Boolean(g?.cover?.image_id))
    .map((game) => ({ game, score: titleMatchScore(query, game.name) }))
    .filter(({ score }) => score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .map(({ game: g }) => {
      const platformNames = Array.isArray(g.platforms)
        ? g.platforms.map((p) => p?.name).filter((n): n is string => Boolean(n))
        : [];
      const genreNames = Array.isArray(g.genres)
        ? g.genres.map((gn) => gn?.name).filter((n): n is string => Boolean(n))
        : [];
      const devEntry = Array.isArray(g.involved_companies)
        ? g.involved_companies.find((ic) => ic?.developer && ic?.company?.name) ||
          g.involved_companies.find((ic) => ic?.company?.name)
        : undefined;
      const releaseYear = g.first_release_date
        ? String(new Date(g.first_release_date * 1000).getUTCFullYear())
        : '';
      const imageId = g.cover!.image_id!;

      return {
        id: `igdb-${g.id}`,
        externalId: String(g.id),
        source: 'igdb' as const,
        title: g.name,
        releaseYear,
        editionLabel: typeof g.category === 'number' ? IGDB_CATEGORY_LABELS[g.category] || '' : '',
        platforms: platformNames.slice(0, 5),
        platformFamilies: mapPlatformFamilies(platformNames),
        genre: genreNames[0] || '',
        developer: devEntry?.company?.name || '',
        thumbUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`,
        coverUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`,
      };
    });

  return {
    source: 'igdb' as const,
    available: true,
    rateLimited: false,
    reason: null,
    results,
  };
}

interface SgdbGame {
  id: number;
  name: string;
  release_date?: number;
  types?: string[];
}

interface SgdbGrid {
  id: number;
  url: string;
  thumb?: string;
  style?: string;
}

async function searchSteamGridDb(query: string, env: WorkerEnv) {
  const apiKey = (env.STEAMGRIDDB_API_KEY || '').trim();
  if (!apiKey) {
    return {
      source: 'steamgriddb' as const,
      available: false,
      rateLimited: false,
      reason: 'STEAMGRIDDB_API_KEY secret is not configured in Cloudflare Workers.',
      results: [],
    };
  }

  if (!checkRateLimit('steamgriddb', 5)) {
    return {
      source: 'steamgriddb' as const,
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
      source: 'steamgriddb' as const,
      available: true,
      rateLimited: true,
      reason: 'SteamGridDB temporarily rate-limited the request.',
      results: [],
    };
  }
  if (!searchRes.ok) {
    throw new Error(`SteamGridDB search failed (${searchRes.status})`);
  }

  const searchPayload = (await searchRes.json()) as { data?: SgdbGame[] };
  const candidates = Array.isArray(searchPayload?.data)
    ? searchPayload.data
        .map((game) => ({ game, score: titleMatchScore(query, game.name) }))
        .filter(({ score }) => score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    : [];

  if (candidates.length === 0) {
    return {
      source: 'steamgriddb' as const,
      available: true,
      rateLimited: false,
      reason: null,
      results: [],
    };
  }

  const settled = await Promise.allSettled(
    candidates.map(async ({ game }) => {
      const gridRes = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${game.id}?dimensions=600x900&types=static&limit=4`,
        { headers, signal: AbortSignal.timeout(8000) },
      );
      if (!gridRes.ok) return null;
      const gridData = (await gridRes.json()) as { data?: SgdbGrid[] };
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
        source: 'steamgriddb' as const,
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

  const results = [];
  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value !== null) {
      results.push(item.value);
    }
  }

  return {
    source: 'steamgriddb' as const,
    available: true,
    rateLimited: false,
    reason: null,
    results,
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method !== 'GET') {
      return jsonResponse(request, env, 405, { error: 'Method not allowed.' });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // 1. Source availability status (never exposes secrets)
      if (pathname === '/api/covers/status') {
        const hasId = Boolean((env.IGDB_CLIENT_ID || '').trim());
        const hasSecret = Boolean((env.IGDB_CLIENT_SECRET || '').trim());
        const hasSgdb = Boolean((env.STEAMGRIDDB_API_KEY || '').trim());

        return jsonResponse(request, env, 200, {
          igdb: {
            configured: hasId && hasSecret,
            hasClientId: hasId,
            hasClientSecret: hasSecret,
            reason:
              hasId && !hasSecret
                ? 'IGDB_CLIENT_SECRET secret is missing on the Cloudflare Worker.'
                : !hasId
                  ? 'IGDB secrets are not configured on the Cloudflare Worker.'
                  : null,
          },
          steamgriddb: {
            configured: hasSgdb,
            reason: hasSgdb ? null : 'STEAMGRIDDB_API_KEY secret is not configured.',
          },
        });
      }

      // 2. Multi-source cover search (IGDB primary -> SteamGridDB fallback)
      if (pathname === '/api/covers/search') {
        const query = (url.searchParams.get('q') || '').trim();
        const preferred = (url.searchParams.get('source') || 'auto').toLowerCase();

        if (query.length < 2) {
          return jsonResponse(request, env, 400, {
            error: 'Please enter at least 2 characters to search.',
          });
        }

        if (preferred === 'igdb') {
          const igdb = await searchIgdb(query, env);
          return jsonResponse(request, env, 200, {
            query,
            activeSource: 'igdb',
            fallbackUsed: false,
            notice: igdb.reason,
            results: igdb.results,
          });
        }

        if (preferred === 'steamgriddb') {
          const sgdb = await searchSteamGridDb(query, env);
          return jsonResponse(request, env, 200, {
            query,
            activeSource: 'steamgriddb',
            fallbackUsed: false,
            notice: sgdb.reason,
            results: sgdb.results,
          });
        }

        let igdbNotice: string | null = null;
        try {
          const igdb = await searchIgdb(query, env);
          if (igdb.available && !igdb.rateLimited && igdb.results.length > 0) {
            return jsonResponse(request, env, 200, {
              query,
              activeSource: 'igdb',
              fallbackUsed: false,
              notice: null,
              results: igdb.results,
            });
          }
          igdbNotice = igdb.reason;
        } catch (err) {
          igdbNotice = err instanceof Error ? err.message : 'IGDB temporarily unavailable.';
        }

        const sgdb = await searchSteamGridDb(query, env);
        return jsonResponse(request, env, 200, {
          query,
          activeSource: 'steamgriddb',
          fallbackUsed: true,
          notice: igdbNotice || sgdb.reason,
          results: sgdb.results,
        });
      }

      // 3. Allowlisted image download proxy for local offline IndexedDB saving
      if (pathname === '/api/covers/image') {
        const target = url.searchParams.get('url') || '';
        let targetUrl: URL;
        try {
          targetUrl = new URL(target);
        } catch {
          return jsonResponse(request, env, 400, { error: 'Invalid image URL.' });
        }

        if (
          targetUrl.protocol !== 'https:' ||
          !ALLOWED_IMAGE_HOSTS.has(targetUrl.hostname)
        ) {
          return jsonResponse(request, env, 403, { error: 'Image host is not allowlisted.' });
        }

        const upstream = await fetch(targetUrl.toString(), {
          signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) {
          return jsonResponse(request, env, 502, {
            error: `Upstream image error (${upstream.status}).`,
          });
        }

        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            ...corsHeaders(request, env),
          },
        });
      }

      return jsonResponse(request, env, 404, { error: 'Unknown endpoint.' });
    } catch (err) {
      return jsonResponse(request, env, 502, {
        error: err instanceof Error ? err.message : 'Cover API error.',
      });
    }
  },
};
