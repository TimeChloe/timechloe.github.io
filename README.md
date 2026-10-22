# timechloe.github.io

Source of Yue Zhang's personal website: <https://timechloe.github.io>

Built with [Jekyll](https://jekyllrb.com/) on the [Academic Pages](https://github.com/academicpages/academicpages.github.io) template. GitHub Pages rebuilds and publishes the site automatically whenever the `master` branch changes.

## Where things live

| What you want to change | File or folder |
| --- | --- |
| Name, sidebar bio, location, email, profile photo, social links | `_config.yml` (the `author:` block) |
| Home page (About Me, Student Theses, News) | `_pages/about.md` |
| Personal Interests page (climbing, hiking, trips) | `_pages/interests.md` |
| Travel logs (one file per trip, listed on Personal Interests) | `_travel/` |
| CV page | `_pages/cv.md` |
| Publications (one file per paper) | `_publications/` |
| Projects (one file per project) | `_portfolio/` |
| Menu at the top of the page | `_data/navigation.yml` |
| Images | `images/` (put any PDFs you want to link in `files/`) |

Everything else (`_layouts/`, `_includes/`, `_sass/`, `assets/`) is the theme. You normally don't need to touch it.

## Common edits

**Add a news item.** Open `_pages/about.md` and add a line at the top of the `## News` list.

**Add a publication.** Copy one of the files in `_publications/`, rename it (e.g. `2027-icra-my-paper.md`), and edit the front matter:

```yaml
---
title: "Paper title"
collection: publications
category: conferences                  # section heading, defined under publication_category in _config.yml
permalink: /publication/2027-icra-my-paper
date: 2027-01-15                       # controls the order, newest first
venue: 'IEEE International Conference on Robotics and Automation (ICRA 2027)'
authors: 'First Author, <b>Yue Zhang</b>, Last Author'
paperurl: 'https://ieeexplore.ieee.org/document/...'   # optional
arxivurl: 'https://arxiv.org/abs/...'                  # optional
projecturl: 'https://...'                              # optional
codeurl: 'https://github.com/...'                      # optional
# status: submitted                    # uncomment while under review
---

Abstract goes here (shown on the paper's own page).
```

For a journal paper, use `category: manuscripts` and uncomment the `manuscripts` entry under `publication_category` in `_config.yml`.

**Add a travel log.** Create a file in `_travel/`, e.g. `_travel/2026-08-arctic-circle-trail.md`:

```markdown
---
title: "Arctic Circle Trail, Greenland"
date: 2026-08-20          # controls the order on the Personal Interests page, newest first
---

The first paragraph is the short summary shown in the list.

Write the rest of the story here. Add photos with
![Camp on day 3](/images/travel/act-day3.jpg)
```

Put the photos in `images/travel/` and keep each one under ~500 KB. The log appears under "Travel Logs" on the Personal Interests page and gets its own page at `/travel/<file-name>/`. A log dated in the future stays hidden until that date.

**Add a project.** Copy a file in `_portfolio/`, change `title`, `excerpt` (the summary on the Projects page) and the body, and set `order:` to choose its position on the page.

**Change the photo.** Put the new image in `images/` and set `avatar:` in `_config.yml`. Keep images small (under ~500 KB) so the site loads quickly.

## Preview locally

You need Docker (already installed on this laptop). From the repository folder:

```bash
docker compose up
```

Then open <http://localhost:4000>. Pages rebuild automatically when you save a file; refresh the browser to see the change. If you edit `_config.yml`, stop the server with `Ctrl+C` and run `docker compose up` again. The first run builds the image, which takes a few minutes; later runs start in seconds.

Without Docker, install Ruby and Bundler, then run `bundle install` once and `bundle exec jekyll serve -l -H localhost` to preview.

## Publish

Commit and push to `master`; GitHub Pages rebuilds the live site within a minute or two.

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

You can watch the build under the repository's **Actions** tab on GitHub. If a build fails, the error there names the file and line to fix.

To try a bigger change without touching the live site, work on a branch (`git switch -c my-change`), push it, and open a pull request; the site only updates once it is merged into `master`.

## License

The theme is released under the MIT License (see `LICENSE`), originally from [Academic Pages](https://github.com/academicpages/academicpages.github.io) and [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes).
