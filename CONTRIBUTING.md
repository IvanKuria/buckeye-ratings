# Contributing to AggieRatings

Thanks for your interest in improving AggieRatings. This guide covers everything you need to get set up, understand the codebase, and ship a change.

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- Google Chrome (or any Chromium browser)

No login or account is required for testing — the UC Davis [Class Search Tool](https://registrar-apps.ucdavis.edu/courses/search/index.cfm) is publicly accessible.

### Build and Run

Clone the repo and install dependencies:

```bash
git clone https://github.com/IvanKuria/aggie-ratings.git
cd aggie-ratings
npm install
```

Start the dev server with hot reload:

```bash
npm run dev
```

This builds the extension and watches for changes. After the initial build:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `.output/chrome-mv3-dev` folder.
4. The extension reloads automatically when you edit a file.

To produce a production build:

```bash
npm run build      # output in .output/chrome-mv3/
npm run zip        # packaged zip for distribution
```

## Project Structure

```
src/
├── entrypoints/
│   ├── background.ts          # Service worker: API routing and caching
│   ├── content.ts             # Content script: results parsing and rendering
│   ├── sidepanel/             # Side panel UI (React)
│   └── options/               # Settings page (React)
├── components/
│   ├── RatingBar.tsx          # Inline rating bar injected into the host page
│   ├── StarRating.tsx         # Star rating visualization
│   ├── professor/             # Side panel professor components
│   ├── settings/              # Settings page components
│   └── ui/                    # Shared UI primitives (shadcn/ui)
├── lib/
│   ├── background/            # Background service worker modules (RMP, cache)
│   ├── content/              # Content script logic (shared helpers)
│   ├── hooks/                 # React hooks (settings, theme)
│   └── storage/               # Chrome storage wrappers
├── types/                     # Shared TypeScript types
└── assets/                    # CSS files
```

### Key Files

| File | Responsibility |
|------|----------------|
| `src/entrypoints/background.ts` | Service worker entry. Routes messages and orchestrates API calls. |
| `src/entrypoints/content.ts` | Content script entry. Watches the results container and mounts the UI. |
| `src/lib/background/rmpCache.ts` | Rate My Professors GraphQL search, name matching, and caching. |
| `src/lib/content/shared/mountHelper.tsx` | Mounts React UI into the host page. |
| `wxt.config.ts` | Extension manifest, permissions, and build configuration. |

## Architecture

### High-Level Overview

```
Content Script                     Background SW               Side Panel
--------------                     ------------                ----------
Observe #courseResultsDiv     -->  Fetch RMP (GraphQL)    -->  Professor profile
Parse instructor + course     -->  Match best professor   -->  Top tags
Render rating bar per section -->  Cache in storage            Reviews carousel
```

### Data Flow

1. The **content script** uses a `MutationObserver` to watch the results container (`#courseResultsDiv`) on the UC Davis Class Search Tool. The tool is a ColdFusion app that drops a results table into that container after each search and re-sort.
2. It parses each result row from the results table to read the instructor name and course code, then renders loading skeletons.
3. Names are sent to the **background service worker**, which fetches data from the Rate My Professors GraphQL API (ratings and reviews).
4. Results are cached in `chrome.storage.local` for one week.
5. The inline **rating bar** updates with the resolved professor rating.
6. Clicking "Details" opens the **side panel** with the full professor profile.

## Coding Guidelines

### Style

- Functional React components with hooks.
- ES modules (`import` and `export`).
- TypeScript throughout. Prefer precise types over `any`.
- Prefer small, focused functions over large multipurpose ones.

### Content Script CSS

The content script runs inside UC Davis pages, so styles must not leak into or collide with the host page.

| Avoid | Prefer |
|-------|--------|
| Global or unprefixed class names | Class names prefixed with `rms-` |
| Tailwind inside the injected rating bar | Plain CSS in `src/assets/rating-bar.css` |
| Relying on host page styles | Self-contained, scoped styles |

The side panel and options page run in their own extension context, so they use Tailwind via `src/assets/tailwind.css` freely.

### Where Styles Live

- Inline rating bar: `src/assets/rating-bar.css` (plain CSS, injected into the host page)
- Side panel and options: Tailwind CSS via `src/assets/tailwind.css`
- Shared styles: `src/assets/styles.css`

## Making Changes

### Modifying the RMP Search

All Rate My Professors logic lives in `src/lib/background/rmpCache.ts`:

- `generateSearchVariants()` produces name variants from the parsed instructor name.
- `searchWithFallback()` runs the cascading search strategy.
- `selectBestRmpMatch()` does Fuse.js matching with UC Davis school validation.

## Pull Request Guidelines

Before opening a pull request, confirm that:

1. The change is focused. Keep unrelated edits in separate PRs.
2. `npm run build` passes.
3. You tested against the real UC Davis Class Search Tool.
4. Content script CSS stays prefixed with `rms-`.
5. The PR description explains what changed and why.

To submit:

1. Fork the repo and create a feature branch from `main`.
2. Make and test your changes.
3. Open a pull request with a clear description.

## AI-Assisted Contributions

AI-assisted contributions are welcome. If you used an AI tool to help write a change, a few practices keep the result reviewable:

- Read and understand every line before you submit it. You are responsible for the code, not the tool.
- Test the behavior in the browser, not just the build. Generated code can compile and still be wrong.
- Keep the change scoped to the task. AI tools tend to refactor adjacent code; revert anything unrelated to your PR.
- Note in the PR description that AI assistance was used, so reviewers know what to look for.

## Reporting Bugs

Use the [bug report template](https://github.com/IvanKuria/aggie-ratings/issues/new?template=bug_report.md). Include:

- What page you were on
- What you expected to happen
- What actually happened
- Screenshots, if relevant

## Questions

Open a [discussion or issue](https://github.com/IvanKuria/aggie-ratings/issues), or reach out to [@IvanKuria](https://github.com/IvanKuria).
