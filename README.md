<div align="center">

<img src="assets/buckeyeratings-icon.png" alt="BuckeyeRatings icon" width="120" height="120" />

# BuckeyeRatings

Rate My Professors ratings, shown right where you browse Ohio State courses in the Class Search.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-success.svg)](https://github.com/IvanKuria/buckeye-ratings/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Built with WXT](https://img.shields.io/badge/built%20with-WXT-67217A.svg)](https://wxt.dev)

</div>

## Overview

BuckeyeRatings is a Chrome extension for Ohio State students. It pulls Rate My Professors ratings directly into Ohio State's Class Search, so you can size up a class without leaving the page or juggling browser tabs.

It works on Ohio State's public Class Search at [classes.osu.edu](https://classes.osu.edu) — no login required — so you can browse and compare instructors before you ever sign in to register.

## Screenshots

Ratings appear directly under each class section in the Class Search results — the
professor's Rate My Professors score, review count, and would-take-again
percentage — and clicking **Details** opens the full profile in the side panel:
quality, difficulty, would-take-again, top tags, and student reviews.

![Inline BuckeyeRatings ratings in the Ohio State class search results](assets/screenshot-results.png)

## Features

- **Inline ratings.** Every section in the Class Search results gets a rating bar showing the professor's Rate My Professors score, review count, and would-take-again percentage.
- **Professor profiles.** Click "Details" to open a side panel with the full Rate My Professors profile: quality, difficulty, would-take-again, top tags, and recent reviews.
- **Clean avatars.** Each professor gets a tidy initials avatar — no clutter, no broken images.
- **Smart matching.** Instructor names on the page are full "First Last", so matching against the right RMP professor at The Ohio State University is accurate.
- **Fast.** Lazy-loaded modules and one-week caching keep repeat visits instant.
- **Privacy first.** All cached data is stored locally. No analytics, no tracking, no data collection.

## How It Works

Open Ohio State's [Class Search](https://classes.osu.edu), pick a term, and run a search. BuckeyeRatings detects each class section and renders an inline rating bar beneath the instructor:

```
★ 4.4 (33)    85% would take again    Details ->
```

Click **Details** to open the side panel with the full professor profile, including Rate My Professors quality, difficulty, would-take-again, top tags, and recent reviews.

> The Class Search is publicly accessible at
> `classes.osu.edu` without signing in, so BuckeyeRatings works for prospective students and during open browsing — not just inside registration.

## Install

> Not yet on the Chrome Web Store. Manual install for now:

1. Clone or download this repo.
2. Run `npm install && npm run build`.
3. Open `chrome://extensions/` and enable **Developer mode**.
4. Click **Load unpacked** and select the `.output/chrome-mv3` folder.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [WXT](https://wxt.dev) (Vite-based extension framework) |
| UI | React 18, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com) |
| Animation | [Framer Motion](https://motion.dev) |
| Search | [Fuse.js](https://fusejs.io) (fuzzy name matching) |
| APIs | Rate My Professors GraphQL |
| Extension | Chrome Manifest V3, Side Panel API |

## Development

```bash
git clone https://github.com/IvanKuria/buckeye-ratings.git
cd buckeye-ratings
npm install
npm run dev
```

Then load `.output/chrome-mv3-dev` as an unpacked extension in Chrome.

## Architecture

Ohio State's Class Search is an AngularJS single-page app that renders search results into the page after you run a search. Rather than intercept any network traffic, BuckeyeRatings watches the page for results and reads the rendered section markup.

```
Content script                         Background SW              Side Panel
--------------                         ------------              ----------
Observe results SPA                ->  Fetch RMP (GraphQL)   ->  Professor profile
Read instructor + course + class #     Match best professor      Top tags
Mount rating bar per section           Cache in storage          Reviews carousel
Open side panel on "Details"
```

- **Content script** uses a `MutationObserver` to watch the Angular results. For each `div.section-container`, it reads the instructor's full name (from the `<ul>` under the "Instructors" heading), the course code, and the class number, then mounts the inline rating bar under the instructor. It re-scans on search and infinite-scroll.
- **Background service worker** handles Rate My Professors GraphQL calls, name matching, and caching.
- **Side panel** displays the full professor profile — quality, difficulty, would-take-again, top tags, and reviews — when "Details" is clicked.

## Privacy

- All cached data is stored locally in `chrome.storage.local`.
- No analytics or telemetry.
- The only network request goes to `ratemyprofessors.com` (ratings and reviews) — only a professor's name is ever sent, never anything about you. Instructor names are read locally from the Class Search page; no OSU server is contacted.
- Permissions are scoped to `classes.osu.edu` and `www.ratemyprofessors.com`.

## Credits

Adapted from [Rate My Slugs](https://github.com/IvanKuria/rate-my-slugs) (UC Santa Cruz).

## License

MIT. See [LICENSE](LICENSE) for details.
