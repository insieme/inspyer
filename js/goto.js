'use strict'

// REQUIRES
// - message

var gotoRootNode;

function gotoNodeById(id) {
  var target = "#node-" + id;
  if (window.location.hash == target) {
    scrollToHash();
  } else {
    window.location.hash = target;
  }
}

function gotoNode(path) {
  gotoNodeById('0' + path.map(function(i) { return '-' + i; }).join(''));
}

$('#goto-box').submit(function(e) {
    e.preventDefault();
    if (!gotoRootNode) {
      addMessage('No Tree Loaded', 'Click the load button to load a tree.', 'danger', 3000);
      return
    }
    gotoNodeById($('#goto-box input').val().trim());
});

function scrollToHash() {
  if (!gotoRootNode) return;

  var id = window.location.hash.slice(6);
  var path = id.split('-').slice(1);

  $('#goto-box input').val(id);
  $('.node .flash').removeClass('flash');

  try {
    var target = gotoRootNode.walk(path, function(node) {
        node.expand();
    }).goto();
    select(target);
    target.flash();
    target.expand();
  } catch(e) {
    if (e.stack) {
      console.log(e.stack);
      addMessage('Invalid Path', 'See console output.', 'danger', 5000)
    } else {
      addMessage('Invalid Path', e, 'danger', 0)
    }
  }
}

window.onhashchange = scrollToHash;
