/**
 * @file content.ts
 * WXT content script entrypoint (isolated world).
 *
 * Injects professor rating bars into Ohio State's public Class Search
 * (classes.osu.edu) — an AngularJS SPA backed by the public
 * content.osu.edu/v2/classes/search API. Results render one
 * `div.section-container` per section (ng-repeat), each containing:
 *   - h4.subtitle > span.sr-only "CSE 2221:"  (course code)
 *                 > span.lightweight "Section 0005 (5168)"  (section + class #)
 *   - div.meeting … p.instructor-heading "Instructors" + ul.list-unstyled > li
 *     where each <li> is a full instructor name, e.g. "Paul Sivilotti"
 *
 * Instructor names are full "First Last", so RMP matching is straightforward.
 * The SPA re-renders on search / infinite-scroll, so we watch with a
 * MutationObserver and re-scan; a bar is mounted once per section.
 */

import '@/assets/rating-bar.css';
import {
  createMountPoint,
  renderComponent,
  unmountComponent,
  isPlaceholderName,
} from '@/lib/content/shared/mountHelper';
import RatingBar from '@/components/RatingBar';
import type {
  ProfessorData,
  ProfessorBundle,
  FetchProfessorDataResponse,
} from '@/types';

const SECTION_SELECTOR = '.section-container';
const PROCESSED_ATTR = 'data-br-processed';
const MOUNT_CLASS = 'rms-bar-mount';

/**
 * Asks the background worker for RMP data by name. We pass the 'jdoe' sentinel
 * as the UID so the background skips any campus-directory lookup and keys the
 * RMP cache by name (OSU has no campus-directory source wired here).
 */
function fetchProfessorData(name: string): Promise<FetchProfessorDataResponse> {
  // Bail if the extension was reloaded while this page stayed open (stale
  // context). The caller treats a rejection as "no data" and removes the bar.
  if (!chrome.runtime?.id) {
    return Promise.reject(new Error('Extension context invalidated'));
  }
  return chrome.runtime.sendMessage({
    action: 'fetchProfessorData',
    ID: 'jdoe',
    name,
  });
}

// --- Instructor email capture (for headshots) ---
//
// The DOM gives the instructor's name but not their OSU username. The public
// class API (content.osu.edu) returns the same instructors WITH an email whose
// local part is the username (e.g. "blanas.2@osu.edu" -> blanas.2). We fetch the
// API for the current search, map name -> email, and stamp it onto each section's
// ProfessorData so the side panel can resolve a departmental headshot. The join
// uses the API's own displayName, which matches the DOM exactly.

const OSU_API = 'https://content.osu.edu/v2/classes/search';
const MAX_API_PAGES = 8;

/** name (lowercased) -> instructor email. */
const emailByName = new Map<string, string>();
/** Injected payloads, so a late-arriving email map can patch them in place. */
const injectedByName = new Map<string, ProfessorData[]>();
let currentSearchKey = '';
let refreshInFlight: Promise<void> | null = null;

/** Canonical name key shared by the DOM and the API join. */
function normName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Reads q / campus / term from the SPA's hash query string. */
function readSearchParams(): { q: string; campus: string; term: string } | null {
  const hash = location.hash || '';
  const qi = hash.indexOf('?');
  if (qi === -1) return null;
  // Trim a trailing in-page anchor (e.g. "...&p=1#top-nav").
  const query = hash.slice(qi + 1).split('#')[0];
  const p = new URLSearchParams(query);
  const q = p.get('q') || '';
  const term = p.get('term') || '';
  if (!q || !term) return null;
  return { q, campus: p.get('campus') || 'col', term };
}

/**
 * Fetches the class API for the current search (paginated) and rebuilds the
 * name->email map, then patches any already-injected payloads. Safe to call on
 * every scan: it no-ops when the search hasn't changed, and de-dupes concurrent
 * calls. Driven from scan() (not the unreliable hashchange event) so the map is
 * always current with whatever the SPA has rendered.
 */
function refreshEmails(): Promise<void> {
  const params = readSearchParams();
  if (!params) return Promise.resolve();
  const key = `${params.q}|${params.campus}|${params.term}`;
  if (key === currentSearchKey) return refreshInFlight ?? Promise.resolve();

  currentSearchKey = key;
  emailByName.clear();

  refreshInFlight = (async () => {
    try {
      for (let page = 1; page <= MAX_API_PAGES; page++) {
        const url = `${OSU_API}?q=${encodeURIComponent(params.q)}&client=class-search-ui&campus=${params.campus}&term=${params.term}&p=${page}`;
        const res = await fetch(url);
        if (!res.ok) break;
        const json = (await res.json()) as OsuSearchResponse;
        const courses = json?.data?.courses ?? [];
        for (const c of courses) {
          for (const s of c.sections ?? []) {
            for (const m of s.meetings ?? []) {
              for (const i of m.instructors ?? []) {
                if (i.displayName && i.email) {
                  emailByName.set(normName(i.displayName), i.email);
                }
              }
            }
          }
        }
        const total = json?.data?.totalPages ?? 1;
        if (page >= total) break;
      }
    } catch {
      /* network hiccup — photos just fall back to initials this pass */
    }

    // Patch payloads injected before the map was ready.
    for (const [name, list] of injectedByName) {
      const email = emailByName.get(name);
      if (email) for (const pd of list) pd.instructorEmail = email;
    }
  })();

  return refreshInFlight;
}

