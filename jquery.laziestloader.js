;(function($) {

  var laziestLoader = function(options, callback) {

    var $w = $(window),
        $elements = this,
        $loaded = $(), // elements with the correct source set
        retina = window.devicePixelRatio > 1;

    options = $.extend(true, {
      threshold: 0,
      getSource: getSource,
      setSourceMode: true // plugin sets source attribute of the element. Set to false if you would like to, instead, use the callback to completely manage the element on trigger.
    }, options);

    /**
     * Generate source path of image to load. Take into account
     * type of data supplied and whether or not a retina 
     * image is available.
     *
     * Basic option: data attributes specifing a single image to load,
     * regardless of viewport. 
     * Eg:
     * 
     * <img data-src="yourimage.jpg">
     * <img data-src="yourimage.jpg" data-src-retina="yourretinaimage.jpg">
     *
     * Range of sizes: specify a string path with a {{size}} that
     * will be replaced by an integer from a list of available sizes.
     * Eg:
     * 
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-size="[320, 640, 970]">
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-pattern-retina="path/toyourimage-{{size}}@2x.jpg" data-size="[320, 640, 970]">
     * <img data-pattern="path/toyourimage/{{size}}/slug.jpg" data-pattern-retina="path/toyourimage/{{size}}/slug@2x.jpg" data-size="[320, 640, 970]">
     *
     * Range of sizes, with slugs: specify a string path with a {{size}} that
     * will be replaced by a slug representing an image size.
     * Eg:
     * 
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-size="[{width: 320, slug: 'small'},{width:900, slug: 'large'}]">
     * 
     * @param  {jQuery object} $el
     * @return {String}
     */
    function getSource($el) {
      var source, slug;
      var data = $el.data();
      if (data.pattern && data.widths && $.isArray(data.widths)) {
        source = retina ? data.patternRetina : data.pattern;
        source = source || data.pattern;

        // width or slug version?
        if (typeof data.widths[0] === 'object') {
          slug = (function() {
            var widths = $.map(data.widths, function(val, i) {
              return val.size;
            });

            var bestFitWidth = bestFit($el.width(), widths);

            // match best width back to its corresponding slug
            for (var i = widths.length - 1; i >= 0; i--) {
              if (widths[i] === bestFitWidth) {
                return data.widths[i].slug;
              }
            }
          })();

          source = source.replace(/{{SIZE}}/ig, slug);
        } else {
          source = source.replace(/{{SIZE}}/ig, bestFit($el.width(), data.widths));
        }
      } else {
        source = retina ? data.srcRetina : data.src;
        source = source || data.src;
      }

      return source;
    }

    /**
     * Attach event handler that sets correct 
     * media source for the elements' width, or 
     * allows callback to manipulate element
     * exclusively.
     */
    function bindLoader() {
      $elements.one('laziestloader', function() {
        var source;

        // set height?
        if ($(this).data().heightMultiplier) {
          setHeight.call(this);
        }

        // set content. default: set element source
        if (options.setSourceMode) {
          source = options.getSource($(this));
          if (source && this.getAttribute('src') !== source) {
            this.setAttribute('src', source);
            if (typeof callback === 'function') callback.call(this);
          }
        } else {
          if (typeof callback === 'function') callback.call(this);
        }
      });
    }

    /**
     * Remove even handler from elements
     */
    function unbindLoader() {
      $elements.off('laziestloader');
    }

    /**
     * Find the best sized image, opting for larger over smaller
     * 
     * @param  {Number} targetWidth element width
     * @param  {Array} widths      available sizes
     * @return {Number}
     */
    function bestFit(targetWidth, widths) {
      var selectedWidth = widths[widths.length - 1],
          i = widths.length; 
      while (i--) {
        if (targetWidth <= widths[i]) {
            selectedWidth = widths[i];
        }
      }

      return selectedWidth;
    }

    /**
     * Cycle through elements that haven't had their 
     * source set and, if they're in the viewport within
     * the threshold, load their media
     */
    function laziestloader() {
      var $inview = $elements.not($loaded).filter(function() {
        var $el = $(this);
        var th = options.threshold;
        if ($el.is(':hidden')) return;

        var wt = $w.scrollTop(),
            wb = wt + $w.height(),
            et = $el.offset().top,
            eb = et + $el.height();

        return eb >= wt - th && et <= wb + th;
      });

      $inview.trigger('laziestloader');
      $loaded.add($inview);
    }


    function setHeight() {
      var $el = $(this);
      var data = $el.data();
      var height;
      if (data.heightMultiplier) {
        height = Math.round( $el.width() * data.heightMultiplier );
        $el.css({
          height: height
        });
      }
    }

    // set element dimensions?
    $elements.each(setHeight);

    bindLoader();
    $w.scroll(laziestloader);

    // reset state on resize
    $w.resize(function(){
      $loaded = $();
      unbindLoader();
      bindLoader();
      laziestloader();
    });

    laziestloader();

    return this;
  };

  $.fn.laziestloader = $.fn.laziestLoader = $.fn.LaziestLoader = laziestLoader;

})(window.jQuery || window.Zepto);
