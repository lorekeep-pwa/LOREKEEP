import { GAME_GENRES, GAME_PLATFORMS } from '../types/models';
import { compressCoverImage } from '../utils/format';

export type CoverSource = 'auto' | 'igdb' | 'steamgriddb';

export interface AlternateCoverOption {
  id: string;
  thumbUrl: string;
  coverUrl: string;
  style: string;
}

export interface CoverSearchResult {
  id: string;
  externalId: string;
  source: 'igdb' | 'steamgriddb';
  title: string;
  releaseYear: string;
  editionLabel: string;
  platforms: string[];
  platformFamilies: string[];
  genre: string;
  developer: string;
  thumbUrl: string;
  coverUrl: string;
  alternateCovers?: AlternateCoverOption[];
}

export interface CoverSearchResponse {
  query: string;
  activeSource: 'igdb' | 'steamgriddb';
  fallbackUsed: boolean;
  notice: string | null;
  results: CoverSearchResult[];
}

export interface CoverSourcesStatus {
  online: boolean;
  igdb: {
    configured: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    reason: string | null;
  };
  steamgriddb: {
    configured: boolean;
    reason: string | null;
  };
}

const COVER_API_BASE = (import.meta.env.VITE_COVER_API_BASE || '')
  .trim()
  .replace(/\/+$/, '');

function buildCoverApiUrl(path: string): string {
  return COVER_API_BASE ? `${COVER_API_BASE}${path}` : path;
}

export function getProxiedCoverUrl(remoteUrl: string): string {
  return buildCoverApiUrl(`/api/covers/image?url=${encodeURIComponent(remoteUrl)}`);
}

export async function fetchCoverSourcesStatus(): Promise<CoverSourcesStatus> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      online: false,
      igdb: { configured: false, hasClientId: false, hasClientSecret: false, reason: 'Offline' },
      steamgriddb: { configured: false, reason: 'Offline' },
    };
  }

  try {
    const res = await fetch(buildCoverApiUrl('/api/covers/status'));
    if (!res.ok) throw new Error('Proxy unavailable');
    const data = await res.json();
    return {
      online: true,
      igdb: data.igdb,
      steamgriddb: data.steamgriddb,
    };
  } catch {
    return {
      online: false,
      igdb: { configured: false, hasClientId: false, hasClientSecret: false, reason: 'Cover proxy unavailable' },
      steamgriddb: { configured: false, reason: 'Cover proxy unavailable' },
    };
  }
}

export async function searchOfficialCovers(
  query: string,
  source: CoverSource = 'auto',
  signal?: AbortSignal,
): Promise<CoverSearchResponse> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. You can still upload a cover image from your PC.');
  }

  const url = buildCoverApiUrl(
    `/api/covers/search?q=${encodeURIComponent(query.trim())}&source=${encodeURIComponent(source)}`,
  );
  const res = await fetch(url, { signal });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Cover search is temporarily unavailable. You can upload an image from your PC.',
    );
  }

  return payload as CoverSearchResponse;
}

/**
 * Downloads the chosen remote cover through the allowlisted local proxy and
 * converts it to a compact local 3:4 data URL saved inside IndexedDB for offline access.
 */
export async function downloadCoverForOfflineStorage(remoteUrl: string): Promise<string> {
  const res = await fetch(getProxiedCoverUrl(remoteUrl));
  if (!res.ok) {
    throw new Error('Could not download the selected cover image.');
  }
  const blob = await res.blob();
  const file = new File([blob], 'official-cover.jpg', {
    type: blob.type || 'image/jpeg',
  });
  return compressCoverImage(file);
}

export function mapExternalPlatform(platforms: string[]): string | null {
  if (!platforms.length) return null;
  const joined = platforms.join(' ').toLowerCase();
  const hits: string[] = [];
  if (joined.includes('pc') || joined.includes('windows')) hits.push('PC');
  if (joined.includes('playstation 5') || joined.includes('ps5')) hits.push('PlayStation 5');
  else if (joined.includes('playstation')) hits.push('Other Console');
  if (joined.includes('xbox series')) hits.push('Xbox Series X|S');
  else if (joined.includes('xbox')) hits.push('Other Console');
  if (joined.includes('switch')) hits.push('Nintendo Switch');
  else if (joined.includes('nintendo')) hits.push('Other Console');

  if (hits.length > 1) return 'Multiplatform';
  if (hits.length === 1 && (GAME_PLATFORMS as readonly string[]).includes(hits[0])) {
    return hits[0];
  }
  return null;
}

export function mapExternalGenre(genre: string): string | null {
  const g = genre.toLowerCase();
  if (!g) return null;
  if (g.includes('role-playing') || g.includes('rpg')) return 'RPG';
  if (g.includes('shooter') || g.includes('fps')) return 'FPS / Shooter';
  if (g.includes('horror')) return 'Survival Horror';
  if (g.includes('strategy') || g.includes('tactical')) return 'Strategy';
  if (g.includes('indie')) return 'Indie / Narrative';
  if (g.includes('adventure') || g.includes('action')) return 'Action-Adventure';
  if ((GAME_GENRES as readonly string[]).includes(genre)) return genre;
  return null;
}
