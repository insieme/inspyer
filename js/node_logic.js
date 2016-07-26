'use strict'

// ------------------------------------------------------------ Globals

var tree = {}
var resolveCache = {};
var meta = {};
var bookmarkIndex = 0;
var bookmarks = [];
var searchIndex = -1;
var searchResults = [];
var searchWorker = false;

// ------------------------------------------------------------ Register

// register load
$('#input-tree').on('change', function() {
    $('#input-tree-meta').val('');
    bookmarks = [];
    loadInputTree();
});
$('#input-tree-reload').click(loadInputTree);
$('#input-tree-reload-hard').click(function () {
    bookmarks = [];
    loadInputTree();
});
function loadInputTree() {
  var file = $('#input-tree')[0].files[0]
  var reader = new FileReader();
  reader.onload = function() {
    tree = JSON.parse(this.result);
    $('title').text(file.name);
    $('#filename').text(file.name);
    $('#filename-box').show();
    $('#tree').empty();
    loadRoot();
    if ($('#input-tree-meta')[0].files.length > 0) {
      loadInputTreeMeta();
    }
  }
  console.info('Loading: ' + file.name);
  reader.readAsText(file);
}

// register bookmark buttons
$('#bookmark-forward').click(function () {
    if (bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex + 1) % bookmarks.length;
      gotoNode(id2addr(bookmarks[bookmarkIndex]));
      $('#goto-box input').val(bookmarks[bookmarkIndex]);
    }
});
$('#bookmark-backward').click(function () {
    if (bookmarks.length > 0) {
      bookmarkIndex = (bookmarkIndex - 1 + bookmarks.length) % bookmarks.length;
      gotoNode(id2addr(bookmarks[bookmarkIndex]));
      $('#goto-box input').val(bookmarks[bookmarkIndex]);
    }
});

// register load meta
$('#input-tree-meta').on('change', loadInputTreeMeta);
function loadInputTreeMeta() {
  var file = $('#input-tree-meta')[0].files[0];
  var reader = new FileReader();
  reader.onload = function() {
    meta = JSON.parse(this.result);
    loadMeta();
  }
  console.info('Loading meta: ' + file.name);
  reader.readAsText(file);
}

// register goto
$('#goto-box').submit(function(e) {
    e.preventDefault();
    gotoNode(id2addr($('#goto-box input').val()));
});

// register search
$('#search-box').submit(function(e) {
    e.preventDefault();
    if (!searchWorker) {
      // spawn search worker
      var blob = new Blob([$('#search-worker').text()], {type: 'text/javascript'});
      searchWorker = new Worker(window.URL.createObjectURL(blob));
      searchWorker.onmessage = function(e) {
        if (e.data.finished) {
          $('#search-box input').removeClass('flash');
          $('#search-box button').removeClass('flash');
        } else {
          searchResults.push(e.data.addr);
          if (searchIndex < 0) {
            searchIndex = 0;
            $('#goto-box input').val(addr2id(searchResults[searchIndex]));
            gotoNode(searchResults[0]);
          }
        }
      }

      // clear results
      searchIndex = -1;
      searchResults = [];

      // go
      searchWorker.postMessage({
          tree: tree,
          needle: $('#search-box input').val()
      });
      $('#search-box input').addClass('flash');
      $('#search-box button').addClass('flash');
    } else if (searchResults.length > 0) {
      searchIndex = (searchIndex + 1) % searchResults.length;
      $('#goto-box input').val(addr2id(searchResults[searchIndex]));
      gotoNode(searchResults[searchIndex]);
    }
});
$('#search-box-backward').click(function() {
    if (searchWorker && searchResults.length > 0) {
      searchIndex = (searchIndex - 1 + searchResults.length) % searchResults.length;
      $('#goto-box input').val(addr2id(searchResults[searchIndex]));
      gotoNode(searchResults[searchIndex]);
    }
});
$('#search-box input').on('change', function() {
    if (searchWorker) {
      searchWorker.terminate();
      searchWorker = false;
      $('#search-box input').removeClass('flash');
      $('#search-box button').removeClass('flash');
    }
});

setInterval(function() {
  var index = searchIndex < 0 ? 0 : (searchIndex + 1)
  $('#search-results').text(index + ' / ' + searchResults.length);
}, 200);

// ------------------------------------------------------------ Events

