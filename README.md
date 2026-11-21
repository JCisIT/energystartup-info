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

### Update the headline numbers: `data/stats.json`

The six big figures and the electricity mix bar. Each has a `source` and `url`. These reports come out yearly:

- Ember, Global Electricity Review (spring)
- IEA, World Energy Investment (late spring)
- Energy Institute, Statistical Review of World Energy (summer)

### Change the globe's fuel routes: `data/routes.json`

Each route is `from` and `to` as `[longitude, latitude]`, with `kind` set to `oil`, `coal` or `lng`. These are illustrative corridors, not measured flows.

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
