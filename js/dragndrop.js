'use strict'

window.addEventListener('dragenter', function() {
    $('#dropzone').show();
});

$('#dropzone').on('dragenter', function(e) {
    e.preventDefault();
});

$('#dropzone').on('dragover', function(e) {
    e.preventDefault();
});

$('#dropzone').on('dragleave', function() {
    $('#dropzone').hide();
});

$('#dropzone').on('drop', function(e) {
    e.preventDefault();
    $('#dropzone').hide();
    var files = e.originalEvent.dataTransfer.files;

    // load tree first
    var hasTreeFile = false;
    var hasMetaFile = false;
    for (var i = 0; i < files.length; i++) {
      if (files[i].name.match(/_meta\.json/)) {
        hasMetaFile = true;
        metaFile = files[i];
      } else if (files[i].name.match(/\.json/)) {
        hasTreeFile  = true;
        treeFile = files[i];
      }
    }

    if (hasTreeFile) {
      loadTree();
    } else if (!hasTreeFile && hasMetaFile) {
      loadMeta();
    }
});
