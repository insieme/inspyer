'use strict'

var messagebox = $('#message-box');

function addMessage(title, text='', type='info', timeout=2000) {
  console.info('Message: ' + title + '   ' + text);
  var msg = $('<div class="alert alert-dismissible fade">')
  .addClass('alert-' + type)
  .append($('<strong>').html(title))
  .click(function() {
      msg.alert('close');
  });
  if (text) {
    msg.append($('<p>').html(text));
  }
  messagebox.prepend(msg);
  msg.addClass('in');
  if (timeout) {
    setTimeout(function() {
        msg.alert('close');
    }, timeout);
  }
}
