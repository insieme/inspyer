'use strict'

function constructMetaBodiesHtml(node, bodies, meta) {

  function buildGroup(group_id, group) {
    const ENTRIES_CLASS = 'analysismeta-group-body';

    var $group = $('<div>').addClass('analysismeta-group');

    var any_links = false;
    for (var i = 0; i < group.link_groups.length; i++) {
      any_links |= group.link_groups[i].links.length > 0;
    }

    var $group_body = $('<div>')
        .attr('id', `node-${node.id}#${group_id}`)
        .addClass('analysismeta-group-body')
        .addClass('collapse')
        .append(
          $.map(group.link_groups, buildLinkGroup)
        )

    if (any_links) {
      var $label = $('<a>')
          .click(function(e) {
              e.stopPropagation();
              $group_body.collapse('toggle');
          });
    } else {
      var $label = $('<span>').text(group.label);
    }

    return $group.append(
      $('<div>')
        .addClass('analysismeta-group-header')
        .append(
          $label.addClass('analysismeta-group-header-label').text(group.label),
          ' = ',
          display(group)
        ),
      $group_body
    );
  }

  function buildLinkGroup(lg) {
    return $('<div>').addClass('analysismeta-linkgroup').append(
      $('<div>').addClass('analysismeta-linkgroup-header').text(lg.heading),
      $('<div>').addClass('analysismeta-linkgroup-body').append(
        $.map(lg.links, buildLinkGroupEntry)
      )
    );
  }

  function buildLinkGroupEntry(l) {
    var $link = $('<a>')
      .addClass('analysismeta-linkgroup-body-entry-link')
      .attr('href', `#node-${l.address}#${l.identifier}`)
      .text(`${l.label}@${l.address}`);

    if (!l.active) {
      $link.addClass('disabled');
    }

    var value;
    try {
      value = display(bodies[l.address].group_map[l.identifier])
    } catch(e) {
      console.warn(e)
      value = $('<code>').text('Exception: ' + e.toString());
    }

    return $('<div>').addClass('analysismeta-linkgroup-body-entry').append(
      $link,
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
    return text.replace(/0-\d+(-\d+)*/, ' <a href="#node-$&">$&</a>');
  }

  ///////

  return $('<div>')
    .append(
      $.map(meta.groups, function(group_id) {
        return buildGroup(group_id, meta.group_map[group_id]);
      })
    );
}
