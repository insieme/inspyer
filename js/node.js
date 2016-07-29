'use strict'

function Node(ref, tree, id='0') {
  this.id = id;
  this.ref = ref;
  this.tree = tree;

  this.kind = tree[ref]['Kind'];
  this.value = tree[ref]['Value'];
  this.inputNodeChildren = tree[ref]['Children'] || [];

  this.children = [];

  this.onDisplayLabel = function() { return ''; };
  this.onDisplayBody = function() { return ''; };
}

Node.prototype.getPath = function() {
  return this.id.substring(this.id.indexOf('0')).split('-').slice(1);
}

Node.prototype.walk = function(path, fun, onLast=false) {
  var node = this;
  for (var i in path) {
    if (fun) fun(node);
    node = node.getChild(path[i]);
  }
  if (fun && onLast) fun(node);
  return node;
}

Node.prototype.loadChild = function(index) {
  for (var i = this.children.length; i <= index; i++) {
    this.children[i] = new Node(this.inputNodeChildren[i], this.tree, this.id + '-' + i);

    // attach label and body callbacks
    this.children[i].onDisplayLabel = this.onDisplayLabel;
    this.children[i].onDisplayBody = this.onDisplayBody;

    // attach bookmark callbacks
    this.children[i].isBookmarked = this.isBookmarked;
    this.children[i].onBookmarkAdd = this.onBookmarkAdd;
    this.children[i].onBookmarkRemove = this.onBookmarkRemove;
  }
}

Node.prototype.getChild = function(index) {
  this.loadChild(index);
  return this.children[index];
}

Node.prototype.getChildren = function() {
  for (var i in this.inputNodeChildren) {
    this.loadChild(i);
  }
  return this.children;
}

Node.prototype.getElement = function() {
  if (!this.element) {
    this.element = this.buildElement();
  }
  return this.element;
}

Node.prototype.destroyElement = function() {
  if (this.element) {
    this.element.remove();
    this.element = undefined;
  }

  // propagate destruction, this is necessary to handle correct re-registration
  // of callbacks (button click events and so on)
  for (var i in this.children) {
    this.children[i].destroyElement();
  }
}

Node.prototype.refreshElement = function() {
  if (!this.element) {
    return;
  }

  // bookmark button
  this.element.find('> .displaytext > .bookmark').replaceWith(this.bookmarkButton());

  // meta information
  this.element.find('> .displaytext > .meta-label').html(this.onDisplayLabel(this));
  this.element.find('> .body > .text').html(this.onDisplayBody(this));

  // propagate
  for (var i in this.children) {
    this.children[i].refreshElement();
  }
}

Node.prototype.bookmarkButton = function () {
  if (!this.onBookmarkAdd || !this.onBookmarkRemove || !this.isBookmarked) {
    return '';
  }
  var node = this;
  var bookmark = $('<span class="btn bookmark glyphicon">').click(function () {
      if (node.isBookmarked(node)) {
        node.onBookmarkRemove(node);
        bookmark.addClass('glyphicon-star-empty').removeClass('glyphicon-star');
      } else {
        node.onBookmarkAdd(node);
        bookmark.addClass('glyphicon-star').removeClass('glyphicon-star-empty');
      }
  });
  if (this.isBookmarked(this)) {
    bookmark.addClass('glyphicon-star');
  } else {
    bookmark.addClass('glyphicon-star-empty');
  }
  return bookmark;
}

Node.prototype.buildElement = function() {
  var node = this;
  return $('<div class="node">').attr('id', this.id).addClass(this.hlClass()).append(
    $('<div class="controls">').append(
      $('<a role="button" data-toggle="collapse">').attr('data-target', '#' + this.id + '-body').text('[+]')
    ),

    $('<div class="displaytext">').append(
      this.bookmarkButton(),
      $('<span class="path">').text('[ ' + this.id + ' ]'),
      $('<span class="kind">').text(this.kind),
      $('<span class="type">').html('<span class="label label-info">' + this.displayType() + '</span>'),
      $('<span class="value">').html('<span class="label label-default">' + String(this.displayValue()) + '</span>'),
      $('<span class="variable">').html('<span class="label label-danger">' + String(this.displayVariable()) + '</span>'),
      $('<span class="meta-label">').html(this.onDisplayLabel(this))
    ),

    $('<div class="body collapse">').attr('id', this.id + '-body').append(
      $('<div class="text">').html(this.onDisplayBody(this)),
      $('<div class="children">')
    ).on('show.bs.collapse', function (e) {
        e.stopPropagation();
        node.onExpand();
    }).on('hide.bs.collapse', function(e) {
        e.stopPropagation();
        node.onCollapse();
    }).on('hidden.bs.collapse', function(e) {
        e.stopPropagation();
        node.onCollapsed();
    })
  );
}

