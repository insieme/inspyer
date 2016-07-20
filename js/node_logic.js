'use strict'

// ------------------------------------------------------------ Register

// register load
$('#input-tree').on('change', function(e) {
    // TODO fix file reader
    return undefined;

    var reader = new FileReader();
    reader.onload = function() {
      tree = JSON.parse(reader.result);
      loadRoot();
    }
    reader.readAsText(e.target.files[0]);
});

// register goto
$('#goto-box').submit(function(e) {
    e.preventDefault();
    gotoNode(id2addr($('#goto-box input').val()));
});

// ------------------------------------------------------------ Events

function on_NodeExpand(id) {
  $('#' + id + '> .controls > a').text('[-]');

  // load children
  var address = id2addr(id);
  var node = resolve(address);
  for (var i = 0; i < node['Children'].length; i++) {
    showNode(address.concat([i]));
  }

  // open next if only one child
  if (node['Children'].length == 1) {
    $('#' + id + '-0 > .controls > a').click();
  }
}

function on_NodeCollapse(id) {
  $('#' + id + '> .controls > a').text('[+]');
}


// ------------------------------------------------------------ Logic

// Expand folds to target node, scroll there and highlight target.
function gotoNode(address) {
  var id = addr2id(address);

  // expand folds
  for (var i = 0; i < address.length; i++) {
    $('#' + addr2id(address.slice(0, i)) + '> .body').collapse('show');
  }

  // scroll to target
  $('html, body').animate({
      scrollTop: $('#' + id).offset().top - 200
  }, 400);

  // highlight
  $('#' + id).addClass('flash');
}

// Create DOM element representing a Node.
function mkNode(address) {
  var node = resolve(address);
  var id = addr2id(address);

  var body = "";
  if (node['Value']) {
    body = $('<pre>').text('Value: ' + node['Value']);
  }

  return $('<div class="node" >').attr('id', id).append(
    $('<div class="controls">').append(
      $('<a role="button" data-toggle="collapse">').attr('data-target', '#' + id + '-body').text('[+]')
    ),

    $('<div class="displaytext">').append(
      $('<span class="kind">').text(node['Kind']),
      $('<span class="address">').text('[ ' + id + ' ]')
    ),

    $('<div class="body collapse">').attr('id', id + '-body').append(
      $('<div class="text">').html(body),
      $('<div class="children">')
    ).on('show.bs.collapse', function(e) {
        e.stopPropagation();
        on_NodeExpand(id);
    }).on('hide.bs.collapse', function(e) {
        e.stopPropagation();
        on_NodeCollapse(id);
    }).on('hidden.bs.collapse', function(e) {
        e.stopPropagation();
        $('#' + id + '> .body > .children').empty();
    })
  );
}

// Attach node, assuming parent node is already there>
function showNode(address) {
  var id = addr2id(address);
  if ($('#' + id).length > 0) {
    return;
  }

  var parentId = addr2id(address.slice(0, -1));
  $('#' + parentId + '> .body > .children').append(mkNode(address));
}

// Attach root node.
function loadRoot() {
  $('#tree').html(mkNode([]));
}

// ------------------------------------------------------------ Utilites

function id2addr(id) {
  return id.split("-").slice(1);
}

function addr2id(address) {
  if (address.length == 0) {
    return '0';
  } else {
    return '0-' + address.join('-');
  }
}

var resolveCache = {};

function resolve(address) {
  var id = addr2id(address);

  // check cache
  var node = resolveCache[id];

  if (!node) {
    node = tree['root']
    for (var i = 0; i < address.length; i++) {
      node = tree[node]['Children'][address[i]];
    }
    node = tree[node];
    resolveCache[id] = node;
  }

  return node;
}

function forAllNodes(f, address = []) {
  var node = resolve(address);
  f(address, node);
  for (var i = 0; i < node['Children'].length; i++) {
    forAllNodes(f, address.concat([i]));
  }
}
