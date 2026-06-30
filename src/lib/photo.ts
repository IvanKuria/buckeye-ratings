/**
 * @file photo.ts
 * Best-effort resolution of an Ohio State professor headshot.
 *
 * OSU runs a university-wide photo service, opic.osu.edu, keyed by a person's
 * username (the local part of their @osu.edu email — captured from the public
 * class API and passed through as instructorEmail). A single URL works for
 * everyone, across every college:
 *
 *     https://opic.osu.edu/<username>?width=<n>
 *
 * For a person with no photo it returns a fixed silhouette as a PNG, whereas
 * real headshots are served as JPEG. So we keep the URL only when the response
 * is a JPEG, and otherwise fall back to initials — never a generic silhouette.
 * Both hits and misses are cached.
 *
 * Runs in the side panel (a browser context), so fetch with the extension's
 * *.osu.edu host permission is available.
 */

/** chrome.storage.local prefix; `cache_` is swept by the clearCache route. */
const PHOTO_CACHE_PREFIX = 'cache_photo_';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FETCH_TIMEOUT_MS = 8000;
const PHOTO_WIDTH = 400;

interface PhotoCacheEntry {
  timestamp: number;
  /** Resolved photo URL, or '' for a cached miss. */
  url: string;
}

function photoUrl(username: string): string {
  return `https://opic.osu.edu/${encodeURIComponent(username)}?width=${PHOTO_WIDTH}`;
}

/**
 * Returns the opic URL when the person actually has a photo (a JPEG response),
 * or null when opic serves its PNG silhouette placeholder / errors.
 */
async function probePhoto(username: string): Promise<string | null> {
  const url = photoUrl(username);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    // Real headshots are served as JPEG; the no-photo default is a PNG
    // silhouette. Keep the URL unless it's that PNG placeholder.
    const type = (res.headers.get('content-type') || '').toLowerCase();
    return type.includes('png') ? null : url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readCache(key: string): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(undefined);
        return;
      }
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) return resolve(undefined);
        const entry = items?.[key] as PhotoCacheEntry | undefined;
        if (entry && Date.now() - entry.timestamp < TTL_MS) {
          resolve(entry.url);
        } else {
          resolve(undefined);
        }
      });
    } catch {
      resolve(undefined);
    }
  });
}

function writeCache(key: string, url: string): void {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    const entry: PhotoCacheEntry = { timestamp: Date.now(), url };
    chrome.storage.local.set({ [key]: entry });
  } catch {
    /* ignore */
  }
}

/**
 * Resolves a headshot URL for a professor from their OSU email (username), or
 * null if they have no photo. Caches both hits and misses.
 */
export async function resolveProfessorPhoto(
  email: string | null
): Promise<string | null> {
  const username = (email || '').split('@')[0].trim().toLowerCase();
  if (!username) return null;

  const key = `${PHOTO_CACHE_PREFIX}${username}`;
  const cached = await readCache(key);
  if (cached !== undefined) return cached || null;

  const url = await probePhoto(username);
  writeCache(key, url || '');
  return url;
}
