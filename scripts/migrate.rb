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
    # Detect slug collisions: when two source files map to the same dest name,
    # keep the date prefix in the output filename for all but the first occurrence.
    all_files = Dir.children(SRC_DIR).sort.select { |f| File.file?(File.join(SRC_DIR, f)) }
    seen = Hash.new(0)
    all_files.each { |f| seen[dest_name(f)] += 1 }
    collision_count = Hash.new(0)
    all_files.each do |filename|
      path = File.join(SRC_DIR, filename)
      content = File.read(path, encoding: "UTF-8")
      fm, body = split_post(content)
      new_fm = convert_frontmatter(fm)
      new_body = convert_body(body)
      base = dest_name(filename)
      if seen[base] > 1
        collision_count[base] += 1
        if collision_count[base] > 1
          # Use the date-prefixed version (keep .markdown->.md extension fix)
          base = filename.sub(/\.markdown\z/, ".md")
        end
      end
      dest = File.join(DEST_DIR, base)
      File.write(dest, "---\n#{new_fm}---\n\n#{new_body}")
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
