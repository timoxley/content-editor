'use strict'

var Emitter = require('emitter')

var domify = require('domify')
var classes = require('classes')
var ElementSelector = require('element-selector')
var domready = require('domready')()
var keycode = require('keycode')
var State = require('state-machine')

var template = require('./template').trim()
var templateEl = domify(template)[0]
var okEl = templateEl.querySelector('.ok')
var cancelEl = templateEl.querySelector('.cancel')

var emitter = new Emitter() // handles events for all edit-content instances.

var states = {
  Disabled: {
    enable: 'Enabled'
  },
  Enabled: {
    disable: 'Disabled',
    edit: 'Editing'
  },
  Editing: {
    cancel: 'Enabled',
    commit: 'Enabled'
  }
}

domready(function() {
  document.addEventListener('keydown', function(e) {
    emitter.emit('keydown', e)
  }.bind(this))
}.bind(this))

module.exports = function(options) {
  return new ContentEditor(options)
}

module.exports.ContentEditor = ContentEditor

function ContentEditor(options) {
  options = options || {}

  this.elementSelector = ElementSelector({
    selectEvent: 'dblclick'
  })

  var proto = this.__proto__ = State.machine(states)

  okEl.addEventListener('click', this.commit)
  cancelEl.addEventListener('click', this.cancel)

  emitter.on('keydown', function(e) {
    if (keycode(e.which || e.keyCode) === 'Esc') this.cancel()
  }.bind(this))

  proto.onEnabled = function() {
    this.elementSelector.enable()
    this.elementSelector.once('select', function(el) {
      this.el = el
      this.edit()
    }.bind(this))
  }.bind(this)

  proto.onenterEditing = function(event, oldState, newState) {
    this.el.setAttribute('contentEditable', true)
    this.el.addEventListener('focusout', this.onFocusOut)
    this.el.focus()
    this.elementSelector.disable()
    // Save content state
    this.changes = this.changes || {}
    this.changes.before = this.el.innerHTML
    addOkCancel(this.el)
  }.bind(this);

  proto.onleaveEditing = function(event, oldState, newState) {
    this.el.removeAttribute('contentEditable')
    this.elementSelector.enable()
    this.elementSelector.deselect()
    this.el.removeEventListener('focusout', this.onFocusOut)
    this.el.blur()
    removeOkCancel(this.el)
    this.el = null
  }.bind(this);

  proto.oncancel = function() {
    this.el.innerHTML = this.changes.before
    this.emit('cancelled', {el: this.el})
  }.bind(this)

  proto.oncommit = function() {
    this.changes.after = this.el.innerHTML
    if (this.changes.after !== this.changes.before) {
      this.emit('changed', {
        before: this.changes.before,
        after: this.changes.after,
        el: this.el
      })
    }
  }.bind(this)

  proto.onFocusOut = function() {
    // incur slight delay to let cancel/commit click handlers fire
    // gross.
    setTimeout(function() {
      this.commit()
    }.bind(this), 200)
  }.bind(this)

  Emitter(proto)

}

function addOkCancel(el) {
  var position = el.getClientRects()[0]
  el.offsetParent.appendChild(templateEl)
  templateEl.style.position = 'absolute'
  templateEl.style.left = position.right - templateEl.offsetWidth
  templateEl.style.top = position.bottom + 3
}

function removeOkCancel(el) {
  document.body.removeChild(templateEl)
}
