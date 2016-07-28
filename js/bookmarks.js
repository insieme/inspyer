'use strict'

// REQUIRES
// - goto

var bookmarkRootNode;
var bookmarks = [];
var bookmarkIndex = 0;

$('#bookmark-forward').click(function() {
    if (bookmarkRootNode && bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex + 1) % bookmarks.length;
      gotoNodeById(bookmarkRootNode, bookmarks[bookmarkIndex]);
    }
});

$('#bookmark-backward').click(function() {
    if (bookmarkRootNode && bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex - 1 + bookmarks.length) % bookmarks.length;
      gotoNodeById(bookmarkRootNode, bookmarks[bookmarkIndex]);
    }
});
