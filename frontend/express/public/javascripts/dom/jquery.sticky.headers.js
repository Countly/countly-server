(function ($) {
	$.StickyTableHeaders = function (el) {
		var base = this;
		base.table = $(el);
		
		var headerCells = base.table.find('thead th');
		
		base.stickyHeader = $('<div></div>').addClass('sticky-header hide');
		base.headerCellHeight = $(headerCells[0]).height();
		
		base.init = function () {
			base.table = $(el);
			var theadClone = base.table.find('thead').clone(true);
		
			base.stickyHeader.append($('<table class="d-table" cellpadding="0" cellspacing="0"></table>')).find('table').append(theadClone);
			base.table.after(base.stickyHeader);
		
			base.setWidths();
						
			$(window).scroll(base.updateStickyHeader);
			$(window).resize(base.updateTableWidth);
		};
		
		base.setWidths = function() {
		    var headerCells = base.table.find('thead th');
			stickyHeaderCells = base.stickyHeader.find('th');
		
			base.stickyHeader.css({'width': base.table.outerWidth()});
		
			for (i = 0; i < headerCells.length; i++) {
				var cellWidth = $(headerCells[i]).css("width"),
					cell = $(stickyHeaderCells[i]);

				cell.css({'width': cellWidth, 'border-radius':0});
			}
		};
		
		base.updateTableWidth = function () {
			base.setWidths();
		};
		
		base.updateStickyHeader = function () {
            if (base.table.length == 0) {
				return false;
			}
		
			var	cutoffTop = base.table.offset().top,
				cutoffBottom = base.table.height() + cutoffTop - base.headerCellHeight,
				currentPosition = $(window).scrollTop();

			if (currentPosition > cutoffTop && currentPosition < cutoffBottom) {
				base.stickyHeader.removeClass('hide');
			} else {
				base.stickyHeader.addClass('hide');
			}
		};
		
		base.init();
	};
	
	$.fn.stickyTableHeaders = function () {
		return (new $.StickyTableHeaders(this));
	};

})(jQuery);