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

  try {
    root.walk(path, function(node) {
        node.expand();
    }).goto().flash();
  } catch(e) {
    if (e.stack) {
      console.log(e.stack);
      addMessage('Invalid Path', 'See console output.', 'danger', 5000)
    } else {
      addMessage('Invalid Path', e, 'danger', 0)
    }
  }
}

$('#goto-box').submit(function(e) {
    e.preventDefault();
    if (!gotoRootNode) {
      addMessage('No Tree Loaded', 'Click the load button to load a tree.', 'danger', 3000);
      return
    }
    gotoNodeById(gotoRootNode, $('#goto-box input').val());
});
