# timechloe.github.io

Source of Yue Zhang's personal website: <https://timechloe.github.io>

A small, hand-written [Jekyll](https://jekyllrb.com/) site in the style of the [al-folio](https://github.com/alshedivat/al-folio) theme. GitHub Pages rebuilds and publishes it automatically whenever the `master` branch changes.

## Where things live

| What you want to change | File |
| --- | --- |
| Name, email, photo, Google Scholar / GitHub / LinkedIn links | `_config.yml` (the `author:` block) |
| About text on the home page | `_pages/about.md` |
| Papers (home page and publications page) | `_data/publications.yml` |
| News on the home page | `_data/news.yml` |
| Climbing, mountaineering and trekking (mountains page) | `_data/mountains.yml` |
| Trips around the world (travel page) | `_data/travel.yml` |
| Countries you have lived in (darker on the travel map) | `_data/countries.yml` |
| Trip reports (one file per trip) | `_travel/` |
| CV | `files/cv.pdf` (see below) |
| Top menu | `_data/navigation.yml` |
| Photos and images | `images/` |
| Colours, fonts, spacing | `assets/css/main.css` |

The page templates are in `_layouts/` and `_includes/`. You normally don't need to touch them.

## Common edits

**Add a news item.** Add an entry at the top of `_data/news.yml`:

```yaml
- date: Nov 2026
  text: Gave a talk at [Some Workshop](https://example.com).
```

**Add a paper.** Add an entry at the top of `_data/publications.yml`. The comment at the top of that file lists every field. Set `selected: true` to also show it on the home page, and add `image: /images/publications/my-paper.jpg` for a preview picture next to the badge.

**Upload your CV.** Save the PDF as `files/cv.pdf`. The cv page then shows it with a download button. Until the file exists, the page says the CV is coming soon.

**Add a climb or a trip.** Climbing, mountaineering and trekking go at the top of `_data/mountains.yml`; other travel goes at the top of `_data/travel.yml`. Both files use the same fields (the comment at the top of `mountains.yml` lists them all):

```yaml
- name: Shuangqiao Valley
  area: Sichuan, China
  country: China              # or a list: [France, Italy]
  activity: ice climbing
  elevation:                  # optional, e.g. 4,810 m
  grade:                      # optional, e.g. WI4 or 5.10a
  date: Dec 2025
  year: 2025                  # heading in the logbook
  emoji: ⛏️
  lat: 30.98                  # right-click a spot in Google Maps to copy its coordinates
  lng: 102.77
  insight: A few sentences about the trip, shown when someone clicks the pin.
  photos: [/images/mountains/shuangqiao-1.jpg, /images/mountains/shuangqiao-2.jpg]
  log: /travel/shuangqiao-ice/   # optional, link to a trip report
```

Each entry becomes a pin on that page's map (clicking it shows the date, insight and photos) and a row in the logbook below it. Use `status: regular` (instead of `year`) for places you go all the time, and `status: planned` for an upcoming trip, which is drawn as a hollow pin. Entries with the same coordinates share one pin.

The travel map also shades every `country` from both files, plus the countries in `_data/countries.yml`, and counts them at the top of the page. Country names must be in English as on the map, e.g. `United States of America`, `United Kingdom`, `South Korea`.

Put photos in `images/mountains/` or `images/travel/` and keep each one under ~500 KB (resize to about 1200 px wide) so the pages load quickly.

**Write a trip report.** Create a file in `_travel/`, for example `_travel/shuangqiao-ice.md`:

```markdown
---
title: "Ice climbing in Shuangqiao Valley"
date: 2025-12-20
place: Sichuan, China
section: mountains     # mountains or travel: which page lists it
---

The first paragraph is the summary shown in the list.

Write the rest of the story here, with photos:
![First pitch](/images/mountains/shuangqiao-3.jpg)
```

It appears under "trip reports" on the mountains or travel page and gets its own page at `/travel/shuangqiao-ice/`. Link it from the map by setting `log: /travel/shuangqiao-ice/` on the entry. A report dated in the future stays hidden until that date.

## Preview locally

You need Docker (already installed on this laptop). From the repository folder:

```bash
docker compose up
```

Then open <http://localhost:4000>. Pages rebuild when you save a file; refresh the browser to see the change. After editing `_config.yml`, stop the server with `Ctrl+C` and start it again. The first run builds the Docker image, which takes a few minutes.

## Publish

Commit and push to `master`; GitHub Pages rebuilds the live site within a minute or two.

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

You can watch the build under the repository's **Actions** tab on GitHub. If it fails, the error names the file and line to fix (most often a YAML indentation mistake in `_data/`).

## Credits

Design inspired by [al-folio](https://github.com/alshedivat/al-folio). Map by [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.
