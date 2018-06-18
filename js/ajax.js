function putJSON(url, data) {
  const absolute_url = new URL(url, window.location.href)

  return fetch(absolute_url.href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: data
  });
}

function getJSON(url) {
  return $.getJSON(url)
      .then(null, function fail(jqXHR, textStatus, errorThrown) {
        return $.Deferred().reject('Error getting JSON document: ' + textStatus + ':' + errorThrown);
      });
}

$.ajaxSetup({
  timeout: 10000
});

function all(promises) {
  var promise = $.Deferred();
  $.when.apply($, promises)
      .then(function() {
        promise.resolve(Array.prototype.slice.call(arguments));
      }, function() {
        promise.reject(Array.prototype.slice.call(arguments));
      });

  return promise;
}

function DeferredJSON(data) {
  if(data instanceof URL) {
    this.jqaas = data;
  } else {
    this.json = data;
  }
}

function mkJQaaSURL(resource, program) {
  var url = new URL(resource, window.location);
  url.searchParams.set('p', program);
  return url;
}

DeferredJSON.prototype.json_get = function(program) {
  // dirty, dirty hack: this only works as long as the JQ programs passed in
  // look like JS variable accessors, good enough for now.

  var fn = new Function("json", `return json${program};`);
  const res = fn(this.json);
  if(res === undefined)
    throw `program '${program}' returned undefined`;

  return res
}

DeferredJSON.prototype.get = function(program) {
  if(this.jqaas) {
    const url = mkJQaaSURL(this.jqaas, program);
    return getJSON(url);
  } else if(this.json) {
    try {
      return $.Deferred().resolve(this.json_get(program));
    } catch(e) {
      return $.Deferred().reject(e);
    }
  }
}

DeferredJSON.prototype.batch_get = function(programs) {
  const that = this;
  if(this.jqaas) {
    const url = mkJQaaSURL(this.jqaas, '[ ' + programs.join(' , ') + ' ]');
    return getJSON(url);
  } else if(this.json) {
    try {
      return $.Deferred().resolve($.map(programs, function (prog) {
        return that.json_get(prog)
      }));
    } catch(e) {
      return $.Deferred().reject(e);
    }
  }
}
