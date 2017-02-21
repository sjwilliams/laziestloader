/**
* @preserve SlothyLoader - v1.0.0 - 2017-02-21
* @preserve LaziestLoader - v0.7.3 - 2016-01-03
* An lazy loader based on Josh Williams’s
* LaziestLoader, but without jQuery dependency
* See: http://sjwilliams.github.io/laziestloader/
* Copyright (c) 2016 Josh Williams; Licensed MIT
*/

var slothyLoader = function(options, callback) {

  var slothyloaderEv = new CustomEvent('slothyloader');

  var $elements = null,
    $loaded = [], // elements with the correct source set
    retina = window.devicePixelRatio > 1,
    retina3x = window.devicePixelRatio > 2,
    didScroll = false;

  var defaultOptions = {
    selector: '.dvz-lazy',
    threshold: 0,
    sizePattern: /{{SIZE}}/ig,
    getSource: getSource,
    event: 'scroll',
    scrollThrottle: 250, // time in ms to throttle scroll. Increase for better performance.
    sizeOffsetPercent: 0, // Subtract this % of width from the containing element, and fit images as though the element were that size. 0 = fit to element size; 40 = size - 40%; -30 = size + 30%
    setSourceMode: true // plugin sets source attribute of the element. Set to false if you would like to, instead, use the callback to completely manage the element on trigger.
  }

  if (typeof options === 'undefined') options = {}
  for (var x in defaultOptions) {
      if (typeof defaultOptions[x] !== 'undefined' && typeof options[x] == 'undefined') {
          options[x] = defaultOptions[x]
      }
  }

  $elements = document.querySelectorAll(options["selector"])

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
   * @param  {Element} $el
   * @return {String}
   */

  function getSource($el) {
    var source, slug;
    var data = $el.dataset;
    if (data.pattern && data.widths && Array.isArray(JSON.parse(data.widths))) {
      source = retina3x ? data.patternRetina3x : retina ? data.patternRetina : data.pattern;
      source = source || data.patternRetina || data.pattern;

      var parsedWidths = JSON.parse(data.widths)
      // width or slug version?
      if (typeof parsedWidths[0] === 'object') {
        slug = (function() {
          var widths = parsedWidths.map(function(val) {
            return val.size;
          });

          var bestFitWidth = bestFit($el.offsetWidth, widths);

          // match best width back to its corresponding slug
          for (var i = parsedWidths.length - 1; i >= 0; i--) {
            if (parsedWidths[i].size === bestFitWidth) {
              return parsedWidths[i].slug;
            }
          }
        })();

        source = source.replace(options.sizePattern, slug);
      } else {
        source = source.replace(options.sizePattern, bestFit($el.offsetWidth, parsedWidths));
      }
    } else {
      source = retina3x ? data.srcRetina3x : retina ? data.srcRetina : data.src;
      source = source || data.src;
    }

    return source;
  }

  /**
   * Reflect loaded state in class names
   * and fire event.
   *
   * @param  {Element} $el
   */

  function onLoad($el) {
    addClass($el, 'll-loaded')
    removeClass($el, 'll-notloaded');

    if (typeof callback === 'function') {
      callback.call($el);
    }
  }

  /**
   * Event listener
   *
   * @param  {Event} $e
   */

  function slEvListener (e) {
      var $el = this;
      var source;

      // set height?
      if ($el.dataset.ratio) {
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
      addClass($el, 'll-loadstarted');

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
  }

  /**
   * Attach event handler that sets correct
   * media source for the elements' width, or
   * allows callback to manipulate element
   * exclusively.
   */

  function bindLoader() {
    for (var i = 0; i < $elements.length; ++i) {
      var el = $elements[i];
      el.addEventListener('slothyloader', slEvListener)
    }
  }

  /**
   * Remove event handler from elements
   */

  function unbindLoader() {
    for (var i = 0; i < $elements.length; ++i) {
      var el = $elements[i];
      el.removeEventListener('slothyloader', slEvListener);
    }
  }

  /**
   * Find the best sized image, opting for larger over smaller
   *
   * @param  {Number} targetWidth   element width
   * @param  {Array} widths         array of numbers
   * @return {Number}
   */

  var bestFit = slothyLoader.bestFit = function(targetWidth, widths) {
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

  function slothyloader() {
    var docEl = document.documentElement;
    var wHeight = window.innerHeight || docEl.clientHeight;
    var wWidth = window.innerWidth || docEl.clientWidth;
    var threshold = options.threshold;

    var $inview = [];
    for (var i = 0; i < $elements.length; ++i) {
      var el = $elements[i];
      if (includesElement($loaded,el)) continue // If already loaded, ignore
      var rect = el.getBoundingClientRect();

      if (
        rect.bottom + threshold > 0 &&
        rect.right + threshold > 0 &&
        rect.left < wWidth + threshold &&
        rect.top < wHeight + threshold
      ) $inview.push(el);
    }

    for (var i = 0; i < $inview.length; ++i) {
      var inviewEl = $inview[i];
      inviewEl.dispatchEvent(slothyloaderEv)
      $loaded.push(inviewEl)
    }
  }

  /**
   * Given a lazy element, check if it should have
   * its height set based on a data-ratio multiplier.
   */
  function setHeight() {
    var $el = this,
      data = $el.dataset;

    data.ratio = data.ratio || data.heightMultiplier; // backwards compatible for old data-height-multiplier code.

    if (data.ratio && !isNaN(+data.ratio)) {
      var newHeight = Math.round($el.offsetWidth * +data.ratio)
      if (newHeight > 0) $el.style.height = newHeight + "px" // avoid 0 offsetWidth when element is display none (different from jQuery)
    }
  }

  // add inital state classes, and check if
  // element dimensions need to be set.

  for (var i = 0; i < $elements.length; ++i) {
    var el = $elements[i];
    addClass(el, 'll-init ll-notloaded')
    setHeight.call(el);
  }

  // initial binding

  bindLoader();

  // Watch either native scroll events, throttled by
  // options.scrollThrottle, or a custom event that
  // implements its own throttling.

  if (useNativeScroll) {
    window.addEventListener("scroll", function(){
      didScroll = true;
    });

    setInterval(function() {
      if (didScroll) {
        didScroll = false;
        slothyloader();
      }
    }, options.scrollThrottle);

  } else {

    if (typeof options.event === 'function') {
      options.event(slothyloader);
    } else {
      window.on(options.event, function(){
        slothyloader();
      });
    }

  }

  // Helpful native HTML functions for class manipulation to replace jQuery equivalents

  function hasClass(el, className) {
      var classList = className.split(" ")
      for (var i=0; i<classList.length; i++) {
          var className = classList[i]
          if (typeof el.classList !== 'undefined')
              return el.classList.contains(className)
          else
              return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
      }
  }

  function addClass(el, className) {
      var classList = className.split(" ")
      for (var i=0; i<classList.length; i++) {
          var className = classList[i]
          if (typeof el.classList !== 'undefined') {
             el.classList.add(className)
          } else {
             if (!hasClass(el, className)) el.className += " " + className
          }
      }
  }

  function removeClass(el, className) {
      var classList = className.split(" ")
      for (var i=0; i<classList.length; i++) {
          var className = classList[i]
          if (typeof el.classList !== 'undefined')
              el.classList.remove(className)
          else if (hasClass(el, className)) {
              var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
              el.className=el.className.replace(reg, ' ')
          }
      }
  }

  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  function includesElement(nodeList, searchElement, fromIndex) {

      // 1. Let O be ? ToObject(this value).
      if (nodeList == null) {
        throw new TypeError('"nodeList" is null or not defined');
      }

      var o = Object(nodeList);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        // c. Increase k by 1.
        // NOTE: === provides the correct "SameValueZero" comparison needed here.
        if (o[k] === searchElement) {
          return true;
        }
        k++;
      }

      // 8. Return false
      return false;
  }

  // reset state on resize
  window.addEventListener('resize', function() {
    $loaded = [];
    unbindLoader();
    bindLoader();
    slothyloader();
  });

  // initial check for lazy images
  document.addEventListener('DOMContentLoaded', function() {
    slothyloader();
  });

  return this;
};

// CustomEvent is to provide support for Event in Internet Explorer

(function () {

  if ( typeof window.CustomEvent === "function" ) return false;

  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

if (typeof module !== 'undefined') module.exports = slothyLoader
