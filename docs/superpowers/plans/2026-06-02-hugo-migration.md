# Hugo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead Octopress 2.0 build with a Hugo site that preserves all 159 posts and their old `/blog/:year/:month/:day/:slug/` URLs, keeps `pacman.blog.br` on GitHub Pages, and builds with one command.

**Architecture:** A minimal hand-written Hugo theme (no third-party theme). Posts live in `content/post/` and are produced by a committed, tested Ruby migration script that reads `source/_posts/`. The old `source` and `master` branches are left as an archive. A GitHub Actions workflow builds Hugo and deploys to Pages.

**Tech Stack:** Hugo (standard, not extended — no SCSS), Ruby (migration script + minitest), GitHub Actions.

**Working branch:** `hugo-migration` (already created and checked out). The spec is at `docs/superpowers/specs/2026-06-02-hugo-migration-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `hugo.toml` | Site config: baseURL, permalinks, RSS→atom.xml, highlight, taxonomies |
| `.gitignore` | Add Hugo build/cache dirs |
| `layouts/_default/baseof.html` | HTML skeleton |
| `layouts/_default/single.html` | One post |
| `layouts/_default/list.html` | Section/taxonomy listing |
| `layouts/index.html` | Home page (post list) |
| `layouts/partials/{head,header,footer}.html` | Shared fragments |
| `layouts/shortcodes/gist.html` | Gist embed (Hugo dropped its built-in) |
| `assets/css/main.css` | Minimal stylesheet |
| `scripts/migrate.rb` | Octopress→Hugo conversion logic + CLI |
| `scripts/migrate_test.rb` | Unit tests for the conversion functions |
| `content/post/*` | 159 migrated posts (generated) |
| `static/{CNAME,robots.txt,favicon.png,images/}` | Static assets |
| `.github/workflows/hugo.yml` | Build + deploy to GitHub Pages |

---

## Task 1: Install Hugo and create site config

**Files:**
- Create: `hugo.toml`
- Modify: `.gitignore`

- [ ] **Step 1: Install Hugo locally via mise**

Run:
```bash
mise use -g hugo@0.135.0 && hugo version
```
Expected: prints `hugo v0.135.0 ...`. If 0.135.0 is unavailable, run `mise ls-remote hugo | tail` and pick the newest stable patch; use that exact version everywhere `0.135.0` appears in this plan (including Task 6).

- [ ] **Step 2: Create `hugo.toml`**

```toml
baseURL = "https://pacman.blog.br/"
languageCode = "en-us"
title = "Peczenyj's Blog"
enableRobotsTXT = false   # we ship our own static/robots.txt

[params]
  subtitle = "Just Another /Perl|Ruby|C++|Java|Python|JavaScript|Flash|Bash/ Hacker"
  author = "Tiago Peczenyj"

[permalinks]
  post = "/blog/:year/:month/:day/:slug/"

[taxonomies]
  category = "categories"

[markup]
  [markup.highlight]
    style = "solarized-dark"
    lineNos = false
    noClasses = true
  [markup.goldmark.renderer]
    unsafe = true   # old markdown posts contain raw HTML

[outputs]
  home = ["HTML", "RSS"]

# Serve the feed at /atom.xml to preserve old subscribers
[outputFormats]
  [outputFormats.RSS]
    mediaType = "application/rss+xml"
    baseName = "atom"
```

- [ ] **Step 3: Append Hugo dirs to `.gitignore`**

Add these lines to the end of `.gitignore`:
```
# Hugo
/resources/_gen/
.hugo_build.lock
```
(`public` is already ignored.)

- [ ] **Step 4: Verify the config parses**

Run:
```bash
hugo config | head -5
```
Expected: prints resolved config (baseurl, etc.) with no error. A warning about "found no layout file" is fine at this stage.

- [ ] **Step 5: Commit**

```bash
git add hugo.toml .gitignore
git commit -m "Add Hugo site config and ignore build dirs"
```

---

## Task 2: Minimal theme (layouts + CSS + gist shortcode)

**Files:**
- Create: `layouts/_default/baseof.html`, `layouts/_default/single.html`, `layouts/_default/list.html`, `layouts/index.html`, `layouts/partials/head.html`, `layouts/partials/header.html`, `layouts/partials/footer.html`, `layouts/shortcodes/gist.html`, `assets/css/main.css`

- [ ] **Step 1: Create `layouts/_default/baseof.html`**

```html
<!DOCTYPE html>
<html lang="{{ .Site.LanguageCode }}">
{{ partial "head.html" . }}
<body>
  {{ partial "header.html" . }}
  <main class="container">{{ block "main" . }}{{ end }}</main>
  {{ partial "footer.html" . }}
</body>
</html>
```

- [ ] **Step 2: Create `layouts/partials/head.html`**

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ if .IsHome }}{{ .Site.Title }}{{ else }}{{ .Title }} &middot; {{ .Site.Title }}{{ end }}</title>
  {{ with .Site.Params.subtitle }}<meta name="description" content="{{ . }}">{{ end }}
  {{ with resources.Get "css/main.css" }}<link rel="stylesheet" href="{{ .RelPermalink }}">{{ end }}
  {{ with .OutputFormats.Get "rss" }}<link rel="alternate" type="application/rss+xml" href="{{ .RelPermalink }}" title="{{ $.Site.Title }}">{{ end }}
</head>
```

- [ ] **Step 3: Create `layouts/partials/header.html`**

```html
<header class="site-header container">
  <h1 class="site-title"><a href="{{ "/" | relURL }}">{{ .Site.Title }}</a></h1>
  {{ with .Site.Params.subtitle }}<p class="site-subtitle">{{ . }}</p>{{ end }}
</header>
```

- [ ] **Step 4: Create `layouts/partials/footer.html`**

```html
<footer class="site-footer container">
  <p>&copy; {{ now.Year }} {{ .Site.Params.author }} &middot; built with <a href="https://gohugo.io">Hugo</a></p>
</footer>
```

- [ ] **Step 5: Create `layouts/index.html`**

```html
{{ define "main" }}
<ul class="post-list">
  {{ range (where .Site.RegularPages "Section" "post").ByDate.Reverse }}
  <li>
    <time class="post-date" datetime="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "2006-01-02" }}</time>
    <a href="{{ .RelPermalink }}">{{ .Title }}</a>
  </li>
  {{ end }}
</ul>
{{ end }}
```

- [ ] **Step 6: Create `layouts/_default/single.html`**

```html
{{ define "main" }}
<article class="post">
  <h1 class="post-title">{{ .Title }}</h1>
  <time class="post-date" datetime="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "January 2, 2006" }}</time>
  {{ with .Params.categories }}
  <div class="post-categories">{{ range . }}<span class="category">{{ . }}</span> {{ end }}</div>
  {{ end }}
  <div class="post-content">{{ .Content }}</div>
</article>
{{ end }}
```

- [ ] **Step 7: Create `layouts/_default/list.html`**

```html
{{ define "main" }}
<h1 class="list-title">{{ .Title }}</h1>
<ul class="post-list">
  {{ range .Pages.ByDate.Reverse }}
  <li>
    <time class="post-date" datetime="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "2006-01-02" }}</time>
    <a href="{{ .RelPermalink }}">{{ .Title }}</a>
  </li>
  {{ end }}
</ul>
{{ end }}
```

- [ ] **Step 8: Create `layouts/shortcodes/gist.html`**

```html
<script src="https://gist.github.com/{{ .Get 0 }}.js{{ if .Get 1 }}?file={{ .Get 1 }}{{ end }}"></script>
```

- [ ] **Step 9: Create `assets/css/main.css`**

```css
:root { --fg:#222; --bg:#fff; --muted:#777; --accent:#268bd2; }
* { box-sizing: border-box; }
body { margin:0; color:var(--fg); background:var(--bg);
  font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.container { max-width:760px; margin:0 auto; padding:0 1rem; }
.site-header { padding-top:2rem; }
.site-title a { color:var(--fg); text-decoration:none; }
.site-subtitle { color:var(--muted); margin-top:.2rem; font-size:.9rem; }
.post-list { list-style:none; padding:0; }
.post-list li { display:flex; gap:1rem; padding:.3rem 0; align-items:baseline; }
.post-date { color:var(--muted); font-variant-numeric:tabular-nums; white-space:nowrap; }
.post-title { margin-bottom:.2rem; }
.post-categories { margin:.5rem 0; }
.category { background:#eee; border-radius:3px; padding:.1rem .4rem; font-size:.8rem; }
.post-content { margin-top:1.5rem; }
a { color:var(--accent); }
pre { overflow:auto; padding:1rem; border-radius:5px; }
img { max-width:100%; height:auto; }
.site-footer { color:var(--muted); font-size:.85rem; margin:3rem 0 2rem; border-top:1px solid #eee; padding-top:1rem; }
```

- [ ] **Step 10: Verify templates render an (empty) build**

Run:
```bash
hugo --gc --logLevel info && echo "BUILD OK"
```
Expected: ends with `BUILD OK`. With no content yet, Hugo builds the home page only — that's fine. No template errors.

- [ ] **Step 11: Commit**

```bash
git add layouts assets
git commit -m "Add minimal Hugo theme (layouts, CSS, gist shortcode)"
```

---

## Task 3: Migration script with tests (TDD)

The script exposes pure functions so they can be unit-tested, plus a CLI entrypoint guarded by `if __FILE__ == $0`.

**Files:**
- Create: `scripts/migrate.rb`
- Test: `scripts/migrate_test.rb`

- [ ] **Step 1: Write the failing tests in `scripts/migrate_test.rb`**

```ruby
require "minitest/autorun"
require_relative "migrate"

class MigrateTest < Minitest::Test
  # --- dest_name: .markdown -> .md, .html stays .html ---
  def test_dest_name_markdown_becomes_md
    assert_equal "schwartzian-transform.md",
      Migrate.dest_name("2013-01-22-schwartzian-transform.markdown")
  end

  def test_dest_name_html_stays_html
    assert_equal "blog-post.html",
      Migrate.dest_name("2008-06-13-blog-post.html")
  end

  # --- normalize_date: space form -> ISO T form; ISO passes through ---
  def test_normalize_date_space_form
    assert_equal "2013-01-22T16:00:00", Migrate.normalize_date("2013-01-22 16:00")
  end

  def test_normalize_date_iso_passthrough
    assert_equal "2008-06-13T23:24:00-03:00",
      Migrate.normalize_date("2008-06-13T23:24:00-03:00")
  end

  # --- convert_frontmatter: drops layout/comments, keeps title/date/categories ---
  def test_convert_frontmatter_drops_layout_and_comments
    src = <<~YAML
      layout: post
      title: "MooseX"
      date: 2014-02-07 20:13
      comments: true
      categories: [ Ruby, MooseX, AOP ]
    YAML
    out = Migrate.convert_frontmatter(src)
    refute_includes out, "layout:"
    refute_includes out, "comments:"
    assert_includes out, 'title: "MooseX"'
    assert_includes out, "date: 2014-02-07T20:13:00"
    assert_includes out, "categories: [ Ruby, MooseX, AOP ]"
  end

  # --- convert_body: Octopress liquid tags ---
  def test_convert_body_gist
    assert_equal '{{< gist 4502025 >}}', Migrate.convert_body("{% gist 4502025 %}").strip
  end

  def test_convert_body_img
    assert_equal '<img src="/images/codility.png" alt="">',
      Migrate.convert_body("{% img /images/codility.png %}").strip
  end

  def test_convert_body_blockquote
    src = "{% blockquote Wikipedia http://en.wikipedia.org/wiki/Schwartzian_transform %}\nhi\n{% endblockquote %}"
    out = Migrate.convert_body(src)
    assert_includes out, "<blockquote>"
    assert_includes out, "hi"
    assert_includes out, %(<a href="http://en.wikipedia.org/wiki/Schwartzian_transform">Wikipedia</a>)
    assert_includes out, "</blockquote>"
  end

  def test_convert_body_leaves_plain_text_untouched
    assert_equal "just text", Migrate.convert_body("just text")
  end

  # --- has_unconverted_liquid?: report helper ---
  def test_detects_remaining_liquid
    assert Migrate.has_unconverted_liquid?("{% codeblock %}")
    refute Migrate.has_unconverted_liquid?("{{< gist 1 >}}")
  end
end
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:
```bash
ruby scripts/migrate_test.rb
```
Expected: FAIL — `cannot load such file -- ./migrate` or `uninitialized constant Migrate`.

- [ ] **Step 3: Implement `scripts/migrate.rb`**

```ruby
#!/usr/bin/env ruby
# Convert Octopress (source/_posts) posts to Hugo (content/post).
# Pure functions are unit-tested in migrate_test.rb; the CLI runs at the bottom.
require "fileutils"

module Migrate
  SRC_DIR  = File.expand_path("../source/_posts", __dir__)
  DEST_DIR = File.expand_path("../content/post", __dir__)
  DATE_PREFIX = /\A\d{4}-\d{2}-\d{2}-/

  module_function

  # "2013-01-22-foo.markdown" -> "foo.md"; "...-foo.html" -> "foo.html"
  def dest_name(filename)
    base = filename.sub(DATE_PREFIX, "")
    base.sub(/\.markdown\z/, ".md")
  end

  # "2013-01-22 16:00" -> "2013-01-22T16:00:00"; ISO strings pass through.
  def normalize_date(value)
    v = value.to_s.strip
    if v =~ /\A(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\z/
      "#{$1}T#{$2}:00"
    else
      v
    end
  end

  # Rewrite YAML front matter: drop layout/comments, normalize date.
  def convert_frontmatter(yaml_text)
    out = []
    yaml_text.each_line do |line|
      case line
      when /\Alayout\s*:/, /\Acomments\s*:/
        next
      when /\Adate\s*:\s*(.+)/   # `.+` stops before the newline; no end-anchor
        out << "date: #{normalize_date($1.strip)}\n"
      else
        out << line
      end
    end
    out.join
  end

  # Convert the Octopress Liquid tags actually used in the corpus.
  def convert_body(text)
    body = text.dup
    # {% gist ID [file] %} -> {{< gist ID [file] >}}
    body.gsub!(/\{%\s*gist\s+(\S+)(?:\s+(\S+))?\s*%\}/) do
      $2 ? "{{< gist #{$1} #{$2} >}}" : "{{< gist #{$1} >}}"
    end
    # {% img [class] /path [w] [h] [title] %} -> <img src=... alt="">
    body.gsub!(/\{%\s*img\s+(?:\S+\s+)?(\/\S+)(?:\s+[^%]*?)?\s*%\}/) do
      %(<img src="#{$1}" alt="">)
    end
    # {% blockquote AUTHOR URL %} ... {% endblockquote %} -> <blockquote>...<footer>
    body.gsub!(/\{%\s*blockquote\s+(\S+)\s+(https?:\/\/\S+)\s*%\}(.*?)\{%\s*endblockquote\s*%\}/m) do
      author, url, inner = $1, $2, $3
      %(<blockquote>#{inner}<footer><cite><a href="#{url}">#{author}</a></cite></footer></blockquote>)
    end
    body
  end

  def has_unconverted_liquid?(text)
    text.include?("{%")
  end

  # Split a post file into [frontmatter_yaml, body].
  def split_post(content)
    if content =~ /\A---\s*\n(.*?\n)---\s*\n?(.*)\z/m
      [$1, $2]
    else
      ["", content]
    end
  end

  def run
    FileUtils.mkdir_p(DEST_DIR)
    migrated = 0
    flagged = []
    Dir.children(SRC_DIR).sort.each do |filename|
      path = File.join(SRC_DIR, filename)
      next unless File.file?(path)
      content = File.read(path, encoding: "UTF-8")
      fm, body = split_post(content)
      new_fm = convert_frontmatter(fm)
      new_body = convert_body(body)
      dest = File.join(DEST_DIR, dest_name(filename))
      File.write(dest, "---\n#{new_fm}---\n#{new_body}")
      migrated += 1
      flagged << filename if has_unconverted_liquid?(new_body)
    end
    puts "Migrated #{migrated} posts -> #{DEST_DIR}"
    if flagged.empty?
      puts "No un-converted Liquid tags remaining."
    else
      puts "WARNING: posts still containing '{%':"
      flagged.each { |f| puts "  - #{f}" }
    end
  end
end

Migrate.run if __FILE__ == $0
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run:
```bash
ruby scripts/migrate_test.rb
```
Expected: PASS — `0 failures, 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate.rb scripts/migrate_test.rb
git commit -m "Add tested Octopress->Hugo migration script"
```

---

## Task 4: Run migration and copy static assets

**Files:**
- Create: `content/post/*` (generated), `static/CNAME`, `static/robots.txt`, `static/favicon.png`, `static/images/*`

- [ ] **Step 1: Run the migration script**

Run:
```bash
ruby scripts/migrate.rb
```
Expected: `Migrated 159 posts -> .../content/post` followed by `No un-converted Liquid tags remaining.`
If any post is flagged, open it and convert the remaining tag by hand before continuing.

- [ ] **Step 2: Verify the post count**

Run:
```bash
ls content/post | wc -l
```
Expected: `159`.

- [ ] **Step 3: Copy static assets from the Octopress source**

Run:
```bash
mkdir -p static
cp source/CNAME static/CNAME
cp source/robots.txt static/robots.txt
cp source/favicon.png static/favicon.png
cp -r source/images static/images
ls static && cat static/CNAME
```
Expected: `static/` contains `CNAME images favicon.png robots.txt`, and `CNAME` prints `pacman.blog.br`.

- [ ] **Step 4: Spot-check the migrated front matter of a converted post**

Run:
```bash
sed -n '1,8p' content/post/moosex-a-new-ruby-dsl-for-object-oriented-programming-and-much-more.md
```
Expected: front matter has `title`, `date: 2014-02-07T20:13:00`, `categories: [ Ruby, MooseX, AOP ]`, and NO `layout:` or `comments:` lines.

- [ ] **Step 5: Verify the two Liquid posts converted**

Run:
```bash
grep -L '{%' content/post/schwartzian-transform.md content/post/codility-equi-task-solution-in-modern-perl.md
```
Expected: both filenames are printed (meaning neither still contains `{%`).

- [ ] **Step 6: Commit**

```bash
git add content static
git commit -m "Migrate 159 posts and static assets to Hugo"
```

---

## Task 5: Full build verification

- [ ] **Step 1: Build the full site**

Run:
```bash
hugo --gc --logLevel info 2>&1 | tail -20
```
Expected: a build summary table with `Pages` ≥ 160 and no `ERROR` lines.

- [ ] **Step 2: Verify the old permalink scheme is produced**

Run:
```bash
ls public/blog/2014/02/07/moosex-a-new-ruby-dsl-for-object-oriented-programming-and-much-more/index.html
```
Expected: the file exists (confirms `/blog/:year/:month/:day/:slug/` URLs work).

- [ ] **Step 3: Verify the feed is served at /atom.xml**

Run:
```bash
test -f public/atom.xml && head -3 public/atom.xml
```
Expected: file exists and prints an XML/RSS header.

- [ ] **Step 4: Verify the gist post embedded and the image post resolves**

Run:
```bash
grep -o 'gist.github.com/4502025.js' public/blog/2013/01/10/codility-equi-task-solution-in-modern-perl/index.html
test -f public/images/codility.png && echo "IMAGE OK"
```
Expected: prints `gist.github.com/4502025.js` and `IMAGE OK`.

- [ ] **Step 5: Preview locally and eyeball it**

Run:
```bash
hugo server --bind 127.0.0.1 --port 1313
```
Open `http://127.0.0.1:1313/`. Confirm: home page lists posts newest-first; a post page renders; code blocks and the blockquote/gist/image post look right. Stop the server (Ctrl-C) when done.

- [ ] **Step 6: Commit any manual fixes made during review**

```bash
git add -A
git commit -m "Fix issues found during build verification" || echo "nothing to commit"
```

---

## Task 6: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/hugo.yml`

- [ ] **Step 1: Create `.github/workflows/hugo.yml`**

Use the same Hugo version installed in Task 1 (`0.135.0`; if you changed it there, change it here too).

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.135.0
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O /tmp/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.deb
          sudo dpkg -i /tmp/hugo.deb
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
        id: pages
      - name: Build
        run: hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run:
```bash
ruby -ryaml -e 'YAML.load_file(".github/workflows/hugo.yml"); puts "YAML OK"'
```
Expected: `YAML OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/hugo.yml
git commit -m "Add GitHub Actions workflow to build and deploy Hugo to Pages"
```

- [ ] **Step 4: Manual follow-up (cannot be automated — note for the user)**

These steps happen in the GitHub UI / at merge time and are intentionally NOT executed by the implementer:
1. Decide the final deploy branch (the workflow triggers on `master`). Merge `hugo-migration` accordingly; archive the old published HTML (e.g. tag the current `master` as `octopress-archive` first).
2. In repo **Settings → Pages**, set **Source = GitHub Actions**.
3. Confirm the custom domain `pacman.blog.br` is set (the `static/CNAME` file preserves it on each deploy).
4. After the first deploy, load `https://pacman.blog.br/` and a known old URL to confirm.

---

## Notes for the implementer

- Run all commands from the repo root (`/home/tiago/www/peczenyj.github.com`).
- Hugo standard (non-extended) is sufficient — the theme uses plain CSS, no SCSS.
- Do not modify the `source/` tree or the `master` branch; they are the archive and the migration script reads from `source/_posts/` read-only.
