import Vue from 'vue';
import { merge as _merge } from 'lodash';

export default {
    data() {
        return {
            patches: {},
            hasSelection: false
        };
    },

    props: {
        trackedFields: {
            type: Array,
            default() {
                return [];
            }
        }
    },

    watch: {
        sourceRows(newSourceRows) {
            if (Object.keys(this.patches).length === 0) {
                return [];
            }
            var self = this;

            newSourceRows.forEach(function(row) {
                var rowKey = self.keyOf(row);
                if (!self.patches[rowKey]) {
                    return;
                }
                var sourceChanges = Object.keys(self.patches[rowKey]).reduce(function(acc, fieldKey) {
                    var currentPatch = self.patches[rowKey][fieldKey];
                    if (currentPatch.originalValue !== row[fieldKey]) {
                        acc[fieldKey] = { originalValue: row[fieldKey], newValue: currentPatch.newValue };
                    }
                    else if (currentPatch.newValue !== row[fieldKey]) {
                        acc[fieldKey] = currentPatch;
                    }
                    return acc;
                }, {});
                Vue.set(self.patches, rowKey, sourceChanges);
            });
        }
    },

    methods: {
        keyOf(row, dontStringify) {
            if (dontStringify) {
                return this.keyFn(row);
            }
            return JSON.stringify(this.keyFn(row));
        },

        patch(row, fields) {
            var rowKey = this.keyOf(row),
                self = this;
            var newPatch = Object.keys(fields).reduce(function(acc, fieldKey) {
                if (self.patches[rowKey] && Object.prototype.hasOwnProperty.call(self.patches[rowKey], fieldKey)) {
                    var newValue = self.patches[rowKey][fieldKey].newValue;
                    var originalValue = self.patches[rowKey][fieldKey].originalValue;
                    if (newValue !== fields[fieldKey]) {
                        acc[fieldKey] = { originalValue: originalValue, newValue: fields[fieldKey] };
                    }
                }
                else if (row[fieldKey] !== fields[fieldKey]) {
                    acc[fieldKey] = { originalValue: row[fieldKey], newValue: fields[fieldKey] };
                }
                return acc;
            }, {});

            newPatch = _merge({}, self.patches[rowKey] || {}, newPatch);

            Vue.set(this.patches, rowKey, newPatch);
        },

        unpatch(row, fields) {
            var self = this;

            var rowKeys = null;
            if (!row) {
                rowKeys = Object.keys(this.patches);
            }
            else {
                rowKeys = [this.keyOf(row)];
            }

            rowKeys.forEach(function(rowKey) {
                if (!self.patches[rowKey]) {
                    return;
                }

                if (!fields) {
                    Vue.delete(self.patches, rowKey);
                }
                else {
                    fields.forEach(function(fieldName) {
                        Vue.delete(self.patches[rowKey], fieldName);
                    });
                    if (Object.keys(self.patches[rowKey]).length === 0) {
                        Vue.delete(self.patches, rowKey);
                    }
                }
            });

        }
    },

    computed: {
        diff() {
            if (this.trackedFields.length === 0 || Object.keys(this.patches).length === 0) {
                return [];
            }
            var diff = [],
                self = this;
            Object.keys(this.patches).forEach(function(rowKey) {
                self.trackedFields.forEach(function(fieldName) {
                    if (self.patches[rowKey] && Object.prototype.hasOwnProperty.call(self.patches[rowKey], fieldName)) {
                        var patch = self.patches[rowKey][fieldName];
                        if (patch.originalValue !== patch.newValue) {
                            diff.push({
                                key: JSON.parse(rowKey),
                                field: fieldName,
                                newValue: patch.newValue,
                                originalValue: patch.originalValue
                            });
                        }
                    }
                });
            });
            return diff;
        },

        mutatedRows() {
            if (Object.keys(this.patches).length === 0) {
                return this.sourceRows;
            }
            var self = this;
            return self.sourceRows.map(function(row) {
                var rowKey = self.keyOf(row);
                if (self.patches[rowKey]) {
                    var newValues = Object.keys(self.patches[rowKey]).reduce(function(acc, fieldKey) {
                        acc[fieldKey] = self.patches[rowKey][fieldKey].newValue;
                        return acc;
                    }, {});
                    return Object.assign({}, row, newValues);
                }
                return row;
            });
        }
    }
};
