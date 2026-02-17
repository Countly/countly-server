<template>
    <div class="data-manager-create-event__segment bu-my-5 bg-cool-gray-10">
        <div class="bu-px-5 bu-py-5">
            <div class="bu-level">
                <i class="bu-is-clickable bu-mr-4 drag-icon ion-navicon-round" />
                <div class="text-small text-heading bu-level-left bu-level-item text-uppercase">
                    Condition Value
                </div>
                <div
                    @click="removeCondition"
                    class="bu-is-clickable text-small bu-level-item bu-level-right color-red-100"
                >
                    Remove
                </div>
            </div>
            <div class="text-medium text-heading bu-mt-4">
                {{ condition.name }}
            </div>
            <div>
                <el-input
                    :test-id="'add-value-for-selected-condition-' + condition.name"
                    v-model="condition.value"
                    placeholder="Enter condition value"
                >
                    <el-button
                        type="text"
                        slot="suffix"
                        @click="openJsonEditorForCondition"
                        class="cly-vue-remote-config-parameters-drawer__autocomplete-button"
                    >
                        { }
                    </el-button>
                </el-input>
                <json-editor
                    v-if="condition.open"
                    :isOpen="isOpen"
                    v-model="condition.value"
                />
            </div>
        </div>
    </div>
</template>
<script>
import { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import JsonEditor from './JsonEditor.vue';

var DATA_TYPES = {
    d: i18n("remote-config.type.d"),
    n: i18n("remote-config.type.n"),
    bl: i18n("remote-config.type.bl"),
    s: i18n("remote-config.type.s"),
    l: i18n("remote-config.type.l")
};

export default {
    components: {
        "json-editor": JsonEditor
    },
    props: {
        value: {
            type: Object
        },
        label: {
            type: String
        },
        removable: {
            type: Boolean,
            default: true
        },
        conditionIndex: {
            type: Number,
            default: -1
        }
    },
    data: function() {
        return {
            currentId: "",
            dataTypes: [
                { label: DATA_TYPES.d, value: 'd' },
                { label: DATA_TYPES.n, value: 'n' },
                { label: DATA_TYPES.bl, value: 'bl' },
                { label: DATA_TYPES.s, value: 's' },
                { label: DATA_TYPES.l, value: 'l' }
            ]
        };
    },
    computed: {
        condition: function() {
            return this.value;
        },
        isOpen: function() {
            var val = this.$store.getters["countlyRemoteConfig/parameters/showJsonEditorForCondition"];
            if (this.currentId === this.condition.condition_id) {
                this.condition.open = val;
            }
            return val;
        },
    },
    methods: {
        removeCondition: function() {
            this.$emit("remove-me");
        },
        openJsonEditorForCondition: function() {
            this.currentId = this.condition.condition_id;
            this.condition.open = true;
            this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditorForCondition", true);
        }
    }
};
</script>
