'use strict'

var Emitter = require('emitter')
var ElementSelector = require('element-selector')
var State = require('stately')
var keycode = require('keycode')

var emitter = new Emitter() // handles events for all edit-content instances.

var states = {
  Disabled: {
    enable: 'Enabled',
    toggle: 'Enabled',
    disable: 'Disabled'
  },
  Enabled: {
    disable: 'Disabled',
    toggle: 'Disabled',
    enable: 'Enabled',
    edit: 'Editing'
  },
  Editing: {
    disable: 'Disabled',
    cancel: 'Enabled',
    commit: 'Enabled'
  }
}

module.exports = ContentEditor

function ContentEditor(options) {
  if (!(this instanceof ContentEditor)) return new ContentEditor(options)

  options = options || {}
  options.selectEvent = options.selectEvent || options.editEvent || 'dblclick'
  this.elementSelector = ElementSelector(options)

  var proto = this.__proto__ = State.machine(states)
  Emitter(proto)
  var self = this
  proto.onenterEnabled = function() {
    this.elementSelector.enable()
    this.elementSelector.on('select', this.onSelect)
    this.emit('enabled')
  }.bind(this)

  proto.onSelect = function(el, e) {
    self.el = el
    self.edit()
  }

  proto.onBlur = function onBlur() {
    self.cancel()
  }
  proto.on('editing', function addFocus(data) {
    var self = this
    var el = data.el

    this.once('leaveEditing', function() {
      el.removeEventListener('blur', self.onBlur)
    })
    el.addEventListener('blur', self.onBlur)
  })

  proto.onleaveEnabled = function() {
    this.elementSelector.disable()
    this.elementSelector.off('select', this.onSelect)
  }.bind(this)

  proto.onenterDisabled = function() {
    this.elementSelector.disable()
    this.emit('disabled')
  }.bind(this)

  proto.onenterEditing = function(event, oldState, newState) {
    this.el.setAttribute('contentEditable', true)
    this.el.focus()
    this.elementSelector.disable()

    // Save content state
    this.changes = this.changes || {}
    this.changes.before = this.el.innerHTML
    this.emit('editing', {
      before: this.changes.before,
      el: this.el
    })
    this.emit('change', 'editing', true)
  }.bind(this);

  proto.onleaveEditing = function(event, oldState, newState) {
    this.emit('leaveEditing')
    this.el.removeAttribute('contentEditable')
    this.elementSelector.deselect()
    this.el.blur()
    this.el = null
    this.emit('change', 'editing', false)
  }.bind(this);

  proto.oncancel = function() {
    this.el.innerHTML = this.changes.before
    this.emit('cancelled', {el: this.el})
  }.bind(this)

  proto.oncommit = function() {
    this.changes.after = this.el.innerHTML
    if (this.changes.after !== this.changes.before) {
      this.emit('commit', {
        before: this.changes.before,
        after: this.changes.after,
        el: this.el
      })
    }
  }.bind(this)

  var self = this
  window.addEventListener('keydown', function(e) {
    switch(keycode(e)) {
      case 'esc':
        self.cancel()
    }
  })
}
