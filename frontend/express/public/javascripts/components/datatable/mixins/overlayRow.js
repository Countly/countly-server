var DEFAULT_ROW = {
    rowspan: 1,
    colspan: 1
};

var NO_COL_ROW = {
    rowspan: 1,
    colspan: 0
};

export default {
    props: {
        isOverlayActiveFn: {
            type: Function,
            default: null
        }
    },

    methods: {
        tableSpanMethod(obj) {
            if (this.isOverlayActiveFn && this.isOverlayActiveFn(obj)) {
                if (obj.column.type !== "overlay") {
                    return NO_COL_ROW;
                }
                else {
                    return {
                        rowspan: 1,
                        colspan: this.$refs.elTable.columns.length
                    };
                }
            }

            return DEFAULT_ROW;
        },

        onCellMouseEnter(row) {
            if (this.hasSelection) {
                return;
            }

            var thisRowKey = this.keyOf(row);
            var hovered = this.mutatedRows.filter(function(r) {
                return r.hover;
            });

            for (var i = 0; i < hovered.length; i++) {
                var rowKey = this.keyOf(hovered[i]);

                if (thisRowKey !== rowKey) {
                    this.unpatch(hovered[i], ["hover"]);
                }
            }

            if (!row.hover) {
                this.patch(row, {hover: true});
            }
        },

        onSelectionChange(selected) {
            this.hasSelection = selected.length ? true : false;
            if (!this.hasSelection) {
                this.removeHovered();
            }
        },

        onNoCellMouseEnter() {
            if (this.hasSelection) {
                return;
            }

            this.removeHovered();
        },

        removeHovered() {
            var hovered = this.mutatedRows.filter(function(r) {
                return r.hover;
            });

            for (var i = 0; i < hovered.length; i++) {
                this.unpatch(hovered[i], ["hover"]);
            }
        }
    }
};