Node.prototype.expand = function() {
  this.getElement().find('> .collapse').collapse('show');
}

Node.prototype.onExpand = function() {
  this.getElement().find('> .controls > a').text('[-]');
  this.getElement().find('> .body > .children').append(
    this.getChildren().map(function(c) { return c.getElement(); })
  );

  // propagate expand
  if (this.getChildren().length == 1) {
    this.getChild(0).expand();
  }
}

Node.prototype.collapse = function () {
  this.getElement().find('> .collapse').collapse('hide');
}

Node.prototype.onCollapse = function() {
  this.getElement().find('> .controls > a').text('[+]');
}

Node.prototype.onCollapsed = function() {
  this.getChildren().map(function(c) { c.destroyElement(); });
}

Node.prototype.goto = function() {
  // scroll to target
  $('html, body').animate({
      scrollTop: this.getElement().offset().top - 200
  }, 400);
  return this;
}

Node.prototype.flash = function() {
  this.getElement().addClass('flash');
  var node = this;
  setTimeout(function() { node.getElement().removeClass('flash'); }, 2000);
  return this;
}

Node.prototype.addHl = function () {
  this.getElement().addClass('node-hl');
}

Node.prototype.removeHl = function () {
  this.getElement().removeClass('node-hl');
}

Node.prototype.hlClass = function() {
  // type
  var types = ['Types', 'FunctionType', 'GenericType', 'TupleType',
               'TypeVariable', 'TagType', 'TagTypeReference'];
  if (types.indexOf(this.kind) >= 0) {
    return 'node-hl-type';
  }

  // value
  if (this.value || this.kind == 'Literal') {
    return 'node-hl-value';
  }

  // variable
  if (this.kind == 'Variable') {
    return 'node-hl-variable';
  }

  return '';
}

Node.prototype.displayType = function() {
  if (this.kind == 'NumericType') {
    return this.getChild(0).getChild(1).value;
  }

  if (this.kind == 'TypeVariable') {
    return this.getChild(0).value;
  }

  if (this.kind == 'TupleType') {
    return ' ( ' + this.getChildren().map(function(c) {
        return c.displayType();
    }).join(' ') + ' ) ';
  }

  if (this.kind == 'Types') {
    return ' [ ' + this.getChildren().map(function(c) {
        return c.displayType();
    }) + ' ] ';
  }

  if (this.kind == 'GenericType') {
    var types = this.getChild(2).getChildren().map(function(c) {
        return c.displayType();
    });
    if (types.length > 0) {
      return this.getChild(0).value + '&lt;' + types.join(' , ') + '&gt;';
    } else {
      return this.getChild(0).value;
    }
  }

  if (this.kind == 'TagType') {
    return this.getChild(0).getChild(0).value;
  }

  if (this.kind == 'TagTypeReference') {
    return '^' + this.getChild(0).value;
  }

  if (this.kind == 'FunctionType') {
    var to = '&nbsp;&nbsp;<span class="glyphicon glyphicon-arrow-right"></span>&nbsp;&nbsp;'
    return this.getChild(0).displayType() + to + this.getChild(1).displayType();
  }

  return ''
}

Node.prototype.displayValue = function() {
  var value = this.value || '';

  if (this.kind == 'Literal') {
    value = this.getChild(1).value;
  }

  if (this.kind == 'CallExpr' || this.kind == 'InitExpr') {
    if (this.getChild(1).getChild(1).value) {
      value = this.getChild(1).getChild(1).value;
    }
  }

  return value;
}

Node.prototype.displayVariable = function() {
  var variable = '';

  if (this.kind == 'Variable') {
    variable = this.getChild(1).value;
  }

  if (this.kind == 'Declaration') {
    if (this.getChild(1).getChild(1).value) {
      variable = this.getChild(1).getChild(1).value;
    }
  }

  if (this.kind == 'DeclarationStmt') {
    variable = this.getChild(1).getChild(1).value;
  }

  if (this.kind == 'Parameters') {
    variable = ' [ ' + this.getChildren().map(function(c) {
        return c.displayVariable();
    }).join(' , ') + ' ] ';
  }

  return variable;
}
