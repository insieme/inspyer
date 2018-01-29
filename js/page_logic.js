'use strict'

// REQUIRES
// - node
// - goto
// - bookmark
// - search
// - message
// - select

var root;
var tree;
var treeFile;
var meta;
var metaFile;

const jqaas_refresh_interval = 10 * 1000; // [ms]
const jqaas_retry_interval = 5000;

$('#input-tree').on('change', function(e) {
    treeFile = e.target.files[0];
    loadTree();
});

$('#input-tree-meta').on('change', function(e) {
    metaFile = e.target.files[0];
    loadMeta();
});

$('#input-tree-reload').click(function() {
    if ($('#input-tree-reload').hasClass('disabled')) {
      return;
    }
    addMessage('Reloading');

    // stop search but keep results
    stopSearch();

    // reload tree
    root.destroyElement();
    loadTree();
});

$('#input-tree-reload-hard').click(function() {
    if ($('#input-tree-reload-hard').hasClass('disabled')) {
      return;
    }
    addMessage('Reloading even harder');

    // clear
    resetSearch();
    bookmarks = [];
    bookmarkIndex = 0;

    // reload tree
    root.destroyElement();
    loadTree();
});

function loadTree() {
  setTitle(treeFile.name);
  var reader = new FileReader();
  reader.onload = function() {
    tree = JSON.parse(this.result);

    // init root
    try {
      root = new Node(tree['root'], tree);
    } catch(e) {
      addMessage('Invalid Tree', 'Could not load tree, double check input file', 'danger', 5000);
      return;
    }

    // init label from meta
    root.onDisplayLabel = function(node) {
      if (meta && meta.labels && meta.labels[node.id]) {
        return meta.labels[node.id];
      } else {
        return '';
      }
    }

    // init body from meta
    root.onDisplayBody = function(node) {
      var $body = $('<div>');

      if (meta &&
          ( (meta.bodies_v2 && meta.bodies_v2[node.id]) ||
            meta.jqaas
          ))
      {
        // meta.bodies_v2, meta.bodies_v2[node.id]
        keepInView.maintain(function(){
          $body.append($('<span>Loading...</span>'))
        })();

        constructAnalysisMeta(node.id, meta)
            .then(keepInView.maintain(function(el){
              $body.empty().append(el.addClass('node-body-analysis'));
            }))
            .fail(function (err) {
              console.error('constructAnalysisMeta fail', err);
              var retry = $('<a class="retry-btn">(retry)</a>')
                  .on('click', function() {
                    $body.replaceWith(node.onDisplayBody(node));
                  });

              $body.empty().append($('<span>Failed</span>'), retry);
            });
      } else if (meta && meta.bodies && meta.bodies[node.id]) {
        $body.empty().append(
          $('<div>').addClass('node-body-text').html(meta.bodies[node.id])
        );
      }

      return $body;
    }

    // init goto
    gotoRootNode = root;

    // init bookmark
    root.isBookmarked = function(node) {
      return bookmarks.indexOf(node.id) >= 0
    };
    root.onBookmarkAdd = function(node) {
      bookmarks.push(node.id);
      bookmarks.sort();
    };
    root.onBookmarkRemove = function(node) {
      var index = bookmarks.indexOf(node.id);
      bookmarks.splice(index, 1);
    };

    // init search
    root.onClick = selectClick;
    searchRootNode = root;

    // init select
    select(root);

    // enable meta and reload
    $('#input-tree-meta').prop('disabled', false);
    $('#input-tree-meta-btn').removeClass('disabled');
    $('#input-tree-reload').removeClass('disabled')
    $('#input-tree-reload-hard').removeClass('disabled');

    // splice root
    $('#tree').html(root.getElement());

    // reload meta
    if (metaFile) {
      loadMeta(true);
    }

    addMessage('Loaded Tree', '<span class="glyphicon glyphicon-file"></span> ' + treeFile.name);

    // size warning
    if (Object.keys(tree).length > 5000) {
      addMessage('Big Tree', 'The loaded tree contains more than 5000 (shared) nodes, search be slow or crash', 'warning', 6000);
    }

    // scroll somewhere
    if (window.location.hash) {
      scrollToHash();
    } else {
      $('html, body').stop().animate({ scrollTop: 0 }, 300);
    }
  }
  console.info('Loading: ' + treeFile.name);
  reader.readAsText(treeFile);
}

