#!/usr/bin/env ruby
# Post-build guard for legacy redirects we must never lose.
#
# For each entry below, assert that the built site contains the redirect file
# AND that it points to a page that actually exists in the build. This catches
# the redirect being deleted/retargeted, or its target article moving (e.g. the
# permalink scheme regressing from :filename back to :slug).
#
# The query string on an inbound URL is irrelevant: static hosts route by path
# and discard everything after "?", so "/wiki/index.php/?title=..." and
# "/wiki/index.php/" resolve to the same index.html. Nothing to assert there.
#
# Usage: ruby scripts/verify_redirects.rb [public_dir]   (default: public)

# served path (a directory holding index.html) => article URL it must redirect to
REDIRECTS = {
  "/wiki/index.php/" => "/blog/2012/12/29/spell-correct-in-gawk/",
}.freeze

public_dir = ARGV[0] || "public"
errors = []

REDIRECTS.each do |from, to|
  redirect_file = File.join(public_dir, from, "index.html")
  unless File.file?(redirect_file)
    errors << "missing redirect file #{redirect_file} (for #{from})"
    next
  end
  html = File.read(redirect_file, encoding: "UTF-8")
  unless html.include?("url=#{to}")
    errors << "redirect #{from} does not point to #{to}"
  end
  target = File.join(public_dir, to, "index.html")
  errors << "redirect target page missing: #{target} (for #{to})" unless File.file?(target)
end

if errors.empty?
  puts "Redirect check OK (#{REDIRECTS.size} verified)."
else
  warn "Redirect check FAILED:"
  errors.each { |e| warn "  - #{e}" }
  exit 1
end
