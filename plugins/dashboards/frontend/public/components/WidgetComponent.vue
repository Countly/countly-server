<template>
    <div class="grid-stack-item"
        :class="'grid-stack-item-' + widget.widget_type"
        :id="widget._id"
        :gs-id="widget._id"
        :gs-x="widget.position && widget.position[0]"
        :gs-y="widget.position && widget.position[1]"
        :gs-w="validateWidgetSize(settings, widget, 'w')"
        :gs-h="validateWidgetSize(settings, widget, 'h')"
        :gs-min-w="validateWidgetDimension(settings, widget, 'w')"
        :gs-min-h="validateWidgetDimension(settings, widget, 'h')"
        @click="settings.grid.onClick && settings.grid.onClick(widget)">

        <div :class="['grid-stack-item-content', customPadding]">
            <widget-disabled v-if="isWidgetDisabled(widget)" :widget="widget">
                <template v-slot:action v-if="canUpdateGrid">
                    <div class="bu-level-item">
                        <cly-more-options @command="$emit('command', $event, widget)">
                            <el-dropdown-item command="delete">{{i18nM('common.delete')}}</el-dropdown-item>
                        </cly-more-options>
                    </div>
                </template>
            </widget-disabled>
            <widget-invalid v-else-if="!loading && isWidgetInvalid(widget)" :widget="widget">
                <template v-slot:action v-if="canUpdateGrid && settings.isAllowed">
                    <div class="bu-level-item">
                        <cly-more-options @command="$emit('command', $event, widget)">
                            <el-dropdown-item command="edit">{{i18nM('common.edit')}}</el-dropdown-item>
                            <el-dropdown-item command="delete">{{i18nM('common.delete')}}</el-dropdown-item>
                        </cly-more-options>
                    </div>
                </template>
            </widget-invalid>
            <component
                v-else
                :is="settings.grid.component"
                @command="$emit('command', $event, widget)"
                :is-allowed="canUpdateGrid && settings.isAllowed"
                :data="widget"
                :loading="loading">
                 <template v-slot:action v-if="canUpdateGrid && settings.isAllowed">
                    <div class="bu-level-item">
                        <cly-more-options @command="$emit('command', $event, widget)">
                            <el-dropdown-item class="dashboard-more-options" command="edit">{{i18nM('common.edit')}}</el-dropdown-item>
                            <el-dropdown-item class="dashboard-more-options" command="delete">{{i18nM('common.delete')}}</el-dropdown-item>
                        </cly-more-options>
                    </div>
                </template>
            </component>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import WidgetValidationMixin from '../mixins/WidgetValidationMixin.js';
import DisabledWidget from './DisabledWidget.vue';
import InvalidWidget from './InvalidWidget.vue';

export default {
    mixins: [i18nMixin, WidgetValidationMixin],
    props: {
        widget: {
            type: Object,
            default: function() {
                return {};
            }
        },
        settings: {
            type: Object,
            default: function() {
                return {
                    grid: {
                        dimensions: function() {
                            return {};
                        }
                    },
                    drawer: {
                        getEmpty: function() {
                            return {};
                        }
                    }
                };
            }
        },
        loading: {
            type: Boolean,
            default: true
        }
    },
    components: {
        "widget-disabled": DisabledWidget,
        "widget-invalid": InvalidWidget
    },
    computed: {
        canUpdateGrid: function() {
            var dashboard = this.$store.getters["countlyDashboards/selected"];
            return (dashboard.data && dashboard.data.is_editable) ? true : false;
        },
        customPadding: function() {
            return this.widget.widget_type === "note" ? "bu-p-4" : "bu-p-5";
        }
    },
    mounted: function() {
        this.$emit("ready", this.widget._id);
    }
};
</script>
