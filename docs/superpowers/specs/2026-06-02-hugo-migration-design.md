# Design: Migrate peczenyj.github.com from Octopress to Hugo

**Date:** 2026-06-02
**Status:** Proposed (awaiting review)

## Background

This repository is a GitHub User Pages site (`peczenyj.github.com`) built with
Octopress 2.0 (Jekyll 0.11.2, ~2011). It has been dormant since the last post on
2014-02-07. The toolchain no longer builds cleanly on modern Ruby: the gems
install, but the build depends on `rexml` (removed from stdlib), pre-3.2 Ruby
methods (`File.exists?`, `Fixnum`), Psych-3 YAML behaviour, and — the real
blocker — syntax highlighting via Python 2 Pygments (`pygments.rb` →
`rubypython` → FFI), which is dead.

Rather than nurse a dead framework, we migrate to **Hugo**, whose built-in Chroma
highlighter removes the Pygments dependency entirely.

## Goals

- Get the blog **online and easily maintainable** — buildable with one command,
  trivial to post to again.
- Preserve all **159 posts** and their **old URLs**.
- Keep the custom domain **`pacman.blog.br`** on **GitHub Pages**.
- No third-party theme or runtime to drift out of date.

## Non-goals

- Recreating the exact Octopress visual design.
- Preserving dead third-party integrations (see "Explicitly dropped").
- Curating/editing post content (straight migration; cleanup is future work).

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Primary goal | Get online & maintainable |
| Deploy | GitHub Pages, keep `pacman.blog.br` |
| Content | Convert all 159 posts, automated |
| Theme | Minimal hand-written (no third-party theme) |
| URLs | Preserve `/blog/:year/:month/:day/:slug/` |
| Conversion | Custom migration script (approach A) |

## Content survey (verified)

- `source/_posts/`: **152 `.html`** + **7 `.markdown`** = 159 posts.
- Octopress **Liquid tags appear in only 2 posts**, 4 instances total:
  `img` (×1), `gist` (×1), `blockquote`/`endblockquote` (×1). No `codeblock`,
  `include_code`, `pullquote`, etc. in use.
- Front matter is YAML: `layout`, `title`, `date` (`YYYY-MM-DD HH:MM`),
  `comments`, `categories` (already a list).
- HTML-bodied posts are pre-rendered HTML (legacy import) — Hugo serves `.html`
  content files verbatim, so they carry over without markdown reprocessing.

## Architecture

### Repository / branch strategy

- Leave `source` (Octopress source) and `master` (old published HTML) branches
  **untouched as an archive**.
- All Hugo work happens on the **`hugo-migration`** branch.
- Switch GitHub Pages build source to **"GitHub Actions"**. A workflow builds
  Hugo and deploys to Pages — no hand-committed HTML, branches stop drifting.
- Once verified and merged, `hugo-migration` (or `master`) becomes the
  deploy source; final branch naming decided at merge time.

### Directory layout

```
hugo.toml                     # config: baseURL, permalinks, params, outputs
archetypes/default.md         # new-post template
content/post/                 # 159 migrated posts (.html + .md)
layouts/
  _default/baseof.html        # HTML skeleton
  _default/single.html        # one post
  _default/list.html          # section/archive listing
  index.html                  # home page (recent posts)
  partials/head.html, header.html, footer.html
  shortcodes/gist.html        # custom gist shortcode (Hugo dropped built-in)
assets/css/main.css           # minimal stylesheet
static/
  CNAME                       # "pacman.blog.br" → emitted at site root
  images/...                  # migrated from source/images
  javascripts/...             # only if still referenced
  favicon.png, robots.txt
.github/workflows/hugo.yml    # build + deploy to GitHub Pages
```

### Hugo configuration (key points)

- `baseURL = "https://pacman.blog.br/"`
- `[permalinks] post = "/blog/:year/:month/:day/:slug/"` — matches Octopress.
- `[markup.highlight]` — Chroma, line numbers, a Solarized-ish style to echo the
  old look.
- `[outputs] home = ["HTML", "RSS"]`; alias/serve the feed at `/atom.xml` to keep
  old subscribers working.
- `[params]` — site title, subtitle, author from the old `_config.yml`.

### Migration script (approach A)

A standalone script (Ruby — already on the machine — or Python) that:

1. Reads each file in `source/_posts/`.
2. Derives the slug: strip the `YYYY-MM-DD-` filename prefix; keep `.html`/`.md`
   extension so Hugo renders the body in its original format.
3. Rewrites front matter: keep `title`, `date`, `categories`; **drop** `layout`,
   `comments`. Normalize the date to a Hugo-valid value.
4. Copies the body verbatim into `content/post/`.
5. Converts the Liquid tags found in the 2 affected posts:
   - `{% img path alt %}` → `<figure><img src=… alt=…></figure>`
   - `{% gist ID %}` → `{{< gist ID >}}` (custom shortcode)
   - `{% blockquote … %}…{% endblockquote %}` → `<blockquote>…</blockquote>`
6. Prints a **report**: posts migrated, and any post still containing `{%` or
   other un-handled constructs, so nothing is converted silently.

The script is committed to the repo (e.g. `scripts/migrate.rb`) so the migration
is repeatable and auditable.

### Static assets

- Copy `source/images`, `source/favicon.png`, `source/robots.txt`,
  `source/CNAME` into `static/`.
- Carry `source/javascripts/*` only if a migrated post references it; otherwise
  drop (most were Octopress theme JS).

### Deploy workflow (`.github/workflows/hugo.yml`)

- Trigger on push to the deploy branch.
- Steps: checkout (with submodules false — no theme submodule), install Hugo
  **extended** (pinned version), `hugo --minify`, upload `public/` artifact,
  deploy via `actions/deploy-pages`.
- `static/CNAME` ensures the custom domain survives each deploy.

### Local toolchain

- Install Hugo **extended** locally (via `mise`, matching the existing Ruby
  setup) so `hugo server` works for preview. Pin the same version the workflow
  uses.

## Explicitly dropped (dead services)

Disqus comments, Google AdSense, Google+, Pinboard, Delicious, Twitter widgets,
Gravatar/StackOverflow asides, and the old `UA-` Google Analytics ID. These were
in the Octopress sidebar config and are defunct or unwanted. Any can be re-added
later as a partial.

## Error handling / edge cases

- **Un-handled Liquid/markup:** surfaced in the migration report, not silently
  dropped. Manual fix for the 2 known posts, verified in preview.
- **Filename → slug collisions:** report any duplicate slugs (none expected).
- **Invalid/odd dates or non-UTF-8 bytes:** the script logs and skips into the
  report rather than aborting the whole run.
- **`.html` posts with relative asset links:** verify images resolve after the
  `static/images` copy.

## Testing / verification

1. `hugo` (and the workflow build) completes with **zero errors/warnings**.
2. `content/post/` contains **exactly 159** posts.
3. The 2 Liquid-tag posts render correctly (image shows, gist embeds, blockquote
   formats) — checked in `hugo server`.
4. Spot-check a sample of `.html` and `.md` posts for correct rendering and
   working code highlighting.
5. A known old URL (e.g.
   `/blog/2014/02/07/moosex-a-new-ruby-dsl-for-object-oriented-programming-and-much-more/`)
   resolves to the right post.
6. `/atom.xml` is served and valid.
7. Local `hugo server` preview reviewed before any deploy; Pages deploy verified
   on the live domain last.

## Out of scope / future work

- Content cleanup, retagging, or translating old Portuguese posts.
- Search, comments, analytics, or a fancier theme.
- Redirect map beyond the preserved permalink scheme.
