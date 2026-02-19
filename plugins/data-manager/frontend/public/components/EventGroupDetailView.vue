<template>
    <div class="cly-vue-data-manager" v-bind:class="[componentId]">
        <event-group-drawer @close="closeDrawer" :controls="drawers.eventgroup"></event-group-drawer>
        <cly-header>
            {{eventGroup}}
            <template v-slot:header-left>
                <div>
                    <cly-back-link link="/manage/data-manager/events/event-groups" title="Back to Manage Event Groups"></cly-back-link>
                    <div class="bu-mt-4 bu-is-flex bu-is-align-items-center">
                        <h3 class="bu-is-capitalized bu-mr-2">{{unescapeHtml(eventGroup.name)}}</h3>
                        <cly-guide></cly-guide>
                    </div>
                    <div class="bu-mt-4 bu-mr-2">
                        <span v-if="eventGroup.status === false" class="cly-vue-data-manager__hidden-icon"><i class="ion-eye-disabled"></i></span>
                        <span v-else class="cly-vue-data-manager__hidden-icon"><i class="ion-eye"></i></span>
                    </div>
                </div>
            </template>
            <template v-slot:header-right>
                <div class="bu-mt-6">
                    <el-button v-if="canUserUpdate" @click="handleEdit" size="small" icon="el-icon-edit">Edit Group</el-button>
                    <cly-more-options v-if="canUserDelete" class="bu-ml-2" size="small" @command="handleCommand($event, eventGroup)">
                        <el-dropdown-item command="delete">{{i18n('common.delete')}}</el-dropdown-item>
                    </cly-more-options>
                </div>
            </template>
        </cly-header>
        <cly-section class="bu-mx-5 cly-vue-data-manager__box-container--boxed">
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column">
                    <div class="bu-mx-5 bu-mt-5">
                        <div class="bu-mt-5">
                            <span class="text-medium font-weight-bold text-uppercase">
                                {{ i18n('data-manager.event-group-details') }}
                            </span>
                            <table class="bu-mt-1 cly-vue-data-manager__box-container__table text-medium">
                                <colgroup>
                                    <col width="30%" />
                                    <col width="70%" />
                                </colgroup>
                                <tbody>
                                    <tr>
                                        <td><span>{{ i18n('data-manager.description') }}</span>
                                        </td>
                                        <td>{{unescapeHtml(eventGroup.description)}}</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span>{{ i18n('data-manager.included-events') }}</span>
                                        </td>
                                        <td>
                                            <div class="bu-mb-2" v-for="e in eventGroup.source_events"><div>{{unescapeHtml(e)}}</div></div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </cly-section>
        <cly-confirm-dialog
        @cancel="closeDeleteForm"
        @confirm="submitDeleteForm"
        :before-close="closeDeleteForm"
        ref="deleteConfirmDialog"
        :visible.sync="showDeleteDialog"
        dialogType="danger"
        :saveButtonLabel="i18n('common.delete')"
        :cancelButtonLabel="i18n('common.no-dont-delete')"
        title="Delete Event Group" >
            <template slot-scope="scope">
                {{ i18n('data-manager.delete-event-group-permanently') }}<br/>
                <small class="color-red-100"> {{i18n('data-manager.delete-event-warning')}} </small>
                <ul>
                    <li v-if="deleteElement"><div>{{unescapeHtml(deleteElement.name)}}</div></li>
                </ul>
            </template>
        </cly-confirm-dialog>
    </div>
</template>

<script>
import { i18nMixin, mixins, authMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import EventGroupDrawer from './EventGroupDrawer.vue';

var FEATURE_NAME = "data_manager";

var statusClassObject = function(status) {
    if (!status) {
        status = "unplanned";
    }
    var classObject = {};
    classObject['tag--' + status] = true;
    return classObject;
};

export default {
    mixins: [
        mixins.hasDrawers(["eventgroup"]),
        authMixin(FEATURE_NAME),
        commonFormattersMixin,
        i18nMixin
    ],
    components: {
        'event-group-drawer': EventGroupDrawer,
    },
    data: function() {
        return {
            eventGroupId: this.$route.params.eventGroupId,
            showDeleteDialog: false,
            deleteElement: null,
        };
    },
    computed: {
        eventGroup: function() {
            var self = this;
            var eventGroup = {};
            var eventGroups = this.$store.getters["countlyDataManager/eventGroups"];
            eventGroups.forEach(function(eg) {
                if (eg._id === self.eventGroupId) {
                    eventGroup = eg;
                }
            });
            return eventGroup;
        },
    },
    methods: {
        initialize: function() {
            this.$store.dispatch('countlyDataManager/loadEventGroups');
        },
        handleEdit: function() {
            var doc = this.eventGroup;
            doc.name = countlyCommon.unescapeHtml(doc.name);
            doc.description = countlyCommon.unescapeHtml(doc.description);
            if (Array.isArray(doc.source_events)) {
                doc.source_events = doc.source_events.map(function(val) {
                    return countlyCommon.unescapeHtml(val);
                });
            }
            this.openDrawer('eventgroup', this.eventGroup);
        },
        handleCommand: function(ev, eventGroup) {
            if (ev === 'delete') {
                this.deleteElement = eventGroup;
                this.showDeleteDialog = true;
            }
        },
        closeDeleteForm: function() {
            this.deleteElement = null;
            this.showDeleteDialog = false;
        },
        submitDeleteForm: function() {
            this.$store.dispatch("countlyDataManager/deleteEventGroups", [this.deleteElement._id]);
            this.showDeleteDialog = false;
            app.navigate("#/manage/data-manager/events/event-groups", true);
        },
        statusClassObject: statusClassObject,
    },
    created: function() {
        this.initialize();
    }
};
</script>
