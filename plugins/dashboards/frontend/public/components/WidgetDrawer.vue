<template>
<cly-drawer
    @submit="onSubmit"
    @copy="onCopy"
    @close="onClose"
    :title="title"
    test-id="widget-drawer"
    :saveButtonLabel="saveButtonLabel"
    v-bind="controls">
    <template v-slot:default="drawerScope">
        <cly-form-step id="widget-drawer">
            <cly-form-field
                name="widget_type"
                test-id="widget-type"
                rules="required"
                :subheading="i18nM('dashboards.widget-type-description')"
                :label="i18nM('dashboards.widget-type')">
                <el-radio-group
                    class="bu-columns bu-is-multiline bu-m-0"
                    v-model="drawerScope.editedObject.widget_type"
                    :disabled="drawerScope.editedObject.__action === 'edit'"
                    @change="onWidgetTypeReset">
                    <div
                        v-for="(item, index) in widgetTypes"
                        v-if="item.isAllowed"
                        style="box-sizing: border-box;"
                        :class="['bu-column bu-is-one-quarter bu-m-0 bu-p-0',
                                {'bu-pr-2': ((index + 1) % 4 !== 0)},
                                {'bu-mb-3': (index < (widgetTypes.length - (widgetTypes.length % 4)))}]">
                        <el-radio
                            style="width:100%"
                            :label="item.type"
                            :key="item.type"
                            :test-id="'widget-type-' + item.type"
                            border>
                            <div class="has-ellipsis text-smallish cly-vue-dashboards__drawer-widget-type">
                                {{item.label}}
                            </div>
                        </el-radio>
                    </div>
                </el-radio-group>
            </cly-form-field>
            <component
                v-if="widgetSettingsGetter(drawerScope.editedObject) && widgetSettingsGetter(drawerScope.editedObject).isAllowed"
                :is="widgetSettingsGetter(drawerScope.editedObject).drawer.component"
                @reset="reset"
                :scope="drawerScope">
            </component>
        </cly-form-step>
    </template>
</cly-drawer>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyDashboards from '../store/index.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import WidgetsMixin from '../mixins/WidgetsMixin.js';

export default {
    mixins: [i18nMixin, WidgetsMixin],
    props: {
        controls: {
            type: Object
        }
    },
    data: function() {
        return {
            title: "",
            saveButtonLabel: ""
        };
    },
    computed: {
        widgetTypes: function() {
            var widgetTypes = [];

            for (var key in this.__widgets) {
                var setting = this.widgetSettingsPrimary({widget_type: key});
                if (setting) {
                    widgetTypes.push(setting);
                }
            }

            widgetTypes.sort(function(a, b) {
                return a.priority - b.priority;
            });

            return widgetTypes;
        }
    },
    methods: {
        onSubmit: function(doc) {
            var action = "countlyDashboards/widgets/create";
            var __action = doc.__action;
            var self = this;
            var isEdited = __action === "edit";

            if (isEdited) {
                action = "countlyDashboards/widgets/update";
            }

            var setting = this.widgetSettingsGetter(doc);

            if (!setting) {
                countlyDashboards.factory.log("Well this is very strange.");
                countlyDashboards.factory.log("On widget submit, atleast one of the widget registrations should be returned.");
                countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");

                return;
            }

            if (setting.drawer.beforeSaveFn) {
                var returnVal = setting.drawer.beforeSaveFn(doc, isEdited);
                if (returnVal) {
                    doc = returnVal;
                }
            }

            var empty = setting.drawer.getEmpty();
            var obj = {};

            for (var key in empty) {
                obj[key] = doc[key];
            }

            obj = JSON.parse(JSON.stringify(obj));

            this.$store.dispatch(action, {id: doc._id, settings: obj}).then(function(id) {
                if (id) {
                    if (isEdited) {
                        self.$store.dispatch("countlyDashboards/requests/isProcessing", true);
                        self.$store.dispatch("countlyDashboards/widgets/get", doc._id).then(function() {
                            self.$store.dispatch("countlyDashboards/requests/isProcessing", false);
                        });
                        notify({
                            message: "Widget edited successfully!",
                            type: "success"
                        });
                    }
                    else {
                        obj.id = id;
                        self.$store.dispatch("countlyDashboards/requests/isProcessing", true);
                        self.$emit("add-widget", obj);
                        notify({
                            message: "Widget created successfully!",
                            type: "success"
                        });
                    }
                }
            });
        },
        onCopy: function(doc) {
            this.title = this.i18nM("dashboards.add-new-widget-heading");
            this.saveButtonLabel = this.i18nM("dashbaords.create-widget");

            if (doc.__action === "edit") {
                this.title = this.i18nM("dashboards.edit-widget-heading");
                this.saveButtonLabel = this.i18nM("dashboards.save-widget");
            }

            var setting = this.widgetSettingsGetter(doc);

            if (!setting) {
                countlyDashboards.factory.log("Well this is very strange.");
                countlyDashboards.factory.log("On widget onCopy, atleast one of the widget registrations should be returned.");
                countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");

                return;
            }

            if (setting) {
                if (setting.drawer.beforeLoadFn) {
                    var returnVal = setting.drawer.beforeLoadFn(doc, doc.__action === "edit");
                    if (returnVal) {
                        return returnVal;
                    }
                }
            }
        },
        onClose: function() {
            this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", false);
        },
        onWidgetTypeReset: function(v) {
            this.reset({widget_type: v});
        },
        reset: function(widget) {
            this.$emit("reset", widget);
        }
    }
};
</script>
