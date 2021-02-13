/* global Vue, Backbone */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;


    Vue.component("cly-tabs", countlyBaseComponent.extend({
        props: {
            value: String,
            routePattern: String,
            routeKey: String
        },
        computed: {
            currentTab: {
                get: function() {
                    return this.value;
                },
                set: function(val) {
                    if (this.routePattern && this.routeKey) {
                        Backbone.history.noHistory(this.routePattern.replace(":" + this.routeKey, val));
                    }
                    this.$emit("input", val);
                }
            }
        },
        template: '<div class="cly-vue-tabs">\
                        <el-tabs v-model="currentTab" type="button" v-on="$listeners" v-bind="$attrs">\
                            <template v-slot>\
                                <slot></slot>\
                            </template>\
                        </el-tabs>\
                    </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
