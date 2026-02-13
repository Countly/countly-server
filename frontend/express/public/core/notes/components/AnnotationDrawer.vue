<template>
    <cly-drawer
        :title="$props.settings.isEditMode ? $props.settings.editTitle : $props.settings.createTitle"
        :saveButtonLabel="$props.settings.isEditMode ? $props.settings.saveButtonLabel : $props.settings.createButtonLabel"
        @submit="onSubmit"
        @open="onOpen"
        v-bind="$props.controls"
        ref="annotation"
        name="annotationDrawer">
        <template v-slot:default="drawerScope">
            <cly-form-step id="annotation-main">
                <cly-form-field rules="required" name="detail">
                    <div class="text-big text-heading">
                        {{i18n('notes.note-details')}}
                    </div>
                    <div>
                        <span class="text-medium bu-has-text-weight-medium">{{i18n('notes.note')}}</span>
                        <el-input type="textarea" :rows="3" :placeholder="i18n('notes.enter-note')" v-model="drawerScope.editedObject.note" class="bu-mt-2"></el-input>
                    </div>
                </cly-form-field>
                <cly-form-field name="noteType" :label="i18n('notes.visibility')">
                    <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned bu-mt-1">
                        <el-radio
                            class="is-autosized"
                            v-model="drawerScope.editedObject.noteType"
                            :label="item.value"
                            :key="idx"
                            v-for="(item, idx) in noteTypes"
                            border>
                            {{item.label}}
                        </el-radio>
                    </div>
                </cly-form-field>
                <cly-form-field rules="required" :label="i18n('notes.share-with')" v-if="drawerScope.editedObject.noteType === 'shared'">
                    <cly-select-email v-model="drawerScope.editedObject.emails"></cly-select-email>
                </cly-form-field>
                <cly-form-field name="date" :label="i18n('notes.date-and-time')">
                    <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned bu-mt-1">
                        <cly-date-picker timestampFormat="ms" type="date" :select-time="true" v-model="drawerScope.editedObject.ts"></cly-date-picker>
                    </div>
                </cly-form-field>
                <cly-form-field name="color">
                    <div class="text-big text-heading bu-mb-1">
                        {{i18n('notes.color')}}
                    </div>
                    <div>
                        <span class="text-small color-cool-gray-50">{{i18n('notes.color-note-description')}}</span>
                        <cly-color-tag :tags="colorTags" :defaultTag="drawerScope.editedObject.color" v-model="drawerScope.editedObject.color" class="bu-mt-3"></cly-color-tag>
                    </div>
                </cly-form-field>
            </cly-form-step>
        </template>
    </cly-drawer>
</template>

<script>
import { i18nMixin, i18n } from '../../../javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../javascripts/countly/countly.common.js';
import { notify } from '../../../javascripts/countly/countly.helpers.js';
import countlyGraphNotes from '../store/index.js';
import ClyDrawer from '../../../javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';
import ClyDatePicker from '../../../javascripts/components/date/date-picker.vue';

export default {
    components: {
        ClyDrawer,
        ClyFormStep,
        ClyFormField,
        ClyDatePicker,
    },
    mixins: [i18nMixin],
    data: function() {
        return {
            noteTypes: [{label: "Private", value: "private"}, {label: "Shared", value: "shared"}, {label: "Public", value: "public"}],
            defaultTag: {
                value: 1,
                label: "#39C0C8"
            }
        };
    },
    props: {
        settings: Object,
        controls: Object
    },
    computed: {
        colorTags: function() {
            return countlyGraphNotes.module.state.colorTags;
        }
    },
    methods: {
        onSubmit: function(doc) {
            var self = this;
            this.$store.dispatch('countlyGraphNotes/save', doc).then(function() {
                notify({
                    type: 'success',
                    title: i18n('common.success'),
                    message: i18n('notes.created-message')
                });
                self.$emit("cly-refresh", true);
            }).catch(function(res) {
                notify({
                    type: 'error',
                    title: i18n('common.error'),
                    message: res.message
                });
                self.$emit("cly-refresh", true);
            });
        },
        onOpen: function() {
            countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID]);
        }
    },
};
</script>
