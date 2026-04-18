#!/usr/bin/env ruby

# Keep date front matter date-only while preserving the order returned by Notion.
Jekyll::Hooks.register :site, :post_read do |site|
  site.posts.docs.sort_by! do |post|
    if post.data.key?('notion_order')
      [0, post.data['notion_order'].to_i, post.basename_without_ext]
    else
      [1, -post.date.to_i, post.basename_without_ext]
    end
  end
end
