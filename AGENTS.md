# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`pacman.blog.br` — a personal blog built with **Hugo** (static edition, pinned
**0.135.0** via `mise`), deployed to GitHub Pages. It was migrated from Octopress
2.0 / Jekyll in 2026; some Octopress artifacts remain and are being removed
incrementally.

## Commands

Hugo is managed by `mise` and may not be on `PATH` — prefix with `mise exec --`
(or run `eval "$(mise activate bash)"` once per shell).

```bash
mise exec -- hugo server         # local preview at http://localhost:1313/ (add -D for drafts)
mise exec -- hugo --gc --minify  # production build into public/
hugo new post/my-post.md         # scaffold a post from archetypes/post.md

ruby scripts/migrate_test.rb               # migration unit tests
ruby scripts/migrate_test.rb -n test_post_url_html   # a single test (minitest -n)
ruby scripts/verify_redirects.rb public    # redirect guard (run after a build)
```

There is no separate lint step.

## Branches & deploy

- **`master`** — the deploy branch. Pushing triggers `.github/workflows/hugo.yml`
  (build → `verify_redirects.rb` → deploy to Pages). The published HTML is
  generated, never hand-committed. Pages must be set to Source = "GitHub Actions".
- **`source`** — the original Octopress site, kept as an archive. It has an
  **unrelated git history** from `master` (orphan-branch deploy model), so the
  two will not cleanly diff/merge.
- `static/CNAME` keeps the custom domain on every deploy.

## Architecture & non-obvious invariants

**Permalinks use `:filename`, not `:slug`** (`hugo.toml` `[permalinks]`). This is
deliberate: Octopress derived a post's URL from its filename, which was already
ASCII-mangled (e.g. `espaço`→`espao`). Hugo's `:slug` re-derives from the title
and keeps accents/specials, producing *different* URLs for ~58% of posts. Do not
switch to `:slug` — it silently breaks old inbound links.

**Posts live in `content/post/`** as either `.md` or `.html` (legacy posts are
pre-rendered HTML served verbatim). `[markup.goldmark.renderer] unsafe = true`
is required because Markdown posts contain raw HTML.

**The `/wiki/index.php/` redirect is load-bearing.** One externally-indexed
legacy URL must never break (see `static/wiki/index.php/index.html`, a static
meta-refresh to the GAWK post). It's a static file — not a front-matter alias —
because `migrate.rb` regenerates `content/post/` and would clobber an alias.
`scripts/verify_redirects.rb` runs in CI and **fails the deploy** if this
redirect or its target page disappears. Don't delete `static/wiki/`.

**One post pins its URL via front matter.** Two posts share the slug
`pra-bom-entendedor` on different dates; the migration date-prefixed one
filename to avoid a collision, so `content/post/2008-03-10-pra-bom-entendedor.html`
carries an explicit `url:` to keep its original path under the `:filename` scheme.
`migrate.rb` re-emits this on every run.

**Feed** is served at `/atom.xml` (Hugo's RSS output, `baseName = "atom"`) to
preserve old subscribers.

**`baseURL` is `http://` temporarily** — the domain is HTTP-only until a cert is
provisioned. Flip to `https://` then; it controls absolute URLs in the feed,
canonical tags, and sitemap.

## Ruby in this repo

Two unrelated kinds, both slated for removal in a follow-up PR:

- **Migration provenance (keep for now):** `scripts/migrate.rb` (+ tests) converts
  `source/_posts/` → `content/post/` and is idempotent (re-running reproduces the
  committed content byte-for-byte). `scripts/verify_redirects.rb` is the CI guard.
  `source/_posts/` is retained solely as the migration input.
- **Dead Octopress framework:** `Rakefile`, `Gemfile`/`Gemfile.lock`, `plugins/`,
  `config.rb`, `config.ru`. None of it runs under Hugo.

## Theme

Hand-written, no third-party theme. `layouts/_default/` (baseof/single/list),
`layouts/index.html`, `layouts/page/single.html` (standalone pages, no
date/categories), `layouts/404.html`, `layouts/shortcodes/gist.html`, and
`assets/css/main.css`. Templates guard zero-value dates with
`{{ if not .Date.IsZero }}`.

## Design docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold the migration design
spec and implementation plan.
