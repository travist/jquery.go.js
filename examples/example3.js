var async = require('async');
var $ = require('../lib/jquery.go.js');

// Add some default configs.
$.config.site = 'http://localhost';
$.config.addJQuery = false;

// Using each method.
$.visit('/node', function() {
  $('h2 a').each(function(index, element, done) {
    this.text(function(text) {
      console.log(text);
      done();
    });
  }, function() {
    console.log('done');
    $.close();
  });
});
