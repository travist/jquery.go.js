jquery.go.js
==============
An easy-to-use web testing and automation tool that uses the jQuery interface
within Node.js to interact with the <a href="http://phantomjs.org">Phantom.js</a> browser.

Node.js + <a href="http://phantomjs.org">Phantom.js</a> + jQuery = AwesomeSauce!
---------------------------------------------
What do you get when you combine three of the most exciting JavaScript
technologies into a single package.  AwesomeSauce that's what.  Actually, what
you get is an easy to use browser testing and automation tool by utilizing the
jQuery interface within Node.js to interact with the <a href="http://phantomjs.org">Phantom.js</a> browser.

Another jQuery wrapper in Node.js?...
---------------------------------------------
Yes... but not really... Obviously, there are other technologies that wrap
the jQuery library within a Node.js environment, but this library is different.

For one, this library is not a complete API mirror of jQuery.  Every API
is asynchronous (due to its interaction with <a href="http://phantomjs.org">Phantom.js</a>), so there are some
differences.  Because of this, I would rather think of this library as a tool
for testing and automation, but just uses the familar jQuery API to do so.
Technically speaking, it accomplishes this by simply passing along your commands
to jQuery within <a href="http://phantomjs.org">Phantom.js</a>, but there are also some other methods exposed to
help with the task of testing and automation.

In particular is a method called <a href="https://github.com/travist/jquery.go.js#jquerygo---using-this-library-with-asyncjs">jquery.go</a> that
allows this library to be used with the <a href="https://github.com/caolan/async">Async.js</a> library.

Installation
---------------------------------------------
- Obviously you need to install <a href="http://nodejs.org">Node.js</a> to use this.
- You can now use this library using the NPM package <strong>jquerygo</strong>

```
npm install jquerygo
```

The API
---------------------------------------------
Every thing within jQuery (for the most part) is exposed to this library, but
done so asynchronously.  For example, to get the text of an element on the page,
you would use the following code.

```javascript
var $ = require('jquerygo');

// Visit the user path and log in.
$.visit('http://localhost:8888/user', function() {

  // Get the title.
  $('h1').text(function(text) {
    console.log(text);
    $.close();
  });
});
```

To set the text of an element on the page, you still add your arguments after
text, but just include the callback to know when it is done..

```javascript
var $ = require('jquerygo');

// Visit the user path and log in.
$.visit('http://localhost:8888/user', function() {

  // Set the title.
  $('h1').text('New Title', function() {

    // Get the title that was set.
    $('h1').text(function(text) {

      // Should print 'New Title'.
      console.log(text);
      $.close();
    });
  });
});
```

You may have noted that this makes jQuery chaining difficult.  You are right,
but you don't need to repeat your jQuery selectors since if you wish to chain,
you can just use the 'this' keyword in the callbacks to reference the same
selector.

```javascript
var $ = require('jquerygo');

// Visit the user path and log in.
$.visit('http://localhost:8888/user', function() {

  // Set the title.
  $('h1').text('New Title', function() {

    // Use 'this' to get the title of the same selector
    this.text(function(text) {

      // Should print 'New Title'.
      console.log(text);
      $.close();
    });
  });
});
```

The each method
---------------------------------------------
This library also supports the ```each``` method, but its signature is a little
bit different than core jQuery.  The main difference being that it must support
asynchronous process flow using callback functions.  Here is an example of using
the each method.

```javascript
var $ = require('jquerygo');

// Add some default configs.
$.config.site = 'http://www.whitehouse.gov';
$.config.addJQuery = false;

// Go to the presidents page.
$.visit('/about/presidents', function() {
  $.waitForPage(function() {
  
    // Iterate through each span.field-content.
    $('span.field-content').each(function(index, element, done) {
    
      // Get the text of this element.
      element.text(function(name) {
      
        // Print the presidents name.
        console.log(name);
        done();
      });
    }, function() {
    
      // We are done.
      console.log('Presidents loaded!');
      $.close();
    });
  });
});
```

That is pretty much what you need to know regarding differences between jQuery
interface compared to what you are used to.

Screen Capture
---------------------------------------------
This library also allows you to take a screen capture during your testing and
automation.  This can be done using the ```$.capture``` method. You can also
use this along with ```__dirname``` to take a screen shot within the directory
that your automation script resides.

