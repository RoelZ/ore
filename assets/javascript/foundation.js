'use strict';

window.whatInput = function () {

  'use strict';

  /*
    ---------------
    variables
    ---------------
  */

  // array of actively pressed keys

  var activeKeys = [];

  // cache document.body
  var body;

  // boolean: true if touch buffer timer is running
  var buffer = false;

  // the last used input type
  var currentInput = null;

  // `input` types that don't accept text
  var nonTypingInputs = ['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit'];

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  var mouseWheel = detectWheel();

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  var ignoreMap = [16, // shift
  17, // control
  18, // alt
  91, // Windows key / left Apple cmd
  93 // Windows menu / right Apple cmd
  ];

  // mapping of events to input types
  var inputMap = {
    'keydown': 'keyboard',
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  };

  // add correct mouse wheel event mapping to `inputMap`
  inputMap[detectWheel()] = 'mouse';

  // array of all used input types
  var inputTypes = [];

  // mapping of key codes to a common name
  var keyMap = {
    9: 'tab',
    13: 'enter',
    16: 'shift',
    27: 'esc',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };

  // map of IE 10 pointer events
  var pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  // touch buffer timer
  var timer;

  /*
    ---------------
    functions
    ---------------
  */

  // allows events that are also triggered to be filtered out for `touchstart`
  function eventBuffer() {
    clearTimer();
    setInput(event);

    buffer = true;
    timer = window.setTimeout(function () {
      buffer = false;
    }, 650);
  }

  function bufferedEvent(event) {
    if (!buffer) setInput(event);
  }

  function unBufferedEvent(event) {
    clearTimer();
    setInput(event);
  }

  function clearTimer() {
    window.clearTimeout(timer);
  }

  function setInput(event) {
    var eventKey = key(event);
    var value = inputMap[event.type];
    if (value === 'pointer') value = pointerType(event);

    // don't do anything if the value matches the input type already set
    if (currentInput !== value) {
      var eventTarget = target(event);
      var eventTargetNode = eventTarget.nodeName.toLowerCase();
      var eventTargetType = eventTargetNode === 'input' ? eventTarget.getAttribute('type') : null;

      if ( // only if the user flag to allow typing in form fields isn't set
      !body.hasAttribute('data-whatinput-formtyping') &&

      // only if currentInput has a value
      currentInput &&

      // only if the input is `keyboard`
      value === 'keyboard' &&

      // not if the key is `TAB`
      keyMap[eventKey] !== 'tab' && (

      // only if the target is a form input that accepts text
      eventTargetNode === 'textarea' || eventTargetNode === 'select' || eventTargetNode === 'input' && nonTypingInputs.indexOf(eventTargetType) < 0) ||
      // ignore modifier keys
      ignoreMap.indexOf(eventKey) > -1) {
        // ignore keyboard typing
      } else {
        switchInput(value);
      }
    }

    if (value === 'keyboard') logKeys(eventKey);
  }

  function switchInput(string) {
    currentInput = string;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }

  function key(event) {
    return event.keyCode ? event.keyCode : event.which;
  }

  function target(event) {
    return event.target || event.srcElement;
  }

  function pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType];
    } else {
      return event.pointerType === 'pen' ? 'touch' : event.pointerType; // treat pen like touch
    }
  }

  // keyboard logging
  function logKeys(eventKey) {
    if (activeKeys.indexOf(keyMap[eventKey]) === -1 && keyMap[eventKey]) activeKeys.push(keyMap[eventKey]);
  }

  function unLogKeys(event) {
    var eventKey = key(event);
    var arrayPos = activeKeys.indexOf(keyMap[eventKey]);

    if (arrayPos !== -1) activeKeys.splice(arrayPos, 1);
  }

  function bindEvents() {
    body = document.body;

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      body.addEventListener('pointerdown', bufferedEvent);
      body.addEventListener('pointermove', bufferedEvent);
    } else if (window.MSPointerEvent) {
      body.addEventListener('MSPointerDown', bufferedEvent);
      body.addEventListener('MSPointerMove', bufferedEvent);
    } else {

      // mouse events
      body.addEventListener('mousedown', bufferedEvent);
      body.addEventListener('mousemove', bufferedEvent);

      // touch events
      if ('ontouchstart' in window) {
        body.addEventListener('touchstart', eventBuffer);
      }
    }

    // mouse wheel
    body.addEventListener(mouseWheel, bufferedEvent);

    // keyboard events
    body.addEventListener('keydown', unBufferedEvent);
    body.addEventListener('keyup', unBufferedEvent);
    document.addEventListener('keyup', unLogKeys);
  }

  /*
    ---------------
    utilities
    ---------------
  */

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  function detectWheel() {
    return mouseWheel = 'onwheel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"

    document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
    'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
  }

  /*
    ---------------
    init
      don't start script unless browser cuts the mustard,
    also passes if polyfills are used
    ---------------
  */

  if ('addEventListener' in window && Array.prototype.indexOf) {

    // if the dom is already ready already (script was placed at bottom of <body>)
    if (document.body) {
      bindEvents();

      // otherwise wait for the dom to load (script was placed in the <head>)
    } else {
      document.addEventListener('DOMContentLoaded', bindEvents);
    }
  }

  /*
    ---------------
    api
    ---------------
  */

  return {

    // returns string: the current input type
    ask: function () {
      return currentInput;
    },

    // returns array: currently pressed keys
    keys: function () {
      return activeKeys;
    },

    // returns array: all the detected input types
    types: function () {
      return inputTypes;
    },

    // accepts string: manually set the input type
    set: switchInput
  };
}();
;'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.2.2';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if (/true/.test(str)) return true;else if (/false/.test(str)) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();
      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;
      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    function move(ts) {
      if (!start) start = window.performance.now();
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length <= 1 || arguments[1] === undefined ? 'zf' : arguments[1];

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('a:first').attr('tabindex', 0);

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-expanded': false,
            'aria-label': $item.children('a:first').text()
          });

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'aria-hidden': true,
            'role': 'menu'
          });
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var items = menu.find('li').removeAttr('tabindex'),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('*').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        cb();
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      if (this.complete) {
        singleImageLoaded();
      } else if (typeof this.naturalWidth !== 'undefined' && this.naturalWidth > 0) {
        singleImageLoaded();
      } else {
        $(this).one('load', function () {
          singleImageLoaded();
        });
      }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

		$.spotSwipe = {
				version: '1.0.0',
				enabled: 'ontouchstart' in document.documentElement,
				preventDefault: false,
				moveThreshold: 75,
				timeThreshold: 200
		};

		var startPosX,
		    startPosY,
		    startTime,
		    elapsedTime,
		    isMoving = false;

		function onTouchEnd() {
				//  alert(this);
				this.removeEventListener('touchmove', onTouchMove);
				this.removeEventListener('touchend', onTouchEnd);
				isMoving = false;
		}

		function onTouchMove(e) {
				if ($.spotSwipe.preventDefault) {
						e.preventDefault();
				}
				if (isMoving) {
						var x = e.touches[0].pageX;
						var y = e.touches[0].pageY;
						var dx = startPosX - x;
						var dy = startPosY - y;
						var dir;
						elapsedTime = new Date().getTime() - startTime;
						if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
								dir = dx > 0 ? 'left' : 'right';
						}
						// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
						//   dir = dy > 0 ? 'down' : 'up';
						// }
						if (dir) {
								e.preventDefault();
								onTouchEnd.call(this);
								$(this).trigger('swipe', dir).trigger('swipe' + dir);
						}
				}
		}

		function onTouchStart(e) {
				if (e.touches.length == 1) {
						startPosX = e.touches[0].pageX;
						startPosY = e.touches[0].pageY;
						isMoving = true;
						startTime = new Date().getTime();
						this.addEventListener('touchmove', onTouchMove, false);
						this.addEventListener('touchend', onTouchEnd, false);
				}
		}

		function init() {
				this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
		}

		function teardown() {
				this.removeEventListener('touchstart', onTouchStart);
		}

		$.event.special.swipe = { setup: init };

		$.each(['left', 'up', 'down', 'right'], function () {
				$.event.special['swipe' + this] = { setup: function () {
								$(this).on('swipe', $.noop);
						} };
		});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
		$.fn.addTouch = function () {
				this.each(function (i, el) {
						$(el).bind('touchstart touchmove touchend touchcancel', function () {
								//we pass the original event object because the jQuery event
								//object is normalized to w3c specs and does not provide the TouchList
								handleTouch(event);
						});
				});

				var handleTouch = function (event) {
						var touches = event.changedTouches,
						    first = touches[0],
						    eventTypes = {
								touchstart: 'mousedown',
								touchmove: 'mousemove',
								touchend: 'mouseup'
						},
						    type = eventTypes[event.type],
						    simulatedEvent;

						if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
								simulatedEvent = new window.MouseEvent(type, {
										'bubbles': true,
										'cancelable': true,
										'screenX': first.screenX,
										'screenY': first.screenY,
										'clientX': first.clientX,
										'clientY': first.clientY
								});
						} else {
								simulatedEvent = document.createEvent('MouseEvent');
								simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
						}
						first.target.dispatchEvent(simulatedEvent);
				};
		};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    triggers($(this), 'toggle');
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).load(function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);
      //trigger the event handler for the element depending on type
      switch ($target.attr("data-events")) {

        case "resize":
          $target.triggerHandler('resizeme.zf.trigger', [$target]);
          break;

        case "scroll":
          $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          break;

        // case "mutate" :
        // console.log('mutate', $target);
        // $target.triggerHandler('mutate.zf.trigger');
        //
        // //make sure we don't get stuck in an infinite loop from sloppy codeing
        // if ($target.index('[data-mutate]') == $("[data-mutate]").length-1) {
        //   domMutationObserver();
        // }
        // break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, (or coming soon mutation) add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: false, characterData: false, subtree: false, attributeFilter: ["data-events"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  var Abide = function () {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Abide(element) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _classCallCheck(this, Abide);

      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */


    _createClass(Abide, [{
      key: '_init',
      value: function _init() {
        this.$inputs = this.$element.find('input, textarea, select');

        this._events();
      }

      /**
       * Initializes events for Abide.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        this.$element.off('.abide').on('reset.zf.abide', function () {
          _this2.resetForm();
        }).on('submit.zf.abide', function () {
          return _this2.validateForm();
        });

        if (this.options.validateOn === 'fieldChange') {
          this.$inputs.off('change.zf.abide').on('change.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.liveValidate) {
          this.$inputs.off('input.zf.abide').on('input.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }
      }

      /**
       * Calls necessary functions to update Abide upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        this._init();
      }

      /**
       * Checks whether or not a form element has the required attribute and if it's checked or not
       * @param {Object} element - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'requiredCheck',
      value: function requiredCheck($el) {
        if (!$el.attr('required')) return true;

        var isGood = true;

        switch ($el[0].type) {
          case 'checkbox':
            isGood = $el[0].checked;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            var opt = $el.find('option:selected');
            if (!opt.length || !opt.val()) isGood = false;
            break;

          default:
            if (!$el.val() || !$el.val().length) isGood = false;
        }

        return isGood;
      }

      /**
       * Based on $el, get the first element with selector in this order:
       * 1. The element's direct sibling('s).
       * 3. The element's parent's children.
       *
       * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
       *
       * @param {Object} $el - jQuery object to use as reference to find the form error selector.
       * @returns {Object} jQuery object with the selector.
       */

    }, {
      key: 'findFormError',
      value: function findFormError($el) {
        var $error = $el.siblings(this.options.formErrorSelector);

        if (!$error.length) {
          $error = $el.parent().find(this.options.formErrorSelector);
        }

        return $error;
      }

      /**
       * Get the first element in this order:
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findLabel',
      value: function findLabel($el) {
        var id = $el[0].id;
        var $label = this.$element.find('label[for="' + id + '"]');

        if (!$label.length) {
          return $el.closest('label');
        }

        return $label;
      }

      /**
       * Get the set of labels associated with a set of radio els in this order
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findRadioLabels',
      value: function findRadioLabels($els) {
        var _this3 = this;

        var labels = $els.map(function (i, el) {
          var id = el.id;
          var $label = _this3.$element.find('label[for="' + id + '"]');

          if (!$label.length) {
            $label = $(el).closest('label');
          }
          return $label[0];
        });

        return $(labels);
      }

      /**
       * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
       * @param {Object} $el - jQuery object to add the class to
       */

    }, {
      key: 'addErrorClasses',
      value: function addErrorClasses($el) {
        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.addClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.addClass(this.options.formErrorClass);
        }

        $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
      }

      /**
       * Remove CSS error classes etc from an entire radio button group
       * @param {String} groupName - A string that specifies the name of a radio button group
       *
       */

    }, {
      key: 'removeRadioErrorClasses',
      value: function removeRadioErrorClasses(groupName) {
        var $els = this.$element.find(':radio[name="' + groupName + '"]');
        var $labels = this.findRadioLabels($els);
        var $formErrors = this.findFormError($els);

        if ($labels.length) {
          $labels.removeClass(this.options.labelErrorClass);
        }

        if ($formErrors.length) {
          $formErrors.removeClass(this.options.formErrorClass);
        }

        $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Removes CSS error class as specified by the Abide settings from the label, input, and the form
       * @param {Object} $el - jQuery object to remove the class from
       */

    }, {
      key: 'removeErrorClasses',
      value: function removeErrorClasses($el) {
        // radios need to clear all of the els
        if ($el[0].type == 'radio') {
          return this.removeRadioErrorClasses($el.attr('name'));
        }

        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.removeClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.removeClass(this.options.formErrorClass);
        }

        $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Goes through a form to find inputs and proceeds to validate them in ways specific to their type
       * @fires Abide#invalid
       * @fires Abide#valid
       * @param {Object} element - jQuery object to validate, should be an HTML input
       * @returns {Boolean} goodToGo - If the input is valid or not.
       */

    }, {
      key: 'validateInput',
      value: function validateInput($el) {
        var clearRequire = this.requiredCheck($el),
            validated = false,
            customValidator = true,
            validator = $el.attr('data-validator'),
            equalTo = true;

        // don't validate ignored inputs or hidden inputs
        if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]')) {
          return true;
        }

        switch ($el[0].type) {
          case 'radio':
            validated = this.validateRadio($el.attr('name'));
            break;

          case 'checkbox':
            validated = clearRequire;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            validated = clearRequire;
            break;

          default:
            validated = this.validateText($el);
        }

        if (validator) {
          customValidator = this.matchValidation($el, validator, $el.attr('required'));
        }

        if ($el.attr('data-equalto')) {
          equalTo = this.options.validators.equalTo($el);
        }

        var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
        var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

        this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

        /**
         * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
         * Trigger includes the DOM element of the input.
         * @event Abide#valid
         * @event Abide#invalid
         */
        $el.trigger(message, [$el]);

        return goodToGo;
      }

      /**
       * Goes through a form and if there are any invalid inputs, it will display the form error element
       * @returns {Boolean} noError - true if no errors were detected...
       * @fires Abide#formvalid
       * @fires Abide#forminvalid
       */

    }, {
      key: 'validateForm',
      value: function validateForm() {
        var acc = [];
        var _this = this;

        this.$inputs.each(function () {
          acc.push(_this.validateInput($(this)));
        });

        var noError = acc.indexOf(false) === -1;

        this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

        /**
         * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
         * Trigger includes the element of the form.
         * @event Abide#formvalid
         * @event Abide#forminvalid
         */
        this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

        return noError;
      }

      /**
       * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
       * @param {Object} $el - jQuery object to validate, should be a text input HTML element
       * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
       * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
       */

    }, {
      key: 'validateText',
      value: function validateText($el, pattern) {
        // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
        pattern = pattern || $el.attr('pattern') || $el.attr('type');
        var inputText = $el.val();
        var valid = false;

        if (inputText.length) {
          // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
          if (this.options.patterns.hasOwnProperty(pattern)) {
            valid = this.options.patterns[pattern].test(inputText);
          }
          // If the pattern name isn't also the type attribute of the field, then test it as a regexp
          else if (pattern !== $el.attr('type')) {
              valid = new RegExp(pattern).test(inputText);
            } else {
              valid = true;
            }
        }
        // An empty field is valid if it's not required
        else if (!$el.prop('required')) {
            valid = true;
          }

        return valid;
      }

      /**
       * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
       * @param {String} groupName - A string that specifies the name of a radio button group
       * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
       */

    }, {
      key: 'validateRadio',
      value: function validateRadio(groupName) {
        // If at least one radio in the group has the `required` attribute, the group is considered required
        // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
        var $group = this.$element.find(':radio[name="' + groupName + '"]');
        var valid = false,
            required = false;

        // For the group to be required, at least one radio needs to be required
        $group.each(function (i, e) {
          if ($(e).attr('required')) {
            required = true;
          }
        });
        if (!required) valid = true;

        if (!valid) {
          // For the group to be valid, at least one radio needs to be checked
          $group.each(function (i, e) {
            if ($(e).prop('checked')) {
              valid = true;
            }
          });
        };

        return valid;
      }

      /**
       * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
       * @param {Object} $el - jQuery input element.
       * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
       * @param {Boolean} required - self explanatory?
       * @returns {Boolean} - true if validations passed.
       */

    }, {
      key: 'matchValidation',
      value: function matchValidation($el, validators, required) {
        var _this4 = this;

        required = required ? true : false;

        var clear = validators.split(' ').map(function (v) {
          return _this4.options.validators[v]($el, required, $el.parent());
        });
        return clear.indexOf(false) === -1;
      }

      /**
       * Resets form inputs and styles
       * @fires Abide#formreset
       */

    }, {
      key: 'resetForm',
      value: function resetForm() {
        var $form = this.$element,
            opts = this.options;

        $('.' + opts.labelErrorClass, $form).not('small').removeClass(opts.labelErrorClass);
        $('.' + opts.inputErrorClass, $form).not('small').removeClass(opts.inputErrorClass);
        $(opts.formErrorSelector + '.' + opts.formErrorClass).removeClass(opts.formErrorClass);
        $form.find('[data-abide-error]').css('display', 'none');
        $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
        $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        /**
         * Fires when the form has been reset.
         * @event Abide#formreset
         */
        $form.trigger('formreset.zf.abide', [$form]);
      }

      /**
       * Destroys an instance of Abide.
       * Removes error styles and classes from elements, without resetting their values.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        var _this = this;
        this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

        this.$inputs.off('.abide').each(function () {
          _this.removeErrorClasses($(this));
        });

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Abide;
  }();

  /**
   * Default settings for plugin
   */


  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @example 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @example 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @example 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @example '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @example 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @example false
     */
    liveValidate: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $('#' + el.attr('data-equalto')).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  var Accordion = function () {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    function Accordion(element, options) {
      _classCallCheck(this, Accordion);

      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */


    _createClass(Accordion, [{
      key: '_init',
      value: function _init() {
        this.$element.attr('role', 'tablist');
        this.$tabs = this.$element.children('li, [data-accordion-item]');

        this.$tabs.each(function (idx, el) {
          var $el = $(el),
              $content = $el.children('[data-tab-content]'),
              id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
              linkId = el.id || id + '-label';

          $el.find('a:first').attr({
            'aria-controls': id,
            'role': 'tab',
            'id': linkId,
            'aria-expanded': false,
            'aria-selected': false
          });

          $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
        });
        var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
        if ($initActive.length) {
          this.down($initActive, true);
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the accordion.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$tabs.each(function () {
          var $elem = $(this);
          var $tabContent = $elem.children('[data-tab-content]');
          if ($tabContent.length) {
            $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
              // $(this).children('a').on('click.zf.accordion', function(e) {
              e.preventDefault();
              if ($elem.hasClass('is-active')) {
                if (_this.options.allowAllClosed || $elem.siblings().hasClass('is-active')) {
                  _this.up($tabContent);
                }
              } else {
                _this.down($tabContent);
              }
            }).on('keydown.zf.accordion', function (e) {
              Foundation.Keyboard.handleKey(e, 'Accordion', {
                toggle: function () {
                  _this.toggle($tabContent);
                },
                next: function () {
                  var $a = $elem.next().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                previous: function () {
                  var $a = $elem.prev().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                handled: function () {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            });
          }
        });
      }

      /**
       * Toggles the selected content pane's open/close state.
       * @param {jQuery} $target - jQuery object of the pane to toggle.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if ($target.parent().hasClass('is-active')) {
          if (this.options.allowAllClosed || $target.parent().siblings().hasClass('is-active')) {
            this.up($target);
          } else {
            return;
          }
        } else {
          this.down($target);
        }
      }

      /**
       * Opens the accordion tab defined by `$target`.
       * @param {jQuery} $target - Accordion pane to open.
       * @param {Boolean} firstTime - flag to determine if reflow should happen.
       * @fires Accordion#down
       * @function
       */

    }, {
      key: 'down',
      value: function down($target, firstTime) {
        var _this2 = this;

        if (!this.options.multiExpand && !firstTime) {
          var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
          if ($currentActive.length) {
            this.up($currentActive);
          }
        }

        $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

        $target.slideDown(this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done opening.
           * @event Accordion#down
           */
          _this2.$element.trigger('down.zf.accordion', [$target]);
        });

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': true,
          'aria-selected': true
        });
      }

      /**
       * Closes the tab defined by `$target`.
       * @param {jQuery} $target - Accordion tab to close.
       * @fires Accordion#up
       * @function
       */

    }, {
      key: 'up',
      value: function up($target) {
        var $aunts = $target.parent().siblings(),
            _this = this;
        var canClose = this.options.multiExpand ? $aunts.hasClass('is-active') : $target.parent().hasClass('is-active');

        if (!this.options.allowAllClosed && !canClose) {
          return;
        }

        // Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done collapsing up.
           * @event Accordion#up
           */
          _this.$element.trigger('up.zf.accordion', [$target]);
        });
        // });

        $target.attr('aria-hidden', true).parent().removeClass('is-active');

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': false,
          'aria-selected': false
        });
      }

      /**
       * Destroys an instance of an accordion.
       * @fires Accordion#destroyed
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
        this.$element.find('a').off('.zf.accordion');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Accordion;
  }();

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @example false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @example false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var AccordionMenu = function () {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function AccordionMenu(element, options) {
      _classCallCheck(this, AccordionMenu);

      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */


    _createClass(AccordionMenu, [{
      key: '_init',
      value: function _init() {
        this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
        this.$element.attr({
          'role': 'tablist',
          'aria-multiselectable': this.options.multiOpen
        });

        this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
        this.$menuLinks.each(function () {
          var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
              $elem = $(this),
              $sub = $elem.children('[data-submenu]'),
              subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
              isActive = $sub.hasClass('is-active');
          $elem.attr({
            'aria-controls': subId,
            'aria-expanded': isActive,
            'role': 'tab',
            'id': linkId
          });
          $sub.attr({
            'aria-labelledby': linkId,
            'aria-hidden': !isActive,
            'role': 'tabpanel',
            'id': subId
          });
        });
        var initPanes = this.$element.find('.is-active');
        if (initPanes.length) {
          var _this = this;
          initPanes.each(function () {
            _this.down($(this));
          });
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the menu.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$element.find('li').each(function () {
          var $submenu = $(this).children('[data-submenu]');

          if ($submenu.length) {
            $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
              e.preventDefault();

              _this.toggle($submenu);
            });
          }
        }).on('keydown.zf.accordionmenu', function (e) {
          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement,
              $target = $element.children('[data-submenu]');

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

              if ($(this).children('[data-submenu]:visible').length) {
                // has open sub menu
                $nextElement = $element.find('li:first-child').find('a').first();
              }
              if ($(this).is(':first-child')) {
                // is first element of sub menu
                $prevElement = $element.parents('li').first().find('a').first();
              } else if ($prevElement.children('[data-submenu]:visible').length) {
                // if previous element has open sub menu
                $prevElement = $prevElement.find('li:last-child').find('a').first();
              }
              if ($(this).is(':last-child')) {
                // is last element of sub menu
                $nextElement = $element.parents('li').first().next('li').find('a').first();
              }

              return;
            }
          });
          Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
            open: function () {
              if ($target.is(':hidden')) {
                _this.down($target);
                $target.find('li').first().find('a').first().focus();
              }
            },
            close: function () {
              if ($target.length && !$target.is(':hidden')) {
                // close active sub of this item
                _this.up($target);
              } else if ($element.parent('[data-submenu]').length) {
                // close currently open sub
                _this.up($element.parent('[data-submenu]'));
                $element.parents('li').first().find('a').first().focus();
              }
            },
            up: function () {
              $prevElement.attr('tabindex', -1).focus();
              return true;
            },
            down: function () {
              $nextElement.attr('tabindex', -1).focus();
              return true;
            },
            toggle: function () {
              if ($element.children('[data-submenu]').length) {
                _this.toggle($element.children('[data-submenu]'));
              }
            },
            closeAll: function () {
              _this.hideAll();
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); //.attr('tabindex', 0);
      }

      /**
       * Closes all panes of the menu.
       * @function
       */

    }, {
      key: 'hideAll',
      value: function hideAll() {
        this.$element.find('[data-submenu]').slideUp(this.options.slideSpeed);
      }

      /**
       * Toggles the open/close state of a submenu.
       * @function
       * @param {jQuery} $target - the submenu to toggle
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if (!$target.is(':animated')) {
          if (!$target.is(':hidden')) {
            this.up($target);
          } else {
            this.down($target);
          }
        }
      }

      /**
       * Opens the sub-menu defined by `$target`.
       * @param {jQuery} $target - Sub-menu to open.
       * @fires AccordionMenu#down
       */

    }, {
      key: 'down',
      value: function down($target) {
        var _this = this;

        if (!this.options.multiOpen) {
          this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
        }

        $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

        //Foundation.Move(this.options.slideSpeed, $target, function() {
        $target.slideDown(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done opening.
           * @event AccordionMenu#down
           */
          _this.$element.trigger('down.zf.accordionMenu', [$target]);
        });
        //});
      }

      /**
       * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
       * @param {jQuery} $target - Sub-menu to close.
       * @fires AccordionMenu#up
       */

    }, {
      key: 'up',
      value: function up($target) {
        var _this = this;
        //Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done collapsing up.
           * @event AccordionMenu#up
           */
          _this.$element.trigger('up.zf.accordionMenu', [$target]);
        });
        //});

        var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

        $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
      }

      /**
       * Destroys an instance of accordion menu.
       * @fires AccordionMenu#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-submenu]').slideDown(0).css('display', '');
        this.$element.find('a').off('click.zf.accordionMenu');

        Foundation.Nest.Burn(this.$element, 'accordion');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return AccordionMenu;
  }();

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @example true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var Drilldown = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Drilldown(element, options) {
      _classCallCheck(this, Drilldown);

      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */


    _createClass(Drilldown, [{
      key: '_init',
      value: function _init() {
        this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
        this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
        this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');

        this._prepareMenu();

        this._keyboardEvents();
      }

      /**
       * prepares drilldown menu by setting attributes to links and elements
       * sets a min height to prevent content jumping
       * wraps the element if not already wrapped
       * @private
       * @function
       */

    }, {
      key: '_prepareMenu',
      value: function _prepareMenu() {
        var _this = this;
        // if(!this.options.holdOpen){
        //   this._menuLinkEvents();
        // }
        this.$submenuAnchors.each(function () {
          var $link = $(this);
          var $sub = $link.parent();
          if (_this.options.parentLink) {
            $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
          }
          $link.data('savedHref', $link.attr('href')).removeAttr('href');
          $link.children('[data-submenu]').attr({
            'aria-hidden': true,
            'tabindex': 0,
            'role': 'menu'
          });
          _this._events($link);
        });
        this.$submenus.each(function () {
          var $menu = $(this),
              $back = $menu.find('.js-drilldown-back');
          if (!$back.length) {
            $menu.prepend(_this.options.backButton);
          }
          _this._back($menu);
        });
        if (!this.$element.parent().hasClass('is-drilldown')) {
          this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
          this.$wrapper = this.$element.wrap(this.$wrapper).parent().css(this._getMaxDims());
        }
      }

      /**
       * Adds event handlers to elements in the menu.
       * @function
       * @private
       * @param {jQuery} $elem - the current menu item to add handlers to.
       */

    }, {
      key: '_events',
      value: function _events($elem) {
        var _this = this;

        $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }

          // if(e.target !== e.currentTarget.firstElementChild){
          //   return false;
          // }
          _this._show($elem.parent('li'));

          if (_this.options.closeOnClick) {
            var $body = $('body');
            $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
              if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
                return;
              }
              e.preventDefault();
              _this._hideAll();
              $body.off('.zf.drilldown');
            });
          }
        });
      }

      /**
       * Adds keydown event listener to `li`'s in the menu.
       * @private
       */

    }, {
      key: '_keyboardEvents',
      value: function _keyboardEvents() {
        var _this = this;

        this.$menuItems.add(this.$element.find('.js-drilldown-back > a')).on('keydown.zf.drilldown', function (e) {

          var $element = $(this),
              $elements = $element.parent('li').parent('ul').children('li').children('a'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'Drilldown', {
            next: function () {
              if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            previous: function () {
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            close: function () {
              _this._back();
              //_this.$menuItems.first().focus(); // focus to first element
            },
            open: function () {
              if (!$element.is(_this.$menuItems)) {
                // not menu item means back button
                _this._hide($element.parent('li').parent('ul'));
                $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                  setTimeout(function () {
                    $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                  }, 1);
                });
              } else if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
              }
              return true;
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); // end keyboardAccess
      }

      /**
       * Closes all open elements, and returns to root menu.
       * @function
       * @fires Drilldown#closed
       */

    }, {
      key: '_hideAll',
      value: function _hideAll() {
        var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
        $elem.one(Foundation.transitionend($elem), function (e) {
          $elem.removeClass('is-active is-closing');
        });
        /**
         * Fires when the menu is fully closed.
         * @event Drilldown#closed
         */
        this.$element.trigger('closed.zf.drilldown');
      }

      /**
       * Adds event listener for each `back` button, and closes open menus.
       * @function
       * @fires Drilldown#back
       * @param {jQuery} $elem - the current sub-menu to add `back` event.
       */

    }, {
      key: '_back',
      value: function _back($elem) {
        var _this = this;
        $elem.off('click.zf.drilldown');
        $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
          e.stopImmediatePropagation();
          // console.log('mouseup on back');
          _this._hide($elem);
        });
      }

      /**
       * Adds event listener to menu items w/o submenus to close open menus on click.
       * @function
       * @private
       */

    }, {
      key: '_menuLinkEvents',
      value: function _menuLinkEvents() {
        var _this = this;
        this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          // e.stopImmediatePropagation();
          setTimeout(function () {
            _this._hideAll();
          }, 0);
        });
      }

      /**
       * Opens a submenu.
       * @function
       * @fires Drilldown#open
       * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
       */

    }, {
      key: '_show',
      value: function _show($elem) {
        $elem.children('[data-submenu]').addClass('is-active');
        /**
         * Fires when the submenu has opened.
         * @event Drilldown#open
         */
        this.$element.trigger('open.zf.drilldown', [$elem]);
      }
    }, {
      key: '_hide',


      /**
       * Hides a submenu
       * @function
       * @fires Drilldown#hide
       * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
       */
      value: function _hide($elem) {
        var _this = this;
        $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
          $elem.removeClass('is-active is-closing');
          $elem.blur();
        });
        /**
         * Fires when the submenu has closed.
         * @event Drilldown#hide
         */
        $elem.trigger('hide.zf.drilldown', [$elem]);
      }

      /**
       * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
       * Prevents content jumping.
       * @function
       * @private
       */

    }, {
      key: '_getMaxDims',
      value: function _getMaxDims() {
        var max = 0,
            result = {};
        this.$submenus.add(this.$element).each(function () {
          var numOfElems = $(this).children('li').length;
          max = numOfElems > max ? numOfElems : max;
        });

        result['min-height'] = max * this.$menuItems[0].getBoundingClientRect().height + 'px';
        result['max-width'] = this.$element[0].getBoundingClientRect().width + 'px';

        return result;
      }

      /**
       * Destroys the Drilldown Menu
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._hideAll();
        Foundation.Nest.Burn(this.$element, 'drilldown');
        this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
        this.$submenuAnchors.each(function () {
          $(this).off('.zf.drilldown');
        });
        this.$element.find('a').each(function () {
          var $link = $(this);
          if ($link.data('savedHref')) {
            $link.attr('href', $link.data('savedHref')).removeData('savedHref');
          } else {
            return;
          }
        });
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Drilldown;
  }();

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\li><\a>Back<\/a><\/li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\div class="is-drilldown"><\/div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @example false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @example false
     */
    closeOnClick: false
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Dropdown = function () {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Dropdown(element, options) {
      _classCallCheck(this, Dropdown);

      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */


    _createClass(Dropdown, [{
      key: '_init',
      value: function _init() {
        var $id = this.$element.attr('id');

        this.$anchor = $('[data-toggle="' + $id + '"]') || $('[data-open="' + $id + '"]');
        this.$anchor.attr({
          'aria-controls': $id,
          'data-is-focus': false,
          'data-yeti-box': $id,
          'aria-haspopup': true,
          'aria-expanded': false

        });

        this.options.positionClass = this.getPositionClass();
        this.counter = 4;
        this.usedPositions = [];
        this.$element.attr({
          'aria-hidden': 'true',
          'data-yeti-box': $id,
          'data-resize': $id,
          'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
        });
        this._events();
      }

      /**
       * Helper function to determine current orientation of dropdown pane.
       * @function
       * @returns {String} position - string value of a position class.
       */

    }, {
      key: 'getPositionClass',
      value: function getPositionClass() {
        var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
        verticalPosition = verticalPosition ? verticalPosition[0] : '';
        var horizontalPosition = /float-(\S+)\s/.exec(this.$anchor[0].className);
        horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
        var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;
        return position;
      }

      /**
       * Adjusts the dropdown panes orientation by adding/removing positioning classes.
       * @function
       * @private
       * @param {String} position - position class to remove.
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');
        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.$element.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.$element.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.$element.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * Sets the position and orientation of the dropdown pane, checks for collisions.
       * Recursively calls itself if a collision is detected, with a new position class.
       * @function
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        if (this.$anchor.attr('aria-expanded') === 'false') {
          return false;
        }
        var position = this.getPositionClass(),
            $eleDims = Foundation.Box.GetDimensions(this.$element),
            $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
            _this = this,
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

        if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element)) {
          this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $eleDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          this.classChanged = true;
          return false;
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.$element, false, true) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * Adds event listeners to the element utilizing the triggers utility library.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': this._setPosition.bind(this)
        });

        if (this.options.hover) {
          this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.open();
              _this.$anchor.data('hover', true);
            }, _this.options.hoverDelay);
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
          if (this.options.hoverPane) {
            this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
              clearTimeout(_this.timeout);
            }).on('mouseleave.zf.dropdown', function () {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.close();
                _this.$anchor.data('hover', false);
              }, _this.options.hoverDelay);
            });
          }
        }
        this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

          var $target = $(this),
              visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

          Foundation.Keyboard.handleKey(e, 'Dropdown', {
            tab_forward: function () {
              if (_this.$element.find(':focus').is(visibleFocusableElements.eq(-1))) {
                // left modal downwards, setting focus to first element
                if (_this.options.trapFocus) {
                  // if focus shall be trapped
                  visibleFocusableElements.eq(0).focus();
                  e.preventDefault();
                } else {
                  // if focus is not trapped, close dropdown on focus out
                  _this.close();
                }
              }
            },
            tab_backward: function () {
              if (_this.$element.find(':focus').is(visibleFocusableElements.eq(0)) || _this.$element.is(':focus')) {
                // left modal upwards, setting focus to last element
                if (_this.options.trapFocus) {
                  // if focus shall be trapped
                  visibleFocusableElements.eq(-1).focus();
                  e.preventDefault();
                } else {
                  // if focus is not trapped, close dropdown on focus out
                  _this.close();
                }
              }
            },
            open: function () {
              if ($target.is(_this.$anchor)) {
                _this.open();
                _this.$element.attr('tabindex', -1).focus();
                e.preventDefault();
              }
            },
            close: function () {
              _this.close();
              _this.$anchor.focus();
            }
          });
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body).not(this.$element),
            _this = this;
        $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
          if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
            return;
          }
          if (_this.$element.find(e.target).length) {
            return;
          }
          _this.close();
          $body.off('click.zf.dropdown');
        });
      }

      /**
       * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
       * @function
       * @fires Dropdown#closeme
       * @fires Dropdown#show
       */

    }, {
      key: 'open',
      value: function open() {
        // var _this = this;
        /**
         * Fires to close other open dropdowns
         * @event Dropdown#closeme
         */
        this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
        this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
        // this.$element/*.show()*/;
        this._setPosition();
        this.$element.addClass('is-open').attr({ 'aria-hidden': false });

        if (this.options.autoFocus) {
          var $focusable = Foundation.Keyboard.findFocusable(this.$element);
          if ($focusable.length) {
            $focusable.eq(0).focus();
          }
        }

        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }

        /**
         * Fires once the dropdown is visible.
         * @event Dropdown#show
         */
        this.$element.trigger('show.zf.dropdown', [this.$element]);
      }

      /**
       * Closes the open dropdown pane.
       * @function
       * @fires Dropdown#hide
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.$element.hasClass('is-open')) {
          return false;
        }
        this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

        this.$anchor.removeClass('hover').attr('aria-expanded', false);

        if (this.classChanged) {
          var curPositionClass = this.getPositionClass();
          if (curPositionClass) {
            this.$element.removeClass(curPositionClass);
          }
          this.$element.addClass(this.options.positionClass)
          /*.hide()*/.css({ height: '', width: '' });
          this.classChanged = false;
          this.counter = 4;
          this.usedPositions.length = 0;
        }
        this.$element.trigger('hide.zf.dropdown', [this.$element]);
      }

      /**
       * Toggles the dropdown pane's visibility.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.$element.hasClass('is-open')) {
          if (this.$anchor.data('hover')) return;
          this.close();
        } else {
          this.open();
        }
      }

      /**
       * Destroys the dropdown.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger').hide();
        this.$anchor.off('.zf.dropdown');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Dropdown;
  }();

  Dropdown.defaults = {
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @example false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @example true
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @example false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @example true
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @example false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_events',

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function (e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($elem.children('.is-dropdown-submenu'));
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          } else {
            return;
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime);
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function () {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function () {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function () {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function () {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function () {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function () {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this.$element.hasClass(_this.options.verticalClass)) {
              // vertical menu
              if (_this.options.alignment === 'left') {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              } else {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              }
            } else {
              // horizontal menu
              $.extend(functions, {
                next: nextSibling,
                previous: prevSibling,
                down: openSub,
                up: closeSub
              });
            }
          } else {
            // not tabs -> one sub
            if (_this.options.alignment === 'left') {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').attr({ 'aria-hidden': false }).parent('li.is-dropdown-submenu-parent').addClass('is-active').attr({ 'aria-expanded': true });
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'aria-expanded': false,
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').attr({
            'aria-hidden': true
          }).removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   */

  var Equalizer = function () {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Equalizer(element, options) {
      _classCallCheck(this, Equalizer);

      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Equalizer, [{
      key: '_init',
      value: function _init() {
        var eqId = this.$element.attr('data-equalizer') || '';
        var $watched = this.$element.find('[data-equalizer-watch="' + eqId + '"]');

        this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
        this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));

        this.hasNested = this.$element.find('[data-equalizer]').length > 0;
        this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
        this.isOn = false;
        this._bindHandler = {
          onResizeMeBound: this._onResizeMe.bind(this),
          onPostEqualizedBound: this._onPostEqualized.bind(this)
        };

        var imgs = this.$element.find('img');
        var tooSmall;
        if (this.options.equalizeOn) {
          tooSmall = this._checkMQ();
          $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
        } else {
          this._events();
        }
        if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
          if (imgs.length) {
            Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
          } else {
            this._reflow();
          }
        }
      }

      /**
       * Removes event listeners if the breakpoint is too small.
       * @private
       */

    }, {
      key: '_pauseEvents',
      value: function _pauseEvents() {
        this.isOn = false;
        this.$element.off({
          '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
          'resizeme.zf.trigger': this._bindHandler.onResizeMeBound
        });
      }

      /**
       * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
       * @private
       */

    }, {
      key: '_onResizeMe',
      value: function _onResizeMe(e) {
        this._reflow();
      }

      /**
       * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
       * @private
       */

    }, {
      key: '_onPostEqualized',
      value: function _onPostEqualized(e) {
        if (e.target !== this.$element[0]) {
          this._reflow();
        }
      }

      /**
       * Initializes events for Equalizer.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this._pauseEvents();
        if (this.hasNested) {
          this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
        } else {
          this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
        }
        this.isOn = true;
      }

      /**
       * Checks the current breakpoint to the minimum required size.
       * @private
       */

    }, {
      key: '_checkMQ',
      value: function _checkMQ() {
        var tooSmall = !Foundation.MediaQuery.atLeast(this.options.equalizeOn);
        if (tooSmall) {
          if (this.isOn) {
            this._pauseEvents();
            this.$watched.css('height', 'auto');
          }
        } else {
          if (!this.isOn) {
            this._events();
          }
        }
        return tooSmall;
      }

      /**
       * A noop version for the plugin
       * @private
       */

    }, {
      key: '_killswitch',
      value: function _killswitch() {
        return;
      }

      /**
       * Calls necessary functions to update Equalizer upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        if (!this.options.equalizeOnStack) {
          if (this._isStacked()) {
            this.$watched.css('height', 'auto');
            return false;
          }
        }
        if (this.options.equalizeByRow) {
          this.getHeightsByRow(this.applyHeightByRow.bind(this));
        } else {
          this.getHeights(this.applyHeight.bind(this));
        }
      }

      /**
       * Manually determines if the first 2 elements are *NOT* stacked.
       * @private
       */

    }, {
      key: '_isStacked',
      value: function _isStacked() {
        return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} heights - An array of heights of children within Equalizer container
       */

    }, {
      key: 'getHeights',
      value: function getHeights(cb) {
        var heights = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          heights.push(this.$watched[i].offsetHeight);
        }
        cb(heights);
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       */

    }, {
      key: 'getHeightsByRow',
      value: function getHeightsByRow(cb) {
        var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
            groups = [],
            group = 0;
        //group by Row
        groups[group] = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          //maybe could use this.$watched[i].offsetTop
          var elOffsetTop = $(this.$watched[i]).offset().top;
          if (elOffsetTop != lastElTopOffset) {
            group++;
            groups[group] = [];
            lastElTopOffset = elOffsetTop;
          }
          groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
        }

        for (var j = 0, ln = groups.length; j < ln; j++) {
          var heights = $(groups[j]).map(function () {
            return this[1];
          }).get();
          var max = Math.max.apply(null, heights);
          groups[j].push(max);
        }
        cb(groups);
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest
       * @param {array} heights - An array of heights of children within Equalizer container
       * @fires Equalizer#preequalized
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeight',
      value: function applyHeight(heights) {
        var max = Math.max.apply(null, heights);
        /**
         * Fires before the heights are applied
         * @event Equalizer#preequalized
         */
        this.$element.trigger('preequalized.zf.equalizer');

        this.$watched.css('height', max);

        /**
         * Fires when the heights have been applied
         * @event Equalizer#postequalized
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
       * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       * @fires Equalizer#preequalized
       * @fires Equalizer#preequalizedRow
       * @fires Equalizer#postequalizedRow
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeightByRow',
      value: function applyHeightByRow(groups) {
        /**
         * Fires before the heights are applied
         */
        this.$element.trigger('preequalized.zf.equalizer');
        for (var i = 0, len = groups.length; i < len; i++) {
          var groupsILength = groups[i].length,
              max = groups[i][groupsILength - 1];
          if (groupsILength <= 2) {
            $(groups[i][0][0]).css({ 'height': 'auto' });
            continue;
          }
          /**
            * Fires before the heights per row are applied
            * @event Equalizer#preequalizedRow
            */
          this.$element.trigger('preequalizedrow.zf.equalizer');
          for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
            $(groups[i][j][0]).css({ 'height': max });
          }
          /**
            * Fires when the heights per row have been applied
            * @event Equalizer#postequalizedRow
            */
          this.$element.trigger('postequalizedrow.zf.equalizer');
        }
        /**
         * Fires when the heights have been applied
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Destroys an instance of Equalizer.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._pauseEvents();
        this.$watched.css('height', 'auto');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Equalizer;
  }();

  /**
   * Default settings for plugin
   */


  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @example true
     */
    equalizeOnStack: true,
    /**
     * Enable height equalization row by row.
     * @option
     * @example false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @example 'medium'
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  var Interchange = function () {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Interchange(element, options) {
      _classCallCheck(this, Interchange);

      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */


    _createClass(Interchange, [{
      key: '_init',
      value: function _init() {
        this._addBreakpoints();
        this._generateRules();
        this._reflow();
      }

      /**
       * Initializes events for Interchange.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        $(window).on('resize.zf.interchange', Foundation.util.throttle(this._reflow.bind(this), 50));
      }

      /**
       * Calls necessary functions to update Interchange upon DOM change
       * @function
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        var match;

        // Iterate through each rule, but only save the last match
        for (var i in this.rules) {
          if (this.rules.hasOwnProperty(i)) {
            var rule = this.rules[i];

            if (window.matchMedia(rule.query).matches) {
              match = rule;
            }
          }
        }

        if (match) {
          this.replace(match.path);
        }
      }

      /**
       * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
       * @function
       * @private
       */

    }, {
      key: '_addBreakpoints',
      value: function _addBreakpoints() {
        for (var i in Foundation.MediaQuery.queries) {
          if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
            var query = Foundation.MediaQuery.queries[i];
            Interchange.SPECIAL_QUERIES[query.name] = query.value;
          }
        }
      }

      /**
       * Checks the Interchange element for the provided media query + content pairings
       * @function
       * @private
       * @param {Object} element - jQuery object that is an Interchange instance
       * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
       */

    }, {
      key: '_generateRules',
      value: function _generateRules(element) {
        var rulesList = [];
        var rules;

        if (this.options.rules) {
          rules = this.options.rules;
        } else {
          rules = this.$element.data('interchange').match(/\[.*?\]/g);
        }

        for (var i in rules) {
          if (rules.hasOwnProperty(i)) {
            var rule = rules[i].slice(1, -1).split(', ');
            var path = rule.slice(0, -1).join('');
            var query = rule[rule.length - 1];

            if (Interchange.SPECIAL_QUERIES[query]) {
              query = Interchange.SPECIAL_QUERIES[query];
            }

            rulesList.push({
              path: path,
              query: query
            });
          }
        }

        this.rules = rulesList;
      }

      /**
       * Update the `src` property of an image, or change the HTML of a container, to the specified path.
       * @function
       * @param {String} path - Path to the image or HTML partial.
       * @fires Interchange#replaced
       */

    }, {
      key: 'replace',
      value: function replace(path) {
        if (this.currentPath === path) return;

        var _this = this,
            trigger = 'replaced.zf.interchange';

        // Replacing images
        if (this.$element[0].nodeName === 'IMG') {
          this.$element.attr('src', path).load(function () {
            _this.currentPath = path;
          }).trigger(trigger);
        }
        // Replacing background images
        else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
            this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
          }
          // Replacing HTML
          else {
              $.get(path, function (response) {
                _this.$element.html(response).trigger(trigger);
                $(response).foundation();
                _this.currentPath = path;
              });
            }

        /**
         * Fires when content in an Interchange element is done being loaded.
         * @event Interchange#replaced
         */
        // this.$element.trigger('replaced.zf.interchange');
      }

      /**
       * Destroys an instance of interchange.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        //TODO this.
      }
    }]);

    return Interchange;
  }();

  /**
   * Default settings for plugin
   */


  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  var Magellan = function () {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Magellan(element, options) {
      _classCallCheck(this, Magellan);

      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Magellan, [{
      key: '_init',
      value: function _init() {
        var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
        var _this = this;
        this.$targets = $('[data-magellan-target]');
        this.$links = this.$element.find('a');
        this.$element.attr({
          'data-resize': id,
          'data-scroll': id,
          'id': id
        });
        this.$active = $();
        this.scrollPos = parseInt(window.pageYOffset, 10);

        this._events();
      }

      /**
       * Calculates an array of pixel values that are the demarcation lines between locations on the page.
       * Can be invoked if new elements are added or the size of a location changes.
       * @function
       */

    }, {
      key: 'calcPoints',
      value: function calcPoints() {
        var _this = this,
            body = document.body,
            html = document.documentElement;

        this.points = [];
        this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
        this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

        this.$targets.each(function () {
          var $tar = $(this),
              pt = Math.round($tar.offset().top - _this.options.threshold);
          $tar.targetPoint = pt;
          _this.points.push(pt);
        });
      }

      /**
       * Initializes events for Magellan.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            $body = $('html, body'),
            opts = {
          duration: _this.options.animationDuration,
          easing: _this.options.animationEasing
        };
        $(window).one('load', function () {
          if (_this.options.deepLinking) {
            if (location.hash) {
              _this.scrollToLoc(location.hash);
            }
          }
          _this.calcPoints();
          _this._updateActive();
        });

        this.$element.on({
          'resizeme.zf.trigger': this.reflow.bind(this),
          'scrollme.zf.trigger': this._updateActive.bind(this)
        }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
          e.preventDefault();
          var arrival = this.getAttribute('href');
          _this.scrollToLoc(arrival);
        });
      }

      /**
       * Function to scroll to a given location on the page.
       * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
       * @function
       */

    }, {
      key: 'scrollToLoc',
      value: function scrollToLoc(loc) {
        var scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

        $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing);
      }

      /**
       * Calls necessary functions to update Magellan upon DOM change
       * @function
       */

    }, {
      key: 'reflow',
      value: function reflow() {
        this.calcPoints();
        this._updateActive();
      }

      /**
       * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
       * @private
       * @function
       * @fires Magellan#update
       */

    }, {
      key: '_updateActive',
      value: function _updateActive() /*evt, elem, scrollPos*/{
        var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
            curIdx;

        if (winPos + this.winHeight === this.docHeight) {
          curIdx = this.points.length - 1;
        } else if (winPos < this.points[0]) {
          curIdx = 0;
        } else {
          var isDown = this.scrollPos < winPos,
              _this = this,
              curVisible = this.points.filter(function (p, i) {
            return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
          });
          curIdx = curVisible.length ? curVisible.length - 1 : 0;
        }

        this.$active.removeClass(this.options.activeClass);
        this.$active = this.$links.eq(curIdx).addClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.scrollPos = winPos;
        /**
         * Fires when magellan is finished updating to the new active element.
         * @event Magellan#update
         */
        this.$element.trigger('update.zf.magellan', [this.$active]);
      }

      /**
       * Destroys an instance of Magellan and resets the url of the window.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger .zf.magellan').find('.' + this.options.activeClass).removeClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          window.location.hash.replace(hash, '');
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Magellan;
  }();

  /**
   * Default settings for plugin
   */


  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations.
     * @option
     * @example 'ease-in-out'
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @example 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @example 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @example true
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @example 25
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add a close trigger over the body if necessary
        if (this.options.closeOnClick) {
          if ($('.js-off-canvas-exit').length) {
            this.$exiter = $('.js-off-canvas-exit');
          } else {
            var exiter = document.createElement('div');
            exiter.setAttribute('class', 'js-off-canvas-exit');
            $('[data-off-canvas-content]').append(exiter);

            this.$exiter = $(exiter);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-wrapper]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick && this.$exiter.length) {
          this.$exiter.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          // if (!this.options.forceTop) {
          //   var scrollPos = parseInt(window.pageYOffset);
          //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
          // }
          // if (this.options.isSticky) { this._stick(); }
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          // if (this.options.isSticky || !this.options.forceTop) {
          //   this.$element[0].style.transform = '';
          //   $(window).off('scroll.zf.offcanvas');
          // }
          this.$element.on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this,
            $body = $(document.body);

        if (this.options.forceTop) {
          $('body').scrollTop(0);
        }
        // window.pageYOffset = 0;

        // if (!this.options.forceTop) {
        //   var scrollPos = parseInt(window.pageYOffset);
        //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   if (this.$exiter.length) {
        //     this.$exiter[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   }
        // }
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        Foundation.Move(this.options.transitionTime, this.$element, function () {
          $('[data-off-canvas-wrapper]').addClass('is-off-canvas-open is-open-' + _this.options.position);

          _this.$element.addClass('is-open');

          // if (_this.options.isSticky) {
          //   _this._stick();
          // }
        });

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        if (this.options.closeOnClick) {
          this.$exiter.addClass('is-visible');
        }

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.autoFocus) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            _this.$element.find('a, button').eq(0).focus();
          });
        }

        if (this.options.trapFocus) {
          $('[data-off-canvas-content]').attr('tabindex', '-1');
          this._trapFocus();
        }
      }

      /**
       * Traps focus within the offcanvas on open.
       * @private
       */

    }, {
      key: '_trapFocus',
      value: function _trapFocus() {
        var focusable = Foundation.Keyboard.findFocusable(this.$element),
            first = focusable.eq(0),
            last = focusable.eq(-1);

        focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function (e) {
          if (e.which === 9 || e.keycode === 9) {
            if (e.target === last[0] && !e.shiftKey) {
              e.preventDefault();
              first.focus();
            }
            if (e.target === first[0] && e.shiftKey) {
              e.preventDefault();
              last.focus();
            }
          }
        });
      }

      /**
       * Allows the offcanvas to appear sticky utilizing translate properties.
       * @private
       */
      // OffCanvas.prototype._stick = function() {
      //   var elStyle = this.$element[0].style;
      //
      //   if (this.options.closeOnClick) {
      //     var exitStyle = this.$exiter[0].style;
      //   }
      //
      //   $(window).on('scroll.zf.offcanvas', function(e) {
      //     console.log(e);
      //     var pageY = window.pageYOffset;
      //     elStyle.transform = 'translate(0,' + pageY + 'px)';
      //     if (exitStyle !== undefined) { exitStyle.transform = 'translate(0,' + pageY + 'px)'; }
      //   });
      //   // this.$element.trigger('stuck.zf.offcanvas');
      // };
      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        //  Foundation.Move(this.options.transitionTime, this.$element, function() {
        $('[data-off-canvas-wrapper]').removeClass('is-off-canvas-open is-open-' + _this.options.position);
        _this.$element.removeClass('is-open');
        // Foundation._reflow();
        // });
        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');
        // if (_this.options.isSticky || !_this.options.forceTop) {
        //   setTimeout(function() {
        //     _this.$element[0].style.transform = '';
        //     $(window).off('scroll.zf.offcanvas');
        //   }, this.options.transitionTime);
        // }
        if (this.options.closeOnClick) {
          this.$exiter.removeClass('is-visible');
        }

        this.$triggers.attr('aria-expanded', 'false');
        if (this.options.trapFocus) {
          $('[data-off-canvas-content]').removeAttr('tabindex');
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(event) {
        if (event.which !== 27) return;

        event.stopPropagation();
        event.preventDefault();
        this.close();
        this.$lastTrigger.focus();
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$exiter.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Direction the offcanvas opens from. Determines class applied to body.
     * @option
     * @example left
     */
    position: 'left',

    /**
     * Force the page to scroll to top on open.
     * @option
     * @example true
     */
    forceTop: true,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  var Orbit = function () {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    function Orbit(element, options) {
      _classCallCheck(this, Orbit);

      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */


    _createClass(Orbit, [{
      key: '_init',
      value: function _init() {
        this.$wrapper = this.$element.find('.' + this.options.containerClass);
        this.$slides = this.$element.find('.' + this.options.slideClass);
        var $images = this.$element.find('img'),
            initActive = this.$slides.filter('.is-active');

        if (!initActive.length) {
          this.$slides.eq(0).addClass('is-active');
        }

        if (!this.options.useMUI) {
          this.$slides.addClass('no-motionui');
        }

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
        } else {
          this._prepareForOrbit(); //hehe
        }

        if (this.options.bullets) {
          this._loadBullets();
        }

        this._events();

        if (this.options.autoPlay && this.$slides.length > 1) {
          this.geoSync();
        }

        if (this.options.accessible) {
          // allow wrapper to be focusable to enable arrow navigation
          this.$wrapper.attr('tabindex', 0);
        }
      }

      /**
      * Creates a jQuery collection of bullets, if they are being used.
      * @function
      * @private
      */

    }, {
      key: '_loadBullets',
      value: function _loadBullets() {
        this.$bullets = this.$element.find('.' + this.options.boxOfBullets).find('button');
      }

      /**
      * Sets a `timer` object on the orbit, and starts the counter for the next slide.
      * @function
      */

    }, {
      key: 'geoSync',
      value: function geoSync() {
        var _this = this;
        this.timer = new Foundation.Timer(this.$element, {
          duration: this.options.timerDelay,
          infinite: false
        }, function () {
          _this.changeSlide(true);
        });
        this.timer.start();
      }

      /**
      * Sets wrapper and slide heights for the orbit.
      * @function
      * @private
      */

    }, {
      key: '_prepareForOrbit',
      value: function _prepareForOrbit() {
        var _this = this;
        this._setWrapperHeight(function (max) {
          _this._setSlideHeight(max);
        });
      }

      /**
      * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
      * @function
      * @private
      * @param {Function} cb - a callback function to fire when complete.
      */

    }, {
      key: '_setWrapperHeight',
      value: function _setWrapperHeight(cb) {
        //rewrite this to `for` loop
        var max = 0,
            temp,
            counter = 0;

        this.$slides.each(function () {
          temp = this.getBoundingClientRect().height;
          $(this).attr('data-slide', counter);

          if (counter) {
            //if not the first slide, set css position and display property
            $(this).css({ 'position': 'relative', 'display': 'none' });
          }
          max = temp > max ? temp : max;
          counter++;
        });

        if (counter === this.$slides.length) {
          this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
          cb(max); //fire callback with max height dimension.
        }
      }

      /**
      * Sets the max-height of each slide.
      * @function
      * @private
      */

    }, {
      key: '_setSlideHeight',
      value: function _setSlideHeight(height) {
        this.$slides.each(function () {
          $(this).css('max-height', height);
        });
      }

      /**
      * Adds event listeners to basically everything within the element.
      * @function
      * @private
      */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        //***************************************
        //**Now using custom event - thanks to:**
        //**      Yohai Ararat of Toronto      **
        //***************************************
        if (this.$slides.length > 1) {

          if (this.options.swipe) {
            this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(true);
            }).on('swiperight.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(false);
            });
          }
          //***************************************

          if (this.options.autoPlay) {
            this.$slides.on('click.zf.orbit', function () {
              _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
              _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
            });

            if (this.options.pauseOnHover) {
              this.$element.on('mouseenter.zf.orbit', function () {
                _this.timer.pause();
              }).on('mouseleave.zf.orbit', function () {
                if (!_this.$element.data('clickedOn')) {
                  _this.timer.start();
                }
              });
            }
          }

          if (this.options.navButtons) {
            var $controls = this.$element.find('.' + this.options.nextClass + ', .' + this.options.prevClass);
            $controls.attr('tabindex', 0)
            //also need to handle enter/return and spacebar key presses
            .on('click.zf.orbit touchend.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide($(this).hasClass(_this.options.nextClass));
            });
          }

          if (this.options.bullets) {
            this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
              if (/is-active/g.test(this.className)) {
                return false;
              } //if this is active, kick out of function.
              var idx = $(this).data('slide'),
                  ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                  $slide = _this.$slides.eq(idx);

              _this.changeSlide(ltr, $slide, idx);
            });
          }

          this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
            // handle keyboard event with keyboard util
            Foundation.Keyboard.handleKey(e, 'Orbit', {
              next: function () {
                _this.changeSlide(true);
              },
              previous: function () {
                _this.changeSlide(false);
              },
              handled: function () {
                // if bullet is focused, make sure focus moves
                if ($(e.target).is(_this.$bullets)) {
                  _this.$bullets.filter('.is-active').focus();
                }
              }
            });
          });
        }
      }

      /**
      * Changes the current slide to a new one.
      * @function
      * @param {Boolean} isLTR - flag if the slide should move left to right.
      * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
      * @param {Number} idx - the index of the new slide in its collection, if one chosen.
      * @fires Orbit#slidechange
      */

    }, {
      key: 'changeSlide',
      value: function changeSlide(isLTR, chosenSlide, idx) {
        var $curSlide = this.$slides.filter('.is-active').eq(0);

        if (/mui/g.test($curSlide[0].className)) {
          return false;
        } //if the slide is currently animating, kick out of the function

        var $firstSlide = this.$slides.first(),
            $lastSlide = this.$slides.last(),
            dirIn = isLTR ? 'Right' : 'Left',
            dirOut = isLTR ? 'Left' : 'Right',
            _this = this,
            $newSlide;

        if (!chosenSlide) {
          //most of the time, this will be auto played or clicked from the navButtons.
          $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
          this.options.infiniteWrap ? $curSlide.next('.' + this.options.slideClass).length ? $curSlide.next('.' + this.options.slideClass) : $firstSlide : $curSlide.next('.' + this.options.slideClass) : //pick next slide if moving left to right
          this.options.infiniteWrap ? $curSlide.prev('.' + this.options.slideClass).length ? $curSlide.prev('.' + this.options.slideClass) : $lastSlide : $curSlide.prev('.' + this.options.slideClass); //pick prev slide if moving right to left
        } else {
          $newSlide = chosenSlide;
        }

        if ($newSlide.length) {
          if (this.options.bullets) {
            idx = idx || this.$slides.index($newSlide); //grab index to update bullets
            this._updateBullets(idx);
          }

          if (this.options.useMUI) {
            Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options['animInFrom' + dirIn], function () {
              $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
            });

            Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options['animOutTo' + dirOut], function () {
              $curSlide.removeAttr('aria-live');
              if (_this.options.autoPlay && !_this.timer.isPaused) {
                _this.timer.restart();
              }
              //do stuff?
            });
          } else {
            $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
            $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
            if (this.options.autoPlay && !this.timer.isPaused) {
              this.timer.restart();
            }
          }
          /**
          * Triggers when the slide has finished animating in.
          * @event Orbit#slidechange
          */
          this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
        }
      }

      /**
      * Updates the active state of the bullets, if displayed.
      * @function
      * @private
      * @param {Number} idx - the index of the current slide.
      */

    }, {
      key: '_updateBullets',
      value: function _updateBullets(idx) {
        var $oldBullet = this.$element.find('.' + this.options.boxOfBullets).find('.is-active').removeClass('is-active').blur(),
            span = $oldBullet.find('span:last').detach(),
            $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
      }

      /**
      * Destroys the carousel and hides the element.
      * @function
      */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Orbit;
  }();

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
    * @example true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
    * @example true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
    * @example true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
    * @example 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
    * @example true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
    * @example true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
    * @example true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
    * @example true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
    * @example 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
    * @example 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
    * @example 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
    * @example 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
    * @example 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
    * @example true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.accordionMenu
   * @requires foundation.util.drilldown
   * @requires foundation.util.dropdown-menu
   */

  var ResponsiveMenu = function () {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveMenu(element, options) {
      _classCallCheck(this, ResponsiveMenu);

      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveMenu, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
        // $(window).on('resize.zf.ResponsiveMenu', function() {
        //   _this._checkMediaQueries();
        // });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) this.currentPlugin.destroy();
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveMenu');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveMenu;
  }();

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]');

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$targetMenu.toggle(0);

          /**
           * Fires when the element attached to the tab bar toggles.
           * @event ResponsiveToggle#toggled
           */
          this.$element.trigger('toggled.zf.responsiveToggle');
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @example 'medium'
     */
    hideFor: 'medium'
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($('body'));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay(id) {
        var $overlay = $('<div></div>').addClass('reveal-overlay').appendTo('body');
        return $overlay;
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          var _this;

          (function () {
            var afterAnimationFocus = function () {
              _this.$element.attr({
                'aria-hidden': false,
                'tabindex': -1
              }).focus();
              console.log('focus');
            };

            _this = _this3;

            if (_this3.options.overlay) {
              Foundation.Motion.animateIn(_this3.$overlay, 'fade-in');
            }
            Foundation.Motion.animateIn(_this3.$element, _this3.options.animationIn, function () {
              _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
              afterAnimationFocus();
            });
          })();
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        if (this.isMobile) {
          this.originalScrollPos = window.pageYOffset;
          $('html, body').addClass('is-reveal-open');
        } else {
          $('body').addClass('is-reveal-open');
        }

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            tab_forward: function () {
              if (_this.$element.find(':focus').is(_this.focusableElements.eq(-1))) {
                // left modal downwards, setting focus to first element
                _this.focusableElements.eq(0).focus();
                return true;
              }
              if (_this.focusableElements.length === 0) {
                // no focusable elements inside the modal at all, prevent tabbing in general
                return true;
              }
            },
            tab_backward: function () {
              if (_this.$element.find(':focus').is(_this.focusableElements.eq(0)) || _this.$element.is(':focus')) {
                // left modal upwards, setting focus to last element
                _this.focusableElements.eq(-1).focus();
                return true;
              }
              if (_this.focusableElements.length === 0) {
                // no focusable elements inside the modal at all, prevent tabbing in general
                return true;
              }
            },
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {
            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }

            this.$element.hide(this.options.hideDelay);
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            $('html, body').removeClass('is-reveal-open');
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            $('body').removeClass('is-reveal-open');
          }

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState("", document.title, window.location.pathname);
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($('body')); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-in-left'
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-out-right'
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @example true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @example false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @example auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @example auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @example false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @example 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @example true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @example false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @example false
     */
    deepLink: false
  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  var Slider = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Slider(element, options) {
      _classCallCheck(this, Slider);

      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */


    _createClass(Slider, [{
      key: '_init',
      value: function _init() {
        this.inputs = this.$element.find('input');
        this.handles = this.$element.find('[data-slider-handle]');

        this.$handle = this.handles.eq(0);
        this.$input = this.inputs.length ? this.inputs.eq(0) : $('#' + this.$handle.attr('aria-controls'));
        this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

        var isDbl = false,
            _this = this;
        if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
          this.options.disabled = true;
          this.$element.addClass(this.options.disabledClass);
        }
        if (!this.inputs.length) {
          this.inputs = $().add(this.$input);
          this.options.binding = true;
        }
        this._setInitAttr(0);
        this._events(this.$handle);

        if (this.handles[1]) {
          this.options.doubleSided = true;
          this.$handle2 = this.handles.eq(1);
          this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $('#' + this.$handle2.attr('aria-controls'));

          if (!this.inputs[1]) {
            this.inputs = this.inputs.add(this.$input2);
          }
          isDbl = true;

          this._setHandlePos(this.$handle, this.options.initialStart, true, function () {

            _this._setHandlePos(_this.$handle2, _this.options.initialEnd, true);
          });
          // this.$handle.triggerHandler('click.zf.slider');
          this._setInitAttr(1);
          this._events(this.$handle2);
        }

        if (!isDbl) {
          this._setHandlePos(this.$handle, this.options.initialStart, true);
        }
      }

      /**
       * Sets the position of the selected handle and fill bar.
       * @function
       * @private
       * @param {jQuery} $hndl - the selected handle to move.
       * @param {Number} location - floating point between the start and end values of the slider bar.
       * @param {Function} cb - callback function to fire on completion.
       * @fires Slider#moved
       * @fires Slider#changed
       */

    }, {
      key: '_setHandlePos',
      value: function _setHandlePos($hndl, location, noInvert, cb) {
        // don't move if the slider has been disabled since its initialization
        if (this.$element.hasClass(this.options.disabledClass)) {
          return;
        }
        //might need to alter that slightly for bars that will have odd number selections.
        location = parseFloat(location); //on input change events, convert string to number...grumble.

        // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
        if (location < this.options.start) {
          location = this.options.start;
        } else if (location > this.options.end) {
          location = this.options.end;
        }

        var isDbl = this.options.doubleSided;

        if (isDbl) {
          //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
          if (this.handles.index($hndl) === 0) {
            var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
            location = location >= h2Val ? h2Val - this.options.step : location;
          } else {
            var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
            location = location <= h1Val ? h1Val + this.options.step : location;
          }
        }

        //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
        //for click and drag events, it's weird due to the scale(-1, 1) css property
        if (this.options.vertical && !noInvert) {
          location = this.options.end - location;
        }

        var _this = this,
            vert = this.options.vertical,
            hOrW = vert ? 'height' : 'width',
            lOrT = vert ? 'top' : 'left',
            handleDim = $hndl[0].getBoundingClientRect()[hOrW],
            elemDim = this.$element[0].getBoundingClientRect()[hOrW],

        //percentage of bar min/max value based on click or drag point
        pctOfBar = percent(location - this.options.start, this.options.end - this.options.start).toFixed(2),

        //number of actual pixels to shift the handle, based on the percentage obtained above
        pxToMove = (elemDim - handleDim) * pctOfBar,

        //percentage of bar to shift the handle
        movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
        //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
        location = parseFloat(location.toFixed(this.options.decimal));
        // declare empty object for css adjustments, only used with 2 handled-sliders
        var css = {};

        this._setValues($hndl, location);

        // TODO update to calculate based on values set to respective inputs??
        if (isDbl) {
          var isLeftHndl = this.handles.index($hndl) === 0,

          //empty variable, will be used for min-height/width for fill bar
          dim,

          //percentage w/h of the handle compared to the slider bar
          handlePct = ~~(percent(handleDim, elemDim) * 100);
          //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
          if (isLeftHndl) {
            //left or top percentage value to apply to the fill bar.
            css[lOrT] = movement + '%';
            //calculate the new min-height/width for the fill bar.
            dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
            //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
            //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
            if (cb && typeof cb === 'function') {
              cb();
            } //this is only needed for the initialization of 2 handled sliders
          } else {
            //just caching the value of the left/bottom handle's left/top property
            var handlePos = parseFloat(this.$handle[0].style[lOrT]);
            //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
            //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
            dim = movement - (isNaN(handlePos) ? this.options.initialStart / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
          }
          // assign the min-height/width to our css object
          css['min-' + hOrW] = dim + '%';
        }

        this.$element.one('finished.zf.animate', function () {
          /**
           * Fires when the handle is done moving.
           * @event Slider#moved
           */
          _this.$element.trigger('moved.zf.slider', [$hndl]);
        });

        //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
        var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

        Foundation.Move(moveTime, $hndl, function () {
          //adjusting the left/top property of the handle, based on the percentage calculated above
          $hndl.css(lOrT, movement + '%');

          if (!_this.options.doubleSided) {
            //if single-handled, a simple method to expand the fill bar
            _this.$fill.css(hOrW, pctOfBar * 100 + '%');
          } else {
            //otherwise, use the css object we created above
            _this.$fill.css(css);
          }
        });

        /**
         * Fires when the value has not been change for a given time.
         * @event Slider#changed
         */
        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
          _this.$element.trigger('changed.zf.slider', [$hndl]);
        }, _this.options.changedDelay);
      }

      /**
       * Sets the initial attribute for the slider element.
       * @function
       * @private
       * @param {Number} idx - index of the current handle/input to use.
       */

    }, {
      key: '_setInitAttr',
      value: function _setInitAttr(idx) {
        var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
        this.inputs.eq(idx).attr({
          'id': id,
          'max': this.options.end,
          'min': this.options.start,
          'step': this.options.step
        });
        this.handles.eq(idx).attr({
          'role': 'slider',
          'aria-controls': id,
          'aria-valuemax': this.options.end,
          'aria-valuemin': this.options.start,
          'aria-valuenow': idx === 0 ? this.options.initialStart : this.options.initialEnd,
          'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
          'tabindex': 0
        });
      }

      /**
       * Sets the input and `aria-valuenow` values for the slider element.
       * @function
       * @private
       * @param {jQuery} $handle - the currently selected handle.
       * @param {Number} val - floating point of the new value.
       */

    }, {
      key: '_setValues',
      value: function _setValues($handle, val) {
        var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
        this.inputs.eq(idx).val(val);
        $handle.attr('aria-valuenow', val);
      }

      /**
       * Handles events on the slider element.
       * Calculates the new location of the current handle.
       * If there are two handles and the bar was clicked, it determines which handle to move.
       * @function
       * @private
       * @param {Object} e - the `event` object passed from the listener.
       * @param {jQuery} $handle - the current handle to calculate for, if selected.
       * @param {Number} val - floating point number for the new value of the slider.
       * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
       */

    }, {
      key: '_handleEvent',
      value: function _handleEvent(e, $handle, val) {
        var value, hasVal;
        if (!val) {
          //click or drag events
          e.preventDefault();
          var _this = this,
              vertical = this.options.vertical,
              param = vertical ? 'height' : 'width',
              direction = vertical ? 'top' : 'left',
              eventOffset = vertical ? e.pageY : e.pageX,
              halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
              barDim = this.$element[0].getBoundingClientRect()[param],
              windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

          var elemOffset = this.$element.offset()[direction];

          // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
          // best way to guess this is simulated is if clientY == pageY
          if (e.clientY === e.pageY) {
            eventOffset = eventOffset + windowScroll;
          }
          var eventFromBar = eventOffset - elemOffset;
          var barXY;
          if (eventFromBar < 0) {
            barXY = 0;
          } else if (eventFromBar > barDim) {
            barXY = barDim;
          } else {
            barXY = eventFromBar;
          }
          offsetPct = percent(barXY, barDim);

          value = (this.options.end - this.options.start) * offsetPct + this.options.start;

          // turn everything around for RTL, yay math!
          if (Foundation.rtl() && !this.options.vertical) {
            value = this.options.end - value;
          }

          value = _this._adjustValue(null, value);
          //boolean flag for the setHandlePos fn, specifically for vertical sliders
          hasVal = false;

          if (!$handle) {
            //figure out which handle it is, pass it to the next function.
            var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
                secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
            $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
          }
        } else {
          //change event on input
          value = this._adjustValue(null, val);
          hasVal = true;
        }

        this._setHandlePos($handle, value, hasVal);
      }

      /**
       * Adjustes value for handle in regard to step value. returns adjusted value
       * @function
       * @private
       * @param {jQuery} $handle - the selected handle.
       * @param {Number} value - value to adjust. used if $handle is falsy
       */

    }, {
      key: '_adjustValue',
      value: function _adjustValue($handle, value) {
        var val,
            step = this.options.step,
            div = parseFloat(step / 2),
            left,
            prev_val,
            next_val;
        if (!!$handle) {
          val = parseFloat($handle.attr('aria-valuenow'));
        } else {
          val = value;
        }
        left = val % step;
        prev_val = val - left;
        next_val = prev_val + step;
        if (left === 0) {
          return val;
        }
        val = val >= prev_val + div ? next_val : prev_val;
        return val;
      }

      /**
       * Adds event listeners to the slider elements.
       * @function
       * @private
       * @param {jQuery} $handle - the current handle to apply listeners to.
       */

    }, {
      key: '_events',
      value: function _events($handle) {
        var _this = this,
            curHandle,
            timer;

        this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
          var idx = _this.inputs.index($(this));
          _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
        });

        if (this.options.clickSelect) {
          this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
            if (_this.$element.data('dragging')) {
              return false;
            }

            if (!$(e.target).is('[data-slider-handle]')) {
              if (_this.options.doubleSided) {
                _this._handleEvent(e);
              } else {
                _this._handleEvent(e, _this.$handle);
              }
            }
          });
        }

        if (this.options.draggable) {
          this.handles.addTouch();

          var $body = $('body');
          $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
            $handle.addClass('is-dragging');
            _this.$fill.addClass('is-dragging'); //
            _this.$element.data('dragging', true);

            curHandle = $(e.currentTarget);

            $body.on('mousemove.zf.slider', function (e) {
              e.preventDefault();
              _this._handleEvent(e, curHandle);
            }).on('mouseup.zf.slider', function (e) {
              _this._handleEvent(e, curHandle);

              $handle.removeClass('is-dragging');
              _this.$fill.removeClass('is-dragging');
              _this.$element.data('dragging', false);

              $body.off('mousemove.zf.slider mouseup.zf.slider');
            });
          })
          // prevent events triggered by touch
          .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
            e.preventDefault();
          });
        }

        $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
          var _$handle = $(this),
              idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
              oldValue = parseFloat(_this.inputs.eq(idx).val()),
              newValue;

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Slider', {
            decrease: function () {
              newValue = oldValue - _this.options.step;
            },
            increase: function () {
              newValue = oldValue + _this.options.step;
            },
            decrease_fast: function () {
              newValue = oldValue - _this.options.step * 10;
            },
            increase_fast: function () {
              newValue = oldValue + _this.options.step * 10;
            },
            handled: function () {
              // only set handle pos when event was handled specially
              e.preventDefault();
              _this._setHandlePos(_$handle, newValue, true);
            }
          });
          /*if (newValue) { // if pressed key has special function, update value
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue);
          }*/
        });
      }

      /**
       * Destroys the slider plugin.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.handles.off('.zf.slider');
        this.inputs.off('.zf.slider');
        this.$element.off('.zf.slider');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Slider;
  }();

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @example 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @example 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @example 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @example 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @example 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @example false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @example true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @example false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @example true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @example false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @example false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @example 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @example 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @example 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @example false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @example 500
     */
    changedDelay: 500
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);

//*********this is in case we go to static, absolute positions instead of dynamic positioning********
// this.setSteps(function() {
//   _this._events();
//   var initStart = _this.options.positions[_this.options.initialStart - 1] || null;
//   var initEnd = _this.options.initialEnd ? _this.options.position[_this.options.initialEnd - 1] : null;
//   if (initStart || initEnd) {
//     _this._handleEvent(initStart, initEnd);
//   }
// });

//***********the other part of absolute positions*************
// Slider.prototype.setSteps = function(cb) {
//   var posChange = this.$element.outerWidth() / this.options.steps;
//   var counter = 0
//   while(counter < this.options.steps) {
//     if (counter) {
//       this.options.positions.push(this.options.positions[counter - 1] + posChange);
//     } else {
//       this.options.positions.push(posChange);
//     }
//     counter++;
//   }
//   cb();
// };
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var Sticky = function () {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    function Sticky(element, options) {
      _classCallCheck(this, Sticky);

      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */


    _createClass(Sticky, [{
      key: '_init',
      value: function _init() {
        var $parent = this.$element.parent('[data-sticky-container]'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
            _this = this;

        if (!$parent.length) {
          this.wasWrapped = true;
        }
        this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
        this.$container.addClass(this.options.containerClass);

        this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

        this.scrollCount = this.options.checkEvery;
        this.isStuck = false;
        $(window).one('load.zf.sticky', function () {
          if (_this.options.anchor !== '') {
            _this.$anchor = $('#' + _this.options.anchor);
          } else {
            _this._parsePoints();
          }

          _this._setSizes(function () {
            _this._calc(false);
          });
          _this._events(id.split('-').reverse().join('-'));
        });
      }

      /**
       * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
       * @function
       * @private
       */

    }, {
      key: '_parsePoints',
      value: function _parsePoints() {
        var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
            btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
            pts = [top, btm],
            breaks = {};
        for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
          var pt;
          if (typeof pts[i] === 'number') {
            pt = pts[i];
          } else {
            var place = pts[i].split(':'),
                anchor = $('#' + place[0]);

            pt = anchor.offset().top;
            if (place[1] && place[1].toLowerCase() === 'bottom') {
              pt += anchor[0].getBoundingClientRect().height;
            }
          }
          breaks[i] = pt;
        }

        this.points = breaks;
        return;
      }

      /**
       * Adds event handlers for the scrolling element.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_events',
      value: function _events(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;
        if (this.isOn) {
          return;
        }
        if (this.canStick) {
          this.isOn = true;
          $(window).off(scrollListener).on(scrollListener, function (e) {
            if (_this.scrollCount === 0) {
              _this.scrollCount = _this.options.checkEvery;
              _this._setSizes(function () {
                _this._calc(false, window.pageYOffset);
              });
            } else {
              _this.scrollCount--;
              _this._calc(false, window.pageYOffset);
            }
          });
        }

        this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
          _this._setSizes(function () {
            _this._calc(false);
            if (_this.canStick) {
              if (!_this.isOn) {
                _this._events(id);
              }
            } else if (_this.isOn) {
              _this._pauseListeners(scrollListener);
            }
          });
        });
      }

      /**
       * Removes event handlers for scroll and change events on anchor.
       * @fires Sticky#pause
       * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
       */

    }, {
      key: '_pauseListeners',
      value: function _pauseListeners(scrollListener) {
        this.isOn = false;
        $(window).off(scrollListener);

        /**
         * Fires when the plugin is paused due to resize event shrinking the view.
         * @event Sticky#pause
         * @private
         */
        this.$element.trigger('pause.zf.sticky');
      }

      /**
       * Called on every `scroll` event and on `_init`
       * fires functions based on booleans and cached values
       * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
       * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
       */

    }, {
      key: '_calc',
      value: function _calc(checkSizes, scroll) {
        if (checkSizes) {
          this._setSizes();
        }

        if (!this.canStick) {
          if (this.isStuck) {
            this._removeSticky(true);
          }
          return false;
        }

        if (!scroll) {
          scroll = window.pageYOffset;
        }

        if (scroll >= this.topPoint) {
          if (scroll <= this.bottomPoint) {
            if (!this.isStuck) {
              this._setSticky();
            }
          } else {
            if (this.isStuck) {
              this._removeSticky(false);
            }
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(true);
          }
        }
      }

      /**
       * Causes the $element to become stuck.
       * Adds `position: fixed;`, and helper classes.
       * @fires Sticky#stuckto
       * @function
       * @private
       */

    }, {
      key: '_setSticky',
      value: function _setSticky() {
        var _this = this,
            stickTo = this.options.stickTo,
            mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
            notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
            css = {};

        css[mrgn] = this.options[mrgn] + 'em';
        css[stickTo] = 0;
        css[notStuckTo] = 'auto';
        css['left'] = this.$container.offset().left + parseInt(window.getComputedStyle(this.$container[0])["padding-left"], 10);
        this.isStuck = true;
        this.$element.removeClass('is-anchored is-at-' + notStuckTo).addClass('is-stuck is-at-' + stickTo).css(css)
        /**
         * Fires when the $element has become `position: fixed;`
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
         * @event Sticky#stuckto
         */
        .trigger('sticky.zf.stuckto:' + stickTo);
        this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
          _this._setSizes();
        });
      }

      /**
       * Causes the $element to become unstuck.
       * Removes `position: fixed;`, and helper classes.
       * Adds other helper classes.
       * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
       * @fires Sticky#unstuckfrom
       * @private
       */

    }, {
      key: '_removeSticky',
      value: function _removeSticky(isTop) {
        var stickTo = this.options.stickTo,
            stickToTop = stickTo === 'top',
            css = {},
            anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
            mrgn = stickToTop ? 'marginTop' : 'marginBottom',
            notStuckTo = stickToTop ? 'bottom' : 'top',
            topOrBottom = isTop ? 'top' : 'bottom';

        css[mrgn] = 0;

        css['bottom'] = 'auto';
        if (isTop) {
          css['top'] = 0;
        } else {
          css['top'] = anchorPt;
        }

        css['left'] = '';
        this.isStuck = false;
        this.$element.removeClass('is-stuck is-at-' + stickTo).addClass('is-anchored is-at-' + topOrBottom).css(css)
        /**
         * Fires when the $element has become anchored.
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
         * @event Sticky#unstuckfrom
         */
        .trigger('sticky.zf.unstuckfrom:' + topOrBottom);
      }

      /**
       * Sets the $element and $container sizes for plugin.
       * Calls `_setBreakPoints`.
       * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
       * @private
       */

    }, {
      key: '_setSizes',
      value: function _setSizes(cb) {
        this.canStick = Foundation.MediaQuery.atLeast(this.options.stickyOn);
        if (!this.canStick) {
          cb();
        }
        var _this = this,
            newElemWidth = this.$container[0].getBoundingClientRect().width,
            comp = window.getComputedStyle(this.$container[0]),
            pdng = parseInt(comp['padding-right'], 10);

        if (this.$anchor && this.$anchor.length) {
          this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
        } else {
          this._parsePoints();
        }

        this.$element.css({
          'max-width': newElemWidth - pdng + 'px'
        });

        var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
        if (this.$element.css("display") == "none") {
          newContainerHeight = 0;
        }
        this.containerHeight = newContainerHeight;
        this.$container.css({
          height: newContainerHeight
        });
        this.elemHeight = newContainerHeight;

        if (this.isStuck) {
          this.$element.css({ "left": this.$container.offset().left + parseInt(comp['padding-left'], 10) });
        }

        this._setBreakPoints(newContainerHeight, function () {
          if (cb) {
            cb();
          }
        });
      }

      /**
       * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
       * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
       * @param {Function} cb - optional callback function to be called on completion.
       * @private
       */

    }, {
      key: '_setBreakPoints',
      value: function _setBreakPoints(elemHeight, cb) {
        if (!this.canStick) {
          if (cb) {
            cb();
          } else {
            return false;
          }
        }
        var mTop = emCalc(this.options.marginTop),
            mBtm = emCalc(this.options.marginBottom),
            topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
            bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

        // topPoint = this.$anchor.offset().top || this.points[0],
        // bottomPoint = topPoint + this.anchorHeight || this.points[1],
        winHeight = window.innerHeight;

        if (this.options.stickTo === 'top') {
          topPoint -= mTop;
          bottomPoint -= elemHeight + mTop;
        } else if (this.options.stickTo === 'bottom') {
          topPoint -= winHeight - (elemHeight + mBtm);
          bottomPoint -= winHeight - mBtm;
        } else {
          //this would be the stickTo: both option... tricky
        }

        this.topPoint = topPoint;
        this.bottomPoint = bottomPoint;

        if (cb) {
          cb();
        }
      }

      /**
       * Destroys the current sticky element.
       * Resets the element to the top position first.
       * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._removeSticky(true);

        this.$element.removeClass(this.options.stickyClass + ' is-anchored is-at-top').css({
          height: '',
          top: '',
          bottom: '',
          'max-width': ''
        }).off('resizeme.zf.trigger');
        if (this.$anchor && this.$anchor.length) {
          this.$anchor.off('change.zf.sticky');
        }
        $(window).off(this.scrollListener);

        if (this.wasWrapped) {
          this.$element.unwrap();
        } else {
          this.$container.removeClass(this.options.containerClass).css({
            height: ''
          });
        }
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Sticky;
  }();

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @example '&lt;div data-sticky-container class="small-6 columns"&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to.
     * @option
     * @example 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @example 'exampleId'
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @example 'exampleId:top'
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @example 'exampleId:bottom'
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @example 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @example 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @example 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @example 50
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  var Tabs = function () {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Tabs(element, options) {
      _classCallCheck(this, Tabs);

      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */


    _createClass(Tabs, [{
      key: '_init',
      value: function _init() {
        var _this = this;

        this.$tabTitles = this.$element.find('.' + this.options.linkClass);
        this.$tabContent = $('[data-tabs-content="' + this.$element[0].id + '"]');

        this.$tabTitles.each(function () {
          var $elem = $(this),
              $link = $elem.find('a'),
              isActive = $elem.hasClass('is-active'),
              hash = $link[0].hash.slice(1),
              linkId = $link[0].id ? $link[0].id : hash + '-label',
              $tabContent = $('#' + hash);

          $elem.attr({ 'role': 'presentation' });

          $link.attr({
            'role': 'tab',
            'aria-controls': hash,
            'aria-selected': isActive,
            'id': linkId
          });

          $tabContent.attr({
            'role': 'tabpanel',
            'aria-hidden': !isActive,
            'aria-labelledby': linkId
          });

          if (isActive && _this.options.autoFocus) {
            $link.focus();
          }
        });

        if (this.options.matchHeight) {
          var $images = this.$tabContent.find('img');

          if ($images.length) {
            Foundation.onImagesLoaded($images, this._setHeight.bind(this));
          } else {
            this._setHeight();
          }
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._addKeyHandler();
        this._addClickHandler();
        this._setHeightMqHandler = null;

        if (this.options.matchHeight) {
          this._setHeightMqHandler = this._setHeight.bind(this);

          $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      /**
       * Adds click handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addClickHandler',
      value: function _addClickHandler() {
        var _this = this;

        this.$element.off('click.zf.tabs').on('click.zf.tabs', '.' + this.options.linkClass, function (e) {
          e.preventDefault();
          e.stopPropagation();
          if ($(this).hasClass('is-active')) {
            return;
          }
          _this._handleTabChange($(this));
        });
      }

      /**
       * Adds keyboard event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addKeyHandler',
      value: function _addKeyHandler() {
        var _this = this;
        var $firstTab = _this.$element.find('li:first-of-type');
        var $lastTab = _this.$element.find('li:last-of-type');

        this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
          if (e.which === 9) return;

          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              if (_this.options.wrapOnKeys) {
                $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
                $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
              } else {
                $prevElement = $elements.eq(Math.max(0, i - 1));
                $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              }
              return;
            }
          });

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Tabs', {
            open: function () {
              $element.find('[role="tab"]').focus();
              _this._handleTabChange($element);
            },
            previous: function () {
              $prevElement.find('[role="tab"]').focus();
              _this._handleTabChange($prevElement);
            },
            next: function () {
              $nextElement.find('[role="tab"]').focus();
              _this._handleTabChange($nextElement);
            },
            handled: function () {
              e.stopPropagation();
              e.preventDefault();
            }
          });
        });
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to open.
       * @fires Tabs#change
       * @function
       */

    }, {
      key: '_handleTabChange',
      value: function _handleTabChange($target) {
        var $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash),
            $oldTab = this.$element.find('.' + this.options.linkClass + '.is-active').removeClass('is-active').find('[role="tab"]').attr({ 'aria-selected': 'false' });

        $('#' + $oldTab.attr('aria-controls')).removeClass('is-active').attr({ 'aria-hidden': 'true' });

        $target.addClass('is-active');

        $tabLink.attr({ 'aria-selected': 'true' });

        $targetContent.addClass('is-active').attr({ 'aria-hidden': 'false' });

        /**
         * Fires when the plugin has successfully changed tabs.
         * @event Tabs#change
         */
        this.$element.trigger('change.zf.tabs', [$target]);
      }

      /**
       * Public method for selecting a content pane to display.
       * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
       * @function
       */

    }, {
      key: 'selectTab',
      value: function selectTab(elem) {
        var idStr;

        if (typeof elem === 'object') {
          idStr = elem[0].id;
        } else {
          idStr = elem;
        }

        if (idStr.indexOf('#') < 0) {
          idStr = '#' + idStr;
        }

        var $target = this.$tabTitles.find('[href="' + idStr + '"]').parent('.' + this.options.linkClass);

        this._handleTabChange($target);
      }
    }, {
      key: '_setHeight',

      /**
       * Sets the height of each panel to the height of the tallest panel.
       * If enabled in options, gets called on media query change.
       * If loading content via external source, can be called directly or with _reflow.
       * @function
       * @private
       */
      value: function _setHeight() {
        var max = 0;
        this.$tabContent.find('.' + this.options.panelClass).css('height', '').each(function () {
          var panel = $(this),
              isActive = panel.hasClass('is-active');

          if (!isActive) {
            panel.css({ 'visibility': 'hidden', 'display': 'block' });
          }

          var temp = this.getBoundingClientRect().height;

          if (!isActive) {
            panel.css({
              'visibility': '',
              'display': ''
            });
          }

          max = temp > max ? temp : max;
        }).css('height', max + 'px');
      }

      /**
       * Destroys an instance of an tabs.
       * @fires Tabs#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('.' + this.options.linkClass).off('.zf.tabs').hide().end().find('.' + this.options.panelClass).hide();

        if (this.options.matchHeight) {
          if (this._setHeightMqHandler != null) {
            $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
          }
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tabs;
  }();

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * @option
     * @example false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @example true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @example false
     */
    matchHeight: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @example 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the content containers.
     * @option
     * @example 'tabs-panel'
     */
    panelClass: 'tabs-panel'
  };

  function checkClass($elem) {
    return $elem.hasClass('is-active');
  }

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  var Toggler = function () {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Toggler(element, options) {
      _classCallCheck(this, Toggler);

      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */


    _createClass(Toggler, [{
      key: '_init',
      value: function _init() {
        var input;
        // Parse animation classes if they were set
        if (this.options.animate) {
          input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }
        // Otherwise, parse toggle class
        else {
            input = this.$element.data('toggler');
            // Allow for a . at the beginning of the string
            this.className = input[0] === '.' ? input.slice(1) : input;
          }

        // Add ARIA attributes to triggers
        var id = this.$element[0].id;
        $('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-controls', id);
        // If the target is hidden, add aria-hidden
        this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
      }

      /**
       * Initializes events for the toggle trigger.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
      }

      /**
       * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
       * @function
       * @fires Toggler#on
       * @fires Toggler#off
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
      }
    }, {
      key: '_toggleClass',
      value: function _toggleClass() {
        this.$element.toggleClass(this.className);

        var isOn = this.$element.hasClass(this.className);
        if (isOn) {
          /**
           * Fires if the target element has the class after a toggle.
           * @event Toggler#on
           */
          this.$element.trigger('on.zf.toggler');
        } else {
          /**
           * Fires if the target element does not have the class after a toggle.
           * @event Toggler#off
           */
          this.$element.trigger('off.zf.toggler');
        }

        this._updateARIA(isOn);
      }
    }, {
      key: '_toggleAnimate',
      value: function _toggleAnimate() {
        var _this = this;

        if (this.$element.is(':hidden')) {
          Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
            _this._updateARIA(true);
            this.trigger('on.zf.toggler');
          });
        } else {
          Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
            _this._updateARIA(false);
            this.trigger('off.zf.toggler');
          });
        }
      }
    }, {
      key: '_updateARIA',
      value: function _updateARIA(isOn) {
        this.$element.attr('aria-expanded', isOn ? true : false);
      }

      /**
       * Destroys the instance of Toggler on the element.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.toggler');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Toggler;
  }();

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Tooltip = function () {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    function Tooltip(element, options) {
      _classCallCheck(this, Tooltip);

      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */


    _createClass(Tooltip, [{
      key: '_init',
      value: function _init() {
        var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

        this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
        this.options.tipText = this.options.tipText || this.$element.attr('title');
        this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

        this.template.appendTo(document.body).text(this.options.tipText).hide();

        this.$element.attr({
          'title': '',
          'aria-describedby': elemId,
          'data-yeti-box': elemId,
          'data-toggle': elemId,
          'data-resize': elemId
        }).addClass(this.triggerClass);

        //helper variables to track movement on collisions
        this.usedPositions = [];
        this.counter = 4;
        this.classChanged = false;

        this._events();
      }

      /**
       * Grabs the current positioning class, if present, and returns the value or an empty string.
       * @private
       */

    }, {
      key: '_getPositionClass',
      value: function _getPositionClass(element) {
        if (!element) {
          return '';
        }
        // var position = element.attr('class').match(/top|left|right/g);
        var position = element[0].className.match(/\b(top|left|right)\b/g);
        position = position ? position[0] : '';
        return position;
      }
    }, {
      key: '_buildTemplate',

      /**
       * builds the tooltip element, adds attributes, and returns the template.
       * @private
       */
      value: function _buildTemplate(id) {
        var templateClasses = (this.options.tooltipClass + ' ' + this.options.positionClass + ' ' + this.options.templateClasses).trim();
        var $template = $('<div></div>').addClass(templateClasses).attr({
          'role': 'tooltip',
          'aria-hidden': true,
          'data-is-active': false,
          'data-is-focus': false,
          'id': id
        });
        return $template;
      }

      /**
       * Function that gets called if a collision event is detected.
       * @param {String} position - positioning class to try
       * @private
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');

        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.template.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.template.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.template.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
       * if the tooltip is larger than the screen width, default to full width - any user selected margin
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        var position = this._getPositionClass(this.template),
            $tipDims = Foundation.Box.GetDimensions(this.template),
            $anchorDims = Foundation.Box.GetDimensions(this.$element),
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
            _this = this;

        if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
          this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          return false;
        }

        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * reveals the tooltip, and fires an event to close any other open tooltips on the page
       * @fires Tooltip#closeme
       * @fires Tooltip#show
       * @function
       */

    }, {
      key: 'show',
      value: function show() {
        if (this.options.showOn !== 'all' && !Foundation.MediaQuery.atLeast(this.options.showOn)) {
          // console.error('The screen is too small to display this tooltip');
          return false;
        }

        var _this = this;
        this.template.css('visibility', 'hidden').show();
        this._setPosition();

        /**
         * Fires to close all other open tooltips on the page
         * @event Closeme#tooltip
         */
        this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

        this.template.attr({
          'data-is-active': true,
          'aria-hidden': false
        });
        _this.isActive = true;
        // console.log(this.template);
        this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
          //maybe do stuff?
        });
        /**
         * Fires when the tooltip is shown
         * @event Tooltip#show
         */
        this.$element.trigger('show.zf.tooltip');
      }

      /**
       * Hides the current tooltip, and resets the positioning class if it was changed due to collision
       * @fires Tooltip#hide
       * @function
       */

    }, {
      key: 'hide',
      value: function hide() {
        // console.log('hiding', this.$element.data('yeti-box'));
        var _this = this;
        this.template.stop().attr({
          'aria-hidden': true,
          'data-is-active': false
        }).fadeOut(this.options.fadeOutDuration, function () {
          _this.isActive = false;
          _this.isClick = false;
          if (_this.classChanged) {
            _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

            _this.usedPositions = [];
            _this.counter = 4;
            _this.classChanged = false;
          }
        });
        /**
         * fires when the tooltip is hidden
         * @event Tooltip#hide
         */
        this.$element.trigger('hide.zf.tooltip');
      }

      /**
       * adds event listeners for the tooltip and its anchor
       * TODO combine some of the listeners like focus and mouseenter, etc.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        var $template = this.template;
        var isFocus = false;

        if (!this.options.disableHover) {

          this.$element.on('mouseenter.zf.tooltip', function (e) {
            if (!_this.isActive) {
              _this.timeout = setTimeout(function () {
                _this.show();
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.tooltip', function (e) {
            clearTimeout(_this.timeout);
            if (!isFocus || _this.isClick && !_this.options.clickOpen) {
              _this.hide();
            }
          });
        }

        if (this.options.clickOpen) {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            if (_this.isClick) {
              //_this.hide();
              // _this.isClick = false;
            } else {
              _this.isClick = true;
              if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
                _this.show();
              }
            }
          });
        } else {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            _this.isClick = true;
          });
        }

        if (!this.options.disableForTouch) {
          this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
            _this.isActive ? _this.hide() : _this.show();
          });
        }

        this.$element.on({
          // 'toggle.zf.trigger': this.toggle.bind(this),
          // 'close.zf.trigger': this.hide.bind(this)
          'close.zf.trigger': this.hide.bind(this)
        });

        this.$element.on('focus.zf.tooltip', function (e) {
          isFocus = true;
          if (_this.isClick) {
            // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
            // a real focus, otherwise on hover and come back we get bad behavior
            if (!_this.options.clickOpen) {
              isFocus = false;
            }
            return false;
          } else {
            _this.show();
          }
        }).on('focusout.zf.tooltip', function (e) {
          isFocus = false;
          _this.isClick = false;
          _this.hide();
        }).on('resizeme.zf.trigger', function () {
          if (_this.isActive) {
            _this._setPosition();
          }
        });
      }

      /**
       * adds a toggle method, in addition to the static show() & hide() functions
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.hide();
        } else {
          this.show();
        }
      }

      /**
       * Destroys an instance of tooltip, removes template element from the view.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tootip')
        //  .removeClass('has-tip')
        .removeAttr('aria-describedby').removeAttr('data-yeti-box').removeAttr('data-toggle').removeAttr('data-resize');

        this.template.remove();

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tooltip;
  }();

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @example 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @example 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @example 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @example 'my-cool-tip-class'
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @example 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @example 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @example 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @example '&lt;div class="tooltip"&gt;&lt;/div&gt;'
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @example 'Some cool space fact here.'
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @example true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @example 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @example 12
     */
    hOffset: 12
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;'use strict';

jQuery('iframe[src*="youtube.com"]').wrap("<div class='flex-video widescreen'/>");
jQuery('iframe[src*="vimeo.com"]').wrap("<div class='flex-video widescreen vimeo'/>");
;"use strict";

jQuery(document).foundation();
;'use strict';

// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
});
;'use strict';

$('.title-bar').on('sticky.zf.stuckto:top', function () {
  $(this).addClass('shrink');
}).on('sticky.zf.unstuckfrom:top', function () {
  $(this).removeClass('shrink');
});

$(function () {
  $('a[href*="#"]:not([href="#"])').click(function () {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top - 64
        }, 800);
        return false;
      }
    }
  });
});
;"use strict";
;'use strict';

$(window).bind(' load resize orientationChange ', function () {
   var footer = $("#footer-container");
   var pos = footer.position();
   var height = $(window).height();
   height = height - pos.top;
   height = height - footer.height() - 1;

   function stickyFooter() {
      footer.css({
         'margin-top': height + 'px'
      });
   }

   if (height > 0) {
      stickyFooter();
   }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub2ZmY2FudmFzLmpzIiwiZm91bmRhdGlvbi5vcmJpdC5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnUuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGUuanMiLCJmb3VuZGF0aW9uLnJldmVhbC5qcyIsImZvdW5kYXRpb24uc2xpZGVyLmpzIiwiZm91bmRhdGlvbi5zdGlja3kuanMiLCJmb3VuZGF0aW9uLnRhYnMuanMiLCJmb3VuZGF0aW9uLnRvZ2dsZXIuanMiLCJmb3VuZGF0aW9uLnRvb2x0aXAuanMiLCJtb3Rpb24tdWkuanMiLCJmbGV4LXZpZGVvLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwiam95cmlkZS1kZW1vLmpzIiwibWFpbi5qcyIsIm9mZkNhbnZhcy5qcyIsInN0aWNreWZvb3Rlci5qcyJd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LFlBQUYsRUFBZ0IsT0FBaEIsQ0FBd0I7QUFDdEIscUJBQVcsT0FBTyxNQUFQLEdBQWdCLEdBQWhCLEdBQW9CO0FBRFQsU0FBeEIsRUFFRyxHQUZIO0FBR0EsZUFBTyxLQUFQO0FBQ0Q7QUFDRjtBQUNGLEdBWEQ7QUFZRCxDQWJEO0NDUEE7OztBQ0NBLEVBQUUsTUFBRixFQUFVLElBQVYsQ0FBZSxpQ0FBZixFQUFrRCxZQUFZO0FBQzNELE9BQUksU0FBUyxFQUFFLG1CQUFGLENBQWI7QUFDQSxPQUFJLE1BQU0sT0FBTyxRQUFQLEVBQVY7QUFDQSxPQUFJLFNBQVMsRUFBRSxNQUFGLEVBQVUsTUFBVixFQUFiO0FBQ0EsWUFBUyxTQUFTLElBQUksR0FBdEI7QUFDQSxZQUFTLFNBQVMsT0FBTyxNQUFQLEVBQVQsR0FBMEIsQ0FBbkM7O0FBRUEsWUFBUyxZQUFULEdBQXdCO0FBQ3RCLGFBQU8sR0FBUCxDQUFXO0FBQ1AsdUJBQWMsU0FBUztBQURoQixPQUFYO0FBR0Q7O0FBRUQsT0FBSSxTQUFTLENBQWIsRUFBZ0I7QUFDZDtBQUNEO0FBQ0gsQ0FoQkQiLCJmaWxlIjoiZm91bmRhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aGF0SW5wdXQgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLypcclxuICAgIC0tLS0tLS0tLS0tLS0tLVxyXG4gICAgdmFyaWFibGVzXHJcbiAgICAtLS0tLS0tLS0tLS0tLS1cclxuICAqL1xyXG5cclxuICAvLyBhcnJheSBvZiBhY3RpdmVseSBwcmVzc2VkIGtleXNcclxuICB2YXIgYWN0aXZlS2V5cyA9IFtdO1xyXG5cclxuICAvLyBjYWNoZSBkb2N1bWVudC5ib2R5XHJcbiAgdmFyIGJvZHk7XHJcblxyXG4gIC8vIGJvb2xlYW46IHRydWUgaWYgdG91Y2ggYnVmZmVyIHRpbWVyIGlzIHJ1bm5pbmdcclxuICB2YXIgYnVmZmVyID0gZmFsc2U7XHJcblxyXG4gIC8vIHRoZSBsYXN0IHVzZWQgaW5wdXQgdHlwZVxyXG4gIHZhciBjdXJyZW50SW5wdXQgPSBudWxsO1xyXG5cclxuICAvLyBgaW5wdXRgIHR5cGVzIHRoYXQgZG9uJ3QgYWNjZXB0IHRleHRcclxuICB2YXIgbm9uVHlwaW5nSW5wdXRzID0gW1xyXG4gICAgJ2J1dHRvbicsXHJcbiAgICAnY2hlY2tib3gnLFxyXG4gICAgJ2ZpbGUnLFxyXG4gICAgJ2ltYWdlJyxcclxuICAgICdyYWRpbycsXHJcbiAgICAncmVzZXQnLFxyXG4gICAgJ3N1Ym1pdCdcclxuICBdO1xyXG5cclxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcclxuICAvLyB2aWEgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzL3doZWVsXHJcbiAgdmFyIG1vdXNlV2hlZWwgPSBkZXRlY3RXaGVlbCgpO1xyXG5cclxuICAvLyBsaXN0IG9mIG1vZGlmaWVyIGtleXMgY29tbW9ubHkgdXNlZCB3aXRoIHRoZSBtb3VzZSBhbmRcclxuICAvLyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgdG8gcHJldmVudCBmYWxzZSBrZXlib2FyZCBkZXRlY3Rpb25cclxuICB2YXIgaWdub3JlTWFwID0gW1xyXG4gICAgMTYsIC8vIHNoaWZ0XHJcbiAgICAxNywgLy8gY29udHJvbFxyXG4gICAgMTgsIC8vIGFsdFxyXG4gICAgOTEsIC8vIFdpbmRvd3Mga2V5IC8gbGVmdCBBcHBsZSBjbWRcclxuICAgIDkzICAvLyBXaW5kb3dzIG1lbnUgLyByaWdodCBBcHBsZSBjbWRcclxuICBdO1xyXG5cclxuICAvLyBtYXBwaW5nIG9mIGV2ZW50cyB0byBpbnB1dCB0eXBlc1xyXG4gIHZhciBpbnB1dE1hcCA9IHtcclxuICAgICdrZXlkb3duJzogJ2tleWJvYXJkJyxcclxuICAgICdrZXl1cCc6ICdrZXlib2FyZCcsXHJcbiAgICAnbW91c2Vkb3duJzogJ21vdXNlJyxcclxuICAgICdtb3VzZW1vdmUnOiAnbW91c2UnLFxyXG4gICAgJ01TUG9pbnRlckRvd24nOiAncG9pbnRlcicsXHJcbiAgICAnTVNQb2ludGVyTW92ZSc6ICdwb2ludGVyJyxcclxuICAgICdwb2ludGVyZG93bic6ICdwb2ludGVyJyxcclxuICAgICdwb2ludGVybW92ZSc6ICdwb2ludGVyJyxcclxuICAgICd0b3VjaHN0YXJ0JzogJ3RvdWNoJ1xyXG4gIH07XHJcblxyXG4gIC8vIGFkZCBjb3JyZWN0IG1vdXNlIHdoZWVsIGV2ZW50IG1hcHBpbmcgdG8gYGlucHV0TWFwYFxyXG4gIGlucHV0TWFwW2RldGVjdFdoZWVsKCldID0gJ21vdXNlJztcclxuXHJcbiAgLy8gYXJyYXkgb2YgYWxsIHVzZWQgaW5wdXQgdHlwZXNcclxuICB2YXIgaW5wdXRUeXBlcyA9IFtdO1xyXG5cclxuICAvLyBtYXBwaW5nIG9mIGtleSBjb2RlcyB0byBhIGNvbW1vbiBuYW1lXHJcbiAgdmFyIGtleU1hcCA9IHtcclxuICAgIDk6ICd0YWInLFxyXG4gICAgMTM6ICdlbnRlcicsXHJcbiAgICAxNjogJ3NoaWZ0JyxcclxuICAgIDI3OiAnZXNjJyxcclxuICAgIDMyOiAnc3BhY2UnLFxyXG4gICAgMzc6ICdsZWZ0JyxcclxuICAgIDM4OiAndXAnLFxyXG4gICAgMzk6ICdyaWdodCcsXHJcbiAgICA0MDogJ2Rvd24nXHJcbiAgfTtcclxuXHJcbiAgLy8gbWFwIG9mIElFIDEwIHBvaW50ZXIgZXZlbnRzXHJcbiAgdmFyIHBvaW50ZXJNYXAgPSB7XHJcbiAgICAyOiAndG91Y2gnLFxyXG4gICAgMzogJ3RvdWNoJywgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcclxuICAgIDQ6ICdtb3VzZSdcclxuICB9O1xyXG5cclxuICAvLyB0b3VjaCBidWZmZXIgdGltZXJcclxuICB2YXIgdGltZXI7XHJcblxyXG5cclxuICAvKlxyXG4gICAgLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBmdW5jdGlvbnNcclxuICAgIC0tLS0tLS0tLS0tLS0tLVxyXG4gICovXHJcblxyXG4gIC8vIGFsbG93cyBldmVudHMgdGhhdCBhcmUgYWxzbyB0cmlnZ2VyZWQgdG8gYmUgZmlsdGVyZWQgb3V0IGZvciBgdG91Y2hzdGFydGBcclxuICBmdW5jdGlvbiBldmVudEJ1ZmZlcigpIHtcclxuICAgIGNsZWFyVGltZXIoKTtcclxuICAgIHNldElucHV0KGV2ZW50KTtcclxuXHJcbiAgICBidWZmZXIgPSB0cnVlO1xyXG4gICAgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgYnVmZmVyID0gZmFsc2U7XHJcbiAgICB9LCA2NTApO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYnVmZmVyZWRFdmVudChldmVudCkge1xyXG4gICAgaWYgKCFidWZmZXIpIHNldElucHV0KGV2ZW50KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHVuQnVmZmVyZWRFdmVudChldmVudCkge1xyXG4gICAgY2xlYXJUaW1lcigpO1xyXG4gICAgc2V0SW5wdXQoZXZlbnQpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2xlYXJUaW1lcigpIHtcclxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2V0SW5wdXQoZXZlbnQpIHtcclxuICAgIHZhciBldmVudEtleSA9IGtleShldmVudCk7XHJcbiAgICB2YXIgdmFsdWUgPSBpbnB1dE1hcFtldmVudC50eXBlXTtcclxuICAgIGlmICh2YWx1ZSA9PT0gJ3BvaW50ZXInKSB2YWx1ZSA9IHBvaW50ZXJUeXBlKGV2ZW50KTtcclxuXHJcbiAgICAvLyBkb24ndCBkbyBhbnl0aGluZyBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgaW5wdXQgdHlwZSBhbHJlYWR5IHNldFxyXG4gICAgaWYgKGN1cnJlbnRJbnB1dCAhPT0gdmFsdWUpIHtcclxuICAgICAgdmFyIGV2ZW50VGFyZ2V0ID0gdGFyZ2V0KGV2ZW50KTtcclxuICAgICAgdmFyIGV2ZW50VGFyZ2V0Tm9kZSA9IGV2ZW50VGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIHZhciBldmVudFRhcmdldFR5cGUgPSAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnKSA/IGV2ZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgndHlwZScpIDogbnVsbDtcclxuXHJcbiAgICAgIGlmIChcclxuICAgICAgICAoLy8gb25seSBpZiB0aGUgdXNlciBmbGFnIHRvIGFsbG93IHR5cGluZyBpbiBmb3JtIGZpZWxkcyBpc24ndCBzZXRcclxuICAgICAgICAhYm9keS5oYXNBdHRyaWJ1dGUoJ2RhdGEtd2hhdGlucHV0LWZvcm10eXBpbmcnKSAmJlxyXG5cclxuICAgICAgICAvLyBvbmx5IGlmIGN1cnJlbnRJbnB1dCBoYXMgYSB2YWx1ZVxyXG4gICAgICAgIGN1cnJlbnRJbnB1dCAmJlxyXG5cclxuICAgICAgICAvLyBvbmx5IGlmIHRoZSBpbnB1dCBpcyBga2V5Ym9hcmRgXHJcbiAgICAgICAgdmFsdWUgPT09ICdrZXlib2FyZCcgJiZcclxuXHJcbiAgICAgICAgLy8gbm90IGlmIHRoZSBrZXkgaXMgYFRBQmBcclxuICAgICAgICBrZXlNYXBbZXZlbnRLZXldICE9PSAndGFiJyAmJlxyXG5cclxuICAgICAgICAvLyBvbmx5IGlmIHRoZSB0YXJnZXQgaXMgYSBmb3JtIGlucHV0IHRoYXQgYWNjZXB0cyB0ZXh0XHJcbiAgICAgICAgKFxyXG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3RleHRhcmVhJyB8fFxyXG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3NlbGVjdCcgfHxcclxuICAgICAgICAgICAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnICYmIG5vblR5cGluZ0lucHV0cy5pbmRleE9mKGV2ZW50VGFyZ2V0VHlwZSkgPCAwKVxyXG4gICAgICAgICkpIHx8IChcclxuICAgICAgICAgIC8vIGlnbm9yZSBtb2RpZmllciBrZXlzXHJcbiAgICAgICAgICBpZ25vcmVNYXAuaW5kZXhPZihldmVudEtleSkgPiAtMVxyXG4gICAgICAgIClcclxuICAgICAgKSB7XHJcbiAgICAgICAgLy8gaWdub3JlIGtleWJvYXJkIHR5cGluZ1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHN3aXRjaElucHV0KHZhbHVlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh2YWx1ZSA9PT0gJ2tleWJvYXJkJykgbG9nS2V5cyhldmVudEtleSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzd2l0Y2hJbnB1dChzdHJpbmcpIHtcclxuICAgIGN1cnJlbnRJbnB1dCA9IHN0cmluZztcclxuICAgIGJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dCcsIGN1cnJlbnRJbnB1dCk7XHJcblxyXG4gICAgaWYgKGlucHV0VHlwZXMuaW5kZXhPZihjdXJyZW50SW5wdXQpID09PSAtMSkgaW5wdXRUeXBlcy5wdXNoKGN1cnJlbnRJbnB1dCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBrZXkoZXZlbnQpIHtcclxuICAgIHJldHVybiAoZXZlbnQua2V5Q29kZSkgPyBldmVudC5rZXlDb2RlIDogZXZlbnQud2hpY2g7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB0YXJnZXQoZXZlbnQpIHtcclxuICAgIHJldHVybiBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBvaW50ZXJUeXBlKGV2ZW50KSB7XHJcbiAgICBpZiAodHlwZW9mIGV2ZW50LnBvaW50ZXJUeXBlID09PSAnbnVtYmVyJykge1xyXG4gICAgICByZXR1cm4gcG9pbnRlck1hcFtldmVudC5wb2ludGVyVHlwZV07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gKGV2ZW50LnBvaW50ZXJUeXBlID09PSAncGVuJykgPyAndG91Y2gnIDogZXZlbnQucG9pbnRlclR5cGU7IC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBrZXlib2FyZCBsb2dnaW5nXHJcbiAgZnVuY3Rpb24gbG9nS2V5cyhldmVudEtleSkge1xyXG4gICAgaWYgKGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKSA9PT0gLTEgJiYga2V5TWFwW2V2ZW50S2V5XSkgYWN0aXZlS2V5cy5wdXNoKGtleU1hcFtldmVudEtleV0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gdW5Mb2dLZXlzKGV2ZW50KSB7XHJcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xyXG4gICAgdmFyIGFycmF5UG9zID0gYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pO1xyXG5cclxuICAgIGlmIChhcnJheVBvcyAhPT0gLTEpIGFjdGl2ZUtleXMuc3BsaWNlKGFycmF5UG9zLCAxKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XHJcbiAgICBib2R5ID0gZG9jdW1lbnQuYm9keTtcclxuXHJcbiAgICAvLyBwb2ludGVyIGV2ZW50cyAobW91c2UsIHBlbiwgdG91Y2gpXHJcbiAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkge1xyXG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgYnVmZmVyZWRFdmVudCk7XHJcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBidWZmZXJlZEV2ZW50KTtcclxuICAgIH0gZWxzZSBpZiAod2luZG93Lk1TUG9pbnRlckV2ZW50KSB7XHJcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignTVNQb2ludGVyRG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xyXG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlck1vdmUnLCBidWZmZXJlZEV2ZW50KTtcclxuICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAvLyBtb3VzZSBldmVudHNcclxuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBidWZmZXJlZEV2ZW50KTtcclxuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBidWZmZXJlZEV2ZW50KTtcclxuXHJcbiAgICAgIC8vIHRvdWNoIGV2ZW50c1xyXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB7XHJcbiAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZXZlbnRCdWZmZXIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbW91c2Ugd2hlZWxcclxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcihtb3VzZVdoZWVsLCBidWZmZXJlZEV2ZW50KTtcclxuXHJcbiAgICAvLyBrZXlib2FyZCBldmVudHNcclxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHVuQnVmZmVyZWRFdmVudCk7XHJcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5CdWZmZXJlZEV2ZW50KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5Mb2dLZXlzKTtcclxuICB9XHJcblxyXG5cclxuICAvKlxyXG4gICAgLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB1dGlsaXRpZXNcclxuICAgIC0tLS0tLS0tLS0tLS0tLVxyXG4gICovXHJcblxyXG4gIC8vIGRldGVjdCB2ZXJzaW9uIG9mIG1vdXNlIHdoZWVsIGV2ZW50IHRvIHVzZVxyXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcclxuICBmdW5jdGlvbiBkZXRlY3RXaGVlbCgpIHtcclxuICAgIHJldHVybiBtb3VzZVdoZWVsID0gJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpID9cclxuICAgICAgJ3doZWVsJyA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxyXG5cclxuICAgICAgZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWQgP1xyXG4gICAgICAgICdtb3VzZXdoZWVsJyA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxyXG4gICAgICAgICdET01Nb3VzZVNjcm9sbCc7IC8vIGxldCdzIGFzc3VtZSB0aGF0IHJlbWFpbmluZyBicm93c2VycyBhcmUgb2xkZXIgRmlyZWZveFxyXG4gIH1cclxuXHJcblxyXG4gIC8qXHJcbiAgICAtLS0tLS0tLS0tLS0tLS1cclxuICAgIGluaXRcclxuXHJcbiAgICBkb24ndCBzdGFydCBzY3JpcHQgdW5sZXNzIGJyb3dzZXIgY3V0cyB0aGUgbXVzdGFyZCxcclxuICAgIGFsc28gcGFzc2VzIGlmIHBvbHlmaWxscyBhcmUgdXNlZFxyXG4gICAgLS0tLS0tLS0tLS0tLS0tXHJcbiAgKi9cclxuXHJcbiAgaWYgKFxyXG4gICAgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJlxyXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2ZcclxuICApIHtcclxuXHJcbiAgICAvLyBpZiB0aGUgZG9tIGlzIGFscmVhZHkgcmVhZHkgYWxyZWFkeSAoc2NyaXB0IHdhcyBwbGFjZWQgYXQgYm90dG9tIG9mIDxib2R5PilcclxuICAgIGlmIChkb2N1bWVudC5ib2R5KSB7XHJcbiAgICAgIGJpbmRFdmVudHMoKTtcclxuXHJcbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIGRvbSB0byBsb2FkIChzY3JpcHQgd2FzIHBsYWNlZCBpbiB0aGUgPGhlYWQ+KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGJpbmRFdmVudHMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcblxyXG4gIC8qXHJcbiAgICAtLS0tLS0tLS0tLS0tLS1cclxuICAgIGFwaVxyXG4gICAgLS0tLS0tLS0tLS0tLS0tXHJcbiAgKi9cclxuXHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICAvLyByZXR1cm5zIHN0cmluZzogdGhlIGN1cnJlbnQgaW5wdXQgdHlwZVxyXG4gICAgYXNrOiBmdW5jdGlvbigpIHsgcmV0dXJuIGN1cnJlbnRJbnB1dDsgfSxcclxuXHJcbiAgICAvLyByZXR1cm5zIGFycmF5OiBjdXJyZW50bHkgcHJlc3NlZCBrZXlzXHJcbiAgICBrZXlzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGFjdGl2ZUtleXM7IH0sXHJcblxyXG4gICAgLy8gcmV0dXJucyBhcnJheTogYWxsIHRoZSBkZXRlY3RlZCBpbnB1dCB0eXBlc1xyXG4gICAgdHlwZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5wdXRUeXBlczsgfSxcclxuXHJcbiAgICAvLyBhY2NlcHRzIHN0cmluZzogbWFudWFsbHkgc2V0IHRoZSBpbnB1dCB0eXBlXHJcbiAgICBzZXQ6IHN3aXRjaElucHV0XHJcbiAgfTtcclxuXHJcbn0oKSk7XHJcbiIsIiFmdW5jdGlvbigkKSB7XHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBGT1VOREFUSU9OX1ZFUlNJT04gPSAnNi4yLjInO1xyXG5cclxuLy8gR2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XHJcbi8vIFRoaXMgaXMgYXR0YWNoZWQgdG8gdGhlIHdpbmRvdywgb3IgdXNlZCBhcyBhIG1vZHVsZSBmb3IgQU1EL0Jyb3dzZXJpZnlcclxudmFyIEZvdW5kYXRpb24gPSB7XHJcbiAgdmVyc2lvbjogRk9VTkRBVElPTl9WRVJTSU9OLFxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZXMgaW5pdGlhbGl6ZWQgcGx1Z2lucy5cclxuICAgKi9cclxuICBfcGx1Z2luczoge30sXHJcblxyXG4gIC8qKlxyXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xyXG4gICAqL1xyXG4gIF91dWlkczogW10sXHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgYSBib29sZWFuIGZvciBSVEwgc3VwcG9ydFxyXG4gICAqL1xyXG4gIHJ0bDogZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiAkKCdodG1sJykuYXR0cignZGlyJykgPT09ICdydGwnO1xyXG4gIH0sXHJcbiAgLyoqXHJcbiAgICogRGVmaW5lcyBhIEZvdW5kYXRpb24gcGx1Z2luLCBhZGRpbmcgaXQgdG8gdGhlIGBGb3VuZGF0aW9uYCBuYW1lc3BhY2UgYW5kIHRoZSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZSB3aGVuIHJlZmxvd2luZy5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXHJcbiAgICovXHJcbiAgcGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcclxuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxyXG4gICAgLy8gRXhhbXBsZXM6IEZvdW5kYXRpb24uUmV2ZWFsLCBGb3VuZGF0aW9uLk9mZkNhbnZhc1xyXG4gICAgdmFyIGNsYXNzTmFtZSA9IChuYW1lIHx8IGZ1bmN0aW9uTmFtZShwbHVnaW4pKTtcclxuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxyXG4gICAgLy8gRXhhbXBsZXM6IGRhdGEtcmV2ZWFsLCBkYXRhLW9mZi1jYW52YXNcclxuICAgIHZhciBhdHRyTmFtZSAgPSBoeXBoZW5hdGUoY2xhc3NOYW1lKTtcclxuXHJcbiAgICAvLyBBZGQgdG8gdGhlIEZvdW5kYXRpb24gb2JqZWN0IGFuZCB0aGUgcGx1Z2lucyBsaXN0IChmb3IgcmVmbG93aW5nKVxyXG4gICAgdGhpcy5fcGx1Z2luc1thdHRyTmFtZV0gPSB0aGlzW2NsYXNzTmFtZV0gPSBwbHVnaW47XHJcbiAgfSxcclxuICAvKipcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXHJcbiAgICogQWRkcyB0aGUgYHpmUGx1Z2luYCBkYXRhLWF0dHJpYnV0ZSB0byBwcm9ncmFtbWF0aWNhbGx5IGNyZWF0ZWQgcGx1Z2lucyB0byBhbGxvdyB1c2Ugb2YgJChzZWxlY3RvcikuZm91bmRhdGlvbihtZXRob2QpIGNhbGxzLlxyXG4gICAqIEFsc28gZmlyZXMgdGhlIGluaXRpYWxpemF0aW9uIGV2ZW50IGZvciBlYWNoIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHBsdWdpbiwgcGFzc2VkIGFzIGEgY2FtZWxDYXNlZCBzdHJpbmcuXHJcbiAgICogQGZpcmVzIFBsdWdpbiNpbml0XHJcbiAgICovXHJcbiAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSl7XHJcbiAgICB2YXIgcGx1Z2luTmFtZSA9IG5hbWUgPyBoeXBoZW5hdGUobmFtZSkgOiBmdW5jdGlvbk5hbWUocGx1Z2luLmNvbnN0cnVjdG9yKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xyXG5cclxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkpeyBwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCwgcGx1Z2luLnV1aWQpOyB9XHJcbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XHJcbiAgICAgICAgICAvKipcclxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgaW5pdGlhbGl6ZWQuXHJcbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcclxuICAgICAgICAgICAqL1xyXG4gICAgcGx1Z2luLiRlbGVtZW50LnRyaWdnZXIoYGluaXQuemYuJHtwbHVnaW5OYW1lfWApO1xyXG5cclxuICAgIHRoaXMuX3V1aWRzLnB1c2gocGx1Z2luLnV1aWQpO1xyXG5cclxuICAgIHJldHVybjtcclxuICB9LFxyXG4gIC8qKlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIFJlbW92ZXMgdGhlIHBsdWdpbnMgdXVpZCBmcm9tIHRoZSBfdXVpZHMgYXJyYXkuXHJcbiAgICogUmVtb3ZlcyB0aGUgemZQbHVnaW4gZGF0YSBhdHRyaWJ1dGUsIGFzIHdlbGwgYXMgdGhlIGRhdGEtcGx1Z2luLW5hbWUgYXR0cmlidXRlLlxyXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxyXG4gICAqIEBmaXJlcyBQbHVnaW4jZGVzdHJveWVkXHJcbiAgICovXHJcbiAgdW5yZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luKXtcclxuICAgIHZhciBwbHVnaW5OYW1lID0gaHlwaGVuYXRlKGZ1bmN0aW9uTmFtZShwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKS5jb25zdHJ1Y3RvcikpO1xyXG5cclxuICAgIHRoaXMuX3V1aWRzLnNwbGljZSh0aGlzLl91dWlkcy5pbmRleE9mKHBsdWdpbi51dWlkKSwgMSk7XHJcbiAgICBwbHVnaW4uJGVsZW1lbnQucmVtb3ZlQXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkucmVtb3ZlRGF0YSgnemZQbHVnaW4nKVxyXG4gICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGJlZW4gZGVzdHJveWVkLlxyXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNkZXN0cm95ZWRcclxuICAgICAgICAgICAqL1xyXG4gICAgICAgICAgLnRyaWdnZXIoYGRlc3Ryb3llZC56Zi4ke3BsdWdpbk5hbWV9YCk7XHJcbiAgICBmb3IodmFyIHByb3AgaW4gcGx1Z2luKXtcclxuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXHJcbiAgICB9XHJcbiAgICByZXR1cm47XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQ2F1c2VzIG9uZSBvciBtb3JlIGFjdGl2ZSBwbHVnaW5zIHRvIHJlLWluaXRpYWxpemUsIHJlc2V0dGluZyBldmVudCBsaXN0ZW5lcnMsIHJlY2FsY3VsYXRpbmcgcG9zaXRpb25zLCBldGMuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbnMgLSBvcHRpb25hbCBzdHJpbmcgb2YgYW4gaW5kaXZpZHVhbCBwbHVnaW4ga2V5LCBhdHRhaW5lZCBieSBjYWxsaW5nIGAkKGVsZW1lbnQpLmRhdGEoJ3BsdWdpbk5hbWUnKWAsIG9yIHN0cmluZyBvZiBhIHBsdWdpbiBjbGFzcyBpLmUuIGAnZHJvcGRvd24nYFxyXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXHJcbiAgICovXHJcbiAgIHJlSW5pdDogZnVuY3Rpb24ocGx1Z2lucyl7XHJcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcclxuICAgICB0cnl7XHJcbiAgICAgICBpZihpc0pRKXtcclxuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgJCh0aGlzKS5kYXRhKCd6ZlBsdWdpbicpLl9pbml0KCk7XHJcbiAgICAgICAgIH0pO1xyXG4gICAgICAgfWVsc2V7XHJcbiAgICAgICAgIHZhciB0eXBlID0gdHlwZW9mIHBsdWdpbnMsXHJcbiAgICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgZm5zID0ge1xyXG4gICAgICAgICAgICdvYmplY3QnOiBmdW5jdGlvbihwbGdzKXtcclxuICAgICAgICAgICAgIHBsZ3MuZm9yRWFjaChmdW5jdGlvbihwKXtcclxuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcclxuICAgICAgICAgICAgICAgJCgnW2RhdGEtJysgcCArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xyXG4gICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgfSxcclxuICAgICAgICAgICAnc3RyaW5nJzogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgIHBsdWdpbnMgPSBoeXBoZW5hdGUocGx1Z2lucyk7XHJcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XHJcbiAgICAgICAgICAgfSxcclxuICAgICAgICAgICAndW5kZWZpbmVkJzogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgICB9O1xyXG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XHJcbiAgICAgICB9XHJcbiAgICAgfWNhdGNoKGVycil7XHJcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgfWZpbmFsbHl7XHJcbiAgICAgICByZXR1cm4gcGx1Z2lucztcclxuICAgICB9XHJcbiAgIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIHJldHVybnMgYSByYW5kb20gYmFzZS0zNiB1aWQgd2l0aCBuYW1lc3BhY2luZ1xyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2UgLSBuYW1lIG9mIHBsdWdpbiB0byBiZSBpbmNvcnBvcmF0ZWQgaW4gdWlkLCBvcHRpb25hbC5cclxuICAgKiBAZGVmYXVsdCB7U3RyaW5nfSAnJyAtIGlmIG5vIHBsdWdpbiBuYW1lIGlzIHByb3ZpZGVkLCBub3RoaW5nIGlzIGFwcGVuZGVkIHRvIHRoZSB1aWQuXHJcbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcclxuICAgKi9cclxuICBHZXRZb0RpZ2l0czogZnVuY3Rpb24obGVuZ3RoLCBuYW1lc3BhY2Upe1xyXG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5wb3coMzYsIGxlbmd0aCArIDEpIC0gTWF0aC5yYW5kb20oKSAqIE1hdGgucG93KDM2LCBsZW5ndGgpKSkudG9TdHJpbmcoMzYpLnNsaWNlKDEpICsgKG5hbWVzcGFjZSA/IGAtJHtuYW1lc3BhY2V9YCA6ICcnKTtcclxuICB9LFxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgcGx1Z2lucyBvbiBhbnkgZWxlbWVudHMgd2l0aGluIGBlbGVtYCAoYW5kIGBlbGVtYCBpdHNlbGYpIHRoYXQgYXJlbid0IGFscmVhZHkgaW5pdGlhbGl6ZWQuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgdG8gY2hlY2sgaW5zaWRlLiBBbHNvIGNoZWNrcyB0aGUgZWxlbWVudCBpdHNlbGYsIHVubGVzcyBpdCdzIHRoZSBgZG9jdW1lbnRgIG9iamVjdC5cclxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cclxuICAgKi9cclxuICByZWZsb3c6IGZ1bmN0aW9uKGVsZW0sIHBsdWdpbnMpIHtcclxuXHJcbiAgICAvLyBJZiBwbHVnaW5zIGlzIHVuZGVmaW5lZCwganVzdCBncmFiIGV2ZXJ5dGhpbmdcclxuICAgIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xyXG4gICAgfVxyXG4gICAgLy8gSWYgcGx1Z2lucyBpcyBhIHN0cmluZywgY29udmVydCBpdCB0byBhbiBhcnJheSB3aXRoIG9uZSBpdGVtXHJcbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgcGx1Z2lucyA9IFtwbHVnaW5zXTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxyXG4gICAgJC5lYWNoKHBsdWdpbnMsIGZ1bmN0aW9uKGksIG5hbWUpIHtcclxuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBsdWdpblxyXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XHJcblxyXG4gICAgICAvLyBMb2NhbGl6ZSB0aGUgc2VhcmNoIHRvIGFsbCBlbGVtZW50cyBpbnNpZGUgZWxlbSwgYXMgd2VsbCBhcyBlbGVtIGl0c2VsZiwgdW5sZXNzIGVsZW0gPT09IGRvY3VtZW50XHJcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XHJcblxyXG4gICAgICAvLyBGb3IgZWFjaCBwbHVnaW4gZm91bmQsIGluaXRpYWxpemUgaXRcclxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJGVsID0gJCh0aGlzKSxcclxuICAgICAgICAgICAgb3B0cyA9IHt9O1xyXG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xyXG4gICAgICAgIGlmICgkZWwuZGF0YSgnemZQbHVnaW4nKSkge1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHJpZWQgdG8gaW5pdGlhbGl6ZSBcIituYW1lK1wiIG9uIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGhhcyBhIEZvdW5kYXRpb24gcGx1Z2luLlwiKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XHJcbiAgICAgICAgICB2YXIgdGhpbmcgPSAkZWwuYXR0cignZGF0YS1vcHRpb25zJykuc3BsaXQoJzsnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpe1xyXG4gICAgICAgICAgICB2YXIgb3B0ID0gZS5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihlbCl7IHJldHVybiBlbC50cmltKCk7IH0pO1xyXG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnl7XHJcbiAgICAgICAgICAkZWwuZGF0YSgnemZQbHVnaW4nLCBuZXcgcGx1Z2luKCQodGhpcyksIG9wdHMpKTtcclxuICAgICAgICB9Y2F0Y2goZXIpe1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XHJcbiAgICAgICAgfWZpbmFsbHl7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgZ2V0Rm5OYW1lOiBmdW5jdGlvbk5hbWUsXHJcbiAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24oJGVsZW0pe1xyXG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xyXG4gICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcclxuICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXHJcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxyXG4gICAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXHJcbiAgICB9O1xyXG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICBlbmQ7XHJcblxyXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XHJcbiAgICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpe1xyXG4gICAgICAgIGVuZCA9IHRyYW5zaXRpb25zW3RdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZihlbmQpe1xyXG4gICAgICByZXR1cm4gZW5kO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIGVuZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xyXG4gICAgICB9LCAxKTtcclxuICAgICAgcmV0dXJuICd0cmFuc2l0aW9uZW5kJztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5Gb3VuZGF0aW9uLnV0aWwgPSB7XHJcbiAgLyoqXHJcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IGVuZCBvZiB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxyXG4gICAqIEByZXR1cm5zIGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xyXG4gICAgdmFyIHRpbWVyID0gbnVsbDtcclxuXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XHJcblxyXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcclxuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcclxuICAgICAgICAgIHRpbWVyID0gbnVsbDtcclxuICAgICAgICB9LCBkZWxheSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLy8gVE9ETzogY29uc2lkZXIgbm90IG1ha2luZyB0aGlzIGEgalF1ZXJ5IGZ1bmN0aW9uXHJcbi8vIFRPRE86IG5lZWQgd2F5IHRvIHJlZmxvdyB2cy4gcmUtaW5pdGlhbGl6ZVxyXG4vKipcclxuICogVGhlIEZvdW5kYXRpb24galF1ZXJ5IG1ldGhvZC5cclxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG1ldGhvZCAtIEFuIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBjdXJyZW50IGpRdWVyeSBvYmplY3QuXHJcbiAqL1xyXG52YXIgZm91bmRhdGlvbiA9IGZ1bmN0aW9uKG1ldGhvZCkge1xyXG4gIHZhciB0eXBlID0gdHlwZW9mIG1ldGhvZCxcclxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcclxuICAgICAgJG5vSlMgPSAkKCcubm8tanMnKTtcclxuXHJcbiAgaWYoISRtZXRhLmxlbmd0aCl7XHJcbiAgICAkKCc8bWV0YSBjbGFzcz1cImZvdW5kYXRpb24tbXFcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKTtcclxuICB9XHJcbiAgaWYoJG5vSlMubGVuZ3RoKXtcclxuICAgICRub0pTLnJlbW92ZUNsYXNzKCduby1qcycpO1xyXG4gIH1cclxuXHJcbiAgaWYodHlwZSA9PT0gJ3VuZGVmaW5lZCcpey8vbmVlZHMgdG8gaW5pdGlhbGl6ZSB0aGUgRm91bmRhdGlvbiBvYmplY3QsIG9yIGFuIGluZGl2aWR1YWwgcGx1Z2luLlxyXG4gICAgRm91bmRhdGlvbi5NZWRpYVF1ZXJ5Ll9pbml0KCk7XHJcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcclxuICB9ZWxzZSBpZih0eXBlID09PSAnc3RyaW5nJyl7Ly9hbiBpbmRpdmlkdWFsIG1ldGhvZCB0byBpbnZva2Ugb24gYSBwbHVnaW4gb3IgZ3JvdXAgb2YgcGx1Z2luc1xyXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOy8vY29sbGVjdCBhbGwgdGhlIGFyZ3VtZW50cywgaWYgbmVjZXNzYXJ5XHJcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cclxuXHJcbiAgICBpZihwbHVnQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBwbHVnQ2xhc3NbbWV0aG9kXSAhPT0gdW5kZWZpbmVkKXsvL21ha2Ugc3VyZSBib3RoIHRoZSBjbGFzcyBhbmQgbWV0aG9kIGV4aXN0XHJcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXHJcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseShwbHVnQ2xhc3MsIGFyZ3MpO1xyXG4gICAgICB9ZWxzZXtcclxuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcclxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KCQoZWwpLmRhdGEoJ3pmUGx1Z2luJyksIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9ZWxzZXsvL2Vycm9yIGZvciBubyBjbGFzcyBvciBubyBtZXRob2RcclxuICAgICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwiV2UncmUgc29ycnksICdcIiArIG1ldGhvZCArIFwiJyBpcyBub3QgYW4gYXZhaWxhYmxlIG1ldGhvZCBmb3IgXCIgKyAocGx1Z0NsYXNzID8gZnVuY3Rpb25OYW1lKHBsdWdDbGFzcykgOiAndGhpcyBlbGVtZW50JykgKyAnLicpO1xyXG4gICAgfVxyXG4gIH1lbHNley8vZXJyb3IgZm9yIGludmFsaWQgYXJndW1lbnQgdHlwZVxyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgV2UncmUgc29ycnksICR7dHlwZX0gaXMgbm90IGEgdmFsaWQgcGFyYW1ldGVyLiBZb3UgbXVzdCB1c2UgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtZXRob2QgeW91IHdpc2ggdG8gaW52b2tlLmApO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbndpbmRvdy5Gb3VuZGF0aW9uID0gRm91bmRhdGlvbjtcclxuJC5mbi5mb3VuZGF0aW9uID0gZm91bmRhdGlvbjtcclxuXHJcbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuKGZ1bmN0aW9uKCkge1xyXG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcclxuICAgIHdpbmRvdy5EYXRlLm5vdyA9IERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcclxuXHJcbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcclxuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XHJcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XHJcbiAgfVxyXG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXHJcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xyXG4gICAgfTtcclxuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcclxuICB9XHJcbiAgLyoqXHJcbiAgICogUG9seWZpbGwgZm9yIHBlcmZvcm1hbmNlLm5vdywgcmVxdWlyZWQgYnkgckFGXHJcbiAgICovXHJcbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XHJcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XHJcbiAgICAgIHN0YXJ0OiBEYXRlLm5vdygpLFxyXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxyXG4gICAgfTtcclxuICB9XHJcbn0pKCk7XHJcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcclxuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XHJcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgLy8gY2xvc2VzdCB0aGluZyBwb3NzaWJsZSB0byB0aGUgRUNNQVNjcmlwdCA1XHJcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXHJcbiAgICAgICAgZlRvQmluZCA9IHRoaXMsXHJcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXHJcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1BcclxuICAgICAgICAgICAgICAgICA/IHRoaXNcclxuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxyXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBpZiAodGhpcy5wcm90b3R5cGUpIHtcclxuICAgICAgLy8gbmF0aXZlIGZ1bmN0aW9ucyBkb24ndCBoYXZlIGEgcHJvdG90eXBlXHJcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XHJcbiAgICB9XHJcbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcclxuXHJcbiAgICByZXR1cm4gZkJvdW5kO1xyXG4gIH07XHJcbn1cclxuLy8gUG9seWZpbGwgdG8gZ2V0IHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gaW4gSUU5XHJcbmZ1bmN0aW9uIGZ1bmN0aW9uTmFtZShmbikge1xyXG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICB2YXIgZnVuY05hbWVSZWdleCA9IC9mdW5jdGlvblxccyhbXihdezEsfSlcXCgvO1xyXG4gICAgdmFyIHJlc3VsdHMgPSAoZnVuY05hbWVSZWdleCkuZXhlYygoZm4pLnRvU3RyaW5nKCkpO1xyXG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKGZuLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XHJcbiAgfVxyXG59XHJcbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcclxuICBpZigvdHJ1ZS8udGVzdChzdHIpKSByZXR1cm4gdHJ1ZTtcclxuICBlbHNlIGlmKC9mYWxzZS8udGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XHJcbiAgZWxzZSBpZighaXNOYU4oc3RyICogMSkpIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XHJcbiAgcmV0dXJuIHN0cjtcclxufVxyXG4vLyBDb252ZXJ0IFBhc2NhbENhc2UgdG8ga2ViYWItY2FzZVxyXG4vLyBUaGFuayB5b3U6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzg5NTU1ODBcclxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xyXG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcclxufVxyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuRm91bmRhdGlvbi5Cb3ggPSB7XHJcbiAgSW1Ob3RUb3VjaGluZ1lvdTogSW1Ob3RUb3VjaGluZ1lvdSxcclxuICBHZXREaW1lbnNpb25zOiBHZXREaW1lbnNpb25zLFxyXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbXBhcmVzIHRoZSBkaW1lbnNpb25zIG9mIGFuIGVsZW1lbnQgdG8gYSBjb250YWluZXIgYW5kIGRldGVybWluZXMgY29sbGlzaW9uIGV2ZW50cyB3aXRoIGNvbnRhaW5lci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxyXG4gKiBAcGFyYW0ge2pRdWVyeX0gcGFyZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgYm91bmRpbmcgY29udGFpbmVyLlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGxyT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIGxlZnQgYW5kIHJpZ2h0IHZhbHVlcyBvbmx5LlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxyXG4gKiBAZGVmYXVsdCBpZiBubyBwYXJlbnQgb2JqZWN0IHBhc3NlZCwgZGV0ZWN0cyBjb2xsaXNpb25zIHdpdGggYHdpbmRvd2AuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgY29sbGlzaW9uIGZyZWUsIGZhbHNlIGlmIGEgY29sbGlzaW9uIGluIGFueSBkaXJlY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBJbU5vdFRvdWNoaW5nWW91KGVsZW1lbnQsIHBhcmVudCwgbHJPbmx5LCB0Yk9ubHkpIHtcclxuICB2YXIgZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXHJcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcclxuXHJcbiAgaWYgKHBhcmVudCkge1xyXG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XHJcblxyXG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IHBhckRpbXMuaGVpZ2h0ICsgcGFyRGltcy5vZmZzZXQudG9wKTtcclxuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcclxuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IHBhckRpbXMub2Zmc2V0LmxlZnQpO1xyXG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IHBhckRpbXMud2lkdGggKyBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCArIGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcclxuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xyXG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0KTtcclxuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGFsbERpcnMgPSBbYm90dG9tLCB0b3AsIGxlZnQsIHJpZ2h0XTtcclxuXHJcbiAgaWYgKGxyT25seSkge1xyXG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0ID09PSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRiT25seSkge1xyXG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFVzZXMgbmF0aXZlIG1ldGhvZHMgdG8gcmV0dXJuIGFuIG9iamVjdCBvZiBkaW1lbnNpb24gdmFsdWVzLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxyXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIG5lc3RlZCBvYmplY3Qgb2YgaW50ZWdlciBwaXhlbCB2YWx1ZXNcclxuICogVE9ETyAtIGlmIGVsZW1lbnQgaXMgd2luZG93LCByZXR1cm4gb25seSB0aG9zZSB2YWx1ZXMuXHJcbiAqL1xyXG5mdW5jdGlvbiBHZXREaW1lbnNpb25zKGVsZW0sIHRlc3Qpe1xyXG4gIGVsZW0gPSBlbGVtLmxlbmd0aCA/IGVsZW1bMF0gOiBlbGVtO1xyXG5cclxuICBpZiAoZWxlbSA9PT0gd2luZG93IHx8IGVsZW0gPT09IGRvY3VtZW50KSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gc29ycnksIERhdmUuIEknbSBhZnJhaWQgSSBjYW4ndCBkbyB0aGF0LlwiKTtcclxuICB9XHJcblxyXG4gIHZhciByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcclxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcclxuICAgICAgd2luUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXHJcbiAgICAgIHdpblkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXHJcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcclxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXHJcbiAgICBvZmZzZXQ6IHtcclxuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXHJcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpblhcclxuICAgIH0sXHJcbiAgICBwYXJlbnREaW1zOiB7XHJcbiAgICAgIHdpZHRoOiBwYXJSZWN0LndpZHRoLFxyXG4gICAgICBoZWlnaHQ6IHBhclJlY3QuaGVpZ2h0LFxyXG4gICAgICBvZmZzZXQ6IHtcclxuICAgICAgICB0b3A6IHBhclJlY3QudG9wICsgd2luWSxcclxuICAgICAgICBsZWZ0OiBwYXJSZWN0LmxlZnQgKyB3aW5YXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB3aW5kb3dEaW1zOiB7XHJcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxyXG4gICAgICBoZWlnaHQ6IHdpblJlY3QuaGVpZ2h0LFxyXG4gICAgICBvZmZzZXQ6IHtcclxuICAgICAgICB0b3A6IHdpblksXHJcbiAgICAgICAgbGVmdDogd2luWFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhbiBvYmplY3Qgb2YgdG9wIGFuZCBsZWZ0IGludGVnZXIgcGl4ZWwgdmFsdWVzIGZvciBkeW5hbWljYWxseSByZW5kZXJlZCBlbGVtZW50cyxcclxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgYmVpbmcgcG9zaXRpb25lZC5cclxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBhIHN0cmluZyByZWxhdGluZyB0byB0aGUgZGVzaXJlZCBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCwgcmVsYXRpdmUgdG8gaXQncyBhbmNob3JcclxuICogQHBhcmFtIHtOdW1iZXJ9IHZPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgdmVydGljYWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cclxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzT3ZlcmZsb3cgLSBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZCwgc2V0cyB0byB0cnVlIHRvIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gZnVsbCB3aWR0aCAtIGFueSBkZXNpcmVkIG9mZnNldC5cclxuICogVE9ETyBhbHRlci9yZXdyaXRlIHRvIHdvcmsgd2l0aCBgZW1gIHZhbHVlcyBhcyB3ZWxsL2luc3RlYWQgb2YgcGl4ZWxzXHJcbiAqL1xyXG5mdW5jdGlvbiBHZXRPZmZzZXRzKGVsZW1lbnQsIGFuY2hvciwgcG9zaXRpb24sIHZPZmZzZXQsIGhPZmZzZXQsIGlzT3ZlcmZsb3cpIHtcclxuICB2YXIgJGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxyXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XHJcblxyXG4gIHN3aXRjaCAocG9zaXRpb24pIHtcclxuICAgIGNhc2UgJ3RvcCc6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXHJcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXHJcbiAgICAgIH1cclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdsZWZ0JzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxyXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAncmlnaHQnOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0LFxyXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXHJcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXHJcbiAgICAgIH1cclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiBpc092ZXJmbG93ID8gaE9mZnNldCA6ICgoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSksXHJcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXHJcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcclxuICAgICAgfVxyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgKyAxLFxyXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXHJcbiAgICAgIH1cclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdjZW50ZXInOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0ICsgKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcclxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcclxuICAgICAgfVxyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3JldmVhbCc6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLSAkZWxlRGltcy53aWR0aCkgLyAyLFxyXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxyXG4gICAgICB9XHJcbiAgICBjYXNlICdyZXZlYWwgZnVsbCc6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCxcclxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcFxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnbGVmdCBib3R0b20nOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXHJcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XHJcbiAgICAgIH07XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAncmlnaHQgYm90dG9tJzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxyXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodFxyXG4gICAgICB9O1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXHJcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxyXG4gICAgICB9XHJcbiAgfVxyXG59XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXHJcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXHJcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXHJcbiAqIG9yIHRoZSB3ZWIgaHR0cDovL3d3dy5tYXJpdXNvbGJlcnR6LmRlLyAqXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuY29uc3Qga2V5Q29kZXMgPSB7XHJcbiAgOTogJ1RBQicsXHJcbiAgMTM6ICdFTlRFUicsXHJcbiAgMjc6ICdFU0NBUEUnLFxyXG4gIDMyOiAnU1BBQ0UnLFxyXG4gIDM3OiAnQVJST1dfTEVGVCcsXHJcbiAgMzg6ICdBUlJPV19VUCcsXHJcbiAgMzk6ICdBUlJPV19SSUdIVCcsXHJcbiAgNDA6ICdBUlJPV19ET1dOJ1xyXG59XHJcblxyXG52YXIgY29tbWFuZHMgPSB7fVxyXG5cclxudmFyIEtleWJvYXJkID0ge1xyXG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcclxuXHJcbiAgLyoqXHJcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XHJcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXHJcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXHJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcclxuICAgKi9cclxuICBwYXJzZUtleShldmVudCkge1xyXG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XHJcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIGtleSA9IGBTSElGVF8ke2tleX1gO1xyXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XHJcbiAgICBpZiAoZXZlbnQuYWx0S2V5KSBrZXkgPSBgQUxUXyR7a2V5fWA7XHJcbiAgICByZXR1cm4ga2V5O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZXMgdGhlIGdpdmVuIChrZXlib2FyZCkgZXZlbnRcclxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcclxuICAgKiBAcGFyYW0ge09iamVjdHN9IGZ1bmN0aW9ucyAtIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHRoYXQgYXJlIHRvIGJlIGV4ZWN1dGVkXHJcbiAgICovXHJcbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xyXG4gICAgdmFyIGNvbW1hbmRMaXN0ID0gY29tbWFuZHNbY29tcG9uZW50XSxcclxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxyXG4gICAgICBjbWRzLFxyXG4gICAgICBjb21tYW5kLFxyXG4gICAgICBmbjtcclxuXHJcbiAgICBpZiAoIWNvbW1hbmRMaXN0KSByZXR1cm4gY29uc29sZS53YXJuKCdDb21wb25lbnQgbm90IGRlZmluZWQhJyk7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxyXG4gICAgICAgIGNtZHMgPSBjb21tYW5kTGlzdDsgLy8gdXNlIHBsYWluIGxpc3RcclxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxyXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcclxuXHJcbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcclxuICAgIH1cclxuICAgIGNvbW1hbmQgPSBjbWRzW2tleUNvZGVdO1xyXG5cclxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xyXG4gICAgaWYgKGZuICYmIHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uICBpZiBleGlzdHNcclxuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcclxuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcclxuICAgICAgICAgIGZ1bmN0aW9ucy5oYW5kbGVkKHJldHVyblZhbHVlKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKGZ1bmN0aW9ucy51bmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy51bmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBub3QgaGFuZGxlZFxyXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cclxuICAgKiBAcmV0dXJuIHtqUXVlcnl9ICRmb2N1c2FibGUgLSBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiBgJGVsZW1lbnRgXHJcbiAgICovXHJcbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xyXG4gICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJ2FbaHJlZl0sIGFyZWFbaHJlZl0sIGlucHV0Om5vdChbZGlzYWJsZWRdKSwgc2VsZWN0Om5vdChbZGlzYWJsZWRdKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pLCBidXR0b246bm90KFtkaXNhYmxlZF0pLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsICpbdGFiaW5kZXhdLCAqW2NvbnRlbnRlZGl0YWJsZV0nKS5maWx0ZXIoZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcclxuICAgKiBAcmV0dXJuIFN0cmluZyBjb21wb25lbnROYW1lXHJcbiAgICovXHJcblxyXG4gIHJlZ2lzdGVyKGNvbXBvbmVudE5hbWUsIGNtZHMpIHtcclxuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcclxuICB9XHJcbn1cclxuXHJcbi8qXHJcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cclxuICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcclxuICB2YXIgayA9IHt9O1xyXG4gIGZvciAodmFyIGtjIGluIGtjcykga1trY3Nba2NdXSA9IGtjc1trY107XHJcbiAgcmV0dXJuIGs7XHJcbn1cclxuXHJcbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8vIERlZmF1bHQgc2V0IG9mIG1lZGlhIHF1ZXJpZXNcclxuY29uc3QgZGVmYXVsdFF1ZXJpZXMgPSB7XHJcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcclxuICBsYW5kc2NhcGUgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXHJcbiAgcG9ydHJhaXQgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcclxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xyXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcclxuICAgICdvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksJyArXHJcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcclxuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCcgK1xyXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcclxufTtcclxuXHJcbnZhciBNZWRpYVF1ZXJ5ID0ge1xyXG4gIHF1ZXJpZXM6IFtdLFxyXG5cclxuICBjdXJyZW50OiAnJyxcclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1lZGlhIHF1ZXJ5IGhlbHBlciwgYnkgZXh0cmFjdGluZyB0aGUgYnJlYWtwb2ludCBsaXN0IGZyb20gdGhlIENTUyBhbmQgYWN0aXZhdGluZyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZXh0cmFjdGVkU3R5bGVzID0gJCgnLmZvdW5kYXRpb24tbXEnKS5jc3MoJ2ZvbnQtZmFtaWx5Jyk7XHJcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xyXG5cclxuICAgIG5hbWVkUXVlcmllcyA9IHBhcnNlU3R5bGVUb09iamVjdChleHRyYWN0ZWRTdHlsZXMpO1xyXG5cclxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lZFF1ZXJpZXMpIHtcclxuICAgICAgaWYobmFtZWRRdWVyaWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XHJcbiAgICAgICAgICBuYW1lOiBrZXksXHJcbiAgICAgICAgICB2YWx1ZTogYG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAke25hbWVkUXVlcmllc1trZXldfSlgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpO1xyXG5cclxuICAgIHRoaXMuX3dhdGNoZXIoKTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBpcyBhdCBsZWFzdCBhcyB3aWRlIGFzIGEgYnJlYWtwb2ludC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0J3Mgc21hbGxlci5cclxuICAgKi9cclxuICBhdExlYXN0KHNpemUpIHtcclxuICAgIHZhciBxdWVyeSA9IHRoaXMuZ2V0KHNpemUpO1xyXG5cclxuICAgIGlmIChxdWVyeSkge1xyXG4gICAgICByZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpLm1hdGNoZXM7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxyXG4gICAqL1xyXG4gIGdldChzaXplKSB7XHJcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xyXG4gICAgICBpZih0aGlzLnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcclxuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XHJcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cclxuICAgKi9cclxuICBfZ2V0Q3VycmVudFNpemUoKSB7XHJcbiAgICB2YXIgbWF0Y2hlZDtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucXVlcmllcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XHJcblxyXG4gICAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEocXVlcnkudmFsdWUpLm1hdGNoZXMpIHtcclxuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJldHVybiBtYXRjaGVkLm5hbWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbWF0Y2hlZDtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX3dhdGNoZXIoKSB7XHJcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5tZWRpYXF1ZXJ5JywgKCkgPT4ge1xyXG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xyXG5cclxuICAgICAgaWYgKG5ld1NpemUgIT09IGN1cnJlbnRTaXplKSB7XHJcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcclxuXHJcbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xyXG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcclxuXHJcbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cclxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2Vcclxud2luZG93Lm1hdGNoTWVkaWEgfHwgKHdpbmRvdy5tYXRjaE1lZGlhID0gZnVuY3Rpb24oKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IG1hdGNoTWVkaXVtIGFwaSBzdWNoIGFzIElFIDkgYW5kIHdlYmtpdFxyXG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XHJcblxyXG4gIC8vIEZvciB0aG9zZSB0aGF0IGRvbid0IHN1cHBvcnQgbWF0Y2hNZWRpdW1cclxuICBpZiAoIXN0eWxlTWVkaWEpIHtcclxuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcclxuICAgIHNjcmlwdCAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdLFxyXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xyXG5cclxuICAgIHN0eWxlLnR5cGUgID0gJ3RleHQvY3NzJztcclxuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcclxuXHJcbiAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XHJcblxyXG4gICAgLy8gJ3N0eWxlLmN1cnJlbnRTdHlsZScgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnd2luZG93LmdldENvbXB1dGVkU3R5bGUnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcclxuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcclxuXHJcbiAgICBzdHlsZU1lZGlhID0ge1xyXG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xyXG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcclxuXHJcbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXHJcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcclxuICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IHRleHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxyXG4gICAgICAgIHJldHVybiBpbmZvLndpZHRoID09PSAnMXB4JztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcclxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXHJcbiAgICB9O1xyXG4gIH1cclxufSgpKTtcclxuXHJcbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcclxuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xyXG4gIHZhciBzdHlsZU9iamVjdCA9IHt9O1xyXG5cclxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiBzdHlsZU9iamVjdDtcclxuICB9XHJcblxyXG4gIHN0ciA9IHN0ci50cmltKCkuc2xpY2UoMSwgLTEpOyAvLyBicm93c2VycyByZS1xdW90ZSBzdHJpbmcgc3R5bGUgdmFsdWVzXHJcblxyXG4gIGlmICghc3RyKSB7XHJcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XHJcbiAgfVxyXG5cclxuICBzdHlsZU9iamVjdCA9IHN0ci5zcGxpdCgnJicpLnJlZHVjZShmdW5jdGlvbihyZXQsIHBhcmFtKSB7XHJcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xyXG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xyXG4gICAgdmFyIHZhbCA9IHBhcnRzWzFdO1xyXG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XHJcblxyXG4gICAgLy8gbWlzc2luZyBgPWAgc2hvdWxkIGJlIGBudWxsYDpcclxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcclxuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xyXG5cclxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgcmV0W2tleV0gPSB2YWw7XHJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmV0W2tleV0pKSB7XHJcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldFtrZXldID0gW3JldFtrZXldLCB2YWxdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9LCB7fSk7XHJcblxyXG4gIHJldHVybiBzdHlsZU9iamVjdDtcclxufVxyXG5cclxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBNb3Rpb24gbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXHJcbiAqL1xyXG5cclxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xyXG5jb25zdCBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcclxuXHJcbmNvbnN0IE1vdGlvbiA9IHtcclxuICBhbmltYXRlSW46IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcclxuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XHJcbiAgfSxcclxuXHJcbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xyXG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBNb3ZlKGR1cmF0aW9uLCBlbGVtLCBmbil7XHJcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcclxuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xyXG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcclxuICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0LCB0cyk7XHJcbiAgICBwcm9nID0gdHMgLSBzdGFydDtcclxuICAgIGZuLmFwcGx5KGVsZW0pO1xyXG5cclxuICAgIGlmKHByb2cgPCBkdXJhdGlvbil7IGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUsIGVsZW0pOyB9XHJcbiAgICBlbHNle1xyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbSk7XHJcbiAgICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xyXG4gICAgfVxyXG4gIH1cclxuICBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvciBIVE1MIG9iamVjdCB0byBhbmltYXRlLlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gYW5pbWF0aW9uIC0gQ1NTIGNsYXNzIHRvIHVzZS5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXHJcbiAqL1xyXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcclxuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcclxuXHJcbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xyXG5cclxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XHJcbiAgdmFyIGFjdGl2ZUNsYXNzID0gaXNJbiA/IGFjdGl2ZUNsYXNzZXNbMF0gOiBhY3RpdmVDbGFzc2VzWzFdO1xyXG5cclxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxyXG4gIHJlc2V0KCk7XHJcblxyXG4gIGVsZW1lbnRcclxuICAgIC5hZGRDbGFzcyhhbmltYXRpb24pXHJcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcclxuXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcclxuICAgIGlmIChpc0luKSBlbGVtZW50LnNob3coKTtcclxuICB9KTtcclxuXHJcbiAgLy8gU3RhcnQgdGhlIGFuaW1hdGlvblxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xyXG4gICAgZWxlbWVudFxyXG4gICAgICAuY3NzKCd0cmFuc2l0aW9uJywgJycpXHJcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xyXG4gIGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZChlbGVtZW50KSwgZmluaXNoKTtcclxuXHJcbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xyXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcclxuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XHJcbiAgICByZXNldCgpO1xyXG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcclxuICB9XHJcblxyXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xyXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xyXG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xyXG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhgJHtpbml0Q2xhc3N9ICR7YWN0aXZlQ2xhc3N9ICR7YW5pbWF0aW9ufWApO1xyXG4gIH1cclxufVxyXG5cclxuRm91bmRhdGlvbi5Nb3ZlID0gTW92ZTtcclxuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG5jb25zdCBOZXN0ID0ge1xyXG4gIEZlYXRoZXIobWVudSwgdHlwZSA9ICd6ZicpIHtcclxuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XHJcblxyXG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLmF0dHIoeydyb2xlJzogJ21lbnVpdGVtJ30pLFxyXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxyXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXHJcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XHJcblxyXG4gICAgbWVudS5maW5kKCdhOmZpcnN0JykuYXR0cigndGFiaW5kZXgnLCAwKTtcclxuXHJcbiAgICBpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxyXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xyXG5cclxuICAgICAgaWYgKCRzdWIubGVuZ3RoKSB7XHJcbiAgICAgICAgJGl0ZW1cclxuICAgICAgICAgIC5hZGRDbGFzcyhoYXNTdWJDbGFzcylcclxuICAgICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxyXG4gICAgICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxyXG4gICAgICAgICAgICAnYXJpYS1sYWJlbCc6ICRpdGVtLmNoaWxkcmVuKCdhOmZpcnN0JykudGV4dCgpXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHN1YlxyXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXHJcbiAgICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdkYXRhLXN1Ym1lbnUnOiAnJyxcclxuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkge1xyXG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybjtcclxuICB9LFxyXG5cclxuICBCdXJuKG1lbnUsIHR5cGUpIHtcclxuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpLFxyXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxyXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXHJcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XHJcblxyXG4gICAgbWVudVxyXG4gICAgICAuZmluZCgnKicpXHJcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxyXG4gICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykuY3NzKCdkaXNwbGF5JywgJycpO1xyXG5cclxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcclxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQ2xhc3Moc3ViTWVudUNsYXNzICsgJyAnICsgc3ViSXRlbUNsYXNzICsgJyBoYXMtc3VibWVudSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudScpXHJcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpKTtcclxuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcclxuICAgIC8vICAgdmFyICRpdGVtID0gJCh0aGlzKSxcclxuICAgIC8vICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcclxuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XHJcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2lzLXN1Ym1lbnUtaXRlbSAnICsgc3ViSXRlbUNsYXNzKTtcclxuICAgIC8vICAgfVxyXG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XHJcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2hhcy1zdWJtZW51Jyk7XHJcbiAgICAvLyAgICAgJHN1Yi5yZW1vdmVDbGFzcygnc3VibWVudSAnICsgc3ViTWVudUNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKTtcclxuICAgIC8vICAgfVxyXG4gICAgLy8gfSk7XHJcbiAgfVxyXG59XHJcblxyXG5Gb3VuZGF0aW9uLk5lc3QgPSBOZXN0O1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcclxuICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24sLy9vcHRpb25zIGlzIGFuIG9iamVjdCBmb3IgZWFzaWx5IGFkZGluZyBmZWF0dXJlcyBsYXRlci5cclxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXHJcbiAgICAgIHJlbWFpbiA9IC0xLFxyXG4gICAgICBzdGFydCxcclxuICAgICAgdGltZXI7XHJcblxyXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcclxuXHJcbiAgdGhpcy5yZXN0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZW1haW4gPSAtMTtcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICB0aGlzLnN0YXJ0KCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XHJcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICByZW1haW4gPSByZW1haW4gPD0gMCA/IGR1cmF0aW9uIDogcmVtYWluO1xyXG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XHJcbiAgICBzdGFydCA9IERhdGUubm93KCk7XHJcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XHJcbiAgICAgICAgX3RoaXMucmVzdGFydCgpOy8vcmVydW4gdGhlIHRpbWVyLlxyXG4gICAgICB9XHJcbiAgICAgIGNiKCk7XHJcbiAgICB9LCByZW1haW4pO1xyXG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5pc1BhdXNlZCA9IHRydWU7XHJcbiAgICAvL2lmKGVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXHJcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCB0cnVlKTtcclxuICAgIHZhciBlbmQgPSBEYXRlLm5vdygpO1xyXG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcclxuICAgIGVsZW0udHJpZ2dlcihgdGltZXJwYXVzZWQuemYuJHtuYW1lU3BhY2V9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWFnZXMgLSBJbWFnZShzKSB0byBjaGVjayBpZiBsb2FkZWQuXHJcbiAqIEBwYXJhbSB7RnVuY30gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gaW1hZ2UgaXMgZnVsbHkgbG9hZGVkLlxyXG4gKi9cclxuZnVuY3Rpb24gb25JbWFnZXNMb2FkZWQoaW1hZ2VzLCBjYWxsYmFjayl7XHJcbiAgdmFyIHNlbGYgPSB0aGlzLFxyXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XHJcblxyXG4gIGlmICh1bmxvYWRlZCA9PT0gMCkge1xyXG4gICAgY2FsbGJhY2soKTtcclxuICB9XHJcblxyXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMuY29tcGxldGUpIHtcclxuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiB0aGlzLm5hdHVyYWxXaWR0aCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5uYXR1cmFsV2lkdGggPiAwKSB7XHJcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgJCh0aGlzKS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gc2luZ2xlSW1hZ2VMb2FkZWQoKSB7XHJcbiAgICB1bmxvYWRlZC0tO1xyXG4gICAgaWYgKHVubG9hZGVkID09PSAwKSB7XHJcbiAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5Gb3VuZGF0aW9uLlRpbWVyID0gVGltZXI7XHJcbkZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQgPSBvbkltYWdlc0xvYWRlZDtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXHJcbi8vKipEb25lIGJ5IFlvaGFpIEFyYXJhdCAqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4oZnVuY3Rpb24oJCkge1xyXG5cclxuICAkLnNwb3RTd2lwZSA9IHtcclxuICAgIHZlcnNpb246ICcxLjAuMCcsXHJcbiAgICBlbmFibGVkOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXHJcbiAgICBwcmV2ZW50RGVmYXVsdDogZmFsc2UsXHJcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcclxuICAgIHRpbWVUaHJlc2hvbGQ6IDIwMFxyXG4gIH07XHJcblxyXG4gIHZhciAgIHN0YXJ0UG9zWCxcclxuICAgICAgICBzdGFydFBvc1ksXHJcbiAgICAgICAgc3RhcnRUaW1lLFxyXG4gICAgICAgIGVsYXBzZWRUaW1lLFxyXG4gICAgICAgIGlzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gIGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XHJcbiAgICAvLyAgYWxlcnQodGhpcyk7XHJcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcclxuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKTtcclxuICAgIGlzTW92aW5nID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBvblRvdWNoTW92ZShlKSB7XHJcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XHJcbiAgICBpZihpc01vdmluZykge1xyXG4gICAgICB2YXIgeCA9IGUudG91Y2hlc1swXS5wYWdlWDtcclxuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XHJcbiAgICAgIHZhciBkeCA9IHN0YXJ0UG9zWCAtIHg7XHJcbiAgICAgIHZhciBkeSA9IHN0YXJ0UG9zWSAtIHk7XHJcbiAgICAgIHZhciBkaXI7XHJcbiAgICAgIGVsYXBzZWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGlmKE1hdGguYWJzKGR4KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcclxuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIGVsc2UgaWYoTWF0aC5hYnMoZHkpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xyXG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XHJcbiAgICAgIC8vIH1cclxuICAgICAgaWYoZGlyKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIG9uVG91Y2hFbmQuY2FsbCh0aGlzKTtcclxuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3N3aXBlJywgZGlyKS50cmlnZ2VyKGBzd2lwZSR7ZGlyfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xyXG4gICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT0gMSkge1xyXG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XHJcbiAgICAgIHN0YXJ0UG9zWSA9IGUudG91Y2hlc1swXS5wYWdlWTtcclxuICAgICAgaXNNb3ZpbmcgPSB0cnVlO1xyXG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSwgZmFsc2UpO1xyXG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCwgZmFsc2UpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciAmJiB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xyXG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0KTtcclxuICB9XHJcblxyXG4gICQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHsgc2V0dXA6IGluaXQgfTtcclxuXHJcbiAgJC5lYWNoKFsnbGVmdCcsICd1cCcsICdkb3duJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcclxuICAgICQuZXZlbnQuc3BlY2lhbFtgc3dpcGUke3RoaXN9YF0gPSB7IHNldHVwOiBmdW5jdGlvbigpe1xyXG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XHJcbiAgICB9IH07XHJcbiAgfSk7XHJcbn0pKGpRdWVyeSk7XHJcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiAqIE1ldGhvZCBmb3IgYWRkaW5nIHBzdWVkbyBkcmFnIGV2ZW50cyB0byBlbGVtZW50cyAqXHJcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcbiFmdW5jdGlvbigkKXtcclxuICAkLmZuLmFkZFRvdWNoID0gZnVuY3Rpb24oKXtcclxuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcclxuICAgICAgJChlbCkuYmluZCgndG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgLy93ZSBwYXNzIHRoZSBvcmlnaW5hbCBldmVudCBvYmplY3QgYmVjYXVzZSB0aGUgalF1ZXJ5IGV2ZW50XHJcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxyXG4gICAgICAgIGhhbmRsZVRvdWNoKGV2ZW50KTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgaGFuZGxlVG91Y2ggPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXHJcbiAgICAgICAgICBmaXJzdCA9IHRvdWNoZXNbMF0sXHJcbiAgICAgICAgICBldmVudFR5cGVzID0ge1xyXG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcclxuICAgICAgICAgICAgdG91Y2htb3ZlOiAnbW91c2Vtb3ZlJyxcclxuICAgICAgICAgICAgdG91Y2hlbmQ6ICdtb3VzZXVwJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHR5cGUgPSBldmVudFR5cGVzW2V2ZW50LnR5cGVdLFxyXG4gICAgICAgICAgc2ltdWxhdGVkRXZlbnRcclxuICAgICAgICA7XHJcblxyXG4gICAgICBpZignTW91c2VFdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuTW91c2VFdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcclxuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcclxuICAgICAgICAgICdjYW5jZWxhYmxlJzogdHJ1ZSxcclxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcclxuICAgICAgICAgICdzY3JlZW5ZJzogZmlyc3Quc2NyZWVuWSxcclxuICAgICAgICAgICdjbGllbnRYJzogZmlyc3QuY2xpZW50WCxcclxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcclxuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsIGZpcnN0LnNjcmVlblgsIGZpcnN0LnNjcmVlblksIGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFksIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLypsZWZ0Ki8sIG51bGwpO1xyXG4gICAgICB9XHJcbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcclxuICAgIH07XHJcbiAgfTtcclxufShqUXVlcnkpO1xyXG5cclxuXHJcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG4vLyoqRnJvbSB0aGUgalF1ZXJ5IE1vYmlsZSBMaWJyYXJ5KipcclxuLy8qKm5lZWQgdG8gcmVjcmVhdGUgZnVuY3Rpb25hbGl0eSoqXHJcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxyXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XHJcblxyXG5cdHZhciAkZG9jdW1lbnQgPSAkKCBkb2N1bWVudCApLFxyXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcclxuXHRcdHRvdWNoU3RhcnRFdmVudCA9ICd0b3VjaHN0YXJ0Jy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiLFxyXG5cdFx0dG91Y2hTdG9wRXZlbnQgPSAndG91Y2hlbmQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIixcclxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xyXG5cclxuXHQvLyBzZXR1cCBuZXcgZXZlbnQgc2hvcnRjdXRzXHJcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xyXG5cdFx0XCJzd2lwZSBzd2lwZWxlZnQgc3dpcGVyaWdodFwiICkuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xyXG5cclxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcclxuXHRcdFx0cmV0dXJuIGZuID8gdGhpcy5iaW5kKCBuYW1lLCBmbiApIDogdGhpcy50cmlnZ2VyKCBuYW1lICk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGpRdWVyeSA8IDEuOFxyXG5cdFx0aWYgKCAkLmF0dHJGbiApIHtcclxuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uIHRyaWdnZXJDdXN0b21FdmVudCggb2JqLCBldmVudFR5cGUsIGV2ZW50LCBidWJibGUgKSB7XHJcblx0XHR2YXIgb3JpZ2luYWxUeXBlID0gZXZlbnQudHlwZTtcclxuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XHJcblx0XHRpZiAoIGJ1YmJsZSApIHtcclxuXHRcdFx0JC5ldmVudC50cmlnZ2VyKCBldmVudCwgdW5kZWZpbmVkLCBvYmogKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdCQuZXZlbnQuZGlzcGF0Y2guY2FsbCggb2JqLCBldmVudCApO1xyXG5cdFx0fVxyXG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcclxuXHR9XHJcblxyXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXHJcblxyXG5cdC8vIEFsc28gaGFuZGxlcyBzd2lwZWxlZnQsIHN3aXBlcmlnaHRcclxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XHJcblxyXG5cdFx0Ly8gTW9yZSB0aGFuIHRoaXMgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQsIGFuZCB3ZSB3aWxsIHN1cHByZXNzIHNjcm9sbGluZy5cclxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxyXG5cclxuXHRcdC8vIE1vcmUgdGltZSB0aGFuIHRoaXMsIGFuZCBpdCBpc24ndCBhIHN3aXBlLlxyXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXHJcblxyXG5cdFx0Ly8gU3dpcGUgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBtb3JlIHRoYW4gdGhpcy5cclxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXHJcblxyXG5cdFx0Ly8gU3dpcGUgdmVydGljYWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbGVzcyB0aGFuIHRoaXMuXHJcblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcclxuXHJcblx0XHRnZXRMb2NhdGlvbjogZnVuY3Rpb24gKCBldmVudCApIHtcclxuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxyXG5cdFx0XHRcdHdpblBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxyXG5cdFx0XHRcdHggPSBldmVudC5jbGllbnRYLFxyXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xyXG5cclxuXHRcdFx0aWYgKCBldmVudC5wYWdlWSA9PT0gMCAmJiBNYXRoLmZsb29yKCB5ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWSApIHx8XHJcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcclxuXHJcblx0XHRcdFx0Ly8gaU9TNCBjbGllbnRYL2NsaWVudFkgaGF2ZSB0aGUgdmFsdWUgdGhhdCBzaG91bGQgaGF2ZSBiZWVuXHJcblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcclxuXHRcdFx0XHR4ID0geCAtIHdpblBhZ2VYO1xyXG5cdFx0XHRcdHkgPSB5IC0gd2luUGFnZVk7XHJcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcclxuXHJcblx0XHRcdFx0Ly8gU29tZSBBbmRyb2lkIGJyb3dzZXJzIGhhdmUgdG90YWxseSBib2d1cyB2YWx1ZXMgZm9yIGNsaWVudFgvWVxyXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxyXG5cdFx0XHRcdC8vIHNob3VsZCBuZXZlciBiZSBzbWFsbGVyIHRoYW4gcGFnZVgvcGFnZVkgbWludXMgcGFnZSBzY3JvbGxcclxuXHRcdFx0XHR4ID0gZXZlbnQucGFnZVggLSB3aW5QYWdlWDtcclxuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR4OiB4LFxyXG5cdFx0XHRcdHk6IHlcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblxyXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcclxuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xyXG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcclxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXHJcblx0XHRcdFx0XHRcdG9yaWdpbjogJCggZXZlbnQudGFyZ2V0IClcclxuXHRcdFx0XHRcdH07XHJcblx0XHR9LFxyXG5cclxuXHRcdHN0b3A6IGZ1bmN0aW9uKCBldmVudCApIHtcclxuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xyXG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcclxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF1cclxuXHRcdFx0XHRcdH07XHJcblx0XHR9LFxyXG5cclxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XHJcblx0XHRcdGlmICggc3RvcC50aW1lIC0gc3RhcnQudGltZSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5kdXJhdGlvblRocmVzaG9sZCAmJlxyXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQgJiZcclxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcclxuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gc3RhcnQuY29vcmRzWzBdID4gc3RvcC5jb29yZHNbIDAgXSA/IFwic3dpcGVsZWZ0XCIgOiBcInN3aXBlcmlnaHRcIjtcclxuXHJcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcclxuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIGRpcmVjdGlvbiwkLkV2ZW50KCBkaXJlY3Rpb24sIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0gKSwgdHJ1ZSApO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFRoaXMgc2VydmVzIGFzIGEgZmxhZyB0byBlbnN1cmUgdGhhdCBhdCBtb3N0IG9uZSBzd2lwZSBldmVudCBldmVudCBpc1xyXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxyXG5cdFx0ZXZlbnRJblByb2dyZXNzOiBmYWxzZSxcclxuXHJcblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBldmVudHMsXHJcblx0XHRcdFx0dGhpc09iamVjdCA9IHRoaXMsXHJcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXHJcblx0XHRcdFx0Y29udGV4dCA9IHt9O1xyXG5cclxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxyXG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XHJcblx0XHRcdGlmICggIWV2ZW50cyApIHtcclxuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xyXG5cdFx0XHRcdCQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIsIGV2ZW50cyApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcclxuXHRcdFx0ZXZlbnRzLnN3aXBlID0gY29udGV4dDtcclxuXHJcblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XHJcblxyXG5cdFx0XHRcdC8vIEJhaWwgaWYgd2UncmUgYWxyZWFkeSB3b3JraW5nIG9uIGEgc3dpcGUgZXZlbnRcclxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHR2YXIgc3RvcCxcclxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxyXG5cdFx0XHRcdFx0b3JpZ1RhcmdldCA9IGV2ZW50LnRhcmdldCxcclxuXHRcdFx0XHRcdGVtaXR0ZWQgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0Y29udGV4dC5tb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xyXG5cdFx0XHRcdFx0aWYgKCAhc3RhcnQgfHwgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XHJcblx0XHRcdFx0XHRpZiAoICFlbWl0dGVkICkge1xyXG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhhbmRsZVN3aXBlKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxyXG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcclxuXHRcdFx0XHRcdGlmICggTWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQgKSB7XHJcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XHJcblx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xyXG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXHJcblx0XHRcdFx0XHQub25lKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XHJcblx0XHRcdH07XHJcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgZXZlbnRzLCBjb250ZXh0O1xyXG5cclxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xyXG5cdFx0XHRpZiAoIGV2ZW50cyApIHtcclxuXHRcdFx0XHRjb250ZXh0ID0gZXZlbnRzLnN3aXBlO1xyXG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XHJcblx0XHRcdFx0ZXZlbnRzLmxlbmd0aC0tO1xyXG5cdFx0XHRcdGlmICggZXZlbnRzLmxlbmd0aCA9PT0gMCApIHtcclxuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICggY29udGV4dCApIHtcclxuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RhcnQgKSB7XHJcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKCBjb250ZXh0Lm1vdmUgKSB7XHJcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICggY29udGV4dC5zdG9wICkge1xyXG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblx0JC5lYWNoKHtcclxuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXHJcblx0XHRzd2lwZXJpZ2h0OiBcInN3aXBlLnJpZ2h0XCJcclxuXHR9LCBmdW5jdGlvbiggZXZlbnQsIHNvdXJjZUV2ZW50ICkge1xyXG5cclxuXHRcdCQuZXZlbnQuc3BlY2lhbFsgZXZlbnQgXSA9IHtcclxuXHRcdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH0pO1xyXG59KSggalF1ZXJ5LCB0aGlzICk7XHJcbiovXHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG5jb25zdCBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcclxuICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcclxuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGAke3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgIGluIHdpbmRvdykge1xyXG4gICAgICByZXR1cm4gd2luZG93W2Ake3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgXTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59KCkpO1xyXG5cclxuY29uc3QgdHJpZ2dlcnMgPSAoZWwsIHR5cGUpID0+IHtcclxuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XHJcbiAgICAkKGAjJHtpZH1gKVsgdHlwZSA9PT0gJ2Nsb3NlJyA/ICd0cmlnZ2VyJyA6ICd0cmlnZ2VySGFuZGxlciddKGAke3R5cGV9LnpmLnRyaWdnZXJgLCBbZWxdKTtcclxuICB9KTtcclxufTtcclxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1vcGVuXSB3aWxsIHJldmVhbCBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cclxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtb3Blbl0nLCBmdW5jdGlvbigpIHtcclxuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xyXG59KTtcclxuXHJcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXHJcbi8vIElmIHVzZWQgd2l0aG91dCBhIHZhbHVlIG9uIFtkYXRhLWNsb3NlXSwgdGhlIGV2ZW50IHdpbGwgYnViYmxlLCBhbGxvd2luZyBpdCB0byBjbG9zZSBhIHBhcmVudCBjb21wb25lbnQuXHJcbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NlXScsIGZ1bmN0aW9uKCkge1xyXG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcclxuICBpZiAoaWQpIHtcclxuICAgIHRyaWdnZXJzKCQodGhpcyksICdjbG9zZScpO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgICQodGhpcykudHJpZ2dlcignY2xvc2UuemYudHJpZ2dlcicpO1xyXG4gIH1cclxufSk7XHJcblxyXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXHJcbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZV0nLCBmdW5jdGlvbigpIHtcclxuICB0cmlnZ2VycygkKHRoaXMpLCAndG9nZ2xlJyk7XHJcbn0pO1xyXG5cclxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zYWJsZV0gd2lsbCByZXNwb25kIHRvIGNsb3NlLnpmLnRyaWdnZXIgZXZlbnRzLlxyXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcclxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gIGxldCBhbmltYXRpb24gPSAkKHRoaXMpLmRhdGEoJ2Nsb3NhYmxlJyk7XHJcblxyXG4gIGlmKGFuaW1hdGlvbiAhPT0gJycpe1xyXG4gICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCgkKHRoaXMpLCBhbmltYXRpb24sIGZ1bmN0aW9uKCkge1xyXG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xyXG4gICAgfSk7XHJcbiAgfWVsc2V7XHJcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcclxuICB9XHJcbn0pO1xyXG5cclxuJChkb2N1bWVudCkub24oJ2ZvY3VzLnpmLnRyaWdnZXIgYmx1ci56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZS1mb2N1c10nLCBmdW5jdGlvbigpIHtcclxuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ3RvZ2dsZS1mb2N1cycpO1xyXG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiogRmlyZXMgb25jZSBhZnRlciBhbGwgb3RoZXIgc2NyaXB0cyBoYXZlIGxvYWRlZFxyXG4qIEBmdW5jdGlvblxyXG4qIEBwcml2YXRlXHJcbiovXHJcbiQod2luZG93KS5sb2FkKCgpID0+IHtcclxuICBjaGVja0xpc3RlbmVycygpO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xyXG4gIGV2ZW50c0xpc3RlbmVyKCk7XHJcbiAgcmVzaXplTGlzdGVuZXIoKTtcclxuICBzY3JvbGxMaXN0ZW5lcigpO1xyXG4gIGNsb3NlbWVMaXN0ZW5lcigpO1xyXG59XHJcblxyXG4vLyoqKioqKioqIG9ubHkgZmlyZXMgdGhpcyBmdW5jdGlvbiBvbmNlIG9uIGxvYWQsIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRvIHdhdGNoICoqKioqKioqXHJcbmZ1bmN0aW9uIGNsb3NlbWVMaXN0ZW5lcihwbHVnaW5OYW1lKSB7XHJcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxyXG4gICAgICBwbHVnTmFtZXMgPSBbJ2Ryb3Bkb3duJywgJ3Rvb2x0aXAnLCAncmV2ZWFsJ107XHJcblxyXG4gIGlmKHBsdWdpbk5hbWUpe1xyXG4gICAgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdzdHJpbmcnKXtcclxuICAgICAgcGx1Z05hbWVzLnB1c2gocGx1Z2luTmFtZSk7XHJcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgcGx1Z05hbWVzLmNvbmNhdChwbHVnaW5OYW1lKTtcclxuICAgIH1lbHNle1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xyXG4gICAgbGV0IGxpc3RlbmVycyA9IHBsdWdOYW1lcy5tYXAoKG5hbWUpID0+IHtcclxuICAgICAgcmV0dXJuIGBjbG9zZW1lLnpmLiR7bmFtZX1gO1xyXG4gICAgfSkuam9pbignICcpO1xyXG5cclxuICAgICQod2luZG93KS5vZmYobGlzdGVuZXJzKS5vbihsaXN0ZW5lcnMsIGZ1bmN0aW9uKGUsIHBsdWdpbklkKXtcclxuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XHJcbiAgICAgIGxldCBwbHVnaW5zID0gJChgW2RhdGEtJHtwbHVnaW59XWApLm5vdChgW2RhdGEteWV0aS1ib3g9XCIke3BsdWdpbklkfVwiXWApO1xyXG5cclxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgbGV0IF90aGlzID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcclxuICBsZXQgdGltZXIsXHJcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXJlc2l6ZV0nKTtcclxuICBpZigkbm9kZXMubGVuZ3RoKXtcclxuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS56Zi50cmlnZ2VyJylcclxuICAgIC5vbigncmVzaXplLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XHJcblxyXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcclxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XHJcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJyZXNpemVcIik7XHJcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHJlc2l6ZSBldmVudFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzY3JvbGxMaXN0ZW5lcihkZWJvdW5jZSl7XHJcbiAgbGV0IHRpbWVyLFxyXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XHJcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XHJcbiAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYudHJpZ2dlcicpXHJcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgIGlmKHRpbWVyKXsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxyXG5cclxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XHJcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJyk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHNjcm9sbCBldmVudFxyXG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwic2Nyb2xsXCIpO1xyXG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XHJcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cclxuICBsZXQgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yZXNpemVdLCBbZGF0YS1zY3JvbGxdLCBbZGF0YS1tdXRhdGVdJyk7XHJcblxyXG4gIC8vZWxlbWVudCBjYWxsYmFja1xyXG4gIHZhciBsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uID0gZnVuY3Rpb24obXV0YXRpb25SZWNvcmRzTGlzdCkge1xyXG4gICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcclxuICAgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcclxuICAgIHN3aXRjaCAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikpIHtcclxuXHJcbiAgICAgIGNhc2UgXCJyZXNpemVcIiA6XHJcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xyXG4gICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgXCJzY3JvbGxcIiA6XHJcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInLCBbJHRhcmdldCwgd2luZG93LnBhZ2VZT2Zmc2V0XSk7XHJcbiAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgLy8gY2FzZSBcIm11dGF0ZVwiIDpcclxuICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0ZScsICR0YXJnZXQpO1xyXG4gICAgICAvLyAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdtdXRhdGUuemYudHJpZ2dlcicpO1xyXG4gICAgICAvL1xyXG4gICAgICAvLyAvL21ha2Ugc3VyZSB3ZSBkb24ndCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcCBmcm9tIHNsb3BweSBjb2RlaW5nXHJcbiAgICAgIC8vIGlmICgkdGFyZ2V0LmluZGV4KCdbZGF0YS1tdXRhdGVdJykgPT0gJChcIltkYXRhLW11dGF0ZV1cIikubGVuZ3RoLTEpIHtcclxuICAgICAgLy8gICBkb21NdXRhdGlvbk9ic2VydmVyKCk7XHJcbiAgICAgIC8vIH1cclxuICAgICAgLy8gYnJlYWs7XHJcblxyXG4gICAgICBkZWZhdWx0IDpcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAvL25vdGhpbmdcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKG5vZGVzLmxlbmd0aCl7XHJcbiAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIChvciBjb21pbmcgc29vbiBtdXRhdGlvbikgYWRkIGEgc2luZ2xlIG9ic2VydmVyXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGgtMTsgaSsrKSB7XHJcbiAgICAgIGxldCBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcclxuICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiBmYWxzZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6ZmFsc2UsIGF0dHJpYnV0ZUZpbHRlcjpbXCJkYXRhLWV2ZW50c1wiXX0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4vLyBbUEhdXHJcbi8vIEZvdW5kYXRpb24uQ2hlY2tXYXRjaGVycyA9IGNoZWNrV2F0Y2hlcnM7XHJcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcclxuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XHJcbi8vIEZvdW5kYXRpb24uSUZlZWxZb3UgPSBjbG9zZW1lTGlzdGVuZXI7XHJcblxyXG59KGpRdWVyeSk7XHJcblxyXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XHJcbi8vICAgLy8gISEhIFRoaXMgaXMgY29taW5nIHNvb24gYW5kIG5lZWRzIG1vcmUgd29yazsgbm90IGFjdGl2ZSAgISEhIC8vXHJcbi8vICAgdmFyIHRpbWVyLFxyXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xyXG4vLyAgIC8vXHJcbi8vICAgaWYgKG5vZGVzLmxlbmd0aCkge1xyXG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgLy8gICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcclxuLy8gICAgIC8vICAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcclxuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XHJcbi8vICAgICAvLyAgICAgICByZXR1cm4gd2luZG93W3ByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInXTtcclxuLy8gICAgIC8vICAgICB9XHJcbi8vICAgICAvLyAgIH1cclxuLy8gICAgIC8vICAgcmV0dXJuIGZhbHNlO1xyXG4vLyAgICAgLy8gfSgpKTtcclxuLy9cclxuLy9cclxuLy8gICAgIC8vZm9yIHRoZSBib2R5LCB3ZSBuZWVkIHRvIGxpc3RlbiBmb3IgYWxsIGNoYW5nZXMgZWZmZWN0aW5nIHRoZSBzdHlsZSBhbmQgY2xhc3MgYXR0cmlidXRlc1xyXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XHJcbi8vICAgICBib2R5T2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6dHJ1ZSwgYXR0cmlidXRlRmlsdGVyOltcInN0eWxlXCIsIFwiY2xhc3NcIl19KTtcclxuLy9cclxuLy9cclxuLy8gICAgIC8vYm9keSBjYWxsYmFja1xyXG4vLyAgICAgZnVuY3Rpb24gYm9keU11dGF0aW9uKG11dGF0ZSkge1xyXG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcclxuLy8gICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cclxuLy9cclxuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4vLyAgICAgICAgIGJvZHlPYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcbi8vICAgICAgICAgJCgnW2RhdGEtbXV0YXRlXScpLmF0dHIoJ2RhdGEtZXZlbnRzJyxcIm11dGF0ZVwiKTtcclxuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcclxuLy8gICAgIH1cclxuLy8gICB9XHJcbi8vIH1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBBYmlkZSBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hYmlkZVxyXG4gKi9cclxuXHJcbmNsYXNzIEFiaWRlIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEFiaWRlLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBmaXJlcyBBYmlkZSNpbml0XHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgQWJpZGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICB0aGlzLl9pbml0KCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWJpZGUnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBBYmlkZSBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgQWJpZGUgZnVuY3Rpb25pbmcgb24gbG9hZC5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdGhpcy4kaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpO1xyXG5cclxuICAgIHRoaXMuX2V2ZW50cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBBYmlkZS5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLmFiaWRlJylcclxuICAgICAgLm9uKCdyZXNldC56Zi5hYmlkZScsICgpID0+IHtcclxuICAgICAgICB0aGlzLnJlc2V0Rm9ybSgpO1xyXG4gICAgICB9KVxyXG4gICAgICAub24oJ3N1Ym1pdC56Zi5hYmlkZScsICgpID0+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZUZvcm0oKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy52YWxpZGF0ZU9uID09PSAnZmllbGRDaGFuZ2UnKSB7XHJcbiAgICAgIHRoaXMuJGlucHV0c1xyXG4gICAgICAgIC5vZmYoJ2NoYW5nZS56Zi5hYmlkZScpXHJcbiAgICAgICAgLm9uKCdjaGFuZ2UuemYuYWJpZGUnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmxpdmVWYWxpZGF0ZSkge1xyXG4gICAgICB0aGlzLiRpbnB1dHNcclxuICAgICAgICAub2ZmKCdpbnB1dC56Zi5hYmlkZScpXHJcbiAgICAgICAgLm9uKCdpbnB1dC56Zi5hYmlkZScsIChlKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgQWJpZGUgdXBvbiBET00gY2hhbmdlXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfcmVmbG93KCkge1xyXG4gICAgdGhpcy5faW5pdCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIHdoZXRoZXIgb3Igbm90IGEgZm9ybSBlbGVtZW50IGhhcyB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGFuZCBpZiBpdCdzIGNoZWNrZWQgb3Igbm90XHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XHJcbiAgICovXHJcbiAgcmVxdWlyZWRDaGVjaygkZWwpIHtcclxuICAgIGlmICghJGVsLmF0dHIoJ3JlcXVpcmVkJykpIHJldHVybiB0cnVlO1xyXG5cclxuICAgIHZhciBpc0dvb2QgPSB0cnVlO1xyXG5cclxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcclxuICAgICAgY2FzZSAnY2hlY2tib3gnOlxyXG4gICAgICAgIGlzR29vZCA9ICRlbFswXS5jaGVja2VkO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnc2VsZWN0JzpcclxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XHJcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XHJcbiAgICAgICAgdmFyIG9wdCA9ICRlbC5maW5kKCdvcHRpb246c2VsZWN0ZWQnKTtcclxuICAgICAgICBpZiAoIW9wdC5sZW5ndGggfHwgIW9wdC52YWwoKSkgaXNHb29kID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIGlmKCEkZWwudmFsKCkgfHwgISRlbC52YWwoKS5sZW5ndGgpIGlzR29vZCA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpc0dvb2Q7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBCYXNlZCBvbiAkZWwsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB3aXRoIHNlbGVjdG9yIGluIHRoaXMgb3JkZXI6XHJcbiAgICogMS4gVGhlIGVsZW1lbnQncyBkaXJlY3Qgc2libGluZygncykuXHJcbiAgICogMy4gVGhlIGVsZW1lbnQncyBwYXJlbnQncyBjaGlsZHJlbi5cclxuICAgKlxyXG4gICAqIFRoaXMgYWxsb3dzIGZvciBtdWx0aXBsZSBmb3JtIGVycm9ycyBwZXIgaW5wdXQsIHRob3VnaCBpZiBub25lIGFyZSBmb3VuZCwgbm8gZm9ybSBlcnJvcnMgd2lsbCBiZSBzaG93bi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyByZWZlcmVuY2UgdG8gZmluZCB0aGUgZm9ybSBlcnJvciBzZWxlY3Rvci5cclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgb2JqZWN0IHdpdGggdGhlIHNlbGVjdG9yLlxyXG4gICAqL1xyXG4gIGZpbmRGb3JtRXJyb3IoJGVsKSB7XHJcbiAgICB2YXIgJGVycm9yID0gJGVsLnNpYmxpbmdzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XHJcblxyXG4gICAgaWYgKCEkZXJyb3IubGVuZ3RoKSB7XHJcbiAgICAgICRlcnJvciA9ICRlbC5wYXJlbnQoKS5maW5kKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICRlcnJvcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxyXG4gICAqIDMuIFRoZSBgLmNsb3Nlc3QoKWAgPGxhYmVsPlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcclxuICAgKi9cclxuICBmaW5kTGFiZWwoJGVsKSB7XHJcbiAgICB2YXIgaWQgPSAkZWxbMF0uaWQ7XHJcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xyXG5cclxuICAgIGlmICghJGxhYmVsLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICRsYWJlbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgc2V0IG9mIGxhYmVscyBhc3NvY2lhdGVkIHdpdGggYSBzZXQgb2YgcmFkaW8gZWxzIGluIHRoaXMgb3JkZXJcclxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcclxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XHJcbiAgICovXHJcbiAgZmluZFJhZGlvTGFiZWxzKCRlbHMpIHtcclxuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcclxuICAgICAgdmFyIGlkID0gZWwuaWQ7XHJcbiAgICAgIHZhciAkbGFiZWwgPSB0aGlzLiRlbGVtZW50LmZpbmQoYGxhYmVsW2Zvcj1cIiR7aWR9XCJdYCk7XHJcblxyXG4gICAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcclxuICAgICAgICAkbGFiZWwgPSAkKGVsKS5jbG9zZXN0KCdsYWJlbCcpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiAkbGFiZWxbMF07XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gJChsYWJlbHMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyB0aGUgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgdG8gdGhlIGxhYmVsLCBpbnB1dCwgYW5kIHRoZSBmb3JtXHJcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xyXG4gICAqL1xyXG4gIGFkZEVycm9yQ2xhc3NlcygkZWwpIHtcclxuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xyXG4gICAgdmFyICRmb3JtRXJyb3IgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVsKTtcclxuXHJcbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xyXG4gICAgICAkbGFiZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCRmb3JtRXJyb3IubGVuZ3RoKSB7XHJcbiAgICAgICRmb3JtRXJyb3IuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcclxuICAgIH1cclxuXHJcbiAgICAkZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykuYXR0cignZGF0YS1pbnZhbGlkJywgJycpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcclxuICAgKlxyXG4gICAqL1xyXG5cclxuICByZW1vdmVSYWRpb0Vycm9yQ2xhc3Nlcyhncm91cE5hbWUpIHtcclxuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xyXG4gICAgdmFyICRsYWJlbHMgPSB0aGlzLmZpbmRSYWRpb0xhYmVscygkZWxzKTtcclxuICAgIHZhciAkZm9ybUVycm9ycyA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWxzKTtcclxuXHJcbiAgICBpZiAoJGxhYmVscy5sZW5ndGgpIHtcclxuICAgICAgJGxhYmVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoJGZvcm1FcnJvcnMubGVuZ3RoKSB7XHJcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XHJcbiAgICB9XHJcblxyXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZW1vdmVzIENTUyBlcnJvciBjbGFzcyBhcyBzcGVjaWZpZWQgYnkgdGhlIEFiaWRlIHNldHRpbmdzIGZyb20gdGhlIGxhYmVsLCBpbnB1dCwgYW5kIHRoZSBmb3JtXHJcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXHJcbiAgICovXHJcbiAgcmVtb3ZlRXJyb3JDbGFzc2VzKCRlbCkge1xyXG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcclxuICAgIGlmKCRlbFswXS50eXBlID09ICdyYWRpbycpIHtcclxuICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMoJGVsLmF0dHIoJ25hbWUnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyICRsYWJlbCA9IHRoaXMuZmluZExhYmVsKCRlbCk7XHJcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xyXG5cclxuICAgIGlmICgkbGFiZWwubGVuZ3RoKSB7XHJcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcclxuICAgICAgJGZvcm1FcnJvci5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xyXG4gICAgfVxyXG5cclxuICAgICRlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdvZXMgdGhyb3VnaCBhIGZvcm0gdG8gZmluZCBpbnB1dHMgYW5kIHByb2NlZWRzIHRvIHZhbGlkYXRlIHRoZW0gaW4gd2F5cyBzcGVjaWZpYyB0byB0aGVpciB0eXBlXHJcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcclxuICAgKiBAZmlyZXMgQWJpZGUjdmFsaWRcclxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhbiBIVE1MIGlucHV0XHJcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cclxuICAgKi9cclxuICB2YWxpZGF0ZUlucHV0KCRlbCkge1xyXG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxyXG4gICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlLFxyXG4gICAgICAgIGN1c3RvbVZhbGlkYXRvciA9IHRydWUsXHJcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXHJcbiAgICAgICAgZXF1YWxUbyA9IHRydWU7XHJcblxyXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0c1xyXG4gICAgaWYgKCRlbC5pcygnW2RhdGEtYWJpZGUtaWdub3JlXScpIHx8ICRlbC5pcygnW3R5cGU9XCJoaWRkZW5cIl0nKSkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XHJcbiAgICAgIGNhc2UgJ3JhZGlvJzpcclxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlUmFkaW8oJGVsLmF0dHIoJ25hbWUnKSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdjaGVja2JveCc6XHJcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnc2VsZWN0JzpcclxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XHJcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XHJcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlVGV4dCgkZWwpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2YWxpZGF0b3IpIHtcclxuICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdGhpcy5tYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3IsICRlbC5hdHRyKCdyZXF1aXJlZCcpKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoJGVsLmF0dHIoJ2RhdGEtZXF1YWx0bycpKSB7XHJcbiAgICAgIGVxdWFsVG8gPSB0aGlzLm9wdGlvbnMudmFsaWRhdG9ycy5lcXVhbFRvKCRlbCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHZhciBnb29kVG9HbyA9IFtjbGVhclJlcXVpcmUsIHZhbGlkYXRlZCwgY3VzdG9tVmFsaWRhdG9yLCBlcXVhbFRvXS5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XHJcbiAgICB2YXIgbWVzc2FnZSA9IChnb29kVG9HbyA/ICd2YWxpZCcgOiAnaW52YWxpZCcpICsgJy56Zi5hYmlkZSc7XHJcblxyXG4gICAgdGhpc1tnb29kVG9HbyA/ICdyZW1vdmVFcnJvckNsYXNzZXMnIDogJ2FkZEVycm9yQ2xhc3NlcyddKCRlbCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBpbnB1dCBpcyBkb25lIGNoZWNraW5nIGZvciB2YWxpZGF0aW9uLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgdmFsaWQuemYuYWJpZGVgIG9yIGBpbnZhbGlkLnpmLmFiaWRlYFxyXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIGlucHV0LlxyXG4gICAgICogQGV2ZW50IEFiaWRlI3ZhbGlkXHJcbiAgICAgKiBAZXZlbnQgQWJpZGUjaW52YWxpZFxyXG4gICAgICovXHJcbiAgICAkZWwudHJpZ2dlcihtZXNzYWdlLCBbJGVsXSk7XHJcblxyXG4gICAgcmV0dXJuIGdvb2RUb0dvO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSBhbmQgaWYgdGhlcmUgYXJlIGFueSBpbnZhbGlkIGlucHV0cywgaXQgd2lsbCBkaXNwbGF5IHRoZSBmb3JtIGVycm9yIGVsZW1lbnRcclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gbm9FcnJvciAtIHRydWUgaWYgbm8gZXJyb3JzIHdlcmUgZGV0ZWN0ZWQuLi5cclxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXZhbGlkXHJcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1pbnZhbGlkXHJcbiAgICovXHJcbiAgdmFsaWRhdGVGb3JtKCkge1xyXG4gICAgdmFyIGFjYyA9IFtdO1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICB0aGlzLiRpbnB1dHMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgYWNjLnB1c2goX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgbm9FcnJvciA9IGFjYy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAobm9FcnJvciA/ICdub25lJyA6ICdibG9jaycpKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGZvcm0gaXMgZmluaXNoZWQgdmFsaWRhdGluZy4gRXZlbnQgdHJpZ2dlciBpcyBlaXRoZXIgYGZvcm12YWxpZC56Zi5hYmlkZWAgb3IgYGZvcm1pbnZhbGlkLnpmLmFiaWRlYC5cclxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIGVsZW1lbnQgb2YgdGhlIGZvcm0uXHJcbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXZhbGlkXHJcbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybWludmFsaWRcclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKChub0Vycm9yID8gJ2Zvcm12YWxpZCcgOiAnZm9ybWludmFsaWQnKSArICcuemYuYWJpZGUnLCBbdGhpcy4kZWxlbWVudF0pO1xyXG5cclxuICAgIHJldHVybiBub0Vycm9yO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgdGV4dCBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB0aGUgcGF0dGVybiBzcGVjaWZpZWQgaW4gdGhlIGF0dHJpYnV0ZS4gSWYgbm8gbWF0Y2hpbmcgcGF0dGVybiBpcyBmb3VuZCwgcmV0dXJucyB0cnVlLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYSB0ZXh0IGlucHV0IEhUTUwgZWxlbWVudFxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXR0ZXJuIC0gc3RyaW5nIHZhbHVlIG9mIG9uZSBvZiB0aGUgUmVnRXggcGF0dGVybnMgaW4gQWJpZGUub3B0aW9ucy5wYXR0ZXJuc1xyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgdGhlIGlucHV0IHZhbHVlIG1hdGNoZXMgdGhlIHBhdHRlcm4gc3BlY2lmaWVkXHJcbiAgICovXHJcbiAgdmFsaWRhdGVUZXh0KCRlbCwgcGF0dGVybikge1xyXG4gICAgLy8gQSBwYXR0ZXJuIGNhbiBiZSBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgb3IgaXQgd2lsbCBiZSBpbmZlcmVkIGZyb20gdGhlIGlucHV0J3MgXCJwYXR0ZXJuXCIgYXR0cmlidXRlLCBvciBpdCdzIFwidHlwZVwiIGF0dHJpYnV0ZVxyXG4gICAgcGF0dGVybiA9IChwYXR0ZXJuIHx8ICRlbC5hdHRyKCdwYXR0ZXJuJykgfHwgJGVsLmF0dHIoJ3R5cGUnKSk7XHJcbiAgICB2YXIgaW5wdXRUZXh0ID0gJGVsLnZhbCgpO1xyXG4gICAgdmFyIHZhbGlkID0gZmFsc2U7XHJcblxyXG4gICAgaWYgKGlucHV0VGV4dC5sZW5ndGgpIHtcclxuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGlzIGluIEFiaWRlJ3MgbGlzdCBvZiBwYXR0ZXJucywgdGhlbiB0ZXN0IHRoYXQgcmVnZXhwXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF0dGVybnMuaGFzT3duUHJvcGVydHkocGF0dGVybikpIHtcclxuICAgICAgICB2YWxpZCA9IHRoaXMub3B0aW9ucy5wYXR0ZXJuc1twYXR0ZXJuXS50ZXN0KGlucHV0VGV4dCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gbmFtZSBpc24ndCBhbHNvIHRoZSB0eXBlIGF0dHJpYnV0ZSBvZiB0aGUgZmllbGQsIHRoZW4gdGVzdCBpdCBhcyBhIHJlZ2V4cFxyXG4gICAgICBlbHNlIGlmIChwYXR0ZXJuICE9PSAkZWwuYXR0cigndHlwZScpKSB7XHJcbiAgICAgICAgdmFsaWQgPSBuZXcgUmVnRXhwKHBhdHRlcm4pLnRlc3QoaW5wdXRUZXh0KTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB2YWxpZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIEFuIGVtcHR5IGZpZWxkIGlzIHZhbGlkIGlmIGl0J3Mgbm90IHJlcXVpcmVkXHJcbiAgICBlbHNlIGlmICghJGVsLnByb3AoJ3JlcXVpcmVkJykpIHtcclxuICAgICAgdmFsaWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2YWxpZDtcclxuICAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSByYWRpbyBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB3aGV0aGVyIG9yIG5vdCBpdCBpcyByZXF1aXJlZCBhbmQgc2VsZWN0ZWQuIEFsdGhvdWdoIHRoZSBmdW5jdGlvbiB0YXJnZXRzIGEgc2luZ2xlIGA8aW5wdXQ+YCwgaXQgdmFsaWRhdGVzIGJ5IGNoZWNraW5nIHRoZSBgcmVxdWlyZWRgIGFuZCBgY2hlY2tlZGAgcHJvcGVydGllcyBvZiBhbGwgcmFkaW8gYnV0dG9ucyBpbiBpdHMgZ3JvdXAuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXHJcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdCBsZWFzdCBvbmUgcmFkaW8gaW5wdXQgaGFzIGJlZW4gc2VsZWN0ZWQgKGlmIGl0J3MgcmVxdWlyZWQpXHJcbiAgICovXHJcbiAgdmFsaWRhdGVSYWRpbyhncm91cE5hbWUpIHtcclxuICAgIC8vIElmIGF0IGxlYXN0IG9uZSByYWRpbyBpbiB0aGUgZ3JvdXAgaGFzIHRoZSBgcmVxdWlyZWRgIGF0dHJpYnV0ZSwgdGhlIGdyb3VwIGlzIGNvbnNpZGVyZWQgcmVxdWlyZWRcclxuICAgIC8vIFBlciBXM0Mgc3BlYywgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gYSBncm91cCBzaG91bGQgaGF2ZSBgcmVxdWlyZWRgLCBidXQgd2UncmUgYmVpbmcgbmljZVxyXG4gICAgdmFyICRncm91cCA9IHRoaXMuJGVsZW1lbnQuZmluZChgOnJhZGlvW25hbWU9XCIke2dyb3VwTmFtZX1cIl1gKTtcclxuICAgIHZhciB2YWxpZCA9IGZhbHNlLCByZXF1aXJlZCA9IGZhbHNlO1xyXG5cclxuICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgcmVxdWlyZWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSByZXF1aXJlZFxyXG4gICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcclxuICAgICAgaWYgKCQoZSkuYXR0cigncmVxdWlyZWQnKSkge1xyXG4gICAgICAgIHJlcXVpcmVkID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZighcmVxdWlyZWQpIHZhbGlkPXRydWU7XHJcblxyXG4gICAgaWYgKCF2YWxpZCkge1xyXG4gICAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHZhbGlkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgY2hlY2tlZFxyXG4gICAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xyXG4gICAgICAgIGlmICgkKGUpLnByb3AoJ2NoZWNrZWQnKSkge1xyXG4gICAgICAgICAgdmFsaWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB2YWxpZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVybWluZXMgaWYgYSBzZWxlY3RlZCBpbnB1dCBwYXNzZXMgYSBjdXN0b20gdmFsaWRhdGlvbiBmdW5jdGlvbi4gTXVsdGlwbGUgdmFsaWRhdGlvbnMgY2FuIGJlIHVzZWQsIGlmIHBhc3NlZCB0byB0aGUgZWxlbWVudCB3aXRoIGBkYXRhLXZhbGlkYXRvcj1cImZvbyBiYXIgYmF6XCJgIGluIGEgc3BhY2Ugc2VwYXJhdGVkIGxpc3RlZC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IGlucHV0IGVsZW1lbnQuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbGlkYXRvcnMgLSBhIHN0cmluZyBvZiBmdW5jdGlvbiBuYW1lcyBtYXRjaGluZyBmdW5jdGlvbnMgaW4gdGhlIEFiaWRlLm9wdGlvbnMudmFsaWRhdG9ycyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtCb29sZWFufSByZXF1aXJlZCAtIHNlbGYgZXhwbGFuYXRvcnk/XHJcbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiB2YWxpZGF0aW9ucyBwYXNzZWQuXHJcbiAgICovXHJcbiAgbWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9ycywgcmVxdWlyZWQpIHtcclxuICAgIHJlcXVpcmVkID0gcmVxdWlyZWQgPyB0cnVlIDogZmFsc2U7XHJcblxyXG4gICAgdmFyIGNsZWFyID0gdmFsaWRhdG9ycy5zcGxpdCgnICcpLm1hcCgodikgPT4ge1xyXG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnNbdl0oJGVsLCByZXF1aXJlZCwgJGVsLnBhcmVudCgpKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGNsZWFyLmluZGV4T2YoZmFsc2UpID09PSAtMTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2V0cyBmb3JtIGlucHV0cyBhbmQgc3R5bGVzXHJcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1yZXNldFxyXG4gICAqL1xyXG4gIHJlc2V0Rm9ybSgpIHtcclxuICAgIHZhciAkZm9ybSA9IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgb3B0cyA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICAkKGAuJHtvcHRzLmxhYmVsRXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMubGFiZWxFcnJvckNsYXNzKTtcclxuICAgICQoYC4ke29wdHMuaW5wdXRFcnJvckNsYXNzfWAsICRmb3JtKS5ub3QoJ3NtYWxsJykucmVtb3ZlQ2xhc3Mob3B0cy5pbnB1dEVycm9yQ2xhc3MpO1xyXG4gICAgJChgJHtvcHRzLmZvcm1FcnJvclNlbGVjdG9yfS4ke29wdHMuZm9ybUVycm9yQ2xhc3N9YCkucmVtb3ZlQ2xhc3Mob3B0cy5mb3JtRXJyb3JDbGFzcyk7XHJcbiAgICAkZm9ybS5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgJCgnOmlucHV0JywgJGZvcm0pLm5vdCgnOmJ1dHRvbiwgOnN1Ym1pdCwgOnJlc2V0LCA6aGlkZGVuLCA6cmFkaW8sIDpjaGVja2JveCwgW2RhdGEtYWJpZGUtaWdub3JlXScpLnZhbCgnJykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XHJcbiAgICAkKCc6aW5wdXQ6cmFkaW8nLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xyXG4gICAgJCgnOmlucHV0OmNoZWNrYm94JywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBoYXMgYmVlbiByZXNldC5cclxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtcmVzZXRcclxuICAgICAqL1xyXG4gICAgJGZvcm0udHJpZ2dlcignZm9ybXJlc2V0LnpmLmFiaWRlJywgWyRmb3JtXSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBBYmlkZS5cclxuICAgKiBSZW1vdmVzIGVycm9yIHN0eWxlcyBhbmQgY2xhc3NlcyBmcm9tIGVsZW1lbnRzLCB3aXRob3V0IHJlc2V0dGluZyB0aGVpciB2YWx1ZXMuXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB0aGlzLiRlbGVtZW50XHJcbiAgICAgIC5vZmYoJy5hYmlkZScpXHJcbiAgICAgIC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKVxyXG4gICAgICAgIC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG5cclxuICAgIHRoaXMuJGlucHV0c1xyXG4gICAgICAub2ZmKCcuYWJpZGUnKVxyXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgICBfdGhpcy5yZW1vdmVFcnJvckNsYXNzZXMoJCh0aGlzKSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cclxuICovXHJcbkFiaWRlLmRlZmF1bHRzID0ge1xyXG4gIC8qKlxyXG4gICAqIFRoZSBkZWZhdWx0IGV2ZW50IHRvIHZhbGlkYXRlIGlucHV0cy4gQ2hlY2tib3hlcyBhbmQgcmFkaW9zIHZhbGlkYXRlIGltbWVkaWF0ZWx5LlxyXG4gICAqIFJlbW92ZSBvciBjaGFuZ2UgdGhpcyB2YWx1ZSBmb3IgbWFudWFsIHZhbGlkYXRpb24uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdmaWVsZENoYW5nZSdcclxuICAgKi9cclxuICB2YWxpZGF0ZU9uOiAnZmllbGRDaGFuZ2UnLFxyXG5cclxuICAvKipcclxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0IGxhYmVscyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ2lzLWludmFsaWQtbGFiZWwnXHJcbiAgICovXHJcbiAgbGFiZWxFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1sYWJlbCcsXHJcblxyXG4gIC8qKlxyXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXRzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1pbnB1dCdcclxuICAgKi9cclxuICBpbnB1dEVycm9yQ2xhc3M6ICdpcy1pbnZhbGlkLWlucHV0JyxcclxuXHJcbiAgLyoqXHJcbiAgICogQ2xhc3Mgc2VsZWN0b3IgdG8gdXNlIHRvIHRhcmdldCBGb3JtIEVycm9ycyBmb3Igc2hvdy9oaWRlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnLmZvcm0tZXJyb3InXHJcbiAgICovXHJcbiAgZm9ybUVycm9yU2VsZWN0b3I6ICcuZm9ybS1lcnJvcicsXHJcblxyXG4gIC8qKlxyXG4gICAqIENsYXNzIGFkZGVkIHRvIEZvcm0gRXJyb3JzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnaXMtdmlzaWJsZSdcclxuICAgKi9cclxuICBmb3JtRXJyb3JDbGFzczogJ2lzLXZpc2libGUnLFxyXG5cclxuICAvKipcclxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSB0ZXh0IGlucHV0cyBvbiBhbnkgdmFsdWUgY2hhbmdlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIGxpdmVWYWxpZGF0ZTogZmFsc2UsXHJcblxyXG4gIHBhdHRlcm5zOiB7XHJcbiAgICBhbHBoYSA6IC9eW2EtekEtWl0rJC8sXHJcbiAgICBhbHBoYV9udW1lcmljIDogL15bYS16QS1aMC05XSskLyxcclxuICAgIGludGVnZXIgOiAvXlstK10/XFxkKyQvLFxyXG4gICAgbnVtYmVyIDogL15bLStdP1xcZCooPzpbXFwuXFwsXVxcZCspPyQvLFxyXG5cclxuICAgIC8vIGFtZXgsIHZpc2EsIGRpbmVyc1xyXG4gICAgY2FyZCA6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcclxuICAgIGN2diA6IC9eKFswLTldKXszLDR9JC8sXHJcblxyXG4gICAgLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3RhdGVzLW9mLXRoZS10eXBlLWF0dHJpYnV0ZS5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzXHJcbiAgICBlbWFpbCA6IC9eW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKyQvLFxyXG5cclxuICAgIHVybCA6IC9eKGh0dHBzP3xmdHB8ZmlsZXxzc2gpOlxcL1xcLygoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4pKygoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLj8pKDpcXGQqKT8pKFxcLygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KT8oXFw/KCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC8sXHJcbiAgICAvLyBhYmMuZGVcclxuICAgIGRvbWFpbiA6IC9eKFthLXpBLVowLTldKFthLXpBLVowLTlcXC1dezAsNjF9W2EtekEtWjAtOV0pP1xcLikrW2EtekEtWl17Miw4fSQvLFxyXG5cclxuICAgIGRhdGV0aW1lIDogL14oWzAtMl1bMC05XXszfSlcXC0oWzAtMV1bMC05XSlcXC0oWzAtM11bMC05XSlUKFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pKFp8KFtcXC1cXCtdKFswLTFdWzAtOV0pXFw6MDApKSQvLFxyXG4gICAgLy8gWVlZWS1NTS1ERFxyXG4gICAgZGF0ZSA6IC8oPzoxOXwyMClbMC05XXsyfS0oPzooPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18MVswLTldfDJbMC05XSl8KD86KD8hMDIpKD86MFsxLTldfDFbMC0yXSktKD86MzApKXwoPzooPzowWzEzNTc4XXwxWzAyXSktMzEpKSQvLFxyXG4gICAgLy8gSEg6TU06U1NcclxuICAgIHRpbWUgOiAvXigwWzAtOV18MVswLTldfDJbMC0zXSkoOlswLTVdWzAtOV0pezJ9JC8sXHJcbiAgICBkYXRlSVNPIDogL15cXGR7NH1bXFwvXFwtXVxcZHsxLDJ9W1xcL1xcLV1cXGR7MSwyfSQvLFxyXG4gICAgLy8gTU0vREQvWVlZWVxyXG4gICAgbW9udGhfZGF5X3llYXIgOiAvXigwWzEtOV18MVswMTJdKVstIFxcLy5dKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl1cXGR7NH0kLyxcclxuICAgIC8vIEREL01NL1lZWVlcclxuICAgIGRheV9tb250aF95ZWFyIDogL14oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXSgwWzEtOV18MVswMTJdKVstIFxcLy5dXFxkezR9JC8sXHJcblxyXG4gICAgLy8gI0ZGRiBvciAjRkZGRkZGXHJcbiAgICBjb2xvciA6IC9eIz8oW2EtZkEtRjAtOV17Nn18W2EtZkEtRjAtOV17M30pJC9cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBPcHRpb25hbCB2YWxpZGF0aW9uIGZ1bmN0aW9ucyB0byBiZSB1c2VkLiBgZXF1YWxUb2AgYmVpbmcgdGhlIG9ubHkgZGVmYXVsdCBpbmNsdWRlZCBmdW5jdGlvbi5cclxuICAgKiBGdW5jdGlvbnMgc2hvdWxkIHJldHVybiBvbmx5IGEgYm9vbGVhbiBpZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LiBGdW5jdGlvbnMgYXJlIGdpdmVuIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxyXG4gICAqIGVsIDogVGhlIGpRdWVyeSBlbGVtZW50IHRvIHZhbGlkYXRlLlxyXG4gICAqIHJlcXVpcmVkIDogQm9vbGVhbiB2YWx1ZSBvZiB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGJlIHByZXNlbnQgb3Igbm90LlxyXG4gICAqIHBhcmVudCA6IFRoZSBkaXJlY3QgcGFyZW50IG9mIHRoZSBpbnB1dC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICovXHJcbiAgdmFsaWRhdG9yczoge1xyXG4gICAgZXF1YWxUbzogZnVuY3Rpb24gKGVsLCByZXF1aXJlZCwgcGFyZW50KSB7XHJcbiAgICAgIHJldHVybiAkKGAjJHtlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKX1gKS52YWwoKSA9PT0gZWwudmFsKCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihBYmlkZSwgJ0FiaWRlJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogQWNjb3JkaW9uIG1vZHVsZS5cclxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvblxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXHJcbiAqL1xyXG5cclxuY2xhc3MgQWNjb3JkaW9uIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cclxuICAgKiBAY2xhc3NcclxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2luaXRcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbi5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIGEgcGxhaW4gb2JqZWN0IHdpdGggc2V0dGluZ3MgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb3B0aW9ucy5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICB0aGlzLl9pbml0KCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uJyk7XHJcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdBY2NvcmRpb24nLCB7XHJcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxyXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcclxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXHJcbiAgICAgICdBUlJPV19VUCc6ICdwcmV2aW91cydcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBieSBhbmltYXRpbmcgdGhlIHByZXNldCBhY3RpdmUgcGFuZShzKS5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdyb2xlJywgJ3RhYmxpc3QnKTtcclxuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdsaSwgW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJyk7XHJcblxyXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKGlkeCwgZWwpIHtcclxuICAgICAgdmFyICRlbCA9ICQoZWwpLFxyXG4gICAgICAgICAgJGNvbnRlbnQgPSAkZWwuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpLFxyXG4gICAgICAgICAgaWQgPSAkY29udGVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2NvcmRpb24nKSxcclxuICAgICAgICAgIGxpbmtJZCA9IGVsLmlkIHx8IGAke2lkfS1sYWJlbGA7XHJcblxyXG4gICAgICAkZWwuZmluZCgnYTpmaXJzdCcpLmF0dHIoe1xyXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXHJcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcclxuICAgICAgICAnaWQnOiBsaW5rSWQsXHJcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcclxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgJGNvbnRlbnQuYXR0cih7J3JvbGUnOiAndGFicGFuZWwnLCAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLCAnYXJpYS1oaWRkZW4nOiB0cnVlLCAnaWQnOiBpZH0pO1xyXG4gICAgfSk7XHJcbiAgICB2YXIgJGluaXRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XHJcbiAgICBpZigkaW5pdEFjdGl2ZS5sZW5ndGgpe1xyXG4gICAgICB0aGlzLmRvd24oJGluaXRBY3RpdmUsIHRydWUpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIGFjY29yZGlvbi5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKTtcclxuICAgICAgdmFyICR0YWJDb250ZW50ID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xyXG4gICAgICBpZiAoJHRhYkNvbnRlbnQubGVuZ3RoKSB7XHJcbiAgICAgICAgJGVsZW0uY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbiBrZXlkb3duLnpmLmFjY29yZGlvbicpXHJcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIC8vICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgaWYgKCRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xyXG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkIHx8ICRlbGVtLnNpYmxpbmdzKCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKXtcclxuICAgICAgICAgICAgICBfdGhpcy51cCgkdGFiQ29udGVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YWJDb250ZW50KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKXtcclxuICAgICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb24nLCB7XHJcbiAgICAgICAgICAgIHRvZ2dsZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ubmV4dCgpLmZpbmQoJ2EnKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xyXG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5wcmV2KCkuZmluZCgnYScpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XHJcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRvZ2dsZXMgdGhlIHNlbGVjdGVkIGNvbnRlbnQgcGFuZSdzIG9wZW4vY2xvc2Ugc3RhdGUuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBwYW5lIHRvIHRvZ2dsZS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICB0b2dnbGUoJHRhcmdldCkge1xyXG4gICAgaWYoJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcclxuICAgICAgaWYodGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkIHx8ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpe1xyXG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XHJcbiAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gcGFuZSB0byBvcGVuLlxyXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZmlyc3RUaW1lIC0gZmxhZyB0byBkZXRlcm1pbmUgaWYgcmVmbG93IHNob3VsZCBoYXBwZW4uXHJcbiAgICogQGZpcmVzIEFjY29yZGlvbiNkb3duXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZG93bigkdGFyZ2V0LCBmaXJzdFRpbWUpIHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kICYmICFmaXJzdFRpbWUpIHtcclxuICAgICAgdmFyICRjdXJyZW50QWN0aXZlID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcclxuICAgICAgaWYoJGN1cnJlbnRBY3RpdmUubGVuZ3RoKXtcclxuICAgICAgICB0aGlzLnVwKCRjdXJyZW50QWN0aXZlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgICR0YXJnZXRcclxuICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpXHJcbiAgICAgIC5wYXJlbnQoJ1tkYXRhLXRhYi1jb250ZW50XScpXHJcbiAgICAgIC5hZGRCYWNrKClcclxuICAgICAgLnBhcmVudCgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcclxuXHJcbiAgICAkdGFyZ2V0LnNsaWRlRG93bih0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgKCkgPT4ge1xyXG4gICAgICAvKipcclxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgb3BlbmluZy5cclxuICAgICAgICogQGV2ZW50IEFjY29yZGlvbiNkb3duXHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XHJcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogdHJ1ZSxcclxuICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiB0cnVlXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3NlcyB0aGUgdGFiIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHRhYiB0byBjbG9zZS5cclxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI3VwXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgdXAoJHRhcmdldCkge1xyXG4gICAgdmFyICRhdW50cyA9ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKSxcclxuICAgICAgICBfdGhpcyA9IHRoaXM7XHJcbiAgICB2YXIgY2FuQ2xvc2UgPSB0aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQgPyAkYXVudHMuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIDogJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XHJcblxyXG4gICAgaWYoIXRoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCAmJiAhY2FuQ2xvc2UpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcclxuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXHJcbiAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbiN1cFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XHJcbiAgICAgIH0pO1xyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgJHRhcmdldC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpXHJcbiAgICAgICAgICAgLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcclxuXHJcbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xyXG4gICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXHJcbiAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxyXG4gICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cclxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rlc3Ryb3llZFxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIGRlc3Ryb3koKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRhYi1jb250ZW50XScpLnN0b3AodHJ1ZSkuc2xpZGVVcCgwKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJy56Zi5hY2NvcmRpb24nKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5BY2NvcmRpb24uZGVmYXVsdHMgPSB7XHJcbiAgLyoqXHJcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhbiBhY2NvcmRpb24gcGFuZS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMjUwXHJcbiAgICovXHJcbiAgc2xpZGVTcGVlZDogMjUwLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIG11bHRpRXhwYW5kOiBmYWxzZSxcclxuICAvKipcclxuICAgKiBBbGxvdyB0aGUgYWNjb3JkaW9uIHRvIGNsb3NlIGFsbCBwYW5lcy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgZmFsc2VcclxuICAgKi9cclxuICBhbGxvd0FsbENsb3NlZDogZmFsc2VcclxufTtcclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbiwgJ0FjY29yZGlvbicpO1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuLyoqXHJcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uTWVudVxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxyXG4gKi9cclxuXHJcbmNsYXNzIEFjY29yZGlvbk1lbnUge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXHJcbiAgICogQGNsYXNzXHJcbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjaW5pdFxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbk1lbnUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG5cclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FjY29yZGlvbk1lbnUnKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XHJcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxyXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcclxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxyXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxyXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcclxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxyXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlQWxsJyxcclxuICAgICAgJ1RBQic6ICdkb3duJyxcclxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIG1lbnUgYnkgaGlkaW5nIGFsbCBuZXN0ZWQgbWVudXMuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5ub3QoJy5pcy1hY3RpdmUnKS5zbGlkZVVwKDApOy8vLmZpbmQoJ2EnKS5jc3MoJ3BhZGRpbmctbGVmdCcsICcxcmVtJyk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xyXG4gICAgICAncm9sZSc6ICd0YWJsaXN0JyxcclxuICAgICAgJ2FyaWEtbXVsdGlzZWxlY3RhYmxlJzogdGhpcy5vcHRpb25zLm11bHRpT3BlblxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy4kbWVudUxpbmtzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50Jyk7XHJcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgbGlua0lkID0gdGhpcy5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2MtbWVudS1saW5rJyksXHJcbiAgICAgICAgICAkZWxlbSA9ICQodGhpcyksXHJcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXHJcbiAgICAgICAgICBzdWJJZCA9ICRzdWJbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUnKSxcclxuICAgICAgICAgIGlzQWN0aXZlID0gJHN1Yi5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XHJcbiAgICAgICRlbGVtLmF0dHIoe1xyXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogc3ViSWQsXHJcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBpc0FjdGl2ZSxcclxuICAgICAgICAncm9sZSc6ICd0YWInLFxyXG4gICAgICAgICdpZCc6IGxpbmtJZFxyXG4gICAgICB9KTtcclxuICAgICAgJHN1Yi5hdHRyKHtcclxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLFxyXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcclxuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXHJcbiAgICAgICAgJ2lkJzogc3ViSWRcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIHZhciBpbml0UGFuZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKTtcclxuICAgIGlmKGluaXRQYW5lcy5sZW5ndGgpe1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICBpbml0UGFuZXMuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICAgIF90aGlzLmRvd24oJCh0aGlzKSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIG1lbnUuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfZXZlbnRzKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgdmFyICRzdWJtZW51ID0gJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcclxuXHJcbiAgICAgIGlmICgkc3VibWVudS5sZW5ndGgpIHtcclxuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdhJykub2ZmKCdjbGljay56Zi5hY2NvcmRpb25NZW51Jykub24oJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgX3RoaXMudG9nZ2xlKCRzdWJtZW51KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSkub24oJ2tleWRvd24uemYuYWNjb3JkaW9ubWVudScsIGZ1bmN0aW9uKGUpe1xyXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxyXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxyXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxyXG4gICAgICAgICAgJG5leHRFbGVtZW50LFxyXG4gICAgICAgICAgJHRhcmdldCA9ICRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xyXG5cclxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xyXG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xyXG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpLmZpbmQoJ2EnKS5maXJzdCgpO1xyXG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSkuZmluZCgnYScpLmZpcnN0KCk7XHJcblxyXG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaGFzIG9wZW4gc3ViIG1lbnVcclxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6Zmlyc3QtY2hpbGQnKSkgeyAvLyBpcyBmaXJzdCBlbGVtZW50IG9mIHN1YiBtZW51XHJcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoJHByZXZFbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGlmIHByZXZpb3VzIGVsZW1lbnQgaGFzIG9wZW4gc3ViIG1lbnVcclxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJHByZXZFbGVtZW50LmZpbmQoJ2xpOmxhc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6bGFzdC1jaGlsZCcpKSB7IC8vIGlzIGxhc3QgZWxlbWVudCBvZiBzdWIgbWVudVxyXG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkubmV4dCgnbGknKS5maW5kKCdhJykuZmlyc3QoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbk1lbnUnLCB7XHJcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XHJcbiAgICAgICAgICAgIF90aGlzLmRvd24oJHRhcmdldCk7XHJcbiAgICAgICAgICAgICR0YXJnZXQuZmluZCgnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxyXG4gICAgICAgICAgICBfdGhpcy51cCgkdGFyZ2V0KTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkgeyAvLyBjbG9zZSBjdXJyZW50bHkgb3BlbiBzdWJcclxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcclxuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkcHJldkVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsb3NlQWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3NlcyBhbGwgcGFuZXMgb2YgdGhlIG1lbnUuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgaGlkZUFsbCgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gdGhlIHN1Ym1lbnUgdG8gdG9nZ2xlXHJcbiAgICovXHJcbiAgdG9nZ2xlKCR0YXJnZXQpe1xyXG4gICAgaWYoISR0YXJnZXQuaXMoJzphbmltYXRlZCcpKSB7XHJcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XHJcbiAgICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLmRvd24oJHRhcmdldCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE9wZW5zIHRoZSBzdWItbWVudSBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFN1Yi1tZW51IHRvIG9wZW4uXHJcbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxyXG4gICAqL1xyXG4gIGRvd24oJHRhcmdldCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICBpZighdGhpcy5vcHRpb25zLm11bHRpT3Blbikge1xyXG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcclxuICAgIH1cclxuXHJcbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXHJcbiAgICAgIC5wYXJlbnQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcclxuXHJcbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcclxuICAgICAgICAkdGFyZ2V0LnNsaWRlRG93bihfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXHJcbiAgICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSNkb3duXHJcbiAgICAgICAgICAgKi9cclxuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIC8vfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBjbG9zZS5cclxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSN1cFxyXG4gICAqL1xyXG4gIHVwKCR0YXJnZXQpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcclxuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxyXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb25NZW51I3VwXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XHJcbiAgICAgIH0pO1xyXG4gICAgLy99KTtcclxuXHJcbiAgICB2YXIgJG1lbnVzID0gJHRhcmdldC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAoMCkuYWRkQmFjaygpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XHJcblxyXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhY2NvcmRpb24gbWVudS5cclxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNkZXN0cm95ZWRcclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlRG93bigwKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5BY2NvcmRpb25NZW51LmRlZmF1bHRzID0ge1xyXG4gIC8qKlxyXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAyNTBcclxuICAgKi9cclxuICBzbGlkZVNwZWVkOiAyNTAsXHJcbiAgLyoqXHJcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgbXVsdGlPcGVuOiB0cnVlXHJcbn07XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb25NZW51LCAnQWNjb3JkaW9uTWVudScpO1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuLyoqXHJcbiAqIERyaWxsZG93biBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcmlsbGRvd25cclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcclxuICovXHJcblxyXG5jbGFzcyBEcmlsbGRvd24ge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcmlsbGRvd24gbWVudS5cclxuICAgKiBAY2xhc3NcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbiBtZW51LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcmlsbGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG5cclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0RyaWxsZG93bicpO1xyXG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJpbGxkb3duJywge1xyXG4gICAgICAnRU5URVInOiAnb3BlbicsXHJcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcclxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxyXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxyXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcclxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnLFxyXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcclxuICAgICAgJ1RBQic6ICdkb3duJyxcclxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGRyaWxsZG93biBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMgb2YgZWxlbWVudHNcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCdhJyk7XHJcbiAgICB0aGlzLiRzdWJtZW51cyA9IHRoaXMuJHN1Ym1lbnVBbmNob3JzLnBhcmVudCgnbGknKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcclxuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGknKS5ub3QoJy5qcy1kcmlsbGRvd24tYmFjaycpLmF0dHIoJ3JvbGUnLCAnbWVudWl0ZW0nKS5maW5kKCdhJyk7XHJcblxyXG4gICAgdGhpcy5fcHJlcGFyZU1lbnUoKTtcclxuXHJcbiAgICB0aGlzLl9rZXlib2FyZEV2ZW50cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogcHJlcGFyZXMgZHJpbGxkb3duIG1lbnUgYnkgc2V0dGluZyBhdHRyaWJ1dGVzIHRvIGxpbmtzIGFuZCBlbGVtZW50c1xyXG4gICAqIHNldHMgYSBtaW4gaGVpZ2h0IHRvIHByZXZlbnQgY29udGVudCBqdW1waW5nXHJcbiAgICogd3JhcHMgdGhlIGVsZW1lbnQgaWYgbm90IGFscmVhZHkgd3JhcHBlZFxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgX3ByZXBhcmVNZW51KCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIC8vIGlmKCF0aGlzLm9wdGlvbnMuaG9sZE9wZW4pe1xyXG4gICAgLy8gICB0aGlzLl9tZW51TGlua0V2ZW50cygpO1xyXG4gICAgLy8gfVxyXG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xyXG4gICAgICB2YXIgJHN1YiA9ICRsaW5rLnBhcmVudCgpO1xyXG4gICAgICBpZihfdGhpcy5vcHRpb25zLnBhcmVudExpbmspe1xyXG4gICAgICAgICRsaW5rLmNsb25lKCkucHJlcGVuZFRvKCRzdWIuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpLndyYXAoJzxsaSBjbGFzcz1cImlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gaXMtc3VibWVudS1pdGVtIGlzLWRyaWxsZG93bi1zdWJtZW51LWl0ZW1cIiByb2xlPVwibWVudS1pdGVtXCI+PC9saT4nKTtcclxuICAgICAgfVxyXG4gICAgICAkbGluay5kYXRhKCdzYXZlZEhyZWYnLCAkbGluay5hdHRyKCdocmVmJykpLnJlbW92ZUF0dHIoJ2hyZWYnKTtcclxuICAgICAgJGxpbmsuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJylcclxuICAgICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ3RhYmluZGV4JzogMCxcclxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcclxuICAgICAgICAgIH0pO1xyXG4gICAgICBfdGhpcy5fZXZlbnRzKCRsaW5rKTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy4kc3VibWVudXMuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgJG1lbnUgPSAkKHRoaXMpLFxyXG4gICAgICAgICAgJGJhY2sgPSAkbWVudS5maW5kKCcuanMtZHJpbGxkb3duLWJhY2snKTtcclxuICAgICAgaWYoISRiYWNrLmxlbmd0aCl7XHJcbiAgICAgICAgJG1lbnUucHJlcGVuZChfdGhpcy5vcHRpb25zLmJhY2tCdXR0b24pO1xyXG4gICAgICB9XHJcbiAgICAgIF90aGlzLl9iYWNrKCRtZW51KTtcclxuICAgIH0pO1xyXG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcclxuICAgICAgdGhpcy4kd3JhcHBlciA9ICQodGhpcy5vcHRpb25zLndyYXBwZXIpLmFkZENsYXNzKCdpcy1kcmlsbGRvd24nKTtcclxuICAgICAgdGhpcy4kd3JhcHBlciA9IHRoaXMuJGVsZW1lbnQud3JhcCh0aGlzLiR3cmFwcGVyKS5wYXJlbnQoKS5jc3ModGhpcy5fZ2V0TWF4RGltcygpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gZWxlbWVudHMgaW4gdGhlIG1lbnUuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBtZW51IGl0ZW0gdG8gYWRkIGhhbmRsZXJzIHRvLlxyXG4gICAqL1xyXG4gIF9ldmVudHMoJGVsZW0pIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxyXG4gICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcclxuICAgICAgaWYoJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdsaScpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKSl7XHJcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGlmKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQuZmlyc3RFbGVtZW50Q2hpbGQpe1xyXG4gICAgICAvLyAgIHJldHVybiBmYWxzZTtcclxuICAgICAgLy8gfVxyXG4gICAgICBfdGhpcy5fc2hvdygkZWxlbS5wYXJlbnQoJ2xpJykpO1xyXG5cclxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xyXG4gICAgICAgIHZhciAkYm9keSA9ICQoJ2JvZHknKTtcclxuICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKS5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIF90aGlzLl9oaWRlQWxsKCk7XHJcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgdG8gYGxpYCdzIGluIHRoZSBtZW51LlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2tleWJvYXJkRXZlbnRzKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICB0aGlzLiRtZW51SXRlbXMuYWRkKHRoaXMuJGVsZW1lbnQuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrID4gYScpKS5vbigna2V5ZG93bi56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcclxuXHJcbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXHJcbiAgICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLmNoaWxkcmVuKCdhJyksXHJcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXHJcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XHJcblxyXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XHJcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XHJcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0RyaWxsZG93bicsIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XHJcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xyXG4gICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcclxuICAgICAgICAgICAgfSwgMSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgJHByZXZFbGVtZW50LmZvY3VzKCk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgJG5leHRFbGVtZW50LmZvY3VzKCk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIF90aGlzLl9iYWNrKCk7XHJcbiAgICAgICAgICAvL190aGlzLiRtZW51SXRlbXMuZmlyc3QoKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICghJGVsZW1lbnQuaXMoX3RoaXMuJG1lbnVJdGVtcykpIHsgLy8gbm90IG1lbnUgaXRlbSBtZWFucyBiYWNrIGJ1dHRvblxyXG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcclxuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgfSwgMSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XHJcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xyXG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3NlcyBhbGwgb3BlbiBlbGVtZW50cywgYW5kIHJldHVybnMgdG8gcm9vdCBtZW51LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXHJcbiAgICovXHJcbiAgX2hpZGVBbGwoKSB7XHJcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xyXG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xyXG4gICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcclxuICAgIH0pO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZnVsbHkgY2xvc2VkLlxyXG4gICAgICAgICAqIEBldmVudCBEcmlsbGRvd24jY2xvc2VkXHJcbiAgICAgICAgICovXHJcbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlZC56Zi5kcmlsbGRvd24nKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgZm9yIGVhY2ggYGJhY2tgIGJ1dHRvbiwgYW5kIGNsb3NlcyBvcGVuIG1lbnVzLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jYmFja1xyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGFkZCBgYmFja2AgZXZlbnQuXHJcbiAgICovXHJcbiAgX2JhY2soJGVsZW0pIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xyXG4gICAgJGVsZW0uY2hpbGRyZW4oJy5qcy1kcmlsbGRvd24tYmFjaycpXHJcbiAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnbW91c2V1cCBvbiBiYWNrJyk7XHJcbiAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgdG8gbWVudSBpdGVtcyB3L28gc3VibWVudXMgdG8gY2xvc2Ugb3BlbiBtZW51cyBvbiBjbGljay5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9tZW51TGlua0V2ZW50cygpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB0aGlzLiRtZW51SXRlbXMubm90KCcuaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50JylcclxuICAgICAgICAub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxyXG4gICAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAvLyBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xyXG4gICAgICAgICAgfSwgMCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogT3BlbnMgYSBzdWJtZW51LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jb3BlblxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gb3BlbiwgaS5lLiB0aGUgYGxpYCB0YWcuXHJcbiAgICovXHJcbiAgX3Nob3coJGVsZW0pIHtcclxuICAgICRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgb3BlbmVkLlxyXG4gICAgICogQGV2ZW50IERyaWxsZG93biNvcGVuXHJcbiAgICAgKi9cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBIaWRlcyBhIHN1Ym1lbnVcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2hpZGVcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBzdWItbWVudSB0byBoaWRlLCBpLmUuIHRoZSBgdWxgIHRhZy5cclxuICAgKi9cclxuICBfaGlkZSgkZWxlbSkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICRlbGVtLmFkZENsYXNzKCdpcy1jbG9zaW5nJylcclxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xyXG4gICAgICAgICAgICRlbGVtLmJsdXIoKTtcclxuICAgICAgICAgfSk7XHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIGNsb3NlZC5cclxuICAgICAqIEBldmVudCBEcmlsbGRvd24jaGlkZVxyXG4gICAgICovXHJcbiAgICAkZWxlbS50cmlnZ2VyKCdoaWRlLnpmLmRyaWxsZG93bicsIFskZWxlbV0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSXRlcmF0ZXMgdGhyb3VnaCB0aGUgbmVzdGVkIG1lbnVzIHRvIGNhbGN1bGF0ZSB0aGUgbWluLWhlaWdodCwgYW5kIG1heC13aWR0aCBmb3IgdGhlIG1lbnUuXHJcbiAgICogUHJldmVudHMgY29udGVudCBqdW1waW5nLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2dldE1heERpbXMoKSB7XHJcbiAgICB2YXIgbWF4ID0gMCwgcmVzdWx0ID0ge307XHJcbiAgICB0aGlzLiRzdWJtZW51cy5hZGQodGhpcy4kZWxlbWVudCkuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgbnVtT2ZFbGVtcyA9ICQodGhpcykuY2hpbGRyZW4oJ2xpJykubGVuZ3RoO1xyXG4gICAgICBtYXggPSBudW1PZkVsZW1zID4gbWF4ID8gbnVtT2ZFbGVtcyA6IG1heDtcclxuICAgIH0pO1xyXG5cclxuICAgIHJlc3VsdFsnbWluLWhlaWdodCddID0gYCR7bWF4ICogdGhpcy4kbWVudUl0ZW1zWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodH1weGA7XHJcbiAgICByZXN1bHRbJ21heC13aWR0aCddID0gYCR7dGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aH1weGA7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIHRoZSBEcmlsbGRvd24gTWVudVxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIGRlc3Ryb3koKSB7XHJcbiAgICB0aGlzLl9oaWRlQWxsKCk7XHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XHJcbiAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpXHJcbiAgICAgICAgICAgICAgICAgLmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaywgLmlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0nKS5yZW1vdmUoKVxyXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCcuaXMtYWN0aXZlLCAuaXMtY2xvc2luZywgLmlzLWRyaWxsZG93bi1zdWJtZW51JykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nIGlzLWRyaWxsZG93bi1zdWJtZW51JylcclxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnW2RhdGEtc3VibWVudV0nKS5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiB0YWJpbmRleCByb2xlJyk7XHJcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAkKHRoaXMpLm9mZignLnpmLmRyaWxsZG93bicpO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XHJcbiAgICAgIGlmKCRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKXtcclxuICAgICAgICAkbGluay5hdHRyKCdocmVmJywgJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJykpLnJlbW92ZURhdGEoJ3NhdmVkSHJlZicpO1xyXG4gICAgICB9ZWxzZXsgcmV0dXJuOyB9XHJcbiAgICB9KTtcclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9O1xyXG59XHJcblxyXG5EcmlsbGRvd24uZGVmYXVsdHMgPSB7XHJcbiAgLyoqXHJcbiAgICogTWFya3VwIHVzZWQgZm9yIEpTIGdlbmVyYXRlZCBiYWNrIGJ1dHRvbi4gUHJlcGVuZGVkIHRvIHN1Ym1lbnUgbGlzdHMgYW5kIGRlbGV0ZWQgb24gYGRlc3Ryb3lgIG1ldGhvZCwgJ2pzLWRyaWxsZG93bi1iYWNrJyBjbGFzcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICc8XFxsaT48XFxhPkJhY2s8XFwvYT48XFwvbGk+J1xyXG4gICAqL1xyXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxyXG4gIC8qKlxyXG4gICAqIE1hcmt1cCB1c2VkIHRvIHdyYXAgZHJpbGxkb3duIG1lbnUuIFVzZSBhIGNsYXNzIG5hbWUgZm9yIGluZGVwZW5kZW50IHN0eWxpbmc7IHRoZSBKUyBhcHBsaWVkIGNsYXNzOiBgaXMtZHJpbGxkb3duYCBpcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICc8XFxkaXYgY2xhc3M9XCJpcy1kcmlsbGRvd25cIj48XFwvZGl2PidcclxuICAgKi9cclxuICB3cmFwcGVyOiAnPGRpdj48L2Rpdj4nLFxyXG4gIC8qKlxyXG4gICAqIEFkZHMgdGhlIHBhcmVudCBsaW5rIHRvIHRoZSBzdWJtZW51LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIHBhcmVudExpbms6IGZhbHNlLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93IHRoZSBtZW51IHRvIHJldHVybiB0byByb290IGxpc3Qgb24gYm9keSBjbGljay5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgZmFsc2VcclxuICAgKi9cclxuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXHJcbiAgLy8gaG9sZE9wZW46IGZhbHNlXHJcbn07XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihEcmlsbGRvd24sICdEcmlsbGRvd24nKTtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBEcm9wZG93biBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93blxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICovXHJcblxyXG5jbGFzcyBEcm9wZG93biB7XHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyb3Bkb3duLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93bi5cclxuICAgKiAgICAgICAgT2JqZWN0IHNob3VsZCBiZSBvZiB0aGUgZHJvcGRvd24gcGFuZWwsIHJhdGhlciB0aGFuIGl0cyBhbmNob3IuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyb3Bkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XHJcbiAgICB0aGlzLl9pbml0KCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJvcGRvd24nKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duJywge1xyXG4gICAgICAnRU5URVInOiAnb3BlbicsXHJcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcclxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXHJcbiAgICAgICdUQUInOiAndGFiX2ZvcndhcmQnLFxyXG4gICAgICAnU0hJRlRfVEFCJzogJ3RhYl9iYWNrd2FyZCdcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBzZXR0aW5nL2NoZWNraW5nIG9wdGlvbnMgYW5kIGF0dHJpYnV0ZXMsIGFkZGluZyBoZWxwZXIgdmFyaWFibGVzLCBhbmQgc2F2aW5nIHRoZSBhbmNob3IuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XHJcblxyXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtdG9nZ2xlPVwiJHskaWR9XCJdYCkgfHwgJChgW2RhdGEtb3Blbj1cIiR7JGlkfVwiXWApO1xyXG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xyXG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcclxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcclxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiAkaWQsXHJcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcclxuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZVxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCk7XHJcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xyXG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xyXG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXHJcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxyXG4gICAgICAnZGF0YS1yZXNpemUnOiAkaWQsXHJcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcclxuICAgIH0pO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBwb3NpdGlvbiAtIHN0cmluZyB2YWx1ZSBvZiBhIHBvc2l0aW9uIGNsYXNzLlxyXG4gICAqL1xyXG4gIGdldFBvc2l0aW9uQ2xhc3MoKSB7XHJcbiAgICB2YXIgdmVydGljYWxQb3NpdGlvbiA9IHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC8odG9wfGxlZnR8cmlnaHR8Ym90dG9tKS9nKTtcclxuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcclxuICAgIHZhciBob3Jpem9udGFsUG9zaXRpb24gPSAvZmxvYXQtKFxcUyspXFxzLy5leGVjKHRoaXMuJGFuY2hvclswXS5jbGFzc05hbWUpO1xyXG4gICAgICAgIGhvcml6b250YWxQb3NpdGlvbiA9IGhvcml6b250YWxQb3NpdGlvbiA/IGhvcml6b250YWxQb3NpdGlvblsxXSA6ICcnO1xyXG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XHJcbiAgICByZXR1cm4gcG9zaXRpb247XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGp1c3RzIHRoZSBkcm9wZG93biBwYW5lcyBvcmllbnRhdGlvbiBieSBhZGRpbmcvcmVtb3ZpbmcgcG9zaXRpb25pbmcgY2xhc3Nlcy5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uIGNsYXNzIHRvIHJlbW92ZS5cclxuICAgKi9cclxuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xyXG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcclxuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXHJcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygndG9wJyk7XHJcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XHJcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcclxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcclxuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxyXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XHJcbiAgICBlbHNlIGlmKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xyXG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdsZWZ0Jyk7XHJcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcclxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xyXG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XHJcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcclxuICAgIH1cclxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXHJcbiAgICBlbHNle1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcclxuICAgIH1cclxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgIHRoaXMuY291bnRlci0tO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgcG9zaXRpb24gYW5kIG9yaWVudGF0aW9uIG9mIHRoZSBkcm9wZG93biBwYW5lLCBjaGVja3MgZm9yIGNvbGxpc2lvbnMuXHJcbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX3NldFBvc2l0aW9uKCkge1xyXG4gICAgaWYodGhpcy4kYW5jaG9yLmF0dHIoJ2FyaWEtZXhwYW5kZWQnKSA9PT0gJ2ZhbHNlJyl7IHJldHVybiBmYWxzZTsgfVxyXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXHJcbiAgICAgICAgJGVsZURpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGVsZW1lbnQpLFxyXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRhbmNob3IpLFxyXG4gICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcclxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcclxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XHJcblxyXG5cclxuXHJcbiAgICBpZigoJGVsZURpbXMud2lkdGggPj0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCkpKXtcclxuICAgICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcclxuICAgICAgICAnd2lkdGgnOiAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXHJcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xyXG4gICAgICB9KTtcclxuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsIHBvc2l0aW9uLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcclxuXHJcbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCBmYWxzZSwgdHJ1ZSkgJiYgdGhpcy5jb3VudGVyKXtcclxuICAgICAgdGhpcy5fcmVwb3NpdGlvbihwb3NpdGlvbik7XHJcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgZWxlbWVudCB1dGlsaXppbmcgdGhlIHRyaWdnZXJzIHV0aWxpdHkgbGlicmFyeS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XHJcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcclxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXHJcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXHJcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fc2V0UG9zaXRpb24uYmluZCh0aGlzKVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYodGhpcy5vcHRpb25zLmhvdmVyKXtcclxuICAgICAgdGhpcy4kYW5jaG9yLm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcclxuICAgICAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcclxuICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICBfdGhpcy5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIHRydWUpO1xyXG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xyXG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XHJcbiAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcclxuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xyXG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5ob3ZlclBhbmUpe1xyXG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duIG1vdXNlbGVhdmUuemYuZHJvcGRvd24nKVxyXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcclxuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcclxuICAgICAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuJGFuY2hvci5hZGQodGhpcy4kZWxlbWVudCkub24oJ2tleWRvd24uemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyksXHJcbiAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcclxuXHJcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcm9wZG93bicsIHtcclxuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXModmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKSkpIHsgLy8gbGVmdCBtb2RhbCBkb3dud2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxyXG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxyXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaWYgZm9jdXMgaXMgbm90IHRyYXBwZWQsIGNsb3NlIGRyb3Bkb3duIG9uIGZvY3VzIG91dFxyXG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHRhYl9iYWNrd2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXModmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKDApKSB8fCBfdGhpcy4kZWxlbWVudC5pcygnOmZvY3VzJykpIHsgLy8gbGVmdCBtb2RhbCB1cHdhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGxhc3QgZWxlbWVudFxyXG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxyXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgtMSkuZm9jdXMoKTtcclxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGlmIGZvY3VzIGlzIG5vdCB0cmFwcGVkLCBjbG9zZSBkcm9wZG93biBvbiBmb2N1cyBvdXRcclxuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XHJcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcclxuICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcclxuICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xyXG4gICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSkubm90KHRoaXMuJGVsZW1lbnQpLFxyXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XHJcbiAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpXHJcbiAgICAgICAgICAub24oJ2NsaWNrLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICAkYm9keS5vZmYoJ2NsaWNrLnpmLmRyb3Bkb3duJyk7XHJcbiAgICAgICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQGZpcmVzIERyb3Bkb3duI2Nsb3NlbWVcclxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xyXG4gICAqL1xyXG4gIG9wZW4oKSB7XHJcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBvdGhlciBvcGVuIGRyb3Bkb3duc1xyXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLmRyb3Bkb3duJywgdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcclxuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxyXG4gICAgICAgIC5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcclxuICAgIC8vIHRoaXMuJGVsZW1lbnQvKi5zaG93KCkqLztcclxuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcclxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KTtcclxuXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcclxuICAgICAgdmFyICRmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XHJcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcclxuICAgICAgICAkZm9jdXNhYmxlLmVxKDApLmZvY3VzKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKXsgdGhpcy5fYWRkQm9keUhhbmRsZXIoKTsgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgdmlzaWJsZS5cclxuICAgICAqIEBldmVudCBEcm9wZG93biNzaG93XHJcbiAgICAgKi9cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbG9zZXMgdGhlIG9wZW4gZHJvcGRvd24gcGFuZS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAZmlyZXMgRHJvcGRvd24jaGlkZVxyXG4gICAqL1xyXG4gIGNsb3NlKCkge1xyXG4gICAgaWYoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKVxyXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XHJcblxyXG4gICAgdGhpcy4kYW5jaG9yLnJlbW92ZUNsYXNzKCdob3ZlcicpXHJcbiAgICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XHJcblxyXG4gICAgaWYodGhpcy5jbGFzc0NoYW5nZWQpe1xyXG4gICAgICB2YXIgY3VyUG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xyXG4gICAgICBpZihjdXJQb3NpdGlvbkNsYXNzKXtcclxuICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGN1clBvc2l0aW9uQ2xhc3MpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpXHJcbiAgICAgICAgICAvKi5oaWRlKCkqLy5jc3Moe2hlaWdodDogJycsIHdpZHRoOiAnJ30pO1xyXG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICB0aGlzLmNvdW50ZXIgPSA0O1xyXG4gICAgICB0aGlzLnVzZWRQb3NpdGlvbnMubGVuZ3RoID0gMDtcclxuICAgIH1cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUb2dnbGVzIHRoZSBkcm9wZG93biBwYW5lJ3MgdmlzaWJpbGl0eS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICB0b2dnbGUoKSB7XHJcbiAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpe1xyXG4gICAgICBpZih0aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInKSkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgdGhpcy5vcGVuKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXN0cm95cyB0aGUgZHJvcGRvd24uXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlcicpLmhpZGUoKTtcclxuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56Zi5kcm9wZG93bicpO1xyXG5cclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbkRyb3Bkb3duLmRlZmF1bHRzID0ge1xyXG4gIC8qKlxyXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAyNTBcclxuICAgKi9cclxuICBob3ZlckRlbGF5OiAyNTAsXHJcbiAgLyoqXHJcbiAgICogQWxsb3cgc3VibWVudXMgdG8gb3BlbiBvbiBob3ZlciBldmVudHNcclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgZmFsc2VcclxuICAgKi9cclxuICBob3ZlcjogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogRG9uJ3QgY2xvc2UgZHJvcGRvd24gd2hlbiBob3ZlcmluZyBvdmVyIGRyb3Bkb3duIHBhbmVcclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgdHJ1ZVxyXG4gICAqL1xyXG4gIGhvdmVyUGFuZTogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDFcclxuICAgKi9cclxuICB2T2Zmc2V0OiAxLFxyXG4gIC8qKlxyXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAxXHJcbiAgICovXHJcbiAgaE9mZnNldDogMSxcclxuICAvKipcclxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGFkanVzdCBvcGVuIHBvc2l0aW9uLiBKUyB3aWxsIHRlc3QgYW5kIGZpbGwgdGhpcyBpbi5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ3RvcCdcclxuICAgKi9cclxuICBwb3NpdGlvbkNsYXNzOiAnJyxcclxuICAvKipcclxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHRyYXAgZm9jdXMgdG8gdGhlIGRyb3Bkb3duIHBhbmUgaWYgb3BlbmVkIHdpdGgga2V5Ym9hcmQgY29tbWFuZHMuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgdHJhcEZvY3VzOiBmYWxzZSxcclxuICAvKipcclxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHNldCBmb2N1cyB0byB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnQgd2l0aGluIHRoZSBwYW5lLCByZWdhcmRsZXNzIG9mIG1ldGhvZCBvZiBvcGVuaW5nLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgYXV0b0ZvY3VzOiBmYWxzZSxcclxuICAvKipcclxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keSB0byBjbG9zZSB0aGUgZHJvcGRvd24uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgY2xvc2VPbkNsaWNrOiBmYWxzZVxyXG59XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogRHJvcGRvd25NZW51IG1vZHVsZS5cclxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcclxuICovXHJcblxyXG5jbGFzcyBEcm9wZG93bk1lbnUge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRHJvcGRvd25NZW51LlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjaW5pdFxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bk1lbnUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcclxuICAgIHRoaXMuX2luaXQoKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duTWVudScsIHtcclxuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxyXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXHJcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcclxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcclxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXHJcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcclxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZSdcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiwgYW5kIGNhbGxzIF9wcmVwYXJlTWVudVxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcclxuICAgIHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKCdmaXJzdC1zdWInKTtcclxuXHJcbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcclxuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdbcm9sZT1cIm1lbnVpdGVtXCJdJyk7XHJcbiAgICB0aGlzLiR0YWJzLmZpbmQoJ3VsLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMudmVydGljYWxDbGFzcyk7XHJcblxyXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLnJpZ2h0Q2xhc3MpIHx8IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdyaWdodCcgfHwgRm91bmRhdGlvbi5ydGwoKSB8fCB0aGlzLiRlbGVtZW50LnBhcmVudHMoJy50b3AtYmFyLXJpZ2h0JykuaXMoJyonKSkge1xyXG4gICAgICB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID0gJ3JpZ2h0JztcclxuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtcmlnaHQnKTtcclxuICAgIH1cclxuICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgfTtcclxuICAvKipcclxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxyXG4gICAgICAgIHBhckNsYXNzID0gJ2lzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JztcclxuXHJcbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcclxuICAgIHZhciBoYW5kbGVDbGlja0ZuID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICB2YXIgJGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgYC4ke3BhckNsYXNzfWApLFxyXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxyXG4gICAgICAgICAgaGFzQ2xpY2tlZCA9ICRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnLFxyXG4gICAgICAgICAgJHN1YiA9ICRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpO1xyXG5cclxuICAgICAgaWYgKGhhc1N1Yikge1xyXG4gICAgICAgIGlmIChoYXNDbGlja2VkKSB7XHJcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XHJcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3BlbiB8fCBoYXNUb3VjaCkge1xyXG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xyXG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXHJcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcclxuXHJcbiAgICAgICAgaWYgKGhhc1N1Yikge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcclxuICAgICAgICAgIF90aGlzLmRlbGF5ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51JykpO1xyXG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxyXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XHJcbiAgICAgICAgaWYgKGhhc1N1YiAmJiBfdGhpcy5vcHRpb25zLmF1dG9jbG9zZSkge1xyXG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxyXG5cclxuICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5kZWxheSk7XHJcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcclxuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuY2xvc2luZ1RpbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xyXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ1tyb2xlPVwibWVudWl0ZW1cIl0nKSxcclxuICAgICAgICAgIGlzVGFiID0gX3RoaXMuJHRhYnMuaW5kZXgoJGVsZW1lbnQpID4gLTEsXHJcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcclxuICAgICAgICAgICRwcmV2RWxlbWVudCxcclxuICAgICAgICAgICRuZXh0RWxlbWVudDtcclxuXHJcbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcclxuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcclxuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xyXG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGkrMSk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmICghJGVsZW1lbnQuaXMoJzpsYXN0LWNoaWxkJykpIHtcclxuICAgICAgICAgICRuZXh0RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LCBwcmV2U2libGluZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICB9LCBvcGVuU3ViID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xyXG4gICAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xyXG4gICAgICAgICAgX3RoaXMuX3Nob3coJHN1Yik7XHJcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxyXG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vaWYgKCRlbGVtZW50LmlzKCc6Zmlyc3QtY2hpbGQnKSkge1xyXG4gICAgICAgIHZhciBjbG9zZSA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XHJcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xyXG4gICAgICAgIF90aGlzLl9oaWRlKGNsb3NlKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgLy99XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICAgICAgb3Blbjogb3BlblN1YixcclxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBfdGhpcy5faGlkZShfdGhpcy4kZWxlbWVudCk7XHJcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKGlzVGFiKSB7XHJcbiAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50Lmhhc0NsYXNzKF90aGlzLm9wdGlvbnMudmVydGljYWxDbGFzcykpIHsgLy8gdmVydGljYWwgbWVudVxyXG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcpIHsgLy8gbGVmdCBhbGlnbmVkXHJcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xyXG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxyXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcclxuICAgICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxyXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGFsaWduZWRcclxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XHJcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXHJcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxyXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxyXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7IC8vIGhvcml6b250YWwgbWVudVxyXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XHJcbiAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxyXG4gICAgICAgICAgICBwcmV2aW91czogcHJldlNpYmxpbmcsXHJcbiAgICAgICAgICAgIGRvd246IG9wZW5TdWIsXHJcbiAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXHJcbiAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcpIHsgLy8gbGVmdCBhbGlnbmVkXHJcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcclxuICAgICAgICAgICAgbmV4dDogb3BlblN1YixcclxuICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViLFxyXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcclxuICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgeyAvLyByaWdodCBhbGlnbmVkXHJcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcclxuICAgICAgICAgICAgbmV4dDogY2xvc2VTdWIsXHJcbiAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViLFxyXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcclxuICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duTWVudScsIGZ1bmN0aW9ucyk7XHJcblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xyXG4gICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KSxcclxuICAgICAgICBfdGhpcyA9IHRoaXM7XHJcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXHJcbiAgICAgICAgIC5vbignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgIHZhciAkbGluayA9IF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpO1xyXG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XHJcblxyXG4gICAgICAgICAgIF90aGlzLl9oaWRlKCk7XHJcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcclxuICAgICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBPcGVucyBhIGRyb3Bkb3duIHBhbmUsIGFuZCBjaGVja3MgZm9yIGNvbGxpc2lvbnMgZmlyc3QuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xyXG4gICAqL1xyXG4gIF9zaG93KCRzdWIpIHtcclxuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XHJcbiAgICAgIHJldHVybiAkKGVsKS5maW5kKCRzdWIpLmxlbmd0aCA+IDA7XHJcbiAgICB9KSk7XHJcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcclxuICAgIHRoaXMuX2hpZGUoJHNpYnMsIGlkeCk7XHJcbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5hZGRDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KVxyXG4gICAgICAgIC5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpXHJcbiAgICAgICAgLmF0dHIoeydhcmlhLWV4cGFuZGVkJzogdHJ1ZX0pO1xyXG4gICAgdmFyIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcclxuICAgIGlmICghY2xlYXIpIHtcclxuICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJy1yaWdodCcgOiAnLWxlZnQnLFxyXG4gICAgICAgICAgJHBhcmVudExpID0gJHN1Yi5wYXJlbnQoJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xyXG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xyXG4gICAgICBjbGVhciA9IEZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UoJHN1YiwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgIGlmICghY2xlYXIpIHtcclxuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgJHN1Yi5jc3MoJ3Zpc2liaWxpdHknLCAnJyk7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykgeyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG5ldyBkcm9wZG93biBwYW5lIGlzIHZpc2libGUuXHJcbiAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I3Nob3dcclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3dubWVudScsIFskc3ViXSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIaWRlcyBhIHNpbmdsZSwgY3VycmVudGx5IG9wZW4gZHJvcGRvd24gcGFuZSwgaWYgcGFzc2VkIGEgcGFyYW1ldGVyLCBvdGhlcndpc2UsIGhpZGVzIGV2ZXJ5dGhpbmcuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gZWxlbWVudCB3aXRoIGEgc3VibWVudSB0byBoaWRlXHJcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSAkdGFicyBjb2xsZWN0aW9uIHRvIGhpZGVcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9oaWRlKCRlbGVtLCBpZHgpIHtcclxuICAgIHZhciAkdG9DbG9zZTtcclxuICAgIGlmICgkZWxlbSAmJiAkZWxlbS5sZW5ndGgpIHtcclxuICAgICAgJHRvQ2xvc2UgPSAkZWxlbTtcclxuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgJHRvQ2xvc2UgPSB0aGlzLiR0YWJzLm5vdChmdW5jdGlvbihpLCBlbCkge1xyXG4gICAgICAgIHJldHVybiBpID09PSBpZHg7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcclxuICAgIH1cclxuICAgIHZhciBzb21ldGhpbmdUb0Nsb3NlID0gJHRvQ2xvc2UuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIHx8ICR0b0Nsb3NlLmZpbmQoJy5pcy1hY3RpdmUnKS5sZW5ndGggPiAwO1xyXG5cclxuICAgIGlmIChzb21ldGhpbmdUb0Nsb3NlKSB7XHJcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWFjdGl2ZScpLmFkZCgkdG9DbG9zZSkuYXR0cih7XHJcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcclxuICAgICAgICAnZGF0YS1pcy1jbGljayc6IGZhbHNlXHJcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcclxuXHJcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ3VsLmpzLWRyb3Bkb3duLWFjdGl2ZScpLmF0dHIoe1xyXG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWVcclxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2pzLWRyb3Bkb3duLWFjdGl2ZScpO1xyXG5cclxuICAgICAgaWYgKHRoaXMuY2hhbmdlZCB8fCAkdG9DbG9zZS5maW5kKCdvcGVucy1pbm5lcicpLmxlbmd0aCkge1xyXG4gICAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICdyaWdodCcgOiAnbGVmdCc7XHJcbiAgICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGQoJHRvQ2xvc2UpXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYG9wZW5zLWlubmVyIG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKVxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGBvcGVucy0ke29sZENsYXNzfWApO1xyXG4gICAgICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvcGVuIG1lbnVzIGFyZSBjbG9zZWQuXHJcbiAgICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjaGlkZVxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3dubWVudScsIFskdG9DbG9zZV0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgdGhlIHBsdWdpbi5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy4kbWVudUl0ZW1zLm9mZignLnpmLmRyb3Bkb3dubWVudScpLnJlbW92ZUF0dHIoJ2RhdGEtaXMtY2xpY2snKVxyXG4gICAgICAgIC5yZW1vdmVDbGFzcygnaXMtcmlnaHQtYXJyb3cgaXMtbGVmdC1hcnJvdyBpcy1kb3duLWFycm93IG9wZW5zLXJpZ2h0IG9wZW5zLWxlZnQgb3BlbnMtaW5uZXInKTtcclxuICAgICQoZG9jdW1lbnQuYm9keSkub2ZmKCcuemYuZHJvcGRvd25tZW51Jyk7XHJcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cclxuICovXHJcbkRyb3Bkb3duTWVudS5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBEaXNhbGxvd3MgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyBzdWJtZW51c1xyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIGF1dG9tYXRpY2FsbHkgY2xvc2Ugb24gYSBtb3VzZWxlYXZlIGV2ZW50LCBpZiBub3QgY2xpY2tlZCBvcGVuLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgYXV0b2Nsb3NlOiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSA1MFxyXG4gICAqL1xyXG4gIGhvdmVyRGVsYXk6IDUwLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgY2xpY2tPcGVuOiBmYWxzZSxcclxuICAvKipcclxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBjbG9zaW5nIGEgc3VibWVudSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDUwMFxyXG4gICAqL1xyXG5cclxuICBjbG9zaW5nVGltZTogNTAwLFxyXG4gIC8qKlxyXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ2xlZnQnXHJcbiAgICovXHJcbiAgYWxpZ25tZW50OiAnbGVmdCcsXHJcbiAgLyoqXHJcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ3ZlcnRpY2FsJ1xyXG4gICAqL1xyXG4gIHZlcnRpY2FsQ2xhc3M6ICd2ZXJ0aWNhbCcsXHJcbiAgLyoqXHJcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdhbGlnbi1yaWdodCdcclxuICAgKi9cclxuICByaWdodENsYXNzOiAnYWxpZ24tcmlnaHQnLFxyXG4gIC8qKlxyXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgZm9yY2VGb2xsb3c6IHRydWVcclxufTtcclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKERyb3Bkb3duTWVudSwgJ0Ryb3Bkb3duTWVudScpO1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuLyoqXHJcbiAqIEVxdWFsaXplciBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5lcXVhbGl6ZXJcclxuICovXHJcblxyXG5jbGFzcyBFcXVhbGl6ZXIge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuX2luaXQoKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdFcXVhbGl6ZXInKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBFcXVhbGl6ZXIgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcclxuICAgIHZhciAkd2F0Y2hlZCA9IHRoaXMuJGVsZW1lbnQuZmluZChgW2RhdGEtZXF1YWxpemVyLXdhdGNoPVwiJHtlcUlkfVwiXWApO1xyXG5cclxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xyXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLXJlc2l6ZScsIChlcUlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2VxJykpKTtcclxuXHJcbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XHJcbiAgICB0aGlzLmlzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzVW50aWwoZG9jdW1lbnQuYm9keSwgJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xyXG4gICAgdGhpcy5pc09uID0gZmFsc2U7XHJcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcclxuICAgICAgb25SZXNpemVNZUJvdW5kOiB0aGlzLl9vblJlc2l6ZU1lLmJpbmQodGhpcyksXHJcbiAgICAgIG9uUG9zdEVxdWFsaXplZEJvdW5kOiB0aGlzLl9vblBvc3RFcXVhbGl6ZWQuYmluZCh0aGlzKVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgaW1ncyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyk7XHJcbiAgICB2YXIgdG9vU21hbGw7XHJcbiAgICBpZih0aGlzLm9wdGlvbnMuZXF1YWxpemVPbil7XHJcbiAgICAgIHRvb1NtYWxsID0gdGhpcy5fY2hlY2tNUSgpO1xyXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgICB9XHJcbiAgICBpZigodG9vU21hbGwgIT09IHVuZGVmaW5lZCAmJiB0b29TbWFsbCA9PT0gZmFsc2UpIHx8IHRvb1NtYWxsID09PSB1bmRlZmluZWQpe1xyXG4gICAgICBpZihpbWdzLmxlbmd0aCl7XHJcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XHJcbiAgICAgIH1lbHNle1xyXG4gICAgICAgIHRoaXMuX3JlZmxvdygpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycyBpZiB0aGUgYnJlYWtwb2ludCBpcyB0b28gc21hbGwuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfcGF1c2VFdmVudHMoKSB7XHJcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKHtcclxuICAgICAgJy56Zi5lcXVhbGl6ZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCxcclxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyByZXNpemVtZS56Zi50cmlnZ2VyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX29uUmVzaXplTWUoZSkge1xyXG4gICAgdGhpcy5fcmVmbG93KCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHBvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfb25Qb3N0RXF1YWxpemVkKGUpIHtcclxuICAgIGlmKGUudGFyZ2V0ICE9PSB0aGlzLiRlbGVtZW50WzBdKXsgdGhpcy5fcmVmbG93KCk7IH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xyXG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xyXG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kKTtcclxuICAgIH1lbHNle1xyXG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXNPbiA9IHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2NoZWNrTVEoKSB7XHJcbiAgICB2YXIgdG9vU21hbGwgPSAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmVxdWFsaXplT24pO1xyXG4gICAgaWYodG9vU21hbGwpe1xyXG4gICAgICBpZih0aGlzLmlzT24pe1xyXG4gICAgICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XHJcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XHJcbiAgICAgIH1cclxuICAgIH1lbHNle1xyXG4gICAgICBpZighdGhpcy5pc09uKXtcclxuICAgICAgICB0aGlzLl9ldmVudHMoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvb1NtYWxsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQSBub29wIHZlcnNpb24gZm9yIHRoZSBwbHVnaW5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9raWxsc3dpdGNoKCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgRXF1YWxpemVyIHVwb24gRE9NIGNoYW5nZVxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX3JlZmxvdygpIHtcclxuICAgIGlmKCF0aGlzLm9wdGlvbnMuZXF1YWxpemVPblN0YWNrKXtcclxuICAgICAgaWYodGhpcy5faXNTdGFja2VkKCkpe1xyXG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lcXVhbGl6ZUJ5Um93KSB7XHJcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0c0J5Um93KHRoaXMuYXBwbHlIZWlnaHRCeVJvdy5iaW5kKHRoaXMpKTtcclxuICAgIH1lbHNle1xyXG4gICAgICB0aGlzLmdldEhlaWdodHModGhpcy5hcHBseUhlaWdodC5iaW5kKHRoaXMpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hbnVhbGx5IGRldGVybWluZXMgaWYgdGhlIGZpcnN0IDIgZWxlbWVudHMgYXJlICpOT1QqIHN0YWNrZWQuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaXNTdGFja2VkKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuJHdhdGNoZWRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICE9PSB0aGlzLiR3YXRjaGVkWzFdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXHJcbiAgICogQHJldHVybnMge0FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxyXG4gICAqL1xyXG4gIGdldEhlaWdodHMoY2IpIHtcclxuICAgIHZhciBoZWlnaHRzID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcclxuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XHJcbiAgICAgIGhlaWdodHMucHVzaCh0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodCk7XHJcbiAgICB9XHJcbiAgICBjYihoZWlnaHRzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXHJcbiAgICogQHJldHVybnMge0FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXHJcbiAgICovXHJcbiAgZ2V0SGVpZ2h0c0J5Um93KGNiKSB7XHJcbiAgICB2YXIgbGFzdEVsVG9wT2Zmc2V0ID0gKHRoaXMuJHdhdGNoZWQubGVuZ3RoID8gdGhpcy4kd2F0Y2hlZC5maXJzdCgpLm9mZnNldCgpLnRvcCA6IDApLFxyXG4gICAgICAgIGdyb3VwcyA9IFtdLFxyXG4gICAgICAgIGdyb3VwID0gMDtcclxuICAgIC8vZ3JvdXAgYnkgUm93XHJcbiAgICBncm91cHNbZ3JvdXBdID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcclxuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XHJcbiAgICAgIC8vbWF5YmUgY291bGQgdXNlIHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0VG9wXHJcbiAgICAgIHZhciBlbE9mZnNldFRvcCA9ICQodGhpcy4kd2F0Y2hlZFtpXSkub2Zmc2V0KCkudG9wO1xyXG4gICAgICBpZiAoZWxPZmZzZXRUb3AhPWxhc3RFbFRvcE9mZnNldCkge1xyXG4gICAgICAgIGdyb3VwKys7XHJcbiAgICAgICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xyXG4gICAgICAgIGxhc3RFbFRvcE9mZnNldD1lbE9mZnNldFRvcDtcclxuICAgICAgfVxyXG4gICAgICBncm91cHNbZ3JvdXBdLnB1c2goW3RoaXMuJHdhdGNoZWRbaV0sdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHRdKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBqID0gMCwgbG4gPSBncm91cHMubGVuZ3RoOyBqIDwgbG47IGorKykge1xyXG4gICAgICB2YXIgaGVpZ2h0cyA9ICQoZ3JvdXBzW2pdKS5tYXAoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXNbMV07IH0pLmdldCgpO1xyXG4gICAgICB2YXIgbWF4ICAgICAgICAgPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcclxuICAgICAgZ3JvdXBzW2pdLnB1c2gobWF4KTtcclxuICAgIH1cclxuICAgIGNiKGdyb3Vwcyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdFxyXG4gICAqIEBwYXJhbSB7YXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXHJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcclxuICAgKi9cclxuICBhcHBseUhlaWdodChoZWlnaHRzKSB7XHJcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxyXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XHJcblxyXG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsIG1heCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXHJcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcclxuICAgICAqL1xyXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0IGJ5IHJvd1xyXG4gICAqIEBwYXJhbSB7YXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxyXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkUm93XHJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkUm93XHJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXHJcbiAgICovXHJcbiAgYXBwbHlIZWlnaHRCeVJvdyhncm91cHMpIHtcclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXHJcbiAgICAgKi9cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW4gOyBpKyspIHtcclxuICAgICAgdmFyIGdyb3Vwc0lMZW5ndGggPSBncm91cHNbaV0ubGVuZ3RoLFxyXG4gICAgICAgICAgbWF4ID0gZ3JvdXBzW2ldW2dyb3Vwc0lMZW5ndGggLSAxXTtcclxuICAgICAgaWYgKGdyb3Vwc0lMZW5ndGg8PTIpIHtcclxuICAgICAgICAkKGdyb3Vwc1tpXVswXVswXSkuY3NzKHsnaGVpZ2h0JzonYXV0byd9KTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG4gICAgICAvKipcclxuICAgICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBwZXIgcm93IGFyZSBhcHBsaWVkXHJcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xyXG4gICAgICAgICovXHJcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xyXG4gICAgICBmb3IgKHZhciBqID0gMCwgbGVuSiA9IChncm91cHNJTGVuZ3RoLTEpOyBqIDwgbGVuSiA7IGorKykge1xyXG4gICAgICAgICQoZ3JvdXBzW2ldW2pdWzBdKS5jc3MoeydoZWlnaHQnOm1heH0pO1xyXG4gICAgICB9XHJcbiAgICAgIC8qKlxyXG4gICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBwZXIgcm93IGhhdmUgYmVlbiBhcHBsaWVkXHJcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRSb3dcclxuICAgICAgICAqL1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcclxuICAgICAqL1xyXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEVxdWFsaXplci5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcclxuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xyXG5cclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cclxuICovXHJcbkVxdWFsaXplci5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiB3aGVuIHN0YWNrZWQgb24gc21hbGxlciBzY3JlZW5zLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgZXF1YWxpemVPblN0YWNrOiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHJvdyBieSByb3cuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWluaW11bSBicmVha3BvaW50IHNpemUgdGhlIHBsdWdpbiBzaG91bGQgZXF1YWxpemUgaGVpZ2h0cyBvbi5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcclxuICAgKi9cclxuICBlcXVhbGl6ZU9uOiAnJ1xyXG59O1xyXG5cclxuLy8gV2luZG93IGV4cG9ydHNcclxuRm91bmRhdGlvbi5wbHVnaW4oRXF1YWxpemVyLCAnRXF1YWxpemVyJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uaW50ZXJjaGFuZ2VcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxyXG4gKi9cclxuXHJcbmNsYXNzIEludGVyY2hhbmdlIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEludGVyY2hhbmdlLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNpbml0XHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgSW50ZXJjaGFuZ2UuZGVmYXVsdHMsIG9wdGlvbnMpO1xyXG4gICAgdGhpcy5ydWxlcyA9IFtdO1xyXG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xyXG5cclxuICAgIHRoaXMuX2luaXQoKTtcclxuICAgIHRoaXMuX2V2ZW50cygpO1xyXG5cclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0ludGVyY2hhbmdlJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHRoaXMuX2FkZEJyZWFrcG9pbnRzKCk7XHJcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XHJcbiAgICB0aGlzLl9yZWZsb3coKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgSW50ZXJjaGFuZ2UuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfZXZlbnRzKCkge1xyXG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYuaW50ZXJjaGFuZ2UnLCBGb3VuZGF0aW9uLnV0aWwudGhyb3R0bGUodGhpcy5fcmVmbG93LmJpbmQodGhpcyksIDUwKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBJbnRlcmNoYW5nZSB1cG9uIERPTSBjaGFuZ2VcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9yZWZsb3coKSB7XHJcbiAgICB2YXIgbWF0Y2g7XHJcblxyXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSwgYnV0IG9ubHkgc2F2ZSB0aGUgbGFzdCBtYXRjaFxyXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzKSB7XHJcbiAgICAgIGlmKHRoaXMucnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcclxuICAgICAgICB2YXIgcnVsZSA9IHRoaXMucnVsZXNbaV07XHJcblxyXG4gICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShydWxlLnF1ZXJ5KS5tYXRjaGVzKSB7XHJcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIEZvdW5kYXRpb24gYnJlYWtwb2ludHMgYW5kIGFkZHMgdGhlbSB0byB0aGUgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTIG9iamVjdC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9hZGRCcmVha3BvaW50cygpIHtcclxuICAgIGZvciAodmFyIGkgaW4gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMpIHtcclxuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XHJcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XHJcbiAgICAgICAgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5Lm5hbWVdID0gcXVlcnkudmFsdWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyB0aGUgSW50ZXJjaGFuZ2UgZWxlbWVudCBmb3IgdGhlIHByb3ZpZGVkIG1lZGlhIHF1ZXJ5ICsgY29udGVudCBwYWlyaW5nc1xyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRoYXQgaXMgYW4gSW50ZXJjaGFuZ2UgaW5zdGFuY2VcclxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHNjZW5hcmlvcyAtIEFycmF5IG9mIG9iamVjdHMgdGhhdCBoYXZlICdtcScgYW5kICdwYXRoJyBrZXlzIHdpdGggY29ycmVzcG9uZGluZyBrZXlzXHJcbiAgICovXHJcbiAgX2dlbmVyYXRlUnVsZXMoZWxlbWVudCkge1xyXG4gICAgdmFyIHJ1bGVzTGlzdCA9IFtdO1xyXG4gICAgdmFyIHJ1bGVzO1xyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMucnVsZXMpIHtcclxuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJykubWF0Y2goL1xcWy4qP1xcXS9nKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XHJcbiAgICAgIGlmKHJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XHJcbiAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tpXS5zbGljZSgxLCAtMSkuc3BsaXQoJywgJyk7XHJcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcclxuICAgICAgICB2YXIgcXVlcnkgPSBydWxlW3J1bGUubGVuZ3RoIC0gMV07XHJcblxyXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XHJcbiAgICAgICAgICBxdWVyeSA9IEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBydWxlc0xpc3QucHVzaCh7XHJcbiAgICAgICAgICBwYXRoOiBwYXRoLFxyXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJ1bGVzID0gcnVsZXNMaXN0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggLSBQYXRoIHRvIHRoZSBpbWFnZSBvciBIVE1MIHBhcnRpYWwuXHJcbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXHJcbiAgICovXHJcbiAgcmVwbGFjZShwYXRoKSB7XHJcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XHJcblxyXG4gICAgLy8gUmVwbGFjaW5nIGltYWdlc1xyXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignc3JjJywgcGF0aCkubG9hZChmdW5jdGlvbigpIHtcclxuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XHJcbiAgICAgIH0pXHJcbiAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXHJcbiAgICBlbHNlIGlmIChwYXRoLm1hdGNoKC9cXC4oZ2lmfGpwZ3xqcGVnfHBuZ3xzdmd8dGlmZikoWz8jXS4qKT8vaSkpIHtcclxuICAgICAgdGhpcy4kZWxlbWVudC5jc3MoeyAnYmFja2dyb3VuZC1pbWFnZSc6ICd1cmwoJytwYXRoKycpJyB9KVxyXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XHJcbiAgICB9XHJcbiAgICAvLyBSZXBsYWNpbmcgSFRNTFxyXG4gICAgZWxzZSB7XHJcbiAgICAgICQuZ2V0KHBhdGgsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQuaHRtbChyZXNwb25zZSlcclxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xyXG4gICAgICAgICQocmVzcG9uc2UpLmZvdW5kYXRpb24oKTtcclxuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiBjb250ZW50IGluIGFuIEludGVyY2hhbmdlIGVsZW1lbnQgaXMgZG9uZSBiZWluZyBsb2FkZWQuXHJcbiAgICAgKiBAZXZlbnQgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcclxuICAgICAqL1xyXG4gICAgLy8gdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgaW50ZXJjaGFuZ2UuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIC8vVE9ETyB0aGlzLlxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxyXG4gKi9cclxuSW50ZXJjaGFuZ2UuZGVmYXVsdHMgPSB7XHJcbiAgLyoqXHJcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cclxuICAgKiBAb3B0aW9uXHJcbiAgICovXHJcbiAgcnVsZXM6IG51bGxcclxufTtcclxuXHJcbkludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFUyA9IHtcclxuICAnbGFuZHNjYXBlJzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcclxuICAncG9ydHJhaXQnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXHJcbiAgJ3JldGluYSc6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXHJcbn07XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihJbnRlcmNoYW5nZSwgJ0ludGVyY2hhbmdlJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogTWFnZWxsYW4gbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubWFnZWxsYW5cclxuICovXHJcblxyXG5jbGFzcyBNYWdlbGxhbiB7XHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBNYWdlbGxhbi5cclxuICAgKiBAY2xhc3NcclxuICAgKiBAZmlyZXMgTWFnZWxsYW4jaW5pdFxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBNYWdlbGxhbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuX2luaXQoKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdNYWdlbGxhbicpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2VsbGFuIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdtYWdlbGxhbicpO1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIHRoaXMuJHRhcmdldHMgPSAkKCdbZGF0YS1tYWdlbGxhbi10YXJnZXRdJyk7XHJcbiAgICB0aGlzLiRsaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnYScpO1xyXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcclxuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXHJcbiAgICAgICdkYXRhLXNjcm9sbCc6IGlkLFxyXG4gICAgICAnaWQnOiBpZFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLiRhY3RpdmUgPSAkKCk7XHJcbiAgICB0aGlzLnNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApO1xyXG5cclxuICAgIHRoaXMuX2V2ZW50cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlcyBhbiBhcnJheSBvZiBwaXhlbCB2YWx1ZXMgdGhhdCBhcmUgdGhlIGRlbWFyY2F0aW9uIGxpbmVzIGJldHdlZW4gbG9jYXRpb25zIG9uIHRoZSBwYWdlLlxyXG4gICAqIENhbiBiZSBpbnZva2VkIGlmIG5ldyBlbGVtZW50cyBhcmUgYWRkZWQgb3IgdGhlIHNpemUgb2YgYSBsb2NhdGlvbiBjaGFuZ2VzLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIGNhbGNQb2ludHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5LFxyXG4gICAgICAgIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XHJcblxyXG4gICAgdGhpcy5wb2ludHMgPSBbXTtcclxuICAgIHRoaXMud2luSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heCh3aW5kb3cuaW5uZXJIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0KSk7XHJcbiAgICB0aGlzLmRvY0hlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KSk7XHJcblxyXG4gICAgdGhpcy4kdGFyZ2V0cy5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgIHZhciAkdGFyID0gJCh0aGlzKSxcclxuICAgICAgICAgIHB0ID0gTWF0aC5yb3VuZCgkdGFyLm9mZnNldCgpLnRvcCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkKTtcclxuICAgICAgJHRhci50YXJnZXRQb2ludCA9IHB0O1xyXG4gICAgICBfdGhpcy5wb2ludHMucHVzaChwdCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgTWFnZWxsYW4uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfZXZlbnRzKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAkYm9keSA9ICQoJ2h0bWwsIGJvZHknKSxcclxuICAgICAgICBvcHRzID0ge1xyXG4gICAgICAgICAgZHVyYXRpb246IF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXHJcbiAgICAgICAgICBlYXNpbmc6ICAgX3RoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmdcclxuICAgICAgICB9O1xyXG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xyXG4gICAgICAgIGlmKGxvY2F0aW9uLmhhc2gpe1xyXG4gICAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MobG9jYXRpb24uaGFzaCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIF90aGlzLmNhbGNQb2ludHMoKTtcclxuICAgICAgX3RoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XHJcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5yZWZsb3cuYmluZCh0aGlzKSxcclxuICAgICAgJ3Njcm9sbG1lLnpmLnRyaWdnZXInOiB0aGlzLl91cGRhdGVBY3RpdmUuYmluZCh0aGlzKVxyXG4gICAgfSkub24oJ2NsaWNrLnpmLm1hZ2VsbGFuJywgJ2FbaHJlZl49XCIjXCJdJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgYXJyaXZhbCAgID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcclxuICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyhhcnJpdmFsKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRnVuY3Rpb24gdG8gc2Nyb2xsIHRvIGEgZ2l2ZW4gbG9jYXRpb24gb24gdGhlIHBhZ2UuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvYyAtIGEgcHJvcGVybHkgZm9ybWF0dGVkIGpRdWVyeSBpZCBzZWxlY3Rvci4gRXhhbXBsZTogJyNmb28nXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgc2Nyb2xsVG9Mb2MobG9jKSB7XHJcbiAgICB2YXIgc2Nyb2xsUG9zID0gTWF0aC5yb3VuZCgkKGxvYykub2Zmc2V0KCkudG9wIC0gdGhpcy5vcHRpb25zLnRocmVzaG9sZCAvIDIgLSB0aGlzLm9wdGlvbnMuYmFyT2Zmc2V0KTtcclxuXHJcbiAgICAkKCdodG1sLCBib2R5Jykuc3RvcCh0cnVlKS5hbmltYXRlKHsgc2Nyb2xsVG9wOiBzY3JvbGxQb3MgfSwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIE1hZ2VsbGFuIHVwb24gRE9NIGNoYW5nZVxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIHJlZmxvdygpIHtcclxuICAgIHRoaXMuY2FsY1BvaW50cygpO1xyXG4gICAgdGhpcy5fdXBkYXRlQWN0aXZlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIGFuIGFjdGl2ZSBsb2NhdGlvbiBsaW5rLCBhbmQgdXBkYXRlcyB0aGUgdXJsIGhhc2ggZm9yIHRoZSBwYWdlLCBpZiBkZWVwTGlua2luZyBlbmFibGVkLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQGZpcmVzIE1hZ2VsbGFuI3VwZGF0ZVxyXG4gICAqL1xyXG4gIF91cGRhdGVBY3RpdmUoLypldnQsIGVsZW0sIHNjcm9sbFBvcyovKSB7XHJcbiAgICB2YXIgd2luUG9zID0gLypzY3JvbGxQb3MgfHwqLyBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKSxcclxuICAgICAgICBjdXJJZHg7XHJcblxyXG4gICAgaWYod2luUG9zICsgdGhpcy53aW5IZWlnaHQgPT09IHRoaXMuZG9jSGVpZ2h0KXsgY3VySWR4ID0gdGhpcy5wb2ludHMubGVuZ3RoIC0gMTsgfVxyXG4gICAgZWxzZSBpZih3aW5Qb3MgPCB0aGlzLnBvaW50c1swXSl7IGN1cklkeCA9IDA7IH1cclxuICAgIGVsc2V7XHJcbiAgICAgIHZhciBpc0Rvd24gPSB0aGlzLnNjcm9sbFBvcyA8IHdpblBvcyxcclxuICAgICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgIGN1clZpc2libGUgPSB0aGlzLnBvaW50cy5maWx0ZXIoZnVuY3Rpb24ocCwgaSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpc0Rvd24gPyBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgPD0gd2luUG9zIDogcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQgPD0gd2luUG9zO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIGN1cklkeCA9IGN1clZpc2libGUubGVuZ3RoID8gY3VyVmlzaWJsZS5sZW5ndGggLSAxIDogMDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRhY3RpdmUucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcclxuICAgIHRoaXMuJGFjdGl2ZSA9IHRoaXMuJGxpbmtzLmVxKGN1cklkeCkuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcclxuXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xyXG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcclxuICAgICAgaWYod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKXtcclxuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XHJcbiAgICAgIH1lbHNle1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc2Nyb2xsUG9zID0gd2luUG9zO1xyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXHJcbiAgICAgKiBAZXZlbnQgTWFnZWxsYW4jdXBkYXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgTWFnZWxsYW4gYW5kIHJlc2V0cyB0aGUgdXJsIG9mIHRoZSB3aW5kb3cuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYubWFnZWxsYW4nKVxyXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcclxuXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xyXG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcclxuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZShoYXNoLCAnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxyXG4gKi9cclxuTWFnZWxsYW4uZGVmYXVsdHMgPSB7XHJcbiAgLyoqXHJcbiAgICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCB0aGUgYW5pbWF0ZWQgc2Nyb2xsaW5nIHNob3VsZCB0YWtlIGJldHdlZW4gbG9jYXRpb25zLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSA1MDBcclxuICAgKi9cclxuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxyXG4gIC8qKlxyXG4gICAqIEFuaW1hdGlvbiBzdHlsZSB0byB1c2Ugd2hlbiBzY3JvbGxpbmcgYmV0d2VlbiBsb2NhdGlvbnMuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdlYXNlLWluLW91dCdcclxuICAgKi9cclxuICBhbmltYXRpb25FYXNpbmc6ICdsaW5lYXInLFxyXG4gIC8qKlxyXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gdXNlIGFzIGEgbWFya2VyIGZvciBsb2NhdGlvbiBjaGFuZ2VzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSA1MFxyXG4gICAqL1xyXG4gIHRocmVzaG9sZDogNTAsXHJcbiAgLyoqXHJcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGxvY2F0aW9ucyBsaW5rIG9uIHRoZSBtYWdlbGxhbiBjb250YWluZXIuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdhY3RpdmUnXHJcbiAgICovXHJcbiAgYWN0aXZlQ2xhc3M6ICdhY3RpdmUnLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93cyB0aGUgc2NyaXB0IHRvIG1hbmlwdWxhdGUgdGhlIHVybCBvZiB0aGUgY3VycmVudCBwYWdlLCBhbmQgaWYgc3VwcG9ydGVkLCBhbHRlciB0aGUgaGlzdG9yeS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgdHJ1ZVxyXG4gICAqL1xyXG4gIGRlZXBMaW5raW5nOiBmYWxzZSxcclxuICAvKipcclxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIG9mZnNldCB0aGUgc2Nyb2xsIG9mIHRoZSBwYWdlIG9uIGl0ZW0gY2xpY2sgaWYgdXNpbmcgYSBzdGlja3kgbmF2IGJhci5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMjVcclxuICAgKi9cclxuICBiYXJPZmZzZXQ6IDBcclxufVxyXG5cclxuLy8gV2luZG93IGV4cG9ydHNcclxuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuLyoqXHJcbiAqIE9mZkNhbnZhcyBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vZmZjYW52YXNcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cclxuICovXHJcblxyXG5jbGFzcyBPZmZDYW52YXMge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb2ZmLWNhbnZhcyB3cmFwcGVyLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjaW5pdFxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBpbml0aWFsaXplLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPZmZDYW52YXMuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gJCgpO1xyXG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKCk7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT2ZmQ2FudmFzJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGJ5IGFkZGluZyB0aGUgZXhpdCBvdmVybGF5IChpZiBuZWVkZWQpLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XHJcblxyXG4gICAgLy8gRmluZCB0cmlnZ2VycyB0aGF0IGFmZmVjdCB0aGlzIGVsZW1lbnQgYW5kIGFkZCBhcmlhLWV4cGFuZGVkIHRvIHRoZW1cclxuICAgIHRoaXMuJHRyaWdnZXJzID0gJChkb2N1bWVudClcclxuICAgICAgLmZpbmQoJ1tkYXRhLW9wZW49XCInK2lkKydcIl0sIFtkYXRhLWNsb3NlPVwiJytpZCsnXCJdLCBbZGF0YS10b2dnbGU9XCInK2lkKydcIl0nKVxyXG4gICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpXHJcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xyXG5cclxuICAgIC8vIEFkZCBhIGNsb3NlIHRyaWdnZXIgb3ZlciB0aGUgYm9keSBpZiBuZWNlc3NhcnlcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XHJcbiAgICAgIGlmICgkKCcuanMtb2ZmLWNhbnZhcy1leGl0JykubGVuZ3RoKSB7XHJcbiAgICAgICAgdGhpcy4kZXhpdGVyID0gJCgnLmpzLW9mZi1jYW52YXMtZXhpdCcpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBleGl0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBleGl0ZXIuc2V0QXR0cmlidXRlKCdjbGFzcycsICdqcy1vZmYtY2FudmFzLWV4aXQnKTtcclxuICAgICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykuYXBwZW5kKGV4aXRlcik7XHJcblxyXG4gICAgICAgIHRoaXMuJGV4aXRlciA9ICQoZXhpdGVyKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMub3B0aW9ucy5pc1JldmVhbGVkID0gdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgfHwgbmV3IFJlZ0V4cCh0aGlzLm9wdGlvbnMucmV2ZWFsQ2xhc3MsICdnJykudGVzdCh0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZSk7XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pc1JldmVhbGVkKSB7XHJcbiAgICAgIHRoaXMub3B0aW9ucy5yZXZlYWxPbiA9IHRoaXMub3B0aW9ucy5yZXZlYWxPbiB8fCB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHJldmVhbC1mb3ItbWVkaXVtfHJldmVhbC1mb3ItbGFyZ2UpL2cpWzBdLnNwbGl0KCctJylbMl07XHJcbiAgICAgIHRoaXMuX3NldE1RQ2hlY2tlcigpO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUpIHtcclxuICAgICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lID0gcGFyc2VGbG9hdCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJylbMF0pLnRyYW5zaXRpb25EdXJhdGlvbikgKiAxMDAwO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGFuZCB0aGUgZXhpdCBvdmVybGF5LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJykub24oe1xyXG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXHJcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxyXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxyXG4gICAgICAna2V5ZG93bi56Zi5vZmZjYW52YXMnOiB0aGlzLl9oYW5kbGVLZXlib2FyZC5iaW5kKHRoaXMpXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiB0aGlzLiRleGl0ZXIubGVuZ3RoKSB7XHJcbiAgICAgIHRoaXMuJGV4aXRlci5vbih7J2NsaWNrLnpmLm9mZmNhbnZhcyc6IHRoaXMuY2xvc2UuYmluZCh0aGlzKX0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQXBwbGllcyBldmVudCBsaXN0ZW5lciBmb3IgZWxlbWVudHMgdGhhdCB3aWxsIHJldmVhbCBhdCBjZXJ0YWluIGJyZWFrcG9pbnRzLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX3NldE1RQ2hlY2tlcigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XHJcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIF90aGlzLnJldmVhbChmYWxzZSk7XHJcbiAgICAgIH1cclxuICAgIH0pLm9uZSgnbG9hZC56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XHJcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZXMgdGhlIHJldmVhbGluZy9oaWRpbmcgdGhlIG9mZi1jYW52YXMgYXQgYnJlYWtwb2ludHMsIG5vdCB0aGUgc2FtZSBhcyBvcGVuLlxyXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSZXZlYWxlZCAtIHRydWUgaWYgZWxlbWVudCBzaG91bGQgYmUgcmV2ZWFsZWQuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgcmV2ZWFsKGlzUmV2ZWFsZWQpIHtcclxuICAgIHZhciAkY2xvc2VyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKTtcclxuICAgIGlmIChpc1JldmVhbGVkKSB7XHJcbiAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgdGhpcy5pc1JldmVhbGVkID0gdHJ1ZTtcclxuICAgICAgLy8gaWYgKCF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcclxuICAgICAgLy8gICB2YXIgc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0KTtcclxuICAgICAgLy8gICB0aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgc2Nyb2xsUG9zICsgJ3B4KSc7XHJcbiAgICAgIC8vIH1cclxuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5pc1N0aWNreSkgeyB0aGlzLl9zdGljaygpOyB9XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdvcGVuLnpmLnRyaWdnZXIgdG9nZ2xlLnpmLnRyaWdnZXInKTtcclxuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7ICRjbG9zZXIuaGlkZSgpOyB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSBmYWxzZTtcclxuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5pc1N0aWNreSB8fCAhdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XHJcbiAgICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAnJztcclxuICAgICAgLy8gICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYub2ZmY2FudmFzJyk7XHJcbiAgICAgIC8vIH1cclxuICAgICAgdGhpcy4kZWxlbWVudC5vbih7XHJcbiAgICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxyXG4gICAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcylcclxuICAgICAgfSk7XHJcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkge1xyXG4gICAgICAgICRjbG9zZXIuc2hvdygpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBPcGVucyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cclxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI29wZW5lZFxyXG4gICAqL1xyXG4gIG9wZW4oZXZlbnQsIHRyaWdnZXIpIHtcclxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxyXG4gICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xyXG4gICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKDApO1xyXG4gICAgfVxyXG4gICAgLy8gd2luZG93LnBhZ2VZT2Zmc2V0ID0gMDtcclxuXHJcbiAgICAvLyBpZiAoIXRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xyXG4gICAgLy8gICB2YXIgc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0KTtcclxuICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xyXG4gICAgLy8gICBpZiAodGhpcy4kZXhpdGVyLmxlbmd0aCkge1xyXG4gICAgLy8gICAgIHRoaXMuJGV4aXRlclswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xyXG4gICAgLy8gICB9XHJcbiAgICAvLyB9XHJcbiAgICAvKipcclxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cclxuICAgICAqIEBldmVudCBPZmZDYW52YXMjb3BlbmVkXHJcbiAgICAgKi9cclxuICAgIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUsIHRoaXMuJGVsZW1lbnQsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJykuYWRkQ2xhc3MoJ2lzLW9mZi1jYW52YXMtb3BlbiBpcy1vcGVuLScrIF90aGlzLm9wdGlvbnMucG9zaXRpb24pO1xyXG5cclxuICAgICAgX3RoaXMuJGVsZW1lbnRcclxuICAgICAgICAuYWRkQ2xhc3MoJ2lzLW9wZW4nKVxyXG5cclxuICAgICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kpIHtcclxuICAgICAgLy8gICBfdGhpcy5fc3RpY2soKTtcclxuICAgICAgLy8gfVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICd0cnVlJyk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJylcclxuICAgICAgICAudHJpZ2dlcignb3BlbmVkLnpmLm9mZmNhbnZhcycpO1xyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XHJcbiAgICAgIHRoaXMuJGV4aXRlci5hZGRDbGFzcygnaXMtdmlzaWJsZScpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0cmlnZ2VyKSB7XHJcbiAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gdHJpZ2dlcjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9Gb2N1cykge1xyXG4gICAgICB0aGlzLiRlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQodGhpcy4kZWxlbWVudCksIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIF90aGlzLiRlbGVtZW50LmZpbmQoJ2EsIGJ1dHRvbicpLmVxKDApLmZvY3VzKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XHJcbiAgICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hdHRyKCd0YWJpbmRleCcsICctMScpO1xyXG4gICAgICB0aGlzLl90cmFwRm9jdXMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYXBzIGZvY3VzIHdpdGhpbiB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfdHJhcEZvY3VzKCkge1xyXG4gICAgdmFyIGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KSxcclxuICAgICAgICBmaXJzdCA9IGZvY3VzYWJsZS5lcSgwKSxcclxuICAgICAgICBsYXN0ID0gZm9jdXNhYmxlLmVxKC0xKTtcclxuXHJcbiAgICBmb2N1c2FibGUub2ZmKCcuemYub2ZmY2FudmFzJykub24oJ2tleWRvd24uemYub2ZmY2FudmFzJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICBpZiAoZS53aGljaCA9PT0gOSB8fCBlLmtleWNvZGUgPT09IDkpIHtcclxuICAgICAgICBpZiAoZS50YXJnZXQgPT09IGxhc3RbMF0gJiYgIWUuc2hpZnRLZXkpIHtcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGZpcnN0LmZvY3VzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gZmlyc3RbMF0gJiYgZS5zaGlmdEtleSkge1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgbGFzdC5mb2N1cygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIG9mZmNhbnZhcyB0byBhcHBlYXIgc3RpY2t5IHV0aWxpemluZyB0cmFuc2xhdGUgcHJvcGVydGllcy5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIC8vIE9mZkNhbnZhcy5wcm90b3R5cGUuX3N0aWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgLy8gICB2YXIgZWxTdHlsZSA9IHRoaXMuJGVsZW1lbnRbMF0uc3R5bGU7XHJcbiAgLy9cclxuICAvLyAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XHJcbiAgLy8gICAgIHZhciBleGl0U3R5bGUgPSB0aGlzLiRleGl0ZXJbMF0uc3R5bGU7XHJcbiAgLy8gICB9XHJcbiAgLy9cclxuICAvLyAgICQod2luZG93KS5vbignc2Nyb2xsLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKGUpIHtcclxuICAvLyAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgLy8gICAgIHZhciBwYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAvLyAgICAgZWxTdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHBhZ2VZICsgJ3B4KSc7XHJcbiAgLy8gICAgIGlmIChleGl0U3R5bGUgIT09IHVuZGVmaW5lZCkgeyBleGl0U3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBwYWdlWSArICdweCknOyB9XHJcbiAgLy8gICB9KTtcclxuICAvLyAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc3R1Y2suemYub2ZmY2FudmFzJyk7XHJcbiAgLy8gfTtcclxuICAvKipcclxuICAgKiBDbG9zZXMgdGhlIG9mZi1jYW52YXMgbWVudS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNiIHRvIGZpcmUgYWZ0ZXIgY2xvc3VyZS5cclxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2Nsb3NlZFxyXG4gICAqL1xyXG4gIGNsb3NlKGNiKSB7XHJcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XHJcblxyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAvLyAgRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSwgdGhpcy4kZWxlbWVudCwgZnVuY3Rpb24oKSB7XHJcbiAgICAkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJykucmVtb3ZlQ2xhc3MoYGlzLW9mZi1jYW52YXMtb3BlbiBpcy1vcGVuLSR7X3RoaXMub3B0aW9ucy5wb3NpdGlvbn1gKTtcclxuICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdpcy1vcGVuJyk7XHJcbiAgICAgIC8vIEZvdW5kYXRpb24uX3JlZmxvdygpO1xyXG4gICAgLy8gfSk7XHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKVxyXG4gICAgICAvKipcclxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxyXG4gICAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI2Nsb3NlZFxyXG4gICAgICAgKi9cclxuICAgICAgICAudHJpZ2dlcignY2xvc2VkLnpmLm9mZmNhbnZhcycpO1xyXG4gICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kgfHwgIV90aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcclxuICAgIC8vICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgIC8vICAgICBfdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAnJztcclxuICAgIC8vICAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYub2ZmY2FudmFzJyk7XHJcbiAgICAvLyAgIH0sIHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSk7XHJcbiAgICAvLyB9XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xyXG4gICAgICB0aGlzLiRleGl0ZXIucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xyXG4gICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRvZ2dsZXMgdGhlIG9mZi1jYW52YXMgbWVudSBvcGVuIG9yIGNsb3NlZC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXHJcbiAgICovXHJcbiAgdG9nZ2xlKGV2ZW50LCB0cmlnZ2VyKSB7XHJcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7XHJcbiAgICAgIHRoaXMuY2xvc2UoZXZlbnQsIHRyaWdnZXIpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMub3BlbihldmVudCwgdHJpZ2dlcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGVzIGtleWJvYXJkIGlucHV0IHdoZW4gZGV0ZWN0ZWQuIFdoZW4gdGhlIGVzY2FwZSBrZXkgaXMgcHJlc3NlZCwgdGhlIG9mZi1jYW52YXMgbWVudSBjbG9zZXMsIGFuZCBmb2N1cyBpcyByZXN0b3JlZCB0byB0aGUgZWxlbWVudCB0aGF0IG9wZW5lZCB0aGUgbWVudS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9oYW5kbGVLZXlib2FyZChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LndoaWNoICE9PSAyNykgcmV0dXJuO1xyXG5cclxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIHRoaXMuJGxhc3RUcmlnZ2VyLmZvY3VzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXN0cm95cyB0aGUgb2ZmY2FudmFzIHBsdWdpbi5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKTtcclxuICAgIHRoaXMuJGV4aXRlci5vZmYoJy56Zi5vZmZjYW52YXMnKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5PZmZDYW52YXMuZGVmYXVsdHMgPSB7XHJcbiAgLyoqXHJcbiAgICogQWxsb3cgdGhlIHVzZXIgdG8gY2xpY2sgb3V0c2lkZSBvZiB0aGUgbWVudSB0byBjbG9zZSBpdC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgdHJ1ZVxyXG4gICAqL1xyXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcclxuXHJcbiAgLyoqXHJcbiAgICogQW1vdW50IG9mIHRpbWUgaW4gbXMgdGhlIG9wZW4gYW5kIGNsb3NlIHRyYW5zaXRpb24gcmVxdWlyZXMuIElmIG5vbmUgc2VsZWN0ZWQsIHB1bGxzIGZyb20gYm9keSBzdHlsZS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgNTAwXHJcbiAgICovXHJcbiAgdHJhbnNpdGlvblRpbWU6IDAsXHJcblxyXG4gIC8qKlxyXG4gICAqIERpcmVjdGlvbiB0aGUgb2ZmY2FudmFzIG9wZW5zIGZyb20uIERldGVybWluZXMgY2xhc3MgYXBwbGllZCB0byBib2R5LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBsZWZ0XHJcbiAgICovXHJcbiAgcG9zaXRpb246ICdsZWZ0JyxcclxuXHJcbiAgLyoqXHJcbiAgICogRm9yY2UgdGhlIHBhZ2UgdG8gc2Nyb2xsIHRvIHRvcCBvbiBvcGVuLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgZm9yY2VUb3A6IHRydWUsXHJcblxyXG4gIC8qKlxyXG4gICAqIEFsbG93IHRoZSBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4gZm9yIGNlcnRhaW4gYnJlYWtwb2ludHMuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgaXNSZXZlYWxlZDogZmFsc2UsXHJcblxyXG4gIC8qKlxyXG4gICAqIEJyZWFrcG9pbnQgYXQgd2hpY2ggdG8gcmV2ZWFsLiBKUyB3aWxsIHVzZSBhIFJlZ0V4cCB0byB0YXJnZXQgc3RhbmRhcmQgY2xhc3NlcywgaWYgY2hhbmdpbmcgY2xhc3NuYW1lcywgcGFzcyB5b3VyIGNsYXNzIHdpdGggdGhlIGByZXZlYWxDbGFzc2Agb3B0aW9uLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSByZXZlYWwtZm9yLWxhcmdlXHJcbiAgICovXHJcbiAgcmV2ZWFsT246IG51bGwsXHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcmNlIGZvY3VzIHRvIHRoZSBvZmZjYW52YXMgb24gb3Blbi4gSWYgdHJ1ZSwgd2lsbCBmb2N1cyB0aGUgb3BlbmluZyB0cmlnZ2VyIG9uIGNsb3NlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgYXV0b0ZvY3VzOiB0cnVlLFxyXG5cclxuICAvKipcclxuICAgKiBDbGFzcyB1c2VkIHRvIGZvcmNlIGFuIG9mZmNhbnZhcyB0byByZW1haW4gb3Blbi4gRm91bmRhdGlvbiBkZWZhdWx0cyBmb3IgdGhpcyBhcmUgYHJldmVhbC1mb3ItbGFyZ2VgICYgYHJldmVhbC1mb3ItbWVkaXVtYC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogVE9ETyBpbXByb3ZlIHRoZSByZWdleCB0ZXN0aW5nIGZvciB0aGlzLlxyXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcclxuICAgKi9cclxuICByZXZlYWxDbGFzczogJ3JldmVhbC1mb3ItJyxcclxuXHJcbiAgLyoqXHJcbiAgICogVHJpZ2dlcnMgb3B0aW9uYWwgZm9jdXMgdHJhcHBpbmcgd2hlbiBvcGVuaW5nIGFuIG9mZmNhbnZhcy4gU2V0cyB0YWJpbmRleCBvZiBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdIHRvIC0xIGZvciBhY2Nlc3NpYmlsaXR5IHB1cnBvc2VzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgICovXHJcbiAgdHJhcEZvY3VzOiBmYWxzZVxyXG59XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihPZmZDYW52YXMsICdPZmZDYW52YXMnKTtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBPcmJpdCBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vcmJpdFxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXHJcbiAqL1xyXG5cclxuY2xhc3MgT3JiaXQge1xyXG4gIC8qKlxyXG4gICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvcmJpdCBjYXJvdXNlbC5cclxuICAqIEBjbGFzc1xyXG4gICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBPcmJpdCBDYXJvdXNlbC5cclxuICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cclxuICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT3JiaXQuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuXHJcbiAgICB0aGlzLl9pbml0KCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT3JiaXQnKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09yYml0Jywge1xyXG4gICAgICAnbHRyJzoge1xyXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcclxuICAgICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcclxuICAgICAgfSxcclxuICAgICAgJ3J0bCc6IHtcclxuICAgICAgICAnQVJST1dfTEVGVCc6ICduZXh0JyxcclxuICAgICAgICAnQVJST1dfUklHSFQnOiAncHJldmlvdXMnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucywgc2V0dGluZyBhdHRyaWJ1dGVzLCBhbmQgc3RhcnRpbmcgdGhlIGFuaW1hdGlvbi5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdGhpcy4kd3JhcHBlciA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzfWApO1xyXG4gICAgdGhpcy4kc2xpZGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKTtcclxuICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKSxcclxuICAgIGluaXRBY3RpdmUgPSB0aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJyk7XHJcblxyXG4gICAgaWYgKCFpbml0QWN0aXZlLmxlbmd0aCkge1xyXG4gICAgICB0aGlzLiRzbGlkZXMuZXEoMCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZU1VSSkge1xyXG4gICAgICB0aGlzLiRzbGlkZXMuYWRkQ2xhc3MoJ25vLW1vdGlvbnVpJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XHJcbiAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcykpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fcHJlcGFyZUZvck9yYml0KCk7Ly9oZWhlXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XHJcbiAgICAgIHRoaXMuX2xvYWRCdWxsZXRzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiB0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICB0aGlzLmdlb1N5bmMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHsgLy8gYWxsb3cgd3JhcHBlciB0byBiZSBmb2N1c2FibGUgdG8gZW5hYmxlIGFycm93IG5hdmlnYXRpb25cclxuICAgICAgdGhpcy4kd3JhcHBlci5hdHRyKCd0YWJpbmRleCcsIDApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBDcmVhdGVzIGEgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgYnVsbGV0cywgaWYgdGhleSBhcmUgYmVpbmcgdXNlZC5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqL1xyXG4gIF9sb2FkQnVsbGV0cygpIHtcclxuICAgIHRoaXMuJGJ1bGxldHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YCkuZmluZCgnYnV0dG9uJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAqIFNldHMgYSBgdGltZXJgIG9iamVjdCBvbiB0aGUgb3JiaXQsIGFuZCBzdGFydHMgdGhlIGNvdW50ZXIgZm9yIHRoZSBuZXh0IHNsaWRlLlxyXG4gICogQGZ1bmN0aW9uXHJcbiAgKi9cclxuICBnZW9TeW5jKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIHRoaXMudGltZXIgPSBuZXcgRm91bmRhdGlvbi5UaW1lcihcclxuICAgICAgdGhpcy4kZWxlbWVudCxcclxuICAgICAge1xyXG4gICAgICAgIGR1cmF0aW9uOiB0aGlzLm9wdGlvbnMudGltZXJEZWxheSxcclxuICAgICAgICBpbmZpbml0ZTogZmFsc2VcclxuICAgICAgfSxcclxuICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgdGhpcy50aW1lci5zdGFydCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBTZXRzIHdyYXBwZXIgYW5kIHNsaWRlIGhlaWdodHMgZm9yIHRoZSBvcmJpdC5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqL1xyXG4gIF9wcmVwYXJlRm9yT3JiaXQoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgdGhpcy5fc2V0V3JhcHBlckhlaWdodChmdW5jdGlvbihtYXgpe1xyXG4gICAgICBfdGhpcy5fc2V0U2xpZGVIZWlnaHQobWF4KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBDYWx1bGF0ZXMgdGhlIGhlaWdodCBvZiBlYWNoIHNsaWRlIGluIHRoZSBjb2xsZWN0aW9uLCBhbmQgdXNlcyB0aGUgdGFsbGVzdCBvbmUgZm9yIHRoZSB3cmFwcGVyIGhlaWdodC5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gYSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIHdoZW4gY29tcGxldGUuXHJcbiAgKi9cclxuICBfc2V0V3JhcHBlckhlaWdodChjYikgey8vcmV3cml0ZSB0aGlzIHRvIGBmb3JgIGxvb3BcclxuICAgIHZhciBtYXggPSAwLCB0ZW1wLCBjb3VudGVyID0gMDtcclxuXHJcbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xyXG4gICAgICAkKHRoaXMpLmF0dHIoJ2RhdGEtc2xpZGUnLCBjb3VudGVyKTtcclxuXHJcbiAgICAgIGlmIChjb3VudGVyKSB7Ly9pZiBub3QgdGhlIGZpcnN0IHNsaWRlLCBzZXQgY3NzIHBvc2l0aW9uIGFuZCBkaXNwbGF5IHByb3BlcnR5XHJcbiAgICAgICAgJCh0aGlzKS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ25vbmUnfSk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XHJcbiAgICAgIGNvdW50ZXIrKztcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChjb3VudGVyID09PSB0aGlzLiRzbGlkZXMubGVuZ3RoKSB7XHJcbiAgICAgIHRoaXMuJHdyYXBwZXIuY3NzKHsnaGVpZ2h0JzogbWF4fSk7IC8vb25seSBjaGFuZ2UgdGhlIHdyYXBwZXIgaGVpZ2h0IHByb3BlcnR5IG9uY2UuXHJcbiAgICAgIGNiKG1heCk7IC8vZmlyZSBjYWxsYmFjayB3aXRoIG1heCBoZWlnaHQgZGltZW5zaW9uLlxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBTZXRzIHRoZSBtYXgtaGVpZ2h0IG9mIGVhY2ggc2xpZGUuXHJcbiAgKiBAZnVuY3Rpb25cclxuICAqIEBwcml2YXRlXHJcbiAgKi9cclxuICBfc2V0U2xpZGVIZWlnaHQoaGVpZ2h0KSB7XHJcbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgJCh0aGlzKS5jc3MoJ21heC1oZWlnaHQnLCBoZWlnaHQpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGJhc2ljYWxseSBldmVyeXRoaW5nIHdpdGhpbiB0aGUgZWxlbWVudC5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiAgICAvLyoqTm93IHVzaW5nIGN1c3RvbSBldmVudCAtIHRoYW5rcyB0bzoqKlxyXG4gICAgLy8qKiAgICAgIFlvaGFpIEFyYXJhdCBvZiBUb3JvbnRvICAgICAgKipcclxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcclxuXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3dpcGUpIHtcclxuICAgICAgICB0aGlzLiRzbGlkZXMub2ZmKCdzd2lwZWxlZnQuemYub3JiaXQgc3dpcGVyaWdodC56Zi5vcmJpdCcpXHJcbiAgICAgICAgLm9uKCdzd2lwZWxlZnQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xyXG4gICAgICAgIH0pLm9uKCdzd2lwZXJpZ2h0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcclxuICAgICAgICB0aGlzLiRzbGlkZXMub24oJ2NsaWNrLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nLCBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/IGZhbHNlIDogdHJ1ZSk7XHJcbiAgICAgICAgICBfdGhpcy50aW1lcltfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/ICdwYXVzZScgOiAnc3RhcnQnXSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnBhdXNlT25Ib3Zlcikge1xyXG4gICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2VlbnRlci56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBfdGhpcy50aW1lci5wYXVzZSgpO1xyXG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKCFfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSkge1xyXG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnN0YXJ0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5uYXZCdXR0b25zKSB7XHJcbiAgICAgICAgdmFyICRjb250cm9scyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLm5leHRDbGFzc30sIC4ke3RoaXMub3B0aW9ucy5wcmV2Q2xhc3N9YCk7XHJcbiAgICAgICAgJGNvbnRyb2xzLmF0dHIoJ3RhYmluZGV4JywgMClcclxuICAgICAgICAvL2Fsc28gbmVlZCB0byBoYW5kbGUgZW50ZXIvcmV0dXJuIGFuZCBzcGFjZWJhciBrZXkgcHJlc3Nlc1xyXG4gICAgICAgIC5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcclxuXHQgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKCQodGhpcykuaGFzQ2xhc3MoX3RoaXMub3B0aW9ucy5uZXh0Q2xhc3MpKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XHJcbiAgICAgICAgdGhpcy4kYnVsbGV0cy5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICgvaXMtYWN0aXZlL2cudGVzdCh0aGlzLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9Ly9pZiB0aGlzIGlzIGFjdGl2ZSwga2ljayBvdXQgb2YgZnVuY3Rpb24uXHJcbiAgICAgICAgICB2YXIgaWR4ID0gJCh0aGlzKS5kYXRhKCdzbGlkZScpLFxyXG4gICAgICAgICAgbHRyID0gaWR4ID4gX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5kYXRhKCdzbGlkZScpLFxyXG4gICAgICAgICAgJHNsaWRlID0gX3RoaXMuJHNsaWRlcy5lcShpZHgpO1xyXG5cclxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGx0ciwgJHNsaWRlLCBpZHgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLiR3cmFwcGVyLmFkZCh0aGlzLiRidWxsZXRzKS5vbigna2V5ZG93bi56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXHJcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ09yYml0Jywge1xyXG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkgeyAvLyBpZiBidWxsZXQgaXMgZm9jdXNlZCwgbWFrZSBzdXJlIGZvY3VzIG1vdmVzXHJcbiAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5pcyhfdGhpcy4kYnVsbGV0cykpIHtcclxuICAgICAgICAgICAgICBfdGhpcy4kYnVsbGV0cy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5mb2N1cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBDaGFuZ2VzIHRoZSBjdXJyZW50IHNsaWRlIHRvIGEgbmV3IG9uZS5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHBhcmFtIHtCb29sZWFufSBpc0xUUiAtIGZsYWcgaWYgdGhlIHNsaWRlIHNob3VsZCBtb3ZlIGxlZnQgdG8gcmlnaHQuXHJcbiAgKiBAcGFyYW0ge2pRdWVyeX0gY2hvc2VuU2xpZGUgLSB0aGUgalF1ZXJ5IGVsZW1lbnQgb2YgdGhlIHNsaWRlIHRvIHNob3cgbmV4dCwgaWYgb25lIGlzIHNlbGVjdGVkLlxyXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgbmV3IHNsaWRlIGluIGl0cyBjb2xsZWN0aW9uLCBpZiBvbmUgY2hvc2VuLlxyXG4gICogQGZpcmVzIE9yYml0I3NsaWRlY2hhbmdlXHJcbiAgKi9cclxuICBjaGFuZ2VTbGlkZShpc0xUUiwgY2hvc2VuU2xpZGUsIGlkeCkge1xyXG4gICAgdmFyICRjdXJTbGlkZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5lcSgwKTtcclxuXHJcbiAgICBpZiAoL211aS9nLnRlc3QoJGN1clNsaWRlWzBdLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9IC8vaWYgdGhlIHNsaWRlIGlzIGN1cnJlbnRseSBhbmltYXRpbmcsIGtpY2sgb3V0IG9mIHRoZSBmdW5jdGlvblxyXG5cclxuICAgIHZhciAkZmlyc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5maXJzdCgpLFxyXG4gICAgJGxhc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5sYXN0KCksXHJcbiAgICBkaXJJbiA9IGlzTFRSID8gJ1JpZ2h0JyA6ICdMZWZ0JyxcclxuICAgIGRpck91dCA9IGlzTFRSID8gJ0xlZnQnIDogJ1JpZ2h0JyxcclxuICAgIF90aGlzID0gdGhpcyxcclxuICAgICRuZXdTbGlkZTtcclxuXHJcbiAgICBpZiAoIWNob3NlblNsaWRlKSB7IC8vbW9zdCBvZiB0aGUgdGltZSwgdGhpcyB3aWxsIGJlIGF1dG8gcGxheWVkIG9yIGNsaWNrZWQgZnJvbSB0aGUgbmF2QnV0dG9ucy5cclxuICAgICAgJG5ld1NsaWRlID0gaXNMVFIgPyAvL2lmIHdyYXBwaW5nIGVuYWJsZWQsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBpcyBhIGBuZXh0YCBvciBgcHJldmAgc2libGluZywgaWYgbm90LCBzZWxlY3QgdGhlIGZpcnN0IG9yIGxhc3Qgc2xpZGUgdG8gZmlsbCBpbi4gaWYgd3JhcHBpbmcgbm90IGVuYWJsZWQsIGF0dGVtcHQgdG8gc2VsZWN0IGBuZXh0YCBvciBgcHJldmAsIGlmIHRoZXJlJ3Mgbm90aGluZyB0aGVyZSwgdGhlIGZ1bmN0aW9uIHdpbGwga2ljayBvdXQgb24gbmV4dCBzdGVwLiBDUkFaWSBORVNURUQgVEVSTkFSSUVTISEhISFcclxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGZpcnN0U2xpZGUgOiAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpLy9waWNrIG5leHQgc2xpZGUgaWYgbW92aW5nIGxlZnQgdG8gcmlnaHRcclxuICAgICAgOlxyXG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkbGFzdFNsaWRlIDogJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKTsvL3BpY2sgcHJldiBzbGlkZSBpZiBtb3ZpbmcgcmlnaHQgdG8gbGVmdFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgJG5ld1NsaWRlID0gY2hvc2VuU2xpZGU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCRuZXdTbGlkZS5sZW5ndGgpIHtcclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XHJcbiAgICAgICAgaWR4ID0gaWR4IHx8IHRoaXMuJHNsaWRlcy5pbmRleCgkbmV3U2xpZGUpOyAvL2dyYWIgaW5kZXggdG8gdXBkYXRlIGJ1bGxldHNcclxuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKGlkeCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudXNlTVVJKSB7XHJcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKFxyXG4gICAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5jc3Moeydwb3NpdGlvbic6ICdhYnNvbHV0ZScsICd0b3AnOiAwfSksXHJcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1JbkZyb20ke2RpcklufWBdLFxyXG4gICAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgJG5ld1NsaWRlLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnYmxvY2snfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dChcclxuICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyksXHJcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1PdXRUbyR7ZGlyT3V0fWBdLFxyXG4gICAgICAgICAgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpO1xyXG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICFfdGhpcy50aW1lci5pc1BhdXNlZCl7XHJcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIucmVzdGFydCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vZG8gc3R1ZmY/XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpLmhpZGUoKTtcclxuICAgICAgICAkbmV3U2xpZGUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKS5zaG93KCk7XHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhdGhpcy50aW1lci5pc1BhdXNlZCkge1xyXG4gICAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAvKipcclxuICAgICogVHJpZ2dlcnMgd2hlbiB0aGUgc2xpZGUgaGFzIGZpbmlzaGVkIGFuaW1hdGluZyBpbi5cclxuICAgICogQGV2ZW50IE9yYml0I3NsaWRlY2hhbmdlXHJcbiAgICAqL1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3NsaWRlY2hhbmdlLnpmLm9yYml0JywgWyRuZXdTbGlkZV0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgKiBVcGRhdGVzIHRoZSBhY3RpdmUgc3RhdGUgb2YgdGhlIGJ1bGxldHMsIGlmIGRpc3BsYXllZC5cclxuICAqIEBmdW5jdGlvblxyXG4gICogQHByaXZhdGVcclxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2xpZGUuXHJcbiAgKi9cclxuICBfdXBkYXRlQnVsbGV0cyhpZHgpIHtcclxuICAgIHZhciAkb2xkQnVsbGV0ID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApXHJcbiAgICAuZmluZCgnLmlzLWFjdGl2ZScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKS5ibHVyKCksXHJcbiAgICBzcGFuID0gJG9sZEJ1bGxldC5maW5kKCdzcGFuOmxhc3QnKS5kZXRhY2goKSxcclxuICAgICRuZXdCdWxsZXQgPSB0aGlzLiRidWxsZXRzLmVxKGlkeCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmFwcGVuZChzcGFuKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICogRGVzdHJveXMgdGhlIGNhcm91c2VsIGFuZCBoaWRlcyB0aGUgZWxlbWVudC5cclxuICAqIEBmdW5jdGlvblxyXG4gICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKS5lbmQoKS5oaWRlKCk7XHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5PcmJpdC5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAqIFRlbGxzIHRoZSBKUyB0byBsb29rIGZvciBhbmQgbG9hZEJ1bGxldHMuXHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgKi9cclxuICBidWxsZXRzOiB0cnVlLFxyXG4gIC8qKlxyXG4gICogVGVsbHMgdGhlIEpTIHRvIGFwcGx5IGV2ZW50IGxpc3RlbmVycyB0byBuYXYgYnV0dG9uc1xyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgdHJ1ZVxyXG4gICovXHJcbiAgbmF2QnV0dG9uczogdHJ1ZSxcclxuICAvKipcclxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcclxuICAqIEBvcHRpb25cclxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1yaWdodCdcclxuICAqL1xyXG4gIGFuaW1JbkZyb21SaWdodDogJ3NsaWRlLWluLXJpZ2h0JyxcclxuICAvKipcclxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcclxuICAqIEBvcHRpb25cclxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXHJcbiAgKi9cclxuICBhbmltT3V0VG9SaWdodDogJ3NsaWRlLW91dC1yaWdodCcsXHJcbiAgLyoqXHJcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcclxuICAqXHJcbiAgKi9cclxuICBhbmltSW5Gcm9tTGVmdDogJ3NsaWRlLWluLWxlZnQnLFxyXG4gIC8qKlxyXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgJ3NsaWRlLW91dC1sZWZ0J1xyXG4gICovXHJcbiAgYW5pbU91dFRvTGVmdDogJ3NsaWRlLW91dC1sZWZ0JyxcclxuICAvKipcclxuICAqIEFsbG93cyBPcmJpdCB0byBhdXRvbWF0aWNhbGx5IGFuaW1hdGUgb24gcGFnZSBsb2FkLlxyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgdHJ1ZVxyXG4gICovXHJcbiAgYXV0b1BsYXk6IHRydWUsXHJcbiAgLyoqXHJcbiAgKiBBbW91bnQgb2YgdGltZSwgaW4gbXMsIGJldHdlZW4gc2xpZGUgdHJhbnNpdGlvbnNcclxuICAqIEBvcHRpb25cclxuICAqIEBleGFtcGxlIDUwMDBcclxuICAqL1xyXG4gIHRpbWVyRGVsYXk6IDUwMDAsXHJcbiAgLyoqXHJcbiAgKiBBbGxvd3MgT3JiaXQgdG8gaW5maW5pdGVseSBsb29wIHRocm91Z2ggdGhlIHNsaWRlc1xyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgdHJ1ZVxyXG4gICovXHJcbiAgaW5maW5pdGVXcmFwOiB0cnVlLFxyXG4gIC8qKlxyXG4gICogQWxsb3dzIHRoZSBPcmJpdCBzbGlkZXMgdG8gYmluZCB0byBzd2lwZSBldmVudHMgZm9yIG1vYmlsZSwgcmVxdWlyZXMgYW4gYWRkaXRpb25hbCB1dGlsIGxpYnJhcnlcclxuICAqIEBvcHRpb25cclxuICAqIEBleGFtcGxlIHRydWVcclxuICAqL1xyXG4gIHN3aXBlOiB0cnVlLFxyXG4gIC8qKlxyXG4gICogQWxsb3dzIHRoZSB0aW1pbmcgZnVuY3Rpb24gdG8gcGF1c2UgYW5pbWF0aW9uIG9uIGhvdmVyLlxyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgdHJ1ZVxyXG4gICovXHJcbiAgcGF1c2VPbkhvdmVyOiB0cnVlLFxyXG4gIC8qKlxyXG4gICogQWxsb3dzIE9yYml0IHRvIGJpbmQga2V5Ym9hcmQgZXZlbnRzIHRvIHRoZSBzbGlkZXIsIHRvIGFuaW1hdGUgZnJhbWVzIHdpdGggYXJyb3cga2V5c1xyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgdHJ1ZVxyXG4gICovXHJcbiAgYWNjZXNzaWJsZTogdHJ1ZSxcclxuICAvKipcclxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRhaW5lciBvZiBPcmJpdFxyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgJ29yYml0LWNvbnRhaW5lcidcclxuICAqL1xyXG4gIGNvbnRhaW5lckNsYXNzOiAnb3JiaXQtY29udGFpbmVyJyxcclxuICAvKipcclxuICAqIENsYXNzIGFwcGxpZWQgdG8gaW5kaXZpZHVhbCBzbGlkZXMuXHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSAnb3JiaXQtc2xpZGUnXHJcbiAgKi9cclxuICBzbGlkZUNsYXNzOiAnb3JiaXQtc2xpZGUnLFxyXG4gIC8qKlxyXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYnVsbGV0IGNvbnRhaW5lci4gWW91J3JlIHdlbGNvbWUuXHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSAnb3JiaXQtYnVsbGV0cydcclxuICAqL1xyXG4gIGJveE9mQnVsbGV0czogJ29yYml0LWJ1bGxldHMnLFxyXG4gIC8qKlxyXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYG5leHRgIG5hdmlnYXRpb24gYnV0dG9uLlxyXG4gICogQG9wdGlvblxyXG4gICogQGV4YW1wbGUgJ29yYml0LW5leHQnXHJcbiAgKi9cclxuICBuZXh0Q2xhc3M6ICdvcmJpdC1uZXh0JyxcclxuICAvKipcclxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBwcmV2aW91c2AgbmF2aWdhdGlvbiBidXR0b24uXHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSAnb3JiaXQtcHJldmlvdXMnXHJcbiAgKi9cclxuICBwcmV2Q2xhc3M6ICdvcmJpdC1wcmV2aW91cycsXHJcbiAgLyoqXHJcbiAgKiBCb29sZWFuIHRvIGZsYWcgdGhlIGpzIHRvIHVzZSBtb3Rpb24gdWkgY2xhc3NlcyBvciBub3QuIERlZmF1bHQgdG8gdHJ1ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGFiaWxpdHkuXHJcbiAgKiBAb3B0aW9uXHJcbiAgKiBAZXhhbXBsZSB0cnVlXHJcbiAgKi9cclxuICB1c2VNVUk6IHRydWVcclxufTtcclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKE9yYml0LCAnT3JiaXQnKTtcclxuXHJcbn0oalF1ZXJ5KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBSZXNwb25zaXZlTWVudSBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudVxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmFjY29yZGlvbk1lbnVcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcmlsbGRvd25cclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcm9wZG93bi1tZW51XHJcbiAqL1xyXG5cclxuY2xhc3MgUmVzcG9uc2l2ZU1lbnUge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSByZXNwb25zaXZlIG1lbnUuXHJcbiAgICogQGNsYXNzXHJcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVNZW51I2luaXRcclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XHJcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLW1lbnUnKTtcclxuICAgIHRoaXMuY3VycmVudE1xID0gbnVsbDtcclxuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZU1lbnUnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBNZW51IGJ5IHBhcnNpbmcgdGhlIGNsYXNzZXMgZnJvbSB0aGUgJ2RhdGEtUmVzcG9uc2l2ZU1lbnUnIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xyXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bGVzID09PSAnc3RyaW5nJykge1xyXG4gICAgICBsZXQgcnVsZXNUcmVlID0ge307XHJcblxyXG4gICAgICAvLyBQYXJzZSBydWxlcyBmcm9tIFwiY2xhc3Nlc1wiIHB1bGxlZCBmcm9tIGRhdGEgYXR0cmlidXRlXHJcbiAgICAgIGxldCBydWxlcyA9IHRoaXMucnVsZXMuc3BsaXQoJyAnKTtcclxuXHJcbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBldmVyeSBydWxlIGZvdW5kXHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XHJcbiAgICAgICAgbGV0IHJ1bGVTaXplID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVswXSA6ICdzbWFsbCc7XHJcbiAgICAgICAgbGV0IHJ1bGVQbHVnaW4gPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzFdIDogcnVsZVswXTtcclxuXHJcbiAgICAgICAgaWYgKE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dICE9PSBudWxsKSB7XHJcbiAgICAgICAgICBydWxlc1RyZWVbcnVsZVNpemVdID0gTWVudVBsdWdpbnNbcnVsZVBsdWdpbl07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XHJcbiAgICAgIHRoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSBNZW51LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcclxuICAgICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XHJcbiAgICB9KTtcclxuICAgIC8vICQod2luZG93KS5vbigncmVzaXplLnpmLlJlc3BvbnNpdmVNZW51JywgZnVuY3Rpb24oKSB7XHJcbiAgICAvLyAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xyXG4gICAgLy8gfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgc2NyZWVuIHdpZHRoIGFnYWluc3QgYXZhaWxhYmxlIG1lZGlhIHF1ZXJpZXMuIElmIHRoZSBtZWRpYSBxdWVyeSBoYXMgY2hhbmdlZCwgYW5kIHRoZSBwbHVnaW4gbmVlZGVkIGhhcyBjaGFuZ2VkLCB0aGUgcGx1Z2lucyB3aWxsIHN3YXAgb3V0LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xyXG4gICAgdmFyIG1hdGNoZWRNcSwgX3RoaXMgPSB0aGlzO1xyXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSBhbmQgZmluZCB0aGUgbGFzdCBtYXRjaGluZyBydWxlXHJcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChrZXkpKSB7XHJcbiAgICAgICAgbWF0Y2hlZE1xID0ga2V5O1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxyXG4gICAgaWYgKCFtYXRjaGVkTXEpIHJldHVybjtcclxuXHJcbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxyXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbiBpbnN0YW5jZW9mIHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4pIHJldHVybjtcclxuXHJcbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXHJcbiAgICAkLmVhY2goTWVudVBsdWdpbnMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcclxuICAgICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModmFsdWUuY3NzQ2xhc3MpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRoZSBDU1MgY2xhc3MgZm9yIHRoZSBuZXcgcGx1Z2luXHJcbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBuZXcgcGx1Z2luXHJcbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xyXG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbmV3IHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4odGhpcy4kZWxlbWVudCwge30pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcclxuICAgICQod2luZG93KS5vZmYoJy56Zi5SZXNwb25zaXZlTWVudScpO1xyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuUmVzcG9uc2l2ZU1lbnUuZGVmYXVsdHMgPSB7fTtcclxuXHJcbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxyXG52YXIgTWVudVBsdWdpbnMgPSB7XHJcbiAgZHJvcGRvd246IHtcclxuICAgIGNzc0NsYXNzOiAnZHJvcGRvd24nLFxyXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcm9wZG93bi1tZW51J10gfHwgbnVsbFxyXG4gIH0sXHJcbiBkcmlsbGRvd246IHtcclxuICAgIGNzc0NsYXNzOiAnZHJpbGxkb3duJyxcclxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJpbGxkb3duJ10gfHwgbnVsbFxyXG4gIH0sXHJcbiAgYWNjb3JkaW9uOiB7XHJcbiAgICBjc3NDbGFzczogJ2FjY29yZGlvbi1tZW51JyxcclxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snYWNjb3JkaW9uLW1lbnUnXSB8fCBudWxsXHJcbiAgfVxyXG59O1xyXG5cclxuLy8gV2luZG93IGV4cG9ydHNcclxuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZU1lbnUsICdSZXNwb25zaXZlTWVudScpO1xyXG5cclxufShqUXVlcnkpO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4hZnVuY3Rpb24oJCkge1xyXG5cclxuLyoqXHJcbiAqIFJlc3BvbnNpdmVUb2dnbGUgbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZVxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcclxuICovXHJcblxyXG5jbGFzcyBSZXNwb25zaXZlVG9nZ2xlIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRhYiBCYXIuXHJcbiAgICogQGNsYXNzXHJcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjaW5pdFxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggdGFiIGJhciBmdW5jdGlvbmFsaXR5IHRvLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcclxuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYiBiYXIgYnkgZmluZGluZyB0aGUgdGFyZ2V0IGVsZW1lbnQsIHRvZ2dsaW5nIGVsZW1lbnQsIGFuZCBydW5uaW5nIHVwZGF0ZSgpLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB2YXIgdGFyZ2V0SUQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtdG9nZ2xlJyk7XHJcbiAgICBpZiAoIXRhcmdldElEKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdXIgdGFiIGJhciBuZWVkcyBhbiBJRCBvZiBhIE1lbnUgYXMgdGhlIHZhbHVlIG9mIGRhdGEtdGFiLWJhci4nKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiR0YXJnZXRNZW51ID0gJChgIyR7dGFyZ2V0SUR9YCk7XHJcbiAgICB0aGlzLiR0b2dnbGVyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10b2dnbGVdJyk7XHJcblxyXG4gICAgdGhpcy5fdXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhlIHRhYiBiYXIgdG8gd29yay5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9ldmVudHMoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIHRoaXMuX3VwZGF0ZU1xSGFuZGxlciA9IHRoaXMuX3VwZGF0ZS5iaW5kKHRoaXMpO1xyXG4gICAgXHJcbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XHJcblxyXG4gICAgdGhpcy4kdG9nZ2xlci5vbignY2xpY2suemYucmVzcG9uc2l2ZVRvZ2dsZScsIHRoaXMudG9nZ2xlTWVudS5iaW5kKHRoaXMpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBtZWRpYSBxdWVyeSB0byBkZXRlcm1pbmUgaWYgdGhlIHRhYiBiYXIgc2hvdWxkIGJlIHZpc2libGUgb3IgaGlkZGVuLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX3VwZGF0ZSgpIHtcclxuICAgIC8vIE1vYmlsZVxyXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcclxuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KCk7XHJcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuaGlkZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2t0b3BcclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUoKTtcclxuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5zaG93KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUb2dnbGVzIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyLiBUaGUgdG9nZ2xlIG9ubHkgaGFwcGVucyBpZiB0aGUgc2NyZWVuIGlzIHNtYWxsIGVub3VnaCB0byBhbGxvdyBpdC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXHJcbiAgICovXHJcbiAgdG9nZ2xlTWVudSgpIHsgICBcclxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XHJcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUudG9nZ2xlKDApO1xyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cclxuICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XHJcbiAgICB0aGlzLiR0b2dnbGVyLm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcclxuICAgIFxyXG4gICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcclxuICAgIFxyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBUaGUgYnJlYWtwb2ludCBhZnRlciB3aGljaCB0aGUgbWVudSBpcyBhbHdheXMgc2hvd24sIGFuZCB0aGUgdGFiIGJhciBpcyBoaWRkZW4uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXHJcbiAgICovXHJcbiAgaGlkZUZvcjogJ21lZGl1bSdcclxufTtcclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVUb2dnbGUsICdSZXNwb25zaXZlVG9nZ2xlJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogUmV2ZWFsIG1vZHVsZS5cclxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJldmVhbFxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uIGlmIHVzaW5nIGFuaW1hdGlvbnNcclxuICovXHJcblxyXG5jbGFzcyBSZXZlYWwge1xyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgUmV2ZWFsLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgZm9yIHRoZSBtb2RhbC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbmFsIHBhcmFtZXRlcnMuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmV2ZWFsLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XHJcbiAgICB0aGlzLl9pbml0KCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmV2ZWFsJyk7XHJcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdSZXZlYWwnLCB7XHJcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcclxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxyXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcclxuICAgICAgJ1RBQic6ICd0YWJfZm9yd2FyZCcsXHJcbiAgICAgICdTSElGVF9UQUInOiAndGFiX2JhY2t3YXJkJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgbW9kYWwgYnkgYWRkaW5nIHRoZSBvdmVybGF5IGFuZCBjbG9zZSBidXR0b25zLCAoaWYgc2VsZWN0ZWQpLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB0aGlzLmlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xyXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgdGhpcy5jYWNoZWQgPSB7bXE6IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5jdXJyZW50fTtcclxuICAgIHRoaXMuaXNNb2JpbGUgPSBtb2JpbGVTbmlmZigpO1xyXG5cclxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkubGVuZ3RoID8gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKSA6ICQoYFtkYXRhLXRvZ2dsZT1cIiR7dGhpcy5pZH1cIl1gKTtcclxuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcclxuICAgICAgJ2FyaWEtY29udHJvbHMnOiB0aGlzLmlkLFxyXG4gICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXHJcbiAgICAgICd0YWJpbmRleCc6IDBcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmdWxsJykpIHtcclxuICAgICAgdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gPSB0cnVlO1xyXG4gICAgICB0aGlzLm9wdGlvbnMub3ZlcmxheSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5ICYmICF0aGlzLiRvdmVybGF5KSB7XHJcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSB0aGlzLl9tYWtlT3ZlcmxheSh0aGlzLmlkKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xyXG4gICAgICAgICdyb2xlJzogJ2RpYWxvZycsXHJcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcclxuICAgICAgICAnZGF0YS15ZXRpLWJveCc6IHRoaXMuaWQsXHJcbiAgICAgICAgJ2RhdGEtcmVzaXplJzogdGhpcy5pZFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xyXG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKHRoaXMuJG92ZXJsYXkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbygkKCdib2R5JykpO1xyXG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd3aXRob3V0LW92ZXJsYXknKTtcclxuICAgIH1cclxuICAgIHRoaXMuX2V2ZW50cygpO1xyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluayAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCBgIyR7dGhpcy5pZH1gKSkge1xyXG4gICAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnJldmVhbCcsIHRoaXMub3Blbi5iaW5kKHRoaXMpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYW4gb3ZlcmxheSBkaXYgdG8gZGlzcGxheSBiZWhpbmQgdGhlIG1vZGFsLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX21ha2VPdmVybGF5KGlkKSB7XHJcbiAgICB2YXIgJG92ZXJsYXkgPSAkKCc8ZGl2PjwvZGl2PicpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdyZXZlYWwtb3ZlcmxheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZFRvKCdib2R5Jyk7XHJcbiAgICByZXR1cm4gJG92ZXJsYXk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGVzIHBvc2l0aW9uIG9mIG1vZGFsXHJcbiAgICogVE9ETzogIEZpZ3VyZSBvdXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBjYWNoZSB0aGVzZSB2YWx1ZXMgb3IgaWYgaXQgZG9lc24ndCBtYXR0ZXJcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF91cGRhdGVQb3NpdGlvbigpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpO1xyXG4gICAgdmFyIG91dGVyV2lkdGggPSAkKHdpbmRvdykud2lkdGgoKTtcclxuICAgIHZhciBoZWlnaHQgPSB0aGlzLiRlbGVtZW50Lm91dGVySGVpZ2h0KCk7XHJcbiAgICB2YXIgb3V0ZXJIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XHJcbiAgICB2YXIgbGVmdCwgdG9wO1xyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ID09PSAnYXV0bycpIHtcclxuICAgICAgbGVmdCA9IHBhcnNlSW50KChvdXRlcldpZHRoIC0gd2lkdGgpIC8gMiwgMTApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbGVmdCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy5oT2Zmc2V0LCAxMCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLnZPZmZzZXQgPT09ICdhdXRvJykge1xyXG4gICAgICBpZiAoaGVpZ2h0ID4gb3V0ZXJIZWlnaHQpIHtcclxuICAgICAgICB0b3AgPSBwYXJzZUludChNYXRoLm1pbigxMDAsIG91dGVySGVpZ2h0IC8gMTApLCAxMCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoKG91dGVySGVpZ2h0IC0gaGVpZ2h0KSAvIDQsIDEwKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdG9wID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLnZPZmZzZXQsIDEwKTtcclxuICAgIH1cclxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHt0b3A6IHRvcCArICdweCd9KTtcclxuICAgIC8vIG9ubHkgd29ycnkgYWJvdXQgbGVmdCBpZiB3ZSBkb24ndCBoYXZlIGFuIG92ZXJsYXkgb3Igd2UgaGF2ZWEgIGhvcml6b250YWwgb2Zmc2V0LFxyXG4gICAgLy8gb3RoZXJ3aXNlIHdlJ3JlIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlXHJcbiAgICBpZighdGhpcy4kb3ZlcmxheSB8fCAodGhpcy5vcHRpb25zLmhPZmZzZXQgIT09ICdhdXRvJykpIHtcclxuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe2xlZnQ6IGxlZnQgKyAncHgnfSk7XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHttYXJnaW46ICcwcHgnfSk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgdGhlIG1vZGFsLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XHJcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcclxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiAoZXZlbnQsICRlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKChldmVudC50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdKSB8fFxyXG4gICAgICAgICAgICAoJChldmVudC50YXJnZXQpLnBhcmVudHMoJ1tkYXRhLWNsb3NhYmxlXScpWzBdID09PSAkZWxlbWVudCkpIHsgLy8gb25seSBjbG9zZSByZXZlYWwgd2hlbiBpdCdzIGV4cGxpY2l0bHkgY2FsbGVkXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZS5hcHBseSh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXHJcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgX3RoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGlmICh0aGlzLiRhbmNob3IubGVuZ3RoKSB7XHJcbiAgICAgIHRoaXMuJGFuY2hvci5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzIHx8IGUud2hpY2ggPT09IDMyKSB7XHJcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgX3RoaXMub3BlbigpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcclxuICAgICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5yZXZlYWwnKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxyXG4gICAgICAgIF90aGlzLmNsb3NlKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xyXG4gICAgICAkKHdpbmRvdykub24oYHBvcHN0YXRlLnpmLnJldmVhbDoke3RoaXMuaWR9YCwgdGhpcy5faGFuZGxlU3RhdGUuYmluZCh0aGlzKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGVzIG1vZGFsIG1ldGhvZHMgb24gYmFjay9mb3J3YXJkIGJ1dHRvbiBjbGlja3Mgb3IgYW55IG90aGVyIGV2ZW50IHRoYXQgdHJpZ2dlcnMgcG9wc3RhdGUuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaGFuZGxlU3RhdGUoZSkge1xyXG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggJyMnICsgdGhpcy5pZCkgJiYgIXRoaXMuaXNBY3RpdmUpeyB0aGlzLm9wZW4oKTsgfVxyXG4gICAgZWxzZXsgdGhpcy5jbG9zZSgpOyB9XHJcbiAgfVxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogT3BlbnMgdGhlIG1vZGFsIGNvbnRyb2xsZWQgYnkgYHRoaXMuJGFuY2hvcmAsIGFuZCBjbG9zZXMgYWxsIG90aGVycyBieSBkZWZhdWx0LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VtZVxyXG4gICAqIEBmaXJlcyBSZXZlYWwjb3BlblxyXG4gICAqL1xyXG4gIG9wZW4oKSB7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XHJcbiAgICAgIHZhciBoYXNoID0gYCMke3RoaXMuaWR9YDtcclxuXHJcbiAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcclxuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XHJcblxyXG4gICAgLy8gTWFrZSBlbGVtZW50cyBpbnZpc2libGUsIGJ1dCByZW1vdmUgZGlzcGxheTogbm9uZSBzbyB3ZSBjYW4gZ2V0IHNpemUgYW5kIHBvc2l0aW9uaW5nXHJcbiAgICB0aGlzLiRlbGVtZW50XHJcbiAgICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJ2hpZGRlbicgfSlcclxuICAgICAgICAuc2hvdygpXHJcbiAgICAgICAgLnNjcm9sbFRvcCgwKTtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xyXG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJ30pLnNob3coKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl91cGRhdGVQb3NpdGlvbigpO1xyXG5cclxuICAgIHRoaXMuJGVsZW1lbnRcclxuICAgICAgLmhpZGUoKVxyXG4gICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnJyB9KTtcclxuXHJcbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XHJcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICcnfSkuaGlkZSgpO1xyXG4gICAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYXN0JykpIHtcclxuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdmYXN0Jyk7XHJcbiAgICAgIH0gZWxzZSBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnc2xvdycpKSB7XHJcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnc2xvdycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpcGxlT3BlbmVkKSB7XHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBGaXJlcyBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG1vZGFsIG9wZW5zLlxyXG4gICAgICAgKiBDbG9zZXMgYW55IG90aGVyIG1vZGFscyB0aGF0IGFyZSBjdXJyZW50bHkgb3BlblxyXG4gICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlbWVcclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5yZXZlYWwnLCB0aGlzLmlkKTtcclxuICAgIH1cclxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgcmV2ZWFsXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkluKSB7XHJcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgIGZ1bmN0aW9uIGFmdGVyQW5pbWF0aW9uRm9jdXMoKXtcclxuICAgICAgICBfdGhpcy4kZWxlbWVudFxyXG4gICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcclxuICAgICAgICAgICAgJ3RhYmluZGV4JzogLTFcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuZm9jdXMoKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdmb2N1cycpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xyXG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRvdmVybGF5LCAnZmFkZS1pbicpO1xyXG4gICAgICB9XHJcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4sICgpID0+IHtcclxuICAgICAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgIGFmdGVyQW5pbWF0aW9uRm9jdXMoKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIHJldmVhbFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xyXG4gICAgICAgIHRoaXMuJG92ZXJsYXkuc2hvdygwKTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLiRlbGVtZW50LnNob3codGhpcy5vcHRpb25zLnNob3dEZWxheSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaGFuZGxlIGFjY2Vzc2liaWxpdHlcclxuICAgIHRoaXMuJGVsZW1lbnRcclxuICAgICAgLmF0dHIoe1xyXG4gICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxyXG4gICAgICAgICd0YWJpbmRleCc6IC0xXHJcbiAgICAgIH0pXHJcbiAgICAgIC5mb2N1cygpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQuXHJcbiAgICAgKiBAZXZlbnQgUmV2ZWFsI29wZW5cclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvcGVuLnpmLnJldmVhbCcpO1xyXG5cclxuICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgIHRoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICQoJ2h0bWwsIGJvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuX2V4dHJhSGFuZGxlcnMoKTtcclxuICAgIH0sIDApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBleHRyYSBldmVudCBoYW5kbGVycyBmb3IgdGhlIGJvZHkgYW5kIHdpbmRvdyBpZiBuZWNlc3NhcnkuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfZXh0cmFIYW5kbGVycygpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xyXG5cclxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiAhdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4pIHtcclxuICAgICAgJCgnYm9keScpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XHJcbiAgICAgICQod2luZG93KS5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcclxuICAgICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xyXG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGxvY2sgZm9jdXMgd2l0aGluIG1vZGFsIHdoaWxlIHRhYmJpbmdcclxuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyk7XHJcbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcclxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcclxuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpKSkgeyAvLyBsZWZ0IG1vZGFsIGRvd253YXJkcywgc2V0dGluZyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XHJcbiAgICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKDApLmZvY3VzKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGFiX2JhY2t3YXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKSkgfHwgX3RoaXMuJGVsZW1lbnQuaXMoJzpmb2N1cycpKSB7IC8vIGxlZnQgbW9kYWwgdXB3YXJkcywgc2V0dGluZyBmb2N1cyB0byBsYXN0IGVsZW1lbnRcclxuICAgICAgICAgICAgX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJykpKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IC8vIHNldCBmb2N1cyBiYWNrIHRvIGFuY2hvciBpZiBjbG9zZSBidXR0b24gaGFzIGJlZW4gYWN0aXZhdGVkXHJcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xyXG4gICAgICAgICAgICB9LCAxKTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cykpIHsgLy8gZG9udCd0IHRyaWdnZXIgaWYgYWN1YWwgZWxlbWVudCBoYXMgZm9jdXMgKGkuZS4gaW5wdXRzLCBsaW5rcywgLi4uKVxyXG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XHJcbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3NlcyB0aGUgbW9kYWwuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZWRcclxuICAgKi9cclxuICBjbG9zZSgpIHtcclxuICAgIGlmICghdGhpcy5pc0FjdGl2ZSB8fCAhdGhpcy4kZWxlbWVudC5pcygnOnZpc2libGUnKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgaGlkaW5nXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCkge1xyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcclxuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJG92ZXJsYXksICdmYWRlLW91dCcsIGZpbmlzaFVwKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBmaW5pc2hVcCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpO1xyXG4gICAgfVxyXG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiBoaWRpbmdcclxuICAgIGVsc2Uge1xyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcclxuICAgICAgICB0aGlzLiRvdmVybGF5LmhpZGUoMCwgZmluaXNoVXApO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGZpbmlzaFVwKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSh0aGlzLm9wdGlvbnMuaGlkZURlbGF5KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb25kaXRpb25hbHMgdG8gcmVtb3ZlIGV4dHJhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCBvbiBvcGVuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcclxuICAgICAgJCh3aW5kb3cpLm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcclxuICAgICAgJCgnYm9keScpLm9mZignY2xpY2suemYucmV2ZWFsJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XHJcblxyXG4gICAgZnVuY3Rpb24gZmluaXNoVXAoKSB7XHJcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xyXG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcclxuICAgICAgICBpZihfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcykge1xyXG4gICAgICAgICAgJCgnYm9keScpLnNjcm9sbFRvcChfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyk7XHJcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGlzIGRvbmUgY2xvc2luZy5cclxuICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlZFxyXG4gICAgICAqL1xyXG4gICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYucmV2ZWFsJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIFJlc2V0cyB0aGUgbW9kYWwgY29udGVudFxyXG4gICAgKiBUaGlzIHByZXZlbnRzIGEgcnVubmluZyB2aWRlbyB0byBrZWVwIGdvaW5nIGluIHRoZSBiYWNrZ3JvdW5kXHJcbiAgICAqL1xyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNldE9uQ2xvc2UpIHtcclxuICAgICAgdGhpcy4kZWxlbWVudC5odG1sKHRoaXMuJGVsZW1lbnQuaHRtbCgpKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XHJcbiAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcclxuICAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUpIHtcclxuICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKFwiXCIsIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xyXG4gICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJztcclxuICAgICAgIH1cclxuICAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUb2dnbGVzIHRoZSBvcGVuL2Nsb3NlZCBzdGF0ZSBvZiBhIG1vZGFsLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIHRvZ2dsZSgpIHtcclxuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XHJcbiAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMub3BlbigpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGEgbW9kYWwuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xyXG4gICAgICB0aGlzLiRlbGVtZW50LmFwcGVuZFRvKCQoJ2JvZHknKSk7IC8vIG1vdmUgJGVsZW1lbnQgb3V0c2lkZSBvZiAkb3ZlcmxheSB0byBwcmV2ZW50IGVycm9yIHVucmVnaXN0ZXJQbHVnaW4oKVxyXG4gICAgICB0aGlzLiRvdmVybGF5LmhpZGUoKS5vZmYoKS5yZW1vdmUoKTtcclxuICAgIH1cclxuICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpLm9mZigpO1xyXG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmJyk7XHJcbiAgICAkKHdpbmRvdykub2ZmKGAuemYucmV2ZWFsOiR7dGhpcy5pZH1gKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfTtcclxufVxyXG5cclxuUmV2ZWFsLmRlZmF1bHRzID0ge1xyXG4gIC8qKlxyXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdzbGlkZS1pbi1sZWZ0J1xyXG4gICAqL1xyXG4gIGFuaW1hdGlvbkluOiAnJyxcclxuICAvKipcclxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LXJpZ2h0J1xyXG4gICAqL1xyXG4gIGFuaW1hdGlvbk91dDogJycsXHJcbiAgLyoqXHJcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBvcGVuaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMTBcclxuICAgKi9cclxuICBzaG93RGVsYXk6IDAsXHJcbiAgLyoqXHJcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBjbG9zaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMTBcclxuICAgKi9cclxuICBoaWRlRGVsYXk6IDAsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkvb3ZlcmxheSB0byBjbG9zZSB0aGUgbW9kYWwuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIHRydWVcclxuICAgKi9cclxuICBjbG9zZU9uQ2xpY2s6IHRydWUsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBjbG9zZSBpZiB0aGUgdXNlciBwcmVzc2VzIHRoZSBgRVNDQVBFYCBrZXkuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIHRydWVcclxuICAgKi9cclxuICBjbG9zZU9uRXNjOiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIElmIHRydWUsIGFsbG93cyBtdWx0aXBsZSBtb2RhbHMgdG8gYmUgZGlzcGxheWVkIGF0IG9uY2UuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgbXVsdGlwbGVPcGVuZWQ6IGZhbHNlLFxyXG4gIC8qKlxyXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBkb3duIGZyb20gdGhlIHRvcCBvZiB0aGUgc2NyZWVuLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBhdXRvXHJcbiAgICovXHJcbiAgdk9mZnNldDogJ2F1dG8nLFxyXG4gIC8qKlxyXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBpbiBmcm9tIHRoZSBzaWRlIG9mIHRoZSBzY3JlZW4uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGF1dG9cclxuICAgKi9cclxuICBoT2Zmc2V0OiAnYXV0bycsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBiZSBmdWxsc2NyZWVuLCBjb21wbGV0ZWx5IGJsb2NraW5nIG91dCB0aGUgcmVzdCBvZiB0aGUgdmlldy4gSlMgY2hlY2tzIGZvciB0aGlzIGFzIHdlbGwuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgZnVsbFNjcmVlbjogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogUGVyY2VudGFnZSBvZiBzY3JlZW4gaGVpZ2h0IHRoZSBtb2RhbCBzaG91bGQgcHVzaCB1cCBmcm9tIHRoZSBib3R0b20gb2YgdGhlIHZpZXcuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDEwXHJcbiAgICovXHJcbiAgYnRtT2Zmc2V0UGN0OiAxMCxcclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGdlbmVyYXRlIGFuIG92ZXJsYXkgZGl2LCB3aGljaCB3aWxsIGNvdmVyIHRoZSB2aWV3IHdoZW4gbW9kYWwgb3BlbnMuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIHRydWVcclxuICAgKi9cclxuICBvdmVybGF5OiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gcmVtb3ZlIGFuZCByZWluamVjdCBtYXJrdXAgb24gY2xvc2UuIFNob3VsZCBiZSB0cnVlIGlmIHVzaW5nIHZpZGVvIGVsZW1lbnRzIHcvbyB1c2luZyBwcm92aWRlcidzIGFwaSwgb3RoZXJ3aXNlLCB2aWRlb3Mgd2lsbCBjb250aW51ZSB0byBwbGF5IGluIHRoZSBiYWNrZ3JvdW5kLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIHJlc2V0T25DbG9zZTogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhbHRlciB0aGUgdXJsIG9uIG9wZW4vY2xvc2UsIGFuZCBhbGxvd3MgdGhlIHVzZSBvZiB0aGUgYGJhY2tgIGJ1dHRvbiB0byBjbG9zZSBtb2RhbHMuIEFMU08sIGFsbG93cyBhIG1vZGFsIHRvIGF1dG8tbWFuaWFjYWxseSBvcGVuIG9uIHBhZ2UgbG9hZCBJRiB0aGUgaGFzaCA9PT0gdGhlIG1vZGFsJ3MgdXNlci1zZXQgaWQuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgZGVlcExpbms6IGZhbHNlXHJcbn07XHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXZlYWwsICdSZXZlYWwnKTtcclxuXHJcbmZ1bmN0aW9uIGlQaG9uZVNuaWZmKCkge1xyXG4gIHJldHVybiAvaVAoYWR8aG9uZXxvZCkuKk9TLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYW5kcm9pZFNuaWZmKCkge1xyXG4gIHJldHVybiAvQW5kcm9pZC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vYmlsZVNuaWZmKCkge1xyXG4gIHJldHVybiBpUGhvbmVTbmlmZigpIHx8IGFuZHJvaWRTbmlmZigpO1xyXG59XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogU2xpZGVyIG1vZHVsZS5cclxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnNsaWRlclxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxyXG4gKi9cclxuXHJcbmNsYXNzIFNsaWRlciB7XHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFNsaWRlci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuX2luaXQoKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTbGlkZXInKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1NsaWRlcicsIHtcclxuICAgICAgJ2x0cic6IHtcclxuICAgICAgICAnQVJST1dfUklHSFQnOiAnaW5jcmVhc2UnLFxyXG4gICAgICAgICdBUlJPV19VUCc6ICdpbmNyZWFzZScsXHJcbiAgICAgICAgJ0FSUk9XX0RPV04nOiAnZGVjcmVhc2UnLFxyXG4gICAgICAgICdBUlJPV19MRUZUJzogJ2RlY3JlYXNlJyxcclxuICAgICAgICAnU0hJRlRfQVJST1dfUklHSFQnOiAnaW5jcmVhc2VfZmFzdCcsXHJcbiAgICAgICAgJ1NISUZUX0FSUk9XX1VQJzogJ2luY3JlYXNlX2Zhc3QnLFxyXG4gICAgICAgICdTSElGVF9BUlJPV19ET1dOJzogJ2RlY3JlYXNlX2Zhc3QnLFxyXG4gICAgICAgICdTSElGVF9BUlJPV19MRUZUJzogJ2RlY3JlYXNlX2Zhc3QnXHJcbiAgICAgIH0sXHJcbiAgICAgICdydGwnOiB7XHJcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnaW5jcmVhc2UnLFxyXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdkZWNyZWFzZScsXHJcbiAgICAgICAgJ1NISUZUX0FSUk9XX0xFRlQnOiAnaW5jcmVhc2VfZmFzdCcsXHJcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlX2Zhc3QnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlsaXplcyB0aGUgcGx1Z2luIGJ5IHJlYWRpbmcvc2V0dGluZyBhdHRyaWJ1dGVzLCBjcmVhdGluZyBjb2xsZWN0aW9ucyBhbmQgc2V0dGluZyB0aGUgaW5pdGlhbCBwb3NpdGlvbiBvZiB0aGUgaGFuZGxlKHMpLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2luaXQoKSB7XHJcbiAgICB0aGlzLmlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQnKTtcclxuICAgIHRoaXMuaGFuZGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKTtcclxuXHJcbiAgICB0aGlzLiRoYW5kbGUgPSB0aGlzLmhhbmRsZXMuZXEoMCk7XHJcbiAgICB0aGlzLiRpbnB1dCA9IHRoaXMuaW5wdXRzLmxlbmd0aCA/IHRoaXMuaW5wdXRzLmVxKDApIDogJChgIyR7dGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcclxuICAgIHRoaXMuJGZpbGwgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXNsaWRlci1maWxsXScpLmNzcyh0aGlzLm9wdGlvbnMudmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsIDApO1xyXG5cclxuICAgIHZhciBpc0RibCA9IGZhbHNlLFxyXG4gICAgICAgIF90aGlzID0gdGhpcztcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZWQgfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcclxuICAgICAgdGhpcy5vcHRpb25zLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcyk7XHJcbiAgICB9XHJcbiAgICBpZiAoIXRoaXMuaW5wdXRzLmxlbmd0aCkge1xyXG4gICAgICB0aGlzLmlucHV0cyA9ICQoKS5hZGQodGhpcy4kaW5wdXQpO1xyXG4gICAgICB0aGlzLm9wdGlvbnMuYmluZGluZyA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9zZXRJbml0QXR0cigwKTtcclxuICAgIHRoaXMuX2V2ZW50cyh0aGlzLiRoYW5kbGUpO1xyXG5cclxuICAgIGlmICh0aGlzLmhhbmRsZXNbMV0pIHtcclxuICAgICAgdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID0gdHJ1ZTtcclxuICAgICAgdGhpcy4kaGFuZGxlMiA9IHRoaXMuaGFuZGxlcy5lcSgxKTtcclxuICAgICAgdGhpcy4kaW5wdXQyID0gdGhpcy5pbnB1dHMubGVuZ3RoID4gMSA/IHRoaXMuaW5wdXRzLmVxKDEpIDogJChgIyR7dGhpcy4kaGFuZGxlMi5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YCk7XHJcblxyXG4gICAgICBpZiAoIXRoaXMuaW5wdXRzWzFdKSB7XHJcbiAgICAgICAgdGhpcy5pbnB1dHMgPSB0aGlzLmlucHV0cy5hZGQodGhpcy4kaW5wdXQyKTtcclxuICAgICAgfVxyXG4gICAgICBpc0RibCA9IHRydWU7XHJcblxyXG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LCB0cnVlLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgX3RoaXMuX3NldEhhbmRsZVBvcyhfdGhpcy4kaGFuZGxlMiwgX3RoaXMub3B0aW9ucy5pbml0aWFsRW5kLCB0cnVlKTtcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIHRoaXMuJGhhbmRsZS50cmlnZ2VySGFuZGxlcignY2xpY2suemYuc2xpZGVyJyk7XHJcbiAgICAgIHRoaXMuX3NldEluaXRBdHRyKDEpO1xyXG4gICAgICB0aGlzLl9ldmVudHModGhpcy4kaGFuZGxlMik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFpc0RibCkge1xyXG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LCB0cnVlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzZWxlY3RlZCBoYW5kbGUgYW5kIGZpbGwgYmFyLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRobmRsIC0gdGhlIHNlbGVjdGVkIGhhbmRsZSB0byBtb3ZlLlxyXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsb2NhdGlvbiAtIGZsb2F0aW5nIHBvaW50IGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgdmFsdWVzIG9mIHRoZSBzbGlkZXIgYmFyLlxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uLlxyXG4gICAqIEBmaXJlcyBTbGlkZXIjbW92ZWRcclxuICAgKiBAZmlyZXMgU2xpZGVyI2NoYW5nZWRcclxuICAgKi9cclxuICBfc2V0SGFuZGxlUG9zKCRobmRsLCBsb2NhdGlvbiwgbm9JbnZlcnQsIGNiKSB7XHJcbiAgICAvLyBkb24ndCBtb3ZlIGlmIHRoZSBzbGlkZXIgaGFzIGJlZW4gZGlzYWJsZWQgc2luY2UgaXRzIGluaXRpYWxpemF0aW9uXHJcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy9taWdodCBuZWVkIHRvIGFsdGVyIHRoYXQgc2xpZ2h0bHkgZm9yIGJhcnMgdGhhdCB3aWxsIGhhdmUgb2RkIG51bWJlciBzZWxlY3Rpb25zLlxyXG4gICAgbG9jYXRpb24gPSBwYXJzZUZsb2F0KGxvY2F0aW9uKTsvL29uIGlucHV0IGNoYW5nZSBldmVudHMsIGNvbnZlcnQgc3RyaW5nIHRvIG51bWJlci4uLmdydW1ibGUuXHJcblxyXG4gICAgLy8gcHJldmVudCBzbGlkZXIgZnJvbSBydW5uaW5nIG91dCBvZiBib3VuZHMsIGlmIHZhbHVlIGV4Y2VlZHMgdGhlIGxpbWl0cyBzZXQgdGhyb3VnaCBvcHRpb25zLCBvdmVycmlkZSB0aGUgdmFsdWUgdG8gbWluL21heFxyXG4gICAgaWYgKGxvY2F0aW9uIDwgdGhpcy5vcHRpb25zLnN0YXJ0KSB7IGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLnN0YXJ0OyB9XHJcbiAgICBlbHNlIGlmIChsb2NhdGlvbiA+IHRoaXMub3B0aW9ucy5lbmQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kOyB9XHJcblxyXG4gICAgdmFyIGlzRGJsID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkO1xyXG5cclxuICAgIGlmIChpc0RibCkgeyAvL3RoaXMgYmxvY2sgaXMgdG8gcHJldmVudCAyIGhhbmRsZXMgZnJvbSBjcm9zc2luZyBlYWNob3RoZXIuIENvdWxkL3Nob3VsZCBiZSBpbXByb3ZlZC5cclxuICAgICAgaWYgKHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDApIHtcclxuICAgICAgICB2YXIgaDJWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZTIuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcclxuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uID49IGgyVmFsID8gaDJWYWwgLSB0aGlzLm9wdGlvbnMuc3RlcCA6IGxvY2F0aW9uO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBoMVZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XHJcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA8PSBoMVZhbCA/IGgxVmFsICsgdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vdGhpcyBpcyBmb3Igc2luZ2xlLWhhbmRsZWQgdmVydGljYWwgc2xpZGVycywgaXQgYWRqdXN0cyB0aGUgdmFsdWUgdG8gYWNjb3VudCBmb3IgdGhlIHNsaWRlciBiZWluZyBcInVwc2lkZS1kb3duXCJcclxuICAgIC8vZm9yIGNsaWNrIGFuZCBkcmFnIGV2ZW50cywgaXQncyB3ZWlyZCBkdWUgdG8gdGhlIHNjYWxlKC0xLCAxKSBjc3MgcHJvcGVydHlcclxuICAgIGlmICh0aGlzLm9wdGlvbnMudmVydGljYWwgJiYgIW5vSW52ZXJ0KSB7XHJcbiAgICAgIGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLmVuZCAtIGxvY2F0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgdmVydCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcclxuICAgICAgICBoT3JXID0gdmVydCA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcclxuICAgICAgICBsT3JUID0gdmVydCA/ICd0b3AnIDogJ2xlZnQnLFxyXG4gICAgICAgIGhhbmRsZURpbSA9ICRobmRsWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxyXG4gICAgICAgIGVsZW1EaW0gPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxyXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgbWluL21heCB2YWx1ZSBiYXNlZCBvbiBjbGljayBvciBkcmFnIHBvaW50XHJcbiAgICAgICAgcGN0T2ZCYXIgPSBwZXJjZW50KGxvY2F0aW9uIC0gdGhpcy5vcHRpb25zLnN0YXJ0LCB0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KS50b0ZpeGVkKDIpLFxyXG4gICAgICAgIC8vbnVtYmVyIG9mIGFjdHVhbCBwaXhlbHMgdG8gc2hpZnQgdGhlIGhhbmRsZSwgYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2J0YWluZWQgYWJvdmVcclxuICAgICAgICBweFRvTW92ZSA9IChlbGVtRGltIC0gaGFuZGxlRGltKSAqIHBjdE9mQmFyLFxyXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgdG8gc2hpZnQgdGhlIGhhbmRsZVxyXG4gICAgICAgIG1vdmVtZW50ID0gKHBlcmNlbnQocHhUb01vdmUsIGVsZW1EaW0pICogMTAwKS50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKTtcclxuICAgICAgICAvL2ZpeGluZyB0aGUgZGVjaW1hbCB2YWx1ZSBmb3IgdGhlIGxvY2F0aW9uIG51bWJlciwgaXMgcGFzc2VkIHRvIG90aGVyIG1ldGhvZHMgYXMgYSBmaXhlZCBmbG9hdGluZy1wb2ludCB2YWx1ZVxyXG4gICAgICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbi50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKSk7XHJcbiAgICAgICAgLy8gZGVjbGFyZSBlbXB0eSBvYmplY3QgZm9yIGNzcyBhZGp1c3RtZW50cywgb25seSB1c2VkIHdpdGggMiBoYW5kbGVkLXNsaWRlcnNcclxuICAgIHZhciBjc3MgPSB7fTtcclxuXHJcbiAgICB0aGlzLl9zZXRWYWx1ZXMoJGhuZGwsIGxvY2F0aW9uKTtcclxuXHJcbiAgICAvLyBUT0RPIHVwZGF0ZSB0byBjYWxjdWxhdGUgYmFzZWQgb24gdmFsdWVzIHNldCB0byByZXNwZWN0aXZlIGlucHV0cz8/XHJcbiAgICBpZiAoaXNEYmwpIHtcclxuICAgICAgdmFyIGlzTGVmdEhuZGwgPSB0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwLFxyXG4gICAgICAgICAgLy9lbXB0eSB2YXJpYWJsZSwgd2lsbCBiZSB1c2VkIGZvciBtaW4taGVpZ2h0L3dpZHRoIGZvciBmaWxsIGJhclxyXG4gICAgICAgICAgZGltLFxyXG4gICAgICAgICAgLy9wZXJjZW50YWdlIHcvaCBvZiB0aGUgaGFuZGxlIGNvbXBhcmVkIHRvIHRoZSBzbGlkZXIgYmFyXHJcbiAgICAgICAgICBoYW5kbGVQY3QgPSAgfn4ocGVyY2VudChoYW5kbGVEaW0sIGVsZW1EaW0pICogMTAwKTtcclxuICAgICAgLy9pZiBsZWZ0IGhhbmRsZSwgdGhlIG1hdGggaXMgc2xpZ2h0bHkgZGlmZmVyZW50IHRoYW4gaWYgaXQncyB0aGUgcmlnaHQgaGFuZGxlLCBhbmQgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG5lZWRzIHRvIGJlIGNoYW5nZWQgZm9yIHRoZSBmaWxsIGJhclxyXG4gICAgICBpZiAoaXNMZWZ0SG5kbCkge1xyXG4gICAgICAgIC8vbGVmdCBvciB0b3AgcGVyY2VudGFnZSB2YWx1ZSB0byBhcHBseSB0byB0aGUgZmlsbCBiYXIuXHJcbiAgICAgICAgY3NzW2xPclRdID0gYCR7bW92ZW1lbnR9JWA7XHJcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuXHJcbiAgICAgICAgZGltID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyWzBdLnN0eWxlW2xPclRdKSAtIG1vdmVtZW50ICsgaGFuZGxlUGN0O1xyXG4gICAgICAgIC8vdGhpcyBjYWxsYmFjayBpcyBuZWNlc3NhcnkgdG8gcHJldmVudCBlcnJvcnMgYW5kIGFsbG93IHRoZSBwcm9wZXIgcGxhY2VtZW50IGFuZCBpbml0aWFsaXphdGlvbiBvZiBhIDItaGFuZGxlZCBzbGlkZXJcclxuICAgICAgICAvL3BsdXMsIGl0IG1lYW5zIHdlIGRvbid0IGNhcmUgaWYgJ2RpbScgaXNOYU4gb24gaW5pdCwgaXQgd29uJ3QgYmUgaW4gdGhlIGZ1dHVyZS5cclxuICAgICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH0vL3RoaXMgaXMgb25seSBuZWVkZWQgZm9yIHRoZSBpbml0aWFsaXphdGlvbiBvZiAyIGhhbmRsZWQgc2xpZGVyc1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vanVzdCBjYWNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbGVmdC9ib3R0b20gaGFuZGxlJ3MgbGVmdC90b3AgcHJvcGVydHlcclxuICAgICAgICB2YXIgaGFuZGxlUG9zID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGVbMF0uc3R5bGVbbE9yVF0pO1xyXG4gICAgICAgIC8vY2FsY3VsYXRlIHRoZSBuZXcgbWluLWhlaWdodC93aWR0aCBmb3IgdGhlIGZpbGwgYmFyLiBVc2UgaXNOYU4gdG8gcHJldmVudCBmYWxzZSBwb3NpdGl2ZXMgZm9yIG51bWJlcnMgPD0gMFxyXG4gICAgICAgIC8vYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2YgbW92ZW1lbnQgb2YgdGhlIGhhbmRsZSBiZWluZyBtYW5pcHVsYXRlZCwgbGVzcyB0aGUgb3Bwb3NpbmcgaGFuZGxlJ3MgbGVmdC90b3AgcG9zaXRpb24sIHBsdXMgdGhlIHBlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgaXRzZWxmXHJcbiAgICAgICAgZGltID0gbW92ZW1lbnQgLSAoaXNOYU4oaGFuZGxlUG9zKSA/IHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQvKCh0aGlzLm9wdGlvbnMuZW5kLXRoaXMub3B0aW9ucy5zdGFydCkvMTAwKSA6IGhhbmRsZVBvcykgKyBoYW5kbGVQY3Q7XHJcbiAgICAgIH1cclxuICAgICAgLy8gYXNzaWduIHRoZSBtaW4taGVpZ2h0L3dpZHRoIHRvIG91ciBjc3Mgb2JqZWN0XHJcbiAgICAgIGNzc1tgbWluLSR7aE9yV31gXSA9IGAke2RpbX0lYDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRlbGVtZW50Lm9uZSgnZmluaXNoZWQuemYuYW5pbWF0ZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhhbmRsZSBpcyBkb25lIG1vdmluZy5cclxuICAgICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU2xpZGVyI21vdmVkXHJcbiAgICAgICAgICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignbW92ZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAvL2JlY2F1c2Ugd2UgZG9uJ3Qga25vdyBleGFjdGx5IGhvdyB0aGUgaGFuZGxlIHdpbGwgYmUgbW92ZWQsIGNoZWNrIHRoZSBhbW91bnQgb2YgdGltZSBpdCBzaG91bGQgdGFrZSB0byBtb3ZlLlxyXG4gICAgdmFyIG1vdmVUaW1lID0gdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpID8gMTAwMC82MCA6IHRoaXMub3B0aW9ucy5tb3ZlVGltZTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLk1vdmUobW92ZVRpbWUsICRobmRsLCBmdW5jdGlvbigpIHtcclxuICAgICAgLy9hZGp1c3RpbmcgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG9mIHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIGNhbGN1bGF0ZWQgYWJvdmVcclxuICAgICAgJGhuZGwuY3NzKGxPclQsIGAke21vdmVtZW50fSVgKTtcclxuXHJcbiAgICAgIGlmICghX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xyXG4gICAgICAgIC8vaWYgc2luZ2xlLWhhbmRsZWQsIGEgc2ltcGxlIG1ldGhvZCB0byBleHBhbmQgdGhlIGZpbGwgYmFyXHJcbiAgICAgICAgX3RoaXMuJGZpbGwuY3NzKGhPclcsIGAke3BjdE9mQmFyICogMTAwfSVgKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvL290aGVyd2lzZSwgdXNlIHRoZSBjc3Mgb2JqZWN0IHdlIGNyZWF0ZWQgYWJvdmVcclxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoY3NzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSB2YWx1ZSBoYXMgbm90IGJlZW4gY2hhbmdlIGZvciBhIGdpdmVuIHRpbWUuXHJcbiAgICAgKiBAZXZlbnQgU2xpZGVyI2NoYW5nZWRcclxuICAgICAqL1xyXG4gICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xyXG4gICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcclxuICAgIH0sIF90aGlzLm9wdGlvbnMuY2hhbmdlZERlbGF5KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgdGhlIGluaXRpYWwgYXR0cmlidXRlIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlIGN1cnJlbnQgaGFuZGxlL2lucHV0IHRvIHVzZS5cclxuICAgKi9cclxuICBfc2V0SW5pdEF0dHIoaWR4KSB7XHJcbiAgICB2YXIgaWQgPSB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoJ2lkJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc2xpZGVyJyk7XHJcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoe1xyXG4gICAgICAnaWQnOiBpZCxcclxuICAgICAgJ21heCc6IHRoaXMub3B0aW9ucy5lbmQsXHJcbiAgICAgICdtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXHJcbiAgICAgICdzdGVwJzogdGhpcy5vcHRpb25zLnN0ZXBcclxuICAgIH0pO1xyXG4gICAgdGhpcy5oYW5kbGVzLmVxKGlkeCkuYXR0cih7XHJcbiAgICAgICdyb2xlJzogJ3NsaWRlcicsXHJcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXHJcbiAgICAgICdhcmlhLXZhbHVlbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcclxuICAgICAgJ2FyaWEtdmFsdWVtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXHJcbiAgICAgICdhcmlhLXZhbHVlbm93JzogaWR4ID09PSAwID8gdGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCA6IHRoaXMub3B0aW9ucy5pbml0aWFsRW5kLFxyXG4gICAgICAnYXJpYS1vcmllbnRhdGlvbic6IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCcsXHJcbiAgICAgICd0YWJpbmRleCc6IDBcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgaW5wdXQgYW5kIGBhcmlhLXZhbHVlbm93YCB2YWx1ZXMgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBoYW5kbGUuXHJcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbCAtIGZsb2F0aW5nIHBvaW50IG9mIHRoZSBuZXcgdmFsdWUuXHJcbiAgICovXHJcbiAgX3NldFZhbHVlcygkaGFuZGxlLCB2YWwpIHtcclxuICAgIHZhciBpZHggPSB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPyB0aGlzLmhhbmRsZXMuaW5kZXgoJGhhbmRsZSkgOiAwO1xyXG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwodmFsKTtcclxuICAgICRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycsIHZhbCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGVzIGV2ZW50cyBvbiB0aGUgc2xpZGVyIGVsZW1lbnQuXHJcbiAgICogQ2FsY3VsYXRlcyB0aGUgbmV3IGxvY2F0aW9uIG9mIHRoZSBjdXJyZW50IGhhbmRsZS5cclxuICAgKiBJZiB0aGVyZSBhcmUgdHdvIGhhbmRsZXMgYW5kIHRoZSBiYXIgd2FzIGNsaWNrZWQsIGl0IGRldGVybWluZXMgd2hpY2ggaGFuZGxlIHRvIG1vdmUuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKiBAcGFyYW0ge09iamVjdH0gZSAtIHRoZSBgZXZlbnRgIG9iamVjdCBwYXNzZWQgZnJvbSB0aGUgbGlzdGVuZXIuXHJcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgY3VycmVudCBoYW5kbGUgdG8gY2FsY3VsYXRlIGZvciwgaWYgc2VsZWN0ZWQuXHJcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbCAtIGZsb2F0aW5nIHBvaW50IG51bWJlciBmb3IgdGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxyXG4gICAqIFRPRE8gY2xlYW4gdGhpcyB1cCwgdGhlcmUncyBhIGxvdCBvZiByZXBlYXRlZCBjb2RlIGJldHdlZW4gdGhpcyBhbmQgdGhlIF9zZXRIYW5kbGVQb3MgZm4uXHJcbiAgICovXHJcbiAgX2hhbmRsZUV2ZW50KGUsICRoYW5kbGUsIHZhbCkge1xyXG4gICAgdmFyIHZhbHVlLCBoYXNWYWw7XHJcbiAgICBpZiAoIXZhbCkgey8vY2xpY2sgb3IgZHJhZyBldmVudHNcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgdmVydGljYWwgPSB0aGlzLm9wdGlvbnMudmVydGljYWwsXHJcbiAgICAgICAgICBwYXJhbSA9IHZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxyXG4gICAgICAgICAgZGlyZWN0aW9uID0gdmVydGljYWwgPyAndG9wJyA6ICdsZWZ0JyxcclxuICAgICAgICAgIGV2ZW50T2Zmc2V0ID0gdmVydGljYWwgPyBlLnBhZ2VZIDogZS5wYWdlWCxcclxuICAgICAgICAgIGhhbGZPZkhhbmRsZSA9IHRoaXMuJGhhbmRsZVswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0gLyAyLFxyXG4gICAgICAgICAgYmFyRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0sXHJcbiAgICAgICAgICB3aW5kb3dTY3JvbGwgPSB2ZXJ0aWNhbCA/ICQod2luZG93KS5zY3JvbGxUb3AoKSA6ICQod2luZG93KS5zY3JvbGxMZWZ0KCk7XHJcblxyXG5cclxuICAgICAgdmFyIGVsZW1PZmZzZXQgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpW2RpcmVjdGlvbl07XHJcblxyXG4gICAgICAvLyB0b3VjaCBldmVudHMgZW11bGF0ZWQgYnkgdGhlIHRvdWNoIHV0aWwgZ2l2ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBzY3JlZW4sIGFkZCB3aW5kb3cuc2Nyb2xsIHRvIGV2ZW50IGNvb3JkaW5hdGVzLi4uXHJcbiAgICAgIC8vIGJlc3Qgd2F5IHRvIGd1ZXNzIHRoaXMgaXMgc2ltdWxhdGVkIGlzIGlmIGNsaWVudFkgPT0gcGFnZVlcclxuICAgICAgaWYgKGUuY2xpZW50WSA9PT0gZS5wYWdlWSkgeyBldmVudE9mZnNldCA9IGV2ZW50T2Zmc2V0ICsgd2luZG93U2Nyb2xsOyB9XHJcbiAgICAgIHZhciBldmVudEZyb21CYXIgPSBldmVudE9mZnNldCAtIGVsZW1PZmZzZXQ7XHJcbiAgICAgIHZhciBiYXJYWTtcclxuICAgICAgaWYgKGV2ZW50RnJvbUJhciA8IDApIHtcclxuICAgICAgICBiYXJYWSA9IDA7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGcm9tQmFyID4gYmFyRGltKSB7XHJcbiAgICAgICAgYmFyWFkgPSBiYXJEaW07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYmFyWFkgPSBldmVudEZyb21CYXI7XHJcbiAgICAgIH1cclxuICAgICAgb2Zmc2V0UGN0ID0gcGVyY2VudChiYXJYWSwgYmFyRGltKTtcclxuXHJcbiAgICAgIHZhbHVlID0gKHRoaXMub3B0aW9ucy5lbmQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpICogb2Zmc2V0UGN0ICsgdGhpcy5vcHRpb25zLnN0YXJ0O1xyXG5cclxuICAgICAgLy8gdHVybiBldmVyeXRoaW5nIGFyb3VuZCBmb3IgUlRMLCB5YXkgbWF0aCFcclxuICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkgJiYgIXRoaXMub3B0aW9ucy52ZXJ0aWNhbCkge3ZhbHVlID0gdGhpcy5vcHRpb25zLmVuZCAtIHZhbHVlO31cclxuXHJcbiAgICAgIHZhbHVlID0gX3RoaXMuX2FkanVzdFZhbHVlKG51bGwsIHZhbHVlKTtcclxuICAgICAgLy9ib29sZWFuIGZsYWcgZm9yIHRoZSBzZXRIYW5kbGVQb3MgZm4sIHNwZWNpZmljYWxseSBmb3IgdmVydGljYWwgc2xpZGVyc1xyXG4gICAgICBoYXNWYWwgPSBmYWxzZTtcclxuXHJcbiAgICAgIGlmICghJGhhbmRsZSkgey8vZmlndXJlIG91dCB3aGljaCBoYW5kbGUgaXQgaXMsIHBhc3MgaXQgdG8gdGhlIG5leHQgZnVuY3Rpb24uXHJcbiAgICAgICAgdmFyIGZpcnN0SG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZSwgZGlyZWN0aW9uLCBiYXJYWSwgcGFyYW0pLFxyXG4gICAgICAgICAgICBzZWNuZEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUyLCBkaXJlY3Rpb24sIGJhclhZLCBwYXJhbSk7XHJcbiAgICAgICAgICAgICRoYW5kbGUgPSBmaXJzdEhuZGxQb3MgPD0gc2VjbmRIbmRsUG9zID8gdGhpcy4kaGFuZGxlIDogdGhpcy4kaGFuZGxlMjtcclxuICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSB7Ly9jaGFuZ2UgZXZlbnQgb24gaW5wdXRcclxuICAgICAgdmFsdWUgPSB0aGlzLl9hZGp1c3RWYWx1ZShudWxsLCB2YWwpO1xyXG4gICAgICBoYXNWYWwgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX3NldEhhbmRsZVBvcygkaGFuZGxlLCB2YWx1ZSwgaGFzVmFsKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkanVzdGVzIHZhbHVlIGZvciBoYW5kbGUgaW4gcmVnYXJkIHRvIHN0ZXAgdmFsdWUuIHJldHVybnMgYWRqdXN0ZWQgdmFsdWVcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIHNlbGVjdGVkIGhhbmRsZS5cclxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSB2YWx1ZSB0byBhZGp1c3QuIHVzZWQgaWYgJGhhbmRsZSBpcyBmYWxzeVxyXG4gICAqL1xyXG4gIF9hZGp1c3RWYWx1ZSgkaGFuZGxlLCB2YWx1ZSkge1xyXG4gICAgdmFyIHZhbCxcclxuICAgICAgc3RlcCA9IHRoaXMub3B0aW9ucy5zdGVwLFxyXG4gICAgICBkaXYgPSBwYXJzZUZsb2F0KHN0ZXAvMiksXHJcbiAgICAgIGxlZnQsIHByZXZfdmFsLCBuZXh0X3ZhbDtcclxuICAgIGlmICghISRoYW5kbGUpIHtcclxuICAgICAgdmFsID0gcGFyc2VGbG9hdCgkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdmFsID0gdmFsdWU7XHJcbiAgICB9XHJcbiAgICBsZWZ0ID0gdmFsICUgc3RlcDtcclxuICAgIHByZXZfdmFsID0gdmFsIC0gbGVmdDtcclxuICAgIG5leHRfdmFsID0gcHJldl92YWwgKyBzdGVwO1xyXG4gICAgaWYgKGxlZnQgPT09IDApIHtcclxuICAgICAgcmV0dXJuIHZhbDtcclxuICAgIH1cclxuICAgIHZhbCA9IHZhbCA+PSBwcmV2X3ZhbCArIGRpdiA/IG5leHRfdmFsIDogcHJldl92YWw7XHJcbiAgICByZXR1cm4gdmFsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIHNsaWRlciBlbGVtZW50cy5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGFwcGx5IGxpc3RlbmVycyB0by5cclxuICAgKi9cclxuICBfZXZlbnRzKCRoYW5kbGUpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgY3VySGFuZGxlLFxyXG4gICAgICAgIHRpbWVyO1xyXG5cclxuICAgICAgdGhpcy5pbnB1dHMub2ZmKCdjaGFuZ2UuemYuc2xpZGVyJykub24oJ2NoYW5nZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgdmFyIGlkeCA9IF90aGlzLmlucHV0cy5pbmRleCgkKHRoaXMpKTtcclxuICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgX3RoaXMuaGFuZGxlcy5lcShpZHgpLCAkKHRoaXMpLnZhbCgpKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrU2VsZWN0KSB7XHJcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ2NsaWNrLnpmLnNsaWRlcicpLm9uKCdjbGljay56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSkgeyByZXR1cm4gZmFsc2U7IH1cclxuXHJcbiAgICAgICAgICBpZiAoISQoZS50YXJnZXQpLmlzKCdbZGF0YS1zbGlkZXItaGFuZGxlXScpKSB7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XHJcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy4kaGFuZGxlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUpIHtcclxuICAgICAgdGhpcy5oYW5kbGVzLmFkZFRvdWNoKCk7XHJcblxyXG4gICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XHJcbiAgICAgICRoYW5kbGVcclxuICAgICAgICAub2ZmKCdtb3VzZWRvd24uemYuc2xpZGVyJylcclxuICAgICAgICAub24oJ21vdXNlZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAkaGFuZGxlLmFkZENsYXNzKCdpcy1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgX3RoaXMuJGZpbGwuYWRkQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7Ly9cclxuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgY3VySGFuZGxlID0gJChlLmN1cnJlbnRUYXJnZXQpO1xyXG5cclxuICAgICAgICAgICRib2R5Lm9uKCdtb3VzZW1vdmUuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xyXG5cclxuICAgICAgICAgIH0pLm9uKCdtb3VzZXVwLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XHJcblxyXG4gICAgICAgICAgICAkaGFuZGxlLnJlbW92ZUNsYXNzKCdpcy1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICBfdGhpcy4kZmlsbC5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnLCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICAkYm9keS5vZmYoJ21vdXNlbW92ZS56Zi5zbGlkZXIgbW91c2V1cC56Zi5zbGlkZXInKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gICAgICAvLyBwcmV2ZW50IGV2ZW50cyB0cmlnZ2VyZWQgYnkgdG91Y2hcclxuICAgICAgLm9uKCdzZWxlY3RzdGFydC56Zi5zbGlkZXIgdG91Y2htb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgICRoYW5kbGUub2ZmKCdrZXlkb3duLnpmLnNsaWRlcicpLm9uKCdrZXlkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgdmFyIF8kaGFuZGxlID0gJCh0aGlzKSxcclxuICAgICAgICAgIGlkeCA9IF90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPyBfdGhpcy5oYW5kbGVzLmluZGV4KF8kaGFuZGxlKSA6IDAsXHJcbiAgICAgICAgICBvbGRWYWx1ZSA9IHBhcnNlRmxvYXQoX3RoaXMuaW5wdXRzLmVxKGlkeCkudmFsKCkpLFxyXG4gICAgICAgICAgbmV3VmFsdWU7XHJcblxyXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXHJcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdTbGlkZXInLCB7XHJcbiAgICAgICAgZGVjcmVhc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluY3JlYXNlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXA7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWNyZWFzZV9mYXN0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIG9ubHkgc2V0IGhhbmRsZSBwb3Mgd2hlbiBldmVudCB3YXMgaGFuZGxlZCBzcGVjaWFsbHlcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlLCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICAvKmlmIChuZXdWYWx1ZSkgeyAvLyBpZiBwcmVzc2VkIGtleSBoYXMgc3BlY2lhbCBmdW5jdGlvbiwgdXBkYXRlIHZhbHVlXHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlKTtcclxuICAgICAgfSovXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIHRoZSBzbGlkZXIgcGx1Z2luLlxyXG4gICAqL1xyXG4gIGRlc3Ryb3koKSB7XHJcbiAgICB0aGlzLmhhbmRsZXMub2ZmKCcuemYuc2xpZGVyJyk7XHJcbiAgICB0aGlzLmlucHV0cy5vZmYoJy56Zi5zbGlkZXInKTtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYuc2xpZGVyJyk7XHJcblxyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuU2xpZGVyLmRlZmF1bHRzID0ge1xyXG4gIC8qKlxyXG4gICAqIE1pbmltdW0gdmFsdWUgZm9yIHRoZSBzbGlkZXIgc2NhbGUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDBcclxuICAgKi9cclxuICBzdGFydDogMCxcclxuICAvKipcclxuICAgKiBNYXhpbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAxMDBcclxuICAgKi9cclxuICBlbmQ6IDEwMCxcclxuICAvKipcclxuICAgKiBNaW5pbXVtIHZhbHVlIGNoYW5nZSBwZXIgY2hhbmdlIGV2ZW50LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAxXHJcbiAgICovXHJcbiAgc3RlcDogMSxcclxuICAvKipcclxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgaGFuZGxlL2lucHV0ICoobGVmdCBoYW5kbGUvZmlyc3QgaW5wdXQpKiBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAwXHJcbiAgICovXHJcbiAgaW5pdGlhbFN0YXJ0OiAwLFxyXG4gIC8qKlxyXG4gICAqIFZhbHVlIGF0IHdoaWNoIHRoZSByaWdodCBoYW5kbGUvc2Vjb25kIGlucHV0IHNob3VsZCBiZSBzZXQgdG8gb24gaW5pdGlhbGl6YXRpb24uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDEwMFxyXG4gICAqL1xyXG4gIGluaXRpYWxFbmQ6IDEwMCxcclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIGlucHV0IHRvIGJlIGxvY2F0ZWQgb3V0c2lkZSB0aGUgY29udGFpbmVyIGFuZCB2aXNpYmxlLiBTZXQgdG8gYnkgdGhlIEpTXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgYmluZGluZzogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIHRoZSB1c2VyIHRvIGNsaWNrL3RhcCBvbiB0aGUgc2xpZGVyIGJhciB0byBzZWxlY3QgYSB2YWx1ZS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgdHJ1ZVxyXG4gICAqL1xyXG4gIGNsaWNrU2VsZWN0OiB0cnVlLFxyXG4gIC8qKlxyXG4gICAqIFNldCB0byB0cnVlIGFuZCB1c2UgdGhlIGB2ZXJ0aWNhbGAgY2xhc3MgdG8gY2hhbmdlIGFsaWdubWVudCB0byB2ZXJ0aWNhbC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgZmFsc2VcclxuICAgKi9cclxuICB2ZXJ0aWNhbDogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogQWxsb3dzIHRoZSB1c2VyIHRvIGRyYWcgdGhlIHNsaWRlciBoYW5kbGUocykgdG8gc2VsZWN0IGEgdmFsdWUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIHRydWVcclxuICAgKi9cclxuICBkcmFnZ2FibGU6IHRydWUsXHJcbiAgLyoqXHJcbiAgICogRGlzYWJsZXMgdGhlIHNsaWRlciBhbmQgcHJldmVudHMgZXZlbnQgbGlzdGVuZXJzIGZyb20gYmVpbmcgYXBwbGllZC4gRG91YmxlIGNoZWNrZWQgYnkgSlMgd2l0aCBgZGlzYWJsZWRDbGFzc2AuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgZGlzYWJsZWQ6IGZhbHNlLFxyXG4gIC8qKlxyXG4gICAqIEFsbG93cyB0aGUgdXNlIG9mIHR3byBoYW5kbGVzLiBEb3VibGUgY2hlY2tlZCBieSB0aGUgSlMuIENoYW5nZXMgc29tZSBsb2dpYyBoYW5kbGluZy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgZmFsc2VcclxuICAgKi9cclxuICBkb3VibGVTaWRlZDogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogUG90ZW50aWFsIGZ1dHVyZSBmZWF0dXJlLlxyXG4gICAqL1xyXG4gIC8vIHN0ZXBzOiAxMDAsXHJcbiAgLyoqXHJcbiAgICogTnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzIHRoZSBwbHVnaW4gc2hvdWxkIGdvIHRvIGZvciBmbG9hdGluZyBwb2ludCBwcmVjaXNpb24uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDJcclxuICAgKi9cclxuICBkZWNpbWFsOiAyLFxyXG4gIC8qKlxyXG4gICAqIFRpbWUgZGVsYXkgZm9yIGRyYWdnZWQgZWxlbWVudHMuXHJcbiAgICovXHJcbiAgLy8gZHJhZ0RlbGF5OiAwLFxyXG4gIC8qKlxyXG4gICAqIFRpbWUsIGluIG1zLCB0byBhbmltYXRlIHRoZSBtb3ZlbWVudCBvZiBhIHNsaWRlciBoYW5kbGUgaWYgdXNlciBjbGlja3MvdGFwcyBvbiB0aGUgYmFyLiBOZWVkcyB0byBiZSBtYW51YWxseSBzZXQgaWYgdXBkYXRpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgU2FzcyBzZXR0aW5ncy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMjAwXHJcbiAgICovXHJcbiAgbW92ZVRpbWU6IDIwMCwvL3VwZGF0ZSB0aGlzIGlmIGNoYW5naW5nIHRoZSB0cmFuc2l0aW9uIHRpbWUgaW4gdGhlIHNhc3NcclxuICAvKipcclxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGRpc2FibGVkIHNsaWRlcnMuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdkaXNhYmxlZCdcclxuICAgKi9cclxuICBkaXNhYmxlZENsYXNzOiAnZGlzYWJsZWQnLFxyXG4gIC8qKlxyXG4gICAqIFdpbGwgaW52ZXJ0IHRoZSBkZWZhdWx0IGxheW91dCBmb3IgYSB2ZXJ0aWNhbDxzcGFuIGRhdGEtdG9vbHRpcCB0aXRsZT1cIndobyB3b3VsZCBkbyB0aGlzPz8/XCI+IDwvc3Bhbj5zbGlkZXIuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgaW52ZXJ0VmVydGljYWw6IGZhbHNlLFxyXG4gIC8qKlxyXG4gICAqIE1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGBjaGFuZ2VkLnpmLXNsaWRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIGFmdGVyIHZhbHVlIGNoYW5nZS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgNTAwXHJcbiAgICovXHJcbiAgY2hhbmdlZERlbGF5OiA1MDBcclxufTtcclxuXHJcbmZ1bmN0aW9uIHBlcmNlbnQoZnJhYywgbnVtKSB7XHJcbiAgcmV0dXJuIChmcmFjIC8gbnVtKTtcclxufVxyXG5mdW5jdGlvbiBhYnNQb3NpdGlvbigkaGFuZGxlLCBkaXIsIGNsaWNrUG9zLCBwYXJhbSkge1xyXG4gIHJldHVybiBNYXRoLmFicygoJGhhbmRsZS5wb3NpdGlvbigpW2Rpcl0gKyAoJGhhbmRsZVtwYXJhbV0oKSAvIDIpKSAtIGNsaWNrUG9zKTtcclxufVxyXG5cclxuLy8gV2luZG93IGV4cG9ydHNcclxuRm91bmRhdGlvbi5wbHVnaW4oU2xpZGVyLCAnU2xpZGVyJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcblxyXG4vLyoqKioqKioqKnRoaXMgaXMgaW4gY2FzZSB3ZSBnbyB0byBzdGF0aWMsIGFic29sdXRlIHBvc2l0aW9ucyBpbnN0ZWFkIG9mIGR5bmFtaWMgcG9zaXRpb25pbmcqKioqKioqKlxyXG4vLyB0aGlzLnNldFN0ZXBzKGZ1bmN0aW9uKCkge1xyXG4vLyAgIF90aGlzLl9ldmVudHMoKTtcclxuLy8gICB2YXIgaW5pdFN0YXJ0ID0gX3RoaXMub3B0aW9ucy5wb3NpdGlvbnNbX3RoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQgLSAxXSB8fCBudWxsO1xyXG4vLyAgIHZhciBpbml0RW5kID0gX3RoaXMub3B0aW9ucy5pbml0aWFsRW5kID8gX3RoaXMub3B0aW9ucy5wb3NpdGlvbltfdGhpcy5vcHRpb25zLmluaXRpYWxFbmQgLSAxXSA6IG51bGw7XHJcbi8vICAgaWYgKGluaXRTdGFydCB8fCBpbml0RW5kKSB7XHJcbi8vICAgICBfdGhpcy5faGFuZGxlRXZlbnQoaW5pdFN0YXJ0LCBpbml0RW5kKTtcclxuLy8gICB9XHJcbi8vIH0pO1xyXG5cclxuLy8qKioqKioqKioqKnRoZSBvdGhlciBwYXJ0IG9mIGFic29sdXRlIHBvc2l0aW9ucyoqKioqKioqKioqKipcclxuLy8gU2xpZGVyLnByb3RvdHlwZS5zZXRTdGVwcyA9IGZ1bmN0aW9uKGNiKSB7XHJcbi8vICAgdmFyIHBvc0NoYW5nZSA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpIC8gdGhpcy5vcHRpb25zLnN0ZXBzO1xyXG4vLyAgIHZhciBjb3VudGVyID0gMFxyXG4vLyAgIHdoaWxlKGNvdW50ZXIgPCB0aGlzLm9wdGlvbnMuc3RlcHMpIHtcclxuLy8gICAgIGlmIChjb3VudGVyKSB7XHJcbi8vICAgICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbnMucHVzaCh0aGlzLm9wdGlvbnMucG9zaXRpb25zW2NvdW50ZXIgLSAxXSArIHBvc0NoYW5nZSk7XHJcbi8vICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25zLnB1c2gocG9zQ2hhbmdlKTtcclxuLy8gICAgIH1cclxuLy8gICAgIGNvdW50ZXIrKztcclxuLy8gICB9XHJcbi8vICAgY2IoKTtcclxuLy8gfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuIWZ1bmN0aW9uKCQpIHtcclxuXHJcbi8qKlxyXG4gKiBTdGlja3kgbW9kdWxlLlxyXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc3RpY2t5XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XHJcbiAqL1xyXG5cclxuY2xhc3MgU3RpY2t5IHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgc3RpY2t5IHRoaW5nLlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIHN0aWNreS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbnMgb2JqZWN0IHBhc3NlZCB3aGVuIGNyZWF0aW5nIHRoZSBlbGVtZW50IHByb2dyYW1tYXRpY2FsbHkuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU3RpY2t5LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG5cclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1N0aWNreScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHN0aWNreSBlbGVtZW50IGJ5IGFkZGluZyBjbGFzc2VzLCBnZXR0aW5nL3NldHRpbmcgZGltZW5zaW9ucywgYnJlYWtwb2ludHMgYW5kIGF0dHJpYnV0ZXNcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9pbml0KCkge1xyXG4gICAgdmFyICRwYXJlbnQgPSB0aGlzLiRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3RpY2t5LWNvbnRhaW5lcl0nKSxcclxuICAgICAgICBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc3RpY2t5JyksXHJcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIGlmICghJHBhcmVudC5sZW5ndGgpIHtcclxuICAgICAgdGhpcy53YXNXcmFwcGVkID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHRoaXMuJGNvbnRhaW5lciA9ICRwYXJlbnQubGVuZ3RoID8gJHBhcmVudCA6ICQodGhpcy5vcHRpb25zLmNvbnRhaW5lcikud3JhcElubmVyKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgdGhpcy4kY29udGFpbmVyLmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcyk7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3MpXHJcbiAgICAgICAgICAgICAgICAgLmF0dHIoeydkYXRhLXJlc2l6ZSc6IGlkfSk7XHJcblxyXG4gICAgdGhpcy5zY3JvbGxDb3VudCA9IHRoaXMub3B0aW9ucy5jaGVja0V2ZXJ5O1xyXG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XHJcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuYW5jaG9yICE9PSAnJyl7XHJcbiAgICAgICAgX3RoaXMuJGFuY2hvciA9ICQoJyMnICsgX3RoaXMub3B0aW9ucy5hbmNob3IpO1xyXG4gICAgICB9ZWxzZXtcclxuICAgICAgICBfdGhpcy5fcGFyc2VQb2ludHMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xyXG4gICAgICB9KTtcclxuICAgICAgX3RoaXMuX2V2ZW50cyhpZC5zcGxpdCgnLScpLnJldmVyc2UoKS5qb2luKCctJykpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfcGFyc2VQb2ludHMoKSB7XHJcbiAgICB2YXIgdG9wID0gdGhpcy5vcHRpb25zLnRvcEFuY2hvciA9PSBcIlwiID8gMSA6IHRoaXMub3B0aW9ucy50b3BBbmNob3IsXHJcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcclxuICAgICAgICBwdHMgPSBbdG9wLCBidG1dLFxyXG4gICAgICAgIGJyZWFrcyA9IHt9O1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcclxuICAgICAgdmFyIHB0O1xyXG4gICAgICBpZiAodHlwZW9mIHB0c1tpXSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICBwdCA9IHB0c1tpXTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgcGxhY2UgPSBwdHNbaV0uc3BsaXQoJzonKSxcclxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XHJcblxyXG4gICAgICAgIHB0ID0gYW5jaG9yLm9mZnNldCgpLnRvcDtcclxuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcclxuICAgICAgICAgIHB0ICs9IGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrc1tpXSA9IHB0O1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnBvaW50cyA9IGJyZWFrcztcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBzY3JvbGxpbmcgZWxlbWVudC5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXHJcbiAgICovXHJcbiAgX2V2ZW50cyhpZCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICBzY3JvbGxMaXN0ZW5lciA9IHRoaXMuc2Nyb2xsTGlzdGVuZXIgPSBgc2Nyb2xsLnpmLiR7aWR9YDtcclxuICAgIGlmICh0aGlzLmlzT24pIHsgcmV0dXJuOyB9XHJcbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xyXG4gICAgICB0aGlzLmlzT24gPSB0cnVlO1xyXG4gICAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKVxyXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Nyb2xsQ291bnQgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgIF90aGlzLnNjcm9sbENvdW50ID0gX3RoaXMub3B0aW9ucy5jaGVja0V2ZXJ5O1xyXG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XHJcbiAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJylcclxuICAgICAgICAgICAgICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlLCBlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5jYW5TdGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5pc09uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9ldmVudHMoaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3RoaXMuaXNPbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZW1vdmVzIGV2ZW50IGhhbmRsZXJzIGZvciBzY3JvbGwgYW5kIGNoYW5nZSBldmVudHMgb24gYW5jaG9yLlxyXG4gICAqIEBmaXJlcyBTdGlja3kjcGF1c2VcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2Nyb2xsTGlzdGVuZXIgLSB1bmlxdWUsIG5hbWVzcGFjZWQgc2Nyb2xsIGxpc3RlbmVyIGF0dGFjaGVkIHRvIGB3aW5kb3dgXHJcbiAgICovXHJcbiAgX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKSB7XHJcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcclxuICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGlzIHBhdXNlZCBkdWUgdG8gcmVzaXplIGV2ZW50IHNocmlua2luZyB0aGUgdmlldy5cclxuICAgICAqIEBldmVudCBTdGlja3kjcGF1c2VcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3BhdXNlLnpmLnN0aWNreScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsbGVkIG9uIGV2ZXJ5IGBzY3JvbGxgIGV2ZW50IGFuZCBvbiBgX2luaXRgXHJcbiAgICogZmlyZXMgZnVuY3Rpb25zIGJhc2VkIG9uIGJvb2xlYW5zIGFuZCBjYWNoZWQgdmFsdWVzXHJcbiAgICogQHBhcmFtIHtCb29sZWFufSBjaGVja1NpemVzIC0gdHJ1ZSBpZiBwbHVnaW4gc2hvdWxkIHJlY2FsY3VsYXRlIHNpemVzIGFuZCBicmVha3BvaW50cy5cclxuICAgKiBAcGFyYW0ge051bWJlcn0gc2Nyb2xsIC0gY3VycmVudCBzY3JvbGwgcG9zaXRpb24gcGFzc2VkIGZyb20gc2Nyb2xsIGV2ZW50IGNiIGZ1bmN0aW9uLiBJZiBub3QgcGFzc2VkLCBkZWZhdWx0cyB0byBgd2luZG93LnBhZ2VZT2Zmc2V0YC5cclxuICAgKi9cclxuICBfY2FsYyhjaGVja1NpemVzLCBzY3JvbGwpIHtcclxuICAgIGlmIChjaGVja1NpemVzKSB7IHRoaXMuX3NldFNpemVzKCk7IH1cclxuXHJcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcclxuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFzY3JvbGwpIHsgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0OyB9XHJcblxyXG4gICAgaWYgKHNjcm9sbCA+PSB0aGlzLnRvcFBvaW50KSB7XHJcbiAgICAgIGlmIChzY3JvbGwgPD0gdGhpcy5ib3R0b21Qb2ludCkge1xyXG4gICAgICAgIGlmICghdGhpcy5pc1N0dWNrKSB7XHJcbiAgICAgICAgICB0aGlzLl9zZXRTdGlja3koKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xyXG4gICAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcclxuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHN0dWNrLlxyXG4gICAqIEFkZHMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXHJcbiAgICogQGZpcmVzIFN0aWNreSNzdHVja3RvXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfc2V0U3RpY2t5KCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXHJcbiAgICAgICAgbXJnbiA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcclxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnYm90dG9tJyA6ICd0b3AnLFxyXG4gICAgICAgIGNzcyA9IHt9O1xyXG5cclxuICAgIGNzc1ttcmduXSA9IGAke3RoaXMub3B0aW9uc1ttcmduXX1lbWA7XHJcbiAgICBjc3Nbc3RpY2tUb10gPSAwO1xyXG4gICAgY3NzW25vdFN0dWNrVG9dID0gJ2F1dG8nO1xyXG4gICAgY3NzWydsZWZ0J10gPSB0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSlbXCJwYWRkaW5nLWxlZnRcIl0sIDEwKTtcclxuICAgIHRoaXMuaXNTdHVjayA9IHRydWU7XHJcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke25vdFN0dWNrVG99YClcclxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxyXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxyXG4gICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYHBvc2l0aW9uOiBmaXhlZDtgXHJcbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnN0dWNrdG86dG9wYFxyXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjc3R1Y2t0b1xyXG4gICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYuc3R1Y2t0bzoke3N0aWNrVG99YCk7XHJcbiAgICB0aGlzLiRlbGVtZW50Lm9uKFwidHJhbnNpdGlvbmVuZCB3ZWJraXRUcmFuc2l0aW9uRW5kIG9UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIE1TVHJhbnNpdGlvbkVuZFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgX3RoaXMuX3NldFNpemVzKCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHVuc3R1Y2suXHJcbiAgICogUmVtb3ZlcyBgcG9zaXRpb246IGZpeGVkO2AsIGFuZCBoZWxwZXIgY2xhc3Nlcy5cclxuICAgKiBBZGRzIG90aGVyIGhlbHBlciBjbGFzc2VzLlxyXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNUb3AgLSB0ZWxscyB0aGUgZnVuY3Rpb24gaWYgdGhlICRlbGVtZW50IHNob3VsZCBhbmNob3IgdG8gdGhlIHRvcCBvciBib3R0b20gb2YgaXRzICRhbmNob3IgZWxlbWVudC5cclxuICAgKiBAZmlyZXMgU3RpY2t5I3Vuc3R1Y2tmcm9tXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfcmVtb3ZlU3RpY2t5KGlzVG9wKSB7XHJcbiAgICB2YXIgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxyXG4gICAgICAgIHN0aWNrVG9Ub3AgPSBzdGlja1RvID09PSAndG9wJyxcclxuICAgICAgICBjc3MgPSB7fSxcclxuICAgICAgICBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy5wb2ludHNbMF0gOiB0aGlzLmFuY2hvckhlaWdodCkgLSB0aGlzLmVsZW1IZWlnaHQsXHJcbiAgICAgICAgbXJnbiA9IHN0aWNrVG9Ub3AgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxyXG4gICAgICAgIG5vdFN0dWNrVG8gPSBzdGlja1RvVG9wID8gJ2JvdHRvbScgOiAndG9wJyxcclxuICAgICAgICB0b3BPckJvdHRvbSA9IGlzVG9wID8gJ3RvcCcgOiAnYm90dG9tJztcclxuXHJcbiAgICBjc3NbbXJnbl0gPSAwO1xyXG5cclxuICAgIGNzc1snYm90dG9tJ10gPSAnYXV0byc7XHJcbiAgICBpZihpc1RvcCkge1xyXG4gICAgICBjc3NbJ3RvcCddID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNzc1sndG9wJ10gPSBhbmNob3JQdDtcclxuICAgIH1cclxuXHJcbiAgICBjc3NbJ2xlZnQnXSA9ICcnO1xyXG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XHJcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcclxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7dG9wT3JCb3R0b219YClcclxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcclxuICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGFuY2hvcmVkLlxyXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi51bnN0dWNrZnJvbTpib3R0b21gXHJcbiAgICAgICAgICAgICAgICAgICogQGV2ZW50IFN0aWNreSN1bnN0dWNrZnJvbVxyXG4gICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYudW5zdHVja2Zyb206JHt0b3BPckJvdHRvbX1gKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgdGhlICRlbGVtZW50IGFuZCAkY29udGFpbmVyIHNpemVzIGZvciBwbHVnaW4uXHJcbiAgICogQ2FsbHMgYF9zZXRCcmVha1BvaW50c2AuXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24gb2YgYF9zZXRCcmVha1BvaW50c2AuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfc2V0U2l6ZXMoY2IpIHtcclxuICAgIHRoaXMuY2FuU3RpY2sgPSBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuc3RpY2t5T24pO1xyXG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7IGNiKCk7IH1cclxuICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxyXG4gICAgICAgIGNvbXAgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLiRjb250YWluZXJbMF0pLFxyXG4gICAgICAgIHBkbmcgPSBwYXJzZUludChjb21wWydwYWRkaW5nLXJpZ2h0J10sIDEwKTtcclxuXHJcbiAgICBpZiAodGhpcy4kYW5jaG9yICYmIHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcclxuICAgICAgdGhpcy5hbmNob3JIZWlnaHQgPSB0aGlzLiRhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fcGFyc2VQb2ludHMoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICdtYXgtd2lkdGgnOiBgJHtuZXdFbGVtV2lkdGggLSBwZG5nfXB4YFxyXG4gICAgfSk7XHJcblxyXG4gICAgdmFyIG5ld0NvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0IHx8IHRoaXMuY29udGFpbmVySGVpZ2h0O1xyXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xyXG4gICAgICBuZXdDb250YWluZXJIZWlnaHQgPSAwO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XHJcbiAgICB0aGlzLiRjb250YWluZXIuY3NzKHtcclxuICAgICAgaGVpZ2h0OiBuZXdDb250YWluZXJIZWlnaHRcclxuICAgIH0pO1xyXG4gICAgdGhpcy5lbGVtSGVpZ2h0ID0gbmV3Q29udGFpbmVySGVpZ2h0O1xyXG5cclxuICBcdGlmICh0aGlzLmlzU3R1Y2spIHtcclxuICBcdFx0dGhpcy4kZWxlbWVudC5jc3Moe1wibGVmdFwiOnRoaXMuJGNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0ICsgcGFyc2VJbnQoY29tcFsncGFkZGluZy1sZWZ0J10sIDEwKX0pO1xyXG4gIFx0fVxyXG5cclxuICAgIHRoaXMuX3NldEJyZWFrUG9pbnRzKG5ld0NvbnRhaW5lckhlaWdodCwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmIChjYikgeyBjYigpOyB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgdGhlIHVwcGVyIGFuZCBsb3dlciBicmVha3BvaW50cyBmb3IgdGhlIGVsZW1lbnQgdG8gYmVjb21lIHN0aWNreS91bnN0aWNreS5cclxuICAgKiBAcGFyYW0ge051bWJlcn0gZWxlbUhlaWdodCAtIHB4IHZhbHVlIGZvciBzdGlja3kuJGVsZW1lbnQgaGVpZ2h0LCBjYWxjdWxhdGVkIGJ5IGBfc2V0U2l6ZXNgLlxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGNvbXBsZXRpb24uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfc2V0QnJlYWtQb2ludHMoZWxlbUhlaWdodCwgY2IpIHtcclxuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xyXG4gICAgICBpZiAoY2IpIHsgY2IoKTsgfVxyXG4gICAgICBlbHNlIHsgcmV0dXJuIGZhbHNlOyB9XHJcbiAgICB9XHJcbiAgICB2YXIgbVRvcCA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luVG9wKSxcclxuICAgICAgICBtQnRtID0gZW1DYWxjKHRoaXMub3B0aW9ucy5tYXJnaW5Cb3R0b20pLFxyXG4gICAgICAgIHRvcFBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1swXSA6IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgYm90dG9tUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIDogdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCxcclxuICAgICAgICAvLyB0b3BQb2ludCA9IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AgfHwgdGhpcy5wb2ludHNbMF0sXHJcbiAgICAgICAgLy8gYm90dG9tUG9pbnQgPSB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0IHx8IHRoaXMucG9pbnRzWzFdLFxyXG4gICAgICAgIHdpbkhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICd0b3AnKSB7XHJcbiAgICAgIHRvcFBvaW50IC09IG1Ub3A7XHJcbiAgICAgIGJvdHRvbVBvaW50IC09IChlbGVtSGVpZ2h0ICsgbVRvcCk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAnYm90dG9tJykge1xyXG4gICAgICB0b3BQb2ludCAtPSAod2luSGVpZ2h0IC0gKGVsZW1IZWlnaHQgKyBtQnRtKSk7XHJcbiAgICAgIGJvdHRvbVBvaW50IC09ICh3aW5IZWlnaHQgLSBtQnRtKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vdGhpcyB3b3VsZCBiZSB0aGUgc3RpY2tUbzogYm90aCBvcHRpb24uLi4gdHJpY2t5XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy50b3BQb2ludCA9IHRvcFBvaW50O1xyXG4gICAgdGhpcy5ib3R0b21Qb2ludCA9IGJvdHRvbVBvaW50O1xyXG5cclxuICAgIGlmIChjYikgeyBjYigpOyB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cclxuICAgKiBSZXNldHMgdGhlIGVsZW1lbnQgdG8gdGhlIHRvcCBwb3NpdGlvbiBmaXJzdC5cclxuICAgKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycywgSlMtYWRkZWQgY3NzIHByb3BlcnRpZXMgYW5kIGNsYXNzZXMsIGFuZCB1bndyYXBzIHRoZSAkZWxlbWVudCBpZiB0aGUgSlMgYWRkZWQgdGhlICRjb250YWluZXIuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcclxuXHJcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5zdGlja3lDbGFzc30gaXMtYW5jaG9yZWQgaXMtYXQtdG9wYClcclxuICAgICAgICAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgIGhlaWdodDogJycsXHJcbiAgICAgICAgICAgICAgICAgICB0b3A6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICdtYXgtd2lkdGgnOiAnJ1xyXG4gICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xyXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XHJcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ2NoYW5nZS56Zi5zdGlja3knKTtcclxuICAgIH1cclxuICAgICQod2luZG93KS5vZmYodGhpcy5zY3JvbGxMaXN0ZW5lcik7XHJcblxyXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcclxuICAgICAgICAgICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnJ1xyXG4gICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcblN0aWNreS5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBDdXN0b21pemFibGUgY29udGFpbmVyIHRlbXBsYXRlLiBBZGQgeW91ciBvd24gY2xhc3NlcyBmb3Igc3R5bGluZyBhbmQgc2l6aW5nLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnJmx0O2RpdiBkYXRhLXN0aWNreS1jb250YWluZXIgY2xhc3M9XCJzbWFsbC02IGNvbHVtbnNcIiZndDsmbHQ7L2RpdiZndDsnXHJcbiAgICovXHJcbiAgY29udGFpbmVyOiAnPGRpdiBkYXRhLXN0aWNreS1jb250YWluZXI+PC9kaXY+JyxcclxuICAvKipcclxuICAgKiBMb2NhdGlvbiBpbiB0aGUgdmlldyB0aGUgZWxlbWVudCBzdGlja3MgdG8uXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICd0b3AnXHJcbiAgICovXHJcbiAgc3RpY2tUbzogJ3RvcCcsXHJcbiAgLyoqXHJcbiAgICogSWYgYW5jaG9yZWQgdG8gYSBzaW5nbGUgZWxlbWVudCwgdGhlIGlkIG9mIHRoYXQgZWxlbWVudC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZCdcclxuICAgKi9cclxuICBhbmNob3I6ICcnLFxyXG4gIC8qKlxyXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIHRvcCBhbmNob3IuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6dG9wJ1xyXG4gICAqL1xyXG4gIHRvcEFuY2hvcjogJycsXHJcbiAgLyoqXHJcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgYm90dG9tIGFuY2hvci5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZDpib3R0b20nXHJcbiAgICovXHJcbiAgYnRtQW5jaG9yOiAnJyxcclxuICAvKipcclxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgdG9wIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDFcclxuICAgKi9cclxuICBtYXJnaW5Ub3A6IDEsXHJcbiAgLyoqXHJcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIGJvdHRvbSBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAxXHJcbiAgICovXHJcbiAgbWFyZ2luQm90dG9tOiAxLFxyXG4gIC8qKlxyXG4gICAqIEJyZWFrcG9pbnQgc3RyaW5nIHRoYXQgaXMgdGhlIG1pbmltdW0gc2NyZWVuIHNpemUgYW4gZWxlbWVudCBzaG91bGQgYmVjb21lIHN0aWNreS5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcclxuICAgKi9cclxuICBzdGlja3lPbjogJ21lZGl1bScsXHJcbiAgLyoqXHJcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgZWxlbWVudCwgYW5kIHJlbW92ZWQgb24gZGVzdHJ1Y3Rpb24uIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreWAuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdzdGlja3knXHJcbiAgICovXHJcbiAgc3RpY2t5Q2xhc3M6ICdzdGlja3knLFxyXG4gIC8qKlxyXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGNvbnRhaW5lci4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5LWNvbnRhaW5lcmAuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlICdzdGlja3ktY29udGFpbmVyJ1xyXG4gICAqL1xyXG4gIGNvbnRhaW5lckNsYXNzOiAnc3RpY2t5LWNvbnRhaW5lcicsXHJcbiAgLyoqXHJcbiAgICogTnVtYmVyIG9mIHNjcm9sbCBldmVudHMgYmV0d2VlbiB0aGUgcGx1Z2luJ3MgcmVjYWxjdWxhdGluZyBzdGlja3kgcG9pbnRzLiBTZXR0aW5nIGl0IHRvIGAwYCB3aWxsIGNhdXNlIGl0IHRvIHJlY2FsYyBldmVyeSBzY3JvbGwgZXZlbnQsIHNldHRpbmcgaXQgdG8gYC0xYCB3aWxsIHByZXZlbnQgcmVjYWxjIG9uIHNjcm9sbC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgNTBcclxuICAgKi9cclxuICBjaGVja0V2ZXJ5OiAtMVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjYWxjdWxhdGUgZW0gdmFsdWVzXHJcbiAqIEBwYXJhbSBOdW1iZXIge2VtfSAtIG51bWJlciBvZiBlbSdzIHRvIGNhbGN1bGF0ZSBpbnRvIHBpeGVsc1xyXG4gKi9cclxuZnVuY3Rpb24gZW1DYWxjKGVtKSB7XHJcbiAgcmV0dXJuIHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHksIG51bGwpLmZvbnRTaXplLCAxMCkgKiBlbTtcclxufVxyXG5cclxuLy8gV2luZG93IGV4cG9ydHNcclxuRm91bmRhdGlvbi5wbHVnaW4oU3RpY2t5LCAnU3RpY2t5Jyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogVGFicyBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50YWJzXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyIGlmIHRhYnMgY29udGFpbiBpbWFnZXNcclxuICovXHJcblxyXG5jbGFzcyBUYWJzIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIHRhYnMuXHJcbiAgICogQGNsYXNzXHJcbiAgICogQGZpcmVzIFRhYnMjaW5pdFxyXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gdGFicy5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVGFicy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuX2luaXQoKTtcclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RhYnMnKTtcclxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1RhYnMnLCB7XHJcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcclxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxyXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXHJcbiAgICAgICdBUlJPV19VUCc6ICdwcmV2aW91cycsXHJcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxyXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcclxuICAgICAgLy8gJ1RBQic6ICduZXh0JyxcclxuICAgICAgLy8gJ1NISUZUX1RBQic6ICdwcmV2aW91cydcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYnMgYnkgc2hvd2luZyBhbmQgZm9jdXNpbmcgKGlmIGF1dG9Gb2N1cz10cnVlKSB0aGUgcHJlc2V0IGFjdGl2ZSB0YWIuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy4kdGFiVGl0bGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApO1xyXG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcclxuXHJcbiAgICB0aGlzLiR0YWJUaXRsZXMuZWFjaChmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxyXG4gICAgICAgICAgJGxpbmsgPSAkZWxlbS5maW5kKCdhJyksXHJcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSxcclxuICAgICAgICAgIGhhc2ggPSAkbGlua1swXS5oYXNoLnNsaWNlKDEpLFxyXG4gICAgICAgICAgbGlua0lkID0gJGxpbmtbMF0uaWQgPyAkbGlua1swXS5pZCA6IGAke2hhc2h9LWxhYmVsYCxcclxuICAgICAgICAgICR0YWJDb250ZW50ID0gJChgIyR7aGFzaH1gKTtcclxuXHJcbiAgICAgICRlbGVtLmF0dHIoeydyb2xlJzogJ3ByZXNlbnRhdGlvbid9KTtcclxuXHJcbiAgICAgICRsaW5rLmF0dHIoe1xyXG4gICAgICAgICdyb2xlJzogJ3RhYicsXHJcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBoYXNoLFxyXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogaXNBY3RpdmUsXHJcbiAgICAgICAgJ2lkJzogbGlua0lkXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgJHRhYkNvbnRlbnQuYXR0cih7XHJcbiAgICAgICAgJ3JvbGUnOiAndGFicGFuZWwnLFxyXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcclxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYoaXNBY3RpdmUgJiYgX3RoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xyXG4gICAgICAgICRsaW5rLmZvY3VzKCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGlmKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xyXG4gICAgICB2YXIgJGltYWdlcyA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZCgnaW1nJyk7XHJcblxyXG4gICAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcclxuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9zZXRIZWlnaHQoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2V2ZW50cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHRoaXMuX2FkZEtleUhhbmRsZXIoKTtcclxuICAgIHRoaXMuX2FkZENsaWNrSGFuZGxlcigpO1xyXG4gICAgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyID0gbnVsbDtcclxuICAgIFxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xyXG4gICAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKTtcclxuICAgICAgXHJcbiAgICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIHRoaXMuJGVsZW1lbnRcclxuICAgICAgLm9mZignY2xpY2suemYudGFicycpXHJcbiAgICAgIC5vbignY2xpY2suemYudGFicycsIGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWAsIGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCQodGhpcykpO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMga2V5Ym9hcmQgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9hZGRLZXlIYW5kbGVyKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIHZhciAkZmlyc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpmaXJzdC1vZi10eXBlJyk7XHJcbiAgICB2YXIgJGxhc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpsYXN0LW9mLXR5cGUnKTtcclxuXHJcbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XHJcbiAgICAgIGlmIChlLndoaWNoID09PSA5KSByZXR1cm47XHJcbiAgICAgIFxyXG5cclxuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcclxuICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJyksXHJcbiAgICAgICAgJHByZXZFbGVtZW50LFxyXG4gICAgICAgICRuZXh0RWxlbWVudDtcclxuXHJcbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcclxuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcclxuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLndyYXBPbktleXMpIHtcclxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcclxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gaSA9PT0gJGVsZW1lbnRzLmxlbmd0aCAtMSA/ICRlbGVtZW50cy5maXJzdCgpIDogJGVsZW1lbnRzLmVxKGkrMSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XHJcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1pbihpKzEsICRlbGVtZW50cy5sZW5ndGgtMSkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXHJcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdUYWJzJywge1xyXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgJGVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xyXG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkZWxlbWVudCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xyXG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xyXG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkbmV4dEVsZW1lbnQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cclxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBvcGVuLlxyXG4gICAqIEBmaXJlcyBUYWJzI2NoYW5nZVxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIF9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCkge1xyXG4gICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxyXG4gICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxyXG4gICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpLFxyXG4gICAgICAgICRvbGRUYWIgPSB0aGlzLiRlbGVtZW50LlxyXG4gICAgICAgICAgZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc30uaXMtYWN0aXZlYClcclxuICAgICAgICAgIC5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJylcclxuICAgICAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXHJcbiAgICAgICAgICAuYXR0cih7ICdhcmlhLXNlbGVjdGVkJzogJ2ZhbHNlJyB9KTtcclxuXHJcbiAgICAkKGAjJHskb2xkVGFiLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxyXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpXHJcbiAgICAgIC5hdHRyKHsgJ2FyaWEtaGlkZGVuJzogJ3RydWUnIH0pO1xyXG5cclxuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xyXG5cclxuICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XHJcblxyXG4gICAgJHRhcmdldENvbnRlbnRcclxuICAgICAgLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxyXG4gICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogJ2ZhbHNlJ30pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBzdWNjZXNzZnVsbHkgY2hhbmdlZCB0YWJzLlxyXG4gICAgICogQGV2ZW50IFRhYnMjY2hhbmdlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlLnpmLnRhYnMnLCBbJHRhcmdldF0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHVibGljIG1ldGhvZCBmb3Igc2VsZWN0aW5nIGEgY29udGVudCBwYW5lIHRvIGRpc3BsYXkuXHJcbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBzZWxlY3RUYWIoZWxlbSkge1xyXG4gICAgdmFyIGlkU3RyO1xyXG5cclxuICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgaWRTdHIgPSBlbGVtWzBdLmlkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWRTdHIgPSBlbGVtO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpZFN0ci5pbmRleE9mKCcjJykgPCAwKSB7XHJcbiAgICAgIGlkU3RyID0gYCMke2lkU3RyfWA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyICR0YXJnZXQgPSB0aGlzLiR0YWJUaXRsZXMuZmluZChgW2hyZWY9XCIke2lkU3RyfVwiXWApLnBhcmVudChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcclxuXHJcbiAgICB0aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCk7XHJcbiAgfTtcclxuICAvKipcclxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxyXG4gICAqIElmIGVuYWJsZWQgaW4gb3B0aW9ucywgZ2V0cyBjYWxsZWQgb24gbWVkaWEgcXVlcnkgY2hhbmdlLlxyXG4gICAqIElmIGxvYWRpbmcgY29udGVudCB2aWEgZXh0ZXJuYWwgc291cmNlLCBjYW4gYmUgY2FsbGVkIGRpcmVjdGx5IG9yIHdpdGggX3JlZmxvdy5cclxuICAgKiBAZnVuY3Rpb25cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9zZXRIZWlnaHQoKSB7XHJcbiAgICB2YXIgbWF4ID0gMDtcclxuICAgIHRoaXMuJHRhYkNvbnRlbnRcclxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXHJcbiAgICAgIC5jc3MoJ2hlaWdodCcsICcnKVxyXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgcGFuZWwgPSAkKHRoaXMpLFxyXG4gICAgICAgICAgICBpc0FjdGl2ZSA9IHBhbmVsLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcclxuXHJcbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xyXG4gICAgICAgICAgcGFuZWwuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nLCAnZGlzcGxheSc6ICdibG9jayd9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0ZW1wID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XHJcblxyXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcclxuICAgICAgICAgIHBhbmVsLmNzcyh7XHJcbiAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJycsXHJcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gdGFicy5cclxuICAgKiBAZmlyZXMgVGFicyNkZXN0cm95ZWRcclxuICAgKi9cclxuICBkZXN0cm95KCkge1xyXG4gICAgdGhpcy4kZWxlbWVudFxyXG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxyXG4gICAgICAub2ZmKCcuemYudGFicycpLmhpZGUoKS5lbmQoKVxyXG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcclxuICAgICAgLmhpZGUoKTtcclxuXHJcbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XHJcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuVGFicy5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBhY3RpdmUgcGFuZSBvbiBsb2FkIGlmIHNldCB0byB0cnVlLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIGF1dG9Gb2N1czogZmFsc2UsXHJcblxyXG4gIC8qKlxyXG4gICAqIEFsbG93cyBrZXlib2FyZCBpbnB1dCB0byAnd3JhcCcgYXJvdW5kIHRoZSB0YWIgbGlua3MuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIHRydWVcclxuICAgKi9cclxuICB3cmFwT25LZXlzOiB0cnVlLFxyXG5cclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIHRhYiBjb250ZW50IHBhbmVzIHRvIG1hdGNoIGhlaWdodHMgaWYgc2V0IHRvIHRydWUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgbWF0Y2hIZWlnaHQ6IGZhbHNlLFxyXG5cclxuICAvKipcclxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGBsaWAncyBpbiB0YWIgbGluayBsaXN0LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAndGFicy10aXRsZSdcclxuICAgKi9cclxuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcclxuXHJcbiAgLyoqXHJcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAndGFicy1wYW5lbCdcclxuICAgKi9cclxuICBwYW5lbENsYXNzOiAndGFicy1wYW5lbCdcclxufTtcclxuXHJcbmZ1bmN0aW9uIGNoZWNrQ2xhc3MoJGVsZW0pe1xyXG4gIHJldHVybiAkZWxlbS5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XHJcbn1cclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKFRhYnMsICdUYWJzJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogVG9nZ2xlciBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b2dnbGVyXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICovXHJcblxyXG5jbGFzcyBUb2dnbGVyIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRvZ2dsZXIuXHJcbiAgICogQGNsYXNzXHJcbiAgICogQGZpcmVzIFRvZ2dsZXIjaW5pdFxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvZ2dsZXIuZGVmYXVsdHMsIGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcclxuICAgIHRoaXMuY2xhc3NOYW1lID0gJyc7XHJcblxyXG4gICAgdGhpcy5faW5pdCgpO1xyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcblxyXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9nZ2xlcicpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFRvZ2dsZXIgcGx1Z2luIGJ5IHBhcnNpbmcgdGhlIHRvZ2dsZSBjbGFzcyBmcm9tIGRhdGEtdG9nZ2xlciwgb3IgYW5pbWF0aW9uIGNsYXNzZXMgZnJvbSBkYXRhLWFuaW1hdGUuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHZhciBpbnB1dDtcclxuICAgIC8vIFBhcnNlIGFuaW1hdGlvbiBjbGFzc2VzIGlmIHRoZXkgd2VyZSBzZXRcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xyXG4gICAgICBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XHJcblxyXG4gICAgICB0aGlzLmFuaW1hdGlvbkluID0gaW5wdXRbMF07XHJcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcclxuICAgIH1cclxuICAgIC8vIE90aGVyd2lzZSwgcGFyc2UgdG9nZ2xlIGNsYXNzXHJcbiAgICBlbHNlIHtcclxuICAgICAgaW5wdXQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3RvZ2dsZXInKTtcclxuICAgICAgLy8gQWxsb3cgZm9yIGEgLiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmdcclxuICAgICAgdGhpcy5jbGFzc05hbWUgPSBpbnB1dFswXSA9PT0gJy4nID8gaW5wdXQuc2xpY2UoMSkgOiBpbnB1dDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgQVJJQSBhdHRyaWJ1dGVzIHRvIHRyaWdnZXJzXHJcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkO1xyXG4gICAgJChgW2RhdGEtb3Blbj1cIiR7aWR9XCJdLCBbZGF0YS1jbG9zZT1cIiR7aWR9XCJdLCBbZGF0YS10b2dnbGU9XCIke2lkfVwiXWApXHJcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xyXG4gICAgLy8gSWYgdGhlIHRhcmdldCBpcyBoaWRkZW4sIGFkZCBhcmlhLWhpZGRlblxyXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgdGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpID8gZmFsc2UgOiB0cnVlKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIHRvZ2dsZSB0cmlnZ2VyLlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgX2V2ZW50cygpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCd0b2dnbGUuemYudHJpZ2dlcicpLm9uKCd0b2dnbGUuemYudHJpZ2dlcicsIHRoaXMudG9nZ2xlLmJpbmQodGhpcykpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVG9nZ2xlcyB0aGUgdGFyZ2V0IGNsYXNzIG9uIHRoZSB0YXJnZXQgZWxlbWVudC4gQW4gZXZlbnQgaXMgZmlyZWQgZnJvbSB0aGUgb3JpZ2luYWwgdHJpZ2dlciBkZXBlbmRpbmcgb24gaWYgdGhlIHJlc3VsdGFudCBzdGF0ZSB3YXMgXCJvblwiIG9yIFwib2ZmXCIuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICogQGZpcmVzIFRvZ2dsZXIjb25cclxuICAgKiBAZmlyZXMgVG9nZ2xlciNvZmZcclxuICAgKi9cclxuICB0b2dnbGUoKSB7XHJcbiAgICB0aGlzWyB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA/ICdfdG9nZ2xlQW5pbWF0ZScgOiAnX3RvZ2dsZUNsYXNzJ10oKTtcclxuICB9XHJcblxyXG4gIF90b2dnbGVDbGFzcygpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQudG9nZ2xlQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xyXG5cclxuICAgIHZhciBpc09uID0gdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XHJcbiAgICBpZiAoaXNPbikge1xyXG4gICAgICAvKipcclxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGhhcyB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXHJcbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29uXHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAvKipcclxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXMgbm90IGhhdmUgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxyXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvZmZcclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl91cGRhdGVBUklBKGlzT24pO1xyXG4gIH1cclxuXHJcbiAgX3RvZ2dsZUFuaW1hdGUoKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIGlmICh0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcclxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uSW4sIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uT3V0LCBmdW5jdGlvbigpIHtcclxuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQShmYWxzZSk7XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF91cGRhdGVBUklBKGlzT24pIHtcclxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIGlzT24gPyB0cnVlIDogZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIFRvZ2dsZXIgb24gdGhlIGVsZW1lbnQuXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudG9nZ2xlcicpO1xyXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuVG9nZ2xlci5kZWZhdWx0cyA9IHtcclxuICAvKipcclxuICAgKiBUZWxscyB0aGUgcGx1Z2luIGlmIHRoZSBlbGVtZW50IHNob3VsZCBhbmltYXRlZCB3aGVuIHRvZ2dsZWQuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIGZhbHNlXHJcbiAgICovXHJcbiAgYW5pbWF0ZTogZmFsc2VcclxufTtcclxuXHJcbi8vIFdpbmRvdyBleHBvcnRzXHJcbkZvdW5kYXRpb24ucGx1Z2luKFRvZ2dsZXIsICdUb2dnbGVyJyk7XHJcblxyXG59KGpRdWVyeSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbiFmdW5jdGlvbigkKSB7XHJcblxyXG4vKipcclxuICogVG9vbHRpcCBtb2R1bGUuXHJcbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b29sdGlwXHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XHJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcclxuICovXHJcblxyXG5jbGFzcyBUb29sdGlwIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgVG9vbHRpcC5cclxuICAgKiBAY2xhc3NcclxuICAgKiBAZmlyZXMgVG9vbHRpcCNpbml0XHJcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCBhIHRvb2x0aXAgdG8uXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvYmplY3QgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xyXG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9vbHRpcC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xyXG5cclxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcclxuICAgIHRoaXMuaXNDbGljayA9IGZhbHNlO1xyXG4gICAgdGhpcy5faW5pdCgpO1xyXG5cclxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Rvb2x0aXAnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0b29sdGlwIGJ5IHNldHRpbmcgdGhlIGNyZWF0aW5nIHRoZSB0aXAgZWxlbWVudCwgYWRkaW5nIGl0J3MgdGV4dCwgc2V0dGluZyBwcml2YXRlIHZhcmlhYmxlcyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIG9uIHRoZSBhbmNob3IuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfaW5pdCgpIHtcclxuICAgIHZhciBlbGVtSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICd0b29sdGlwJyk7XHJcblxyXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyB8fCB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgdGhpcy5vcHRpb25zLnRpcFRleHQgPSB0aGlzLm9wdGlvbnMudGlwVGV4dCB8fCB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5vcHRpb25zLnRlbXBsYXRlID8gJCh0aGlzLm9wdGlvbnMudGVtcGxhdGUpIDogdGhpcy5fYnVpbGRUZW1wbGF0ZShlbGVtSWQpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcclxuICAgICAgICAudGV4dCh0aGlzLm9wdGlvbnMudGlwVGV4dClcclxuICAgICAgICAuaGlkZSgpO1xyXG5cclxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XHJcbiAgICAgICd0aXRsZSc6ICcnLFxyXG4gICAgICAnYXJpYS1kZXNjcmliZWRieSc6IGVsZW1JZCxcclxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXHJcbiAgICAgICdkYXRhLXRvZ2dsZSc6IGVsZW1JZCxcclxuICAgICAgJ2RhdGEtcmVzaXplJzogZWxlbUlkXHJcbiAgICB9KS5hZGRDbGFzcyh0aGlzLnRyaWdnZXJDbGFzcyk7XHJcblxyXG4gICAgLy9oZWxwZXIgdmFyaWFibGVzIHRvIHRyYWNrIG1vdmVtZW50IG9uIGNvbGxpc2lvbnNcclxuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xyXG4gICAgdGhpcy5jb3VudGVyID0gNDtcclxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5fZXZlbnRzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFicyB0aGUgY3VycmVudCBwb3NpdGlvbmluZyBjbGFzcywgaWYgcHJlc2VudCwgYW5kIHJldHVybnMgdGhlIHZhbHVlIG9yIGFuIGVtcHR5IHN0cmluZy5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9nZXRQb3NpdGlvbkNsYXNzKGVsZW1lbnQpIHtcclxuICAgIGlmICghZWxlbWVudCkgeyByZXR1cm4gJyc7IH1cclxuICAgIC8vIHZhciBwb3NpdGlvbiA9IGVsZW1lbnQuYXR0cignY2xhc3MnKS5tYXRjaCgvdG9wfGxlZnR8cmlnaHQvZyk7XHJcbiAgICB2YXIgcG9zaXRpb24gPSBlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvXFxiKHRvcHxsZWZ0fHJpZ2h0KVxcYi9nKTtcclxuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uID8gcG9zaXRpb25bMF0gOiAnJztcclxuICAgIHJldHVybiBwb3NpdGlvbjtcclxuICB9O1xyXG4gIC8qKlxyXG4gICAqIGJ1aWxkcyB0aGUgdG9vbHRpcCBlbGVtZW50LCBhZGRzIGF0dHJpYnV0ZXMsIGFuZCByZXR1cm5zIHRoZSB0ZW1wbGF0ZS5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9idWlsZFRlbXBsYXRlKGlkKSB7XHJcbiAgICB2YXIgdGVtcGxhdGVDbGFzc2VzID0gKGAke3RoaXMub3B0aW9ucy50b29sdGlwQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnRlbXBsYXRlQ2xhc3Nlc31gKS50cmltKCk7XHJcbiAgICB2YXIgJHRlbXBsYXRlID0gICQoJzxkaXY+PC9kaXY+JykuYWRkQ2xhc3ModGVtcGxhdGVDbGFzc2VzKS5hdHRyKHtcclxuICAgICAgJ3JvbGUnOiAndG9vbHRpcCcsXHJcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXHJcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlLFxyXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxyXG4gICAgICAnaWQnOiBpZFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gJHRlbXBsYXRlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZC5cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbmluZyBjbGFzcyB0byB0cnlcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xyXG5cclxuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXHJcbiAgICBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSkge1xyXG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCd0b3AnKTtcclxuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xyXG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcclxuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSkge1xyXG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxyXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xyXG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XHJcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXHJcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcclxuICAgIGVsc2UgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcclxuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygnbGVmdCcpO1xyXG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XHJcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXHJcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcclxuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XHJcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xyXG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcclxuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XHJcbiAgICB9XHJcbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5jb3VudGVyLS07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBzZXRzIHRoZSBwb3NpdGlvbiBjbGFzcyBvZiBhbiBlbGVtZW50IGFuZCByZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdW50aWwgdGhlcmUgYXJlIG5vIG1vcmUgcG9zc2libGUgcG9zaXRpb25zIHRvIGF0dGVtcHQsIG9yIHRoZSB0b29sdGlwIGVsZW1lbnQgaXMgbm8gbG9uZ2VyIGNvbGxpZGluZy5cclxuICAgKiBpZiB0aGUgdG9vbHRpcCBpcyBsYXJnZXIgdGhhbiB0aGUgc2NyZWVuIHdpZHRoLCBkZWZhdWx0IHRvIGZ1bGwgd2lkdGggLSBhbnkgdXNlciBzZWxlY3RlZCBtYXJnaW5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9zZXRQb3NpdGlvbigpIHtcclxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy50ZW1wbGF0ZSksXHJcbiAgICAgICAgJHRpcERpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMudGVtcGxhdGUpLFxyXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcclxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcclxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcclxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQsXHJcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIGlmICgoJHRpcERpbXMud2lkdGggPj0gJHRpcERpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkpKSB7XHJcbiAgICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xyXG4gICAgICAvLyB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xyXG4gICAgICAgICd3aWR0aCc6ICRhbmNob3JEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcclxuICAgICAgICAnaGVpZ2h0JzogJ2F1dG8nXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCdjZW50ZXIgJyArIChwb3NpdGlvbiB8fCAnYm90dG9tJyksIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xyXG5cclxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpICYmIHRoaXMuY291bnRlcikge1xyXG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcclxuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIHJldmVhbHMgdGhlIHRvb2x0aXAsIGFuZCBmaXJlcyBhbiBldmVudCB0byBjbG9zZSBhbnkgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxyXG4gICAqIEBmaXJlcyBUb29sdGlwI2Nsb3NlbWVcclxuICAgKiBAZmlyZXMgVG9vbHRpcCNzaG93XHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgc2hvdygpIHtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd09uICE9PSAnYWxsJyAmJiAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLnNob3dPbikpIHtcclxuICAgICAgLy8gY29uc29sZS5lcnJvcignVGhlIHNjcmVlbiBpcyB0b28gc21hbGwgdG8gZGlzcGxheSB0aGlzIHRvb2x0aXAnKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB0aGlzLnRlbXBsYXRlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5zaG93KCk7XHJcbiAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgdG8gY2xvc2UgYWxsIG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcclxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcclxuICAgICAqL1xyXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnRvb2x0aXAnLCB0aGlzLnRlbXBsYXRlLmF0dHIoJ2lkJykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmF0dHIoe1xyXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxyXG4gICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZVxyXG4gICAgfSk7XHJcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnRlbXBsYXRlKTtcclxuICAgIHRoaXMudGVtcGxhdGUuc3RvcCgpLmhpZGUoKS5jc3MoJ3Zpc2liaWxpdHknLCAnJykuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlSW5EdXJhdGlvbiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XHJcbiAgICB9KTtcclxuICAgIC8qKlxyXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxyXG4gICAgICogQGV2ZW50IFRvb2x0aXAjc2hvd1xyXG4gICAgICovXHJcbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGlkZXMgdGhlIGN1cnJlbnQgdG9vbHRpcCwgYW5kIHJlc2V0cyB0aGUgcG9zaXRpb25pbmcgY2xhc3MgaWYgaXQgd2FzIGNoYW5nZWQgZHVlIHRvIGNvbGxpc2lvblxyXG4gICAqIEBmaXJlcyBUb29sdGlwI2hpZGVcclxuICAgKiBAZnVuY3Rpb25cclxuICAgKi9cclxuICBoaWRlKCkge1xyXG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuYXR0cih7XHJcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXHJcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlXHJcbiAgICB9KS5mYWRlT3V0KHRoaXMub3B0aW9ucy5mYWRlT3V0RHVyYXRpb24sIGZ1bmN0aW9uKCkge1xyXG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XHJcbiAgICAgIGlmIChfdGhpcy5jbGFzc0NoYW5nZWQpIHtcclxuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxyXG4gICAgICAgICAgICAgLnJlbW92ZUNsYXNzKF90aGlzLl9nZXRQb3NpdGlvbkNsYXNzKF90aGlzLnRlbXBsYXRlKSlcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhfdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpO1xyXG5cclxuICAgICAgIF90aGlzLnVzZWRQb3NpdGlvbnMgPSBbXTtcclxuICAgICAgIF90aGlzLmNvdW50ZXIgPSA0O1xyXG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLyoqXHJcbiAgICAgKiBmaXJlcyB3aGVuIHRoZSB0b29sdGlwIGlzIGhpZGRlblxyXG4gICAgICogQGV2ZW50IFRvb2x0aXAjaGlkZVxyXG4gICAgICovXHJcbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYudG9vbHRpcCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYWRkcyBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSB0b29sdGlwIGFuZCBpdHMgYW5jaG9yXHJcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBfZXZlbnRzKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIHZhciAkdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlO1xyXG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcclxuXHJcbiAgICAgIHRoaXMuJGVsZW1lbnRcclxuICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xyXG4gICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcclxuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XHJcbiAgICAgICAgaWYgKCFpc0ZvY3VzIHx8IChfdGhpcy5pc0NsaWNrICYmICFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikpIHtcclxuICAgICAgICAgIF90aGlzLmhpZGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcclxuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xyXG4gICAgICAgICAgLy8gX3RoaXMuaXNDbGljayA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgIGlmICgoX3RoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIgfHwgIV90aGlzLiRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JykpICYmICFfdGhpcy5pc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICBfdGhpcy5zaG93KCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVGb3JUb3VjaCkge1xyXG4gICAgICB0aGlzLiRlbGVtZW50XHJcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBfdGhpcy5pc0FjdGl2ZSA/IF90aGlzLmhpZGUoKSA6IF90aGlzLnNob3coKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XHJcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXHJcbiAgICAgIC8vICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5oaWRlLmJpbmQodGhpcylcclxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy4kZWxlbWVudFxyXG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgaXNGb2N1cyA9IHRydWU7XHJcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcclxuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxyXG4gICAgICAgICAgLy8gYSByZWFsIGZvY3VzLCBvdGhlcndpc2Ugb24gaG92ZXIgYW5kIGNvbWUgYmFjayB3ZSBnZXQgYmFkIGJlaGF2aW9yXHJcbiAgICAgICAgICBpZighX3RoaXMub3B0aW9ucy5jbGlja09wZW4pIHsgaXNGb2N1cyA9IGZhbHNlOyB9XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIF90aGlzLnNob3coKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgaXNGb2N1cyA9IGZhbHNlO1xyXG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICBfdGhpcy5oaWRlKCk7XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBpZiAoX3RoaXMuaXNBY3RpdmUpIHtcclxuICAgICAgICAgIF90aGlzLl9zZXRQb3NpdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhZGRzIGEgdG9nZ2xlIG1ldGhvZCwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YXRpYyBzaG93KCkgJiBoaWRlKCkgZnVuY3Rpb25zXHJcbiAgICogQGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgdG9nZ2xlKCkge1xyXG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcclxuICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNob3coKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIHRvb2x0aXAsIHJlbW92ZXMgdGVtcGxhdGUgZWxlbWVudCBmcm9tIHRoZSB2aWV3LlxyXG4gICAqIEBmdW5jdGlvblxyXG4gICAqL1xyXG4gIGRlc3Ryb3koKSB7XHJcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXHJcbiAgICAgICAgICAgICAgICAgLm9mZignLnpmLnRyaWdnZXIgLnpmLnRvb3RpcCcpXHJcbiAgICAgICAgICAgICAgICAvLyAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwJylcclxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1kZXNjcmliZWRieScpXHJcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEteWV0aS1ib3gnKVxyXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvZ2dsZScpXHJcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcmVzaXplJyk7XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmUoKTtcclxuXHJcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5Ub29sdGlwLmRlZmF1bHRzID0ge1xyXG4gIGRpc2FibGVGb3JUb3VjaDogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogVGltZSwgaW4gbXMsIGJlZm9yZSBhIHRvb2x0aXAgc2hvdWxkIG9wZW4gb24gaG92ZXIuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDIwMFxyXG4gICAqL1xyXG4gIGhvdmVyRGVsYXk6IDIwMCxcclxuICAvKipcclxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgaW50byB2aWV3LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAxNTBcclxuICAgKi9cclxuICBmYWRlSW5EdXJhdGlvbjogMTUwLFxyXG4gIC8qKlxyXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBvdXQgb2Ygdmlldy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMTUwXHJcbiAgICovXHJcbiAgZmFkZU91dER1cmF0aW9uOiAxNTAsXHJcbiAgLyoqXHJcbiAgICogRGlzYWJsZXMgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyB0aGUgdG9vbHRpcCBpZiBzZXQgdG8gdHJ1ZVxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSBmYWxzZVxyXG4gICAqL1xyXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXHJcbiAgLyoqXHJcbiAgICogT3B0aW9uYWwgYWRkdGlvbmFsIGNsYXNzZXMgdG8gYXBwbHkgdG8gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gaW5pdC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ215LWNvb2wtdGlwLWNsYXNzJ1xyXG4gICAqL1xyXG4gIHRlbXBsYXRlQ2xhc3NlczogJycsXHJcbiAgLyoqXHJcbiAgICogTm9uLW9wdGlvbmFsIGNsYXNzIGFkZGVkIHRvIHRvb2x0aXAgdGVtcGxhdGVzLiBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgJ3Rvb2x0aXAnLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAndG9vbHRpcCdcclxuICAgKi9cclxuICB0b29sdGlwQ2xhc3M6ICd0b29sdGlwJyxcclxuICAvKipcclxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSB0b29sdGlwIGFuY2hvciBlbGVtZW50LlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnaGFzLXRpcCdcclxuICAgKi9cclxuICB0cmlnZ2VyQ2xhc3M6ICdoYXMtdGlwJyxcclxuICAvKipcclxuICAgKiBNaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSBhdCB3aGljaCB0byBvcGVuIHRoZSB0b29sdGlwLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnc21hbGwnXHJcbiAgICovXHJcbiAgc2hvd09uOiAnc21hbGwnLFxyXG4gIC8qKlxyXG4gICAqIEN1c3RvbSB0ZW1wbGF0ZSB0byBiZSB1c2VkIHRvIGdlbmVyYXRlIG1hcmt1cCBmb3IgdG9vbHRpcC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgY2xhc3M9XCJ0b29sdGlwXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xyXG4gICAqL1xyXG4gIHRlbXBsYXRlOiAnJyxcclxuICAvKipcclxuICAgKiBUZXh0IGRpc3BsYXllZCBpbiB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBvcGVuLlxyXG4gICAqIEBvcHRpb25cclxuICAgKiBAZXhhbXBsZSAnU29tZSBjb29sIHNwYWNlIGZhY3QgaGVyZS4nXHJcbiAgICovXHJcbiAgdGlwVGV4dDogJycsXHJcbiAgdG91Y2hDbG9zZVRleHQ6ICdUYXAgdG8gY2xvc2UuJyxcclxuICAvKipcclxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgdHJ1ZVxyXG4gICAqL1xyXG4gIGNsaWNrT3BlbjogdHJ1ZSxcclxuICAvKipcclxuICAgKiBBZGRpdGlvbmFsIHBvc2l0aW9uaW5nIGNsYXNzZXMsIHNldCBieSB0aGUgSlNcclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgJ3RvcCdcclxuICAgKi9cclxuICBwb3NpdGlvbkNsYXNzOiAnJyxcclxuICAvKipcclxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFkgYXhpcy5cclxuICAgKiBAb3B0aW9uXHJcbiAgICogQGV4YW1wbGUgMTBcclxuICAgKi9cclxuICB2T2Zmc2V0OiAxMCxcclxuICAvKipcclxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFggYXhpcywgaWYgYWxpZ25lZCB0byBhIHNpZGUuXHJcbiAgICogQG9wdGlvblxyXG4gICAqIEBleGFtcGxlIDEyXHJcbiAgICovXHJcbiAgaE9mZnNldDogMTJcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcclxuICovXHJcblxyXG4vLyBXaW5kb3cgZXhwb3J0c1xyXG5Gb3VuZGF0aW9uLnBsdWdpbihUb29sdGlwLCAnVG9vbHRpcCcpO1xyXG5cclxufShqUXVlcnkpOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuKGZ1bmN0aW9uKCkge1xyXG4gIGlmICghRGF0ZS5ub3cpXHJcbiAgICBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XHJcblxyXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XHJcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XHJcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xyXG4gIH1cclxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxyXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xyXG4gICAgdmFyIGxhc3RUaW1lID0gMDtcclxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XHJcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcclxuICAgIH07XHJcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XHJcbiAgfVxyXG59KSgpO1xyXG5cclxudmFyIGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcclxudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xyXG5cclxuLy8gRmluZCB0aGUgcmlnaHQgXCJ0cmFuc2l0aW9uZW5kXCIgZXZlbnQgZm9yIHRoaXMgYnJvd3NlclxyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHRyYW5zaXRpb25zID0ge1xyXG4gICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXHJcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcclxuICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxyXG4gICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xyXG4gIH1cclxuICB2YXIgZWxlbSA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHJcbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xyXG4gICAgaWYgKHR5cGVvZiBlbGVtLnN0eWxlW3RdICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICByZXR1cm4gdHJhbnNpdGlvbnNbdF07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbDtcclxufSkoKTtcclxuXHJcbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xyXG4gIGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApO1xyXG5cclxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XHJcblxyXG4gIGlmIChlbmRFdmVudCA9PT0gbnVsbCkge1xyXG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XHJcbiAgICBjYigpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xyXG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcclxuXHJcbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cclxuICByZXNldCgpO1xyXG4gIGVsZW1lbnQuYWRkQ2xhc3MoYW5pbWF0aW9uKTtcclxuICBlbGVtZW50LmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xyXG4gICAgZWxlbWVudC5hZGRDbGFzcyhpbml0Q2xhc3MpO1xyXG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xyXG4gICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aDtcclxuICAgIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJycpO1xyXG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xyXG4gIGVsZW1lbnQub25lKCd0cmFuc2l0aW9uZW5kJywgZmluaXNoKTtcclxuXHJcbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xyXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcclxuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XHJcbiAgICByZXNldCgpO1xyXG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcclxuICB9XHJcblxyXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xyXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xyXG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xyXG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhpbml0Q2xhc3MgKyAnICcgKyBhY3RpdmVDbGFzcyArICcgJyArIGFuaW1hdGlvbik7XHJcbiAgfVxyXG59XHJcblxyXG52YXIgTW90aW9uVUkgPSB7XHJcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XHJcbiAgICBhbmltYXRlKHRydWUsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xyXG4gIH0sXHJcblxyXG4gIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcclxuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xyXG4gIH1cclxufVxyXG4iLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcclxualF1ZXJ5KCAnaWZyYW1lW3NyYyo9XCJ2aW1lby5jb21cIl0nKS53cmFwKFwiPGRpdiBjbGFzcz0nZmxleC12aWRlbyB3aWRlc2NyZWVuIHZpbWVvJy8+XCIpO1xyXG4iLCJqUXVlcnkoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcclxuIiwiLy8gSm95cmlkZSBkZW1vXHJcbiQoJyNzdGFydC1qcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xyXG4gICQoZG9jdW1lbnQpLmZvdW5kYXRpb24oJ2pveXJpZGUnLCdzdGFydCcpO1xyXG59KTsiLCIkKCcudGl0bGUtYmFyJykub24oJ3N0aWNreS56Zi5zdHVja3RvOnRvcCcsIGZ1bmN0aW9uKCl7XHJcbiAgJCh0aGlzKS5hZGRDbGFzcygnc2hyaW5rJyk7XHJcbn0pLm9uKCdzdGlja3kuemYudW5zdHVja2Zyb206dG9wJywgZnVuY3Rpb24oKXtcclxuICAkKHRoaXMpLnJlbW92ZUNsYXNzKCdzaHJpbmsnKTtcclxufSk7XHJcblxyXG5cclxuJChmdW5jdGlvbigpIHtcclxuICAkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XHJcbiAgICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XHJcbiAgICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xyXG4gICAgICBpZiAodGFyZ2V0Lmxlbmd0aCkge1xyXG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcclxuICAgICAgICAgIHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcC02NFxyXG4gICAgICAgIH0sIDgwMCk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn0pOyIsIiIsIlxyXG4kKHdpbmRvdykuYmluZCgnIGxvYWQgcmVzaXplIG9yaWVudGF0aW9uQ2hhbmdlICcsIGZ1bmN0aW9uICgpIHtcclxuICAgdmFyIGZvb3RlciA9ICQoXCIjZm9vdGVyLWNvbnRhaW5lclwiKTtcclxuICAgdmFyIHBvcyA9IGZvb3Rlci5wb3NpdGlvbigpO1xyXG4gICB2YXIgaGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xyXG4gICBoZWlnaHQgPSBoZWlnaHQgLSBwb3MudG9wO1xyXG4gICBoZWlnaHQgPSBoZWlnaHQgLSBmb290ZXIuaGVpZ2h0KCkgLTE7XHJcblxyXG4gICBmdW5jdGlvbiBzdGlja3lGb290ZXIoKSB7XHJcbiAgICAgZm9vdGVyLmNzcyh7XHJcbiAgICAgICAgICdtYXJnaW4tdG9wJzogaGVpZ2h0ICsgJ3B4J1xyXG4gICAgIH0pO1xyXG4gICB9XHJcblxyXG4gICBpZiAoaGVpZ2h0ID4gMCkge1xyXG4gICAgIHN0aWNreUZvb3RlcigpO1xyXG4gICB9XHJcbn0pO1xyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
