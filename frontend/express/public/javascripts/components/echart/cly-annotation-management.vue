<template>
    <div class="chart-type-annotation-wrapper">
        <el-dropdown data-test-id="chart-type-annotation-button" trigger="click" @command="graphNotesHandleCommand($event)">
            <el-button size="small">
                <img :src="getIconUrl('notation-icon')" class="chart-type-annotation-wrapper__icon" data-test-id="chart-type-annotation-icon"/>
            </el-button>
            <el-dropdown-menu slot="dropdown">
                <el-dropdown-item data-test-id="chart-type-annotation-item-add-note" v-if="hasCreateRight" command="add">
                    <img :src="getIconUrl('add-icon')" class="chart-type-annotation-wrapper__img bu-mr-4"/>
                    <span>{{$i18n("notes.add-note")}}</span>
                </el-dropdown-item>
                <el-dropdown-item data-test-id="chart-type-annotation-item-manage-notes" command="manage">
                    <img :src="getIconUrl('manage-icon')" class="chart-type-annotation-wrapper__img bu-mr-4"/>
                    {{$i18n("notes.manage-notes")}}
                </el-dropdown-item>
                <el-dropdown-item data-test-id="chart-type-annotation-item-hide-notes" v-if="hasUpdateRight" command="show">
                    <img :src="getIconUrl('show-icon')" class="chart-type-annotation-wrapper__img bu-mr-3"/>
                    {{!areNotesHidden ? $i18n("notes.hide-notes") : $i18n("notes.show-notes")}}
                </el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>
        <drawer :settings="drawerSettings" :controls="drawers.annotation" @cly-refresh="refresh"></drawer>
    </div>
</template>

<script>
import countlyVue from '../../countly/vue/core.js';
import * as countlyAuth from '../../countly/countly.auth.js';
import AnnotationDrawer from '../../../core/notes/components/AnnotationDrawer.vue';

export default {
    props: {
        category: {
            type: String,
            default: '',
            required: false
        }
    },
    mixins: [countlyVue.mixins.hasDrawers("annotation")],
    data: function() {
        return {
            selectedItem: '',
            drawerSettings: {
                createTitle: this.$i18n('notes.add-new-note'),
                editTitle: this.$i18n('notes.edit-note'),
                saveButtonLabel: this.$i18n('common.save'),
                createButtonLabel: this.$i18n('common.create'),
                isEditMode: false
            },
        };
    },
    computed: {
        hasCreateRight: function() {
            return countlyAuth.validateCreate("core");
        },
        hasUpdateRight: function() {
            return countlyAuth.validateUpdate("core");
        },
        areNotesHidden: function() {
            return this.$store.getters['countlyCommon/getAreNotesHidden'];
        }
    },
    methods: {
        refresh: function() {
            this.$emit('refresh');
        },
        getIconUrl: function(icon) {
            // Use path relative to web root, similar to the original vis.js
            return 'images/annotation/' + icon + '.svg';
        },
        graphNotesHandleCommand: function(event) {
            if (event === "add") {
                this.openDrawer("annotation", {
                    noteType: "private",
                    ts: Date.now(),
                    color: {value: 1, label: '#39C0C8'},
                    emails: [],
                    category: this.category,
                    appIds: this.data ? this.data.apps : null
                });
            }
            else if (event === "manage") {
                window.location.href = '#/analytics/graph-notes';
            }
            else if (event === "show") {
                this.notesVisibility();
            }
        },
        notesVisibility: function() {
            this.$store.dispatch('countlyCommon/setAreNotesHidden', !this.areNotesHidden);
        }
    },
    components: {
        "drawer": AnnotationDrawer
    }
};
</script>
