var async = require('async');
var $ = require('../lib/jquery.go.js');

// Add some default configs.
$.config.site = 'http://localhost';
$.config.addJQuery = false;

// Using the async.series with jQuery.go.
async.series([
  $.go('visit', '/user'),
  $('#edit-name').go('val', 'admin'),
  $('#edit-pass').go('val', '123testing'),
  $('#edit-submit').go('click'),
  $.go('waitForPage'),
  function(done) {
    $('a[href="/user/logout"]').text(function(text) {
      console.log(text);
      done();
    });
  }
], function() {
  console.log('You are logged in!');
  $.close();
});
