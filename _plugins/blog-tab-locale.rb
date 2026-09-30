# Add the custom Blog tab to Chirpy's locale data so that the browser title
# and other localized labels can resolve its name.
Jekyll::Hooks.register :site, :post_read do |site|
  lang = site.config['lang']
  tabs = site.data.dig('locales', lang, 'tabs')
  tabs['blog'] = 'Blog' if tabs
end
