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
    stop: 'Enabled',
    cancel: 'Enabled'
  }
}

module.exports = ContentEditor

function ContentEditor(options) {
  if (!(this instanceof ContentEditor)) return new ContentEditor(options)
  this.changes = []
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
    self.stop()
  }

  proto.on('editing', function addFocus(changes) {
    var self = this
    var lastChange = this.changes[this.changes.length - 1]
    this.once('leaveEditing', function() {
      lastChange.el.removeEventListener('blur', self.onBlur)
    })
    lastChange.el.addEventListener('blur', self.onBlur)
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
    this.addChange(this.el)
    this.emit('editing', this.changes)
  }.bind(this);

  proto.onleaveEditing = function(event, oldState, newState) {
    this.el.removeAttribute('contentEditable')
    this.el.blur()
    this.el = null
    this.elementSelector.deselect()
    this.emit('leaveEditing', this.changes)

  }.bind(this);

  proto.oncancel = function() {
    console.log('cancel')
    this.changes.forEach(function(change) {
      change.revert()
    })
    this.emit('cancelled', this.currentlyEditing)
  }.bind(this)

  proto.addChange = function addChange(el) {
    var change = this.getChange(el)
    if (!change) {
      change = new Change(el)
      this.changes.push(change)
    }
    return change
  }
  proto.getChange = function addChange(el) {
    var changes = this.changes.filter(function(change) {
      return change.el.isEqualNode(el)
    })
    if (changes.length) return changes.pop()
  }

  proto.onstop = function() {
    this.emit('stop', this.changes)
    // do nothing
  }.bind(this)

  var self = this
  window.addEventListener('keydown', function(e) {
    switch(keycode(e)) {
      case 'esc':
        self.cancel()
    }
  })
}


function Change(el) {
  this.el = el
  this.before = this.el.innerHTML
  this.after = this.before
  this.el.addEventListener('change', this.update.bind(this))
}

Change.prototype.update = function update() {
  this.after = this.el.innerHTML
}

Change.prototype.revert = function revert() {
  this.el.innerHTML = this.before
  this.after = this.before
}

Change.prototype.didChange = function didChange() {
 return this.before === this.after
}
