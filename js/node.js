'use strict'

function Node(ref, tree, id='0') {
  this.id = id;
  this.ref = ref;
  this.tree = tree;

  this.kind = tree[ref]['Kind'];
  this.value = tree[ref]['Value'];
  this.inputNodeChildren = tree[ref]['Children'] || [];

  this.children = [];
}

Node.prototype.getAddress = function() {
  return this.id.substring(this.id.indexOf('0')).split('-').slice(1);
}

Node.prototype.walkPath = function(address, fun) {
  var node = this;
  for (var i in address) {
    if (fun) fun(node);
    node = node.getChild(address[i]);
  }
  if (fun) fun(node);
  return node;
}

Node.prototype.loadChild = function(index) {
  for (var i = this.children.length; i <= index; i++) {
    this.children[i] = new Node(this.inputNodeChildren[i], this.tree, this.id + '-' + i);
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
  this.element.remove();
  this.element = undefined;
}

Node.prototype.buildElement = function() {
  var node = this;

  console.info('build element');
  return $('<div class="node">').attr('id', this.id).addClass(this.hlClass()).append(
    $('<div class="controls">').append(
      $('<a role="button" data-toggle="collapse">').attr('data-target', '#' + this.id + '-body').text('[+]')
    ),

    $('<div class="displaytext">').append(
      $('<span class="btn bookmark glyphicon">').addClass('glyphicon-star'),
      $('<span class="address">').text('[ ' + this.id + ' ]'),
      $('<span class="kind">').text(this.kind),
      $('<span class="type">').html('<span class="label label-info">' + this.displayType() + '</span>'),
      $('<span class="value">').html(this.displayValue()),
      $('<span class="variable">').html(this.displayVariable()),
      $('<span class="meta-label">')
    ),

    $('<div class="body collapse">').attr('id', this.id + '-body').append(
      $('<div class="text">').html('TODO'),
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
  this.flash();
}

Node.prototype.flash = function() {
  this.getElement().addClass('flash');
  var node = this;
  setTimeout(function() { node.getElement().removeClass('flash'); }, 2000);
}

Node.prototype.hlClass = function() {
  // type
  var types = ['Types', 'FunctionType', 'GenericType', 'TupleType',
               'TypeVariable'];
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
    value = this.getChild(1).getChild(1).value;
  }

  return '<span class="label label-default">' + value + '</span>';
}

Node.prototype.displayVariable = function() {
  var variable = '';

  if (this.kind == 'Variable') {
    variable = this.getChild(1).value;
  }

  if (this.kind == 'Declaration') {
    variable = this.getChild(1).getChild(1).value;
  }

  if (this.kind == 'DeclarationStmt') {
    variable = this.getChild(1).getChild(1).value;
  }

  if (this.kind == 'Parameters') {
    variable = ' [ ' + this.getChildren().map(function(c) {
        return c.displayVariable();
    }).join(' , ') + ' ] ';
  }

  return '<span class="label label-danger">' + variable + '</span>';
}
