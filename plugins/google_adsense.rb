# Title: Simple adsense tag for Jekyll
# Author: Tiago Peczenyj http://pacman.blog.br
# Description: Easily output adsense script tags
# Configuration: google_ad_client from _config.yml, if false, tag will be empty
#
# Syntax {% adsense [google_ad_name google_ad_slot google_ad_width google_ad_height] %}
#
# Examples:
# {% adsense %}
# 
# will read the default values 
# google_default_ad_name, google_default_ad_slot, google_default_ad_width and google_default_ad_height 
# from _config.yml 
#
# {% adsense "my blog advertising 1" 0082940736 468 60 %}
#
# Output:
# <script type="text/javascript"><!--
# google_ad_client = "google_ad_client";
# /* my blog advertising 1 */
# google_ad_slot = "0082940736";
# google_ad_width = 468;
# google_ad_height = 60;
# //-->
# </script>
# <script type="text/javascript"
# src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
# </script>

module Jekyll

	class AdSense < Liquid::Tag

    def initialize(tag_name, markup, tokens)
      super
      if /"(?<name>[^"]+)"\s+(?<slot>\w+)\s+(?<width>\d+)\s+(?<height>\d+)/ =~ markup
        @google_ad_name   = name
        @google_ad_slot   = slot
        @google_ad_width  = width
        @google_ad_height = height
      end
    end

		def render(context)
		  site_config         = context.registers[:site].config
      @google_ad_client ||= site_config['google_ad_client']
      @google_ad_name   ||= site_config['google_default_ad_name']
      @google_ad_slot   ||= site_config['google_default_ad_slot']
      @google_ad_width  ||= site_config['google_default_ad_width']
      @google_ad_height ||= site_config['google_default_ad_height']
		  
      return %(<!-- site.google_ad_client not found -->) unless @google_ad_client;
      
      %(<script type="text/javascript"><!--
      google_ad_client = "#{@google_ad_client}";
      /* #{@google_ad_name} */
      google_ad_slot = "#{@google_ad_slot}";
      google_ad_width = #{@google_ad_width};
      google_ad_height = #{@google_ad_height};
      //-->
      </script>
      <script type="text/javascript"
      src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
      </script>)
    end
  end
end  

Liquid::Template.register_tag('adsense', Jekyll::AdSense)