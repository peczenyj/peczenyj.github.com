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

  # --- split_post: separates front matter from body ---
  def test_split_post_separates_frontmatter_and_body
    content = %(---\ntitle: "Hi"\ndate: 2013-01-22 16:00\n---\n\n<div>body</div>\n)
    fm, body = Migrate.split_post(content)
    assert_includes fm, 'title: "Hi"'
    assert_includes fm, "date: 2013-01-22 16:00"
    assert_includes body, "<div>body</div>"
  end

  def test_split_post_no_frontmatter_returns_whole_as_body
    fm, body = Migrate.split_post("no front matter here")
    assert_equal "", fm
    assert_equal "no front matter here", body
  end

  # --- resolve_destinations: collision handling ---
  def test_resolve_destinations_no_collision
    m = Migrate.resolve_destinations(["2013-01-22-foo.markdown", "2008-06-13-bar.html"])
    assert_equal "foo.md", m["2013-01-22-foo.markdown"]
    assert_equal "bar.html", m["2008-06-13-bar.html"]
  end

  def test_resolve_destinations_two_way_collision
    files = ["2008-03-10-pra-bom-entendedor.html", "2007-07-06-pra-bom-entendedor.html"]
    m = Migrate.resolve_destinations(files)
    assert_equal "pra-bom-entendedor.html", m["2007-07-06-pra-bom-entendedor.html"]
    assert_equal "2008-03-10-pra-bom-entendedor.html", m["2008-03-10-pra-bom-entendedor.html"]
  end
end
