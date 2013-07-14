jQuery.go.js
==============
An easy-to-use web testing and automation tool that uses the jQuery interface 
within Node.js to interact with the Phantom.js browser.

Node.js + Phantom.js + jQuery = AwesomeSauce!
---------------------------------------------
What do you get when you combine three of the most exciting JavaScript 
technologies into a single package.  AwesomeSauce that's what.  Actually, what
you get is an easy to use browser testing and automation tool by utilizing the
jQuery interface within Node.js to interact with the Phantom.js browser.

Another jQuery wrapper in Node.js?...
---------------------------------------------
Yes... but not really... Obviously, there are other technologies that wrap
the jQuery library within a Node.js environment, but this library is different.

For one, this library is not a complete API mirror of jQuery.  Every API
is asynchronous (due to its interaction with Phantom.js), so there are some
differences.  Because of this, I would rather think of this library as a tool
for testing and automation, but just uses the familar jQuery API to do so. 
Technically speaking, it accomplishes this by simply passing along your commands
to jQuery within Phantom.js, but there are also some other methods exposed to 
help with the task of testing and automation.

The API
---------------------------------------------

Every thing within jQuery (for the most part) is exposed to this library, but 
done so asynchronously.  For example, to get the text of an element on the page,
you would use the following code.

```
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

```
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

```
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
That is pretty much what you need to know regarding differences between jQuery
interface compared to what you are used to.

Additional API's
---------------------------------------------

There are also some added API's that make your testing and automation easier.
They are as follows.

- visit: function(url, callback)

  Visit a webpage.
    - url:  The url you wish to visit.
    - callback:  Called when you are done visiting that page.

```
// Visit the user path and log in.
$.visit('http://localhost;8888', function() {
  console.log('You have visited the page!');
  $.close();
});
```

- waitForPage: function(callback)
  Wait for a page to load.  Usefull after you press Submit on a form.
    - callback: Called when the page is done loading.

```
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

- close: function()
  Closes the Phantom.js browser.

- config: object
  An object of configurations for this library.

  - site: (string, default='') 
      A base url for the site so that all other 'visit' calls could be relative.
  - addJQuery: (boolean, default=TRUE) 
      TRUE if you need to add jQuery to the page you are visiting, FALSE if the page already adds jQuery.
  - jQuery: (string, default='http://code.jquery.com/jquery-1.9.1.min.js') 
      The CDN url of the jQuery to add to the page if addJQuery is set to TRUE.

```

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
