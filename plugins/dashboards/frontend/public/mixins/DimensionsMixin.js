import countlyDashboards from '../store/index.js';

export default {
    methods: {
        getDefaultDimensions: function(visualization) {
            var dimensions;

            switch (visualization) {
            case 'number':
                dimensions = {
                    minWidth: 2,
                    minHeight: 3,
                    width: 2,
                    height: 4
                };
                break;
            case 'line':
            case 'series':
            case 'over-time':
            case 'time-series':
                dimensions = {
                    minWidth: 4,
                    minHeight: 4,
                    width: 4,
                    height: 4
                };
                break;
            case 'bar-chart':
                dimensions = {
                    minWidth: 4,
                    minHeight: 4,
                    width: 4,
                    height: 4
                };
                break;
            case 'pie-chart':
                dimensions = {
                    minWidth: 4,
                    minHeight: 3,
                    width: 4,
                    height: 4
                };
                break;
            case 'table':
                dimensions = {
                    minWidth: 4,
                    minHeight: 3,
                    width: 4,
                    height: 6
                };
                break;
            default:
                dimensions = {
                    minWidth: 4,
                    minHeight: 3,
                    width: 4,
                    height: 4
                };
            }
            return dimensions;
        },
        returnDimensions: function(settings, widget) {
            var dimensions;
            var defaultDimensions = this.getDefaultDimensions(widget.visualization || widget.visualization_type || widget.visualitionType);
            var newDimensions = settings.grid.dimensions && settings.grid.dimensions();

            if (newDimensions) {
                dimensions = newDimensions;
            }
            else if (defaultDimensions) {
                dimensions = defaultDimensions;
            }
            else {
                countlyDashboards.factory.log("No dimensions were found for the widget!");
            }
            if (widget.size && widget.size.length === 2) {
                var prevWidth = widget.size[0];
                var prevHeight = widget.size[1];
                if (prevHeight < dimensions.minHeight) {
                    dimensions.height = prevHeight;
                    dimensions.minHeight = prevHeight;
                }
                if (prevWidth < dimensions.minWidth) {
                    dimensions.width = prevWidth;
                    dimensions.minWidth = prevWidth;
                }
            }
            return dimensions;
        }
    }
};
