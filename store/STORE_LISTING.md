# Chrome Web Store listing — AggieRatings

Copy/paste fields for the Web Store developer dashboard.

## Basics
- **Name:** AggieRatings
- **Category:** Education
- **Language:** English (United States)
- **Privacy policy URL:** https://ivankuria.github.io/aggie-ratings/privacy.html
- **Homepage URL (optional):** https://ivankuria.github.io/aggie-ratings/

## Summary (132 chars max)
Rate My Professors ratings, right inside UC Davis's Class Search Tool.

## Detailed description
AggieRatings adds professor ratings directly to UC Davis's Class Search Tool, so
you can size up a class without leaving the page or juggling tabs.

• Inline ratings — every section shows the professor's Rate My Professors score,
  review count, and would-take-again percentage right under the class.
• Side panel profile — click "Details" for the full breakdown: quality,
  difficulty, would-take-again, top tags, and recent student reviews.
• Professor photos — best-effort headshots from UC Davis departmental faculty
  pages, with a clean initials avatar fallback.
• Works on the public Class Search Tool — no login required.
• Privacy-first — all data is cached locally. No analytics, no tracking, no
  accounts.

AggieRatings is an independent, student-built project and is not affiliated with,
endorsed by, or sponsored by the University of California, Davis or Rate My
Professors.

## Single purpose (required)
AggieRatings has one purpose: to display professor ratings alongside class
listings on UC Davis's Class Search Tool.

## Permission justifications (required)
- **storage** — cache fetched ratings and photo URLs locally so repeat visits
  are fast; nothing is sent anywhere.
- **sidePanel** — show the full professor profile (ratings, tags, reviews) in
  Chrome's side panel when the user clicks "Details".
- **Host: registrar-apps.ucdavis.edu** — the extension's content script runs here
  to read the instructor/course names already shown on the Class Search Tool
  results and inject the rating bar.
- **Host: www.ratemyprofessors.com** — fetch professor ratings and reviews.
- **Host: *.ucdavis.edu** — fetch public departmental faculty pages to find a
  professor's published headshot. (Broad because UC Davis faculty photos are
  spread across many department subdomains.)

## Data usage disclosures (dashboard certifications)
- Does the extension collect user data? **No.**
- Personally identifiable info: **No.** Health: No. Financial: No.
  Authentication: No. Personal communications: No. Location: No. Web history:
  No. User activity: No. Website content: the extension reads instructor/course
  names from the Class Search Tool page locally to render ratings, but does not
  transmit or store any user-identifying content.
- I certify: data is **not sold** to third parties; **not used** for purposes
  unrelated to the single purpose; **not used** for creditworthiness/lending.

## Required image assets
- Store icon: 128×128 — `public/icons/app/icon-128.png`
- Screenshot 1 (1280×800) — `store/screenshot-1-1280x800.png` (inline ratings on
  the live Class Search Tool).
- Screenshot 2 (1280×800) — `store/screenshot-2-1280x800.png` (side-panel profile
  with headshot, ratings, and reviews).
- Small promo tile: 440×280 — `store/promo-small-440x280.png`

## Upload artifact
- `.output/aggie-ratings-1.0.0-chrome.zip` (run `npm run zip` to regenerate)
