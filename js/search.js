'use strict'

// REQUIRES
// - goto
// - message

var searchRootNode;
var searchResults = [];
var searchIndex = -1;
var searchWorker = false;
var searchResultsRefresher;

// ------------------------------------------------------------ Results Box

function updatesearchResult() {
  var index = searchIndex < 0 ? 0 : (searchIndex + 1)
  $('#search-results').text(index + ' / ' + searchResults.length);
}

function searchResultsRefresherStart() {
  if (!searchResultsRefresher) {
    searchResultsRefresher = setInterval(updatesearchResult, 200);
  }
}

function searchResultsRefresherStop() {
  if (searchResultsRefresher) {
    clearInterval(searchResultsRefresher);
    searchResultsRefresher = undefined;
  }
}

// ------------------------------------------------------------ Search

function startSearch() {
  if (!searchWorker) {
    addMessage('Starting Search');
    // spawn search worker
    var blob = new Blob([$('#search-worker').text()], {type: 'text/javascript'});
    searchWorker = new Worker(window.URL.createObjectURL(blob));
    searchWorker.onmessage = function(e) {
      if (e.data.finished) {
        addMessage('Search finished');
        $('#search-box input').removeClass('flash');
        $('#search-box button').removeClass('flash');
        searchResultsRefresherStop();
      } else {
        searchResults.push(e.data.addr);
        if (searchIndex < 0) {
          searchIndex = 0;
          gotoNode(searchRootNode, searchResults[0]);
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
    searchResultsRefresherStart();
  }
}

function resetSearch() {
  stopSearch();
  searchWorker = false;
  searchIndex = -1;
  searchResults = [];
  updatesearchResult();
}

function stopSearch() {
  if (searchWorker) {
    addMessage('Search stopped');
    searchWorker.terminate();
    $('#search-box input').removeClass('flash');
    $('#search-box button').removeClass('flash');
    searchResultsRefresherStop();
  }
}

// ------------------------------------------------------------ Search controls

$('#search-box').submit(function(e) {
    e.preventDefault();
    if (!searchWorker) {
      startSearch();
    } else if (searchResults.length > 0) {
      searchIndex = (searchIndex + 1) % searchResults.length;
      if (!searchResultsRefresher) {
        updatesearchResult();
      }
      gotoNode(searchRootNode, searchResults[searchIndex]);
    }
});

$('#search-box-backward').click(function() {
    if (!searchWorker) {
      startSearch();
    } else if (searchWorker && searchResults.length > 0) {
      searchIndex = (searchIndex - 1 + searchResults.length) % searchResults.length;
      if (!searchResultsRefresher) {
        updatesearchResult();
      }
      gotoNode(searchRootNode, searchResults[searchIndex]);
    }
});

$('#search-box input').on('change', resetSearch);
