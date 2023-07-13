"use strict";

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*! For license information please see gridstack-h5.js.LICENSE.txt */
!function (t, e) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? exports.GridStack = e() : t.GridStack = e();
}(self, function () {
  return function () {
    "use strict";
    var t = { 21: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.GridStackDD = void 0;var s = i(334),
            o = i(270),
            r = i(593);
        var n = function (_s$GridStackDDI) {
          _inherits(n, _s$GridStackDDI);

          function n() {
            _classCallCheck(this, n);

            return _possibleConstructorReturn(this, (n.__proto__ || Object.getPrototypeOf(n)).apply(this, arguments));
          }

          _createClass(n, [{
            key: "remove",
            value: function remove(t) {
              return this.draggable(t, "destroy").resizable(t, "destroy"), t.gridstackNode && delete t.gridstackNode._initDD, this;
            }
          }], [{
            key: "get",
            value: function get() {
              return s.GridStackDDI.get();
            }
          }]);

          return n;
        }(s.GridStackDDI);

        function l(t, e) {
          var i = t ? t.gridstackNode : void 0;i && i.grid && (e ? i._isAboutToRemove = !0 : delete i._isAboutToRemove, e ? t.classList.add("grid-stack-item-removing") : t.classList.remove("grid-stack-item-removing"));
        }e.GridStackDD = n, o.GridStack.prototype._setupAcceptWidget = function () {
          var _this2 = this;

          if (this.opts.staticGrid || !this.opts.acceptWidgets && !this.opts.removable) return n.get().droppable(this.el, "destroy"), this;var t = void 0,
              e = void 0,
              i = void 0,
              s = function s(_s, o, l) {
            var a = o.gridstackNode;if (!a) return;var h = (l = l || o).getBoundingClientRect(),
                d = h.left - t.left,
                g = h.top - t.top,
                p = { position: { top: g, left: d } };if (a._temporaryRemoved) {
              if (a.x = Math.max(0, Math.round(d / i)), a.y = Math.max(0, Math.round(g / e)), delete a.autoPosition, _this2.engine.nodeBoundFix(a), !_this2.engine.willItFit(a)) {
                if (a.autoPosition = !0, !_this2.engine.willItFit(a)) return void n.get().off(o, "drag");a._willFitPos && (r.Utils.copyPos(a, a._willFitPos), delete a._willFitPos);
              }_this2._onStartMoving(l, _s, p, a, i, e);
            } else _this2._dragOrResize(l, _s, p, a, i, e);
          };return n.get().droppable(this.el, { accept: function accept(t) {
              var e = t.gridstackNode;if (e && e.grid === _this2) return !0;if (!_this2.opts.acceptWidgets) return !1;var i = !0;if ("function" == typeof _this2.opts.acceptWidgets) i = _this2.opts.acceptWidgets(t);else {
                var _e = !0 === _this2.opts.acceptWidgets ? ".grid-stack-item" : _this2.opts.acceptWidgets;i = t.matches(_e);
              }if (i && e && _this2.opts.maxRow) {
                var _t = { w: e.w, h: e.h, minW: e.minW, minH: e.minH };i = _this2.engine.willItFit(_t);
              }return i;
            } }).on(this.el, "dropover", function (o, r, a) {
            var h = r.gridstackNode;if (h && h.grid === _this2 && !h._temporaryRemoved) return !1;h && h.grid && h.grid !== _this2 && !h._temporaryRemoved && h.grid._leave(r, a);var d = _this2.el.getBoundingClientRect();t = { top: d.top, left: d.left }, i = _this2.cellWidth(), e = _this2.getCellHeight(!0), h || (h = _this2._readAttr(r)), h.grid || (h._isExternal = !0, r.gridstackNode = h), a = a || r;var g = h.w || Math.round(a.offsetWidth / i) || 1,
                p = h.h || Math.round(a.offsetHeight / e) || 1;return h.grid && h.grid !== _this2 ? (r._gridstackNodeOrig || (r._gridstackNodeOrig = h), r.gridstackNode = h = Object.assign(Object.assign({}, h), { w: g, h: p, grid: _this2 }), _this2.engine.cleanupNode(h).nodeBoundFix(h), h._initDD = h._isExternal = h._temporaryRemoved = !0) : (h.w = g, h.h = p, h._temporaryRemoved = !0), l(h.el, !1), n.get().on(r, "drag", s), s(o, r, a), !1;
          }).on(this.el, "dropout", function (t, e, i) {
            var s = e.gridstackNode;return s.grid && s.grid !== _this2 || _this2._leave(e, i), !1;
          }).on(this.el, "drop", function (t, e, i) {
            var s = e.gridstackNode;if (s && s.grid === _this2 && !s._isExternal) return !1;var o = !!_this2.placeholder.parentElement;_this2.placeholder.remove();var l = e._gridstackNodeOrig;if (delete e._gridstackNodeOrig, o && l && l.grid && l.grid !== _this2) {
              var _t2 = l.grid;_t2.engine.removedNodes.push(l), _t2._triggerRemoveEvent();
            }return !!s && (o && (_this2.engine.cleanupNode(s), s.grid = _this2), n.get().off(e, "drag"), i !== e ? (i.remove(), e.gridstackNode = l, o && (e = e.cloneNode(!0))) : (e.remove(), n.get().remove(e)), !!o && (e.gridstackNode = s, s.el = e, r.Utils.copyPos(s, _this2._readAttr(_this2.placeholder)), r.Utils.removePositioningStyles(e), _this2._writeAttr(e, s), _this2.el.appendChild(e), _this2._updateContainerHeight(), _this2.engine.addedNodes.push(s), _this2._triggerAddEvent(), _this2._triggerChangeEvent(), _this2.engine.endUpdate(), _this2._gsEventHandler.dropped && _this2._gsEventHandler.dropped(Object.assign(Object.assign({}, t), { type: "dropped" }), l && l.grid ? l : void 0, s), window.setTimeout(function () {
              s.el && s.el.parentElement ? _this2._prepareDragDropByNode(s) : _this2.engine.removeNode(s);
            }), !1));
          }), this;
        }, o.GridStack.prototype._setupRemoveDrop = function () {
          if (!this.opts.staticGrid && "string" == typeof this.opts.removable) {
            var _t3 = document.querySelector(this.opts.removable);if (!_t3) return this;n.get().isDroppable(_t3) || n.get().droppable(_t3, this.opts.removableOptions).on(_t3, "dropover", function (t, e) {
              return l(e, !0);
            }).on(_t3, "dropout", function (t, e) {
              return l(e, !1);
            });
          }return this;
        }, o.GridStack.setupDragIn = function (t, e) {
          var i = void 0,
              s = void 0;if (t && (i = t, s = Object.assign(Object.assign({}, { revert: "invalid", handle: ".grid-stack-item-content", scroll: !1, appendTo: "body" }), e || {})), "string" != typeof i) return;var o = n.get();r.Utils.getElements(i).forEach(function (t) {
            o.isDraggable(t) || o.dragIn(t, s);
          });
        }, o.GridStack.prototype._prepareDragDropByNode = function (t) {
          var _this3 = this;

          var e = t.el,
              i = n.get();if (this.opts.staticGrid || (t.noMove || this.opts.disableDrag) && (t.noResize || this.opts.disableResize)) return t._initDD && (i.remove(e), delete t._initDD), e.classList.add("ui-draggable-disabled", "ui-resizable-disabled"), this;if (!t._initDD) {
            var _s2 = void 0,
                _o = void 0,
                _n = function _n(i, r) {
              _this3._gsEventHandler[i.type] && _this3._gsEventHandler[i.type](i, i.target), _s2 = _this3.cellWidth(), _o = _this3.getCellHeight(!0), _this3._onStartMoving(e, i, r, t, _s2, _o);
            },
                _l = function _l(i, r) {
              _this3._dragOrResize(e, i, r, t, _s2, _o);
            },
                a = function a(s) {
              _this3.placeholder.remove(), delete t._moving, delete t._lastTried;var o = s.target;if (o.gridstackNode && o.gridstackNode.grid === _this3) {
                if (t.el = o, t._isAboutToRemove) {
                  var _r = e.gridstackNode.grid;_r._gsEventHandler[s.type] && _r._gsEventHandler[s.type](s, o), i.remove(e), _r.engine.removedNodes.push(t), _r._triggerRemoveEvent(), delete e.gridstackNode, delete t.el, e.remove();
                } else t._temporaryRemoved ? (r.Utils.removePositioningStyles(o), r.Utils.copyPos(t, t._orig), _this3._writePosAttr(o, t), _this3.engine.addNode(t)) : (r.Utils.removePositioningStyles(o), _this3._writePosAttr(o, t)), _this3._gsEventHandler[s.type] && _this3._gsEventHandler[s.type](s, o);_this3._extraDragRow = 0, _this3._updateContainerHeight(), _this3._triggerChangeEvent(), _this3.engine.endUpdate();
              }
            };i.draggable(e, { start: _n, stop: a, drag: _l }).resizable(e, { start: _n, stop: a, resize: _l }), t._initDD = !0;
          }return t.noMove || this.opts.disableDrag ? (i.draggable(e, "disable"), e.classList.add("ui-draggable-disabled")) : (i.draggable(e, "enable"), e.classList.remove("ui-draggable-disabled")), t.noResize || this.opts.disableResize ? (i.resizable(e, "disable"), e.classList.add("ui-resizable-disabled")) : (i.resizable(e, "enable"), e.classList.remove("ui-resizable-disabled")), this;
        }, o.GridStack.prototype._onStartMoving = function (t, e, i, s, o, r) {
          if (this.engine.cleanNodes().beginUpdate(s), this._writePosAttr(this.placeholder, s), this.el.appendChild(this.placeholder), s.el = this.placeholder, s._lastUiPosition = i.position, s._prevYPix = i.position.top, s._moving = "dragstart" === e.type, delete s._lastTried, "dropover" === e.type && s._temporaryRemoved && (this.engine.addNode(s), s._moving = !0), this.engine.cacheRects(o, r, this.opts.marginTop, this.opts.marginRight, this.opts.marginBottom, this.opts.marginLeft), "resizestart" === e.type) {
            var _e2 = n.get().resizable(t, "option", "minWidth", o * (s.minW || 1)).resizable(t, "option", "minHeight", r * (s.minH || 1));s.maxW && _e2.resizable(t, "option", "maxWidth", o * s.maxW), s.maxH && _e2.resizable(t, "option", "maxHeight", r * s.maxH);
          }
        }, o.GridStack.prototype._leave = function (t, e) {
          var i = t.gridstackNode;i && (n.get().off(t, "drag"), i._temporaryRemoved || (i._temporaryRemoved = !0, this.engine.removeNode(i), i.el = i._isExternal && e ? e : t, !0 === this.opts.removable && l(t, !0), t._gridstackNodeOrig ? (t.gridstackNode = t._gridstackNodeOrig, delete t._gridstackNodeOrig) : i._isExternal && (delete i.el, delete t.gridstackNode, this.engine.restoreInitial())));
        }, o.GridStack.prototype._dragOrResize = function (t, e, i, s, o, n) {
          var l = void 0,
              a = Object.assign({}, s._orig),
              h = this.opts.marginLeft,
              d = this.opts.marginRight,
              g = this.opts.marginTop,
              p = this.opts.marginBottom,
              c = Math.round(.1 * n),
              u = Math.round(.1 * o);if (h = Math.min(h, u), d = Math.min(d, u), g = Math.min(g, c), p = Math.min(p, c), "drag" === e.type) {
            if (s._temporaryRemoved) return;var _e3 = i.position.top - s._prevYPix;s._prevYPix = i.position.top, r.Utils.updateScrollPosition(t, i.position, _e3);var _l2 = i.position.left + (i.position.left > s._lastUiPosition.left ? -d : h),
                _c = i.position.top + (i.position.top > s._lastUiPosition.top ? -p : g);a.x = Math.round(_l2 / o), a.y = Math.round(_c / n);var _u = this._extraDragRow;if (this.engine.collide(s, a)) {
              var _t4 = this.getRow(),
                  _e4 = Math.max(0, a.y + s.h - _t4);this.opts.maxRow && _t4 + _e4 > this.opts.maxRow && (_e4 = Math.max(0, this.opts.maxRow - _t4)), this._extraDragRow = _e4;
            } else this._extraDragRow = 0;if (this._extraDragRow !== _u && this._updateContainerHeight(), s.x === a.x && s.y === a.y) return;
          } else if ("resize" === e.type) {
            if (a.x < 0) return;if (r.Utils.updateScrollResize(e, t, n), a.w = Math.round((i.size.width - h) / o), a.h = Math.round((i.size.height - g) / n), s.w === a.w && s.h === a.h) return;if (s._lastTried && s._lastTried.w === a.w && s._lastTried.h === a.h) return;var _d = i.position.left + h,
                _p = i.position.top + g;a.x = Math.round(_d / o), a.y = Math.round(_p / n), l = !0;
          }s._lastTried = a;var m = { x: i.position.left + h, y: i.position.top + g, w: (i.size ? i.size.width : s.w * o) - h - d, h: (i.size ? i.size.height : s.h * n) - g - p };if (this.engine.moveNodeCheck(s, Object.assign(Object.assign({}, a), { cellWidth: o, cellHeight: n, rect: m, resizing: l }))) {
            s._lastUiPosition = i.position, this.engine.cacheRects(o, n, g, d, p, h), delete s._skipDown, l && s.subGrid && s.subGrid.onParentResize(), this._extraDragRow = 0, this._updateContainerHeight();var _t5 = e.target;this._writePosAttr(_t5, s), this._gsEventHandler[e.type] && this._gsEventHandler[e.type](e, _t5);
          }
        }, o.GridStack.prototype.movable = function (t, e) {
          var _this4 = this;

          return this.opts.staticGrid || o.GridStack.getElements(t).forEach(function (t) {
            var i = t.gridstackNode;i && (e ? delete i.noMove : i.noMove = !0, _this4._prepareDragDropByNode(i));
          }), this;
        }, o.GridStack.prototype.resizable = function (t, e) {
          var _this5 = this;

          return this.opts.staticGrid || o.GridStack.getElements(t).forEach(function (t) {
            var i = t.gridstackNode;i && (e ? delete i.noResize : i.noResize = !0, _this5._prepareDragDropByNode(i));
          }), this;
        }, o.GridStack.prototype.disable = function () {
          if (!this.opts.staticGrid) return this.enableMove(!1), this.enableResize(!1), this._triggerEvent("disable"), this;
        }, o.GridStack.prototype.enable = function () {
          if (!this.opts.staticGrid) return this.enableMove(!0), this.enableResize(!0), this._triggerEvent("enable"), this;
        }, o.GridStack.prototype.enableMove = function (t) {
          var _this6 = this;

          return this.opts.staticGrid || (this.opts.disableDrag = !t, this.engine.nodes.forEach(function (e) {
            return _this6.movable(e.el, t);
          })), this;
        }, o.GridStack.prototype.enableResize = function (t) {
          var _this7 = this;

          return this.opts.staticGrid || (this.opts.disableResize = !t, this.engine.nodes.forEach(function (e) {
            return _this7.resizable(e.el, t);
          })), this;
        };
      }, 334: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.GridStackDDI = void 0;
        var i = function () {
          function i() {
            _classCallCheck(this, i);
          }

          _createClass(i, [{
            key: "remove",
            value: function remove(t) {
              return this;
            }
          }], [{
            key: "registerPlugin",
            value: function registerPlugin(t) {
              return i.ddi = new t(), i.ddi;
            }
          }, {
            key: "get",
            value: function get() {
              return i.ddi || i.registerPlugin(i);
            }
          }]);

          return i;
        }();

        e.GridStackDDI = i;
      }, 62: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.GridStackEngine = void 0;var s = i(593);
        var o = function () {
          function o() {
            var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            _classCallCheck(this, o);

            this.addedNodes = [], this.removedNodes = [], this.column = t.column || 12, this.onChange = t.onChange, this._float = t.float, this.maxRow = t.maxRow, this.nodes = t.nodes || [];
          }

          _createClass(o, [{
            key: "batchUpdate",
            value: function batchUpdate() {
              return this.batchMode || (this.batchMode = !0, this._prevFloat = this._float, this._float = !0, this.saveInitial()), this;
            }
          }, {
            key: "commit",
            value: function commit() {
              return this.batchMode ? (this.batchMode = !1, this._float = this._prevFloat, delete this._prevFloat, this._packNodes()._notify()) : this;
            }
          }, {
            key: "_useEntireRowArea",
            value: function _useEntireRowArea(t, e) {
              return !this.float && !this._hasLocked && (!t._moving || t._skipDown || e.y <= t.y);
            }
          }, {
            key: "_fixCollisions",
            value: function _fixCollisions(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : t;
              var i = arguments[2];
              var o = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
              if (this._sortNodes(-1), !(i = i || this.collide(t, e))) return !1;if (t._moving && !o.nested && !this.float && this.swap(t, i)) return !0;var r = e;this._useEntireRowArea(t, e) && (r = { x: 0, w: this.column, y: e.y, h: e.h }, i = this.collide(t, r, o.skip));var n = !1,
                  l = { nested: !0, pack: !1 };for (; i = i || this.collide(t, r, o.skip);) {
                var _r2 = void 0;if (i.locked || t._moving && !t._skipDown && e.y > t.y && !this.float && (!this.collide(i, Object.assign(Object.assign({}, i), { y: t.y }), t) || !this.collide(i, Object.assign(Object.assign({}, i), { y: e.y - i.h }), t)) ? (t._skipDown = t._skipDown || e.y > t.y, _r2 = this.moveNode(t, Object.assign(Object.assign(Object.assign({}, e), { y: i.y + i.h }), l)), i.locked && _r2 ? s.Utils.copyPos(e, t) : !i.locked && _r2 && o.pack && (this._packNodes(), e.y = i.y + i.h, s.Utils.copyPos(t, e)), n = n || _r2) : _r2 = this.moveNode(i, Object.assign(Object.assign(Object.assign({}, i), { y: e.y + e.h, skip: t }), l)), !_r2) return n;i = void 0;
              }return n;
            }
          }, {
            key: "collide",
            value: function collide(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : t;
              var i = arguments[2];
              return this.nodes.find(function (o) {
                return o !== t && o !== i && s.Utils.isIntercepted(o, e);
              });
            }
          }, {
            key: "collideAll",
            value: function collideAll(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : t;
              var i = arguments[2];
              return this.nodes.filter(function (o) {
                return o !== t && o !== i && s.Utils.isIntercepted(o, e);
              });
            }
          }, {
            key: "collideCoverage",
            value: function collideCoverage(t, e, i) {
              if (!e.rect || !t._rect) return;var s = void 0,
                  o = t._rect,
                  r = Object.assign({}, e.rect);return r.y > o.y ? (r.h += r.y - o.y, r.y = o.y) : r.h += o.y - r.y, r.x > o.x ? (r.w += r.x - o.x, r.x = o.x) : r.w += o.x - r.x, i.forEach(function (t) {
                if (t.locked || !t._rect) return;var e = t._rect,
                    i = Number.MAX_VALUE,
                    n = Number.MAX_VALUE,
                    l = .5;o.y < e.y ? i = (r.y + r.h - e.y) / e.h : o.y + o.h > e.y + e.h && (i = (e.y + e.h - r.y) / e.h), o.x < e.x ? n = (r.x + r.w - e.x) / e.w : o.x + o.w > e.x + e.w && (n = (e.x + e.w - r.x) / e.w);var a = Math.min(n, i);a > l && (l = a, s = t);
              }), s;
            }
          }, {
            key: "cacheRects",
            value: function cacheRects(t, e, i, s, o, r) {
              return this.nodes.forEach(function (n) {
                return n._rect = { y: n.y * e + i, x: n.x * t + r, w: n.w * t - r - s, h: n.h * e - i - o };
              }), this;
            }
          }, {
            key: "swap",
            value: function swap(t, e) {
              if (!e || e.locked || !t || t.locked) return !1;function i() {
                var i = e.x,
                    s = e.y;return e.x = t.x, e.y = t.y, t.h != e.h ? (t.x = i, t.y = e.y + e.h) : t.w != e.w ? (t.x = e.x + e.w, t.y = s) : (t.x = i, t.y = s), t._dirty = e._dirty = !0, !0;
              }var o = void 0;if (t.w === e.w && t.h === e.h && (t.x === e.x || t.y === e.y) && (o = s.Utils.isTouching(t, e))) return i();if (!1 !== o) {
                if (t.w === e.w && t.x === e.x && (o || (o = s.Utils.isTouching(t, e)))) {
                  if (e.y < t.y) {
                    var _i = t;t = e, e = _i;
                  }return i();
                }if (!1 !== o) {
                  if (t.h === e.h && t.y === e.y && (o || (o = s.Utils.isTouching(t, e)))) {
                    if (e.x < t.x) {
                      var _i2 = t;t = e, e = _i2;
                    }return i();
                  }return !1;
                }
              }
            }
          }, {
            key: "isAreaEmpty",
            value: function isAreaEmpty(t, e, i, s) {
              var o = { x: t || 0, y: e || 0, w: i || 1, h: s || 1 };return !this.collide(o);
            }
          }, {
            key: "compact",
            value: function compact() {
              var _this8 = this;

              if (0 === this.nodes.length) return this;this.batchUpdate()._sortNodes();var t = this.nodes;return this.nodes = [], t.forEach(function (t) {
                t.locked || (t.autoPosition = !0), _this8.addNode(t, !1), t._dirty = !0;
              }), this.commit();
            }
          }, {
            key: "_sortNodes",
            value: function _sortNodes(t) {
              return this.nodes = s.Utils.sort(this.nodes, t, this.column), this;
            }
          }, {
            key: "_packNodes",
            value: function _packNodes() {
              var _this9 = this;

              return this._sortNodes(), this.float ? this.nodes.forEach(function (t) {
                if (t._updating || void 0 === t._orig || t.y === t._orig.y) return;var e = t.y;for (; e > t._orig.y;) {
                  --e, _this9.collide(t, { x: t.x, y: e, w: t.w, h: t.h }) || (t._dirty = !0, t.y = e);
                }
              }) : this.nodes.forEach(function (t, e) {
                if (!t.locked) for (; t.y > 0;) {
                  var _i3 = 0 === e ? 0 : t.y - 1;if (0 !== e && _this9.collide(t, { x: t.x, y: _i3, w: t.w, h: t.h })) break;t._dirty = t.y !== _i3, t.y = _i3;
                }
              }), this;
            }
          }, {
            key: "prepareNode",
            value: function prepareNode(t, e) {
              (t = t || {})._id = t._id || o._idSeq++, void 0 !== t.x && void 0 !== t.y && null !== t.x && null !== t.y || (t.autoPosition = !0);var i = { x: 0, y: 0, w: 1, h: 1 };return s.Utils.defaults(t, i), t.autoPosition || delete t.autoPosition, t.noResize || delete t.noResize, t.noMove || delete t.noMove, "string" == typeof t.x && (t.x = Number(t.x)), "string" == typeof t.y && (t.y = Number(t.y)), "string" == typeof t.w && (t.w = Number(t.w)), "string" == typeof t.h && (t.h = Number(t.h)), isNaN(t.x) && (t.x = i.x, t.autoPosition = !0), isNaN(t.y) && (t.y = i.y, t.autoPosition = !0), isNaN(t.w) && (t.w = i.w), isNaN(t.h) && (t.h = i.h), this.nodeBoundFix(t, e);
            }
          }, {
            key: "nodeBoundFix",
            value: function nodeBoundFix(t, e) {
              return t.maxW && (t.w = Math.min(t.w, t.maxW)), t.maxH && (t.h = Math.min(t.h, t.maxH)), t.minW && t.minW <= this.column && (t.w = Math.max(t.w, t.minW)), t.minH && (t.h = Math.max(t.h, t.minH)), t.w > this.column ? (this.column < 12 && (t.w = Math.min(12, t.w), this.cacheOneLayout(t, 12)), t.w = this.column) : t.w < 1 && (t.w = 1), this.maxRow && t.h > this.maxRow ? t.h = this.maxRow : t.h < 1 && (t.h = 1), t.x < 0 && (t.x = 0), t.y < 0 && (t.y = 0), t.x + t.w > this.column && (e ? t.w = this.column - t.x : t.x = this.column - t.w), this.maxRow && t.y + t.h > this.maxRow && (e ? t.h = this.maxRow - t.y : t.y = this.maxRow - t.h), t;
            }
          }, {
            key: "getDirtyNodes",
            value: function getDirtyNodes(t) {
              return t ? this.nodes.filter(function (t) {
                return t._dirty && !s.Utils.samePos(t, t._orig);
              }) : this.nodes.filter(function (t) {
                return t._dirty;
              });
            }
          }, {
            key: "_notify",
            value: function _notify(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              if (this.batchMode) return this;var i = (t = void 0 === t ? [] : Array.isArray(t) ? t : [t]).concat(this.getDirtyNodes());return this.onChange && this.onChange(i, e), this;
            }
          }, {
            key: "cleanNodes",
            value: function cleanNodes() {
              return this.batchMode || this.nodes.forEach(function (t) {
                delete t._dirty, delete t._lastTried;
              }), this;
            }
          }, {
            key: "saveInitial",
            value: function saveInitial() {
              return this.nodes.forEach(function (t) {
                t._orig = s.Utils.copyPos({}, t), delete t._dirty;
              }), this._hasLocked = this.nodes.some(function (t) {
                return t.locked;
              }), this;
            }
          }, {
            key: "restoreInitial",
            value: function restoreInitial() {
              return this.nodes.forEach(function (t) {
                s.Utils.samePos(t, t._orig) || (s.Utils.copyPos(t, t._orig), t._dirty = !0);
              }), this._notify(), this;
            }
          }, {
            key: "addNode",
            value: function addNode(t) {
              var _this10 = this;

              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
              var i = void 0;if (i = this.nodes.find(function (e) {
                return e._id === t._id;
              })) return i;if (delete (t = this.prepareNode(t))._temporaryRemoved, delete t._removeDOM, t.autoPosition) {
                this._sortNodes();
                var _loop = function _loop(_e5) {
                  var i = _e5 % _this10.column,
                      o = Math.floor(_e5 / _this10.column);if (i + t.w > _this10.column) return "continue";var r = { x: i, y: o, w: t.w, h: t.h };if (!_this10.nodes.find(function (t) {
                    return s.Utils.isIntercepted(r, t);
                  })) {
                    t.x = i, t.y = o, delete t.autoPosition;return "break";
                  }
                };

                _loop2: for (var _e5 = 0;; ++_e5) {
                  var _ret = _loop(_e5);

                  switch (_ret) {
                    case "continue":
                      continue;

                    case "break":
                      break _loop2;}
                }
              }return this.nodes.push(t), e && this.addedNodes.push(t), this._fixCollisions(t), this._packNodes()._notify(), t;
            }
          }, {
            key: "removeNode",
            value: function removeNode(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
              return this.nodes.find(function (e) {
                return e === t;
              }) ? (i && this.removedNodes.push(t), e && (t._removeDOM = !0), this.nodes = this.nodes.filter(function (e) {
                return e !== t;
              }), this._packNodes()._notify(t)) : this;
            }
          }, {
            key: "removeAll",
            value: function removeAll() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
              return delete this._layouts, 0 === this.nodes.length ? this : (t && this.nodes.forEach(function (t) {
                return t._removeDOM = !0;
              }), this.removedNodes = this.nodes, this.nodes = [], this._notify(this.removedNodes));
            }
          }, {
            key: "moveNodeCheck",
            value: function moveNodeCheck(t, e) {
              var _this11 = this;

              if (!this.changedPosConstrain(t, e)) return !1;if (e.pack = !0, !this.maxRow) return this.moveNode(t, e);var i = void 0,
                  r = new o({ column: this.column, float: this.float, nodes: this.nodes.map(function (e) {
                  return e === t ? (i = Object.assign({}, e), i) : Object.assign({}, e);
                }) });if (!i) return !1;var n = r.moveNode(i, e);if (this.maxRow && n && (n = r.getRow() <= this.maxRow, !n && !e.resizing)) {
                var _i4 = this.collide(t, e);if (_i4 && this.swap(t, _i4)) return this._notify(), !0;
              }return !!n && (r.nodes.filter(function (t) {
                return t._dirty;
              }).forEach(function (t) {
                var e = _this11.nodes.find(function (e) {
                  return e._id === t._id;
                });e && (s.Utils.copyPos(e, t), e._dirty = !0);
              }), this._notify(), !0);
            }
          }, {
            key: "willItFit",
            value: function willItFit(t) {
              if (delete t._willFitPos, !this.maxRow) return !0;var e = new o({ column: this.column, float: this.float, nodes: this.nodes.map(function (t) {
                  return Object.assign({}, t);
                }) }),
                  i = Object.assign({}, t);return this.cleanupNode(i), delete i.el, delete i._id, delete i.content, delete i.grid, e.addNode(i), e.getRow() <= this.maxRow && (t._willFitPos = s.Utils.copyPos({}, i), !0);
            }
          }, {
            key: "changedPosConstrain",
            value: function changedPosConstrain(t, e) {
              return e.w = e.w || t.w, e.h = e.h || t.h, t.x !== e.x || t.y !== e.y || (t.maxW && (e.w = Math.min(e.w, t.maxW)), t.maxH && (e.h = Math.min(e.h, t.maxH)), t.minW && (e.w = Math.max(e.w, t.minW)), t.minH && (e.h = Math.max(e.h, t.minH)), t.w !== e.w || t.h !== e.h);
            }
          }, {
            key: "moveNode",
            value: function moveNode(t, e) {
              if (!t || !e) return !1;void 0 === e.pack && (e.pack = !0), "number" != typeof e.x && (e.x = t.x), "number" != typeof e.y && (e.y = t.y), "number" != typeof e.w && (e.w = t.w), "number" != typeof e.h && (e.h = t.h);var i = t.w !== e.w || t.h !== e.h,
                  o = s.Utils.copyPos({}, t, !0);if (s.Utils.copyPos(o, e), o = this.nodeBoundFix(o, i), s.Utils.copyPos(e, o), s.Utils.samePos(t, e)) return !1;var r = s.Utils.copyPos({}, t),
                  n = o,
                  l = this.collideAll(t, n, e.skip),
                  a = !0;if (l.length) {
                var _i5 = t._moving && !e.nested ? this.collideCoverage(t, e, l) : l[0];a = !!_i5 && !this._fixCollisions(t, o, _i5, e);
              }return a && (t._dirty = !0, s.Utils.copyPos(t, o)), e.pack && this._packNodes()._notify(), !s.Utils.samePos(t, r);
            }
          }, {
            key: "getRow",
            value: function getRow() {
              return this.nodes.reduce(function (t, e) {
                return Math.max(t, e.y + e.h);
              }, 0);
            }
          }, {
            key: "beginUpdate",
            value: function beginUpdate(t) {
              return t._updating || (t._updating = !0, delete t._skipDown, this.batchMode || this.saveInitial()), this;
            }
          }, {
            key: "endUpdate",
            value: function endUpdate() {
              var t = this.nodes.find(function (t) {
                return t._updating;
              });return t && (delete t._updating, delete t._skipDown), this;
            }
          }, {
            key: "save",
            value: function save() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
              var e;var i = null === (e = this._layouts) || void 0 === e ? void 0 : e.length,
                  s = i && this.column !== i - 1 ? this._layouts[i - 1] : null,
                  o = [];return this._sortNodes(), this.nodes.forEach(function (e) {
                var i = null == s ? void 0 : s.find(function (t) {
                  return t._id === e._id;
                }),
                    r = Object.assign({}, e);i && (r.x = i.x, r.y = i.y, r.w = i.w);for (var _t6 in r) {
                  "_" !== _t6[0] && null !== r[_t6] && void 0 !== r[_t6] || delete r[_t6];
                }delete r.grid, t || delete r.el, r.autoPosition || delete r.autoPosition, r.noResize || delete r.noResize, r.noMove || delete r.noMove, r.locked || delete r.locked, o.push(r);
              }), o;
            }
          }, {
            key: "layoutsNodesChange",
            value: function layoutsNodesChange(t) {
              var _this12 = this;

              return !this._layouts || this._ignoreLayoutsNodeChange || this._layouts.forEach(function (e, i) {
                if (!e || i === _this12.column) return _this12;i < _this12.column ? _this12._layouts[i] = void 0 : t.forEach(function (t) {
                  if (!t._orig) return;var s = e.find(function (e) {
                    return e._id === t._id;
                  });if (!s) return;var o = i / _this12.column;t.y !== t._orig.y && (s.y += t.y - t._orig.y), t.x !== t._orig.x && (s.x = Math.round(t.x * o)), t.w !== t._orig.w && (s.w = Math.round(t.w * o));
                });
              }), this;
            }
          }, {
            key: "updateNodeWidths",
            value: function updateNodeWidths(t, e, i) {
              var _this13 = this;

              var o = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "moveScale";
              if (!this.nodes.length || t === e) return this;if (this.cacheLayout(this.nodes, t), 1 === e && i && i.length) {
                var _t7 = 0;i.forEach(function (e) {
                  e.x = 0, e.w = 1, e.y = Math.max(e.y, _t7), _t7 = e.y + e.h;
                });
              } else i = s.Utils.sort(this.nodes, -1, t);var r = this._layouts[e] || [],
                  n = this._layouts.length - 1;0 === r.length && e > t && e < n && (r = this._layouts[n] || [], r.length && (t = n, r.forEach(function (t) {
                var e = i.findIndex(function (e) {
                  return e._id === t._id;
                });-1 !== e && (i[e].x = t.x, i[e].y = t.y, i[e].w = t.w);
              }), r = []));var l = [];if (r.forEach(function (t) {
                var e = i.findIndex(function (e) {
                  return e._id === t._id;
                });-1 !== e && (i[e].x = t.x, i[e].y = t.y, i[e].w = t.w, l.push(i[e]), i.splice(e, 1));
              }), i.length) if ("function" == typeof o) o(e, t, l, i);else {
                var _s3 = e / t,
                    _r3 = "move" === o || "moveScale" === o,
                    _n2 = "scale" === o || "moveScale" === o;i.forEach(function (i) {
                  i.x = 1 === e ? 0 : _r3 ? Math.round(i.x * _s3) : Math.min(i.x, e - 1), i.w = 1 === e || 1 === t ? 1 : _n2 ? Math.round(i.w * _s3) || 1 : Math.min(i.w, e), l.push(i);
                }), i = [];
              }return l = s.Utils.sort(l, -1, e), this._ignoreLayoutsNodeChange = !0, this.batchUpdate(), this.nodes = [], l.forEach(function (t) {
                _this13.addNode(t, !1), t._dirty = !0;
              }, this), this.commit(), delete this._ignoreLayoutsNodeChange, this;
            }
          }, {
            key: "cacheLayout",
            value: function cacheLayout(t, e) {
              var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
              var s = [];return t.forEach(function (t, e) {
                t._id = t._id || o._idSeq++, s[e] = { x: t.x, y: t.y, w: t.w, _id: t._id };
              }), this._layouts = i ? [] : this._layouts || [], this._layouts[e] = s, this;
            }
          }, {
            key: "cacheOneLayout",
            value: function cacheOneLayout(t, e) {
              t._id = t._id || o._idSeq++;var i = { x: t.x, y: t.y, w: t.w, _id: t._id };this._layouts = this._layouts || [], this._layouts[e] = this._layouts[e] || [];var s = this._layouts[e].findIndex(function (e) {
                return e._id === t._id;
              });return -1 === s ? this._layouts[e].push(i) : this._layouts[e][s] = i, this;
            }
          }, {
            key: "cleanupNode",
            value: function cleanupNode(t) {
              for (var _e6 in t) {
                "_" === _e6[0] && "_id" !== _e6 && delete t[_e6];
              }return this;
            }
          }, {
            key: "float",
            set: function set(t) {
              this._float !== t && (this._float = t || !1, t || this._packNodes()._notify());
            },
            get: function get() {
              return this._float || !1;
            }
          }]);

          return o;
        }();

        e.GridStackEngine = o, o._idSeq = 1;
      }, 930: function _(t, e, i) {
        var s = this && this.__createBinding || (Object.create ? function (t, e, i, s) {
          void 0 === s && (s = i), Object.defineProperty(t, s, { enumerable: !0, get: function get() {
              return e[i];
            } });
        } : function (t, e, i, s) {
          void 0 === s && (s = i), t[s] = e[i];
        }),
            o = this && this.__exportStar || function (t, e) {
          for (var i in t) {
            "default" === i || e.hasOwnProperty(i) || s(e, t, i);
          }
        };Object.defineProperty(e, "__esModule", { value: !0 }), o(i(699), e), o(i(593), e), o(i(62), e), o(i(334), e), o(i(270), e), o(i(761), e);
      }, 270: function _(t, e, i) {
        var s = this && this.__createBinding || (Object.create ? function (t, e, i, s) {
          void 0 === s && (s = i), Object.defineProperty(t, s, { enumerable: !0, get: function get() {
              return e[i];
            } });
        } : function (t, e, i, s) {
          void 0 === s && (s = i), t[s] = e[i];
        }),
            o = this && this.__exportStar || function (t, e) {
          for (var i in t) {
            "default" === i || e.hasOwnProperty(i) || s(e, t, i);
          }
        };Object.defineProperty(e, "__esModule", { value: !0 }), e.GridStack = void 0;var r = i(62),
            n = i(593),
            l = i(334);o(i(699), e), o(i(593), e), o(i(62), e), o(i(334), e);var a = { column: 12, minRow: 0, maxRow: 0, itemClass: "grid-stack-item", placeholderClass: "grid-stack-placeholder", placeholderText: "", handle: ".grid-stack-item-content", handleClass: null, styleInHead: !1, cellHeight: "auto", cellHeightThrottle: 100, margin: 10, auto: !0, minWidth: 768, float: !1, staticGrid: !1, animate: !0, alwaysShowResizeHandle: !1, resizable: { autoHide: !0, handles: "se" }, draggable: { handle: ".grid-stack-item-content", scroll: !1, appendTo: "body" }, disableDrag: !1, disableResize: !1, rtl: "auto", removable: !1, removableOptions: { accept: ".grid-stack-item" }, marginUnit: "px", cellHeightUnit: "px", disableOneColumnMode: !1, oneColumnModeDomSort: !1 };
        var h = function () {
          function h(t) {
            var _this14 = this;

            var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _classCallCheck(this, h);

            this._gsEventHandler = {}, this._extraDragRow = 0, this.el = t, (e = e || {}).row && (e.minRow = e.maxRow = e.row, delete e.row);var i = n.Utils.toNumber(t.getAttribute("gs-row")),
                s = Object.assign(Object.assign({}, n.Utils.cloneDeep(a)), { column: n.Utils.toNumber(t.getAttribute("gs-column")) || 12, minRow: i || n.Utils.toNumber(t.getAttribute("gs-min-row")) || 0, maxRow: i || n.Utils.toNumber(t.getAttribute("gs-max-row")) || 0, staticGrid: n.Utils.toBool(t.getAttribute("gs-static")) || !1, _styleSheetClass: "grid-stack-instance-" + (1e4 * Math.random()).toFixed(0), alwaysShowResizeHandle: e.alwaysShowResizeHandle || !1, resizable: { autoHide: !e.alwaysShowResizeHandle, handles: "se" }, draggable: { handle: (e.handleClass ? "." + e.handleClass : e.handle ? e.handle : "") || ".grid-stack-item-content", scroll: !1, appendTo: "body" }, removableOptions: { accept: "." + (e.itemClass || "grid-stack-item") } });t.getAttribute("gs-animate") && (s.animate = n.Utils.toBool(t.getAttribute("gs-animate"))), this.opts = n.Utils.defaults(e, s), e = null, this.initMargin(), 1 !== this.opts.column && !this.opts.disableOneColumnMode && this._widthOrContainer() <= this.opts.minWidth && (this._prevColumn = this.opts.column, this.opts.column = 1), "auto" === this.opts.rtl && (this.opts.rtl = "rtl" === t.style.direction), this.opts.rtl && this.el.classList.add("grid-stack-rtl");var o = n.Utils.closestByClass(this.el, a.itemClass);if (o && o.gridstackNode && (this.opts._isNested = o.gridstackNode, this.opts._isNested.subGrid = this, this.el.classList.add("grid-stack-nested")), this._isAutoCellHeight = "auto" === this.opts.cellHeight, this._isAutoCellHeight || "initial" === this.opts.cellHeight ? this.cellHeight(void 0, !1) : ("number" == typeof this.opts.cellHeight && this.opts.cellHeightUnit && this.opts.cellHeightUnit !== a.cellHeightUnit && (this.opts.cellHeight = this.opts.cellHeight + this.opts.cellHeightUnit, delete this.opts.cellHeightUnit), this.cellHeight(this.opts.cellHeight, !1)), this.el.classList.add(this.opts._styleSheetClass), this._setStaticClass(), this.engine = new r.GridStackEngine({ column: this.opts.column, float: this.opts.float, maxRow: this.opts.maxRow, onChange: function onChange(t) {
                var e = 0;_this14.engine.nodes.forEach(function (t) {
                  e = Math.max(e, t.y + t.h);
                }), t.forEach(function (t) {
                  var e = t.el;t._removeDOM ? (e && e.remove(), delete t._removeDOM) : _this14._writePosAttr(e, t);
                }), _this14._updateStyles(!1, e);
              } }), this.opts.auto) {
              this.batchUpdate();var _t8 = [];this.getGridItems().forEach(function (e) {
                var i = parseInt(e.getAttribute("gs-x")),
                    s = parseInt(e.getAttribute("gs-y"));_t8.push({ el: e, i: (Number.isNaN(i) ? 1e3 : i) + (Number.isNaN(s) ? 1e3 : s) * _this14.opts.column });
              }), _t8.sort(function (t, e) {
                return t.i - e.i;
              }).forEach(function (t) {
                return _this14._prepareElement(t.el);
              }), this.commit();
            }this.setAnimation(this.opts.animate), this._updateStyles(), 12 != this.opts.column && this.el.classList.add("grid-stack-" + this.opts.column), this.opts.dragIn && h.setupDragIn(this.opts.dragIn, this.opts.dragInOptions), delete this.opts.dragIn, delete this.opts.dragInOptions, this._setupRemoveDrop(), this._setupAcceptWidget(), this._updateWindowResizeEvent();
          }

          _createClass(h, [{
            key: "addWidget",
            value: function addWidget(t, e) {
              if (arguments.length > 2) {
                console.warn("gridstack.ts: `addWidget(el, x, y, width...)` is deprecated. Use `addWidget({x, y, w, content, ...})`. It will be removed soon");var _e7 = arguments,
                    _i6 = 1,
                    _s4 = { x: _e7[_i6++], y: _e7[_i6++], w: _e7[_i6++], h: _e7[_i6++], autoPosition: _e7[_i6++], minW: _e7[_i6++], maxW: _e7[_i6++], minH: _e7[_i6++], maxH: _e7[_i6++], id: _e7[_i6++] };return this.addWidget(t, _s4);
              }var i = void 0;if ("string" == typeof t) {
                var _e8 = document.implementation.createHTMLDocument();_e8.body.innerHTML = t, i = _e8.body.children[0];
              } else if (0 === arguments.length || 1 === arguments.length && (void 0 !== (s = t).x || void 0 !== s.y || void 0 !== s.w || void 0 !== s.h || void 0 !== s.content)) {
                var _s5 = t && t.content || "";e = t;var _o2 = document.implementation.createHTMLDocument();_o2.body.innerHTML = "<div class=\"grid-stack-item " + (this.opts.itemClass || "") + "\"><div class=\"grid-stack-item-content\">" + _s5 + "</div></div>", i = _o2.body.children[0];
              } else i = t;var s;var o = this._readAttr(i);e = n.Utils.cloneDeep(e) || {}, n.Utils.defaults(e, o);var r = this.engine.prepareNode(e);if (this._writeAttr(i, e), this._insertNotAppend ? this.el.prepend(i) : this.el.appendChild(i), this._prepareElement(i, !0, e), this._updateContainerHeight(), r.subGrid && !r.subGrid.el) {
                var _t9 = r.el.querySelector(".grid-stack-item-content");r.subGrid = h.addGrid(_t9, r.subGrid);
              }return this._triggerAddEvent(), this._triggerChangeEvent(), i;
            }
          }, {
            key: "save",
            value: function save() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
              var i = this.engine.save(t);if (i.forEach(function (e) {
                if (t && e.el && !e.subGrid) {
                  var _t10 = e.el.querySelector(".grid-stack-item-content");e.content = _t10 ? _t10.innerHTML : void 0, e.content || delete e.content;
                } else t || delete e.content, e.subGrid && (e.subGrid = e.subGrid.save(t, !0));delete e.el;
              }), e) {
                var _t11 = n.Utils.cloneDeep(this.opts);return _t11.marginBottom === _t11.marginTop && _t11.marginRight === _t11.marginLeft && _t11.marginTop === _t11.marginRight && (_t11.margin = _t11.marginTop, delete _t11.marginTop, delete _t11.marginRight, delete _t11.marginBottom, delete _t11.marginLeft), _t11.rtl === ("rtl" === this.el.style.direction) && (_t11.rtl = "auto"), this._isAutoCellHeight && (_t11.cellHeight = "auto"), n.Utils.removeInternalAndSame(_t11, a), _t11.children = i, _t11;
              }return i;
            }
          }, {
            key: "load",
            value: function load(t) {
              var _this15 = this;

              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              var i = h.Utils.sort([].concat(_toConsumableArray(t)), -1, this._prevColumn || this.opts.column);this._insertNotAppend = !0, this._prevColumn && this._prevColumn !== this.opts.column && i.some(function (t) {
                return t.x + t.w > _this15.opts.column;
              }) && (this._ignoreLayoutsNodeChange = !0, this.engine.cacheLayout(i, this._prevColumn, !0));var s = [];return this.batchUpdate(), e && [].concat(_toConsumableArray(this.engine.nodes)).forEach(function (t) {
                i.find(function (e) {
                  return t.id === e.id;
                }) || ("function" == typeof e ? e(_this15, t, !1) : (s.push(t), _this15.removeWidget(t.el, !0, !1)));
              }), i.forEach(function (t) {
                var i = t.id || 0 === t.id ? _this15.engine.nodes.find(function (e) {
                  return e.id === t.id;
                }) : void 0;if (i) {
                  if (_this15.update(i.el, t), t.subGrid && t.subGrid.children) {
                    var _e9 = i.el.querySelector(".grid-stack");_e9 && _e9.gridstack && (_e9.gridstack.load(t.subGrid.children), _this15._insertNotAppend = !0);
                  }
                } else e && (t = "function" == typeof e ? e(_this15, t, !0).gridstackNode : _this15.addWidget(t).gridstackNode);
              }), this.engine.removedNodes = s, this.commit(), delete this._ignoreLayoutsNodeChange, delete this._insertNotAppend, this;
            }
          }, {
            key: "batchUpdate",
            value: function batchUpdate() {
              return this.engine.batchUpdate(), this;
            }
          }, {
            key: "getCellHeight",
            value: function getCellHeight() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
              return !this.opts.cellHeight || "auto" === this.opts.cellHeight || t && this.opts.cellHeightUnit && "px" !== this.opts.cellHeightUnit ? Math.round(this.el.getBoundingClientRect().height) / parseInt(this.el.getAttribute("gs-current-row")) : this.opts.cellHeight;
            }
          }, {
            key: "cellHeight",
            value: function cellHeight(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              if (e && void 0 !== t && this._isAutoCellHeight !== ("auto" === t) && (this._isAutoCellHeight = "auto" === t, this._updateWindowResizeEvent()), "initial" !== t && "auto" !== t || (t = void 0), void 0 === t) {
                var _e10 = -this.opts.marginRight - this.opts.marginLeft + this.opts.marginTop + this.opts.marginBottom;t = this.cellWidth() + _e10;
              }var i = n.Utils.parseHeight(t);return this.opts.cellHeightUnit === i.unit && this.opts.cellHeight === i.h || (this.opts.cellHeightUnit = i.unit, this.opts.cellHeight = i.h, e && this._updateStyles(!0, this.getRow())), this;
            }
          }, {
            key: "cellWidth",
            value: function cellWidth() {
              return this._widthOrContainer() / this.opts.column;
            }
          }, {
            key: "_widthOrContainer",
            value: function _widthOrContainer() {
              return this.el.clientWidth || this.el.parentElement.clientWidth || window.innerWidth;
            }
          }, {
            key: "commit",
            value: function commit() {
              return this.engine.commit(), this._triggerRemoveEvent(), this._triggerAddEvent(), this._triggerChangeEvent(), this;
            }
          }, {
            key: "compact",
            value: function compact() {
              return this.engine.compact(), this._triggerChangeEvent(), this;
            }
          }, {
            key: "column",
            value: function column(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "moveScale";
              if (this.opts.column === t) return this;var i = void 0,
                  s = this.opts.column;return 1 === t ? this._prevColumn = s : delete this._prevColumn, this.el.classList.remove("grid-stack-" + s), this.el.classList.add("grid-stack-" + t), this.opts.column = this.engine.column = t, 1 === t && this.opts.oneColumnModeDomSort && (i = [], this.getGridItems().forEach(function (t) {
                t.gridstackNode && i.push(t.gridstackNode);
              }), i.length || (i = void 0)), this.engine.updateNodeWidths(s, t, i, e), this._isAutoCellHeight && this.cellHeight(), this._ignoreLayoutsNodeChange = !0, this._triggerChangeEvent(), delete this._ignoreLayoutsNodeChange, this;
            }
          }, {
            key: "getColumn",
            value: function getColumn() {
              return this.opts.column;
            }
          }, {
            key: "getGridItems",
            value: function getGridItems() {
              var _this16 = this;

              return Array.from(this.el.children).filter(function (t) {
                return t.matches("." + _this16.opts.itemClass) && !t.matches("." + _this16.opts.placeholderClass);
              });
            }
          }, {
            key: "destroy",
            value: function destroy() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
              if (this.el) return this._updateWindowResizeEvent(!0), this.setStatic(!0, !1), this.setAnimation(!1), t ? this.el.parentNode.removeChild(this.el) : (this.removeAll(t), this.el.classList.remove(this.opts._styleSheetClass)), this._removeStylesheet(), this.el.removeAttribute("gs-current-row"), delete this.opts._isNested, delete this.opts, delete this._placeholder, delete this.engine, delete this.el.gridstack, delete this.el, this;
            }
          }, {
            key: "float",
            value: function float(t) {
              return this.engine.float = t, this._triggerChangeEvent(), this;
            }
          }, {
            key: "getFloat",
            value: function getFloat() {
              return this.engine.float;
            }
          }, {
            key: "getCellFromPixel",
            value: function getCellFromPixel(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
              var i = void 0,
                  s = this.el.getBoundingClientRect();i = e ? { top: s.top + document.documentElement.scrollTop, left: s.left } : { top: this.el.offsetTop, left: this.el.offsetLeft };var o = t.left - i.left,
                  r = t.top - i.top,
                  n = s.width / this.opts.column,
                  l = s.height / parseInt(this.el.getAttribute("gs-current-row"));return { x: Math.floor(o / n), y: Math.floor(r / l) };
            }
          }, {
            key: "getRow",
            value: function getRow() {
              return Math.max(this.engine.getRow(), this.opts.minRow);
            }
          }, {
            key: "isAreaEmpty",
            value: function isAreaEmpty(t, e, i, s) {
              return this.engine.isAreaEmpty(t, e, i, s);
            }
          }, {
            key: "makeWidget",
            value: function makeWidget(t) {
              var e = h.getElement(t);return this._prepareElement(e, !0), this._updateContainerHeight(), this._triggerAddEvent(), this._triggerChangeEvent(), e;
            }
          }, {
            key: "on",
            value: function on(t, e) {
              var _this17 = this;

              if (-1 !== t.indexOf(" ")) return t.split(" ").forEach(function (t) {
                return _this17.on(t, e);
              }), this;if ("change" === t || "added" === t || "removed" === t || "enable" === t || "disable" === t) {
                var _i7 = "enable" === t || "disable" === t;this._gsEventHandler[t] = _i7 ? function (t) {
                  return e(t);
                } : function (t) {
                  return e(t, t.detail);
                }, this.el.addEventListener(t, this._gsEventHandler[t]);
              } else "drag" === t || "dragstart" === t || "dragstop" === t || "resizestart" === t || "resize" === t || "resizestop" === t || "dropped" === t ? this._gsEventHandler[t] = e : console.log("GridStack.on(" + t + ') event not supported, but you can still use $(".grid-stack").on(...) while jquery-ui is still used internally.');return this;
            }
          }, {
            key: "off",
            value: function off(t) {
              var _this18 = this;

              return -1 !== t.indexOf(" ") ? (t.split(" ").forEach(function (t) {
                return _this18.off(t);
              }), this) : ("change" !== t && "added" !== t && "removed" !== t && "enable" !== t && "disable" !== t || this._gsEventHandler[t] && this.el.removeEventListener(t, this._gsEventHandler[t]), delete this._gsEventHandler[t], this);
            }
          }, {
            key: "removeWidget",
            value: function removeWidget(t) {
              var _this19 = this;

              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !0;
              return h.getElements(t).forEach(function (t) {
                if (t.parentElement !== _this19.el) return;var s = t.gridstackNode;s || (s = _this19.engine.nodes.find(function (e) {
                  return t === e.el;
                })), s && (delete t.gridstackNode, l.GridStackDDI.get().remove(t), _this19.engine.removeNode(s, e, i), e && t.parentElement && t.remove());
              }), i && (this._triggerRemoveEvent(), this._triggerChangeEvent()), this;
            }
          }, {
            key: "removeAll",
            value: function removeAll() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
              return this.engine.nodes.forEach(function (t) {
                delete t.el.gridstackNode, l.GridStackDDI.get().remove(t.el);
              }), this.engine.removeAll(t), this._triggerRemoveEvent(), this;
            }
          }, {
            key: "setAnimation",
            value: function setAnimation(t) {
              return t ? this.el.classList.add("grid-stack-animate") : this.el.classList.remove("grid-stack-animate"), this;
            }
          }, {
            key: "setStatic",
            value: function setStatic(t) {
              var _this20 = this;

              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              return this.opts.staticGrid === t || (this.opts.staticGrid = t, this._setupRemoveDrop(), this._setupAcceptWidget(), this.engine.nodes.forEach(function (t) {
                return _this20._prepareDragDropByNode(t);
              }), e && this._setStaticClass()), this;
            }
          }, {
            key: "update",
            value: function update(t, e) {
              var _this21 = this;

              if (arguments.length > 2) {
                console.warn("gridstack.ts: `update(el, x, y, w, h)` is deprecated. Use `update(el, {x, w, content, ...})`. It will be removed soon");var _i8 = arguments,
                    _s6 = 1;return e = { x: _i8[_s6++], y: _i8[_s6++], w: _i8[_s6++], h: _i8[_s6++] }, this.update(t, e);
              }return h.getElements(t).forEach(function (t) {
                if (!t || !t.gridstackNode) return;var i = t.gridstackNode,
                    s = n.Utils.cloneDeep(e);delete s.autoPosition;var o = void 0,
                    r = ["x", "y", "w", "h"];if (r.some(function (t) {
                  return void 0 !== s[t] && s[t] !== i[t];
                }) && (o = {}, r.forEach(function (t) {
                  o[t] = void 0 !== s[t] ? s[t] : i[t], delete s[t];
                })), !o && (s.minW || s.minH || s.maxW || s.maxH) && (o = {}), s.content) {
                  var _e11 = t.querySelector(".grid-stack-item-content");_e11 && _e11.innerHTML !== s.content && (_e11.innerHTML = s.content), delete s.content;
                }var l = !1,
                    a = !1;for (var _t12 in s) {
                  "_" !== _t12[0] && i[_t12] !== s[_t12] && (i[_t12] = s[_t12], l = !0, a = a || !_this21.opts.staticGrid && ("noResize" === _t12 || "noMove" === _t12 || "locked" === _t12));
                }o && (_this21.engine.cleanNodes().beginUpdate(i).moveNode(i, o), _this21._updateContainerHeight(), _this21._triggerChangeEvent(), _this21.engine.endUpdate()), l && _this21._writeAttr(t, i), a && _this21._prepareDragDropByNode(i);
              }), this;
            }
          }, {
            key: "margin",
            value: function margin(t) {
              if (!("string" == typeof t && t.split(" ").length > 1)) {
                var _e12 = n.Utils.parseHeight(t);if (this.opts.marginUnit === _e12.unit && this.opts.margin === _e12.h) return;
              }return this.opts.margin = t, this.opts.marginTop = this.opts.marginBottom = this.opts.marginLeft = this.opts.marginRight = void 0, this.initMargin(), this._updateStyles(!0), this;
            }
          }, {
            key: "getMargin",
            value: function getMargin() {
              return this.opts.margin;
            }
          }, {
            key: "willItFit",
            value: function willItFit(t) {
              if (arguments.length > 1) {
                console.warn("gridstack.ts: `willItFit(x,y,w,h,autoPosition)` is deprecated. Use `willItFit({x, y,...})`. It will be removed soon");var _t13 = arguments,
                    _e13 = 0,
                    _i9 = { x: _t13[_e13++], y: _t13[_e13++], w: _t13[_e13++], h: _t13[_e13++], autoPosition: _t13[_e13++] };return this.willItFit(_i9);
              }return this.engine.willItFit(t);
            }
          }, {
            key: "_triggerChangeEvent",
            value: function _triggerChangeEvent() {
              if (this.engine.batchMode) return this;var t = this.engine.getDirtyNodes(!0);return t && t.length && (this._ignoreLayoutsNodeChange || this.engine.layoutsNodesChange(t), this._triggerEvent("change", t)), this.engine.saveInitial(), this;
            }
          }, {
            key: "_triggerAddEvent",
            value: function _triggerAddEvent() {
              return this.engine.batchMode || this.engine.addedNodes && this.engine.addedNodes.length > 0 && (this._ignoreLayoutsNodeChange || this.engine.layoutsNodesChange(this.engine.addedNodes), this.engine.addedNodes.forEach(function (t) {
                delete t._dirty;
              }), this._triggerEvent("added", this.engine.addedNodes), this.engine.addedNodes = []), this;
            }
          }, {
            key: "_triggerRemoveEvent",
            value: function _triggerRemoveEvent() {
              return this.engine.batchMode || this.engine.removedNodes && this.engine.removedNodes.length > 0 && (this._triggerEvent("removed", this.engine.removedNodes), this.engine.removedNodes = []), this;
            }
          }, {
            key: "_triggerEvent",
            value: function _triggerEvent(t, e) {
              var i = e ? new CustomEvent(t, { bubbles: !1, detail: e }) : new Event(t);return this.el.dispatchEvent(i), this;
            }
          }, {
            key: "_removeStylesheet",
            value: function _removeStylesheet() {
              return this._styles && (n.Utils.removeStylesheet(this._styles._id), delete this._styles), this;
            }
          }, {
            key: "_updateStyles",
            value: function _updateStyles() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
              var e = arguments[1];
              if (t && this._removeStylesheet(), this._updateContainerHeight(), 0 === this.opts.cellHeight) return this;var i = this.opts.cellHeight,
                  s = this.opts.cellHeightUnit,
                  o = "." + this.opts._styleSheetClass + " > ." + this.opts.itemClass;if (!this._styles) {
                var _t14 = "gridstack-style-" + (1e5 * Math.random()).toFixed(),
                    _e14 = this.opts.styleInHead ? void 0 : this.el.parentNode;if (this._styles = n.Utils.createStylesheet(_t14, _e14), !this._styles) return this;this._styles._id = _t14, this._styles._max = 0, n.Utils.addCSSRule(this._styles, o, "min-height: " + i + s);var _r4 = this.opts.marginTop + this.opts.marginUnit,
                    _l3 = this.opts.marginBottom + this.opts.marginUnit,
                    _a = this.opts.marginRight + this.opts.marginUnit,
                    _h = this.opts.marginLeft + this.opts.marginUnit,
                    d = o + " > .grid-stack-item-content",
                    g = "." + this.opts._styleSheetClass + " > .grid-stack-placeholder > .placeholder-content";n.Utils.addCSSRule(this._styles, d, "top: " + _r4 + "; right: " + _a + "; bottom: " + _l3 + "; left: " + _h + ";"), n.Utils.addCSSRule(this._styles, g, "top: " + _r4 + "; right: " + _a + "; bottom: " + _l3 + "; left: " + _h + ";"), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-ne", "right: " + _a), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-e", "right: " + _a), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-se", "right: " + _a + "; bottom: " + _l3), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-nw", "left: " + _h), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-w", "left: " + _h), n.Utils.addCSSRule(this._styles, o + " > .ui-resizable-sw", "left: " + _h + "; bottom: " + _l3);
              }if ((e = e || this._styles._max) > this._styles._max) {
                var _t15 = function _t15(t) {
                  return i * t + s;
                };for (var _i10 = this._styles._max + 1; _i10 <= e; _i10++) {
                  var _e15 = _t15(_i10);n.Utils.addCSSRule(this._styles, o + "[gs-y=\"" + (_i10 - 1) + "\"]", "top: " + _t15(_i10 - 1)), n.Utils.addCSSRule(this._styles, o + "[gs-h=\"" + _i10 + "\"]", "height: " + _e15), n.Utils.addCSSRule(this._styles, o + "[gs-min-h=\"" + _i10 + "\"]", "min-height: " + _e15), n.Utils.addCSSRule(this._styles, o + "[gs-max-h=\"" + _i10 + "\"]", "max-height: " + _e15);
                }this._styles._max = e;
              }return this;
            }
          }, {
            key: "_updateContainerHeight",
            value: function _updateContainerHeight() {
              if (!this.engine || this.engine.batchMode) return this;var t = this.getRow() + this._extraDragRow,
                  e = parseInt(getComputedStyle(this.el)["min-height"]);if (e > 0) {
                var _i11 = Math.round(e / this.getCellHeight(!0));t < _i11 && (t = _i11);
              }if (this.el.setAttribute("gs-current-row", String(t)), 0 === t) return this.el.style.removeProperty("height"), this;var i = this.opts.cellHeight,
                  s = this.opts.cellHeightUnit;return i ? (this.el.style.height = t * i + s, this) : this;
            }
          }, {
            key: "_prepareElement",
            value: function _prepareElement(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
              var i = arguments[2];
              i || (t.classList.add(this.opts.itemClass), i = this._readAttr(t)), t.gridstackNode = i, i.el = t, i.grid = this;var s = Object.assign({}, i);return i = this.engine.addNode(i, e), n.Utils.same(i, s) || this._writeAttr(t, i), this._prepareDragDropByNode(i), this;
            }
          }, {
            key: "_writePosAttr",
            value: function _writePosAttr(t, e) {
              return void 0 !== e.x && null !== e.x && t.setAttribute("gs-x", String(e.x)), void 0 !== e.y && null !== e.y && t.setAttribute("gs-y", String(e.y)), e.w && t.setAttribute("gs-w", String(e.w)), e.h && t.setAttribute("gs-h", String(e.h)), this;
            }
          }, {
            key: "_writeAttr",
            value: function _writeAttr(t, e) {
              if (!e) return this;this._writePosAttr(t, e);var i = { autoPosition: "gs-auto-position", minW: "gs-min-w", minH: "gs-min-h", maxW: "gs-max-w", maxH: "gs-max-h", noResize: "gs-no-resize", noMove: "gs-no-move", locked: "gs-locked", id: "gs-id", resizeHandles: "gs-resize-handles" };for (var _s7 in i) {
                e[_s7] ? t.setAttribute(i[_s7], String(e[_s7])) : t.removeAttribute(i[_s7]);
              }return this;
            }
          }, {
            key: "_readAttr",
            value: function _readAttr(t) {
              var e = {};e.x = n.Utils.toNumber(t.getAttribute("gs-x")), e.y = n.Utils.toNumber(t.getAttribute("gs-y")), e.w = n.Utils.toNumber(t.getAttribute("gs-w")), e.h = n.Utils.toNumber(t.getAttribute("gs-h")), e.maxW = n.Utils.toNumber(t.getAttribute("gs-max-w")), e.minW = n.Utils.toNumber(t.getAttribute("gs-min-w")), e.maxH = n.Utils.toNumber(t.getAttribute("gs-max-h")), e.minH = n.Utils.toNumber(t.getAttribute("gs-min-h")), e.autoPosition = n.Utils.toBool(t.getAttribute("gs-auto-position")), e.noResize = n.Utils.toBool(t.getAttribute("gs-no-resize")), e.noMove = n.Utils.toBool(t.getAttribute("gs-no-move")), e.locked = n.Utils.toBool(t.getAttribute("gs-locked")), e.resizeHandles = t.getAttribute("gs-resize-handles"), e.id = t.getAttribute("gs-id");for (var _t16 in e) {
                if (!e.hasOwnProperty(_t16)) return;e[_t16] || 0 === e[_t16] || delete e[_t16];
              }return e;
            }
          }, {
            key: "_setStaticClass",
            value: function _setStaticClass() {
              var _el$classList, _el$classList2;

              var t = ["grid-stack-static"];return this.opts.staticGrid ? ((_el$classList = this.el.classList).add.apply(_el$classList, t), this.el.setAttribute("gs-static", "true")) : ((_el$classList2 = this.el.classList).remove.apply(_el$classList2, t), this.el.removeAttribute("gs-static")), this;
            }
          }, {
            key: "onParentResize",
            value: function onParentResize() {
              var _this22 = this;

              if (!this.el || !this.el.clientWidth) return;var t = !this.opts.disableOneColumnMode && this.el.clientWidth <= this.opts.minWidth,
                  e = !1;return 1 === this.opts.column !== t && (e = !0, this.opts.animate && this.setAnimation(!1), this.column(t ? 1 : this._prevColumn), this.opts.animate && this.setAnimation(!0)), this._isAutoCellHeight && (!e && this.opts.cellHeightThrottle ? (this._cellHeightThrottle || (this._cellHeightThrottle = n.Utils.throttle(function () {
                return _this22.cellHeight();
              }, this.opts.cellHeightThrottle)), this._cellHeightThrottle()) : this.cellHeight()), this.engine.nodes.forEach(function (t) {
                t.subGrid && t.subGrid.onParentResize();
              }), this;
            }
          }, {
            key: "_updateWindowResizeEvent",
            value: function _updateWindowResizeEvent() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
              var e = (this._isAutoCellHeight || !this.opts.disableOneColumnMode) && !this.opts._isNested;return t || !e || this._windowResizeBind ? !t && e || !this._windowResizeBind || (window.removeEventListener("resize", this._windowResizeBind), delete this._windowResizeBind) : (this._windowResizeBind = this.onParentResize.bind(this), window.addEventListener("resize", this._windowResizeBind)), this;
            }
          }, {
            key: "initMargin",
            value: function initMargin() {
              var t = void 0,
                  e = 0,
                  i = [];return "string" == typeof this.opts.margin && (i = this.opts.margin.split(" ")), 2 === i.length ? (this.opts.marginTop = this.opts.marginBottom = i[0], this.opts.marginLeft = this.opts.marginRight = i[1]) : 4 === i.length ? (this.opts.marginTop = i[0], this.opts.marginRight = i[1], this.opts.marginBottom = i[2], this.opts.marginLeft = i[3]) : (t = n.Utils.parseHeight(this.opts.margin), this.opts.marginUnit = t.unit, e = this.opts.margin = t.h), void 0 === this.opts.marginTop ? this.opts.marginTop = e : (t = n.Utils.parseHeight(this.opts.marginTop), this.opts.marginTop = t.h, delete this.opts.margin), void 0 === this.opts.marginBottom ? this.opts.marginBottom = e : (t = n.Utils.parseHeight(this.opts.marginBottom), this.opts.marginBottom = t.h, delete this.opts.margin), void 0 === this.opts.marginRight ? this.opts.marginRight = e : (t = n.Utils.parseHeight(this.opts.marginRight), this.opts.marginRight = t.h, delete this.opts.margin), void 0 === this.opts.marginLeft ? this.opts.marginLeft = e : (t = n.Utils.parseHeight(this.opts.marginLeft), this.opts.marginLeft = t.h, delete this.opts.margin), this.opts.marginUnit = t.unit, this.opts.marginTop === this.opts.marginBottom && this.opts.marginLeft === this.opts.marginRight && this.opts.marginTop === this.opts.marginRight && (this.opts.margin = this.opts.marginTop), this;
            }
          }, {
            key: "movable",
            value: function movable(t, e) {
              return this;
            }
          }, {
            key: "resizable",
            value: function resizable(t, e) {
              return this;
            }
          }, {
            key: "disable",
            value: function disable() {
              return this;
            }
          }, {
            key: "enable",
            value: function enable() {
              return this;
            }
          }, {
            key: "enableMove",
            value: function enableMove(t) {
              return this;
            }
          }, {
            key: "enableResize",
            value: function enableResize(t) {
              return this;
            }
          }, {
            key: "_setupAcceptWidget",
            value: function _setupAcceptWidget() {
              return this;
            }
          }, {
            key: "_setupRemoveDrop",
            value: function _setupRemoveDrop() {
              return this;
            }
          }, {
            key: "_prepareDragDropByNode",
            value: function _prepareDragDropByNode(t) {
              return this;
            }
          }, {
            key: "_onStartMoving",
            value: function _onStartMoving(t, e, i, s, o, r) {}
          }, {
            key: "_dragOrResize",
            value: function _dragOrResize(t, e, i, s, o, r) {}
          }, {
            key: "_leave",
            value: function _leave(t, e) {}
          }, {
            key: "placeholder",
            get: function get() {
              if (!this._placeholder) {
                var _t17 = document.createElement("div");_t17.className = "placeholder-content", this.opts.placeholderText && (_t17.innerHTML = this.opts.placeholderText), this._placeholder = document.createElement("div"), this._placeholder.classList.add(this.opts.placeholderClass, a.itemClass, this.opts.itemClass), this.placeholder.appendChild(_t17);
              }return this._placeholder;
            }
          }], [{
            key: "init",
            value: function init() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ".grid-stack";
              var i = h.getGridElement(e);return i ? (i.gridstack || (i.gridstack = new h(i, n.Utils.cloneDeep(t))), i.gridstack) : ("string" == typeof e ? console.error('GridStack.initAll() no grid was found with selector "' + e + '" - element missing or wrong selector ?\nNote: ".grid-stack" is required for proper CSS styling and drag/drop, and is the default selector.') : console.error("GridStack.init() no grid element was passed."), null);
            }
          }, {
            key: "initAll",
            value: function initAll() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ".grid-stack";
              var i = [];return h.getGridElements(e).forEach(function (e) {
                e.gridstack || (e.gridstack = new h(e, n.Utils.cloneDeep(t)), delete t.dragIn, delete t.dragInOptions), i.push(e.gridstack);
              }), 0 === i.length && console.error('GridStack.initAll() no grid was found with selector "' + e + '" - element missing or wrong selector ?\nNote: ".grid-stack" is required for proper CSS styling and drag/drop, and is the default selector.'), i;
            }
          }, {
            key: "addGrid",
            value: function addGrid(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
              if (!t) return null;var i = t;if (!t.classList.contains("grid-stack")) {
                var _s8 = document.implementation.createHTMLDocument();_s8.body.innerHTML = "<div class=\"grid-stack " + (e.class || "") + "\"></div>", i = _s8.body.children[0], t.appendChild(i);
              }var s = h.init(e, i);if (s.opts.children) {
                var _t18 = s.opts.children;delete s.opts.children, s.load(_t18);
              }return s;
            }
          }, {
            key: "getElement",
            value: function getElement() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ".grid-stack-item";
              return n.Utils.getElement(t);
            }
          }, {
            key: "getElements",
            value: function getElements() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ".grid-stack-item";
              return n.Utils.getElements(t);
            }
          }, {
            key: "getGridElement",
            value: function getGridElement(t) {
              return h.getElement(t);
            }
          }, {
            key: "getGridElements",
            value: function getGridElements(t) {
              return n.Utils.getElements(t);
            }
          }, {
            key: "setupDragIn",
            value: function setupDragIn(t, e) {}
          }]);

          return h;
        }();

        e.GridStack = h, h.Utils = n.Utils, h.Engine = r.GridStackEngine;
      }, 861: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDBaseImplement = void 0, e.DDBaseImplement = function () {
          function _class() {
            _classCallCheck(this, _class);

            this._disabled = !1, this._eventRegister = {};
          }

          _createClass(_class, [{
            key: "on",
            value: function on(t, e) {
              this._eventRegister[t] = e;
            }
          }, {
            key: "off",
            value: function off(t) {
              delete this._eventRegister[t];
            }
          }, {
            key: "enable",
            value: function enable() {
              this._disabled = !1;
            }
          }, {
            key: "disable",
            value: function disable() {
              this._disabled = !0;
            }
          }, {
            key: "destroy",
            value: function destroy() {
              delete this._eventRegister;
            }
          }, {
            key: "triggerEvent",
            value: function triggerEvent(t, e) {
              if (!this.disabled && this._eventRegister && this._eventRegister[t]) return this._eventRegister[t](e);
            }
          }, {
            key: "disabled",
            get: function get() {
              return this._disabled;
            }
          }]);

          return _class;
        }();
      }, 311: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDDraggable = void 0;var s = i(849),
            o = i(943),
            r = i(861);
        var n = function (_r$DDBaseImplement) {
          _inherits(n, _r$DDBaseImplement);

          function n(t) {
            var _this23;

            var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _classCallCheck(this, n);

            (_this23 = _possibleConstructorReturn(this, (n.__proto__ || Object.getPrototypeOf(n)).call(this)), _this23), _this23.dragging = !1, _this23.ui = function () {
              var t = _this23.el.parentElement.getBoundingClientRect(),
                  e = _this23.helper.getBoundingClientRect();return { position: { top: e.top - t.top, left: e.left - t.left } };
            }, _this23.el = t, _this23.option = e;var i = e.handle.substring(1);_this23.dragEl = t.classList.contains(i) ? t : t.querySelector(e.handle) || t, _this23._dragStart = _this23._dragStart.bind(_this23), _this23._drag = _this23._drag.bind(_this23), _this23._dragEnd = _this23._dragEnd.bind(_this23), _this23.enable();return _this23;
          }

          _createClass(n, [{
            key: "on",
            value: function on(t, e) {
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "on", this).call(this, t, e);
            }
          }, {
            key: "off",
            value: function off(t) {
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "off", this).call(this, t);
            }
          }, {
            key: "enable",
            value: function enable() {
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "enable", this).call(this), this.dragEl.draggable = !0, this.dragEl.addEventListener("dragstart", this._dragStart), this.el.classList.remove("ui-draggable-disabled"), this.el.classList.add("ui-draggable");
            }
          }, {
            key: "disable",
            value: function disable() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "disable", this).call(this), this.dragEl.removeAttribute("draggable"), this.dragEl.removeEventListener("dragstart", this._dragStart), this.el.classList.remove("ui-draggable"), t || this.el.classList.add("ui-draggable-disabled");
            }
          }, {
            key: "destroy",
            value: function destroy() {
              this.dragging && this._dragEnd({}), this.disable(!0), delete this.el, delete this.helper, delete this.option, _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "destroy", this).call(this);
            }
          }, {
            key: "updateOption",
            value: function updateOption(t) {
              var _this24 = this;

              return Object.keys(t).forEach(function (e) {
                return _this24.option[e] = t[e];
              }), this;
            }
          }, {
            key: "_dragStart",
            value: function _dragStart(t) {
              var _this25 = this;

              s.DDManager.dragElement = this, this.helper = this._createHelper(t), this._setupHelperContainmentStyle(), this.dragOffset = this._getDragOffset(t, this.el, this.helperContainment);var e = o.DDUtils.initEvent(t, { target: this.el, type: "dragstart" });this.helper !== this.el ? (this._setupDragFollowNodeNotifyStart(e), this._dragFollow(t)) : this.dragFollowTimer = window.setTimeout(function () {
                delete _this25.dragFollowTimer, _this25._setupDragFollowNodeNotifyStart(e);
              }, 0), this._cancelDragGhost(t);
            }
          }, {
            key: "_setupDragFollowNodeNotifyStart",
            value: function _setupDragFollowNodeNotifyStart(t) {
              return this._setupHelperStyle(), document.addEventListener("dragover", this._drag, n.dragEventListenerOption), this.dragEl.addEventListener("dragend", this._dragEnd), this.option.start && this.option.start(t, this.ui()), this.dragging = !0, this.helper.classList.add("ui-draggable-dragging"), this.triggerEvent("dragstart", t), this;
            }
          }, {
            key: "_drag",
            value: function _drag(t) {
              t.preventDefault(), this._dragFollow(t);var e = o.DDUtils.initEvent(t, { target: this.el, type: "drag" });this.option.drag && this.option.drag(e, this.ui()), this.triggerEvent("drag", e);
            }
          }, {
            key: "_dragEnd",
            value: function _dragEnd(t) {
              if (this.dragFollowTimer) return clearTimeout(this.dragFollowTimer), void delete this.dragFollowTimer;this.paintTimer && cancelAnimationFrame(this.paintTimer), document.removeEventListener("dragover", this._drag, n.dragEventListenerOption), this.dragEl.removeEventListener("dragend", this._dragEnd), this.dragging = !1, this.helper.classList.remove("ui-draggable-dragging"), this.helperContainment.style.position = this.parentOriginStylePosition || null, this.helper === this.el ? this._removeHelperStyle() : this.helper.remove();var e = o.DDUtils.initEvent(t, { target: this.el, type: "dragstop" });this.option.stop && this.option.stop(e), this.triggerEvent("dragstop", e), delete s.DDManager.dragElement, delete this.helper;
            }
          }, {
            key: "_createHelper",
            value: function _createHelper(t) {
              var _this26 = this;

              var e = this.el;return "function" == typeof this.option.helper ? e = this.option.helper(t) : "clone" === this.option.helper && (e = o.DDUtils.clone(this.el)), document.body.contains(e) || o.DDUtils.appendTo(e, "parent" === this.option.appendTo ? this.el.parentNode : this.option.appendTo), e === this.el && (this.dragElementOriginStyle = n.originStyleProp.map(function (t) {
                return _this26.el.style[t];
              })), e;
            }
          }, {
            key: "_setupHelperStyle",
            value: function _setupHelperStyle() {
              var _this27 = this;

              return this.helper.style.pointerEvents = "none", this.helper.style.width = this.dragOffset.width + "px", this.helper.style.height = this.dragOffset.height + "px", this.helper.style.willChange = "left, top", this.helper.style.transition = "none", this.helper.style.position = this.option.basePosition || n.basePosition, this.helper.style.zIndex = "1000", setTimeout(function () {
                _this27.helper && (_this27.helper.style.transition = null);
              }, 0), this;
            }
          }, {
            key: "_removeHelperStyle",
            value: function _removeHelperStyle() {
              var _this28 = this;

              var t = this.helper ? this.helper.gridstackNode : void 0;return t && t._isAboutToRemove || n.originStyleProp.forEach(function (t) {
                _this28.helper.style[t] = _this28.dragElementOriginStyle[t] || null;
              }), delete this.dragElementOriginStyle, this;
            }
          }, {
            key: "_dragFollow",
            value: function _dragFollow(t) {
              var _this29 = this;

              this.paintTimer && cancelAnimationFrame(this.paintTimer), this.paintTimer = requestAnimationFrame(function () {
                delete _this29.paintTimer;var e = _this29.dragOffset;var i = { left: 0, top: 0 };if ("absolute" === _this29.helper.style.position) {
                  var _helperContainment$ge = _this29.helperContainment.getBoundingClientRect(),
                      _t19 = _helperContainment$ge.left,
                      _e16 = _helperContainment$ge.top;

                  i = { left: _t19, top: _e16 };
                }_this29.helper.style.left = t.clientX + e.offsetLeft - i.left + "px", _this29.helper.style.top = t.clientY + e.offsetTop - i.top + "px";
              });
            }
          }, {
            key: "_setupHelperContainmentStyle",
            value: function _setupHelperContainmentStyle() {
              return this.helperContainment = this.helper.parentElement, "fixed" !== this.option.basePosition && (this.parentOriginStylePosition = this.helperContainment.style.position, window.getComputedStyle(this.helperContainment).position.match(/static/) && (this.helperContainment.style.position = "relative")), this;
            }
          }, {
            key: "_cancelDragGhost",
            value: function _cancelDragGhost(t) {
              var e = document.createElement("div");return e.style.width = "1px", e.style.height = "1px", e.style.position = "fixed", document.body.appendChild(e), t.dataTransfer.setDragImage(e, 0, 0), setTimeout(function () {
                return document.body.removeChild(e);
              }), t.stopPropagation(), this;
            }
          }, {
            key: "_getDragOffset",
            value: function _getDragOffset(t, e, i) {
              var s = 0,
                  r = 0;if (i) {
                var _t20 = document.createElement("div");o.DDUtils.addElStyles(_t20, { opacity: "0", position: "fixed", top: "0px", left: "0px", width: "1px", height: "1px", zIndex: "-999999" }), i.appendChild(_t20);var _e17 = _t20.getBoundingClientRect();i.removeChild(_t20), s = _e17.left, r = _e17.top;
              }var n = e.getBoundingClientRect();return { left: n.left, top: n.top, offsetLeft: -t.clientX + n.left - s, offsetTop: -t.clientY + n.top - r, width: n.width, height: n.height };
            }
          }]);

          return n;
        }(r.DDBaseImplement);

        e.DDDraggable = n, n.basePosition = "absolute", n.dragEventListenerOption = !0, n.originStyleProp = ["transition", "pointerEvents", "position", "left", "top", "opacity", "zIndex", "width", "height", "willChange"];
      }, 54: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDDroppable = void 0;var s = i(849),
            o = i(861),
            r = i(943);
        var n = function (_o$DDBaseImplement) {
          _inherits(n, _o$DDBaseImplement);

          function n(t) {
            var _this30;

            var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _classCallCheck(this, n);

            (_this30 = _possibleConstructorReturn(this, (n.__proto__ || Object.getPrototypeOf(n)).call(this)), _this30), _this30.el = t, _this30.option = e, _this30._dragEnter = _this30._dragEnter.bind(_this30), _this30._dragOver = _this30._dragOver.bind(_this30), _this30._dragLeave = _this30._dragLeave.bind(_this30), _this30._drop = _this30._drop.bind(_this30), _this30.el.classList.add("ui-droppable"), _this30.el.addEventListener("dragenter", _this30._dragEnter), _this30._setupAccept();return _this30;
          }

          _createClass(n, [{
            key: "on",
            value: function on(t, e) {
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "on", this).call(this, t, e);
            }
          }, {
            key: "off",
            value: function off(t) {
              _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "off", this).call(this, t);
            }
          }, {
            key: "enable",
            value: function enable() {
              this.disabled && (_get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "enable", this).call(this), this.el.classList.remove("ui-droppable-disabled"), this.el.addEventListener("dragenter", this._dragEnter));
            }
          }, {
            key: "disable",
            value: function disable() {
              var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
              this.disabled || (_get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "disable", this).call(this), t || this.el.classList.add("ui-droppable-disabled"), this.el.removeEventListener("dragenter", this._dragEnter));
            }
          }, {
            key: "destroy",
            value: function destroy() {
              this.moving && this._removeLeaveCallbacks(), this.disable(!0), this.el.classList.remove("ui-droppable"), this.el.classList.remove("ui-droppable-disabled"), delete this.moving, _get(n.prototype.__proto__ || Object.getPrototypeOf(n.prototype), "destroy", this).call(this);
            }
          }, {
            key: "updateOption",
            value: function updateOption(t) {
              var _this31 = this;

              return Object.keys(t).forEach(function (e) {
                return _this31.option[e] = t[e];
              }), this._setupAccept(), this;
            }
          }, {
            key: "_dragEnter",
            value: function _dragEnter(t) {
              if (!this._canDrop()) return;if (t.preventDefault(), this.moving) return;this.moving = !0;var e = r.DDUtils.initEvent(t, { target: this.el, type: "dropover" });this.option.over && this.option.over(e, this._ui(s.DDManager.dragElement)), this.triggerEvent("dropover", e), this.el.addEventListener("dragover", this._dragOver), this.el.addEventListener("drop", this._drop), this.el.addEventListener("dragleave", this._dragLeave), this.el.classList.add("ui-droppable-over");
            }
          }, {
            key: "_dragOver",
            value: function _dragOver(t) {
              t.preventDefault(), t.stopPropagation();
            }
          }, {
            key: "_dragLeave",
            value: function _dragLeave(t) {
              if (t.relatedTarget) {
                if (this.el.contains(t.relatedTarget)) return;
              } else {
                var _el$getBoundingClient = this.el.getBoundingClientRect(),
                    _e18 = _el$getBoundingClient.bottom,
                    _i12 = _el$getBoundingClient.left,
                    _s9 = _el$getBoundingClient.right,
                    _o3 = _el$getBoundingClient.top;

                if (t.x < _s9 && t.x > _i12 && t.y < _e18 && t.y > _o3) return;
              }if (this._removeLeaveCallbacks(), this.moving) {
                t.preventDefault();var _e19 = r.DDUtils.initEvent(t, { target: this.el, type: "dropout" });this.option.out && this.option.out(_e19, this._ui(s.DDManager.dragElement)), this.triggerEvent("dropout", _e19);
              }delete this.moving;
            }
          }, {
            key: "_drop",
            value: function _drop(t) {
              if (!this.moving) return;t.preventDefault();var e = r.DDUtils.initEvent(t, { target: this.el, type: "drop" });this.option.drop && this.option.drop(e, this._ui(s.DDManager.dragElement)), this.triggerEvent("drop", e), this._removeLeaveCallbacks(), delete this.moving;
            }
          }, {
            key: "_removeLeaveCallbacks",
            value: function _removeLeaveCallbacks() {
              this.el.removeEventListener("dragleave", this._dragLeave), this.el.classList.remove("ui-droppable-over"), this.moving && (this.el.removeEventListener("dragover", this._dragOver), this.el.removeEventListener("drop", this._drop));
            }
          }, {
            key: "_canDrop",
            value: function _canDrop() {
              return s.DDManager.dragElement && (!this.accept || this.accept(s.DDManager.dragElement.el));
            }
          }, {
            key: "_setupAccept",
            value: function _setupAccept() {
              var _this32 = this;

              return this.option.accept && "string" == typeof this.option.accept ? this.accept = function (t) {
                return t.matches(_this32.option.accept);
              } : this.accept = this.option.accept, this;
            }
          }, {
            key: "_ui",
            value: function _ui(t) {
              return Object.assign({ draggable: t.el }, t.ui());
            }
          }]);

          return n;
        }(o.DDBaseImplement);

        e.DDDroppable = n;
      }, 485: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDElement = void 0;var s = i(97),
            o = i(311),
            r = i(54);
        var n = function () {
          function n(t) {
            _classCallCheck(this, n);

            this.el = t;
          }

          _createClass(n, [{
            key: "on",
            value: function on(t, e) {
              return this.ddDraggable && ["drag", "dragstart", "dragstop"].indexOf(t) > -1 ? this.ddDraggable.on(t, e) : this.ddDroppable && ["drop", "dropover", "dropout"].indexOf(t) > -1 ? this.ddDroppable.on(t, e) : this.ddResizable && ["resizestart", "resize", "resizestop"].indexOf(t) > -1 && this.ddResizable.on(t, e), this;
            }
          }, {
            key: "off",
            value: function off(t) {
              return this.ddDraggable && ["drag", "dragstart", "dragstop"].indexOf(t) > -1 ? this.ddDraggable.off(t) : this.ddDroppable && ["drop", "dropover", "dropout"].indexOf(t) > -1 ? this.ddDroppable.off(t) : this.ddResizable && ["resizestart", "resize", "resizestop"].indexOf(t) > -1 && this.ddResizable.off(t), this;
            }
          }, {
            key: "setupDraggable",
            value: function setupDraggable(t) {
              return this.ddDraggable ? this.ddDraggable.updateOption(t) : this.ddDraggable = new o.DDDraggable(this.el, t), this;
            }
          }, {
            key: "cleanDraggable",
            value: function cleanDraggable() {
              return this.ddDraggable && (this.ddDraggable.destroy(), delete this.ddDraggable), this;
            }
          }, {
            key: "setupResizable",
            value: function setupResizable(t) {
              return this.ddResizable ? this.ddResizable.updateOption(t) : this.ddResizable = new s.DDResizable(this.el, t), this;
            }
          }, {
            key: "cleanResizable",
            value: function cleanResizable() {
              return this.ddResizable && (this.ddResizable.destroy(), delete this.ddResizable), this;
            }
          }, {
            key: "setupDroppable",
            value: function setupDroppable(t) {
              return this.ddDroppable ? this.ddDroppable.updateOption(t) : this.ddDroppable = new r.DDDroppable(this.el, t), this;
            }
          }, {
            key: "cleanDroppable",
            value: function cleanDroppable() {
              return this.ddDroppable && (this.ddDroppable.destroy(), delete this.ddDroppable), this;
            }
          }], [{
            key: "init",
            value: function init(t) {
              return t.ddElement || (t.ddElement = new n(t)), t.ddElement;
            }
          }]);

          return n;
        }();

        e.DDElement = n;
      }, 849: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDManager = void 0, e.DDManager = function () {
          function _class2() {
            _classCallCheck(this, _class2);
          }

          return _class2;
        }();
      }, 680: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDResizableHandle = void 0;
        var i = function () {
          function i(t, e, _i13) {
            _classCallCheck(this, i);

            this.moving = !1, this.host = t, this.dir = e, this.option = _i13, this._mouseDown = this._mouseDown.bind(this), this._mouseMove = this._mouseMove.bind(this), this._mouseUp = this._mouseUp.bind(this), this._init();
          }

          _createClass(i, [{
            key: "_init",
            value: function _init() {
              var t = document.createElement("div");return t.classList.add("ui-resizable-handle"), t.classList.add("" + i.prefix + this.dir), t.style.zIndex = "100", t.style.userSelect = "none", this.el = t, this.host.appendChild(this.el), this.el.addEventListener("mousedown", this._mouseDown), this;
            }
          }, {
            key: "destroy",
            value: function destroy() {
              return this.moving && this._mouseUp(this.mouseDownEvent), this.el.removeEventListener("mousedown", this._mouseDown), this.host.removeChild(this.el), delete this.el, delete this.host, this;
            }
          }, {
            key: "_mouseDown",
            value: function _mouseDown(t) {
              t.preventDefault(), this.mouseDownEvent = t, document.addEventListener("mousemove", this._mouseMove, !0), document.addEventListener("mouseup", this._mouseUp);
            }
          }, {
            key: "_mouseMove",
            value: function _mouseMove(t) {
              var e = this.mouseDownEvent;!this.moving && Math.abs(t.x - e.x) + Math.abs(t.y - e.y) > 2 ? (this.moving = !0, this._triggerEvent("start", this.mouseDownEvent)) : this.moving && this._triggerEvent("move", t);
            }
          }, {
            key: "_mouseUp",
            value: function _mouseUp(t) {
              this.moving && this._triggerEvent("stop", t), document.removeEventListener("mousemove", this._mouseMove, !0), document.removeEventListener("mouseup", this._mouseUp), delete this.moving, delete this.mouseDownEvent;
            }
          }, {
            key: "_triggerEvent",
            value: function _triggerEvent(t, e) {
              return this.option[t] && this.option[t](e), this;
            }
          }]);

          return i;
        }();

        e.DDResizableHandle = i, i.prefix = "ui-resizable-";
      }, 97: function _(t, e, i) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDResizable = void 0;var s = i(680),
            o = i(861),
            r = i(943),
            n = i(593);
        var l = function (_o$DDBaseImplement2) {
          _inherits(l, _o$DDBaseImplement2);

          function l(t) {
            var _this33;

            var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _classCallCheck(this, l);

            (_this33 = _possibleConstructorReturn(this, (l.__proto__ || Object.getPrototypeOf(l)).call(this)), _this33), _this33._showHandlers = function () {
              _this33.el.classList.remove("ui-resizable-autohide");
            }, _this33._hideHandlers = function () {
              _this33.el.classList.add("ui-resizable-autohide");
            }, _this33._ui = function () {
              var t = _this33.el.parentElement.getBoundingClientRect(),
                  e = { width: _this33.originalRect.width, height: _this33.originalRect.height + _this33.scrolled, left: _this33.originalRect.left, top: _this33.originalRect.top - _this33.scrolled },
                  i = _this33.temporalRect || e;return { position: { left: i.left - t.left, top: i.top - t.top }, size: { width: i.width, height: i.height } };
            }, _this33.el = t, _this33.option = e, _this33.enable(), _this33._setupAutoHide(), _this33._setupHandlers();return _this33;
          }

          _createClass(l, [{
            key: "on",
            value: function on(t, e) {
              _get(l.prototype.__proto__ || Object.getPrototypeOf(l.prototype), "on", this).call(this, t, e);
            }
          }, {
            key: "off",
            value: function off(t) {
              _get(l.prototype.__proto__ || Object.getPrototypeOf(l.prototype), "off", this).call(this, t);
            }
          }, {
            key: "enable",
            value: function enable() {
              _get(l.prototype.__proto__ || Object.getPrototypeOf(l.prototype), "enable", this).call(this), this.el.classList.add("ui-resizable"), this.el.classList.remove("ui-resizable-disabled");
            }
          }, {
            key: "disable",
            value: function disable() {
              _get(l.prototype.__proto__ || Object.getPrototypeOf(l.prototype), "disable", this).call(this), this.el.classList.add("ui-resizable-disabled"), this.el.classList.remove("ui-resizable");
            }
          }, {
            key: "destroy",
            value: function destroy() {
              this._removeHandlers(), this.option.autoHide && (this.el.removeEventListener("mouseover", this._showHandlers), this.el.removeEventListener("mouseout", this._hideHandlers)), this.el.classList.remove("ui-resizable"), delete this.el, _get(l.prototype.__proto__ || Object.getPrototypeOf(l.prototype), "destroy", this).call(this);
            }
          }, {
            key: "updateOption",
            value: function updateOption(t) {
              var _this34 = this;

              var e = t.handles && t.handles !== this.option.handles,
                  i = t.autoHide && t.autoHide !== this.option.autoHide;return Object.keys(t).forEach(function (e) {
                return _this34.option[e] = t[e];
              }), e && (this._removeHandlers(), this._setupHandlers()), i && this._setupAutoHide(), this;
            }
          }, {
            key: "_setupAutoHide",
            value: function _setupAutoHide() {
              return this.option.autoHide ? (this.el.classList.add("ui-resizable-autohide"), this.el.addEventListener("mouseover", this._showHandlers), this.el.addEventListener("mouseout", this._hideHandlers)) : (this.el.classList.remove("ui-resizable-autohide"), this.el.removeEventListener("mouseover", this._showHandlers), this.el.removeEventListener("mouseout", this._hideHandlers)), this;
            }
          }, {
            key: "_setupHandlers",
            value: function _setupHandlers() {
              var _this35 = this;

              var t = this.option.handles || "e,s,se";return "all" === t && (t = "n,e,s,w,se,sw,ne,nw"), this.handlers = t.split(",").map(function (t) {
                return t.trim();
              }).map(function (t) {
                return new s.DDResizableHandle(_this35.el, t, { start: function start(t) {
                    _this35._resizeStart(t);
                  }, stop: function stop(t) {
                    _this35._resizeStop(t);
                  }, move: function move(e) {
                    _this35._resizing(e, t);
                  } });
              }), this;
            }
          }, {
            key: "_resizeStart",
            value: function _resizeStart(t) {
              this.originalRect = this.el.getBoundingClientRect(), this.scrollEl = n.Utils.getScrollElement(this.el), this.scrollY = this.scrollEl.scrollTop, this.scrolled = 0, this.startEvent = t, this._setupHelper(), this._applyChange();var e = r.DDUtils.initEvent(t, { type: "resizestart", target: this.el });return this.option.start && this.option.start(e, this._ui()), this.el.classList.add("ui-resizable-resizing"), this.triggerEvent("resizestart", e), this;
            }
          }, {
            key: "_resizing",
            value: function _resizing(t, e) {
              this.scrolled = this.scrollEl.scrollTop - this.scrollY, this.temporalRect = this._getChange(t, e), this._applyChange();var i = r.DDUtils.initEvent(t, { type: "resize", target: this.el });return this.option.resize && this.option.resize(i, this._ui()), this.triggerEvent("resize", i), this;
            }
          }, {
            key: "_resizeStop",
            value: function _resizeStop(t) {
              var e = r.DDUtils.initEvent(t, { type: "resizestop", target: this.el });return this.option.stop && this.option.stop(e), this.el.classList.remove("ui-resizable-resizing"), this.triggerEvent("resizestop", e), this._cleanHelper(), delete this.startEvent, delete this.originalRect, delete this.temporalRect, delete this.scrollY, delete this.scrolled, this;
            }
          }, {
            key: "_setupHelper",
            value: function _setupHelper() {
              var _this36 = this;

              return this.elOriginStyleVal = l._originStyleProp.map(function (t) {
                return _this36.el.style[t];
              }), this.parentOriginStylePosition = this.el.parentElement.style.position, window.getComputedStyle(this.el.parentElement).position.match(/static/) && (this.el.parentElement.style.position = "relative"), this.el.style.position = this.option.basePosition || "absolute", this.el.style.opacity = "0.8", this.el.style.zIndex = "1000", this;
            }
          }, {
            key: "_cleanHelper",
            value: function _cleanHelper() {
              var _this37 = this;

              return l._originStyleProp.forEach(function (t, e) {
                _this37.el.style[t] = _this37.elOriginStyleVal[e] || null;
              }), this.el.parentElement.style.position = this.parentOriginStylePosition || null, this;
            }
          }, {
            key: "_getChange",
            value: function _getChange(t, e) {
              var i = this.startEvent,
                  s = { width: this.originalRect.width, height: this.originalRect.height + this.scrolled, left: this.originalRect.left, top: this.originalRect.top - this.scrolled },
                  o = t.clientX - i.clientX,
                  r = t.clientY - i.clientY;e.indexOf("e") > -1 ? s.width += o : e.indexOf("w") > -1 && (s.width -= o, s.left += o), e.indexOf("s") > -1 ? s.height += r : e.indexOf("n") > -1 && (s.height -= r, s.top += r);var n = this._constrainSize(s.width, s.height);return Math.round(s.width) !== Math.round(n.width) && (e.indexOf("w") > -1 && (s.left += s.width - n.width), s.width = n.width), Math.round(s.height) !== Math.round(n.height) && (e.indexOf("n") > -1 && (s.top += s.height - n.height), s.height = n.height), s;
            }
          }, {
            key: "_constrainSize",
            value: function _constrainSize(t, e) {
              var i = this.option.maxWidth || Number.MAX_SAFE_INTEGER,
                  s = this.option.minWidth || t,
                  o = this.option.maxHeight || Number.MAX_SAFE_INTEGER,
                  r = this.option.minHeight || e;return { width: Math.min(i, Math.max(s, t)), height: Math.min(o, Math.max(r, e)) };
            }
          }, {
            key: "_applyChange",
            value: function _applyChange() {
              var _this38 = this;

              var t = { left: 0, top: 0, width: 0, height: 0 };if ("absolute" === this.el.style.position) {
                var _e20 = this.el.parentElement,
                    _e20$getBoundingClien = _e20.getBoundingClientRect(),
                    _i14 = _e20$getBoundingClien.left,
                    _s10 = _e20$getBoundingClien.top;t = { left: _i14, top: _s10, width: 0, height: 0 };
              }return this.temporalRect ? (Object.keys(this.temporalRect).forEach(function (e) {
                var i = _this38.temporalRect[e];_this38.el.style[e] = i - t[e] + "px";
              }), this) : this;
            }
          }, {
            key: "_removeHandlers",
            value: function _removeHandlers() {
              return this.handlers.forEach(function (t) {
                return t.destroy();
              }), delete this.handlers, this;
            }
          }]);

          return l;
        }(o.DDBaseImplement);

        e.DDResizable = l, l._originStyleProp = ["width", "height", "position", "left", "top", "opacity", "zIndex"];
      }, 943: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.DDUtils = void 0;
        var i = function () {
          function i() {
            _classCallCheck(this, i);
          }

          _createClass(i, null, [{
            key: "clone",
            value: function clone(t) {
              var e = t.cloneNode(!0);return e.removeAttribute("id"), e;
            }
          }, {
            key: "appendTo",
            value: function appendTo(t, e) {
              var i = void 0;i = "string" == typeof e ? document.querySelector(e) : e, i && i.appendChild(t);
            }
          }, {
            key: "setPositionRelative",
            value: function setPositionRelative(t) {
              /^(?:r|a|f)/.test(window.getComputedStyle(t).position) || (t.style.position = "relative");
            }
          }, {
            key: "addElStyles",
            value: function addElStyles(t, e) {
              if (e instanceof Object) {
                var _loop3 = function (_i15) {
                  e.hasOwnProperty(_i15) && (Array.isArray(e[_i15]) ? e[_i15].forEach(function(e) {
                    t.style[_i15] = e;
                  }) : t.style[_i15] = e[_i15]);
                };

                for (var _i15 in e) {
                  _loop3(_i15);
                }
              }
            }
          }, {
            key: "initEvent",
            value: function initEvent(t, e) {
              var i = { type: e.type },
                  s = { button: 0, which: 0, buttons: 1, bubbles: !0, cancelable: !0, target: e.target ? e.target : t.target };return t.dataTransfer && (i.dataTransfer = t.dataTransfer), ["altKey", "ctrlKey", "metaKey", "shiftKey"].forEach(function (e) {
                return i[e] = t[e];
              }), ["pageX", "pageY", "clientX", "clientY", "screenX", "screenY"].forEach(function (e) {
                return i[e] = t[e];
              }), Object.assign(Object.assign({}, i), s);
            }
          }]);

          return i;
        }();

        e.DDUtils = i, i.isEventSupportPassiveOption = function () {
          var t = !1,
              e = function e() {};return document.addEventListener("test", e, { get passive() {
              return t = !0, !0;
            } }), document.removeEventListener("test", e), t;
        }();
      }, 761: function _(t, e, i) {
        var s = this && this.__createBinding || (Object.create ? function (t, e, i, s) {
          void 0 === s && (s = i), Object.defineProperty(t, s, { enumerable: !0, get: function get() {
              return e[i];
            } });
        } : function (t, e, i, s) {
          void 0 === s && (s = i), t[s] = e[i];
        }),
            o = this && this.__exportStar || function (t, e) {
          for (var i in t) {
            "default" === i || e.hasOwnProperty(i) || s(e, t, i);
          }
        };Object.defineProperty(e, "__esModule", { value: !0 }), e.GridStackDDNative = void 0;var r = i(849),
            n = i(485),
            l = i(21),
            a = i(593);o(i(21), e);
        var h = function (_l$GridStackDD) {
          _inherits(h, _l$GridStackDD);

          function h() {
            _classCallCheck(this, h);

            return _possibleConstructorReturn(this, (h.__proto__ || Object.getPrototypeOf(h)).apply(this, arguments));
          }

          _createClass(h, [{
            key: "resizable",
            value: function resizable(t, e, i, s) {
              return this._getDDElements(t).forEach(function (t) {
                if ("disable" === e || "enable" === e) t.ddResizable && t.ddResizable[e]();else if ("destroy" === e) t.ddResizable && t.cleanResizable();else if ("option" === e) t.setupResizable(_defineProperty({}, i, s));else {
                  var _i16 = t.el.gridstackNode.grid;var _s11 = t.el.getAttribute("gs-resize-handles") ? t.el.getAttribute("gs-resize-handles") : _i16.opts.resizable.handles;t.setupResizable(Object.assign(Object.assign(Object.assign({}, _i16.opts.resizable), { handles: _s11 }), { start: e.start, stop: e.stop, resize: e.resize }));
                }
              }), this;
            }
          }, {
            key: "draggable",
            value: function draggable(t, e, i, s) {
              return this._getDDElements(t).forEach(function (t) {
                if ("disable" === e || "enable" === e) t.ddDraggable && t.ddDraggable[e]();else if ("destroy" === e) t.ddDraggable && t.cleanDraggable();else if ("option" === e) t.setupDraggable(_defineProperty({}, i, s));else {
                  var _i17 = t.el.gridstackNode.grid;t.setupDraggable(Object.assign(Object.assign({}, _i17.opts.draggable), { containment: _i17.opts._isNested && !_i17.opts.dragOut ? _i17.el.parentElement : _i17.opts.draggable.containment || null, start: e.start, stop: e.stop, drag: e.drag }));
                }
              }), this;
            }
          }, {
            key: "dragIn",
            value: function dragIn(t, e) {
              return this._getDDElements(t).forEach(function (t) {
                return t.setupDraggable(e);
              }), this;
            }
          }, {
            key: "droppable",
            value: function droppable(t, e, i, s) {
              return "function" != typeof e.accept || e._accept || (e._accept = e.accept, e.accept = function (t) {
                return e._accept(t);
              }), this._getDDElements(t).forEach(function (t) {
                "disable" === e || "enable" === e ? t.ddDroppable && t.ddDroppable[e]() : "destroy" === e ? t.ddDroppable && t.cleanDroppable() : "option" === e ? t.setupDroppable(_defineProperty({}, i, s)) : t.setupDroppable(e);
              }), this;
            }
          }, {
            key: "isDroppable",
            value: function isDroppable(t) {
              return !(!(t && t.ddElement && t.ddElement.ddDroppable) || t.ddElement.ddDroppable.disabled);
            }
          }, {
            key: "isDraggable",
            value: function isDraggable(t) {
              return !(!(t && t.ddElement && t.ddElement.ddDraggable) || t.ddElement.ddDraggable.disabled);
            }
          }, {
            key: "isResizable",
            value: function isResizable(t) {
              return !(!(t && t.ddElement && t.ddElement.ddResizable) || t.ddElement.ddResizable.disabled);
            }
          }, {
            key: "on",
            value: function on(t, e, i) {
              return this._getDDElements(t).forEach(function (t) {
                return t.on(e, function (t) {
                  i(t, r.DDManager.dragElement ? r.DDManager.dragElement.el : t.target, r.DDManager.dragElement ? r.DDManager.dragElement.helper : null);
                });
              }), this;
            }
          }, {
            key: "off",
            value: function off(t, e) {
              return this._getDDElements(t).forEach(function (t) {
                return t.off(e);
              }), this;
            }
          }, {
            key: "_getDDElements",
            value: function _getDDElements(t) {
              var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
              var i = a.Utils.getElements(t);if (!i.length) return [];var s = i.map(function (t) {
                return t.ddElement || (e ? n.DDElement.init(t) : null);
              });return e || s.filter(function (t) {
                return t;
              }), s;
            }
          }]);

          return h;
        }(l.GridStackDD);

        e.GridStackDDNative = h, l.GridStackDD.registerPlugin(h);
      }, 699: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 });
      }, 593: function _(t, e) {
        Object.defineProperty(e, "__esModule", { value: !0 }), e.Utils = e.obsoleteAttr = e.obsoleteOptsDel = e.obsoleteOpts = e.obsolete = void 0, e.obsolete = function (t, e, i, s, o) {
          var r = function (_r5) {
            function r() {
              return _r5.apply(this, arguments);
            }

            r.toString = function () {
              return _r5.toString();
            };

            return r;
          }(function () {
            for (var _len = arguments.length, r = Array(_len), _key = 0; _key < _len; _key++) {
              r[_key] = arguments[_key];
            }

            return console.warn("gridstack.js: Function `" + i + "` is deprecated in " + o + " and has been replaced with `" + s + "`. It will be **completely** removed in v1.0"), e.apply(t, r);
          });return r.prototype = e.prototype, r;
        }, e.obsoleteOpts = function (t, e, i, s) {
          void 0 !== t[e] && (t[i] = t[e], console.warn("gridstack.js: Option `" + e + "` is deprecated in " + s + " and has been replaced with `" + i + "`. It will be **completely** removed in v1.0"));
        }, e.obsoleteOptsDel = function (t, e, i, s) {
          void 0 !== t[e] && console.warn("gridstack.js: Option `" + e + "` is deprecated in " + i + s);
        }, e.obsoleteAttr = function (t, e, i, s) {
          var o = t.getAttribute(e);null !== o && (t.setAttribute(i, o), console.warn("gridstack.js: attribute `" + e + "`=" + o + " is deprecated on this object in " + s + " and has been replaced with `" + i + "`. It will be **completely** removed in v1.0"));
        };
        var i = function () {
          function i() {
            _classCallCheck(this, i);
          }

          _createClass(i, null, [{
            key: "getElements",
            value: function getElements(t) {
              if ("string" == typeof t) {
                var _e21 = document.querySelectorAll(t);return _e21.length || "." === t[0] || "#" === t[0] || (_e21 = document.querySelectorAll("." + t), _e21.length || (_e21 = document.querySelectorAll("#" + t))), Array.from(_e21);
              }return [t];
            }
          }, {
            key: "getElement",
            value: function getElement(t) {
              if ("string" == typeof t) {
                if (!t.length) return null;if ("#" === t[0]) return document.getElementById(t.substring(1));if ("." === t[0] || "[" === t[0]) return document.querySelector(t);if (!isNaN(+t[0])) return document.getElementById(t);var _e22 = document.querySelector(t);return _e22 || (_e22 = document.getElementById(t)), _e22 || (_e22 = document.querySelector("." + t)), _e22;
              }return t;
            }
          }, {
            key: "isIntercepted",
            value: function isIntercepted(t, e) {
              return !(t.y >= e.y + e.h || t.y + t.h <= e.y || t.x + t.w <= e.x || t.x >= e.x + e.w);
            }
          }, {
            key: "isTouching",
            value: function isTouching(t, e) {
              return i.isIntercepted(t, { x: e.x - .5, y: e.y - .5, w: e.w + 1, h: e.h + 1 });
            }
          }, {
            key: "sort",
            value: function sort(t, e, i) {
              return i = i || t.reduce(function (t, e) {
                return Math.max(e.x + e.w, t);
              }, 0) || 12, -1 === e ? t.sort(function (t, e) {
                return e.x + e.y * i - (t.x + t.y * i);
              }) : t.sort(function (t, e) {
                return t.x + t.y * i - (e.x + e.y * i);
              });
            }
          }, {
            key: "createStylesheet",
            value: function createStylesheet(t, e) {
              var i = document.createElement("style");return i.setAttribute("type", "text/css"), i.setAttribute("gs-style-id", t), i.styleSheet ? i.styleSheet.cssText = "" : i.appendChild(document.createTextNode("")), e ? e.insertBefore(i, e.firstChild) : (e = document.getElementsByTagName("head")[0]).appendChild(i), i.sheet;
            }
          }, {
            key: "removeStylesheet",
            value: function removeStylesheet(t) {
              var e = document.querySelector("STYLE[gs-style-id=" + t + "]");e && e.parentNode && e.remove();
            }
          }, {
            key: "addCSSRule",
            value: function addCSSRule(t, e, i) {
              "function" == typeof t.addRule ? t.addRule(e, i) : "function" == typeof t.insertRule && t.insertRule(e + "{" + i + "}");
            }
          }, {
            key: "toBool",
            value: function toBool(t) {
              return "boolean" == typeof t ? t : "string" == typeof t ? !("" === (t = t.toLowerCase()) || "no" === t || "false" === t || "0" === t) : Boolean(t);
            }
          }, {
            key: "toNumber",
            value: function toNumber(t) {
              return null === t || 0 === t.length ? void 0 : Number(t);
            }
          }, {
            key: "parseHeight",
            value: function parseHeight(t) {
              var e = void 0,
                  i = "px";if ("string" == typeof t) {
                var _s12 = t.match(/^(-[0-9]+\.[0-9]+|[0-9]*\.[0-9]+|-[0-9]+|[0-9]+)(px|em|rem|vh|vw|%)?$/);if (!_s12) throw new Error("Invalid height");i = _s12[2] || "px", e = parseFloat(_s12[1]);
              } else e = t;return { h: e, unit: i };
            }
          }, {
            key: "defaults",
            value: function defaults(t) {
              var _this40 = this;

              for (var _len2 = arguments.length, e = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                e[_key2 - 1] = arguments[_key2];
              }

              return e.forEach(function (e) {
                for (var _i18 in e) {
                  if (!e.hasOwnProperty(_i18)) return;null === t[_i18] || void 0 === t[_i18] ? t[_i18] = e[_i18] : "object" == _typeof(e[_i18]) && "object" == _typeof(t[_i18]) && _this40.defaults(t[_i18], e[_i18]);
                }
              }), t;
            }
          }, {
            key: "same",
            value: function same(t, e) {
              if ("object" != (typeof t === "undefined" ? "undefined" : _typeof(t))) return t == e;if ((typeof t === "undefined" ? "undefined" : _typeof(t)) != (typeof e === "undefined" ? "undefined" : _typeof(e))) return !1;if (Object.keys(t).length !== Object.keys(e).length) return !1;for (var _i19 in t) {
                if (t[_i19] !== e[_i19]) return !1;
              }return !0;
            }
          }, {
            key: "copyPos",
            value: function copyPos(t, e) {
              var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
              return t.x = e.x, t.y = e.y, t.w = e.w, t.h = e.h, i ? (e.minW && (t.minW = e.minW), e.minH && (t.minH = e.minH), e.maxW && (t.maxW = e.maxW), e.maxH && (t.maxH = e.maxH), t) : t;
            }
          }, {
            key: "samePos",
            value: function samePos(t, e) {
              return t && e && t.x === e.x && t.y === e.y && t.w === e.w && t.h === e.h;
            }
          }, {
            key: "removeInternalAndSame",
            value: function removeInternalAndSame(t, e) {
              if ("object" == (typeof t === "undefined" ? "undefined" : _typeof(t)) && "object" == (typeof e === "undefined" ? "undefined" : _typeof(e))) for (var _i20 in t) {
                var _s13 = t[_i20];if ("_" === _i20[0] || _s13 === e[_i20]) delete t[_i20];else if (_s13 && "object" == (typeof _s13 === "undefined" ? "undefined" : _typeof(_s13)) && void 0 !== e[_i20]) {
                  for (var _t21 in _s13) {
                    _s13[_t21] !== e[_i20][_t21] && "_" !== _t21[0] || delete _s13[_t21];
                  }Object.keys(_s13).length || delete t[_i20];
                }
              }
            }
          }, {
            key: "closestByClass",
            value: function closestByClass(t, e) {
              for (; t = t.parentElement;) {
                if (t.classList.contains(e)) return t;
              }return null;
            }
          }, {
            key: "throttle",
            value: function throttle(t, e) {
              var i = !1;return function () {
                for (var _len3 = arguments.length, s = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                  s[_key3] = arguments[_key3];
                }

                i || (i = !0, setTimeout(function () {
                  t.apply(undefined, s), i = !1;
                }, e));
              };
            }
          }, {
            key: "removePositioningStyles",
            value: function removePositioningStyles(t) {
              var e = t.style;e.position && e.removeProperty("position"), e.left && e.removeProperty("left"), e.top && e.removeProperty("top"), e.width && e.removeProperty("width"), e.height && e.removeProperty("height");
            }
          }, {
            key: "getScrollElement",
            value: function getScrollElement(t) {
              if (!t) return document.scrollingElement;var e = getComputedStyle(t);return (/(auto|scroll)/.test(e.overflow + e.overflowY) ? t : this.getScrollElement(t.parentElement)
              );
            }
          }, {
            key: "updateScrollPosition",
            value: function updateScrollPosition(t, e, i) {
              var s = t.getBoundingClientRect(),
                  o = window.innerHeight || document.documentElement.clientHeight;if (s.top < 0 || s.bottom > o) {
                var _r6 = s.bottom - o,
                    n = s.top,
                    l = this.getScrollElement(t);if (null !== l) {
                  var a = l.scrollTop;s.top < 0 && i < 0 ? t.offsetHeight > o ? l.scrollTop += i : l.scrollTop += Math.abs(n) > Math.abs(i) ? i : n : i > 0 && (t.offsetHeight > o ? l.scrollTop += i : l.scrollTop += _r6 > i ? i : _r6), e.top += l.scrollTop - a;
                }
              }
            }
          }, {
            key: "updateScrollResize",
            value: function updateScrollResize(t, e, i) {
              var s = this.getScrollElement(e),
                  o = s.clientHeight,
                  r = s === this.getScrollElement() ? 0 : s.getBoundingClientRect().top,
                  n = t.clientY - r,
                  l = n > o - i;n < i ? s.scrollBy({ behavior: "smooth", top: n - i }) : l && s.scrollBy({ behavior: "smooth", top: i - (o - n) });
            }
          }, {
            key: "clone",
            value: function clone(t) {
              return null == t || "object" != (typeof t === "undefined" ? "undefined" : _typeof(t)) ? t : t instanceof Array ? [].concat(_toConsumableArray(t)) : Object.assign({}, t);
            }
          }, {
            key: "cloneDeep",
            value: function cloneDeep(t) {
              var e = i.clone(t);
              var _loop4 = function _loop4(o) {
                e.hasOwnProperty(o) && "object" == _typeof(e[o]) && "__" !== o.substring(0, 2) && !s.find(function (t) {
                  return t === o;
                }) && (e[o] = i.cloneDeep(t[o]));
              };

              for (var o in e) {
                _loop4(o);
              }return e;
            }
          }]);

          return i;
        }();

        e.Utils = i;var s = ["_isNested", "el", "grid", "subGrid", "engine"];
      } },
        e = {},
        i = function i(s) {
      var o = e[s];if (void 0 !== o) return o.exports;var r = e[s] = { exports: {} };return t[s].call(r.exports, r, r.exports, i), r.exports;
    }(930);return i.GridStack;
  }();
});
//# sourceMappingURL=gridstack-h5.js.map
