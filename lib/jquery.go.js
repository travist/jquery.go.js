// Include the libraries.
var phantomjs = require('phantomjs')
var phantom =   require('phantom');
var async = require('async');
var _ = require('underscore');
var go = require('asyncgo');

// The current page.
var page = null;
var pageQueue = [];
var instance = null;
var loading = true;

var createPage = function(ph){
  return ph.createPage(function(pg) {
    // Set the page.
    page = pg;

    // Num resources outstanding.
    var resources = 0;

    // Whether page has loaded.
    var ready = false;
   
    
    // Pass along console messages.
    page.set('onConsoleMessage', function(msg) {
      console.log('Console:' + msg);
    });

    // Increment our outstanding resources counter.
    page.set('onResourceRequested', function() {
      if (ready) {
        loading = true;
        resources++;
      }
    });

    // Fire an event when we have received a resource.
    page.set('onResourceReceived', function(res) {
      if (ready && (res.stage == 'end') && (--resources == 0)) {
        loading = false;
      }
    });

    // Trigger when the loading has started.
    page.set('onLoadStarted', function() {
      loading = true;      
    });

    // Trigger when the loading has finished.
    page.set('onLoadFinished', function() {
      loading = (resources > 0);
      ready = true;
    });

    // Empty the get page queue.
    _.each(pageQueue, function(queue) {
      queue(page);
    });
    pageQueue = [];
  });
};


// Create the phantom connection.
phantom.create(
  "--web-security=no", 
  "--ignore-ssl-errors=yes", 
  "--load-images=false",  
  function(ph) {

    // Save the instance.
    instance = ph;
  
    // Create the page.
    return createPage(ph);
  
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
  } else { 
    pageQueue.push(callback);
    if( instance ) {
      createPage(instance);
    } 
  }
};

var closePage = function(){
  if(page){
    page.close();
    page = null;
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
  if (typeof context == 'function') {
    this.context = null;
    this.asyncExecute(null, null, context);
  }
  else {
    this.context = context;
  }

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

        // See if the selector is a stored node.
        if (typeof a.selector == 'number' && typeof window.phNodes[a.selector] !== undefined) {
          a.selector = window.phNodes[a.selector];
        }

        // See if the context is a stored node.
        if (typeof a.context == 'number' && typeof window.phNodes[a.context] !== undefined) {
          a.context = window.phNodes[a.context];
        }

        // Query the new jQuery item.
        query = jQuery(a.selector, a.context);

        // Add this to the phNodes array.
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

      if (a.method) {
        if (a.args.length > 0) {
          retVal.value = query[a.method].apply(query, a.args);
        }
        else {
          retVal.value = query[a.method]();
        }
      }
      else {
        retVal.value = query.length;
      }

      // Make sure not to return the whole jquery object.
      if (typeof retVal.value.jquery === 'string') {
        retVal.value = false;
      }

      // Return the value.
      return retVal;
    }, function(retVal) {

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
  context = function(val) {
    if (loading) {
      setTimeout(function() {
        context(val);
      }, 100);
    } else {
      callback(val);
    }
  }
  this.asyncExecute(method, args, context);
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
    jQuery: '//code.jquery.com/jquery-1.11.1.min.js',
    site: '',
    width: 1920,
    height: 1080,
    debug: true
  },

  /**
   * Keep track when the viewport size has been set.
   */
  viewportSizeSet: false,

  /**
   * Send a debug message to the console.
   */
  debug: function(msg) {
    if (this.config.debug) {
      console.log(msg);
    }
  },

  /**
   * Used to visit a page.
   *
   * @param {string} url
   *   The url you wish to visit.
   * @param {function} callback
   *   Called when the page is done visiting.
   */
  visit: function(url, callback, timeout) {    
    var self = this;
    if(timeout===undefined) timeout = -1;    
    self.visitStart = Date.now();
    
    getPage(function(page) {

      // Set the page size if it hasn't already been set.
      if (!self.viewportSizeSet) {
        self.viewportSizeSet = true;
        page.set('viewportSize', {
          width: self.config.width,
          height: self.config.height
        }, function (result) {
          self.debug("Viewport set to: " + result.width + "x" + result.height);
        });
      }

      // Open the page.
      self.debug('Navigating to ' + self.config.site + url);
      page.open(self.config.site + url, function() {
        if (self.config.addJQuery) {
          var loadJS = function() {
            var remain = timeout==-1? 1: (timeout - (Date.now()-self.visitStart)) ;
            if (loading && remain> 0 ) {
              setTimeout(loadJS, 100);
            }
            else {
              loading = false;
              page.includeJs(self.config.jQuery, callback);
            }
          }
          loadJS();
        }
        else {
          self.visitStart = Date.now();
          self.waitForPage(callback, false, timeout);
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
  waitForPage: function(callback, nowait, timeout) {
    var self = this;    
    if(timeout===undefined) timeout = -1;
    var remain = timeout==-1? 1: (timeout - (Date.now()-self.visitStart));
    
    var loadWait = function() {
      setTimeout(function() {
        self.waitForPage(callback, true, timeout);
      }, 100);
    };
    if (nowait) {
      if (loading && remain > 0 ) {
        loadWait();
      }
      else {
        loading = false;
        getPage(function(page) {
          page.evaluate(function() {
            return jQuery.isReady;
          }, function(ready) {
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
      }, nowait, -1);
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
          }, function(found) {
            if (found) {
              self.debug('Element ' + element + ' found');
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
    this.debug('Capturing page at ' + filename);
    getPage(function(page) {
      page.render(filename, done);
    });
  },

  /**
   * Upload File to a Form.
   */
  uploadFile: function(selector, filename, done) {
    self.debug('Upload file to ' + selector);
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
      this.debug('Closing');
      instance.exit();
    }
  },

  /**
   * Prints to the console.
   */
  print: function(text, done) {
    console.log(text);
    done();
  },

  /**
   * The getPage method.
   */
  getPage: getPage,
  closePage: closePage,

  /**
   * The go method.
   */
  go: go
});

module.exports = jQuery;