function loadMeta(noScroll) {
  var promise = $.Deferred().resolve();
  if(loadMeta.isJQaaSAvailable === undefined) {
    promise = $.get('api')
        .then(function ok() {
          loadMeta.isJQaaSAvailable = true;
        }, function fail() {
          loadMeta.isJQaaSAvailable = false;
        })
        .always(function() {
          console.log('loadMeta.isJQaaSAvailable', true);
          const MB = 1024 * 1024;
          const useJQaaS =
              metaFile.size > 100 * MB
              && loadMeta.isJQaaSAvailable;

          $('#settings-jqaas-enabled').prop('checked', useJQaaS);

          addMessage('Using JSON web service', 'Metadata file is >100MB');
        })
  }

  promise
      .then(function() {
        loadMetaGeneric(metaFile)
            .then(function(meta) {
              window.meta = meta;
              handleMetaLoaded(meta, noScroll);
            }, function(err) {
              addMessage('Loading Meta failed', '' + err + '. Check your network connection.', 'danger', 5000);
            });
      });
}

function loadMetaGeneric(file) {
  return $('#settings-jqaas-enabled').is(':checked')
          ? loadMetaJqaas(file)
          : loadMetaJson(file)
}

function handleMetaLoaded(meta, noScroll)
{
  // add bookmarks
  if (meta.bookmarks) {
    bookmarks = bookmarks.concat(meta.bookmarks);
    bookmarks = Array.from(new Set(bookmarks));
    bookmarks.sort();
  }

  // jump to first bookmark
  if (bookmarks.length > 0 && !noScroll) {
    gotoNodeById(bookmarks[0]);
  }

  // expands
  for (var i in meta.expands) {
    var path = meta.expands[i].split('-').slice(1);
    root.walk(path, function(node) { node.expand(); }, true);
  }

  // highlights
  for (var i in meta.highlights) {
    var path = meta.highlights[i].split('-').slice(1);
    root.walk(path).addHl();
  }

  // refresh
  root.refreshElement();

  addMessage('Loaded Meta', '<span class="glyphicon glyphicon-file"></span> ' + metaFile.name);
}

function loadMetaJson(file) {
  console.info('Loading Meta: ' + file.name);

  var reader = new FileReader();
  var promise = $.Deferred();
  reader.onerror = function(err) { promise.reject(err); };
  reader.onload  = function() { promise.resolve(JSON.parse(this.result)); };
  reader.readAsText(file);
  return promise;
}

function loadMetaJqaas(file, opts) {
  console.info('Loading JQaaS Meta: ' + file.name);

  const apiEndpointUrl = new URL("api/", window.location.href);
  var promise = opts && opts.promise ? opts.promise : $.Deferred();

  if(loadMetaJqaas.refreshIntervalId)
    clearInterval(loadMetaJqaas.refreshIntervalId);

  if(loadMetaJqaas.retryTimeoutId)
    cancelTimeout(loadMetaJqaas.retryTimeoutId);

  putJSON(apiEndpointUrl, file)
      .then(function(resp){
        if(!resp.ok) {
          promise.reject('HTTP Error: ' + resp.status + ' ' + resp.statusText);
          return;
        }

        const new_resource_url =
            new URL(resp.headers.get("Location"), apiEndpointUrl);
        console.log("JQaaS post done", new_resource_url, resp);

        promise.resolve({ jqaas: new_resource_url });

        loadMetaJqaas.refreshIntervalId =
            setInterval(metaKeepAlive, jqaas_refresh_interval, new_resource_url);

      }, function(err){
        console.log("JQaaS put error:", err);

        if(opts && opts.retry) {
          opts.promise = promise;
          loadMetaJqaas.retryTimeoutId =
              setTimeout(loadMetaJqaas, jqaas_retry_interval, file, opts);
        } else {
          promise.reject(err);
        }
      });

  return promise;
}

function metaKeepAlive(new_resource_url) {
  if(metaKeepAlive.busy)
    return;
  metaKeepAlive.busy = true;

  getJSON(mkJQaaSURL(new_resource_url, 'null'))
      .always(function () {
        metaKeepAlive.busy = false;
      })
      .then(function ok() {
        $('.retry-btn').click();
      }, function fail() {
        loadMetaJqaas(file, { retry: true })
            .then(function() {
              $('.retry-btn').click();
            });
      });
}

function setTitle(title) {
  $('title').text(title);
  $('#filename').text(title);
  $('#filename-box').show();
}
