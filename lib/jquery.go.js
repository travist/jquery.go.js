// Include the libraries.
var phantomjs = require('phantomjs')
var phantom =   require('node-phantom');
var async = require('async');
var _ = require('underscore');
var go = require('asyncgo');

// The current page.
var page = null;
var pageQueue = [];
var instance = null;
var loading = true;

// Create the phantom connection.
phantom.create(function(err, ph) {

  // Save the instance.
  instance = ph;

  // Create the page.
  return ph.createPage(function(err, pg) {

    // Set the page.
    page = pg;

    // Add the load start and finished events.
    page.onLoadStarted = function() {
      loading = true;
    };
    page.onLoadFinished = function() {
      loading = false;
    };

    // Empty the get page queue.
    _.each(pageQueue, function(queue) {
      queue(page);
    });
  });
}, { phantomPath: phantomjs.path });

/**
 * Returns the current page within the phantom browser.
 *
 * @param {function} callback
 *   Called with the page once it is available.
 */
var getPage = function(callback) {
  if (page) {
    callback(page);
  }
  else {
    pageQueue.push(callback);
  }
};

/**
 * jQuery Interface class.
 *
 * @param {string} selector
 *   The selector to use for the interface.
 * @param {string} context
 *   The context to use for the interface.
 *
 * @returns {jQueryInterface}
 */
var jQueryInterface = function(selector, context) {
  this.selector = selector;
  this.context = context;
  this.instance = -1;
  this.index = -1;
  this.length = -1;
};

/**
 *  Execute the query.
 */
jQueryInterface.prototype.asyncExecute = function(method, args, callback) {
  var self = this;

  // Get the page.
  getPage(function(page) {

    // Evaluate some javascript on this page.
    page.evaluate(function(a) {
      var query = null, retVal = {};
      if (a.instance >= 0 && typeof window.phNodes[a.instance] !== undefined) {
        query = window.phNodes[a.instance];
      }
      else {
        query = jQuery(a.selector, a.context);
        if (!window.phNodes) {
          window.phNodes = [];
        }
        window.phNodes.push(query);
        retVal.instance = (window.phNodes.length - 1);
      }

      retVal.length = query.length;

      if (a.index >= 0) {
        query = query.eq(a.index);
      }
      if (a.args.length > 0) {
        retVal.value = query[a.method].apply(query, a.args);
      }
      else {
        retVal.value = query[a.method]();
      }

      // Make sure not to return the whole jquery object.
      if (typeof retVal.value.jquery === 'string') {
        retVal.value = false;
      }

      // Return the value.
      return retVal;
    }, function(err, retVal) {

      // Set the instance and length if they exist.
      if (retVal.instance) {
        self.instance = retVal.instance;
      }

      // Trigger the callback.
      self.length = retVal.length;
      callback.call(self, retVal.value);
    }, {
      selector: self.selector,
      context: self.context,
      instance: self.instance,
      index: self.index,
      method: method,
      args: args
    });
  });
};

/**
 * Maps the calls made to the interface to a call made within PhantomJS browser.
 */
jQueryInterface.prototype.asyncCall = function() {
  var self = this;
  var args = _.filter(_.values(arguments), function(arg) {
    return !!arg;
  });
  var method = args.shift();
  var callback = args.pop();
  this.asyncExecute(method, args, callback);
};

// Set the go method.
jQueryInterface.prototype.go = go;

// For each of the jQuery interfaces, add a prototype.
_.each(['add', 'addBack', 'addClass', 'after', 'ajaxComplete', 'ajaxError',
  'ajaxSend', 'ajaxStart', 'ajaxStop', 'ajaxSuccess', 'andSelf', 'animate',
  'append', 'appendTo', 'attr', 'before', 'bind', 'blur', 'change', 'children',
  'clearQueue', 'click', 'clone', 'closest', 'contents', 'css', 'data',
  'dblclick', 'delay', 'delegate', 'dequeue', 'detach', 'die', 'empty', 'end',
  'eq', 'error', 'fadeIn', 'fadeOut', 'fadeTo', 'fadeToggle', 'filter', 'find',
  'finish', 'first', 'focus', 'focusin', 'focusout', 'get', 'has', 'hasClass',
  'height', 'hide', 'hover', 'html', 'index', 'innerHeight', 'innerWidth',
  'insertAfter', 'insertBefore', 'is', 'keydown', 'keypress', 'keyup', 'last',
  'live', 'load', 'map', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove',
  'mouseout', 'mouseover', 'mouseup', 'next', 'nextAll', 'nextUntil', 'not',
  'off', 'offset', 'offsetParent', 'on', 'one', 'outerHeight', 'outerWidth',
  'parent', 'parents', 'parentsUntil', 'position', 'prepend', 'prependTo',
  'prev', 'prevAll', 'prevUntil', 'promise', 'prop', 'pushStack', 'queue',
  'ready', 'remove', 'removeAttr', 'removeClass', 'removeData', 'removeProp',
  'replaceAll', 'replaceWith', 'resize', 'scroll', 'scrollLeft', 'scrollTop',
  'select', 'serialize', 'serializeArray', 'show', 'siblings', 'size', 'slice',
  'slideDown', 'slideToggle', 'slideUp', 'stop', 'submit', 'text', 'toArray',
  'toggle', 'toggleClass', 'trigger', 'triggerHandler', 'unbind', 'undelegate',
  'unload', 'unwrap', 'val', 'width', 'wrap', 'wrapAll', 'wrapInner'
], function(method) {

  // Add the prototype for that method.
  jQueryInterface.prototype[method] = function() {
    var args = _.values(arguments);
    args.unshift(method);
    return this.asyncCall.apply(this, args);
  };
});

