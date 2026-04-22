#!/usr/bin/env ruby

def sort_notion_posts(site)
  site.posts.docs.sort_by! do |post|
    notion_order = post.data.key?('notion_order') ? post.data['notion_order'].to_i : 999_999
    [post.date.to_i, notion_order, post.basename_without_ext]
  end
end

# Keep post lists chronological while using Notion order only as a same-date tie breaker.
Jekyll::Hooks.register :site, :post_read do |site|
  sort_notion_posts(site)
end

Jekyll::Hooks.register :site, :pre_render do |site|
  sort_notion_posts(site)
end
