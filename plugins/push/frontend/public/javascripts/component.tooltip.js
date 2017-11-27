'use strict';

/* jshint undef: true, unused: true */

window.component('tooltip', function (tooltip) {
	tooltip.config = function (text, opts) {
		opts = opts || {};

		var prev = opts.config;
		opts.config = function (element, init) {
			if (prev) { prev.apply(this, arguments); }

			opts.class = (opts.class || '') + ' comp-tt-parent';
			if (!init && (!opts.show || opts.show())) {
				var tt = document.createElement('div'), timeout;
				tt.className = 'comp-tt ' + (opts.class || '');
				tt.innerHTML = text;
				tt.style.width = '10px';

				opts.appendToBody ? $('body').append(tt) : element.appendChild(tt);

				var w = 10;
				while (tt.clientHeight > 25 && w++ < 300) {
					tt.style.width = w + 'px';
				}

				element.onmouseover = function () {
					if (opts.class.split(' ').indexOf('help') !== -1) {
						var toggle = document.body.querySelector('#help-toggle');
						if (toggle && toggle.className.split(' ').indexOf('active') === -1) {
							return;
						}
					}

					var left, top;

					if (opts.appendToBody) {
						var r = element.getBoundingClientRect();
						left = r.x + "px";
						top = (r.y + r.height + 5) + "px";
					} else {
						var r = element.getBoundingClientRect(),
							c = r.left + r.width / 2,
							a = 0,
							add = r.right - r.width / 2 + w / 2 + 10 - document.body.clientWidth;

						add = add > 0 ? add : 0;

						var bounding = element.parentElement;
						while (bounding && bounding.className.indexOf('comp-tt-bounding') === -1) {
							bounding = bounding.parentElement;
						}

						if (bounding) {
							bounding = bounding.getBoundingClientRect();
							if (bounding.left + 10 > c - w / 2) {
								a = bounding.left + 10 - (c - w / 2);
							}
							if (bounding.right - 20 < c + w / 2) {
								a = bounding.right - 20 - (c + w / 2);
							}
						}

						left = Math.floor(element.clientWidth / 2 + a) + 'px';
						top = Math.floor(element.clientHeight) + 'px';
					}

					tt.className = 'comp-tt visible ' + (opts.class || '') + (' ' + opts.tooltipClass || '');
					
					tt.style.left = left;
					tt.style.top = top;
					tt.style.zIndex = 1000000;
					tt.style['margin-left'] = Math.floor(-w / 2) + 'px';
					clearTimeout(timeout);
					timeout = setTimeout(function () {
						tt.className = 'comp-tt ' + (opts.class || '');
					}, 5000);
				};

				element.onmouseleave = function () {
					clearTimeout(timeout);
					tt.className = 'comp-tt';
				};
			}
		};

		return opts;
	};
});
