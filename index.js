'use strict'

var Emitter = require('emitter')
var ElementSelector = require('element-selector')
var State = require('state-machine')

var emitter = new Emitter() // handles events for all edit-content instances.

var states = {
  Disabled: {
    enable: 'Enabled',
    disable: 'Disabled'
  },
  Enabled: {
    disable: 'Disabled',
    enable: 'Enabled',
    edit: 'Editing'
  },
  Editing: {
    disable: 'Disabled',
    cancel: 'Enabled',
    commit: 'Enabled'
  }
}

module.exports = function(options) {
  return new ContentEditor(options)
}

module.exports.ContentEditor = ContentEditor

function ContentEditor(options) {
  options = options || {}

  this.elementSelector = ElementSelector({
    selectEvent: options.editEvent || 'dblclick',
    selector: options.selector
  })

  var proto = this.__proto__ = State.machine(states)

  proto.onEnabled = function() {
    this.elementSelector.enable()
    this.elementSelector.once('select', function(el) {
      this.el = el
      this.edit()
    }.bind(this))
    this.emit('enabled')
  }.bind(this)

  proto.onleaveEnabled = function() {
    this.elementSelector.disable()
    this.elementSelector.off('select')
  }.bind(this)

  proto.onenterDisabled = function() {
    this.elementSelector.disable()
    this.elementSelector.off('select')
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

  Emitter(proto)
}
