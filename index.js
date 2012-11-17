'use strict'

var Emitter = require('emitter')

var domify = require('domify')
var classes = require('classes')
var ElementSelector = require('element-selector')
var domready = require('domready')()
var keycode = require('keycode')
var bus = require('bus')

domready(function() {
  document.addEventListener('keydown', function(e) {
    bus.emit('keydown', e)
  }.bind(this))
}.bind(this))



module.exports = function(options) {
  return new ContentEditor(options)
}

module.exports.ContentEditor = ContentEditor

function ContentEditor(options) {
  options = options || {}

  this.enabled = options.hasOwnProperty('enabled')
  ? options.enabled || null
  : true

  this.elementSelector = ElementSelector({
    selectEvent: 'dblclick'
  }).disable()

  this.el = null
  this.enable = enable.bind(this)
  this.disable = disable.bind(this)
  this.startEdit = startEdit.bind(this)
  this.stopEdit = stopEdit.bind(this)
  this.cancel = cancel.bind(this)
  this.once('enable', this.enable)


  if (this.enabled) {
    this.emit('enable')
  }
}

ContentEditor.prototype = {}

Emitter(ContentEditor.prototype)

function enable() {
  this.elementSelector.enable()
  this.elementSelector.once('select', this.startEdit)
  this.once('disable', this.disable)
}

function disable() {
  this.elementSelector.disable()
  this.stopEdit()
  this.elementSelector.off('select', this.startEdit)
  this.once('enable', this.enable)
}

function startEdit(el) {
  this.el = el
  this.changes = this.changes || {}
  this.changes.before = el.innerHTML
  el.addEventListener('focusout', this.cancel)
  bus.on('keydown', function(e) {
    if (keycode(e.which || e.keyCode) === 'Esc') this.cancel()
  }.bind(this))
  el.setAttribute('contentEditable', true)
  this.emit('startEdit', el)
  this.once('cancel', this.stopEdit)
}

function stopEdit() {
  if (!this.el) return
  var el = this.el
  el.removeEventListener('focusout', this.cancel)
  el.removeAttribute('contentEditable')
  this.elementSelector.deselect()
  this.changes.after = el.innerHTML
  if (this.changes.after !== this.changes.before) {
    this.emit('changed', {
      before: this.changes.before,
      after: this.changes.after,
      el: el
    })
  }
  this.changes = {}
  this.elementSelector.once('select', this.startEdit)
  this.emit('stopEdit', el)
}

function cancel() {
  this.emit('cancel')
}

