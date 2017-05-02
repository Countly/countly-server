(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _jquery = __webpack_require__(1);

	var _jquery2 = _interopRequireDefault(_jquery);

	var _EmojiEditor = __webpack_require__(3);

	var _EmojiEditor2 = _interopRequireDefault(_EmojiEditor);

	var _EmojiCategory = __webpack_require__(7);

	var _EmojiCategory2 = _interopRequireDefault(_EmojiCategory);

	var _Converters = __webpack_require__(4);

	var _Converters2 = _interopRequireDefault(_Converters);

	var _rmTooltip = __webpack_require__(14);

	var _rmTooltip2 = _interopRequireDefault(_rmTooltip);

	var _data = __webpack_require__(15);

	var _data2 = _interopRequireDefault(_data);

	var _defaults = __webpack_require__(6);

	var _defaults2 = _interopRequireDefault(_defaults);

	var _picker2 = __webpack_require__(16);

	var _picker3 = _interopRequireDefault(_picker2);

	var _icon_tooltip = __webpack_require__(17);

	var _icon_tooltip2 = _interopRequireDefault(_icon_tooltip);

	__webpack_require__(9);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	"use strict";

	var EmojiPicker = function () {

	    /**
	     *
	     * @param {undefined|Object} options
	     */
	    function EmojiPicker() {
	        var _this = this;

	        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

	        _classCallCheck(this, EmojiPicker);

	        this._callback = undefined;

	        /**
	         * A copy of the defaults object so that state is not
	         * mutated with new instances.
	         *
	         * @type {*}
	         */
	        this.defaults = Object.assign({}, _defaults2.default);

	        if ((typeof options === "undefined" ? "undefined" : _typeof(options)) === "object") {
	            this._setDefaults(options);
	        }

	        if (typeof options === "function") {
	            this._callback = options;
	        }

	        /**
	         *
	         * @type {Array.<EmojiCategory>}
	         */
	        this.categories = this._getCategories();

	        /**
	         * @type {jQuery}
	         */
	        this.$picker = this._getPicker();

	        /**
	         * @type {jQuery}
	         */
	        this.$active_title = this.$picker.find('#active-title');

	        /**
	         * @type {jQuery}
	         */
	        this.$preview_emoji = this.$picker.find('#emoji-large-preview');

	        /**
	         * @type {jQuery}
	         */
	        this.$preview_name = this.$picker.find('#emoji-name');

	        /**
	         * @type {jQuery}
	         */
	        this.$preview_colon = this.$picker.find('#colon-display');

	        /**
	         * @type {jQuery}
	         */
	        this.$content = this.$picker.find('.emoji-content');

	        /**
	         * @type {jQuery}
	         */
	        this.$default_footer = this.$picker.find('.default-content');

	        /**
	         * @type {jQuery}
	         */
	        this.$preview = this.$picker.find('.emoji-preview');

	        /**
	         * @type {jQuery}
	         */
	        this.$search = this.$picker.find('.search-emojis');

	        /**
	         *
	         * @type {HTMLElement|undefined}
	         * @private
	         */
	        this._icon = undefined;

	        /**
	         *
	         * @type {HTMLElement|undefined}
	         * @private
	         */
	        this._container = undefined;

	        /**
	         *
	         * @type {HTMLInputElement|HTMLTextAreaElement|HTMLElement|undefined}
	         * @private
	         */
	        this._input = undefined;

	        /**
	         * Keeps track of placing the emoji in the input, getting
	         * the contents of the editor
	         *
	         * @type {EmojiEditor|undefined}
	         */
	        this.editor = undefined;

	        var _open = false;
	        Object.defineProperty(this, 'picker_open', {
	            get: function get() {
	                return _open;
	            },
	            set: function set(value) {
	                if (value !== _open) {
	                    _open = value;
	                    if (_open) {
	                        _this.openPicker();
	                    } else {
	                        _this.$picker.detach();
	                    }
	                }
	            }
	        });

	        var _active_cat = void 0;
	        Object.defineProperty(this, 'active_category', {
	            get: function get() {
	                return _active_cat;
	            },
	            set: function set(value) {
	                if (!_active_cat || value instanceof _EmojiCategory2.default && value.title !== _active_cat.title) {
	                    _active_cat = value;
	                    _this.setActiveCategory();
	                }
	            }
	        });

	        var _emoji = void 0;
	        Object.defineProperty(this, 'active_emoji', {
	            get: function get() {
	                return _emoji;
	            },
	            set: function set(value) {
	                if (!_emoji || !value || value.full_name !== _emoji.full_name) {
	                    _emoji = value;
	                    _this._updatePreview();
	                }
	            }
	        });

	        this.active_category = this.categories[0];

	        this._onScroll()._onCatClick()._onSearch()._setCategoryTooltips();
	    }

	    /**
	     * Renders html or text containing emojis
	     *
	     * @param str
	     * @returns {string}
	     */


	    _createClass(EmojiPicker, [{
	        key: "listenOn",


	        /**
	         *
	         * @param {HTMLElement} icon
	         * @param {HTMLElement} container
	         * @param {HTMLTextAreaElement|HTMLElement} input
	         */
	        value: function listenOn(icon, container, input) {
	            this._removeOldEvents();
	            this._icon = icon;
	            this._container = container;
	            this._input = input;
	            this.editor = new _EmojiEditor2.default(input, this.defaults.prevent_new_line);

	            this._onIconClick();
	        }

	        /**
	         * Appends the emoji picker to the DOM
	         *
	         * @returns {EmojiPicker}
	         */

	    }, {
	        key: "openPicker",
	        value: function openPicker() {

	            var tooltip = new _rmTooltip2.default(this._icon, this._container, this.$picker);
	            tooltip.center();
	            //If the developer supplied a function to position the tooltip
	            if (typeof this.defaults.positioning === "function") {
	                this.defaults.positioning(tooltip);
	            } else {

	                switch (this.defaults.positioning) {
	                    case "autoplace":
	                        tooltip.autoPlace(43, 10);
	                        break;
	                    case "vertical":
	                        tooltip.autoPlaceVertically(10);
	                        break;
	                    case "horizontal":
	                        tooltip.autoPlaceHorizontally(10);
	                        break;
	                    default:
	                        tooltip.autoPlace(43, 10);
	                        break;
	                }
	            }

	            this._onTooltipClick(tooltip, event);
	            this.$content.get(0).scrollTop = this.active_category.offset_top;

	            return this;
	        }

	        /**
	         * Getter for the input's text.
	         *
	         * @returns {*}
	         */

	    }, {
	        key: "getText",
	        value: function getText() {
	            if (this.editor) {
	                return this.editor.getText();
	            }

	            throw new Error("Did you call this listenOn method first? The listenOn method constructs an instance of EmojiEditor and it appears to be undefined.");
	        }

	        /**
	         * Empties out the input from the editor.
	         */

	    }, {
	        key: "emptyInput",
	        value: function emptyInput() {
	            if (this.editor) {
	                this.editor.empty();
	            } else {
	                console.log("Did you call the listenOn method first? The EmojiEditor instance is undefined.");
	            }
	        }

	        /**
	         * Updates the dom based on the category that became active.
	         *
	         * @returns {EmojiPicker}
	         */

	    }, {
	        key: "setActiveCategory",
	        value: function setActiveCategory() {

	            var picker = this;
	            this.$picker.find('.select-category').each( /**@this {HTMLElement}*/function () {
	                var title = this.getAttribute('data-name');
	                if (title === picker.active_category.title) {
	                    this.classList.add('active');
	                    picker.$active_title.text(picker.active_category.title);
	                } else {
	                    this.classList.remove('active');
	                }
	            });

	            return this;
	        }

	        /**
	         * Find an emoji category by name.
	         *
	         * @param name
	         * @returns {EmojiCategory}
	         */

	    }, {
	        key: "getCategory",
	        value: function getCategory(name) {
	            return this.categories.find(function (cat) {
	                return cat.title === name;
	            });
	        }

	        /**
	         * Finds an individual emoji by name. If the category is known
	         * it can be supplied as the second argument to speed up the search.
	         *
	         * @param {String} name
	         * @param {EmojiCategory} category
	         * @returns {*}
	         */

	    }, {
	        key: "getEmoji",
	        value: function getEmoji(name) {
	            var category = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

	            if (category) {
	                return category.emojis.find(function (emote) {
	                    return emote.full_name === name;
	                });
	            }

	            return this.categories.find(function (cat) {
	                return cat.emojis.find(function (emote) {
	                    return emote.full_name === name;
	                });
	            });
	        }

	        /**
	         * Sets default options based on developer-supplied parameters
	         *
	         * @param options
	         * @private
	         */

	    }, {
	        key: "_setDefaults",
	        value: function _setDefaults(options) {
	            var _this2 = this;

	            var keys = Object.keys(options);
	            keys.forEach(function (key) {
	                if (_this2.defaults.hasOwnProperty(key)) {
	                    _this2.defaults[key] = options[key];
	                }
	            });

	            if (this.defaults.use_sheets) {
	                _Converters2.default.setSheets(this.defaults.sheets);
	            }
	        }

	        /**
	         * Events from EmojiCategory or Emoji bubble up through a callback
	         *
	         * @param action
	         * @param emoji
	         * @param category
	         * @private
	         */

	    }, {
	        key: "_dispatchBubble",
	        value: function _dispatchBubble(action, emoji, category) {

	            var events = _defaults2.default.events;
	            switch (action) {
	                case events.SELECTED:
	                    this._handleSelection(emoji, category);
	                    break;
	                case events.EMOJI_MOUSEENTER:
	                    this.active_emoji = emoji;
	                    break;
	                case events.EMOJI_MOUSELEAVE:
	                    this.active_emoji = undefined;
	                    break;
	                default:
	                    break;
	            }
	        }

	        /**
	         * When an emoji gets clicked on the selection bubbles up
	         * to the EmojiPicker object. First, we place the emoji in
	         * the input and then fire off any callback that were supplied.
	         *
	         *
	         * @param {Emoji} emoji
	         * @param {EmojiCategory} category
	         * @private
	         */

	    }, {
	        key: "_handleSelection",
	        value: function _handleSelection(emoji, category) {

	            var node = this.editor.placeEmoji(emoji);

	            if (typeof this._callback === "function") {
	                this._callback(emoji, category, node);
	            }

	            if (typeof this.defaults.callback === "function") {
	                this.defaults.callback(emoji, category, node);
	            }

	            //Close the picker
	            this.picker_open = false;
	            this.active_emoji = undefined;
	        }

	        /**
	         *
	         * @returns {Array<EmojiCategory>}
	         * @private
	         */

	    }, {
	        key: "_getCategories",
	        value: function _getCategories() {
	            var _this3 = this;

	            var cats = this.defaults.categories.map(function (cat) {
	                return _EmojiCategory2.default.factory(cat, _data2.default[cat.title], _this3._dispatchBubble.bind(_this3));
	            });

	            cats[0].$category.addClass('first');
	            return cats;
	        }

	        /**
	         * Retrieves the emoji picker
	         *
	         * @returns {jQuery|HTMLElement}
	         * @private
	         */

	    }, {
	        key: "_getPicker",
	        value: function _getPicker() {
	            var $picker = (0, _jquery2.default)((0, _picker3.default)({
	                default_content: _defaults2.default.default_footer_message,
	                categories: this.categories.map(function (cat) {
	                    return cat.exportContents();
	                }),
	                search_icon: this.defaults.search_icon
	            }));

	            var $contents = $picker.find('.emoji-content');

	            this.categories.forEach(function (cat) {
	                $contents.append(cat.getMarkup());
	            });

	            return $picker;
	        }

	        /**
	         * Sets a helper tooltip on each category's icon
	         *
	         * @returns {EmojiPicker}
	         * @private
	         */

	    }, {
	        key: "_setCategoryTooltips",
	        value: function _setCategoryTooltips() {
	            //Only proceed if the picker has been initialized and the developer opted to show tooltips
	            if (this.$picker && this.defaults.show_icon_tooltips) {
	                //cache an array of category icon wrappers
	                var $cats = this.$picker.find('.select-category');
	                //Set up a reference to the class instance
	                var _picker = this;
	                var tooltip = void 0;
	                $cats.off('mouseenter.emoji').on('mouseenter.emoji', /**@this {HTMLElement}*/function (event) {
	                    //On mouseenter, get the name of the category, then create the tooltip
	                    var title = this.getAttribute('data-name');
	                    tooltip = new _rmTooltip2.default(this, _picker.$picker.get(0), (0, _jquery2.default)((0, _icon_tooltip2.default)({
	                        text: title
	                    })));

	                    tooltip.below();
	                }).off('mouseleave.emoji').on('mouseleave.emoji', function () {
	                    tooltip.destroy();
	                });
	            }

	            return this;
	        }

	        /**
	         * Removes any old click handlers on the icon.
	         *
	         * @returns {EmojiPicker}
	         * @private
	         */

	    }, {
	        key: "_removeOldEvents",
	        value: function _removeOldEvents() {
	            if (this._icon) {
	                (0, _jquery2.default)(this._icon).off('click.emoji-picker');
	            }

	            return this;
	        }

	        /**
	         * Toggle the visibility of the picker when the icon
	         * gets clicked.
	         *
	         * @returns {EmojiPicker}
	         * @private
	         */

	    }, {
	        key: "_onIconClick",
	        value: function _onIconClick() {
	            var _this4 = this;

	            (0, _jquery2.default)(this._icon).off('click.emoji').on('click.emoji', function (event) {
	                _this4.picker_open = !_this4.picker_open;
	            });

	            return this;
	        }

	        /**
	         *
	         * @param {Tooltip} tooltip
	         * @param {Event} event
	         * @private
	         */

	    }, {
	        key: "_onTooltipClick",
	        value: function _onTooltipClick(tooltip, event) {
	            var _this5 = this;

	            tooltip.setClickCallback(event, function (target, $tooltip) {
	                var $picker = (0, _jquery2.default)(target).closest('#emoji-picker');
	                var is_icon = (0, _jquery2.default)(target).is(_this5._icon);

	                //If the click occurred outside of the tooltip
	                if (!$picker.length && !is_icon) {
	                    _this5.picker_open = false;
	                }
	            });
	        }

	        /**
	         *
	         * @returns {EmojiPicker}
	         * @private
	         */

	    }, {
	        key: "_onScroll",
	        value: function _onScroll() {
	            var _this6 = this;

	            this.$content.off('scroll.emoji').on('scroll.emoji', function (event) {
	                _this6.active_category = _this6._getActiveCategory();
	            });

	            return this;
	        }
	    }, {
	        key: "_onCatClick",
	        value: function _onCatClick() {

	            var picker = this;
	            this.$picker.find('.select-category').off('click.emoji').on('click.emoji', /**@this {HTMLElement}*/function () {
	                var cat = picker.getCategory(this.getAttribute('data-name'));
	                picker.$content.get(0).scrollTop = cat.offset_top;
	                picker.active_category = picker._getActiveCategory();
	            });

	            return this;
	        }

	        /**
	         *
	         *
	         * @returns {EmojiPicker}
	         * @private
	         */

	    }, {
	        key: "_onSearch",
	        value: function _onSearch() {
	            var _this7 = this;

	            this.$search.off('input.emoji').on('input.emoji', function () {
	                var search = _this7.$search.val().trim();
	                _this7.categories.forEach(function (cat) {
	                    return cat.search_term = search;
	                });
	                _this7.$active_title.text("Results for: " + search);
	                if (search.length === 0) {
	                    _this7.active_category = _this7._getActiveCategory();
	                    //Manually call this in case the category hadn't changed since the search started
	                    _this7.setActiveCategory();
	                }
	            });

	            return this;
	        }

	        /**
	         * Gets the active category based on scroll position
	         *
	         * @returns {EmojiCategory}
	         * @private
	         */

	    }, {
	        key: "_getActiveCategory",
	        value: function _getActiveCategory() {

	            var scroll_top = this.$content.get(0).scrollTop;
	            var cat = this.categories[0];

	            for (var i = 0; i < this.categories.length; i++) {
	                if (this.categories[i].offset_top > scroll_top) {
	                    return cat;
	                }
	                cat = this.categories[i];
	            }

	            return this.categories[this.categories.length - 1];
	        }

	        /**
	         * Updates the preview section with either the default content
	         * or
	         *
	         * @private
	         */

	    }, {
	        key: "_updatePreview",
	        value: function _updatePreview() {

	            var emoji = this.active_emoji;
	            if (emoji) {
	                this.$default_footer.hide();
	                this.$preview_emoji.html(emoji.getPreview());
	                this.$preview_name.text(emoji.short_name);
	                if (this.defaults.show_colon_preview) {
	                    this.$preview_colon.text(emoji.getColons());
	                    this.$preview_name.removeClass('name-only');
	                } else {
	                    this.$preview_name.addClass('name-only');
	                }
	                this.$preview.show();
	            } else {
	                this.$preview.hide();
	                this.$default_footer.show();
	            }
	        }
	    }], [{
	        key: "render",
	        value: function render(str) {

	            var converter = _Converters2.default.withEnvironment();
	            //If the code is running on a mobile device, don't run replace_unified
	            if (_Converters2.default.is_mobile) {
	                return converter.replace_colons(str);
	            }
	            //Otherwise, make an attempt to replace both colons and unified code.
	            return converter.replace_unified(converter.replace_colons(str));
	        }

	        /**
	         *
	         * @param {object} sheets
	         */

	    }, {
	        key: "setSheets",
	        value: function setSheets() {
	            var sheets = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

	            sheets = sheets || _defaults2.default.sheets;
	            _Converters2.default.setSheets(sheets);
	        }
	    }]);

	    return EmojiPicker;
	}();

	exports.default = EmojiPicker;


	window.EmojiPicker = EmojiPicker;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/*!
	 * jQuery JavaScript Library v3.2.1
	 * https://jquery.com/
	 *
	 * Includes Sizzle.js
	 * https://sizzlejs.com/
	 *
	 * Copyright JS Foundation and other contributors
	 * Released under the MIT license
	 * https://jquery.org/license
	 *
	 * Date: 2017-03-20T18:59Z
	 */
	(function (global, factory) {

		"use strict";

		if (( false ? "undefined" : _typeof(module)) === "object" && _typeof(module.exports) === "object") {

			// For CommonJS and CommonJS-like environments where a proper `window`
			// is present, execute the factory and get jQuery.
			// For environments that do not have a `window` with a `document`
			// (such as Node.js), expose a factory as module.exports.
			// This accentuates the need for the creation of a real `window`.
			// e.g. var jQuery = require("jquery")(window);
			// See ticket #14549 for more info.
			module.exports = global.document ? factory(global, true) : function (w) {
				if (!w.document) {
					throw new Error("jQuery requires a window with a document");
				}
				return factory(w);
			};
		} else {
			factory(global);
		}

		// Pass this if window is not defined yet
	})(typeof window !== "undefined" ? window : undefined, function (window, noGlobal) {

		// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
		// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
		// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
		// enough that all such attempts are guarded in a try block.
		"use strict";

		var arr = [];

		var document = window.document;

		var getProto = Object.getPrototypeOf;

		var _slice = arr.slice;

		var concat = arr.concat;

		var push = arr.push;

		var indexOf = arr.indexOf;

		var class2type = {};

		var toString = class2type.toString;

		var hasOwn = class2type.hasOwnProperty;

		var fnToString = hasOwn.toString;

		var ObjectFunctionString = fnToString.call(Object);

		var support = {};

		function DOMEval(code, doc) {
			doc = doc || document;

			var script = doc.createElement("script");

			script.text = code;
			doc.head.appendChild(script).parentNode.removeChild(script);
		}
		/* global Symbol */
		// Defining this global in .eslintrc.json would create a danger of using the global
		// unguarded in another place, it seems safer to define global only for this module


		var version = "3.2.1",


		// Define a local copy of jQuery
		jQuery = function jQuery(selector, context) {

			// The jQuery object is actually just the init constructor 'enhanced'
			// Need init if jQuery is called (just allow error to be thrown if not included)
			return new jQuery.fn.init(selector, context);
		},


		// Support: Android <=4.0 only
		// Make sure we trim BOM and NBSP
		rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,


		// Matches dashed string for camelizing
		rmsPrefix = /^-ms-/,
		    rdashAlpha = /-([a-z])/g,


		// Used by jQuery.camelCase as callback to replace()
		fcamelCase = function fcamelCase(all, letter) {
			return letter.toUpperCase();
		};

		jQuery.fn = jQuery.prototype = {

			// The current version of jQuery being used
			jquery: version,

			constructor: jQuery,

			// The default length of a jQuery object is 0
			length: 0,

			toArray: function toArray() {
				return _slice.call(this);
			},

			// Get the Nth element in the matched element set OR
			// Get the whole matched element set as a clean array
			get: function get(num) {

				// Return all the elements in a clean array
				if (num == null) {
					return _slice.call(this);
				}

				// Return just the one element from the set
				return num < 0 ? this[num + this.length] : this[num];
			},

			// Take an array of elements and push it onto the stack
			// (returning the new matched element set)
			pushStack: function pushStack(elems) {

				// Build a new jQuery matched element set
				var ret = jQuery.merge(this.constructor(), elems);

				// Add the old object onto the stack (as a reference)
				ret.prevObject = this;

				// Return the newly-formed element set
				return ret;
			},

			// Execute a callback for every element in the matched set.
			each: function each(callback) {
				return jQuery.each(this, callback);
			},

			map: function map(callback) {
				return this.pushStack(jQuery.map(this, function (elem, i) {
					return callback.call(elem, i, elem);
				}));
			},

			slice: function slice() {
				return this.pushStack(_slice.apply(this, arguments));
			},

			first: function first() {
				return this.eq(0);
			},

			last: function last() {
				return this.eq(-1);
			},

			eq: function eq(i) {
				var len = this.length,
				    j = +i + (i < 0 ? len : 0);
				return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
			},

			end: function end() {
				return this.prevObject || this.constructor();
			},

			// For internal use only.
			// Behaves like an Array's method, not like a jQuery method.
			push: push,
			sort: arr.sort,
			splice: arr.splice
		};

		jQuery.extend = jQuery.fn.extend = function () {
			var options,
			    name,
			    src,
			    copy,
			    copyIsArray,
			    clone,
			    target = arguments[0] || {},
			    i = 1,
			    length = arguments.length,
			    deep = false;

			// Handle a deep copy situation
			if (typeof target === "boolean") {
				deep = target;

				// Skip the boolean and the target
				target = arguments[i] || {};
				i++;
			}

			// Handle case when target is a string or something (possible in deep copy)
			if ((typeof target === "undefined" ? "undefined" : _typeof(target)) !== "object" && !jQuery.isFunction(target)) {
				target = {};
			}

			// Extend jQuery itself if only one argument is passed
			if (i === length) {
				target = this;
				i--;
			}

			for (; i < length; i++) {

				// Only deal with non-null/undefined values
				if ((options = arguments[i]) != null) {

					// Extend the base object
					for (name in options) {
						src = target[name];
						copy = options[name];

						// Prevent never-ending loop
						if (target === copy) {
							continue;
						}

						// Recurse if we're merging plain objects or arrays
						if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {

							if (copyIsArray) {
								copyIsArray = false;
								clone = src && Array.isArray(src) ? src : [];
							} else {
								clone = src && jQuery.isPlainObject(src) ? src : {};
							}

							// Never move original objects, clone them
							target[name] = jQuery.extend(deep, clone, copy);

							// Don't bring in undefined values
						} else if (copy !== undefined) {
							target[name] = copy;
						}
					}
				}
			}

			// Return the modified object
			return target;
		};

		jQuery.extend({

			// Unique for each copy of jQuery on the page
			expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),

			// Assume jQuery is ready without the ready module
			isReady: true,

			error: function error(msg) {
				throw new Error(msg);
			},

			noop: function noop() {},

			isFunction: function isFunction(obj) {
				return jQuery.type(obj) === "function";
			},

			isWindow: function isWindow(obj) {
				return obj != null && obj === obj.window;
			},

			isNumeric: function isNumeric(obj) {

				// As of jQuery 3.0, isNumeric is limited to
				// strings and numbers (primitives or objects)
				// that can be coerced to finite numbers (gh-2662)
				var type = jQuery.type(obj);
				return (type === "number" || type === "string") &&

				// parseFloat NaNs numeric-cast false positives ("")
				// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
				// subtraction forces infinities to NaN
				!isNaN(obj - parseFloat(obj));
			},

			isPlainObject: function isPlainObject(obj) {
				var proto, Ctor;

				// Detect obvious negatives
				// Use toString instead of jQuery.type to catch host objects
				if (!obj || toString.call(obj) !== "[object Object]") {
					return false;
				}

				proto = getProto(obj);

				// Objects with no prototype (e.g., `Object.create( null )`) are plain
				if (!proto) {
					return true;
				}

				// Objects with prototype are plain iff they were constructed by a global Object function
				Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
				return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
			},

			isEmptyObject: function isEmptyObject(obj) {

				/* eslint-disable no-unused-vars */
				// See https://github.com/eslint/eslint/issues/6125
				var name;

				for (name in obj) {
					return false;
				}
				return true;
			},

			type: function type(obj) {
				if (obj == null) {
					return obj + "";
				}

				// Support: Android <=2.3 only (functionish RegExp)
				return (typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
			},

			// Evaluates a script in a global context
			globalEval: function globalEval(code) {
				DOMEval(code);
			},

			// Convert dashed to camelCase; used by the css and data modules
			// Support: IE <=9 - 11, Edge 12 - 13
			// Microsoft forgot to hump their vendor prefix (#9572)
			camelCase: function camelCase(string) {
				return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
			},

			each: function each(obj, callback) {
				var length,
				    i = 0;

				if (isArrayLike(obj)) {
					length = obj.length;
					for (; i < length; i++) {
						if (callback.call(obj[i], i, obj[i]) === false) {
							break;
						}
					}
				} else {
					for (i in obj) {
						if (callback.call(obj[i], i, obj[i]) === false) {
							break;
						}
					}
				}

				return obj;
			},

			// Support: Android <=4.0 only
			trim: function trim(text) {
				return text == null ? "" : (text + "").replace(rtrim, "");
			},

			// results is for internal usage only
			makeArray: function makeArray(arr, results) {
				var ret = results || [];

				if (arr != null) {
					if (isArrayLike(Object(arr))) {
						jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
					} else {
						push.call(ret, arr);
					}
				}

				return ret;
			},

			inArray: function inArray(elem, arr, i) {
				return arr == null ? -1 : indexOf.call(arr, elem, i);
			},

			// Support: Android <=4.0 only, PhantomJS 1 only
			// push.apply(_, arraylike) throws on ancient WebKit
			merge: function merge(first, second) {
				var len = +second.length,
				    j = 0,
				    i = first.length;

				for (; j < len; j++) {
					first[i++] = second[j];
				}

				first.length = i;

				return first;
			},

			grep: function grep(elems, callback, invert) {
				var callbackInverse,
				    matches = [],
				    i = 0,
				    length = elems.length,
				    callbackExpect = !invert;

				// Go through the array, only saving the items
				// that pass the validator function
				for (; i < length; i++) {
					callbackInverse = !callback(elems[i], i);
					if (callbackInverse !== callbackExpect) {
						matches.push(elems[i]);
					}
				}

				return matches;
			},

			// arg is for internal usage only
			map: function map(elems, callback, arg) {
				var length,
				    value,
				    i = 0,
				    ret = [];

				// Go through the array, translating each of the items to their new values
				if (isArrayLike(elems)) {
					length = elems.length;
					for (; i < length; i++) {
						value = callback(elems[i], i, arg);

						if (value != null) {
							ret.push(value);
						}
					}

					// Go through every key on the object,
				} else {
					for (i in elems) {
						value = callback(elems[i], i, arg);

						if (value != null) {
							ret.push(value);
						}
					}
				}

				// Flatten any nested arrays
				return concat.apply([], ret);
			},

			// A global GUID counter for objects
			guid: 1,

			// Bind a function to a context, optionally partially applying any
			// arguments.
			proxy: function proxy(fn, context) {
				var tmp, args, proxy;

				if (typeof context === "string") {
					tmp = fn[context];
					context = fn;
					fn = tmp;
				}

				// Quick check to determine if target is callable, in the spec
				// this throws a TypeError, but we will just return undefined.
				if (!jQuery.isFunction(fn)) {
					return undefined;
				}

				// Simulated bind
				args = _slice.call(arguments, 2);
				proxy = function proxy() {
					return fn.apply(context || this, args.concat(_slice.call(arguments)));
				};

				// Set the guid of unique handler to the same of original handler, so it can be removed
				proxy.guid = fn.guid = fn.guid || jQuery.guid++;

				return proxy;
			},

			now: Date.now,

			// jQuery.support is not used in Core but other projects attach their
			// properties to it so it needs to exist.
			support: support
		});

		if (typeof Symbol === "function") {
			jQuery.fn[Symbol.iterator] = arr[Symbol.iterator];
		}

		// Populate the class2type map
		jQuery.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (i, name) {
			class2type["[object " + name + "]"] = name.toLowerCase();
		});

		function isArrayLike(obj) {

			// Support: real iOS 8.2 only (not reproducible in simulator)
			// `in` check used to prevent JIT error (gh-2145)
			// hasOwn isn't used here due to false negatives
			// regarding Nodelist length in IE
			var length = !!obj && "length" in obj && obj.length,
			    type = jQuery.type(obj);

			if (type === "function" || jQuery.isWindow(obj)) {
				return false;
			}

			return type === "array" || length === 0 || typeof length === "number" && length > 0 && length - 1 in obj;
		}
		var Sizzle =
		/*!
	  * Sizzle CSS Selector Engine v2.3.3
	  * https://sizzlejs.com/
	  *
	  * Copyright jQuery Foundation and other contributors
	  * Released under the MIT license
	  * http://jquery.org/license
	  *
	  * Date: 2016-08-08
	  */
		function (window) {

			var i,
			    support,
			    Expr,
			    getText,
			    isXML,
			    tokenize,
			    compile,
			    select,
			    outermostContext,
			    sortInput,
			    hasDuplicate,


			// Local document vars
			setDocument,
			    document,
			    docElem,
			    documentIsHTML,
			    rbuggyQSA,
			    rbuggyMatches,
			    matches,
			    contains,


			// Instance-specific data
			expando = "sizzle" + 1 * new Date(),
			    preferredDoc = window.document,
			    dirruns = 0,
			    done = 0,
			    classCache = createCache(),
			    tokenCache = createCache(),
			    compilerCache = createCache(),
			    sortOrder = function sortOrder(a, b) {
				if (a === b) {
					hasDuplicate = true;
				}
				return 0;
			},


			// Instance methods
			hasOwn = {}.hasOwnProperty,
			    arr = [],
			    pop = arr.pop,
			    push_native = arr.push,
			    push = arr.push,
			    slice = arr.slice,

			// Use a stripped-down indexOf as it's faster than native
			// https://jsperf.com/thor-indexof-vs-for/5
			indexOf = function indexOf(list, elem) {
				var i = 0,
				    len = list.length;
				for (; i < len; i++) {
					if (list[i] === elem) {
						return i;
					}
				}
				return -1;
			},
			    booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",


			// Regular expressions

			// http://www.w3.org/TR/css3-selectors/#whitespace
			whitespace = "[\\x20\\t\\r\\n\\f]",


			// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
			identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",


			// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
			attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
			// Operator (capture 2)
			"*([*^$|!~]?=)" + whitespace +
			// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
			"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
			    pseudos = ":(" + identifier + ")(?:\\((" +
			// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
			// 1. quoted (capture 3; capture 4 or capture 5)
			"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
			// 2. simple (capture 6)
			"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
			// 3. anything else (capture 2)
			".*" + ")\\)|)",


			// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
			rwhitespace = new RegExp(whitespace + "+", "g"),
			    rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
			    rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
			    rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
			    rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
			    rpseudo = new RegExp(pseudos),
			    ridentifier = new RegExp("^" + identifier + "$"),
			    matchExpr = {
				"ID": new RegExp("^#(" + identifier + ")"),
				"CLASS": new RegExp("^\\.(" + identifier + ")"),
				"TAG": new RegExp("^(" + identifier + "|[*])"),
				"ATTR": new RegExp("^" + attributes),
				"PSEUDO": new RegExp("^" + pseudos),
				"CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
				"bool": new RegExp("^(?:" + booleans + ")$", "i"),
				// For use in libraries implementing .is()
				// We use this for POS matching in `select`
				"needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
			},
			    rinputs = /^(?:input|select|textarea|button)$/i,
			    rheader = /^h\d$/i,
			    rnative = /^[^{]+\{\s*\[native \w/,


			// Easily-parseable/retrievable ID or TAG or CLASS selectors
			rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
			    rsibling = /[+~]/,


			// CSS escapes
			// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
			runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
			    funescape = function funescape(_, escaped, escapedWhitespace) {
				var high = "0x" + escaped - 0x10000;
				// NaN means non-codepoint
				// Support: Firefox<24
				// Workaround erroneous numeric interpretation of +"0x"
				return high !== high || escapedWhitespace ? escaped : high < 0 ?
				// BMP codepoint
				String.fromCharCode(high + 0x10000) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
			},


			// CSS string/identifier serialization
			// https://drafts.csswg.org/cssom/#common-serializing-idioms
			rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
			    fcssescape = function fcssescape(ch, asCodePoint) {
				if (asCodePoint) {

					// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
					if (ch === "\0") {
						return "\uFFFD";
					}

					// Control characters and (dependent upon position) numbers get escaped as code points
					return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
				}

				// Other potentially-special ASCII characters get backslash-escaped
				return "\\" + ch;
			},


			// Used for iframes
			// See setDocument()
			// Removing the function wrapper causes a "Permission Denied"
			// error in IE
			unloadHandler = function unloadHandler() {
				setDocument();
			},
			    disabledAncestor = addCombinator(function (elem) {
				return elem.disabled === true && ("form" in elem || "label" in elem);
			}, { dir: "parentNode", next: "legend" });

			// Optimize for push.apply( _, NodeList )
			try {
				push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes);
				// Support: Android<4.0
				// Detect silently failing push.apply
				arr[preferredDoc.childNodes.length].nodeType;
			} catch (e) {
				push = { apply: arr.length ?

					// Leverage slice if possible
					function (target, els) {
						push_native.apply(target, slice.call(els));
					} :

					// Support: IE<9
					// Otherwise append directly
					function (target, els) {
						var j = target.length,
						    i = 0;
						// Can't trust NodeList.length
						while (target[j++] = els[i++]) {}
						target.length = j - 1;
					}
				};
			}

			function Sizzle(selector, context, results, seed) {
				var m,
				    i,
				    elem,
				    nid,
				    match,
				    groups,
				    newSelector,
				    newContext = context && context.ownerDocument,


				// nodeType defaults to 9, since context defaults to document
				nodeType = context ? context.nodeType : 9;

				results = results || [];

				// Return early from calls with invalid selector or context
				if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {

					return results;
				}

				// Try to shortcut find operations (as opposed to filters) in HTML documents
				if (!seed) {

					if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
						setDocument(context);
					}
					context = context || document;

					if (documentIsHTML) {

						// If the selector is sufficiently simple, try using a "get*By*" DOM method
						// (excepting DocumentFragment context, where the methods don't exist)
						if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {

							// ID selector
							if (m = match[1]) {

								// Document context
								if (nodeType === 9) {
									if (elem = context.getElementById(m)) {

										// Support: IE, Opera, Webkit
										// TODO: identify versions
										// getElementById can match elements by name instead of ID
										if (elem.id === m) {
											results.push(elem);
											return results;
										}
									} else {
										return results;
									}

									// Element context
								} else {

									// Support: IE, Opera, Webkit
									// TODO: identify versions
									// getElementById can match elements by name instead of ID
									if (newContext && (elem = newContext.getElementById(m)) && contains(context, elem) && elem.id === m) {

										results.push(elem);
										return results;
									}
								}

								// Type selector
							} else if (match[2]) {
								push.apply(results, context.getElementsByTagName(selector));
								return results;

								// Class selector
							} else if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) {

								push.apply(results, context.getElementsByClassName(m));
								return results;
							}
						}

						// Take advantage of querySelectorAll
						if (support.qsa && !compilerCache[selector + " "] && (!rbuggyQSA || !rbuggyQSA.test(selector))) {

							if (nodeType !== 1) {
								newContext = context;
								newSelector = selector;

								// qSA looks outside Element context, which is not what we want
								// Thanks to Andrew Dupont for this workaround technique
								// Support: IE <=8
								// Exclude object elements
							} else if (context.nodeName.toLowerCase() !== "object") {

								// Capture the context ID, setting it first if necessary
								if (nid = context.getAttribute("id")) {
									nid = nid.replace(rcssescape, fcssescape);
								} else {
									context.setAttribute("id", nid = expando);
								}

								// Prefix every selector in the list
								groups = tokenize(selector);
								i = groups.length;
								while (i--) {
									groups[i] = "#" + nid + " " + toSelector(groups[i]);
								}
								newSelector = groups.join(",");

								// Expand context for sibling selectors
								newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
							}

							if (newSelector) {
								try {
									push.apply(results, newContext.querySelectorAll(newSelector));
									return results;
								} catch (qsaError) {} finally {
									if (nid === expando) {
										context.removeAttribute("id");
									}
								}
							}
						}
					}
				}

				// All others
				return select(selector.replace(rtrim, "$1"), context, results, seed);
			}

			/**
	   * Create key-value caches of limited size
	   * @returns {function(string, object)} Returns the Object data after storing it on itself with
	   *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
	   *	deleting the oldest entry
	   */
			function createCache() {
				var keys = [];

				function cache(key, value) {
					// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
					if (keys.push(key + " ") > Expr.cacheLength) {
						// Only keep the most recent entries
						delete cache[keys.shift()];
					}
					return cache[key + " "] = value;
				}
				return cache;
			}

			/**
	   * Mark a function for special use by Sizzle
	   * @param {Function} fn The function to mark
	   */
			function markFunction(fn) {
				fn[expando] = true;
				return fn;
			}

			/**
	   * Support testing using an element
	   * @param {Function} fn Passed the created element and returns a boolean result
	   */
			function assert(fn) {
				var el = document.createElement("fieldset");

				try {
					return !!fn(el);
				} catch (e) {
					return false;
				} finally {
					// Remove from its parent by default
					if (el.parentNode) {
						el.parentNode.removeChild(el);
					}
					// release memory in IE
					el = null;
				}
			}

			/**
	   * Adds the same handler for all of the specified attrs
	   * @param {String} attrs Pipe-separated list of attributes
	   * @param {Function} handler The method that will be applied
	   */
			function addHandle(attrs, handler) {
				var arr = attrs.split("|"),
				    i = arr.length;

				while (i--) {
					Expr.attrHandle[arr[i]] = handler;
				}
			}

			/**
	   * Checks document order of two siblings
	   * @param {Element} a
	   * @param {Element} b
	   * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
	   */
			function siblingCheck(a, b) {
				var cur = b && a,
				    diff = cur && a.nodeType === 1 && b.nodeType === 1 && a.sourceIndex - b.sourceIndex;

				// Use IE sourceIndex if available on both nodes
				if (diff) {
					return diff;
				}

				// Check if b follows a
				if (cur) {
					while (cur = cur.nextSibling) {
						if (cur === b) {
							return -1;
						}
					}
				}

				return a ? 1 : -1;
			}

			/**
	   * Returns a function to use in pseudos for input types
	   * @param {String} type
	   */
			function createInputPseudo(type) {
				return function (elem) {
					var name = elem.nodeName.toLowerCase();
					return name === "input" && elem.type === type;
				};
			}

			/**
	   * Returns a function to use in pseudos for buttons
	   * @param {String} type
	   */
			function createButtonPseudo(type) {
				return function (elem) {
					var name = elem.nodeName.toLowerCase();
					return (name === "input" || name === "button") && elem.type === type;
				};
			}

			/**
	   * Returns a function to use in pseudos for :enabled/:disabled
	   * @param {Boolean} disabled true for :disabled; false for :enabled
	   */
			function createDisabledPseudo(disabled) {

				// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
				return function (elem) {

					// Only certain elements can match :enabled or :disabled
					// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
					// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
					if ("form" in elem) {

						// Check for inherited disabledness on relevant non-disabled elements:
						// * listed form-associated elements in a disabled fieldset
						//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
						//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
						// * option elements in a disabled optgroup
						//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
						// All such elements have a "form" property.
						if (elem.parentNode && elem.disabled === false) {

							// Option elements defer to a parent optgroup if present
							if ("label" in elem) {
								if ("label" in elem.parentNode) {
									return elem.parentNode.disabled === disabled;
								} else {
									return elem.disabled === disabled;
								}
							}

							// Support: IE 6 - 11
							// Use the isDisabled shortcut property to check for disabled fieldset ancestors
							return elem.isDisabled === disabled ||

							// Where there is no isDisabled, check manually
							/* jshint -W018 */
							elem.isDisabled !== !disabled && disabledAncestor(elem) === disabled;
						}

						return elem.disabled === disabled;

						// Try to winnow out elements that can't be disabled before trusting the disabled property.
						// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
						// even exist on them, let alone have a boolean value.
					} else if ("label" in elem) {
						return elem.disabled === disabled;
					}

					// Remaining elements are neither :enabled nor :disabled
					return false;
				};
			}

			/**
	   * Returns a function to use in pseudos for positionals
	   * @param {Function} fn
	   */
			function createPositionalPseudo(fn) {
				return markFunction(function (argument) {
					argument = +argument;
					return markFunction(function (seed, matches) {
						var j,
						    matchIndexes = fn([], seed.length, argument),
						    i = matchIndexes.length;

						// Match elements found at the specified indexes
						while (i--) {
							if (seed[j = matchIndexes[i]]) {
								seed[j] = !(matches[j] = seed[j]);
							}
						}
					});
				});
			}

			/**
	   * Checks a node for validity as a Sizzle context
	   * @param {Element|Object=} context
	   * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
	   */
			function testContext(context) {
				return context && typeof context.getElementsByTagName !== "undefined" && context;
			}

			// Expose support vars for convenience
			support = Sizzle.support = {};

			/**
	   * Detects XML nodes
	   * @param {Element|Object} elem An element or a document
	   * @returns {Boolean} True iff elem is a non-HTML XML node
	   */
			isXML = Sizzle.isXML = function (elem) {
				// documentElement is verified for cases where it doesn't yet exist
				// (such as loading iframes in IE - #4833)
				var documentElement = elem && (elem.ownerDocument || elem).documentElement;
				return documentElement ? documentElement.nodeName !== "HTML" : false;
			};

			/**
	   * Sets document-related variables once based on the current document
	   * @param {Element|Object} [doc] An element or document object to use to set the document
	   * @returns {Object} Returns the current document
	   */
			setDocument = Sizzle.setDocument = function (node) {
				var hasCompare,
				    subWindow,
				    doc = node ? node.ownerDocument || node : preferredDoc;

				// Return early if doc is invalid or already selected
				if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
					return document;
				}

				// Update global variables
				document = doc;
				docElem = document.documentElement;
				documentIsHTML = !isXML(document);

				// Support: IE 9-11, Edge
				// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
				if (preferredDoc !== document && (subWindow = document.defaultView) && subWindow.top !== subWindow) {

					// Support: IE 11, Edge
					if (subWindow.addEventListener) {
						subWindow.addEventListener("unload", unloadHandler, false);

						// Support: IE 9 - 10 only
					} else if (subWindow.attachEvent) {
						subWindow.attachEvent("onunload", unloadHandler);
					}
				}

				/* Attributes
	   ---------------------------------------------------------------------- */

				// Support: IE<8
				// Verify that getAttribute really returns attributes and not properties
				// (excepting IE8 booleans)
				support.attributes = assert(function (el) {
					el.className = "i";
					return !el.getAttribute("className");
				});

				/* getElement(s)By*
	   ---------------------------------------------------------------------- */

				// Check if getElementsByTagName("*") returns only elements
				support.getElementsByTagName = assert(function (el) {
					el.appendChild(document.createComment(""));
					return !el.getElementsByTagName("*").length;
				});

				// Support: IE<9
				support.getElementsByClassName = rnative.test(document.getElementsByClassName);

				// Support: IE<10
				// Check if getElementById returns elements by name
				// The broken getElementById methods don't pick up programmatically-set names,
				// so use a roundabout getElementsByName test
				support.getById = assert(function (el) {
					docElem.appendChild(el).id = expando;
					return !document.getElementsByName || !document.getElementsByName(expando).length;
				});

				// ID filter and find
				if (support.getById) {
					Expr.filter["ID"] = function (id) {
						var attrId = id.replace(runescape, funescape);
						return function (elem) {
							return elem.getAttribute("id") === attrId;
						};
					};
					Expr.find["ID"] = function (id, context) {
						if (typeof context.getElementById !== "undefined" && documentIsHTML) {
							var elem = context.getElementById(id);
							return elem ? [elem] : [];
						}
					};
				} else {
					Expr.filter["ID"] = function (id) {
						var attrId = id.replace(runescape, funescape);
						return function (elem) {
							var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
							return node && node.value === attrId;
						};
					};

					// Support: IE 6 - 7 only
					// getElementById is not reliable as a find shortcut
					Expr.find["ID"] = function (id, context) {
						if (typeof context.getElementById !== "undefined" && documentIsHTML) {
							var node,
							    i,
							    elems,
							    elem = context.getElementById(id);

							if (elem) {

								// Verify the id attribute
								node = elem.getAttributeNode("id");
								if (node && node.value === id) {
									return [elem];
								}

								// Fall back on getElementsByName
								elems = context.getElementsByName(id);
								i = 0;
								while (elem = elems[i++]) {
									node = elem.getAttributeNode("id");
									if (node && node.value === id) {
										return [elem];
									}
								}
							}

							return [];
						}
					};
				}

				// Tag
				Expr.find["TAG"] = support.getElementsByTagName ? function (tag, context) {
					if (typeof context.getElementsByTagName !== "undefined") {
						return context.getElementsByTagName(tag);

						// DocumentFragment nodes don't have gEBTN
					} else if (support.qsa) {
						return context.querySelectorAll(tag);
					}
				} : function (tag, context) {
					var elem,
					    tmp = [],
					    i = 0,

					// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
					results = context.getElementsByTagName(tag);

					// Filter out possible comments
					if (tag === "*") {
						while (elem = results[i++]) {
							if (elem.nodeType === 1) {
								tmp.push(elem);
							}
						}

						return tmp;
					}
					return results;
				};

				// Class
				Expr.find["CLASS"] = support.getElementsByClassName && function (className, context) {
					if (typeof context.getElementsByClassName !== "undefined" && documentIsHTML) {
						return context.getElementsByClassName(className);
					}
				};

				/* QSA/matchesSelector
	   ---------------------------------------------------------------------- */

				// QSA and matchesSelector support

				// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
				rbuggyMatches = [];

				// qSa(:focus) reports false when true (Chrome 21)
				// We allow this because of a bug in IE8/9 that throws an error
				// whenever `document.activeElement` is accessed on an iframe
				// So, we allow :focus to pass through QSA all the time to avoid the IE error
				// See https://bugs.jquery.com/ticket/13378
				rbuggyQSA = [];

				if (support.qsa = rnative.test(document.querySelectorAll)) {
					// Build QSA regex
					// Regex strategy adopted from Diego Perini
					assert(function (el) {
						// Select is set to empty string on purpose
						// This is to test IE's treatment of not explicitly
						// setting a boolean content attribute,
						// since its presence should be enough
						// https://bugs.jquery.com/ticket/12359
						docElem.appendChild(el).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\r\\' msallowcapture=''>" + "<option selected=''></option></select>";

						// Support: IE8, Opera 11-12.16
						// Nothing should be selected when empty strings follow ^= or $= or *=
						// The test attribute must be unknown in Opera but "safe" for WinRT
						// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
						if (el.querySelectorAll("[msallowcapture^='']").length) {
							rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
						}

						// Support: IE8
						// Boolean attributes and "value" are not treated correctly
						if (!el.querySelectorAll("[selected]").length) {
							rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
						}

						// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
						if (!el.querySelectorAll("[id~=" + expando + "-]").length) {
							rbuggyQSA.push("~=");
						}

						// Webkit/Opera - :checked should return selected option elements
						// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
						// IE8 throws error here and will not see later tests
						if (!el.querySelectorAll(":checked").length) {
							rbuggyQSA.push(":checked");
						}

						// Support: Safari 8+, iOS 8+
						// https://bugs.webkit.org/show_bug.cgi?id=136851
						// In-page `selector#id sibling-combinator selector` fails
						if (!el.querySelectorAll("a#" + expando + "+*").length) {
							rbuggyQSA.push(".#.+[+~]");
						}
					});

					assert(function (el) {
						el.innerHTML = "<a href='' disabled='disabled'></a>" + "<select disabled='disabled'><option/></select>";

						// Support: Windows 8 Native Apps
						// The type and name attributes are restricted during .innerHTML assignment
						var input = document.createElement("input");
						input.setAttribute("type", "hidden");
						el.appendChild(input).setAttribute("name", "D");

						// Support: IE8
						// Enforce case-sensitivity of name attribute
						if (el.querySelectorAll("[name=d]").length) {
							rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
						}

						// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
						// IE8 throws error here and will not see later tests
						if (el.querySelectorAll(":enabled").length !== 2) {
							rbuggyQSA.push(":enabled", ":disabled");
						}

						// Support: IE9-11+
						// IE's :disabled selector does not pick up the children of disabled fieldsets
						docElem.appendChild(el).disabled = true;
						if (el.querySelectorAll(":disabled").length !== 2) {
							rbuggyQSA.push(":enabled", ":disabled");
						}

						// Opera 10-11 does not throw on post-comma invalid pseudos
						el.querySelectorAll("*,:x");
						rbuggyQSA.push(",.*:");
					});
				}

				if (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) {

					assert(function (el) {
						// Check to see if it's possible to do matchesSelector
						// on a disconnected node (IE 9)
						support.disconnectedMatch = matches.call(el, "*");

						// This should fail with an exception
						// Gecko does not error, returns false instead
						matches.call(el, "[s!='']:x");
						rbuggyMatches.push("!=", pseudos);
					});
				}

				rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
				rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));

				/* Contains
	   ---------------------------------------------------------------------- */
				hasCompare = rnative.test(docElem.compareDocumentPosition);

				// Element contains another
				// Purposefully self-exclusive
				// As in, an element does not contain itself
				contains = hasCompare || rnative.test(docElem.contains) ? function (a, b) {
					var adown = a.nodeType === 9 ? a.documentElement : a,
					    bup = b && b.parentNode;
					return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
				} : function (a, b) {
					if (b) {
						while (b = b.parentNode) {
							if (b === a) {
								return true;
							}
						}
					}
					return false;
				};

				/* Sorting
	   ---------------------------------------------------------------------- */

				// Document order sorting
				sortOrder = hasCompare ? function (a, b) {

					// Flag for duplicate removal
					if (a === b) {
						hasDuplicate = true;
						return 0;
					}

					// Sort on method existence if only one input has compareDocumentPosition
					var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
					if (compare) {
						return compare;
					}

					// Calculate position if both inputs belong to the same document
					compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) :

					// Otherwise we know they are disconnected
					1;

					// Disconnected nodes
					if (compare & 1 || !support.sortDetached && b.compareDocumentPosition(a) === compare) {

						// Choose the first element that is related to our preferred document
						if (a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
							return -1;
						}
						if (b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
							return 1;
						}

						// Maintain original order
						return sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
					}

					return compare & 4 ? -1 : 1;
				} : function (a, b) {
					// Exit early if the nodes are identical
					if (a === b) {
						hasDuplicate = true;
						return 0;
					}

					var cur,
					    i = 0,
					    aup = a.parentNode,
					    bup = b.parentNode,
					    ap = [a],
					    bp = [b];

					// Parentless nodes are either documents or disconnected
					if (!aup || !bup) {
						return a === document ? -1 : b === document ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;

						// If the nodes are siblings, we can do a quick check
					} else if (aup === bup) {
						return siblingCheck(a, b);
					}

					// Otherwise we need full lists of their ancestors for comparison
					cur = a;
					while (cur = cur.parentNode) {
						ap.unshift(cur);
					}
					cur = b;
					while (cur = cur.parentNode) {
						bp.unshift(cur);
					}

					// Walk down the tree looking for a discrepancy
					while (ap[i] === bp[i]) {
						i++;
					}

					return i ?
					// Do a sibling check if the nodes have a common ancestor
					siblingCheck(ap[i], bp[i]) :

					// Otherwise nodes in our document sort first
					ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
				};

				return document;
			};

			Sizzle.matches = function (expr, elements) {
				return Sizzle(expr, null, null, elements);
			};

			Sizzle.matchesSelector = function (elem, expr) {
				// Set document vars if needed
				if ((elem.ownerDocument || elem) !== document) {
					setDocument(elem);
				}

				// Make sure that attribute selectors are quoted
				expr = expr.replace(rattributeQuotes, "='$1']");

				if (support.matchesSelector && documentIsHTML && !compilerCache[expr + " "] && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {

					try {
						var ret = matches.call(elem, expr);

						// IE 9's matchesSelector returns false on disconnected nodes
						if (ret || support.disconnectedMatch ||
						// As well, disconnected nodes are said to be in a document
						// fragment in IE 9
						elem.document && elem.document.nodeType !== 11) {
							return ret;
						}
					} catch (e) {}
				}

				return Sizzle(expr, document, null, [elem]).length > 0;
			};

			Sizzle.contains = function (context, elem) {
				// Set document vars if needed
				if ((context.ownerDocument || context) !== document) {
					setDocument(context);
				}
				return contains(context, elem);
			};

			Sizzle.attr = function (elem, name) {
				// Set document vars if needed
				if ((elem.ownerDocument || elem) !== document) {
					setDocument(elem);
				}

				var fn = Expr.attrHandle[name.toLowerCase()],

				// Don't get fooled by Object.prototype properties (jQuery #13807)
				val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;

				return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
			};

			Sizzle.escape = function (sel) {
				return (sel + "").replace(rcssescape, fcssescape);
			};

			Sizzle.error = function (msg) {
				throw new Error("Syntax error, unrecognized expression: " + msg);
			};

			/**
	   * Document sorting and removing duplicates
	   * @param {ArrayLike} results
	   */
			Sizzle.uniqueSort = function (results) {
				var elem,
				    duplicates = [],
				    j = 0,
				    i = 0;

				// Unless we *know* we can detect duplicates, assume their presence
				hasDuplicate = !support.detectDuplicates;
				sortInput = !support.sortStable && results.slice(0);
				results.sort(sortOrder);

				if (hasDuplicate) {
					while (elem = results[i++]) {
						if (elem === results[i]) {
							j = duplicates.push(i);
						}
					}
					while (j--) {
						results.splice(duplicates[j], 1);
					}
				}

				// Clear input after sorting to release objects
				// See https://github.com/jquery/sizzle/pull/225
				sortInput = null;

				return results;
			};

			/**
	   * Utility function for retrieving the text value of an array of DOM nodes
	   * @param {Array|Element} elem
	   */
			getText = Sizzle.getText = function (elem) {
				var node,
				    ret = "",
				    i = 0,
				    nodeType = elem.nodeType;

				if (!nodeType) {
					// If no nodeType, this is expected to be an array
					while (node = elem[i++]) {
						// Do not traverse comment nodes
						ret += getText(node);
					}
				} else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
					// Use textContent for elements
					// innerText usage removed for consistency of new lines (jQuery #11153)
					if (typeof elem.textContent === "string") {
						return elem.textContent;
					} else {
						// Traverse its children
						for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
							ret += getText(elem);
						}
					}
				} else if (nodeType === 3 || nodeType === 4) {
					return elem.nodeValue;
				}
				// Do not include comment or processing instruction nodes

				return ret;
			};

			Expr = Sizzle.selectors = {

				// Can be adjusted by the user
				cacheLength: 50,

				createPseudo: markFunction,

				match: matchExpr,

				attrHandle: {},

				find: {},

				relative: {
					">": { dir: "parentNode", first: true },
					" ": { dir: "parentNode" },
					"+": { dir: "previousSibling", first: true },
					"~": { dir: "previousSibling" }
				},

				preFilter: {
					"ATTR": function ATTR(match) {
						match[1] = match[1].replace(runescape, funescape);

						// Move the given value to match[3] whether quoted or unquoted
						match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);

						if (match[2] === "~=") {
							match[3] = " " + match[3] + " ";
						}

						return match.slice(0, 4);
					},

					"CHILD": function CHILD(match) {
						/* matches from matchExpr["CHILD"]
	     	1 type (only|nth|...)
	     	2 what (child|of-type)
	     	3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
	     	4 xn-component of xn+y argument ([+-]?\d*n|)
	     	5 sign of xn-component
	     	6 x of xn-component
	     	7 sign of y-component
	     	8 y of y-component
	     */
						match[1] = match[1].toLowerCase();

						if (match[1].slice(0, 3) === "nth") {
							// nth-* requires argument
							if (!match[3]) {
								Sizzle.error(match[0]);
							}

							// numeric x and y parameters for Expr.filter.CHILD
							// remember that false/true cast respectively to 0/1
							match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
							match[5] = +(match[7] + match[8] || match[3] === "odd");

							// other types prohibit arguments
						} else if (match[3]) {
							Sizzle.error(match[0]);
						}

						return match;
					},

					"PSEUDO": function PSEUDO(match) {
						var excess,
						    unquoted = !match[6] && match[2];

						if (matchExpr["CHILD"].test(match[0])) {
							return null;
						}

						// Accept quoted arguments as-is
						if (match[3]) {
							match[2] = match[4] || match[5] || "";

							// Strip excess characters from unquoted arguments
						} else if (unquoted && rpseudo.test(unquoted) && (
						// Get excess from tokenize (recursively)
						excess = tokenize(unquoted, true)) && (
						// advance to the next closing parenthesis
						excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {

							// excess is a negative index
							match[0] = match[0].slice(0, excess);
							match[2] = unquoted.slice(0, excess);
						}

						// Return only captures needed by the pseudo filter method (type and argument)
						return match.slice(0, 3);
					}
				},

				filter: {

					"TAG": function TAG(nodeNameSelector) {
						var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
						return nodeNameSelector === "*" ? function () {
							return true;
						} : function (elem) {
							return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
						};
					},

					"CLASS": function CLASS(className) {
						var pattern = classCache[className + " "];

						return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function (elem) {
							return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
						});
					},

					"ATTR": function ATTR(name, operator, check) {
						return function (elem) {
							var result = Sizzle.attr(elem, name);

							if (result == null) {
								return operator === "!=";
							}
							if (!operator) {
								return true;
							}

							result += "";

							return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
						};
					},

					"CHILD": function CHILD(type, what, argument, first, last) {
						var simple = type.slice(0, 3) !== "nth",
						    forward = type.slice(-4) !== "last",
						    ofType = what === "of-type";

						return first === 1 && last === 0 ?

						// Shortcut for :nth-*(n)
						function (elem) {
							return !!elem.parentNode;
						} : function (elem, context, xml) {
							var cache,
							    uniqueCache,
							    outerCache,
							    node,
							    nodeIndex,
							    start,
							    dir = simple !== forward ? "nextSibling" : "previousSibling",
							    parent = elem.parentNode,
							    name = ofType && elem.nodeName.toLowerCase(),
							    useCache = !xml && !ofType,
							    diff = false;

							if (parent) {

								// :(first|last|only)-(child|of-type)
								if (simple) {
									while (dir) {
										node = elem;
										while (node = node[dir]) {
											if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {

												return false;
											}
										}
										// Reverse direction for :only-* (if we haven't yet done so)
										start = dir = type === "only" && !start && "nextSibling";
									}
									return true;
								}

								start = [forward ? parent.firstChild : parent.lastChild];

								// non-xml :nth-child(...) stores cache data on `parent`
								if (forward && useCache) {

									// Seek `elem` from a previously-cached index

									// ...in a gzip-friendly way
									node = parent;
									outerCache = node[expando] || (node[expando] = {});

									// Support: IE <9 only
									// Defend against cloned attroperties (jQuery gh-1709)
									uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

									cache = uniqueCache[type] || [];
									nodeIndex = cache[0] === dirruns && cache[1];
									diff = nodeIndex && cache[2];
									node = nodeIndex && parent.childNodes[nodeIndex];

									while (node = ++nodeIndex && node && node[dir] || (

									// Fallback to seeking `elem` from the start
									diff = nodeIndex = 0) || start.pop()) {

										// When found, cache indexes on `parent` and break
										if (node.nodeType === 1 && ++diff && node === elem) {
											uniqueCache[type] = [dirruns, nodeIndex, diff];
											break;
										}
									}
								} else {
									// Use previously-cached element index if available
									if (useCache) {
										// ...in a gzip-friendly way
										node = elem;
										outerCache = node[expando] || (node[expando] = {});

										// Support: IE <9 only
										// Defend against cloned attroperties (jQuery gh-1709)
										uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

										cache = uniqueCache[type] || [];
										nodeIndex = cache[0] === dirruns && cache[1];
										diff = nodeIndex;
									}

									// xml :nth-child(...)
									// or :nth-last-child(...) or :nth(-last)?-of-type(...)
									if (diff === false) {
										// Use the same loop as above to seek `elem` from the start
										while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {

											if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {

												// Cache the index of each encountered element
												if (useCache) {
													outerCache = node[expando] || (node[expando] = {});

													// Support: IE <9 only
													// Defend against cloned attroperties (jQuery gh-1709)
													uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});

													uniqueCache[type] = [dirruns, diff];
												}

												if (node === elem) {
													break;
												}
											}
										}
									}
								}

								// Incorporate the offset, then check against cycle size
								diff -= last;
								return diff === first || diff % first === 0 && diff / first >= 0;
							}
						};
					},

					"PSEUDO": function PSEUDO(pseudo, argument) {
						// pseudo-class names are case-insensitive
						// http://www.w3.org/TR/selectors/#pseudo-classes
						// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
						// Remember that setFilters inherits from pseudos
						var args,
						    fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);

						// The user may use createPseudo to indicate that
						// arguments are needed to create the filter function
						// just as Sizzle does
						if (fn[expando]) {
							return fn(argument);
						}

						// But maintain support for old signatures
						if (fn.length > 1) {
							args = [pseudo, pseudo, "", argument];
							return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function (seed, matches) {
								var idx,
								    matched = fn(seed, argument),
								    i = matched.length;
								while (i--) {
									idx = indexOf(seed, matched[i]);
									seed[idx] = !(matches[idx] = matched[i]);
								}
							}) : function (elem) {
								return fn(elem, 0, args);
							};
						}

						return fn;
					}
				},

				pseudos: {
					// Potentially complex pseudos
					"not": markFunction(function (selector) {
						// Trim the selector passed to compile
						// to avoid treating leading and trailing
						// spaces as combinators
						var input = [],
						    results = [],
						    matcher = compile(selector.replace(rtrim, "$1"));

						return matcher[expando] ? markFunction(function (seed, matches, context, xml) {
							var elem,
							    unmatched = matcher(seed, null, xml, []),
							    i = seed.length;

							// Match elements unmatched by `matcher`
							while (i--) {
								if (elem = unmatched[i]) {
									seed[i] = !(matches[i] = elem);
								}
							}
						}) : function (elem, context, xml) {
							input[0] = elem;
							matcher(input, null, xml, results);
							// Don't keep the element (issue #299)
							input[0] = null;
							return !results.pop();
						};
					}),

					"has": markFunction(function (selector) {
						return function (elem) {
							return Sizzle(selector, elem).length > 0;
						};
					}),

					"contains": markFunction(function (text) {
						text = text.replace(runescape, funescape);
						return function (elem) {
							return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
						};
					}),

					// "Whether an element is represented by a :lang() selector
					// is based solely on the element's language value
					// being equal to the identifier C,
					// or beginning with the identifier C immediately followed by "-".
					// The matching of C against the element's language value is performed case-insensitively.
					// The identifier C does not have to be a valid language name."
					// http://www.w3.org/TR/selectors/#lang-pseudo
					"lang": markFunction(function (lang) {
						// lang value must be a valid identifier
						if (!ridentifier.test(lang || "")) {
							Sizzle.error("unsupported lang: " + lang);
						}
						lang = lang.replace(runescape, funescape).toLowerCase();
						return function (elem) {
							var elemLang;
							do {
								if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang")) {

									elemLang = elemLang.toLowerCase();
									return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
								}
							} while ((elem = elem.parentNode) && elem.nodeType === 1);
							return false;
						};
					}),

					// Miscellaneous
					"target": function target(elem) {
						var hash = window.location && window.location.hash;
						return hash && hash.slice(1) === elem.id;
					},

					"root": function root(elem) {
						return elem === docElem;
					},

					"focus": function focus(elem) {
						return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
					},

					// Boolean properties
					"enabled": createDisabledPseudo(false),
					"disabled": createDisabledPseudo(true),

					"checked": function checked(elem) {
						// In CSS3, :checked should return both checked and selected elements
						// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
						var nodeName = elem.nodeName.toLowerCase();
						return nodeName === "input" && !!elem.checked || nodeName === "option" && !!elem.selected;
					},

					"selected": function selected(elem) {
						// Accessing this property makes selected-by-default
						// options in Safari work properly
						if (elem.parentNode) {
							elem.parentNode.selectedIndex;
						}

						return elem.selected === true;
					},

					// Contents
					"empty": function empty(elem) {
						// http://www.w3.org/TR/selectors/#empty-pseudo
						// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
						//   but not by others (comment: 8; processing instruction: 7; etc.)
						// nodeType < 6 works because attributes (2) do not appear as children
						for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
							if (elem.nodeType < 6) {
								return false;
							}
						}
						return true;
					},

					"parent": function parent(elem) {
						return !Expr.pseudos["empty"](elem);
					},

					// Element/input types
					"header": function header(elem) {
						return rheader.test(elem.nodeName);
					},

					"input": function input(elem) {
						return rinputs.test(elem.nodeName);
					},

					"button": function button(elem) {
						var name = elem.nodeName.toLowerCase();
						return name === "input" && elem.type === "button" || name === "button";
					},

					"text": function text(elem) {
						var attr;
						return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && (

						// Support: IE<8
						// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
						(attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
					},

					// Position-in-collection
					"first": createPositionalPseudo(function () {
						return [0];
					}),

					"last": createPositionalPseudo(function (matchIndexes, length) {
						return [length - 1];
					}),

					"eq": createPositionalPseudo(function (matchIndexes, length, argument) {
						return [argument < 0 ? argument + length : argument];
					}),

					"even": createPositionalPseudo(function (matchIndexes, length) {
						var i = 0;
						for (; i < length; i += 2) {
							matchIndexes.push(i);
						}
						return matchIndexes;
					}),

					"odd": createPositionalPseudo(function (matchIndexes, length) {
						var i = 1;
						for (; i < length; i += 2) {
							matchIndexes.push(i);
						}
						return matchIndexes;
					}),

					"lt": createPositionalPseudo(function (matchIndexes, length, argument) {
						var i = argument < 0 ? argument + length : argument;
						for (; --i >= 0;) {
							matchIndexes.push(i);
						}
						return matchIndexes;
					}),

					"gt": createPositionalPseudo(function (matchIndexes, length, argument) {
						var i = argument < 0 ? argument + length : argument;
						for (; ++i < length;) {
							matchIndexes.push(i);
						}
						return matchIndexes;
					})
				}
			};

			Expr.pseudos["nth"] = Expr.pseudos["eq"];

			// Add button/input type pseudos
			for (i in { radio: true, checkbox: true, file: true, password: true, image: true }) {
				Expr.pseudos[i] = createInputPseudo(i);
			}
			for (i in { submit: true, reset: true }) {
				Expr.pseudos[i] = createButtonPseudo(i);
			}

			// Easy API for creating new setFilters
			function setFilters() {}
			setFilters.prototype = Expr.filters = Expr.pseudos;
			Expr.setFilters = new setFilters();

			tokenize = Sizzle.tokenize = function (selector, parseOnly) {
				var matched,
				    match,
				    tokens,
				    type,
				    soFar,
				    groups,
				    preFilters,
				    cached = tokenCache[selector + " "];

				if (cached) {
					return parseOnly ? 0 : cached.slice(0);
				}

				soFar = selector;
				groups = [];
				preFilters = Expr.preFilter;

				while (soFar) {

					// Comma and first run
					if (!matched || (match = rcomma.exec(soFar))) {
						if (match) {
							// Don't consume trailing commas as valid
							soFar = soFar.slice(match[0].length) || soFar;
						}
						groups.push(tokens = []);
					}

					matched = false;

					// Combinators
					if (match = rcombinators.exec(soFar)) {
						matched = match.shift();
						tokens.push({
							value: matched,
							// Cast descendant combinators to space
							type: match[0].replace(rtrim, " ")
						});
						soFar = soFar.slice(matched.length);
					}

					// Filters
					for (type in Expr.filter) {
						if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
							matched = match.shift();
							tokens.push({
								value: matched,
								type: type,
								matches: match
							});
							soFar = soFar.slice(matched.length);
						}
					}

					if (!matched) {
						break;
					}
				}

				// Return the length of the invalid excess
				// if we're just parsing
				// Otherwise, throw an error or return tokens
				return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) :
				// Cache the tokens
				tokenCache(selector, groups).slice(0);
			};

			function toSelector(tokens) {
				var i = 0,
				    len = tokens.length,
				    selector = "";
				for (; i < len; i++) {
					selector += tokens[i].value;
				}
				return selector;
			}

			function addCombinator(matcher, combinator, base) {
				var dir = combinator.dir,
				    skip = combinator.next,
				    key = skip || dir,
				    checkNonElements = base && key === "parentNode",
				    doneName = done++;

				return combinator.first ?
				// Check against closest ancestor/preceding element
				function (elem, context, xml) {
					while (elem = elem[dir]) {
						if (elem.nodeType === 1 || checkNonElements) {
							return matcher(elem, context, xml);
						}
					}
					return false;
				} :

				// Check against all ancestor/preceding elements
				function (elem, context, xml) {
					var oldCache,
					    uniqueCache,
					    outerCache,
					    newCache = [dirruns, doneName];

					// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
					if (xml) {
						while (elem = elem[dir]) {
							if (elem.nodeType === 1 || checkNonElements) {
								if (matcher(elem, context, xml)) {
									return true;
								}
							}
						}
					} else {
						while (elem = elem[dir]) {
							if (elem.nodeType === 1 || checkNonElements) {
								outerCache = elem[expando] || (elem[expando] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[elem.uniqueID] || (outerCache[elem.uniqueID] = {});

								if (skip && skip === elem.nodeName.toLowerCase()) {
									elem = elem[dir] || elem;
								} else if ((oldCache = uniqueCache[key]) && oldCache[0] === dirruns && oldCache[1] === doneName) {

									// Assign to newCache so results back-propagate to previous elements
									return newCache[2] = oldCache[2];
								} else {
									// Reuse newcache so results back-propagate to previous elements
									uniqueCache[key] = newCache;

									// A match means we're done; a fail means we have to keep checking
									if (newCache[2] = matcher(elem, context, xml)) {
										return true;
									}
								}
							}
						}
					}
					return false;
				};
			}

			function elementMatcher(matchers) {
				return matchers.length > 1 ? function (elem, context, xml) {
					var i = matchers.length;
					while (i--) {
						if (!matchers[i](elem, context, xml)) {
							return false;
						}
					}
					return true;
				} : matchers[0];
			}

			function multipleContexts(selector, contexts, results) {
				var i = 0,
				    len = contexts.length;
				for (; i < len; i++) {
					Sizzle(selector, contexts[i], results);
				}
				return results;
			}

			function condense(unmatched, map, filter, context, xml) {
				var elem,
				    newUnmatched = [],
				    i = 0,
				    len = unmatched.length,
				    mapped = map != null;

				for (; i < len; i++) {
					if (elem = unmatched[i]) {
						if (!filter || filter(elem, context, xml)) {
							newUnmatched.push(elem);
							if (mapped) {
								map.push(i);
							}
						}
					}
				}

				return newUnmatched;
			}

			function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
				if (postFilter && !postFilter[expando]) {
					postFilter = setMatcher(postFilter);
				}
				if (postFinder && !postFinder[expando]) {
					postFinder = setMatcher(postFinder, postSelector);
				}
				return markFunction(function (seed, results, context, xml) {
					var temp,
					    i,
					    elem,
					    preMap = [],
					    postMap = [],
					    preexisting = results.length,


					// Get initial elements from seed or context
					elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),


					// Prefilter to get matcher input, preserving a map for seed-results synchronization
					matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
					    matcherOut = matcher ?
					// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
					postFinder || (seed ? preFilter : preexisting || postFilter) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results : matcherIn;

					// Find primary matches
					if (matcher) {
						matcher(matcherIn, matcherOut, context, xml);
					}

					// Apply postFilter
					if (postFilter) {
						temp = condense(matcherOut, postMap);
						postFilter(temp, [], context, xml);

						// Un-match failing elements by moving them back to matcherIn
						i = temp.length;
						while (i--) {
							if (elem = temp[i]) {
								matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
							}
						}
					}

					if (seed) {
						if (postFinder || preFilter) {
							if (postFinder) {
								// Get the final matcherOut by condensing this intermediate into postFinder contexts
								temp = [];
								i = matcherOut.length;
								while (i--) {
									if (elem = matcherOut[i]) {
										// Restore matcherIn since elem is not yet a final match
										temp.push(matcherIn[i] = elem);
									}
								}
								postFinder(null, matcherOut = [], temp, xml);
							}

							// Move matched elements from seed to results to keep them synchronized
							i = matcherOut.length;
							while (i--) {
								if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {

									seed[temp] = !(results[temp] = elem);
								}
							}
						}

						// Add elements to results, through postFinder if defined
					} else {
						matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
						if (postFinder) {
							postFinder(null, results, matcherOut, xml);
						} else {
							push.apply(results, matcherOut);
						}
					}
				});
			}

			function matcherFromTokens(tokens) {
				var checkContext,
				    matcher,
				    j,
				    len = tokens.length,
				    leadingRelative = Expr.relative[tokens[0].type],
				    implicitRelative = leadingRelative || Expr.relative[" "],
				    i = leadingRelative ? 1 : 0,


				// The foundational matcher ensures that elements are reachable from top-level context(s)
				matchContext = addCombinator(function (elem) {
					return elem === checkContext;
				}, implicitRelative, true),
				    matchAnyContext = addCombinator(function (elem) {
					return indexOf(checkContext, elem) > -1;
				}, implicitRelative, true),
				    matchers = [function (elem, context, xml) {
					var ret = !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
					// Avoid hanging onto element (issue #299)
					checkContext = null;
					return ret;
				}];

				for (; i < len; i++) {
					if (matcher = Expr.relative[tokens[i].type]) {
						matchers = [addCombinator(elementMatcher(matchers), matcher)];
					} else {
						matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);

						// Return special upon seeing a positional matcher
						if (matcher[expando]) {
							// Find the next relative operator (if any) for proper handling
							j = ++i;
							for (; j < len; j++) {
								if (Expr.relative[tokens[j].type]) {
									break;
								}
							}
							return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(
							// If the preceding token was a descendant combinator, insert an implicit any-element `*`
							tokens.slice(0, i - 1).concat({ value: tokens[i - 2].type === " " ? "*" : "" })).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens(tokens = tokens.slice(j)), j < len && toSelector(tokens));
						}
						matchers.push(matcher);
					}
				}

				return elementMatcher(matchers);
			}

			function matcherFromGroupMatchers(elementMatchers, setMatchers) {
				var bySet = setMatchers.length > 0,
				    byElement = elementMatchers.length > 0,
				    superMatcher = function superMatcher(seed, context, xml, results, outermost) {
					var elem,
					    j,
					    matcher,
					    matchedCount = 0,
					    i = "0",
					    unmatched = seed && [],
					    setMatched = [],
					    contextBackup = outermostContext,

					// We must always have either seed elements or outermost context
					elems = seed || byElement && Expr.find["TAG"]("*", outermost),

					// Use integer dirruns iff this is the outermost matcher
					dirrunsUnique = dirruns += contextBackup == null ? 1 : Math.random() || 0.1,
					    len = elems.length;

					if (outermost) {
						outermostContext = context === document || context || outermost;
					}

					// Add elements passing elementMatchers directly to results
					// Support: IE<9, Safari
					// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
					for (; i !== len && (elem = elems[i]) != null; i++) {
						if (byElement && elem) {
							j = 0;
							if (!context && elem.ownerDocument !== document) {
								setDocument(elem);
								xml = !documentIsHTML;
							}
							while (matcher = elementMatchers[j++]) {
								if (matcher(elem, context || document, xml)) {
									results.push(elem);
									break;
								}
							}
							if (outermost) {
								dirruns = dirrunsUnique;
							}
						}

						// Track unmatched elements for set filters
						if (bySet) {
							// They will have gone through all possible matchers
							if (elem = !matcher && elem) {
								matchedCount--;
							}

							// Lengthen the array for every element, matched or not
							if (seed) {
								unmatched.push(elem);
							}
						}
					}

					// `i` is now the count of elements visited above, and adding it to `matchedCount`
					// makes the latter nonnegative.
					matchedCount += i;

					// Apply set filters to unmatched elements
					// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
					// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
					// no element matchers and no seed.
					// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
					// case, which will result in a "00" `matchedCount` that differs from `i` but is also
					// numerically zero.
					if (bySet && i !== matchedCount) {
						j = 0;
						while (matcher = setMatchers[j++]) {
							matcher(unmatched, setMatched, context, xml);
						}

						if (seed) {
							// Reintegrate element matches to eliminate the need for sorting
							if (matchedCount > 0) {
								while (i--) {
									if (!(unmatched[i] || setMatched[i])) {
										setMatched[i] = pop.call(results);
									}
								}
							}

							// Discard index placeholder values to get only actual matches
							setMatched = condense(setMatched);
						}

						// Add matches to results
						push.apply(results, setMatched);

						// Seedless set matches succeeding multiple successful matchers stipulate sorting
						if (outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1) {

							Sizzle.uniqueSort(results);
						}
					}

					// Override manipulation of globals by nested matchers
					if (outermost) {
						dirruns = dirrunsUnique;
						outermostContext = contextBackup;
					}

					return unmatched;
				};

				return bySet ? markFunction(superMatcher) : superMatcher;
			}

			compile = Sizzle.compile = function (selector, match /* Internal Use Only */) {
				var i,
				    setMatchers = [],
				    elementMatchers = [],
				    cached = compilerCache[selector + " "];

				if (!cached) {
					// Generate a function of recursive functions that can be used to check each element
					if (!match) {
						match = tokenize(selector);
					}
					i = match.length;
					while (i--) {
						cached = matcherFromTokens(match[i]);
						if (cached[expando]) {
							setMatchers.push(cached);
						} else {
							elementMatchers.push(cached);
						}
					}

					// Cache the compiled function
					cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));

					// Save selector and tokenization
					cached.selector = selector;
				}
				return cached;
			};

			/**
	   * A low-level selection function that works with Sizzle's compiled
	   *  selector functions
	   * @param {String|Function} selector A selector or a pre-compiled
	   *  selector function built with Sizzle.compile
	   * @param {Element} context
	   * @param {Array} [results]
	   * @param {Array} [seed] A set of elements to match against
	   */
			select = Sizzle.select = function (selector, context, results, seed) {
				var i,
				    tokens,
				    token,
				    type,
				    find,
				    compiled = typeof selector === "function" && selector,
				    match = !seed && tokenize(selector = compiled.selector || selector);

				results = results || [];

				// Try to minimize operations if there is only one selector in the list and no seed
				// (the latter of which guarantees us context)
				if (match.length === 1) {

					// Reduce context if the leading compound selector is an ID
					tokens = match[0] = match[0].slice(0);
					if (tokens.length > 2 && (token = tokens[0]).type === "ID" && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {

						context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
						if (!context) {
							return results;

							// Precompiled matchers will still verify ancestry, so step up a level
						} else if (compiled) {
							context = context.parentNode;
						}

						selector = selector.slice(tokens.shift().value.length);
					}

					// Fetch a seed set for right-to-left matching
					i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
					while (i--) {
						token = tokens[i];

						// Abort if we hit a combinator
						if (Expr.relative[type = token.type]) {
							break;
						}
						if (find = Expr.find[type]) {
							// Search, expanding context for leading sibling combinators
							if (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context)) {

								// If seed is empty or no tokens remain, we can return early
								tokens.splice(i, 1);
								selector = seed.length && toSelector(tokens);
								if (!selector) {
									push.apply(results, seed);
									return results;
								}

								break;
							}
						}
					}
				}

				// Compile and execute a filtering function if one is not provided
				// Provide `match` to avoid retokenization if we modified the selector above
				(compiled || compile(selector, match))(seed, context, !documentIsHTML, results, !context || rsibling.test(selector) && testContext(context.parentNode) || context);
				return results;
			};

			// One-time assignments

			// Sort stability
			support.sortStable = expando.split("").sort(sortOrder).join("") === expando;

			// Support: Chrome 14-35+
			// Always assume duplicates if they aren't passed to the comparison function
			support.detectDuplicates = !!hasDuplicate;

			// Initialize against the default document
			setDocument();

			// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
			// Detached nodes confoundingly follow *each other*
			support.sortDetached = assert(function (el) {
				// Should return 1, but returns 4 (following)
				return el.compareDocumentPosition(document.createElement("fieldset")) & 1;
			});

			// Support: IE<8
			// Prevent attribute/property "interpolation"
			// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
			if (!assert(function (el) {
				el.innerHTML = "<a href='#'></a>";
				return el.firstChild.getAttribute("href") === "#";
			})) {
				addHandle("type|href|height|width", function (elem, name, isXML) {
					if (!isXML) {
						return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
					}
				});
			}

			// Support: IE<9
			// Use defaultValue in place of getAttribute("value")
			if (!support.attributes || !assert(function (el) {
				el.innerHTML = "<input/>";
				el.firstChild.setAttribute("value", "");
				return el.firstChild.getAttribute("value") === "";
			})) {
				addHandle("value", function (elem, name, isXML) {
					if (!isXML && elem.nodeName.toLowerCase() === "input") {
						return elem.defaultValue;
					}
				});
			}

			// Support: IE<9
			// Use getAttributeNode to fetch booleans when getAttribute lies
			if (!assert(function (el) {
				return el.getAttribute("disabled") == null;
			})) {
				addHandle(booleans, function (elem, name, isXML) {
					var val;
					if (!isXML) {
						return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
					}
				});
			}

			return Sizzle;
		}(window);

		jQuery.find = Sizzle;
		jQuery.expr = Sizzle.selectors;

		// Deprecated
		jQuery.expr[":"] = jQuery.expr.pseudos;
		jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
		jQuery.text = Sizzle.getText;
		jQuery.isXMLDoc = Sizzle.isXML;
		jQuery.contains = Sizzle.contains;
		jQuery.escapeSelector = Sizzle.escape;

		var dir = function dir(elem, _dir, until) {
			var matched = [],
			    truncate = until !== undefined;

			while ((elem = elem[_dir]) && elem.nodeType !== 9) {
				if (elem.nodeType === 1) {
					if (truncate && jQuery(elem).is(until)) {
						break;
					}
					matched.push(elem);
				}
			}
			return matched;
		};

		var _siblings = function _siblings(n, elem) {
			var matched = [];

			for (; n; n = n.nextSibling) {
				if (n.nodeType === 1 && n !== elem) {
					matched.push(n);
				}
			}

			return matched;
		};

		var rneedsContext = jQuery.expr.match.needsContext;

		function nodeName(elem, name) {

			return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
		};
		var rsingleTag = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;

		var risSimple = /^.[^:#\[\.,]*$/;

		// Implement the identical functionality for filter and not
		function winnow(elements, qualifier, not) {
			if (jQuery.isFunction(qualifier)) {
				return jQuery.grep(elements, function (elem, i) {
					return !!qualifier.call(elem, i, elem) !== not;
				});
			}

			// Single element
			if (qualifier.nodeType) {
				return jQuery.grep(elements, function (elem) {
					return elem === qualifier !== not;
				});
			}

			// Arraylike of elements (jQuery, arguments, Array)
			if (typeof qualifier !== "string") {
				return jQuery.grep(elements, function (elem) {
					return indexOf.call(qualifier, elem) > -1 !== not;
				});
			}

			// Simple selector that can be filtered directly, removing non-Elements
			if (risSimple.test(qualifier)) {
				return jQuery.filter(qualifier, elements, not);
			}

			// Complex selector, compare the two sets, removing non-Elements
			qualifier = jQuery.filter(qualifier, elements);
			return jQuery.grep(elements, function (elem) {
				return indexOf.call(qualifier, elem) > -1 !== not && elem.nodeType === 1;
			});
		}

		jQuery.filter = function (expr, elems, not) {
			var elem = elems[0];

			if (not) {
				expr = ":not(" + expr + ")";
			}

			if (elems.length === 1 && elem.nodeType === 1) {
				return jQuery.find.matchesSelector(elem, expr) ? [elem] : [];
			}

			return jQuery.find.matches(expr, jQuery.grep(elems, function (elem) {
				return elem.nodeType === 1;
			}));
		};

		jQuery.fn.extend({
			find: function find(selector) {
				var i,
				    ret,
				    len = this.length,
				    self = this;

				if (typeof selector !== "string") {
					return this.pushStack(jQuery(selector).filter(function () {
						for (i = 0; i < len; i++) {
							if (jQuery.contains(self[i], this)) {
								return true;
							}
						}
					}));
				}

				ret = this.pushStack([]);

				for (i = 0; i < len; i++) {
					jQuery.find(selector, self[i], ret);
				}

				return len > 1 ? jQuery.uniqueSort(ret) : ret;
			},
			filter: function filter(selector) {
				return this.pushStack(winnow(this, selector || [], false));
			},
			not: function not(selector) {
				return this.pushStack(winnow(this, selector || [], true));
			},
			is: function is(selector) {
				return !!winnow(this,

				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
			}
		});

		// Initialize a jQuery object


		// A central reference to the root jQuery(document)
		var rootjQuery,


		// A simple way to check for HTML strings
		// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
		// Strict HTML recognition (#11290: must start with <)
		// Shortcut simple #id case for speed
		rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,
		    init = jQuery.fn.init = function (selector, context, root) {
			var match, elem;

			// HANDLE: $(""), $(null), $(undefined), $(false)
			if (!selector) {
				return this;
			}

			// Method init() accepts an alternate rootjQuery
			// so migrate can support jQuery.sub (gh-2101)
			root = root || rootjQuery;

			// Handle HTML strings
			if (typeof selector === "string") {
				if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {

					// Assume that strings that start and end with <> are HTML and skip the regex check
					match = [null, selector, null];
				} else {
					match = rquickExpr.exec(selector);
				}

				// Match html or make sure no context is specified for #id
				if (match && (match[1] || !context)) {

					// HANDLE: $(html) -> $(array)
					if (match[1]) {
						context = context instanceof jQuery ? context[0] : context;

						// Option to run scripts is true for back-compat
						// Intentionally let the error be thrown if parseHTML is not present
						jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));

						// HANDLE: $(html, props)
						if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
							for (match in context) {

								// Properties of context are called as methods if possible
								if (jQuery.isFunction(this[match])) {
									this[match](context[match]);

									// ...and otherwise set as attributes
								} else {
									this.attr(match, context[match]);
								}
							}
						}

						return this;

						// HANDLE: $(#id)
					} else {
						elem = document.getElementById(match[2]);

						if (elem) {

							// Inject the element directly into the jQuery object
							this[0] = elem;
							this.length = 1;
						}
						return this;
					}

					// HANDLE: $(expr, $(...))
				} else if (!context || context.jquery) {
					return (context || root).find(selector);

					// HANDLE: $(expr, context)
					// (which is just equivalent to: $(context).find(expr)
				} else {
					return this.constructor(context).find(selector);
				}

				// HANDLE: $(DOMElement)
			} else if (selector.nodeType) {
				this[0] = selector;
				this.length = 1;
				return this;

				// HANDLE: $(function)
				// Shortcut for document ready
			} else if (jQuery.isFunction(selector)) {
				return root.ready !== undefined ? root.ready(selector) :

				// Execute immediately if ready is not present
				selector(jQuery);
			}

			return jQuery.makeArray(selector, this);
		};

		// Give the init function the jQuery prototype for later instantiation
		init.prototype = jQuery.fn;

		// Initialize central reference
		rootjQuery = jQuery(document);

		var rparentsprev = /^(?:parents|prev(?:Until|All))/,


		// Methods guaranteed to produce a unique set when starting from a unique set
		guaranteedUnique = {
			children: true,
			contents: true,
			next: true,
			prev: true
		};

		jQuery.fn.extend({
			has: function has(target) {
				var targets = jQuery(target, this),
				    l = targets.length;

				return this.filter(function () {
					var i = 0;
					for (; i < l; i++) {
						if (jQuery.contains(this, targets[i])) {
							return true;
						}
					}
				});
			},

			closest: function closest(selectors, context) {
				var cur,
				    i = 0,
				    l = this.length,
				    matched = [],
				    targets = typeof selectors !== "string" && jQuery(selectors);

				// Positional selectors never match, since there's no _selection_ context
				if (!rneedsContext.test(selectors)) {
					for (; i < l; i++) {
						for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {

							// Always skip document fragments
							if (cur.nodeType < 11 && (targets ? targets.index(cur) > -1 :

							// Don't pass non-elements to Sizzle
							cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {

								matched.push(cur);
								break;
							}
						}
					}
				}

				return this.pushStack(matched.length > 1 ? jQuery.uniqueSort(matched) : matched);
			},

			// Determine the position of an element within the set
			index: function index(elem) {

				// No argument, return index in parent
				if (!elem) {
					return this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
				}

				// Index in selector
				if (typeof elem === "string") {
					return indexOf.call(jQuery(elem), this[0]);
				}

				// Locate the position of the desired element
				return indexOf.call(this,

				// If it receives a jQuery object, the first element is used
				elem.jquery ? elem[0] : elem);
			},

			add: function add(selector, context) {
				return this.pushStack(jQuery.uniqueSort(jQuery.merge(this.get(), jQuery(selector, context))));
			},

			addBack: function addBack(selector) {
				return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
			}
		});

		function sibling(cur, dir) {
			while ((cur = cur[dir]) && cur.nodeType !== 1) {}
			return cur;
		}

		jQuery.each({
			parent: function parent(elem) {
				var parent = elem.parentNode;
				return parent && parent.nodeType !== 11 ? parent : null;
			},
			parents: function parents(elem) {
				return dir(elem, "parentNode");
			},
			parentsUntil: function parentsUntil(elem, i, until) {
				return dir(elem, "parentNode", until);
			},
			next: function next(elem) {
				return sibling(elem, "nextSibling");
			},
			prev: function prev(elem) {
				return sibling(elem, "previousSibling");
			},
			nextAll: function nextAll(elem) {
				return dir(elem, "nextSibling");
			},
			prevAll: function prevAll(elem) {
				return dir(elem, "previousSibling");
			},
			nextUntil: function nextUntil(elem, i, until) {
				return dir(elem, "nextSibling", until);
			},
			prevUntil: function prevUntil(elem, i, until) {
				return dir(elem, "previousSibling", until);
			},
			siblings: function siblings(elem) {
				return _siblings((elem.parentNode || {}).firstChild, elem);
			},
			children: function children(elem) {
				return _siblings(elem.firstChild);
			},
			contents: function contents(elem) {
				if (nodeName(elem, "iframe")) {
					return elem.contentDocument;
				}

				// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
				// Treat the template element as a regular one in browsers that
				// don't support it.
				if (nodeName(elem, "template")) {
					elem = elem.content || elem;
				}

				return jQuery.merge([], elem.childNodes);
			}
		}, function (name, fn) {
			jQuery.fn[name] = function (until, selector) {
				var matched = jQuery.map(this, fn, until);

				if (name.slice(-5) !== "Until") {
					selector = until;
				}

				if (selector && typeof selector === "string") {
					matched = jQuery.filter(selector, matched);
				}

				if (this.length > 1) {

					// Remove duplicates
					if (!guaranteedUnique[name]) {
						jQuery.uniqueSort(matched);
					}

					// Reverse order for parents* and prev-derivatives
					if (rparentsprev.test(name)) {
						matched.reverse();
					}
				}

				return this.pushStack(matched);
			};
		});
		var rnothtmlwhite = /[^\x20\t\r\n\f]+/g;

		// Convert String-formatted options into Object-formatted ones
		function createOptions(options) {
			var object = {};
			jQuery.each(options.match(rnothtmlwhite) || [], function (_, flag) {
				object[flag] = true;
			});
			return object;
		}

		/*
	  * Create a callback list using the following parameters:
	  *
	  *	options: an optional list of space-separated options that will change how
	  *			the callback list behaves or a more traditional option object
	  *
	  * By default a callback list will act like an event callback list and can be
	  * "fired" multiple times.
	  *
	  * Possible options:
	  *
	  *	once:			will ensure the callback list can only be fired once (like a Deferred)
	  *
	  *	memory:			will keep track of previous values and will call any callback added
	  *					after the list has been fired right away with the latest "memorized"
	  *					values (like a Deferred)
	  *
	  *	unique:			will ensure a callback can only be added once (no duplicate in the list)
	  *
	  *	stopOnFalse:	interrupt callings when a callback returns false
	  *
	  */
		jQuery.Callbacks = function (options) {

			// Convert options from String-formatted to Object-formatted if needed
			// (we check in cache first)
			options = typeof options === "string" ? createOptions(options) : jQuery.extend({}, options);

			var // Flag to know if list is currently firing
			firing,


			// Last fire value for non-forgettable lists
			memory,


			// Flag to know if list was already fired
			_fired,


			// Flag to prevent firing
			_locked,


			// Actual callback list
			list = [],


			// Queue of execution data for repeatable lists
			queue = [],


			// Index of currently firing callback (modified by add/remove as needed)
			firingIndex = -1,


			// Fire callbacks
			fire = function fire() {

				// Enforce single-firing
				_locked = _locked || options.once;

				// Execute callbacks for all pending executions,
				// respecting firingIndex overrides and runtime changes
				_fired = firing = true;
				for (; queue.length; firingIndex = -1) {
					memory = queue.shift();
					while (++firingIndex < list.length) {

						// Run callback and check for early termination
						if (list[firingIndex].apply(memory[0], memory[1]) === false && options.stopOnFalse) {

							// Jump to end and forget the data so .add doesn't re-fire
							firingIndex = list.length;
							memory = false;
						}
					}
				}

				// Forget the data if we're done with it
				if (!options.memory) {
					memory = false;
				}

				firing = false;

				// Clean up if we're done firing for good
				if (_locked) {

					// Keep an empty list if we have data for future add calls
					if (memory) {
						list = [];

						// Otherwise, this object is spent
					} else {
						list = "";
					}
				}
			},


			// Actual Callbacks object
			self = {

				// Add a callback or a collection of callbacks to the list
				add: function add() {
					if (list) {

						// If we have memory from a past run, we should fire after adding
						if (memory && !firing) {
							firingIndex = list.length - 1;
							queue.push(memory);
						}

						(function add(args) {
							jQuery.each(args, function (_, arg) {
								if (jQuery.isFunction(arg)) {
									if (!options.unique || !self.has(arg)) {
										list.push(arg);
									}
								} else if (arg && arg.length && jQuery.type(arg) !== "string") {

									// Inspect recursively
									add(arg);
								}
							});
						})(arguments);

						if (memory && !firing) {
							fire();
						}
					}
					return this;
				},

				// Remove a callback from the list
				remove: function remove() {
					jQuery.each(arguments, function (_, arg) {
						var index;
						while ((index = jQuery.inArray(arg, list, index)) > -1) {
							list.splice(index, 1);

							// Handle firing indexes
							if (index <= firingIndex) {
								firingIndex--;
							}
						}
					});
					return this;
				},

				// Check if a given callback is in the list.
				// If no argument is given, return whether or not list has callbacks attached.
				has: function has(fn) {
					return fn ? jQuery.inArray(fn, list) > -1 : list.length > 0;
				},

				// Remove all callbacks from the list
				empty: function empty() {
					if (list) {
						list = [];
					}
					return this;
				},

				// Disable .fire and .add
				// Abort any current/pending executions
				// Clear all callbacks and values
				disable: function disable() {
					_locked = queue = [];
					list = memory = "";
					return this;
				},
				disabled: function disabled() {
					return !list;
				},

				// Disable .fire
				// Also disable .add unless we have memory (since it would have no effect)
				// Abort any pending executions
				lock: function lock() {
					_locked = queue = [];
					if (!memory && !firing) {
						list = memory = "";
					}
					return this;
				},
				locked: function locked() {
					return !!_locked;
				},

				// Call all callbacks with the given context and arguments
				fireWith: function fireWith(context, args) {
					if (!_locked) {
						args = args || [];
						args = [context, args.slice ? args.slice() : args];
						queue.push(args);
						if (!firing) {
							fire();
						}
					}
					return this;
				},

				// Call all the callbacks with the given arguments
				fire: function fire() {
					self.fireWith(this, arguments);
					return this;
				},

				// To know if the callbacks have already been called at least once
				fired: function fired() {
					return !!_fired;
				}
			};

			return self;
		};

		function Identity(v) {
			return v;
		}
		function Thrower(ex) {
			throw ex;
		}

		function adoptValue(value, resolve, reject, noValue) {
			var method;

			try {

				// Check for promise aspect first to privilege synchronous behavior
				if (value && jQuery.isFunction(method = value.promise)) {
					method.call(value).done(resolve).fail(reject);

					// Other thenables
				} else if (value && jQuery.isFunction(method = value.then)) {
					method.call(value, resolve, reject);

					// Other non-thenables
				} else {

					// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
					// * false: [ value ].slice( 0 ) => resolve( value )
					// * true: [ value ].slice( 1 ) => resolve()
					resolve.apply(undefined, [value].slice(noValue));
				}

				// For Promises/A+, convert exceptions into rejections
				// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
				// Deferred#then to conditionally suppress rejection.
			} catch (value) {

				// Support: Android 4.0 only
				// Strict mode functions invoked without .call/.apply get global-object context
				reject.apply(undefined, [value]);
			}
		}

		jQuery.extend({

			Deferred: function Deferred(func) {
				var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				["notify", "progress", jQuery.Callbacks("memory"), jQuery.Callbacks("memory"), 2], ["resolve", "done", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 0, "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 1, "rejected"]],
				    _state = "pending",
				    _promise = {
					state: function state() {
						return _state;
					},
					always: function always() {
						deferred.done(arguments).fail(arguments);
						return this;
					},
					"catch": function _catch(fn) {
						return _promise.then(null, fn);
					},

					// Keep pipe for back-compat
					pipe: function pipe() /* fnDone, fnFail, fnProgress */{
						var fns = arguments;

						return jQuery.Deferred(function (newDefer) {
							jQuery.each(tuples, function (i, tuple) {

								// Map tuples (progress, done, fail) to arguments (done, fail, progress)
								var fn = jQuery.isFunction(fns[tuple[4]]) && fns[tuple[4]];

								// deferred.progress(function() { bind to newDefer or newDefer.notify })
								// deferred.done(function() { bind to newDefer or newDefer.resolve })
								// deferred.fail(function() { bind to newDefer or newDefer.reject })
								deferred[tuple[1]](function () {
									var returned = fn && fn.apply(this, arguments);
									if (returned && jQuery.isFunction(returned.promise)) {
										returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer.reject);
									} else {
										newDefer[tuple[0] + "With"](this, fn ? [returned] : arguments);
									}
								});
							});
							fns = null;
						}).promise();
					},
					then: function then(onFulfilled, onRejected, onProgress) {
						var maxDepth = 0;
						function resolve(depth, deferred, handler, special) {
							return function () {
								var that = this,
								    args = arguments,
								    mightThrow = function mightThrow() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if (depth < maxDepth) {
										return;
									}

									returned = handler.apply(that, args);

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if (returned === deferred.promise()) {
										throw new TypeError("Thenable self-resolution");
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned && (

									// Support: Promises/A+ section 2.3.4
									// https://promisesaplus.com/#point-64
									// Only check objects and functions for thenability
									(typeof returned === "undefined" ? "undefined" : _typeof(returned)) === "object" || typeof returned === "function") && returned.then;

									// Handle a returned thenable
									if (jQuery.isFunction(then)) {

										// Special processors (notify) just wait for resolution
										if (special) {
											then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special));

											// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
										}

										// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if (handler !== Identity) {
											that = undefined;
											args = [returned];
										}

										// Process the value(s)
										// Default process is resolve
										(special || deferred.resolveWith)(that, args);
									}
								},


								// Only normal processors (resolve) catch and reject exceptions
								process = special ? mightThrow : function () {
									try {
										mightThrow();
									} catch (e) {

										if (jQuery.Deferred.exceptionHook) {
											jQuery.Deferred.exceptionHook(e, process.stackTrace);
										}

										// Support: Promises/A+ section 2.3.3.3.4.1
										// https://promisesaplus.com/#point-61
										// Ignore post-resolution exceptions
										if (depth + 1 >= maxDepth) {

											// Only substitute handlers pass on context
											// and multiple values (non-spec behavior)
											if (handler !== Thrower) {
												that = undefined;
												args = [e];
											}

											deferred.rejectWith(that, args);
										}
									}
								};

								// Support: Promises/A+ section 2.3.3.3.1
								// https://promisesaplus.com/#point-57
								// Re-resolve promises immediately to dodge false rejection from
								// subsequent errors
								if (depth) {
									process();
								} else {

									// Call an optional hook to record the stack, in case of exception
									// since it's otherwise lost when execution goes async
									if (jQuery.Deferred.getStackHook) {
										process.stackTrace = jQuery.Deferred.getStackHook();
									}
									window.setTimeout(process);
								}
							};
						}

						return jQuery.Deferred(function (newDefer) {

							// progress_handlers.add( ... )
							tuples[0][3].add(resolve(0, newDefer, jQuery.isFunction(onProgress) ? onProgress : Identity, newDefer.notifyWith));

							// fulfilled_handlers.add( ... )
							tuples[1][3].add(resolve(0, newDefer, jQuery.isFunction(onFulfilled) ? onFulfilled : Identity));

							// rejected_handlers.add( ... )
							tuples[2][3].add(resolve(0, newDefer, jQuery.isFunction(onRejected) ? onRejected : Thrower));
						}).promise();
					},

					// Get a promise for this deferred
					// If obj is provided, the promise aspect is added to the object
					promise: function promise(obj) {
						return obj != null ? jQuery.extend(obj, _promise) : _promise;
					}
				},
				    deferred = {};

				// Add list-specific methods
				jQuery.each(tuples, function (i, tuple) {
					var list = tuple[2],
					    stateString = tuple[5];

					// promise.progress = list.add
					// promise.done = list.add
					// promise.fail = list.add
					_promise[tuple[1]] = list.add;

					// Handle state
					if (stateString) {
						list.add(function () {

							// state = "resolved" (i.e., fulfilled)
							// state = "rejected"
							_state = stateString;
						},

						// rejected_callbacks.disable
						// fulfilled_callbacks.disable
						tuples[3 - i][2].disable,

						// progress_callbacks.lock
						tuples[0][2].lock);
					}

					// progress_handlers.fire
					// fulfilled_handlers.fire
					// rejected_handlers.fire
					list.add(tuple[3].fire);

					// deferred.notify = function() { deferred.notifyWith(...) }
					// deferred.resolve = function() { deferred.resolveWith(...) }
					// deferred.reject = function() { deferred.rejectWith(...) }
					deferred[tuple[0]] = function () {
						deferred[tuple[0] + "With"](this === deferred ? undefined : this, arguments);
						return this;
					};

					// deferred.notifyWith = list.fireWith
					// deferred.resolveWith = list.fireWith
					// deferred.rejectWith = list.fireWith
					deferred[tuple[0] + "With"] = list.fireWith;
				});

				// Make the deferred a promise
				_promise.promise(deferred);

				// Call given func if any
				if (func) {
					func.call(deferred, deferred);
				}

				// All done!
				return deferred;
			},

			// Deferred helper
			when: function when(singleValue) {
				var

				// count of uncompleted subordinates
				remaining = arguments.length,


				// count of unprocessed arguments
				i = remaining,


				// subordinate fulfillment data
				resolveContexts = Array(i),
				    resolveValues = _slice.call(arguments),


				// the master Deferred
				master = jQuery.Deferred(),


				// subordinate callback factory
				updateFunc = function updateFunc(i) {
					return function (value) {
						resolveContexts[i] = this;
						resolveValues[i] = arguments.length > 1 ? _slice.call(arguments) : value;
						if (! --remaining) {
							master.resolveWith(resolveContexts, resolveValues);
						}
					};
				};

				// Single- and empty arguments are adopted like Promise.resolve
				if (remaining <= 1) {
					adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject, !remaining);

					// Use .then() to unwrap secondary thenables (cf. gh-3000)
					if (master.state() === "pending" || jQuery.isFunction(resolveValues[i] && resolveValues[i].then)) {

						return master.then();
					}
				}

				// Multiple arguments are aggregated like Promise.all array elements
				while (i--) {
					adoptValue(resolveValues[i], updateFunc(i), master.reject);
				}

				return master.promise();
			}
		});

		// These usually indicate a programmer mistake during development,
		// warn about them ASAP rather than swallowing them by default.
		var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

		jQuery.Deferred.exceptionHook = function (error, stack) {

			// Support: IE 8 - 9 only
			// Console exists when dev tools are open, which can happen at any time
			if (window.console && window.console.warn && error && rerrorNames.test(error.name)) {
				window.console.warn("jQuery.Deferred exception: " + error.message, error.stack, stack);
			}
		};

		jQuery.readyException = function (error) {
			window.setTimeout(function () {
				throw error;
			});
		};

		// The deferred used on DOM ready
		var readyList = jQuery.Deferred();

		jQuery.fn.ready = function (fn) {

			readyList.then(fn)

			// Wrap jQuery.readyException in a function so that the lookup
			// happens at the time of error handling instead of callback
			// registration.
			.catch(function (error) {
				jQuery.readyException(error);
			});

			return this;
		};

		jQuery.extend({

			// Is the DOM ready to be used? Set to true once it occurs.
			isReady: false,

			// A counter to track how many items to wait for before
			// the ready event fires. See #6781
			readyWait: 1,

			// Handle when the DOM is ready
			ready: function ready(wait) {

				// Abort if there are pending holds or we're already ready
				if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
					return;
				}

				// Remember that the DOM is ready
				jQuery.isReady = true;

				// If a normal DOM Ready event fired, decrement, and wait if need be
				if (wait !== true && --jQuery.readyWait > 0) {
					return;
				}

				// If there are functions bound, to execute
				readyList.resolveWith(document, [jQuery]);
			}
		});

		jQuery.ready.then = readyList.then;

		// The ready event handler and self cleanup method
		function completed() {
			document.removeEventListener("DOMContentLoaded", completed);
			window.removeEventListener("load", completed);
			jQuery.ready();
		}

		// Catch cases where $(document).ready() is called
		// after the browser event has already occurred.
		// Support: IE <=9 - 10 only
		// Older IE sometimes signals "interactive" too soon
		if (document.readyState === "complete" || document.readyState !== "loading" && !document.documentElement.doScroll) {

			// Handle it asynchronously to allow scripts the opportunity to delay ready
			window.setTimeout(jQuery.ready);
		} else {

			// Use the handy event callback
			document.addEventListener("DOMContentLoaded", completed);

			// A fallback to window.onload, that will always work
			window.addEventListener("load", completed);
		}

		// Multifunctional method to get and set values of a collection
		// The value/s can optionally be executed if it's a function
		var access = function access(elems, fn, key, value, chainable, emptyGet, raw) {
			var i = 0,
			    len = elems.length,
			    bulk = key == null;

			// Sets many values
			if (jQuery.type(key) === "object") {
				chainable = true;
				for (i in key) {
					access(elems, fn, i, key[i], true, emptyGet, raw);
				}

				// Sets one value
			} else if (value !== undefined) {
				chainable = true;

				if (!jQuery.isFunction(value)) {
					raw = true;
				}

				if (bulk) {

					// Bulk operations run against the entire set
					if (raw) {
						fn.call(elems, value);
						fn = null;

						// ...except when executing function values
					} else {
						bulk = fn;
						fn = function fn(elem, key, value) {
							return bulk.call(jQuery(elem), value);
						};
					}
				}

				if (fn) {
					for (; i < len; i++) {
						fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
					}
				}
			}

			if (chainable) {
				return elems;
			}

			// Gets
			if (bulk) {
				return fn.call(elems);
			}

			return len ? fn(elems[0], key) : emptyGet;
		};
		var acceptData = function acceptData(owner) {

			// Accepts only:
			//  - Node
			//    - Node.ELEMENT_NODE
			//    - Node.DOCUMENT_NODE
			//  - Object
			//    - Any
			return owner.nodeType === 1 || owner.nodeType === 9 || !+owner.nodeType;
		};

		function Data() {
			this.expando = jQuery.expando + Data.uid++;
		}

		Data.uid = 1;

		Data.prototype = {

			cache: function cache(owner) {

				// Check if the owner object already has a cache
				var value = owner[this.expando];

				// If not, create one
				if (!value) {
					value = {};

					// We can accept data for non-element nodes in modern browsers,
					// but we should not, see #8335.
					// Always return an empty object.
					if (acceptData(owner)) {

						// If it is a node unlikely to be stringify-ed or looped over
						// use plain assignment
						if (owner.nodeType) {
							owner[this.expando] = value;

							// Otherwise secure it in a non-enumerable property
							// configurable must be true to allow the property to be
							// deleted when data is removed
						} else {
							Object.defineProperty(owner, this.expando, {
								value: value,
								configurable: true
							});
						}
					}
				}

				return value;
			},
			set: function set(owner, data, value) {
				var prop,
				    cache = this.cache(owner);

				// Handle: [ owner, key, value ] args
				// Always use camelCase key (gh-2257)
				if (typeof data === "string") {
					cache[jQuery.camelCase(data)] = value;

					// Handle: [ owner, { properties } ] args
				} else {

					// Copy the properties one-by-one to the cache object
					for (prop in data) {
						cache[jQuery.camelCase(prop)] = data[prop];
					}
				}
				return cache;
			},
			get: function get(owner, key) {
				return key === undefined ? this.cache(owner) :

				// Always use camelCase key (gh-2257)
				owner[this.expando] && owner[this.expando][jQuery.camelCase(key)];
			},
			access: function access(owner, key, value) {

				// In cases where either:
				//
				//   1. No key was specified
				//   2. A string key was specified, but no value provided
				//
				// Take the "read" path and allow the get method to determine
				// which value to return, respectively either:
				//
				//   1. The entire cache object
				//   2. The data stored at the key
				//
				if (key === undefined || key && typeof key === "string" && value === undefined) {

					return this.get(owner, key);
				}

				// When the key is not a string, or both a key and value
				// are specified, set or extend (existing objects) with either:
				//
				//   1. An object of properties
				//   2. A key and value
				//
				this.set(owner, key, value);

				// Since the "set" path can have two possible entry points
				// return the expected data based on which path was taken[*]
				return value !== undefined ? value : key;
			},
			remove: function remove(owner, key) {
				var i,
				    cache = owner[this.expando];

				if (cache === undefined) {
					return;
				}

				if (key !== undefined) {

					// Support array or space separated string of keys
					if (Array.isArray(key)) {

						// If key is an array of keys...
						// We always set camelCase keys, so remove that.
						key = key.map(jQuery.camelCase);
					} else {
						key = jQuery.camelCase(key);

						// If a key with the spaces exists, use it.
						// Otherwise, create an array by matching non-whitespace
						key = key in cache ? [key] : key.match(rnothtmlwhite) || [];
					}

					i = key.length;

					while (i--) {
						delete cache[key[i]];
					}
				}

				// Remove the expando if there's no more data
				if (key === undefined || jQuery.isEmptyObject(cache)) {

					// Support: Chrome <=35 - 45
					// Webkit & Blink performance suffers when deleting properties
					// from DOM nodes, so set to undefined instead
					// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
					if (owner.nodeType) {
						owner[this.expando] = undefined;
					} else {
						delete owner[this.expando];
					}
				}
			},
			hasData: function hasData(owner) {
				var cache = owner[this.expando];
				return cache !== undefined && !jQuery.isEmptyObject(cache);
			}
		};
		var dataPriv = new Data();

		var dataUser = new Data();

		//	Implementation Summary
		//
		//	1. Enforce API surface and semantic compatibility with 1.9.x branch
		//	2. Improve the module's maintainability by reducing the storage
		//		paths to a single mechanism.
		//	3. Use the same single mechanism to support "private" and "user" data.
		//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
		//	5. Avoid exposing implementation details on user objects (eg. expando properties)
		//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

		var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
		    rmultiDash = /[A-Z]/g;

		function getData(data) {
			if (data === "true") {
				return true;
			}

			if (data === "false") {
				return false;
			}

			if (data === "null") {
				return null;
			}

			// Only convert to a number if it doesn't change the string
			if (data === +data + "") {
				return +data;
			}

			if (rbrace.test(data)) {
				return JSON.parse(data);
			}

			return data;
		}

		function dataAttr(elem, key, data) {
			var name;

			// If nothing was found internally, try to fetch any
			// data from the HTML5 data-* attribute
			if (data === undefined && elem.nodeType === 1) {
				name = "data-" + key.replace(rmultiDash, "-$&").toLowerCase();
				data = elem.getAttribute(name);

				if (typeof data === "string") {
					try {
						data = getData(data);
					} catch (e) {}

					// Make sure we set the data so it isn't changed later
					dataUser.set(elem, key, data);
				} else {
					data = undefined;
				}
			}
			return data;
		}

		jQuery.extend({
			hasData: function hasData(elem) {
				return dataUser.hasData(elem) || dataPriv.hasData(elem);
			},

			data: function data(elem, name, _data) {
				return dataUser.access(elem, name, _data);
			},

			removeData: function removeData(elem, name) {
				dataUser.remove(elem, name);
			},

			// TODO: Now that all calls to _data and _removeData have been replaced
			// with direct calls to dataPriv methods, these can be deprecated.
			_data: function _data(elem, name, data) {
				return dataPriv.access(elem, name, data);
			},

			_removeData: function _removeData(elem, name) {
				dataPriv.remove(elem, name);
			}
		});

		jQuery.fn.extend({
			data: function data(key, value) {
				var i,
				    name,
				    data,
				    elem = this[0],
				    attrs = elem && elem.attributes;

				// Gets all values
				if (key === undefined) {
					if (this.length) {
						data = dataUser.get(elem);

						if (elem.nodeType === 1 && !dataPriv.get(elem, "hasDataAttrs")) {
							i = attrs.length;
							while (i--) {

								// Support: IE 11 only
								// The attrs elements can be null (#14894)
								if (attrs[i]) {
									name = attrs[i].name;
									if (name.indexOf("data-") === 0) {
										name = jQuery.camelCase(name.slice(5));
										dataAttr(elem, name, data[name]);
									}
								}
							}
							dataPriv.set(elem, "hasDataAttrs", true);
						}
					}

					return data;
				}

				// Sets multiple values
				if ((typeof key === "undefined" ? "undefined" : _typeof(key)) === "object") {
					return this.each(function () {
						dataUser.set(this, key);
					});
				}

				return access(this, function (value) {
					var data;

					// The calling jQuery object (element matches) is not empty
					// (and therefore has an element appears at this[ 0 ]) and the
					// `value` parameter was not undefined. An empty jQuery object
					// will result in `undefined` for elem = this[ 0 ] which will
					// throw an exception if an attempt to read a data cache is made.
					if (elem && value === undefined) {

						// Attempt to get data from the cache
						// The key will always be camelCased in Data
						data = dataUser.get(elem, key);
						if (data !== undefined) {
							return data;
						}

						// Attempt to "discover" the data in
						// HTML5 custom data-* attrs
						data = dataAttr(elem, key);
						if (data !== undefined) {
							return data;
						}

						// We tried really hard, but the data doesn't exist.
						return;
					}

					// Set the data...
					this.each(function () {

						// We always store the camelCased key
						dataUser.set(this, key, value);
					});
				}, null, value, arguments.length > 1, null, true);
			},

			removeData: function removeData(key) {
				return this.each(function () {
					dataUser.remove(this, key);
				});
			}
		});

		jQuery.extend({
			queue: function queue(elem, type, data) {
				var queue;

				if (elem) {
					type = (type || "fx") + "queue";
					queue = dataPriv.get(elem, type);

					// Speed up dequeue by getting out quickly if this is just a lookup
					if (data) {
						if (!queue || Array.isArray(data)) {
							queue = dataPriv.access(elem, type, jQuery.makeArray(data));
						} else {
							queue.push(data);
						}
					}
					return queue || [];
				}
			},

			dequeue: function dequeue(elem, type) {
				type = type || "fx";

				var queue = jQuery.queue(elem, type),
				    startLength = queue.length,
				    fn = queue.shift(),
				    hooks = jQuery._queueHooks(elem, type),
				    next = function next() {
					jQuery.dequeue(elem, type);
				};

				// If the fx queue is dequeued, always remove the progress sentinel
				if (fn === "inprogress") {
					fn = queue.shift();
					startLength--;
				}

				if (fn) {

					// Add a progress sentinel to prevent the fx queue from being
					// automatically dequeued
					if (type === "fx") {
						queue.unshift("inprogress");
					}

					// Clear up the last queue stop function
					delete hooks.stop;
					fn.call(elem, next, hooks);
				}

				if (!startLength && hooks) {
					hooks.empty.fire();
				}
			},

			// Not public - generate a queueHooks object, or return the current one
			_queueHooks: function _queueHooks(elem, type) {
				var key = type + "queueHooks";
				return dataPriv.get(elem, key) || dataPriv.access(elem, key, {
					empty: jQuery.Callbacks("once memory").add(function () {
						dataPriv.remove(elem, [type + "queue", key]);
					})
				});
			}
		});

		jQuery.fn.extend({
			queue: function queue(type, data) {
				var setter = 2;

				if (typeof type !== "string") {
					data = type;
					type = "fx";
					setter--;
				}

				if (arguments.length < setter) {
					return jQuery.queue(this[0], type);
				}

				return data === undefined ? this : this.each(function () {
					var queue = jQuery.queue(this, type, data);

					// Ensure a hooks for this queue
					jQuery._queueHooks(this, type);

					if (type === "fx" && queue[0] !== "inprogress") {
						jQuery.dequeue(this, type);
					}
				});
			},
			dequeue: function dequeue(type) {
				return this.each(function () {
					jQuery.dequeue(this, type);
				});
			},
			clearQueue: function clearQueue(type) {
				return this.queue(type || "fx", []);
			},

			// Get a promise resolved when queues of a certain type
			// are emptied (fx is the type by default)
			promise: function promise(type, obj) {
				var tmp,
				    count = 1,
				    defer = jQuery.Deferred(),
				    elements = this,
				    i = this.length,
				    resolve = function resolve() {
					if (! --count) {
						defer.resolveWith(elements, [elements]);
					}
				};

				if (typeof type !== "string") {
					obj = type;
					type = undefined;
				}
				type = type || "fx";

				while (i--) {
					tmp = dataPriv.get(elements[i], type + "queueHooks");
					if (tmp && tmp.empty) {
						count++;
						tmp.empty.add(resolve);
					}
				}
				resolve();
				return defer.promise(obj);
			}
		});
		var pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;

		var rcssNum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i");

		var cssExpand = ["Top", "Right", "Bottom", "Left"];

		var isHiddenWithinTree = function isHiddenWithinTree(elem, el) {

			// isHiddenWithinTree might be called from jQuery#filter function;
			// in that case, element will be second argument
			elem = el || elem;

			// Inline style trumps all
			return elem.style.display === "none" || elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			jQuery.contains(elem.ownerDocument, elem) && jQuery.css(elem, "display") === "none";
		};

		var swap = function swap(elem, options, callback, args) {
			var ret,
			    name,
			    old = {};

			// Remember the old values, and insert the new ones
			for (name in options) {
				old[name] = elem.style[name];
				elem.style[name] = options[name];
			}

			ret = callback.apply(elem, args || []);

			// Revert the old values
			for (name in options) {
				elem.style[name] = old[name];
			}

			return ret;
		};

		function adjustCSS(elem, prop, valueParts, tween) {
			var adjusted,
			    scale = 1,
			    maxIterations = 20,
			    currentValue = tween ? function () {
				return tween.cur();
			} : function () {
				return jQuery.css(elem, prop, "");
			},
			    initial = currentValue(),
			    unit = valueParts && valueParts[3] || (jQuery.cssNumber[prop] ? "" : "px"),


			// Starting value computation is required for potential unit mismatches
			initialInUnit = (jQuery.cssNumber[prop] || unit !== "px" && +initial) && rcssNum.exec(jQuery.css(elem, prop));

			if (initialInUnit && initialInUnit[3] !== unit) {

				// Trust units reported by jQuery.css
				unit = unit || initialInUnit[3];

				// Make sure we update the tween properties later on
				valueParts = valueParts || [];

				// Iteratively approximate from a nonzero starting point
				initialInUnit = +initial || 1;

				do {

					// If previous iteration zeroed out, double until we get *something*.
					// Use string for doubling so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					initialInUnit = initialInUnit / scale;
					jQuery.style(elem, prop, initialInUnit + unit);

					// Update scale, tolerating zero or NaN from tween.cur()
					// Break the loop if scale is unchanged or perfect, or if we've just had enough.
				} while (scale !== (scale = currentValue() / initial) && scale !== 1 && --maxIterations);
			}

			if (valueParts) {
				initialInUnit = +initialInUnit || +initial || 0;

				// Apply relative offset (+=/-=) if specified
				adjusted = valueParts[1] ? initialInUnit + (valueParts[1] + 1) * valueParts[2] : +valueParts[2];
				if (tween) {
					tween.unit = unit;
					tween.start = initialInUnit;
					tween.end = adjusted;
				}
			}
			return adjusted;
		}

		var defaultDisplayMap = {};

		function getDefaultDisplay(elem) {
			var temp,
			    doc = elem.ownerDocument,
			    nodeName = elem.nodeName,
			    display = defaultDisplayMap[nodeName];

			if (display) {
				return display;
			}

			temp = doc.body.appendChild(doc.createElement(nodeName));
			display = jQuery.css(temp, "display");

			temp.parentNode.removeChild(temp);

			if (display === "none") {
				display = "block";
			}
			defaultDisplayMap[nodeName] = display;

			return display;
		}

		function showHide(elements, show) {
			var display,
			    elem,
			    values = [],
			    index = 0,
			    length = elements.length;

			// Determine new display value for elements that need to change
			for (; index < length; index++) {
				elem = elements[index];
				if (!elem.style) {
					continue;
				}

				display = elem.style.display;
				if (show) {

					// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
					// check is required in this first loop unless we have a nonempty display value (either
					// inline or about-to-be-restored)
					if (display === "none") {
						values[index] = dataPriv.get(elem, "display") || null;
						if (!values[index]) {
							elem.style.display = "";
						}
					}
					if (elem.style.display === "" && isHiddenWithinTree(elem)) {
						values[index] = getDefaultDisplay(elem);
					}
				} else {
					if (display !== "none") {
						values[index] = "none";

						// Remember what we're overwriting
						dataPriv.set(elem, "display", display);
					}
				}
			}

			// Set the display of the elements in a second loop to avoid constant reflow
			for (index = 0; index < length; index++) {
				if (values[index] != null) {
					elements[index].style.display = values[index];
				}
			}

			return elements;
		}

		jQuery.fn.extend({
			show: function show() {
				return showHide(this, true);
			},
			hide: function hide() {
				return showHide(this);
			},
			toggle: function toggle(state) {
				if (typeof state === "boolean") {
					return state ? this.show() : this.hide();
				}

				return this.each(function () {
					if (isHiddenWithinTree(this)) {
						jQuery(this).show();
					} else {
						jQuery(this).hide();
					}
				});
			}
		});
		var rcheckableType = /^(?:checkbox|radio)$/i;

		var rtagName = /<([a-z][^\/\0>\x20\t\r\n\f]+)/i;

		var rscriptType = /^$|\/(?:java|ecma)script/i;

		// We have to close these tags to support XHTML (#13200)
		var wrapMap = {

			// Support: IE <=9 only
			option: [1, "<select multiple='multiple'>", "</select>"],

			// XHTML parsers do not magically insert elements in the
			// same way that tag soup parsers do. So we cannot shorten
			// this by omitting <tbody> or other required elements.
			thead: [1, "<table>", "</table>"],
			col: [2, "<table><colgroup>", "</colgroup></table>"],
			tr: [2, "<table><tbody>", "</tbody></table>"],
			td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],

			_default: [0, "", ""]
		};

		// Support: IE <=9 only
		wrapMap.optgroup = wrapMap.option;

		wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
		wrapMap.th = wrapMap.td;

		function getAll(context, tag) {

			// Support: IE <=9 - 11 only
			// Use typeof to avoid zero-argument method invocation on host objects (#15151)
			var ret;

			if (typeof context.getElementsByTagName !== "undefined") {
				ret = context.getElementsByTagName(tag || "*");
			} else if (typeof context.querySelectorAll !== "undefined") {
				ret = context.querySelectorAll(tag || "*");
			} else {
				ret = [];
			}

			if (tag === undefined || tag && nodeName(context, tag)) {
				return jQuery.merge([context], ret);
			}

			return ret;
		}

		// Mark scripts as having already been evaluated
		function setGlobalEval(elems, refElements) {
			var i = 0,
			    l = elems.length;

			for (; i < l; i++) {
				dataPriv.set(elems[i], "globalEval", !refElements || dataPriv.get(refElements[i], "globalEval"));
			}
		}

		var rhtml = /<|&#?\w+;/;

		function buildFragment(elems, context, scripts, selection, ignored) {
			var elem,
			    tmp,
			    tag,
			    wrap,
			    contains,
			    j,
			    fragment = context.createDocumentFragment(),
			    nodes = [],
			    i = 0,
			    l = elems.length;

			for (; i < l; i++) {
				elem = elems[i];

				if (elem || elem === 0) {

					// Add nodes directly
					if (jQuery.type(elem) === "object") {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge(nodes, elem.nodeType ? [elem] : elem);

						// Convert non-html into a text node
					} else if (!rhtml.test(elem)) {
						nodes.push(context.createTextNode(elem));

						// Convert html into DOM nodes
					} else {
						tmp = tmp || fragment.appendChild(context.createElement("div"));

						// Deserialize a standard representation
						tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
						wrap = wrapMap[tag] || wrapMap._default;
						tmp.innerHTML = wrap[1] + jQuery.htmlPrefilter(elem) + wrap[2];

						// Descend through wrappers to the right content
						j = wrap[0];
						while (j--) {
							tmp = tmp.lastChild;
						}

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge(nodes, tmp.childNodes);

						// Remember the top-level container
						tmp = fragment.firstChild;

						// Ensure the created nodes are orphaned (#12392)
						tmp.textContent = "";
					}
				}
			}

			// Remove wrapper from fragment
			fragment.textContent = "";

			i = 0;
			while (elem = nodes[i++]) {

				// Skip elements already in the context collection (trac-4087)
				if (selection && jQuery.inArray(elem, selection) > -1) {
					if (ignored) {
						ignored.push(elem);
					}
					continue;
				}

				contains = jQuery.contains(elem.ownerDocument, elem);

				// Append to fragment
				tmp = getAll(fragment.appendChild(elem), "script");

				// Preserve script evaluation history
				if (contains) {
					setGlobalEval(tmp);
				}

				// Capture executables
				if (scripts) {
					j = 0;
					while (elem = tmp[j++]) {
						if (rscriptType.test(elem.type || "")) {
							scripts.push(elem);
						}
					}
				}
			}

			return fragment;
		}

		(function () {
			var fragment = document.createDocumentFragment(),
			    div = fragment.appendChild(document.createElement("div")),
			    input = document.createElement("input");

			// Support: Android 4.0 - 4.3 only
			// Check state lost if the name is set (#11217)
			// Support: Windows Web Apps (WWA)
			// `name` and `type` must use .setAttribute for WWA (#14901)
			input.setAttribute("type", "radio");
			input.setAttribute("checked", "checked");
			input.setAttribute("name", "t");

			div.appendChild(input);

			// Support: Android <=4.1 only
			// Older WebKit doesn't clone checked state correctly in fragments
			support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;

			// Support: IE <=11 only
			// Make sure textarea (and checkbox) defaultValue is properly cloned
			div.innerHTML = "<textarea>x</textarea>";
			support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
		})();
		var documentElement = document.documentElement;

		var rkeyEvent = /^key/,
		    rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
		    rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

		function returnTrue() {
			return true;
		}

		function returnFalse() {
			return false;
		}

		// Support: IE <=9 only
		// See #13393 for more info
		function safeActiveElement() {
			try {
				return document.activeElement;
			} catch (err) {}
		}

		function _on(elem, types, selector, data, fn, one) {
			var origFn, type;

			// Types can be a map of types/handlers
			if ((typeof types === "undefined" ? "undefined" : _typeof(types)) === "object") {

				// ( types-Object, selector, data )
				if (typeof selector !== "string") {

					// ( types-Object, data )
					data = data || selector;
					selector = undefined;
				}
				for (type in types) {
					_on(elem, type, selector, data, types[type], one);
				}
				return elem;
			}

			if (data == null && fn == null) {

				// ( types, fn )
				fn = selector;
				data = selector = undefined;
			} else if (fn == null) {
				if (typeof selector === "string") {

					// ( types, selector, fn )
					fn = data;
					data = undefined;
				} else {

					// ( types, data, fn )
					fn = data;
					data = selector;
					selector = undefined;
				}
			}
			if (fn === false) {
				fn = returnFalse;
			} else if (!fn) {
				return elem;
			}

			if (one === 1) {
				origFn = fn;
				fn = function fn(event) {

					// Can use an empty set, since event contains the info
					jQuery().off(event);
					return origFn.apply(this, arguments);
				};

				// Use same guid so caller can remove using origFn
				fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
			}
			return elem.each(function () {
				jQuery.event.add(this, types, fn, data, selector);
			});
		}

		/*
	  * Helper functions for managing events -- not part of the public interface.
	  * Props to Dean Edwards' addEvent library for many of the ideas.
	  */
		jQuery.event = {

			global: {},

			add: function add(elem, types, handler, data, selector) {

				var handleObjIn,
				    eventHandle,
				    tmp,
				    events,
				    t,
				    handleObj,
				    special,
				    handlers,
				    type,
				    namespaces,
				    origType,
				    elemData = dataPriv.get(elem);

				// Don't attach events to noData or text/comment nodes (but allow plain objects)
				if (!elemData) {
					return;
				}

				// Caller can pass in an object of custom data in lieu of the handler
				if (handler.handler) {
					handleObjIn = handler;
					handler = handleObjIn.handler;
					selector = handleObjIn.selector;
				}

				// Ensure that invalid selectors throw exceptions at attach time
				// Evaluate against documentElement in case elem is a non-element node (e.g., document)
				if (selector) {
					jQuery.find.matchesSelector(documentElement, selector);
				}

				// Make sure that the handler has a unique ID, used to find/remove it later
				if (!handler.guid) {
					handler.guid = jQuery.guid++;
				}

				// Init the element's event structure and main handler, if this is the first
				if (!(events = elemData.events)) {
					events = elemData.events = {};
				}
				if (!(eventHandle = elemData.handle)) {
					eventHandle = elemData.handle = function (e) {

						// Discard the second event of a jQuery.event.trigger() and
						// when an event is called after a page has unloaded
						return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
					};
				}

				// Handle multiple events separated by a space
				types = (types || "").match(rnothtmlwhite) || [""];
				t = types.length;
				while (t--) {
					tmp = rtypenamespace.exec(types[t]) || [];
					type = origType = tmp[1];
					namespaces = (tmp[2] || "").split(".").sort();

					// There *must* be a type, no attaching namespace-only handlers
					if (!type) {
						continue;
					}

					// If event changes its type, use the special event handlers for the changed type
					special = jQuery.event.special[type] || {};

					// If selector defined, determine special event api type, otherwise given type
					type = (selector ? special.delegateType : special.bindType) || type;

					// Update special based on newly reset type
					special = jQuery.event.special[type] || {};

					// handleObj is passed to all event handlers
					handleObj = jQuery.extend({
						type: type,
						origType: origType,
						data: data,
						handler: handler,
						guid: handler.guid,
						selector: selector,
						needsContext: selector && jQuery.expr.match.needsContext.test(selector),
						namespace: namespaces.join(".")
					}, handleObjIn);

					// Init the event handler queue if we're the first
					if (!(handlers = events[type])) {
						handlers = events[type] = [];
						handlers.delegateCount = 0;

						// Only use addEventListener if the special events handler returns false
						if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {

							if (elem.addEventListener) {
								elem.addEventListener(type, eventHandle);
							}
						}
					}

					if (special.add) {
						special.add.call(elem, handleObj);

						if (!handleObj.handler.guid) {
							handleObj.handler.guid = handler.guid;
						}
					}

					// Add to the element's handler list, delegates in front
					if (selector) {
						handlers.splice(handlers.delegateCount++, 0, handleObj);
					} else {
						handlers.push(handleObj);
					}

					// Keep track of which events have ever been used, for event optimization
					jQuery.event.global[type] = true;
				}
			},

			// Detach an event or set of events from an element
			remove: function remove(elem, types, handler, selector, mappedTypes) {

				var j,
				    origCount,
				    tmp,
				    events,
				    t,
				    handleObj,
				    special,
				    handlers,
				    type,
				    namespaces,
				    origType,
				    elemData = dataPriv.hasData(elem) && dataPriv.get(elem);

				if (!elemData || !(events = elemData.events)) {
					return;
				}

				// Once for each type.namespace in types; type may be omitted
				types = (types || "").match(rnothtmlwhite) || [""];
				t = types.length;
				while (t--) {
					tmp = rtypenamespace.exec(types[t]) || [];
					type = origType = tmp[1];
					namespaces = (tmp[2] || "").split(".").sort();

					// Unbind all events (on this namespace, if provided) for the element
					if (!type) {
						for (type in events) {
							jQuery.event.remove(elem, type + types[t], handler, selector, true);
						}
						continue;
					}

					special = jQuery.event.special[type] || {};
					type = (selector ? special.delegateType : special.bindType) || type;
					handlers = events[type] || [];
					tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");

					// Remove matching events
					origCount = j = handlers.length;
					while (j--) {
						handleObj = handlers[j];

						if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
							handlers.splice(j, 1);

							if (handleObj.selector) {
								handlers.delegateCount--;
							}
							if (special.remove) {
								special.remove.call(elem, handleObj);
							}
						}
					}

					// Remove generic event handler if we removed something and no more handlers exist
					// (avoids potential for endless recursion during removal of special event handlers)
					if (origCount && !handlers.length) {
						if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {

							jQuery.removeEvent(elem, type, elemData.handle);
						}

						delete events[type];
					}
				}

				// Remove data and the expando if it's no longer used
				if (jQuery.isEmptyObject(events)) {
					dataPriv.remove(elem, "handle events");
				}
			},

			dispatch: function dispatch(nativeEvent) {

				// Make a writable jQuery.Event from the native event object
				var event = jQuery.event.fix(nativeEvent);

				var i,
				    j,
				    ret,
				    matched,
				    handleObj,
				    handlerQueue,
				    args = new Array(arguments.length),
				    handlers = (dataPriv.get(this, "events") || {})[event.type] || [],
				    special = jQuery.event.special[event.type] || {};

				// Use the fix-ed jQuery.Event rather than the (read-only) native event
				args[0] = event;

				for (i = 1; i < arguments.length; i++) {
					args[i] = arguments[i];
				}

				event.delegateTarget = this;

				// Call the preDispatch hook for the mapped type, and let it bail if desired
				if (special.preDispatch && special.preDispatch.call(this, event) === false) {
					return;
				}

				// Determine handlers
				handlerQueue = jQuery.event.handlers.call(this, event, handlers);

				// Run delegates first; they may want to stop propagation beneath us
				i = 0;
				while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
					event.currentTarget = matched.elem;

					j = 0;
					while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {

						// Triggered event must either 1) have no namespace, or 2) have namespace(s)
						// a subset or equal to those in the bound event (both can have no namespace).
						if (!event.rnamespace || event.rnamespace.test(handleObj.namespace)) {

							event.handleObj = handleObj;
							event.data = handleObj.data;

							ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);

							if (ret !== undefined) {
								if ((event.result = ret) === false) {
									event.preventDefault();
									event.stopPropagation();
								}
							}
						}
					}
				}

				// Call the postDispatch hook for the mapped type
				if (special.postDispatch) {
					special.postDispatch.call(this, event);
				}

				return event.result;
			},

			handlers: function handlers(event, _handlers) {
				var i,
				    handleObj,
				    sel,
				    matchedHandlers,
				    matchedSelectors,
				    handlerQueue = [],
				    delegateCount = _handlers.delegateCount,
				    cur = event.target;

				// Find delegate handlers
				if (delegateCount &&

				// Support: IE <=9
				// Black-hole SVG <use> instance trees (trac-13180)
				cur.nodeType &&

				// Support: Firefox <=42
				// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
				// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
				// Support: IE 11 only
				// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
				!(event.type === "click" && event.button >= 1)) {

					for (; cur !== this; cur = cur.parentNode || this) {

						// Don't check non-elements (#13208)
						// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
						if (cur.nodeType === 1 && !(event.type === "click" && cur.disabled === true)) {
							matchedHandlers = [];
							matchedSelectors = {};
							for (i = 0; i < delegateCount; i++) {
								handleObj = _handlers[i];

								// Don't conflict with Object.prototype properties (#13203)
								sel = handleObj.selector + " ";

								if (matchedSelectors[sel] === undefined) {
									matchedSelectors[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) > -1 : jQuery.find(sel, this, null, [cur]).length;
								}
								if (matchedSelectors[sel]) {
									matchedHandlers.push(handleObj);
								}
							}
							if (matchedHandlers.length) {
								handlerQueue.push({ elem: cur, handlers: matchedHandlers });
							}
						}
					}
				}

				// Add the remaining (directly-bound) handlers
				cur = this;
				if (delegateCount < _handlers.length) {
					handlerQueue.push({ elem: cur, handlers: _handlers.slice(delegateCount) });
				}

				return handlerQueue;
			},

			addProp: function addProp(name, hook) {
				Object.defineProperty(jQuery.Event.prototype, name, {
					enumerable: true,
					configurable: true,

					get: jQuery.isFunction(hook) ? function () {
						if (this.originalEvent) {
							return hook(this.originalEvent);
						}
					} : function () {
						if (this.originalEvent) {
							return this.originalEvent[name];
						}
					},

					set: function set(value) {
						Object.defineProperty(this, name, {
							enumerable: true,
							configurable: true,
							writable: true,
							value: value
						});
					}
				});
			},

			fix: function fix(originalEvent) {
				return originalEvent[jQuery.expando] ? originalEvent : new jQuery.Event(originalEvent);
			},

			special: {
				load: {

					// Prevent triggered image.load events from bubbling to window.load
					noBubble: true
				},
				focus: {

					// Fire native event if possible so blur/focus sequence is correct
					trigger: function trigger() {
						if (this !== safeActiveElement() && this.focus) {
							this.focus();
							return false;
						}
					},
					delegateType: "focusin"
				},
				blur: {
					trigger: function trigger() {
						if (this === safeActiveElement() && this.blur) {
							this.blur();
							return false;
						}
					},
					delegateType: "focusout"
				},
				click: {

					// For checkbox, fire native event so checked state will be right
					trigger: function trigger() {
						if (this.type === "checkbox" && this.click && nodeName(this, "input")) {
							this.click();
							return false;
						}
					},

					// For cross-browser consistency, don't fire native .click() on links
					_default: function _default(event) {
						return nodeName(event.target, "a");
					}
				},

				beforeunload: {
					postDispatch: function postDispatch(event) {

						// Support: Firefox 20+
						// Firefox doesn't alert if the returnValue field is not set.
						if (event.result !== undefined && event.originalEvent) {
							event.originalEvent.returnValue = event.result;
						}
					}
				}
			}
		};

		jQuery.removeEvent = function (elem, type, handle) {

			// This "if" is needed for plain objects
			if (elem.removeEventListener) {
				elem.removeEventListener(type, handle);
			}
		};

		jQuery.Event = function (src, props) {

			// Allow instantiation without the 'new' keyword
			if (!(this instanceof jQuery.Event)) {
				return new jQuery.Event(src, props);
			}

			// Event object
			if (src && src.type) {
				this.originalEvent = src;
				this.type = src.type;

				// Events bubbling up the document may have been marked as prevented
				// by a handler lower down the tree; reflect the correct value.
				this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ? returnTrue : returnFalse;

				// Create target properties
				// Support: Safari <=6 - 7 only
				// Target should not be a text node (#504, #13143)
				this.target = src.target && src.target.nodeType === 3 ? src.target.parentNode : src.target;

				this.currentTarget = src.currentTarget;
				this.relatedTarget = src.relatedTarget;

				// Event type
			} else {
				this.type = src;
			}

			// Put explicitly provided properties onto the event object
			if (props) {
				jQuery.extend(this, props);
			}

			// Create a timestamp if incoming event doesn't have one
			this.timeStamp = src && src.timeStamp || jQuery.now();

			// Mark it as fixed
			this[jQuery.expando] = true;
		};

		// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
		// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
		jQuery.Event.prototype = {
			constructor: jQuery.Event,
			isDefaultPrevented: returnFalse,
			isPropagationStopped: returnFalse,
			isImmediatePropagationStopped: returnFalse,
			isSimulated: false,

			preventDefault: function preventDefault() {
				var e = this.originalEvent;

				this.isDefaultPrevented = returnTrue;

				if (e && !this.isSimulated) {
					e.preventDefault();
				}
			},
			stopPropagation: function stopPropagation() {
				var e = this.originalEvent;

				this.isPropagationStopped = returnTrue;

				if (e && !this.isSimulated) {
					e.stopPropagation();
				}
			},
			stopImmediatePropagation: function stopImmediatePropagation() {
				var e = this.originalEvent;

				this.isImmediatePropagationStopped = returnTrue;

				if (e && !this.isSimulated) {
					e.stopImmediatePropagation();
				}

				this.stopPropagation();
			}
		};

		// Includes all common event props including KeyEvent and MouseEvent specific props
		jQuery.each({
			altKey: true,
			bubbles: true,
			cancelable: true,
			changedTouches: true,
			ctrlKey: true,
			detail: true,
			eventPhase: true,
			metaKey: true,
			pageX: true,
			pageY: true,
			shiftKey: true,
			view: true,
			"char": true,
			charCode: true,
			key: true,
			keyCode: true,
			button: true,
			buttons: true,
			clientX: true,
			clientY: true,
			offsetX: true,
			offsetY: true,
			pointerId: true,
			pointerType: true,
			screenX: true,
			screenY: true,
			targetTouches: true,
			toElement: true,
			touches: true,

			which: function which(event) {
				var button = event.button;

				// Add which for key events
				if (event.which == null && rkeyEvent.test(event.type)) {
					return event.charCode != null ? event.charCode : event.keyCode;
				}

				// Add which for click: 1 === left; 2 === middle; 3 === right
				if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
					if (button & 1) {
						return 1;
					}

					if (button & 2) {
						return 3;
					}

					if (button & 4) {
						return 2;
					}

					return 0;
				}

				return event.which;
			}
		}, jQuery.event.addProp);

		// Create mouseenter/leave events using mouseover/out and event-time checks
		// so that event delegation works in jQuery.
		// Do the same for pointerenter/pointerleave and pointerover/pointerout
		//
		// Support: Safari 7 only
		// Safari sends mouseenter too often; see:
		// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
		// for the description of the bug (it existed in older Chrome versions as well).
		jQuery.each({
			mouseenter: "mouseover",
			mouseleave: "mouseout",
			pointerenter: "pointerover",
			pointerleave: "pointerout"
		}, function (orig, fix) {
			jQuery.event.special[orig] = {
				delegateType: fix,
				bindType: fix,

				handle: function handle(event) {
					var ret,
					    target = this,
					    related = event.relatedTarget,
					    handleObj = event.handleObj;

					// For mouseenter/leave call the handler if related is outside the target.
					// NB: No relatedTarget if the mouse left/entered the browser window
					if (!related || related !== target && !jQuery.contains(target, related)) {
						event.type = handleObj.origType;
						ret = handleObj.handler.apply(this, arguments);
						event.type = fix;
					}
					return ret;
				}
			};
		});

		jQuery.fn.extend({

			on: function on(types, selector, data, fn) {
				return _on(this, types, selector, data, fn);
			},
			one: function one(types, selector, data, fn) {
				return _on(this, types, selector, data, fn, 1);
			},
			off: function off(types, selector, fn) {
				var handleObj, type;
				if (types && types.preventDefault && types.handleObj) {

					// ( event )  dispatched jQuery.Event
					handleObj = types.handleObj;
					jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
					return this;
				}
				if ((typeof types === "undefined" ? "undefined" : _typeof(types)) === "object") {

					// ( types-object [, selector] )
					for (type in types) {
						this.off(type, selector, types[type]);
					}
					return this;
				}
				if (selector === false || typeof selector === "function") {

					// ( types [, fn] )
					fn = selector;
					selector = undefined;
				}
				if (fn === false) {
					fn = returnFalse;
				}
				return this.each(function () {
					jQuery.event.remove(this, types, fn, selector);
				});
			}
		});

		var

		/* eslint-disable max-len */

		// See https://github.com/eslint/eslint/issues/3229
		rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,


		/* eslint-enable */

		// Support: IE <=10 - 11, Edge 12 - 13
		// In IE/Edge using regex groups here causes severe slowdowns.
		// See https://connect.microsoft.com/IE/feedback/details/1736512/
		rnoInnerhtml = /<script|<style|<link/i,


		// checked="checked" or checked
		rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
		    rscriptTypeMasked = /^true\/(.*)/,
		    rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

		// Prefer a tbody over its parent table for containing new rows
		function manipulationTarget(elem, content) {
			if (nodeName(elem, "table") && nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr")) {

				return jQuery(">tbody", elem)[0] || elem;
			}

			return elem;
		}

		// Replace/restore the type attribute of script elements for safe DOM manipulation
		function disableScript(elem) {
			elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
			return elem;
		}
		function restoreScript(elem) {
			var match = rscriptTypeMasked.exec(elem.type);

			if (match) {
				elem.type = match[1];
			} else {
				elem.removeAttribute("type");
			}

			return elem;
		}

		function cloneCopyEvent(src, dest) {
			var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

			if (dest.nodeType !== 1) {
				return;
			}

			// 1. Copy private data: events, handlers, etc.
			if (dataPriv.hasData(src)) {
				pdataOld = dataPriv.access(src);
				pdataCur = dataPriv.set(dest, pdataOld);
				events = pdataOld.events;

				if (events) {
					delete pdataCur.handle;
					pdataCur.events = {};

					for (type in events) {
						for (i = 0, l = events[type].length; i < l; i++) {
							jQuery.event.add(dest, type, events[type][i]);
						}
					}
				}
			}

			// 2. Copy user data
			if (dataUser.hasData(src)) {
				udataOld = dataUser.access(src);
				udataCur = jQuery.extend({}, udataOld);

				dataUser.set(dest, udataCur);
			}
		}

		// Fix IE bugs, see support tests
		function fixInput(src, dest) {
			var nodeName = dest.nodeName.toLowerCase();

			// Fails to persist the checked state of a cloned checkbox or radio button.
			if (nodeName === "input" && rcheckableType.test(src.type)) {
				dest.checked = src.checked;

				// Fails to return the selected option to the default selected state when cloning options
			} else if (nodeName === "input" || nodeName === "textarea") {
				dest.defaultValue = src.defaultValue;
			}
		}

		function domManip(collection, args, callback, ignored) {

			// Flatten any nested arrays
			args = concat.apply([], args);

			var fragment,
			    first,
			    scripts,
			    hasScripts,
			    node,
			    doc,
			    i = 0,
			    l = collection.length,
			    iNoClone = l - 1,
			    value = args[0],
			    isFunction = jQuery.isFunction(value);

			// We can't cloneNode fragments that contain checked, in WebKit
			if (isFunction || l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value)) {
				return collection.each(function (index) {
					var self = collection.eq(index);
					if (isFunction) {
						args[0] = value.call(this, index, self.html());
					}
					domManip(self, args, callback, ignored);
				});
			}

			if (l) {
				fragment = buildFragment(args, collection[0].ownerDocument, false, collection, ignored);
				first = fragment.firstChild;

				if (fragment.childNodes.length === 1) {
					fragment = first;
				}

				// Require either new content or an interest in ignored elements to invoke the callback
				if (first || ignored) {
					scripts = jQuery.map(getAll(fragment, "script"), disableScript);
					hasScripts = scripts.length;

					// Use the original fragment for the last item
					// instead of the first because it can end up
					// being emptied incorrectly in certain situations (#8070).
					for (; i < l; i++) {
						node = fragment;

						if (i !== iNoClone) {
							node = jQuery.clone(node, true, true);

							// Keep references to cloned scripts for later restoration
							if (hasScripts) {

								// Support: Android <=4.0 only, PhantomJS 1 only
								// push.apply(_, arraylike) throws on ancient WebKit
								jQuery.merge(scripts, getAll(node, "script"));
							}
						}

						callback.call(collection[i], node, i);
					}

					if (hasScripts) {
						doc = scripts[scripts.length - 1].ownerDocument;

						// Reenable scripts
						jQuery.map(scripts, restoreScript);

						// Evaluate executable scripts on first document insertion
						for (i = 0; i < hasScripts; i++) {
							node = scripts[i];
							if (rscriptType.test(node.type || "") && !dataPriv.access(node, "globalEval") && jQuery.contains(doc, node)) {

								if (node.src) {

									// Optional AJAX dependency, but won't run scripts if not present
									if (jQuery._evalUrl) {
										jQuery._evalUrl(node.src);
									}
								} else {
									DOMEval(node.textContent.replace(rcleanScript, ""), doc);
								}
							}
						}
					}
				}
			}

			return collection;
		}

		function _remove(elem, selector, keepData) {
			var node,
			    nodes = selector ? jQuery.filter(selector, elem) : elem,
			    i = 0;

			for (; (node = nodes[i]) != null; i++) {
				if (!keepData && node.nodeType === 1) {
					jQuery.cleanData(getAll(node));
				}

				if (node.parentNode) {
					if (keepData && jQuery.contains(node.ownerDocument, node)) {
						setGlobalEval(getAll(node, "script"));
					}
					node.parentNode.removeChild(node);
				}
			}

			return elem;
		}

		jQuery.extend({
			htmlPrefilter: function htmlPrefilter(html) {
				return html.replace(rxhtmlTag, "<$1></$2>");
			},

			clone: function clone(elem, dataAndEvents, deepDataAndEvents) {
				var i,
				    l,
				    srcElements,
				    destElements,
				    clone = elem.cloneNode(true),
				    inPage = jQuery.contains(elem.ownerDocument, elem);

				// Fix IE cloning issues
				if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {

					// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
					destElements = getAll(clone);
					srcElements = getAll(elem);

					for (i = 0, l = srcElements.length; i < l; i++) {
						fixInput(srcElements[i], destElements[i]);
					}
				}

				// Copy the events from the original to the clone
				if (dataAndEvents) {
					if (deepDataAndEvents) {
						srcElements = srcElements || getAll(elem);
						destElements = destElements || getAll(clone);

						for (i = 0, l = srcElements.length; i < l; i++) {
							cloneCopyEvent(srcElements[i], destElements[i]);
						}
					} else {
						cloneCopyEvent(elem, clone);
					}
				}

				// Preserve script evaluation history
				destElements = getAll(clone, "script");
				if (destElements.length > 0) {
					setGlobalEval(destElements, !inPage && getAll(elem, "script"));
				}

				// Return the cloned set
				return clone;
			},

			cleanData: function cleanData(elems) {
				var data,
				    elem,
				    type,
				    special = jQuery.event.special,
				    i = 0;

				for (; (elem = elems[i]) !== undefined; i++) {
					if (acceptData(elem)) {
						if (data = elem[dataPriv.expando]) {
							if (data.events) {
								for (type in data.events) {
									if (special[type]) {
										jQuery.event.remove(elem, type);

										// This is a shortcut to avoid jQuery.event.remove's overhead
									} else {
										jQuery.removeEvent(elem, type, data.handle);
									}
								}
							}

							// Support: Chrome <=35 - 45+
							// Assign undefined instead of using delete, see Data#remove
							elem[dataPriv.expando] = undefined;
						}
						if (elem[dataUser.expando]) {

							// Support: Chrome <=35 - 45+
							// Assign undefined instead of using delete, see Data#remove
							elem[dataUser.expando] = undefined;
						}
					}
				}
			}
		});

		jQuery.fn.extend({
			detach: function detach(selector) {
				return _remove(this, selector, true);
			},

			remove: function remove(selector) {
				return _remove(this, selector);
			},

			text: function text(value) {
				return access(this, function (value) {
					return value === undefined ? jQuery.text(this) : this.empty().each(function () {
						if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
							this.textContent = value;
						}
					});
				}, null, value, arguments.length);
			},

			append: function append() {
				return domManip(this, arguments, function (elem) {
					if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
						var target = manipulationTarget(this, elem);
						target.appendChild(elem);
					}
				});
			},

			prepend: function prepend() {
				return domManip(this, arguments, function (elem) {
					if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
						var target = manipulationTarget(this, elem);
						target.insertBefore(elem, target.firstChild);
					}
				});
			},

			before: function before() {
				return domManip(this, arguments, function (elem) {
					if (this.parentNode) {
						this.parentNode.insertBefore(elem, this);
					}
				});
			},

			after: function after() {
				return domManip(this, arguments, function (elem) {
					if (this.parentNode) {
						this.parentNode.insertBefore(elem, this.nextSibling);
					}
				});
			},

			empty: function empty() {
				var elem,
				    i = 0;

				for (; (elem = this[i]) != null; i++) {
					if (elem.nodeType === 1) {

						// Prevent memory leaks
						jQuery.cleanData(getAll(elem, false));

						// Remove any remaining nodes
						elem.textContent = "";
					}
				}

				return this;
			},

			clone: function clone(dataAndEvents, deepDataAndEvents) {
				dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
				deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

				return this.map(function () {
					return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
				});
			},

			html: function html(value) {
				return access(this, function (value) {
					var elem = this[0] || {},
					    i = 0,
					    l = this.length;

					if (value === undefined && elem.nodeType === 1) {
						return elem.innerHTML;
					}

					// See if we can take a shortcut and just use innerHTML
					if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {

						value = jQuery.htmlPrefilter(value);

						try {
							for (; i < l; i++) {
								elem = this[i] || {};

								// Remove element nodes and prevent memory leaks
								if (elem.nodeType === 1) {
									jQuery.cleanData(getAll(elem, false));
									elem.innerHTML = value;
								}
							}

							elem = 0;

							// If using innerHTML throws an exception, use the fallback method
						} catch (e) {}
					}

					if (elem) {
						this.empty().append(value);
					}
				}, null, value, arguments.length);
			},

			replaceWith: function replaceWith() {
				var ignored = [];

				// Make the changes, replacing each non-ignored context element with the new content
				return domManip(this, arguments, function (elem) {
					var parent = this.parentNode;

					if (jQuery.inArray(this, ignored) < 0) {
						jQuery.cleanData(getAll(this));
						if (parent) {
							parent.replaceChild(elem, this);
						}
					}

					// Force callback invocation
				}, ignored);
			}
		});

		jQuery.each({
			appendTo: "append",
			prependTo: "prepend",
			insertBefore: "before",
			insertAfter: "after",
			replaceAll: "replaceWith"
		}, function (name, original) {
			jQuery.fn[name] = function (selector) {
				var elems,
				    ret = [],
				    insert = jQuery(selector),
				    last = insert.length - 1,
				    i = 0;

				for (; i <= last; i++) {
					elems = i === last ? this : this.clone(true);
					jQuery(insert[i])[original](elems);

					// Support: Android <=4.0 only, PhantomJS 1 only
					// .get() because push.apply(_, arraylike) throws on ancient WebKit
					push.apply(ret, elems.get());
				}

				return this.pushStack(ret);
			};
		});
		var rmargin = /^margin/;

		var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");

		var getStyles = function getStyles(elem) {

			// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
			// IE throws on elements created in popups
			// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
			var view = elem.ownerDocument.defaultView;

			if (!view || !view.opener) {
				view = window;
			}

			return view.getComputedStyle(elem);
		};

		(function () {

			// Executing both pixelPosition & boxSizingReliable tests require only one layout
			// so they're executed at the same time to save the second computation.
			function computeStyleTests() {

				// This is a singleton, we need to execute it only once
				if (!div) {
					return;
				}

				div.style.cssText = "box-sizing:border-box;" + "position:relative;display:block;" + "margin:auto;border:1px;padding:1px;" + "top:1%;width:50%";
				div.innerHTML = "";
				documentElement.appendChild(container);

				var divStyle = window.getComputedStyle(div);
				pixelPositionVal = divStyle.top !== "1%";

				// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
				reliableMarginLeftVal = divStyle.marginLeft === "2px";
				boxSizingReliableVal = divStyle.width === "4px";

				// Support: Android 4.0 - 4.3 only
				// Some styles come back with percentage values, even though they shouldn't
				div.style.marginRight = "50%";
				pixelMarginRightVal = divStyle.marginRight === "4px";

				documentElement.removeChild(container);

				// Nullify the div so it wouldn't be stored in the memory and
				// it will also be a sign that checks already performed
				div = null;
			}

			var pixelPositionVal,
			    boxSizingReliableVal,
			    pixelMarginRightVal,
			    reliableMarginLeftVal,
			    container = document.createElement("div"),
			    div = document.createElement("div");

			// Finish early in limited (non-browser) environments
			if (!div.style) {
				return;
			}

			// Support: IE <=9 - 11 only
			// Style of cloned element affects source element cloned (#8908)
			div.style.backgroundClip = "content-box";
			div.cloneNode(true).style.backgroundClip = "";
			support.clearCloneStyle = div.style.backgroundClip === "content-box";

			container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" + "padding:0;margin-top:1px;position:absolute";
			container.appendChild(div);

			jQuery.extend(support, {
				pixelPosition: function pixelPosition() {
					computeStyleTests();
					return pixelPositionVal;
				},
				boxSizingReliable: function boxSizingReliable() {
					computeStyleTests();
					return boxSizingReliableVal;
				},
				pixelMarginRight: function pixelMarginRight() {
					computeStyleTests();
					return pixelMarginRightVal;
				},
				reliableMarginLeft: function reliableMarginLeft() {
					computeStyleTests();
					return reliableMarginLeftVal;
				}
			});
		})();

		function curCSS(elem, name, computed) {
			var width,
			    minWidth,
			    maxWidth,
			    ret,


			// Support: Firefox 51+
			// Retrieving style before computed somehow
			// fixes an issue with getting wrong values
			// on detached elements
			style = elem.style;

			computed = computed || getStyles(elem);

			// getPropertyValue is needed for:
			//   .css('filter') (IE 9 only, #12537)
			//   .css('--customProperty) (#3144)
			if (computed) {
				ret = computed.getPropertyValue(name) || computed[name];

				if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
					ret = jQuery.style(elem, name);
				}

				// A tribute to the "awesome hack by Dean Edwards"
				// Android Browser returns percentage for some values,
				// but width seems to be reliably pixels.
				// This is against the CSSOM draft spec:
				// https://drafts.csswg.org/cssom/#resolved-values
				if (!support.pixelMarginRight() && rnumnonpx.test(ret) && rmargin.test(name)) {

					// Remember the original values
					width = style.width;
					minWidth = style.minWidth;
					maxWidth = style.maxWidth;

					// Put in the new values to get a computed value out
					style.minWidth = style.maxWidth = style.width = ret;
					ret = computed.width;

					// Revert the changed values
					style.width = width;
					style.minWidth = minWidth;
					style.maxWidth = maxWidth;
				}
			}

			return ret !== undefined ?

			// Support: IE <=9 - 11 only
			// IE returns zIndex value as an integer.
			ret + "" : ret;
		}

		function addGetHookIf(conditionFn, hookFn) {

			// Define the hook, we'll check on the first run if it's really needed.
			return {
				get: function get() {
					if (conditionFn()) {

						// Hook not needed (or it's not possible to use it due
						// to missing dependency), remove it.
						delete this.get;
						return;
					}

					// Hook needed; redefine it so that the support test is not executed again.
					return (this.get = hookFn).apply(this, arguments);
				}
			};
		}

		var

		// Swappable if display is none or starts with table
		// except "table", "table-cell", or "table-caption"
		// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
		rdisplayswap = /^(none|table(?!-c[ea]).+)/,
		    rcustomProp = /^--/,
		    cssShow = { position: "absolute", visibility: "hidden", display: "block" },
		    cssNormalTransform = {
			letterSpacing: "0",
			fontWeight: "400"
		},
		    cssPrefixes = ["Webkit", "Moz", "ms"],
		    emptyStyle = document.createElement("div").style;

		// Return a css property mapped to a potentially vendor prefixed property
		function vendorPropName(name) {

			// Shortcut for names that are not vendor prefixed
			if (name in emptyStyle) {
				return name;
			}

			// Check for vendor prefixed names
			var capName = name[0].toUpperCase() + name.slice(1),
			    i = cssPrefixes.length;

			while (i--) {
				name = cssPrefixes[i] + capName;
				if (name in emptyStyle) {
					return name;
				}
			}
		}

		// Return a property mapped along what jQuery.cssProps suggests or to
		// a vendor prefixed property.
		function finalPropName(name) {
			var ret = jQuery.cssProps[name];
			if (!ret) {
				ret = jQuery.cssProps[name] = vendorPropName(name) || name;
			}
			return ret;
		}

		function setPositiveNumber(elem, value, subtract) {

			// Any relative (+/-) values have already been
			// normalized at this point
			var matches = rcssNum.exec(value);
			return matches ?

			// Guard against undefined "subtract", e.g., when used as in cssHooks
			Math.max(0, matches[2] - (subtract || 0)) + (matches[3] || "px") : value;
		}

		function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
			var i,
			    val = 0;

			// If we already have the right measurement, avoid augmentation
			if (extra === (isBorderBox ? "border" : "content")) {
				i = 4;

				// Otherwise initialize for horizontal or vertical properties
			} else {
				i = name === "width" ? 1 : 0;
			}

			for (; i < 4; i += 2) {

				// Both box models exclude margin, so add it if we want it
				if (extra === "margin") {
					val += jQuery.css(elem, extra + cssExpand[i], true, styles);
				}

				if (isBorderBox) {

					// border-box includes padding, so remove it if we want content
					if (extra === "content") {
						val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
					}

					// At this point, extra isn't border nor margin, so remove border
					if (extra !== "margin") {
						val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
					}
				} else {

					// At this point, extra isn't content, so add padding
					val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);

					// At this point, extra isn't content nor padding, so add border
					if (extra !== "padding") {
						val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
					}
				}
			}

			return val;
		}

		function getWidthOrHeight(elem, name, extra) {

			// Start with computed style
			var valueIsBorderBox,
			    styles = getStyles(elem),
			    val = curCSS(elem, name, styles),
			    isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box";

			// Computed unit is not pixels. Stop here and return.
			if (rnumnonpx.test(val)) {
				return val;
			}

			// Check for style in case a browser which returns unreliable values
			// for getComputedStyle silently falls back to the reliable elem.style
			valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);

			// Fall back to offsetWidth/Height when value is "auto"
			// This happens for inline elements with no explicit setting (gh-3571)
			if (val === "auto") {
				val = elem["offset" + name[0].toUpperCase() + name.slice(1)];
			}

			// Normalize "", auto, and prepare for extra
			val = parseFloat(val) || 0;

			// Use the active box-sizing model to add/subtract irrelevant styles
			return val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles) + "px";
		}

		jQuery.extend({

			// Add in style property hooks for overriding the default
			// behavior of getting and setting a style property
			cssHooks: {
				opacity: {
					get: function get(elem, computed) {
						if (computed) {

							// We should always get a number back from opacity
							var ret = curCSS(elem, "opacity");
							return ret === "" ? "1" : ret;
						}
					}
				}
			},

			// Don't automatically add "px" to these possibly-unitless properties
			cssNumber: {
				"animationIterationCount": true,
				"columnCount": true,
				"fillOpacity": true,
				"flexGrow": true,
				"flexShrink": true,
				"fontWeight": true,
				"lineHeight": true,
				"opacity": true,
				"order": true,
				"orphans": true,
				"widows": true,
				"zIndex": true,
				"zoom": true
			},

			// Add in properties whose names you wish to fix before
			// setting or getting the value
			cssProps: {
				"float": "cssFloat"
			},

			// Get and set the style property on a DOM Node
			style: function style(elem, name, value, extra) {

				// Don't set styles on text and comment nodes
				if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
					return;
				}

				// Make sure that we're working with the right name
				var ret,
				    type,
				    hooks,
				    origName = jQuery.camelCase(name),
				    isCustomProp = rcustomProp.test(name),
				    style = elem.style;

				// Make sure that we're working with the right name. We don't
				// want to query the value if it is a CSS custom property
				// since they are user-defined.
				if (!isCustomProp) {
					name = finalPropName(origName);
				}

				// Gets hook for the prefixed version, then unprefixed version
				hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];

				// Check if we're setting a value
				if (value !== undefined) {
					type = typeof value === "undefined" ? "undefined" : _typeof(value);

					// Convert "+=" or "-=" to relative numbers (#7345)
					if (type === "string" && (ret = rcssNum.exec(value)) && ret[1]) {
						value = adjustCSS(elem, name, ret);

						// Fixes bug #9237
						type = "number";
					}

					// Make sure that null and NaN values aren't set (#7116)
					if (value == null || value !== value) {
						return;
					}

					// If a number was passed in, add the unit (except for certain CSS properties)
					if (type === "number") {
						value += ret && ret[3] || (jQuery.cssNumber[origName] ? "" : "px");
					}

					// background-* props affect original clone's values
					if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
						style[name] = "inherit";
					}

					// If a hook was provided, use that value, otherwise just set the specified value
					if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {

						if (isCustomProp) {
							style.setProperty(name, value);
						} else {
							style[name] = value;
						}
					}
				} else {

					// If a hook was provided get the non-computed value from there
					if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {

						return ret;
					}

					// Otherwise just get the value from the style object
					return style[name];
				}
			},

			css: function css(elem, name, extra, styles) {
				var val,
				    num,
				    hooks,
				    origName = jQuery.camelCase(name),
				    isCustomProp = rcustomProp.test(name);

				// Make sure that we're working with the right name. We don't
				// want to modify the value if it is a CSS custom property
				// since they are user-defined.
				if (!isCustomProp) {
					name = finalPropName(origName);
				}

				// Try prefixed name followed by the unprefixed name
				hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];

				// If a hook was provided get the computed value from there
				if (hooks && "get" in hooks) {
					val = hooks.get(elem, true, extra);
				}

				// Otherwise, if a way to get the computed value exists, use that
				if (val === undefined) {
					val = curCSS(elem, name, styles);
				}

				// Convert "normal" to computed value
				if (val === "normal" && name in cssNormalTransform) {
					val = cssNormalTransform[name];
				}

				// Make numeric if forced or a qualifier was provided and val looks numeric
				if (extra === "" || extra) {
					num = parseFloat(val);
					return extra === true || isFinite(num) ? num || 0 : val;
				}

				return val;
			}
		});

		jQuery.each(["height", "width"], function (i, name) {
			jQuery.cssHooks[name] = {
				get: function get(elem, computed, extra) {
					if (computed) {

						// Certain elements can have dimension info if we invisibly show them
						// but it must have a current display style that would benefit
						return rdisplayswap.test(jQuery.css(elem, "display")) && (

						// Support: Safari 8+
						// Table columns in Safari have non-zero offsetWidth & zero
						// getBoundingClientRect().width unless display is changed.
						// Support: IE <=11 only
						// Running getBoundingClientRect on a disconnected node
						// in IE throws an error.
						!elem.getClientRects().length || !elem.getBoundingClientRect().width) ? swap(elem, cssShow, function () {
							return getWidthOrHeight(elem, name, extra);
						}) : getWidthOrHeight(elem, name, extra);
					}
				},

				set: function set(elem, value, extra) {
					var matches,
					    styles = extra && getStyles(elem),
					    subtract = extra && augmentWidthOrHeight(elem, name, extra, jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles);

					// Convert to pixels if value adjustment is needed
					if (subtract && (matches = rcssNum.exec(value)) && (matches[3] || "px") !== "px") {

						elem.style[name] = value;
						value = jQuery.css(elem, name);
					}

					return setPositiveNumber(elem, value, subtract);
				}
			};
		});

		jQuery.cssHooks.marginLeft = addGetHookIf(support.reliableMarginLeft, function (elem, computed) {
			if (computed) {
				return (parseFloat(curCSS(elem, "marginLeft")) || elem.getBoundingClientRect().left - swap(elem, { marginLeft: 0 }, function () {
					return elem.getBoundingClientRect().left;
				})) + "px";
			}
		});

		// These hooks are used by animate to expand properties
		jQuery.each({
			margin: "",
			padding: "",
			border: "Width"
		}, function (prefix, suffix) {
			jQuery.cssHooks[prefix + suffix] = {
				expand: function expand(value) {
					var i = 0,
					    expanded = {},


					// Assumes a single number if not a string
					parts = typeof value === "string" ? value.split(" ") : [value];

					for (; i < 4; i++) {
						expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
					}

					return expanded;
				}
			};

			if (!rmargin.test(prefix)) {
				jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
			}
		});

		jQuery.fn.extend({
			css: function css(name, value) {
				return access(this, function (elem, name, value) {
					var styles,
					    len,
					    map = {},
					    i = 0;

					if (Array.isArray(name)) {
						styles = getStyles(elem);
						len = name.length;

						for (; i < len; i++) {
							map[name[i]] = jQuery.css(elem, name[i], false, styles);
						}

						return map;
					}

					return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
				}, name, value, arguments.length > 1);
			}
		});

		function Tween(elem, options, prop, end, easing) {
			return new Tween.prototype.init(elem, options, prop, end, easing);
		}
		jQuery.Tween = Tween;

		Tween.prototype = {
			constructor: Tween,
			init: function init(elem, options, prop, end, easing, unit) {
				this.elem = elem;
				this.prop = prop;
				this.easing = easing || jQuery.easing._default;
				this.options = options;
				this.start = this.now = this.cur();
				this.end = end;
				this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
			},
			cur: function cur() {
				var hooks = Tween.propHooks[this.prop];

				return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
			},
			run: function run(percent) {
				var eased,
				    hooks = Tween.propHooks[this.prop];

				if (this.options.duration) {
					this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
				} else {
					this.pos = eased = percent;
				}
				this.now = (this.end - this.start) * eased + this.start;

				if (this.options.step) {
					this.options.step.call(this.elem, this.now, this);
				}

				if (hooks && hooks.set) {
					hooks.set(this);
				} else {
					Tween.propHooks._default.set(this);
				}
				return this;
			}
		};

		Tween.prototype.init.prototype = Tween.prototype;

		Tween.propHooks = {
			_default: {
				get: function get(tween) {
					var result;

					// Use a property on the element directly when it is not a DOM element,
					// or when there is no matching style property that exists.
					if (tween.elem.nodeType !== 1 || tween.elem[tween.prop] != null && tween.elem.style[tween.prop] == null) {
						return tween.elem[tween.prop];
					}

					// Passing an empty string as a 3rd parameter to .css will automatically
					// attempt a parseFloat and fallback to a string if the parse fails.
					// Simple values such as "10px" are parsed to Float;
					// complex values such as "rotate(1rad)" are returned as-is.
					result = jQuery.css(tween.elem, tween.prop, "");

					// Empty strings, null, undefined and "auto" are converted to 0.
					return !result || result === "auto" ? 0 : result;
				},
				set: function set(tween) {

					// Use step hook for back compat.
					// Use cssHook if its there.
					// Use .style if available and use plain properties where available.
					if (jQuery.fx.step[tween.prop]) {
						jQuery.fx.step[tween.prop](tween);
					} else if (tween.elem.nodeType === 1 && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
						jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
					} else {
						tween.elem[tween.prop] = tween.now;
					}
				}
			}
		};

		// Support: IE <=9 only
		// Panic based approach to setting things on disconnected nodes
		Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
			set: function set(tween) {
				if (tween.elem.nodeType && tween.elem.parentNode) {
					tween.elem[tween.prop] = tween.now;
				}
			}
		};

		jQuery.easing = {
			linear: function linear(p) {
				return p;
			},
			swing: function swing(p) {
				return 0.5 - Math.cos(p * Math.PI) / 2;
			},
			_default: "swing"
		};

		jQuery.fx = Tween.prototype.init;

		// Back compat <1.8 extension point
		jQuery.fx.step = {};

		var fxNow,
		    inProgress,
		    rfxtypes = /^(?:toggle|show|hide)$/,
		    rrun = /queueHooks$/;

		function schedule() {
			if (inProgress) {
				if (document.hidden === false && window.requestAnimationFrame) {
					window.requestAnimationFrame(schedule);
				} else {
					window.setTimeout(schedule, jQuery.fx.interval);
				}

				jQuery.fx.tick();
			}
		}

		// Animations created synchronously will run synchronously
		function createFxNow() {
			window.setTimeout(function () {
				fxNow = undefined;
			});
			return fxNow = jQuery.now();
		}

		// Generate parameters to create a standard animation
		function genFx(type, includeWidth) {
			var which,
			    i = 0,
			    attrs = { height: type };

			// If we include width, step value is 1 to do all cssExpand values,
			// otherwise step value is 2 to skip over Left and Right
			includeWidth = includeWidth ? 1 : 0;
			for (; i < 4; i += 2 - includeWidth) {
				which = cssExpand[i];
				attrs["margin" + which] = attrs["padding" + which] = type;
			}

			if (includeWidth) {
				attrs.opacity = attrs.width = type;
			}

			return attrs;
		}

		function createTween(value, prop, animation) {
			var tween,
			    collection = (Animation.tweeners[prop] || []).concat(Animation.tweeners["*"]),
			    index = 0,
			    length = collection.length;
			for (; index < length; index++) {
				if (tween = collection[index].call(animation, prop, value)) {

					// We're done with this property
					return tween;
				}
			}
		}

		function defaultPrefilter(elem, props, opts) {
			var prop,
			    value,
			    toggle,
			    hooks,
			    oldfire,
			    propTween,
			    restoreDisplay,
			    display,
			    isBox = "width" in props || "height" in props,
			    anim = this,
			    orig = {},
			    style = elem.style,
			    hidden = elem.nodeType && isHiddenWithinTree(elem),
			    dataShow = dataPriv.get(elem, "fxshow");

			// Queue-skipping animations hijack the fx hooks
			if (!opts.queue) {
				hooks = jQuery._queueHooks(elem, "fx");
				if (hooks.unqueued == null) {
					hooks.unqueued = 0;
					oldfire = hooks.empty.fire;
					hooks.empty.fire = function () {
						if (!hooks.unqueued) {
							oldfire();
						}
					};
				}
				hooks.unqueued++;

				anim.always(function () {

					// Ensure the complete handler is called before this completes
					anim.always(function () {
						hooks.unqueued--;
						if (!jQuery.queue(elem, "fx").length) {
							hooks.empty.fire();
						}
					});
				});
			}

			// Detect show/hide animations
			for (prop in props) {
				value = props[prop];
				if (rfxtypes.test(value)) {
					delete props[prop];
					toggle = toggle || value === "toggle";
					if (value === (hidden ? "hide" : "show")) {

						// Pretend to be hidden if this is a "show" and
						// there is still data from a stopped show/hide
						if (value === "show" && dataShow && dataShow[prop] !== undefined) {
							hidden = true;

							// Ignore all other no-op show/hide data
						} else {
							continue;
						}
					}
					orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
				}
			}

			// Bail out if this is a no-op like .hide().hide()
			propTween = !jQuery.isEmptyObject(props);
			if (!propTween && jQuery.isEmptyObject(orig)) {
				return;
			}

			// Restrict "overflow" and "display" styles during box animations
			if (isBox && elem.nodeType === 1) {

				// Support: IE <=9 - 11, Edge 12 - 13
				// Record all 3 overflow attributes because IE does not infer the shorthand
				// from identically-valued overflowX and overflowY
				opts.overflow = [style.overflow, style.overflowX, style.overflowY];

				// Identify a display type, preferring old show/hide data over the CSS cascade
				restoreDisplay = dataShow && dataShow.display;
				if (restoreDisplay == null) {
					restoreDisplay = dataPriv.get(elem, "display");
				}
				display = jQuery.css(elem, "display");
				if (display === "none") {
					if (restoreDisplay) {
						display = restoreDisplay;
					} else {

						// Get nonempty value(s) by temporarily forcing visibility
						showHide([elem], true);
						restoreDisplay = elem.style.display || restoreDisplay;
						display = jQuery.css(elem, "display");
						showHide([elem]);
					}
				}

				// Animate inline elements as inline-block
				if (display === "inline" || display === "inline-block" && restoreDisplay != null) {
					if (jQuery.css(elem, "float") === "none") {

						// Restore the original display value at the end of pure show/hide animations
						if (!propTween) {
							anim.done(function () {
								style.display = restoreDisplay;
							});
							if (restoreDisplay == null) {
								display = style.display;
								restoreDisplay = display === "none" ? "" : display;
							}
						}
						style.display = "inline-block";
					}
				}
			}

			if (opts.overflow) {
				style.overflow = "hidden";
				anim.always(function () {
					style.overflow = opts.overflow[0];
					style.overflowX = opts.overflow[1];
					style.overflowY = opts.overflow[2];
				});
			}

			// Implement show/hide animations
			propTween = false;
			for (prop in orig) {

				// General show/hide setup for this element animation
				if (!propTween) {
					if (dataShow) {
						if ("hidden" in dataShow) {
							hidden = dataShow.hidden;
						}
					} else {
						dataShow = dataPriv.access(elem, "fxshow", { display: restoreDisplay });
					}

					// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
					if (toggle) {
						dataShow.hidden = !hidden;
					}

					// Show elements before animating them
					if (hidden) {
						showHide([elem], true);
					}

					/* eslint-disable no-loop-func */

					anim.done(function () {

						/* eslint-enable no-loop-func */

						// The final step of a "hide" animation is actually hiding the element
						if (!hidden) {
							showHide([elem]);
						}
						dataPriv.remove(elem, "fxshow");
						for (prop in orig) {
							jQuery.style(elem, prop, orig[prop]);
						}
					});
				}

				// Per-property setup
				propTween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
				if (!(prop in dataShow)) {
					dataShow[prop] = propTween.start;
					if (hidden) {
						propTween.end = propTween.start;
						propTween.start = 0;
					}
				}
			}
		}

		function propFilter(props, specialEasing) {
			var index, name, easing, value, hooks;

			// camelCase, specialEasing and expand cssHook pass
			for (index in props) {
				name = jQuery.camelCase(index);
				easing = specialEasing[name];
				value = props[index];
				if (Array.isArray(value)) {
					easing = value[1];
					value = props[index] = value[0];
				}

				if (index !== name) {
					props[name] = value;
					delete props[index];
				}

				hooks = jQuery.cssHooks[name];
				if (hooks && "expand" in hooks) {
					value = hooks.expand(value);
					delete props[name];

					// Not quite $.extend, this won't overwrite existing keys.
					// Reusing 'index' because we have the correct "name"
					for (index in value) {
						if (!(index in props)) {
							props[index] = value[index];
							specialEasing[index] = easing;
						}
					}
				} else {
					specialEasing[name] = easing;
				}
			}
		}

		function Animation(elem, properties, options) {
			var result,
			    stopped,
			    index = 0,
			    length = Animation.prefilters.length,
			    deferred = jQuery.Deferred().always(function () {

				// Don't match elem in the :animated selector
				delete tick.elem;
			}),
			    tick = function tick() {
				if (stopped) {
					return false;
				}
				var currentTime = fxNow || createFxNow(),
				    remaining = Math.max(0, animation.startTime + animation.duration - currentTime),


				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				    percent = 1 - temp,
				    index = 0,
				    length = animation.tweens.length;

				for (; index < length; index++) {
					animation.tweens[index].run(percent);
				}

				deferred.notifyWith(elem, [animation, percent, remaining]);

				// If there's more to do, yield
				if (percent < 1 && length) {
					return remaining;
				}

				// If this was an empty animation, synthesize a final progress notification
				if (!length) {
					deferred.notifyWith(elem, [animation, 1, 0]);
				}

				// Resolve the animation and report its conclusion
				deferred.resolveWith(elem, [animation]);
				return false;
			},
			    animation = deferred.promise({
				elem: elem,
				props: jQuery.extend({}, properties),
				opts: jQuery.extend(true, {
					specialEasing: {},
					easing: jQuery.easing._default
				}, options),
				originalProperties: properties,
				originalOptions: options,
				startTime: fxNow || createFxNow(),
				duration: options.duration,
				tweens: [],
				createTween: function createTween(prop, end) {
					var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
					animation.tweens.push(tween);
					return tween;
				},
				stop: function stop(gotoEnd) {
					var index = 0,


					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
					if (stopped) {
						return this;
					}
					stopped = true;
					for (; index < length; index++) {
						animation.tweens[index].run(1);
					}

					// Resolve when we played the last frame; otherwise, reject
					if (gotoEnd) {
						deferred.notifyWith(elem, [animation, 1, 0]);
						deferred.resolveWith(elem, [animation, gotoEnd]);
					} else {
						deferred.rejectWith(elem, [animation, gotoEnd]);
					}
					return this;
				}
			}),
			    props = animation.props;

			propFilter(props, animation.opts.specialEasing);

			for (; index < length; index++) {
				result = Animation.prefilters[index].call(animation, elem, props, animation.opts);
				if (result) {
					if (jQuery.isFunction(result.stop)) {
						jQuery._queueHooks(animation.elem, animation.opts.queue).stop = jQuery.proxy(result.stop, result);
					}
					return result;
				}
			}

			jQuery.map(props, createTween, animation);

			if (jQuery.isFunction(animation.opts.start)) {
				animation.opts.start.call(elem, animation);
			}

			// Attach callbacks from options
			animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);

			jQuery.fx.timer(jQuery.extend(tick, {
				elem: elem,
				anim: animation,
				queue: animation.opts.queue
			}));

			return animation;
		}

		jQuery.Animation = jQuery.extend(Animation, {

			tweeners: {
				"*": [function (prop, value) {
					var tween = this.createTween(prop, value);
					adjustCSS(tween.elem, prop, rcssNum.exec(value), tween);
					return tween;
				}]
			},

			tweener: function tweener(props, callback) {
				if (jQuery.isFunction(props)) {
					callback = props;
					props = ["*"];
				} else {
					props = props.match(rnothtmlwhite);
				}

				var prop,
				    index = 0,
				    length = props.length;

				for (; index < length; index++) {
					prop = props[index];
					Animation.tweeners[prop] = Animation.tweeners[prop] || [];
					Animation.tweeners[prop].unshift(callback);
				}
			},

			prefilters: [defaultPrefilter],

			prefilter: function prefilter(callback, prepend) {
				if (prepend) {
					Animation.prefilters.unshift(callback);
				} else {
					Animation.prefilters.push(callback);
				}
			}
		});

		jQuery.speed = function (speed, easing, fn) {
			var opt = speed && (typeof speed === "undefined" ? "undefined" : _typeof(speed)) === "object" ? jQuery.extend({}, speed) : {
				complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
				duration: speed,
				easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
			};

			// Go to the end state if fx are off
			if (jQuery.fx.off) {
				opt.duration = 0;
			} else {
				if (typeof opt.duration !== "number") {
					if (opt.duration in jQuery.fx.speeds) {
						opt.duration = jQuery.fx.speeds[opt.duration];
					} else {
						opt.duration = jQuery.fx.speeds._default;
					}
				}
			}

			// Normalize opt.queue - true/undefined/null -> "fx"
			if (opt.queue == null || opt.queue === true) {
				opt.queue = "fx";
			}

			// Queueing
			opt.old = opt.complete;

			opt.complete = function () {
				if (jQuery.isFunction(opt.old)) {
					opt.old.call(this);
				}

				if (opt.queue) {
					jQuery.dequeue(this, opt.queue);
				}
			};

			return opt;
		};

		jQuery.fn.extend({
			fadeTo: function fadeTo(speed, to, easing, callback) {

				// Show any hidden elements after setting opacity to 0
				return this.filter(isHiddenWithinTree).css("opacity", 0).show()

				// Animate to the value specified
				.end().animate({ opacity: to }, speed, easing, callback);
			},
			animate: function animate(prop, speed, easing, callback) {
				var empty = jQuery.isEmptyObject(prop),
				    optall = jQuery.speed(speed, easing, callback),
				    doAnimation = function doAnimation() {

					// Operate on a copy of prop so per-property easing won't be lost
					var anim = Animation(this, jQuery.extend({}, prop), optall);

					// Empty animations, or finishing resolves immediately
					if (empty || dataPriv.get(this, "finish")) {
						anim.stop(true);
					}
				};
				doAnimation.finish = doAnimation;

				return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
			},
			stop: function stop(type, clearQueue, gotoEnd) {
				var stopQueue = function stopQueue(hooks) {
					var stop = hooks.stop;
					delete hooks.stop;
					stop(gotoEnd);
				};

				if (typeof type !== "string") {
					gotoEnd = clearQueue;
					clearQueue = type;
					type = undefined;
				}
				if (clearQueue && type !== false) {
					this.queue(type || "fx", []);
				}

				return this.each(function () {
					var dequeue = true,
					    index = type != null && type + "queueHooks",
					    timers = jQuery.timers,
					    data = dataPriv.get(this);

					if (index) {
						if (data[index] && data[index].stop) {
							stopQueue(data[index]);
						}
					} else {
						for (index in data) {
							if (data[index] && data[index].stop && rrun.test(index)) {
								stopQueue(data[index]);
							}
						}
					}

					for (index = timers.length; index--;) {
						if (timers[index].elem === this && (type == null || timers[index].queue === type)) {

							timers[index].anim.stop(gotoEnd);
							dequeue = false;
							timers.splice(index, 1);
						}
					}

					// Start the next in the queue if the last step wasn't forced.
					// Timers currently will call their complete callbacks, which
					// will dequeue but only if they were gotoEnd.
					if (dequeue || !gotoEnd) {
						jQuery.dequeue(this, type);
					}
				});
			},
			finish: function finish(type) {
				if (type !== false) {
					type = type || "fx";
				}
				return this.each(function () {
					var index,
					    data = dataPriv.get(this),
					    queue = data[type + "queue"],
					    hooks = data[type + "queueHooks"],
					    timers = jQuery.timers,
					    length = queue ? queue.length : 0;

					// Enable finishing flag on private data
					data.finish = true;

					// Empty the queue first
					jQuery.queue(this, type, []);

					if (hooks && hooks.stop) {
						hooks.stop.call(this, true);
					}

					// Look for any active animations, and finish them
					for (index = timers.length; index--;) {
						if (timers[index].elem === this && timers[index].queue === type) {
							timers[index].anim.stop(true);
							timers.splice(index, 1);
						}
					}

					// Look for any animations in the old queue and finish them
					for (index = 0; index < length; index++) {
						if (queue[index] && queue[index].finish) {
							queue[index].finish.call(this);
						}
					}

					// Turn off finishing flag
					delete data.finish;
				});
			}
		});

		jQuery.each(["toggle", "show", "hide"], function (i, name) {
			var cssFn = jQuery.fn[name];
			jQuery.fn[name] = function (speed, easing, callback) {
				return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
			};
		});

		// Generate shortcuts for custom animations
		jQuery.each({
			slideDown: genFx("show"),
			slideUp: genFx("hide"),
			slideToggle: genFx("toggle"),
			fadeIn: { opacity: "show" },
			fadeOut: { opacity: "hide" },
			fadeToggle: { opacity: "toggle" }
		}, function (name, props) {
			jQuery.fn[name] = function (speed, easing, callback) {
				return this.animate(props, speed, easing, callback);
			};
		});

		jQuery.timers = [];
		jQuery.fx.tick = function () {
			var timer,
			    i = 0,
			    timers = jQuery.timers;

			fxNow = jQuery.now();

			for (; i < timers.length; i++) {
				timer = timers[i];

				// Run the timer and safely remove it when done (allowing for external removal)
				if (!timer() && timers[i] === timer) {
					timers.splice(i--, 1);
				}
			}

			if (!timers.length) {
				jQuery.fx.stop();
			}
			fxNow = undefined;
		};

		jQuery.fx.timer = function (timer) {
			jQuery.timers.push(timer);
			jQuery.fx.start();
		};

		jQuery.fx.interval = 13;
		jQuery.fx.start = function () {
			if (inProgress) {
				return;
			}

			inProgress = true;
			schedule();
		};

		jQuery.fx.stop = function () {
			inProgress = null;
		};

		jQuery.fx.speeds = {
			slow: 600,
			fast: 200,

			// Default speed
			_default: 400
		};

		// Based off of the plugin by Clint Helfers, with permission.
		// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
		jQuery.fn.delay = function (time, type) {
			time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
			type = type || "fx";

			return this.queue(type, function (next, hooks) {
				var timeout = window.setTimeout(next, time);
				hooks.stop = function () {
					window.clearTimeout(timeout);
				};
			});
		};

		(function () {
			var input = document.createElement("input"),
			    select = document.createElement("select"),
			    opt = select.appendChild(document.createElement("option"));

			input.type = "checkbox";

			// Support: Android <=4.3 only
			// Default value for a checkbox should be "on"
			support.checkOn = input.value !== "";

			// Support: IE <=11 only
			// Must access selectedIndex to make default options select
			support.optSelected = opt.selected;

			// Support: IE <=11 only
			// An input loses its value after becoming a radio
			input = document.createElement("input");
			input.value = "t";
			input.type = "radio";
			support.radioValue = input.value === "t";
		})();

		var boolHook,
		    attrHandle = jQuery.expr.attrHandle;

		jQuery.fn.extend({
			attr: function attr(name, value) {
				return access(this, jQuery.attr, name, value, arguments.length > 1);
			},

			removeAttr: function removeAttr(name) {
				return this.each(function () {
					jQuery.removeAttr(this, name);
				});
			}
		});

		jQuery.extend({
			attr: function attr(elem, name, value) {
				var ret,
				    hooks,
				    nType = elem.nodeType;

				// Don't get/set attributes on text, comment and attribute nodes
				if (nType === 3 || nType === 8 || nType === 2) {
					return;
				}

				// Fallback to prop when attributes are not supported
				if (typeof elem.getAttribute === "undefined") {
					return jQuery.prop(elem, name, value);
				}

				// Attribute hooks are determined by the lowercase version
				// Grab necessary hook if one is defined
				if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
					hooks = jQuery.attrHooks[name.toLowerCase()] || (jQuery.expr.match.bool.test(name) ? boolHook : undefined);
				}

				if (value !== undefined) {
					if (value === null) {
						jQuery.removeAttr(elem, name);
						return;
					}

					if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
						return ret;
					}

					elem.setAttribute(name, value + "");
					return value;
				}

				if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
					return ret;
				}

				ret = jQuery.find.attr(elem, name);

				// Non-existent attributes return null, we normalize to undefined
				return ret == null ? undefined : ret;
			},

			attrHooks: {
				type: {
					set: function set(elem, value) {
						if (!support.radioValue && value === "radio" && nodeName(elem, "input")) {
							var val = elem.value;
							elem.setAttribute("type", value);
							if (val) {
								elem.value = val;
							}
							return value;
						}
					}
				}
			},

			removeAttr: function removeAttr(elem, value) {
				var name,
				    i = 0,


				// Attribute names can contain non-HTML whitespace characters
				// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
				attrNames = value && value.match(rnothtmlwhite);

				if (attrNames && elem.nodeType === 1) {
					while (name = attrNames[i++]) {
						elem.removeAttribute(name);
					}
				}
			}
		});

		// Hooks for boolean attributes
		boolHook = {
			set: function set(elem, value, name) {
				if (value === false) {

					// Remove boolean attributes when set to false
					jQuery.removeAttr(elem, name);
				} else {
					elem.setAttribute(name, name);
				}
				return name;
			}
		};

		jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function (i, name) {
			var getter = attrHandle[name] || jQuery.find.attr;

			attrHandle[name] = function (elem, name, isXML) {
				var ret,
				    handle,
				    lowercaseName = name.toLowerCase();

				if (!isXML) {

					// Avoid an infinite loop by temporarily removing this function from the getter
					handle = attrHandle[lowercaseName];
					attrHandle[lowercaseName] = ret;
					ret = getter(elem, name, isXML) != null ? lowercaseName : null;
					attrHandle[lowercaseName] = handle;
				}
				return ret;
			};
		});

		var rfocusable = /^(?:input|select|textarea|button)$/i,
		    rclickable = /^(?:a|area)$/i;

		jQuery.fn.extend({
			prop: function prop(name, value) {
				return access(this, jQuery.prop, name, value, arguments.length > 1);
			},

			removeProp: function removeProp(name) {
				return this.each(function () {
					delete this[jQuery.propFix[name] || name];
				});
			}
		});

		jQuery.extend({
			prop: function prop(elem, name, value) {
				var ret,
				    hooks,
				    nType = elem.nodeType;

				// Don't get/set properties on text, comment and attribute nodes
				if (nType === 3 || nType === 8 || nType === 2) {
					return;
				}

				if (nType !== 1 || !jQuery.isXMLDoc(elem)) {

					// Fix name and attach hooks
					name = jQuery.propFix[name] || name;
					hooks = jQuery.propHooks[name];
				}

				if (value !== undefined) {
					if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
						return ret;
					}

					return elem[name] = value;
				}

				if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
					return ret;
				}

				return elem[name];
			},

			propHooks: {
				tabIndex: {
					get: function get(elem) {

						// Support: IE <=9 - 11 only
						// elem.tabIndex doesn't always return the
						// correct value when it hasn't been explicitly set
						// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
						// Use proper attribute retrieval(#12072)
						var tabindex = jQuery.find.attr(elem, "tabindex");

						if (tabindex) {
							return parseInt(tabindex, 10);
						}

						if (rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href) {
							return 0;
						}

						return -1;
					}
				}
			},

			propFix: {
				"for": "htmlFor",
				"class": "className"
			}
		});

		// Support: IE <=11 only
		// Accessing the selectedIndex property
		// forces the browser to respect setting selected
		// on the option
		// The getter ensures a default option is selected
		// when in an optgroup
		// eslint rule "no-unused-expressions" is disabled for this code
		// since it considers such accessions noop
		if (!support.optSelected) {
			jQuery.propHooks.selected = {
				get: function get(elem) {

					/* eslint no-unused-expressions: "off" */

					var parent = elem.parentNode;
					if (parent && parent.parentNode) {
						parent.parentNode.selectedIndex;
					}
					return null;
				},
				set: function set(elem) {

					/* eslint no-unused-expressions: "off" */

					var parent = elem.parentNode;
					if (parent) {
						parent.selectedIndex;

						if (parent.parentNode) {
							parent.parentNode.selectedIndex;
						}
					}
				}
			};
		}

		jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () {
			jQuery.propFix[this.toLowerCase()] = this;
		});

		// Strip and collapse whitespace according to HTML spec
		// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
		function stripAndCollapse(value) {
			var tokens = value.match(rnothtmlwhite) || [];
			return tokens.join(" ");
		}

		function getClass(elem) {
			return elem.getAttribute && elem.getAttribute("class") || "";
		}

		jQuery.fn.extend({
			addClass: function addClass(value) {
				var classes,
				    elem,
				    cur,
				    curValue,
				    clazz,
				    j,
				    finalValue,
				    i = 0;

				if (jQuery.isFunction(value)) {
					return this.each(function (j) {
						jQuery(this).addClass(value.call(this, j, getClass(this)));
					});
				}

				if (typeof value === "string" && value) {
					classes = value.match(rnothtmlwhite) || [];

					while (elem = this[i++]) {
						curValue = getClass(elem);
						cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

						if (cur) {
							j = 0;
							while (clazz = classes[j++]) {
								if (cur.indexOf(" " + clazz + " ") < 0) {
									cur += clazz + " ";
								}
							}

							// Only assign if different to avoid unneeded rendering.
							finalValue = stripAndCollapse(cur);
							if (curValue !== finalValue) {
								elem.setAttribute("class", finalValue);
							}
						}
					}
				}

				return this;
			},

			removeClass: function removeClass(value) {
				var classes,
				    elem,
				    cur,
				    curValue,
				    clazz,
				    j,
				    finalValue,
				    i = 0;

				if (jQuery.isFunction(value)) {
					return this.each(function (j) {
						jQuery(this).removeClass(value.call(this, j, getClass(this)));
					});
				}

				if (!arguments.length) {
					return this.attr("class", "");
				}

				if (typeof value === "string" && value) {
					classes = value.match(rnothtmlwhite) || [];

					while (elem = this[i++]) {
						curValue = getClass(elem);

						// This expression is here for better compressibility (see addClass)
						cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

						if (cur) {
							j = 0;
							while (clazz = classes[j++]) {

								// Remove *all* instances
								while (cur.indexOf(" " + clazz + " ") > -1) {
									cur = cur.replace(" " + clazz + " ", " ");
								}
							}

							// Only assign if different to avoid unneeded rendering.
							finalValue = stripAndCollapse(cur);
							if (curValue !== finalValue) {
								elem.setAttribute("class", finalValue);
							}
						}
					}
				}

				return this;
			},

			toggleClass: function toggleClass(value, stateVal) {
				var type = typeof value === "undefined" ? "undefined" : _typeof(value);

				if (typeof stateVal === "boolean" && type === "string") {
					return stateVal ? this.addClass(value) : this.removeClass(value);
				}

				if (jQuery.isFunction(value)) {
					return this.each(function (i) {
						jQuery(this).toggleClass(value.call(this, i, getClass(this), stateVal), stateVal);
					});
				}

				return this.each(function () {
					var className, i, self, classNames;

					if (type === "string") {

						// Toggle individual class names
						i = 0;
						self = jQuery(this);
						classNames = value.match(rnothtmlwhite) || [];

						while (className = classNames[i++]) {

							// Check each className given, space separated list
							if (self.hasClass(className)) {
								self.removeClass(className);
							} else {
								self.addClass(className);
							}
						}

						// Toggle whole class name
					} else if (value === undefined || type === "boolean") {
						className = getClass(this);
						if (className) {

							// Store className if set
							dataPriv.set(this, "__className__", className);
						}

						// If the element has a class name or if we're passed `false`,
						// then remove the whole classname (if there was one, the above saved it).
						// Otherwise bring back whatever was previously saved (if anything),
						// falling back to the empty string if nothing was stored.
						if (this.setAttribute) {
							this.setAttribute("class", className || value === false ? "" : dataPriv.get(this, "__className__") || "");
						}
					}
				});
			},

			hasClass: function hasClass(selector) {
				var className,
				    elem,
				    i = 0;

				className = " " + selector + " ";
				while (elem = this[i++]) {
					if (elem.nodeType === 1 && (" " + stripAndCollapse(getClass(elem)) + " ").indexOf(className) > -1) {
						return true;
					}
				}

				return false;
			}
		});

		var rreturn = /\r/g;

		jQuery.fn.extend({
			val: function val(value) {
				var hooks,
				    ret,
				    isFunction,
				    elem = this[0];

				if (!arguments.length) {
					if (elem) {
						hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];

						if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
							return ret;
						}

						ret = elem.value;

						// Handle most common string cases
						if (typeof ret === "string") {
							return ret.replace(rreturn, "");
						}

						// Handle cases where value is null/undef or number
						return ret == null ? "" : ret;
					}

					return;
				}

				isFunction = jQuery.isFunction(value);

				return this.each(function (i) {
					var val;

					if (this.nodeType !== 1) {
						return;
					}

					if (isFunction) {
						val = value.call(this, i, jQuery(this).val());
					} else {
						val = value;
					}

					// Treat null/undefined as ""; convert numbers to string
					if (val == null) {
						val = "";
					} else if (typeof val === "number") {
						val += "";
					} else if (Array.isArray(val)) {
						val = jQuery.map(val, function (value) {
							return value == null ? "" : value + "";
						});
					}

					hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];

					// If set returns undefined, fall back to normal setting
					if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
						this.value = val;
					}
				});
			}
		});

		jQuery.extend({
			valHooks: {
				option: {
					get: function get(elem) {

						var val = jQuery.find.attr(elem, "value");
						return val != null ? val :

						// Support: IE <=10 - 11 only
						// option.text throws exceptions (#14686, #14858)
						// Strip and collapse whitespace
						// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
						stripAndCollapse(jQuery.text(elem));
					}
				},
				select: {
					get: function get(elem) {
						var value,
						    option,
						    i,
						    options = elem.options,
						    index = elem.selectedIndex,
						    one = elem.type === "select-one",
						    values = one ? null : [],
						    max = one ? index + 1 : options.length;

						if (index < 0) {
							i = max;
						} else {
							i = one ? index : 0;
						}

						// Loop through all the selected options
						for (; i < max; i++) {
							option = options[i];

							// Support: IE <=9 only
							// IE8-9 doesn't update selected after form reset (#2551)
							if ((option.selected || i === index) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled && (!option.parentNode.disabled || !nodeName(option.parentNode, "optgroup"))) {

								// Get the specific value for the option
								value = jQuery(option).val();

								// We don't need an array for one selects
								if (one) {
									return value;
								}

								// Multi-Selects return an array
								values.push(value);
							}
						}

						return values;
					},

					set: function set(elem, value) {
						var optionSet,
						    option,
						    options = elem.options,
						    values = jQuery.makeArray(value),
						    i = options.length;

						while (i--) {
							option = options[i];

							/* eslint-disable no-cond-assign */

							if (option.selected = jQuery.inArray(jQuery.valHooks.option.get(option), values) > -1) {
								optionSet = true;
							}

							/* eslint-enable no-cond-assign */
						}

						// Force browsers to behave consistently when non-matching value is set
						if (!optionSet) {
							elem.selectedIndex = -1;
						}
						return values;
					}
				}
			}
		});

		// Radios and checkboxes getter/setter
		jQuery.each(["radio", "checkbox"], function () {
			jQuery.valHooks[this] = {
				set: function set(elem, value) {
					if (Array.isArray(value)) {
						return elem.checked = jQuery.inArray(jQuery(elem).val(), value) > -1;
					}
				}
			};
			if (!support.checkOn) {
				jQuery.valHooks[this].get = function (elem) {
					return elem.getAttribute("value") === null ? "on" : elem.value;
				};
			}
		});

		// Return jQuery for attributes-only inclusion


		var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

		jQuery.extend(jQuery.event, {

			trigger: function trigger(event, data, elem, onlyHandlers) {

				var i,
				    cur,
				    tmp,
				    bubbleType,
				    ontype,
				    handle,
				    special,
				    eventPath = [elem || document],
				    type = hasOwn.call(event, "type") ? event.type : event,
				    namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];

				cur = tmp = elem = elem || document;

				// Don't do events on text and comment nodes
				if (elem.nodeType === 3 || elem.nodeType === 8) {
					return;
				}

				// focus/blur morphs to focusin/out; ensure we're not firing them right now
				if (rfocusMorph.test(type + jQuery.event.triggered)) {
					return;
				}

				if (type.indexOf(".") > -1) {

					// Namespaced trigger; create a regexp to match event type in handle()
					namespaces = type.split(".");
					type = namespaces.shift();
					namespaces.sort();
				}
				ontype = type.indexOf(":") < 0 && "on" + type;

				// Caller can pass in a jQuery.Event object, Object, or just an event type string
				event = event[jQuery.expando] ? event : new jQuery.Event(type, (typeof event === "undefined" ? "undefined" : _typeof(event)) === "object" && event);

				// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
				event.isTrigger = onlyHandlers ? 2 : 3;
				event.namespace = namespaces.join(".");
				event.rnamespace = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

				// Clean up the event in case it is being reused
				event.result = undefined;
				if (!event.target) {
					event.target = elem;
				}

				// Clone any incoming data and prepend the event, creating the handler arg list
				data = data == null ? [event] : jQuery.makeArray(data, [event]);

				// Allow special events to draw outside the lines
				special = jQuery.event.special[type] || {};
				if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
					return;
				}

				// Determine event propagation path in advance, per W3C events spec (#9951)
				// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
				if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {

					bubbleType = special.delegateType || type;
					if (!rfocusMorph.test(bubbleType + type)) {
						cur = cur.parentNode;
					}
					for (; cur; cur = cur.parentNode) {
						eventPath.push(cur);
						tmp = cur;
					}

					// Only add window if we got to document (e.g., not plain obj or detached DOM)
					if (tmp === (elem.ownerDocument || document)) {
						eventPath.push(tmp.defaultView || tmp.parentWindow || window);
					}
				}

				// Fire handlers on the event path
				i = 0;
				while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {

					event.type = i > 1 ? bubbleType : special.bindType || type;

					// jQuery handler
					handle = (dataPriv.get(cur, "events") || {})[event.type] && dataPriv.get(cur, "handle");
					if (handle) {
						handle.apply(cur, data);
					}

					// Native handler
					handle = ontype && cur[ontype];
					if (handle && handle.apply && acceptData(cur)) {
						event.result = handle.apply(cur, data);
						if (event.result === false) {
							event.preventDefault();
						}
					}
				}
				event.type = type;

				// If nobody prevented the default action, do it now
				if (!onlyHandlers && !event.isDefaultPrevented()) {

					if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {

						// Call a native DOM method on the target with the same name as the event.
						// Don't do default actions on window, that's where global variables be (#6170)
						if (ontype && jQuery.isFunction(elem[type]) && !jQuery.isWindow(elem)) {

							// Don't re-trigger an onFOO event when we call its FOO() method
							tmp = elem[ontype];

							if (tmp) {
								elem[ontype] = null;
							}

							// Prevent re-triggering of the same event, since we already bubbled it above
							jQuery.event.triggered = type;
							elem[type]();
							jQuery.event.triggered = undefined;

							if (tmp) {
								elem[ontype] = tmp;
							}
						}
					}
				}

				return event.result;
			},

			// Piggyback on a donor event to simulate a different one
			// Used only for `focus(in | out)` events
			simulate: function simulate(type, elem, event) {
				var e = jQuery.extend(new jQuery.Event(), event, {
					type: type,
					isSimulated: true
				});

				jQuery.event.trigger(e, null, elem);
			}

		});

		jQuery.fn.extend({

			trigger: function trigger(type, data) {
				return this.each(function () {
					jQuery.event.trigger(type, data, this);
				});
			},
			triggerHandler: function triggerHandler(type, data) {
				var elem = this[0];
				if (elem) {
					return jQuery.event.trigger(type, data, elem, true);
				}
			}
		});

		jQuery.each(("blur focus focusin focusout resize scroll click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup contextmenu").split(" "), function (i, name) {

			// Handle event binding
			jQuery.fn[name] = function (data, fn) {
				return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
			};
		});

		jQuery.fn.extend({
			hover: function hover(fnOver, fnOut) {
				return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
			}
		});

		support.focusin = "onfocusin" in window;

		// Support: Firefox <=44
		// Firefox doesn't have focus(in | out) events
		// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
		//
		// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
		// focus(in | out) events fire after focus & blur events,
		// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
		// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
		if (!support.focusin) {
			jQuery.each({ focus: "focusin", blur: "focusout" }, function (orig, fix) {

				// Attach a single capturing handler on the document while someone wants focusin/focusout
				var handler = function handler(event) {
					jQuery.event.simulate(fix, event.target, jQuery.event.fix(event));
				};

				jQuery.event.special[fix] = {
					setup: function setup() {
						var doc = this.ownerDocument || this,
						    attaches = dataPriv.access(doc, fix);

						if (!attaches) {
							doc.addEventListener(orig, handler, true);
						}
						dataPriv.access(doc, fix, (attaches || 0) + 1);
					},
					teardown: function teardown() {
						var doc = this.ownerDocument || this,
						    attaches = dataPriv.access(doc, fix) - 1;

						if (!attaches) {
							doc.removeEventListener(orig, handler, true);
							dataPriv.remove(doc, fix);
						} else {
							dataPriv.access(doc, fix, attaches);
						}
					}
				};
			});
		}
		var location = window.location;

		var nonce = jQuery.now();

		var rquery = /\?/;

		// Cross-browser xml parsing
		jQuery.parseXML = function (data) {
			var xml;
			if (!data || typeof data !== "string") {
				return null;
			}

			// Support: IE 9 - 11 only
			// IE throws on parseFromString with invalid input.
			try {
				xml = new window.DOMParser().parseFromString(data, "text/xml");
			} catch (e) {
				xml = undefined;
			}

			if (!xml || xml.getElementsByTagName("parsererror").length) {
				jQuery.error("Invalid XML: " + data);
			}
			return xml;
		};

		var rbracket = /\[\]$/,
		    rCRLF = /\r?\n/g,
		    rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
		    rsubmittable = /^(?:input|select|textarea|keygen)/i;

		function buildParams(prefix, obj, traditional, add) {
			var name;

			if (Array.isArray(obj)) {

				// Serialize array item.
				jQuery.each(obj, function (i, v) {
					if (traditional || rbracket.test(prefix)) {

						// Treat each array item as a scalar.
						add(prefix, v);
					} else {

						// Item is non-scalar (array or object), encode its numeric index.
						buildParams(prefix + "[" + ((typeof v === "undefined" ? "undefined" : _typeof(v)) === "object" && v != null ? i : "") + "]", v, traditional, add);
					}
				});
			} else if (!traditional && jQuery.type(obj) === "object") {

				// Serialize object item.
				for (name in obj) {
					buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
				}
			} else {

				// Serialize scalar item.
				add(prefix, obj);
			}
		}

		// Serialize an array of form elements or a set of
		// key/values into a query string
		jQuery.param = function (a, traditional) {
			var prefix,
			    s = [],
			    add = function add(key, valueOrFunction) {

				// If value is a function, invoke it and use its return value
				var value = jQuery.isFunction(valueOrFunction) ? valueOrFunction() : valueOrFunction;

				s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value == null ? "" : value);
			};

			// If an array was passed in, assume that it is an array of form elements.
			if (Array.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) {

				// Serialize the form elements
				jQuery.each(a, function () {
					add(this.name, this.value);
				});
			} else {

				// If traditional, encode the "old" way (the way 1.3.2 or older
				// did it), otherwise encode params recursively.
				for (prefix in a) {
					buildParams(prefix, a[prefix], traditional, add);
				}
			}

			// Return the resulting serialization
			return s.join("&");
		};

		jQuery.fn.extend({
			serialize: function serialize() {
				return jQuery.param(this.serializeArray());
			},
			serializeArray: function serializeArray() {
				return this.map(function () {

					// Can add propHook for "elements" to filter or add form elements
					var elements = jQuery.prop(this, "elements");
					return elements ? jQuery.makeArray(elements) : this;
				}).filter(function () {
					var type = this.type;

					// Use .is( ":disabled" ) so that fieldset[disabled] works
					return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
				}).map(function (i, elem) {
					var val = jQuery(this).val();

					if (val == null) {
						return null;
					}

					if (Array.isArray(val)) {
						return jQuery.map(val, function (val) {
							return { name: elem.name, value: val.replace(rCRLF, "\r\n") };
						});
					}

					return { name: elem.name, value: val.replace(rCRLF, "\r\n") };
				}).get();
			}
		});

		var r20 = /%20/g,
		    rhash = /#.*$/,
		    rantiCache = /([?&])_=[^&]*/,
		    rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,


		// #7653, #8125, #8152: local protocol detection
		rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
		    rnoContent = /^(?:GET|HEAD)$/,
		    rprotocol = /^\/\//,


		/* Prefilters
	  * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	  * 2) These are called:
	  *    - BEFORE asking for a transport
	  *    - AFTER param serialization (s.data is a string if s.processData is true)
	  * 3) key is the dataType
	  * 4) the catchall symbol "*" can be used
	  * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	  */
		prefilters = {},


		/* Transports bindings
	  * 1) key is the dataType
	  * 2) the catchall symbol "*" can be used
	  * 3) selection will start with transport dataType and THEN go to "*" if needed
	  */
		transports = {},


		// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
		allTypes = "*/".concat("*"),


		// Anchor tag for parsing the document origin
		originAnchor = document.createElement("a");
		originAnchor.href = location.href;

		// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
		function addToPrefiltersOrTransports(structure) {

			// dataTypeExpression is optional and defaults to "*"
			return function (dataTypeExpression, func) {

				if (typeof dataTypeExpression !== "string") {
					func = dataTypeExpression;
					dataTypeExpression = "*";
				}

				var dataType,
				    i = 0,
				    dataTypes = dataTypeExpression.toLowerCase().match(rnothtmlwhite) || [];

				if (jQuery.isFunction(func)) {

					// For each dataType in the dataTypeExpression
					while (dataType = dataTypes[i++]) {

						// Prepend if requested
						if (dataType[0] === "+") {
							dataType = dataType.slice(1) || "*";
							(structure[dataType] = structure[dataType] || []).unshift(func);

							// Otherwise append
						} else {
							(structure[dataType] = structure[dataType] || []).push(func);
						}
					}
				}
			};
		}

		// Base inspection function for prefilters and transports
		function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {

			var inspected = {},
			    seekingTransport = structure === transports;

			function inspect(dataType) {
				var selected;
				inspected[dataType] = true;
				jQuery.each(structure[dataType] || [], function (_, prefilterOrFactory) {
					var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
					if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {

						options.dataTypes.unshift(dataTypeOrTransport);
						inspect(dataTypeOrTransport);
						return false;
					} else if (seekingTransport) {
						return !(selected = dataTypeOrTransport);
					}
				});
				return selected;
			}

			return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
		}

		// A special extend for ajax options
		// that takes "flat" options (not to be deep extended)
		// Fixes #9887
		function ajaxExtend(target, src) {
			var key,
			    deep,
			    flatOptions = jQuery.ajaxSettings.flatOptions || {};

			for (key in src) {
				if (src[key] !== undefined) {
					(flatOptions[key] ? target : deep || (deep = {}))[key] = src[key];
				}
			}
			if (deep) {
				jQuery.extend(true, target, deep);
			}

			return target;
		}

		/* Handles responses to an ajax request:
	  * - finds the right dataType (mediates between content-type and expected dataType)
	  * - returns the corresponding response
	  */
		function ajaxHandleResponses(s, jqXHR, responses) {

			var ct,
			    type,
			    finalDataType,
			    firstDataType,
			    contents = s.contents,
			    dataTypes = s.dataTypes;

			// Remove auto dataType and get content-type in the process
			while (dataTypes[0] === "*") {
				dataTypes.shift();
				if (ct === undefined) {
					ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
				}
			}

			// Check if we're dealing with a known content-type
			if (ct) {
				for (type in contents) {
					if (contents[type] && contents[type].test(ct)) {
						dataTypes.unshift(type);
						break;
					}
				}
			}

			// Check to see if we have a response for the expected dataType
			if (dataTypes[0] in responses) {
				finalDataType = dataTypes[0];
			} else {

				// Try convertible dataTypes
				for (type in responses) {
					if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
						finalDataType = type;
						break;
					}
					if (!firstDataType) {
						firstDataType = type;
					}
				}

				// Or just use first one
				finalDataType = finalDataType || firstDataType;
			}

			// If we found a dataType
			// We add the dataType to the list if needed
			// and return the corresponding response
			if (finalDataType) {
				if (finalDataType !== dataTypes[0]) {
					dataTypes.unshift(finalDataType);
				}
				return responses[finalDataType];
			}
		}

		/* Chain conversions given the request and the original response
	  * Also sets the responseXXX fields on the jqXHR instance
	  */
		function ajaxConvert(s, response, jqXHR, isSuccess) {
			var conv2,
			    current,
			    conv,
			    tmp,
			    prev,
			    converters = {},


			// Work with a copy of dataTypes in case we need to modify it for conversion
			dataTypes = s.dataTypes.slice();

			// Create converters map with lowercased keys
			if (dataTypes[1]) {
				for (conv in s.converters) {
					converters[conv.toLowerCase()] = s.converters[conv];
				}
			}

			current = dataTypes.shift();

			// Convert to each sequential dataType
			while (current) {

				if (s.responseFields[current]) {
					jqXHR[s.responseFields[current]] = response;
				}

				// Apply the dataFilter if provided
				if (!prev && isSuccess && s.dataFilter) {
					response = s.dataFilter(response, s.dataType);
				}

				prev = current;
				current = dataTypes.shift();

				if (current) {

					// There's only work to do if current dataType is non-auto
					if (current === "*") {

						current = prev;

						// Convert response if prev dataType is non-auto and differs from current
					} else if (prev !== "*" && prev !== current) {

						// Seek a direct converter
						conv = converters[prev + " " + current] || converters["* " + current];

						// If none found, seek a pair
						if (!conv) {
							for (conv2 in converters) {

								// If conv2 outputs current
								tmp = conv2.split(" ");
								if (tmp[1] === current) {

									// If prev can be converted to accepted input
									conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
									if (conv) {

										// Condense equivalence converters
										if (conv === true) {
											conv = converters[conv2];

											// Otherwise, insert the intermediate dataType
										} else if (converters[conv2] !== true) {
											current = tmp[0];
											dataTypes.unshift(tmp[1]);
										}
										break;
									}
								}
							}
						}

						// Apply converter (if not an equivalence)
						if (conv !== true) {

							// Unless errors are allowed to bubble, catch and return them
							if (conv && s.throws) {
								response = conv(response);
							} else {
								try {
									response = conv(response);
								} catch (e) {
									return {
										state: "parsererror",
										error: conv ? e : "No conversion from " + prev + " to " + current
									};
								}
							}
						}
					}
				}
			}

			return { state: "success", data: response };
		}

		jQuery.extend({

			// Counter for holding the number of active queries
			active: 0,

			// Last-Modified header cache for next request
			lastModified: {},
			etag: {},

			ajaxSettings: {
				url: location.href,
				type: "GET",
				isLocal: rlocalProtocol.test(location.protocol),
				global: true,
				processData: true,
				async: true,
				contentType: "application/x-www-form-urlencoded; charset=UTF-8",

				/*
	   timeout: 0,
	   data: null,
	   dataType: null,
	   username: null,
	   password: null,
	   cache: null,
	   throws: false,
	   traditional: false,
	   headers: {},
	   */

				accepts: {
					"*": allTypes,
					text: "text/plain",
					html: "text/html",
					xml: "application/xml, text/xml",
					json: "application/json, text/javascript"
				},

				contents: {
					xml: /\bxml\b/,
					html: /\bhtml/,
					json: /\bjson\b/
				},

				responseFields: {
					xml: "responseXML",
					text: "responseText",
					json: "responseJSON"
				},

				// Data converters
				// Keys separate source (or catchall "*") and destination types with a single space
				converters: {

					// Convert anything to text
					"* text": String,

					// Text to html (true = no transformation)
					"text html": true,

					// Evaluate text as a json expression
					"text json": JSON.parse,

					// Parse text as xml
					"text xml": jQuery.parseXML
				},

				// For options that shouldn't be deep extended:
				// you can add your own custom options here if
				// and when you create one that shouldn't be
				// deep extended (see ajaxExtend)
				flatOptions: {
					url: true,
					context: true
				}
			},

			// Creates a full fledged settings object into target
			// with both ajaxSettings and settings fields.
			// If target is omitted, writes into ajaxSettings.
			ajaxSetup: function ajaxSetup(target, settings) {
				return settings ?

				// Building a settings object
				ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) :

				// Extending ajaxSettings
				ajaxExtend(jQuery.ajaxSettings, target);
			},

			ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
			ajaxTransport: addToPrefiltersOrTransports(transports),

			// Main method
			ajax: function ajax(url, options) {

				// If url is an object, simulate pre-1.5 signature
				if ((typeof url === "undefined" ? "undefined" : _typeof(url)) === "object") {
					options = url;
					url = undefined;
				}

				// Force options to be an object
				options = options || {};

				var transport,


				// URL without anti-cache param
				cacheURL,


				// Response headers
				responseHeadersString,
				    responseHeaders,


				// timeout handle
				timeoutTimer,


				// Url cleanup var
				urlAnchor,


				// Request state (becomes false upon send and true upon completion)
				completed,


				// To know if global events are to be dispatched
				fireGlobals,


				// Loop variable
				i,


				// uncached part of the url
				uncached,


				// Create the final options object
				s = jQuery.ajaxSetup({}, options),


				// Callbacks context
				callbackContext = s.context || s,


				// Context for global events is callbackContext if it is a DOM node or jQuery collection
				globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,


				// Deferreds
				deferred = jQuery.Deferred(),
				    completeDeferred = jQuery.Callbacks("once memory"),


				// Status-dependent callbacks
				_statusCode = s.statusCode || {},


				// Headers (they are sent all at once)
				requestHeaders = {},
				    requestHeadersNames = {},


				// Default abort message
				strAbort = "canceled",


				// Fake xhr
				jqXHR = {
					readyState: 0,

					// Builds headers hashtable if needed
					getResponseHeader: function getResponseHeader(key) {
						var match;
						if (completed) {
							if (!responseHeaders) {
								responseHeaders = {};
								while (match = rheaders.exec(responseHeadersString)) {
									responseHeaders[match[1].toLowerCase()] = match[2];
								}
							}
							match = responseHeaders[key.toLowerCase()];
						}
						return match == null ? null : match;
					},

					// Raw string
					getAllResponseHeaders: function getAllResponseHeaders() {
						return completed ? responseHeadersString : null;
					},

					// Caches the header
					setRequestHeader: function setRequestHeader(name, value) {
						if (completed == null) {
							name = requestHeadersNames[name.toLowerCase()] = requestHeadersNames[name.toLowerCase()] || name;
							requestHeaders[name] = value;
						}
						return this;
					},

					// Overrides response content-type header
					overrideMimeType: function overrideMimeType(type) {
						if (completed == null) {
							s.mimeType = type;
						}
						return this;
					},

					// Status-dependent callbacks
					statusCode: function statusCode(map) {
						var code;
						if (map) {
							if (completed) {

								// Execute the appropriate callbacks
								jqXHR.always(map[jqXHR.status]);
							} else {

								// Lazy-add the new callbacks in a way that preserves old ones
								for (code in map) {
									_statusCode[code] = [_statusCode[code], map[code]];
								}
							}
						}
						return this;
					},

					// Cancel the request
					abort: function abort(statusText) {
						var finalText = statusText || strAbort;
						if (transport) {
							transport.abort(finalText);
						}
						done(0, finalText);
						return this;
					}
				};

				// Attach deferreds
				deferred.promise(jqXHR);

				// Add protocol if not provided (prefilters might expect it)
				// Handle falsy url in the settings object (#10093: consistency with old signature)
				// We also use the url parameter if available
				s.url = ((url || s.url || location.href) + "").replace(rprotocol, location.protocol + "//");

				// Alias method option to type as per ticket #12004
				s.type = options.method || options.type || s.method || s.type;

				// Extract dataTypes list
				s.dataTypes = (s.dataType || "*").toLowerCase().match(rnothtmlwhite) || [""];

				// A cross-domain request is in order when the origin doesn't match the current origin.
				if (s.crossDomain == null) {
					urlAnchor = document.createElement("a");

					// Support: IE <=8 - 11, Edge 12 - 13
					// IE throws exception on accessing the href property if url is malformed,
					// e.g. http://example.com:80x/
					try {
						urlAnchor.href = s.url;

						// Support: IE <=8 - 11 only
						// Anchor's host property isn't correctly set when s.url is relative
						urlAnchor.href = urlAnchor.href;
						s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !== urlAnchor.protocol + "//" + urlAnchor.host;
					} catch (e) {

						// If there is an error parsing the URL, assume it is crossDomain,
						// it can be rejected by the transport if it is invalid
						s.crossDomain = true;
					}
				}

				// Convert data if not already a string
				if (s.data && s.processData && typeof s.data !== "string") {
					s.data = jQuery.param(s.data, s.traditional);
				}

				// Apply prefilters
				inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);

				// If request was aborted inside a prefilter, stop there
				if (completed) {
					return jqXHR;
				}

				// We can fire global events as of now if asked to
				// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
				fireGlobals = jQuery.event && s.global;

				// Watch for a new set of requests
				if (fireGlobals && jQuery.active++ === 0) {
					jQuery.event.trigger("ajaxStart");
				}

				// Uppercase the type
				s.type = s.type.toUpperCase();

				// Determine if request has content
				s.hasContent = !rnoContent.test(s.type);

				// Save the URL in case we're toying with the If-Modified-Since
				// and/or If-None-Match header later on
				// Remove hash to simplify url manipulation
				cacheURL = s.url.replace(rhash, "");

				// More options handling for requests with no content
				if (!s.hasContent) {

					// Remember the hash so we can put it back
					uncached = s.url.slice(cacheURL.length);

					// If data is available, append data to url
					if (s.data) {
						cacheURL += (rquery.test(cacheURL) ? "&" : "?") + s.data;

						// #9682: remove data so that it's not used in an eventual retry
						delete s.data;
					}

					// Add or update anti-cache param if needed
					if (s.cache === false) {
						cacheURL = cacheURL.replace(rantiCache, "$1");
						uncached = (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++ + uncached;
					}

					// Put hash and anti-cache on the URL that will be requested (gh-1732)
					s.url = cacheURL + uncached;

					// Change '%20' to '+' if this is encoded form body content (gh-2658)
				} else if (s.data && s.processData && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0) {
					s.data = s.data.replace(r20, "+");
				}

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if (s.ifModified) {
					if (jQuery.lastModified[cacheURL]) {
						jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
					}
					if (jQuery.etag[cacheURL]) {
						jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
					}
				}

				// Set the correct header, if data is being sent
				if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
					jqXHR.setRequestHeader("Content-Type", s.contentType);
				}

				// Set the Accepts header for the server, depending on the dataType
				jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);

				// Check for headers option
				for (i in s.headers) {
					jqXHR.setRequestHeader(i, s.headers[i]);
				}

				// Allow custom headers/mimetypes and early abort
				if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || completed)) {

					// Abort if not done already and return
					return jqXHR.abort();
				}

				// Aborting is no longer a cancellation
				strAbort = "abort";

				// Install callbacks on deferreds
				completeDeferred.add(s.complete);
				jqXHR.done(s.success);
				jqXHR.fail(s.error);

				// Get transport
				transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);

				// If no transport, we auto-abort
				if (!transport) {
					done(-1, "No Transport");
				} else {
					jqXHR.readyState = 1;

					// Send global event
					if (fireGlobals) {
						globalEventContext.trigger("ajaxSend", [jqXHR, s]);
					}

					// If request was aborted inside ajaxSend, stop there
					if (completed) {
						return jqXHR;
					}

					// Timeout
					if (s.async && s.timeout > 0) {
						timeoutTimer = window.setTimeout(function () {
							jqXHR.abort("timeout");
						}, s.timeout);
					}

					try {
						completed = false;
						transport.send(requestHeaders, done);
					} catch (e) {

						// Rethrow post-completion exceptions
						if (completed) {
							throw e;
						}

						// Propagate others as results
						done(-1, e);
					}
				}

				// Callback for when everything is done
				function done(status, nativeStatusText, responses, headers) {
					var isSuccess,
					    success,
					    error,
					    response,
					    modified,
					    statusText = nativeStatusText;

					// Ignore repeat invocations
					if (completed) {
						return;
					}

					completed = true;

					// Clear timeout if it exists
					if (timeoutTimer) {
						window.clearTimeout(timeoutTimer);
					}

					// Dereference transport for early garbage collection
					// (no matter how long the jqXHR object will be used)
					transport = undefined;

					// Cache response headers
					responseHeadersString = headers || "";

					// Set readyState
					jqXHR.readyState = status > 0 ? 4 : 0;

					// Determine if successful
					isSuccess = status >= 200 && status < 300 || status === 304;

					// Get response data
					if (responses) {
						response = ajaxHandleResponses(s, jqXHR, responses);
					}

					// Convert no matter what (that way responseXXX fields are always set)
					response = ajaxConvert(s, response, jqXHR, isSuccess);

					// If successful, handle type chaining
					if (isSuccess) {

						// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
						if (s.ifModified) {
							modified = jqXHR.getResponseHeader("Last-Modified");
							if (modified) {
								jQuery.lastModified[cacheURL] = modified;
							}
							modified = jqXHR.getResponseHeader("etag");
							if (modified) {
								jQuery.etag[cacheURL] = modified;
							}
						}

						// if no content
						if (status === 204 || s.type === "HEAD") {
							statusText = "nocontent";

							// if not modified
						} else if (status === 304) {
							statusText = "notmodified";

							// If we have data, let's convert it
						} else {
							statusText = response.state;
							success = response.data;
							error = response.error;
							isSuccess = !error;
						}
					} else {

						// Extract error from statusText and normalize for non-aborts
						error = statusText;
						if (status || !statusText) {
							statusText = "error";
							if (status < 0) {
								status = 0;
							}
						}
					}

					// Set data for the fake xhr object
					jqXHR.status = status;
					jqXHR.statusText = (nativeStatusText || statusText) + "";

					// Success/Error
					if (isSuccess) {
						deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
					} else {
						deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
					}

					// Status-dependent callbacks
					jqXHR.statusCode(_statusCode);
					_statusCode = undefined;

					if (fireGlobals) {
						globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
					}

					// Complete
					completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);

					if (fireGlobals) {
						globalEventContext.trigger("ajaxComplete", [jqXHR, s]);

						// Handle the global AJAX counter
						if (! --jQuery.active) {
							jQuery.event.trigger("ajaxStop");
						}
					}
				}

				return jqXHR;
			},

			getJSON: function getJSON(url, data, callback) {
				return jQuery.get(url, data, callback, "json");
			},

			getScript: function getScript(url, callback) {
				return jQuery.get(url, undefined, callback, "script");
			}
		});

		jQuery.each(["get", "post"], function (i, method) {
			jQuery[method] = function (url, data, callback, type) {

				// Shift arguments if data argument was omitted
				if (jQuery.isFunction(data)) {
					type = type || callback;
					callback = data;
					data = undefined;
				}

				// The url can be an options object (which then must have .url)
				return jQuery.ajax(jQuery.extend({
					url: url,
					type: method,
					dataType: type,
					data: data,
					success: callback
				}, jQuery.isPlainObject(url) && url));
			};
		});

		jQuery._evalUrl = function (url) {
			return jQuery.ajax({
				url: url,

				// Make this explicit, since user can override this through ajaxSetup (#11264)
				type: "GET",
				dataType: "script",
				cache: true,
				async: false,
				global: false,
				"throws": true
			});
		};

		jQuery.fn.extend({
			wrapAll: function wrapAll(html) {
				var wrap;

				if (this[0]) {
					if (jQuery.isFunction(html)) {
						html = html.call(this[0]);
					}

					// The elements to wrap the target around
					wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);

					if (this[0].parentNode) {
						wrap.insertBefore(this[0]);
					}

					wrap.map(function () {
						var elem = this;

						while (elem.firstElementChild) {
							elem = elem.firstElementChild;
						}

						return elem;
					}).append(this);
				}

				return this;
			},

			wrapInner: function wrapInner(html) {
				if (jQuery.isFunction(html)) {
					return this.each(function (i) {
						jQuery(this).wrapInner(html.call(this, i));
					});
				}

				return this.each(function () {
					var self = jQuery(this),
					    contents = self.contents();

					if (contents.length) {
						contents.wrapAll(html);
					} else {
						self.append(html);
					}
				});
			},

			wrap: function wrap(html) {
				var isFunction = jQuery.isFunction(html);

				return this.each(function (i) {
					jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
				});
			},

			unwrap: function unwrap(selector) {
				this.parent(selector).not("body").each(function () {
					jQuery(this).replaceWith(this.childNodes);
				});
				return this;
			}
		});

		jQuery.expr.pseudos.hidden = function (elem) {
			return !jQuery.expr.pseudos.visible(elem);
		};
		jQuery.expr.pseudos.visible = function (elem) {
			return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
		};

		jQuery.ajaxSettings.xhr = function () {
			try {
				return new window.XMLHttpRequest();
			} catch (e) {}
		};

		var xhrSuccessStatus = {

			// File protocol always yields status code 0, assume 200
			0: 200,

			// Support: IE <=9 only
			// #1450: sometimes IE returns 1223 when it should be 204
			1223: 204
		},
		    xhrSupported = jQuery.ajaxSettings.xhr();

		support.cors = !!xhrSupported && "withCredentials" in xhrSupported;
		support.ajax = xhrSupported = !!xhrSupported;

		jQuery.ajaxTransport(function (options) {
			var _callback, errorCallback;

			// Cross domain only allowed if supported through XMLHttpRequest
			if (support.cors || xhrSupported && !options.crossDomain) {
				return {
					send: function send(headers, complete) {
						var i,
						    xhr = options.xhr();

						xhr.open(options.type, options.url, options.async, options.username, options.password);

						// Apply custom fields if provided
						if (options.xhrFields) {
							for (i in options.xhrFields) {
								xhr[i] = options.xhrFields[i];
							}
						}

						// Override mime type if needed
						if (options.mimeType && xhr.overrideMimeType) {
							xhr.overrideMimeType(options.mimeType);
						}

						// X-Requested-With header
						// For cross-domain requests, seeing as conditions for a preflight are
						// akin to a jigsaw puzzle, we simply never set it to be sure.
						// (it can always be set on a per-request basis or even using ajaxSetup)
						// For same-domain requests, won't change header if already provided.
						if (!options.crossDomain && !headers["X-Requested-With"]) {
							headers["X-Requested-With"] = "XMLHttpRequest";
						}

						// Set headers
						for (i in headers) {
							xhr.setRequestHeader(i, headers[i]);
						}

						// Callback
						_callback = function callback(type) {
							return function () {
								if (_callback) {
									_callback = errorCallback = xhr.onload = xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

									if (type === "abort") {
										xhr.abort();
									} else if (type === "error") {

										// Support: IE <=9 only
										// On a manual native abort, IE9 throws
										// errors on any property access that is not readyState
										if (typeof xhr.status !== "number") {
											complete(0, "error");
										} else {
											complete(

											// File: protocol always yields status 0; see #8605, #14207
											xhr.status, xhr.statusText);
										}
									} else {
										complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText,

										// Support: IE <=9 only
										// IE9 has no XHR2 but throws on binary (trac-11426)
										// For XHR2 non-text, let the caller handle it (gh-2498)
										(xhr.responseType || "text") !== "text" || typeof xhr.responseText !== "string" ? { binary: xhr.response } : { text: xhr.responseText }, xhr.getAllResponseHeaders());
									}
								}
							};
						};

						// Listen to events
						xhr.onload = _callback();
						errorCallback = xhr.onerror = _callback("error");

						// Support: IE 9 only
						// Use onreadystatechange to replace onabort
						// to handle uncaught aborts
						if (xhr.onabort !== undefined) {
							xhr.onabort = errorCallback;
						} else {
							xhr.onreadystatechange = function () {

								// Check readyState before timeout as it changes
								if (xhr.readyState === 4) {

									// Allow onerror to be called first,
									// but that will not handle a native abort
									// Also, save errorCallback to a variable
									// as xhr.onerror cannot be accessed
									window.setTimeout(function () {
										if (_callback) {
											errorCallback();
										}
									});
								}
							};
						}

						// Create the abort callback
						_callback = _callback("abort");

						try {

							// Do send the request (this may raise an exception)
							xhr.send(options.hasContent && options.data || null);
						} catch (e) {

							// #14683: Only rethrow if this hasn't been notified as an error yet
							if (_callback) {
								throw e;
							}
						}
					},

					abort: function abort() {
						if (_callback) {
							_callback();
						}
					}
				};
			}
		});

		// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
		jQuery.ajaxPrefilter(function (s) {
			if (s.crossDomain) {
				s.contents.script = false;
			}
		});

		// Install script dataType
		jQuery.ajaxSetup({
			accepts: {
				script: "text/javascript, application/javascript, " + "application/ecmascript, application/x-ecmascript"
			},
			contents: {
				script: /\b(?:java|ecma)script\b/
			},
			converters: {
				"text script": function textScript(text) {
					jQuery.globalEval(text);
					return text;
				}
			}
		});

		// Handle cache's special case and crossDomain
		jQuery.ajaxPrefilter("script", function (s) {
			if (s.cache === undefined) {
				s.cache = false;
			}
			if (s.crossDomain) {
				s.type = "GET";
			}
		});

		// Bind script tag hack transport
		jQuery.ajaxTransport("script", function (s) {

			// This transport only deals with cross domain requests
			if (s.crossDomain) {
				var script, _callback2;
				return {
					send: function send(_, complete) {
						script = jQuery("<script>").prop({
							charset: s.scriptCharset,
							src: s.url
						}).on("load error", _callback2 = function callback(evt) {
							script.remove();
							_callback2 = null;
							if (evt) {
								complete(evt.type === "error" ? 404 : 200, evt.type);
							}
						});

						// Use native DOM manipulation to avoid our domManip AJAX trickery
						document.head.appendChild(script[0]);
					},
					abort: function abort() {
						if (_callback2) {
							_callback2();
						}
					}
				};
			}
		});

		var oldCallbacks = [],
		    rjsonp = /(=)\?(?=&|$)|\?\?/;

		// Default jsonp settings
		jQuery.ajaxSetup({
			jsonp: "callback",
			jsonpCallback: function jsonpCallback() {
				var callback = oldCallbacks.pop() || jQuery.expando + "_" + nonce++;
				this[callback] = true;
				return callback;
			}
		});

		// Detect, normalize options and install callbacks for jsonp requests
		jQuery.ajaxPrefilter("json jsonp", function (s, originalSettings, jqXHR) {

			var callbackName,
			    overwritten,
			    responseContainer,
			    jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0 && rjsonp.test(s.data) && "data");

			// Handle iff the expected data type is "jsonp" or we have a parameter to set
			if (jsonProp || s.dataTypes[0] === "jsonp") {

				// Get callback name, remembering preexisting value associated with it
				callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;

				// Insert callback into url or form data
				if (jsonProp) {
					s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
				} else if (s.jsonp !== false) {
					s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
				}

				// Use data converter to retrieve json after script execution
				s.converters["script json"] = function () {
					if (!responseContainer) {
						jQuery.error(callbackName + " was not called");
					}
					return responseContainer[0];
				};

				// Force json dataType
				s.dataTypes[0] = "json";

				// Install callback
				overwritten = window[callbackName];
				window[callbackName] = function () {
					responseContainer = arguments;
				};

				// Clean-up function (fires after converters)
				jqXHR.always(function () {

					// If previous value didn't exist - remove it
					if (overwritten === undefined) {
						jQuery(window).removeProp(callbackName);

						// Otherwise restore preexisting value
					} else {
						window[callbackName] = overwritten;
					}

					// Save back as free
					if (s[callbackName]) {

						// Make sure that re-using the options doesn't screw things around
						s.jsonpCallback = originalSettings.jsonpCallback;

						// Save the callback name for future use
						oldCallbacks.push(callbackName);
					}

					// Call if it was a function and we have a response
					if (responseContainer && jQuery.isFunction(overwritten)) {
						overwritten(responseContainer[0]);
					}

					responseContainer = overwritten = undefined;
				});

				// Delegate to script
				return "script";
			}
		});

		// Support: Safari 8 only
		// In Safari 8 documents created via document.implementation.createHTMLDocument
		// collapse sibling forms: the second one becomes a child of the first one.
		// Because of that, this security measure has to be disabled in Safari 8.
		// https://bugs.webkit.org/show_bug.cgi?id=137337
		support.createHTMLDocument = function () {
			var body = document.implementation.createHTMLDocument("").body;
			body.innerHTML = "<form></form><form></form>";
			return body.childNodes.length === 2;
		}();

		// Argument "data" should be string of html
		// context (optional): If specified, the fragment will be created in this context,
		// defaults to document
		// keepScripts (optional): If true, will include scripts passed in the html string
		jQuery.parseHTML = function (data, context, keepScripts) {
			if (typeof data !== "string") {
				return [];
			}
			if (typeof context === "boolean") {
				keepScripts = context;
				context = false;
			}

			var base, parsed, scripts;

			if (!context) {

				// Stop scripts or inline event handlers from being executed immediately
				// by using document.implementation
				if (support.createHTMLDocument) {
					context = document.implementation.createHTMLDocument("");

					// Set the base href for the created document
					// so any parsed elements with URLs
					// are based on the document's URL (gh-2965)
					base = context.createElement("base");
					base.href = document.location.href;
					context.head.appendChild(base);
				} else {
					context = document;
				}
			}

			parsed = rsingleTag.exec(data);
			scripts = !keepScripts && [];

			// Single tag
			if (parsed) {
				return [context.createElement(parsed[1])];
			}

			parsed = buildFragment([data], context, scripts);

			if (scripts && scripts.length) {
				jQuery(scripts).remove();
			}

			return jQuery.merge([], parsed.childNodes);
		};

		/**
	  * Load a url into a page
	  */
		jQuery.fn.load = function (url, params, callback) {
			var selector,
			    type,
			    response,
			    self = this,
			    off = url.indexOf(" ");

			if (off > -1) {
				selector = stripAndCollapse(url.slice(off));
				url = url.slice(0, off);
			}

			// If it's a function
			if (jQuery.isFunction(params)) {

				// We assume that it's the callback
				callback = params;
				params = undefined;

				// Otherwise, build a param string
			} else if (params && (typeof params === "undefined" ? "undefined" : _typeof(params)) === "object") {
				type = "POST";
			}

			// If we have elements to modify, make the request
			if (self.length > 0) {
				jQuery.ajax({
					url: url,

					// If "type" variable is undefined, then "GET" method will be used.
					// Make value of this field explicit since
					// user can override it through ajaxSetup method
					type: type || "GET",
					dataType: "html",
					data: params
				}).done(function (responseText) {

					// Save response for use in complete callback
					response = arguments;

					self.html(selector ?

					// If a selector was specified, locate the right elements in a dummy div
					// Exclude scripts to avoid IE 'Permission Denied' errors
					jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) :

					// Otherwise use the full result
					responseText);

					// If the request succeeds, this function gets "data", "status", "jqXHR"
					// but they are ignored because response was set above.
					// If it fails, this function gets "jqXHR", "status", "error"
				}).always(callback && function (jqXHR, status) {
					self.each(function () {
						callback.apply(this, response || [jqXHR.responseText, status, jqXHR]);
					});
				});
			}

			return this;
		};

		// Attach a bunch of functions for handling common AJAX events
		jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (i, type) {
			jQuery.fn[type] = function (fn) {
				return this.on(type, fn);
			};
		});

		jQuery.expr.pseudos.animated = function (elem) {
			return jQuery.grep(jQuery.timers, function (fn) {
				return elem === fn.elem;
			}).length;
		};

		jQuery.offset = {
			setOffset: function setOffset(elem, options, i) {
				var curPosition,
				    curLeft,
				    curCSSTop,
				    curTop,
				    curOffset,
				    curCSSLeft,
				    calculatePosition,
				    position = jQuery.css(elem, "position"),
				    curElem = jQuery(elem),
				    props = {};

				// Set position first, in-case top/left are set even on static elem
				if (position === "static") {
					elem.style.position = "relative";
				}

				curOffset = curElem.offset();
				curCSSTop = jQuery.css(elem, "top");
				curCSSLeft = jQuery.css(elem, "left");
				calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1;

				// Need to be able to calculate position if either
				// top or left is auto and position is either absolute or fixed
				if (calculatePosition) {
					curPosition = curElem.position();
					curTop = curPosition.top;
					curLeft = curPosition.left;
				} else {
					curTop = parseFloat(curCSSTop) || 0;
					curLeft = parseFloat(curCSSLeft) || 0;
				}

				if (jQuery.isFunction(options)) {

					// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
					options = options.call(elem, i, jQuery.extend({}, curOffset));
				}

				if (options.top != null) {
					props.top = options.top - curOffset.top + curTop;
				}
				if (options.left != null) {
					props.left = options.left - curOffset.left + curLeft;
				}

				if ("using" in options) {
					options.using.call(elem, props);
				} else {
					curElem.css(props);
				}
			}
		};

		jQuery.fn.extend({
			offset: function offset(options) {

				// Preserve chaining for setter
				if (arguments.length) {
					return options === undefined ? this : this.each(function (i) {
						jQuery.offset.setOffset(this, options, i);
					});
				}

				var doc,
				    docElem,
				    rect,
				    win,
				    elem = this[0];

				if (!elem) {
					return;
				}

				// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
				// Support: IE <=11 only
				// Running getBoundingClientRect on a
				// disconnected node in IE throws an error
				if (!elem.getClientRects().length) {
					return { top: 0, left: 0 };
				}

				rect = elem.getBoundingClientRect();

				doc = elem.ownerDocument;
				docElem = doc.documentElement;
				win = doc.defaultView;

				return {
					top: rect.top + win.pageYOffset - docElem.clientTop,
					left: rect.left + win.pageXOffset - docElem.clientLeft
				};
			},

			position: function position() {
				if (!this[0]) {
					return;
				}

				var offsetParent,
				    offset,
				    elem = this[0],
				    parentOffset = { top: 0, left: 0 };

				// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
				// because it is its only offset parent
				if (jQuery.css(elem, "position") === "fixed") {

					// Assume getBoundingClientRect is there when computed position is fixed
					offset = elem.getBoundingClientRect();
				} else {

					// Get *real* offsetParent
					offsetParent = this.offsetParent();

					// Get correct offsets
					offset = this.offset();
					if (!nodeName(offsetParent[0], "html")) {
						parentOffset = offsetParent.offset();
					}

					// Add offsetParent borders
					parentOffset = {
						top: parentOffset.top + jQuery.css(offsetParent[0], "borderTopWidth", true),
						left: parentOffset.left + jQuery.css(offsetParent[0], "borderLeftWidth", true)
					};
				}

				// Subtract parent offsets and element margins
				return {
					top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
					left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
				};
			},

			// This method will return documentElement in the following cases:
			// 1) For the element inside the iframe without offsetParent, this method will return
			//    documentElement of the parent window
			// 2) For the hidden or detached element
			// 3) For body or html element, i.e. in case of the html node - it will return itself
			//
			// but those exceptions were never presented as a real life use-cases
			// and might be considered as more preferable results.
			//
			// This logic, however, is not guaranteed and can change at any point in the future
			offsetParent: function offsetParent() {
				return this.map(function () {
					var offsetParent = this.offsetParent;

					while (offsetParent && jQuery.css(offsetParent, "position") === "static") {
						offsetParent = offsetParent.offsetParent;
					}

					return offsetParent || documentElement;
				});
			}
		});

		// Create scrollLeft and scrollTop methods
		jQuery.each({ scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function (method, prop) {
			var top = "pageYOffset" === prop;

			jQuery.fn[method] = function (val) {
				return access(this, function (elem, method, val) {

					// Coalesce documents and windows
					var win;
					if (jQuery.isWindow(elem)) {
						win = elem;
					} else if (elem.nodeType === 9) {
						win = elem.defaultView;
					}

					if (val === undefined) {
						return win ? win[prop] : elem[method];
					}

					if (win) {
						win.scrollTo(!top ? val : win.pageXOffset, top ? val : win.pageYOffset);
					} else {
						elem[method] = val;
					}
				}, method, val, arguments.length);
			};
		});

		// Support: Safari <=7 - 9.1, Chrome <=37 - 49
		// Add the top/left cssHooks using jQuery.fn.position
		// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
		// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
		// getComputedStyle returns percent when specified for top/left/bottom/right;
		// rather than make the css module depend on the offset module, just check for it here
		jQuery.each(["top", "left"], function (i, prop) {
			jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function (elem, computed) {
				if (computed) {
					computed = curCSS(elem, prop);

					// If curCSS returns percentage, fallback to offset
					return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
				}
			});
		});

		// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
		jQuery.each({ Height: "height", Width: "width" }, function (name, type) {
			jQuery.each({ padding: "inner" + name, content: type, "": "outer" + name }, function (defaultExtra, funcName) {

				// Margin is only for outerHeight, outerWidth
				jQuery.fn[funcName] = function (margin, value) {
					var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
					    extra = defaultExtra || (margin === true || value === true ? "margin" : "border");

					return access(this, function (elem, type, value) {
						var doc;

						if (jQuery.isWindow(elem)) {

							// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
							return funcName.indexOf("outer") === 0 ? elem["inner" + name] : elem.document.documentElement["client" + name];
						}

						// Get document width or height
						if (elem.nodeType === 9) {
							doc = elem.documentElement;

							// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
							// whichever is greatest
							return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
						}

						return value === undefined ?

						// Get width or height on the element, requesting but not forcing parseFloat
						jQuery.css(elem, type, extra) :

						// Set width or height on the element
						jQuery.style(elem, type, value, extra);
					}, type, chainable ? margin : undefined, chainable);
				};
			});
		});

		jQuery.fn.extend({

			bind: function bind(types, data, fn) {
				return this.on(types, null, data, fn);
			},
			unbind: function unbind(types, fn) {
				return this.off(types, null, fn);
			},

			delegate: function delegate(selector, types, data, fn) {
				return this.on(types, selector, data, fn);
			},
			undelegate: function undelegate(selector, types, fn) {

				// ( namespace ) or ( selector, types [, fn] )
				return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
			}
		});

		jQuery.holdReady = function (hold) {
			if (hold) {
				jQuery.readyWait++;
			} else {
				jQuery.ready(true);
			}
		};
		jQuery.isArray = Array.isArray;
		jQuery.parseJSON = JSON.parse;
		jQuery.nodeName = nodeName;

		// Register as a named AMD module, since jQuery can be concatenated with other
		// files that may use define, but not via a proper concatenation script that
		// understands anonymous AMD modules. A named AMD is safest and most robust
		// way to register. Lowercase jquery is used because AMD module names are
		// derived from file names, and jQuery is normally delivered in a lowercase
		// file name. Do this after creating the global so that if an AMD module wants
		// to call noConflict to hide this version of jQuery, it will work.

		// Note that for maximum portability, libraries that are not jQuery should
		// declare themselves as anonymous modules, and avoid setting a global if an
		// AMD loader is present. jQuery is a special case. For more information, see
		// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

		if (true) {
			!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
				return jQuery;
			}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		}

		var

		// Map over jQuery in case of overwrite
		_jQuery = window.jQuery,


		// Map over the $ in case of overwrite
		_$ = window.$;

		jQuery.noConflict = function (deep) {
			if (window.$ === jQuery) {
				window.$ = _$;
			}

			if (deep && window.jQuery === jQuery) {
				window.jQuery = _jQuery;
			}

			return jQuery;
		};

		// Expose jQuery and $ identifiers, even in AMD
		// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
		// and CommonJS for browser emulators (#13566)
		if (!noGlobal) {
			window.jQuery = window.$ = jQuery;
		}

		return jQuery;
	});
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2)(module)))

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	"use strict";

	module.exports = function (module) {
		if (!module.webpackPolyfill) {
			module.deprecate = function () {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _jquery = __webpack_require__(1);

	var _jquery2 = _interopRequireDefault(_jquery);

	var _Converters = __webpack_require__(4);

	var _Converters2 = _interopRequireDefault(_Converters);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	"use strict";

	var EmojiEditor = function () {

	    /**
	     *
	     * @param {HTMLElement|HTMLTextAreaElement|HTMLInputElement} input
	     * @param {Boolean} prevent_new_line
	     */
	    function EmojiEditor(input) {
	        var prevent_new_line = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	        _classCallCheck(this, EmojiEditor);

	        /**
	         *
	         * @type {HTMLElement|HTMLTextAreaElement|HTMLInputElement}
	         * @private
	         */
	        this._input = input;

	        /**
	         * @type {Boolean}
	         * @private
	         */
	        this._is_content_editable = input.isContentEditable;

	        /**
	         *
	         * @type {Range|undefined}
	         */
	        this.cursor_position = undefined;

	        /**
	         *
	         * @type {boolean}
	         */
	        this.prevent_new_line = prevent_new_line;

	        this._trackCursor();
	        this._onPaste();
	    }

	    /**
	     * Pastes an emoji at the caret taking into account whether the element
	     * is contenteditable or not.
	     *
	     * @param {Emoji} emoji
	     */


	    _createClass(EmojiEditor, [{
	        key: "placeEmoji",
	        value: function placeEmoji(emoji) {

	            this._input.focus();
	            if (this.cursor_position) {
	                EmojiEditor.restoreSelection(this.cursor_position);
	            }

	            if (this._is_content_editable) {
	                var node = void 0;
	                if (EmojiEditor.supportsUnified()) {
	                    node = EmojiEditor.pasteTextAtCaret(emoji.getCharacter());
	                    EmojiEditor.selectElement(node);
	                } else {
	                    node = EmojiEditor.pasteHtml(emoji.getHtml());
	                }

	                (0, _jquery2.default)(this._input).trigger('change').trigger('input');

	                return node;
	            } else {
	                var ret = this.pasteInputText(emoji.getColons());
	                (0, _jquery2.default)(this._input).trigger('change').trigger('input');
	                return ret;
	            }
	        }

	        /**
	         * Pastes text at the cursor while preserving cursor position.
	         *
	         * @param text
	         * @return {String}
	         */

	    }, {
	        key: "pasteInputText",
	        value: function pasteInputText(text) {

	            var cursor_position = this._input.selectionStart;
	            var current_length = this._input.value.length;
	            this._input.value = this._input.value.substr(0, cursor_position) + text + this._input.value.substr(cursor_position);

	            this.setInputCaretPosition(cursor_position + this._input.value.length - current_length);

	            return text;
	        }

	        /**
	         * Sets the caret position on a textarea or input[type=text] field
	         *
	         *
	         * @param position
	         * @returns {boolean}
	         */

	    }, {
	        key: "setInputCaretPosition",
	        value: function setInputCaretPosition(position) {
	            if (this._input.createTextRange) {
	                var range = this._input.createTextRange();
	                range.move('character', position);
	                range.select();
	                return true;
	            } else {
	                if (this._input.selectionStart || this._input.selectionStart === 0) {
	                    this._input.focus();
	                    this._input.setSelectionRange(position, position);
	                    return true;
	                }
	                //Otherwise this method failed (browser not supported)
	                else {
	                        this._input.focus();
	                        return false;
	                    }
	            }
	        }

	        /**
	         * Gets the text from the input
	         *
	         * @returns {*}
	         */

	    }, {
	        key: "getText",
	        value: function getText() {
	            if (this._is_content_editable) {
	                return this._mapElement(this._input).replace(/[\u200B-\u200D\uFEFF]/g, '');
	            }

	            return _Converters2.default.withUnified().replace_colons(this._input.value);
	        }

	        /**
	         * Empty the input's contents.
	         */

	    }, {
	        key: "empty",
	        value: function empty() {
	            if (this._is_content_editable) {
	                this._input.innerHTML = "";
	            } else {
	                this._input.value = "";
	            }
	        }
	        /**
	         * Intercepts paste events for contenteditable divs so that we don't get
	         * any of the special html that gets inserted automatically.
	         *
	         * @returns {EmojiEditor}
	         * @private
	         */

	    }, {
	        key: "_onPaste",
	        value: function _onPaste() {
	            if (this._is_content_editable) {
	                (0, _jquery2.default)(this._input).off('paste.editable').on('paste.editable', function (event) {
	                    event.stopPropagation();
	                    event.preventDefault();

	                    var clipboard_data = event.originalEvent.clipboardData || window.clipboardData;
	                    var pasted_data = clipboard_data.getData('text');
	                    var text = EmojiEditor.pasteTextAtCaret(pasted_data);
	                    EmojiEditor.selectElement(text);
	                });
	            }

	            return this;
	        }

	        /**
	         * Get all of the child nodes in an input
	         *
	         * @returns {Array<Node>}
	         */

	    }, {
	        key: "getNodes",
	        value: function getNodes() {
	            return Array.prototype.slice.call(this._input.childNodes);
	        }

	        /**
	         * Selects the last node in the input.
	         */

	    }, {
	        key: "selectLastNode",
	        value: function selectLastNode() {
	            var nodes = this.getNodes();
	            if (nodes.length) {
	                EmojiEditor.selectElement(nodes[nodes.length - 1]);
	                this.cursor_position = EmojiEditor.saveSelection();
	            }
	        }

	        /**
	         * Extracts just text and emojis from a contenteditable element
	         *
	         * @param {HTMLElement} el
	         * @private
	         */

	    }, {
	        key: "_mapElement",
	        value: function _mapElement(el) {
	            var _this = this;

	            var children = Array.prototype.slice.call(el.childNodes);

	            return children.map( /**Text|HTMLElement*/function (node) {

	                var is_text = node instanceof Text;
	                var is_html = node instanceof HTMLElement;

	                //Return all text from text nodes
	                if (is_text) {
	                    return node.textContent;
	                }
	                //Extract codepoints from span
	                else if (is_html && node.tagName === "SPAN") {
	                        return EmojiEditor._extractSpan(node);
	                    }

	                    //Extract codepoints from an image if it was supplied
	                    else if (is_html && node.tagName === "IMG") {
	                            return EmojiEditor._extractImage(node);
	                        }

	                        //Convert br tags to line breaks
	                        else if (is_html && node.tagName === "BR") {
	                                return "\n";
	                            }

	                            //if the element is not html we're accounting for run it back through this function
	                            else if (is_html) {
	                                    return _this._mapElement(node);
	                                } else {
	                                    //Unaccounted for situation - just return a blank string
	                                    return "";
	                                }
	            }).join("");
	        }

	        /**
	         * Tracks the cursor position and monitors the enter button in case prevent_new_line is true
	         *
	         * @returns {EmojiEditor}
	         * @private
	         */

	    }, {
	        key: "_trackCursor",
	        value: function _trackCursor() {
	            var _this2 = this;

	            if (this._is_content_editable) {
	                (0, _jquery2.default)(this._input).off('keyup.emoji mouseup.emoji').on('keyup.emoji mouseup.emoji', function () {
	                    _this2.cursor_position = EmojiEditor.saveSelection();
	                });

	                (0, _jquery2.default)(this._input).off('keydown.emoji').on('keydown.emoji', function (event) {
	                    if (event.which === 13 && _this2.prevent_new_line) {
	                        event.preventDefault();
	                    }
	                });
	            }

	            return this;
	        }
	        /**
	         * Extracts the text content from a contenteditable and extracts any spans.
	         *
	         * @param span
	         * @returns {String}
	         * @private
	         */

	    }, {
	        key: "replaceUnified",


	        /**
	         * Replaces unified unicode inside of a contenteditable element with
	         * platform appropriate content.
	         *
	         */
	        value: function replaceUnified() {

	            if (this._is_content_editable) {
	                var converter = _Converters2.default.withEnvironment();
	                var html = converter.replace_unified(this._input.innerHTML);
	                EmojiEditor.selectElementContents(this._input);
	                var node = EmojiEditor.pasteHtml(html);
	                if (node) {
	                    EmojiEditor.selectElement(node);
	                }
	            } else {
	                throw new Error("The replaceUnified method should only be called on contenteditable elements.");
	            }
	        }

	        /**
	         * Determines if the environment supports unified unicode.
	         *
	         * @returns {boolean}
	         */

	    }], [{
	        key: "_extractSpan",
	        value: function _extractSpan(span) {
	            var $span = (0, _jquery2.default)(span);
	            var $inner = $span.find('.emoji-inner');
	            //If the span was not inserted by the emoji picker
	            if (!$inner.length) {
	                return "";
	            }
	            //If the span was inserted by the emoji picker, get the codepoints and return the corresponding character
	            try {
	                var codepoint = $inner.data('codepoints');
	                return EmojiEditor.parseCodepoints(codepoint);
	            } catch (err) {
	                return "";
	            }
	        }

	        /**
	         * Extracts codepoints from an image if it exists.
	         *
	         * @param {HTMLElement} img
	         * @private
	         */

	    }, {
	        key: "_extractImage",
	        value: function _extractImage(img) {
	            if (img.hasAttribute('data-codepoints')) {
	                return EmojiEditor.parseCodepoints(img.getAttribute('data-codepoints'));
	            }

	            return "";
	        }

	        /**
	         * Parses codepoints that may come in the format
	         * `hex`-`hex` rather than just `hex`
	         *
	         * @param codepoints
	         * @returns {string}
	         */

	    }, {
	        key: "parseCodepoints",
	        value: function parseCodepoints(codepoints) {

	            if (/-/g.test(codepoints)) {
	                var arr = codepoints.split("-");
	                var one = "0x" + arr[0];
	                var two = "0x" + arr[1];
	                return String.fromCodePoint(one, two);
	            }

	            return String.fromCodePoint("0x" + codepoints);
	        }
	    }, {
	        key: "supportsUnified",
	        value: function supportsUnified() {
	            return _Converters2.default.withEnvironment().replace_mode === "unified";
	        }

	        /**
	         * Shortcut to paste html at the caret with a dummy unicode character.
	         *
	         * @param html
	         */

	    }, {
	        key: "pasteHtml",
	        value: function pasteHtml(html) {
	            return EmojiEditor.pasteHtmlAtCaret(html + "&#8203;");
	        }
	        /**
	         * saves the position of the cursor in a contenteditable div
	         *
	         * Credit goes to Tim Down here
	         *
	         * @returns {Range|null}
	         */

	    }, {
	        key: "saveSelection",
	        value: function saveSelection() {
	            if (window.getSelection) {
	                var sel = window.getSelection();
	                if (sel.getRangeAt && sel.rangeCount) {
	                    return sel.getRangeAt(0);
	                }
	            } else if (document.selection && document.selection.createRange) {
	                return document.selection.createRange();
	            }
	            return null;
	        }

	        /**
	         * Restores the selection using a Range object
	         *
	         * Credit goes to Tim Down here
	         *
	         * @param {Range} range
	         */

	    }, {
	        key: "restoreSelection",
	        value: function restoreSelection(range) {
	            if (range) {
	                if (window.getSelection) {
	                    var sel = window.getSelection();
	                    sel.removeAllRanges();
	                    sel.addRange(range);
	                } else if (document.selection && range.select) {
	                    range.select();
	                }
	            }
	        }

	        /**
	         * Pastes text at the caret position
	         *
	         * Credit goes to Tim Down here
	         *
	         * @param text
	         * @returns {Text}
	         */

	    }, {
	        key: "pasteTextAtCaret",
	        value: function pasteTextAtCaret(text) {
	            var sel = void 0,
	                range = void 0;
	            var node = document.createTextNode(text);
	            if (window.getSelection) {
	                sel = window.getSelection();
	                if (sel.getRangeAt && sel.rangeCount) {
	                    range = sel.getRangeAt(0);
	                    range.deleteContents();
	                    range.insertNode(node);
	                }
	            } else if (document.selection && document.selection.createRange) {
	                document.selection.createRange().text = node.textContent;
	            }

	            return node;
	        }

	        /**
	         * Selects an element an optionally highlights it. If it doesn't highlight,
	         * it just drops the cursor at the end of the element.
	         *
	         *
	         * Credit goes to Tim Down here
	         *
	         * @param element
	         * @param highlight
	         */

	    }, {
	        key: "selectElement",
	        value: function selectElement(element) {
	            var highlight = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	            if (window.getSelection) {
	                var sel = window.getSelection();
	                sel.removeAllRanges();
	                var range = document.createRange();
	                range.selectNodeContents(element);
	                if (!highlight) {
	                    range.collapse(false);
	                }
	                sel.addRange(range);
	            } else if (document.selection) {
	                var text_range = document.body.createTextRange();
	                text_range.moveToElementText(element);
	                text_range.select();
	            }
	        }

	        /**
	         * Pastes html at the caret. Note that to do this without placing the
	         * cursor inside of the html you need to add a dummy unicode character.
	         * For our purposes we'll add the 0-width space and then strip it out when we parse the output
	         *
	         * Credit goes to Tim Down here
	         *
	         * @param html
	         * @param select_pasted_content
	         * @returns {*}
	         */

	    }, {
	        key: "pasteHtmlAtCaret",
	        value: function pasteHtmlAtCaret(html, select_pasted_content) {
	            var sel = void 0,
	                range = void 0;
	            if (window.getSelection) {
	                //IE9+ and non-IE
	                sel = window.getSelection();
	                if (sel.getRangeAt && sel.rangeCount) {
	                    range = sel.getRangeAt(0);
	                    range.deleteContents();

	                    var el = document.createElement("div");
	                    el.innerHTML = html;
	                    var frag = document.createDocumentFragment(),
	                        node = void 0,
	                        last_node = void 0;
	                    while (node = el.firstChild) {
	                        last_node = frag.appendChild(node);
	                    }

	                    var first_node = frag.firstChild;
	                    range.insertNode(frag);

	                    //Preserve the selection
	                    if (last_node) {
	                        range = range.cloneRange();
	                        range.setStartAfter(last_node);
	                        if (select_pasted_content) {
	                            range.setStartBefore(first_node);
	                        } else {
	                            range.collapse(false);
	                        }
	                        sel.removeAllRanges();
	                        sel.addRange(range);
	                    }

	                    return first_node;
	                }
	            } else if ((sel = document.selection) && sel.type != "Control") {
	                // IE < 9
	                var original_range = sel.createRange();
	                original_range.collapse(true);
	                sel.createRange().pasteHTML(html);
	                if (select_pasted_content) {
	                    range = sel.createRange();
	                    range.setEndPoint("StartToStart", original_range);
	                    range.select();
	                }
	            }
	        }

	        /**
	         * Selects the contents of an element.
	         *
	         *
	         * Credit goes to Tim Down here
	         *
	         * @param el
	         */

	    }, {
	        key: "selectElementContents",
	        value: function selectElementContents(el) {
	            var range = document.createRange();
	            range.selectNodeContents(el);
	            var sel = window.getSelection();
	            sel.removeAllRanges();
	            sel.addRange(range);
	        }
	    }]);

	    return EmojiEditor;
	}();

	exports.default = EmojiEditor;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _emoji = __webpack_require__(5);

	var _emoji2 = _interopRequireDefault(_emoji);

	var _defaults = __webpack_require__(6);

	var _defaults2 = _interopRequireDefault(_defaults);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	"use strict";

	var Converters = function () {
	    _createClass(Converters, null, [{
	        key: "factory",


	        /**
	         *
	         * @returns {Converters}
	         */
	        value: function factory() {
	            return new Converters();
	        }

	        /**
	         * Set up each type of converter
	         */

	    }]);

	    function Converters() {
	        _classCallCheck(this, Converters);

	        this.unicode = Converters.unified;
	        this.env = Converters.environment;
	        this.css = Converters.image;
	        this.is_mobile = Converters.deviceIsMobile;

	        if (_defaults2.default.use_sheets) {
	            this.setSheets(_defaults2.default.sheets);
	        }
	    }

	    /**
	     * Sets the image sheets used by class
	     *
	     * @param sheets
	     */


	    _createClass(Converters, [{
	        key: "setSheets",
	        value: function setSheets(sheets) {
	            sheets = sheets || _defaults2.default.sheets;

	            [this.withEnvironment(), this.withImage()].forEach( /**EmojiConvertor*/function (converter) {
	                converter.img_sets.apple.sheet = sheets.apple;
	                converter.img_sets.google.sheet = sheets.google;
	                converter.img_sets.twitter.sheet = sheets.twitter;
	                converter.img_sets.emojione.sheet = sheets.emojione;
	                converter.use_sheet = true;
	            });
	        }

	        /**
	         * Conduct the next operation with the unified converter
	         *
	         * @returns {emoji|*}
	         */

	    }, {
	        key: "withUnified",
	        value: function withUnified() {
	            return this.unicode;
	        }

	        /**
	         * Conduct the next operation with the environment converter
	         *
	         * @returns {emoji|*}
	         */

	    }, {
	        key: "withEnvironment",
	        value: function withEnvironment() {
	            return this.env;
	        }

	        /**
	         * Conduct the next operation with the css-based image converter
	         *
	         * @returns {emoji|*}
	         */

	    }, {
	        key: "withImage",
	        value: function withImage() {
	            return this.css;
	        }

	        /**
	         * Tells us whether or not the environment can support
	         * unicode emojis.
	         *
	         * @returns {boolean}
	         */

	    }, {
	        key: "canSupportUnified",
	        value: function canSupportUnified() {
	            return this.env.replace_mode === "unified";
	        }

	        /**
	         * Getter for unified converter
	         *
	         * @returns {emoji}
	         */

	    }], [{
	        key: "unified",
	        get: function get() {
	            var converter = new _emoji2.default();
	            converter.init_unified();
	            return converter;
	        }

	        /**
	         * Getter for environment converter
	         *
	         * @returns {emoji}
	         */

	    }, {
	        key: "environment",
	        get: function get() {
	            var converter = new _emoji2.default();
	            converter.init_env();
	            //We don't want to use images for now - may revisit this in the future.
	            if (converter.replace_mode === 'img' || converter.replace_mode === 'css') {
	                return Converters.image;
	            }
	            return converter;
	        }

	        /**
	         * Getter for css-based image converter
	         *
	         * @returns {emoji}
	         */

	    }, {
	        key: "image",
	        get: function get() {
	            var converter = new _emoji2.default();
	            converter.init_env();
	            converter.replace_mode = 'css';
	            converter.supports_css = true;
	            return converter;
	        }

	        /**
	         * Insanely comprehensive regex from http://detectmobilebrowsers.com/
	         *
	         * @returns {boolean}
	         */

	    }, {
	        key: "deviceIsMobile",
	        get: function get() {
	            var check = false;
	            (function (a) {
	                if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	            })(navigator.userAgent || navigator.vendor || window.opera);
	            return check;
	        }
	    }]);

	    return Converters;
	}();

	//Export as a singleton


	exports.default = new Converters();

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	;(function () {

		var root = this;
		var previous_emoji = root.EmojiConvertor;

		/**
	  * @global
	  * @namespace
	  */

		var emoji = function emoji() {

			var self = this;

			/**
	   * The set of images to use for graphical emoji.
	   *
	   * @memberof emoji
	   * @type {string}
	   */
			self.img_set = 'apple';

			/**
	   * Configuration details for different image sets. This includes a path to a directory containing the
	   * individual images (`path`) and a URL to sprite sheets (`sheet`). All of these images can be found
	   * in the [emoji-data repository]{@link https://github.com/iamcal/emoji-data}. Using a CDN for these
	   * is not a bad idea.
	   *
	   * @memberof emoji
	   * @type {object}
	   */
			self.img_sets = {
				'apple': { 'path': '/emoji-data/img-apple-64/', 'sheet': '/emoji-data/sheet_apple_64.png', 'mask': 1 },
				'google': { 'path': '/emoji-data/img-google-64/', 'sheet': '/emoji-data/sheet_google_64.png', 'mask': 2 },
				'twitter': { 'path': '/emoji-data/img-twitter-64/', 'sheet': '/emoji-data/sheet_twitter_64.png', 'mask': 4 },
				'emojione': { 'path': '/emoji-data/img-emojione-64/', 'sheet': '/emoji-data/sheet_emojione_64.png', 'mask': 8 }
			};

			/**
	   * Use a CSS class instead of specifying a sprite or background image for
	   * the span representing the emoticon. This requires a CSS sheet with
	   * emoticon data-uris.
	   *
	   * @memberof emoji
	   * @type bool
	   * @todo document how to build the CSS stylesheet self requires.
	   */
			self.use_css_imgs = false;

			/**
	   * Instead of replacing emoticons with the appropriate representations,
	   * replace them with their colon string representation.
	   * @memberof emoji
	   * @type bool
	   */
			self.colons_mode = false;
			self.text_mode = false;

			/**
	   * If true, sets the "title" property on the span or image that gets
	   * inserted for the emoticon.
	   * @memberof emoji
	   * @type bool
	   */
			self.include_title = false;

			/**
	   * If true, sets the text of the span or image that gets inserted for the
	   * emoticon.
	   * @memberof emoji
	   * @type bool
	   */
			self.include_text = false;

			/**
	   * If the platform supports native emoticons, use those instead
	   * of the fallbacks.
	   * @memberof emoji
	   * @type bool
	   */
			self.allow_native = true;

			/**
	   * Set to true to use CSS sprites instead of individual images on 
	   * platforms that support it.
	   *
	   * @memberof emoji
	   * @type bool
	   */
			self.use_sheet = false;

			/**
	   *
	   * Set to true to avoid black & white native Windows emoji being used.
	   *
	   * @memberof emoji
	   * @type bool
	   */
			self.avoid_ms_emoji = true;

			/**
	   *
	   * Set to true to allow :CAPITALIZATION:
	   *
	   * @memberof emoji
	   * @type bool
	   */
			self.allow_caps = false;

			/**
	   *
	   * Suffix to allow for individual image cache busting
	   *
	   * @memberof emoji
	   * @type string
	   */
			self.img_suffix = '';

			// Keeps track of what has been initialized.
			/** @private */
			self.inits = {};
			self.map = {};

			// discover the environment settings
			self.init_env();

			return self;
		};

		emoji.prototype.noConflict = function () {
			root.EmojiConvertor = previous_emoji;
			return emoji;
		};

		/**
	  * @memberof emoji
	  * @param {string} str A string potentially containing ascii emoticons
	  * (ie. `:)`)
	  *
	  * @returns {string} A new string with all emoticons in `str`
	  * replaced by a representatation that's supported by the current
	  * environtment.
	  */
		emoji.prototype.replace_emoticons = function (str) {
			var self = this;
			var colonized = self.replace_emoticons_with_colons(str);
			return self.replace_colons(colonized);
		};

		/**
	  * @memberof emoji
	  * @param {string} str A string potentially containing ascii emoticons
	  * (ie. `:)`)
	  *
	  * @returns {string} A new string with all emoticons in `str`
	  * replaced by their colon string representations (ie. `:smile:`)
	  */
		emoji.prototype.replace_emoticons_with_colons = function (str) {
			var self = this;
			self.init_emoticons();
			var _prev_offset = 0;
			var emoticons_with_parens = [];
			var str_replaced = str.replace(self.rx_emoticons, function (m, $1, emoticon, offset) {
				var prev_offset = _prev_offset;
				_prev_offset = offset + m.length;

				var has_open_paren = emoticon.indexOf('(') !== -1;
				var has_close_paren = emoticon.indexOf(')') !== -1;

				/*
	    * Track paren-having emoticons for fixing later
	    */
				if ((has_open_paren || has_close_paren) && emoticons_with_parens.indexOf(emoticon) == -1) {
					emoticons_with_parens.push(emoticon);
				}

				/*
	    * Look for preceding open paren for emoticons that contain a close paren
	    * This prevents matching "8)" inside "(around 7 - 8)"
	    */
				if (has_close_paren && !has_open_paren) {
					var piece = str.substring(prev_offset, offset);
					if (piece.indexOf('(') !== -1 && piece.indexOf(')') === -1) return m;
				}

				/*
	    * See if we're in a numbered list
	    * This prevents matching "8)" inside "7) foo\n8) bar"
	    */
				if (m === '\n8)') {
					var before_match = str.substring(0, offset);
					if (/\n?(6\)|7\))/.test(before_match)) return m;
				}

				var val = self.data[self.map.emoticons[emoticon]][3][0];
				return val ? $1 + ':' + val + ':' : m;
			});

			/*
	   * Come back and fix emoticons we ignored because they were inside parens.
	   * It's useful to do self at the end so we don't get tripped up by other,
	   * normal emoticons
	   */
			if (emoticons_with_parens.length) {
				var escaped_emoticons = emoticons_with_parens.map(self.escape_rx);
				var parenthetical_rx = new RegExp('(\\(.+)(' + escaped_emoticons.join('|') + ')(.+\\))', 'g');

				str_replaced = str_replaced.replace(parenthetical_rx, function (m, $1, emoticon, $2) {
					var val = self.data[self.map.emoticons[emoticon]][3][0];
					return val ? $1 + ':' + val + ':' + $2 : m;
				});
			}

			return str_replaced;
		};

		/**
	  * @memberof emoji
	  * @param {string} str A string potentially containing colon string
	  * representations of emoticons (ie. `:smile:`)
	  *
	  * @returns {string} A new string with all colon string emoticons replaced
	  * with the appropriate representation.
	  */
		emoji.prototype.replace_colons = function (str) {
			var self = this;
			self.init_colons();

			return str.replace(self.rx_colons, function (m) {
				var idx = m.substr(1, m.length - 2);
				if (self.allow_caps) idx = idx.toLowerCase();

				// special case - an emoji with a skintone modified
				if (idx.indexOf('::skin-tone-') > -1) {

					var skin_tone = idx.substr(-1, 1);
					var skin_idx = 'skin-tone-' + skin_tone;
					var skin_val = self.map.colons[skin_idx];

					idx = idx.substr(0, idx.length - 13);

					var val = self.map.colons[idx];
					if (val) {
						return self.replacement(val, idx, ':', {
							'idx': skin_val,
							'actual': skin_idx,
							'wrapper': ':'
						});
					} else {
						return ':' + idx + ':' + self.replacement(skin_val, skin_idx, ':');
					}
				} else {
					var val = self.map.colons[idx];
					return val ? self.replacement(val, idx, ':') : m;
				}
			});
		};

		/**
	  * @memberof emoji
	  * @param {string} str A string potentially containing unified unicode
	  * emoticons. (ie. 😄)
	  *
	  * @returns {string} A new string with all unicode emoticons replaced with
	  * the appropriate representation for the current environment.
	  */
		emoji.prototype.replace_unified = function (str) {
			var self = this;
			self.init_unified();
			return str.replace(self.rx_unified, function (m, p1, p2) {
				var val = self.map.unified[p1];
				if (!val) return m;
				var idx = null;
				if (p2 == '\uD83C\uDFFB') idx = '1f3fb';
				if (p2 == '\uD83C\uDFFC') idx = '1f3fc';
				if (p2 == '\uD83C\uDFFD') idx = '1f3fd';
				if (p2 == '\uD83C\uDFFE') idx = '1f3fe';
				if (p2 == '\uD83C\uDFFF') idx = '1f3ff';
				if (idx) {
					return self.replacement(val, null, null, {
						idx: idx,
						actual: p2,
						wrapper: ''
					});
				}
				return self.replacement(val);
			});
		};

		emoji.prototype.addAliases = function (map) {
			var self = this;

			self.init_colons();
			for (var i in map) {
				self.map.colons[i] = map[i];
			}
		};

		emoji.prototype.removeAliases = function (list) {
			var self = this;

			for (var i = 0; i < list.length; i++) {
				var alias = list[i];

				// first, delete the alias mapping
				delete self.map.colons[alias];

				// now reset it to the default, if one exists
				finder_block: {
					for (var j in self.data) {
						for (var k = 0; k < self.data[j][3].length; k++) {
							if (alias == self.data[j][3][k]) {
								self.map.colons[alias] = j;
								break finder_block;
							}
						}
					}
				}
			}
		};

		// Does the actual replacement of a character with the appropriate
		/** @private */
		emoji.prototype.replacement = function (idx, actual, wrapper, variation) {
			var self = this;

			var full_idx = idx;

			// for emoji with variation modifiers, set `extra` to the standalone output for the
			// modifier (used if we can't combine the glyph) and set variation_idx to key of the
			// variation modifier (used below)
			var extra = '';
			var variation_idx = 0;
			if ((typeof variation === 'undefined' ? 'undefined' : _typeof(variation)) === 'object') {
				extra = self.replacement(variation.idx, variation.actual, variation.wrapper);
				variation_idx = idx + '-' + variation.idx;
			}

			var img_set = self.img_set;

			// When not using sheets (which all contain all emoji),
			// make sure we use an img_set that contains this emoji.
			// For now, assume set "apple" has all individual images.
			if ((!self.use_sheet || !self.supports_css) && !(self.data[idx][6] & self.img_sets[self.img_set].mask)) {
				img_set = 'apple';
			}

			// deal with simple modes (colons and text) first
			wrapper = wrapper || '';
			if (self.colons_mode) return ':' + self.data[idx][3][0] + ':' + extra;
			var text_name = actual ? wrapper + actual + wrapper : self.data[idx][8] || wrapper + self.data[idx][3][0] + wrapper;
			if (self.text_mode) return text_name + extra;

			// native modes next.
			// for variations selectors, we just need to output them raw, which `extra` will contain.
			self.init_env();
			if (self.replace_mode == 'unified' && self.allow_native && self.data[idx][0][0]) return self.data[idx][0][0] + extra;
			if (self.replace_mode == 'softbank' && self.allow_native && self.data[idx][1]) return self.data[idx][1] + extra;
			if (self.replace_mode == 'google' && self.allow_native && self.data[idx][2]) return self.data[idx][2] + extra;

			// finally deal with image modes.
			// variation selectors are more complex here - if the image set and particular emoji supports variations, then
			// use the variation image. otherwise, return it as a separate image (already calculated in `extra`).
			// first we set up the params we'll use if we can't use a variation.
			var img = self.data[idx][7] || self.img_sets[img_set].path + idx + '.png' + self.img_suffix;
			var title = self.include_title ? ' title="' + (actual || self.data[idx][3][0]) + '"' : '';
			var text = self.include_text ? wrapper + (actual || self.data[idx][3][0]) + wrapper : '';
			var px = self.data[idx][4];
			var py = self.data[idx][5];

			// now we'll see if we can use a varition. if we can, we can override the params above and blank
			// out `extra` so we output a sinlge glyph.
			// we need to check that:
			//  * we requested a variation
			//  * such a variation exists in `emoji.variations_data`
			//  * we're not using a custom image for self glyph
			//  * the variation has an image defined for the current image set
			if (variation_idx && self.variations_data[variation_idx] && self.variations_data[variation_idx][2] && !self.data[idx][7]) {
				if (self.variations_data[variation_idx][2] & self.img_sets[self.img_set].mask) {
					img = self.img_sets[self.img_set].path + variation_idx + '.png';
					px = self.variations_data[variation_idx][0];
					py = self.variations_data[variation_idx][1];
					extra = '';
					full_idx = variation_idx;

					// add variation text
					if (self.include_text && variation && variation.actual && variation.wrapper) {
						text += variation.wrapper + variation.actual + variation.wrapper;
					}
				}
			}

			if (self.supports_css) {
				if (self.use_sheet && px != null && py != null) {
					var mul = 100 / (self.sheet_size - 1);
					var style = 'background: url(' + self.img_sets[img_set].sheet + ');background-position:' + mul * px + '% ' + mul * py + '%;background-size:' + self.sheet_size + '00%';
					return '<span class="emoji-outer emoji-sizer"><span class="emoji-inner" style="' + style + '"' + title + ' data-codepoints="' + full_idx + '">' + text + '</span></span>' + extra;
				} else if (self.use_css_imgs) {
					return '<span class="emoji emoji-' + idx + '"' + title + ' data-codepoints="' + full_idx + '">' + text + '</span>' + extra;
				} else {
					return '<span class="emoji emoji-sizer" style="background-image:url(' + img + ')"' + title + ' data-codepoints="' + full_idx + '">' + text + '</span>' + extra;
				}
			}
			return '<img src="' + img + '" class="emoji" data-codepoints="' + full_idx + '" ' + title + '/>' + extra;
		};

		// Initializes the text emoticon data
		/** @private */
		emoji.prototype.init_emoticons = function () {
			var self = this;
			if (self.inits.emoticons) return;
			self.init_colons(); // we require this for the emoticons map
			self.inits.emoticons = 1;

			var a = [];
			self.map.emoticons = {};
			for (var i in self.emoticons_data) {
				// because we never see some characters in our text except as entities, we must do some replacing
				var emoticon = i.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');

				if (!self.map.colons[self.emoticons_data[i]]) continue;

				self.map.emoticons[emoticon] = self.map.colons[self.emoticons_data[i]];
				a.push(self.escape_rx(emoticon));
			}
			self.rx_emoticons = new RegExp('(^|\\s)(' + a.join('|') + ')(?=$|[\\s|\\?\\.,!])', 'g');
		};

		// Initializes the colon string data
		/** @private */
		emoji.prototype.init_colons = function () {
			var self = this;
			if (self.inits.colons) return;
			self.inits.colons = 1;
			self.rx_colons = new RegExp('\:[a-zA-Z0-9-_+]+\:(\:skin-tone-[2-6]\:)?', 'g');
			self.map.colons = {};
			for (var i in self.data) {
				for (var j = 0; j < self.data[i][3].length; j++) {
					self.map.colons[self.data[i][3][j]] = i;
				}
			}
		};

		// initializes the unified unicode emoticon data
		/** @private */
		emoji.prototype.init_unified = function () {
			var self = this;
			if (self.inits.unified) return;
			self.inits.unified = 1;

			var a = [];
			self.map.unified = {};

			for (var i in self.data) {
				for (var j = 0; j < self.data[i][0].length; j++) {
					a.push(self.data[i][0][j].replace('*', '\\*'));
					self.map.unified[self.data[i][0][j]] = i;
				}
			}

			a = a.sort(function (a, b) {
				return b.length - a.length;
			});

			self.rx_unified = new RegExp('(' + a.join('|') + ')(\uD83C[\uDFFB-\uDFFF])?', "g");
		};

		// initializes the environment, figuring out what representation
		// of emoticons is best.
		/** @private */
		emoji.prototype.init_env = function () {
			var self = this;
			if (self.inits.env) return;
			self.inits.env = 1;
			self.replace_mode = 'img';
			self.supports_css = false;
			if (typeof navigator !== 'undefined') {
				var ua = navigator.userAgent;
				if (window.getComputedStyle) {
					try {
						var st = window.getComputedStyle(document.body);
						if (st['background-size'] || st['backgroundSize']) {
							self.supports_css = true;
						}
					} catch (e) {
						// Swallow an exception caused by hidden iFrames on Firefox
						// https://github.com/iamcal/js-emoji/issues/73
						if (ua.match(/Firefox/i)) {
							self.supports_css = true;
						}
					}
				}
				if (ua.match(/(iPhone|iPod|iPad|iPhone\s+Simulator)/i)) {
					if (ua.match(/OS\s+[12345]/i)) {
						self.replace_mode = 'softbank';
						return;
					}
					if (ua.match(/OS\s+[6789]/i)) {
						self.replace_mode = 'unified';
						return;
					}
				}
				if (ua.match(/Mac OS X 10[._ ](?:[789]|1\d)/i)) {
					self.replace_mode = 'unified';
					return;
				}
				if (!self.avoid_ms_emoji) {
					if (ua.match(/Windows NT 6.[1-9]/i) || ua.match(/Windows NT 10.[0-9]/i)) {
						if (!ua.match(/Chrome/i) && !ua.match(/MSIE 8/i)) {
							self.replace_mode = 'unified';
							return;
						}
					}
				}
			}

			// Need a better way to detect android devices that actually
			// support emoji.
			if (false) {
				self.replace_mode = 'google';
				return;
			}
			if (self.supports_css) {
				self.replace_mode = 'css';
			}
			// nothing fancy detected - use images
		};
		/** @private */
		emoji.prototype.escape_rx = function (text) {
			return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		};
		emoji.prototype.sheet_size = 41;
		/** @private */
		emoji.prototype.data = {
			"00a9": [['\xA9\uFE0F', '\xA9'], '\uE24E', '\uDBBA\uDF29', ["copyright"], 0, 0, 11, 0],
			"00ae": [['\xAE\uFE0F', '\xAE'], '\uE24F', '\uDBBA\uDF2D', ["registered"], 0, 1, 11, 0],
			"203c": [['\u203C\uFE0F', '\u203C'], "", '\uDBBA\uDF06', ["bangbang"], 0, 2, 15, 0],
			"2049": [['\u2049\uFE0F', '\u2049'], "", '\uDBBA\uDF05', ["interrobang"], 0, 3, 15, 0],
			"2122": [['\u2122\uFE0F', '\u2122'], '\uE537', '\uDBBA\uDF2A', ["tm"], 0, 4, 11, 0],
			"2139": [['\u2139\uFE0F', '\u2139'], "", '\uDBBA\uDF47', ["information_source"], 0, 5, 15, 0],
			"2194": [['\u2194\uFE0F', '\u2194'], "", '\uDBBA\uDEF6', ["left_right_arrow"], 0, 6, 15, 0],
			"2195": [['\u2195\uFE0F', '\u2195'], "", '\uDBBA\uDEF7', ["arrow_up_down"], 0, 7, 15, 0],
			"2196": [['\u2196\uFE0F', '\u2196'], '\uE237', '\uDBBA\uDEF2', ["arrow_upper_left"], 0, 8, 15, 0],
			"2197": [['\u2197\uFE0F', '\u2197'], '\uE236', '\uDBBA\uDEF0', ["arrow_upper_right"], 0, 9, 15, 0],
			"2198": [['\u2198\uFE0F', '\u2198'], '\uE238', '\uDBBA\uDEF1', ["arrow_lower_right"], 0, 10, 15, 0],
			"2199": [['\u2199\uFE0F', '\u2199'], '\uE239', '\uDBBA\uDEF3', ["arrow_lower_left"], 0, 11, 15, 0],
			"21a9": [['\u21A9\uFE0F', '\u21A9'], "", '\uDBBA\uDF83', ["leftwards_arrow_with_hook"], 0, 12, 15, 0],
			"21aa": [['\u21AA\uFE0F', '\u21AA'], "", '\uDBBA\uDF88', ["arrow_right_hook"], 0, 13, 15, 0],
			"231a": [['\u231A\uFE0F', '\u231A'], "", '\uDBB8\uDC1D', ["watch"], 0, 14, 15, 0],
			"231b": [['\u231B\uFE0F', '\u231B'], "", '\uDBB8\uDC1C', ["hourglass"], 0, 15, 15, 0],
			"2328": [['\u2328\uFE0F', '\u2328'], "", "", ["keyboard"], 0, 16, 15, 0],
			"23cf": [['\u23CF'], "", "", ["eject"], 0, 17, 2, 0],
			"23e9": [['\u23E9'], '\uE23C', '\uDBBA\uDEFE', ["fast_forward"], 0, 18, 15, 0],
			"23ea": [['\u23EA'], '\uE23D', '\uDBBA\uDEFF', ["rewind"], 0, 19, 15, 0],
			"23eb": [['\u23EB'], "", '\uDBBA\uDF03', ["arrow_double_up"], 0, 20, 15, 0],
			"23ec": [['\u23EC'], "", '\uDBBA\uDF02', ["arrow_double_down"], 0, 21, 15, 0],
			"23ed": [['\u23ED'], "", "", ["black_right_pointing_double_triangle_with_vertical_bar"], 0, 22, 15, 0],
			"23ee": [['\u23EE'], "", "", ["black_left_pointing_double_triangle_with_vertical_bar"], 0, 23, 15, 0],
			"23ef": [['\u23EF'], "", "", ["black_right_pointing_triangle_with_double_vertical_bar"], 0, 24, 15, 0],
			"23f0": [['\u23F0'], '\uE02D', '\uDBB8\uDC2A', ["alarm_clock"], 0, 25, 15, 0],
			"23f1": [['\u23F1'], "", "", ["stopwatch"], 0, 26, 15, 0],
			"23f2": [['\u23F2'], "", "", ["timer_clock"], 0, 27, 15, 0],
			"23f3": [['\u23F3'], "", '\uDBB8\uDC1B', ["hourglass_flowing_sand"], 0, 28, 15, 0],
			"23f8": [['\u23F8'], "", "", ["double_vertical_bar"], 0, 29, 15, 0],
			"23f9": [['\u23F9'], "", "", ["black_square_for_stop"], 0, 30, 15, 0],
			"23fa": [['\u23FA'], "", "", ["black_circle_for_record"], 0, 31, 15, 0],
			"24c2": [['\u24C2\uFE0F', '\u24C2'], '\uE434', '\uDBB9\uDFE1', ["m"], 0, 32, 15, 0],
			"25aa": [['\u25AA\uFE0F', '\u25AA'], '\uE21A', '\uDBBA\uDF6E', ["black_small_square"], 0, 33, 15, 0],
			"25ab": [['\u25AB\uFE0F', '\u25AB'], '\uE21B', '\uDBBA\uDF6D', ["white_small_square"], 0, 34, 15, 0],
			"25b6": [['\u25B6\uFE0F', '\u25B6'], '\uE23A', '\uDBBA\uDEFC', ["arrow_forward"], 0, 35, 15, 0],
			"25c0": [['\u25C0\uFE0F', '\u25C0'], '\uE23B', '\uDBBA\uDEFD', ["arrow_backward"], 0, 36, 15, 0],
			"25fb": [['\u25FB\uFE0F', '\u25FB'], '\uE21B', '\uDBBA\uDF71', ["white_medium_square"], 0, 37, 15, 0],
			"25fc": [['\u25FC\uFE0F', '\u25FC'], '\uE21A', '\uDBBA\uDF72', ["black_medium_square"], 0, 38, 15, 0],
			"25fd": [['\u25FD\uFE0F', '\u25FD'], '\uE21B', '\uDBBA\uDF6F', ["white_medium_small_square"], 0, 39, 15, 0],
			"25fe": [['\u25FE\uFE0F', '\u25FE'], '\uE21A', '\uDBBA\uDF70', ["black_medium_small_square"], 0, 40, 15, 0],
			"2600": [['\u2600\uFE0F', '\u2600'], '\uE04A', '\uDBB8\uDC00', ["sunny"], 1, 0, 15, 0],
			"2601": [['\u2601\uFE0F', '\u2601'], '\uE049', '\uDBB8\uDC01', ["cloud"], 1, 1, 15, 0],
			"2602": [['\u2602\uFE0F', '\u2602'], "", "", ["umbrella"], 1, 2, 15, 0],
			"2603": [['\u2603\uFE0F', '\u2603'], "", "", ["snowman"], 1, 3, 15, 0],
			"2604": [['\u2604\uFE0F', '\u2604'], "", "", ["comet"], 1, 4, 15, 0],
			"260e": [['\u260E\uFE0F', '\u260E'], '\uE009', '\uDBB9\uDD23', ["phone", "telephone"], 1, 5, 15, 0],
			"2611": [['\u2611\uFE0F', '\u2611'], "", '\uDBBA\uDF8B', ["ballot_box_with_check"], 1, 6, 15, 0],
			"2614": [['\u2614\uFE0F', '\u2614'], '\uE04B', '\uDBB8\uDC02', ["umbrella_with_rain_drops"], 1, 7, 15, 0],
			"2615": [['\u2615\uFE0F', '\u2615'], '\uE045', '\uDBBA\uDD81', ["coffee"], 1, 8, 15, 0],
			"2618": [['\u2618'], "", "", ["shamrock"], 1, 9, 15, 0],
			"261d": [['\u261D\uFE0F', '\u261D'], '\uE00F', '\uDBBA\uDF98', ["point_up"], 1, 10, 15, 0],
			"2620": [['\u2620\uFE0F', '\u2620'], "", "", ["skull_and_crossbones"], 1, 16, 15, 0],
			"2622": [['\u2622\uFE0F', '\u2622'], "", "", ["radioactive_sign"], 1, 17, 15, 0],
			"2623": [['\u2623\uFE0F', '\u2623'], "", "", ["biohazard_sign"], 1, 18, 15, 0],
			"2626": [['\u2626\uFE0F', '\u2626'], "", "", ["orthodox_cross"], 1, 19, 15, 0],
			"262a": [['\u262A\uFE0F', '\u262A'], "", "", ["star_and_crescent"], 1, 20, 15, 0],
			"262e": [['\u262E\uFE0F', '\u262E'], "", "", ["peace_symbol"], 1, 21, 15, 0],
			"262f": [['\u262F\uFE0F', '\u262F'], "", "", ["yin_yang"], 1, 22, 15, 0],
			"2638": [['\u2638\uFE0F', '\u2638'], "", "", ["wheel_of_dharma"], 1, 23, 15, 0],
			"2639": [['\u2639\uFE0F', '\u2639'], "", "", ["white_frowning_face"], 1, 24, 15, 0],
			"263a": [['\u263A\uFE0F', '\u263A'], '\uE414', '\uDBB8\uDF36', ["relaxed"], 1, 25, 15, 0],
			"2648": [['\u2648\uFE0F', '\u2648'], '\uE23F', '\uDBB8\uDC2B', ["aries"], 1, 26, 15, 0],
			"2649": [['\u2649\uFE0F', '\u2649'], '\uE240', '\uDBB8\uDC2C', ["taurus"], 1, 27, 15, 0],
			"264a": [['\u264A\uFE0F', '\u264A'], '\uE241', '\uDBB8\uDC2D', ["gemini"], 1, 28, 15, 0],
			"264b": [['\u264B\uFE0F', '\u264B'], '\uE242', '\uDBB8\uDC2E', ["cancer"], 1, 29, 15, 0],
			"264c": [['\u264C\uFE0F', '\u264C'], '\uE243', '\uDBB8\uDC2F', ["leo"], 1, 30, 15, 0],
			"264d": [['\u264D\uFE0F', '\u264D'], '\uE244', '\uDBB8\uDC30', ["virgo"], 1, 31, 15, 0],
			"264e": [['\u264E\uFE0F', '\u264E'], '\uE245', '\uDBB8\uDC31', ["libra"], 1, 32, 15, 0],
			"264f": [['\u264F\uFE0F', '\u264F'], '\uE246', '\uDBB8\uDC32', ["scorpius"], 1, 33, 15, 0],
			"2650": [['\u2650\uFE0F', '\u2650'], '\uE247', '\uDBB8\uDC33', ["sagittarius"], 1, 34, 15, 0],
			"2651": [['\u2651\uFE0F', '\u2651'], '\uE248', '\uDBB8\uDC34', ["capricorn"], 1, 35, 15, 0],
			"2652": [['\u2652\uFE0F', '\u2652'], '\uE249', '\uDBB8\uDC35', ["aquarius"], 1, 36, 15, 0],
			"2653": [['\u2653\uFE0F', '\u2653'], '\uE24A', '\uDBB8\uDC36', ["pisces"], 1, 37, 15, 0],
			"2660": [['\u2660\uFE0F', '\u2660'], '\uE20E', '\uDBBA\uDF1B', ["spades"], 1, 38, 15, 0],
			"2663": [['\u2663\uFE0F', '\u2663'], '\uE20F', '\uDBBA\uDF1D', ["clubs"], 1, 39, 15, 0],
			"2665": [['\u2665\uFE0F', '\u2665'], '\uE20C', '\uDBBA\uDF1A', ["hearts"], 1, 40, 15, 0],
			"2666": [['\u2666\uFE0F', '\u2666'], '\uE20D', '\uDBBA\uDF1C', ["diamonds"], 2, 0, 15, 0],
			"2668": [['\u2668\uFE0F', '\u2668'], '\uE123', '\uDBB9\uDFFA', ["hotsprings"], 2, 1, 15, 0],
			"267b": [['\u267B\uFE0F', '\u267B'], "", '\uDBBA\uDF2C', ["recycle"], 2, 2, 15, 0],
			"267f": [['\u267F\uFE0F', '\u267F'], '\uE20A', '\uDBBA\uDF20', ["wheelchair"], 2, 3, 15, 0],
			"2692": [['\u2692'], "", "", ["hammer_and_pick"], 2, 4, 15, 0],
			"2693": [['\u2693\uFE0F', '\u2693'], '\uE202', '\uDBB9\uDCC1', ["anchor"], 2, 5, 15, 0],
			"2694": [['\u2694'], "", "", ["crossed_swords"], 2, 6, 15, 0],
			"2696": [['\u2696'], "", "", ["scales"], 2, 7, 15, 0],
			"2697": [['\u2697'], "", "", ["alembic"], 2, 8, 15, 0],
			"2699": [['\u2699'], "", "", ["gear"], 2, 9, 15, 0],
			"269b": [['\u269B'], "", "", ["atom_symbol"], 2, 10, 15, 0],
			"269c": [['\u269C'], "", "", ["fleur_de_lis"], 2, 11, 15, 0],
			"26a0": [['\u26A0\uFE0F', '\u26A0'], '\uE252', '\uDBBA\uDF23', ["warning"], 2, 12, 15, 0],
			"26a1": [['\u26A1\uFE0F', '\u26A1'], '\uE13D', '\uDBB8\uDC04', ["zap"], 2, 13, 15, 0],
			"26aa": [['\u26AA\uFE0F', '\u26AA'], '\uE219', '\uDBBA\uDF65', ["white_circle"], 2, 14, 15, 0],
			"26ab": [['\u26AB\uFE0F', '\u26AB'], '\uE219', '\uDBBA\uDF66', ["black_circle"], 2, 15, 15, 0],
			"26b0": [['\u26B0'], "", "", ["coffin"], 2, 16, 15, 0],
			"26b1": [['\u26B1'], "", "", ["funeral_urn"], 2, 17, 15, 0],
			"26bd": [['\u26BD\uFE0F', '\u26BD'], '\uE018', '\uDBB9\uDFD4', ["soccer"], 2, 18, 15, 0],
			"26be": [['\u26BE\uFE0F', '\u26BE'], '\uE016', '\uDBB9\uDFD1', ["baseball"], 2, 19, 15, 0],
			"26c4": [['\u26C4\uFE0F', '\u26C4'], '\uE048', '\uDBB8\uDC03', ["snowman_without_snow"], 2, 20, 15, 0],
			"26c5": [['\u26C5\uFE0F', '\u26C5'], '\uE04A\uE049', '\uDBB8\uDC0F', ["partly_sunny"], 2, 21, 15, 0],
			"26c8": [['\u26C8'], "", "", ["thunder_cloud_and_rain"], 2, 22, 15, 0],
			"26ce": [['\u26CE'], '\uE24B', '\uDBB8\uDC37', ["ophiuchus"], 2, 23, 15, 0],
			"26cf": [['\u26CF'], "", "", ["pick"], 2, 24, 15, 0],
			"26d1": [['\u26D1'], "", "", ["helmet_with_white_cross"], 2, 25, 15, 0],
			"26d3": [['\u26D3'], "", "", ["chains"], 2, 26, 15, 0],
			"26d4": [['\u26D4\uFE0F', '\u26D4'], '\uE137', '\uDBBA\uDF26', ["no_entry"], 2, 27, 15, 0],
			"26e9": [['\u26E9'], "", "", ["shinto_shrine"], 2, 28, 15, 0],
			"26ea": [['\u26EA\uFE0F', '\u26EA'], '\uE037', '\uDBB9\uDCBB', ["church"], 2, 29, 15, 0],
			"26f0": [['\u26F0'], "", "", ["mountain"], 2, 30, 15, 0],
			"26f1": [['\u26F1'], "", "", ["umbrella_on_ground"], 2, 31, 15, 0],
			"26f2": [['\u26F2\uFE0F', '\u26F2'], '\uE121', '\uDBB9\uDCBC', ["fountain"], 2, 32, 15, 0],
			"26f3": [['\u26F3\uFE0F', '\u26F3'], '\uE014', '\uDBB9\uDFD2', ["golf"], 2, 33, 15, 0],
			"26f4": [['\u26F4'], "", "", ["ferry"], 2, 34, 15, 0],
			"26f5": [['\u26F5\uFE0F', '\u26F5'], '\uE01C', '\uDBB9\uDFEA', ["boat", "sailboat"], 2, 35, 15, 0],
			"26f7": [['\u26F7'], "", "", ["skier"], 2, 36, 15, 0],
			"26f8": [['\u26F8'], "", "", ["ice_skate"], 2, 37, 15, 0],
			"26f9": [['\u26F9'], "", "", ["person_with_ball"], 2, 38, 15, 0],
			"26fa": [['\u26FA\uFE0F', '\u26FA'], '\uE122', '\uDBB9\uDFFB', ["tent"], 3, 3, 15, 0],
			"26fd": [['\u26FD\uFE0F', '\u26FD'], '\uE03A', '\uDBB9\uDFF5', ["fuelpump"], 3, 4, 15, 0],
			"2702": [['\u2702\uFE0F', '\u2702'], '\uE313', '\uDBB9\uDD3E', ["scissors"], 3, 5, 15, 0],
			"2705": [['\u2705'], "", '\uDBBA\uDF4A', ["white_check_mark"], 3, 6, 15, 0],
			"2708": [['\u2708\uFE0F', '\u2708'], '\uE01D', '\uDBB9\uDFE9', ["airplane"], 3, 7, 15, 0],
			"2709": [['\u2709\uFE0F', '\u2709'], '\uE103', '\uDBB9\uDD29', ["email", "envelope"], 3, 8, 15, 0],
			"270a": [['\u270A'], '\uE010', '\uDBBA\uDF93', ["fist"], 3, 9, 15, 0],
			"270b": [['\u270B'], '\uE012', '\uDBBA\uDF95', ["hand", "raised_hand"], 3, 15, 15, 0],
			"270c": [['\u270C\uFE0F', '\u270C'], '\uE011', '\uDBBA\uDF94', ["v"], 3, 21, 15, 0],
			"270d": [['\u270D\uFE0F', '\u270D'], "", "", ["writing_hand"], 3, 27, 15, 0],
			"270f": [['\u270F\uFE0F', '\u270F'], '\uE301', '\uDBB9\uDD39', ["pencil2"], 3, 33, 15, 0],
			"2712": [['\u2712\uFE0F', '\u2712'], "", '\uDBB9\uDD36', ["black_nib"], 3, 34, 15, 0],
			"2714": [['\u2714\uFE0F', '\u2714'], "", '\uDBBA\uDF49', ["heavy_check_mark"], 3, 35, 15, 0],
			"2716": [['\u2716\uFE0F', '\u2716'], '\uE333', '\uDBBA\uDF53', ["heavy_multiplication_x"], 3, 36, 15, 0],
			"271d": [['\u271D\uFE0F', '\u271D'], "", "", ["latin_cross"], 3, 37, 15, 0],
			"2721": [['\u2721\uFE0F', '\u2721'], "", "", ["star_of_david"], 3, 38, 15, 0],
			"2728": [['\u2728'], '\uE32E', '\uDBBA\uDF60', ["sparkles"], 3, 39, 15, 0],
			"2733": [['\u2733\uFE0F', '\u2733'], '\uE206', '\uDBBA\uDF62', ["eight_spoked_asterisk"], 3, 40, 15, 0],
			"2734": [['\u2734\uFE0F', '\u2734'], '\uE205', '\uDBBA\uDF61', ["eight_pointed_black_star"], 4, 0, 15, 0],
			"2744": [['\u2744\uFE0F', '\u2744'], "", '\uDBB8\uDC0E', ["snowflake"], 4, 1, 15, 0],
			"2747": [['\u2747\uFE0F', '\u2747'], '\uE32E', '\uDBBA\uDF77', ["sparkle"], 4, 2, 15, 0],
			"274c": [['\u274C'], '\uE333', '\uDBBA\uDF45', ["x"], 4, 3, 15, 0],
			"274e": [['\u274E'], '\uE333', '\uDBBA\uDF46', ["negative_squared_cross_mark"], 4, 4, 15, 0],
			"2753": [['\u2753'], '\uE020', '\uDBBA\uDF09', ["question"], 4, 5, 15, 0],
			"2754": [['\u2754'], '\uE336', '\uDBBA\uDF0A', ["grey_question"], 4, 6, 15, 0],
			"2755": [['\u2755'], '\uE337', '\uDBBA\uDF0B', ["grey_exclamation"], 4, 7, 15, 0],
			"2757": [['\u2757\uFE0F', '\u2757'], '\uE021', '\uDBBA\uDF04', ["exclamation", "heavy_exclamation_mark"], 4, 8, 15, 0],
			"2763": [['\u2763\uFE0F', '\u2763'], "", "", ["heavy_heart_exclamation_mark_ornament"], 4, 9, 15, 0],
			"2764": [['\u2764\uFE0F', '\u2764'], '\uE022', '\uDBBA\uDF0C', ["heart"], 4, 10, 15, 0, "<3"],
			"2795": [['\u2795'], "", '\uDBBA\uDF51', ["heavy_plus_sign"], 4, 11, 15, 0],
			"2796": [['\u2796'], "", '\uDBBA\uDF52', ["heavy_minus_sign"], 4, 12, 15, 0],
			"2797": [['\u2797'], "", '\uDBBA\uDF54', ["heavy_division_sign"], 4, 13, 15, 0],
			"27a1": [['\u27A1\uFE0F', '\u27A1'], '\uE234', '\uDBBA\uDEFA', ["arrow_right"], 4, 14, 15, 0],
			"27b0": [['\u27B0'], "", '\uDBBA\uDF08', ["curly_loop"], 4, 15, 15, 0],
			"27bf": [['\u27BF'], '\uE211', '\uDBBA\uDC2B', ["loop"], 4, 16, 15, 0],
			"2934": [['\u2934\uFE0F', '\u2934'], '\uE236', '\uDBBA\uDEF4', ["arrow_heading_up"], 4, 17, 15, 0],
			"2935": [['\u2935\uFE0F', '\u2935'], '\uE238', '\uDBBA\uDEF5', ["arrow_heading_down"], 4, 18, 15, 0],
			"2b05": [['\u2B05\uFE0F', '\u2B05'], '\uE235', '\uDBBA\uDEFB', ["arrow_left"], 4, 19, 15, 0],
			"2b06": [['\u2B06\uFE0F', '\u2B06'], '\uE232', '\uDBBA\uDEF8', ["arrow_up"], 4, 20, 15, 0],
			"2b07": [['\u2B07\uFE0F', '\u2B07'], '\uE233', '\uDBBA\uDEF9', ["arrow_down"], 4, 21, 15, 0],
			"2b1b": [['\u2B1B\uFE0F', '\u2B1B'], '\uE21A', '\uDBBA\uDF6C', ["black_large_square"], 4, 22, 15, 0],
			"2b1c": [['\u2B1C\uFE0F', '\u2B1C'], '\uE21B', '\uDBBA\uDF6B', ["white_large_square"], 4, 23, 15, 0],
			"2b50": [['\u2B50\uFE0F', '\u2B50'], '\uE32F', '\uDBBA\uDF68', ["star"], 4, 24, 15, 0],
			"2b55": [['\u2B55\uFE0F', '\u2B55'], '\uE332', '\uDBBA\uDF44', ["o"], 4, 25, 15, 0],
			"3030": [['\u3030\uFE0F', '\u3030'], "", '\uDBBA\uDF07', ["wavy_dash"], 4, 26, 15, 0],
			"303d": [['\u303D\uFE0F', '\u303D'], '\uE12C', '\uDBBA\uDC1B', ["part_alternation_mark"], 4, 27, 15, 0],
			"3297": [['\u3297\uFE0F', '\u3297'], '\uE30D', '\uDBBA\uDF43', ["congratulations"], 4, 28, 15, 0],
			"3299": [['\u3299\uFE0F', '\u3299'], '\uE315', '\uDBBA\uDF2B', ["secret"], 4, 29, 15, 0],
			"1f004": [['\uD83C\uDC04\uFE0F', '\uD83C\uDC04'], '\uE12D', '\uDBBA\uDC0B', ["mahjong"], 4, 30, 15, 0],
			"1f0cf": [['\uD83C\uDCCF'], "", '\uDBBA\uDC12', ["black_joker"], 4, 31, 15, 0],
			"1f170": [['\uD83C\uDD70\uFE0F', '\uD83C\uDD70'], '\uE532', '\uDBB9\uDD0B', ["a"], 4, 32, 15, 0],
			"1f171": [['\uD83C\uDD71\uFE0F', '\uD83C\uDD71'], '\uE533', '\uDBB9\uDD0C', ["b"], 4, 33, 15, 0],
			"1f17e": [['\uD83C\uDD7E\uFE0F', '\uD83C\uDD7E'], '\uE535', '\uDBB9\uDD0E', ["o2"], 4, 34, 15, 0],
			"1f17f": [['\uD83C\uDD7F\uFE0F', '\uD83C\uDD7F'], '\uE14F', '\uDBB9\uDFF6', ["parking"], 4, 35, 15, 0],
			"1f18e": [['\uD83C\uDD8E'], '\uE534', '\uDBB9\uDD0D', ["ab"], 4, 36, 15, 0],
			"1f191": [['\uD83C\uDD91'], "", '\uDBBA\uDF84', ["cl"], 4, 37, 15, 0],
			"1f192": [['\uD83C\uDD92'], '\uE214', '\uDBBA\uDF38', ["cool"], 4, 38, 15, 0],
			"1f193": [['\uD83C\uDD93'], "", '\uDBBA\uDF21', ["free"], 4, 39, 15, 0],
			"1f194": [['\uD83C\uDD94'], '\uE229', '\uDBBA\uDF81', ["id"], 4, 40, 15, 0],
			"1f195": [['\uD83C\uDD95'], '\uE212', '\uDBBA\uDF36', ["new"], 5, 0, 15, 0],
			"1f196": [['\uD83C\uDD96'], "", '\uDBBA\uDF28', ["ng"], 5, 1, 15, 0],
			"1f197": [['\uD83C\uDD97'], '\uE24D', '\uDBBA\uDF27', ["ok"], 5, 2, 15, 0],
			"1f198": [['\uD83C\uDD98'], "", '\uDBBA\uDF4F', ["sos"], 5, 3, 15, 0],
			"1f199": [['\uD83C\uDD99'], '\uE213', '\uDBBA\uDF37', ["up"], 5, 4, 15, 0],
			"1f19a": [['\uD83C\uDD9A'], '\uE12E', '\uDBBA\uDF32', ["vs"], 5, 5, 15, 0],
			"1f201": [['\uD83C\uDE01'], '\uE203', '\uDBBA\uDF24', ["koko"], 5, 6, 15, 0],
			"1f202": [['\uD83C\uDE02\uFE0F', '\uD83C\uDE02'], '\uE228', '\uDBBA\uDF3F', ["sa"], 5, 7, 15, 0],
			"1f21a": [['\uD83C\uDE1A\uFE0F', '\uD83C\uDE1A'], '\uE216', '\uDBBA\uDF3A', ["u7121"], 5, 8, 15, 0],
			"1f22f": [['\uD83C\uDE2F\uFE0F', '\uD83C\uDE2F'], '\uE22C', '\uDBBA\uDF40', ["u6307"], 5, 9, 15, 0],
			"1f232": [['\uD83C\uDE32'], "", '\uDBBA\uDF2E', ["u7981"], 5, 10, 15, 0],
			"1f233": [['\uD83C\uDE33'], '\uE22B', '\uDBBA\uDF2F', ["u7a7a"], 5, 11, 15, 0],
			"1f234": [['\uD83C\uDE34'], "", '\uDBBA\uDF30', ["u5408"], 5, 12, 15, 0],
			"1f235": [['\uD83C\uDE35'], '\uE22A', '\uDBBA\uDF31', ["u6e80"], 5, 13, 15, 0],
			"1f236": [['\uD83C\uDE36'], '\uE215', '\uDBBA\uDF39', ["u6709"], 5, 14, 15, 0],
			"1f237": [['\uD83C\uDE37\uFE0F', '\uD83C\uDE37'], '\uE217', '\uDBBA\uDF3B', ["u6708"], 5, 15, 15, 0],
			"1f238": [['\uD83C\uDE38'], '\uE218', '\uDBBA\uDF3C', ["u7533"], 5, 16, 15, 0],
			"1f239": [['\uD83C\uDE39'], '\uE227', '\uDBBA\uDF3E', ["u5272"], 5, 17, 15, 0],
			"1f23a": [['\uD83C\uDE3A'], '\uE22D', '\uDBBA\uDF41', ["u55b6"], 5, 18, 15, 0],
			"1f250": [['\uD83C\uDE50'], '\uE226', '\uDBBA\uDF3D', ["ideograph_advantage"], 5, 19, 15, 0],
			"1f251": [['\uD83C\uDE51'], "", '\uDBBA\uDF50', ["accept"], 5, 20, 15, 0],
			"1f300": [['\uD83C\uDF00'], '\uE443', '\uDBB8\uDC05', ["cyclone"], 5, 21, 15, 0],
			"1f301": [['\uD83C\uDF01'], "", '\uDBB8\uDC06', ["foggy"], 5, 22, 15, 0],
			"1f302": [['\uD83C\uDF02'], '\uE43C', '\uDBB8\uDC07', ["closed_umbrella"], 5, 23, 15, 0],
			"1f303": [['\uD83C\uDF03'], '\uE44B', '\uDBB8\uDC08', ["night_with_stars"], 5, 24, 15, 0],
			"1f304": [['\uD83C\uDF04'], '\uE04D', '\uDBB8\uDC09', ["sunrise_over_mountains"], 5, 25, 15, 0],
			"1f305": [['\uD83C\uDF05'], '\uE449', '\uDBB8\uDC0A', ["sunrise"], 5, 26, 15, 0],
			"1f306": [['\uD83C\uDF06'], '\uE146', '\uDBB8\uDC0B', ["city_sunset"], 5, 27, 15, 0],
			"1f307": [['\uD83C\uDF07'], '\uE44A', '\uDBB8\uDC0C', ["city_sunrise"], 5, 28, 15, 0],
			"1f308": [['\uD83C\uDF08'], '\uE44C', '\uDBB8\uDC0D', ["rainbow"], 5, 29, 15, 0],
			"1f309": [['\uD83C\uDF09'], '\uE44B', '\uDBB8\uDC10', ["bridge_at_night"], 5, 30, 15, 0],
			"1f30a": [['\uD83C\uDF0A'], '\uE43E', '\uDBB8\uDC38', ["ocean"], 5, 31, 15, 0],
			"1f30b": [['\uD83C\uDF0B'], "", '\uDBB8\uDC3A', ["volcano"], 5, 32, 15, 0],
			"1f30c": [['\uD83C\uDF0C'], '\uE44B', '\uDBB8\uDC3B', ["milky_way"], 5, 33, 15, 0],
			"1f30d": [['\uD83C\uDF0D'], "", "", ["earth_africa"], 5, 34, 15, 0],
			"1f30e": [['\uD83C\uDF0E'], "", "", ["earth_americas"], 5, 35, 15, 0],
			"1f30f": [['\uD83C\uDF0F'], "", '\uDBB8\uDC39', ["earth_asia"], 5, 36, 15, 0],
			"1f310": [['\uD83C\uDF10'], "", "", ["globe_with_meridians"], 5, 37, 15, 0],
			"1f311": [['\uD83C\uDF11'], "", '\uDBB8\uDC11', ["new_moon"], 5, 38, 15, 0],
			"1f312": [['\uD83C\uDF12'], "", "", ["waxing_crescent_moon"], 5, 39, 15, 0],
			"1f313": [['\uD83C\uDF13'], '\uE04C', '\uDBB8\uDC13', ["first_quarter_moon"], 5, 40, 15, 0],
			"1f314": [['\uD83C\uDF14'], '\uE04C', '\uDBB8\uDC12', ["moon", "waxing_gibbous_moon"], 6, 0, 15, 0],
			"1f315": [['\uD83C\uDF15'], "", '\uDBB8\uDC15', ["full_moon"], 6, 1, 15, 0],
			"1f316": [['\uD83C\uDF16'], "", "", ["waning_gibbous_moon"], 6, 2, 15, 0],
			"1f317": [['\uD83C\uDF17'], "", "", ["last_quarter_moon"], 6, 3, 15, 0],
			"1f318": [['\uD83C\uDF18'], "", "", ["waning_crescent_moon"], 6, 4, 15, 0],
			"1f319": [['\uD83C\uDF19'], '\uE04C', '\uDBB8\uDC14', ["crescent_moon"], 6, 5, 15, 0],
			"1f31a": [['\uD83C\uDF1A'], "", "", ["new_moon_with_face"], 6, 6, 15, 0],
			"1f31b": [['\uD83C\uDF1B'], '\uE04C', '\uDBB8\uDC16', ["first_quarter_moon_with_face"], 6, 7, 15, 0],
			"1f31c": [['\uD83C\uDF1C'], "", "", ["last_quarter_moon_with_face"], 6, 8, 15, 0],
			"1f31d": [['\uD83C\uDF1D'], "", "", ["full_moon_with_face"], 6, 9, 15, 0],
			"1f31e": [['\uD83C\uDF1E'], "", "", ["sun_with_face"], 6, 10, 15, 0],
			"1f31f": [['\uD83C\uDF1F'], '\uE335', '\uDBBA\uDF69', ["star2"], 6, 11, 15, 0],
			"1f320": [['\uD83C\uDF20'], "", '\uDBBA\uDF6A', ["stars"], 6, 12, 15, 0],
			"1f321": [['\uD83C\uDF21'], "", "", ["thermometer"], 6, 13, 15, 0],
			"1f324": [['\uD83C\uDF24'], "", "", ["mostly_sunny", "sun_small_cloud"], 6, 14, 15, 0],
			"1f325": [['\uD83C\uDF25'], "", "", ["barely_sunny", "sun_behind_cloud"], 6, 15, 15, 0],
			"1f326": [['\uD83C\uDF26'], "", "", ["partly_sunny_rain", "sun_behind_rain_cloud"], 6, 16, 15, 0],
			"1f327": [['\uD83C\uDF27'], "", "", ["rain_cloud"], 6, 17, 15, 0],
			"1f328": [['\uD83C\uDF28'], "", "", ["snow_cloud"], 6, 18, 15, 0],
			"1f329": [['\uD83C\uDF29'], "", "", ["lightning", "lightning_cloud"], 6, 19, 15, 0],
			"1f32a": [['\uD83C\uDF2A'], "", "", ["tornado", "tornado_cloud"], 6, 20, 15, 0],
			"1f32b": [['\uD83C\uDF2B'], "", "", ["fog"], 6, 21, 15, 0],
			"1f32c": [['\uD83C\uDF2C'], "", "", ["wind_blowing_face"], 6, 22, 15, 0],
			"1f32d": [['\uD83C\uDF2D'], "", "", ["hotdog"], 6, 23, 15, 0],
			"1f32e": [['\uD83C\uDF2E'], "", "", ["taco"], 6, 24, 15, 0],
			"1f32f": [['\uD83C\uDF2F'], "", "", ["burrito"], 6, 25, 15, 0],
			"1f330": [['\uD83C\uDF30'], "", '\uDBB8\uDC4C', ["chestnut"], 6, 26, 15, 0],
			"1f331": [['\uD83C\uDF31'], '\uE110', '\uDBB8\uDC3E', ["seedling"], 6, 27, 15, 0],
			"1f332": [['\uD83C\uDF32'], "", "", ["evergreen_tree"], 6, 28, 15, 0],
			"1f333": [['\uD83C\uDF33'], "", "", ["deciduous_tree"], 6, 29, 15, 0],
			"1f334": [['\uD83C\uDF34'], '\uE307', '\uDBB8\uDC47', ["palm_tree"], 6, 30, 15, 0],
			"1f335": [['\uD83C\uDF35'], '\uE308', '\uDBB8\uDC48', ["cactus"], 6, 31, 15, 0],
			"1f336": [['\uD83C\uDF36'], "", "", ["hot_pepper"], 6, 32, 15, 0],
			"1f337": [['\uD83C\uDF37'], '\uE304', '\uDBB8\uDC3D', ["tulip"], 6, 33, 15, 0],
			"1f338": [['\uD83C\uDF38'], '\uE030', '\uDBB8\uDC40', ["cherry_blossom"], 6, 34, 15, 0],
			"1f339": [['\uD83C\uDF39'], '\uE032', '\uDBB8\uDC41', ["rose"], 6, 35, 15, 0],
			"1f33a": [['\uD83C\uDF3A'], '\uE303', '\uDBB8\uDC45', ["hibiscus"], 6, 36, 15, 0],
			"1f33b": [['\uD83C\uDF3B'], '\uE305', '\uDBB8\uDC46', ["sunflower"], 6, 37, 15, 0],
			"1f33c": [['\uD83C\uDF3C'], '\uE305', '\uDBB8\uDC4D', ["blossom"], 6, 38, 15, 0],
			"1f33d": [['\uD83C\uDF3D'], "", '\uDBB8\uDC4A', ["corn"], 6, 39, 15, 0],
			"1f33e": [['\uD83C\uDF3E'], '\uE444', '\uDBB8\uDC49', ["ear_of_rice"], 6, 40, 15, 0],
			"1f33f": [['\uD83C\uDF3F'], '\uE110', '\uDBB8\uDC4E', ["herb"], 7, 0, 15, 0],
			"1f340": [['\uD83C\uDF40'], '\uE110', '\uDBB8\uDC3C', ["four_leaf_clover"], 7, 1, 15, 0],
			"1f341": [['\uD83C\uDF41'], '\uE118', '\uDBB8\uDC3F', ["maple_leaf"], 7, 2, 15, 0],
			"1f342": [['\uD83C\uDF42'], '\uE119', '\uDBB8\uDC42', ["fallen_leaf"], 7, 3, 15, 0],
			"1f343": [['\uD83C\uDF43'], '\uE447', '\uDBB8\uDC43', ["leaves"], 7, 4, 15, 0],
			"1f344": [['\uD83C\uDF44'], "", '\uDBB8\uDC4B', ["mushroom"], 7, 5, 15, 0],
			"1f345": [['\uD83C\uDF45'], '\uE349', '\uDBB8\uDC55', ["tomato"], 7, 6, 15, 0],
			"1f346": [['\uD83C\uDF46'], '\uE34A', '\uDBB8\uDC56', ["eggplant"], 7, 7, 15, 0],
			"1f347": [['\uD83C\uDF47'], "", '\uDBB8\uDC59', ["grapes"], 7, 8, 15, 0],
			"1f348": [['\uD83C\uDF48'], "", '\uDBB8\uDC57', ["melon"], 7, 9, 15, 0],
			"1f349": [['\uD83C\uDF49'], '\uE348', '\uDBB8\uDC54', ["watermelon"], 7, 10, 15, 0],
			"1f34a": [['\uD83C\uDF4A'], '\uE346', '\uDBB8\uDC52', ["tangerine"], 7, 11, 15, 0],
			"1f34b": [['\uD83C\uDF4B'], "", "", ["lemon"], 7, 12, 15, 0],
			"1f34c": [['\uD83C\uDF4C'], "", '\uDBB8\uDC50', ["banana"], 7, 13, 15, 0],
			"1f34d": [['\uD83C\uDF4D'], "", '\uDBB8\uDC58', ["pineapple"], 7, 14, 15, 0],
			"1f34e": [['\uD83C\uDF4E'], '\uE345', '\uDBB8\uDC51', ["apple"], 7, 15, 15, 0],
			"1f34f": [['\uD83C\uDF4F'], '\uE345', '\uDBB8\uDC5B', ["green_apple"], 7, 16, 15, 0],
			"1f350": [['\uD83C\uDF50'], "", "", ["pear"], 7, 17, 15, 0],
			"1f351": [['\uD83C\uDF51'], "", '\uDBB8\uDC5A', ["peach"], 7, 18, 15, 0],
			"1f352": [['\uD83C\uDF52'], "", '\uDBB8\uDC4F', ["cherries"], 7, 19, 15, 0],
			"1f353": [['\uD83C\uDF53'], '\uE347', '\uDBB8\uDC53', ["strawberry"], 7, 20, 15, 0],
			"1f354": [['\uD83C\uDF54'], '\uE120', '\uDBBA\uDD60', ["hamburger"], 7, 21, 15, 0],
			"1f355": [['\uD83C\uDF55'], "", '\uDBBA\uDD75', ["pizza"], 7, 22, 15, 0],
			"1f356": [['\uD83C\uDF56'], "", '\uDBBA\uDD72', ["meat_on_bone"], 7, 23, 15, 0],
			"1f357": [['\uD83C\uDF57'], "", '\uDBBA\uDD76', ["poultry_leg"], 7, 24, 15, 0],
			"1f358": [['\uD83C\uDF58'], '\uE33D', '\uDBBA\uDD69', ["rice_cracker"], 7, 25, 15, 0],
			"1f359": [['\uD83C\uDF59'], '\uE342', '\uDBBA\uDD61', ["rice_ball"], 7, 26, 15, 0],
			"1f35a": [['\uD83C\uDF5A'], '\uE33E', '\uDBBA\uDD6A', ["rice"], 7, 27, 15, 0],
			"1f35b": [['\uD83C\uDF5B'], '\uE341', '\uDBBA\uDD6C', ["curry"], 7, 28, 15, 0],
			"1f35c": [['\uD83C\uDF5C'], '\uE340', '\uDBBA\uDD63', ["ramen"], 7, 29, 15, 0],
			"1f35d": [['\uD83C\uDF5D'], '\uE33F', '\uDBBA\uDD6B', ["spaghetti"], 7, 30, 15, 0],
			"1f35e": [['\uD83C\uDF5E'], '\uE339', '\uDBBA\uDD64', ["bread"], 7, 31, 15, 0],
			"1f35f": [['\uD83C\uDF5F'], '\uE33B', '\uDBBA\uDD67', ["fries"], 7, 32, 15, 0],
			"1f360": [['\uD83C\uDF60'], "", '\uDBBA\uDD74', ["sweet_potato"], 7, 33, 15, 0],
			"1f361": [['\uD83C\uDF61'], '\uE33C', '\uDBBA\uDD68', ["dango"], 7, 34, 15, 0],
			"1f362": [['\uD83C\uDF62'], '\uE343', '\uDBBA\uDD6D', ["oden"], 7, 35, 15, 0],
			"1f363": [['\uD83C\uDF63'], '\uE344', '\uDBBA\uDD6E', ["sushi"], 7, 36, 15, 0],
			"1f364": [['\uD83C\uDF64'], "", '\uDBBA\uDD7F', ["fried_shrimp"], 7, 37, 15, 0],
			"1f365": [['\uD83C\uDF65'], "", '\uDBBA\uDD73', ["fish_cake"], 7, 38, 15, 0],
			"1f366": [['\uD83C\uDF66'], '\uE33A', '\uDBBA\uDD66', ["icecream"], 7, 39, 15, 0],
			"1f367": [['\uD83C\uDF67'], '\uE43F', '\uDBBA\uDD71', ["shaved_ice"], 7, 40, 15, 0],
			"1f368": [['\uD83C\uDF68'], "", '\uDBBA\uDD77', ["ice_cream"], 8, 0, 15, 0],
			"1f369": [['\uD83C\uDF69'], "", '\uDBBA\uDD78', ["doughnut"], 8, 1, 15, 0],
			"1f36a": [['\uD83C\uDF6A'], "", '\uDBBA\uDD79', ["cookie"], 8, 2, 15, 0],
			"1f36b": [['\uD83C\uDF6B'], "", '\uDBBA\uDD7A', ["chocolate_bar"], 8, 3, 15, 0],
			"1f36c": [['\uD83C\uDF6C'], "", '\uDBBA\uDD7B', ["candy"], 8, 4, 15, 0],
			"1f36d": [['\uD83C\uDF6D'], "", '\uDBBA\uDD7C', ["lollipop"], 8, 5, 15, 0],
			"1f36e": [['\uD83C\uDF6E'], "", '\uDBBA\uDD7D', ["custard"], 8, 6, 15, 0],
			"1f36f": [['\uD83C\uDF6F'], "", '\uDBBA\uDD7E', ["honey_pot"], 8, 7, 15, 0],
			"1f370": [['\uD83C\uDF70'], '\uE046', '\uDBBA\uDD62', ["cake"], 8, 8, 15, 0],
			"1f371": [['\uD83C\uDF71'], '\uE34C', '\uDBBA\uDD6F', ["bento"], 8, 9, 15, 0],
			"1f372": [['\uD83C\uDF72'], '\uE34D', '\uDBBA\uDD70', ["stew"], 8, 10, 15, 0],
			"1f373": [['\uD83C\uDF73'], '\uE147', '\uDBBA\uDD65', ["egg"], 8, 11, 15, 0],
			"1f374": [['\uD83C\uDF74'], '\uE043', '\uDBBA\uDD80', ["fork_and_knife"], 8, 12, 15, 0],
			"1f375": [['\uD83C\uDF75'], '\uE338', '\uDBBA\uDD84', ["tea"], 8, 13, 15, 0],
			"1f376": [['\uD83C\uDF76'], '\uE30B', '\uDBBA\uDD85', ["sake"], 8, 14, 15, 0],
			"1f377": [['\uD83C\uDF77'], '\uE044', '\uDBBA\uDD86', ["wine_glass"], 8, 15, 15, 0],
			"1f378": [['\uD83C\uDF78'], '\uE044', '\uDBBA\uDD82', ["cocktail"], 8, 16, 15, 0],
			"1f379": [['\uD83C\uDF79'], '\uE044', '\uDBBA\uDD88', ["tropical_drink"], 8, 17, 15, 0],
			"1f37a": [['\uD83C\uDF7A'], '\uE047', '\uDBBA\uDD83', ["beer"], 8, 18, 15, 0],
			"1f37b": [['\uD83C\uDF7B'], '\uE30C', '\uDBBA\uDD87', ["beers"], 8, 19, 15, 0],
			"1f37c": [['\uD83C\uDF7C'], "", "", ["baby_bottle"], 8, 20, 15, 0],
			"1f37d": [['\uD83C\uDF7D'], "", "", ["knife_fork_plate"], 8, 21, 15, 0],
			"1f37e": [['\uD83C\uDF7E'], "", "", ["champagne"], 8, 22, 15, 0],
			"1f37f": [['\uD83C\uDF7F'], "", "", ["popcorn"], 8, 23, 15, 0],
			"1f380": [['\uD83C\uDF80'], '\uE314', '\uDBB9\uDD0F', ["ribbon"], 8, 24, 15, 0],
			"1f381": [['\uD83C\uDF81'], '\uE112', '\uDBB9\uDD10', ["gift"], 8, 25, 15, 0],
			"1f382": [['\uD83C\uDF82'], '\uE34B', '\uDBB9\uDD11', ["birthday"], 8, 26, 15, 0],
			"1f383": [['\uD83C\uDF83'], '\uE445', '\uDBB9\uDD1F', ["jack_o_lantern"], 8, 27, 15, 0],
			"1f384": [['\uD83C\uDF84'], '\uE033', '\uDBB9\uDD12', ["christmas_tree"], 8, 28, 15, 0],
			"1f385": [['\uD83C\uDF85'], '\uE448', '\uDBB9\uDD13', ["santa"], 8, 29, 15, 0],
			"1f386": [['\uD83C\uDF86'], '\uE117', '\uDBB9\uDD15', ["fireworks"], 8, 35, 15, 0],
			"1f387": [['\uD83C\uDF87'], '\uE440', '\uDBB9\uDD1D', ["sparkler"], 8, 36, 15, 0],
			"1f388": [['\uD83C\uDF88'], '\uE310', '\uDBB9\uDD16', ["balloon"], 8, 37, 15, 0],
			"1f389": [['\uD83C\uDF89'], '\uE312', '\uDBB9\uDD17', ["tada"], 8, 38, 15, 0],
			"1f38a": [['\uD83C\uDF8A'], "", '\uDBB9\uDD20', ["confetti_ball"], 8, 39, 15, 0],
			"1f38b": [['\uD83C\uDF8B'], "", '\uDBB9\uDD21', ["tanabata_tree"], 8, 40, 15, 0],
			"1f38c": [['\uD83C\uDF8C'], '\uE143', '\uDBB9\uDD14', ["crossed_flags"], 9, 0, 15, 0],
			"1f38d": [['\uD83C\uDF8D'], '\uE436', '\uDBB9\uDD18', ["bamboo"], 9, 1, 15, 0],
			"1f38e": [['\uD83C\uDF8E'], '\uE438', '\uDBB9\uDD19', ["dolls"], 9, 2, 15, 0],
			"1f38f": [['\uD83C\uDF8F'], '\uE43B', '\uDBB9\uDD1C', ["flags"], 9, 3, 15, 0],
			"1f390": [['\uD83C\uDF90'], '\uE442', '\uDBB9\uDD1E', ["wind_chime"], 9, 4, 15, 0],
			"1f391": [['\uD83C\uDF91'], '\uE446', '\uDBB8\uDC17', ["rice_scene"], 9, 5, 15, 0],
			"1f392": [['\uD83C\uDF92'], '\uE43A', '\uDBB9\uDD1B', ["school_satchel"], 9, 6, 15, 0],
			"1f393": [['\uD83C\uDF93'], '\uE439', '\uDBB9\uDD1A', ["mortar_board"], 9, 7, 15, 0],
			"1f396": [['\uD83C\uDF96'], "", "", ["medal"], 9, 8, 15, 0],
			"1f397": [['\uD83C\uDF97'], "", "", ["reminder_ribbon"], 9, 9, 15, 0],
			"1f399": [['\uD83C\uDF99'], "", "", ["studio_microphone"], 9, 10, 15, 0],
			"1f39a": [['\uD83C\uDF9A'], "", "", ["level_slider"], 9, 11, 15, 0],
			"1f39b": [['\uD83C\uDF9B'], "", "", ["control_knobs"], 9, 12, 15, 0],
			"1f39e": [['\uD83C\uDF9E'], "", "", ["film_frames"], 9, 13, 15, 0],
			"1f39f": [['\uD83C\uDF9F'], "", "", ["admission_tickets"], 9, 14, 15, 0],
			"1f3a0": [['\uD83C\uDFA0'], "", '\uDBB9\uDFFC', ["carousel_horse"], 9, 15, 15, 0],
			"1f3a1": [['\uD83C\uDFA1'], '\uE124', '\uDBB9\uDFFD', ["ferris_wheel"], 9, 16, 15, 0],
			"1f3a2": [['\uD83C\uDFA2'], '\uE433', '\uDBB9\uDFFE', ["roller_coaster"], 9, 17, 15, 0],
			"1f3a3": [['\uD83C\uDFA3'], '\uE019', '\uDBB9\uDFFF', ["fishing_pole_and_fish"], 9, 18, 15, 0],
			"1f3a4": [['\uD83C\uDFA4'], '\uE03C', '\uDBBA\uDC00', ["microphone"], 9, 19, 15, 0],
			"1f3a5": [['\uD83C\uDFA5'], '\uE03D', '\uDBBA\uDC01', ["movie_camera"], 9, 20, 15, 0],
			"1f3a6": [['\uD83C\uDFA6'], '\uE507', '\uDBBA\uDC02', ["cinema"], 9, 21, 15, 0],
			"1f3a7": [['\uD83C\uDFA7'], '\uE30A', '\uDBBA\uDC03', ["headphones"], 9, 22, 15, 0],
			"1f3a8": [['\uD83C\uDFA8'], '\uE502', '\uDBBA\uDC04', ["art"], 9, 23, 15, 0],
			"1f3a9": [['\uD83C\uDFA9'], '\uE503', '\uDBBA\uDC05', ["tophat"], 9, 24, 15, 0],
			"1f3aa": [['\uD83C\uDFAA'], "", '\uDBBA\uDC06', ["circus_tent"], 9, 25, 15, 0],
			"1f3ab": [['\uD83C\uDFAB'], '\uE125', '\uDBBA\uDC07', ["ticket"], 9, 26, 15, 0],
			"1f3ac": [['\uD83C\uDFAC'], '\uE324', '\uDBBA\uDC08', ["clapper"], 9, 27, 15, 0],
			"1f3ad": [['\uD83C\uDFAD'], '\uE503', '\uDBBA\uDC09', ["performing_arts"], 9, 28, 15, 0],
			"1f3ae": [['\uD83C\uDFAE'], "", '\uDBBA\uDC0A', ["video_game"], 9, 29, 15, 0],
			"1f3af": [['\uD83C\uDFAF'], '\uE130', '\uDBBA\uDC0C', ["dart"], 9, 30, 15, 0],
			"1f3b0": [['\uD83C\uDFB0'], '\uE133', '\uDBBA\uDC0D', ["slot_machine"], 9, 31, 15, 0],
			"1f3b1": [['\uD83C\uDFB1'], '\uE42C', '\uDBBA\uDC0E', ["8ball"], 9, 32, 15, 0],
			"1f3b2": [['\uD83C\uDFB2'], "", '\uDBBA\uDC0F', ["game_die"], 9, 33, 15, 0],
			"1f3b3": [['\uD83C\uDFB3'], "", '\uDBBA\uDC10', ["bowling"], 9, 34, 15, 0],
			"1f3b4": [['\uD83C\uDFB4'], "", '\uDBBA\uDC11', ["flower_playing_cards"], 9, 35, 15, 0],
			"1f3b5": [['\uD83C\uDFB5'], '\uE03E', '\uDBBA\uDC13', ["musical_note"], 9, 36, 15, 0],
			"1f3b6": [['\uD83C\uDFB6'], '\uE326', '\uDBBA\uDC14', ["notes"], 9, 37, 15, 0],
			"1f3b7": [['\uD83C\uDFB7'], '\uE040', '\uDBBA\uDC15', ["saxophone"], 9, 38, 15, 0],
			"1f3b8": [['\uD83C\uDFB8'], '\uE041', '\uDBBA\uDC16', ["guitar"], 9, 39, 15, 0],
			"1f3b9": [['\uD83C\uDFB9'], "", '\uDBBA\uDC17', ["musical_keyboard"], 9, 40, 15, 0],
			"1f3ba": [['\uD83C\uDFBA'], '\uE042', '\uDBBA\uDC18', ["trumpet"], 10, 0, 15, 0],
			"1f3bb": [['\uD83C\uDFBB'], "", '\uDBBA\uDC19', ["violin"], 10, 1, 15, 0],
			"1f3bc": [['\uD83C\uDFBC'], '\uE326', '\uDBBA\uDC1A', ["musical_score"], 10, 2, 15, 0],
			"1f3bd": [['\uD83C\uDFBD'], "", '\uDBB9\uDFD0', ["running_shirt_with_sash"], 10, 3, 15, 0],
			"1f3be": [['\uD83C\uDFBE'], '\uE015', '\uDBB9\uDFD3', ["tennis"], 10, 4, 15, 0],
			"1f3bf": [['\uD83C\uDFBF'], '\uE013', '\uDBB9\uDFD5', ["ski"], 10, 5, 15, 0],
			"1f3c0": [['\uD83C\uDFC0'], '\uE42A', '\uDBB9\uDFD6', ["basketball"], 10, 6, 15, 0],
			"1f3c1": [['\uD83C\uDFC1'], '\uE132', '\uDBB9\uDFD7', ["checkered_flag"], 10, 7, 15, 0],
			"1f3c2": [['\uD83C\uDFC2'], "", '\uDBB9\uDFD8', ["snowboarder"], 10, 8, 15, 0],
			"1f3c3": [['\uD83C\uDFC3'], '\uE115', '\uDBB9\uDFD9', ["runner", "running"], 10, 9, 15, 0],
			"1f3c4": [['\uD83C\uDFC4'], '\uE017', '\uDBB9\uDFDA', ["surfer"], 10, 15, 15, 0],
			"1f3c5": [['\uD83C\uDFC5'], "", "", ["sports_medal"], 10, 21, 15, 0],
			"1f3c6": [['\uD83C\uDFC6'], '\uE131', '\uDBB9\uDFDB', ["trophy"], 10, 22, 15, 0],
			"1f3c7": [['\uD83C\uDFC7'], "", "", ["horse_racing"], 10, 23, 15, 0],
			"1f3c8": [['\uD83C\uDFC8'], '\uE42B', '\uDBB9\uDFDD', ["football"], 10, 24, 15, 0],
			"1f3c9": [['\uD83C\uDFC9'], "", "", ["rugby_football"], 10, 25, 15, 0],
			"1f3ca": [['\uD83C\uDFCA'], '\uE42D', '\uDBB9\uDFDE', ["swimmer"], 10, 26, 15, 0],
			"1f3cb": [['\uD83C\uDFCB'], "", "", ["weight_lifter"], 10, 32, 15, 0],
			"1f3cc": [['\uD83C\uDFCC'], "", "", ["golfer"], 10, 38, 15, 0],
			"1f3cd": [['\uD83C\uDFCD'], "", "", ["racing_motorcycle"], 10, 39, 15, 0],
			"1f3ce": [['\uD83C\uDFCE'], "", "", ["racing_car"], 10, 40, 15, 0],
			"1f3cf": [['\uD83C\uDFCF'], "", "", ["cricket_bat_and_ball"], 11, 0, 15, 0],
			"1f3d0": [['\uD83C\uDFD0'], "", "", ["volleyball"], 11, 1, 15, 0],
			"1f3d1": [['\uD83C\uDFD1'], "", "", ["field_hockey_stick_and_ball"], 11, 2, 15, 0],
			"1f3d2": [['\uD83C\uDFD2'], "", "", ["ice_hockey_stick_and_puck"], 11, 3, 15, 0],
			"1f3d3": [['\uD83C\uDFD3'], "", "", ["table_tennis_paddle_and_ball"], 11, 4, 15, 0],
			"1f3d4": [['\uD83C\uDFD4'], "", "", ["snow_capped_mountain"], 11, 5, 15, 0],
			"1f3d5": [['\uD83C\uDFD5'], "", "", ["camping"], 11, 6, 15, 0],
			"1f3d6": [['\uD83C\uDFD6'], "", "", ["beach_with_umbrella"], 11, 7, 15, 0],
			"1f3d7": [['\uD83C\uDFD7'], "", "", ["building_construction"], 11, 8, 15, 0],
			"1f3d8": [['\uD83C\uDFD8'], "", "", ["house_buildings"], 11, 9, 15, 0],
			"1f3d9": [['\uD83C\uDFD9'], "", "", ["cityscape"], 11, 10, 15, 0],
			"1f3da": [['\uD83C\uDFDA'], "", "", ["derelict_house_building"], 11, 11, 15, 0],
			"1f3db": [['\uD83C\uDFDB'], "", "", ["classical_building"], 11, 12, 15, 0],
			"1f3dc": [['\uD83C\uDFDC'], "", "", ["desert"], 11, 13, 15, 0],
			"1f3dd": [['\uD83C\uDFDD'], "", "", ["desert_island"], 11, 14, 15, 0],
			"1f3de": [['\uD83C\uDFDE'], "", "", ["national_park"], 11, 15, 15, 0],
			"1f3df": [['\uD83C\uDFDF'], "", "", ["stadium"], 11, 16, 15, 0],
			"1f3e0": [['\uD83C\uDFE0'], '\uE036', '\uDBB9\uDCB0', ["house"], 11, 17, 15, 0],
			"1f3e1": [['\uD83C\uDFE1'], '\uE036', '\uDBB9\uDCB1', ["house_with_garden"], 11, 18, 15, 0],
			"1f3e2": [['\uD83C\uDFE2'], '\uE038', '\uDBB9\uDCB2', ["office"], 11, 19, 15, 0],
			"1f3e3": [['\uD83C\uDFE3'], '\uE153', '\uDBB9\uDCB3', ["post_office"], 11, 20, 15, 0],
			"1f3e4": [['\uD83C\uDFE4'], "", "", ["european_post_office"], 11, 21, 15, 0],
			"1f3e5": [['\uD83C\uDFE5'], '\uE155', '\uDBB9\uDCB4', ["hospital"], 11, 22, 15, 0],
			"1f3e6": [['\uD83C\uDFE6'], '\uE14D', '\uDBB9\uDCB5', ["bank"], 11, 23, 15, 0],
			"1f3e7": [['\uD83C\uDFE7'], '\uE154', '\uDBB9\uDCB6', ["atm"], 11, 24, 15, 0],
			"1f3e8": [['\uD83C\uDFE8'], '\uE158', '\uDBB9\uDCB7', ["hotel"], 11, 25, 15, 0],
			"1f3e9": [['\uD83C\uDFE9'], '\uE501', '\uDBB9\uDCB8', ["love_hotel"], 11, 26, 15, 0],
			"1f3ea": [['\uD83C\uDFEA'], '\uE156', '\uDBB9\uDCB9', ["convenience_store"], 11, 27, 15, 0],
			"1f3eb": [['\uD83C\uDFEB'], '\uE157', '\uDBB9\uDCBA', ["school"], 11, 28, 15, 0],
			"1f3ec": [['\uD83C\uDFEC'], '\uE504', '\uDBB9\uDCBD', ["department_store"], 11, 29, 15, 0],
			"1f3ed": [['\uD83C\uDFED'], '\uE508', '\uDBB9\uDCC0', ["factory"], 11, 30, 15, 0],
			"1f3ee": [['\uD83C\uDFEE'], '\uE30B', '\uDBB9\uDCC2', ["izakaya_lantern", "lantern"], 11, 31, 15, 0],
			"1f3ef": [['\uD83C\uDFEF'], '\uE505', '\uDBB9\uDCBE', ["japanese_castle"], 11, 32, 15, 0],
			"1f3f0": [['\uD83C\uDFF0'], '\uE506', '\uDBB9\uDCBF', ["european_castle"], 11, 33, 15, 0],
			"1f3f3": [['\uD83C\uDFF3'], "", "", ["waving_white_flag"], 11, 34, 15, 0],
			"1f3f4": [['\uD83C\uDFF4'], "", "", ["waving_black_flag"], 11, 35, 15, 0],
			"1f3f5": [['\uD83C\uDFF5'], "", "", ["rosette"], 11, 36, 15, 0],
			"1f3f7": [['\uD83C\uDFF7'], "", "", ["label"], 11, 37, 15, 0],
			"1f3f8": [['\uD83C\uDFF8'], "", "", ["badminton_racquet_and_shuttlecock"], 11, 38, 15, 0],
			"1f3f9": [['\uD83C\uDFF9'], "", "", ["bow_and_arrow"], 11, 39, 15, 0],
			"1f3fa": [['\uD83C\uDFFA'], "", "", ["amphora"], 11, 40, 15, 0],
			"1f3fb": [['\uD83C\uDFFB'], "", "", ["skin-tone-2"], 12, 0, 15, 0],
			"1f3fc": [['\uD83C\uDFFC'], "", "", ["skin-tone-3"], 12, 1, 15, 0],
			"1f3fd": [['\uD83C\uDFFD'], "", "", ["skin-tone-4"], 12, 2, 15, 0],
			"1f3fe": [['\uD83C\uDFFE'], "", "", ["skin-tone-5"], 12, 3, 15, 0],
			"1f3ff": [['\uD83C\uDFFF'], "", "", ["skin-tone-6"], 12, 4, 15, 0],
			"1f400": [['\uD83D\uDC00'], "", "", ["rat"], 12, 5, 15, 0],
			"1f401": [['\uD83D\uDC01'], "", "", ["mouse2"], 12, 6, 15, 0],
			"1f402": [['\uD83D\uDC02'], "", "", ["ox"], 12, 7, 15, 0],
			"1f403": [['\uD83D\uDC03'], "", "", ["water_buffalo"], 12, 8, 15, 0],
			"1f404": [['\uD83D\uDC04'], "", "", ["cow2"], 12, 9, 15, 0],
			"1f405": [['\uD83D\uDC05'], "", "", ["tiger2"], 12, 10, 15, 0],
			"1f406": [['\uD83D\uDC06'], "", "", ["leopard"], 12, 11, 15, 0],
			"1f407": [['\uD83D\uDC07'], "", "", ["rabbit2"], 12, 12, 15, 0],
			"1f408": [['\uD83D\uDC08'], "", "", ["cat2"], 12, 13, 15, 0],
			"1f409": [['\uD83D\uDC09'], "", "", ["dragon"], 12, 14, 15, 0],
			"1f40a": [['\uD83D\uDC0A'], "", "", ["crocodile"], 12, 15, 15, 0],
			"1f40b": [['\uD83D\uDC0B'], "", "", ["whale2"], 12, 16, 15, 0],
			"1f40c": [['\uD83D\uDC0C'], "", '\uDBB8\uDDB9', ["snail"], 12, 17, 15, 0],
			"1f40d": [['\uD83D\uDC0D'], '\uE52D', '\uDBB8\uDDD3', ["snake"], 12, 18, 15, 0],
			"1f40e": [['\uD83D\uDC0E'], '\uE134', '\uDBB9\uDFDC', ["racehorse"], 12, 19, 15, 0],
			"1f40f": [['\uD83D\uDC0F'], "", "", ["ram"], 12, 20, 15, 0],
			"1f410": [['\uD83D\uDC10'], "", "", ["goat"], 12, 21, 15, 0],
			"1f411": [['\uD83D\uDC11'], '\uE529', '\uDBB8\uDDCF', ["sheep"], 12, 22, 15, 0],
			"1f412": [['\uD83D\uDC12'], '\uE528', '\uDBB8\uDDCE', ["monkey"], 12, 23, 15, 0],
			"1f413": [['\uD83D\uDC13'], "", "", ["rooster"], 12, 24, 15, 0],
			"1f414": [['\uD83D\uDC14'], '\uE52E', '\uDBB8\uDDD4', ["chicken"], 12, 25, 15, 0],
			"1f415": [['\uD83D\uDC15'], "", "", ["dog2"], 12, 26, 15, 0],
			"1f416": [['\uD83D\uDC16'], "", "", ["pig2"], 12, 27, 15, 0],
			"1f417": [['\uD83D\uDC17'], '\uE52F', '\uDBB8\uDDD5', ["boar"], 12, 28, 15, 0],
			"1f418": [['\uD83D\uDC18'], '\uE526', '\uDBB8\uDDCC', ["elephant"], 12, 29, 15, 0],
			"1f419": [['\uD83D\uDC19'], '\uE10A', '\uDBB8\uDDC5', ["octopus"], 12, 30, 15, 0],
			"1f41a": [['\uD83D\uDC1A'], '\uE441', '\uDBB8\uDDC6', ["shell"], 12, 31, 15, 0],
			"1f41b": [['\uD83D\uDC1B'], '\uE525', '\uDBB8\uDDCB', ["bug"], 12, 32, 15, 0],
			"1f41c": [['\uD83D\uDC1C'], "", '\uDBB8\uDDDA', ["ant"], 12, 33, 15, 0],
			"1f41d": [['\uD83D\uDC1D'], "", '\uDBB8\uDDE1', ["bee", "honeybee"], 12, 34, 15, 0],
			"1f41e": [['\uD83D\uDC1E'], "", '\uDBB8\uDDE2', ["beetle"], 12, 35, 15, 0],
			"1f41f": [['\uD83D\uDC1F'], '\uE019', '\uDBB8\uDDBD', ["fish"], 12, 36, 15, 0],
			"1f420": [['\uD83D\uDC20'], '\uE522', '\uDBB8\uDDC9', ["tropical_fish"], 12, 37, 15, 0],
			"1f421": [['\uD83D\uDC21'], '\uE019', '\uDBB8\uDDD9', ["blowfish"], 12, 38, 15, 0],
			"1f422": [['\uD83D\uDC22'], "", '\uDBB8\uDDDC', ["turtle"], 12, 39, 15, 0],
			"1f423": [['\uD83D\uDC23'], '\uE523', '\uDBB8\uDDDD', ["hatching_chick"], 12, 40, 15, 0],
			"1f424": [['\uD83D\uDC24'], '\uE523', '\uDBB8\uDDBA', ["baby_chick"], 13, 0, 15, 0],
			"1f425": [['\uD83D\uDC25'], '\uE523', '\uDBB8\uDDBB', ["hatched_chick"], 13, 1, 15, 0],
			"1f426": [['\uD83D\uDC26'], '\uE521', '\uDBB8\uDDC8', ["bird"], 13, 2, 15, 0],
			"1f427": [['\uD83D\uDC27'], '\uE055', '\uDBB8\uDDBC', ["penguin"], 13, 3, 15, 0],
			"1f428": [['\uD83D\uDC28'], '\uE527', '\uDBB8\uDDCD', ["koala"], 13, 4, 15, 0],
			"1f429": [['\uD83D\uDC29'], '\uE052', '\uDBB8\uDDD8', ["poodle"], 13, 5, 15, 0],
			"1f42a": [['\uD83D\uDC2A'], "", "", ["dromedary_camel"], 13, 6, 15, 0],
			"1f42b": [['\uD83D\uDC2B'], '\uE530', '\uDBB8\uDDD6', ["camel"], 13, 7, 15, 0],
			"1f42c": [['\uD83D\uDC2C'], '\uE520', '\uDBB8\uDDC7', ["dolphin", "flipper"], 13, 8, 15, 0],
			"1f42d": [['\uD83D\uDC2D'], '\uE053', '\uDBB8\uDDC2', ["mouse"], 13, 9, 15, 0],
			"1f42e": [['\uD83D\uDC2E'], '\uE52B', '\uDBB8\uDDD1', ["cow"], 13, 10, 15, 0],
			"1f42f": [['\uD83D\uDC2F'], '\uE050', '\uDBB8\uDDC0', ["tiger"], 13, 11, 15, 0],
			"1f430": [['\uD83D\uDC30'], '\uE52C', '\uDBB8\uDDD2', ["rabbit"], 13, 12, 15, 0],
			"1f431": [['\uD83D\uDC31'], '\uE04F', '\uDBB8\uDDB8', ["cat"], 13, 13, 15, 0],
			"1f432": [['\uD83D\uDC32'], "", '\uDBB8\uDDDE', ["dragon_face"], 13, 14, 15, 0],
			"1f433": [['\uD83D\uDC33'], '\uE054', '\uDBB8\uDDC3', ["whale"], 13, 15, 15, 0],
			"1f434": [['\uD83D\uDC34'], '\uE01A', '\uDBB8\uDDBE', ["horse"], 13, 16, 15, 0],
			"1f435": [['\uD83D\uDC35'], '\uE109', '\uDBB8\uDDC4', ["monkey_face"], 13, 17, 15, 0],
			"1f436": [['\uD83D\uDC36'], '\uE052', '\uDBB8\uDDB7', ["dog"], 13, 18, 15, 0],
			"1f437": [['\uD83D\uDC37'], '\uE10B', '\uDBB8\uDDBF', ["pig"], 13, 19, 15, 0],
			"1f438": [['\uD83D\uDC38'], '\uE531', '\uDBB8\uDDD7', ["frog"], 13, 20, 15, 0],
			"1f439": [['\uD83D\uDC39'], '\uE524', '\uDBB8\uDDCA', ["hamster"], 13, 21, 15, 0],
			"1f43a": [['\uD83D\uDC3A'], '\uE52A', '\uDBB8\uDDD0', ["wolf"], 13, 22, 15, 0],
			"1f43b": [['\uD83D\uDC3B'], '\uE051', '\uDBB8\uDDC1', ["bear"], 13, 23, 15, 0],
			"1f43c": [['\uD83D\uDC3C'], "", '\uDBB8\uDDDF', ["panda_face"], 13, 24, 15, 0],
			"1f43d": [['\uD83D\uDC3D'], '\uE10B', '\uDBB8\uDDE0', ["pig_nose"], 13, 25, 15, 0],
			"1f43e": [['\uD83D\uDC3E'], '\uE536', '\uDBB8\uDDDB', ["feet", "paw_prints"], 13, 26, 15, 0],
			"1f43f": [['\uD83D\uDC3F'], "", "", ["chipmunk"], 13, 27, 15, 0],
			"1f440": [['\uD83D\uDC40'], '\uE419', '\uDBB8\uDD90', ["eyes"], 13, 28, 15, 0],
			"1f441": [['\uD83D\uDC41'], "", "", ["eye"], 13, 29, 15, 0],
			"1f442": [['\uD83D\uDC42'], '\uE41B', '\uDBB8\uDD91', ["ear"], 13, 30, 15, 0],
			"1f443": [['\uD83D\uDC43'], '\uE41A', '\uDBB8\uDD92', ["nose"], 13, 36, 15, 0],
			"1f444": [['\uD83D\uDC44'], '\uE41C', '\uDBB8\uDD93', ["lips"], 14, 1, 15, 0],
			"1f445": [['\uD83D\uDC45'], '\uE409', '\uDBB8\uDD94', ["tongue"], 14, 2, 15, 0],
			"1f446": [['\uD83D\uDC46'], '\uE22E', '\uDBBA\uDF99', ["point_up_2"], 14, 3, 15, 0],
			"1f447": [['\uD83D\uDC47'], '\uE22F', '\uDBBA\uDF9A', ["point_down"], 14, 9, 15, 0],
			"1f448": [['\uD83D\uDC48'], '\uE230', '\uDBBA\uDF9B', ["point_left"], 14, 15, 15, 0],
			"1f449": [['\uD83D\uDC49'], '\uE231', '\uDBBA\uDF9C', ["point_right"], 14, 21, 15, 0],
			"1f44a": [['\uD83D\uDC4A'], '\uE00D', '\uDBBA\uDF96', ["facepunch", "punch"], 14, 27, 15, 0],
			"1f44b": [['\uD83D\uDC4B'], '\uE41E', '\uDBBA\uDF9D', ["wave"], 14, 33, 15, 0],
			"1f44c": [['\uD83D\uDC4C'], '\uE420', '\uDBBA\uDF9F', ["ok_hand"], 14, 39, 15, 0],
			"1f44d": [['\uD83D\uDC4D'], '\uE00E', '\uDBBA\uDF97', ["+1", "thumbsup"], 15, 4, 15, 0],
			"1f44e": [['\uD83D\uDC4E'], '\uE421', '\uDBBA\uDFA0', ["-1", "thumbsdown"], 15, 10, 15, 0],
			"1f44f": [['\uD83D\uDC4F'], '\uE41F', '\uDBBA\uDF9E', ["clap"], 15, 16, 15, 0],
			"1f450": [['\uD83D\uDC50'], '\uE422', '\uDBBA\uDFA1', ["open_hands"], 15, 22, 15, 0],
			"1f451": [['\uD83D\uDC51'], '\uE10E', '\uDBB9\uDCD1', ["crown"], 15, 28, 15, 0],
			"1f452": [['\uD83D\uDC52'], '\uE318', '\uDBB9\uDCD4', ["womans_hat"], 15, 29, 15, 0],
			"1f453": [['\uD83D\uDC53'], "", '\uDBB9\uDCCE', ["eyeglasses"], 15, 30, 15, 0],
			"1f454": [['\uD83D\uDC54'], '\uE302', '\uDBB9\uDCD3', ["necktie"], 15, 31, 15, 0],
			"1f455": [['\uD83D\uDC55'], '\uE006', '\uDBB9\uDCCF', ["shirt", "tshirt"], 15, 32, 15, 0],
			"1f456": [['\uD83D\uDC56'], "", '\uDBB9\uDCD0', ["jeans"], 15, 33, 15, 0],
			"1f457": [['\uD83D\uDC57'], '\uE319', '\uDBB9\uDCD5', ["dress"], 15, 34, 15, 0],
			"1f458": [['\uD83D\uDC58'], '\uE321', '\uDBB9\uDCD9', ["kimono"], 15, 35, 15, 0],
			"1f459": [['\uD83D\uDC59'], '\uE322', '\uDBB9\uDCDA', ["bikini"], 15, 36, 15, 0],
			"1f45a": [['\uD83D\uDC5A'], '\uE006', '\uDBB9\uDCDB', ["womans_clothes"], 15, 37, 15, 0],
			"1f45b": [['\uD83D\uDC5B'], "", '\uDBB9\uDCDC', ["purse"], 15, 38, 15, 0],
			"1f45c": [['\uD83D\uDC5C'], '\uE323', '\uDBB9\uDCF0', ["handbag"], 15, 39, 15, 0],
			"1f45d": [['\uD83D\uDC5D'], "", '\uDBB9\uDCF1', ["pouch"], 15, 40, 15, 0],
			"1f45e": [['\uD83D\uDC5E'], '\uE007', '\uDBB9\uDCCC', ["mans_shoe", "shoe"], 16, 0, 15, 0],
			"1f45f": [['\uD83D\uDC5F'], '\uE007', '\uDBB9\uDCCD', ["athletic_shoe"], 16, 1, 15, 0],
			"1f460": [['\uD83D\uDC60'], '\uE13E', '\uDBB9\uDCD6', ["high_heel"], 16, 2, 15, 0],
			"1f461": [['\uD83D\uDC61'], '\uE31A', '\uDBB9\uDCD7', ["sandal"], 16, 3, 15, 0],
			"1f462": [['\uD83D\uDC62'], '\uE31B', '\uDBB9\uDCD8', ["boot"], 16, 4, 15, 0],
			"1f463": [['\uD83D\uDC63'], '\uE536', '\uDBB9\uDD53', ["footprints"], 16, 5, 15, 0],
			"1f464": [['\uD83D\uDC64'], "", '\uDBB8\uDD9A', ["bust_in_silhouette"], 16, 6, 15, 0],
			"1f465": [['\uD83D\uDC65'], "", "", ["busts_in_silhouette"], 16, 7, 15, 0],
			"1f466": [['\uD83D\uDC66'], '\uE001', '\uDBB8\uDD9B', ["boy"], 16, 8, 15, 0],
			"1f467": [['\uD83D\uDC67'], '\uE002', '\uDBB8\uDD9C', ["girl"], 16, 14, 15, 0],
			"1f468": [['\uD83D\uDC68'], '\uE004', '\uDBB8\uDD9D', ["man"], 16, 20, 15, 0],
			"1f469": [['\uD83D\uDC69'], '\uE005', '\uDBB8\uDD9E', ["woman"], 16, 26, 15, 0],
			"1f46a": [['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC66', '\uD83D\uDC6A'], "", '\uDBB8\uDD9F', ["family", "man-woman-boy"], 16, 32, 15, 0],
			"1f46b": [['\uD83D\uDC6B'], '\uE428', '\uDBB8\uDDA0', ["couple", "man_and_woman_holding_hands"], 16, 33, 15, 0],
			"1f46c": [['\uD83D\uDC6C'], "", "", ["two_men_holding_hands"], 16, 34, 15, 0],
			"1f46d": [['\uD83D\uDC6D'], "", "", ["two_women_holding_hands"], 16, 35, 15, 0],
			"1f46e": [['\uD83D\uDC6E'], '\uE152', '\uDBB8\uDDA1', ["cop"], 16, 36, 15, 0],
			"1f46f": [['\uD83D\uDC6F'], '\uE429', '\uDBB8\uDDA2', ["dancers"], 17, 1, 15, 0],
			"1f470": [['\uD83D\uDC70'], "", '\uDBB8\uDDA3', ["bride_with_veil"], 17, 2, 15, 0],
			"1f471": [['\uD83D\uDC71'], '\uE515', '\uDBB8\uDDA4', ["person_with_blond_hair"], 17, 8, 15, 0],
			"1f472": [['\uD83D\uDC72'], '\uE516', '\uDBB8\uDDA5', ["man_with_gua_pi_mao"], 17, 14, 15, 0],
			"1f473": [['\uD83D\uDC73'], '\uE517', '\uDBB8\uDDA6', ["man_with_turban"], 17, 20, 15, 0],
			"1f474": [['\uD83D\uDC74'], '\uE518', '\uDBB8\uDDA7', ["older_man"], 17, 26, 15, 0],
			"1f475": [['\uD83D\uDC75'], '\uE519', '\uDBB8\uDDA8', ["older_woman"], 17, 32, 15, 0],
			"1f476": [['\uD83D\uDC76'], '\uE51A', '\uDBB8\uDDA9', ["baby"], 17, 38, 15, 0],
			"1f477": [['\uD83D\uDC77'], '\uE51B', '\uDBB8\uDDAA', ["construction_worker"], 18, 3, 15, 0],
			"1f478": [['\uD83D\uDC78'], '\uE51C', '\uDBB8\uDDAB', ["princess"], 18, 9, 15, 0],
			"1f479": [['\uD83D\uDC79'], "", '\uDBB8\uDDAC', ["japanese_ogre"], 18, 15, 15, 0],
			"1f47a": [['\uD83D\uDC7A'], "", '\uDBB8\uDDAD', ["japanese_goblin"], 18, 16, 15, 0],
			"1f47b": [['\uD83D\uDC7B'], '\uE11B', '\uDBB8\uDDAE', ["ghost"], 18, 17, 15, 0],
			"1f47c": [['\uD83D\uDC7C'], '\uE04E', '\uDBB8\uDDAF', ["angel"], 18, 18, 15, 0],
			"1f47d": [['\uD83D\uDC7D'], '\uE10C', '\uDBB8\uDDB0', ["alien"], 18, 24, 15, 0],
			"1f47e": [['\uD83D\uDC7E'], '\uE12B', '\uDBB8\uDDB1', ["space_invader"], 18, 25, 15, 0],
			"1f47f": [['\uD83D\uDC7F'], '\uE11A', '\uDBB8\uDDB2', ["imp"], 18, 26, 15, 0],
			"1f480": [['\uD83D\uDC80'], '\uE11C', '\uDBB8\uDDB3', ["skull"], 18, 27, 15, 0],
			"1f481": [['\uD83D\uDC81'], '\uE253', '\uDBB8\uDDB4', ["information_desk_person"], 18, 28, 15, 0],
			"1f482": [['\uD83D\uDC82'], '\uE51E', '\uDBB8\uDDB5', ["guardsman"], 18, 34, 15, 0],
			"1f483": [['\uD83D\uDC83'], '\uE51F', '\uDBB8\uDDB6', ["dancer"], 18, 40, 15, 0],
			"1f484": [['\uD83D\uDC84'], '\uE31C', '\uDBB8\uDD95', ["lipstick"], 19, 5, 15, 0],
			"1f485": [['\uD83D\uDC85'], '\uE31D', '\uDBB8\uDD96', ["nail_care"], 19, 6, 15, 0],
			"1f486": [['\uD83D\uDC86'], '\uE31E', '\uDBB8\uDD97', ["massage"], 19, 12, 15, 0],
			"1f487": [['\uD83D\uDC87'], '\uE31F', '\uDBB8\uDD98', ["haircut"], 19, 18, 15, 0],
			"1f488": [['\uD83D\uDC88'], '\uE320', '\uDBB8\uDD99', ["barber"], 19, 24, 15, 0],
			"1f489": [['\uD83D\uDC89'], '\uE13B', '\uDBB9\uDD09', ["syringe"], 19, 25, 15, 0],
			"1f48a": [['\uD83D\uDC8A'], '\uE30F', '\uDBB9\uDD0A', ["pill"], 19, 26, 15, 0],
			"1f48b": [['\uD83D\uDC8B'], '\uE003', '\uDBBA\uDC23', ["kiss"], 19, 27, 15, 0],
			"1f48c": [['\uD83D\uDC8C'], '\uE103\uE328', '\uDBBA\uDC24', ["love_letter"], 19, 28, 15, 0],
			"1f48d": [['\uD83D\uDC8D'], '\uE034', '\uDBBA\uDC25', ["ring"], 19, 29, 15, 0],
			"1f48e": [['\uD83D\uDC8E'], '\uE035', '\uDBBA\uDC26', ["gem"], 19, 30, 15, 0],
			"1f48f": [['\uD83D\uDC8F'], '\uE111', '\uDBBA\uDC27', ["couplekiss"], 19, 31, 15, 0],
			"1f490": [['\uD83D\uDC90'], '\uE306', '\uDBBA\uDC28', ["bouquet"], 19, 32, 15, 0],
			"1f491": [['\uD83D\uDC91'], '\uE425', '\uDBBA\uDC29', ["couple_with_heart"], 19, 33, 15, 0],
			"1f492": [['\uD83D\uDC92'], '\uE43D', '\uDBBA\uDC2A', ["wedding"], 19, 34, 15, 0],
			"1f493": [['\uD83D\uDC93'], '\uE327', '\uDBBA\uDF0D', ["heartbeat"], 19, 35, 15, 0],
			"1f494": [['\uD83D\uDC94'], '\uE023', '\uDBBA\uDF0E', ["broken_heart"], 19, 36, 15, 0, "<\/3"],
			"1f495": [['\uD83D\uDC95'], '\uE327', '\uDBBA\uDF0F', ["two_hearts"], 19, 37, 15, 0],
			"1f496": [['\uD83D\uDC96'], '\uE327', '\uDBBA\uDF10', ["sparkling_heart"], 19, 38, 15, 0],
			"1f497": [['\uD83D\uDC97'], '\uE328', '\uDBBA\uDF11', ["heartpulse"], 19, 39, 15, 0],
			"1f498": [['\uD83D\uDC98'], '\uE329', '\uDBBA\uDF12', ["cupid"], 19, 40, 15, 0],
			"1f499": [['\uD83D\uDC99'], '\uE32A', '\uDBBA\uDF13', ["blue_heart"], 20, 0, 15, 0, "<3"],
			"1f49a": [['\uD83D\uDC9A'], '\uE32B', '\uDBBA\uDF14', ["green_heart"], 20, 1, 15, 0, "<3"],
			"1f49b": [['\uD83D\uDC9B'], '\uE32C', '\uDBBA\uDF15', ["yellow_heart"], 20, 2, 15, 0, "<3"],
			"1f49c": [['\uD83D\uDC9C'], '\uE32D', '\uDBBA\uDF16', ["purple_heart"], 20, 3, 15, 0, "<3"],
			"1f49d": [['\uD83D\uDC9D'], '\uE437', '\uDBBA\uDF17', ["gift_heart"], 20, 4, 15, 0],
			"1f49e": [['\uD83D\uDC9E'], '\uE327', '\uDBBA\uDF18', ["revolving_hearts"], 20, 5, 15, 0],
			"1f49f": [['\uD83D\uDC9F'], '\uE204', '\uDBBA\uDF19', ["heart_decoration"], 20, 6, 15, 0],
			"1f4a0": [['\uD83D\uDCA0'], "", '\uDBBA\uDF55', ["diamond_shape_with_a_dot_inside"], 20, 7, 15, 0],
			"1f4a1": [['\uD83D\uDCA1'], '\uE10F', '\uDBBA\uDF56', ["bulb"], 20, 8, 15, 0],
			"1f4a2": [['\uD83D\uDCA2'], '\uE334', '\uDBBA\uDF57', ["anger"], 20, 9, 15, 0],
			"1f4a3": [['\uD83D\uDCA3'], '\uE311', '\uDBBA\uDF58', ["bomb"], 20, 10, 15, 0],
			"1f4a4": [['\uD83D\uDCA4'], '\uE13C', '\uDBBA\uDF59', ["zzz"], 20, 11, 15, 0],
			"1f4a5": [['\uD83D\uDCA5'], "", '\uDBBA\uDF5A', ["boom", "collision"], 20, 12, 15, 0],
			"1f4a6": [['\uD83D\uDCA6'], '\uE331', '\uDBBA\uDF5B', ["sweat_drops"], 20, 13, 15, 0],
			"1f4a7": [['\uD83D\uDCA7'], '\uE331', '\uDBBA\uDF5C', ["droplet"], 20, 14, 15, 0],
			"1f4a8": [['\uD83D\uDCA8'], '\uE330', '\uDBBA\uDF5D', ["dash"], 20, 15, 15, 0],
			"1f4a9": [['\uD83D\uDCA9'], '\uE05A', '\uDBB9\uDCF4', ["hankey", "poop", "shit"], 20, 16, 15, 0],
			"1f4aa": [['\uD83D\uDCAA'], '\uE14C', '\uDBBA\uDF5E', ["muscle"], 20, 17, 15, 0],
			"1f4ab": [['\uD83D\uDCAB'], '\uE407', '\uDBBA\uDF5F', ["dizzy"], 20, 23, 15, 0],
			"1f4ac": [['\uD83D\uDCAC'], "", '\uDBB9\uDD32', ["speech_balloon"], 20, 24, 15, 0],
			"1f4ad": [['\uD83D\uDCAD'], "", "", ["thought_balloon"], 20, 25, 15, 0],
			"1f4ae": [['\uD83D\uDCAE'], "", '\uDBBA\uDF7A', ["white_flower"], 20, 26, 15, 0],
			"1f4af": [['\uD83D\uDCAF'], "", '\uDBBA\uDF7B', ["100"], 20, 27, 15, 0],
			"1f4b0": [['\uD83D\uDCB0'], '\uE12F', '\uDBB9\uDCDD', ["moneybag"], 20, 28, 15, 0],
			"1f4b1": [['\uD83D\uDCB1'], '\uE149', '\uDBB9\uDCDE', ["currency_exchange"], 20, 29, 15, 0],
			"1f4b2": [['\uD83D\uDCB2'], '\uE12F', '\uDBB9\uDCE0', ["heavy_dollar_sign"], 20, 30, 15, 0],
			"1f4b3": [['\uD83D\uDCB3'], "", '\uDBB9\uDCE1', ["credit_card"], 20, 31, 15, 0],
			"1f4b4": [['\uD83D\uDCB4'], "", '\uDBB9\uDCE2', ["yen"], 20, 32, 15, 0],
			"1f4b5": [['\uD83D\uDCB5'], '\uE12F', '\uDBB9\uDCE3', ["dollar"], 20, 33, 15, 0],
			"1f4b6": [['\uD83D\uDCB6'], "", "", ["euro"], 20, 34, 15, 0],
			"1f4b7": [['\uD83D\uDCB7'], "", "", ["pound"], 20, 35, 15, 0],
			"1f4b8": [['\uD83D\uDCB8'], "", '\uDBB9\uDCE4', ["money_with_wings"], 20, 36, 15, 0],
			"1f4b9": [['\uD83D\uDCB9'], '\uE14A', '\uDBB9\uDCDF', ["chart"], 20, 37, 15, 0],
			"1f4ba": [['\uD83D\uDCBA'], '\uE11F', '\uDBB9\uDD37', ["seat"], 20, 38, 15, 0],
			"1f4bb": [['\uD83D\uDCBB'], '\uE00C', '\uDBB9\uDD38', ["computer"], 20, 39, 15, 0],
			"1f4bc": [['\uD83D\uDCBC'], '\uE11E', '\uDBB9\uDD3B', ["briefcase"], 20, 40, 15, 0],
			"1f4bd": [['\uD83D\uDCBD'], '\uE316', '\uDBB9\uDD3C', ["minidisc"], 21, 0, 15, 0],
			"1f4be": [['\uD83D\uDCBE'], '\uE316', '\uDBB9\uDD3D', ["floppy_disk"], 21, 1, 15, 0],
			"1f4bf": [['\uD83D\uDCBF'], '\uE126', '\uDBBA\uDC1D', ["cd"], 21, 2, 15, 0],
			"1f4c0": [['\uD83D\uDCC0'], '\uE127', '\uDBBA\uDC1E', ["dvd"], 21, 3, 15, 0],
			"1f4c1": [['\uD83D\uDCC1'], "", '\uDBB9\uDD43', ["file_folder"], 21, 4, 15, 0],
			"1f4c2": [['\uD83D\uDCC2'], "", '\uDBB9\uDD44', ["open_file_folder"], 21, 5, 15, 0],
			"1f4c3": [['\uD83D\uDCC3'], '\uE301', '\uDBB9\uDD40', ["page_with_curl"], 21, 6, 15, 0],
			"1f4c4": [['\uD83D\uDCC4'], '\uE301', '\uDBB9\uDD41', ["page_facing_up"], 21, 7, 15, 0],
			"1f4c5": [['\uD83D\uDCC5'], "", '\uDBB9\uDD42', ["date"], 21, 8, 15, 0],
			"1f4c6": [['\uD83D\uDCC6'], "", '\uDBB9\uDD49', ["calendar"], 21, 9, 15, 0],
			"1f4c7": [['\uD83D\uDCC7'], '\uE148', '\uDBB9\uDD4D', ["card_index"], 21, 10, 15, 0],
			"1f4c8": [['\uD83D\uDCC8'], '\uE14A', '\uDBB9\uDD4B', ["chart_with_upwards_trend"], 21, 11, 15, 0],
			"1f4c9": [['\uD83D\uDCC9'], "", '\uDBB9\uDD4C', ["chart_with_downwards_trend"], 21, 12, 15, 0],
			"1f4ca": [['\uD83D\uDCCA'], '\uE14A', '\uDBB9\uDD4A', ["bar_chart"], 21, 13, 15, 0],
			"1f4cb": [['\uD83D\uDCCB'], '\uE301', '\uDBB9\uDD48', ["clipboard"], 21, 14, 15, 0],
			"1f4cc": [['\uD83D\uDCCC'], "", '\uDBB9\uDD4E', ["pushpin"], 21, 15, 15, 0],
			"1f4cd": [['\uD83D\uDCCD'], "", '\uDBB9\uDD3F', ["round_pushpin"], 21, 16, 15, 0],
			"1f4ce": [['\uD83D\uDCCE'], "", '\uDBB9\uDD3A', ["paperclip"], 21, 17, 15, 0],
			"1f4cf": [['\uD83D\uDCCF'], "", '\uDBB9\uDD50', ["straight_ruler"], 21, 18, 15, 0],
			"1f4d0": [['\uD83D\uDCD0'], "", '\uDBB9\uDD51', ["triangular_ruler"], 21, 19, 15, 0],
			"1f4d1": [['\uD83D\uDCD1'], '\uE301', '\uDBB9\uDD52', ["bookmark_tabs"], 21, 20, 15, 0],
			"1f4d2": [['\uD83D\uDCD2'], '\uE148', '\uDBB9\uDD4F', ["ledger"], 21, 21, 15, 0],
			"1f4d3": [['\uD83D\uDCD3'], '\uE148', '\uDBB9\uDD45', ["notebook"], 21, 22, 15, 0],
			"1f4d4": [['\uD83D\uDCD4'], '\uE148', '\uDBB9\uDD47', ["notebook_with_decorative_cover"], 21, 23, 15, 0],
			"1f4d5": [['\uD83D\uDCD5'], '\uE148', '\uDBB9\uDD02', ["closed_book"], 21, 24, 15, 0],
			"1f4d6": [['\uD83D\uDCD6'], '\uE148', '\uDBB9\uDD46', ["book", "open_book"], 21, 25, 15, 0],
			"1f4d7": [['\uD83D\uDCD7'], '\uE148', '\uDBB9\uDCFF', ["green_book"], 21, 26, 15, 0],
			"1f4d8": [['\uD83D\uDCD8'], '\uE148', '\uDBB9\uDD00', ["blue_book"], 21, 27, 15, 0],
			"1f4d9": [['\uD83D\uDCD9'], '\uE148', '\uDBB9\uDD01', ["orange_book"], 21, 28, 15, 0],
			"1f4da": [['\uD83D\uDCDA'], '\uE148', '\uDBB9\uDD03', ["books"], 21, 29, 15, 0],
			"1f4db": [['\uD83D\uDCDB'], "", '\uDBB9\uDD04', ["name_badge"], 21, 30, 15, 0],
			"1f4dc": [['\uD83D\uDCDC'], "", '\uDBB9\uDCFD', ["scroll"], 21, 31, 15, 0],
			"1f4dd": [['\uD83D\uDCDD'], '\uE301', '\uDBB9\uDD27', ["memo", "pencil"], 21, 32, 15, 0],
			"1f4de": [['\uD83D\uDCDE'], '\uE009', '\uDBB9\uDD24', ["telephone_receiver"], 21, 33, 15, 0],
			"1f4df": [['\uD83D\uDCDF'], "", '\uDBB9\uDD22', ["pager"], 21, 34, 15, 0],
			"1f4e0": [['\uD83D\uDCE0'], '\uE00B', '\uDBB9\uDD28', ["fax"], 21, 35, 15, 0],
			"1f4e1": [['\uD83D\uDCE1'], '\uE14B', '\uDBB9\uDD31', ["satellite_antenna"], 21, 36, 15, 0],
			"1f4e2": [['\uD83D\uDCE2'], '\uE142', '\uDBB9\uDD2F', ["loudspeaker"], 21, 37, 15, 0],
			"1f4e3": [['\uD83D\uDCE3'], '\uE317', '\uDBB9\uDD30', ["mega"], 21, 38, 15, 0],
			"1f4e4": [['\uD83D\uDCE4'], "", '\uDBB9\uDD33', ["outbox_tray"], 21, 39, 15, 0],
			"1f4e5": [['\uD83D\uDCE5'], "", '\uDBB9\uDD34', ["inbox_tray"], 21, 40, 15, 0],
			"1f4e6": [['\uD83D\uDCE6'], '\uE112', '\uDBB9\uDD35', ["package"], 22, 0, 15, 0],
			"1f4e7": [['\uD83D\uDCE7'], '\uE103', '\uDBBA\uDF92', ["e-mail"], 22, 1, 15, 0],
			"1f4e8": [['\uD83D\uDCE8'], '\uE103', '\uDBB9\uDD2A', ["incoming_envelope"], 22, 2, 15, 0],
			"1f4e9": [['\uD83D\uDCE9'], '\uE103', '\uDBB9\uDD2B', ["envelope_with_arrow"], 22, 3, 15, 0],
			"1f4ea": [['\uD83D\uDCEA'], '\uE101', '\uDBB9\uDD2C', ["mailbox_closed"], 22, 4, 15, 0],
			"1f4eb": [['\uD83D\uDCEB'], '\uE101', '\uDBB9\uDD2D', ["mailbox"], 22, 5, 15, 0],
			"1f4ec": [['\uD83D\uDCEC'], "", "", ["mailbox_with_mail"], 22, 6, 15, 0],
			"1f4ed": [['\uD83D\uDCED'], "", "", ["mailbox_with_no_mail"], 22, 7, 15, 0],
			"1f4ee": [['\uD83D\uDCEE'], '\uE102', '\uDBB9\uDD2E', ["postbox"], 22, 8, 15, 0],
			"1f4ef": [['\uD83D\uDCEF'], "", "", ["postal_horn"], 22, 9, 15, 0],
			"1f4f0": [['\uD83D\uDCF0'], "", '\uDBBA\uDC22', ["newspaper"], 22, 10, 15, 0],
			"1f4f1": [['\uD83D\uDCF1'], '\uE00A', '\uDBB9\uDD25', ["iphone"], 22, 11, 15, 0],
			"1f4f2": [['\uD83D\uDCF2'], '\uE104', '\uDBB9\uDD26', ["calling"], 22, 12, 15, 0],
			"1f4f3": [['\uD83D\uDCF3'], '\uE250', '\uDBBA\uDC39', ["vibration_mode"], 22, 13, 15, 0],
			"1f4f4": [['\uD83D\uDCF4'], '\uE251', '\uDBBA\uDC3A', ["mobile_phone_off"], 22, 14, 15, 0],
			"1f4f5": [['\uD83D\uDCF5'], "", "", ["no_mobile_phones"], 22, 15, 15, 0],
			"1f4f6": [['\uD83D\uDCF6'], '\uE20B', '\uDBBA\uDC38', ["signal_strength"], 22, 16, 15, 0],
			"1f4f7": [['\uD83D\uDCF7'], '\uE008', '\uDBB9\uDCEF', ["camera"], 22, 17, 15, 0],
			"1f4f8": [['\uD83D\uDCF8'], "", "", ["camera_with_flash"], 22, 18, 15, 0],
			"1f4f9": [['\uD83D\uDCF9'], '\uE03D', '\uDBB9\uDCF9', ["video_camera"], 22, 19, 15, 0],
			"1f4fa": [['\uD83D\uDCFA'], '\uE12A', '\uDBBA\uDC1C', ["tv"], 22, 20, 15, 0],
			"1f4fb": [['\uD83D\uDCFB'], '\uE128', '\uDBBA\uDC1F', ["radio"], 22, 21, 15, 0],
			"1f4fc": [['\uD83D\uDCFC'], '\uE129', '\uDBBA\uDC20', ["vhs"], 22, 22, 15, 0],
			"1f4fd": [['\uD83D\uDCFD'], "", "", ["film_projector"], 22, 23, 15, 0],
			"1f4ff": [['\uD83D\uDCFF'], "", "", ["prayer_beads"], 22, 24, 15, 0],
			"1f500": [['\uD83D\uDD00'], "", "", ["twisted_rightwards_arrows"], 22, 25, 15, 0],
			"1f501": [['\uD83D\uDD01'], "", "", ["repeat"], 22, 26, 15, 0],
			"1f502": [['\uD83D\uDD02'], "", "", ["repeat_one"], 22, 27, 15, 0],
			"1f503": [['\uD83D\uDD03'], "", '\uDBBA\uDF91', ["arrows_clockwise"], 22, 28, 15, 0],
			"1f504": [['\uD83D\uDD04'], "", "", ["arrows_counterclockwise"], 22, 29, 15, 0],
			"1f505": [['\uD83D\uDD05'], "", "", ["low_brightness"], 22, 30, 15, 0],
			"1f506": [['\uD83D\uDD06'], "", "", ["high_brightness"], 22, 31, 15, 0],
			"1f507": [['\uD83D\uDD07'], "", "", ["mute"], 22, 32, 15, 0],
			"1f508": [['\uD83D\uDD08'], "", "", ["speaker"], 22, 33, 15, 0],
			"1f509": [['\uD83D\uDD09'], "", "", ["sound"], 22, 34, 15, 0],
			"1f50a": [['\uD83D\uDD0A'], '\uE141', '\uDBBA\uDC21', ["loud_sound"], 22, 35, 15, 0],
			"1f50b": [['\uD83D\uDD0B'], "", '\uDBB9\uDCFC', ["battery"], 22, 36, 15, 0],
			"1f50c": [['\uD83D\uDD0C'], "", '\uDBB9\uDCFE', ["electric_plug"], 22, 37, 15, 0],
			"1f50d": [['\uD83D\uDD0D'], '\uE114', '\uDBBA\uDF85', ["mag"], 22, 38, 15, 0],
			"1f50e": [['\uD83D\uDD0E'], '\uE114', '\uDBBA\uDF8D', ["mag_right"], 22, 39, 15, 0],
			"1f50f": [['\uD83D\uDD0F'], '\uE144', '\uDBBA\uDF90', ["lock_with_ink_pen"], 22, 40, 15, 0],
			"1f510": [['\uD83D\uDD10'], '\uE144', '\uDBBA\uDF8A', ["closed_lock_with_key"], 23, 0, 15, 0],
			"1f511": [['\uD83D\uDD11'], '\uE03F', '\uDBBA\uDF82', ["key"], 23, 1, 15, 0],
			"1f512": [['\uD83D\uDD12'], '\uE144', '\uDBBA\uDF86', ["lock"], 23, 2, 15, 0],
			"1f513": [['\uD83D\uDD13'], '\uE145', '\uDBBA\uDF87', ["unlock"], 23, 3, 15, 0],
			"1f514": [['\uD83D\uDD14'], '\uE325', '\uDBB9\uDCF2', ["bell"], 23, 4, 15, 0],
			"1f515": [['\uD83D\uDD15'], "", "", ["no_bell"], 23, 5, 15, 0],
			"1f516": [['\uD83D\uDD16'], "", '\uDBBA\uDF8F', ["bookmark"], 23, 6, 15, 0],
			"1f517": [['\uD83D\uDD17'], "", '\uDBBA\uDF4B', ["link"], 23, 7, 15, 0],
			"1f518": [['\uD83D\uDD18'], "", '\uDBBA\uDF8C', ["radio_button"], 23, 8, 15, 0],
			"1f519": [['\uD83D\uDD19'], '\uE235', '\uDBBA\uDF8E', ["back"], 23, 9, 15, 0],
			"1f51a": [['\uD83D\uDD1A'], "", '\uDBB8\uDC1A', ["end"], 23, 10, 15, 0],
			"1f51b": [['\uD83D\uDD1B'], "", '\uDBB8\uDC19', ["on"], 23, 11, 15, 0],
			"1f51c": [['\uD83D\uDD1C'], "", '\uDBB8\uDC18', ["soon"], 23, 12, 15, 0],
			"1f51d": [['\uD83D\uDD1D'], '\uE24C', '\uDBBA\uDF42', ["top"], 23, 13, 15, 0],
			"1f51e": [['\uD83D\uDD1E'], '\uE207', '\uDBBA\uDF25', ["underage"], 23, 14, 15, 0],
			"1f51f": [['\uD83D\uDD1F'], "", '\uDBBA\uDC3B', ["keycap_ten"], 23, 15, 15, 0],
			"1f520": [['\uD83D\uDD20'], "", '\uDBBA\uDF7C', ["capital_abcd"], 23, 16, 15, 0],
			"1f521": [['\uD83D\uDD21'], "", '\uDBBA\uDF7D', ["abcd"], 23, 17, 15, 0],
			"1f522": [['\uD83D\uDD22'], "", '\uDBBA\uDF7E', ["1234"], 23, 18, 15, 0],
			"1f523": [['\uD83D\uDD23'], "", '\uDBBA\uDF7F', ["symbols"], 23, 19, 15, 0],
			"1f524": [['\uD83D\uDD24'], "", '\uDBBA\uDF80', ["abc"], 23, 20, 15, 0],
			"1f525": [['\uD83D\uDD25'], '\uE11D', '\uDBB9\uDCF6', ["fire"], 23, 21, 15, 0],
			"1f526": [['\uD83D\uDD26'], "", '\uDBB9\uDCFB', ["flashlight"], 23, 22, 15, 0],
			"1f527": [['\uD83D\uDD27'], "", '\uDBB9\uDCC9', ["wrench"], 23, 23, 15, 0],
			"1f528": [['\uD83D\uDD28'], '\uE116', '\uDBB9\uDCCA', ["hammer"], 23, 24, 15, 0],
			"1f529": [['\uD83D\uDD29'], "", '\uDBB9\uDCCB', ["nut_and_bolt"], 23, 25, 15, 0],
			"1f52a": [['\uD83D\uDD2A'], "", '\uDBB9\uDCFA', ["hocho", "knife"], 23, 26, 15, 0],
			"1f52b": [['\uD83D\uDD2B'], '\uE113', '\uDBB9\uDCF5', ["gun"], 23, 27, 15, 0],
			"1f52c": [['\uD83D\uDD2C'], "", "", ["microscope"], 23, 28, 15, 0],
			"1f52d": [['\uD83D\uDD2D'], "", "", ["telescope"], 23, 29, 15, 0],
			"1f52e": [['\uD83D\uDD2E'], '\uE23E', '\uDBB9\uDCF7', ["crystal_ball"], 23, 30, 15, 0],
			"1f52f": [['\uD83D\uDD2F'], '\uE23E', '\uDBB9\uDCF8', ["six_pointed_star"], 23, 31, 15, 0],
			"1f530": [['\uD83D\uDD30'], '\uE209', '\uDBB8\uDC44', ["beginner"], 23, 32, 15, 0],
			"1f531": [['\uD83D\uDD31'], '\uE031', '\uDBB9\uDCD2', ["trident"], 23, 33, 15, 0],
			"1f532": [['\uD83D\uDD32'], '\uE21A', '\uDBBA\uDF64', ["black_square_button"], 23, 34, 15, 0],
			"1f533": [['\uD83D\uDD33'], '\uE21B', '\uDBBA\uDF67', ["white_square_button"], 23, 35, 15, 0],
			"1f534": [['\uD83D\uDD34'], '\uE219', '\uDBBA\uDF63', ["red_circle"], 23, 36, 15, 0],
			"1f535": [['\uD83D\uDD35'], '\uE21A', '\uDBBA\uDF64', ["large_blue_circle"], 23, 37, 15, 0],
			"1f536": [['\uD83D\uDD36'], '\uE21B', '\uDBBA\uDF73', ["large_orange_diamond"], 23, 38, 15, 0],
			"1f537": [['\uD83D\uDD37'], '\uE21B', '\uDBBA\uDF74', ["large_blue_diamond"], 23, 39, 15, 0],
			"1f538": [['\uD83D\uDD38'], '\uE21B', '\uDBBA\uDF75', ["small_orange_diamond"], 23, 40, 15, 0],
			"1f539": [['\uD83D\uDD39'], '\uE21B', '\uDBBA\uDF76', ["small_blue_diamond"], 24, 0, 15, 0],
			"1f53a": [['\uD83D\uDD3A'], "", '\uDBBA\uDF78', ["small_red_triangle"], 24, 1, 15, 0],
			"1f53b": [['\uD83D\uDD3B'], "", '\uDBBA\uDF79', ["small_red_triangle_down"], 24, 2, 15, 0],
			"1f53c": [['\uD83D\uDD3C'], "", '\uDBBA\uDF01', ["arrow_up_small"], 24, 3, 15, 0],
			"1f53d": [['\uD83D\uDD3D'], "", '\uDBBA\uDF00', ["arrow_down_small"], 24, 4, 15, 0],
			"1f549": [['\uD83D\uDD49'], "", "", ["om_symbol"], 24, 5, 15, 0],
			"1f54a": [['\uD83D\uDD4A'], "", "", ["dove_of_peace"], 24, 6, 15, 0],
			"1f54b": [['\uD83D\uDD4B'], "", "", ["kaaba"], 24, 7, 15, 0],
			"1f54c": [['\uD83D\uDD4C'], "", "", ["mosque"], 24, 8, 15, 0],
			"1f54d": [['\uD83D\uDD4D'], "", "", ["synagogue"], 24, 9, 15, 0],
			"1f54e": [['\uD83D\uDD4E'], "", "", ["menorah_with_nine_branches"], 24, 10, 15, 0],
			"1f550": [['\uD83D\uDD50'], '\uE024', '\uDBB8\uDC1E', ["clock1"], 24, 11, 15, 0],
			"1f551": [['\uD83D\uDD51'], '\uE025', '\uDBB8\uDC1F', ["clock2"], 24, 12, 15, 0],
			"1f552": [['\uD83D\uDD52'], '\uE026', '\uDBB8\uDC20', ["clock3"], 24, 13, 15, 0],
			"1f553": [['\uD83D\uDD53'], '\uE027', '\uDBB8\uDC21', ["clock4"], 24, 14, 15, 0],
			"1f554": [['\uD83D\uDD54'], '\uE028', '\uDBB8\uDC22', ["clock5"], 24, 15, 15, 0],
			"1f555": [['\uD83D\uDD55'], '\uE029', '\uDBB8\uDC23', ["clock6"], 24, 16, 15, 0],
			"1f556": [['\uD83D\uDD56'], '\uE02A', '\uDBB8\uDC24', ["clock7"], 24, 17, 15, 0],
			"1f557": [['\uD83D\uDD57'], '\uE02B', '\uDBB8\uDC25', ["clock8"], 24, 18, 15, 0],
			"1f558": [['\uD83D\uDD58'], '\uE02C', '\uDBB8\uDC26', ["clock9"], 24, 19, 15, 0],
			"1f559": [['\uD83D\uDD59'], '\uE02D', '\uDBB8\uDC27', ["clock10"], 24, 20, 15, 0],
			"1f55a": [['\uD83D\uDD5A'], '\uE02E', '\uDBB8\uDC28', ["clock11"], 24, 21, 15, 0],
			"1f55b": [['\uD83D\uDD5B'], '\uE02F', '\uDBB8\uDC29', ["clock12"], 24, 22, 15, 0],
			"1f55c": [['\uD83D\uDD5C'], "", "", ["clock130"], 24, 23, 15, 0],
			"1f55d": [['\uD83D\uDD5D'], "", "", ["clock230"], 24, 24, 15, 0],
			"1f55e": [['\uD83D\uDD5E'], "", "", ["clock330"], 24, 25, 15, 0],
			"1f55f": [['\uD83D\uDD5F'], "", "", ["clock430"], 24, 26, 15, 0],
			"1f560": [['\uD83D\uDD60'], "", "", ["clock530"], 24, 27, 15, 0],
			"1f561": [['\uD83D\uDD61'], "", "", ["clock630"], 24, 28, 15, 0],
			"1f562": [['\uD83D\uDD62'], "", "", ["clock730"], 24, 29, 15, 0],
			"1f563": [['\uD83D\uDD63'], "", "", ["clock830"], 24, 30, 15, 0],
			"1f564": [['\uD83D\uDD64'], "", "", ["clock930"], 24, 31, 15, 0],
			"1f565": [['\uD83D\uDD65'], "", "", ["clock1030"], 24, 32, 15, 0],
			"1f566": [['\uD83D\uDD66'], "", "", ["clock1130"], 24, 33, 15, 0],
			"1f567": [['\uD83D\uDD67'], "", "", ["clock1230"], 24, 34, 15, 0],
			"1f56f": [['\uD83D\uDD6F'], "", "", ["candle"], 24, 35, 15, 0],
			"1f570": [['\uD83D\uDD70'], "", "", ["mantelpiece_clock"], 24, 36, 15, 0],
			"1f573": [['\uD83D\uDD73'], "", "", ["hole"], 24, 37, 15, 0],
			"1f574": [['\uD83D\uDD74'], "", "", ["man_in_business_suit_levitating"], 24, 38, 15, 0],
			"1f575": [['\uD83D\uDD75'], "", "", ["sleuth_or_spy"], 24, 39, 15, 0],
			"1f576": [['\uD83D\uDD76'], "", "", ["dark_sunglasses"], 25, 4, 15, 0],
			"1f577": [['\uD83D\uDD77'], "", "", ["spider"], 25, 5, 15, 0],
			"1f578": [['\uD83D\uDD78'], "", "", ["spider_web"], 25, 6, 15, 0],
			"1f579": [['\uD83D\uDD79'], "", "", ["joystick"], 25, 7, 15, 0],
			"1f587": [['\uD83D\uDD87'], "", "", ["linked_paperclips"], 25, 8, 15, 0],
			"1f58a": [['\uD83D\uDD8A'], "", "", ["lower_left_ballpoint_pen"], 25, 9, 15, 0],
			"1f58b": [['\uD83D\uDD8B'], "", "", ["lower_left_fountain_pen"], 25, 10, 15, 0],
			"1f58c": [['\uD83D\uDD8C'], "", "", ["lower_left_paintbrush"], 25, 11, 15, 0],
			"1f58d": [['\uD83D\uDD8D'], "", "", ["lower_left_crayon"], 25, 12, 15, 0],
			"1f590": [['\uD83D\uDD90'], "", "", ["raised_hand_with_fingers_splayed"], 25, 13, 15, 0],
			"1f595": [['\uD83D\uDD95'], "", "", ["middle_finger", "reversed_hand_with_middle_finger_extended"], 25, 19, 15, 0],
			"1f596": [['\uD83D\uDD96'], "", "", ["spock-hand"], 25, 25, 15, 0],
			"1f5a5": [['\uD83D\uDDA5'], "", "", ["desktop_computer"], 25, 31, 15, 0],
			"1f5a8": [['\uD83D\uDDA8'], "", "", ["printer"], 25, 32, 15, 0],
			"1f5b1": [['\uD83D\uDDB1'], "", "", ["three_button_mouse"], 25, 33, 15, 0],
			"1f5b2": [['\uD83D\uDDB2'], "", "", ["trackball"], 25, 34, 15, 0],
			"1f5bc": [['\uD83D\uDDBC'], "", "", ["frame_with_picture"], 25, 35, 15, 0],
			"1f5c2": [['\uD83D\uDDC2'], "", "", ["card_index_dividers"], 25, 36, 15, 0],
			"1f5c3": [['\uD83D\uDDC3'], "", "", ["card_file_box"], 25, 37, 15, 0],
			"1f5c4": [['\uD83D\uDDC4'], "", "", ["file_cabinet"], 25, 38, 15, 0],
			"1f5d1": [['\uD83D\uDDD1'], "", "", ["wastebasket"], 25, 39, 15, 0],
			"1f5d2": [['\uD83D\uDDD2'], "", "", ["spiral_note_pad"], 25, 40, 15, 0],
			"1f5d3": [['\uD83D\uDDD3'], "", "", ["spiral_calendar_pad"], 26, 0, 15, 0],
			"1f5dc": [['\uD83D\uDDDC'], "", "", ["compression"], 26, 1, 15, 0],
			"1f5dd": [['\uD83D\uDDDD'], "", "", ["old_key"], 26, 2, 15, 0],
			"1f5de": [['\uD83D\uDDDE'], "", "", ["rolled_up_newspaper"], 26, 3, 15, 0],
			"1f5e1": [['\uD83D\uDDE1'], "", "", ["dagger_knife"], 26, 4, 15, 0],
			"1f5e3": [['\uD83D\uDDE3'], "", "", ["speaking_head_in_silhouette"], 26, 5, 15, 0],
			"1f5e8": [['\uD83D\uDDE8'], "", "", ["left_speech_bubble"], 26, 6, 7, 0],
			"1f5ef": [['\uD83D\uDDEF'], "", "", ["right_anger_bubble"], 26, 7, 15, 0],
			"1f5f3": [['\uD83D\uDDF3'], "", "", ["ballot_box_with_ballot"], 26, 8, 15, 0],
			"1f5fa": [['\uD83D\uDDFA'], "", "", ["world_map"], 26, 9, 15, 0],
			"1f5fb": [['\uD83D\uDDFB'], '\uE03B', '\uDBB9\uDCC3', ["mount_fuji"], 26, 10, 15, 0],
			"1f5fc": [['\uD83D\uDDFC'], '\uE509', '\uDBB9\uDCC4', ["tokyo_tower"], 26, 11, 15, 0],
			"1f5fd": [['\uD83D\uDDFD'], '\uE51D', '\uDBB9\uDCC6', ["statue_of_liberty"], 26, 12, 15, 0],
			"1f5fe": [['\uD83D\uDDFE'], "", '\uDBB9\uDCC7', ["japan"], 26, 13, 15, 0],
			"1f5ff": [['\uD83D\uDDFF'], "", '\uDBB9\uDCC8', ["moyai"], 26, 14, 15, 0],
			"1f600": [['\uD83D\uDE00'], "", "", ["grinning"], 26, 15, 15, 0, ":D"],
			"1f601": [['\uD83D\uDE01'], '\uE404', '\uDBB8\uDF33', ["grin"], 26, 16, 15, 0],
			"1f602": [['\uD83D\uDE02'], '\uE412', '\uDBB8\uDF34', ["joy"], 26, 17, 15, 0],
			"1f603": [['\uD83D\uDE03'], '\uE057', '\uDBB8\uDF30', ["smiley"], 26, 18, 15, 0, ":)"],
			"1f604": [['\uD83D\uDE04'], '\uE415', '\uDBB8\uDF38', ["smile"], 26, 19, 15, 0, ":)"],
			"1f605": [['\uD83D\uDE05'], '\uE415\uE331', '\uDBB8\uDF31', ["sweat_smile"], 26, 20, 15, 0],
			"1f606": [['\uD83D\uDE06'], '\uE40A', '\uDBB8\uDF32', ["laughing", "satisfied"], 26, 21, 15, 0],
			"1f607": [['\uD83D\uDE07'], "", "", ["innocent"], 26, 22, 15, 0],
			"1f608": [['\uD83D\uDE08'], "", "", ["smiling_imp"], 26, 23, 15, 0],
			"1f609": [['\uD83D\uDE09'], '\uE405', '\uDBB8\uDF47', ["wink"], 26, 24, 15, 0, ";)"],
			"1f60a": [['\uD83D\uDE0A'], '\uE056', '\uDBB8\uDF35', ["blush"], 26, 25, 15, 0, ":)"],
			"1f60b": [['\uD83D\uDE0B'], '\uE056', '\uDBB8\uDF2B', ["yum"], 26, 26, 15, 0],
			"1f60c": [['\uD83D\uDE0C'], '\uE40A', '\uDBB8\uDF3E', ["relieved"], 26, 27, 15, 0],
			"1f60d": [['\uD83D\uDE0D'], '\uE106', '\uDBB8\uDF27', ["heart_eyes"], 26, 28, 15, 0],
			"1f60e": [['\uD83D\uDE0E'], "", "", ["sunglasses"], 26, 29, 15, 0],
			"1f60f": [['\uD83D\uDE0F'], '\uE402', '\uDBB8\uDF43', ["smirk"], 26, 30, 15, 0],
			"1f610": [['\uD83D\uDE10'], "", "", ["neutral_face"], 26, 31, 15, 0],
			"1f611": [['\uD83D\uDE11'], "", "", ["expressionless"], 26, 32, 15, 0],
			"1f612": [['\uD83D\uDE12'], '\uE40E', '\uDBB8\uDF26', ["unamused"], 26, 33, 15, 0, ":("],
			"1f613": [['\uD83D\uDE13'], '\uE108', '\uDBB8\uDF44', ["sweat"], 26, 34, 15, 0],
			"1f614": [['\uD83D\uDE14'], '\uE403', '\uDBB8\uDF40', ["pensive"], 26, 35, 15, 0],
			"1f615": [['\uD83D\uDE15'], "", "", ["confused"], 26, 36, 15, 0],
			"1f616": [['\uD83D\uDE16'], '\uE407', '\uDBB8\uDF3F', ["confounded"], 26, 37, 15, 0],
			"1f617": [['\uD83D\uDE17'], "", "", ["kissing"], 26, 38, 15, 0],
			"1f618": [['\uD83D\uDE18'], '\uE418', '\uDBB8\uDF2C', ["kissing_heart"], 26, 39, 15, 0],
			"1f619": [['\uD83D\uDE19'], "", "", ["kissing_smiling_eyes"], 26, 40, 15, 0],
			"1f61a": [['\uD83D\uDE1A'], '\uE417', '\uDBB8\uDF2D', ["kissing_closed_eyes"], 27, 0, 15, 0],
			"1f61b": [['\uD83D\uDE1B'], "", "", ["stuck_out_tongue"], 27, 1, 15, 0, ":p"],
			"1f61c": [['\uD83D\uDE1C'], '\uE105', '\uDBB8\uDF29', ["stuck_out_tongue_winking_eye"], 27, 2, 15, 0, ";p"],
			"1f61d": [['\uD83D\uDE1D'], '\uE409', '\uDBB8\uDF2A', ["stuck_out_tongue_closed_eyes"], 27, 3, 15, 0],
			"1f61e": [['\uD83D\uDE1E'], '\uE058', '\uDBB8\uDF23', ["disappointed"], 27, 4, 15, 0, ":("],
			"1f61f": [['\uD83D\uDE1F'], "", "", ["worried"], 27, 5, 15, 0],
			"1f620": [['\uD83D\uDE20'], '\uE059', '\uDBB8\uDF20', ["angry"], 27, 6, 15, 0],
			"1f621": [['\uD83D\uDE21'], '\uE416', '\uDBB8\uDF3D', ["rage"], 27, 7, 15, 0],
			"1f622": [['\uD83D\uDE22'], '\uE413', '\uDBB8\uDF39', ["cry"], 27, 8, 15, 0, ":'("],
			"1f623": [['\uD83D\uDE23'], '\uE406', '\uDBB8\uDF3C', ["persevere"], 27, 9, 15, 0],
			"1f624": [['\uD83D\uDE24'], '\uE404', '\uDBB8\uDF28', ["triumph"], 27, 10, 15, 0],
			"1f625": [['\uD83D\uDE25'], '\uE401', '\uDBB8\uDF45', ["disappointed_relieved"], 27, 11, 15, 0],
			"1f626": [['\uD83D\uDE26'], "", "", ["frowning"], 27, 12, 15, 0],
			"1f627": [['\uD83D\uDE27'], "", "", ["anguished"], 27, 13, 15, 0],
			"1f628": [['\uD83D\uDE28'], '\uE40B', '\uDBB8\uDF3B', ["fearful"], 27, 14, 15, 0],
			"1f629": [['\uD83D\uDE29'], '\uE403', '\uDBB8\uDF21', ["weary"], 27, 15, 15, 0],
			"1f62a": [['\uD83D\uDE2A'], '\uE408', '\uDBB8\uDF42', ["sleepy"], 27, 16, 15, 0],
			"1f62b": [['\uD83D\uDE2B'], '\uE406', '\uDBB8\uDF46', ["tired_face"], 27, 17, 15, 0],
			"1f62c": [['\uD83D\uDE2C'], "", "", ["grimacing"], 27, 18, 15, 0],
			"1f62d": [['\uD83D\uDE2D'], '\uE411', '\uDBB8\uDF3A', ["sob"], 27, 19, 15, 0, ":'("],
			"1f62e": [['\uD83D\uDE2E'], "", "", ["open_mouth"], 27, 20, 15, 0],
			"1f62f": [['\uD83D\uDE2F'], "", "", ["hushed"], 27, 21, 15, 0],
			"1f630": [['\uD83D\uDE30'], '\uE40F', '\uDBB8\uDF25', ["cold_sweat"], 27, 22, 15, 0],
			"1f631": [['\uD83D\uDE31'], '\uE107', '\uDBB8\uDF41', ["scream"], 27, 23, 15, 0],
			"1f632": [['\uD83D\uDE32'], '\uE410', '\uDBB8\uDF22', ["astonished"], 27, 24, 15, 0],
			"1f633": [['\uD83D\uDE33'], '\uE40D', '\uDBB8\uDF2F', ["flushed"], 27, 25, 15, 0],
			"1f634": [['\uD83D\uDE34'], "", "", ["sleeping"], 27, 26, 15, 0],
			"1f635": [['\uD83D\uDE35'], '\uE406', '\uDBB8\uDF24', ["dizzy_face"], 27, 27, 15, 0],
			"1f636": [['\uD83D\uDE36'], "", "", ["no_mouth"], 27, 28, 15, 0],
			"1f637": [['\uD83D\uDE37'], '\uE40C', '\uDBB8\uDF2E', ["mask"], 27, 29, 15, 0],
			"1f638": [['\uD83D\uDE38'], '\uE404', '\uDBB8\uDF49', ["smile_cat"], 27, 30, 15, 0],
			"1f639": [['\uD83D\uDE39'], '\uE412', '\uDBB8\uDF4A', ["joy_cat"], 27, 31, 15, 0],
			"1f63a": [['\uD83D\uDE3A'], '\uE057', '\uDBB8\uDF48', ["smiley_cat"], 27, 32, 15, 0],
			"1f63b": [['\uD83D\uDE3B'], '\uE106', '\uDBB8\uDF4C', ["heart_eyes_cat"], 27, 33, 15, 0],
			"1f63c": [['\uD83D\uDE3C'], '\uE404', '\uDBB8\uDF4F', ["smirk_cat"], 27, 34, 15, 0],
			"1f63d": [['\uD83D\uDE3D'], '\uE418', '\uDBB8\uDF4B', ["kissing_cat"], 27, 35, 15, 0],
			"1f63e": [['\uD83D\uDE3E'], '\uE416', '\uDBB8\uDF4E', ["pouting_cat"], 27, 36, 15, 0],
			"1f63f": [['\uD83D\uDE3F'], '\uE413', '\uDBB8\uDF4D', ["crying_cat_face"], 27, 37, 15, 0],
			"1f640": [['\uD83D\uDE40'], '\uE403', '\uDBB8\uDF50', ["scream_cat"], 27, 38, 15, 0],
			"1f641": [['\uD83D\uDE41'], "", "", ["slightly_frowning_face"], 27, 39, 15, 0],
			"1f642": [['\uD83D\uDE42'], "", "", ["slightly_smiling_face"], 27, 40, 15, 0],
			"1f643": [['\uD83D\uDE43'], "", "", ["upside_down_face"], 28, 0, 15, 0],
			"1f644": [['\uD83D\uDE44'], "", "", ["face_with_rolling_eyes"], 28, 1, 15, 0],
			"1f645": [['\uD83D\uDE45'], '\uE423', '\uDBB8\uDF51', ["no_good"], 28, 2, 15, 0],
			"1f646": [['\uD83D\uDE46'], '\uE424', '\uDBB8\uDF52', ["ok_woman"], 28, 8, 15, 0],
			"1f647": [['\uD83D\uDE47'], '\uE426', '\uDBB8\uDF53', ["bow"], 28, 14, 15, 0],
			"1f648": [['\uD83D\uDE48'], "", '\uDBB8\uDF54', ["see_no_evil"], 28, 20, 15, 0],
			"1f649": [['\uD83D\uDE49'], "", '\uDBB8\uDF56', ["hear_no_evil"], 28, 21, 15, 0],
			"1f64a": [['\uD83D\uDE4A'], "", '\uDBB8\uDF55', ["speak_no_evil"], 28, 22, 15, 0],
			"1f64b": [['\uD83D\uDE4B'], '\uE012', '\uDBB8\uDF57', ["raising_hand"], 28, 23, 15, 0],
			"1f64c": [['\uD83D\uDE4C'], '\uE427', '\uDBB8\uDF58', ["raised_hands"], 28, 29, 15, 0],
			"1f64d": [['\uD83D\uDE4D'], '\uE403', '\uDBB8\uDF59', ["person_frowning"], 28, 35, 15, 0],
			"1f64e": [['\uD83D\uDE4E'], '\uE416', '\uDBB8\uDF5A', ["person_with_pouting_face"], 29, 0, 15, 0],
			"1f64f": [['\uD83D\uDE4F'], '\uE41D', '\uDBB8\uDF5B', ["pray"], 29, 6, 15, 0],
			"1f680": [['\uD83D\uDE80'], '\uE10D', '\uDBB9\uDFED', ["rocket"], 29, 12, 15, 0],
			"1f681": [['\uD83D\uDE81'], "", "", ["helicopter"], 29, 13, 15, 0],
			"1f682": [['\uD83D\uDE82'], "", "", ["steam_locomotive"], 29, 14, 15, 0],
			"1f683": [['\uD83D\uDE83'], '\uE01E', '\uDBB9\uDFDF', ["railway_car"], 29, 15, 15, 0],
			"1f684": [['\uD83D\uDE84'], '\uE435', '\uDBB9\uDFE2', ["bullettrain_side"], 29, 16, 15, 0],
			"1f685": [['\uD83D\uDE85'], '\uE01F', '\uDBB9\uDFE3', ["bullettrain_front"], 29, 17, 15, 0],
			"1f686": [['\uD83D\uDE86'], "", "", ["train2"], 29, 18, 15, 0],
			"1f687": [['\uD83D\uDE87'], '\uE434', '\uDBB9\uDFE0', ["metro"], 29, 19, 15, 0],
			"1f688": [['\uD83D\uDE88'], "", "", ["light_rail"], 29, 20, 15, 0],
			"1f689": [['\uD83D\uDE89'], '\uE039', '\uDBB9\uDFEC', ["station"], 29, 21, 15, 0],
			"1f68a": [['\uD83D\uDE8A'], "", "", ["tram"], 29, 22, 15, 0],
			"1f68b": [['\uD83D\uDE8B'], "", "", ["train"], 29, 23, 15, 0],
			"1f68c": [['\uD83D\uDE8C'], '\uE159', '\uDBB9\uDFE6', ["bus"], 29, 24, 15, 0],
			"1f68d": [['\uD83D\uDE8D'], "", "", ["oncoming_bus"], 29, 25, 15, 0],
			"1f68e": [['\uD83D\uDE8E'], "", "", ["trolleybus"], 29, 26, 15, 0],
			"1f68f": [['\uD83D\uDE8F'], '\uE150', '\uDBB9\uDFE7', ["busstop"], 29, 27, 15, 0],
			"1f690": [['\uD83D\uDE90'], "", "", ["minibus"], 29, 28, 15, 0],
			"1f691": [['\uD83D\uDE91'], '\uE431', '\uDBB9\uDFF3', ["ambulance"], 29, 29, 15, 0],
			"1f692": [['\uD83D\uDE92'], '\uE430', '\uDBB9\uDFF2', ["fire_engine"], 29, 30, 15, 0],
			"1f693": [['\uD83D\uDE93'], '\uE432', '\uDBB9\uDFF4', ["police_car"], 29, 31, 15, 0],
			"1f694": [['\uD83D\uDE94'], "", "", ["oncoming_police_car"], 29, 32, 15, 0],
			"1f695": [['\uD83D\uDE95'], '\uE15A', '\uDBB9\uDFEF', ["taxi"], 29, 33, 15, 0],
			"1f696": [['\uD83D\uDE96'], "", "", ["oncoming_taxi"], 29, 34, 15, 0],
			"1f697": [['\uD83D\uDE97'], '\uE01B', '\uDBB9\uDFE4', ["car", "red_car"], 29, 35, 15, 0],
			"1f698": [['\uD83D\uDE98'], "", "", ["oncoming_automobile"], 29, 36, 15, 0],
			"1f699": [['\uD83D\uDE99'], '\uE42E', '\uDBB9\uDFE5', ["blue_car"], 29, 37, 15, 0],
			"1f69a": [['\uD83D\uDE9A'], '\uE42F', '\uDBB9\uDFF1', ["truck"], 29, 38, 15, 0],
			"1f69b": [['\uD83D\uDE9B'], "", "", ["articulated_lorry"], 29, 39, 15, 0],
			"1f69c": [['\uD83D\uDE9C'], "", "", ["tractor"], 29, 40, 15, 0],
			"1f69d": [['\uD83D\uDE9D'], "", "", ["monorail"], 30, 0, 15, 0],
			"1f69e": [['\uD83D\uDE9E'], "", "", ["mountain_railway"], 30, 1, 15, 0],
			"1f69f": [['\uD83D\uDE9F'], "", "", ["suspension_railway"], 30, 2, 15, 0],
			"1f6a0": [['\uD83D\uDEA0'], "", "", ["mountain_cableway"], 30, 3, 15, 0],
			"1f6a1": [['\uD83D\uDEA1'], "", "", ["aerial_tramway"], 30, 4, 15, 0],
			"1f6a2": [['\uD83D\uDEA2'], '\uE202', '\uDBB9\uDFE8', ["ship"], 30, 5, 15, 0],
			"1f6a3": [['\uD83D\uDEA3'], "", "", ["rowboat"], 30, 6, 15, 0],
			"1f6a4": [['\uD83D\uDEA4'], '\uE135', '\uDBB9\uDFEE', ["speedboat"], 30, 12, 15, 0],
			"1f6a5": [['\uD83D\uDEA5'], '\uE14E', '\uDBB9\uDFF7', ["traffic_light"], 30, 13, 15, 0],
			"1f6a6": [['\uD83D\uDEA6'], "", "", ["vertical_traffic_light"], 30, 14, 15, 0],
			"1f6a7": [['\uD83D\uDEA7'], '\uE137', '\uDBB9\uDFF8', ["construction"], 30, 15, 15, 0],
			"1f6a8": [['\uD83D\uDEA8'], '\uE432', '\uDBB9\uDFF9', ["rotating_light"], 30, 16, 15, 0],
			"1f6a9": [['\uD83D\uDEA9'], "", '\uDBBA\uDF22', ["triangular_flag_on_post"], 30, 17, 15, 0],
			"1f6aa": [['\uD83D\uDEAA'], "", '\uDBB9\uDCF3', ["door"], 30, 18, 15, 0],
			"1f6ab": [['\uD83D\uDEAB'], "", '\uDBBA\uDF48', ["no_entry_sign"], 30, 19, 15, 0],
			"1f6ac": [['\uD83D\uDEAC'], '\uE30E', '\uDBBA\uDF1E', ["smoking"], 30, 20, 15, 0],
			"1f6ad": [['\uD83D\uDEAD'], '\uE208', '\uDBBA\uDF1F', ["no_smoking"], 30, 21, 15, 0],
			"1f6ae": [['\uD83D\uDEAE'], "", "", ["put_litter_in_its_place"], 30, 22, 15, 0],
			"1f6af": [['\uD83D\uDEAF'], "", "", ["do_not_litter"], 30, 23, 15, 0],
			"1f6b0": [['\uD83D\uDEB0'], "", "", ["potable_water"], 30, 24, 15, 0],
			"1f6b1": [['\uD83D\uDEB1'], "", "", ["non-potable_water"], 30, 25, 15, 0],
			"1f6b2": [['\uD83D\uDEB2'], '\uE136', '\uDBB9\uDFEB', ["bike"], 30, 26, 15, 0],
			"1f6b3": [['\uD83D\uDEB3'], "", "", ["no_bicycles"], 30, 27, 15, 0],
			"1f6b4": [['\uD83D\uDEB4'], "", "", ["bicyclist"], 30, 28, 15, 0],
			"1f6b5": [['\uD83D\uDEB5'], "", "", ["mountain_bicyclist"], 30, 34, 15, 0],
			"1f6b6": [['\uD83D\uDEB6'], '\uE201', '\uDBB9\uDFF0', ["walking"], 30, 40, 15, 0],
			"1f6b7": [['\uD83D\uDEB7'], "", "", ["no_pedestrians"], 31, 5, 15, 0],
			"1f6b8": [['\uD83D\uDEB8'], "", "", ["children_crossing"], 31, 6, 15, 0],
			"1f6b9": [['\uD83D\uDEB9'], '\uE138', '\uDBBA\uDF33', ["mens"], 31, 7, 15, 0],
			"1f6ba": [['\uD83D\uDEBA'], '\uE139', '\uDBBA\uDF34', ["womens"], 31, 8, 15, 0],
			"1f6bb": [['\uD83D\uDEBB'], '\uE151', '\uDBB9\uDD06', ["restroom"], 31, 9, 15, 0],
			"1f6bc": [['\uD83D\uDEBC'], '\uE13A', '\uDBBA\uDF35', ["baby_symbol"], 31, 10, 15, 0],
			"1f6bd": [['\uD83D\uDEBD'], '\uE140', '\uDBB9\uDD07', ["toilet"], 31, 11, 15, 0],
			"1f6be": [['\uD83D\uDEBE'], '\uE309', '\uDBB9\uDD08', ["wc"], 31, 12, 15, 0],
			"1f6bf": [['\uD83D\uDEBF'], "", "", ["shower"], 31, 13, 15, 0],
			"1f6c0": [['\uD83D\uDEC0'], '\uE13F', '\uDBB9\uDD05', ["bath"], 31, 14, 15, 0],
			"1f6c1": [['\uD83D\uDEC1'], "", "", ["bathtub"], 31, 20, 15, 0],
			"1f6c2": [['\uD83D\uDEC2'], "", "", ["passport_control"], 31, 21, 15, 0],
			"1f6c3": [['\uD83D\uDEC3'], "", "", ["customs"], 31, 22, 15, 0],
			"1f6c4": [['\uD83D\uDEC4'], "", "", ["baggage_claim"], 31, 23, 15, 0],
			"1f6c5": [['\uD83D\uDEC5'], "", "", ["left_luggage"], 31, 24, 15, 0],
			"1f6cb": [['\uD83D\uDECB'], "", "", ["couch_and_lamp"], 31, 25, 15, 0],
			"1f6cc": [['\uD83D\uDECC'], "", "", ["sleeping_accommodation"], 31, 26, 15, 0],
			"1f6cd": [['\uD83D\uDECD'], "", "", ["shopping_bags"], 31, 27, 15, 0],
			"1f6ce": [['\uD83D\uDECE'], "", "", ["bellhop_bell"], 31, 28, 15, 0],
			"1f6cf": [['\uD83D\uDECF'], "", "", ["bed"], 31, 29, 15, 0],
			"1f6d0": [['\uD83D\uDED0'], "", "", ["place_of_worship"], 31, 30, 15, 0],
			"1f6e0": [['\uD83D\uDEE0'], "", "", ["hammer_and_wrench"], 31, 31, 15, 0],
			"1f6e1": [['\uD83D\uDEE1'], "", "", ["shield"], 31, 32, 15, 0],
			"1f6e2": [['\uD83D\uDEE2'], "", "", ["oil_drum"], 31, 33, 15, 0],
			"1f6e3": [['\uD83D\uDEE3'], "", "", ["motorway"], 31, 34, 15, 0],
			"1f6e4": [['\uD83D\uDEE4'], "", "", ["railway_track"], 31, 35, 15, 0],
			"1f6e5": [['\uD83D\uDEE5'], "", "", ["motor_boat"], 31, 36, 15, 0],
			"1f6e9": [['\uD83D\uDEE9'], "", "", ["small_airplane"], 31, 37, 15, 0],
			"1f6eb": [['\uD83D\uDEEB'], "", "", ["airplane_departure"], 31, 38, 15, 0],
			"1f6ec": [['\uD83D\uDEEC'], "", "", ["airplane_arriving"], 31, 39, 15, 0],
			"1f6f0": [['\uD83D\uDEF0'], "", "", ["satellite"], 31, 40, 15, 0],
			"1f6f3": [['\uD83D\uDEF3'], "", "", ["passenger_ship"], 32, 0, 15, 0],
			"1f910": [['\uD83E\uDD10'], "", "", ["zipper_mouth_face"], 32, 1, 15, 0],
			"1f911": [['\uD83E\uDD11'], "", "", ["money_mouth_face"], 32, 2, 15, 0],
			"1f912": [['\uD83E\uDD12'], "", "", ["face_with_thermometer"], 32, 3, 15, 0],
			"1f913": [['\uD83E\uDD13'], "", "", ["nerd_face"], 32, 4, 15, 0],
			"1f914": [['\uD83E\uDD14'], "", "", ["thinking_face"], 32, 5, 15, 0],
			"1f915": [['\uD83E\uDD15'], "", "", ["face_with_head_bandage"], 32, 6, 15, 0],
			"1f916": [['\uD83E\uDD16'], "", "", ["robot_face"], 32, 7, 15, 0],
			"1f917": [['\uD83E\uDD17'], "", "", ["hugging_face"], 32, 8, 15, 0],
			"1f918": [['\uD83E\uDD18'], "", "", ["the_horns", "sign_of_the_horns"], 32, 9, 15, 0],
			"1f980": [['\uD83E\uDD80'], "", "", ["crab"], 32, 15, 15, 0],
			"1f981": [['\uD83E\uDD81'], "", "", ["lion_face"], 32, 16, 15, 0],
			"1f982": [['\uD83E\uDD82'], "", "", ["scorpion"], 32, 17, 15, 0],
			"1f983": [['\uD83E\uDD83'], "", "", ["turkey"], 32, 18, 15, 0],
			"1f984": [['\uD83E\uDD84'], "", "", ["unicorn_face"], 32, 19, 15, 0],
			"1f9c0": [['\uD83E\uDDC0'], "", "", ["cheese_wedge"], 32, 20, 15, 0],
			"0023-20e3": [['#\uFE0F\u20E3', '#\u20E3'], '\uE210', '\uDBBA\uDC2C', ["hash"], 32, 21, 15, 0],
			"002a-20e3": [['*\u20E3'], "", "", ["keycap_star"], 32, 22, 15, 0],
			"0030-20e3": [['0\uFE0F\u20E3', '0\u20E3'], '\uE225', '\uDBBA\uDC37', ["zero"], 32, 23, 15, 0],
			"0031-20e3": [['1\uFE0F\u20E3', '1\u20E3'], '\uE21C', '\uDBBA\uDC2E', ["one"], 32, 24, 15, 0],
			"0032-20e3": [['2\uFE0F\u20E3', '2\u20E3'], '\uE21D', '\uDBBA\uDC2F', ["two"], 32, 25, 15, 0],
			"0033-20e3": [['3\uFE0F\u20E3', '3\u20E3'], '\uE21E', '\uDBBA\uDC30', ["three"], 32, 26, 15, 0],
			"0034-20e3": [['4\uFE0F\u20E3', '4\u20E3'], '\uE21F', '\uDBBA\uDC31', ["four"], 32, 27, 15, 0],
			"0035-20e3": [['5\uFE0F\u20E3', '5\u20E3'], '\uE220', '\uDBBA\uDC32', ["five"], 32, 28, 15, 0],
			"0036-20e3": [['6\uFE0F\u20E3', '6\u20E3'], '\uE221', '\uDBBA\uDC33', ["six"], 32, 29, 15, 0],
			"0037-20e3": [['7\uFE0F\u20E3', '7\u20E3'], '\uE222', '\uDBBA\uDC34', ["seven"], 32, 30, 15, 0],
			"0038-20e3": [['8\uFE0F\u20E3', '8\u20E3'], '\uE223', '\uDBBA\uDC35', ["eight"], 32, 31, 15, 0],
			"0039-20e3": [['9\uFE0F\u20E3', '9\u20E3'], '\uE224', '\uDBBA\uDC36', ["nine"], 32, 32, 15, 0],
			"1f1e6-1f1e8": [['\uD83C\uDDE6\uD83C\uDDE8'], "", "", ["flag-ac"], 32, 33, 15, 0],
			"1f1e6-1f1e9": [['\uD83C\uDDE6\uD83C\uDDE9'], "", "", ["flag-ad"], 32, 34, 15, 0],
			"1f1e6-1f1ea": [['\uD83C\uDDE6\uD83C\uDDEA'], "", "", ["flag-ae"], 32, 35, 15, 0],
			"1f1e6-1f1eb": [['\uD83C\uDDE6\uD83C\uDDEB'], "", "", ["flag-af"], 32, 36, 15, 0],
			"1f1e6-1f1ec": [['\uD83C\uDDE6\uD83C\uDDEC'], "", "", ["flag-ag"], 32, 37, 15, 0],
			"1f1e6-1f1ee": [['\uD83C\uDDE6\uD83C\uDDEE'], "", "", ["flag-ai"], 32, 38, 15, 0],
			"1f1e6-1f1f1": [['\uD83C\uDDE6\uD83C\uDDF1'], "", "", ["flag-al"], 32, 39, 15, 0],
			"1f1e6-1f1f2": [['\uD83C\uDDE6\uD83C\uDDF2'], "", "", ["flag-am"], 32, 40, 15, 0],
			"1f1e6-1f1f4": [['\uD83C\uDDE6\uD83C\uDDF4'], "", "", ["flag-ao"], 33, 0, 15, 0],
			"1f1e6-1f1f6": [['\uD83C\uDDE6\uD83C\uDDF6'], "", "", ["flag-aq"], 33, 1, 15, 0],
			"1f1e6-1f1f7": [['\uD83C\uDDE6\uD83C\uDDF7'], "", "", ["flag-ar"], 33, 2, 15, 0],
			"1f1e6-1f1f8": [['\uD83C\uDDE6\uD83C\uDDF8'], "", "", ["flag-as"], 33, 3, 15, 0],
			"1f1e6-1f1f9": [['\uD83C\uDDE6\uD83C\uDDF9'], "", "", ["flag-at"], 33, 4, 15, 0],
			"1f1e6-1f1fa": [['\uD83C\uDDE6\uD83C\uDDFA'], "", "", ["flag-au"], 33, 5, 15, 0],
			"1f1e6-1f1fc": [['\uD83C\uDDE6\uD83C\uDDFC'], "", "", ["flag-aw"], 33, 6, 15, 0],
			"1f1e6-1f1fd": [['\uD83C\uDDE6\uD83C\uDDFD'], "", "", ["flag-ax"], 33, 7, 15, 0],
			"1f1e6-1f1ff": [['\uD83C\uDDE6\uD83C\uDDFF'], "", "", ["flag-az"], 33, 8, 15, 0],
			"1f1e7-1f1e6": [['\uD83C\uDDE7\uD83C\uDDE6'], "", "", ["flag-ba"], 33, 9, 15, 0],
			"1f1e7-1f1e7": [['\uD83C\uDDE7\uD83C\uDDE7'], "", "", ["flag-bb"], 33, 10, 15, 0],
			"1f1e7-1f1e9": [['\uD83C\uDDE7\uD83C\uDDE9'], "", "", ["flag-bd"], 33, 11, 15, 0],
			"1f1e7-1f1ea": [['\uD83C\uDDE7\uD83C\uDDEA'], "", "", ["flag-be"], 33, 12, 15, 0],
			"1f1e7-1f1eb": [['\uD83C\uDDE7\uD83C\uDDEB'], "", "", ["flag-bf"], 33, 13, 15, 0],
			"1f1e7-1f1ec": [['\uD83C\uDDE7\uD83C\uDDEC'], "", "", ["flag-bg"], 33, 14, 15, 0],
			"1f1e7-1f1ed": [['\uD83C\uDDE7\uD83C\uDDED'], "", "", ["flag-bh"], 33, 15, 15, 0],
			"1f1e7-1f1ee": [['\uD83C\uDDE7\uD83C\uDDEE'], "", "", ["flag-bi"], 33, 16, 15, 0],
			"1f1e7-1f1ef": [['\uD83C\uDDE7\uD83C\uDDEF'], "", "", ["flag-bj"], 33, 17, 15, 0],
			"1f1e7-1f1f1": [['\uD83C\uDDE7\uD83C\uDDF1'], "", "", ["flag-bl"], 33, 18, 13, 0],
			"1f1e7-1f1f2": [['\uD83C\uDDE7\uD83C\uDDF2'], "", "", ["flag-bm"], 33, 19, 15, 0],
			"1f1e7-1f1f3": [['\uD83C\uDDE7\uD83C\uDDF3'], "", "", ["flag-bn"], 33, 20, 15, 0],
			"1f1e7-1f1f4": [['\uD83C\uDDE7\uD83C\uDDF4'], "", "", ["flag-bo"], 33, 21, 15, 0],
			"1f1e7-1f1f6": [['\uD83C\uDDE7\uD83C\uDDF6'], "", "", ["flag-bq"], 33, 22, 13, 0],
			"1f1e7-1f1f7": [['\uD83C\uDDE7\uD83C\uDDF7'], "", "", ["flag-br"], 33, 23, 15, 0],
			"1f1e7-1f1f8": [['\uD83C\uDDE7\uD83C\uDDF8'], "", "", ["flag-bs"], 33, 24, 15, 0],
			"1f1e7-1f1f9": [['\uD83C\uDDE7\uD83C\uDDF9'], "", "", ["flag-bt"], 33, 25, 15, 0],
			"1f1e7-1f1fb": [['\uD83C\uDDE7\uD83C\uDDFB'], "", "", ["flag-bv"], 33, 26, 13, 0],
			"1f1e7-1f1fc": [['\uD83C\uDDE7\uD83C\uDDFC'], "", "", ["flag-bw"], 33, 27, 15, 0],
			"1f1e7-1f1fe": [['\uD83C\uDDE7\uD83C\uDDFE'], "", "", ["flag-by"], 33, 28, 15, 0],
			"1f1e7-1f1ff": [['\uD83C\uDDE7\uD83C\uDDFF'], "", "", ["flag-bz"], 33, 29, 15, 0],
			"1f1e8-1f1e6": [['\uD83C\uDDE8\uD83C\uDDE6'], "", "", ["flag-ca"], 33, 30, 15, 0],
			"1f1e8-1f1e8": [['\uD83C\uDDE8\uD83C\uDDE8'], "", "", ["flag-cc"], 33, 31, 15, 0],
			"1f1e8-1f1e9": [['\uD83C\uDDE8\uD83C\uDDE9'], "", "", ["flag-cd"], 33, 32, 15, 0],
			"1f1e8-1f1eb": [['\uD83C\uDDE8\uD83C\uDDEB'], "", "", ["flag-cf"], 33, 33, 15, 0],
			"1f1e8-1f1ec": [['\uD83C\uDDE8\uD83C\uDDEC'], "", "", ["flag-cg"], 33, 34, 15, 0],
			"1f1e8-1f1ed": [['\uD83C\uDDE8\uD83C\uDDED'], "", "", ["flag-ch"], 33, 35, 15, 0],
			"1f1e8-1f1ee": [['\uD83C\uDDE8\uD83C\uDDEE'], "", "", ["flag-ci"], 33, 36, 15, 0],
			"1f1e8-1f1f0": [['\uD83C\uDDE8\uD83C\uDDF0'], "", "", ["flag-ck"], 33, 37, 15, 0],
			"1f1e8-1f1f1": [['\uD83C\uDDE8\uD83C\uDDF1'], "", "", ["flag-cl"], 33, 38, 15, 0],
			"1f1e8-1f1f2": [['\uD83C\uDDE8\uD83C\uDDF2'], "", "", ["flag-cm"], 33, 39, 15, 0],
			"1f1e8-1f1f3": [['\uD83C\uDDE8\uD83C\uDDF3'], '\uE513', '\uDBB9\uDCED', ["flag-cn", "cn"], 33, 40, 15, 0],
			"1f1e8-1f1f4": [['\uD83C\uDDE8\uD83C\uDDF4'], "", "", ["flag-co"], 34, 0, 15, 0],
			"1f1e8-1f1f5": [['\uD83C\uDDE8\uD83C\uDDF5'], "", "", ["flag-cp"], 34, 1, 13, 0],
			"1f1e8-1f1f7": [['\uD83C\uDDE8\uD83C\uDDF7'], "", "", ["flag-cr"], 34, 2, 15, 0],
			"1f1e8-1f1fa": [['\uD83C\uDDE8\uD83C\uDDFA'], "", "", ["flag-cu"], 34, 3, 15, 0],
			"1f1e8-1f1fb": [['\uD83C\uDDE8\uD83C\uDDFB'], "", "", ["flag-cv"], 34, 4, 15, 0],
			"1f1e8-1f1fc": [['\uD83C\uDDE8\uD83C\uDDFC'], "", "", ["flag-cw"], 34, 5, 15, 0],
			"1f1e8-1f1fd": [['\uD83C\uDDE8\uD83C\uDDFD'], "", "", ["flag-cx"], 34, 6, 15, 0],
			"1f1e8-1f1fe": [['\uD83C\uDDE8\uD83C\uDDFE'], "", "", ["flag-cy"], 34, 7, 15, 0],
			"1f1e8-1f1ff": [['\uD83C\uDDE8\uD83C\uDDFF'], "", "", ["flag-cz"], 34, 8, 15, 0],
			"1f1e9-1f1ea": [['\uD83C\uDDE9\uD83C\uDDEA'], '\uE50E', '\uDBB9\uDCE8', ["flag-de", "de"], 34, 9, 15, 0],
			"1f1e9-1f1ec": [['\uD83C\uDDE9\uD83C\uDDEC'], "", "", ["flag-dg"], 34, 10, 13, 0],
			"1f1e9-1f1ef": [['\uD83C\uDDE9\uD83C\uDDEF'], "", "", ["flag-dj"], 34, 11, 15, 0],
			"1f1e9-1f1f0": [['\uD83C\uDDE9\uD83C\uDDF0'], "", "", ["flag-dk"], 34, 12, 15, 0],
			"1f1e9-1f1f2": [['\uD83C\uDDE9\uD83C\uDDF2'], "", "", ["flag-dm"], 34, 13, 15, 0],
			"1f1e9-1f1f4": [['\uD83C\uDDE9\uD83C\uDDF4'], "", "", ["flag-do"], 34, 14, 15, 0],
			"1f1e9-1f1ff": [['\uD83C\uDDE9\uD83C\uDDFF'], "", "", ["flag-dz"], 34, 15, 15, 0],
			"1f1ea-1f1e6": [['\uD83C\uDDEA\uD83C\uDDE6'], "", "", ["flag-ea"], 34, 16, 13, 0],
			"1f1ea-1f1e8": [['\uD83C\uDDEA\uD83C\uDDE8'], "", "", ["flag-ec"], 34, 17, 15, 0],
			"1f1ea-1f1ea": [['\uD83C\uDDEA\uD83C\uDDEA'], "", "", ["flag-ee"], 34, 18, 15, 0],
			"1f1ea-1f1ec": [['\uD83C\uDDEA\uD83C\uDDEC'], "", "", ["flag-eg"], 34, 19, 15, 0],
			"1f1ea-1f1ed": [['\uD83C\uDDEA\uD83C\uDDED'], "", "", ["flag-eh"], 34, 20, 13, 0],
			"1f1ea-1f1f7": [['\uD83C\uDDEA\uD83C\uDDF7'], "", "", ["flag-er"], 34, 21, 15, 0],
			"1f1ea-1f1f8": [['\uD83C\uDDEA\uD83C\uDDF8'], '\uE511', '\uDBB9\uDCEB', ["flag-es", "es"], 34, 22, 15, 0],
			"1f1ea-1f1f9": [['\uD83C\uDDEA\uD83C\uDDF9'], "", "", ["flag-et"], 34, 23, 15, 0],
			"1f1ea-1f1fa": [['\uD83C\uDDEA\uD83C\uDDFA'], "", "", ["flag-eu"], 34, 24, 15, 0],
			"1f1eb-1f1ee": [['\uD83C\uDDEB\uD83C\uDDEE'], "", "", ["flag-fi"], 34, 25, 15, 0],
			"1f1eb-1f1ef": [['\uD83C\uDDEB\uD83C\uDDEF'], "", "", ["flag-fj"], 34, 26, 15, 0],
			"1f1eb-1f1f0": [['\uD83C\uDDEB\uD83C\uDDF0'], "", "", ["flag-fk"], 34, 27, 13, 0],
			"1f1eb-1f1f2": [['\uD83C\uDDEB\uD83C\uDDF2'], "", "", ["flag-fm"], 34, 28, 15, 0],
			"1f1eb-1f1f4": [['\uD83C\uDDEB\uD83C\uDDF4'], "", "", ["flag-fo"], 34, 29, 15, 0],
			"1f1eb-1f1f7": [['\uD83C\uDDEB\uD83C\uDDF7'], '\uE50D', '\uDBB9\uDCE7', ["flag-fr", "fr"], 34, 30, 15, 0],
			"1f1ec-1f1e6": [['\uD83C\uDDEC\uD83C\uDDE6'], "", "", ["flag-ga"], 34, 31, 15, 0],
			"1f1ec-1f1e7": [['\uD83C\uDDEC\uD83C\uDDE7'], '\uE510', '\uDBB9\uDCEA', ["flag-gb", "gb", "uk"], 34, 32, 15, 0],
			"1f1ec-1f1e9": [['\uD83C\uDDEC\uD83C\uDDE9'], "", "", ["flag-gd"], 34, 33, 15, 0],
			"1f1ec-1f1ea": [['\uD83C\uDDEC\uD83C\uDDEA'], "", "", ["flag-ge"], 34, 34, 15, 0],
			"1f1ec-1f1eb": [['\uD83C\uDDEC\uD83C\uDDEB'], "", "", ["flag-gf"], 34, 35, 13, 0],
			"1f1ec-1f1ec": [['\uD83C\uDDEC\uD83C\uDDEC'], "", "", ["flag-gg"], 34, 36, 15, 0],
			"1f1ec-1f1ed": [['\uD83C\uDDEC\uD83C\uDDED'], "", "", ["flag-gh"], 34, 37, 15, 0],
			"1f1ec-1f1ee": [['\uD83C\uDDEC\uD83C\uDDEE'], "", "", ["flag-gi"], 34, 38, 15, 0],
			"1f1ec-1f1f1": [['\uD83C\uDDEC\uD83C\uDDF1'], "", "", ["flag-gl"], 34, 39, 15, 0],
			"1f1ec-1f1f2": [['\uD83C\uDDEC\uD83C\uDDF2'], "", "", ["flag-gm"], 34, 40, 15, 0],
			"1f1ec-1f1f3": [['\uD83C\uDDEC\uD83C\uDDF3'], "", "", ["flag-gn"], 35, 0, 15, 0],
			"1f1ec-1f1f5": [['\uD83C\uDDEC\uD83C\uDDF5'], "", "", ["flag-gp"], 35, 1, 13, 0],
			"1f1ec-1f1f6": [['\uD83C\uDDEC\uD83C\uDDF6'], "", "", ["flag-gq"], 35, 2, 15, 0],
			"1f1ec-1f1f7": [['\uD83C\uDDEC\uD83C\uDDF7'], "", "", ["flag-gr"], 35, 3, 15, 0],
			"1f1ec-1f1f8": [['\uD83C\uDDEC\uD83C\uDDF8'], "", "", ["flag-gs"], 35, 4, 13, 0],
			"1f1ec-1f1f9": [['\uD83C\uDDEC\uD83C\uDDF9'], "", "", ["flag-gt"], 35, 5, 15, 0],
			"1f1ec-1f1fa": [['\uD83C\uDDEC\uD83C\uDDFA'], "", "", ["flag-gu"], 35, 6, 15, 0],
			"1f1ec-1f1fc": [['\uD83C\uDDEC\uD83C\uDDFC'], "", "", ["flag-gw"], 35, 7, 15, 0],
			"1f1ec-1f1fe": [['\uD83C\uDDEC\uD83C\uDDFE'], "", "", ["flag-gy"], 35, 8, 15, 0],
			"1f1ed-1f1f0": [['\uD83C\uDDED\uD83C\uDDF0'], "", "", ["flag-hk"], 35, 9, 15, 0],
			"1f1ed-1f1f2": [['\uD83C\uDDED\uD83C\uDDF2'], "", "", ["flag-hm"], 35, 10, 13, 0],
			"1f1ed-1f1f3": [['\uD83C\uDDED\uD83C\uDDF3'], "", "", ["flag-hn"], 35, 11, 15, 0],
			"1f1ed-1f1f7": [['\uD83C\uDDED\uD83C\uDDF7'], "", "", ["flag-hr"], 35, 12, 15, 0],
			"1f1ed-1f1f9": [['\uD83C\uDDED\uD83C\uDDF9'], "", "", ["flag-ht"], 35, 13, 15, 0],
			"1f1ed-1f1fa": [['\uD83C\uDDED\uD83C\uDDFA'], "", "", ["flag-hu"], 35, 14, 15, 0],
			"1f1ee-1f1e8": [['\uD83C\uDDEE\uD83C\uDDE8'], "", "", ["flag-ic"], 35, 15, 15, 0],
			"1f1ee-1f1e9": [['\uD83C\uDDEE\uD83C\uDDE9'], "", "", ["flag-id"], 35, 16, 15, 0],
			"1f1ee-1f1ea": [['\uD83C\uDDEE\uD83C\uDDEA'], "", "", ["flag-ie"], 35, 17, 15, 0],
			"1f1ee-1f1f1": [['\uD83C\uDDEE\uD83C\uDDF1'], "", "", ["flag-il"], 35, 18, 15, 0],
			"1f1ee-1f1f2": [['\uD83C\uDDEE\uD83C\uDDF2'], "", "", ["flag-im"], 35, 19, 15, 0],
			"1f1ee-1f1f3": [['\uD83C\uDDEE\uD83C\uDDF3'], "", "", ["flag-in"], 35, 20, 15, 0],
			"1f1ee-1f1f4": [['\uD83C\uDDEE\uD83C\uDDF4'], "", "", ["flag-io"], 35, 21, 15, 0],
			"1f1ee-1f1f6": [['\uD83C\uDDEE\uD83C\uDDF6'], "", "", ["flag-iq"], 35, 22, 15, 0],
			"1f1ee-1f1f7": [['\uD83C\uDDEE\uD83C\uDDF7'], "", "", ["flag-ir"], 35, 23, 15, 0],
			"1f1ee-1f1f8": [['\uD83C\uDDEE\uD83C\uDDF8'], "", "", ["flag-is"], 35, 24, 15, 0],
			"1f1ee-1f1f9": [['\uD83C\uDDEE\uD83C\uDDF9'], '\uE50F', '\uDBB9\uDCE9', ["flag-it", "it"], 35, 25, 15, 0],
			"1f1ef-1f1ea": [['\uD83C\uDDEF\uD83C\uDDEA'], "", "", ["flag-je"], 35, 26, 15, 0],
			"1f1ef-1f1f2": [['\uD83C\uDDEF\uD83C\uDDF2'], "", "", ["flag-jm"], 35, 27, 15, 0],
			"1f1ef-1f1f4": [['\uD83C\uDDEF\uD83C\uDDF4'], "", "", ["flag-jo"], 35, 28, 15, 0],
			"1f1ef-1f1f5": [['\uD83C\uDDEF\uD83C\uDDF5'], '\uE50B', '\uDBB9\uDCE5', ["flag-jp", "jp"], 35, 29, 15, 0],
			"1f1f0-1f1ea": [['\uD83C\uDDF0\uD83C\uDDEA'], "", "", ["flag-ke"], 35, 30, 15, 0],
			"1f1f0-1f1ec": [['\uD83C\uDDF0\uD83C\uDDEC'], "", "", ["flag-kg"], 35, 31, 15, 0],
			"1f1f0-1f1ed": [['\uD83C\uDDF0\uD83C\uDDED'], "", "", ["flag-kh"], 35, 32, 15, 0],
			"1f1f0-1f1ee": [['\uD83C\uDDF0\uD83C\uDDEE'], "", "", ["flag-ki"], 35, 33, 15, 0],
			"1f1f0-1f1f2": [['\uD83C\uDDF0\uD83C\uDDF2'], "", "", ["flag-km"], 35, 34, 15, 0],
			"1f1f0-1f1f3": [['\uD83C\uDDF0\uD83C\uDDF3'], "", "", ["flag-kn"], 35, 35, 15, 0],
			"1f1f0-1f1f5": [['\uD83C\uDDF0\uD83C\uDDF5'], "", "", ["flag-kp"], 35, 36, 15, 0],
			"1f1f0-1f1f7": [['\uD83C\uDDF0\uD83C\uDDF7'], '\uE514', '\uDBB9\uDCEE', ["flag-kr", "kr"], 35, 37, 15, 0],
			"1f1f0-1f1fc": [['\uD83C\uDDF0\uD83C\uDDFC'], "", "", ["flag-kw"], 35, 38, 15, 0],
			"1f1f0-1f1fe": [['\uD83C\uDDF0\uD83C\uDDFE'], "", "", ["flag-ky"], 35, 39, 15, 0],
			"1f1f0-1f1ff": [['\uD83C\uDDF0\uD83C\uDDFF'], "", "", ["flag-kz"], 35, 40, 15, 0],
			"1f1f1-1f1e6": [['\uD83C\uDDF1\uD83C\uDDE6'], "", "", ["flag-la"], 36, 0, 15, 0],
			"1f1f1-1f1e7": [['\uD83C\uDDF1\uD83C\uDDE7'], "", "", ["flag-lb"], 36, 1, 15, 0],
			"1f1f1-1f1e8": [['\uD83C\uDDF1\uD83C\uDDE8'], "", "", ["flag-lc"], 36, 2, 15, 0],
			"1f1f1-1f1ee": [['\uD83C\uDDF1\uD83C\uDDEE'], "", "", ["flag-li"], 36, 3, 15, 0],
			"1f1f1-1f1f0": [['\uD83C\uDDF1\uD83C\uDDF0'], "", "", ["flag-lk"], 36, 4, 15, 0],
			"1f1f1-1f1f7": [['\uD83C\uDDF1\uD83C\uDDF7'], "", "", ["flag-lr"], 36, 5, 15, 0],
			"1f1f1-1f1f8": [['\uD83C\uDDF1\uD83C\uDDF8'], "", "", ["flag-ls"], 36, 6, 15, 0],
			"1f1f1-1f1f9": [['\uD83C\uDDF1\uD83C\uDDF9'], "", "", ["flag-lt"], 36, 7, 15, 0],
			"1f1f1-1f1fa": [['\uD83C\uDDF1\uD83C\uDDFA'], "", "", ["flag-lu"], 36, 8, 15, 0],
			"1f1f1-1f1fb": [['\uD83C\uDDF1\uD83C\uDDFB'], "", "", ["flag-lv"], 36, 9, 15, 0],
			"1f1f1-1f1fe": [['\uD83C\uDDF1\uD83C\uDDFE'], "", "", ["flag-ly"], 36, 10, 15, 0],
			"1f1f2-1f1e6": [['\uD83C\uDDF2\uD83C\uDDE6'], "", "", ["flag-ma"], 36, 11, 15, 0],
			"1f1f2-1f1e8": [['\uD83C\uDDF2\uD83C\uDDE8'], "", "", ["flag-mc"], 36, 12, 15, 0],
			"1f1f2-1f1e9": [['\uD83C\uDDF2\uD83C\uDDE9'], "", "", ["flag-md"], 36, 13, 15, 0],
			"1f1f2-1f1ea": [['\uD83C\uDDF2\uD83C\uDDEA'], "", "", ["flag-me"], 36, 14, 15, 0],
			"1f1f2-1f1eb": [['\uD83C\uDDF2\uD83C\uDDEB'], "", "", ["flag-mf"], 36, 15, 13, 0],
			"1f1f2-1f1ec": [['\uD83C\uDDF2\uD83C\uDDEC'], "", "", ["flag-mg"], 36, 16, 15, 0],
			"1f1f2-1f1ed": [['\uD83C\uDDF2\uD83C\uDDED'], "", "", ["flag-mh"], 36, 17, 15, 0],
			"1f1f2-1f1f0": [['\uD83C\uDDF2\uD83C\uDDF0'], "", "", ["flag-mk"], 36, 18, 15, 0],
			"1f1f2-1f1f1": [['\uD83C\uDDF2\uD83C\uDDF1'], "", "", ["flag-ml"], 36, 19, 15, 0],
			"1f1f2-1f1f2": [['\uD83C\uDDF2\uD83C\uDDF2'], "", "", ["flag-mm"], 36, 20, 15, 0],
			"1f1f2-1f1f3": [['\uD83C\uDDF2\uD83C\uDDF3'], "", "", ["flag-mn"], 36, 21, 15, 0],
			"1f1f2-1f1f4": [['\uD83C\uDDF2\uD83C\uDDF4'], "", "", ["flag-mo"], 36, 22, 15, 0],
			"1f1f2-1f1f5": [['\uD83C\uDDF2\uD83C\uDDF5'], "", "", ["flag-mp"], 36, 23, 15, 0],
			"1f1f2-1f1f6": [['\uD83C\uDDF2\uD83C\uDDF6'], "", "", ["flag-mq"], 36, 24, 13, 0],
			"1f1f2-1f1f7": [['\uD83C\uDDF2\uD83C\uDDF7'], "", "", ["flag-mr"], 36, 25, 15, 0],
			"1f1f2-1f1f8": [['\uD83C\uDDF2\uD83C\uDDF8'], "", "", ["flag-ms"], 36, 26, 15, 0],
			"1f1f2-1f1f9": [['\uD83C\uDDF2\uD83C\uDDF9'], "", "", ["flag-mt"], 36, 27, 15, 0],
			"1f1f2-1f1fa": [['\uD83C\uDDF2\uD83C\uDDFA'], "", "", ["flag-mu"], 36, 28, 15, 0],
			"1f1f2-1f1fb": [['\uD83C\uDDF2\uD83C\uDDFB'], "", "", ["flag-mv"], 36, 29, 15, 0],
			"1f1f2-1f1fc": [['\uD83C\uDDF2\uD83C\uDDFC'], "", "", ["flag-mw"], 36, 30, 15, 0],
			"1f1f2-1f1fd": [['\uD83C\uDDF2\uD83C\uDDFD'], "", "", ["flag-mx"], 36, 31, 15, 0],
			"1f1f2-1f1fe": [['\uD83C\uDDF2\uD83C\uDDFE'], "", "", ["flag-my"], 36, 32, 15, 0],
			"1f1f2-1f1ff": [['\uD83C\uDDF2\uD83C\uDDFF'], "", "", ["flag-mz"], 36, 33, 15, 0],
			"1f1f3-1f1e6": [['\uD83C\uDDF3\uD83C\uDDE6'], "", "", ["flag-na"], 36, 34, 15, 0],
			"1f1f3-1f1e8": [['\uD83C\uDDF3\uD83C\uDDE8'], "", "", ["flag-nc"], 36, 35, 13, 0],
			"1f1f3-1f1ea": [['\uD83C\uDDF3\uD83C\uDDEA'], "", "", ["flag-ne"], 36, 36, 15, 0],
			"1f1f3-1f1eb": [['\uD83C\uDDF3\uD83C\uDDEB'], "", "", ["flag-nf"], 36, 37, 15, 0],
			"1f1f3-1f1ec": [['\uD83C\uDDF3\uD83C\uDDEC'], "", "", ["flag-ng"], 36, 38, 15, 0],
			"1f1f3-1f1ee": [['\uD83C\uDDF3\uD83C\uDDEE'], "", "", ["flag-ni"], 36, 39, 15, 0],
			"1f1f3-1f1f1": [['\uD83C\uDDF3\uD83C\uDDF1'], "", "", ["flag-nl"], 36, 40, 15, 0],
			"1f1f3-1f1f4": [['\uD83C\uDDF3\uD83C\uDDF4'], "", "", ["flag-no"], 37, 0, 15, 0],
			"1f1f3-1f1f5": [['\uD83C\uDDF3\uD83C\uDDF5'], "", "", ["flag-np"], 37, 1, 15, 0],
			"1f1f3-1f1f7": [['\uD83C\uDDF3\uD83C\uDDF7'], "", "", ["flag-nr"], 37, 2, 15, 0],
			"1f1f3-1f1fa": [['\uD83C\uDDF3\uD83C\uDDFA'], "", "", ["flag-nu"], 37, 3, 15, 0],
			"1f1f3-1f1ff": [['\uD83C\uDDF3\uD83C\uDDFF'], "", "", ["flag-nz"], 37, 4, 15, 0],
			"1f1f4-1f1f2": [['\uD83C\uDDF4\uD83C\uDDF2'], "", "", ["flag-om"], 37, 5, 15, 0],
			"1f1f5-1f1e6": [['\uD83C\uDDF5\uD83C\uDDE6'], "", "", ["flag-pa"], 37, 6, 15, 0],
			"1f1f5-1f1ea": [['\uD83C\uDDF5\uD83C\uDDEA'], "", "", ["flag-pe"], 37, 7, 15, 0],
			"1f1f5-1f1eb": [['\uD83C\uDDF5\uD83C\uDDEB'], "", "", ["flag-pf"], 37, 8, 15, 0],
			"1f1f5-1f1ec": [['\uD83C\uDDF5\uD83C\uDDEC'], "", "", ["flag-pg"], 37, 9, 15, 0],
			"1f1f5-1f1ed": [['\uD83C\uDDF5\uD83C\uDDED'], "", "", ["flag-ph"], 37, 10, 15, 0],
			"1f1f5-1f1f0": [['\uD83C\uDDF5\uD83C\uDDF0'], "", "", ["flag-pk"], 37, 11, 15, 0],
			"1f1f5-1f1f1": [['\uD83C\uDDF5\uD83C\uDDF1'], "", "", ["flag-pl"], 37, 12, 15, 0],
			"1f1f5-1f1f2": [['\uD83C\uDDF5\uD83C\uDDF2'], "", "", ["flag-pm"], 37, 13, 13, 0],
			"1f1f5-1f1f3": [['\uD83C\uDDF5\uD83C\uDDF3'], "", "", ["flag-pn"], 37, 14, 15, 0],
			"1f1f5-1f1f7": [['\uD83C\uDDF5\uD83C\uDDF7'], "", "", ["flag-pr"], 37, 15, 15, 0],
			"1f1f5-1f1f8": [['\uD83C\uDDF5\uD83C\uDDF8'], "", "", ["flag-ps"], 37, 16, 15, 0],
			"1f1f5-1f1f9": [['\uD83C\uDDF5\uD83C\uDDF9'], "", "", ["flag-pt"], 37, 17, 15, 0],
			"1f1f5-1f1fc": [['\uD83C\uDDF5\uD83C\uDDFC'], "", "", ["flag-pw"], 37, 18, 15, 0],
			"1f1f5-1f1fe": [['\uD83C\uDDF5\uD83C\uDDFE'], "", "", ["flag-py"], 37, 19, 15, 0],
			"1f1f6-1f1e6": [['\uD83C\uDDF6\uD83C\uDDE6'], "", "", ["flag-qa"], 37, 20, 15, 0],
			"1f1f7-1f1ea": [['\uD83C\uDDF7\uD83C\uDDEA'], "", "", ["flag-re"], 37, 21, 13, 0],
			"1f1f7-1f1f4": [['\uD83C\uDDF7\uD83C\uDDF4'], "", "", ["flag-ro"], 37, 22, 15, 0],
			"1f1f7-1f1f8": [['\uD83C\uDDF7\uD83C\uDDF8'], "", "", ["flag-rs"], 37, 23, 15, 0],
			"1f1f7-1f1fa": [['\uD83C\uDDF7\uD83C\uDDFA'], '\uE512', '\uDBB9\uDCEC', ["flag-ru", "ru"], 37, 24, 15, 0],
			"1f1f7-1f1fc": [['\uD83C\uDDF7\uD83C\uDDFC'], "", "", ["flag-rw"], 37, 25, 15, 0],
			"1f1f8-1f1e6": [['\uD83C\uDDF8\uD83C\uDDE6'], "", "", ["flag-sa"], 37, 26, 15, 0],
			"1f1f8-1f1e7": [['\uD83C\uDDF8\uD83C\uDDE7'], "", "", ["flag-sb"], 37, 27, 15, 0],
			"1f1f8-1f1e8": [['\uD83C\uDDF8\uD83C\uDDE8'], "", "", ["flag-sc"], 37, 28, 15, 0],
			"1f1f8-1f1e9": [['\uD83C\uDDF8\uD83C\uDDE9'], "", "", ["flag-sd"], 37, 29, 15, 0],
			"1f1f8-1f1ea": [['\uD83C\uDDF8\uD83C\uDDEA'], "", "", ["flag-se"], 37, 30, 15, 0],
			"1f1f8-1f1ec": [['\uD83C\uDDF8\uD83C\uDDEC'], "", "", ["flag-sg"], 37, 31, 15, 0],
			"1f1f8-1f1ed": [['\uD83C\uDDF8\uD83C\uDDED'], "", "", ["flag-sh"], 37, 32, 15, 0],
			"1f1f8-1f1ee": [['\uD83C\uDDF8\uD83C\uDDEE'], "", "", ["flag-si"], 37, 33, 15, 0],
			"1f1f8-1f1ef": [['\uD83C\uDDF8\uD83C\uDDEF'], "", "", ["flag-sj"], 37, 34, 13, 0],
			"1f1f8-1f1f0": [['\uD83C\uDDF8\uD83C\uDDF0'], "", "", ["flag-sk"], 37, 35, 15, 0],
			"1f1f8-1f1f1": [['\uD83C\uDDF8\uD83C\uDDF1'], "", "", ["flag-sl"], 37, 36, 15, 0],
			"1f1f8-1f1f2": [['\uD83C\uDDF8\uD83C\uDDF2'], "", "", ["flag-sm"], 37, 37, 15, 0],
			"1f1f8-1f1f3": [['\uD83C\uDDF8\uD83C\uDDF3'], "", "", ["flag-sn"], 37, 38, 15, 0],
			"1f1f8-1f1f4": [['\uD83C\uDDF8\uD83C\uDDF4'], "", "", ["flag-so"], 37, 39, 15, 0],
			"1f1f8-1f1f7": [['\uD83C\uDDF8\uD83C\uDDF7'], "", "", ["flag-sr"], 37, 40, 15, 0],
			"1f1f8-1f1f8": [['\uD83C\uDDF8\uD83C\uDDF8'], "", "", ["flag-ss"], 38, 0, 15, 0],
			"1f1f8-1f1f9": [['\uD83C\uDDF8\uD83C\uDDF9'], "", "", ["flag-st"], 38, 1, 15, 0],
			"1f1f8-1f1fb": [['\uD83C\uDDF8\uD83C\uDDFB'], "", "", ["flag-sv"], 38, 2, 15, 0],
			"1f1f8-1f1fd": [['\uD83C\uDDF8\uD83C\uDDFD'], "", "", ["flag-sx"], 38, 3, 15, 0],
			"1f1f8-1f1fe": [['\uD83C\uDDF8\uD83C\uDDFE'], "", "", ["flag-sy"], 38, 4, 15, 0],
			"1f1f8-1f1ff": [['\uD83C\uDDF8\uD83C\uDDFF'], "", "", ["flag-sz"], 38, 5, 15, 0],
			"1f1f9-1f1e6": [['\uD83C\uDDF9\uD83C\uDDE6'], "", "", ["flag-ta"], 38, 6, 15, 0],
			"1f1f9-1f1e8": [['\uD83C\uDDF9\uD83C\uDDE8'], "", "", ["flag-tc"], 38, 7, 15, 0],
			"1f1f9-1f1e9": [['\uD83C\uDDF9\uD83C\uDDE9'], "", "", ["flag-td"], 38, 8, 15, 0],
			"1f1f9-1f1eb": [['\uD83C\uDDF9\uD83C\uDDEB'], "", "", ["flag-tf"], 38, 9, 13, 0],
			"1f1f9-1f1ec": [['\uD83C\uDDF9\uD83C\uDDEC'], "", "", ["flag-tg"], 38, 10, 15, 0],
			"1f1f9-1f1ed": [['\uD83C\uDDF9\uD83C\uDDED'], "", "", ["flag-th"], 38, 11, 15, 0],
			"1f1f9-1f1ef": [['\uD83C\uDDF9\uD83C\uDDEF'], "", "", ["flag-tj"], 38, 12, 15, 0],
			"1f1f9-1f1f0": [['\uD83C\uDDF9\uD83C\uDDF0'], "", "", ["flag-tk"], 38, 13, 15, 0],
			"1f1f9-1f1f1": [['\uD83C\uDDF9\uD83C\uDDF1'], "", "", ["flag-tl"], 38, 14, 15, 0],
			"1f1f9-1f1f2": [['\uD83C\uDDF9\uD83C\uDDF2'], "", "", ["flag-tm"], 38, 15, 15, 0],
			"1f1f9-1f1f3": [['\uD83C\uDDF9\uD83C\uDDF3'], "", "", ["flag-tn"], 38, 16, 15, 0],
			"1f1f9-1f1f4": [['\uD83C\uDDF9\uD83C\uDDF4'], "", "", ["flag-to"], 38, 17, 15, 0],
			"1f1f9-1f1f7": [['\uD83C\uDDF9\uD83C\uDDF7'], "", "", ["flag-tr"], 38, 18, 15, 0],
			"1f1f9-1f1f9": [['\uD83C\uDDF9\uD83C\uDDF9'], "", "", ["flag-tt"], 38, 19, 15, 0],
			"1f1f9-1f1fb": [['\uD83C\uDDF9\uD83C\uDDFB'], "", "", ["flag-tv"], 38, 20, 15, 0],
			"1f1f9-1f1fc": [['\uD83C\uDDF9\uD83C\uDDFC'], "", "", ["flag-tw"], 38, 21, 15, 0],
			"1f1f9-1f1ff": [['\uD83C\uDDF9\uD83C\uDDFF'], "", "", ["flag-tz"], 38, 22, 15, 0],
			"1f1fa-1f1e6": [['\uD83C\uDDFA\uD83C\uDDE6'], "", "", ["flag-ua"], 38, 23, 15, 0],
			"1f1fa-1f1ec": [['\uD83C\uDDFA\uD83C\uDDEC'], "", "", ["flag-ug"], 38, 24, 15, 0],
			"1f1fa-1f1f2": [['\uD83C\uDDFA\uD83C\uDDF2'], "", "", ["flag-um"], 38, 25, 13, 0],
			"1f1fa-1f1f8": [['\uD83C\uDDFA\uD83C\uDDF8'], '\uE50C', '\uDBB9\uDCE6', ["flag-us", "us"], 38, 26, 15, 0],
			"1f1fa-1f1fe": [['\uD83C\uDDFA\uD83C\uDDFE'], "", "", ["flag-uy"], 38, 27, 15, 0],
			"1f1fa-1f1ff": [['\uD83C\uDDFA\uD83C\uDDFF'], "", "", ["flag-uz"], 38, 28, 15, 0],
			"1f1fb-1f1e6": [['\uD83C\uDDFB\uD83C\uDDE6'], "", "", ["flag-va"], 38, 29, 15, 0],
			"1f1fb-1f1e8": [['\uD83C\uDDFB\uD83C\uDDE8'], "", "", ["flag-vc"], 38, 30, 15, 0],
			"1f1fb-1f1ea": [['\uD83C\uDDFB\uD83C\uDDEA'], "", "", ["flag-ve"], 38, 31, 15, 0],
			"1f1fb-1f1ec": [['\uD83C\uDDFB\uD83C\uDDEC'], "", "", ["flag-vg"], 38, 32, 15, 0],
			"1f1fb-1f1ee": [['\uD83C\uDDFB\uD83C\uDDEE'], "", "", ["flag-vi"], 38, 33, 15, 0],
			"1f1fb-1f1f3": [['\uD83C\uDDFB\uD83C\uDDF3'], "", "", ["flag-vn"], 38, 34, 15, 0],
			"1f1fb-1f1fa": [['\uD83C\uDDFB\uD83C\uDDFA'], "", "", ["flag-vu"], 38, 35, 15, 0],
			"1f1fc-1f1eb": [['\uD83C\uDDFC\uD83C\uDDEB'], "", "", ["flag-wf"], 38, 36, 13, 0],
			"1f1fc-1f1f8": [['\uD83C\uDDFC\uD83C\uDDF8'], "", "", ["flag-ws"], 38, 37, 15, 0],
			"1f1fd-1f1f0": [['\uD83C\uDDFD\uD83C\uDDF0'], "", "", ["flag-xk"], 38, 38, 13, 0],
			"1f1fe-1f1ea": [['\uD83C\uDDFE\uD83C\uDDEA'], "", "", ["flag-ye"], 38, 39, 15, 0],
			"1f1fe-1f1f9": [['\uD83C\uDDFE\uD83C\uDDF9'], "", "", ["flag-yt"], 38, 40, 13, 0],
			"1f1ff-1f1e6": [['\uD83C\uDDFF\uD83C\uDDE6'], "", "", ["flag-za"], 39, 0, 15, 0],
			"1f1ff-1f1f2": [['\uD83C\uDDFF\uD83C\uDDF2'], "", "", ["flag-zm"], 39, 1, 15, 0],
			"1f1ff-1f1fc": [['\uD83C\uDDFF\uD83C\uDDFC'], "", "", ["flag-zw"], 39, 2, 15, 0],
			"1f468-200d-1f468-200d-1f466": [['\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC66'], "", "", ["man-man-boy"], 39, 3, 15, 0],
			"1f468-200d-1f468-200d-1f466-200d-1f466": [['\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC66\u200D\uD83D\uDC66'], "", "", ["man-man-boy-boy"], 39, 4, 15, 0],
			"1f468-200d-1f468-200d-1f467": [['\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC67'], "", "", ["man-man-girl"], 39, 5, 15, 0],
			"1f468-200d-1f468-200d-1f467-200d-1f466": [['\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC67\u200D\uD83D\uDC66'], "", "", ["man-man-girl-boy"], 39, 6, 15, 0],
			"1f468-200d-1f468-200d-1f467-200d-1f467": [['\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC67\u200D\uD83D\uDC67'], "", "", ["man-man-girl-girl"], 39, 7, 15, 0],
			"1f468-200d-1f469-200d-1f466-200d-1f466": [['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66'], "", "", ["man-woman-boy-boy"], 39, 8, 15, 0],
			"1f468-200d-1f469-200d-1f467": [['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67'], "", "", ["man-woman-girl"], 39, 9, 15, 0],
			"1f468-200d-1f469-200d-1f467-200d-1f466": [['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'], "", "", ["man-woman-girl-boy"], 39, 10, 15, 0],
			"1f468-200d-1f469-200d-1f467-200d-1f467": [['\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC67'], "", "", ["man-woman-girl-girl"], 39, 11, 15, 0],
			"1f468-200d-2764-fe0f-200d-1f468": [['\uD83D\uDC68\u200D\u2764\uFE0F\u200D\uD83D\uDC68'], "", "", ["man-heart-man"], 39, 12, 7, 0],
			"1f468-200d-2764-fe0f-200d-1f48b-200d-1f468": [['\uD83D\uDC68\u200D\u2764\uFE0F\u200D\uD83D\uDC8B\u200D\uD83D\uDC68'], "", "", ["man-kiss-man"], 39, 13, 7, 0],
			"1f469-200d-1f469-200d-1f466": [['\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC66'], "", "", ["woman-woman-boy"], 39, 14, 15, 0],
			"1f469-200d-1f469-200d-1f466-200d-1f466": [['\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66'], "", "", ["woman-woman-boy-boy"], 39, 15, 15, 0],
			"1f469-200d-1f469-200d-1f467": [['\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC67'], "", "", ["woman-woman-girl"], 39, 16, 15, 0],
			"1f469-200d-1f469-200d-1f467-200d-1f466": [['\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'], "", "", ["woman-woman-girl-boy"], 39, 17, 15, 0],
			"1f469-200d-1f469-200d-1f467-200d-1f467": [['\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC67'], "", "", ["woman-woman-girl-girl"], 39, 18, 15, 0],
			"1f469-200d-2764-fe0f-200d-1f469": [['\uD83D\uDC69\u200D\u2764\uFE0F\u200D\uD83D\uDC69'], "", "", ["woman-heart-woman"], 39, 19, 7, 0],
			"1f469-200d-2764-fe0f-200d-1f48b-200d-1f469": [['\uD83D\uDC69\u200D\u2764\uFE0F\u200D\uD83D\uDC8B\u200D\uD83D\uDC69'], "", "", ["woman-kiss-woman"], 39, 20, 7, 0]
		};
		/** @private */
		emoji.prototype.emoticons_data = {
			"<3": "heart",
			":o)": "monkey_face",
			":*": "kiss",
			":-*": "kiss",
			"<\/3": "broken_heart",
			"=)": "smiley",
			"=-)": "smiley",
			"C:": "smile",
			"c:": "smile",
			":D": "smile",
			":-D": "smile",
			":>": "laughing",
			":->": "laughing",
			";)": "wink",
			";-)": "wink",
			"8)": "sunglasses",
			":|": "neutral_face",
			":-|": "neutral_face",
			":\\": "confused",
			":-\\": "confused",
			":\/": "confused",
			":-\/": "confused",
			":p": "stuck_out_tongue",
			":-p": "stuck_out_tongue",
			":P": "stuck_out_tongue",
			":-P": "stuck_out_tongue",
			":b": "stuck_out_tongue",
			":-b": "stuck_out_tongue",
			";p": "stuck_out_tongue_winking_eye",
			";-p": "stuck_out_tongue_winking_eye",
			";b": "stuck_out_tongue_winking_eye",
			";-b": "stuck_out_tongue_winking_eye",
			";P": "stuck_out_tongue_winking_eye",
			";-P": "stuck_out_tongue_winking_eye",
			"):": "disappointed",
			":(": "disappointed",
			":-(": "disappointed",
			">:(": "angry",
			">:-(": "angry",
			":'(": "cry",
			"D:": "anguished",
			":o": "open_mouth",
			":-o": "open_mouth",
			":O": "open_mouth",
			":-O": "open_mouth",
			":)": "slightly_smiling_face",
			"(:": "slightly_smiling_face",
			":-)": "slightly_smiling_face"
		};
		/** @private */
		emoji.prototype.variations_data = {
			"261d-1f3fb": [1, 11, 15],
			"261d-1f3fc": [1, 12, 15],
			"261d-1f3fd": [1, 13, 15],
			"261d-1f3fe": [1, 14, 15],
			"261d-1f3ff": [1, 15, 15],
			"26f9-1f3fb": [2, 39, 15],
			"26f9-1f3fc": [2, 40, 15],
			"26f9-1f3fd": [3, 0, 15],
			"26f9-1f3fe": [3, 1, 15],
			"26f9-1f3ff": [3, 2, 15],
			"270a-1f3fb": [3, 10, 15],
			"270a-1f3fc": [3, 11, 15],
			"270a-1f3fd": [3, 12, 15],
			"270a-1f3fe": [3, 13, 15],
			"270a-1f3ff": [3, 14, 15],
			"270b-1f3fb": [3, 16, 15],
			"270b-1f3fc": [3, 17, 15],
			"270b-1f3fd": [3, 18, 15],
			"270b-1f3fe": [3, 19, 15],
			"270b-1f3ff": [3, 20, 15],
			"270c-1f3fb": [3, 22, 15],
			"270c-1f3fc": [3, 23, 15],
			"270c-1f3fd": [3, 24, 15],
			"270c-1f3fe": [3, 25, 15],
			"270c-1f3ff": [3, 26, 15],
			"270d-1f3fb": [3, 28, 15],
			"270d-1f3fc": [3, 29, 15],
			"270d-1f3fd": [3, 30, 15],
			"270d-1f3fe": [3, 31, 15],
			"270d-1f3ff": [3, 32, 15],
			"1f385-1f3fb": [8, 30, 15],
			"1f385-1f3fc": [8, 31, 15],
			"1f385-1f3fd": [8, 32, 15],
			"1f385-1f3fe": [8, 33, 15],
			"1f385-1f3ff": [8, 34, 15],
			"1f3c3-1f3fb": [10, 10, 15],
			"1f3c3-1f3fc": [10, 11, 15],
			"1f3c3-1f3fd": [10, 12, 15],
			"1f3c3-1f3fe": [10, 13, 15],
			"1f3c3-1f3ff": [10, 14, 15],
			"1f3c4-1f3fb": [10, 16, 15],
			"1f3c4-1f3fc": [10, 17, 15],
			"1f3c4-1f3fd": [10, 18, 15],
			"1f3c4-1f3fe": [10, 19, 15],
			"1f3c4-1f3ff": [10, 20, 15],
			"1f3ca-1f3fb": [10, 27, 15],
			"1f3ca-1f3fc": [10, 28, 15],
			"1f3ca-1f3fd": [10, 29, 15],
			"1f3ca-1f3fe": [10, 30, 15],
			"1f3ca-1f3ff": [10, 31, 15],
			"1f3cb-1f3fb": [10, 33, 15],
			"1f3cb-1f3fc": [10, 34, 15],
			"1f3cb-1f3fd": [10, 35, 15],
			"1f3cb-1f3fe": [10, 36, 15],
			"1f3cb-1f3ff": [10, 37, 15],
			"1f442-1f3fb": [13, 31, 15],
			"1f442-1f3fc": [13, 32, 15],
			"1f442-1f3fd": [13, 33, 15],
			"1f442-1f3fe": [13, 34, 15],
			"1f442-1f3ff": [13, 35, 15],
			"1f443-1f3fb": [13, 37, 15],
			"1f443-1f3fc": [13, 38, 15],
			"1f443-1f3fd": [13, 39, 15],
			"1f443-1f3fe": [13, 40, 15],
			"1f443-1f3ff": [14, 0, 15],
			"1f446-1f3fb": [14, 4, 15],
			"1f446-1f3fc": [14, 5, 15],
			"1f446-1f3fd": [14, 6, 15],
			"1f446-1f3fe": [14, 7, 15],
			"1f446-1f3ff": [14, 8, 15],
			"1f447-1f3fb": [14, 10, 15],
			"1f447-1f3fc": [14, 11, 15],
			"1f447-1f3fd": [14, 12, 15],
			"1f447-1f3fe": [14, 13, 15],
			"1f447-1f3ff": [14, 14, 15],
			"1f448-1f3fb": [14, 16, 15],
			"1f448-1f3fc": [14, 17, 15],
			"1f448-1f3fd": [14, 18, 15],
			"1f448-1f3fe": [14, 19, 15],
			"1f448-1f3ff": [14, 20, 15],
			"1f449-1f3fb": [14, 22, 15],
			"1f449-1f3fc": [14, 23, 15],
			"1f449-1f3fd": [14, 24, 15],
			"1f449-1f3fe": [14, 25, 15],
			"1f449-1f3ff": [14, 26, 15],
			"1f44a-1f3fb": [14, 28, 15],
			"1f44a-1f3fc": [14, 29, 15],
			"1f44a-1f3fd": [14, 30, 15],
			"1f44a-1f3fe": [14, 31, 15],
			"1f44a-1f3ff": [14, 32, 15],
			"1f44b-1f3fb": [14, 34, 15],
			"1f44b-1f3fc": [14, 35, 15],
			"1f44b-1f3fd": [14, 36, 15],
			"1f44b-1f3fe": [14, 37, 15],
			"1f44b-1f3ff": [14, 38, 15],
			"1f44c-1f3fb": [14, 40, 15],
			"1f44c-1f3fc": [15, 0, 15],
			"1f44c-1f3fd": [15, 1, 15],
			"1f44c-1f3fe": [15, 2, 15],
			"1f44c-1f3ff": [15, 3, 15],
			"1f44d-1f3fb": [15, 5, 15],
			"1f44d-1f3fc": [15, 6, 15],
			"1f44d-1f3fd": [15, 7, 15],
			"1f44d-1f3fe": [15, 8, 15],
			"1f44d-1f3ff": [15, 9, 15],
			"1f44e-1f3fb": [15, 11, 15],
			"1f44e-1f3fc": [15, 12, 15],
			"1f44e-1f3fd": [15, 13, 15],
			"1f44e-1f3fe": [15, 14, 15],
			"1f44e-1f3ff": [15, 15, 15],
			"1f44f-1f3fb": [15, 17, 15],
			"1f44f-1f3fc": [15, 18, 15],
			"1f44f-1f3fd": [15, 19, 15],
			"1f44f-1f3fe": [15, 20, 15],
			"1f44f-1f3ff": [15, 21, 15],
			"1f450-1f3fb": [15, 23, 15],
			"1f450-1f3fc": [15, 24, 15],
			"1f450-1f3fd": [15, 25, 15],
			"1f450-1f3fe": [15, 26, 15],
			"1f450-1f3ff": [15, 27, 15],
			"1f466-1f3fb": [16, 9, 15],
			"1f466-1f3fc": [16, 10, 15],
			"1f466-1f3fd": [16, 11, 15],
			"1f466-1f3fe": [16, 12, 15],
			"1f466-1f3ff": [16, 13, 15],
			"1f467-1f3fb": [16, 15, 15],
			"1f467-1f3fc": [16, 16, 15],
			"1f467-1f3fd": [16, 17, 15],
			"1f467-1f3fe": [16, 18, 15],
			"1f467-1f3ff": [16, 19, 15],
			"1f468-1f3fb": [16, 21, 15],
			"1f468-1f3fc": [16, 22, 15],
			"1f468-1f3fd": [16, 23, 15],
			"1f468-1f3fe": [16, 24, 15],
			"1f468-1f3ff": [16, 25, 15],
			"1f469-1f3fb": [16, 27, 15],
			"1f469-1f3fc": [16, 28, 15],
			"1f469-1f3fd": [16, 29, 15],
			"1f469-1f3fe": [16, 30, 15],
			"1f469-1f3ff": [16, 31, 15],
			"1f46e-1f3fb": [16, 37, 15],
			"1f46e-1f3fc": [16, 38, 15],
			"1f46e-1f3fd": [16, 39, 15],
			"1f46e-1f3fe": [16, 40, 15],
			"1f46e-1f3ff": [17, 0, 15],
			"1f470-1f3fb": [17, 3, 15],
			"1f470-1f3fc": [17, 4, 15],
			"1f470-1f3fd": [17, 5, 15],
			"1f470-1f3fe": [17, 6, 15],
			"1f470-1f3ff": [17, 7, 15],
			"1f471-1f3fb": [17, 9, 15],
			"1f471-1f3fc": [17, 10, 15],
			"1f471-1f3fd": [17, 11, 15],
			"1f471-1f3fe": [17, 12, 15],
			"1f471-1f3ff": [17, 13, 15],
			"1f472-1f3fb": [17, 15, 15],
			"1f472-1f3fc": [17, 16, 15],
			"1f472-1f3fd": [17, 17, 15],
			"1f472-1f3fe": [17, 18, 15],
			"1f472-1f3ff": [17, 19, 15],
			"1f473-1f3fb": [17, 21, 15],
			"1f473-1f3fc": [17, 22, 15],
			"1f473-1f3fd": [17, 23, 15],
			"1f473-1f3fe": [17, 24, 15],
			"1f473-1f3ff": [17, 25, 15],
			"1f474-1f3fb": [17, 27, 15],
			"1f474-1f3fc": [17, 28, 15],
			"1f474-1f3fd": [17, 29, 15],
			"1f474-1f3fe": [17, 30, 15],
			"1f474-1f3ff": [17, 31, 15],
			"1f475-1f3fb": [17, 33, 15],
			"1f475-1f3fc": [17, 34, 15],
			"1f475-1f3fd": [17, 35, 15],
			"1f475-1f3fe": [17, 36, 15],
			"1f475-1f3ff": [17, 37, 15],
			"1f476-1f3fb": [17, 39, 15],
			"1f476-1f3fc": [17, 40, 15],
			"1f476-1f3fd": [18, 0, 15],
			"1f476-1f3fe": [18, 1, 15],
			"1f476-1f3ff": [18, 2, 15],
			"1f477-1f3fb": [18, 4, 15],
			"1f477-1f3fc": [18, 5, 15],
			"1f477-1f3fd": [18, 6, 15],
			"1f477-1f3fe": [18, 7, 15],
			"1f477-1f3ff": [18, 8, 15],
			"1f478-1f3fb": [18, 10, 15],
			"1f478-1f3fc": [18, 11, 15],
			"1f478-1f3fd": [18, 12, 15],
			"1f478-1f3fe": [18, 13, 15],
			"1f478-1f3ff": [18, 14, 15],
			"1f47c-1f3fb": [18, 19, 15],
			"1f47c-1f3fc": [18, 20, 15],
			"1f47c-1f3fd": [18, 21, 15],
			"1f47c-1f3fe": [18, 22, 15],
			"1f47c-1f3ff": [18, 23, 15],
			"1f481-1f3fb": [18, 29, 15],
			"1f481-1f3fc": [18, 30, 15],
			"1f481-1f3fd": [18, 31, 15],
			"1f481-1f3fe": [18, 32, 15],
			"1f481-1f3ff": [18, 33, 15],
			"1f482-1f3fb": [18, 35, 15],
			"1f482-1f3fc": [18, 36, 15],
			"1f482-1f3fd": [18, 37, 15],
			"1f482-1f3fe": [18, 38, 15],
			"1f482-1f3ff": [18, 39, 15],
			"1f483-1f3fb": [19, 0, 15],
			"1f483-1f3fc": [19, 1, 15],
			"1f483-1f3fd": [19, 2, 15],
			"1f483-1f3fe": [19, 3, 15],
			"1f483-1f3ff": [19, 4, 15],
			"1f485-1f3fb": [19, 7, 15],
			"1f485-1f3fc": [19, 8, 15],
			"1f485-1f3fd": [19, 9, 15],
			"1f485-1f3fe": [19, 10, 15],
			"1f485-1f3ff": [19, 11, 15],
			"1f486-1f3fb": [19, 13, 15],
			"1f486-1f3fc": [19, 14, 15],
			"1f486-1f3fd": [19, 15, 15],
			"1f486-1f3fe": [19, 16, 15],
			"1f486-1f3ff": [19, 17, 15],
			"1f487-1f3fb": [19, 19, 15],
			"1f487-1f3fc": [19, 20, 15],
			"1f487-1f3fd": [19, 21, 15],
			"1f487-1f3fe": [19, 22, 15],
			"1f487-1f3ff": [19, 23, 15],
			"1f4aa-1f3fb": [20, 18, 15],
			"1f4aa-1f3fc": [20, 19, 15],
			"1f4aa-1f3fd": [20, 20, 15],
			"1f4aa-1f3fe": [20, 21, 15],
			"1f4aa-1f3ff": [20, 22, 15],
			"1f575-1f3fb": [24, 40, 11],
			"1f575-1f3fc": [25, 0, 11],
			"1f575-1f3fd": [25, 1, 11],
			"1f575-1f3fe": [25, 2, 11],
			"1f575-1f3ff": [25, 3, 11],
			"1f590-1f3fb": [25, 14, 15],
			"1f590-1f3fc": [25, 15, 15],
			"1f590-1f3fd": [25, 16, 15],
			"1f590-1f3fe": [25, 17, 15],
			"1f590-1f3ff": [25, 18, 15],
			"1f595-1f3fb": [25, 20, 15],
			"1f595-1f3fc": [25, 21, 15],
			"1f595-1f3fd": [25, 22, 15],
			"1f595-1f3fe": [25, 23, 15],
			"1f595-1f3ff": [25, 24, 15],
			"1f596-1f3fb": [25, 26, 15],
			"1f596-1f3fc": [25, 27, 15],
			"1f596-1f3fd": [25, 28, 15],
			"1f596-1f3fe": [25, 29, 15],
			"1f596-1f3ff": [25, 30, 15],
			"1f645-1f3fb": [28, 3, 15],
			"1f645-1f3fc": [28, 4, 15],
			"1f645-1f3fd": [28, 5, 15],
			"1f645-1f3fe": [28, 6, 15],
			"1f645-1f3ff": [28, 7, 15],
			"1f646-1f3fb": [28, 9, 15],
			"1f646-1f3fc": [28, 10, 15],
			"1f646-1f3fd": [28, 11, 15],
			"1f646-1f3fe": [28, 12, 15],
			"1f646-1f3ff": [28, 13, 15],
			"1f647-1f3fb": [28, 15, 15],
			"1f647-1f3fc": [28, 16, 15],
			"1f647-1f3fd": [28, 17, 15],
			"1f647-1f3fe": [28, 18, 15],
			"1f647-1f3ff": [28, 19, 15],
			"1f64b-1f3fb": [28, 24, 15],
			"1f64b-1f3fc": [28, 25, 15],
			"1f64b-1f3fd": [28, 26, 15],
			"1f64b-1f3fe": [28, 27, 15],
			"1f64b-1f3ff": [28, 28, 15],
			"1f64c-1f3fb": [28, 30, 15],
			"1f64c-1f3fc": [28, 31, 15],
			"1f64c-1f3fd": [28, 32, 15],
			"1f64c-1f3fe": [28, 33, 15],
			"1f64c-1f3ff": [28, 34, 15],
			"1f64d-1f3fb": [28, 36, 15],
			"1f64d-1f3fc": [28, 37, 15],
			"1f64d-1f3fd": [28, 38, 15],
			"1f64d-1f3fe": [28, 39, 15],
			"1f64d-1f3ff": [28, 40, 15],
			"1f64e-1f3fb": [29, 1, 15],
			"1f64e-1f3fc": [29, 2, 15],
			"1f64e-1f3fd": [29, 3, 15],
			"1f64e-1f3fe": [29, 4, 15],
			"1f64e-1f3ff": [29, 5, 15],
			"1f64f-1f3fb": [29, 7, 15],
			"1f64f-1f3fc": [29, 8, 15],
			"1f64f-1f3fd": [29, 9, 15],
			"1f64f-1f3fe": [29, 10, 15],
			"1f64f-1f3ff": [29, 11, 15],
			"1f6a3-1f3fb": [30, 7, 15],
			"1f6a3-1f3fc": [30, 8, 15],
			"1f6a3-1f3fd": [30, 9, 15],
			"1f6a3-1f3fe": [30, 10, 15],
			"1f6a3-1f3ff": [30, 11, 15],
			"1f6b4-1f3fb": [30, 29, 15],
			"1f6b4-1f3fc": [30, 30, 15],
			"1f6b4-1f3fd": [30, 31, 15],
			"1f6b4-1f3fe": [30, 32, 15],
			"1f6b4-1f3ff": [30, 33, 15],
			"1f6b5-1f3fb": [30, 35, 15],
			"1f6b5-1f3fc": [30, 36, 15],
			"1f6b5-1f3fd": [30, 37, 15],
			"1f6b5-1f3fe": [30, 38, 15],
			"1f6b5-1f3ff": [30, 39, 15],
			"1f6b6-1f3fb": [31, 0, 15],
			"1f6b6-1f3fc": [31, 1, 15],
			"1f6b6-1f3fd": [31, 2, 15],
			"1f6b6-1f3fe": [31, 3, 15],
			"1f6b6-1f3ff": [31, 4, 15],
			"1f6c0-1f3fb": [31, 15, 15],
			"1f6c0-1f3fc": [31, 16, 15],
			"1f6c0-1f3fd": [31, 17, 15],
			"1f6c0-1f3fe": [31, 18, 15],
			"1f6c0-1f3ff": [31, 19, 15],
			"1f918-1f3fb": [32, 10, 15],
			"1f918-1f3fc": [32, 11, 15],
			"1f918-1f3fd": [32, 12, 15],
			"1f918-1f3fe": [32, 13, 15],
			"1f918-1f3ff": [32, 14, 15]
		};

		// export
		if (true) {
			if (typeof module !== 'undefined' && module.exports) {
				exports = module.exports = emoji;
			}
			exports.EmojiConvertor = emoji;
		} else if (typeof define === 'function' && define.amd) {
			define(function () {
				return emoji;
			});
		} else {
			root.EmojiConvertor = emoji;
		}
	}).call(function () {
		return this || (typeof window !== 'undefined' ? window : global);
	}());
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 6 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.default = {
	    //Sets of categories and icons. The category names are not arbitrary, they map
	    //to the names of categories in data.js
	    categories: [{
	        title: "People",
	        icon: '<i class="fa fa-smile-o" aria-hidden="true"></i>'
	    }, {
	        title: "Nature",
	        icon: '<i class="fa fa-leaf" aria-hidden="true"></i>'
	    }, {
	        title: "Foods",
	        icon: '<i class="fa fa-cutlery" aria-hidden="true"></i>'
	    }, {
	        title: "Activity",
	        icon: '<i class="fa fa-futbol-o" aria-hidden="true"></i>'
	    }, {
	        title: "Places",
	        icon: '<i class="fa fa-globe" aria-hidden="true"></i>'
	    }, {
	        title: "Symbols",
	        icon: '<i class="fa fa-lightbulb-o" aria-hidden="true"></i>'
	    }, {
	        title: "Flags",
	        icon: '<i class="fa fa-flag-checkered" aria-hidden="true"></i>'
	    }],

	    //By default we show an magnifying glass icon in the search container,
	    //but if you're not using fontawesome you may want to include your own icon.
	    search_icon: '<i class="fa fa-search" aria-hidden="true"></i>',

	    //Show the colon syntax in the preview or don't. It may not make sense if you're
	    //using a contenteditable element to confuse users with unfamiliar colon syntax
	    show_colon_preview: true,

	    //If you want your contenteditable to be a single-line input, set this to true
	    prevent_new_line: false,

	    //The text that will be displayed when no emoji is being hovered over.
	    default_footer_message: "Please select an emoji from the list above",

	    //Can be "autoplace", "vertical", "horizontal", or a function that takes a tooltip as an argument.
	    //The tooltip is an instance of the class in this repo here: https://github.com/RobertMenke/Tooltip-js
	    positioning: "autoplace",

	    //Callback that occurs when an emoji gets selected. You get back Emoji, EmojiCategory, Node
	    callback: undefined,

	    //When the user hovers over the top row of icons, do you want them to be shown
	    //a tooltip indicating which category the icon represents?
	    show_icon_tooltips: true,

	    //Use sprite sheets to display image emojis rather than links to png files (faster).
	    //If you want links to the png files see this repo here for examples (library I'm using):
	    //https://github.com/iamcal/emoji-data
	    use_sheets: true,

	    //Events that bubble up from Emoji to EmojiPicker - DO NOT MUTATE
	    //Normally I'd use pubsub here, but didn't feel like writing my own implementation
	    //or bringing in another dependency for this simple use case.
	    events: {
	        SELECTED: "SELECTED",
	        EMOJI_MOUSEENTER: "MOUSEENTER",
	        EMOJI_MOUSELEAVE: "MOUSELEAVE"
	    },

	    //Paths to the sprite sheets (see the sheets folder in this repo. You'll likely
	    //need to override this setting.
	    sheets: {
	        apple: './sheets/sheet_apple_64_indexed_128.png',
	        google: './sheets/sheet_google_64_indexed_128.png',
	        twitter: './sheets/sheet_twitter_64_indexed_128.png',
	        emojione: './sheets/sheet_emojione_64_indexed_128.png'
	    }
	};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Emoji = __webpack_require__(8);

	var _Emoji2 = _interopRequireDefault(_Emoji);

	var _category = __webpack_require__(10);

	var _category2 = _interopRequireDefault(_category);

	var _jquery = __webpack_require__(1);

	var _jquery2 = _interopRequireDefault(_jquery);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var EmojiCategory = function () {
	    _createClass(EmojiCategory, null, [{
	        key: "factory",


	        /**
	         * Factory function that initializes the class with a callback
	         *
	         * @param {Object} cat
	         * @param {Object} data
	         * @param {Function} callback
	         * @returns {EmojiCategory}
	         */
	        value: function factory(cat, data, callback) {
	            var category = new EmojiCategory(cat, data);
	            category.setCallback(callback);
	            return category;
	        }
	    }]);

	    function EmojiCategory(category, data) {
	        var _this = this;

	        _classCallCheck(this, EmojiCategory);

	        /**
	         * @type {string}
	         */
	        this.title = category.title;

	        /**
	         *
	         * @type {string}
	         */
	        this.icon = category.icon;

	        /**
	         * @type {Array<Emoji>}
	         */
	        this.emojis = data.map(function (emote) {
	            return _Emoji2.default.factory(emote, _this.title, _this._onEvent.bind(_this));
	        }).sort(function (a, b) {
	            return a.sort_order - b.sort_order;
	        });

	        /**
	         * Markup for the
	         */
	        this.$category = this.getMarkup();

	        /**
	         * @type {jQuery}
	         */
	        this.$title = this.$category.find('.category-title');

	        /**
	         * Callback that executes when an emoji gets selected
	         *
	         * @type {Function|undefined}
	         * @private
	         */
	        this._callback = undefined;

	        var _search_term = "";
	        Object.defineProperty(this, 'search_term', {
	            get: function get() {
	                return _search_term;
	            },
	            set: function set(value) {
	                if (_search_term !== value) {
	                    _search_term = value;
	                    _this._search();
	                }
	            }
	        });
	    }

	    _createClass(EmojiCategory, [{
	        key: "exportContents",


	        /**
	         * Exports the main contents for the category
	         *
	         * @returns {{title: string, icon: string}}
	         */
	        value: function exportContents() {
	            return {
	                title: this.title,
	                icon: this.icon
	            };
	        }
	    }, {
	        key: "getMarkup",
	        value: function getMarkup() {
	            if (this.$category) {
	                return this.$category;
	            }

	            var $category = (0, _jquery2.default)((0, _category2.default)({
	                title: this.title
	            }));

	            var $content = $category.find('.category-content');

	            this.emojis.forEach(function (emoji) {
	                $content.append(emoji.getMarkup());
	            });

	            return $category;
	        }

	        /**
	         * Carries an event from the Emoji to the EmojiPicker instance.
	         *
	         * @param action
	         * @param emoji
	         * @private
	         */

	    }, {
	        key: "_onEvent",
	        value: function _onEvent(action, emoji) {
	            if (this._callback) {
	                this._callback(action, emoji, this);
	            }
	        }

	        /**
	         *
	         * @param {Function} callback
	         * @returns {EmojiCategory}
	         */

	    }, {
	        key: "setCallback",
	        value: function setCallback(callback) {
	            this._callback = callback;
	            return this;
	        }

	        /**
	         * Show/hide emojis based on a search term
	         * @private
	         */

	    }, {
	        key: "_search",
	        value: function _search() {
	            if (this.search_term.trim().length === 0) {
	                this._clearSearch();
	            } else {
	                this.$title.addClass('inactive');

	                var regexp = new RegExp(this.search_term.toLowerCase());

	                this.emojis.forEach(function (emoji) {
	                    if (emoji.matchesSearchTerm(regexp)) {
	                        emoji.$emoji.show();
	                    } else {
	                        emoji.$emoji.hide();
	                    }
	                });
	            }
	        }

	        /**
	         * Clear the effects of the search
	         *
	         * @returns {EmojiCategory}
	         * @private
	         */

	    }, {
	        key: "_clearSearch",
	        value: function _clearSearch() {
	            this.$title.removeClass('inactive');
	            this.emojis.forEach(function (emoji) {
	                return emoji.$emoji.show();
	            });

	            return this;
	        }
	    }, {
	        key: "offset_top",
	        get: function get() {
	            return this.$category.get(0).offsetTop;
	        }
	    }]);

	    return EmojiCategory;
	}();

	exports.default = EmojiCategory;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Converters = __webpack_require__(4);

	var _Converters2 = _interopRequireDefault(_Converters);

	var _jquery = __webpack_require__(1);

	var _jquery2 = _interopRequireDefault(_jquery);

	var _defaults = __webpack_require__(6);

	var _defaults2 = _interopRequireDefault(_defaults);

	__webpack_require__(9);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Emoji = function () {
	  _createClass(Emoji, null, [{
	    key: "factory",
	    value: function factory(data, category, callback) {
	      var emoji = new Emoji(data, category);
	      emoji.setCallback(callback);
	      return emoji;
	    }
	  }, {
	    key: "randomIntFromInterval",


	    /**
	     * @link http://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
	     * @param min
	     * @param max
	     * @returns {number}
	     */
	    value: function randomIntFromInterval(min, max) {
	      return Math.floor(Math.random() * (max - min + 1) + min);
	    }
	  }, {
	    key: "random_color",
	    get: function get() {
	      var colors = ["blue", "yellow", "green", "orange", "indigo", "pink"];
	      return colors[Emoji.randomIntFromInterval(0, colors.length - 1)];
	    }
	  }]);

	  function Emoji(data, category) {
	    _classCallCheck(this, Emoji);

	    /**
	     * @type {Boolean}
	     */
	    this.has_apple_img = data['has_img_apple'];

	    /**
	     * @type {Boolean}
	     */
	    this.has_google_img = data['has_img_google'];

	    /**
	     * @type {Boolean}
	     */
	    this.has_twitter_img = data['has_img_twitter'];

	    /**
	     * @type {Boolean}
	     */
	    this.has_emojione_img = data['has_img_emojione'];

	    /**
	     * @type {String} - the name of the category
	     */
	    this.category = category;

	    /**
	     * @type {String}
	     */
	    this.full_name = data['name'];

	    /**
	     * @type {String}
	     */
	    this.short_name = data['short_name'];

	    /**
	     * @type {String[]}
	     */
	    this.short_names = data['short_names'];

	    /**
	     * @type {Number}
	     */
	    this.sort_order = data['sort_order'];

	    /**
	     * @type {String}
	     */
	    this.hover_color = Emoji.random_color;

	    /**
	     * Gets the emoji for the
	     * @type {string}
	     */
	    this.$emoji = this.getEmojiForPlatform();

	    /**
	     * Callback executed when the emoji was clicked
	     *
	     * @type {Function|undefined}
	     * @private
	     */
	    this._bubble = undefined;
	    //Set a click listener on the emoji
	    this._onClick()._onHover();
	  }

	  /**
	   * Getter for the emoji's colon syntax
	   *
	   * @returns {string}
	   */


	  _createClass(Emoji, [{
	    key: "getColons",
	    value: function getColons() {
	      return ":" + this.short_name + ":";
	    }

	    /**
	     * Getter for the unicode emoji
	     *
	     * @returns {string}
	     */

	  }, {
	    key: "getUnified",
	    value: function getUnified() {
	      return _Converters2.default.withUnified().replace_colons(this.getColons());
	    }

	    /**
	     * Gets the image representation of an emoji
	     *
	     * @returns {string}
	     */

	  }, {
	    key: "getImage",
	    value: function getImage() {
	      return _Converters2.default.withImage().replace_colons(this.getColons());
	    }

	    /**
	     * @return {String} Codepoints for the emoji
	     */

	  }, {
	    key: "getCodepoints",
	    value: function getCodepoints() {
	      var $image = (0, _jquery2.default)(this.getImage());
	      if ($image.hasClass('emoji-inner')) {
	        return $image.data('codepoints');
	      }

	      return $image.find('.emoji-inner').data('codepoints');
	    }

	    /**
	     * Getter for the emoji character regardless of the platform.
	     *
	     * @returns {string}
	     */

	  }, {
	    key: "getCharacter",
	    value: function getCharacter() {
	      var codepoints = this.getCodepoints();
	      if (/-/g.test(codepoints)) {
	        var arr = codepoints.split("-");
	        var one = "0x" + arr[0];
	        var two = "0x" + arr[1];
	        return String.fromCodePoint(one, two);
	      }
	      return String.fromCodePoint("0x" + codepoints);
	    }

	    /**
	     * Determines if the environment supports unified unicode.
	     *
	     * @returns {boolean}
	     */

	  }, {
	    key: "getEmojiForPlatform",


	    /**
	     * Gets the platform-appropriate representation of the emoji.
	     *
	     * @return {string|jQuery}
	     */
	    value: function getEmojiForPlatform() {

	      var emote = _Converters2.default.withEnvironment().replace_colons(this.getColons());

	      return this._getWrapper().append(emote);
	    }

	    /**
	     *
	     * @returns {*}
	     */

	  }, {
	    key: "getPreview",
	    value: function getPreview() {
	      var emote = _Converters2.default.withEnvironment().replace_colons(this.getColons());

	      return this._getPreviewWrapper().append(emote);
	    }

	    /**
	     * Getter for the class' markup
	     *
	     * @returns {string}
	     */

	  }, {
	    key: "getMarkup",
	    value: function getMarkup() {
	      return this.$emoji;
	    }

	    /**
	     * Gets the html of an emoji for things like pasting
	     * raw html into the contenteditable.
	     *
	     * @return {String}
	     */

	  }, {
	    key: "getHtml",
	    value: function getHtml() {
	      return this.$emoji.get(0).innerHTML;
	    }

	    /**
	     * Sets the callback that gets executed when the emoji gets clicked
	     *
	     * @param {Function} callback
	     * @returns {Emoji}
	     */

	  }, {
	    key: "setCallback",
	    value: function setCallback(callback) {
	      this._bubble = callback;
	      return this;
	    }

	    /**
	     *
	     * @param regexp
	     * @returns {undefined|String}
	     */

	  }, {
	    key: "matchesSearchTerm",
	    value: function matchesSearchTerm(regexp) {
	      return this.short_names.find(function (name) {
	        return regexp.test(name);
	      });
	    }

	    /**
	     * Gets the wrapper for the emoji
	     *
	     * @returns {jQuery|HTMLElement}
	     * @private
	     */

	  }, {
	    key: "_getWrapper",
	    value: function _getWrapper() {
	      return (0, _jquery2.default)("<span class = \"emoji-char-wrapper " + this.hover_color + "\" data-name=\"" + this.full_name + "\" data-category=\"" + this.category + "\"></span>");
	    }

	    /**
	     * Gets the wrapper for the preview
	     *
	     * @returns {jQuery|HTMLElement}
	     * @private
	     */

	  }, {
	    key: "_getPreviewWrapper",
	    value: function _getPreviewWrapper() {
	      return (0, _jquery2.default)("<span class = \"emoji-preview-wrapper " + this.hover_color + "\" data-name=\"" + this.full_name + "\" data-category=\"" + this.category + "\"></span>");
	    }

	    /**
	     *
	     * @returns {Emoji}
	     * @private
	     */

	  }, {
	    key: "_onClick",
	    value: function _onClick() {
	      var _this = this;

	      (0, _jquery2.default)(this.$emoji).off('click.emoji').on('click.emoji', function (event) {
	        if (_this._bubble) {
	          _this._bubble(_defaults2.default.events.SELECTED, _this);
	        }
	      });

	      return this;
	    }

	    /**
	     *
	     * @returns {Emoji}
	     * @private
	     */

	  }, {
	    key: "_onHover",
	    value: function _onHover() {
	      var _this2 = this;

	      (0, _jquery2.default)(this.$emoji).off('mouseenter.emoji').on('mouseenter.emoji', function () {
	        _this2._bubble(_defaults2.default.events.EMOJI_MOUSEENTER, _this2);
	      }).off('mouseleave.emoji').on('mouseleave.emoji', function () {
	        _this2._bubble(_defaults2.default.events.EMOJI_MOUSELEAVE, _this2);
	      });

	      return this;
	    }
	  }], [{
	    key: "supportsUnified",
	    value: function supportsUnified() {
	      return _Converters2.default.withEnvironment().replace_mode === "unified";
	    }
	  }]);

	  return Emoji;
	}();

	exports.default = Emoji;

/***/ }),
/* 9 */
/***/ (function(module, exports) {

	'use strict';

	if (typeof Object.assign != 'function') {
	  Object.assign = function (target, varArgs) {
	    // .length of function is 2
	    'use strict';

	    if (target == null) {
	      // TypeError if undefined or null
	      throw new TypeError('Cannot convert undefined or null to object');
	    }

	    var to = Object(target);

	    for (var index = 1; index < arguments.length; index++) {
	      var nextSource = arguments[index];

	      if (nextSource != null) {
	        // Skip over if undefined or null
	        for (var nextKey in nextSource) {
	          // Avoid bugs when hasOwnProperty is shadowed
	          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
	            to[nextKey] = nextSource[nextKey];
	          }
	        }
	      }
	    }
	    return to;
	  };
	}

	// https://tc39.github.io/ecma262/#sec-array.prototype.find
	if (!Array.prototype.find) {
	  Object.defineProperty(Array.prototype, 'find', {
	    value: function value(predicate) {
	      // 1. Let O be ? ToObject(this value).
	      if (this == null) {
	        throw new TypeError('"this" is null or not defined');
	      }

	      var o = Object(this);

	      // 2. Let len be ? ToLength(? Get(O, "length")).
	      var len = o.length >>> 0;

	      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
	      if (typeof predicate !== 'function') {
	        throw new TypeError('predicate must be a function');
	      }

	      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
	      var thisArg = arguments[1];

	      // 5. Let k be 0.
	      var k = 0;

	      // 6. Repeat, while k < len
	      while (k < len) {
	        // a. Let Pk be ! ToString(k).
	        // b. Let kValue be ? Get(O, Pk).
	        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
	        // d. If testResult is true, return kValue.
	        var kValue = o[k];
	        if (predicate.call(thisArg, kValue, k, o)) {
	          return kValue;
	        }
	        // e. Increase k by 1.
	        k++;
	      }

	      // 7. Return undefined.
	      return undefined;
	    }
	  });
	}

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	var H = __webpack_require__(11);
	module.exports = function() { var T = new H.Template({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div class=\"category-wrapper\"><div class=\"category-title\"><span>");t.b(t.v(t.f("title",c,p,0)));t.b("</span></div><div class=\"category-content\"></div></div>");return t.fl(); },partials: {}, subs: {  }}, "<div class=\"category-wrapper\"><div class=\"category-title\"><span>{{title}}</span></div><div class=\"category-content\"></div></div>", H);return T.render.apply(T, arguments); };

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/*
	 *  Copyright 2011 Twitter, Inc.
	 *  Licensed under the Apache License, Version 2.0 (the "License");
	 *  you may not use this file except in compliance with the License.
	 *  You may obtain a copy of the License at
	 *
	 *  http://www.apache.org/licenses/LICENSE-2.0
	 *
	 *  Unless required by applicable law or agreed to in writing, software
	 *  distributed under the License is distributed on an "AS IS" BASIS,
	 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 *  See the License for the specific language governing permissions and
	 *  limitations under the License.
	 */

	// This file is for use with Node.js. See dist/ for browser files.

	var Hogan = __webpack_require__(12);
	Hogan.Template = __webpack_require__(13).Template;
	Hogan.template = Hogan.Template;
	module.exports = Hogan;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/*
	 *  Copyright 2011 Twitter, Inc.
	 *  Licensed under the Apache License, Version 2.0 (the "License");
	 *  you may not use this file except in compliance with the License.
	 *  You may obtain a copy of the License at
	 *
	 *  http://www.apache.org/licenses/LICENSE-2.0
	 *
	 *  Unless required by applicable law or agreed to in writing, software
	 *  distributed under the License is distributed on an "AS IS" BASIS,
	 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 *  See the License for the specific language governing permissions and
	 *  limitations under the License.
	 */

	(function (Hogan) {
	  // Setup regex  assignments
	  // remove whitespace according to Mustache spec
	  var rIsWhitespace = /\S/,
	      rQuot = /\"/g,
	      rNewline = /\n/g,
	      rCr = /\r/g,
	      rSlash = /\\/g,
	      rLineSep = /\u2028/,
	      rParagraphSep = /\u2029/;

	  Hogan.tags = {
	    '#': 1, '^': 2, '<': 3, '$': 4,
	    '/': 5, '!': 6, '>': 7, '=': 8, '_v': 9,
	    '{': 10, '&': 11, '_t': 12
	  };

	  Hogan.scan = function scan(text, delimiters) {
	    var len = text.length,
	        IN_TEXT = 0,
	        IN_TAG_TYPE = 1,
	        IN_TAG = 2,
	        state = IN_TEXT,
	        tagType = null,
	        tag = null,
	        buf = '',
	        tokens = [],
	        seenTag = false,
	        i = 0,
	        lineStart = 0,
	        otag = '{{',
	        ctag = '}}';

	    function addBuf() {
	      if (buf.length > 0) {
	        tokens.push({ tag: '_t', text: new String(buf) });
	        buf = '';
	      }
	    }

	    function lineIsWhitespace() {
	      var isAllWhitespace = true;
	      for (var j = lineStart; j < tokens.length; j++) {
	        isAllWhitespace = Hogan.tags[tokens[j].tag] < Hogan.tags['_v'] || tokens[j].tag == '_t' && tokens[j].text.match(rIsWhitespace) === null;
	        if (!isAllWhitespace) {
	          return false;
	        }
	      }

	      return isAllWhitespace;
	    }

	    function filterLine(haveSeenTag, noNewLine) {
	      addBuf();

	      if (haveSeenTag && lineIsWhitespace()) {
	        for (var j = lineStart, next; j < tokens.length; j++) {
	          if (tokens[j].text) {
	            if ((next = tokens[j + 1]) && next.tag == '>') {
	              // set indent to token value
	              next.indent = tokens[j].text.toString();
	            }
	            tokens.splice(j, 1);
	          }
	        }
	      } else if (!noNewLine) {
	        tokens.push({ tag: '\n' });
	      }

	      seenTag = false;
	      lineStart = tokens.length;
	    }

	    function changeDelimiters(text, index) {
	      var close = '=' + ctag,
	          closeIndex = text.indexOf(close, index),
	          delimiters = trim(text.substring(text.indexOf('=', index) + 1, closeIndex)).split(' ');

	      otag = delimiters[0];
	      ctag = delimiters[delimiters.length - 1];

	      return closeIndex + close.length - 1;
	    }

	    if (delimiters) {
	      delimiters = delimiters.split(' ');
	      otag = delimiters[0];
	      ctag = delimiters[1];
	    }

	    for (i = 0; i < len; i++) {
	      if (state == IN_TEXT) {
	        if (tagChange(otag, text, i)) {
	          --i;
	          addBuf();
	          state = IN_TAG_TYPE;
	        } else {
	          if (text.charAt(i) == '\n') {
	            filterLine(seenTag);
	          } else {
	            buf += text.charAt(i);
	          }
	        }
	      } else if (state == IN_TAG_TYPE) {
	        i += otag.length - 1;
	        tag = Hogan.tags[text.charAt(i + 1)];
	        tagType = tag ? text.charAt(i + 1) : '_v';
	        if (tagType == '=') {
	          i = changeDelimiters(text, i);
	          state = IN_TEXT;
	        } else {
	          if (tag) {
	            i++;
	          }
	          state = IN_TAG;
	        }
	        seenTag = i;
	      } else {
	        if (tagChange(ctag, text, i)) {
	          tokens.push({ tag: tagType, n: trim(buf), otag: otag, ctag: ctag,
	            i: tagType == '/' ? seenTag - otag.length : i + ctag.length });
	          buf = '';
	          i += ctag.length - 1;
	          state = IN_TEXT;
	          if (tagType == '{') {
	            if (ctag == '}}') {
	              i++;
	            } else {
	              cleanTripleStache(tokens[tokens.length - 1]);
	            }
	          }
	        } else {
	          buf += text.charAt(i);
	        }
	      }
	    }

	    filterLine(seenTag, true);

	    return tokens;
	  };

	  function cleanTripleStache(token) {
	    if (token.n.substr(token.n.length - 1) === '}') {
	      token.n = token.n.substring(0, token.n.length - 1);
	    }
	  }

	  function trim(s) {
	    if (s.trim) {
	      return s.trim();
	    }

	    return s.replace(/^\s*|\s*$/g, '');
	  }

	  function tagChange(tag, text, index) {
	    if (text.charAt(index) != tag.charAt(0)) {
	      return false;
	    }

	    for (var i = 1, l = tag.length; i < l; i++) {
	      if (text.charAt(index + i) != tag.charAt(i)) {
	        return false;
	      }
	    }

	    return true;
	  }

	  // the tags allowed inside super templates
	  var allowedInSuper = { '_t': true, '\n': true, '$': true, '/': true };

	  function buildTree(tokens, kind, stack, customTags) {
	    var instructions = [],
	        opener = null,
	        tail = null,
	        token = null;

	    tail = stack[stack.length - 1];

	    while (tokens.length > 0) {
	      token = tokens.shift();

	      if (tail && tail.tag == '<' && !(token.tag in allowedInSuper)) {
	        throw new Error('Illegal content in < super tag.');
	      }

	      if (Hogan.tags[token.tag] <= Hogan.tags['$'] || isOpener(token, customTags)) {
	        stack.push(token);
	        token.nodes = buildTree(tokens, token.tag, stack, customTags);
	      } else if (token.tag == '/') {
	        if (stack.length === 0) {
	          throw new Error('Closing tag without opener: /' + token.n);
	        }
	        opener = stack.pop();
	        if (token.n != opener.n && !isCloser(token.n, opener.n, customTags)) {
	          throw new Error('Nesting error: ' + opener.n + ' vs. ' + token.n);
	        }
	        opener.end = token.i;
	        return instructions;
	      } else if (token.tag == '\n') {
	        token.last = tokens.length == 0 || tokens[0].tag == '\n';
	      }

	      instructions.push(token);
	    }

	    if (stack.length > 0) {
	      throw new Error('missing closing tag: ' + stack.pop().n);
	    }

	    return instructions;
	  }

	  function isOpener(token, tags) {
	    for (var i = 0, l = tags.length; i < l; i++) {
	      if (tags[i].o == token.n) {
	        token.tag = '#';
	        return true;
	      }
	    }
	  }

	  function isCloser(close, open, tags) {
	    for (var i = 0, l = tags.length; i < l; i++) {
	      if (tags[i].c == close && tags[i].o == open) {
	        return true;
	      }
	    }
	  }

	  function stringifySubstitutions(obj) {
	    var items = [];
	    for (var key in obj) {
	      items.push('"' + esc(key) + '": function(c,p,t,i) {' + obj[key] + '}');
	    }
	    return "{ " + items.join(",") + " }";
	  }

	  function stringifyPartials(codeObj) {
	    var partials = [];
	    for (var key in codeObj.partials) {
	      partials.push('"' + esc(key) + '":{name:"' + esc(codeObj.partials[key].name) + '", ' + stringifyPartials(codeObj.partials[key]) + "}");
	    }
	    return "partials: {" + partials.join(",") + "}, subs: " + stringifySubstitutions(codeObj.subs);
	  }

	  Hogan.stringify = function (codeObj, text, options) {
	    return "{code: function (c,p,i) { " + Hogan.wrapMain(codeObj.code) + " }," + stringifyPartials(codeObj) + "}";
	  };

	  var serialNo = 0;
	  Hogan.generate = function (tree, text, options) {
	    serialNo = 0;
	    var context = { code: '', subs: {}, partials: {} };
	    Hogan.walk(tree, context);

	    if (options.asString) {
	      return this.stringify(context, text, options);
	    }

	    return this.makeTemplate(context, text, options);
	  };

	  Hogan.wrapMain = function (code) {
	    return 'var t=this;t.b(i=i||"");' + code + 'return t.fl();';
	  };

	  Hogan.template = Hogan.Template;

	  Hogan.makeTemplate = function (codeObj, text, options) {
	    var template = this.makePartials(codeObj);
	    template.code = new Function('c', 'p', 'i', this.wrapMain(codeObj.code));
	    return new this.template(template, text, this, options);
	  };

	  Hogan.makePartials = function (codeObj) {
	    var key,
	        template = { subs: {}, partials: codeObj.partials, name: codeObj.name };
	    for (key in template.partials) {
	      template.partials[key] = this.makePartials(template.partials[key]);
	    }
	    for (key in codeObj.subs) {
	      template.subs[key] = new Function('c', 'p', 't', 'i', codeObj.subs[key]);
	    }
	    return template;
	  };

	  function esc(s) {
	    return s.replace(rSlash, '\\\\').replace(rQuot, '\\\"').replace(rNewline, '\\n').replace(rCr, '\\r').replace(rLineSep, '\\u2028').replace(rParagraphSep, '\\u2029');
	  }

	  function chooseMethod(s) {
	    return ~s.indexOf('.') ? 'd' : 'f';
	  }

	  function createPartial(node, context) {
	    var prefix = "<" + (context.prefix || "");
	    var sym = prefix + node.n + serialNo++;
	    context.partials[sym] = { name: node.n, partials: {} };
	    context.code += 't.b(t.rp("' + esc(sym) + '",c,p,"' + (node.indent || '') + '"));';
	    return sym;
	  }

	  Hogan.codegen = {
	    '#': function _(node, context) {
	      context.code += 'if(t.s(t.' + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),' + 'c,p,0,' + node.i + ',' + node.end + ',"' + node.otag + " " + node.ctag + '")){' + 't.rs(c,p,' + 'function(c,p,t){';
	      Hogan.walk(node.nodes, context);
	      context.code += '});c.pop();}';
	    },

	    '^': function _(node, context) {
	      context.code += 'if(!t.s(t.' + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),c,p,1,0,0,"")){';
	      Hogan.walk(node.nodes, context);
	      context.code += '};';
	    },

	    '>': createPartial,
	    '<': function _(node, context) {
	      var ctx = { partials: {}, code: '', subs: {}, inPartial: true };
	      Hogan.walk(node.nodes, ctx);
	      var template = context.partials[createPartial(node, context)];
	      template.subs = ctx.subs;
	      template.partials = ctx.partials;
	    },

	    '$': function $(node, context) {
	      var ctx = { subs: {}, code: '', partials: context.partials, prefix: node.n };
	      Hogan.walk(node.nodes, ctx);
	      context.subs[node.n] = ctx.code;
	      if (!context.inPartial) {
	        context.code += 't.sub("' + esc(node.n) + '",c,p,i);';
	      }
	    },

	    '\n': function _(node, context) {
	      context.code += write('"\\n"' + (node.last ? '' : ' + i'));
	    },

	    '_v': function _v(node, context) {
	      context.code += 't.b(t.v(t.' + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
	    },

	    '_t': function _t(node, context) {
	      context.code += write('"' + esc(node.text) + '"');
	    },

	    '{': tripleStache,

	    '&': tripleStache
	  };

	  function tripleStache(node, context) {
	    context.code += 't.b(t.t(t.' + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
	  }

	  function write(s) {
	    return 't.b(' + s + ');';
	  }

	  Hogan.walk = function (nodelist, context) {
	    var func;
	    for (var i = 0, l = nodelist.length; i < l; i++) {
	      func = Hogan.codegen[nodelist[i].tag];
	      func && func(nodelist[i], context);
	    }
	    return context;
	  };

	  Hogan.parse = function (tokens, text, options) {
	    options = options || {};
	    return buildTree(tokens, '', [], options.sectionTags || []);
	  };

	  Hogan.cache = {};

	  Hogan.cacheKey = function (text, options) {
	    return [text, !!options.asString, !!options.disableLambda, options.delimiters, !!options.modelGet].join('||');
	  };

	  Hogan.compile = function (text, options) {
	    options = options || {};
	    var key = Hogan.cacheKey(text, options);
	    var template = this.cache[key];

	    if (template) {
	      var partials = template.partials;
	      for (var name in partials) {
	        delete partials[name].instance;
	      }
	      return template;
	    }

	    template = this.generate(this.parse(this.scan(text, options.delimiters), text, options), text, options);
	    return this.cache[key] = template;
	  };
	})( true ? exports : Hogan);

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/*
	 *  Copyright 2011 Twitter, Inc.
	 *  Licensed under the Apache License, Version 2.0 (the "License");
	 *  you may not use this file except in compliance with the License.
	 *  You may obtain a copy of the License at
	 *
	 *  http://www.apache.org/licenses/LICENSE-2.0
	 *
	 *  Unless required by applicable law or agreed to in writing, software
	 *  distributed under the License is distributed on an "AS IS" BASIS,
	 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 *  See the License for the specific language governing permissions and
	 *  limitations under the License.
	 */

	var Hogan = {};

	(function (Hogan) {
	  Hogan.Template = function (codeObj, text, compiler, options) {
	    codeObj = codeObj || {};
	    this.r = codeObj.code || this.r;
	    this.c = compiler;
	    this.options = options || {};
	    this.text = text || '';
	    this.partials = codeObj.partials || {};
	    this.subs = codeObj.subs || {};
	    this.buf = '';
	  };

	  Hogan.Template.prototype = {
	    // render: replaced by generated code.
	    r: function r(context, partials, indent) {
	      return '';
	    },

	    // variable escaping
	    v: hoganEscape,

	    // triple stache
	    t: coerceToString,

	    render: function render(context, partials, indent) {
	      return this.ri([context], partials || {}, indent);
	    },

	    // render internal -- a hook for overrides that catches partials too
	    ri: function ri(context, partials, indent) {
	      return this.r(context, partials, indent);
	    },

	    // ensurePartial
	    ep: function ep(symbol, partials) {
	      var partial = this.partials[symbol];

	      // check to see that if we've instantiated this partial before
	      var template = partials[partial.name];
	      if (partial.instance && partial.base == template) {
	        return partial.instance;
	      }

	      if (typeof template == 'string') {
	        if (!this.c) {
	          throw new Error("No compiler available.");
	        }
	        template = this.c.compile(template, this.options);
	      }

	      if (!template) {
	        return null;
	      }

	      // We use this to check whether the partials dictionary has changed
	      this.partials[symbol].base = template;

	      if (partial.subs) {
	        // Make sure we consider parent template now
	        if (!partials.stackText) partials.stackText = {};
	        for (key in partial.subs) {
	          if (!partials.stackText[key]) {
	            partials.stackText[key] = this.activeSub !== undefined && partials.stackText[this.activeSub] ? partials.stackText[this.activeSub] : this.text;
	          }
	        }
	        template = createSpecializedPartial(template, partial.subs, partial.partials, this.stackSubs, this.stackPartials, partials.stackText);
	      }
	      this.partials[symbol].instance = template;

	      return template;
	    },

	    // tries to find a partial in the current scope and render it
	    rp: function rp(symbol, context, partials, indent) {
	      var partial = this.ep(symbol, partials);
	      if (!partial) {
	        return '';
	      }

	      return partial.ri(context, partials, indent);
	    },

	    // render a section
	    rs: function rs(context, partials, section) {
	      var tail = context[context.length - 1];

	      if (!isArray(tail)) {
	        section(context, partials, this);
	        return;
	      }

	      for (var i = 0; i < tail.length; i++) {
	        context.push(tail[i]);
	        section(context, partials, this);
	        context.pop();
	      }
	    },

	    // maybe start a section
	    s: function s(val, ctx, partials, inverted, start, end, tags) {
	      var pass;

	      if (isArray(val) && val.length === 0) {
	        return false;
	      }

	      if (typeof val == 'function') {
	        val = this.ms(val, ctx, partials, inverted, start, end, tags);
	      }

	      pass = !!val;

	      if (!inverted && pass && ctx) {
	        ctx.push((typeof val === 'undefined' ? 'undefined' : _typeof(val)) == 'object' ? val : ctx[ctx.length - 1]);
	      }

	      return pass;
	    },

	    // find values with dotted names
	    d: function d(key, ctx, partials, returnFound) {
	      var found,
	          names = key.split('.'),
	          val = this.f(names[0], ctx, partials, returnFound),
	          doModelGet = this.options.modelGet,
	          cx = null;

	      if (key === '.' && isArray(ctx[ctx.length - 2])) {
	        val = ctx[ctx.length - 1];
	      } else {
	        for (var i = 1; i < names.length; i++) {
	          found = findInScope(names[i], val, doModelGet);
	          if (found !== undefined) {
	            cx = val;
	            val = found;
	          } else {
	            val = '';
	          }
	        }
	      }

	      if (returnFound && !val) {
	        return false;
	      }

	      if (!returnFound && typeof val == 'function') {
	        ctx.push(cx);
	        val = this.mv(val, ctx, partials);
	        ctx.pop();
	      }

	      return val;
	    },

	    // find values with normal names
	    f: function f(key, ctx, partials, returnFound) {
	      var val = false,
	          v = null,
	          found = false,
	          doModelGet = this.options.modelGet;

	      for (var i = ctx.length - 1; i >= 0; i--) {
	        v = ctx[i];
	        val = findInScope(key, v, doModelGet);
	        if (val !== undefined) {
	          found = true;
	          break;
	        }
	      }

	      if (!found) {
	        return returnFound ? false : "";
	      }

	      if (!returnFound && typeof val == 'function') {
	        val = this.mv(val, ctx, partials);
	      }

	      return val;
	    },

	    // higher order templates
	    ls: function ls(func, cx, partials, text, tags) {
	      var oldTags = this.options.delimiters;

	      this.options.delimiters = tags;
	      this.b(this.ct(coerceToString(func.call(cx, text)), cx, partials));
	      this.options.delimiters = oldTags;

	      return false;
	    },

	    // compile text
	    ct: function ct(text, cx, partials) {
	      if (this.options.disableLambda) {
	        throw new Error('Lambda features disabled.');
	      }
	      return this.c.compile(text, this.options).render(cx, partials);
	    },

	    // template result buffering
	    b: function b(s) {
	      this.buf += s;
	    },

	    fl: function fl() {
	      var r = this.buf;this.buf = '';return r;
	    },

	    // method replace section
	    ms: function ms(func, ctx, partials, inverted, start, end, tags) {
	      var textSource,
	          cx = ctx[ctx.length - 1],
	          result = func.call(cx);

	      if (typeof result == 'function') {
	        if (inverted) {
	          return true;
	        } else {
	          textSource = this.activeSub && this.subsText && this.subsText[this.activeSub] ? this.subsText[this.activeSub] : this.text;
	          return this.ls(result, cx, partials, textSource.substring(start, end), tags);
	        }
	      }

	      return result;
	    },

	    // method replace variable
	    mv: function mv(func, ctx, partials) {
	      var cx = ctx[ctx.length - 1];
	      var result = func.call(cx);

	      if (typeof result == 'function') {
	        return this.ct(coerceToString(result.call(cx)), cx, partials);
	      }

	      return result;
	    },

	    sub: function sub(name, context, partials, indent) {
	      var f = this.subs[name];
	      if (f) {
	        this.activeSub = name;
	        f(context, partials, this, indent);
	        this.activeSub = false;
	      }
	    }

	  };

	  //Find a key in an object
	  function findInScope(key, scope, doModelGet) {
	    var val;

	    if (scope && (typeof scope === 'undefined' ? 'undefined' : _typeof(scope)) == 'object') {

	      if (scope[key] !== undefined) {
	        val = scope[key];

	        // try lookup with get for backbone or similar model data
	      } else if (doModelGet && scope.get && typeof scope.get == 'function') {
	        val = scope.get(key);
	      }
	    }

	    return val;
	  }

	  function createSpecializedPartial(instance, subs, partials, stackSubs, stackPartials, stackText) {
	    function PartialTemplate() {};
	    PartialTemplate.prototype = instance;
	    function Substitutions() {};
	    Substitutions.prototype = instance.subs;
	    var key;
	    var partial = new PartialTemplate();
	    partial.subs = new Substitutions();
	    partial.subsText = {}; //hehe. substext.
	    partial.buf = '';

	    stackSubs = stackSubs || {};
	    partial.stackSubs = stackSubs;
	    partial.subsText = stackText;
	    for (key in subs) {
	      if (!stackSubs[key]) stackSubs[key] = subs[key];
	    }
	    for (key in stackSubs) {
	      partial.subs[key] = stackSubs[key];
	    }

	    stackPartials = stackPartials || {};
	    partial.stackPartials = stackPartials;
	    for (key in partials) {
	      if (!stackPartials[key]) stackPartials[key] = partials[key];
	    }
	    for (key in stackPartials) {
	      partial.partials[key] = stackPartials[key];
	    }

	    return partial;
	  }

	  var rAmp = /&/g,
	      rLt = /</g,
	      rGt = />/g,
	      rApos = /\'/g,
	      rQuot = /\"/g,
	      hChars = /[&<>\"\']/;

	  function coerceToString(val) {
	    return String(val === null || val === undefined ? '' : val);
	  }

	  function hoganEscape(str) {
	    str = coerceToString(str);
	    return hChars.test(str) ? str.replace(rAmp, '&amp;').replace(rLt, '&lt;').replace(rGt, '&gt;').replace(rApos, '&#39;').replace(rQuot, '&quot;') : str;
	  }

	  var isArray = Array.isArray || function (a) {
	    return Object.prototype.toString.call(a) === '[object Array]';
	  };
	})( true ? exports : Hogan);

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	!function (t, i) {
	  if ("object" == ( false ? "undefined" : _typeof(exports)) && "object" == ( false ? "undefined" : _typeof(module))) module.exports = i(__webpack_require__(1));else if (true) !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(1)], __WEBPACK_AMD_DEFINE_FACTORY__ = (i), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));else {
	    var o = i("object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? require("jquery") : t.jquery);for (var e in o) {
	      ("object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? exports : t)[e] = o[e];
	    }
	  }
	}(undefined, function (t) {
	  return function (t) {
	    function i(e) {
	      if (o[e]) return o[e].exports;var s = o[e] = { exports: {}, id: e, loaded: !1 };return t[e].call(s.exports, s, s.exports, i), s.loaded = !0, s.exports;
	    }var o = {};return i.m = t, i.c = o, i.p = "", i(0);
	  }([function (t, i, o) {
	    "use strict";
	    function e(t) {
	      return t && t.__esModule ? t : { default: t };
	    }function s(t, i, o) {
	      this.element = t, this.container = i, this.$tooltip = o, this.elRect = this.element.getBoundingClientRect(), this.contRect = this.container.getBoundingClientRect(), this.dimension = this.calculateViewportPosition(), this.jqDimension = {}, this.elHeight = (0, h.default)(this.element).outerHeight(), this.elWidth = (0, h.default)(this.element).outerWidth(), this.jqHeight = 0, this.jqWidth = 0, this._unique = "", this._scroll_handle = "", this._scroll_container = "", this.placeTooltip();
	    }Object.defineProperty(i, "__esModule", { value: !0 });var n = o(1),
	        h = e(n);s.prototype.placeTooltip = function () {
	      (0, h.default)(this.container).append(this.$tooltip), this.jqHeight = this.$tooltip.outerHeight(), this.jqWidth = this.$tooltip.outerWidth(), this.$tooltip.css("top", this.dimension.top - this.$tooltip.outerHeight() / 2 + this.elRect.height / 2).css("left", this.dimension.left - this.$tooltip.outerWidth() / 2 + this.elRect.width / 2);
	    }, s.prototype.autoPlace = function (t, i) {
	      var o = this.determineOffsetFromElement();t = t || 0, i = i || 0;var e = "TooltipRight" === o.horizontal ? "-=" : "+=",
	          s = "TooltipAbove" === o.vertical ? "-=" : "+=";return this.$tooltip.css("left", e + (this.elWidth / 2 + this.jqWidth / 2 - t) + "px"), this.$tooltip.css("top", s + (this.elHeight / 2 + this.jqHeight / 2 + i) + "px"), this.$tooltip.addClass(o.horizontal + " " + o.vertical + " autoplace"), this;
	    }, s.prototype.autoPlaceHorizontally = function (t) {
	      var i = this.determineOffsetFromElement();t = t || 0;var o = "TooltipRight" === i.horizontal ? "-=" : "+=";return this.$tooltip.css("left", o + (this.elWidth / 2 + this.jqWidth / 2 + t) + "px"), this.$tooltip.addClass(i.horizontal), this;
	    }, s.prototype.autoPlaceVertically = function (t) {
	      var i = this.determineOffsetFromElement();t = t || 0;var o = "TooltipAbove" === i.vertical ? "-=" : "+=";return this.$tooltip.css("top", o + (this.elHeight / 2 + this.jqHeight / 2 + t) + "px"), this.$tooltip.addClass(i.vertical), this;
	    }, s.prototype.above = function (t) {
	      return t = t || 0, this.$tooltip.css("top", "-=" + (this.elHeight / 2 + this.jqHeight / 2 + t) + "px"), this.$tooltip.addClass("TooltipAbove"), this;
	    }, s.prototype.below = function (t) {
	      return t = t || 0, this.$tooltip.css("top", "+=" + (this.elHeight / 2 + this.jqHeight / 2 + t) + "px"), this.$tooltip.addClass("TooltipBelow"), this;
	    }, s.prototype.left = function (t) {
	      return t = t || 0, this.$tooltip.css("left", "-=" + (this.elWidth / 2 + this.jqWidth / 2 + t) + "px"), this.$tooltip.addClass("TooltipLeft"), this;
	    }, s.prototype.right = function (t) {
	      return t = t || 0, this.$tooltip.css("left", "+=" + (this.elWidth / 2 + this.jqWidth / 2 + t) + "px"), this.$tooltip.addClass("TooltipRight"), this;
	    }, s.prototype.alignLeft = function (t) {
	      t = t || 0, this.jqDimension = this.jqViewportDimension();var i = this.jqDimension.left > this.dimension.left ? "-=" : "+=";return this.$tooltip.css("left", i + (Math.abs(this.jqDimension.left - this.dimension.left) + t) + "px"), this.$tooltip.addClass("TooltipAlignLeft"), this;
	    }, s.prototype.alignRight = function (t) {
	      t = t || 0, this.jqDimension = this.jqViewportDimension();var i = this.jqDimension.right > this.dimension.right ? "-=" : "+=";return this.$tooltip.css("left", i + (Math.abs(this.jqDimension.right - this.dimension.right) + t) + "px"), this.$tooltip.addClass("TooltipAlignRight"), this;
	    }, s.prototype.inside = function () {
	      var t = this;if (arguments.length) {
	        var i = Array.prototype.slice.call(arguments);i.forEach(function (i) {
	          switch (i) {case "top":
	              t._insideTop();break;case "bottom":
	              t._insideBottom();break;case "left":
	              t.alignLeft();break;case "right":
	              t.alignRight();}
	        });
	      }return this;
	    }, s.prototype._insideTop = function () {
	      return this.$tooltip.css("top", "-=" + this.elHeight / 4), this;
	    }, s.prototype._insideBottom = function () {
	      return this.$tooltip.css("top", "+=" + this.elHeight / 2), this;
	    }, s.prototype.center = function () {
	      return this._removeClasses(), this.elRect = this.element.getBoundingClientRect(), this.contRect = this.container.getBoundingClientRect(), this.dimension = this.calculateViewportPosition(), this.jqHeight = this.$tooltip.outerHeight(), this.jqWidth = this.$tooltip.outerWidth(), this.$tooltip.css("top", this.dimension.top - this.$tooltip.outerHeight() / 2 + this.elRect.height / 2).css("left", this.dimension.left - this.$tooltip.outerWidth() / 2 + this.elRect.width / 2), this;
	    }, s.prototype._removeClasses = function () {
	      return this.$tooltip.removeClass("TooltipAlignRight TooltipAlignLeft TooltipRight TooltipLeft TooltipAbove TooltipBelow"), this;
	    }, s.prototype.destroy = function () {
	      return this._removeListeners(), this.$tooltip.remove(), this;
	    }, s.prototype.hide = function () {
	      return this.$tooltip.hide(), this;
	    }, s.prototype.show = function () {
	      return this.$tooltip.show(), this;
	    }, s.prototype.removeListener = function () {
	      var t = this;return setTimeout(function () {
	        (0, h.default)("html").on("click.tooltip", function () {
	          t.$tooltip.remove(), (0, h.default)("html").off("click.tooltip");
	        });
	      }, 50), this;
	    }, s.prototype.setClickCallback = function (t, i) {
	      var o = this;t.stopPropagation(), this._unique = "click." + new Date().getTime(), (0, h.default)("html").on(this._unique, function (t) {
	        i.call(o, t.target, o.$tooltip);
	      });
	    }, s.prototype.offCallback = function () {
	      return this._unique && (0, h.default)("html").off(this._unique), this;
	    }, s.prototype.scrollWith = function (t) {
	      var i = this;this._scroll_container = t;var o = t.get(0).scrollTop;return this._scroll_handle = "scroll." + new Date().getTime(), this._scroll_container.on(this._scroll_handle, function () {
	        var e = o - t.get(0).scrollTop;i.$tooltip.css("top", "+=" + e + "px"), o = t.get(0).scrollTop;
	      }), this;
	    }, s.prototype._removeListeners = function () {
	      return this._scroll_container && this._scroll_handle && this._scroll_container.off(this._scroll_handle), this.offCallback(), this;
	    }, s.prototype.jqViewportDimension = function () {
	      var t = this.$tooltip[0].getBoundingClientRect(),
	          i = this.contRect,
	          o = t.left - i.left + this.container.scrollLeft,
	          e = t.top - i.top + this.container.scrollTop,
	          s = t.right - i.right,
	          n = t.bottom - i.bottom;return { left: o, top: e, right: s, bottom: n, width: t.width, height: t.height };
	    }, s.prototype.calculateViewportPosition = function () {
	      var t = this.elRect,
	          i = this.contRect,
	          o = t.left - i.left + this.container.scrollLeft,
	          e = t.top - i.top + this.container.scrollTop,
	          s = t.right - i.right,
	          n = t.bottom - i.bottom;return { left: o, top: e, right: s, bottom: n, width: t.width, height: t.height };
	    }, s.prototype.determineOffsetFromElement = function () {
	      var t = window.innerHeight / 2,
	          i = window.innerWidth / 2,
	          o = this.elRect.left > i ? "TooltipRight" : "TooltipLeft",
	          e = this.elRect.top > t ? "TooltipAbove" : "TooltipBelow";return { horizontal: o, vertical: e };
	    }, i.default = s;
	  }, function (i, o) {
	    i.exports = t;
	  }]);
	});
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2)(module)))

/***/ }),
/* 15 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = {
	  "Symbols": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": false,
	    "has_img_emojione": true,
	    "name": "COPYRIGHT SIGN",
	    "short_name": "copyright",
	    "short_names": ["copyright"],
	    "sort_order": 197
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": false,
	    "has_img_emojione": true,
	    "name": "REGISTERED SIGN",
	    "short_name": "registered",
	    "short_names": ["registered"],
	    "sort_order": 198
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOUBLE EXCLAMATION MARK",
	    "short_name": "bangbang",
	    "short_names": ["bangbang"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EXCLAMATION QUESTION MARK",
	    "short_name": "interrobang",
	    "short_names": ["interrobang"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": false,
	    "has_img_emojione": true,
	    "name": "TRADE MARK SIGN",
	    "short_name": "tm",
	    "short_names": ["tm"],
	    "sort_order": 199
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INFORMATION SOURCE",
	    "short_name": "information_source",
	    "short_names": ["information_source"],
	    "sort_order": 180
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEFT RIGHT ARROW",
	    "short_name": "left_right_arrow",
	    "short_names": ["left_right_arrow"],
	    "sort_order": 172
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UP DOWN ARROW",
	    "short_name": "arrow_up_down",
	    "short_names": ["arrow_up_down"],
	    "sort_order": 171
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NORTH WEST ARROW",
	    "short_name": "arrow_upper_left",
	    "short_names": ["arrow_upper_left"],
	    "sort_order": 170
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NORTH EAST ARROW",
	    "short_name": "arrow_upper_right",
	    "short_names": ["arrow_upper_right"],
	    "sort_order": 167
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SOUTH EAST ARROW",
	    "short_name": "arrow_lower_right",
	    "short_names": ["arrow_lower_right"],
	    "sort_order": 168
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SOUTH WEST ARROW",
	    "short_name": "arrow_lower_left",
	    "short_names": ["arrow_lower_left"],
	    "sort_order": 169
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEFTWARDS ARROW WITH HOOK",
	    "short_name": "leftwards_arrow_with_hook",
	    "short_names": ["leftwards_arrow_with_hook"],
	    "sort_order": 175
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RIGHTWARDS ARROW WITH HOOK",
	    "short_name": "arrow_right_hook",
	    "short_names": ["arrow_right_hook"],
	    "sort_order": 174
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK RIGHT-POINTING DOUBLE TRIANGLE",
	    "short_name": "fast_forward",
	    "short_names": ["fast_forward"],
	    "sort_order": 153
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK LEFT-POINTING DOUBLE TRIANGLE",
	    "short_name": "rewind",
	    "short_names": ["rewind"],
	    "sort_order": 154
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK UP-POINTING DOUBLE TRIANGLE",
	    "short_name": "arrow_double_up",
	    "short_names": ["arrow_double_up"],
	    "sort_order": 161
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK DOWN-POINTING DOUBLE TRIANGLE",
	    "short_name": "arrow_double_down",
	    "short_names": ["arrow_double_down"],
	    "sort_order": 162
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BLACK RIGHT-POINTING DOUBLE TRIANGLE WITH VERTICAL BAR",
	    "short_name": "black_right_pointing_double_triangle_with_vertical_bar",
	    "short_names": ["black_right_pointing_double_triangle_with_vertical_bar"],
	    "sort_order": 151
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BLACK LEFT-POINTING DOUBLE TRIANGLE WITH VERTICAL BAR",
	    "short_name": "black_left_pointing_double_triangle_with_vertical_bar",
	    "short_names": ["black_left_pointing_double_triangle_with_vertical_bar"],
	    "sort_order": 152
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BLACK RIGHT-POINTING TRIANGLE WITH DOUBLE VERTICAL BAR",
	    "short_name": "black_right_pointing_triangle_with_double_vertical_bar",
	    "short_names": ["black_right_pointing_triangle_with_double_vertical_bar"],
	    "sort_order": 148
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "DOUBLE VERTICAL BAR",
	    "short_name": "double_vertical_bar",
	    "short_names": ["double_vertical_bar"],
	    "sort_order": 147
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BLACK SQUARE FOR STOP",
	    "short_name": "black_square_for_stop",
	    "short_names": ["black_square_for_stop"],
	    "sort_order": 149
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BLACK CIRCLE FOR RECORD",
	    "short_name": "black_circle_for_record",
	    "short_names": ["black_circle_for_record"],
	    "sort_order": 150
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCLED LATIN CAPITAL LETTER M",
	    "short_name": "m",
	    "short_names": ["m"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK SMALL SQUARE",
	    "short_name": "black_small_square",
	    "short_names": ["black_small_square"],
	    "sort_order": 216
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE SMALL SQUARE",
	    "short_name": "white_small_square",
	    "short_names": ["white_small_square"],
	    "sort_order": 217
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK RIGHT-POINTING TRIANGLE",
	    "short_name": "arrow_forward",
	    "short_names": ["arrow_forward"],
	    "sort_order": 146
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK LEFT-POINTING TRIANGLE",
	    "short_name": "arrow_backward",
	    "short_names": ["arrow_backward"],
	    "sort_order": 158
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE MEDIUM SQUARE",
	    "short_name": "white_medium_square",
	    "short_names": ["white_medium_square"],
	    "sort_order": 222
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK MEDIUM SQUARE",
	    "short_name": "black_medium_square",
	    "short_names": ["black_medium_square"],
	    "sort_order": 221
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE MEDIUM SMALL SQUARE",
	    "short_name": "white_medium_small_square",
	    "short_names": ["white_medium_small_square"],
	    "sort_order": 224
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK MEDIUM SMALL SQUARE",
	    "short_name": "black_medium_small_square",
	    "short_names": ["black_medium_small_square"],
	    "sort_order": 223
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BALLOT BOX WITH CHECK",
	    "short_name": "ballot_box_with_check",
	    "short_names": ["ballot_box_with_check"],
	    "sort_order": 205
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "RADIOACTIVE SIGN",
	    "short_name": "radioactive_sign",
	    "short_names": ["radioactive_sign"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BIOHAZARD SIGN",
	    "short_name": "biohazard_sign",
	    "short_names": ["biohazard_sign"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ORTHODOX CROSS",
	    "short_name": "orthodox_cross",
	    "short_names": ["orthodox_cross"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "STAR AND CRESCENT",
	    "short_name": "star_and_crescent",
	    "short_names": ["star_and_crescent"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "PEACE SYMBOL",
	    "short_name": "peace_symbol",
	    "short_names": ["peace_symbol"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "YIN YANG",
	    "short_name": "yin_yang",
	    "short_names": ["yin_yang"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WHEEL OF DHARMA",
	    "short_name": "wheel_of_dharma",
	    "short_names": ["wheel_of_dharma"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ARIES",
	    "short_name": "aries",
	    "short_names": ["aries"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TAURUS",
	    "short_name": "taurus",
	    "short_names": ["taurus"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GEMINI",
	    "short_name": "gemini",
	    "short_names": ["gemini"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CANCER",
	    "short_name": "cancer",
	    "short_names": ["cancer"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEO",
	    "short_name": "leo",
	    "short_names": ["leo"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIRGO",
	    "short_name": "virgo",
	    "short_names": ["virgo"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LIBRA",
	    "short_name": "libra",
	    "short_names": ["libra"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SCORPIUS",
	    "short_name": "scorpius",
	    "short_names": ["scorpius"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SAGITTARIUS",
	    "short_name": "sagittarius",
	    "short_names": ["sagittarius"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAPRICORN",
	    "short_name": "capricorn",
	    "short_names": ["capricorn"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AQUARIUS",
	    "short_name": "aquarius",
	    "short_names": ["aquarius"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PISCES",
	    "short_name": "pisces",
	    "short_names": ["pisces"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK SPADE SUIT",
	    "short_name": "spades",
	    "short_names": ["spades"],
	    "sort_order": 237
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK CLUB SUIT",
	    "short_name": "clubs",
	    "short_names": ["clubs"],
	    "sort_order": 238
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK HEART SUIT",
	    "short_name": "hearts",
	    "short_names": ["hearts"],
	    "sort_order": 239
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK DIAMOND SUIT",
	    "short_name": "diamonds",
	    "short_names": ["diamonds"],
	    "sort_order": 240
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOT SPRINGS",
	    "short_name": "hotsprings",
	    "short_names": ["hotsprings"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK UNIVERSAL RECYCLING SYMBOL",
	    "short_name": "recycle",
	    "short_names": ["recycle"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHEELCHAIR SYMBOL",
	    "short_name": "wheelchair",
	    "short_names": ["wheelchair"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ATOM SYMBOL",
	    "short_name": "atom_symbol",
	    "short_names": ["atom_symbol"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FLEUR-DE-LIS",
	    "short_name": "fleur_de_lis",
	    "short_names": ["fleur_de_lis"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WARNING SIGN",
	    "short_name": "warning",
	    "short_names": ["warning"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MEDIUM WHITE CIRCLE",
	    "short_name": "white_circle",
	    "short_names": ["white_circle"],
	    "sort_order": 207
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MEDIUM BLACK CIRCLE",
	    "short_name": "black_circle",
	    "short_names": ["black_circle"],
	    "sort_order": 208
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPHIUCHUS",
	    "short_name": "ophiuchus",
	    "short_names": ["ophiuchus"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO ENTRY",
	    "short_name": "no_entry",
	    "short_names": ["no_entry"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE HEAVY CHECK MARK",
	    "short_name": "white_check_mark",
	    "short_names": ["white_check_mark"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY CHECK MARK",
	    "short_name": "heavy_check_mark",
	    "short_names": ["heavy_check_mark"],
	    "sort_order": 189
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY MULTIPLICATION X",
	    "short_name": "heavy_multiplication_x",
	    "short_names": ["heavy_multiplication_x"],
	    "sort_order": 194
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "LATIN CROSS",
	    "short_name": "latin_cross",
	    "short_names": ["latin_cross"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "STAR OF DAVID",
	    "short_name": "star_of_david",
	    "short_names": ["star_of_david"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EIGHT SPOKED ASTERISK",
	    "short_name": "eight_spoked_asterisk",
	    "short_names": ["eight_spoked_asterisk"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EIGHT POINTED BLACK STAR",
	    "short_name": "eight_pointed_black_star",
	    "short_names": ["eight_pointed_black_star"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPARKLE",
	    "short_name": "sparkle",
	    "short_names": ["sparkle"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CROSS MARK",
	    "short_name": "x",
	    "short_names": ["x"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED CROSS MARK",
	    "short_name": "negative_squared_cross_mark",
	    "short_names": ["negative_squared_cross_mark"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK QUESTION MARK ORNAMENT",
	    "short_name": "question",
	    "short_names": ["question"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE QUESTION MARK ORNAMENT",
	    "short_name": "grey_question",
	    "short_names": ["grey_question"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE EXCLAMATION MARK ORNAMENT",
	    "short_name": "grey_exclamation",
	    "short_names": ["grey_exclamation"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY EXCLAMATION MARK SYMBOL",
	    "short_name": "exclamation",
	    "short_names": ["exclamation", "heavy_exclamation_mark"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "HEAVY HEART EXCLAMATION MARK ORNAMENT",
	    "short_name": "heavy_heart_exclamation_mark_ornament",
	    "short_names": ["heavy_heart_exclamation_mark_ornament"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY BLACK HEART",
	    "short_name": "heart",
	    "short_names": ["heart"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY PLUS SIGN",
	    "short_name": "heavy_plus_sign",
	    "short_names": ["heavy_plus_sign"],
	    "sort_order": 191
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY MINUS SIGN",
	    "short_name": "heavy_minus_sign",
	    "short_names": ["heavy_minus_sign"],
	    "sort_order": 192
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY DIVISION SIGN",
	    "short_name": "heavy_division_sign",
	    "short_names": ["heavy_division_sign"],
	    "sort_order": 193
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK RIGHTWARDS ARROW",
	    "short_name": "arrow_right",
	    "short_names": ["arrow_right"],
	    "sort_order": 163
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CURLY LOOP",
	    "short_name": "curly_loop",
	    "short_names": ["curly_loop"],
	    "sort_order": 188
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOUBLE CURLY LOOP",
	    "short_name": "loop",
	    "short_names": ["loop"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS",
	    "short_name": "arrow_heading_up",
	    "short_names": ["arrow_heading_up"],
	    "sort_order": 176
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS",
	    "short_name": "arrow_heading_down",
	    "short_names": ["arrow_heading_down"],
	    "sort_order": 177
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEFTWARDS BLACK ARROW",
	    "short_name": "arrow_left",
	    "short_names": ["arrow_left"],
	    "sort_order": 164
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UPWARDS BLACK ARROW",
	    "short_name": "arrow_up",
	    "short_names": ["arrow_up"],
	    "sort_order": 165
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOWNWARDS BLACK ARROW",
	    "short_name": "arrow_down",
	    "short_names": ["arrow_down"],
	    "sort_order": 166
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK LARGE SQUARE",
	    "short_name": "black_large_square",
	    "short_names": ["black_large_square"],
	    "sort_order": 218
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE LARGE SQUARE",
	    "short_name": "white_large_square",
	    "short_names": ["white_large_square"],
	    "sort_order": 219
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY LARGE CIRCLE",
	    "short_name": "o",
	    "short_names": ["o"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAVY DASH",
	    "short_name": "wavy_dash",
	    "short_names": ["wavy_dash"],
	    "sort_order": 187
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PART ALTERNATION MARK",
	    "short_name": "part_alternation_mark",
	    "short_names": ["part_alternation_mark"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCLED IDEOGRAPH CONGRATULATION",
	    "short_name": "congratulations",
	    "short_names": ["congratulations"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCLED IDEOGRAPH SECRET",
	    "short_name": "secret",
	    "short_names": ["secret"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAHJONG TILE RED DRAGON",
	    "short_name": "mahjong",
	    "short_names": ["mahjong"],
	    "sort_order": 236
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PLAYING CARD BLACK JOKER",
	    "short_name": "black_joker",
	    "short_names": ["black_joker"],
	    "sort_order": 235
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED LATIN CAPITAL LETTER A",
	    "short_name": "a",
	    "short_names": ["a"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED LATIN CAPITAL LETTER B",
	    "short_name": "b",
	    "short_names": ["b"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED LATIN CAPITAL LETTER O",
	    "short_name": "o2",
	    "short_names": ["o2"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED LATIN CAPITAL LETTER P",
	    "short_name": "parking",
	    "short_names": ["parking"],
	    "sort_order": 118
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEGATIVE SQUARED AB",
	    "short_name": "ab",
	    "short_names": ["ab"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CL",
	    "short_name": "cl",
	    "short_names": ["cl"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED COOL",
	    "short_name": "cool",
	    "short_names": ["cool"],
	    "sort_order": 131
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED FREE",
	    "short_name": "free",
	    "short_names": ["free"],
	    "sort_order": 133
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED ID",
	    "short_name": "id",
	    "short_names": ["id"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED NEW",
	    "short_name": "new",
	    "short_names": ["new"],
	    "sort_order": 132
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED NG",
	    "short_name": "ng",
	    "short_names": ["ng"],
	    "sort_order": 128
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED OK",
	    "short_name": "ok",
	    "short_names": ["ok"],
	    "sort_order": 129
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED SOS",
	    "short_name": "sos",
	    "short_names": ["sos"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED UP WITH EXCLAMATION MARK",
	    "short_name": "up",
	    "short_names": ["up"],
	    "sort_order": 130
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED VS",
	    "short_name": "vs",
	    "short_names": ["vs"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED KATAKANA KOKO",
	    "short_name": "koko",
	    "short_names": ["koko"],
	    "sort_order": 127
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED KATAKANA SA",
	    "short_name": "sa",
	    "short_names": ["sa"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-7121",
	    "short_name": "u7121",
	    "short_names": ["u7121"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-6307",
	    "short_name": "u6307",
	    "short_names": ["u6307"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-7981",
	    "short_name": "u7981",
	    "short_names": ["u7981"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-7A7A",
	    "short_name": "u7a7a",
	    "short_names": ["u7a7a"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-5408",
	    "short_name": "u5408",
	    "short_names": ["u5408"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-6E80",
	    "short_name": "u6e80",
	    "short_names": ["u6e80"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-6709",
	    "short_name": "u6709",
	    "short_names": ["u6709"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-6708",
	    "short_name": "u6708",
	    "short_names": ["u6708"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-7533",
	    "short_name": "u7533",
	    "short_names": ["u7533"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-5272",
	    "short_name": "u5272",
	    "short_names": ["u5272"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SQUARED CJK UNIFIED IDEOGRAPH-55B6",
	    "short_name": "u55b6",
	    "short_names": ["u55b6"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCLED IDEOGRAPH ADVANTAGE",
	    "short_name": "ideograph_advantage",
	    "short_names": ["ideograph_advantage"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCLED IDEOGRAPH ACCEPT",
	    "short_name": "accept",
	    "short_names": ["accept"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CYCLONE",
	    "short_name": "cyclone",
	    "short_names": ["cyclone"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GLOBE WITH MERIDIANS",
	    "short_name": "globe_with_meridians",
	    "short_names": ["globe_with_meridians"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CINEMA",
	    "short_name": "cinema",
	    "short_names": ["cinema"],
	    "sort_order": 125
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FLOWER PLAYING CARDS",
	    "short_name": "flower_playing_cards",
	    "short_names": ["flower_playing_cards"],
	    "sort_order": 241
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MUSICAL NOTE",
	    "short_name": "musical_note",
	    "short_names": ["musical_note"],
	    "sort_order": 185
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MULTIPLE MUSICAL NOTES",
	    "short_name": "notes",
	    "short_names": ["notes"],
	    "sort_order": 186
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AUTOMATED TELLER MACHINE",
	    "short_name": "atm",
	    "short_names": ["atm"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BEATING HEART",
	    "short_name": "heartbeat",
	    "short_names": ["heartbeat"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BROKEN HEART",
	    "short_name": "broken_heart",
	    "short_names": ["broken_heart"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TWO HEARTS",
	    "short_name": "two_hearts",
	    "short_names": ["two_hearts"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPARKLING HEART",
	    "short_name": "sparkling_heart",
	    "short_names": ["sparkling_heart"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GROWING HEART",
	    "short_name": "heartpulse",
	    "short_names": ["heartpulse"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEART WITH ARROW",
	    "short_name": "cupid",
	    "short_names": ["cupid"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLUE HEART",
	    "short_name": "blue_heart",
	    "short_names": ["blue_heart"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GREEN HEART",
	    "short_name": "green_heart",
	    "short_names": ["green_heart"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "YELLOW HEART",
	    "short_name": "yellow_heart",
	    "short_names": ["yellow_heart"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PURPLE HEART",
	    "short_name": "purple_heart",
	    "short_names": ["purple_heart"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEART WITH RIBBON",
	    "short_name": "gift_heart",
	    "short_names": ["gift_heart"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REVOLVING HEARTS",
	    "short_name": "revolving_hearts",
	    "short_names": ["revolving_hearts"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEART DECORATION",
	    "short_name": "heart_decoration",
	    "short_names": ["heart_decoration"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DIAMOND SHAPE WITH A DOT INSIDE",
	    "short_name": "diamond_shape_with_a_dot_inside",
	    "short_names": ["diamond_shape_with_a_dot_inside"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANGER SYMBOL",
	    "short_name": "anger",
	    "short_names": ["anger"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEECH BALLOON",
	    "short_name": "speech_balloon",
	    "short_names": ["speech_balloon"],
	    "sort_order": 245
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "THOUGHT BALLOON",
	    "short_name": "thought_balloon",
	    "short_names": ["thought_balloon"],
	    "sort_order": 243
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE FLOWER",
	    "short_name": "white_flower",
	    "short_names": ["white_flower"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HUNDRED POINTS SYMBOL",
	    "short_name": "100",
	    "short_names": ["100"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CURRENCY EXCHANGE",
	    "short_name": "currency_exchange",
	    "short_names": ["currency_exchange"],
	    "sort_order": 196
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAVY DOLLAR SIGN",
	    "short_name": "heavy_dollar_sign",
	    "short_names": ["heavy_dollar_sign"],
	    "sort_order": 195
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHART WITH UPWARDS TREND AND YEN SIGN",
	    "short_name": "chart",
	    "short_names": ["chart"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NAME BADGE",
	    "short_name": "name_badge",
	    "short_names": ["name_badge"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PUBLIC ADDRESS LOUDSPEAKER",
	    "short_name": "loudspeaker",
	    "short_names": ["loudspeaker"],
	    "sort_order": 232
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHEERING MEGAPHONE",
	    "short_name": "mega",
	    "short_names": ["mega"],
	    "sort_order": 231
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIBRATION MODE",
	    "short_name": "vibration_mode",
	    "short_names": ["vibration_mode"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOBILE PHONE OFF",
	    "short_name": "mobile_phone_off",
	    "short_names": ["mobile_phone_off"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO MOBILE PHONES",
	    "short_name": "no_mobile_phones",
	    "short_names": ["no_mobile_phones"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANTENNA WITH BARS",
	    "short_name": "signal_strength",
	    "short_names": ["signal_strength"],
	    "sort_order": 126
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TWISTED RIGHTWARDS ARROWS",
	    "short_name": "twisted_rightwards_arrows",
	    "short_names": ["twisted_rightwards_arrows"],
	    "sort_order": 155
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCKWISE RIGHTWARDS AND LEFTWARDS OPEN CIRCLE ARROWS",
	    "short_name": "repeat",
	    "short_names": ["repeat"],
	    "sort_order": 156
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCKWISE RIGHTWARDS AND LEFTWARDS OPEN CIRCLE ARROWS WITH CIRCLED ONE OVERLAY",
	    "short_name": "repeat_one",
	    "short_names": ["repeat_one"],
	    "sort_order": 157
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCKWISE DOWNWARDS AND UPWARDS OPEN CIRCLE ARROWS",
	    "short_name": "arrows_clockwise",
	    "short_names": ["arrows_clockwise"],
	    "sort_order": 190
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANTICLOCKWISE DOWNWARDS AND UPWARDS OPEN CIRCLE ARROWS",
	    "short_name": "arrows_counterclockwise",
	    "short_names": ["arrows_counterclockwise"],
	    "sort_order": 173
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOW BRIGHTNESS SYMBOL",
	    "short_name": "low_brightness",
	    "short_names": ["low_brightness"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIGH BRIGHTNESS SYMBOL",
	    "short_name": "high_brightness",
	    "short_names": ["high_brightness"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAKER WITH CANCELLATION STROKE",
	    "short_name": "mute",
	    "short_names": ["mute"],
	    "sort_order": 230
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAKER",
	    "short_name": "speaker",
	    "short_names": ["speaker"],
	    "sort_order": 227
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAKER WITH ONE SOUND WAVE",
	    "short_name": "sound",
	    "short_names": ["sound"],
	    "sort_order": 228
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAKER WITH THREE SOUND WAVES",
	    "short_name": "loud_sound",
	    "short_names": ["loud_sound"],
	    "sort_order": 229
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BELL",
	    "short_name": "bell",
	    "short_names": ["bell"],
	    "sort_order": 233
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BELL WITH CANCELLATION STROKE",
	    "short_name": "no_bell",
	    "short_names": ["no_bell"],
	    "sort_order": 234
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RADIO BUTTON",
	    "short_name": "radio_button",
	    "short_names": ["radio_button"],
	    "sort_order": 206
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BACK WITH LEFTWARDS ARROW ABOVE",
	    "short_name": "back",
	    "short_names": ["back"],
	    "sort_order": 201
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "END WITH LEFTWARDS ARROW ABOVE",
	    "short_name": "end",
	    "short_names": ["end"],
	    "sort_order": 200
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ON WITH EXCLAMATION MARK WITH LEFT RIGHT ARROW ABOVE",
	    "short_name": "on",
	    "short_names": ["on"],
	    "sort_order": 202
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SOON WITH RIGHTWARDS ARROW ABOVE",
	    "short_name": "soon",
	    "short_names": ["soon"],
	    "sort_order": 204
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TOP WITH UPWARDS ARROW ABOVE",
	    "short_name": "top",
	    "short_names": ["top"],
	    "sort_order": 203
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO ONE UNDER EIGHTEEN SYMBOL",
	    "short_name": "underage",
	    "short_names": ["underage"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KEYCAP TEN",
	    "short_name": "keycap_ten",
	    "short_names": ["keycap_ten"],
	    "sort_order": 144
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INPUT SYMBOL FOR LATIN CAPITAL LETTERS",
	    "short_name": "capital_abcd",
	    "short_names": ["capital_abcd"],
	    "sort_order": 183
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INPUT SYMBOL FOR LATIN SMALL LETTERS",
	    "short_name": "abcd",
	    "short_names": ["abcd"],
	    "sort_order": 182
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INPUT SYMBOL FOR NUMBERS",
	    "short_name": "1234",
	    "short_names": ["1234"],
	    "sort_order": 145
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INPUT SYMBOL FOR SYMBOLS",
	    "short_name": "symbols",
	    "short_names": ["symbols"],
	    "sort_order": 184
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INPUT SYMBOL FOR LATIN LETTERS",
	    "short_name": "abc",
	    "short_names": ["abc"],
	    "sort_order": 181
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SIX POINTED STAR WITH MIDDLE DOT",
	    "short_name": "six_pointed_star",
	    "short_names": ["six_pointed_star"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE SYMBOL FOR BEGINNER",
	    "short_name": "beginner",
	    "short_names": ["beginner"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRIDENT EMBLEM",
	    "short_name": "trident",
	    "short_names": ["trident"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK SQUARE BUTTON",
	    "short_name": "black_square_button",
	    "short_names": ["black_square_button"],
	    "sort_order": 225
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE SQUARE BUTTON",
	    "short_name": "white_square_button",
	    "short_names": ["white_square_button"],
	    "sort_order": 226
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LARGE RED CIRCLE",
	    "short_name": "red_circle",
	    "short_names": ["red_circle"],
	    "sort_order": 209
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LARGE BLUE CIRCLE",
	    "short_name": "large_blue_circle",
	    "short_names": ["large_blue_circle"],
	    "sort_order": 210
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LARGE ORANGE DIAMOND",
	    "short_name": "large_orange_diamond",
	    "short_names": ["large_orange_diamond"],
	    "sort_order": 213
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LARGE BLUE DIAMOND",
	    "short_name": "large_blue_diamond",
	    "short_names": ["large_blue_diamond"],
	    "sort_order": 214
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMALL ORANGE DIAMOND",
	    "short_name": "small_orange_diamond",
	    "short_names": ["small_orange_diamond"],
	    "sort_order": 211
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMALL BLUE DIAMOND",
	    "short_name": "small_blue_diamond",
	    "short_names": ["small_blue_diamond"],
	    "sort_order": 212
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UP-POINTING RED TRIANGLE",
	    "short_name": "small_red_triangle",
	    "short_names": ["small_red_triangle"],
	    "sort_order": 215
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOWN-POINTING RED TRIANGLE",
	    "short_name": "small_red_triangle_down",
	    "short_names": ["small_red_triangle_down"],
	    "sort_order": 220
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UP-POINTING SMALL RED TRIANGLE",
	    "short_name": "arrow_up_small",
	    "short_names": ["arrow_up_small"],
	    "sort_order": 159
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOWN-POINTING SMALL RED TRIANGLE",
	    "short_name": "arrow_down_small",
	    "short_names": ["arrow_down_small"],
	    "sort_order": 160
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OM SYMBOL",
	    "short_name": "om_symbol",
	    "short_names": ["om_symbol"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "MENORAH WITH NINE BRANCHES",
	    "short_name": "menorah_with_nine_branches",
	    "short_names": ["menorah_with_nine_branches"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE ONE OCLOCK",
	    "short_name": "clock1",
	    "short_names": ["clock1"],
	    "sort_order": 246
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TWO OCLOCK",
	    "short_name": "clock2",
	    "short_names": ["clock2"],
	    "sort_order": 247
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE THREE OCLOCK",
	    "short_name": "clock3",
	    "short_names": ["clock3"],
	    "sort_order": 248
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE FOUR OCLOCK",
	    "short_name": "clock4",
	    "short_names": ["clock4"],
	    "sort_order": 249
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE FIVE OCLOCK",
	    "short_name": "clock5",
	    "short_names": ["clock5"],
	    "sort_order": 250
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE SIX OCLOCK",
	    "short_name": "clock6",
	    "short_names": ["clock6"],
	    "sort_order": 251
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE SEVEN OCLOCK",
	    "short_name": "clock7",
	    "short_names": ["clock7"],
	    "sort_order": 252
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE EIGHT OCLOCK",
	    "short_name": "clock8",
	    "short_names": ["clock8"],
	    "sort_order": 253
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE NINE OCLOCK",
	    "short_name": "clock9",
	    "short_names": ["clock9"],
	    "sort_order": 254
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TEN OCLOCK",
	    "short_name": "clock10",
	    "short_names": ["clock10"],
	    "sort_order": 255
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE ELEVEN OCLOCK",
	    "short_name": "clock11",
	    "short_names": ["clock11"],
	    "sort_order": 256
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TWELVE OCLOCK",
	    "short_name": "clock12",
	    "short_names": ["clock12"],
	    "sort_order": 257
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE ONE-THIRTY",
	    "short_name": "clock130",
	    "short_names": ["clock130"],
	    "sort_order": 258
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TWO-THIRTY",
	    "short_name": "clock230",
	    "short_names": ["clock230"],
	    "sort_order": 259
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE THREE-THIRTY",
	    "short_name": "clock330",
	    "short_names": ["clock330"],
	    "sort_order": 260
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE FOUR-THIRTY",
	    "short_name": "clock430",
	    "short_names": ["clock430"],
	    "sort_order": 261
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE FIVE-THIRTY",
	    "short_name": "clock530",
	    "short_names": ["clock530"],
	    "sort_order": 262
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE SIX-THIRTY",
	    "short_name": "clock630",
	    "short_names": ["clock630"],
	    "sort_order": 263
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE SEVEN-THIRTY",
	    "short_name": "clock730",
	    "short_names": ["clock730"],
	    "sort_order": 264
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE EIGHT-THIRTY",
	    "short_name": "clock830",
	    "short_names": ["clock830"],
	    "sort_order": 265
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE NINE-THIRTY",
	    "short_name": "clock930",
	    "short_names": ["clock930"],
	    "sort_order": 266
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TEN-THIRTY",
	    "short_name": "clock1030",
	    "short_names": ["clock1030"],
	    "sort_order": 267
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE ELEVEN-THIRTY",
	    "short_name": "clock1130",
	    "short_names": ["clock1130"],
	    "sort_order": 268
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOCK FACE TWELVE-THIRTY",
	    "short_name": "clock1230",
	    "short_names": ["clock1230"],
	    "sort_order": 269
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RIGHT ANGER BUBBLE",
	    "short_name": "right_anger_bubble",
	    "short_names": ["right_anger_bubble"],
	    "sort_order": 244
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO ENTRY SIGN",
	    "short_name": "no_entry_sign",
	    "short_names": ["no_entry_sign"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO SMOKING SYMBOL",
	    "short_name": "no_smoking",
	    "short_names": ["no_smoking"],
	    "sort_order": 116
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PUT LITTER IN ITS PLACE SYMBOL",
	    "short_name": "put_litter_in_its_place",
	    "short_names": ["put_litter_in_its_place"],
	    "sort_order": 124
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DO NOT LITTER SYMBOL",
	    "short_name": "do_not_litter",
	    "short_names": ["do_not_litter"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POTABLE WATER SYMBOL",
	    "short_name": "potable_water",
	    "short_names": ["potable_water"],
	    "sort_order": 119
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NON-POTABLE WATER SYMBOL",
	    "short_name": "non-potable_water",
	    "short_names": ["non-potable_water"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO BICYCLES",
	    "short_name": "no_bicycles",
	    "short_names": ["no_bicycles"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NO PEDESTRIANS",
	    "short_name": "no_pedestrians",
	    "short_names": ["no_pedestrians"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHILDREN CROSSING",
	    "short_name": "children_crossing",
	    "short_names": ["children_crossing"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MENS SYMBOL",
	    "short_name": "mens",
	    "short_names": ["mens"],
	    "sort_order": 120
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMENS SYMBOL",
	    "short_name": "womens",
	    "short_names": ["womens"],
	    "sort_order": 121
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RESTROOM",
	    "short_name": "restroom",
	    "short_names": ["restroom"],
	    "sort_order": 123
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BABY SYMBOL",
	    "short_name": "baby_symbol",
	    "short_names": ["baby_symbol"],
	    "sort_order": 122
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WATER CLOSET",
	    "short_name": "wc",
	    "short_names": ["wc"],
	    "sort_order": 117
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PASSPORT CONTROL",
	    "short_name": "passport_control",
	    "short_names": ["passport_control"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CUSTOMS",
	    "short_name": "customs",
	    "short_names": ["customs"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BAGGAGE CLAIM",
	    "short_name": "baggage_claim",
	    "short_names": ["baggage_claim"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEFT LUGGAGE",
	    "short_name": "left_luggage",
	    "short_names": ["left_luggage"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "PLACE OF WORSHIP",
	    "short_name": "place_of_worship",
	    "short_names": ["place_of_worship"],
	    "sort_order": 26
	  }],
	  "Objects": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WATCH",
	    "short_name": "watch",
	    "short_names": ["watch"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOURGLASS",
	    "short_name": "hourglass",
	    "short_names": ["hourglass"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "KEYBOARD",
	    "short_name": "keyboard",
	    "short_names": ["keyboard"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ALARM CLOCK",
	    "short_name": "alarm_clock",
	    "short_names": ["alarm_clock"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "STOPWATCH",
	    "short_name": "stopwatch",
	    "short_names": ["stopwatch"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "TIMER CLOCK",
	    "short_name": "timer_clock",
	    "short_names": ["timer_clock"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOURGLASS WITH FLOWING SAND",
	    "short_name": "hourglass_flowing_sand",
	    "short_names": ["hourglass_flowing_sand"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK TELEPHONE",
	    "short_name": "phone",
	    "short_names": ["phone", "telephone"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SKULL AND CROSSBONES",
	    "short_name": "skull_and_crossbones",
	    "short_names": ["skull_and_crossbones"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "HAMMER AND PICK",
	    "short_name": "hammer_and_pick",
	    "short_names": ["hammer_and_pick"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "CROSSED SWORDS",
	    "short_name": "crossed_swords",
	    "short_names": ["crossed_swords"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SCALES",
	    "short_name": "scales",
	    "short_names": ["scales"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ALEMBIC",
	    "short_name": "alembic",
	    "short_names": ["alembic"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "GEAR",
	    "short_name": "gear",
	    "short_names": ["gear"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "COFFIN",
	    "short_name": "coffin",
	    "short_names": ["coffin"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FUNERAL URN",
	    "short_name": "funeral_urn",
	    "short_names": ["funeral_urn"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "PICK",
	    "short_name": "pick",
	    "short_names": ["pick"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "CHAINS",
	    "short_name": "chains",
	    "short_names": ["chains"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "UMBRELLA ON GROUND",
	    "short_name": "umbrella_on_ground",
	    "short_names": ["umbrella_on_ground"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK SCISSORS",
	    "short_name": "scissors",
	    "short_names": ["scissors"],
	    "sort_order": 158
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ENVELOPE",
	    "short_name": "email",
	    "short_names": ["email", "envelope"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PENCIL",
	    "short_name": "pencil2",
	    "short_names": ["pencil2"],
	    "sort_order": 174
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK NIB",
	    "short_name": "black_nib",
	    "short_names": ["black_nib"],
	    "sort_order": 172
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "THERMOMETER",
	    "short_name": "thermometer",
	    "short_names": ["thermometer"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RIBBON",
	    "short_name": "ribbon",
	    "short_names": ["ribbon"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WRAPPED PRESENT",
	    "short_name": "gift",
	    "short_names": ["gift"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BALLOON",
	    "short_name": "balloon",
	    "short_names": ["balloon"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PARTY POPPER",
	    "short_name": "tada",
	    "short_names": ["tada"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONFETTI BALL",
	    "short_name": "confetti_ball",
	    "short_names": ["confetti_ball"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CROSSED FLAGS",
	    "short_name": "crossed_flags",
	    "short_names": ["crossed_flags"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE DOLLS",
	    "short_name": "dolls",
	    "short_names": ["dolls"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CARP STREAMER",
	    "short_name": "flags",
	    "short_names": ["flags"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WIND CHIME",
	    "short_name": "wind_chime",
	    "short_names": ["wind_chime"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STUDIO MICROPHONE",
	    "short_name": "studio_microphone",
	    "short_names": ["studio_microphone"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEVEL SLIDER",
	    "short_name": "level_slider",
	    "short_names": ["level_slider"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONTROL KNOBS",
	    "short_name": "control_knobs",
	    "short_names": ["control_knobs"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FILM FRAMES",
	    "short_name": "film_frames",
	    "short_names": ["film_frames"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOVIE CAMERA",
	    "short_name": "movie_camera",
	    "short_names": ["movie_camera"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "IZAKAYA LANTERN",
	    "short_name": "izakaya_lantern",
	    "short_names": ["izakaya_lantern", "lantern"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAVING WHITE FLAG",
	    "short_name": "waving_white_flag",
	    "short_names": ["waving_white_flag"],
	    "sort_order": 164
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAVING BLACK FLAG",
	    "short_name": "waving_black_flag",
	    "short_names": ["waving_black_flag"],
	    "sort_order": 165
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LABEL",
	    "short_name": "label",
	    "short_names": ["label"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "AMPHORA",
	    "short_name": "amphora",
	    "short_names": ["amphora"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BARBER POLE",
	    "short_name": "barber",
	    "short_names": ["barber"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SYRINGE",
	    "short_name": "syringe",
	    "short_names": ["syringe"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PILL",
	    "short_name": "pill",
	    "short_names": ["pill"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOVE LETTER",
	    "short_name": "love_letter",
	    "short_names": ["love_letter"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GEM STONE",
	    "short_name": "gem",
	    "short_names": ["gem"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ELECTRIC LIGHT BULB",
	    "short_name": "bulb",
	    "short_names": ["bulb"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOMB",
	    "short_name": "bomb",
	    "short_names": ["bomb"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MONEY BAG",
	    "short_name": "moneybag",
	    "short_names": ["moneybag"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CREDIT CARD",
	    "short_name": "credit_card",
	    "short_names": ["credit_card"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANKNOTE WITH YEN SIGN",
	    "short_name": "yen",
	    "short_names": ["yen"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANKNOTE WITH DOLLAR SIGN",
	    "short_name": "dollar",
	    "short_names": ["dollar"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANKNOTE WITH EURO SIGN",
	    "short_name": "euro",
	    "short_names": ["euro"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANKNOTE WITH POUND SIGN",
	    "short_name": "pound",
	    "short_names": ["pound"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MONEY WITH WINGS",
	    "short_name": "money_with_wings",
	    "short_names": ["money_with_wings"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSONAL COMPUTER",
	    "short_name": "computer",
	    "short_names": ["computer"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MINIDISC",
	    "short_name": "minidisc",
	    "short_names": ["minidisc"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FLOPPY DISK",
	    "short_name": "floppy_disk",
	    "short_names": ["floppy_disk"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPTICAL DISC",
	    "short_name": "cd",
	    "short_names": ["cd"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DVD",
	    "short_name": "dvd",
	    "short_names": ["dvd"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FILE FOLDER",
	    "short_name": "file_folder",
	    "short_names": ["file_folder"],
	    "sort_order": 141
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN FILE FOLDER",
	    "short_name": "open_file_folder",
	    "short_names": ["open_file_folder"],
	    "sort_order": 142
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PAGE WITH CURL",
	    "short_name": "page_with_curl",
	    "short_names": ["page_with_curl"],
	    "sort_order": 126
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PAGE FACING UP",
	    "short_name": "page_facing_up",
	    "short_names": ["page_facing_up"],
	    "sort_order": 131
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CALENDAR",
	    "short_name": "date",
	    "short_names": ["date"],
	    "sort_order": 132
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TEAR-OFF CALENDAR",
	    "short_name": "calendar",
	    "short_names": ["calendar"],
	    "sort_order": 133
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CARD INDEX",
	    "short_name": "card_index",
	    "short_names": ["card_index"],
	    "sort_order": 135
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHART WITH UPWARDS TREND",
	    "short_name": "chart_with_upwards_trend",
	    "short_names": ["chart_with_upwards_trend"],
	    "sort_order": 129
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHART WITH DOWNWARDS TREND",
	    "short_name": "chart_with_downwards_trend",
	    "short_names": ["chart_with_downwards_trend"],
	    "sort_order": 130
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BAR CHART",
	    "short_name": "bar_chart",
	    "short_names": ["bar_chart"],
	    "sort_order": 128
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLIPBOARD",
	    "short_name": "clipboard",
	    "short_names": ["clipboard"],
	    "sort_order": 139
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PUSHPIN",
	    "short_name": "pushpin",
	    "short_names": ["pushpin"],
	    "sort_order": 161
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROUND PUSHPIN",
	    "short_name": "round_pushpin",
	    "short_names": ["round_pushpin"],
	    "sort_order": 162
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PAPERCLIP",
	    "short_name": "paperclip",
	    "short_names": ["paperclip"],
	    "sort_order": 156
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STRAIGHT RULER",
	    "short_name": "straight_ruler",
	    "short_names": ["straight_ruler"],
	    "sort_order": 160
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRIANGULAR RULER",
	    "short_name": "triangular_ruler",
	    "short_names": ["triangular_ruler"],
	    "sort_order": 159
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOOKMARK TABS",
	    "short_name": "bookmark_tabs",
	    "short_names": ["bookmark_tabs"],
	    "sort_order": 127
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEDGER",
	    "short_name": "ledger",
	    "short_names": ["ledger"],
	    "sort_order": 152
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NOTEBOOK",
	    "short_name": "notebook",
	    "short_names": ["notebook"],
	    "sort_order": 146
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NOTEBOOK WITH DECORATIVE COVER",
	    "short_name": "notebook_with_decorative_cover",
	    "short_names": ["notebook_with_decorative_cover"],
	    "sort_order": 151
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOSED BOOK",
	    "short_name": "closed_book",
	    "short_names": ["closed_book"],
	    "sort_order": 147
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN BOOK",
	    "short_name": "book",
	    "short_names": ["book", "open_book"],
	    "sort_order": 154
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GREEN BOOK",
	    "short_name": "green_book",
	    "short_names": ["green_book"],
	    "sort_order": 148
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLUE BOOK",
	    "short_name": "blue_book",
	    "short_names": ["blue_book"],
	    "sort_order": 149
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ORANGE BOOK",
	    "short_name": "orange_book",
	    "short_names": ["orange_book"],
	    "sort_order": 150
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOOKS",
	    "short_name": "books",
	    "short_names": ["books"],
	    "sort_order": 153
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SCROLL",
	    "short_name": "scroll",
	    "short_names": ["scroll"],
	    "sort_order": 125
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MEMO",
	    "short_name": "memo",
	    "short_names": ["memo", "pencil"],
	    "sort_order": 173
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TELEPHONE RECEIVER",
	    "short_name": "telephone_receiver",
	    "short_names": ["telephone_receiver"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PAGER",
	    "short_name": "pager",
	    "short_names": ["pager"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FAX MACHINE",
	    "short_name": "fax",
	    "short_names": ["fax"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SATELLITE ANTENNA",
	    "short_name": "satellite",
	    "short_names": ["satellite"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OUTBOX TRAY",
	    "short_name": "outbox_tray",
	    "short_names": ["outbox_tray"],
	    "sort_order": 124
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INBOX TRAY",
	    "short_name": "inbox_tray",
	    "short_names": ["inbox_tray"],
	    "sort_order": 123
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PACKAGE",
	    "short_name": "package",
	    "short_names": ["package"],
	    "sort_order": 121
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "E-MAIL SYMBOL",
	    "short_name": "e-mail",
	    "short_names": ["e-mail"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INCOMING ENVELOPE",
	    "short_name": "incoming_envelope",
	    "short_names": ["incoming_envelope"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ENVELOPE WITH DOWNWARDS ARROW ABOVE",
	    "short_name": "envelope_with_arrow",
	    "short_names": ["envelope_with_arrow"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOSED MAILBOX WITH LOWERED FLAG",
	    "short_name": "mailbox_closed",
	    "short_names": ["mailbox_closed"],
	    "sort_order": 117
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOSED MAILBOX WITH RAISED FLAG",
	    "short_name": "mailbox",
	    "short_names": ["mailbox"],
	    "sort_order": 118
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN MAILBOX WITH RAISED FLAG",
	    "short_name": "mailbox_with_mail",
	    "short_names": ["mailbox_with_mail"],
	    "sort_order": 119
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN MAILBOX WITH LOWERED FLAG",
	    "short_name": "mailbox_with_no_mail",
	    "short_names": ["mailbox_with_no_mail"],
	    "sort_order": 120
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POSTBOX",
	    "short_name": "postbox",
	    "short_names": ["postbox"],
	    "sort_order": 116
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POSTAL HORN",
	    "short_name": "postal_horn",
	    "short_names": ["postal_horn"],
	    "sort_order": 122
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEWSPAPER",
	    "short_name": "newspaper",
	    "short_names": ["newspaper"],
	    "sort_order": 145
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOBILE PHONE",
	    "short_name": "iphone",
	    "short_names": ["iphone"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOBILE PHONE WITH RIGHTWARDS ARROW AT LEFT",
	    "short_name": "calling",
	    "short_names": ["calling"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAMERA",
	    "short_name": "camera",
	    "short_names": ["camera"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAMERA WITH FLASH",
	    "short_name": "camera_with_flash",
	    "short_names": ["camera_with_flash"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIDEO CAMERA",
	    "short_name": "video_camera",
	    "short_names": ["video_camera"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TELEVISION",
	    "short_name": "tv",
	    "short_names": ["tv"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RADIO",
	    "short_name": "radio",
	    "short_names": ["radio"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIDEOCASSETTE",
	    "short_name": "vhs",
	    "short_names": ["vhs"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FILM PROJECTOR",
	    "short_name": "film_projector",
	    "short_names": ["film_projector"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "PRAYER BEADS",
	    "short_name": "prayer_beads",
	    "short_names": ["prayer_beads"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BATTERY",
	    "short_name": "battery",
	    "short_names": ["battery"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ELECTRIC PLUG",
	    "short_name": "electric_plug",
	    "short_names": ["electric_plug"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEFT-POINTING MAGNIFYING GLASS",
	    "short_name": "mag",
	    "short_names": ["mag"],
	    "sort_order": 177
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RIGHT-POINTING MAGNIFYING GLASS",
	    "short_name": "mag_right",
	    "short_names": ["mag_right"],
	    "sort_order": 178
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOCK WITH INK PEN",
	    "short_name": "lock_with_ink_pen",
	    "short_names": ["lock_with_ink_pen"],
	    "sort_order": 169
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOSED LOCK WITH KEY",
	    "short_name": "closed_lock_with_key",
	    "short_names": ["closed_lock_with_key"],
	    "sort_order": 166
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KEY",
	    "short_name": "key",
	    "short_names": ["key"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOCK",
	    "short_name": "lock",
	    "short_names": ["lock"],
	    "sort_order": 167
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN LOCK",
	    "short_name": "unlock",
	    "short_names": ["unlock"],
	    "sort_order": 168
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOOKMARK",
	    "short_name": "bookmark",
	    "short_names": ["bookmark"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LINK SYMBOL",
	    "short_name": "link",
	    "short_names": ["link"],
	    "sort_order": 155
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ELECTRIC TORCH",
	    "short_name": "flashlight",
	    "short_names": ["flashlight"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WRENCH",
	    "short_name": "wrench",
	    "short_names": ["wrench"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAMMER",
	    "short_name": "hammer",
	    "short_names": ["hammer"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NUT AND BOLT",
	    "short_name": "nut_and_bolt",
	    "short_names": ["nut_and_bolt"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOCHO",
	    "short_name": "hocho",
	    "short_names": ["hocho", "knife"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PISTOL",
	    "short_name": "gun",
	    "short_names": ["gun"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MICROSCOPE",
	    "short_name": "microscope",
	    "short_names": ["microscope"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TELESCOPE",
	    "short_name": "telescope",
	    "short_names": ["telescope"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CRYSTAL BALL",
	    "short_name": "crystal_ball",
	    "short_names": ["crystal_ball"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CANDLE",
	    "short_name": "candle",
	    "short_names": ["candle"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MANTELPIECE CLOCK",
	    "short_name": "mantelpiece_clock",
	    "short_names": ["mantelpiece_clock"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOLE",
	    "short_name": "hole",
	    "short_names": ["hole"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JOYSTICK",
	    "short_name": "joystick",
	    "short_names": ["joystick"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LINKED PAPERCLIPS",
	    "short_name": "linked_paperclips",
	    "short_names": ["linked_paperclips"],
	    "sort_order": 157
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOWER LEFT BALLPOINT PEN",
	    "short_name": "lower_left_ballpoint_pen",
	    "short_names": ["lower_left_ballpoint_pen"],
	    "sort_order": 170
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOWER LEFT FOUNTAIN PEN",
	    "short_name": "lower_left_fountain_pen",
	    "short_names": ["lower_left_fountain_pen"],
	    "sort_order": 171
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOWER LEFT PAINTBRUSH",
	    "short_name": "lower_left_paintbrush",
	    "short_names": ["lower_left_paintbrush"],
	    "sort_order": 176
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOWER LEFT CRAYON",
	    "short_name": "lower_left_crayon",
	    "short_names": ["lower_left_crayon"],
	    "sort_order": 175
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DESKTOP COMPUTER",
	    "short_name": "desktop_computer",
	    "short_names": ["desktop_computer"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PRINTER",
	    "short_name": "printer",
	    "short_names": ["printer"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "THREE BUTTON MOUSE",
	    "short_name": "three_button_mouse",
	    "short_names": ["three_button_mouse"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRACKBALL",
	    "short_name": "trackball",
	    "short_names": ["trackball"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FRAME WITH PICTURE",
	    "short_name": "frame_with_picture",
	    "short_names": ["frame_with_picture"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CARD INDEX DIVIDERS",
	    "short_name": "card_index_dividers",
	    "short_names": ["card_index_dividers"],
	    "sort_order": 143
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CARD FILE BOX",
	    "short_name": "card_file_box",
	    "short_names": ["card_file_box"],
	    "sort_order": 136
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FILE CABINET",
	    "short_name": "file_cabinet",
	    "short_names": ["file_cabinet"],
	    "sort_order": 138
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WASTEBASKET",
	    "short_name": "wastebasket",
	    "short_names": ["wastebasket"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPIRAL NOTE PAD",
	    "short_name": "spiral_note_pad",
	    "short_names": ["spiral_note_pad"],
	    "sort_order": 140
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPIRAL CALENDAR PAD",
	    "short_name": "spiral_calendar_pad",
	    "short_names": ["spiral_calendar_pad"],
	    "sort_order": 134
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COMPRESSION",
	    "short_name": "compression",
	    "short_names": ["compression"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OLD KEY",
	    "short_name": "old_key",
	    "short_names": ["old_key"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROLLED-UP NEWSPAPER",
	    "short_name": "rolled_up_newspaper",
	    "short_names": ["rolled_up_newspaper"],
	    "sort_order": 144
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DAGGER KNIFE",
	    "short_name": "dagger_knife",
	    "short_names": ["dagger_knife"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BALLOT BOX WITH BALLOT",
	    "short_name": "ballot_box_with_ballot",
	    "short_names": ["ballot_box_with_ballot"],
	    "sort_order": 137
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WORLD MAP",
	    "short_name": "world_map",
	    "short_names": ["world_map"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOYAI",
	    "short_name": "moyai",
	    "short_names": ["moyai"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRIANGULAR FLAG ON POST",
	    "short_name": "triangular_flag_on_post",
	    "short_names": ["triangular_flag_on_post"],
	    "sort_order": 163
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOOR",
	    "short_name": "door",
	    "short_names": ["door"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMOKING SYMBOL",
	    "short_name": "smoking",
	    "short_names": ["smoking"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TOILET",
	    "short_name": "toilet",
	    "short_names": ["toilet"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHOWER",
	    "short_name": "shower",
	    "short_names": ["shower"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BATHTUB",
	    "short_name": "bathtub",
	    "short_names": ["bathtub"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COUCH AND LAMP",
	    "short_name": "couch_and_lamp",
	    "short_names": ["couch_and_lamp"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLEEPING ACCOMMODATION",
	    "short_name": "sleeping_accommodation",
	    "short_names": ["sleeping_accommodation"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHOPPING BAGS",
	    "short_name": "shopping_bags",
	    "short_names": ["shopping_bags"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BELLHOP BELL",
	    "short_name": "bellhop_bell",
	    "short_names": ["bellhop_bell"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BED",
	    "short_name": "bed",
	    "short_names": ["bed"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAMMER AND WRENCH",
	    "short_name": "hammer_and_wrench",
	    "short_names": ["hammer_and_wrench"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHIELD",
	    "short_name": "shield",
	    "short_names": ["shield"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OIL DRUM",
	    "short_name": "oil_drum",
	    "short_names": ["oil_drum"],
	    "sort_order": 45
	  }],
	  "Nature": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLACK SUN WITH RAYS",
	    "short_name": "sunny",
	    "short_names": ["sunny"],
	    "sort_order": 123
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOUD",
	    "short_name": "cloud",
	    "short_names": ["cloud"],
	    "sort_order": 128
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "UMBRELLA",
	    "short_name": "umbrella",
	    "short_names": ["umbrella"],
	    "sort_order": 143
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SNOWMAN",
	    "short_name": "snowman",
	    "short_names": ["snowman"],
	    "sort_order": 137
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "COMET",
	    "short_name": "comet",
	    "short_names": ["comet"],
	    "sort_order": 122
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UMBRELLA WITH RAIN DROPS",
	    "short_name": "umbrella",
	    "short_names": ["umbrella"],
	    "sort_order": 144
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SHAMROCK",
	    "short_name": "shamrock",
	    "short_names": ["shamrock"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIGH VOLTAGE SIGN",
	    "short_name": "zap",
	    "short_names": ["zap"],
	    "sort_order": 132
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNOWMAN WITHOUT SNOW",
	    "short_name": "snowman",
	    "short_names": ["snowman"],
	    "sort_order": 138
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUN BEHIND CLOUD",
	    "short_name": "partly_sunny",
	    "short_names": ["partly_sunny"],
	    "sort_order": 125
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "THUNDER CLOUD AND RAIN",
	    "short_name": "thunder_cloud_and_rain",
	    "short_names": ["thunder_cloud_and_rain"],
	    "sort_order": 130
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPARKLES",
	    "short_name": "sparkles",
	    "short_names": ["sparkles"],
	    "sort_order": 121
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNOWFLAKE",
	    "short_name": "snowflake",
	    "short_names": ["snowflake"],
	    "sort_order": 135
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE MEDIUM STAR",
	    "short_name": "star",
	    "short_names": ["star"],
	    "sort_order": 118
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WATER WAVE",
	    "short_name": "ocean",
	    "short_names": ["ocean"],
	    "sort_order": 147
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EARTH GLOBE EUROPE-AFRICA",
	    "short_name": "earth_africa",
	    "short_names": ["earth_africa"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EARTH GLOBE AMERICAS",
	    "short_name": "earth_americas",
	    "short_names": ["earth_americas"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EARTH GLOBE ASIA-AUSTRALIA",
	    "short_name": "earth_asia",
	    "short_names": ["earth_asia"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEW MOON SYMBOL",
	    "short_name": "new_moon",
	    "short_names": ["new_moon"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAXING CRESCENT MOON SYMBOL",
	    "short_name": "waxing_crescent_moon",
	    "short_names": ["waxing_crescent_moon"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIRST QUARTER MOON SYMBOL",
	    "short_name": "first_quarter_moon",
	    "short_names": ["first_quarter_moon"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAXING GIBBOUS MOON SYMBOL",
	    "short_name": "moon",
	    "short_names": ["moon", "waxing_gibbous_moon"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FULL MOON SYMBOL",
	    "short_name": "full_moon",
	    "short_names": ["full_moon"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WANING GIBBOUS MOON SYMBOL",
	    "short_name": "waning_gibbous_moon",
	    "short_names": ["waning_gibbous_moon"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LAST QUARTER MOON SYMBOL",
	    "short_name": "last_quarter_moon",
	    "short_names": ["last_quarter_moon"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WANING CRESCENT MOON SYMBOL",
	    "short_name": "waning_crescent_moon",
	    "short_names": ["waning_crescent_moon"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CRESCENT MOON",
	    "short_name": "crescent_moon",
	    "short_names": ["crescent_moon"],
	    "sort_order": 117
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEW MOON WITH FACE",
	    "short_name": "new_moon_with_face",
	    "short_names": ["new_moon_with_face"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIRST QUARTER MOON WITH FACE",
	    "short_name": "first_quarter_moon_with_face",
	    "short_names": ["first_quarter_moon_with_face"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LAST QUARTER MOON WITH FACE",
	    "short_name": "last_quarter_moon_with_face",
	    "short_names": ["last_quarter_moon_with_face"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FULL MOON WITH FACE",
	    "short_name": "full_moon_with_face",
	    "short_names": ["full_moon_with_face"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUN WITH FACE",
	    "short_name": "sun_with_face",
	    "short_names": ["sun_with_face"],
	    "sort_order": 116
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GLOWING STAR",
	    "short_name": "star2",
	    "short_names": ["star2"],
	    "sort_order": 119
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WHITE SUN WITH SMALL CLOUD",
	    "short_name": "mostly_sunny",
	    "short_names": ["mostly_sunny", "sun_small_cloud"],
	    "sort_order": 124
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WHITE SUN BEHIND CLOUD",
	    "short_name": "barely_sunny",
	    "short_names": ["barely_sunny", "sun_behind_cloud"],
	    "sort_order": 126
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WHITE SUN BEHIND CLOUD WITH RAIN",
	    "short_name": "partly_sunny_rain",
	    "short_names": ["partly_sunny_rain", "sun_behind_rain_cloud"],
	    "sort_order": 127
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOUD WITH RAIN",
	    "short_name": "rain_cloud",
	    "short_names": ["rain_cloud"],
	    "sort_order": 129
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOUD WITH SNOW",
	    "short_name": "snow_cloud",
	    "short_names": ["snow_cloud"],
	    "sort_order": 136
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOUD WITH LIGHTNING",
	    "short_name": "lightning",
	    "short_names": ["lightning", "lightning_cloud"],
	    "sort_order": 131
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOUD WITH TORNADO",
	    "short_name": "tornado",
	    "short_names": ["tornado", "tornado_cloud"],
	    "sort_order": 141
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FOG",
	    "short_name": "fog",
	    "short_names": ["fog"],
	    "sort_order": 142
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WIND BLOWING FACE",
	    "short_name": "wind_blowing_face",
	    "short_names": ["wind_blowing_face"],
	    "sort_order": 139
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHESTNUT",
	    "short_name": "chestnut",
	    "short_names": ["chestnut"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SEEDLING",
	    "short_name": "seedling",
	    "short_names": ["seedling"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EVERGREEN TREE",
	    "short_name": "evergreen_tree",
	    "short_names": ["evergreen_tree"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DECIDUOUS TREE",
	    "short_name": "deciduous_tree",
	    "short_names": ["deciduous_tree"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PALM TREE",
	    "short_name": "palm_tree",
	    "short_names": ["palm_tree"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CACTUS",
	    "short_name": "cactus",
	    "short_names": ["cactus"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TULIP",
	    "short_name": "tulip",
	    "short_names": ["tulip"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHERRY BLOSSOM",
	    "short_name": "cherry_blossom",
	    "short_names": ["cherry_blossom"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROSE",
	    "short_name": "rose",
	    "short_names": ["rose"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIBISCUS",
	    "short_name": "hibiscus",
	    "short_names": ["hibiscus"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUNFLOWER",
	    "short_name": "sunflower",
	    "short_names": ["sunflower"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLOSSOM",
	    "short_name": "blossom",
	    "short_names": ["blossom"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EAR OF RICE",
	    "short_name": "ear_of_rice",
	    "short_names": ["ear_of_rice"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HERB",
	    "short_name": "herb",
	    "short_names": ["herb"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FOUR LEAF CLOVER",
	    "short_name": "four_leaf_clover",
	    "short_names": ["four_leaf_clover"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAPLE LEAF",
	    "short_name": "maple_leaf",
	    "short_names": ["maple_leaf"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FALLEN LEAF",
	    "short_name": "fallen_leaf",
	    "short_names": ["fallen_leaf"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEAF FLUTTERING IN WIND",
	    "short_name": "leaves",
	    "short_names": ["leaves"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MUSHROOM",
	    "short_name": "mushroom",
	    "short_names": ["mushroom"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JACK-O-LANTERN",
	    "short_name": "jack_o_lantern",
	    "short_names": ["jack_o_lantern"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHRISTMAS TREE",
	    "short_name": "christmas_tree",
	    "short_names": ["christmas_tree"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TANABATA TREE",
	    "short_name": "tanabata_tree",
	    "short_names": ["tanabata_tree"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PINE DECORATION",
	    "short_name": "bamboo",
	    "short_names": ["bamboo"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAT",
	    "short_name": "rat",
	    "short_names": ["rat"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUSE",
	    "short_name": "mouse2",
	    "short_names": ["mouse2"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OX",
	    "short_name": "ox",
	    "short_names": ["ox"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WATER BUFFALO",
	    "short_name": "water_buffalo",
	    "short_names": ["water_buffalo"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COW",
	    "short_name": "cow2",
	    "short_names": ["cow2"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TIGER",
	    "short_name": "tiger2",
	    "short_names": ["tiger2"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEOPARD",
	    "short_name": "leopard",
	    "short_names": ["leopard"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RABBIT",
	    "short_name": "rabbit2",
	    "short_names": ["rabbit2"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAT",
	    "short_name": "cat2",
	    "short_names": ["cat2"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DRAGON",
	    "short_name": "dragon",
	    "short_names": ["dragon"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CROCODILE",
	    "short_name": "crocodile",
	    "short_names": ["crocodile"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHALE",
	    "short_name": "whale2",
	    "short_names": ["whale2"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNAIL",
	    "short_name": "snail",
	    "short_names": ["snail"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNAKE",
	    "short_name": "snake",
	    "short_names": ["snake"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HORSE",
	    "short_name": "racehorse",
	    "short_names": ["racehorse"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAM",
	    "short_name": "ram",
	    "short_names": ["ram"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GOAT",
	    "short_name": "goat",
	    "short_names": ["goat"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHEEP",
	    "short_name": "sheep",
	    "short_names": ["sheep"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MONKEY",
	    "short_name": "monkey",
	    "short_names": ["monkey"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROOSTER",
	    "short_name": "rooster",
	    "short_names": ["rooster"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHICKEN",
	    "short_name": "chicken",
	    "short_names": ["chicken"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOG",
	    "short_name": "dog2",
	    "short_names": ["dog2"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PIG",
	    "short_name": "pig2",
	    "short_names": ["pig2"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOAR",
	    "short_name": "boar",
	    "short_names": ["boar"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ELEPHANT",
	    "short_name": "elephant",
	    "short_names": ["elephant"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OCTOPUS",
	    "short_name": "octopus",
	    "short_names": ["octopus"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPIRAL SHELL",
	    "short_name": "shell",
	    "short_names": ["shell"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUG",
	    "short_name": "bug",
	    "short_names": ["bug"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANT",
	    "short_name": "ant",
	    "short_names": ["ant"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HONEYBEE",
	    "short_name": "bee",
	    "short_names": ["bee", "honeybee"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LADY BEETLE",
	    "short_name": "beetle",
	    "short_names": ["beetle"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FISH",
	    "short_name": "fish",
	    "short_names": ["fish"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TROPICAL FISH",
	    "short_name": "tropical_fish",
	    "short_names": ["tropical_fish"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BLOWFISH",
	    "short_name": "blowfish",
	    "short_names": ["blowfish"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TURTLE",
	    "short_name": "turtle",
	    "short_names": ["turtle"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HATCHING CHICK",
	    "short_name": "hatching_chick",
	    "short_names": ["hatching_chick"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BABY CHICK",
	    "short_name": "baby_chick",
	    "short_names": ["baby_chick"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FRONT-FACING BABY CHICK",
	    "short_name": "hatched_chick",
	    "short_names": ["hatched_chick"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BIRD",
	    "short_name": "bird",
	    "short_names": ["bird"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PENGUIN",
	    "short_name": "penguin",
	    "short_names": ["penguin"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KOALA",
	    "short_name": "koala",
	    "short_names": ["koala"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POODLE",
	    "short_name": "poodle",
	    "short_names": ["poodle"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DROMEDARY CAMEL",
	    "short_name": "dromedary_camel",
	    "short_names": ["dromedary_camel"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BACTRIAN CAMEL",
	    "short_name": "camel",
	    "short_names": ["camel"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOLPHIN",
	    "short_name": "dolphin",
	    "short_names": ["dolphin", "flipper"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUSE FACE",
	    "short_name": "mouse",
	    "short_names": ["mouse"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COW FACE",
	    "short_name": "cow",
	    "short_names": ["cow"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TIGER FACE",
	    "short_name": "tiger",
	    "short_names": ["tiger"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RABBIT FACE",
	    "short_name": "rabbit",
	    "short_names": ["rabbit"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAT FACE",
	    "short_name": "cat",
	    "short_names": ["cat"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DRAGON FACE",
	    "short_name": "dragon_face",
	    "short_names": ["dragon_face"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPOUTING WHALE",
	    "short_name": "whale",
	    "short_names": ["whale"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HORSE FACE",
	    "short_name": "horse",
	    "short_names": ["horse"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MONKEY FACE",
	    "short_name": "monkey_face",
	    "short_names": ["monkey_face"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOG FACE",
	    "short_name": "dog",
	    "short_names": ["dog"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PIG FACE",
	    "short_name": "pig",
	    "short_names": ["pig"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FROG FACE",
	    "short_name": "frog",
	    "short_names": ["frog"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAMSTER FACE",
	    "short_name": "hamster",
	    "short_names": ["hamster"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOLF FACE",
	    "short_name": "wolf",
	    "short_names": ["wolf"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BEAR FACE",
	    "short_name": "bear",
	    "short_names": ["bear"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PANDA FACE",
	    "short_name": "panda_face",
	    "short_names": ["panda_face"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PIG NOSE",
	    "short_name": "pig_nose",
	    "short_names": ["pig_nose"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PAW PRINTS",
	    "short_name": "feet",
	    "short_names": ["feet", "paw_prints"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHIPMUNK",
	    "short_name": "chipmunk",
	    "short_names": ["chipmunk"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOUQUET",
	    "short_name": "bouquet",
	    "short_names": ["bouquet"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COLLISION SYMBOL",
	    "short_name": "boom",
	    "short_names": ["boom", "collision"],
	    "sort_order": 134
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPLASHING SWEAT SYMBOL",
	    "short_name": "sweat_drops",
	    "short_names": ["sweat_drops"],
	    "sort_order": 146
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DROPLET",
	    "short_name": "droplet",
	    "short_names": ["droplet"],
	    "sort_order": 145
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DASH SYMBOL",
	    "short_name": "dash",
	    "short_names": ["dash"],
	    "sort_order": 140
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DIZZY SYMBOL",
	    "short_name": "dizzy",
	    "short_names": ["dizzy"],
	    "sort_order": 120
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIRE",
	    "short_name": "fire",
	    "short_names": ["fire"],
	    "sort_order": 133
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOVE OF PEACE",
	    "short_name": "dove_of_peace",
	    "short_names": ["dove_of_peace"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPIDER",
	    "short_name": "spider",
	    "short_names": ["spider"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPIDER WEB",
	    "short_name": "spider_web",
	    "short_names": ["spider_web"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SEE-NO-EVIL MONKEY",
	    "short_name": "see_no_evil",
	    "short_names": ["see_no_evil"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEAR-NO-EVIL MONKEY",
	    "short_name": "hear_no_evil",
	    "short_names": ["hear_no_evil"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAK-NO-EVIL MONKEY",
	    "short_name": "speak_no_evil",
	    "short_names": ["speak_no_evil"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "CRAB",
	    "short_name": "crab",
	    "short_names": ["crab"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "LION FACE",
	    "short_name": "lion_face",
	    "short_names": ["lion_face"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SCORPION",
	    "short_name": "scorpion",
	    "short_names": ["scorpion"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "TURKEY",
	    "short_name": "turkey",
	    "short_names": ["turkey"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "UNICORN FACE",
	    "short_name": "unicorn_face",
	    "short_names": ["unicorn_face"],
	    "sort_order": 30
	  }],
	  "Foods": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOT BEVERAGE",
	    "short_name": "coffee",
	    "short_names": ["coffee"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "HOT DOG",
	    "short_name": "hotdog",
	    "short_names": ["hotdog"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "TACO",
	    "short_name": "taco",
	    "short_names": ["taco"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BURRITO",
	    "short_name": "burrito",
	    "short_names": ["burrito"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOT PEPPER",
	    "short_name": "hot_pepper",
	    "short_names": ["hot_pepper"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EAR OF MAIZE",
	    "short_name": "corn",
	    "short_names": ["corn"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TOMATO",
	    "short_name": "tomato",
	    "short_names": ["tomato"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AUBERGINE",
	    "short_name": "eggplant",
	    "short_names": ["eggplant"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRAPES",
	    "short_name": "grapes",
	    "short_names": ["grapes"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MELON",
	    "short_name": "melon",
	    "short_names": ["melon"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WATERMELON",
	    "short_name": "watermelon",
	    "short_names": ["watermelon"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TANGERINE",
	    "short_name": "tangerine",
	    "short_names": ["tangerine"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LEMON",
	    "short_name": "lemon",
	    "short_names": ["lemon"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANANA",
	    "short_name": "banana",
	    "short_names": ["banana"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PINEAPPLE",
	    "short_name": "pineapple",
	    "short_names": ["pineapple"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RED APPLE",
	    "short_name": "apple",
	    "short_names": ["apple"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GREEN APPLE",
	    "short_name": "green_apple",
	    "short_names": ["green_apple"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PEAR",
	    "short_name": "pear",
	    "short_names": ["pear"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PEACH",
	    "short_name": "peach",
	    "short_names": ["peach"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHERRIES",
	    "short_name": "cherries",
	    "short_names": ["cherries"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STRAWBERRY",
	    "short_name": "strawberry",
	    "short_names": ["strawberry"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAMBURGER",
	    "short_name": "hamburger",
	    "short_names": ["hamburger"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLICE OF PIZZA",
	    "short_name": "pizza",
	    "short_names": ["pizza"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MEAT ON BONE",
	    "short_name": "meat_on_bone",
	    "short_names": ["meat_on_bone"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POULTRY LEG",
	    "short_name": "poultry_leg",
	    "short_names": ["poultry_leg"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RICE CRACKER",
	    "short_name": "rice_cracker",
	    "short_names": ["rice_cracker"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RICE BALL",
	    "short_name": "rice_ball",
	    "short_names": ["rice_ball"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COOKED RICE",
	    "short_name": "rice",
	    "short_names": ["rice"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CURRY AND RICE",
	    "short_name": "curry",
	    "short_names": ["curry"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STEAMING BOWL",
	    "short_name": "ramen",
	    "short_names": ["ramen"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPAGHETTI",
	    "short_name": "spaghetti",
	    "short_names": ["spaghetti"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BREAD",
	    "short_name": "bread",
	    "short_names": ["bread"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FRENCH FRIES",
	    "short_name": "fries",
	    "short_names": ["fries"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROASTED SWEET POTATO",
	    "short_name": "sweet_potato",
	    "short_names": ["sweet_potato"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DANGO",
	    "short_name": "dango",
	    "short_names": ["dango"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ODEN",
	    "short_name": "oden",
	    "short_names": ["oden"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUSHI",
	    "short_name": "sushi",
	    "short_names": ["sushi"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FRIED SHRIMP",
	    "short_name": "fried_shrimp",
	    "short_names": ["fried_shrimp"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FISH CAKE WITH SWIRL DESIGN",
	    "short_name": "fish_cake",
	    "short_names": ["fish_cake"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SOFT ICE CREAM",
	    "short_name": "icecream",
	    "short_names": ["icecream"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHAVED ICE",
	    "short_name": "shaved_ice",
	    "short_names": ["shaved_ice"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ICE CREAM",
	    "short_name": "ice_cream",
	    "short_names": ["ice_cream"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DOUGHNUT",
	    "short_name": "doughnut",
	    "short_names": ["doughnut"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COOKIE",
	    "short_name": "cookie",
	    "short_names": ["cookie"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHOCOLATE BAR",
	    "short_name": "chocolate_bar",
	    "short_names": ["chocolate_bar"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CANDY",
	    "short_name": "candy",
	    "short_names": ["candy"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOLLIPOP",
	    "short_name": "lollipop",
	    "short_names": ["lollipop"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CUSTARD",
	    "short_name": "custard",
	    "short_names": ["custard"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HONEY POT",
	    "short_name": "honey_pot",
	    "short_names": ["honey_pot"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHORTCAKE",
	    "short_name": "cake",
	    "short_names": ["cake"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BENTO BOX",
	    "short_name": "bento",
	    "short_names": ["bento"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POT OF FOOD",
	    "short_name": "stew",
	    "short_names": ["stew"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COOKING",
	    "short_name": "egg",
	    "short_names": ["egg"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FORK AND KNIFE",
	    "short_name": "fork_and_knife",
	    "short_names": ["fork_and_knife"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TEACUP WITHOUT HANDLE",
	    "short_name": "tea",
	    "short_names": ["tea"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SAKE BOTTLE AND CUP",
	    "short_name": "sake",
	    "short_names": ["sake"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WINE GLASS",
	    "short_name": "wine_glass",
	    "short_names": ["wine_glass"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COCKTAIL GLASS",
	    "short_name": "cocktail",
	    "short_names": ["cocktail"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TROPICAL DRINK",
	    "short_name": "tropical_drink",
	    "short_names": ["tropical_drink"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BEER MUG",
	    "short_name": "beer",
	    "short_names": ["beer"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLINKING BEER MUGS",
	    "short_name": "beers",
	    "short_names": ["beers"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BABY BOTTLE",
	    "short_name": "baby_bottle",
	    "short_names": ["baby_bottle"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FORK AND KNIFE WITH PLATE",
	    "short_name": "knife_fork_plate",
	    "short_names": ["knife_fork_plate"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BOTTLE WITH POPPING CORK",
	    "short_name": "champagne",
	    "short_names": ["champagne"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "POPCORN",
	    "short_name": "popcorn",
	    "short_names": ["popcorn"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BIRTHDAY CAKE",
	    "short_name": "birthday",
	    "short_names": ["birthday"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "CHEESE WEDGE",
	    "short_name": "cheese_wedge",
	    "short_names": ["cheese_wedge"],
	    "sort_order": 21
	  }],
	  "People": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE UP POINTING INDEX",
	    "short_name": "point_up",
	    "short_names": ["point_up"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WHITE FROWNING FACE",
	    "short_name": "white_frowning_face",
	    "short_names": ["white_frowning_face"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE SMILING FACE",
	    "short_name": "relaxed",
	    "short_names": ["relaxed"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "HELMET WITH WHITE CROSS",
	    "short_name": "helmet_with_white_cross",
	    "short_names": ["helmet_with_white_cross"],
	    "sort_order": 193
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAISED FIST",
	    "short_name": "fist",
	    "short_names": ["fist"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAISED HAND",
	    "short_name": "hand",
	    "short_names": ["hand", "raised_hand"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VICTORY HAND",
	    "short_name": "v",
	    "short_names": ["v"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "WRITING HAND",
	    "short_name": "writing_hand",
	    "short_names": ["writing_hand"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLOSED UMBRELLA",
	    "short_name": "closed_umbrella",
	    "short_names": ["closed_umbrella"],
	    "sort_order": 204
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FATHER CHRISTMAS",
	    "short_name": "santa",
	    "short_names": ["santa"],
	    "sort_order": 135
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SCHOOL SATCHEL",
	    "short_name": "school_satchel",
	    "short_names": ["school_satchel"],
	    "sort_order": 196
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRADUATION CAP",
	    "short_name": "mortar_board",
	    "short_names": ["mortar_board"],
	    "sort_order": 194
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TOP HAT",
	    "short_name": "tophat",
	    "short_names": ["tophat"],
	    "sort_order": 192
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RUNNER",
	    "short_name": "runner",
	    "short_names": ["runner", "running"],
	    "sort_order": 140
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EYES",
	    "short_name": "eyes",
	    "short_names": ["eyes"],
	    "sort_order": 117
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EYE",
	    "short_name": "eye",
	    "short_names": ["eye"],
	    "sort_order": 116
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EAR",
	    "short_name": "ear",
	    "short_names": ["ear"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NOSE",
	    "short_name": "nose",
	    "short_names": ["nose"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUTH",
	    "short_name": "lips",
	    "short_names": ["lips"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TONGUE",
	    "short_name": "tongue",
	    "short_names": ["tongue"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE UP POINTING BACKHAND INDEX",
	    "short_name": "point_up_2",
	    "short_names": ["point_up_2"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE DOWN POINTING BACKHAND INDEX",
	    "short_name": "point_down",
	    "short_names": ["point_down"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE LEFT POINTING BACKHAND INDEX",
	    "short_name": "point_left",
	    "short_names": ["point_left"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WHITE RIGHT POINTING BACKHAND INDEX",
	    "short_name": "point_right",
	    "short_names": ["point_right"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FISTED HAND SIGN",
	    "short_name": "facepunch",
	    "short_names": ["facepunch", "punch"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WAVING HAND SIGN",
	    "short_name": "wave",
	    "short_names": ["wave"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OK HAND SIGN",
	    "short_name": "ok_hand",
	    "short_names": ["ok_hand"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "THUMBS UP SIGN",
	    "short_name": "+1",
	    "short_names": ["+1", "thumbsup"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "THUMBS DOWN SIGN",
	    "short_name": "-1",
	    "short_names": ["-1", "thumbsdown"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLAPPING HANDS SIGN",
	    "short_name": "clap",
	    "short_names": ["clap"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OPEN HANDS SIGN",
	    "short_name": "open_hands",
	    "short_names": ["open_hands"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CROWN",
	    "short_name": "crown",
	    "short_names": ["crown"],
	    "sort_order": 195
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMANS HAT",
	    "short_name": "womans_hat",
	    "short_names": ["womans_hat"],
	    "sort_order": 191
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EYEGLASSES",
	    "short_name": "eyeglasses",
	    "short_names": ["eyeglasses"],
	    "sort_order": 201
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NECKTIE",
	    "short_name": "necktie",
	    "short_names": ["necktie"],
	    "sort_order": 179
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "T-SHIRT",
	    "short_name": "shirt",
	    "short_names": ["shirt", "tshirt"],
	    "sort_order": 177
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JEANS",
	    "short_name": "jeans",
	    "short_names": ["jeans"],
	    "sort_order": 178
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DRESS",
	    "short_name": "dress",
	    "short_names": ["dress"],
	    "sort_order": 180
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KIMONO",
	    "short_name": "kimono",
	    "short_names": ["kimono"],
	    "sort_order": 182
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BIKINI",
	    "short_name": "bikini",
	    "short_names": ["bikini"],
	    "sort_order": 181
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMANS CLOTHES",
	    "short_name": "womans_clothes",
	    "short_names": ["womans_clothes"],
	    "sort_order": 176
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PURSE",
	    "short_name": "purse",
	    "short_names": ["purse"],
	    "sort_order": 198
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HANDBAG",
	    "short_name": "handbag",
	    "short_names": ["handbag"],
	    "sort_order": 199
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POUCH",
	    "short_name": "pouch",
	    "short_names": ["pouch"],
	    "sort_order": 197
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MANS SHOE",
	    "short_name": "mans_shoe",
	    "short_names": ["mans_shoe", "shoe"],
	    "sort_order": 189
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ATHLETIC SHOE",
	    "short_name": "athletic_shoe",
	    "short_names": ["athletic_shoe"],
	    "sort_order": 190
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIGH-HEELED SHOE",
	    "short_name": "high_heel",
	    "short_names": ["high_heel"],
	    "sort_order": 186
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMANS SANDAL",
	    "short_name": "sandal",
	    "short_names": ["sandal"],
	    "sort_order": 187
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMANS BOOTS",
	    "short_name": "boot",
	    "short_names": ["boot"],
	    "sort_order": 188
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FOOTPRINTS",
	    "short_name": "footprints",
	    "short_names": ["footprints"],
	    "sort_order": 185
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUST IN SILHOUETTE",
	    "short_name": "bust_in_silhouette",
	    "short_names": ["bust_in_silhouette"],
	    "sort_order": 118
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUSTS IN SILHOUETTE",
	    "short_name": "busts_in_silhouette",
	    "short_names": ["busts_in_silhouette"],
	    "sort_order": 119
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOY",
	    "short_name": "boy",
	    "short_names": ["boy"],
	    "sort_order": 122
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GIRL",
	    "short_name": "girl",
	    "short_names": ["girl"],
	    "sort_order": 123
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAN",
	    "short_name": "man",
	    "short_names": ["man"],
	    "sort_order": 124
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMAN",
	    "short_name": "woman",
	    "short_names": ["woman"],
	    "sort_order": 125
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FAMILY",
	    "short_name": "family",
	    "short_names": ["family", "man-woman-boy"],
	    "sort_order": 161
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAN AND WOMAN HOLDING HANDS",
	    "short_name": "couple",
	    "short_names": ["couple", "man_and_woman_holding_hands"],
	    "sort_order": 143
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TWO MEN HOLDING HANDS",
	    "short_name": "two_men_holding_hands",
	    "short_names": ["two_men_holding_hands"],
	    "sort_order": 144
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TWO WOMEN HOLDING HANDS",
	    "short_name": "two_women_holding_hands",
	    "short_names": ["two_women_holding_hands"],
	    "sort_order": 145
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POLICE OFFICER",
	    "short_name": "cop",
	    "short_names": ["cop"],
	    "sort_order": 131
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WOMAN WITH BUNNY EARS",
	    "short_name": "dancers",
	    "short_names": ["dancers"],
	    "sort_order": 142
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BRIDE WITH VEIL",
	    "short_name": "bride_with_veil",
	    "short_names": ["bride_with_veil"],
	    "sort_order": 138
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON WITH BLOND HAIR",
	    "short_name": "person_with_blond_hair",
	    "short_names": ["person_with_blond_hair"],
	    "sort_order": 126
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAN WITH GUA PI MAO",
	    "short_name": "man_with_gua_pi_mao",
	    "short_names": ["man_with_gua_pi_mao"],
	    "sort_order": 129
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAN WITH TURBAN",
	    "short_name": "man_with_turban",
	    "short_names": ["man_with_turban"],
	    "sort_order": 130
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OLDER MAN",
	    "short_name": "older_man",
	    "short_names": ["older_man"],
	    "sort_order": 127
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OLDER WOMAN",
	    "short_name": "older_woman",
	    "short_names": ["older_woman"],
	    "sort_order": 128
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BABY",
	    "short_name": "baby",
	    "short_names": ["baby"],
	    "sort_order": 121
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONSTRUCTION WORKER",
	    "short_name": "construction_worker",
	    "short_names": ["construction_worker"],
	    "sort_order": 132
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PRINCESS",
	    "short_name": "princess",
	    "short_names": ["princess"],
	    "sort_order": 137
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE OGRE",
	    "short_name": "japanese_ogre",
	    "short_names": ["japanese_ogre"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE GOBLIN",
	    "short_name": "japanese_goblin",
	    "short_names": ["japanese_goblin"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GHOST",
	    "short_name": "ghost",
	    "short_names": ["ghost"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BABY ANGEL",
	    "short_name": "angel",
	    "short_names": ["angel"],
	    "sort_order": 136
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EXTRATERRESTRIAL ALIEN",
	    "short_name": "alien",
	    "short_names": ["alien"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "IMP",
	    "short_name": "imp",
	    "short_names": ["imp"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SKULL",
	    "short_name": "skull",
	    "short_names": ["skull"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "INFORMATION DESK PERSON",
	    "short_name": "information_desk_person",
	    "short_names": ["information_desk_person"],
	    "sort_order": 147
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GUARDSMAN",
	    "short_name": "guardsman",
	    "short_names": ["guardsman"],
	    "sort_order": 133
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DANCER",
	    "short_name": "dancer",
	    "short_names": ["dancer"],
	    "sort_order": 141
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LIPSTICK",
	    "short_name": "lipstick",
	    "short_names": ["lipstick"],
	    "sort_order": 183
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NAIL POLISH",
	    "short_name": "nail_care",
	    "short_names": ["nail_care"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE MASSAGE",
	    "short_name": "massage",
	    "short_names": ["massage"],
	    "sort_order": 154
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAIRCUT",
	    "short_name": "haircut",
	    "short_names": ["haircut"],
	    "sort_order": 153
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISS MARK",
	    "short_name": "kiss",
	    "short_names": ["kiss"],
	    "sort_order": 184
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RING",
	    "short_name": "ring",
	    "short_names": ["ring"],
	    "sort_order": 203
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISS",
	    "short_name": "couplekiss",
	    "short_names": ["couplekiss"],
	    "sort_order": 158
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "COUPLE WITH HEART",
	    "short_name": "couple_with_heart",
	    "short_names": ["couple_with_heart"],
	    "sort_order": 155
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLEEPING SYMBOL",
	    "short_name": "zzz",
	    "short_names": ["zzz"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PILE OF POO",
	    "short_name": "hankey",
	    "short_names": ["hankey", "poop", "shit"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FLEXED BICEPS",
	    "short_name": "muscle",
	    "short_names": ["muscle"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BRIEFCASE",
	    "short_name": "briefcase",
	    "short_names": ["briefcase"],
	    "sort_order": 200
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLEUTH OR SPY",
	    "short_name": "sleuth_or_spy",
	    "short_names": ["sleuth_or_spy"],
	    "sort_order": 134
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DARK SUNGLASSES",
	    "short_name": "dark_sunglasses",
	    "short_names": ["dark_sunglasses"],
	    "sort_order": 202
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAISED HAND WITH FINGERS SPLAYED",
	    "short_name": "raised_hand_with_fingers_splayed",
	    "short_names": ["raised_hand_with_fingers_splayed"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REVERSED HAND WITH MIDDLE FINGER EXTENDED",
	    "short_name": "middle_finger",
	    "short_names": ["middle_finger", "reversed_hand_with_middle_finger_extended"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAISED HAND WITH PART BETWEEN MIDDLE AND RING FINGERS",
	    "short_name": "spock-hand",
	    "short_names": ["spock-hand"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEAKING HEAD IN SILHOUETTE",
	    "short_name": "speaking_head_in_silhouette",
	    "short_names": ["speaking_head_in_silhouette"],
	    "sort_order": 120
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRINNING FACE",
	    "short_name": "grinning",
	    "short_names": ["grinning"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRINNING FACE WITH SMILING EYES",
	    "short_name": "grin",
	    "short_names": ["grin"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH TEARS OF JOY",
	    "short_name": "joy",
	    "short_names": ["joy"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH OPEN MOUTH",
	    "short_name": "smiley",
	    "short_names": ["smiley"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH OPEN MOUTH AND SMILING EYES",
	    "short_name": "smile",
	    "short_names": ["smile"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH OPEN MOUTH AND COLD SWEAT",
	    "short_name": "sweat_smile",
	    "short_names": ["sweat_smile"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH OPEN MOUTH AND TIGHTLY-CLOSED EYES",
	    "short_name": "laughing",
	    "short_names": ["laughing", "satisfied"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH HALO",
	    "short_name": "innocent",
	    "short_names": ["innocent"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH HORNS",
	    "short_name": "smiling_imp",
	    "short_names": ["smiling_imp"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WINKING FACE",
	    "short_name": "wink",
	    "short_names": ["wink"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH SMILING EYES",
	    "short_name": "blush",
	    "short_names": ["blush"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE SAVOURING DELICIOUS FOOD",
	    "short_name": "yum",
	    "short_names": ["yum"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RELIEVED FACE",
	    "short_name": "relieved",
	    "short_names": ["relieved"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH HEART-SHAPED EYES",
	    "short_name": "heart_eyes",
	    "short_names": ["heart_eyes"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING FACE WITH SUNGLASSES",
	    "short_name": "sunglasses",
	    "short_names": ["sunglasses"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMIRKING FACE",
	    "short_name": "smirk",
	    "short_names": ["smirk"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NEUTRAL FACE",
	    "short_name": "neutral_face",
	    "short_names": ["neutral_face"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EXPRESSIONLESS FACE",
	    "short_name": "expressionless",
	    "short_names": ["expressionless"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "UNAMUSED FACE",
	    "short_name": "unamused",
	    "short_names": ["unamused"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH COLD SWEAT",
	    "short_name": "sweat",
	    "short_names": ["sweat"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PENSIVE FACE",
	    "short_name": "pensive",
	    "short_names": ["pensive"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONFUSED FACE",
	    "short_name": "confused",
	    "short_names": ["confused"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONFOUNDED FACE",
	    "short_name": "confounded",
	    "short_names": ["confounded"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISSING FACE",
	    "short_name": "kissing",
	    "short_names": ["kissing"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE THROWING A KISS",
	    "short_name": "kissing_heart",
	    "short_names": ["kissing_heart"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISSING FACE WITH SMILING EYES",
	    "short_name": "kissing_smiling_eyes",
	    "short_names": ["kissing_smiling_eyes"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISSING FACE WITH CLOSED EYES",
	    "short_name": "kissing_closed_eyes",
	    "short_names": ["kissing_closed_eyes"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH STUCK-OUT TONGUE",
	    "short_name": "stuck_out_tongue",
	    "short_names": ["stuck_out_tongue"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH STUCK-OUT TONGUE AND WINKING EYE",
	    "short_name": "stuck_out_tongue_winking_eye",
	    "short_names": ["stuck_out_tongue_winking_eye"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH STUCK-OUT TONGUE AND TIGHTLY-CLOSED EYES",
	    "short_name": "stuck_out_tongue_closed_eyes",
	    "short_names": ["stuck_out_tongue_closed_eyes"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DISAPPOINTED FACE",
	    "short_name": "disappointed",
	    "short_names": ["disappointed"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WORRIED FACE",
	    "short_name": "worried",
	    "short_names": ["worried"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANGRY FACE",
	    "short_name": "angry",
	    "short_names": ["angry"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POUTING FACE",
	    "short_name": "rage",
	    "short_names": ["rage"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CRYING FACE",
	    "short_name": "cry",
	    "short_names": ["cry"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSEVERING FACE",
	    "short_name": "persevere",
	    "short_names": ["persevere"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH LOOK OF TRIUMPH",
	    "short_name": "triumph",
	    "short_names": ["triumph"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DISAPPOINTED BUT RELIEVED FACE",
	    "short_name": "disappointed_relieved",
	    "short_names": ["disappointed_relieved"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FROWNING FACE WITH OPEN MOUTH",
	    "short_name": "frowning",
	    "short_names": ["frowning"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANGUISHED FACE",
	    "short_name": "anguished",
	    "short_names": ["anguished"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FEARFUL FACE",
	    "short_name": "fearful",
	    "short_names": ["fearful"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WEARY FACE",
	    "short_name": "weary",
	    "short_names": ["weary"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLEEPY FACE",
	    "short_name": "sleepy",
	    "short_names": ["sleepy"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TIRED FACE",
	    "short_name": "tired_face",
	    "short_names": ["tired_face"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRIMACING FACE",
	    "short_name": "grimacing",
	    "short_names": ["grimacing"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOUDLY CRYING FACE",
	    "short_name": "sob",
	    "short_names": ["sob"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH OPEN MOUTH",
	    "short_name": "open_mouth",
	    "short_names": ["open_mouth"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HUSHED FACE",
	    "short_name": "hushed",
	    "short_names": ["hushed"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH OPEN MOUTH AND COLD SWEAT",
	    "short_name": "cold_sweat",
	    "short_names": ["cold_sweat"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE SCREAMING IN FEAR",
	    "short_name": "scream",
	    "short_names": ["scream"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ASTONISHED FACE",
	    "short_name": "astonished",
	    "short_names": ["astonished"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FLUSHED FACE",
	    "short_name": "flushed",
	    "short_names": ["flushed"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLEEPING FACE",
	    "short_name": "sleeping",
	    "short_names": ["sleeping"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DIZZY FACE",
	    "short_name": "dizzy_face",
	    "short_names": ["dizzy_face"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITHOUT MOUTH",
	    "short_name": "no_mouth",
	    "short_names": ["no_mouth"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH MEDICAL MASK",
	    "short_name": "mask",
	    "short_names": ["mask"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GRINNING CAT FACE WITH SMILING EYES",
	    "short_name": "smile_cat",
	    "short_names": ["smile_cat"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAT FACE WITH TEARS OF JOY",
	    "short_name": "joy_cat",
	    "short_names": ["joy_cat"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING CAT FACE WITH OPEN MOUTH",
	    "short_name": "smiley_cat",
	    "short_names": ["smiley_cat"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMILING CAT FACE WITH HEART-SHAPED EYES",
	    "short_name": "heart_eyes_cat",
	    "short_names": ["heart_eyes_cat"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAT FACE WITH WRY SMILE",
	    "short_name": "smirk_cat",
	    "short_names": ["smirk_cat"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "KISSING CAT FACE WITH CLOSED EYES",
	    "short_name": "kissing_cat",
	    "short_names": ["kissing_cat"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POUTING CAT FACE",
	    "short_name": "pouting_cat",
	    "short_names": ["pouting_cat"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CRYING CAT FACE",
	    "short_name": "crying_cat_face",
	    "short_names": ["crying_cat_face"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WEARY CAT FACE",
	    "short_name": "scream_cat",
	    "short_names": ["scream_cat"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLIGHTLY FROWNING FACE",
	    "short_name": "slightly_frowning_face",
	    "short_names": ["slightly_frowning_face"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLIGHTLY SMILING FACE",
	    "short_name": "slightly_smiling_face",
	    "short_names": ["slightly_smiling_face"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "UPSIDE-DOWN FACE",
	    "short_name": "upside_down_face",
	    "short_names": ["upside_down_face"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FACE WITH ROLLING EYES",
	    "short_name": "face_with_rolling_eyes",
	    "short_names": ["face_with_rolling_eyes"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH NO GOOD GESTURE",
	    "short_name": "no_good",
	    "short_names": ["no_good"],
	    "sort_order": 148
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACE WITH OK GESTURE",
	    "short_name": "ok_woman",
	    "short_names": ["ok_woman"],
	    "sort_order": 149
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON BOWING DEEPLY",
	    "short_name": "bow",
	    "short_names": ["bow"],
	    "sort_order": 146
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HAPPY PERSON RAISING ONE HAND",
	    "short_name": "raising_hand",
	    "short_names": ["raising_hand"],
	    "sort_order": 150
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON RAISING BOTH HANDS IN CELEBRATION",
	    "short_name": "raised_hands",
	    "short_names": ["raised_hands"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON FROWNING",
	    "short_name": "person_frowning",
	    "short_names": ["person_frowning"],
	    "sort_order": 152
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON WITH POUTING FACE",
	    "short_name": "person_with_pouting_face",
	    "short_names": ["person_with_pouting_face"],
	    "sort_order": 151
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERSON WITH FOLDED HANDS",
	    "short_name": "pray",
	    "short_names": ["pray"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PEDESTRIAN",
	    "short_name": "walking",
	    "short_names": ["walking"],
	    "sort_order": 139
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ZIPPER-MOUTH FACE",
	    "short_name": "zipper_mouth_face",
	    "short_names": ["zipper_mouth_face"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "MONEY-MOUTH FACE",
	    "short_name": "money_mouth_face",
	    "short_names": ["money_mouth_face"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FACE WITH THERMOMETER",
	    "short_name": "face_with_thermometer",
	    "short_names": ["face_with_thermometer"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "NERD FACE",
	    "short_name": "nerd_face",
	    "short_names": ["nerd_face"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "THINKING FACE",
	    "short_name": "thinking_face",
	    "short_names": ["thinking_face"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FACE WITH HEAD-BANDAGE",
	    "short_name": "face_with_head_bandage",
	    "short_names": ["face_with_head_bandage"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ROBOT FACE",
	    "short_name": "robot_face",
	    "short_names": ["robot_face"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "HUGGING FACE",
	    "short_name": "hugging_face",
	    "short_names": ["hugging_face"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SIGN OF THE HORNS",
	    "short_name": "the_horns",
	    "short_names": ["the_horns", "sign_of_the_horns"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-man-boy",
	    "short_names": ["man-man-boy"],
	    "sort_order": 171
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-man-boy-boy",
	    "short_names": ["man-man-boy-boy"],
	    "sort_order": 174
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-man-girl",
	    "short_names": ["man-man-girl"],
	    "sort_order": 172
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-man-girl-boy",
	    "short_names": ["man-man-girl-boy"],
	    "sort_order": 173
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-man-girl-girl",
	    "short_names": ["man-man-girl-girl"],
	    "sort_order": 175
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-woman-boy-boy",
	    "short_names": ["man-woman-boy-boy"],
	    "sort_order": 164
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-woman-girl",
	    "short_names": ["man-woman-girl"],
	    "sort_order": 162
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-woman-girl-boy",
	    "short_names": ["man-woman-girl-boy"],
	    "sort_order": 163
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "man-woman-girl-girl",
	    "short_names": ["man-woman-girl-girl"],
	    "sort_order": 165
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": null,
	    "short_name": "man-heart-man",
	    "short_names": ["man-heart-man"],
	    "sort_order": 157
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": null,
	    "short_name": "man-kiss-man",
	    "short_names": ["man-kiss-man"],
	    "sort_order": 160
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "woman-woman-boy",
	    "short_names": ["woman-woman-boy"],
	    "sort_order": 166
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "woman-woman-boy-boy",
	    "short_names": ["woman-woman-boy-boy"],
	    "sort_order": 169
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "woman-woman-girl",
	    "short_names": ["woman-woman-girl"],
	    "sort_order": 167
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "woman-woman-girl-boy",
	    "short_names": ["woman-woman-girl-boy"],
	    "sort_order": 168
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": null,
	    "short_name": "woman-woman-girl-girl",
	    "short_names": ["woman-woman-girl-girl"],
	    "sort_order": 170
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": null,
	    "short_name": "woman-heart-woman",
	    "short_names": ["woman-heart-woman"],
	    "sort_order": 156
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": null,
	    "short_name": "woman-kiss-woman",
	    "short_names": ["woman-kiss-woman"],
	    "sort_order": 159
	  }],
	  "Places": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ANCHOR",
	    "short_name": "anchor",
	    "short_names": ["anchor"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SHINTO SHRINE",
	    "short_name": "shinto_shrine",
	    "short_names": ["shinto_shrine"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHURCH",
	    "short_name": "church",
	    "short_names": ["church"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "MOUNTAIN",
	    "short_name": "mountain",
	    "short_names": ["mountain"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FOUNTAIN",
	    "short_name": "fountain",
	    "short_names": ["fountain"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FERRY",
	    "short_name": "ferry",
	    "short_names": ["ferry"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SAILBOAT",
	    "short_name": "boat",
	    "short_names": ["boat", "sailboat"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TENT",
	    "short_name": "tent",
	    "short_names": ["tent"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FUEL PUMP",
	    "short_name": "fuelpump",
	    "short_names": ["fuelpump"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AIRPLANE",
	    "short_name": "airplane",
	    "short_names": ["airplane"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FOGGY",
	    "short_name": "foggy",
	    "short_names": ["foggy"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NIGHT WITH STARS",
	    "short_name": "night_with_stars",
	    "short_names": ["night_with_stars"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUNRISE OVER MOUNTAINS",
	    "short_name": "sunrise_over_mountains",
	    "short_names": ["sunrise_over_mountains"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUNRISE",
	    "short_name": "sunrise",
	    "short_names": ["sunrise"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CITYSCAPE AT DUSK",
	    "short_name": "city_sunset",
	    "short_names": ["city_sunset"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUNSET OVER BUILDINGS",
	    "short_name": "city_sunrise",
	    "short_names": ["city_sunrise"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAINBOW",
	    "short_name": "rainbow",
	    "short_names": ["rainbow"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BRIDGE AT NIGHT",
	    "short_name": "bridge_at_night",
	    "short_names": ["bridge_at_night"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VOLCANO",
	    "short_name": "volcano",
	    "short_names": ["volcano"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MILKY WAY",
	    "short_name": "milky_way",
	    "short_names": ["milky_way"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHOOTING STAR",
	    "short_name": "stars",
	    "short_names": ["stars"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIREWORKS",
	    "short_name": "fireworks",
	    "short_names": ["fireworks"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIREWORK SPARKLER",
	    "short_name": "sparkler",
	    "short_names": ["sparkler"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOON VIEWING CEREMONY",
	    "short_name": "rice_scene",
	    "short_names": ["rice_scene"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAROUSEL HORSE",
	    "short_name": "carousel_horse",
	    "short_names": ["carousel_horse"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FERRIS WHEEL",
	    "short_name": "ferris_wheel",
	    "short_names": ["ferris_wheel"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROLLER COASTER",
	    "short_name": "roller_coaster",
	    "short_names": ["roller_coaster"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CHEQUERED FLAG",
	    "short_name": "checkered_flag",
	    "short_names": ["checkered_flag"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RACING MOTORCYCLE",
	    "short_name": "racing_motorcycle",
	    "short_names": ["racing_motorcycle"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RACING CAR",
	    "short_name": "racing_car",
	    "short_names": ["racing_car"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNOW CAPPED MOUNTAIN",
	    "short_name": "snow_capped_mountain",
	    "short_names": ["snow_capped_mountain"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CAMPING",
	    "short_name": "camping",
	    "short_names": ["camping"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BEACH WITH UMBRELLA",
	    "short_name": "beach_with_umbrella",
	    "short_names": ["beach_with_umbrella"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUILDING CONSTRUCTION",
	    "short_name": "building_construction",
	    "short_names": ["building_construction"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOUSE BUILDINGS",
	    "short_name": "house_buildings",
	    "short_names": ["house_buildings"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CITYSCAPE",
	    "short_name": "cityscape",
	    "short_names": ["cityscape"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DERELICT HOUSE BUILDING",
	    "short_name": "derelict_house_building",
	    "short_names": ["derelict_house_building"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLASSICAL BUILDING",
	    "short_name": "classical_building",
	    "short_names": ["classical_building"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DESERT",
	    "short_name": "desert",
	    "short_names": ["desert"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DESERT ISLAND",
	    "short_name": "desert_island",
	    "short_names": ["desert_island"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "NATIONAL PARK",
	    "short_name": "national_park",
	    "short_names": ["national_park"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STADIUM",
	    "short_name": "stadium",
	    "short_names": ["stadium"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOUSE BUILDING",
	    "short_name": "house",
	    "short_names": ["house"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOUSE WITH GARDEN",
	    "short_name": "house_with_garden",
	    "short_names": ["house_with_garden"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "OFFICE BUILDING",
	    "short_name": "office",
	    "short_names": ["office"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE POST OFFICE",
	    "short_name": "post_office",
	    "short_names": ["post_office"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EUROPEAN POST OFFICE",
	    "short_name": "european_post_office",
	    "short_names": ["european_post_office"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOSPITAL",
	    "short_name": "hospital",
	    "short_names": ["hospital"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BANK",
	    "short_name": "bank",
	    "short_names": ["bank"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HOTEL",
	    "short_name": "hotel",
	    "short_names": ["hotel"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LOVE HOTEL",
	    "short_name": "love_hotel",
	    "short_names": ["love_hotel"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONVENIENCE STORE",
	    "short_name": "convenience_store",
	    "short_names": ["convenience_store"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SCHOOL",
	    "short_name": "school",
	    "short_names": ["school"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DEPARTMENT STORE",
	    "short_name": "department_store",
	    "short_names": ["department_store"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FACTORY",
	    "short_name": "factory",
	    "short_names": ["factory"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "JAPANESE CASTLE",
	    "short_name": "japanese_castle",
	    "short_names": ["japanese_castle"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "EUROPEAN CASTLE",
	    "short_name": "european_castle",
	    "short_names": ["european_castle"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WEDDING",
	    "short_name": "wedding",
	    "short_names": ["wedding"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SEAT",
	    "short_name": "seat",
	    "short_names": ["seat"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "KAABA",
	    "short_name": "kaaba",
	    "short_names": ["kaaba"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "MOSQUE",
	    "short_name": "mosque",
	    "short_names": ["mosque"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SYNAGOGUE",
	    "short_name": "synagogue",
	    "short_names": ["synagogue"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUNT FUJI",
	    "short_name": "mount_fuji",
	    "short_names": ["mount_fuji"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TOKYO TOWER",
	    "short_name": "tokyo_tower",
	    "short_names": ["tokyo_tower"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STATUE OF LIBERTY",
	    "short_name": "statue_of_liberty",
	    "short_names": ["statue_of_liberty"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SILHOUETTE OF JAPAN",
	    "short_name": "japan",
	    "short_names": ["japan"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROCKET",
	    "short_name": "rocket",
	    "short_names": ["rocket"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HELICOPTER",
	    "short_name": "helicopter",
	    "short_names": ["helicopter"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STEAM LOCOMOTIVE",
	    "short_name": "steam_locomotive",
	    "short_names": ["steam_locomotive"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAILWAY CAR",
	    "short_name": "railway_car",
	    "short_names": ["railway_car"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIGH-SPEED TRAIN",
	    "short_name": "bullettrain_side",
	    "short_names": ["bullettrain_side"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HIGH-SPEED TRAIN WITH BULLET NOSE",
	    "short_name": "bullettrain_front",
	    "short_names": ["bullettrain_front"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRAIN",
	    "short_name": "train2",
	    "short_names": ["train2"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "METRO",
	    "short_name": "metro",
	    "short_names": ["metro"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "LIGHT RAIL",
	    "short_name": "light_rail",
	    "short_names": ["light_rail"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "STATION",
	    "short_name": "station",
	    "short_names": ["station"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRAM",
	    "short_name": "tram",
	    "short_names": ["tram"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRAM CAR",
	    "short_name": "train",
	    "short_names": ["train"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUS",
	    "short_name": "bus",
	    "short_names": ["bus"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ONCOMING BUS",
	    "short_name": "oncoming_bus",
	    "short_names": ["oncoming_bus"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TROLLEYBUS",
	    "short_name": "trolleybus",
	    "short_names": ["trolleybus"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BUS STOP",
	    "short_name": "busstop",
	    "short_names": ["busstop"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MINIBUS",
	    "short_name": "minibus",
	    "short_names": ["minibus"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AMBULANCE",
	    "short_name": "ambulance",
	    "short_names": ["ambulance"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FIRE ENGINE",
	    "short_name": "fire_engine",
	    "short_names": ["fire_engine"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POLICE CAR",
	    "short_name": "police_car",
	    "short_names": ["police_car"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ONCOMING POLICE CAR",
	    "short_name": "oncoming_police_car",
	    "short_names": ["oncoming_police_car"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TAXI",
	    "short_name": "taxi",
	    "short_names": ["taxi"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ONCOMING TAXI",
	    "short_name": "oncoming_taxi",
	    "short_names": ["oncoming_taxi"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AUTOMOBILE",
	    "short_name": "car",
	    "short_names": ["car", "red_car"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ONCOMING AUTOMOBILE",
	    "short_name": "oncoming_automobile",
	    "short_names": ["oncoming_automobile"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RECREATIONAL VEHICLE",
	    "short_name": "blue_car",
	    "short_names": ["blue_car"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DELIVERY TRUCK",
	    "short_name": "truck",
	    "short_names": ["truck"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ARTICULATED LORRY",
	    "short_name": "articulated_lorry",
	    "short_names": ["articulated_lorry"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRACTOR",
	    "short_name": "tractor",
	    "short_names": ["tractor"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MONORAIL",
	    "short_name": "monorail",
	    "short_names": ["monorail"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUNTAIN RAILWAY",
	    "short_name": "mountain_railway",
	    "short_names": ["mountain_railway"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SUSPENSION RAILWAY",
	    "short_name": "suspension_railway",
	    "short_names": ["suspension_railway"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUNTAIN CABLEWAY",
	    "short_name": "mountain_cableway",
	    "short_names": ["mountain_cableway"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AERIAL TRAMWAY",
	    "short_name": "aerial_tramway",
	    "short_names": ["aerial_tramway"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SHIP",
	    "short_name": "ship",
	    "short_names": ["ship"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPEEDBOAT",
	    "short_name": "speedboat",
	    "short_names": ["speedboat"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HORIZONTAL TRAFFIC LIGHT",
	    "short_name": "traffic_light",
	    "short_names": ["traffic_light"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VERTICAL TRAFFIC LIGHT",
	    "short_name": "vertical_traffic_light",
	    "short_names": ["vertical_traffic_light"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CONSTRUCTION SIGN",
	    "short_name": "construction",
	    "short_names": ["construction"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "POLICE CARS REVOLVING LIGHT",
	    "short_name": "rotating_light",
	    "short_names": ["rotating_light"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BICYCLE",
	    "short_name": "bike",
	    "short_names": ["bike"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOTORWAY",
	    "short_name": "motorway",
	    "short_names": ["motorway"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RAILWAY TRACK",
	    "short_name": "railway_track",
	    "short_names": ["railway_track"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOTOR BOAT",
	    "short_name": "motor_boat",
	    "short_names": ["motor_boat"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SMALL AIRPLANE",
	    "short_name": "small_airplane",
	    "short_names": ["small_airplane"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AIRPLANE DEPARTURE",
	    "short_name": "airplane_departure",
	    "short_names": ["airplane_departure"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AIRPLANE ARRIVING",
	    "short_name": "airplane_arriving",
	    "short_names": ["airplane_arriving"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SATELLITE",
	    "short_name": "satellite",
	    "short_names": ["satellite"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PASSENGER SHIP",
	    "short_name": "passenger_ship",
	    "short_names": ["passenger_ship"],
	    "sort_order": 45
	  }],
	  "Activity": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SOCCER BALL",
	    "short_name": "soccer",
	    "short_names": ["soccer"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BASEBALL",
	    "short_name": "baseball",
	    "short_names": ["baseball"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FLAG IN HOLE",
	    "short_name": "golf",
	    "short_names": ["golf"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "SKIER",
	    "short_name": "skier",
	    "short_names": ["skier"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ICE SKATE",
	    "short_name": "ice_skate",
	    "short_names": ["ice_skate"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "PERSON WITH BALL",
	    "short_name": "person_with_ball",
	    "short_names": ["person_with_ball"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MILITARY MEDAL",
	    "short_name": "medal",
	    "short_names": ["medal"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REMINDER RIBBON",
	    "short_name": "reminder_ribbon",
	    "short_names": ["reminder_ribbon"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ADMISSION TICKETS",
	    "short_name": "admission_tickets",
	    "short_names": ["admission_tickets"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "FISHING POLE AND FISH",
	    "short_name": "fishing_pole_and_fish",
	    "short_names": ["fishing_pole_and_fish"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MICROPHONE",
	    "short_name": "microphone",
	    "short_names": ["microphone"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HEADPHONE",
	    "short_name": "headphones",
	    "short_names": ["headphones"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ARTIST PALETTE",
	    "short_name": "art",
	    "short_names": ["art"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CIRCUS TENT",
	    "short_name": "circus_tent",
	    "short_names": ["circus_tent"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TICKET",
	    "short_name": "ticket",
	    "short_names": ["ticket"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "CLAPPER BOARD",
	    "short_name": "clapper",
	    "short_names": ["clapper"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "PERFORMING ARTS",
	    "short_name": "performing_arts",
	    "short_names": ["performing_arts"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIDEO GAME",
	    "short_name": "video_game",
	    "short_names": ["video_game"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "DIRECT HIT",
	    "short_name": "dart",
	    "short_names": ["dart"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SLOT MACHINE",
	    "short_name": "slot_machine",
	    "short_names": ["slot_machine"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BILLIARDS",
	    "short_name": "8ball",
	    "short_names": ["8ball"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GAME DIE",
	    "short_name": "game_die",
	    "short_names": ["game_die"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BOWLING",
	    "short_name": "bowling",
	    "short_names": ["bowling"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SAXOPHONE",
	    "short_name": "saxophone",
	    "short_names": ["saxophone"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GUITAR",
	    "short_name": "guitar",
	    "short_names": ["guitar"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MUSICAL KEYBOARD",
	    "short_name": "musical_keyboard",
	    "short_names": ["musical_keyboard"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TRUMPET",
	    "short_name": "trumpet",
	    "short_names": ["trumpet"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "VIOLIN",
	    "short_name": "violin",
	    "short_names": ["violin"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MUSICAL SCORE",
	    "short_name": "musical_score",
	    "short_names": ["musical_score"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RUNNING SHIRT WITH SASH",
	    "short_name": "running_shirt_with_sash",
	    "short_names": ["running_shirt_with_sash"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TENNIS RACQUET AND BALL",
	    "short_name": "tennis",
	    "short_names": ["tennis"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SKI AND SKI BOOT",
	    "short_name": "ski",
	    "short_names": ["ski"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BASKETBALL AND HOOP",
	    "short_name": "basketball",
	    "short_names": ["basketball"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SNOWBOARDER",
	    "short_name": "snowboarder",
	    "short_names": ["snowboarder"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SURFER",
	    "short_name": "surfer",
	    "short_names": ["surfer"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SPORTS MEDAL",
	    "short_name": "sports_medal",
	    "short_names": ["sports_medal"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "TROPHY",
	    "short_name": "trophy",
	    "short_names": ["trophy"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "HORSE RACING",
	    "short_name": "horse_racing",
	    "short_names": ["horse_racing"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "AMERICAN FOOTBALL",
	    "short_name": "football",
	    "short_names": ["football"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "RUGBY FOOTBALL",
	    "short_name": "rugby_football",
	    "short_names": ["rugby_football"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "SWIMMER",
	    "short_name": "swimmer",
	    "short_names": ["swimmer"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "WEIGHT LIFTER",
	    "short_name": "weight_lifter",
	    "short_names": ["weight_lifter"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "GOLFER",
	    "short_name": "golfer",
	    "short_names": ["golfer"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "CRICKET BAT AND BALL",
	    "short_name": "cricket_bat_and_ball",
	    "short_names": ["cricket_bat_and_ball"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "VOLLEYBALL",
	    "short_name": "volleyball",
	    "short_names": ["volleyball"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "FIELD HOCKEY STICK AND BALL",
	    "short_name": "field_hockey_stick_and_ball",
	    "short_names": ["field_hockey_stick_and_ball"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "ICE HOCKEY STICK AND PUCK",
	    "short_name": "ice_hockey_stick_and_puck",
	    "short_names": ["ice_hockey_stick_and_puck"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "TABLE TENNIS PADDLE AND BALL",
	    "short_name": "table_tennis_paddle_and_ball",
	    "short_names": ["table_tennis_paddle_and_ball"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROSETTE",
	    "short_name": "rosette",
	    "short_names": ["rosette"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BADMINTON RACQUET AND SHUTTLECOCK",
	    "short_name": "badminton_racquet_and_shuttlecock",
	    "short_names": ["badminton_racquet_and_shuttlecock"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "BOW AND ARROW",
	    "short_name": "bow_and_arrow",
	    "short_names": ["bow_and_arrow"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ALIEN MONSTER",
	    "short_name": "space_invader",
	    "short_names": ["space_invader"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MAN IN BUSINESS SUIT LEVITATING",
	    "short_name": "man_in_business_suit_levitating",
	    "short_names": ["man_in_business_suit_levitating"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "ROWBOAT",
	    "short_name": "rowboat",
	    "short_names": ["rowboat"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BICYCLIST",
	    "short_name": "bicyclist",
	    "short_names": ["bicyclist"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "MOUNTAIN BICYCLIST",
	    "short_name": "mountain_bicyclist",
	    "short_names": ["mountain_bicyclist"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "BATH",
	    "short_name": "bath",
	    "short_names": ["bath"],
	    "sort_order": 25
	  }],
	  "Flags": [{
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AD",
	    "short_name": "flag-ad",
	    "short_names": ["flag-ad"],
	    "sort_order": 6
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AE",
	    "short_name": "flag-ae",
	    "short_names": ["flag-ae"],
	    "sort_order": 233
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AF",
	    "short_name": "flag-af",
	    "short_names": ["flag-af"],
	    "sort_order": 1
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AG",
	    "short_name": "flag-ag",
	    "short_names": ["flag-ag"],
	    "sort_order": 10
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AI",
	    "short_name": "flag-ai",
	    "short_names": ["flag-ai"],
	    "sort_order": 8
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AL",
	    "short_name": "flag-al",
	    "short_names": ["flag-al"],
	    "sort_order": 3
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AM",
	    "short_name": "flag-am",
	    "short_names": ["flag-am"],
	    "sort_order": 12
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AO",
	    "short_name": "flag-ao",
	    "short_names": ["flag-ao"],
	    "sort_order": 7
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AQ",
	    "short_name": "flag-aq",
	    "short_names": ["flag-aq"],
	    "sort_order": 9
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AR",
	    "short_name": "flag-ar",
	    "short_names": ["flag-ar"],
	    "sort_order": 11
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AS",
	    "short_name": "flag-as",
	    "short_names": ["flag-as"],
	    "sort_order": 5
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AT",
	    "short_name": "flag-at",
	    "short_names": ["flag-at"],
	    "sort_order": 15
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AU",
	    "short_name": "flag-au",
	    "short_names": ["flag-au"],
	    "sort_order": 14
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AW",
	    "short_name": "flag-aw",
	    "short_names": ["flag-aw"],
	    "sort_order": 13
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AX",
	    "short_name": "flag-ax",
	    "short_names": ["flag-ax"],
	    "sort_order": 2
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS AZ",
	    "short_name": "flag-az",
	    "short_names": ["flag-az"],
	    "sort_order": 16
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BA",
	    "short_name": "flag-ba",
	    "short_names": ["flag-ba"],
	    "sort_order": 29
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BB",
	    "short_name": "flag-bb",
	    "short_names": ["flag-bb"],
	    "sort_order": 20
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BD",
	    "short_name": "flag-bd",
	    "short_names": ["flag-bd"],
	    "sort_order": 19
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BE",
	    "short_name": "flag-be",
	    "short_names": ["flag-be"],
	    "sort_order": 22
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BF",
	    "short_name": "flag-bf",
	    "short_names": ["flag-bf"],
	    "sort_order": 36
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BG",
	    "short_name": "flag-bg",
	    "short_names": ["flag-bg"],
	    "sort_order": 35
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BH",
	    "short_name": "flag-bh",
	    "short_names": ["flag-bh"],
	    "sort_order": 18
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BI",
	    "short_name": "flag-bi",
	    "short_names": ["flag-bi"],
	    "sort_order": 37
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BJ",
	    "short_name": "flag-bj",
	    "short_names": ["flag-bj"],
	    "sort_order": 24
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BL",
	    "short_name": "flag-bl",
	    "short_names": ["flag-bl"],
	    "sort_order": 185
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BM",
	    "short_name": "flag-bm",
	    "short_names": ["flag-bm"],
	    "sort_order": 25
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BN",
	    "short_name": "flag-bn",
	    "short_names": ["flag-bn"],
	    "sort_order": 34
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BO",
	    "short_name": "flag-bo",
	    "short_names": ["flag-bo"],
	    "sort_order": 27
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BQ",
	    "short_name": "flag-bq",
	    "short_names": ["flag-bq"],
	    "sort_order": 28
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BR",
	    "short_name": "flag-br",
	    "short_names": ["flag-br"],
	    "sort_order": 31
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BS",
	    "short_name": "flag-bs",
	    "short_names": ["flag-bs"],
	    "sort_order": 17
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BT",
	    "short_name": "flag-bt",
	    "short_names": ["flag-bt"],
	    "sort_order": 26
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BW",
	    "short_name": "flag-bw",
	    "short_names": ["flag-bw"],
	    "sort_order": 30
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BY",
	    "short_name": "flag-by",
	    "short_names": ["flag-by"],
	    "sort_order": 21
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS BZ",
	    "short_name": "flag-bz",
	    "short_names": ["flag-bz"],
	    "sort_order": 23
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CA",
	    "short_name": "flag-ca",
	    "short_names": ["flag-ca"],
	    "sort_order": 41
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CC",
	    "short_name": "flag-cc",
	    "short_names": ["flag-cc"],
	    "sort_order": 49
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CD",
	    "short_name": "flag-cd",
	    "short_names": ["flag-cd"],
	    "sort_order": 53
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CF",
	    "short_name": "flag-cf",
	    "short_names": ["flag-cf"],
	    "sort_order": 44
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CG",
	    "short_name": "flag-cg",
	    "short_names": ["flag-cg"],
	    "sort_order": 52
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CH",
	    "short_name": "flag-ch",
	    "short_names": ["flag-ch"],
	    "sort_order": 215
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CI",
	    "short_name": "flag-ci",
	    "short_names": ["flag-ci"],
	    "sort_order": 110
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CK",
	    "short_name": "flag-ck",
	    "short_names": ["flag-ck"],
	    "sort_order": 54
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CL",
	    "short_name": "flag-cl",
	    "short_names": ["flag-cl"],
	    "sort_order": 46
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CM",
	    "short_name": "flag-cm",
	    "short_names": ["flag-cm"],
	    "sort_order": 40
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CN",
	    "short_name": "flag-cn",
	    "short_names": ["flag-cn", "cn"],
	    "sort_order": 47
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CO",
	    "short_name": "flag-co",
	    "short_names": ["flag-co"],
	    "sort_order": 50
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CR",
	    "short_name": "flag-cr",
	    "short_names": ["flag-cr"],
	    "sort_order": 55
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CU",
	    "short_name": "flag-cu",
	    "short_names": ["flag-cu"],
	    "sort_order": 57
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CV",
	    "short_name": "flag-cv",
	    "short_names": ["flag-cv"],
	    "sort_order": 38
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CW",
	    "short_name": "flag-cw",
	    "short_names": ["flag-cw"],
	    "sort_order": 58
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CX",
	    "short_name": "flag-cx",
	    "short_names": ["flag-cx"],
	    "sort_order": 48
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CY",
	    "short_name": "flag-cy",
	    "short_names": ["flag-cy"],
	    "sort_order": 59
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS CZ",
	    "short_name": "flag-cz",
	    "short_names": ["flag-cz"],
	    "sort_order": 60
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DE",
	    "short_name": "flag-de",
	    "short_names": ["flag-de", "de"],
	    "sort_order": 84
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DJ",
	    "short_name": "flag-dj",
	    "short_names": ["flag-dj"],
	    "sort_order": 62
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DK",
	    "short_name": "flag-dk",
	    "short_names": ["flag-dk"],
	    "sort_order": 61
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DM",
	    "short_name": "flag-dm",
	    "short_names": ["flag-dm"],
	    "sort_order": 63
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DO",
	    "short_name": "flag-do",
	    "short_names": ["flag-do"],
	    "sort_order": 64
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS DZ",
	    "short_name": "flag-dz",
	    "short_names": ["flag-dz"],
	    "sort_order": 4
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS EC",
	    "short_name": "flag-ec",
	    "short_names": ["flag-ec"],
	    "sort_order": 65
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS EE",
	    "short_name": "flag-ee",
	    "short_names": ["flag-ee"],
	    "sort_order": 70
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS EG",
	    "short_name": "flag-eg",
	    "short_names": ["flag-eg"],
	    "sort_order": 66
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS EH",
	    "short_name": "flag-eh",
	    "short_names": ["flag-eh"],
	    "sort_order": 244
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ER",
	    "short_name": "flag-er",
	    "short_names": ["flag-er"],
	    "sort_order": 69
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ES",
	    "short_name": "flag-es",
	    "short_names": ["flag-es", "es"],
	    "sort_order": 209
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ET",
	    "short_name": "flag-et",
	    "short_names": ["flag-et"],
	    "sort_order": 71
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS EU",
	    "short_name": "flag-eu",
	    "short_names": ["flag-eu"],
	    "sort_order": 72
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FI",
	    "short_name": "flag-fi",
	    "short_names": ["flag-fi"],
	    "sort_order": 76
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FJ",
	    "short_name": "flag-fj",
	    "short_names": ["flag-fj"],
	    "sort_order": 75
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FK",
	    "short_name": "flag-fk",
	    "short_names": ["flag-fk"],
	    "sort_order": 73
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FM",
	    "short_name": "flag-fm",
	    "short_names": ["flag-fm"],
	    "sort_order": 144
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FO",
	    "short_name": "flag-fo",
	    "short_names": ["flag-fo"],
	    "sort_order": 74
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS FR",
	    "short_name": "flag-fr",
	    "short_names": ["flag-fr", "fr"],
	    "sort_order": 77
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GA",
	    "short_name": "flag-ga",
	    "short_names": ["flag-ga"],
	    "sort_order": 81
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GB",
	    "short_name": "flag-gb",
	    "short_names": ["flag-gb", "gb", "uk"],
	    "sort_order": 234
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GD",
	    "short_name": "flag-gd",
	    "short_names": ["flag-gd"],
	    "sort_order": 89
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GE",
	    "short_name": "flag-ge",
	    "short_names": ["flag-ge"],
	    "sort_order": 83
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GF",
	    "short_name": "flag-gf",
	    "short_names": ["flag-gf"],
	    "sort_order": 78
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GG",
	    "short_name": "flag-gg",
	    "short_names": ["flag-gg"],
	    "sort_order": 93
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GH",
	    "short_name": "flag-gh",
	    "short_names": ["flag-gh"],
	    "sort_order": 85
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GI",
	    "short_name": "flag-gi",
	    "short_names": ["flag-gi"],
	    "sort_order": 86
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GL",
	    "short_name": "flag-gl",
	    "short_names": ["flag-gl"],
	    "sort_order": 88
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GM",
	    "short_name": "flag-gm",
	    "short_names": ["flag-gm"],
	    "sort_order": 82
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GN",
	    "short_name": "flag-gn",
	    "short_names": ["flag-gn"],
	    "sort_order": 94
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GP",
	    "short_name": "flag-gp",
	    "short_names": ["flag-gp"],
	    "sort_order": 90
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GQ",
	    "short_name": "flag-gq",
	    "short_names": ["flag-gq"],
	    "sort_order": 68
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GR",
	    "short_name": "flag-gr",
	    "short_names": ["flag-gr"],
	    "sort_order": 87
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GS",
	    "short_name": "flag-gs",
	    "short_names": ["flag-gs"],
	    "sort_order": 206
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GT",
	    "short_name": "flag-gt",
	    "short_names": ["flag-gt"],
	    "sort_order": 92
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GU",
	    "short_name": "flag-gu",
	    "short_names": ["flag-gu"],
	    "sort_order": 91
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GW",
	    "short_name": "flag-gw",
	    "short_names": ["flag-gw"],
	    "sort_order": 95
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS GY",
	    "short_name": "flag-gy",
	    "short_names": ["flag-gy"],
	    "sort_order": 96
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS HK",
	    "short_name": "flag-hk",
	    "short_names": ["flag-hk"],
	    "sort_order": 99
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS HN",
	    "short_name": "flag-hn",
	    "short_names": ["flag-hn"],
	    "sort_order": 98
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS HR",
	    "short_name": "flag-hr",
	    "short_names": ["flag-hr"],
	    "sort_order": 56
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS HT",
	    "short_name": "flag-ht",
	    "short_names": ["flag-ht"],
	    "sort_order": 97
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS HU",
	    "short_name": "flag-hu",
	    "short_names": ["flag-hu"],
	    "sort_order": 100
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IC",
	    "short_name": "flag-ic",
	    "short_names": ["flag-ic"],
	    "sort_order": 42
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ID",
	    "short_name": "flag-id",
	    "short_names": ["flag-id"],
	    "sort_order": 103
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IE",
	    "short_name": "flag-ie",
	    "short_names": ["flag-ie"],
	    "sort_order": 106
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IL",
	    "short_name": "flag-il",
	    "short_names": ["flag-il"],
	    "sort_order": 108
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IM",
	    "short_name": "flag-im",
	    "short_names": ["flag-im"],
	    "sort_order": 107
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IN",
	    "short_name": "flag-in",
	    "short_names": ["flag-in"],
	    "sort_order": 102
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IO",
	    "short_name": "flag-io",
	    "short_names": ["flag-io"],
	    "sort_order": 32
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IQ",
	    "short_name": "flag-iq",
	    "short_names": ["flag-iq"],
	    "sort_order": 105
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IR",
	    "short_name": "flag-ir",
	    "short_names": ["flag-ir"],
	    "sort_order": 104
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IS",
	    "short_name": "flag-is",
	    "short_names": ["flag-is"],
	    "sort_order": 101
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS IT",
	    "short_name": "flag-it",
	    "short_names": ["flag-it", "it"],
	    "sort_order": 109
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS JE",
	    "short_name": "flag-je",
	    "short_names": ["flag-je"],
	    "sort_order": 113
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS JM",
	    "short_name": "flag-jm",
	    "short_names": ["flag-jm"],
	    "sort_order": 111
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS JO",
	    "short_name": "flag-jo",
	    "short_names": ["flag-jo"],
	    "sort_order": 114
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS JP",
	    "short_name": "flag-jp",
	    "short_names": ["flag-jp", "jp"],
	    "sort_order": 112
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KE",
	    "short_name": "flag-ke",
	    "short_names": ["flag-ke"],
	    "sort_order": 116
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KG",
	    "short_name": "flag-kg",
	    "short_names": ["flag-kg"],
	    "sort_order": 120
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KH",
	    "short_name": "flag-kh",
	    "short_names": ["flag-kh"],
	    "sort_order": 39
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KI",
	    "short_name": "flag-ki",
	    "short_names": ["flag-ki"],
	    "sort_order": 117
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KM",
	    "short_name": "flag-km",
	    "short_names": ["flag-km"],
	    "sort_order": 51
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KN",
	    "short_name": "flag-kn",
	    "short_names": ["flag-kn"],
	    "sort_order": 187
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KP",
	    "short_name": "flag-kp",
	    "short_names": ["flag-kp"],
	    "sort_order": 165
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KR",
	    "short_name": "flag-kr",
	    "short_names": ["flag-kr", "kr"],
	    "sort_order": 207
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KW",
	    "short_name": "flag-kw",
	    "short_names": ["flag-kw"],
	    "sort_order": 119
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KY",
	    "short_name": "flag-ky",
	    "short_names": ["flag-ky"],
	    "sort_order": 43
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS KZ",
	    "short_name": "flag-kz",
	    "short_names": ["flag-kz"],
	    "sort_order": 115
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LA",
	    "short_name": "flag-la",
	    "short_names": ["flag-la"],
	    "sort_order": 121
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LB",
	    "short_name": "flag-lb",
	    "short_names": ["flag-lb"],
	    "sort_order": 123
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LC",
	    "short_name": "flag-lc",
	    "short_names": ["flag-lc"],
	    "sort_order": 188
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LI",
	    "short_name": "flag-li",
	    "short_names": ["flag-li"],
	    "sort_order": 127
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LK",
	    "short_name": "flag-lk",
	    "short_names": ["flag-lk"],
	    "sort_order": 210
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LR",
	    "short_name": "flag-lr",
	    "short_names": ["flag-lr"],
	    "sort_order": 125
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LS",
	    "short_name": "flag-ls",
	    "short_names": ["flag-ls"],
	    "sort_order": 124
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LT",
	    "short_name": "flag-lt",
	    "short_names": ["flag-lt"],
	    "sort_order": 128
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LU",
	    "short_name": "flag-lu",
	    "short_names": ["flag-lu"],
	    "sort_order": 129
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LV",
	    "short_name": "flag-lv",
	    "short_names": ["flag-lv"],
	    "sort_order": 122
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS LY",
	    "short_name": "flag-ly",
	    "short_names": ["flag-ly"],
	    "sort_order": 126
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MA",
	    "short_name": "flag-ma",
	    "short_names": ["flag-ma"],
	    "sort_order": 150
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MC",
	    "short_name": "flag-mc",
	    "short_names": ["flag-mc"],
	    "sort_order": 146
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MD",
	    "short_name": "flag-md",
	    "short_names": ["flag-md"],
	    "sort_order": 145
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ME",
	    "short_name": "flag-me",
	    "short_names": ["flag-me"],
	    "sort_order": 148
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MG",
	    "short_name": "flag-mg",
	    "short_names": ["flag-mg"],
	    "sort_order": 132
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MH",
	    "short_name": "flag-mh",
	    "short_names": ["flag-mh"],
	    "sort_order": 138
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MK",
	    "short_name": "flag-mk",
	    "short_names": ["flag-mk"],
	    "sort_order": 131
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ML",
	    "short_name": "flag-ml",
	    "short_names": ["flag-ml"],
	    "sort_order": 136
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MM",
	    "short_name": "flag-mm",
	    "short_names": ["flag-mm"],
	    "sort_order": 152
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MN",
	    "short_name": "flag-mn",
	    "short_names": ["flag-mn"],
	    "sort_order": 147
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MO",
	    "short_name": "flag-mo",
	    "short_names": ["flag-mo"],
	    "sort_order": 130
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MP",
	    "short_name": "flag-mp",
	    "short_names": ["flag-mp"],
	    "sort_order": 164
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MQ",
	    "short_name": "flag-mq",
	    "short_names": ["flag-mq"],
	    "sort_order": 139
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MR",
	    "short_name": "flag-mr",
	    "short_names": ["flag-mr"],
	    "sort_order": 140
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MS",
	    "short_name": "flag-ms",
	    "short_names": ["flag-ms"],
	    "sort_order": 149
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MT",
	    "short_name": "flag-mt",
	    "short_names": ["flag-mt"],
	    "sort_order": 137
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MU",
	    "short_name": "flag-mu",
	    "short_names": ["flag-mu"],
	    "sort_order": 141
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MV",
	    "short_name": "flag-mv",
	    "short_names": ["flag-mv"],
	    "sort_order": 135
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MW",
	    "short_name": "flag-mw",
	    "short_names": ["flag-mw"],
	    "sort_order": 133
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MX",
	    "short_name": "flag-mx",
	    "short_names": ["flag-mx"],
	    "sort_order": 143
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MY",
	    "short_name": "flag-my",
	    "short_names": ["flag-my"],
	    "sort_order": 134
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS MZ",
	    "short_name": "flag-mz",
	    "short_names": ["flag-mz"],
	    "sort_order": 151
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NA",
	    "short_name": "flag-na",
	    "short_names": ["flag-na"],
	    "sort_order": 153
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NC",
	    "short_name": "flag-nc",
	    "short_names": ["flag-nc"],
	    "sort_order": 157
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NE",
	    "short_name": "flag-ne",
	    "short_names": ["flag-ne"],
	    "sort_order": 160
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NF",
	    "short_name": "flag-nf",
	    "short_names": ["flag-nf"],
	    "sort_order": 163
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NG",
	    "short_name": "flag-ng",
	    "short_names": ["flag-ng"],
	    "sort_order": 161
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NI",
	    "short_name": "flag-ni",
	    "short_names": ["flag-ni"],
	    "sort_order": 159
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NL",
	    "short_name": "flag-nl",
	    "short_names": ["flag-nl"],
	    "sort_order": 156
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NO",
	    "short_name": "flag-no",
	    "short_names": ["flag-no"],
	    "sort_order": 166
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NP",
	    "short_name": "flag-np",
	    "short_names": ["flag-np"],
	    "sort_order": 155
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NR",
	    "short_name": "flag-nr",
	    "short_names": ["flag-nr"],
	    "sort_order": 154
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NU",
	    "short_name": "flag-nu",
	    "short_names": ["flag-nu"],
	    "sort_order": 162
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS NZ",
	    "short_name": "flag-nz",
	    "short_names": ["flag-nz"],
	    "sort_order": 158
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS OM",
	    "short_name": "flag-om",
	    "short_names": ["flag-om"],
	    "sort_order": 167
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PA",
	    "short_name": "flag-pa",
	    "short_names": ["flag-pa"],
	    "sort_order": 171
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PE",
	    "short_name": "flag-pe",
	    "short_names": ["flag-pe"],
	    "sort_order": 174
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PF",
	    "short_name": "flag-pf",
	    "short_names": ["flag-pf"],
	    "sort_order": 79
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PG",
	    "short_name": "flag-pg",
	    "short_names": ["flag-pg"],
	    "sort_order": 172
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PH",
	    "short_name": "flag-ph",
	    "short_names": ["flag-ph"],
	    "sort_order": 175
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PK",
	    "short_name": "flag-pk",
	    "short_names": ["flag-pk"],
	    "sort_order": 168
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PL",
	    "short_name": "flag-pl",
	    "short_names": ["flag-pl"],
	    "sort_order": 177
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PM",
	    "short_name": "flag-pm",
	    "short_names": ["flag-pm"],
	    "sort_order": 189
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PN",
	    "short_name": "flag-pn",
	    "short_names": ["flag-pn"],
	    "sort_order": 176
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PR",
	    "short_name": "flag-pr",
	    "short_names": ["flag-pr"],
	    "sort_order": 179
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PS",
	    "short_name": "flag-ps",
	    "short_names": ["flag-ps"],
	    "sort_order": 170
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PT",
	    "short_name": "flag-pt",
	    "short_names": ["flag-pt"],
	    "sort_order": 178
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PW",
	    "short_name": "flag-pw",
	    "short_names": ["flag-pw"],
	    "sort_order": 169
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS PY",
	    "short_name": "flag-py",
	    "short_names": ["flag-py"],
	    "sort_order": 173
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS QA",
	    "short_name": "flag-qa",
	    "short_names": ["flag-qa"],
	    "sort_order": 180
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS RE",
	    "short_name": "flag-re",
	    "short_names": ["flag-re"],
	    "sort_order": 181
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS RO",
	    "short_name": "flag-ro",
	    "short_names": ["flag-ro"],
	    "sort_order": 182
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS RS",
	    "short_name": "flag-rs",
	    "short_names": ["flag-rs"],
	    "sort_order": 196
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS RU",
	    "short_name": "flag-ru",
	    "short_names": ["flag-ru", "ru"],
	    "sort_order": 183
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS RW",
	    "short_name": "flag-rw",
	    "short_names": ["flag-rw"],
	    "sort_order": 184
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SA",
	    "short_name": "flag-sa",
	    "short_names": ["flag-sa"],
	    "sort_order": 194
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SB",
	    "short_name": "flag-sb",
	    "short_names": ["flag-sb"],
	    "sort_order": 203
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SC",
	    "short_name": "flag-sc",
	    "short_names": ["flag-sc"],
	    "sort_order": 197
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SD",
	    "short_name": "flag-sd",
	    "short_names": ["flag-sd"],
	    "sort_order": 211
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SE",
	    "short_name": "flag-se",
	    "short_names": ["flag-se"],
	    "sort_order": 214
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SG",
	    "short_name": "flag-sg",
	    "short_names": ["flag-sg"],
	    "sort_order": 199
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SH",
	    "short_name": "flag-sh",
	    "short_names": ["flag-sh"],
	    "sort_order": 186
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SI",
	    "short_name": "flag-si",
	    "short_names": ["flag-si"],
	    "sort_order": 202
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SK",
	    "short_name": "flag-sk",
	    "short_names": ["flag-sk"],
	    "sort_order": 201
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SL",
	    "short_name": "flag-sl",
	    "short_names": ["flag-sl"],
	    "sort_order": 198
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SM",
	    "short_name": "flag-sm",
	    "short_names": ["flag-sm"],
	    "sort_order": 192
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SN",
	    "short_name": "flag-sn",
	    "short_names": ["flag-sn"],
	    "sort_order": 195
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SO",
	    "short_name": "flag-so",
	    "short_names": ["flag-so"],
	    "sort_order": 204
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SR",
	    "short_name": "flag-sr",
	    "short_names": ["flag-sr"],
	    "sort_order": 212
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SS",
	    "short_name": "flag-ss",
	    "short_names": ["flag-ss"],
	    "sort_order": 208
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ST",
	    "short_name": "flag-st",
	    "short_names": ["flag-st"],
	    "sort_order": 193
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SV",
	    "short_name": "flag-sv",
	    "short_names": ["flag-sv"],
	    "sort_order": 67
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SX",
	    "short_name": "flag-sx",
	    "short_names": ["flag-sx"],
	    "sort_order": 200
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SY",
	    "short_name": "flag-sy",
	    "short_names": ["flag-sy"],
	    "sort_order": 216
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS SZ",
	    "short_name": "flag-sz",
	    "short_names": ["flag-sz"],
	    "sort_order": 213
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TC",
	    "short_name": "flag-tc",
	    "short_names": ["flag-tc"],
	    "sort_order": 229
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TD",
	    "short_name": "flag-td",
	    "short_names": ["flag-td"],
	    "sort_order": 45
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TF",
	    "short_name": "flag-tf",
	    "short_names": ["flag-tf"],
	    "sort_order": 80
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TG",
	    "short_name": "flag-tg",
	    "short_names": ["flag-tg"],
	    "sort_order": 222
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TH",
	    "short_name": "flag-th",
	    "short_names": ["flag-th"],
	    "sort_order": 220
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TJ",
	    "short_name": "flag-tj",
	    "short_names": ["flag-tj"],
	    "sort_order": 218
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TK",
	    "short_name": "flag-tk",
	    "short_names": ["flag-tk"],
	    "sort_order": 223
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TL",
	    "short_name": "flag-tl",
	    "short_names": ["flag-tl"],
	    "sort_order": 221
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TM",
	    "short_name": "flag-tm",
	    "short_names": ["flag-tm"],
	    "sort_order": 228
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TN",
	    "short_name": "flag-tn",
	    "short_names": ["flag-tn"],
	    "sort_order": 226
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TO",
	    "short_name": "flag-to",
	    "short_names": ["flag-to"],
	    "sort_order": 224
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TR",
	    "short_name": "flag-tr",
	    "short_names": ["flag-tr"],
	    "sort_order": 227
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TT",
	    "short_name": "flag-tt",
	    "short_names": ["flag-tt"],
	    "sort_order": 225
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TV",
	    "short_name": "flag-tv",
	    "short_names": ["flag-tv"],
	    "sort_order": 230
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TW",
	    "short_name": "flag-tw",
	    "short_names": ["flag-tw"],
	    "sort_order": 217
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS TZ",
	    "short_name": "flag-tz",
	    "short_names": ["flag-tz"],
	    "sort_order": 219
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS UA",
	    "short_name": "flag-ua",
	    "short_names": ["flag-ua"],
	    "sort_order": 232
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS UG",
	    "short_name": "flag-ug",
	    "short_names": ["flag-ug"],
	    "sort_order": 231
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS US",
	    "short_name": "flag-us",
	    "short_names": ["flag-us", "us"],
	    "sort_order": 235
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS UY",
	    "short_name": "flag-uy",
	    "short_names": ["flag-uy"],
	    "sort_order": 237
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS UZ",
	    "short_name": "flag-uz",
	    "short_names": ["flag-uz"],
	    "sort_order": 238
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VA",
	    "short_name": "flag-va",
	    "short_names": ["flag-va"],
	    "sort_order": 240
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VC",
	    "short_name": "flag-vc",
	    "short_names": ["flag-vc"],
	    "sort_order": 190
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VE",
	    "short_name": "flag-ve",
	    "short_names": ["flag-ve"],
	    "sort_order": 241
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VG",
	    "short_name": "flag-vg",
	    "short_names": ["flag-vg"],
	    "sort_order": 33
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VI",
	    "short_name": "flag-vi",
	    "short_names": ["flag-vi"],
	    "sort_order": 236
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VN",
	    "short_name": "flag-vn",
	    "short_names": ["flag-vn"],
	    "sort_order": 242
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS VU",
	    "short_name": "flag-vu",
	    "short_names": ["flag-vu"],
	    "sort_order": 239
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS WF",
	    "short_name": "flag-wf",
	    "short_names": ["flag-wf"],
	    "sort_order": 243
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS WS",
	    "short_name": "flag-ws",
	    "short_names": ["flag-ws"],
	    "sort_order": 191
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS XK",
	    "short_name": "flag-xk",
	    "short_names": ["flag-xk"],
	    "sort_order": 118
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS YE",
	    "short_name": "flag-ye",
	    "short_names": ["flag-ye"],
	    "sort_order": 245
	  }, {
	    "has_img_apple": true,
	    "has_img_google": false,
	    "has_img_twitter": true,
	    "has_img_emojione": false,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS YT",
	    "short_name": "flag-yt",
	    "short_names": ["flag-yt"],
	    "sort_order": 142
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ZA",
	    "short_name": "flag-za",
	    "short_names": ["flag-za"],
	    "sort_order": 205
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ZM",
	    "short_name": "flag-zm",
	    "short_names": ["flag-zm"],
	    "sort_order": 246
	  }, {
	    "has_img_apple": true,
	    "has_img_google": true,
	    "has_img_twitter": true,
	    "has_img_emojione": true,
	    "name": "REGIONAL INDICATOR SYMBOL LETTERS ZW",
	    "short_name": "flag-zw",
	    "short_names": ["flag-zw"],
	    "sort_order": 247
	  }]
	};

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	var H = __webpack_require__(11);
	module.exports = function() { var T = new H.Template({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div id=\"emoji-picker\"><div class=\"emoji-section emoji-header\">");if(t.s(t.f("categories",c,p,1),c,p,0,78,145,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<div class=\"select-category\" data-name=\"");t.b(t.v(t.f("title",c,p,0)));t.b("\">");t.b(t.t(t.f("icon",c,p,0)));t.b("</div>");});c.pop();}t.b("</div><div class=\"emoji-section emoji-search\"><div class=\"search-wrapper\"><div class=\"search-section centered\">");t.b(t.t(t.f("search_icon",c,p,0)));t.b("</div><div class=\"search-section input\"><input class=\"search-emojis\" placeholder=\"Search\"></div></div></div><div class=\"emoji-title-overlay\"><span id=\"active-title\"></span></div><div class=\"emoji-section emoji-content\"></div><div class=\"emoji-section emoji-footer\"><div class=\"default-content\"><span>");t.b(t.v(t.f("default_content",c,p,0)));t.b("</span></div><div class=\"emoji-preview\"><div class=\"preview-section\" id=\"emoji-large-preview\"></div><div class=\"preview-section\"><span id=\"emoji-name\"></span> <span id=\"colon-display\"></span></div></div></div></div>");return t.fl(); },partials: {}, subs: {  }}, "<div id=\"emoji-picker\"><div class=\"emoji-section emoji-header\">{{#categories}}<div class=\"select-category\" data-name=\"{{title}}\">{{{icon}}}</div>{{/categories}}</div><div class=\"emoji-section emoji-search\"><div class=\"search-wrapper\"><div class=\"search-section centered\">{{{search_icon}}}</div><div class=\"search-section input\"><input class=\"search-emojis\" placeholder=\"Search\"></div></div></div><div class=\"emoji-title-overlay\"><span id=\"active-title\"></span></div><div class=\"emoji-section emoji-content\"></div><div class=\"emoji-section emoji-footer\"><div class=\"default-content\"><span>{{default_content}}</span></div><div class=\"emoji-preview\"><div class=\"preview-section\" id=\"emoji-large-preview\"></div><div class=\"preview-section\"><span id=\"emoji-name\"></span> <span id=\"colon-display\"></span></div></div></div></div>", H);return T.render.apply(T, arguments); };

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	var H = __webpack_require__(11);
	module.exports = function() { var T = new H.Template({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div class=\"icon-tooltip\"><span>");t.b(t.v(t.f("text",c,p,0)));t.b("</span></div>");return t.fl(); },partials: {}, subs: {  }}, "<div class=\"icon-tooltip\"><span>{{text}}</span></div>", H);return T.render.apply(T, arguments); };

/***/ })
/******/ ])
});
;