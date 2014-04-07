#LaziestLoader
###A responsive-aware jQuery plugin to smartly lazy load images and other elements.

Speed up page load times by delaying the load of images and other elements until they enter -- or are about to enter -- the viewport. You can specify an single image source, or a range of source images for responsive applications. Additionally, the source can dynamically change on browser resize.

This project is based heavily on Luís Almeida's [unveil] (http://luis-almeida.github.com/unveil/).

###Demo
Visit the [project page](http://sjwilliams.github.io/laziestloader/) to see responsive and non-responsive image examples, and examples using videos, iframes and customized behavior.

####Usage

#####1. Non-responsive
Use a placeholder image in the src attribute - something to be displayed while the original image loads - and include the actual image source in a "data-src" attribute.
If you want to serve high-resolution images to devices with retina displays, you just have to include the source for those images in a "data-src-retina" attribute.
You don't need to include a "data-src-retina" attribute in all the image tags, laziestloader is smart enough to fallback to "data-src" or even do nothing in case there isn't any "data-src" specified.
```html
<img src="transparent.gif" data-src="img1.jpg">
<img src="transparent.gif" data-src="img2.jpg" data-src-retina="img2-retina.jpg">
```
If you care about users without javascript enabled, you can include the original image inside a ```noscript``` tag:
```html
<noscript>
  <img src="img1.jpg" />
</noscript>
```
Run the script on document ready:
```javascript
$(document).ready(function() {
  $("img").laziestloader();
});
```
#####2a. Responsive, by file width
If you have different versions of your image with the width as part of the image name or path, you can specify an array of sizes that correspond to the available files.

```html
<img src="transparent.gif" data-pattern="path/to/yourimages/image-{{size}}.jpg" data-pattern-retina="path/to/yourimages/image-{{size}}@2x.jpg" data-widths="[320, 640, 900, 1564]">
<img src="transparent.gif" data-pattern="path/to/yourimages/{{size}}/image.jpg" data-pattern-retina="path/to/yourimages/{{size}}/image@2x.jpg" data-widths="[320, 640, 900, 1564]">
```
```javascript
$("img").laziestloader();
```

The result would be along these lines:
```html
<img src="path/to/yourimages/image-900.jpg">
<img src="path/to/yourimages/900/image.jpg">
```

#####2b. Responsive, by file slug
If you have different versions of your image with width represented by a slug, you can specify an array of sizes and corresponding slugs.
```html
<img src="transparent.gif" 
	data-pattern="path/to/yourimages/image-{{size}}.jpg"
	data-widths='[{"size":1024,"slug":"big"}, {"size":2000,"slug":"huge"}]'>
```
```javascript
$("img").laziestloader();
```

The result would be one of these:
```html
<img src="path/to/yourimages/image-big.jpg">
<img src="path/to/yourimages/image-huge.jpg">
```

#####3. Custom
Need fancier logic to determine the source path? You can write your own `getSource` method in the options object.
```html
<img src="transparent.gif">
```
```javascript
$("img").laziestloader({
	getSource: function($el) {
	    var width = $el.width();
	    var height = Math.round(width * 0.5625);
	    return 'http://placekitten.com/'+width+'/'+height;
	}
});
```
####Set Element Height
Often in responsive applications it's useful to set the height of an element before the source is loaded so the element will pre-fill the correct amount of space. If the `data-ratio` attribute contains a number, the element will have its CSS height set to the width of the element multiplied by the `data-ratio`.
```html
<img src="transparent.gif" data-src="img1.jpg" data-ratio="0.5625">
```
```javascript
$("img").laziestloader();
```

###Callback
As a second parameter you can specify a callback function that will fire after an element as been loaded.
Inside the callback function ```this``` refers to the element's DOM node.
```css
img {
  opacity: 0;
  transition: opacity .3s ease-in;
}
```
```javascript
$("img").laziestloader({}, function() {
	this.style.opacity = 1;
});
```

### Options
In addition to the "Custom" `getSource` example above, there are other optional behaviors that can be configured in the options object.

####threshold
By default, images are only loaded when the user scrolls to them and they became visible on the screen.
If you want your images to load earlier than that, lets say 200px before they appear on the screen, specify the threshold in the options object.
```javascript
$("img").laziestloader({threshold: 200});
```

####scrollThrottle
To increase performance, the position of lazy loading elements are only checked every 250ms while scrolling. If you need to perform the check more often, lower the number. If scroll performance is an issue -- likely if there are lots of elements -- increase the number.
```javascript
$("img").laziestloader({scrollThrottle: 300});
```

####sizeOffsetPercent
The crop selection logic works by picking the image that is greater than or equal to the size of the current element. If you prefer to scale smaller images into larger elements, set this between 0 and 100, where the value is the percent width of the containing element you want to subtract from the math logic. The bigger the number, the smaller the image that'll be selected.
```javascript
$("img").laziestloader({sizeOffsetPercent: 10});
```

####sizePattern
The regular expression used to search your string, to be replaced by the width number or slug. The default is `/{{SIZE}}/ig`, which finds the string `size`, regardless of case, inside of '{' style double brackets. Example: `/path/name-{{size}}.jpg`. Changing this option is useful if, for example, you have Mustache-style templates rendered on the server that would also match the default laziestloader.js pattern and be rendered blank before our client code runs. Many characters have special meaning and can't be used. A nice alternal pattern is:
```javascript
$("img").laziestloader({sizePattern: /%size%/ig});
```

#####setSourceMode
In most cases, the plugin needs to set the source attribute of the element. If you want to use the plugin in ways that don't involve simply setting a source attribute, set `setSourceMode` to false and use the callback to completely manage the behavior of the element on trigger.

```html
<div><p>Replace me</p></div>
```
```js
$('div').laziestloader({
    setSourceMode: false
}, function(){
    $(this).html('<p>New content</p>')
});
```

###Trigger
You can trigger element loading whenever you need, without needed to scroll the element into view.
```javascript
$("img").trigger("laziestloader");
```

## Release History
*0.1.3*

* Added a scrollThrottle option, and set a reasonable default. See [Issue 5](https://github.com/sjwilliams/laziestloader/issues/5). 
* Changed data-height-multiplier to data-ratio, and deprecated original. See [Issue 6](https://github.com/sjwilliams/laziestloader/issues/6).

*0.1.2*

* Fixed [Issue 1](https://github.com/sjwilliams/laziestloader/issues/1), bug with non-sorted input. 

*0.1.1*

* Added `sizePattern` option.

*0.1.0*

* Added `sizeOffsetPercent` option.

*0.0.2*

* AMD module
* Enforce style with .editorconfig, .jshintrc and .jsbeautifyrc

*0.0.1*

* Initial release.

###License
LaziestLoader is licensed under the [MIT license](http://opensource.org/licenses/MIT).
