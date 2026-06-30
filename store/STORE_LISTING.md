# Chrome Web Store listing — BuckeyeRatings

Copy/paste fields for the Web Store developer dashboard.

## Basics
- **Name:** BuckeyeRatings
- **Category:** Education
- **Language:** English (United States)
- **Privacy policy URL:** https://ivankuria.github.io/buckeye-ratings/privacy.html
- **Homepage URL (optional):** https://ivankuria.github.io/buckeye-ratings/

## Summary (132 chars max)
Rate My Professors ratings, right inside Ohio State's Class Search.

## Detailed description
BuckeyeRatings adds professor ratings directly to Ohio State's Class Search, so
you can size up a class without leaving the page or juggling tabs.

• Inline ratings — every section shows the professor's Rate My Professors score,
  review count, and would-take-again percentage right under the class.
• Side panel profile — click "Details" for the full breakdown: quality,
  difficulty, would-take-again, top tags, and recent student reviews.
• Clean avatars — every professor gets a tidy initials avatar.
• Works on the public Class Search — no login required.
• Privacy-first — all data is cached locally. No analytics, no tracking, no
  accounts.

BuckeyeRatings is an independent, student-built project and is not affiliated with,
endorsed by, or sponsored by The Ohio State University or Rate My
Professors.

## Single purpose (required)
BuckeyeRatings has one purpose: to display professor ratings alongside class
listings on Ohio State's Class Search.

## Permission justifications (required)
- **storage** — cache fetched ratings locally so repeat visits
  are fast; nothing is sent anywhere.
- **sidePanel** — show the full professor profile (ratings, tags, reviews) in
  Chrome's side panel when the user clicks "Details".
- **Host: classes.osu.edu** — the extension's content script runs here
  to read the instructor and course names already shown on the Class Search
  results and inject the rating bar.
- **Host: www.ratemyprofessors.com** — fetch professor ratings and reviews.

## Data usage disclosures (dashboard certifications)
- Does the extension collect user data? **No.**
- Personally identifiable info: **No.** Health: No. Financial: No.
  Authentication: No. Personal communications: No. Location: No. Web history:
  No. User activity: No. Website content: the extension reads instructor/course
  names from the Class Search page locally to render ratings, but does not
  transmit or store any user-identifying content.
- I certify: data is **not sold** to third parties; **not used** for purposes
  unrelated to the single purpose; **not used** for creditworthiness/lending.

## Required image assets
- Store icon: 128×128 — `public/icons/app/icon-128.png`
- Screenshot 1 (1280×800) — `store/screenshot-1-1280x800.png` (inline ratings on
  the live Class Search).
- Screenshot 2 (side panel) — TODO: capture once the extension is loaded in
  Chrome (the side panel is `chrome://` UI and can't be rendered headlessly).
  Load unpacked, click a section's Details, screenshot at 1280×800.
- Small promo tile: 440×280 — `store/promo-small-440x280.png`

## Upload artifact
- `.output/buckeye-ratings-1.0.0-chrome.zip` (run `npm run zip` to regenerate)
