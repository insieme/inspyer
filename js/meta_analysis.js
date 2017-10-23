'use strict'

function constructMetaBodiesHtml(node, bodies, meta) {

  function buildGroup(group_id, group) {
    const ENTRIES_CLASS = 'analysismeta-group-body';

    var $group = $('<div>').addClass('analysismeta-group');

    var any_links = false;
    for (var i = 0; i < group.link_groups.length; i++) {
      any_links |= group.link_groups[i].links.length > 0;
    }

    if (any_links) {
      var $label = $('<a>')
          .attr('id', group_id)
          .click(function(e) {
            e.stopPropagation();

            var $entries = $group.find(`> .${ENTRIES_CLASS}`);
            if ($entries.length > 0) {
              $entries.remove();
            } else {
              $group.append(
                $('<div>')
                  .addClass(ENTRIES_CLASS)
                  .append(
                    $.map(group.link_groups, buildLinkGroup)
                  )
              );
            }
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
        )
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

    return $('<div>').addClass('analysismeta-linkgroup-body-entry').append(
      $link,
      ' = ',
      display(bodies[l.address].group_map[l.identifier])
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
