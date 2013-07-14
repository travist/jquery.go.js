// Include the libraries.
var phantom =   require('node-phantom');
var _ =         require('underscore');

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
var jQueryInterface = function(page, selector, context) {
  this.page = page;
  this.selector = selector;
  this.context = context;
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
  this.page.evaluate(function(a) {
    var obj = jQuery(a.selector, a.context);
    if (a.args.length > 0) {
      return obj[a.method].apply(obj, a.args);
    }
    else {
      return obj[a.method]();
    }
  }, function(err, retVal) {
    callback.call(self, retVal);
  }, {
    method: method,
    selector: this.selector,
    context: this.context,
    args: args
  });
};

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
 * Define the jQuery() interface.
 * 
 * @param {type} selector
 * @param {type} context
 * @returns {jQuery.Anonym$0}
 */
var jQuery = (function() {
  
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
   * Initialize the page for use with jQuery.
   * 
   * @param {object} page
   *   A node-phantom page object.
   * @param {function} callback
   *   Called when the page has initialized.
   *   
   * @returns {undefined}
   */
  var initializePage = function(page, callback) {
    page.evaluate(function() {
      return true;
    }, function() {
      callback();
    });
  };
  
  /**
   * Return the jQuery signature.
   * 
   * @param {string} selector
   *   The selector to find the element you wish to control.
   *   
   * @param {string} context
   *   The context for this query.
   * 
   * @returns {object}
   *   The jQuery instance signature.
   */
  return _.extend(function(selector, context) {
    
    // Return a new jQuery Interface.
    return new jQueryInterface(page, selector, context);
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
    }
  });
})();

module.exports = jQuery;