/** Minimal shape of the content.osu.edu class-search response we read. */
interface OsuSearchResponse {
  data?: {
    totalPages?: number;
    courses?: Array<{
      sections?: Array<{
        meetings?: Array<{
          instructors?: Array<{ displayName?: string; email?: string }>;
        }>;
      }>;
    }>;
  };
}

interface ParsedSection {
  course: string;
  instructorName: string;
  classNumber: string | null;
  /** The instructor list's container, where we mount the bar. */
  mountParent: HTMLElement;
}

/**
 * Reads the primary instructor (full name), course code, and class number from
 * a `.section-container`. Returns null when the section has no named instructor
 * yet (a future term shows TBA), so we skip it.
 */
function parseSection(sec: HTMLElement): ParsedSection | null {
  // Instructor list sits under a "p.instructor-heading" label; take the first
  // named instructor across the section's meetings.
  let instructorName = '';
  let mountParent: HTMLElement | null = null;
  for (const heading of sec.querySelectorAll<HTMLElement>(
    '.instructor-heading'
  )) {
    const list = heading.parentElement?.querySelector('ul');
    const li = list?.querySelector('li');
    const name = (li?.textContent || '').replace(/\s+/g, ' ').trim();
    if (name && !isPlaceholderName(name)) {
      instructorName = name;
      mountParent = (list as HTMLElement) || heading.parentElement;
      break;
    }
  }
  if (!instructorName || !mountParent) return null;

  // Course code from the screen-reader span ("CSE 2221:" -> "CSE 2221").
  const course = (
    sec.querySelector('h4.subtitle .sr-only')?.textContent || ''
  )
    .replace(/:\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Stable class number from "Section 0005 (5168)".
  const classNumber =
    (sec.querySelector('h4.subtitle .lightweight')?.textContent || '').match(
      /\((\d+)\)/
    )?.[1] ?? null;

  return { course, instructorName, classNumber, mountParent };
}

/**
 * Processes a single section: injects a loading bar under its instructor, then
 * fills it with RMP data (or removes it if there's no match).
 */
async function processSection(sec: HTMLElement): Promise<void> {
  // Mark processed up front so concurrent scans don't double-inject.
  sec.setAttribute(PROCESSED_ATTR, '1');

  const parsed = parseSection(sec);
  if (!parsed) return;
  const { course, instructorName, classNumber, mountParent } = parsed;

  const key = classNumber || `${course}|${instructorName}`;

  // Guard against a stale mount left by a previous pass.
  if (
    mountParent.querySelector(`.${MOUNT_CLASS}[data-br-for="${CSS.escape(key)}"]`)
  ) {
    return;
  }

  const host = document.createElement('div');
  host.className = MOUNT_CLASS;
  host.setAttribute('data-br-for', key);
  const mount = createMountPoint(host, 'rms-rating-bar-root');
  mountParent.appendChild(host);
  renderComponent(mount, RatingBar, { professorData: null, loading: true });

  let bundle: ProfessorBundle | null = null;
  try {
    const resp = await fetchProfessorData(instructorName);
    bundle = resp && !('error' in resp) ? resp : null;
  } catch {
    bundle = null;
  }

  // No RMP match -> remove the bar entirely (no empty UI).
  if (!bundle || !bundle.rateMyProfessor) {
    unmountComponent(mount);
    host.remove();
    return;
  }

  const professorData: ProfessorData = {
    apiData: null,
    rateMyProfessor: bundle.rateMyProfessor,
    reviews: bundle.reviews || [],
    localResearchTopic: null,
    localClassesTaught: null,
    instructorName,
    // Username for the headshot lookup, from the class API (or patched in later
    // by refreshEmails if the map wasn't ready yet).
    instructorEmail: emailByName.get(normName(instructorName)) ?? null,
    course,
  };
  const nameKey = normName(instructorName);
  const list = injectedByName.get(nameKey);
  if (list) list.push(professorData);
  else injectedByName.set(nameKey, [professorData]);

  renderComponent(mount, RatingBar, { professorData, loading: false });
}

/**
 * Refreshes the email map for the current search (no-ops when unchanged), then
 * processes all unprocessed sections. Driving the refresh from here — rather
 * than a hashchange event the SPA may not fire — guarantees the username map is
 * current with whatever has rendered before we build each bar. Idempotent.
 */
async function scan(): Promise<void> {
  await refreshEmails();
  document
    .querySelectorAll<HTMLElement>(SECTION_SELECTOR)
    .forEach((sec) => {
      if (sec.getAttribute(PROCESSED_ATTR)) return;
      void processSection(sec);
    });
}

export default defineContentScript({
  matches: ['https://classes.osu.edu/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',

  main() {
    // The Angular SPA renders sections on search and appends more on
    // infinite-scroll, so we re-scan on DOM mutations. scan() ignores already
    // processed sections and never touches our own injected mounts, so this
    // does not loop. Debounced because a render bursts many mutations.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void scan(), 200);
    };

    const start = () => {
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      void scan();
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
  },
});
