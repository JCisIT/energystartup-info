# energystartup.info

A static site that tracks the startups building the next energy system. No build step: plain HTML, CSS and JavaScript, with all content in four JSON files.

## Run it locally

From the `Websites` folder:

```
node serve.js energystartup-info 8082
```

Then open http://localhost:8082. (Opening `index.html` directly will not work, because the pages load their data with `fetch`.)

## Updating the site

Everything you would normally change lives in `data/`. Edit a file, save, refresh.

### Add a news item: `data/signals.json`

```json
{
  "date": "2026-11-18",
  "sector": "geothermal",
  "company": "fervo-energy",
  "title": "One sentence saying what happened",
  "summary": "One or two sentences on why it matters.",
  "source": "Where it was reported",
  "url": "https://link-to-the-original-story"
}
```

- `date` is `YYYY-MM-DD`, or `YYYY-MM` if you only know the month. The newest items show first automatically.
- `company` is optional. If set, it must match a startup's `id` and the item will link to that startup.
- Always include a real `url`. If we can't link to a source, it doesn't go on the site.

### Add a startup: `data/startups.json`

```json
{
  "id": "example-energy",
  "name": "Example Energy",
  "sector": "fusion",
  "hq": "City, State, Country",
  "lat": 40.0,
  "lon": -105.0,
  "thesis": "One or two sentences on what they are building and why it is different.",
  "url": "https://example.com"
}
```

- `lat` and `lon` put the startup on the globe. Search "City latitude longitude" to find them. West and south are negative.
- The first eight entries in the file are the "Key players" shown on the dashboard, so order matters at the top.
- `sector` must be one of: `fusion`, `nuclear`, `geothermal`, `storage`, `grid`, `hydrogen`, `industry`, `solar`. To add a sector, add it to `SECTORS` at the top of `js/common.js`.

### Move a company along the race: `data/race.json`

The race page (`race.html`) has two tracks, fusion and advanced nuclear, each with five stages. For each company, `reached` is how many stages it has completed, in order. When a company hits its next stage:

1. Add 1 to its `reached`.
2. Add a milestone to its `milestones` list:

```json
{ "stage": 3, "date": "2026-11-09", "text": "What happened, in one sentence.", "source": "NRC", "url": "https://link-to-the-proof" }
```

3. Update `target` and `targetYear` if its next goal has changed, and set `asOf` at the top of the file to today's date.

Only move a company forward when a primary source or a major outlet says it actually happened. Plans and targets don't count. The scoreboard numbers on the race page and the dashboard are calculated from this file automatically.

### Update the headline numbers: `data/stats.json`

The six big figures and the electricity mix bar. Each has a `source` and `url`. These reports come out yearly:

- Ember, Global Electricity Review (spring)
- IEA, World Energy Investment (late spring)
- Energy Institute, Statistical Review of World Energy (summer)

### Change the globe's fuel routes: `data/routes.json`

Each route is `from` and `to` as `[longitude, latitude]`, with `kind` set to `oil`, `coal` or `lng`. These are illustrative corridors, not measured flows.

## Share card

`og.png` is the picture that appears when someone shares a link to the site. It is a snapshot of `og.html`. To change the wording, edit `og.html` (and the matching `og:title` / `og:description` tags at the top of `index.html`), then re-take the picture with the local server running:

```
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=9000 --screenshot=og.png http://localhost:8082/og.html
```

Apps cache link previews, so a link already shared may keep showing the old card for a while.

## Where things are

| File | What it does |
| --- | --- |
| `index.html` + `js/dashboard.js` | The dashboard |
| `js/globe.js` | The globe (canvas, no libraries) |
| `startups.html`, `signals.html` + `js/lists.js` | The two list pages |
| `js/common.js` | Header, footer, background rain, shared helpers |
| `styles.css` | All styling. Colors are variables at the top. |

The globe's land outline is loaded from the `world-atlas` package on the jsDelivr CDN. If that fails, the globe still draws with its grid, routes and startups.

## Notes on the seed data

The starting content was gathered on 2026-11-21. The news items and headline figures came from web searches and are linked to their sources, but several were confirmed only through secondary reporting. Worth a read-through against the originals before the site is promoted.