function on_NodeExpand(id) {
  $('#' + id + '> .controls > a').text('[-]');

  var address = id2addr(id);
  var node = resolve(address);

  // done if leaf
  if (!('Children' in node)) {
    return;
  }

  // load children
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

// Expand folds to target node.
function expandToNode(address) {
  var id = addr2id(address);
  for (var i in address) {
    $('#' + addr2id(address.slice(0, i)) + '> .body').collapse('show');
  }
}

// Expand folds to target node, scroll there and highlight target.
function gotoNode(address) {
  var id = addr2id(address);

  expandToNode(address);

  // scroll to target
  $('html, body').animate({
      scrollTop: $('#' + id).offset().top - 200
  }, 400);

  // highlight
  $('.node .flash').removeClass('flash');
  $('#' + id).addClass('flash');
  setTimeout(function() {
      $('#' + id).removeClass('flash');
  }, 2000);
}

// Create DOM element representing a Node.
function mkNode(address) {
  var node = resolve(address);
  var id = addr2id(address);

  // node highlighting
  var hl = '';
  if (isType(node)) {
    hl = 'node-hl-type';
  } else if (node['Value'] || node['Kind'] == 'Literal') {
    hl = 'node-hl-value';
  } else if (node['Kind'] == 'Variable') {
    hl = 'node-hl-variable';
  }

  // bookmark
  var bm = $('<span class="bookmark glyphicon btn">').click(function() {
      if (bookmarks.indexOf(id) < 0) {
        addBookmark(id);
      } else {
        removeBookmark(id);
      }
  });
  if (bookmarks.indexOf(id) < 0) {
    bm.addClass('glyphicon-star-empty');
  } else {
    bm.addClass('glyphicon-star');
  }

  // add type
  var type = '';
  if (node['Kind'] == 'Types') {
    type = getTypes(node).map(function(t) {
        return '<span class="label label-info">' + t + '</span>';
    }).join(' ');
  } else if (node['Kind'] == 'FunctionType') {
    var param = getTypes(tree[node['Children'][0]]).join(', ');
    var ret = getTypes(tree[node['Children'][1]]);
    type = '<span class="label label-info">( ' + param + ' ) &nbsp;&nbsp;<span class="glyphicon glyphicon-arrow-right"></span>&nbsp;&nbsp; ' + ret + '</span>';
  } else if (node['Kind'] == 'TypeVariable') {
    type = '<span class="label label-info">' + tree[node['Children'][0]]['Value'] + '</span>';
  } else {
    type = '<span class="label label-info">' + getTypes(node) + '</span>';
  }

  // add value
  var value = '';
  if (node['Value']) {
    value = '<span class="label label-default">' + node['Value'] + '</span>';
  } else if (node['Kind'] == 'Literal') {
    value = tree[node['Children'][1]]['Value'];
    value = '<span class="label label-default">' + value + '</span>';
  } else if (node['Kind'] == 'CallExpr' || node['Kind'] == 'InitExpr') {
    value = tree[node['Children'][1]];
    value = tree[value['Children'][1]]['Value'];
    value = '<span class="label label-default">' + value + '</span>';
  }

  // add variable
  var variable = '';
  if (node['Kind'] == 'Variable') {
    variable = tree[node['Children'][1]]['Value'];
    variable = '<span class="label label-danger">' + variable + '</span>';
  } else if (node['Kind'] == 'DeclarationStmt') {
    variable = tree[node['Children'][1]];
    variable = tree[variable['Children'][1]]['Value'];
    variable = '<span class="label label-danger">' + variable + '</span>';
  } else if (node['Kind'] == 'Parameters') {
    variable = node['Children'].map(function(i) {
      var v = tree[i];
      v = tree[v['Children'][1]]['Value'];
      return '<span class="label label-danger">' + v + '</span>';
    }).join(' ');
  } else if (node['Kind'] == 'Declaration') {
    if (tree[node['Children'][1]]['Kind'] == 'Variable') {
      var v = tree[node['Children'][1]];
      v = tree[v['Children'][1]]['Value'];
      variable = '<span class="label label-danger">' + v + '</span>';
    }
  }

  var body = "";
  if ('bodies' in meta && meta['bodies'] && id in meta['bodies']) {
    body = meta['bodies'][id];
  } else if (node['Value']) {
    body = $('<pre>').text('Value: ' + node['Value']);
  }

  return $('<div class="node" >').attr('id', id).addClass(hl).append(
    $('<div class="controls">').append(
      $('<a role="button" data-toggle="collapse">').attr('data-target', '#' + id + '-body').text('[+]')
    ),

    $('<div class="displaytext">').append(
      bm,
      $('<span class="address">').text('[ ' + id + ' ]'),
      $('<span class="kind">').text(node['Kind']),
      $('<span class="type">').html(type),
      $('<span class="value">').html(value),
      $('<span class="variable">').html(variable),
      $('<span class="meta-label">')
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
  resolveCache = {};
  $('#tree').html(mkNode([]));
  if (bookmarks.length > 0) {
    gotoNode(id2addr(bookmarks[bookmarkIndex]));
  }
}

// ------------------------------------------------------------ Bookmark

function addBookmark(id) {
  if (bookmarks.indexOf(id) < 0) {
    $('#' + id + '> .displaytext > .bookmark').addClass('glyphicon-star').removeClass('glyphicon-star-empty');
    bookmarks.push(id);
    bookmarks.sort();
  }
}

function removeBookmark(id) {
  var index = bookmarks.indexOf(id);
  if (index >= 0) {
    $('#' + id + '> .displaytext > .bookmark').addClass('glyphicon-star-empty').removeClass('glyphicon-star');
    bookmarks.splice(index, 1);
  }
}

// ------------------------------------------------------------ Meta

function loadMeta() {
  for (var i in meta['expands']) {
    expandToNode(id2addr(meta['expands'][i]));
  }

  if (meta['bookmarks']) {
    bookmarks = bookmarks.concat(meta['bookmarks']);
    bookmarks = Array.from(new Set(bookmarks));
    bookmarks.sort();
    if (bookmarks.length > 0) {
      gotoNode(id2addr(bookmarks[0]));
      $('#goto-box input').val(bookmarks[0]);
    }
  }

  for (var id in bookmarks) {
    $('#' + bookmarks[id] + '> .displaytext > .bookmark').addClass('glyphicon-star').removeClass('glyphicon-star-empty');
  }

  for (var id in meta['labels']) {
    $('#' + id + '> .displaytext > .meta-label').html(
      '<span class="label label-success">' + meta['labels'][id] + '</span>'
    );
  }

  for (var i in meta['highlights']) {
    $('#' + meta['highlights'][i]).addClass('node-hl');
  }

  for (var id in meta['bodies']) {
    $('#' + id + '> .body > .text').html(meta['bodies'][id]);
  }
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

function resolve(address) {
  var id = addr2id(address);

  // check cache
  var node = resolveCache[id];
  if (node) {
    return node;
  }

  // walk
  node = tree['root']
  for (var i = 0; i < address.length; i++) {
    node = tree[node]['Children'][address[i]];
  }
  node = tree[node];
  resolveCache[id] = node;

  return node;
}

function forAllNodes(f, node=undefined, address=[]) {
  if (!node) {
    node = tree[tree['root']];
  }

  f(address, node);

  for (var i in node['Children']) {
    forAllNodes(f, tree[node['Children'][i]], address.concat([i]));
  }
}

function isType(node) {
  return (
    node['Kind'] == 'Types'
    || node['Kind'] == 'FunctionType'
    || node['Kind'] == 'GenericType'
    || node['Kind'] == 'TupleType'
    || node['Kind'] == 'TypeVariable'
  );
}

function getTypes(node) {
  if (node['Kind'] == 'GenericType') {
    var types = getTypes(tree[node['Children'][2]]);
    if (types.length == 0) {
      return tree[node['Children'][0]]['Value'];
    }
    return tree[node['Children'][0]]['Value'] + '&lt;' + types.join(' , ') + '&gt;';
  }

  if (node['Kind'] == 'TupleType') {
    return '(' + node['Children'].map(function(gentype) {
        return getTypes(tree[gentype]);
    }).join(' , ') + ')';
  }

  if (node['Kind'] == 'Types') {
    if (!('Children' in node)) {
      return [];
    }
    return node['Children'].map(function(type) {
        return getTypes(tree[type]);
    });
  }

  if (node['Kind'] == 'TypeVariable') {
    return tree[node['Children'][0]]['Value'];
  }

  if (node['Kind'] == 'NumericType') {
    var lit = tree[node['Children'][0]];
    return tree[lit['Children'][1]]['Value'];
  }

  return [];
}
