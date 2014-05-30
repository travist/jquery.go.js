var $ = require('../lib/jquery.go.js');

// Add some default configs.
$.config.site = 'http://localhost';
$.config.addJQuery = false;

// Visit the user path and log in.
$.visit('/user', function() {
  $('#edit-name').val('admin', function() {
    $('#edit-pass').val('123password', function() {
      $('#edit-submit').click(function() {
        $.waitForPage(function() {

          // Make sure we see the logout link...
          $('a[href="/user/logout"]').text(function(text) {
            console.log('You are logged in!');

            // Always close the browser.
            $.close();
          });
        });
      });
    });
  });
});