/**
 * Implement the each method.
 *
 * @param function callback
 *   The callback that is called for each item.
 * @param function done
 *   The function that is called when all of the items have been iterated.
 */
jQueryInterface.prototype.each = function(callback, done) {
  var self = this;

  // If the length has not yet been defined.
  if (this.length < 0) {
    this.eq(0, function() {
      if (!self.length) {
        done(true);
      }
      else {
        self.each(callback, done);
      }
    });
  }
  else {
    this.index++;
    if (this.index >= this.length) {
      done();
    }
    else {
      callback.call(this, this.index, this, function() {
        self.each(callback, done);
      });
    }
  }
};

/**
 * Define the jQuery() interface.
 *
 * @param {type} selector
 * @param {type} context
 * @returns {jQuery.Anonym$0}
 */
var jQuery = _.extend(function(selector, context) {

  // If this already is a jQueryInterface.
  if (typeof selector === 'object') {
    return selector;
  }
  else {
    // Return a new jQuery Interface.
    return new jQueryInterface(selector, context);
  }
}, {

  /**
   * Ability to change the configs.
   */
  config: {
    addJQuery: true,
    jQuery: '//code.jquery.com/jquery-1.9.1.min.js',
    site: ''
  },

  /**
   * Used to visit a page.
   *
   * @param {string} url
   *   The url you wish to visit.
   * @param {function} callback
   *   Called when the page is done visiting.
   */
  visit: function(url, callback) {
    var self = this;
    getPage(function(page) {
      page.open(self.config.site + url, function() {
        if (self.config.addJQuery) {
          var loadJS = function() {
            if (loading) {
              setTimeout(loadJS, 100);
            }
            else {
              page.includeJs(self.config.jQuery, callback);
            }
          }
          loadJS();
        }
        else {
          self.waitForPage(callback);
        }
      });
    });
  },

  /**
   * Wait for the page to load.
   *
   * @param {type} callback
   * @returns {undefined}
   */
  waitForPage: function(callback, nowait) {
    var self = this;
    var loadWait = function() {
      setTimeout(function() {
        self.waitForPage(callback, true);
      }, 100);
    };
    if (nowait) {
      if (loading) {
        loadWait();
      }
      else {
        getPage(function(page) {
          page.evaluate(function() {
            return jQuery.isReady;
          }, function(err, ready) {
            if (ready) {
              callback.call(self);
            }
            else {
              loadWait();
            }
          });
        });
      }
    }
    else {
      loadWait();
    }
  },

  /**
   * Waits for an element to be present.
   */
  waitForElement: function(element, callback, nowait) {
    var self = this;
    if (!nowait) {
      this.waitForPage(function() {
        self.waitForElement(element, callback, true);
      });
    }
    else {
      var loadWait = function() {
        setTimeout(function() {
          self.waitForElement(element, callback, true);
        }, 100);
      };
      if (nowait) {
        getPage(function(page) {
          page.evaluate(function(element) {
            var element = jQuery(element);
            return ((element.length > 0) && element.is(':visible'));
          }, function(err, found) {
            if (found) {
              callback.call(self);
            }
            else {
              loadWait();
            }
          }, element);
        });
      }
      else {
        loadWait();
      }
    }
  },

  /**
   * Capture the page as an image.
   */
  capture: function(filename, done) {
    getPage(function(page) {
      page.render(filename, done);
    });
  },

  /**
   * Upload File to a Form.
   */
  uploadFile: function(selector, filename, done) {
    getPage(function(page) {
      page.uploadFile(selector, filename, done);
    });
  },

  /**
   * Close the phantom browser.
   * @returns {undefined}
   */
  close: function() {

    // Close the phantom browser instance.
    if (instance) {
      instance.exit();
    }
  },
  
  /**
   * The getPage method.
   */ 
  getPage: getPage,

  /**
   * The go method.
   */
  go: go
});

module.exports = jQuery;
