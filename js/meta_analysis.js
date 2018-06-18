'use strict'

// if (meta && meta.bodies_v2 && meta.bodies_v2[node.id]) {
//         $body.append(
//                                             node, bodies,         meta
//           constructAnalysisMetaHtmlDeferred(node, meta.bodies_v2, meta.bodies_v2[node.id]).addClass('node-body-analysis')
//         );
//       }

function constructAnalysisMeta(node_id, meta) {
  const dj = new DeferredJSON(meta.jqaas ? meta.jqaas : meta);

  return dj.get(`.bodies_v2[${JSON.stringify(node_id)}]`)
      .then(function(body_meta){
        if(body_meta === null) {
          return null;
        }

        return all($.map(body_meta.groups, function(group_id) {
          return buildGroup(group_id, body_meta.group_map[group_id]);
        }));
      })
      .then(function(els){
        if(els === null) {
          return $.Deferred().resolve($())
        } else {
          return $.Deferred().resolve($('<div>').append(els));
        }
      });

  ///// only functions beyond this point

  function buildGroup(group_id, group) {
    const ENTRIES_CLASS = 'analysismeta-group-body';

    var $group = $('<div>').addClass('analysismeta-group');

    var any_links = false;
    for (var i = 0; i < group.link_groups.length; i++) {
      any_links |= group.link_groups[i].links.length > 0;
    }

    var $group_body = $('<div>')
        .attr('id', `node-${node_id}#${group_id}`)
        .addClass('analysismeta-group-body')
        .addClass('collapse')
        .on('show.bs.collapse', function(e) {
          e.stopPropagation();

          if(!$group_body.is(':empty'))
            return;

          (function retry() {
            $group_body.empty().append($('<span>Loading...</span>'));
            all($.map(group.link_groups, buildLinkGroup))
                .then(function(link_groups) {
                  $group_body.empty().append(link_groups);
                }, function(e) {
                  console.log('buildGroup load failed', e);
                  $group_body.empty()
                      .append($('<code>').text('Exception: ' + e.toString()))
                      .append($('<a class="retry-btn">(retry)</a>')
                      .on('click', function() { retry(); }));
                });
          })();
        });

    var $label;
    if (any_links) {
      $label = $('<a>')
          .click(function(e) {
            e.stopPropagation();
            $group_body.collapse('toggle');
          });
    } else {
      $label = $('<span>').text(group.label);
    }

    return $group.append(
      $('<div>')
          .addClass('analysismeta-group-header')
          .append(
            $label
                .addClass('analysismeta-group-header-label')
                .text(group.label),
            ' = ',
            display(group)
          ),
      $group_body
    );
  }

  function buildLinkGroup(lg) {
    // TODO: if group_id == l.identifier -> group[l.identifier]
    function linkQuery(l) {
      return `.bodies_v2[${JSON.stringify(l.address)}]`
          + `.group_map[${JSON.stringify(l.identifier)}]`;
    }
    return dj.batch_get($.map(lg.links, linkQuery))
        .then(function(link_target_groups) {
          return zipWith(buildLinkGroupEntry, lg.links, link_target_groups);
        }, function(err) {
          console.error('buildLinkGroup request failed:', err);
          return $.Deferred().reject(err);
        })
        .then(function(links) {
          return $('<div>')
              .addClass('analysismeta-linkgroup')
              .append($('<div>')
                      .addClass('analysismeta-linkgroup-header')
                      .text(lg.heading),
                      $('<div>')
                      .addClass('analysismeta-linkgroup-body')
                      .append(links));
        });
  }

  function buildLinkGroupEntry(l, lt) {
    var $link = $('<a>')
        .addClass('analysismeta-linkgroup-body-entry-link')
        .attr('href', `#node-${l.address}#${l.identifier}`)
        .text(`${l.label}@${l.address}`)
        .click(function(e){
          e.preventDefault();
          var new_hash = `node-${l.address}#${l.identifier}`;
          if(new_hash != window.location.hash)
            if(window.onhashchange)
              window.onhashchange();
          window.location.hash = new_hash
        });

    if (!l.active) {
      $link.addClass('disabled');
    }

    var value;
    try {
      value = display(lt);
    } catch(e) {
      console.warn(e);
      value = $('<code>').text('Exception: ' + e.toString());
    }

    return $('<div>')
        .addClass('analysismeta-linkgroup-body-entry')
        .append($link,
                ' = ',
                value
               );
  }

  function display(group) {
    var $summary = $('<span>').html(linkNodeAddresses(group.summary));

    if (group.details) {
      $summary.append(
        $('<a>')
            .addClass('analysismeta-ellipsis')
            .text('…')
            .click(function(e) {
              $(this).parent().html(linkNodeAddresses(group.details));
            })
      )
    }

    return $summary;
  }

  function linkNodeAddresses(text) {
    return text.replace(/0-\d+(-\d+)*/g, ' <a href="#node-$&">$&</a>');
  }

  return constructAnalysisMeta;
}

