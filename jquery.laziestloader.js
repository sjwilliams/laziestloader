/**
 * @preserve LaziestLoader - v0.7.3 - 2016-01-03
 * A responsive lazy loader for jQuery.
 * http://sjwilliams.github.io/laziestloader/
 * Copyright (c) 2016 Josh Williams; Licensed MIT
 */

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }
}(function($) {

  var laziestLoader = function(options, callback) {

    var $w = $(window),
      $elements = this,
      $loaded = $(), // elements with the correct source set
      retina = window.devicePixelRatio > 1,
      didScroll = false;

    options = $.extend(true, {
      threshold: 0,
      sizePattern: /{{SIZE}}/ig,
      getSource: getSource,
      event: 'scroll',
      scrollThrottle: 250, // time in ms to throttle scroll. Increase for better performance.
      sizeOffsetPercent: 0, // Subtract this % of width from the containing element, and fit images as though the element were that size. 0 = fit to element size; 40 = size - 40%; -30 = size + 30%
      setSourceMode: true // plugin sets source attribute of the element. Set to false if you would like to, instead, use the callback to completely manage the element on trigger.
    }, options);


    var useNativeScroll = (typeof options.event === 'string') && (options.event.indexOf('scroll') === 0);

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
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-widths="[320, 640, 970]">
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-pattern-retina="path/toyourimage-{{size}}@2x.jpg" data-widths="[320, 640, 970]">
     * <img data-pattern="path/toyourimage/{{size}}/slug.jpg" data-pattern-retina="path/toyourimage/{{size}}/slug@2x.jpg" data-widths="[320, 640, 970]">
     *
     * Range of sizes, with slugs: specify a string path with a {{size}} that
     * will be replaced by a slug representing an image size.
     * Eg:
     *
     * <img data-pattern="path/toyourimage-{{size}}.jpg" data-widths="[{width: 320, slug: 'small'},{width:900, slug: 'large'}]">
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
            var widths = $.map(data.widths, function(val) {
              return val.size;
            });

            var bestFitWidth = bestFit($el.width(), widths);

            // match best width back to its corresponding slug
            for (var i = data.widths.length - 1; i >= 0; i--) {
              if (data.widths[i].size === bestFitWidth) {
                return data.widths[i].slug;
              }
            }
          })();

          source = source.replace(options.sizePattern, slug);
        } else {
          source = source.replace(options.sizePattern, bestFit($el.width(), data.widths));
        }
      } else {
        source = retina ? data.srcRetina : data.src;
        source = source || data.src;
      }

      return source;
    }

    /**
     * Reflect loaded state in class names
     * and fire event.
     *
     * @param  {jQuery Object} $el
     */
    function onLoad($el) {
      $el.addClass('ll-loaded').removeClass('ll-notloaded');
      $el.trigger('loaded');

      if (typeof callback === 'function') {
        callback.call($el);
      }
    }

    /**
     * Attach event handler that sets correct
     * media source for the elements' width, or
     * allows callback to manipulate element
     * exclusively.
     */

    function bindLoader() {
      $elements.one('laziestloader', function() {
        var $el = $(this);
        var source;

        // set height?
        if ($el.data().ratio) {
          setHeight.call(this);
        }

        // set content. default: set element source
        if (options.setSourceMode) {
          source = options.getSource($el);
          if (source && this.getAttribute('src') !== source) {
            this.setAttribute('src', source);
          }
        }

        // applied immediately to reflect that media has started but,
        // perhaps, hasn't finished downloading.
        $el.addClass('ll-loadstarted');

        // Determine when to fire `loaded` event. Wait until
        // media is truly loaded if possible, otherwise immediately.
        if (options.setSourceMode && (this.nodeName === 'IMG' || this.nodeName === 'VIDEO' || this.nodeName === 'AUDIO') ) {
          if (this.nodeName === 'IMG') {
            this.onload = function() {
              onLoad($el);
            };
          } else {
            this.onloadstart = function() {
              onLoad($el);
            };
          }
        } else {
          onLoad($el);
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
     * @param  {Number} targetWidth   element width
     * @param  {Array} widths         array of numbers
     * @return {Number}
     */

    var bestFit = laziestLoader.bestFit = function(targetWidth, widths) {
      var selectedWidth = widths[widths.length - 1],
        i = widths.length,
        offset = targetWidth * (options.sizeOffsetPercent / 100);

      // sort smallest to largest
      widths.sort(function(a, b) {
        return a - b;
      });

      while (i--) {
        if ((targetWidth - offset) <= widths[i]) {
          selectedWidth = widths[i];
        }
      }

      return selectedWidth;
    };

    /**
     * Cycle through elements that haven't had their
     * source set and, if they're in the viewport within
     * the threshold, load their media
     */

    function laziestloader() {
      var docEl = document.documentElement;
      var wHeight = window.innerHeight || docEl.clientHeight;
      var wWidth = window.innerWidth || docEl.clientWidth;
      var threshold = options.threshold;

      var $inview = $elements.not($loaded).filter(function() {
        if ($(this).is(':hidden')) return;
        var rect = $(this)[0].getBoundingClientRect();

        return (
          rect.bottom + threshold > 0 &&
          rect.right + threshold > 0 &&
          rect.left < wWidth + threshold &&
          rect.top < wHeight + threshold
        );
      });

      $inview.trigger('laziestloader');
      $loaded.add($inview);
    }


    /**
     * Given a lazy element, check if it should have
     * its height set based on a data-ratio multiplier.
     */
    function setHeight() {
      var $el = $(this),
        data = $el.data();

      data.ratio = data.ratio || data.heightMultiplier; // backwards compatible for old data-height-multiplier code.

      if (data.ratio) {
        $el.css({
          height: Math.round($el.width() * data.ratio)
        });
      }
    }

    // add inital state classes, and check if
    // element dimensions need to be set.
    $elements.addClass('ll-init ll-notloaded').each(setHeight);

    // initial binding
    bindLoader();


    // Watch either native scroll events, throttled by
    // options.scrollThrottle, or a custom event that
    // implements its own throttling.

    if (useNativeScroll) {
      $w.scroll(function(){
        didScroll = true;
      });

      setInterval(function() {
        if (didScroll) {
          didScroll = false;
          laziestloader();
        }
      }, options.scrollThrottle);

    } else {

      // if custom event is a function, it'll need
      // to call laziestloader() manually, like so:
      //
      //   $('.g-lazy').laziestloader({
      //    event: function(cb){
      //      // custom scroll event on nytimes.com
      //      PageManager.on('nyt:page-scroll', function(){
      //       // do something interesting if you like
      //       // and then call the passed in laziestloader();
      //       cb();
      //     });
      //    }
      //  });
      //
      //
      // Otherwise, it's a string representing an event on the
      // window to subscribe to, like so:
      //
      // // some code dispatching throttled events
      // $window.trigger('nytg-scroll');
      //
      // $('.g-lazy').laziestloader({
      //   event: 'nytg-scroll'
      // });
      //

      if (typeof options.event === 'function') {
        options.event(laziestloader);
      } else {
        $w.on(options.event, function(){
          laziestloader();
        });
      }
    }



    // reset state on resize
    $w.resize(function() {
      $loaded = $();
      unbindLoader();
      bindLoader();
      laziestloader();
    });

    // initial check for lazy images
    $(document).ready(function() {
      laziestloader();
    });

    return this;
  };

  $.fn.laziestloader = laziestLoader;

}));
