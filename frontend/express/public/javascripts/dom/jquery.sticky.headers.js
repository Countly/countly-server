(function ($) {
	$.StickyTableHeaders = function (el) {
		var base = this;
		base.table = $(el);
		
		var headerCells = base.table.find('thead th');
		
        
        var wrapper = $(el).parents('.dataTables_wrapper').first();
        if ($(wrapper).find('.sticky-header').length > 0) { //check if we have sticky header
            base.stickyHeader = $(wrapper).find('.sticky-header').first();
            base.stickyHeader.html("");
        }
        else {
            base.stickyHeader = $('<div></div>').addClass('sticky-header hide');
        }

		base.headerCellHeight = headerCells[0] && $(headerCells[0]).height();

		base.init = function () {
			base.table = $(el);
			var theadClone = base.table.find('thead').clone(true);
			base.stickyHeader.append($('<table class="d-table dataTable" cellpadding="0" cellspacing="0"></table>')).find('table').append(theadClone);
			base.table.after(base.stickyHeader);
		
            
			base.setWidths();
            
            //match sorting style for sticky header
            base.stickyHeader.find("th").click(function(){
                var th = $(this);
                if(th.hasClass("sorting") || th.hasClass("sorting_asc") || th.hasClass("sorting_desc")){
                    //get current sort
                    var shouldSort = "asc";
                    if(th.hasClass("sorting_asc")){
                        shouldSort = "desc";
                    }
                    
                    //reset existing sorts
                    base.stickyHeader.find("th.sorting_asc").removeClass("sorting_asc").addClass("sorting");
                    base.stickyHeader.find("th.sorting_desc").removeClass("sorting_desc").addClass("sorting");
                    
                    //apply current sort
                    th.removeClass("sorting").addClass("sorting_"+shouldSort);
                    
                }
            });
						
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

			var topBarHeight = $("#top-bar").outerHeight(),
				cutOffAdd = 0;

            if ($("#top-bar").is(":visible") && topBarHeight) {
                cutOffAdd = topBarHeight;
                base.stickyHeader.css({top: topBarHeight});
			} else {
                base.stickyHeader.css({top: 0});
			}

			var	cutoffTop = base.table.offset().top - cutOffAdd,
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
		var self = this;
		//SetTimeout is added specifically for the cases where the data table is loaded using ajax
		//If the response time exceeds 1 second, sticky header is buggy
		return (function(){setTimeout(function(){(new $.StickyTableHeaders(self))}, 1000);})();
	};

})(jQuery);