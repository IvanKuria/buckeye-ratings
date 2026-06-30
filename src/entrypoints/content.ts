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
    instructorEmail: null,
    course,
  };
  renderComponent(mount, RatingBar, { professorData, loading: false });
}

/** Scans all unprocessed sections and processes them. Idempotent. */
function scan(): void {
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
      timer = setTimeout(scan, 200);
    };

    const start = () => {
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      scan();
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
  },
});
