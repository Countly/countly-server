window.ManageExportView = countlyView.extend({
    initialize:function () {
        this.template = Handlebars.compile($("#template-management-export").html());
    },
    pageScript:function () {
        $("#export-select-all").on('click', function () {
            $("#export-checkbox-container .checkbox").addClass("checked");
            $(this).hide();
            $("#export-deselect-all").show();
        });

        $("#export-deselect-all").on('click', function () {
            $("#export-checkbox-container .checkbox").removeClass("checked");
            $(this).hide();
            $("#export-select-all").show();
        });

        $("#export-checkbox-container .checkbox").on('click', function () {

            var checkCount = 1;

            if ($(this).hasClass("checked")) {
                checkCount = -1;
            }

            var checkboxCount = $("#export-checkbox-container .checkbox").length,
                checkedCount = $("#export-checkbox-container .checkbox.checked").length + checkCount;

            if (checkboxCount == checkedCount) {
                $("#export-deselect-all").show();
                $("#export-select-all").hide();
            } else {
                $("#export-select-all").show();
                $("#export-deselect-all").hide();
            }
        });
    },
    renderCommon:function () {
        $(this.el).html(this.template({
            events:countlyEvent.getEventsWithSegmentations(),
            app_name:app.activeAppName,
            exports:[]
        }));

        this.pageScript();
    },
    appChanged:function () {
        this.renderCommon();
    }
});