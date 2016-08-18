'use strict'

// REQUIRES
// - jquery hotkeys

var selectedNode;

$(document).bind('keydown', 'up', function(e) {
    e.preventDefault();

    if (!selectedNode || !selectedNode.parent) {
      return;
    }

    var childIndex = parseInt(selectedNode.getPath().slice(-1)[0]);
    if (childIndex == 0) {
      return;
    }

    select(selectedNode.parent.getChild(childIndex - 1));
    selectedNode.goto();
});

$(document).bind('keydown', 'down', function(e) {
    e.preventDefault();

    if (!selectedNode || !selectedNode.parent) {
      return;
    }

    var childIndex = parseInt(selectedNode.getPath().slice(-1)[0]);
    try {
      var child = selectedNode.parent.getChild(childIndex + 1);
      select(child);
      selectedNode.goto();
    } catch (e) {}
});

$(document).bind('keydown', 'left', function(e) {
    e.preventDefault();

    if (!selectedNode || !selectedNode.parent) {
      return;
    }
    select(selectedNode.parent);
    selectedNode.goto();
});

$(document).bind('keydown', 'right', function(e) {
    e.preventDefault();

    if (!selectedNode) {
      return;
    }
    try {
      selectedNode.expand();
      select(selectedNode.getChild(0));
      selectedNode.goto();
    } catch (e) {}
});

$(document).bind('keydown', 'space', function(e) {
    e.preventDefault();
    if (selectedNode) {
      selectedNode.toggleExpand();
      selectedNode.goto();
    }
});

function selectClick(node) {
  node.toggleExpand();
  select(node);
  console.info(window.getSelection().anchorNode.parentNode);
}

function select(node) {
  selectedNode = node;
  $('.selected').removeClass('selected');
  node.select();
}

function clearSelection() {
    if(document.selection && document.selection.empty) {
        document.selection.empty();
    } else if(window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
}
