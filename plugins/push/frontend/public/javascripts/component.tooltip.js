'use strict';

/* jshint undef: true, unused: true */

window.component('tooltip', function(tooltip) {
	tooltip.config = function(text, opts){
		opts = opts || {};

		var prev = opts.config;
		opts.config = function(element, init) {
			if (prev) { prev.apply(this, arguments); }

			opts.class = (opts.class || '') + ' comp-tt-parent';
			if (!init && (!opts.show || opts.show())) {
				var tt = document.createElement('div'), timeout;
				tt.className = 'comp-tt';
				tt.innerHTML = text;
				tt.style.width = '10px';
				element.appendChild(tt);

				var w = 10;
				while (tt.clientHeight > 25 && w++ < 300) {
					tt.style.width = w + 'px'; 
				}

				element.onmouseover = function() {
					var r = element.getBoundingClientRect(),
						c = r.left + r.width / 2,
						a = 0, 
						t = element.clientHeight,
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

					tt.className = 'comp-tt visible';

					tt.style.left = Math.floor(element.clientWidth / 2 + a) + 'px';
					tt.style.top = Math.floor(element.clientHeight) + 'px';
					tt.style['margin-left'] = Math.floor(-w / 2) + 'px';
					clearTimeout(timeout);
					timeout = setTimeout(function(){
						tt.className = 'comp-tt';
					}, 5000);
				};

				element.onmouseleave = function() {
					clearTimeout(timeout);
					tt.className = 'comp-tt';
				};
			}
		};

		return opts;
	};
});
