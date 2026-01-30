import jQuery from 'jquery';
import countlyGlobal from '../../../countly/countly.global';
import countlyCommon from '../../../countly/countly.common';
import { displayExportStatus, isJSON } from '../../../countly/countly.helpers';

const countlyTaskManager = window.countlyTaskManager; // TO-DO: It will be imported

export default {
    props: {
        exportQuery: {
            type: Function,
            default: null,
            required: false
        },
        showLimitOptions: {
            type: Boolean,
            default: false,
            required: false
        },
        exportAllRows: {
            type: Boolean,
            default: false,
            required: false
        },
        exportLimit: {
            type: Number,
            default: countlyGlobal.config.export_limit,
            required: false
        },
        exportApi: {
            type: Function,
            default: null,
            required: false
        },
        exportFormat: {
            type: Function,
            default: null,
            required: false
        },
        exportColumnSelection: {
            type: Boolean,
            default: false,
            required: false
        },
        hasExport: {
            type: Boolean,
            default: true,
            required: false
        },
        customFileName: {
            type: String,
            default: null,
            required: false
        },
        customExportFileName: {
            type: Boolean,
            default: true,
            required: false
        }
    },

    watch: {
        customFileName(newVal) {
            this.exportFileName = newVal;
        }
    },

    mounted() {
        var self = this;
        this.$root.$on("cly-date-change", function() {
            self.exportFileName = this.customFileName || self.getDefaultFileName();
        });

    },

    data() {
        return {
            selectedExportColumns: null,
            selectedExportType: 'csv',
            availableExportTypes: [
                {'name': '.CSV', value: 'csv'},
                {'name': '.JSON', value: 'json'},
                {'name': '.XLSX', value: 'xlsx'}
            ],
            searchQuery: '',
            exportFileName: this.customFileName || this.getDefaultFileName()
        };
    },

    methods: {
        onExportClick() {
            this.initiateExport({
                type: this.selectedExportType,
                limit: this.exportAllRows ? -1 : this.exportLimit
            });
        },

        getDefaultFileName() {
            var siteName = countlyGlobal.countlyTitle;
            var sectionName = "";
            var selectedMenuItem = this.$store.getters["countlySidebar/getSelectedMenuItem"];
            if (selectedMenuItem && selectedMenuItem.item && selectedMenuItem.item.title) {
                sectionName = this.i18n(selectedMenuItem.item.title);
            }
            var appName = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
            var date = countlyCommon.getDateRangeForCalendar();

            var filename = siteName + " - " + appName + " - " + sectionName + " " + "(" + date + ")";
            return filename;
        },

        getLocalExportContent() {
            if (this.exportFormat) {
                return this.exportFormat(this.rows);
            }
            else {
                return this.formatExportFunction();
            }
        },

        getOrderedDataForExport() {
            var currentArray = this.localSearchedRows;
            if (this.controlParams.sort.length > 0) {
                var sorting = this.controlParams.sort[0],
                    dir = sorting.type === "asc" ? 1 : -1;

                currentArray = currentArray.slice();
                currentArray.sort(function(a, b) {
                    var priA = a[sorting.field],
                        priB = b[sorting.field];

                    if (typeof priA === 'object' && priA !== null && priA.sortBy) {
                        priA = priA.sortBy;
                        priB = priB.sortBy;
                    }

                    if (priA < priB) {
                        return -dir;
                    }
                    if (priA > priB) {
                        return dir;
                    }
                    return 0;
                });
            }
            return currentArray;
        },

        formatExportFunction() {
            var rows = this.getOrderedDataForExport();
            if (rows && rows.length && this.$refs.elTable && this.$refs.elTable.columns && this.$refs.elTable.columns.length) {
                var table = [];
                var columns = this.$refs.elTable.columns;
                columns = columns.filter(object => (Object.prototype.hasOwnProperty.call(object, "label") && Object.prototype.hasOwnProperty.call(object, "property") && typeof object.label !== "undefined" && typeof object.property !== "undefined"));
                for (var r = 0; r < rows.length; r++) {
                    var item = {};
                    for (var c = 0; c < columns.length; c++) {
                        var property;
                        if (columns[c].columnKey && columns[c].columnKey.length) {
                            var columnKey = columns[c].columnKey;
                            if (columnKey.includes(".")) {
                                property = rows[r];
                                var dotSplittedArr = columnKey.split(".");
                                for (var i = 0; i < dotSplittedArr.length; i++) {
                                    if (property[dotSplittedArr[i]]) {
                                        property = property[dotSplittedArr[i]];
                                    }
                                }
                            }
                            else {
                                property = rows[r][columnKey];
                            }
                        }
                        else {
                            property = rows[r][columns[c].property];
                        }
                        item[columns[c].label.toUpperCase()] = countlyCommon.unescapeHtml(property);
                    }
                    table.push(item);
                }
                return table;
            }
            else {
                return this.rows;
            }
        },

        initiateExport(params) {
            var formData = null,
                url = null;
            if (this.exportApi) {
                formData = this.exportApi(params);
                formData.type = params.type;
                url = countlyCommon.API_URL + (formData.url || "/o/export/request");
                if (this.exportFileName) {
                    formData.filename = this.exportFileName;
                }
            }
            else if (this.exportQuery) {
                formData = this.exportQuery();
                formData.type = params.type;
                if (formData.limit) {
                    formData.limit = params.limit;
                }
                if (this.exportFileName) {
                    formData.filename = this.exportFileName;
                }
                url = countlyCommon.API_URL + (formData.url || "/o/export/db");
            }
            else if (this.dataSource) {
                url = countlyCommon.API_URL + "/o/export/request";

                var addr = this.dataSource.requestAddress;
                var lastRequest = addr.store.getters[addr.path];

                var path = lastRequest.url + "?" + (Object.keys(lastRequest.data).reduce(function(acc, key) {
                    if (key !== "iDisplayLength" && key !== "iDisplayStart" && key !== "sEcho") {
                        if (typeof lastRequest.data[key] === 'string') {
                            acc.push(key + "=" + encodeURIComponent(lastRequest.data[key]));
                        }
                        else {
                            acc.push(key + "=" + encodeURIComponent(JSON.stringify(lastRequest.data[key])));
                        }
                    }
                    return acc;
                }, ["api_key=" + countlyGlobal.member.api_key]).join("&"));

                formData = {
                    type: params.type,
                    path: path,
                    prop: "aaData",
                    filename: this.exportFileName,
                    api_key: countlyGlobal.member.api_key
                };
            }
            else {
                url = countlyCommon.API_URL + "/o/export/data";
                formData = {
                    type: params.type,
                    data: JSON.stringify(this.getLocalExportContent()),
                    filename: this.exportFileName,
                    api_key: countlyGlobal.member.api_key
                };
            }
            if (!formData.filename) {
                formData.filename = this.exportFileName;
            }

            if (formData.url === "/o/export/requestQuery") {
                if (Array.isArray(formData.prop)) {
                    formData.prop = formData.prop.join(",");
                }
                jQuery.ajax({
                    type: "POST",
                    url: url,
                    data: formData,
                    success: function(result) {
                        var task_id = null;
                        var fileid = null;
                        if (result && result.result && result.result.task_id) {
                            task_id = result.result.task_id;
                            countlyTaskManager.monitor(task_id);
                            displayExportStatus(null, fileid, task_id);
                        }
                    },
                    error: function(xhr, _status, error) {
                        var filename = null;
                        if (xhr && xhr.responseText && xhr.responseText !== "") {
                            var ob = JSON.parse(xhr.responseText);
                            if (ob.result && ob.result.message) {
                                error = ob.result.message;
                            }
                            if (ob.result && ob.result.filename) {
                                filename = ob.result.filename;
                            }
                        }
                        displayExportStatus(error, filename, null);
                    }
                });
            }
            else {
                var form = jQuery('<form method="POST" action="' + url + '">');
                jQuery.each(formData, function(k, v) {
                    if (isJSON(v)) {
                        form.append(jQuery('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                    }
                    else {
                        form.append(jQuery('<input type="hidden" name="' + k + '" value="' + v + '">'));
                    }
                });
                jQuery('body').append(form);
                form.submit();
            }
        },

        getMatching(options) {
            if (!this.searchQuery) {
                return options;
            }
            var self = this;
            var query = (self.searchQuery + "").toLowerCase();
            return options.filter(function(option) {
                if (!option) {
                    return false;
                }
                var compareTo = option.label || option.value || "";
                return compareTo.toLowerCase().indexOf(query) > -1;
            });
        }
    },

    computed: {
        exportColumns: {
            get() {
                return this.selectedExportColumns || this.controlParams.selectedDynamicCols;
            },
            set(val) {
                this.selectedExportColumns = val;
            }
        },

        exportAllColumns: {
            get() {
                return this.exportColumns.length === this.availableDynamicCols.length;
            },
            set(val) {
                if (val) {
                    this.exportColumns = this.availableDynamicCols.map(function(c) {
                        return c.value;
                    });
                }
                else {
                    this.exportColumns = [];
                }
            }
        }
    }
};
