'use strict'

// REQUIRES
// - node
// - goto
// - bookmark
// - search

var root;
var tree;
var meta;

$('#input-tree').on('change', function(e) {
    loadTree(e.target.files[0]);
});

$('#input-tree-meta').on('change', function(e) {
    loadMeta(e.target.files[0]);
});

$('#input-tree-reload').click(function() {
    if ($('#input-tree-reload').hasClass('disabled')) {
      return;
    }
    console.info('Reloading');

    // stop search but keep results
    stopSearch();

    // reload tree
    root.destroyElement();
    loadTree($('#input-tree')[0].files[0]);
});

$('#input-tree-reload-hard').click(function() {
    if ($('#input-tree-reload-hard').hasClass('disabled')) {
      return;
    }
    console.info('Reloading even harder');

    // clear
    resetSearch();

    // reload tree
    root.destroyElement();
    loadTree($('#input-tree')[0].files[0]);
});

function loadTree(file) {
  setTitle(file.name);
  var reader = new FileReader();
  reader.onload = function() {
    tree = JSON.parse(this.result);

    // init root
    root = new Node(tree['root'], tree);

    // init label / body from meta
    root.onDisplayLabel = function(node) {
      if (meta && meta.labels && meta.labels[node.id]) {
        return meta.labels[node.id];
      } else {
        return '';
      }
    }
    root.onDisplayBody = function(node) {
      if (meta && meta.bodies && meta.bodies[node.id]) {
        return meta.bodies[node.id];
      } else {
        return '';
      }
    }

    // init goto
    gotoRootNode = root;

    // init bookmark
    bookmarkRootNode = root;
    root.isBookmarked = function(node) {
      return bookmarks.indexOf(node.id) >= 0
    };
    root.onBookmarkAdd = function(node) {
      bookmarks.push(node.id);
      bookmarks.sort();
    };
    root.onBookmarkRemove = function(node) {
      var index = bookmarks.indexOf(node.id);
      bookmarks.splice(index, 1);
    };

    // init search
    searchRootNode = root;

    // enable meta and reload
    $('#input-tree-meta').prop('disabled', false);
    $('#input-tree-meta-btn').removeClass('disabled');
    $('#input-tree-reload').removeClass('disabled')
    $('#input-tree-reload-hard').removeClass('disabled');

    // splice root
    $('#tree').html(root.getElement());

    // reload meta
    if ($('#input-tree-meta')[0].files[0]) {
      loadMeta($('#input-tree-meta')[0].files[0]);
    }
  }
  console.info('Loading: ' + file.name);
  reader.readAsText(file);
}

function loadMeta(file) {
  var reader = new FileReader();
  reader.onload = function() {
    meta = JSON.parse(this.result);

    // add bookmarks
    if (meta.bookmarks) {
      bookmarks = bookmarks.concat(meta.bookmarks);
      bookmarks = Array.from(new Set(bookmarks));
      bookmarks.sort();
    }

    // jump to first bookmark
    if (bookmarks.length > 0) {
      gotoNodeById(root, bookmarks[0]);
    }

    // expands
    for (var i in meta.expands) {
      var path = meta.expands[i].split('-').slice(1);
      root.walk(path, function(node) { node.expand(); }, true);
    }

    // highlights
    for (var i in meta.highlights) {
      var path = meta.highlights[i].split('-').slice(1);
      root.walk(path).addHl();
    }

    // refresh
    root.refreshElement();
  }
  console.info('Loading Meta: ' + file.name);
  reader.readAsText(file);
}

function setTitle(title) {
  $('title').text(title);
  $('#filename').text(title);
  $('#filename-box').show();
}
