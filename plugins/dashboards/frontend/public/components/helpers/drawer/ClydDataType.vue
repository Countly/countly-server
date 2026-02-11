<template>
<cly-form-field
    name="data_type"
    rules="required"
    :label="i18nM('dashboards.data-type')">
    <el-select
        v-bind="$attrs"
        v-on="$listeners"
        :collapse-tags="false"
        :placeholder="placeholderText">
        <el-option
            v-for="metric in types"
            :key="metric.value"
            :label="metric.label"
            :value="metric.value">
        </el-option>
    </el-select>
</cly-form-field>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../../../frontend/express/public/javascripts/countly/countly.global.js';

export default {
    mixins: [i18nMixin],
    props: {
        placeholder: {
            type: String
        },
        extraTypes: {
            type: Array,
            default: function() {
                return [];
            }
        },
        enabledTypes: {
            type: Array,
            default: function() {
                return [];
            }
        }
    },
    data: function() {
        var allTypes = [];

        if (window.countlyAuth.validateRead("core")) {
            allTypes.push(
                {
                    value: "session",
                    label: this.i18n("dashboards.data-type.session")
                },
                {
                    value: "user-analytics",
                    label: this.i18n("dashboards.data-type.user-analytics")
                },
                {
                    value: "technology",
                    label: this.i18n("dashboards.data-type.technology")
                }
            );
        }

        if (window.countlyAuth.validateRead("geo")) {
            allTypes.push({value: "geo", label: this.i18n("dashboards.data-type.geo")});
        }

        if (window.countlyAuth.validateRead("views") && countlyGlobal.plugins && (countlyGlobal.plugins.indexOf("views") > -1)) {
            allTypes.push({ label: this.i18n("dashboards.data-type.views"), value: "views"});
        }

        if (window.countlyAuth.validateRead("sources") && countlyGlobal.plugins && (countlyGlobal.plugins.indexOf("sources") > -1)) {
            allTypes.push({ label: this.i18n("dashboards.data-type.sources"), value: "sources"});
        }

        return {
            allTypes: allTypes
        };
    },
    computed: {
        placeholderText: function() {
            if (this.placeholder) {
                return this.placeholder;
            }
            return this.i18n("placeholder.dashbaords.select-data-type");
        },
        types: function() {
            var fullList = this.allTypes.concat(this.extraTypes);

            fullList.sort(function(a, b) {
                return (a.priority || 0) - (b.priority || 0);
            });

            if (this.enabledTypes && this.enabledTypes.length) {
                var self = this;
                return fullList.filter(function(item) {
                    return self.enabledTypes.includes(item.value);
                });
            }

            return fullList;
        }
    }
};
</script>
