'use strict'

// var tree = {};

// register load
$('#input-tree').on('change', function(e) {
    var reader = new FileReader();
    reader.onload = function() {
      tree = JSON.parse(reader.result);
      loadRoot();
    }
    reader.readAsText(e.target.files[0]);
});

// register goto
$('#goto-box button').click(function(e) {
    var id = $('#goto-box input').val();
    gotoNode(id2addr(id));
    $('html, body').animate({
        scrollTop: $('#' + id).offset().top - 200
    }, 400);
    $('#' + id).addClass('flash');
});
$('#goto-box input').keydown(function(e) {
    if (e.keyCode == 13) {
      $('#goto-box button').click();
    }
});

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

function gotoNode(address) {
  for (var i = 0; i < address.length; i++) {
    $('#' + addr2id(address.slice(0, i)) + '> .body').collapse('show');
  }
}

function expandNode(id) {
  $('#' + id + '> .controls > a').text('[-]');

  // load children
  var address = id2addr(id);
  var node = resolve(address);
  for (var i = 0; i < node['Children'].length; i++) {
    var addr = address.concat([i]);
    appendNode(addr, resolve(addr));
  }

  // open next if only one child
  if (node['Children'].length == 1) {
    $('#' + id + '-0 > .controls > a').click();
  }
}

function collapseNode(id) {
  $('#' + id + '> .controls > a').text('[+]');
}

function mkNode(id, node) {
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
        expandNode(id);
    }).on('hide.bs.collapse', function(e) {
        e.stopPropagation();
        collapseNode(id);
    }).on('hidden.bs.collapse', function(e) {
        e.stopPropagation();
        $('#' + id + '> .body > .children').empty();
    })
  );
}

function appendNode(address, node) {
  if (address.length == 0) {
    $('#tree').append(mkNode('0', node));
  } else {
    var parentId;
    if (address.length == 1) {
      parentId = "0";
    } else {
      parentId = "0-" + address.slice(0, -1).join('-');
    }
    var id = "0-" + address.join('-');
    $('#' + parentId + '> .body > .children').append(mkNode(id, node));
  }
}

function loadRoot() {
  appendNode([], resolve([]));
}

function resolve(address) {
  var node = tree['root'];
  for (var i = 0; i < address.length; i++) {
    node = tree[node]['Children'][address[i]];
  }
  return tree[node];
}

function forAllNodes(f, address = []) {
  var node = resolve(address);
  f(address, node);
  for (var i = 0; i < node['Children'].length; i++) {
    forAllNodes(f, address.concat([i]));
  }
}
