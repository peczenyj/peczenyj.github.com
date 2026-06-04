# pacman.blog.br

Tiago Peczenyj's personal blog, built with [Hugo](https://gohugo.io/) and
deployed to GitHub Pages at <https://pacman.blog.br>.

Migrated from Octopress in 2026; old `/blog/:year/:month/:day/:slug/` URLs are
preserved.

## Prerequisites

Hugo **0.135.0** (standard edition — the extended/SCSS build is not required).
The version is pinned in `mise` and in the deploy workflow.

```bash
mise install        # installs the pinned Hugo from .config/mise
```

If `hugo` isn't on your `PATH`, prefix commands with `mise exec --`
(e.g. `mise exec -- hugo server`) or run `eval "$(mise activate bash)"` once per
shell.

## Local preview

```bash
hugo server          # http://localhost:1313/
hugo server -D       # include drafts
```

The site live-reloads on changes to `content/`, `layouts/`, `assets/`,
`static/`, and `hugo.toml`.

## Writing a post

```bash
hugo new post/my-new-post.md
```

This scaffolds `content/post/my-new-post.md` from `archetypes/post.md`:

```yaml
---
title: "My New Post"
date: 2026-06-02T12:00:00
categories: []
draft: true
---
```

- The URL is `/blog/<year>/<month>/<day>/my-new-post/` — derived from the
  **date** and the **filename**, so name the file with the slug you want.
- Set `draft: false` (or delete the line) when it's ready to publish.
- Posts may be Markdown (`.md`) or raw HTML (`.html`); both are rendered.

## Build

```bash
hugo --gc --minify   # output in public/
```

## Deploy

Pushing to the **`master`** branch triggers `.github/workflows/hugo.yml`, which
builds the site, verifies the legacy redirects, and deploys to GitHub Pages.
There is no hand-committed HTML — the published site is generated.

`static/CNAME` keeps the custom domain `pacman.blog.br` on every deploy. GitHub
Pages must be set to **Settings → Pages → Source: "GitHub Actions"**.

## Project layout

```
hugo.toml              Site config: baseURL, permalinks, taxonomies, feed
archetypes/post.md     Template for `hugo new post/...`
content/
  post/                Blog posts (159 migrated + new)
  about.md, …          Standalone pages (about, projects, contact)
layouts/               Hand-written theme (no third-party theme)
  _default/            baseof, single, list
  page/                Standalone-page template
  partials/            head, header, footer
  shortcodes/gist.html GitHub gist embed
  404.html
assets/css/main.css    Stylesheet
static/                Copied verbatim: CNAME, robots.txt, favicon, images/,
                       and the legacy /wiki/index.php/ redirect
.github/workflows/     Build + deploy to GitHub Pages
```

## Feed

The RSS feed is served at `/atom.xml` (renamed from Hugo's default
`/index.xml`) to keep old subscribers working.

## Migration provenance

The original Octopress posts are kept in `source/_posts/`, and the conversion
is reproducible via `scripts/migrate.rb` (`ruby scripts/migrate_test.rb` runs
its unit tests). `scripts/verify_redirects.rb` is the CI guard for legacy
redirects. This Ruby tooling — along with the remaining Octopress files
(`Rakefile`, `Gemfile`, `plugins/`, `config.rb`) — is slated for removal in a
follow-up cleanup.
