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
| Trips: world map pins and the lists on personal interests | `_data/trips.yml` |
| Travel logs (one file per trip) | `_travel/` |
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

**Add a place to the world map.** Add an entry to `_data/trips.yml`:

```yaml
- name: Arctic Circle Trail, Greenland
  activity: backpacking
  date: August 2026
  year: 2026                 # list heading; use "regularly" for places you go all the time
  emoji: 🧊
  lat: 66.98                 # right-click a spot in Google Maps to copy its coordinates
  lng: -52.10
  insight: A few sentences about the trip, shown when someone clicks the pin.
  photos: [/images/travel/act-1.jpg, /images/travel/act-2.jpg]
  log: /travel/arctic-circle-trail/   # optional, link to a longer travel log
```

The same entry becomes a pin on the map (clicking it shows the date, insight and photos) and a line in the list below the map. Add `status: planned` for an upcoming trip; it is drawn as a hollow pin. Trips with the same coordinates share one pin.

Put trip photos in `images/travel/` and keep each one under ~500 KB (resize to about 1200 px wide) so the page loads quickly.

**Write a travel log.** Create a file in `_travel/`, for example `_travel/arctic-circle-trail.md`:

```markdown
---
title: "Arctic Circle Trail, Greenland"
date: 2026-08-20
place: Kangerlussuaq to Sisimiut
---

The first paragraph is the summary shown on the personal interests page.

Write the rest of the story here, with photos:
![Camp on day 3](/images/travel/act-day3.jpg)
```

It appears under "travel logs" on the personal interests page and gets its own page at `/travel/arctic-circle-trail/`. Link it from the map by setting `log: /travel/arctic-circle-trail/` on the trip. A log dated in the future stays hidden until that date.

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
