var $ = require('../lib/jquery.go.js');
$.visit('https://www.google.com', function(){
  $.waitForPage(function(){
    $('input', function(length) {
      console.log(this.length);
      console.log(length);
      $.close();
    });
  });
});
