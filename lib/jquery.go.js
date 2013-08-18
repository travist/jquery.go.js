// Include the libraries.
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
});

/**
 * Initialize the page.
 *
 * @returns {undefined}
 */
var initializePage = function(page, callback) {
  page.evaluate(function() {

    // Create the window jQuery nodes.
    window.phNodes = [];
    return true;
  }, function(err, retVal) {
    callback();
  });
};

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
  this.queue = [];
  this.selector = selector;
  this.context = context;
  this.instance = -1;
  this.index = -1;
  this.length = -1;
  var self = this;

  // Get the phantom page to store the query.
  getPage(function(page) {
    page.evaluate(function(a) {

      // Perform the query and add it to the phNodes array.
      var query = jQuery(a.selector, a.context);
      window.phNodes.push(query);

      // Return the query result.
      return {
        instance: (window.phNodes.length - 1),
        length: query.length
      };
    }, function(err, retVal) {

      // Set the instance and length and empty the queue.
      self.instance = retVal.instance;
      self.length = retVal.length;
      _.each(self.queue, function(queue) {
        self[queue.method].apply(self, queue.args);
      });
    }, {
      selector: selector,
      context: context
    });
  });
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
      var obj = window.phNodes[a.instance], retVal = null;
      if (a.index >= 0) {
        obj = obj.eq(a.index);
      }
      if (a.args.length > 0) {
        retVal = obj[a.method].apply(obj, a.args);
      }
      else {
        retVal = obj[a.method]();
      }

      // Do not return the jQuery object.  Just results.
      return (typeof retVal.jquery === 'string') ? true : retVal;
    }, function(err, retVal) {

      // Trigger the callback.
      callback.call(self, retVal);
    }, {
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

  // Make sure our instance has been created.
  if (this.instance >= 0) {
    this.asyncExecute(method, args, callback);
  }
  else {
    this.queue.push({
      method: 'asyncExecute',
      args: [
        method,
        args,
        callback
      ]
    });
  }
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
  if (this.instance >= 0) {
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
  else {

    // Add this to the queue.
    this.queue.push({
      method: 'each',
      args: [
        callback,
        done
      ]
    })
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
    jQuery: 'http://code.jquery.com/jquery-1.9.1.min.js',
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
          page.includeJs(self.config.jQuery, function(err) {
            initializePage(page, callback);
          });
        }
        else {
          initializePage(page, callback);
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
   * The go method.
   */
  go: go
});

module.exports = jQuery;
