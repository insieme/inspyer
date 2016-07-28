'use strict'

// REQUIRES
// - message

var gotoRootNode;

function gotoNodeById(root, id) {
  gotoNode(root, id.split('-').slice(1));
}

function gotoNode(root, path) {
  $('#goto-box input').val(
    '0' + path.map(function(i) { return '-' + i; }).join('')
  );
  $('.node .flash').removeClass('flash');
  root.walk(path, function(node) {
      node.expand();
  }).goto().flash();
}

$('#goto-box').submit(function(e) {
    e.preventDefault();
    gotoNodeById(gotoRootNode, $('#goto-box input').val());
});
