'use strict'

// REQUIRES
// - goto

var bookmarks = [];
var bookmarkIndex = 0;

$('#bookmark-forward').click(function() {
    if (bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex + 1) % bookmarks.length;
      gotoNodeById(bookmarks[bookmarkIndex]);
    }
});

$('#bookmark-backward').click(function() {
    if (bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex - 1 + bookmarks.length) % bookmarks.length;
      gotoNodeById(bookmarks[bookmarkIndex]);
    }
});
