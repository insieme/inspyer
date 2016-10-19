'use strict'

var showPath = true;

$('#view-path').click(function() {
    showPath = !showPath;

    if (showPath) {
      $('.node-header-path').show();
    } else {
      $('.node-header-path').hide();
    }
});
