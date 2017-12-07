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

  var hash = window.location.hash.slice(1);
  var parts = hash.split('#');

  console.log("scrollToHash", hash);

  if (parts.length > 0) {
    var node_addr = parts[0].slice(5);
    var node_path = node_addr.split('-').slice(1);

    $('#goto-box input').val(node_addr);
    $('.node .flash').removeClass('flash');

    try {
      var target = gotoRootNode.walk(node_path, function(node) {
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

  // TODO guard with key
  if (parts.length > 1) {
      var el = $(document.getElementById(hash));
      el.collapse('show');
      el.addClass('flash');
      setTimeout(function() { el.removeClass('flash'); }, 2000);
  }

}

window.onhashchange = scrollToHash;
