'use strict';

/* jshint undef: true, unused: true */

window.component('tooltip', function (tooltip) {
	tooltip.config = function (text) {
		return {
			title: text,
			config: function (el, isInitialized) {
				if (!isInitialized) {
					$(el).tooltipster({
						animation: 'fade',
						animationDuration: 100,
						delay: 100,
						maxWidth: 240,
						theme: 'tooltipster-borderless',
						trigger: 'custom',
						triggerOpen: {
							mouseenter: true,
							touchstart: true
						},
						triggerClose: {
							mouseleave: true,
							touchleave: true
						},
						interactive: true,
						contentAsHTML: true
					});
				}
			}
		}
	};
});
