import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import countlyDashboards from '../store/index.js';
import DimensionsMixin from './DimensionsMixin.js';

export default {
    mixins: [DimensionsMixin],
    methods: {
        validateWidgetSize: function(settings, widget, dimension) {
            var size;

            switch (dimension) {
            case "w":
                size = widget.size && widget.size[0];
                size = this.calculateWidth(settings, widget, size);
                break;
            case "h":
                size = widget.size && widget.size[1];
                size = this.calculateHeight(settings, widget, size);
                break;
            }

            return size;
        },
        validateWidgetDimension: function(settings, widget, dimension) {
            var dimensions = this.returnDimensions(settings, widget);
            var dim;

            switch (dimension) {
            case "w":
                dim = dimensions.minWidth;
                dim = this.calculateWidth(settings, widget, dim);
                break;
            case "h":
                dim = dimensions.minHeight;
                dim = this.calculateHeight(settings, widget, dim);
                break;
            }

            return dim;
        },
        calculateWidth: function(settings, widget, width) {
            var dimensions = this.returnDimensions(settings, widget);
            var minWidth = dimensions.minWidth;
            var w = width;

            if (!w || w < minWidth) {
                w = minWidth;
                countlyDashboards.factory.log("Width should be atleast equal to " + minWidth + "! Old width = " + width + ", New width = " + w);
            }

            return w;
        },
        calculateHeight: function(settings, widget, height) {
            var dimensions = this.returnDimensions(settings, widget);
            var minHeight = dimensions.minHeight;

            var h = height;
            if (!h || h < minHeight) {
                h = minHeight;
                countlyDashboards.factory.log("Height should be atleast equal to " + minHeight + "! Old height = " + height + ", New height = " + h);
            }

            return h;
        },
        isWidgetLocked: function(widget) {
            var disabled = this.isWidgetDisabled(widget);

            if (disabled) {
                return true;
            }

            var invalid = this.isWidgetInvalid(widget);

            return invalid;
        },
        widgetResizeNotAllowed: function(widget) {
            var disabled = this.isWidgetDisabled(widget);
            if (disabled) {
                return true;
            }

            var invalid = this.isWidgetInvalid(widget);

            if (invalid) {
                return true;
            }

            return false;
        },
        widgetMoveNotAllowed: function(widget) {
            var disabled = this.isWidgetDisabled(widget);

            if (disabled) {
                return true;
            }

            var invalid = this.isWidgetInvalid(widget);

            if (invalid) {
                return true;
            }

            return false;
        },
        isWidgetDisabled: function(widget) {
            var disabled = false;

            if (widget.isPluginWidget) {
                var feature = widget.feature;

                disabled = countlyGlobal.plugins.map(function(p) {
                    return p.replaceAll("-", "_");
                }).indexOf(feature) < 0;
                disabled = !!disabled;
            }

            return disabled;
        },
        isWidgetInvalid: function(widget) {
            var invalid = true;

            var dashData = widget.dashData;

            if (dashData) {
                invalid = dashData.isValid === false ? true : false;
                invalid = dashData.isProcessing ? false : invalid;
            }

            if (widget.client_fetch) {
                invalid = false;
            }

            return invalid;
        }
    }
};