```javascript
$.capture(__dirname + '/screenshot.png');
```

Additional API's
---------------------------------------------
There are also some added API's that make your testing and automation easier.
They are as follows.

- <strong>visit</strong>: function(url, callback)

  Visit a webpage.
    - url:  The url you wish to visit.
    - callback:  Called when you are done visiting that page.

```javascript
// Visit the user path and log in.
$.visit('http://localhost;8888', function() {
  console.log('You have visited the page!');
  $.close();
});
```

- <strong>waitForPage</strong>: function(callback)

  Wait for a page to load.  Useful after you press Submit on a form.
    - callback: Called when the page is done loading.

```javascript
$.visit('/user', function() {
  $('#edit-name').val('admin', function() {
    $('#edit-pass').val('123password', function() {
      $('#edit-submit').click(function() {
        $.waitForPage(function() {
          console.log('You have logged in!');
          $.close();
        });
      });
    });
  });
});
```

- <strong>waitForElement</strong>: function(element, callback)

  Wait for an element to appear on the page.  Useful when you are waiting
  for an AJAX request to return which sets an element on the page.

    - element:  The element selector that you wish to wait for.
    - callback: Called when that element is present.

- <strong>getPage</strong>: function(callback)

  Return the phantomJS page so that you can perform your own JS execute parameter.
  
    - callback:  Called when the page is returned.
    

```javascript
var $ = require('../lib/jquery.go.js');
$.visit('https://www.google.com', function(){
  $.waitForPage(function(){
    $.getPage(function(page) {
      page.evaluate(function(args) {
      
        // Just return the passed in params.
        return args.hello;
      }, function(err, retVal) {
      
        // Called when you return from the evaluation.
        console.log(retVal);
        $.close();
      }, {
        hello: 'HELLO THERE!!!'
      });
    });
  });
});
```  

- <strong>close</strong>: function()

  Closes the <a href="http://phantomjs.org">Phantom.js</a> browser.

- <strong>config</strong>: object

  An object of configurations for this library.

  - site: (string, default='') - A base url for the site so that all other 'visit' calls could be relative.
  - addJQuery: (boolean, default=TRUE) - TRUE if you need to add jQuery to the page you are visiting, FALSE if the page already adds jQuery.
  - jQuery: (string, default='http://code.jquery.com/jquery-1.9.1.min.js') - The CDN url of the jQuery to add to the page if addJQuery is set to TRUE.

```javascript
var $ = require('jquerygo');

// Add some default configs.
$.config.site = 'http://localhost:8888';
$.config.addJQuery = false;

// Visit the user path and log in.
$.visit('/user', function() {
  $('#edit-name').val('admin', function() {
    $('#edit-pass').val('123password', function() {
      $('#edit-submit').click(function() {
        $.waitForPage(function() {
          console.log('You are logged in!');
        });
      });
    });
  });
});

```

jQuery.go - Using this library with <a href="https://github.com/caolan/async">Async.js</a>
---------------------------------------------
This library is called jQuery.go for a reason.  It is because there is a special
method that is used to interact with the <a href="https://github.com/caolan/async">Async.js</a> library
that provides an easy way to provide a serial looking interface when building your
tests.  This can work with the Async.js library by calling the <strong>go</strong> method and
whatever functions you wish to call after that as arguments to that method.

A great example is to take the previous example shown above and rewrite it using <strong>jQuery.go</strong>
method.

```javascript
var async = require('async');
var $ = require('../lib/jquery.go.js');

// Add some default configs.
$.config.site = 'http://localhost:8888';
$.config.addJQuery = false;

// Using the async.series with jQuery.go.
async.series([
  $.go('visit', '/user'),
  $('#edit-name').go('val', 'admin'),
  $('#edit-pass').go('val', '123testing'),
  $('#edit-submit').go('click'),
  $.go('waitForPage'),
  function(done) {

    // Make sure that the logout link is shown.
    $('a[href="/user/logout"]').text(function(text) {
      console.log(text);
      done();
    });
  }
], function() {
  console.log('You are logged in!');
  $.close();
});
```

This makes it so that you do not fall into Callback hell when developing your automation and tests.
